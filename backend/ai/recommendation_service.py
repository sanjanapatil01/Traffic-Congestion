"""
AI Traffic Recommendation Service.
Generates structured traffic operator advisories using Google Gemini / LLM API,
with a robust domain-specific rule-based fallback engine.
"""

import os
import json
import requests
import datetime

class AIRecommendationService:
    def __init__(self):
        self.api_key = os.getenv("AI_API_KEY", "").strip()
        self.gemini_model = os.getenv("AI_MODEL", "gemini-1.5-flash")

    def generate_recommendation(self, traffic_data: dict, previous_status: str = None) -> dict:
        """
        Receives structured traffic status and returns:
        {
            "summary": "...",
            "reason": "...",
            "recommendation": "...",
            "priority": "LOW" | "MEDIUM" | "HIGH",
            "source": "LLM" | "FALLBACK"
        }
        """
        congestion_level = traffic_data.get("congestion_level", "LOW").upper()
        total_vehicles = traffic_data.get("total_vehicles", 0)
        cars = traffic_data.get("cars", 0)
        buses = traffic_data.get("buses", 0)
        trucks = traffic_data.get("trucks", 0)
        motorcycles = traffic_data.get("motorcycles", 0)
        avg_movement = traffic_data.get("average_movement", 0.0)
        road_occupancy = traffic_data.get("road_occupancy", 0.0)
        camera_id = traffic_data.get("camera_id", "CAM-01")
        timestamp_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Try LLM if API key is provided
        if self.api_key and len(self.api_key) > 5:
            try:
                llm_result = self._call_gemini_api(
                    congestion_level=congestion_level,
                    total_vehicles=total_vehicles,
                    cars=cars,
                    buses=buses,
                    trucks=trucks,
                    motorcycles=motorcycles,
                    avg_movement=avg_movement,
                    road_occupancy=road_occupancy,
                    camera_id=camera_id,
                    previous_status=previous_status,
                    timestamp_str=timestamp_str
                )
                if llm_result:
                    llm_result["source"] = "LLM"
                    return llm_result
            except Exception as e:
                print(f"[AIRecommendationService] LLM API call failed: {e}. Switching to rule-based fallback.")

        # Fallback to rule-based expert recommendation
        fallback = self._rule_based_recommendation(
            congestion_level=congestion_level,
            total_vehicles=total_vehicles,
            cars=cars,
            buses=buses,
            trucks=trucks,
            motorcycles=motorcycles,
            avg_movement=avg_movement,
            road_occupancy=road_occupancy,
            previous_status=previous_status
        )
        fallback["source"] = "FALLBACK"
        return fallback

    def _call_gemini_api(self, congestion_level, total_vehicles, cars, buses, trucks, motorcycles, avg_movement, road_occupancy, camera_id, previous_status, timestamp_str):
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.api_key}"
        
        prompt = f"""
You are an expert Intelligent Transportation Systems (ITS) traffic control advisor.
Analyze the following real-time 1-minute camera traffic telemetry and return a concise, professional assessment.

Telemetry Data:
- Camera / Corridor ID: {camera_id}
- Timestamp: {timestamp_str}
- Congestion Level: {congestion_level}
- Total Detected Vehicles: {total_vehicles} (Cars: {cars}, Buses: {buses}, Trucks: {trucks}, Motorcycles: {motorcycles})
- Average Estimated Movement: {avg_movement} px/sec
- Monitored Road Occupancy: {road_occupancy}%
- Previous Interval Status: {previous_status or 'N/A'}

Rules:
1. Provide short, clear, professional language suitable for a municipal traffic operations center.
2. Do NOT output markdown code fences or general conversational pleasantries.
3. Return ONLY a valid JSON object with EXACTLY these four keys:
   "summary": (1 sentence summarizing current traffic situation),
   "reason": (1-2 sentences on likely cause based on vehicle distribution, occupancy, and movement speed),
   "recommendation": (1-2 actionable, safe traffic management suggestions such as signal timing adjustments, corridor monitoring, or diversion advice),
   "priority": ("LOW", "MEDIUM", or "HIGH")
"""
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json"
            }
        }

        resp = requests.post(endpoint, json=payload, timeout=6)
        if resp.status_code == 200:
            data = resp.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            # Clean possible markdown wrap
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            parsed = json.loads(text.strip())
            return {
                "summary": parsed.get("summary", ""),
                "reason": parsed.get("reason", ""),
                "recommendation": parsed.get("recommendation", ""),
                "priority": parsed.get("priority", congestion_level).upper()
            }
        else:
            print(f"[AIRecommendationService] Gemini API returned HTTP {resp.status_code}: {resp.text}")
            return None

    def _rule_based_recommendation(self, congestion_level, total_vehicles, cars, buses, trucks, motorcycles, avg_movement, road_occupancy, previous_status):
        heavy_vehicles = buses + trucks

        if congestion_level == "HIGH":
            if heavy_vehicles >= 4:
                reason = f"High density of heavy transit vehicles ({heavy_vehicles} buses/trucks) and low vehicle movement ({avg_movement:.1f} px/s) causing bottlenecking."
                rec = "Adjust downstream traffic signal splits to extend green wave duration for the main corridor. Consider staging traffic marshals at the next intersection."
            else:
                reason = f"Vehicle volume ({total_vehicles} units) exceeds corridor discharge capacity with road occupancy at {road_occupancy:.1f}%."
                rec = "Trigger upstream variable message signs (VMS) advising drivers of severe delay. Prepare perimeter metering to throttle incoming lane flow."
            
            return {
                "summary": "Critical traffic congestion detected with severe vehicle queueing and minimal headway.",
                "reason": reason,
                "recommendation": rec,
                "priority": "HIGH"
            }

        elif congestion_level == "MEDIUM":
            if avg_movement < 45.0:
                reason = f"Traffic flow is decelerating (movement {avg_movement:.1f} px/s) with moderate road occupancy of {road_occupancy:.1f}%."
                rec = "Keep corridor under active CCTV surveillance. Prepare adaptive signal offsets if queue lengths increase."
            else:
                reason = f"Moderate volume of {total_vehicles} vehicles currently travelling at stable transit speeds."
                rec = "Maintain standard automated signal cycles. Monitor incoming entry ramps for vehicle buildup."

            return {
                "summary": "Moderate traffic density observed. Corridor is operating near nominal capacity.",
                "reason": reason,
                "recommendation": rec,
                "priority": "MEDIUM"
            }

        else: # LOW
            return {
                "summary": "Traffic flow is low and moving freely with no operational impediments.",
                "reason": f"Low vehicle count ({total_vehicles} vehicles) with open road occupancy ({road_occupancy:.1f}%) and healthy average speed ({avg_movement:.1f} px/s).",
                "recommendation": "Maintain baseline signal timing. No intervention or diversion required.",
                "priority": "LOW"
            }

# Global singleton
ai_service = AIRecommendationService()
