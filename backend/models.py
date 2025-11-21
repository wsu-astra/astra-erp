"""Pydantic models for request/response validation"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal
from datetime import date

# ==================== AUTH MODELS ====================

class SignUpRequest(BaseModel):
    email: str
    password: str
    business_name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user_id: str
    business_id: str
    business_name: str
    logo_url: Optional[str] = None

# ==================== BUSINESS MODELS ====================

class BusinessCreate(BaseModel):
    name: str
    logo_url: Optional[str] = None

class BusinessResponse(BaseModel):
    id: str
    name: str
    logo_url: Optional[str] = None
    created_at: str

# ==================== INVENTORY MODELS ====================

class InventoryItemCreate(BaseModel):
    name: str
    category: Optional[str] = None
    current_quantity: int = Field(ge=0)
    minimum_quantity: int = Field(ge=0, default=0)
    unit: str = "unit"
    instacart_search: Optional[str] = None

class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    current_quantity: Optional[int] = Field(ge=0, default=None)
    minimum_quantity: Optional[int] = Field(ge=0, default=None)
    unit: Optional[str] = None
    instacart_search: Optional[str] = None

class InventoryItemResponse(BaseModel):
    id: int
    business_id: str
    name: str
    category: Optional[str]
    current_quantity: int
    minimum_quantity: int
    unit: str
    instacart_search: Optional[str]
    status: str  # "In Stock" | "Low" | "Out"
    last_updated: str

class OrderItem(BaseModel):
    id: int
    name: str
    current: int
    min: int

class WatsonXOrderRequest(BaseModel):
    items: List[OrderItem]

class WatsonXOrderResponse(BaseModel):
    orders: List[dict]

# ==================== EMPLOYEE MODELS ====================

class EmployeeCreate(BaseModel):
    full_name: str
    role: Optional[str] = None
    strength: Literal['strong', 'normal', 'new'] = 'normal'
    active: bool = True
    availability: List[str] = []  # List of days: ['mon', 'tue', ...]

    @field_validator('availability')
    def validate_days(cls, v):
        valid_days = {'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'}
        for day in v:
            if day not in valid_days:
                raise ValueError(f"Invalid day: {day}")
        return v

class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    strength: Optional[Literal['strong', 'normal', 'new']] = None
    active: Optional[bool] = None
    availability: Optional[List[str]] = None

class EmployeeResponse(BaseModel):
    id: int
    business_id: str
    full_name: str
    role: Optional[str]
    strength: str
    active: bool
    availability: List[str]

# ==================== STAFFING MODELS ====================

class StaffingRuleCreate(BaseModel):
    day_of_week: Literal['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    required_count: int = Field(ge=0)

class StaffingRuleUpdate(BaseModel):
    required_count: int = Field(ge=0)

class StaffingRuleResponse(BaseModel):
    id: int
    business_id: str
    day_of_week: str
    required_count: int

# ==================== SCHEDULE MODELS ====================

class ScheduleGenerateRequest(BaseModel):
    week_start: date

class ShiftResponse(BaseModel):
    id: int
    business_id: str
    week_start: str
    day_of_week: str
    employee_id: int
    employee_name: str
    start_time: str
    end_time: str

class WatsonXScheduleRequest(BaseModel):
    week_start: str
    staffing_rules: List[dict]
    employees: List[dict]

# ==================== FINANCIALS MODELS ====================

class FinancialsCreate(BaseModel):
    week_start: date
    gross_sales: float = Field(ge=0)
    payroll: float = Field(ge=0)

class FinancialsResponse(BaseModel):
    id: int
    business_id: str
    week_start: str
    gross_sales: float
    payroll: float
    payroll_pct: float
    status: str  # "green" | "yellow" | "red"

# ==================== REMINDER MODELS ====================

class ReminderCreate(BaseModel):
    type: Literal['payroll', 'inventory', 'schedule']
    day_of_week: Literal['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    time_of_day: str  # Format: "HH:MM"
    message: str
    active: bool = True

class ReminderUpdate(BaseModel):
    type: Optional[Literal['payroll', 'inventory', 'schedule']] = None
    day_of_week: Optional[Literal['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']] = None
    time_of_day: Optional[str] = None
    message: Optional[str] = None
    active: Optional[bool] = None

class ReminderResponse(BaseModel):
    id: int
    business_id: str
    type: str
    day_of_week: str
    time_of_day: str
    message: str
    active: bool

# ==================== DASHBOARD MODELS ====================

class DashboardStats(BaseModel):
    total_inventory_items: int
    low_stock_count: int
    out_of_stock_count: int
    total_employees: int
    active_employees: int
    upcoming_shifts: int
    todays_reminders: List[ReminderResponse]
