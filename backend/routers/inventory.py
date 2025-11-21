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
    
    # Update only provided fields
    update_data = {k: v for k, v in item_update.model_dump().items() if v is not None}
    
    result = supabase.table("inventory_items")\
        .update(update_data)\
        .eq("id", item_id)\
        .execute()
    
    return format_inventory_item(result.data[0])

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
    
    return {"orders": orders}

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
