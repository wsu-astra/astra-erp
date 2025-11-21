"""Scheduling routes"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from models import (
    StaffingRuleCreate, StaffingRuleUpdate, StaffingRuleResponse,
    ScheduleGenerateRequest, ShiftResponse
)
from auth import get_current_user
from db import get_supabase
from services.watsonx_client import watsonx_client
from services.schedule_engine import (
    get_week_days, validate_schedule, calculate_schedule_coverage
)

router = APIRouter(prefix="/api/schedule", tags=["schedule"])

# ==================== STAFFING RULES ====================

@router.get("/staffing-rules", response_model=List[StaffingRuleResponse])
async def get_staffing_rules(current_user: dict = Depends(get_current_user)):
    """Get staffing rules for current business"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    result = supabase.table("staffing_rules")\
        .select("*")\
        .eq("business_id", business_id)\
        .execute()
    
    return result.data

@router.post("/staffing-rules", response_model=StaffingRuleResponse)
async def create_staffing_rule(
    rule: StaffingRuleCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create staffing rule for a day"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    # Check if rule already exists for this day
    existing = supabase.table("staffing_rules")\
        .select("*")\
        .eq("business_id", business_id)\
        .eq("day_of_week", rule.day_of_week)\
        .execute()
    
    if existing.data:
        raise HTTPException(
            status_code=400, 
            detail=f"Rule already exists for {rule.day_of_week}. Use PUT to update."
        )
    
    rule_data = {
        "business_id": business_id,
        **rule.model_dump()
    }
    
    result = supabase.table("staffing_rules").insert(rule_data).execute()
    
    return result.data[0]

@router.put("/staffing-rules/{day}", response_model=StaffingRuleResponse)
async def update_staffing_rule(
    day: str,
    rule_update: StaffingRuleUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update staffing rule for a day"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    # Verify rule exists
    existing = supabase.table("staffing_rules")\
        .select("*")\
        .eq("business_id", business_id)\
        .eq("day_of_week", day)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Staffing rule not found")
    
    result = supabase.table("staffing_rules")\
        .update({"required_count": rule_update.required_count})\
        .eq("business_id", business_id)\
        .eq("day_of_week", day)\
        .execute()
    
    return result.data[0]

@router.delete("/staffing-rules/{day}")
async def delete_staffing_rule(
    day: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete staffing rule"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    supabase.table("staffing_rules")\
        .delete()\
        .eq("business_id", business_id)\
        .eq("day_of_week", day)\
        .execute()
    
    return {"message": "Staffing rule deleted"}

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
    
    # Get staffing rules
    rules_result = supabase.table("staffing_rules")\
        .select("*")\
        .eq("business_id", business_id)\
        .execute()
    
    staffing_rules = [
        {"day": rule["day_of_week"], "required": rule["required_count"]}
        for rule in rules_result.data
    ]
    
    if not staffing_rules:
        raise HTTPException(
            status_code=400, 
            detail="No staffing rules configured. Set required staff counts first."
        )
    
    # Get active employees with availability
    employees_result = supabase.table("employees")\
        .select("*")\
        .eq("business_id", business_id)\
        .eq("active", True)\
        .execute()
    
    if not employees_result.data:
        raise HTTPException(status_code=400, detail="No active employees found")
    
    # Build employee data with availability
    employees = []
    for emp in employees_result.data:
        availability_result = supabase.table("employee_availability")\
            .select("day_of_week")\
            .eq("employee_id", emp["id"])\
            .eq("can_work", True)\
            .execute()
        
        employees.append({
            "id": emp["id"],
            "full_name": emp["full_name"],
            "strength": emp["strength"],
            "availability": [a["day_of_week"] for a in availability_result.data]
        })
    
    # Generate schedule using WatsonX
    shifts = watsonx_client.generate_schedule(week_start, staffing_rules, employees)
    
    # Validate schedule
    validation = validate_schedule(shifts, employees)
    
    if not validation["valid"]:
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
            "start_time": "10:00",
            "end_time": "18:00"
        }
        for shift in shifts
    ]
    
    if shift_records:
        supabase.table("shifts").insert(shift_records).execute()
    
    # Calculate coverage
    coverage = calculate_schedule_coverage(shifts, staffing_rules)
    
    return {
        "message": "Schedule generated",
        "shifts_created": len(shifts),
        "coverage": coverage,
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
        .select("*, employees(full_name)")\
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
            "employee_name": shift["employees"]["full_name"] if shift.get("employees") else "Unknown",
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
