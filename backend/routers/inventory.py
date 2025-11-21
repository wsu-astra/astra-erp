"""Inventory management routes"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from models import (
    InventoryItemCreate, InventoryItemUpdate, InventoryItemResponse,
    WatsonXOrderRequest, WatsonXOrderResponse
)
from auth import get_current_user
from db import get_supabase
from services.inventory_engine import (
    format_inventory_item, get_instacart_link, check_duplicate_item
)
from services.watsonx_client import watsonx_client

router = APIRouter(prefix="/api/inventory", tags=["inventory"])

@router.get("/", response_model=List[InventoryItemResponse])
async def get_inventory(current_user: dict = Depends(get_current_user)):
    """Get all inventory items for current business"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    result = supabase.table("inventory_items")\
        .select("*")\
        .eq("business_id", business_id)\
        .order("name")\
        .execute()
    
    return [format_inventory_item(item) for item in result.data]

@router.post("/", response_model=InventoryItemResponse)
async def create_inventory_item(
    item: InventoryItemCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create new inventory item"""
    business_id = current_user["business_id"]
    
    # Check for duplicate
    if check_duplicate_item(business_id, item.name):
        raise HTTPException(status_code=400, detail="Item already exists")
    
    supabase = get_supabase()
    
    item_data = {
        "business_id": business_id,
        **item.model_dump()
    }
    
    result = supabase.table("inventory_items").insert(item_data).execute()
    
    return format_inventory_item(result.data[0])

@router.put("/{item_id}", response_model=InventoryItemResponse)
async def update_inventory_item(
    item_id: int,
    item_update: InventoryItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update inventory item"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    # Verify item belongs to business
    existing = supabase.table("inventory_items")\
        .select("*")\
        .eq("id", item_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if existing.data[0]["business_id"] != business_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check for duplicate name if updating name
    if item_update.name and item_update.name != existing.data[0]["name"]:
        if check_duplicate_item(business_id, item_update.name, exclude_id=item_id):
            raise HTTPException(status_code=400, detail="Item name already exists")
    
    # Get old values before update
    old_quantity = existing.data[0]["current_quantity"]
    old_min_quantity = existing.data[0]["minimum_quantity"]
    was_low_stock = old_quantity < old_min_quantity
    
    # Update only provided fields
    update_data = {k: v for k, v in item_update.model_dump().items() if v is not None}
    
    result = supabase.table("inventory_items")\
        .update(update_data)\
        .eq("id", item_id)\
        .execute()
    
    updated_item = result.data[0]
    new_quantity = updated_item["current_quantity"]
    new_min_quantity = updated_item["minimum_quantity"]
    is_now_low_stock = new_quantity < new_min_quantity
    
    # Only send email if:
    # 1. Current quantity changed (not just threshold adjustment)
    # 2. Item was NOT low stock before
    # 3. Item IS low stock now
    # 4. Threshold wasn't changed (avoid spam from threshold adjustments)
    quantity_decreased = new_quantity < old_quantity
    threshold_unchanged = new_min_quantity == old_min_quantity
    
    if quantity_decreased and not was_low_stock and is_now_low_stock and threshold_unchanged:
        # Item quantity decreased and just crossed threshold - send automatic alert
        from services.email_service import email_service
        
        # Get business name
        business_result = supabase.table("businesses")\
            .select("name")\
            .eq("id", business_id)\
            .single()\
            .execute()
        
        business_name = business_result.data["name"] if business_result.data else "Your Business"
        user_email = current_user["email"]
        
        # Send alert for this one item
        email_service.send_low_stock_alert(
            to_email=user_email,
            business_name=business_name,
            low_stock_items=[{
                "name": updated_item["name"],
                "current_quantity": new_quantity,
                "minimum_quantity": new_min_quantity,
                "unit": updated_item["unit"]
            }]
        )
        print(f"🔔 Auto-sent low stock alert for {updated_item['name']} to {user_email}")
    
    return format_inventory_item(updated_item)

@router.delete("/{item_id}")
async def delete_inventory_item(
    item_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete inventory item"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    # Verify item belongs to business
    existing = supabase.table("inventory_items")\
        .select("business_id")\
        .eq("id", item_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if existing.data[0]["business_id"] != business_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    supabase.table("inventory_items").delete().eq("id", item_id).execute()
    
    return {"message": "Item deleted"}

@router.post("/generate-order", response_model=WatsonXOrderResponse)
async def generate_order_list(current_user: dict = Depends(get_current_user)):
    """Generate AI-powered order list for low stock items"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    # Get low stock items
    result = supabase.table("inventory_items")\
        .select("*")\
        .eq("business_id", business_id)\
        .execute()
    
    low_stock_items = [
        {
            "id": item["id"],
            "name": item["name"],
            "current": item["current_quantity"],
            "min": item["minimum_quantity"]
        }
        for item in result.data
        if item["current_quantity"] < item["minimum_quantity"]
    ]
    
    if not low_stock_items:
        return {"orders": []}
    
    # Use WatsonX to generate orders
    orders = watsonx_client.generate_inventory_orders(low_stock_items)
    
    # Enrich orders with item details
    enriched_orders = []
    for order in orders:
        # Find the matching item
        item = next((item for item in result.data if item["id"] == order["id"]), None)
        if item:
            enriched_orders.append({
                "item_name": item["name"],
                "category": item.get("category", "Uncategorized"),
                "suggested_quantity": order["order_qty"],
                "unit": item["unit"],
                "current_quantity": item["current_quantity"],
                "minimum_quantity": item["minimum_quantity"]
            })
    
    return {"orders": enriched_orders}

@router.get("/instacart-link/{item_id}")
async def get_instacart_order_link(
    item_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get Instacart order link for an item"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    result = supabase.table("inventory_items")\
        .select("instacart_search")\
        .eq("id", item_id)\
        .eq("business_id", business_id)\
        .execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Item not found")
    
    search_term = result.data[0].get("instacart_search", "")
    
    if not search_term:
        raise HTTPException(status_code=400, detail="No Instacart search term configured")
    
    return {"url": get_instacart_link(search_term)}

@router.post("/send-low-stock-alert")
async def send_low_stock_alert(current_user: dict = Depends(get_current_user)):
    """Send email alert for all low stock items"""
    business_id = current_user["business_id"]
    user_email = current_user["email"]
    supabase = get_supabase()
    
    # Get business name
    business_result = supabase.table("businesses")\
        .select("name")\
        .eq("id", business_id)\
        .single()\
        .execute()
    
    business_name = business_result.data["name"] if business_result.data else "Your Business"
    
    # Get all low stock items
    inventory_result = supabase.table("inventory_items")\
        .select("*")\
        .eq("business_id", business_id)\
        .execute()
    
    low_stock_items = [
        {
            "name": item["name"],
            "current_quantity": item["current_quantity"],
            "minimum_quantity": item["minimum_quantity"],
            "unit": item["unit"]
        }
        for item in inventory_result.data
        if item["current_quantity"] < item["minimum_quantity"]
    ]
    
    if not low_stock_items:
        return {
            "success": True,
            "message": "No low stock items - nothing to alert!",
            "items_alerted": 0
        }
    
    # Send email
    from services.email_service import email_service
    
    success = email_service.send_low_stock_alert(
        to_email=user_email,
        business_name=business_name,
        low_stock_items=low_stock_items
    )
    
    if success:
        return {
            "success": True,
            "message": f"Alert sent for {len(low_stock_items)} low stock items",
            "items_alerted": len(low_stock_items),
            "items": low_stock_items
        }
    else:
        raise HTTPException(
            status_code=500, 
            detail="Failed to send email alert"
        )
