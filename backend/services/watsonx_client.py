"""IBM WatsonX AI client for inventory and scheduling"""
import os
from typing import List, Dict, Any
from dotenv import load_dotenv
import json

# Try to import WatsonX, but use fallback if not available
try:
    from ibm_watsonx_ai.foundation_models import Model
    from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams
    WATSONX_AVAILABLE = True
except ImportError:
    WATSONX_AVAILABLE = False
    print("WatsonX AI not available - using fallback algorithms")

load_dotenv()

class WatsonXClient:
    def __init__(self):
        self.api_key = os.getenv("WATSONX_API_KEY")
        self.project_id = os.getenv("WATSONX_PROJECT_ID")
        self.url = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
        
        self.use_fallback = not WATSONX_AVAILABLE or not self.api_key or not self.project_id
        
        if not self.use_fallback:
            self.credentials = {
                "url": self.url,
                "apikey": self.api_key
            }
            
            self.model_id = "meta-llama/llama-3-70b-instruct"
            
            self.parameters = {
                GenParams.DECODING_METHOD: "greedy",
                GenParams.MAX_NEW_TOKENS: 1000,
                GenParams.MIN_NEW_TOKENS: 1,
                GenParams.TEMPERATURE: 0.3,
                GenParams.REPETITION_PENALTY: 1.1
            }
    
    def _get_model(self):
        """Initialize WatsonX model"""
        if self.use_fallback:
            return None
        return Model(
            model_id=self.model_id,
            params=self.parameters,
            credentials=self.credentials,
            project_id=self.project_id
        )
    
    def generate_inventory_orders(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Generate smart inventory orders using WatsonX.
        
        Input: [{"id": 1, "name": "Fries", "current": 5, "min": 20}]
        Output: [{"id": 1, "order_qty": 15}]
        """
        # Use fallback if WatsonX not available
        if self.use_fallback:
            print("Using fallback inventory ordering algorithm")
            orders = []
            for item in items:
                if item["current"] < item["min"]:
                    buffer = int((item["min"] - item["current"]) * 0.2)
                    order_qty = (item["min"] - item["current"]) + buffer
                    orders.append({"id": item["id"], "order_qty": order_qty})
            return orders
        
        prompt = f"""You are an inventory management AI. Given a list of items with current and minimum quantities, calculate how much to order for each item.

Rules:
- If current >= min: order_qty = 0 (no order needed)
- If current < min: order_qty = (min - current) + buffer
- Add a 20% buffer for items marked as low stock
- Return ONLY valid JSON, no explanations

Input items:
{json.dumps(items, indent=2)}

Return a JSON object in this exact format:
{{"orders": [{{"id": 1, "order_qty": 15}}]}}

JSON Response:"""

        try:
            model = self._get_model()
            response = model.generate_text(prompt=prompt)
            
            # Parse JSON response
            response_text = response.strip()
            
            # Try to extract JSON from response
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            result = json.loads(response_text)
            return result.get("orders", [])
            
        except Exception as e:
            # Fallback: Simple calculation
            print(f"WatsonX error: {e}, using fallback")
            orders = []
            for item in items:
                if item["current"] < item["min"]:
                    buffer = int((item["min"] - item["current"]) * 0.2)
                    order_qty = (item["min"] - item["current"]) + buffer
                    orders.append({"id": item["id"], "order_qty": order_qty})
            return orders
    
    def generate_schedule(
        self, 
        week_start: str, 
        staffing_rules: List[Dict], 
        employees: List[Dict]
    ) -> List[Dict[str, Any]]:
        """
        Generate optimal employee schedule using WatsonX.
        
        Input:
        - week_start: "2024-01-01"
        - staffing_rules: [{"day": "fri", "required": 5}]
        - employees: [{"id": 1, "strength": "strong", "availability": ["fri"]}]
        
        Output: [{"employee_id": 1, "day": "fri"}]
        """
        # Use fallback if WatsonX not available
        if self.use_fallback:
            print("Using fallback scheduling algorithm")
            shifts = []
            
            for rule in staffing_rules:
                day = rule["day"]
                required = rule["required"]
                
                # Filter available employees for this day
                available = [
                    emp for emp in employees 
                    if day in emp["availability"]
                ]
                
                # Sort: strong first, then new (for pairing)
                available.sort(key=lambda e: (
                    0 if e["strength"] == "strong" 
                    else 2 if e["strength"] == "new" 
                    else 1
                ))
                
                # Assign shifts up to required count
                for i in range(min(required, len(available))):
                    shifts.append({
                        "employee_id": available[i]["id"],
                        "day": day
                    })
            
            return shifts
        
        prompt = f"""You are a scheduling AI for a small business. Create an optimal employee schedule.

Rules:
1. ONLY schedule employees who are available that day
2. NEVER schedule the same employee twice in one day
3. Meet the required staff count for each day
4. Pair STRONG employees with NEW employees when possible
5. Distribute shifts evenly across employees
6. If not enough staff available, schedule as many as possible

Week Start: {week_start}

Staffing Requirements:
{json.dumps(staffing_rules, indent=2)}

Available Employees:
{json.dumps(employees, indent=2)}

Return ONLY valid JSON in this exact format:
{{"shifts": [{{"employee_id": 1, "day": "fri"}}]}}

JSON Response:"""

        try:
            model = self._get_model()
            response = model.generate_text(prompt=prompt)
            
            # Parse JSON response
            response_text = response.strip()
            
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            result = json.loads(response_text)
            return result.get("shifts", [])
            
        except Exception as e:
            # Fallback: Simple round-robin scheduling
            print(f"WatsonX error: {e}, using fallback")
            shifts = []
            
            for rule in staffing_rules:
                day = rule["day"]
                required = rule["required"]
                
                # Filter available employees for this day
                available = [
                    emp for emp in employees 
                    if day in emp["availability"]
                ]
                
                # Sort: strong first, then new (for pairing)
                available.sort(key=lambda e: (
                    0 if e["strength"] == "strong" 
                    else 2 if e["strength"] == "new" 
                    else 1
                ))
                
                # Assign shifts up to required count
                for i in range(min(required, len(available))):
                    shifts.append({
                        "employee_id": available[i]["id"],
                        "day": day
                    })
            
            return shifts

# Singleton instance
watsonx_client = WatsonXClient()
