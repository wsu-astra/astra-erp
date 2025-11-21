"""Dashboard routes"""
from fastapi import APIRouter, Depends
from models import DashboardStats
from auth import get_current_user
from db import get_supabase
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics for current business"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    # Get inventory stats
    inventory_result = supabase.table("inventory_items")\
        .select("current_quantity, minimum_quantity")\
        .eq("business_id", business_id)\
        .execute()
    
    total_inventory = len(inventory_result.data)
    low_stock = sum(1 for item in inventory_result.data if 0 < item["current_quantity"] < item["minimum_quantity"])
    out_of_stock = sum(1 for item in inventory_result.data if item["current_quantity"] == 0)
    
    # Get employee stats
    employees_result = supabase.table("employees")\
        .select("active")\
        .eq("business_id", business_id)\
        .execute()
    
    total_employees = len(employees_result.data)
    active_employees = sum(1 for emp in employees_result.data if emp["active"])
    
    # Get upcoming shifts (next 7 days)
    today = datetime.now().date()
    week_from_now = today + timedelta(days=7)
    
    shifts_result = supabase.table("shifts")\
        .select("week_start")\
        .eq("business_id", business_id)\
        .gte("week_start", today.isoformat())\
        .lte("week_start", week_from_now.isoformat())\
        .execute()
    
    upcoming_shifts = len(shifts_result.data)
    
    # Get today's reminders
    day_names = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    today_day = day_names[today.weekday()]
    
    reminders_result = supabase.table("reminders")\
        .select("*")\
        .eq("business_id", business_id)\
        .eq("day_of_week", today_day)\
        .eq("active", True)\
        .order("time_of_day")\
        .execute()
    
    return {
        "total_inventory_items": total_inventory,
        "low_stock_count": low_stock,
        "out_of_stock_count": out_of_stock,
        "total_employees": total_employees,
        "active_employees": active_employees,
        "upcoming_shifts": upcoming_shifts,
        "todays_reminders": reminders_result.data
    }
