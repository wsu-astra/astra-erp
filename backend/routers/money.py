"""Financial tracking routes"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from models import FinancialsCreate, FinancialsResponse
from auth import get_current_user
from db import get_supabase

router = APIRouter(prefix="/api/financials", tags=["financials"])

def calculate_payroll_pct(gross_sales: float, payroll: float) -> float:
    """Calculate payroll percentage (with division by zero protection)"""
    if gross_sales == 0:
        return 0.0
    return round((payroll / gross_sales) * 100, 1)

def get_payroll_status(payroll_pct: float) -> str:
    """Determine status color based on payroll percentage"""
    if payroll_pct < 28:
        return "green"
    elif payroll_pct <= 35:
        return "yellow"
    else:
        return "red"

@router.get("/", response_model=List[FinancialsResponse])
async def get_financials(current_user: dict = Depends(get_current_user)):
    """Get all financial records for current business"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    result = supabase.table("weekly_financials")\
        .select("*")\
        .eq("business_id", business_id)\
        .order("week_start", desc=True)\
        .execute()
    
    # Add status to each record
    financials_with_status = []
    for record in result.data:
        record["status"] = get_payroll_status(record["payroll_pct"])
        financials_with_status.append(record)
    
    return financials_with_status

@router.post("/", response_model=FinancialsResponse)
async def create_financial_record(
    financials: FinancialsCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create new financial record"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    # Check for duplicate week
    week_start_str = financials.week_start.isoformat()
    
    existing = supabase.table("weekly_financials")\
        .select("*")\
        .eq("business_id", business_id)\
        .eq("week_start", week_start_str)\
        .execute()
    
    if existing.data:
        raise HTTPException(
            status_code=400,
            detail=f"Financial record already exists for week starting {week_start_str}. Use PUT to update."
        )
    
    # Calculate payroll percentage
    payroll_pct = calculate_payroll_pct(financials.gross_sales, financials.payroll)
    
    financial_data = {
        "business_id": business_id,
        "week_start": week_start_str,
        "gross_sales": financials.gross_sales,
        "payroll": financials.payroll,
        "payroll_pct": payroll_pct
    }
    
    result = supabase.table("weekly_financials").insert(financial_data).execute()
    
    record = result.data[0]
    record["status"] = get_payroll_status(payroll_pct)
    
    return record

@router.put("/{week_start}", response_model=FinancialsResponse)
async def update_financial_record(
    week_start: str,
    financials: FinancialsCreate,
    current_user: dict = Depends(get_current_user)
):
    """Update financial record for a specific week"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    # Verify record exists
    existing = supabase.table("weekly_financials")\
        .select("*")\
        .eq("business_id", business_id)\
        .eq("week_start", week_start)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Financial record not found")
    
    # Calculate new payroll percentage
    payroll_pct = calculate_payroll_pct(financials.gross_sales, financials.payroll)
    
    update_data = {
        "gross_sales": financials.gross_sales,
        "payroll": financials.payroll,
        "payroll_pct": payroll_pct
    }
    
    result = supabase.table("weekly_financials")\
        .update(update_data)\
        .eq("business_id", business_id)\
        .eq("week_start", week_start)\
        .execute()
    
    record = result.data[0]
    record["status"] = get_payroll_status(payroll_pct)
    
    return record

@router.delete("/{week_start}")
async def delete_financial_record(
    week_start: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete financial record"""
    business_id = current_user["business_id"]
    supabase = get_supabase()
    
    supabase.table("weekly_financials")\
        .delete()\
        .eq("business_id", business_id)\
        .eq("week_start", week_start)\
        .execute()
    
    return {"message": "Financial record deleted"}
