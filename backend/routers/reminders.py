"""Reminders routes"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from models import ReminderCreate, ReminderUpdate, ReminderResponse
from auth import get_current_user
from db import get_supabase

router = APIRouter(prefix="/api/reminders", tags=["reminders"])

@router.get("/", response_model=List[ReminderResponse])
async def get_reminders(
    day: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all reminders for current business, optionally filtered by day"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    query = supabase.table("reminders")\
        .select("*")\
        .eq("business_id", business_id)
    
    if day:
        query = query.eq("day_of_week", day)
    
    result = query.order("day_of_week").order("time_of_day").execute()
    
    return result.data

@router.post("/", response_model=ReminderResponse)
async def create_reminder(
    reminder: ReminderCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create new reminder"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    reminder_data = {
        "business_id": business_id,
        **reminder.model_dump()
    }
    
    result = supabase.table("reminders").insert(reminder_data).execute()
    
    return result.data[0]

@router.put("/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(
    reminder_id: int,
    reminder_update: ReminderUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update reminder"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    # Verify reminder belongs to business
    existing = supabase.table("reminders")\
        .select("*")\
        .eq("id", reminder_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    if existing.data[0]["business_id"] != business_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update only provided fields
    update_data = {k: v for k, v in reminder_update.model_dump().items() if v is not None}
    
    result = supabase.table("reminders")\
        .update(update_data)\
        .eq("id", reminder_id)\
        .execute()
    
    return result.data[0]

@router.delete("/{reminder_id}")
async def delete_reminder(
    reminder_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete reminder"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    # Verify reminder belongs to business
    existing = supabase.table("reminders")\
        .select("business_id")\
        .eq("id", reminder_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    if existing.data[0]["business_id"] != business_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    supabase.table("reminders").delete().eq("id", reminder_id).execute()
    
    return {"message": "Reminder deleted"}
