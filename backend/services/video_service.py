"""
Video Processing Service for Smart Traffic Congestion System.
Handles both Video Upload playback and Live Camera streaming.
Executes unified AI pipeline: OpenCV -> YOLOv8 -> ByteTrack -> Movement/Occupancy -> Event Manager.
Provides thread-safe MJPEG stream generation.
"""

import os
import time
import datetime
import threading
import cv2
import numpy as np
from ml.detection.vehicle_detection import vehicle_detector
from ml.event_engine import event_manager
from ml.congestion_prediction import predictor
from backend.ai.recommendation_service import ai_service
from backend.database.db import db_manager

class VideoProcessingService:
    def __init__(self):
        self.lock = threading.Lock()
        self.is_running = False
        self.is_paused = False
        self.source_type = "NONE"  # "VIDEO" or "CAMERA"
        self.source_path = None
        self.camera_index = 0

        self.cap = None
        self.worker_thread = None
        self.current_frame = None
        self.current_annotated_frame = None
        self.current_stats = {}
        
        # Performance settings
        self.frame_skip = 1        # Process every Nth frame if needed
        self.target_fps = 20
        self.frame_delay = 1.0 / self.target_fps

    def start_video_analysis(self, video_path: str, video_title: str = None):
        with self.lock:
            self._stop_internal()
            if not os.path.exists(video_path):
                raise FileNotFoundError(f"Video file not found at: {video_path}")

            self.source_type = "VIDEO"
            self.source_path = video_path
            self.cap = cv2.VideoCapture(video_path)
            if not self.cap.isOpened():
                raise ValueError(f"Could not open video source: {video_path}")

            if not video_title:
                raw_filename = os.path.basename(video_path)
                if '_' in raw_filename and raw_filename.split('_', 1)[0].isdigit():
                    video_title = raw_filename.split('_', 1)[1]
                else:
                    video_title = raw_filename
            corridor_id = f"Video: {video_title}"

            vehicle_detector.reset_tracking()
            event_manager.reset_session()
            event_manager.set_input_source(input_type="VIDEO_UPLOAD", camera_id=corridor_id)

            self.is_running = True
            self.is_paused = False
            self.worker_thread = threading.Thread(target=self._processing_loop, daemon=True)
            self.worker_thread.start()
            print(f"[VideoService] Started video analysis for: {corridor_id} ({video_path})")

    def start_camera_analysis(self, camera_index=0):
        with self.lock:
            self._stop_internal()
            self.source_type = "CAMERA"
            self.camera_index = int(camera_index)
            self.cap = cv2.VideoCapture(self.camera_index)
            
            # If default camera 0 can't open (e.g. no hardware webcam or in headless/docker),
            # fall back gracefully to the sample video corridor camera
            if not self.cap.isOpened():
                print(f"[VideoService] Device camera {camera_index} unavailable. Simulating live CCTV feed via expressway corridor stream.")
                current_dir = os.path.dirname(os.path.abspath(__file__))
                root_dir = os.path.dirname(os.path.dirname(current_dir))
                sample_path = os.path.join(root_dir, "ml", "videos", "sample_traffic.mp4")
                self.cap = cv2.VideoCapture(sample_path)
                self.source_path = sample_path

            vehicle_detector.reset_tracking()
            event_manager.reset_session()
            event_manager.set_input_source(input_type="LIVE_CAMERA", camera_id="CAM-LIVE-01")

            self.is_running = True
            self.is_paused = False
            self.worker_thread = threading.Thread(target=self._processing_loop, daemon=True)
            self.worker_thread.start()
            print(f"[VideoService] Started live camera analysis")

    def process_client_frame(self, frame_bgr: np.ndarray):
        """
        Allows browser-side webcam to push captured frames directly via POST API.
        Ensures live camera works seamlessly across any browser regardless of local OS permissions.
        """
        with self.lock:
            self.source_type = "BROWSER_CAMERA"
            event_manager.set_input_source(input_type="LIVE_CAMERA", camera_id="CAM-BROWSER-01")
            
            annotated, stats = vehicle_detector.process_frame(frame_bgr, timestamp=time.time())
            realtime_status = event_manager.process_frame_stats(stats)
            self.current_annotated_frame = annotated
            self.current_stats = realtime_status
            return realtime_status, annotated

    def pause_analysis(self):
        with self.lock:
            self.is_paused = not self.is_paused
            print(f"[VideoService] Analysis paused state: {self.is_paused}")
            return {"is_paused": self.is_paused}

    def stop_analysis(self):
        with self.lock:
            self._stop_internal()
            print(f"[VideoService] Stopped analysis")
            return {"status": "stopped"}

    def _stop_internal(self):
        if event_manager.frame_buffer:
            try:
                event_manager.flush_current_buffer(force=False)
            except Exception as e:
                print(f"[VideoService] Error flushing buffer on stop: {e}")
        self.is_running = False
        self.is_paused = False
        if self.cap:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None

    def _processing_loop(self):
        frame_counter = 0
        while self.is_running:
            if self.is_paused:
                time.sleep(0.1)
                continue

            loop_start = time.time()
            if self.cap is None or not self.cap.isOpened():
                time.sleep(0.1)
                continue

            ret, frame = self.cap.read()
            if not ret:
                if self.source_type == "VIDEO" or self.source_type == "CAMERA":
                    # Flush accumulated buffer as an interval record before looping
                    try:
                        event_manager.flush_current_buffer(force=False)
                    except Exception as e:
                        print(f"[VideoService] Error flushing on loop: {e}")
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ret, frame = self.cap.read()
                    if not ret:
                        time.sleep(0.1)
                        continue
                else:
                    time.sleep(0.1)
                    continue

            frame_counter += 1
            if frame_counter % self.frame_skip != 0:
                continue

            # Resize if video resolution is too large (keep width <= 960 for high FPS)
            h, w = frame.shape[:2]
            if w > 960:
                scale = 960.0 / w
                frame = cv2.resize(frame, (960, int(h * scale)))

            timestamp = time.time()
            # Run YOLO + ByteTrack + Feature Extraction
            annotated_frame, stats = vehicle_detector.process_frame(frame, timestamp=timestamp)
            
            # Feed to Event Manager
            realtime_status = event_manager.process_frame_stats(stats)

            with self.lock:
                self.current_frame = frame
                self.current_annotated_frame = annotated_frame
                self.current_stats = realtime_status

            # Throttle to target FPS
            elapsed = time.time() - loop_start
            sleep_time = max(0.01, self.frame_delay - elapsed)
            time.sleep(sleep_time)

    def generate_mjpeg_stream(self):
        """
        Yields multipart JPEG frames for browser <img> streaming.
        """
        while True:
            if not self.is_running or self.current_annotated_frame is None:
                # Generate a clean idle placeholder canvas
                idle_img = np.full((400, 700, 3), (15, 23, 42), dtype=np.uint8)
                cv2.putText(idle_img, "NO ACTIVE VIDEO FEED", (180, 180),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (148, 163, 184), 2, cv2.LINE_AA)
                cv2.putText(idle_img, "Click 'Start Analysis' or 'Start Camera' to begin monitoring", (110, 220),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 116, 139), 1, cv2.LINE_AA)
                ret, jpeg = cv2.imencode('.jpg', idle_img)
                frame_bytes = jpeg.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                time.sleep(0.5)
                continue

            with self.lock:
                frame_to_send = self.current_annotated_frame.copy() if self.current_annotated_frame is not None else None

            if frame_to_send is not None:
                ret, jpeg = cv2.imencode('.jpg', frame_to_send, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
                if ret:
                    frame_bytes = jpeg.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

            time.sleep(0.04)  # ~25 fps max for stream

    def analyze_full_video(self, video_path: str, video_title: str = None, interval_seconds: int = 20):
        """
        Processes an entire uploaded video file from start to finish.
        Extracts detections, tracks vehicles, calculates speed/occupancy,
        and saves discrete interval records and traffic events directly into the database.
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found at: {video_path}")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")

        if not video_title:
            raw_filename = os.path.basename(video_path)
            if '_' in raw_filename and raw_filename.split('_', 1)[0].isdigit():
                video_title = raw_filename.split('_', 1)[1]
            else:
                video_title = raw_filename
        corridor_id = f"Video: {video_title}"

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        duration_sec = total_frames / fps if fps > 0 else 0

        # Sample every N frames to process rapidly while retaining tracking accuracy (3 frames per sec)
        step = max(1, int(fps / 3))
        
        # Reset tracker for clean pass
        vehicle_detector.reset_tracking()
        
        current_frame_idx = 0
        current_window_frames = []
        recorded_events = []
        highest_congestion = "LOW"
        peak_vehicles = 0
        total_movement_sum = 0.0
        total_occupancy_sum = 0.0
        processed_count = 0
        simulated_start_time = time.time()

        while True:
            cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame_idx)
            ret, frame = cap.read()
            if not ret:
                break

            h, w = frame.shape[:2]
            if w > 960:
                scale = 960.0 / w
                frame = cv2.resize(frame, (960, int(h * scale)))

            simulated_ts = simulated_start_time + (current_frame_idx / fps)
            annotated, stats = vehicle_detector.process_frame(frame, timestamp=simulated_ts)
            
            # Predict frame congestion
            pred = predictor.predict(stats)
            stats["congestion_level"] = pred["congestion_level"]
            stats["confidence"] = pred["confidence"]
            stats["timestamp"] = simulated_ts
            current_window_frames.append(stats)
            
            peak_vehicles = max(peak_vehicles, stats.get("total_vehicles", 0))
            total_movement_sum += stats.get("average_movement", 0.0)
            total_occupancy_sum += stats.get("road_occupancy", 0.0)
            processed_count += 1

            # Window length threshold (e.g. interval_seconds * 3 samples) or reaching end
            if len(current_window_frames) >= int(interval_seconds * 3) or (current_frame_idx + step >= total_frames):
                nw = len(current_window_frames)
                if nw > 0:
                    avg_c = int(round(sum(f.get("cars", 0) for f in current_window_frames) / nw))
                    avg_m = int(round(sum(f.get("motorcycles", 0) for f in current_window_frames) / nw))
                    avg_b = int(round(sum(f.get("buses", 0) for f in current_window_frames) / nw))
                    avg_t = int(round(sum(f.get("trucks", 0) for f in current_window_frames) / nw))
                    avg_tot = avg_c + avg_m + avg_b + avg_t
                    avg_mov = round(sum(f.get("average_movement", 0.0) for f in current_window_frames) / nw, 2)
                    avg_occ = round(sum(f.get("road_occupancy", 0.0) for f in current_window_frames) / nw, 2)

                    agg_features = {
                        "cars": avg_c, "motorcycles": avg_m, "buses": avg_b, "trucks": avg_t,
                        "total_vehicles": avg_tot, "average_movement": avg_mov, "road_occupancy": avg_occ
                    }
                    pred_res = predictor.predict(agg_features)
                    int_cong = pred_res["congestion_level"]
                    if int_cong == "HIGH":
                        highest_congestion = "HIGH"
                    elif int_cong == "MEDIUM" and highest_congestion != "HIGH":
                        highest_congestion = "MEDIUM"

                    # AI recommendation
                    ai_rec = ai_service.generate_recommendation(
                        traffic_data={**agg_features, "congestion_level": int_cong, "camera_id": corridor_id},
                        previous_status="LOW"
                    )

                    evt_data = {
                        "camera_id": corridor_id,
                        "input_type": "VIDEO_UPLOAD",
                        "timestamp": datetime.datetime.utcnow(),
                        "cars": avg_c,
                        "motorcycles": avg_m,
                        "buses": avg_b,
                        "trucks": avg_t,
                        "total_vehicles": avg_tot,
                        "average_movement": avg_mov,
                        "road_occupancy": avg_occ,
                        "congestion_level": int_cong,
                        "confidence": pred_res["confidence"],
                        "ai_summary": ai_rec.get("summary", ""),
                        "ai_reason": ai_rec.get("reason", ""),
                        "ai_recommendation": ai_rec.get("recommendation", ""),
                        "priority": ai_rec.get("priority", int_cong),
                        "status": "ACTIVE" if int_cong == "HIGH" else "CLOSED"
                    }
                    saved = db_manager.save_event(evt_data)
                    recorded_events.append(saved)
                    current_window_frames.clear()

            current_frame_idx += step
            if current_frame_idx >= total_frames:
                break

        cap.release()
        
        # Update event manager realtime status to latest
        if recorded_events:
            last = recorded_events[-1]
            event_manager.set_input_source(input_type="VIDEO_UPLOAD", camera_id=corridor_id)
            event_manager.latest_one_minute_record = last
            event_manager.current_realtime_status.update({
                "cars": last["cars"],
                "motorcycles": last["motorcycles"],
                "buses": last["buses"],
                "trucks": last["trucks"],
                "total_vehicles": last["total_vehicles"],
                "average_movement": last["average_movement"],
                "road_occupancy": last["road_occupancy"],
                "congestion_level": last["congestion_level"],
                "confidence": last["confidence"],
                "is_alert_blinking": last["congestion_level"] == "HIGH" and last["status"] == "ACTIVE",
                "active_event": last if last["congestion_level"] == "HIGH" else None
            })

        return {
            "status": "completed",
            "video_title": video_title,
            "corridor_id": corridor_id,
            "duration_seconds": round(duration_sec, 1),
            "frames_analyzed": processed_count,
            "records_generated": len(recorded_events),
            "highest_congestion": highest_congestion,
            "peak_vehicles": peak_vehicles,
            "avg_movement": round(total_movement_sum / max(1, processed_count), 2),
            "avg_occupancy": round(total_occupancy_sum / max(1, processed_count), 2),
            "events": recorded_events
        }

    def get_current_status(self):
        return {
            "is_running": self.is_running,
            "is_paused": self.is_paused,
            "source_type": self.source_type,
            "telemetry": self.current_stats
        }

# Global singleton
video_service = VideoProcessingService()
