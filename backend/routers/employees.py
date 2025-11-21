"""Employee management routes"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from models import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from auth import get_current_user
from db import get_supabase

router = APIRouter(prefix="/api/employees", tags=["employees"])

@router.get("/", response_model=List[EmployeeResponse])
async def get_employees(current_user: dict = Depends(get_current_user)):
    """Get all employees for current business"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    # Get employees
    employees_result = supabase.table("employees")\
        .select("*")\
        .eq("business_id", business_id)\
        .order("full_name")\
        .execute()
    
    # Get availability for each employee
    employees_with_availability = []
    
    for emp in employees_result.data:
        availability_result = supabase.table("employee_availability")\
            .select("day_of_week")\
            .eq("employee_id", emp["id"])\
            .eq("can_work", True)\
            .execute()
        
        emp["availability"] = [a["day_of_week"] for a in availability_result.data]
        employees_with_availability.append(emp)
    
    return employees_with_availability

@router.post("/", response_model=EmployeeResponse)
async def create_employee(
    employee: EmployeeCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create new employee"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    # Create employee
    emp_data = employee.model_dump(exclude={"availability"})
    emp_data["business_id"] = business_id
    
    emp_result = supabase.table("employees").insert(emp_data).execute()
    new_employee = emp_result.data[0]
    
    # Create availability records
    if employee.availability:
        availability_records = [
            {
                "business_id": business_id,
                "employee_id": new_employee["id"],
                "day_of_week": day,
                "can_work": True
            }
            for day in employee.availability
        ]
        
        supabase.table("employee_availability").insert(availability_records).execute()
    
    new_employee["availability"] = employee.availability
    return new_employee

@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: int,
    employee_update: EmployeeUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update employee"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    # Verify employee belongs to business
    existing = supabase.table("employees")\
        .select("*")\
        .eq("id", employee_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if existing.data[0]["business_id"] != business_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update employee
    update_data = {k: v for k, v in employee_update.model_dump(exclude={"availability"}).items() if v is not None}
    
    if update_data:
        supabase.table("employees")\
            .update(update_data)\
            .eq("id", employee_id)\
            .execute()
    
    # Update availability if provided
    if employee_update.availability is not None:
        # Delete existing availability
        supabase.table("employee_availability")\
            .delete()\
            .eq("employee_id", employee_id)\
            .execute()
        
        # Insert new availability
        if employee_update.availability:
            availability_records = [
                {
                    "business_id": business_id,
                    "employee_id": employee_id,
                    "day_of_week": day,
                    "can_work": True
                }
                for day in employee_update.availability
            ]
            
            supabase.table("employee_availability").insert(availability_records).execute()
    
    # Get updated employee with availability
    emp_result = supabase.table("employees").select("*").eq("id", employee_id).execute()
    employee = emp_result.data[0]
    
    availability_result = supabase.table("employee_availability")\
        .select("day_of_week")\
        .eq("employee_id", employee_id)\
        .eq("can_work", True)\
        .execute()
    
    employee["availability"] = [a["day_of_week"] for a in availability_result.data]
    
    return employee

@router.delete("/{employee_id}")
async def delete_employee(
    employee_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete employee"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    # Verify employee belongs to business
    existing = supabase.table("employees")\
        .select("business_id")\
        .eq("id", employee_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if existing.data[0]["business_id"] != business_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete employee (cascade will delete availability and shifts)
    supabase.table("employees").delete().eq("id", employee_id).execute()
    
    return {"message": "Employee deleted"}
