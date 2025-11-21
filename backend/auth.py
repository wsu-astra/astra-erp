"""Authentication utilities and middleware"""
from fastapi import HTTPException, Header
from typing import Optional
from db import get_supabase
import os

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Extract and validate user from JWT token.
    Returns user data with business_id.
    CRITICAL: All routes must use this to enforce multi-tenancy.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        supabase = get_supabase()
        # Verify token and get user
        user_response = supabase.auth.get_user(token)
        user = user_response.user
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Extract business_id from user metadata
        business_id = user.user_metadata.get('business_id')
        
        if not business_id:
            raise HTTPException(
                status_code=403, 
                detail="No business associated with user. Contact support."
            )
        
        return {
            "user_id": user.id,
            "email": user.email,
            "business_id": business_id,
            "metadata": user.user_metadata
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

def verify_business_access(resource_business_id: str, user_business_id: str):
    """
    CRITICAL SECURITY CHECK
    Verify that a resource belongs to the user's business.
    Prevents cross-business data access.
    """
    if resource_business_id != user_business_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: This resource belongs to another business"
        )
