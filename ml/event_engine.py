"""
Traffic Event Manager and One-Minute Status Aggregator.
Implements:
1. Continuous frame statistics buffering.
2. 1-minute (or user-configured interval) aggregation and database persistence.
3. Event Lifecycle State Machine:
   - First HIGH -> Create Event (ACTIVE) -> Red Blinking Alert triggered.
   - Ongoing HIGH -> Update existing active Event.
   - User Acknowledge -> Mark ACKNOWLEDGED (Blinking stops).
   - Congestion drops to LOW -> Mark Event CLOSED.
   - New HIGH later -> New Event created (ACTIVE).
4. Automated AI recommendation trigger on each interval.
"""

import time
import datetime
from ml.congestion_prediction import predictor
from backend.ai.recommendation_service import ai_service
from backend.database.db import db_manager

class TrafficEventManager:
    def __init__(self, interval_seconds=15):
        self.interval_seconds = interval_seconds  # Adaptive 15s interval for responsive demonstration
        self.camera_id = "CAM-01"
        self.input_type = "VIDEO_UPLOAD"

        # Active event tracking: {"id": int, "status": "ACTIVE"|"ACKNOWLEDGED", ...}
        self.active_event = None
        self.previous_congestion_level = "LOW"
        self.current_realtime_status = {
            "cars": 0,
            "motorcycles": 0,
            "buses": 0,
            "trucks": 0,
            "total_vehicles": 0,
            "average_movement": 0.0,
            "road_occupancy": 0.0,
            "congestion_level": "LOW",
            "confidence": 0.95,
            "is_alert_blinking": False,
            "active_event_id": None
        }

        # Frame buffer for the current 1-minute window
        self.interval_start_time = time.time()
        self.frame_buffer = []
        self.latest_one_minute_record = None

    def set_interval(self, seconds: int):
        self.interval_seconds = max(1, int(seconds))
        print(f"[TrafficEventManager] Interval set to {self.interval_seconds} seconds")

    def set_input_source(self, input_type: str, camera_id: str = "CAM-01"):
        self.input_type = input_type
        self.camera_id = camera_id

    def reset_session(self):
        self.frame_buffer.clear()
        self.interval_start_time = time.time()
        self.active_event = None
        self.previous_congestion_level = "LOW"

    def process_frame_stats(self, frame_stats: dict) -> dict:
        """
        Receives per-frame detection stats.
        Updates real-time status and buffers stats for 1-minute aggregation.
        """
        now = time.time()
        
        # Real-time frame-level congestion prediction (for instantaneous UI feedback)
        pred = predictor.predict(frame_stats)
        cong_level = pred["congestion_level"]
        confidence = pred["confidence"]

        # Add to frame buffer
        self.frame_buffer.append({
            "timestamp": now,
            "cars": frame_stats.get("cars", 0),
            "motorcycles": frame_stats.get("motorcycles", 0),
            "buses": frame_stats.get("buses", 0),
            "trucks": frame_stats.get("trucks", 0),
            "total_vehicles": frame_stats.get("total_vehicles", 0),
            "average_movement": frame_stats.get("average_movement", 0.0),
            "road_occupancy": frame_stats.get("road_occupancy", 0.0),
            "congestion_level": cong_level,
            "confidence": confidence
        })

        # Check if 1-minute interval has elapsed
        elapsed = now - self.interval_start_time
        if elapsed >= self.interval_seconds and len(self.frame_buffer) > 0:
            self._generate_interval_status()
            self.frame_buffer.clear()
            self.interval_start_time = now

        # Determine blinking alert flag:
        # True ONLY if active_event is HIGH and status is 'ACTIVE' (unacknowledged)
        is_blinking = False
        if self.active_event and self.active_event.get("congestion_level") == "HIGH" and self.active_event.get("status") == "ACTIVE":
            is_blinking = True

        self.current_realtime_status = {
            "cars": frame_stats.get("cars", 0),
            "motorcycles": frame_stats.get("motorcycles", 0),
            "buses": frame_stats.get("buses", 0),
            "trucks": frame_stats.get("trucks", 0),
            "total_vehicles": frame_stats.get("total_vehicles", 0),
            "average_movement": frame_stats.get("average_movement", 0.0),
            "road_occupancy": frame_stats.get("road_occupancy", 0.0),
            "congestion_level": cong_level,
            "confidence": confidence,
            "probabilities": pred.get("probabilities", {}),
            "model_source": pred.get("source", "NEURAL_NETWORK_MLP"),
            "is_alert_blinking": is_blinking,
            "active_event": self.active_event,
            "interval_progress": min(100, int((elapsed / self.interval_seconds) * 100)),
            "interval_seconds_remaining": max(0, int(self.interval_seconds - elapsed)),
            "latest_record": self.latest_one_minute_record
        }

        return self.current_realtime_status

    def _generate_interval_status(self):
        """
        Aggregates frame buffer metrics across the 1-minute window,
        predicts interval congestion level, requests AI recommendation,
        and saves/updates database traffic event.
        """
        if not self.frame_buffer:
            return

        # Compute averages and medians across the 1-minute window
        n = len(self.frame_buffer)
        avg_cars = int(round(sum(f["cars"] for f in self.frame_buffer) / n))
        avg_motos = int(round(sum(f["motorcycles"] for f in self.frame_buffer) / n))
        avg_buses = int(round(sum(f["buses"] for f in self.frame_buffer) / n))
        avg_trucks = int(round(sum(f["trucks"] for f in self.frame_buffer) / n))
        avg_total = avg_cars + avg_motos + avg_buses + avg_trucks
        avg_movement = round(sum(f["average_movement"] for f in self.frame_buffer) / n, 2)
        avg_occupancy = round(sum(f["road_occupancy"] for f in self.frame_buffer) / n, 2)

        # Run Neural-Network model on aggregated features
        agg_features = {
            "cars": avg_cars,
            "motorcycles": avg_motos,
            "buses": avg_buses,
            "trucks": avg_trucks,
            "total_vehicles": avg_total,
            "average_movement": avg_movement,
            "road_occupancy": avg_occupancy
        }
        pred = predictor.predict(agg_features)
        interval_congestion = pred["congestion_level"]
        confidence = pred["confidence"]

        # Call AI Recommendation Service
        ai_rec = ai_service.generate_recommendation(
            traffic_data={**agg_features, "congestion_level": interval_congestion, "camera_id": self.camera_id},
            previous_status=self.previous_congestion_level
        )

        event_data = {
            "camera_id": self.camera_id,
            "input_type": self.input_type,
            "timestamp": datetime.datetime.utcnow(),
            "cars": avg_cars,
            "motorcycles": avg_motos,
            "buses": avg_buses,
            "trucks": avg_trucks,
            "total_vehicles": avg_total,
            "average_movement": avg_movement,
            "road_occupancy": avg_occupancy,
            "congestion_level": interval_congestion,
            "confidence": confidence,
            "ai_summary": ai_rec.get("summary", ""),
            "ai_reason": ai_rec.get("reason", ""),
            "ai_recommendation": ai_rec.get("recommendation", ""),
            "priority": ai_rec.get("priority", interval_congestion),
            "status": "ACTIVE"
        }

        # ----------------------------------------------------
        # Event Lifecycle State Machine:
        # LOW -> No critical event. If active HIGH event existed, close it.
        # MEDIUM -> Traffic status/warning record.
        # HIGH -> Critical congestion event:
        #   - If already active HIGH event -> update it
        #   - Else -> create new active HIGH event
        # ----------------------------------------------------
        if interval_congestion == "HIGH":
            if self.active_event and self.active_event.get("congestion_level") == "HIGH":
                # Update existing active or acknowledged HIGH event
                ev_id = self.active_event["id"]
                updated = db_manager.update_event(ev_id, {
                    "cars": avg_cars,
                    "motorcycles": avg_motos,
                    "buses": avg_buses,
                    "trucks": avg_trucks,
                    "total_vehicles": avg_total,
                    "average_movement": avg_movement,
                    "road_occupancy": avg_occupancy,
                    "ai_summary": ai_rec.get("summary", ""),
                    "ai_reason": ai_rec.get("reason", ""),
                    "ai_recommendation": ai_rec.get("recommendation", "")
                })
                if updated:
                    self.active_event.update(updated)
                saved_record = self.active_event
            else:
                # First HIGH occurrence -> create new ACTIVE event
                saved_record = db_manager.save_event(event_data)
                self.active_event = saved_record
                print(f"[TrafficEventManager] Created New HIGH Congestion Event #{saved_record['id']}")

        elif interval_congestion == "MEDIUM":
            # Save warning record
            saved_record = db_manager.save_event(event_data)
            # If an unclosed HIGH event was active, close it
            if self.active_event and self.active_event.get("congestion_level") == "HIGH":
                db_manager.close_event(self.active_event["id"])
                print(f"[TrafficEventManager] Closed HIGH Event #{self.active_event['id']} due to transition to MEDIUM")
                self.active_event = None

        else: # LOW
            # Always save 1-minute record with status CLOSED
            event_data["status"] = "CLOSED"
            event_data["closed_at"] = datetime.datetime.utcnow()
            saved_record = db_manager.save_event(event_data)
            # If an active event existed, close it
            if self.active_event:
                db_manager.close_event(self.active_event["id"])
                print(f"[TrafficEventManager] Closed Active Event #{self.active_event['id']} as congestion dropped to LOW")
                self.active_event = None

        self.previous_congestion_level = interval_congestion
        self.latest_one_minute_record = saved_record
        print(f"[TrafficEventManager] 1-Min Status Generated: {interval_congestion} ({avg_total} vehicles, {avg_occupancy}% occ, {avg_movement} px/s)")
        return saved_record

    def flush_current_buffer(self, force=False):
        """
        Immediately aggregates buffered frames and writes a record to the database.
        Called on stream stop, video loop/end, or manual operator log.
        """
        if self.frame_buffer:
            saved = self._generate_interval_status()
            self.frame_buffer.clear()
            self.interval_start_time = time.time()
            return saved
        elif force and self.current_realtime_status:
            now = time.time()
            self.frame_buffer.append({
                "timestamp": now,
                "cars": self.current_realtime_status.get("cars", 0),
                "motorcycles": self.current_realtime_status.get("motorcycles", 0),
                "buses": self.current_realtime_status.get("buses", 0),
                "trucks": self.current_realtime_status.get("trucks", 0),
                "total_vehicles": self.current_realtime_status.get("total_vehicles", 0),
                "average_movement": self.current_realtime_status.get("average_movement", 0.0),
                "road_occupancy": self.current_realtime_status.get("road_occupancy", 0.0),
                "congestion_level": self.current_realtime_status.get("congestion_level", "LOW"),
                "confidence": self.current_realtime_status.get("confidence", 0.95)
            })
            saved = self._generate_interval_status()
            self.frame_buffer.clear()
            self.interval_start_time = now
            return saved
        return None

    def acknowledge_current_alert(self) -> dict:
        """
        User clicked [ OK / ACKNOWLEDGE ] button on the red blinking alert.
        Changes database status: ACTIVE -> ACKNOWLEDGED.
        Stops blinking, but event remains stored in database and visible in history.
        """
        if self.active_event and self.active_event.get("id"):
            ev_id = self.active_event["id"]
            updated = db_manager.acknowledge_event(ev_id)
            if updated:
                self.active_event = updated
                self.current_realtime_status["is_alert_blinking"] = False
                self.current_realtime_status["active_event"] = updated
                print(f"[TrafficEventManager] Alert Acknowledged for Event #{ev_id}")
                return updated
        return {"status": "No active event to acknowledge"}

    def close_current_alert(self) -> dict:
        """
        Closes current active or acknowledged alert.
        """
        if self.active_event and self.active_event.get("id"):
            ev_id = self.active_event["id"]
            closed = db_manager.close_event(ev_id)
            self.active_event = None
            self.current_realtime_status["is_alert_blinking"] = False
            self.current_realtime_status["active_event"] = None
            return closed
        return {"status": "No active event"}

# Global singleton
event_manager = TrafficEventManager(interval_seconds=15)
