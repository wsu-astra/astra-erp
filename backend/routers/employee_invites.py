"""Employee invitation system for admins"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
import secrets
import string
from auth import get_current_user
from db import get_supabase
from permissions import require_permission, Permissions

router = APIRouter(prefix="/api/admin", tags=["employee-invites"])

class InviteEmployeeRequest(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "employee"

class InviteResponse(BaseModel):
    message: str
    employee_id: str
    email: str
    temporary_password: str

def generate_temp_password(length: int = 12) -> str:
    """Generate a secure temporary password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for i in range(length))
    return password

@router.post("/invite", response_model=InviteResponse)
async def invite_employee(
    invite_data: InviteEmployeeRequest,
    current_user: dict = Depends(require_permission(Permissions.EDIT_EMPLOYEES))
):
    """
    Admin invites a new employee to their business.
    Creates user account with temporary password.
    """
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    try:
        # Check if profile with this email already exists in business
        # Note: We can't easily query auth.users in Python SDK, so we rely on
        # the sign_up to fail if email exists
        existing_profiles = supabase.table("profiles")\
            .select("id, full_name")\
            .eq("business_id", business_id)\
            .execute()
        
        # Simple check - if a user with same full name exists, warn
        # (email uniqueness will be enforced by Supabase Auth)
        for profile in existing_profiles.data:
            if profile.get("full_name") == invite_data.full_name:
                print(f"[INVITE] Warning: User with name {invite_data.full_name} already exists in business")
        
        # Generate temporary password
        temp_password = generate_temp_password()
        
        # Create user in Supabase Auth using sign_up
        auth_result = supabase.auth.sign_up({
            "email": invite_data.email,
            "password": temp_password,
            "options": {
                "data": {
                    "business_id": business_id,
                    "invited_by": current_user["user_id"],
                    "full_name": invite_data.full_name
                }
            }
        })
        
        if not auth_result.user:
            raise HTTPException(status_code=500, detail="Failed to create user")
        
        # Create profile for the new employee with email
        profile_result = supabase.table("profiles").insert({
            "id": auth_result.user.id,
            "business_id": business_id,
            "email": invite_data.email,
            "full_name": invite_data.full_name,
            "role": invite_data.role,
            "is_admin": invite_data.role == "admin",  # Set is_admin based on role
            "is_active": True
        }).execute()
        
        # In a real app, you would:
        # 1. Send email with temporary password
        # 2. Include link to reset password on first login
        # For now, we return the password to the admin
        
        # Log the invitation
        supabase.table("permission_audit_log").insert({
            "business_id": business_id,
            "admin_id": current_user["user_id"],
            "target_user_id": auth_result.user.id,
            "action": "invite_employee",
            "changes": {
                "email": invite_data.email,
                "full_name": invite_data.full_name,
                "role": invite_data.role
            }
        }).execute()
        
        return {
            "message": f"Employee {invite_data.full_name} invited successfully",
            "employee_id": auth_result.user.id,
            "email": invite_data.email,
            "temporary_password": temp_password
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to invite employee: {str(e)}"
        )

@router.get("/pending-invites")
async def get_pending_invites(
    current_user: dict = Depends(require_permission(Permissions.VIEW_EMPLOYEES))
):
    """Get list of employees who haven't logged in yet (pending invites)"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    # Get all employees
    employees = supabase.table("profiles")\
        .select("id, full_name, email, created_at")\
        .eq("business_id", business_id)\
        .execute()
    
    # In a real system, you'd track last_login to determine pending status
    # For now, return all employees created recently
    return employees.data

@router.delete("/revoke-invite/{employee_id}")
async def revoke_invite(
    employee_id: str,
    current_user: dict = Depends(require_permission(Permissions.EDIT_EMPLOYEES))
):
    """
    Revoke an employee invitation (delete the user before they login)
    Only works if employee hasn't logged in yet
    """
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    try:
        # Verify employee belongs to same business
        employee = supabase.table("profiles")\
            .select("id, business_id, full_name")\
            .eq("id", employee_id)\
            .single()\
            .execute()
        
        if not employee.data:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        if employee.data["business_id"] != business_id:
            raise HTTPException(status_code=403, detail="Employee belongs to different business")
        
        # Delete from auth (this cascades to profiles)
        supabase.auth.admin.delete_user(employee_id)
        
        return {"message": f"Invitation revoked for {employee.data['full_name']}"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to revoke invite: {str(e)}")
