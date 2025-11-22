"""Scheduling routes"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime
from models import (
    ScheduleGenerateRequest, ShiftResponse,
    ShiftSlotCreate, ShiftSlotUpdate, ShiftSlotResponse
)
from auth import get_current_user
from db import get_supabase
from services.watsonx_client import watsonx_client
from services.schedule_engine import (
    get_week_days, validate_schedule
)

router = APIRouter(prefix="/api/schedule", tags=["schedule"])

# ==================== SHIFT SLOTS ====================

@router.get("/shift-slots", response_model=List[ShiftSlotResponse])
async def get_shift_slots(current_user: dict = Depends(get_current_user)):
    """Get all shift slots for the business"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    result = supabase.table("shift_slots")\
        .select("*")\
        .eq("business_id", business_id)\
        .order("day_of_week, start_time")\
        .execute()
    
    return result.data

@router.post("/shift-slots", response_model=ShiftSlotResponse)
async def create_shift_slot(
    slot: ShiftSlotCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new shift slot"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    slot_data = {
        "business_id": business_id,
        **slot.model_dump()
    }
    
    result = supabase.table("shift_slots").insert(slot_data).execute()
    return result.data[0]

@router.put("/shift-slots/{slot_id}", response_model=ShiftSlotResponse)
async def update_shift_slot(
    slot_id: int,
    slot_update: ShiftSlotUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a shift slot"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    # Verify slot exists
    existing = supabase.table("shift_slots")\
        .select("*")\
        .eq("id", slot_id)\
        .eq("business_id", business_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Shift slot not found")
    
    update_data = {k: v for k, v in slot_update.model_dump().items() if v is not None}
    
    result = supabase.table("shift_slots")\
        .update(update_data)\
        .eq("id", slot_id)\
        .execute()
    
    return result.data[0]

@router.delete("/shift-slots/{slot_id}")
async def delete_shift_slot(
    slot_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a shift slot"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    supabase.table("shift_slots")\
        .delete()\
        .eq("id", slot_id)\
        .eq("business_id", business_id)\
        .execute()
    
    return {"message": "Shift slot deleted"}

# ==================== SCHEDULE GENERATION ====================

@router.post("/generate")
async def generate_schedule(
    request: ScheduleGenerateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate AI-powered schedule using WatsonX"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    week_start = request.week_start.isoformat()
    
    # Get active employees from profiles (exclude admins) with availability  
    profiles_result = supabase.table("profiles")\
        .select("id, full_name, strength, is_active, is_admin")\
        .eq("business_id", business_id)\
        .eq("is_active", True)\
        .eq("is_admin", False)\
        .execute()
    
    if not profiles_result.data:
        raise HTTPException(status_code=400, detail="No active employees found")
    
    # Build employee data with availability from weekly_availability
    employees = []
    for emp in profiles_result.data:
        # Get weekly availability (the new system)
        availability_result = supabase.table("weekly_availability")\
            .select("date, available")\
            .eq("user_id", emp["id"])\
            .eq("business_id", business_id)\
            .eq("week_start", week_start)\
            .eq("available", True)\
            .execute()
        
        print(f"[AVAILABILITY] Employee {emp['full_name']} availability data: {availability_result.data}")
        
        # Convert dates to day names
        available_days = []
        for avail in availability_result.data:
            try:
                date_obj = datetime.fromisoformat(avail["date"]).date()
                day_name = date_obj.strftime('%a').lower()  # Mon -> mon
                available_days.append(day_name)
                print(f"[AVAILABILITY] Converted {avail['date']} to {day_name}")
            except Exception as e:
                print(f"[AVAILABILITY] Error converting date {avail['date']}: {e}")
        
        # If no availability is set, assume available all 7 days (default)
        if not available_days:
            available_days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]  # Default: available all days
            print(f"[AVAILABILITY] No availability set for {emp['full_name']}, using default: {available_days}")
        
        print(f"[AVAILABILITY] Final available days for {emp['full_name']}: {available_days}")
        
        employees.append({
            "id": emp["id"],
            "full_name": emp["full_name"],
            "strength": emp.get("strength", "normal"),
            "availability": available_days
        })
    
    # Get current shifts for this week to provide context
    current_shifts_result = supabase.table("shifts")\
        .select("day_of_week, employee_id, start_time, end_time")\
        .eq("business_id", business_id)\
        .eq("week_start", week_start)\
        .execute()
    
    current_schedule = current_shifts_result.data if current_shifts_result.data else []
    
    # Get store hours for scheduling context
    store_hours_result = supabase.table("businesses")\
        .select("store_hours")\
        .eq("id", business_id)\
        .execute()
    
    store_hours = None
    if store_hours_result.data and store_hours_result.data[0] and store_hours_result.data[0].get("store_hours"):
        store_hours = store_hours_result.data[0]["store_hours"]
    else:
        # Default hours if not set
        store_hours = {
            "monday": {"open_time": "09:00", "close_time": "17:00", "closed": False},
            "tuesday": {"open_time": "09:00", "close_time": "17:00", "closed": False},
            "wednesday": {"open_time": "09:00", "close_time": "17:00", "closed": False},
            "thursday": {"open_time": "09:00", "close_time": "17:00", "closed": False},
            "friday": {"open_time": "09:00", "close_time": "17:00", "closed": False},
            "saturday": {"open_time": "09:00", "close_time": "17:00", "closed": False},
            "sunday": {"open_time": "09:00", "close_time": "17:00", "closed": True}
        }
    
    # Get shift slots configured for the business
    shift_slots_result = supabase.table("shift_slots")\
        .select("*")\
        .eq("business_id", business_id)\
        .order("day_of_week, start_time")\
        .execute()
    
    shift_slots = shift_slots_result.data if shift_slots_result.data else []
    
    # Generate schedule using WatsonX - staffing needs determined by shift slots
    shifts = watsonx_client.generate_schedule(
        week_start=week_start, 
        staffing_rules=[],  # Not used - shift slots define staffing requirements
        employees=employees,
        preferences=getattr(request, 'preferences', ''),
        current_schedule=current_schedule,
        store_hours=store_hours,
        shift_slots=shift_slots
    )
    
    # Validate schedule
    validation = validate_schedule(shifts, employees)
    
    print(f"[VALIDATION] Schedule validation result: {validation}")
    print(f"[VALIDATION] Generated shifts: {shifts}")
    print(f"[VALIDATION] Employee data: {employees}")
    
    if not validation["valid"]:
        print(f"[VALIDATION] Validation failed with errors: {validation['errors']}")
        raise HTTPException(
            status_code=400,
            detail={"message": "Schedule validation failed", "errors": validation["errors"]}
        )
    
    # Delete existing shifts for this week
    supabase.table("shifts")\
        .delete()\
        .eq("business_id", business_id)\
        .eq("week_start", week_start)\
        .execute()
    
    # Insert new shifts
    week_days = get_week_days(week_start)
    
    shift_records = [
        {
            "business_id": business_id,
            "week_start": week_start,
            "day_of_week": shift["day"],
            "employee_id": shift["employee_id"],
            "start_time": shift.get("start_time", "10:00"),
            "end_time": shift.get("end_time", "18:00")
        }
        for shift in shifts
    ]
    
    if shift_records:
        supabase.table("shifts").insert(shift_records).execute()
    
    return {
        "message": "Schedule generated",
        "shifts_created": len(shifts),
        "warnings": validation["warnings"]
    }

@router.get("/shifts/{week_start}", response_model=List[ShiftResponse])
async def get_shifts(
    week_start: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all shifts for a specific week"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    # Get shifts with employee info
    shifts_result = supabase.table("shifts")\
        .select("*, profiles(full_name, strength)")\
        .eq("business_id", business_id)\
        .eq("week_start", week_start)\
        .order("day_of_week")\
        .execute()
    
    # Format response
    formatted_shifts = []
    for shift in shifts_result.data:
        formatted_shifts.append({
            "id": shift["id"],
            "business_id": shift["business_id"],
            "week_start": shift["week_start"],
            "day_of_week": shift["day_of_week"],
            "employee_id": shift["employee_id"],
            "employee_name": shift["profiles"]["full_name"] if shift.get("profiles") else "Unknown",
            "employee_strength": shift["profiles"]["strength"] if shift.get("profiles") else "normal",
            "start_time": shift["start_time"],
            "end_time": shift["end_time"]
        })
    
    return formatted_shifts

@router.delete("/shifts/{week_start}")
async def delete_week_shifts(
    week_start: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete all shifts for a week"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    supabase.table("shifts")\
        .delete()\
        .eq("business_id", business_id)\
        .eq("week_start", week_start)\
        .execute()
    
    return {"message": "Shifts deleted"}
