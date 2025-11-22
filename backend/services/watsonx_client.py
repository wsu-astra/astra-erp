"""IBM WatsonX AI client for inventory and scheduling"""
import os
from typing import List, Dict, Any
from dotenv import load_dotenv
import json
from ibm_watsonx_ai.foundation_models import Model
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams

load_dotenv()

class WatsonXClient:
    def __init__(self):
        self.api_key = os.getenv("WATSONX_API_KEY")
        self.project_id = os.getenv("WATSONX_PROJECT_ID")
        self.url = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
        
        # Validate credentials
        if not self.api_key:
            raise ValueError("WATSONX_API_KEY is required")
        if not self.project_id:
            raise ValueError("WATSONX_PROJECT_ID is required")
        if self.api_key.startswith("ApiKey-"):
            raise ValueError(
                "Invalid API key format! You provided the Key ID instead of the actual key.\n"
                "Go to https://cloud.ibm.com/iam/apikeys and create a NEW key.\n"
                "Copy the LONG string shown (NOT the Key ID)."
            )
        
        print("=" * 60)
        print("🤖 WATSONX AI ENABLED")
        print("=" * 60)
        print(f"Model: meta-llama/llama-3-3-70b-instruct")
        print(f"Project ID: {self.project_id[:8]}...")
        print(f"API Key: {self.api_key[:10]}...")
        print("=" * 60)
        
        self.credentials = {
            "url": self.url,
            "apikey": self.api_key
        }
        
        self.model_id = "meta-llama/llama-3-3-70b-instruct"
        
        self.parameters = {
            GenParams.DECODING_METHOD: "greedy",
            GenParams.MAX_NEW_TOKENS: 1000,
            GenParams.MIN_NEW_TOKENS: 1,
            GenParams.TEMPERATURE: 0.3,
            GenParams.REPETITION_PENALTY: 1.1
        }
    
    def _get_model(self):
        """Initialize WatsonX model"""
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
        print("🤖 Calling WatsonX AI for inventory ordering...")
        print(f"   Processing {len(items)} items")
        
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

        model = self._get_model()
        print("   Sending request to WatsonX Llama-3.3-70B...")
        response = model.generate_text(prompt=prompt)
        print("   ✅ Received response from WatsonX AI")
        print(f"   📝 Raw response: {response[:500]}...")
        
        # Parse JSON response - be very robust
        response_text = response.strip()
        
        # Try to extract JSON from markdown code blocks
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        # Find ALL JSON objects and pick the best one (non-empty)
        try:
            all_json_objects = []
            i = 0
            while i < len(response_text):
                if response_text[i] == '{':
                    # Found start of a JSON object
                    start = i
                    brace_count = 0
                    end = start
                    for j in range(start, len(response_text)):
                        if response_text[j] == '{':
                            brace_count += 1
                        elif response_text[j] == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                end = j + 1
                                break
                    
                    # Extract this JSON object
                    json_text = response_text[start:end]
                    try:
                        parsed = json.loads(json_text)
                        all_json_objects.append(parsed)
                        print(f"   🔍 Found JSON object: {json_text}")
                    except json.JSONDecodeError:
                        pass  # Skip invalid JSON
                    
                    i = end
                else:
                    i += 1
            
            # Filter to only objects with 'orders' key (ignore example data)
            valid_results = [obj for obj in all_json_objects if 'orders' in obj]
            print(f"   📊 Found {len(valid_results)} valid order objects (out of {len(all_json_objects)} total JSON)")
            
            # Pick the best result: prefer non-empty orders array
            best_result = None
            for obj in valid_results:
                if len(obj['orders']) > 0:
                    best_result = obj
                    break
            
            # If no non-empty found, use the last valid one
            if not best_result and valid_results:
                best_result = valid_results[-1]
            
            if best_result:
                print(f"   ✅ Selected result: {best_result}")
                print(f"   📦 Generated {len(best_result.get('orders', []))} order recommendations")
                return best_result.get("orders", [])
            else:
                print("   ❌ No valid JSON found")
                return []
        except (ValueError, json.JSONDecodeError) as e:
            print(f"   ❌ Failed to parse JSON: {e}")
            print(f"   Response text: {response_text[:200]}...")
            return []
    
    def generate_schedule(
        self, 
        week_start: str, 
        staffing_rules: List[Dict], 
        employees: List[Dict],
        preferences: str = "",
        current_schedule: List[Dict] = None,
        store_hours: Dict = None,
        shift_slots: List[Dict] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate optimal employee schedule using WatsonX.
        
        Input:
        - week_start: "2024-01-01"
        - staffing_rules: [{"day": "fri", "required": 5}]
        - employees: [{"id": 1, "strength": "strong", "availability": ["fri"]}]
        
        Output: [{"employee_id": 1, "day": "fri"}]
        """
        print("🤖 Calling WatsonX AI for schedule generation...")
        print(f"   Week starting: {week_start}")
        print(f"   {len(employees)} employees, {len(staffing_rules)} days to schedule")
        
        preferences_section = f"\n\nAdditional Preferences:\n{preferences}\n" if preferences.strip() else ""
        
        current_schedule_section = ""
        if current_schedule:
            current_schedule_section = f"\n\nCurrent Schedule (you can modify/improve this):\n{json.dumps(current_schedule, indent=2)}\n"
        
        store_hours_section = ""
        if store_hours:
            store_hours_section = f"\n\nStore Hours (schedule shifts within these times):\n{json.dumps(store_hours, indent=2)}\n"
        
        shift_slots_section = ""
        if shift_slots:
            shift_slots_section = f"\n\nShift Slots (assign employees to these specific time slots):\n{json.dumps(shift_slots, indent=2)}\n"
        
        staffing_requirements_section = ""
        if staffing_rules:
            staffing_requirements_section = f"\n\nStaffing Requirements:\n{json.dumps(staffing_rules, indent=2)}"
            staffing_rule_text = "3. Meet the required staff count for each day"
        else:
            staffing_rule_text = "3. Balance workload evenly across available employees"
        
        prompt = f"""You are a scheduling AI for a small business. Create an optimal employee schedule.

Rules:
1. ONLY schedule employees who are available that day
2. NEVER schedule the same employee twice in one day  
{staffing_rule_text}
4. ONLY schedule shifts during store operating hours (ignore closed days)
5. IMPORTANT: If shift slots are provided, you MUST use ONLY those exact time slots. Match employees to the configured slots - DO NOT create custom times. Each shift MUST use the start_time and end_time from one of the shift_slots for that day.
6. Pair SHIFTLEADER employees with NEW employees when possible
7. Distribute shifts evenly across employees
8. If not enough staff available, schedule as many as possible
9. When shift_slots are configured, create one shift per slot per employee (respecting the required_count for each slot){preferences_section}

Week Start: {week_start}{staffing_requirements_section}{store_hours_section}{shift_slots_section}

Available Employees:
{json.dumps(employees, indent=2)}{current_schedule_section}

Return ONLY valid JSON in this exact format:
{{"shifts": [{{"employee_id": "uuid-here", "day": "fri", "start_time": "09:00", "end_time": "17:00"}}]}}

JSON Response:"""

        model = self._get_model()
        print("   Sending request to WatsonX Llama-3.3-70B...")
        response = model.generate_text(prompt=prompt)
        print("   ✅ Received response from WatsonX AI")
        
        # Parse JSON response
        response_text = response.strip()
        
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        result = json.loads(response_text)
        shifts = result.get("shifts", [])
        print(f"   📅 Generated {len(shifts)} shifts across the week")
        return shifts

# Singleton instance
watsonx_client = WatsonXClient()
