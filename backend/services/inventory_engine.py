"""Inventory management logic"""
from typing import List, Dict
from db import get_supabase

def get_inventory_status(current_qty: int, min_qty: int) -> str:
    """Determine inventory status based on quantities"""
    if current_qty == 0:
        return "Out"
    elif current_qty < min_qty:
        return "Low"
    else:
        return "In Stock"

def format_inventory_item(item: dict) -> dict:
    """Format inventory item with status"""
    return {
        **item,
        "status": get_inventory_status(
            item["current_quantity"], 
            item["minimum_quantity"]
        )
    }

def get_instacart_link(search_term: str) -> str:
    """Generate Instacart search URL"""
    if not search_term:
        return ""
    return f"https://www.instacart.com/store/search?q={search_term.replace(' ', '+')}"

def check_duplicate_item(business_id: str, item_name: str, exclude_id: int = None) -> bool:
    """Check if item name already exists for this business"""
    supabase = get_supabase()
    
    query = supabase.table("inventory_items").select("id").eq("business_id", business_id).eq("name", item_name)
    
    if exclude_id:
        query = query.neq("id", exclude_id)
    
    result = query.execute()
    
    return len(result.data) > 0
