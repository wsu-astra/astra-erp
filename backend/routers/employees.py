"""Employee management routes"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from pydantic import BaseModel
from models import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from auth import get_current_user
from db import get_supabase

router = APIRouter(prefix="/api/employees", tags=["employees"])

class UpdateAdminStatus(BaseModel):
    is_admin: bool

@router.get("/profiles")
async def get_employee_profiles(current_user: dict = Depends(get_current_user)):
    """Get all employees for the business - simple and consistent"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    # Get all employees - simple query
    result = supabase.table("profiles")\
        .select("id, email, full_name, is_admin, is_active")\
        .eq("business_id", business_id)\
        .order("full_name")\
        .execute()
    
    # Return simple employee list
    employees = []
    for user in result.data:
        employees.append({
            "user_id": user["id"],
            "full_name": user.get("full_name", "Unknown"),
            "email": user.get("email", "No email"),
            "is_admin": user.get("is_admin", False),
            "is_active": user.get("is_active", True)
        })
    
    return employees

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
    """Create new employee (and optionally user account)"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    # If create_user_account is True, create Supabase Auth user
    if employee.create_user_account:
        if not employee.email:
            raise HTTPException(status_code=400, detail="Email required to create user account")
        
        # Import here to avoid circular dependency
        import secrets
        import string
        
        # Generate temporary password
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        temp_password = ''.join(secrets.choice(alphabet) for i in range(12))
        
        try:
            # Create auth user using sign_up (service role auto-confirms)
            auth_result = supabase.auth.sign_up({
                "email": employee.email,
                "password": temp_password,
                "options": {
                    "data": {
                        "business_id": business_id,
                        "full_name": employee.full_name
                    }
                }
            })
            
            if auth_result.user:
                # Create profile with email
                supabase.table("profiles").insert({
                    "id": auth_result.user.id,
                    "business_id": business_id,
                    "email": employee.email,
                    "full_name": employee.full_name,
                    "role": "employee",
                    "is_admin": False,  # Regular employees are not admins
                    "is_active": True
                }).execute()
                
                print(f"[EMPLOYEE] ✅ Created user account for {employee.email}")
                print(f"[EMPLOYEE] 🔑 Temp password: {temp_password}")
            else:
                print(f"[EMPLOYEE] ❌ Failed: No user returned from sign_up")
        except Exception as e:
            print(f"[EMPLOYEE] ❌ Failed to create user account: {str(e)}")
            import traceback
            traceback.print_exc()
            # Continue creating employee even if user creation fails
    
    # Create employee in employees table (exclude email - it's only for auth users)
    emp_data = employee.model_dump(exclude={"availability", "create_user_account", "email"})
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

@router.put("/profiles/{user_id}/admin")
async def update_admin_status(
    user_id: str,
    admin_update: UpdateAdminStatus,
    current_user: dict = Depends(get_current_user)
):
    """Update admin status for an employee - simple toggle"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    # Only admins can change admin status
    admin_profile = supabase.table("profiles")\
        .select("is_admin")\
        .eq("id", current_user["user_id"])\
        .single()\
        .execute()
    
    if not admin_profile.data or not admin_profile.data.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Only admins can change admin status")
    
    # Prevent changing own admin status
    if user_id == current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Cannot change your own admin status")
    
    # Verify user belongs to same business
    user_result = supabase.table("profiles")\
        .select("id, business_id")\
        .eq("id", user_id)\
        .single()\
        .execute()
    
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_result.data["business_id"] != business_id:
        raise HTTPException(status_code=403, detail="User belongs to different business")
    
    # Update BOTH is_admin AND role to keep them in sync
    new_role = "admin" if admin_update.is_admin else "employee"
    
    update_result = supabase.table("profiles")\
        .update({
            "is_admin": admin_update.is_admin,
            "role": new_role
        })\
        .eq("id", user_id)\
        .execute()
    
    print(f"[ADMIN_UPDATE] Updated user {user_id}: is_admin={admin_update.is_admin}, role={new_role}")
    print(f"[ADMIN_UPDATE] Result: {update_result.data}")
    
    return {
        "message": f"User updated to {new_role}",
        "user_id": user_id,
        "is_admin": admin_update.is_admin,
        "role": new_role,
        "success": True
    }

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
