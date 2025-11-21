"""Scheduling logic and validation"""
from typing import List, Dict, Set
from datetime import datetime, timedelta

def get_week_days(week_start_str: str) -> Dict[str, str]:
    """
    Get all dates for a week given the start date.
    Returns: {"mon": "2024-01-01", "tue": "2024-01-02", ...}
    """
    week_start = datetime.strptime(week_start_str, "%Y-%m-%d")
    days_map = {
        "mon": 0, "tue": 1, "wed": 2, "thu": 3, 
        "fri": 4, "sat": 5, "sun": 6
    }
    
    result = {}
    for day_name, offset in days_map.items():
        date = week_start + timedelta(days=offset)
        result[day_name] = date.strftime("%Y-%m-%d")
    
    return result

def validate_schedule(shifts: List[Dict], employees: List[Dict]) -> Dict:
    """
    Validate generated schedule for conflicts.
    Returns: {"valid": bool, "errors": [], "warnings": []}
    """
    errors = []
    warnings = []
    
    # Track employee assignments per day
    day_assignments: Dict[str, Set[int]] = {}
    
    for shift in shifts:
        day = shift["day"]
        emp_id = shift["employee_id"]
        
        # Initialize day set
        if day not in day_assignments:
            day_assignments[day] = set()
        
        # Check for duplicate assignment
        if emp_id in day_assignments[day]:
            errors.append(f"Employee {emp_id} scheduled twice on {day}")
        else:
            day_assignments[day].add(emp_id)
        
        # Check availability
        employee = next((e for e in employees if e["id"] == emp_id), None)
        if employee:
            if day not in employee.get("availability", []):
                errors.append(
                    f"Employee {emp_id} ({employee.get('full_name', 'Unknown')}) "
                    f"not available on {day}"
                )
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings
    }

def calculate_schedule_coverage(shifts: List[Dict], staffing_rules: List[Dict]) -> Dict:
    """
    Calculate how well the schedule meets staffing requirements.
    Returns: {"day": {"required": 5, "scheduled": 4, "coverage_pct": 80}}
    """
    coverage = {}
    
    # Count shifts per day
    day_counts = {}
    for shift in shifts:
        day = shift["day"]
        day_counts[day] = day_counts.get(day, 0) + 1
    
    # Compare to requirements
    for rule in staffing_rules:
        day = rule["day"]
        required = rule["required"]
        scheduled = day_counts.get(day, 0)
        
        coverage[day] = {
            "required": required,
            "scheduled": scheduled,
            "coverage_pct": round((scheduled / required * 100) if required > 0 else 100, 1)
        }
    
    return coverage
