"""
Flask REST API Routes for Smart Traffic Congestion Prediction System.
"""

import os
import time
import base64
import cv2
import numpy as np
from flask import Blueprint, request, jsonify, Response, current_app
from werkzeug.utils import secure_filename
from backend.services.video_service import video_service
from ml.detection.vehicle_detection import vehicle_detector
from ml.event_engine import event_manager
from backend.database.db import db_manager
from backend.ai.recommendation_service import ai_service
from ml.congestion_prediction import predictor

api_bp = Blueprint('api', __name__)

ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# 1. Video Upload
@api_bp.route('/video/upload', methods=['POST'])
def upload_video():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in request"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": f"Invalid file format. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

    filename = secure_filename(file.filename)
    # Prefix with timestamp to avoid collision
    saved_filename = f"{int(time.time())}_{filename}"
    upload_dir = current_app.config.get('UPLOAD_FOLDER', 'ml/videos')
    os.makedirs(upload_dir, exist_ok=True)
    save_path = os.path.join(upload_dir, saved_filename)
    file.save(save_path)

    # Read video metadata using OpenCV
    cap = cv2.VideoCapture(save_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration_sec = round(frame_count / fps, 1) if fps > 0 else 0.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    cap.release()

    return jsonify({
        "message": "Video uploaded successfully",
        "filename": saved_filename,
        "original_name": filename,
        "video_path": save_path,
        "duration_seconds": duration_sec,
        "fps": round(fps, 1),
        "resolution": f"{w}x{h}"
    }), 200

# 2. Start Analysis
@api_bp.route('/analysis/start', methods=['POST'])
def start_analysis():
    data = request.get_json(silent=True) or {}
    source_type = data.get('source_type', 'VIDEO').upper()  # 'VIDEO' or 'CAMERA' or 'SAMPLE'
    video_path = data.get('video_path')
    camera_index = data.get('camera_index', 0)
    video_name = data.get('video_name') or data.get('title')

    try:
        if source_type == 'SAMPLE':
            current_dir = os.path.dirname(os.path.abspath(__file__))
            root_dir = os.path.dirname(os.path.dirname(current_dir))
            sample_path = os.path.join(root_dir, "ml", "videos", "sample_traffic.mp4")
            video_service.start_video_analysis(sample_path, video_title="sample_traffic.mp4")
            return jsonify({"message": "Sample traffic video analysis started", "source": "SAMPLE", "path": sample_path, "video_name": "sample_traffic.mp4"})

        elif source_type == 'CAMERA':
            video_service.start_camera_analysis(camera_index)
            return jsonify({"message": f"Live camera analysis started on device {camera_index}", "source": "CAMERA"})

        else: # VIDEO
            if not video_path:
                return jsonify({"error": "Missing video_path for video analysis"}), 400
            video_service.start_video_analysis(video_path, video_title=video_name)
            return jsonify({"message": "Video analysis started", "source": "VIDEO", "path": video_path, "video_name": video_name})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 2b. Analyze Full Video (Batch Mode)
@api_bp.route('/video/analyze-full', methods=['POST'])
def analyze_full_video_route():
    data = request.get_json(silent=True) or {}
    video_path = data.get('video_path')
    video_name = data.get('video_name') or data.get('title')
    interval_seconds = int(data.get('interval_seconds', 20))

    if not video_path:
        return jsonify({"error": "Missing video_path"}), 400

    try:
        result = video_service.analyze_full_video(
            video_path=video_path,
            video_title=video_name,
            interval_seconds=interval_seconds
        )
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 3. Stop Analysis
@api_bp.route('/analysis/stop', methods=['POST'])
def stop_analysis():
    res = video_service.stop_analysis()
    saved = event_manager.flush_current_buffer(force=False)
    if saved:
        res["record"] = saved
    return jsonify(res)

# 4. Pause Analysis
@api_bp.route('/analysis/pause', methods=['POST'])
def pause_analysis():
    res = video_service.pause_analysis()
    return jsonify(res)

# 5. Live MJPEG Feed
@api_bp.route('/video/feed')
def video_feed():
    return Response(
        video_service.generate_mjpeg_stream(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

# 6. Push Browser Webcam Frame (Alternative client webcam support)
@api_bp.route('/analysis/frame', methods=['POST'])
def process_client_frame():
    try:
        data = request.get_json(silent=True) or {}
        image_data = data.get('image')
        if not image_data:
            return jsonify({"error": "No image data provided"}), 400

        # Handle data:image/jpeg;base64, prefix
        if ',' in image_data:
            image_data = image_data.split(',', 1)[1]

        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({"error": "Failed to decode frame"}), 400

        stats, annotated = video_service.process_client_frame(frame)
        return jsonify({"status": "success", "stats": stats})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 7. Get Current Real-time Traffic Status
@api_bp.route('/traffic/current', methods=['GET'])
def get_current_traffic():
    status = video_service.get_current_status()
    # Check if active high event is recorded
    active_ev = db_manager.get_latest_active_high_event()
    status["active_high_event"] = active_ev

    # Fetch latest stored record
    latest_db_record = db_manager.get_history(page=1, limit=1)
    latest_evt = latest_db_record['events'][0] if latest_db_record.get('events') else None
    status["latest_record"] = latest_evt

    # If stream is idle or telemetry has no vehicles, populate with latest analysis record
    curr_telem = status.get("telemetry") or {}
    if not status.get("is_running") or not curr_telem.get("total_vehicles"):
        if latest_evt:
            status["telemetry"] = {
                "cars": latest_evt.get("cars", 0),
                "motorcycles": latest_evt.get("motorcycles", 0),
                "buses": latest_evt.get("buses", 0),
                "trucks": latest_evt.get("trucks", 0),
                "total_vehicles": latest_evt.get("total_vehicles", 0),
                "average_movement": latest_evt.get("average_movement", 0.0),
                "road_occupancy": latest_evt.get("road_occupancy", 0.0),
                "congestion_level": latest_evt.get("congestion_level", "LOW"),
                "confidence": latest_evt.get("confidence", 0.95),
                "is_alert_blinking": latest_evt.get("status") == "ACTIVE" and latest_evt.get("congestion_level") == "HIGH",
                "active_event": latest_evt if latest_evt.get("status") == "ACTIVE" and latest_evt.get("congestion_level") == "HIGH" else None,
                "camera_id": latest_evt.get("camera_id", "CAM-01"),
                "input_type": latest_evt.get("input_type", "VIDEO_UPLOAD"),
                "recorded_at": latest_evt.get("timestamp"),
                "ai_summary": latest_evt.get("ai_summary", ""),
                "ai_reason": latest_evt.get("ai_reason", ""),
                "ai_recommendation": latest_evt.get("ai_recommendation", ""),
                "latest_record": latest_evt
            }
            if not status.get("source_type") or status["source_type"] == "NONE":
                status["source_type"] = latest_evt.get("input_type", "VIDEO_UPLOAD")
                status["source_title"] = latest_evt.get("camera_id", "Uploaded Video")

    return jsonify(status)

# 8. Get Traffic History with Pagination & Filters
@api_bp.route('/traffic/history', methods=['GET'])
def get_traffic_history():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    date_filter = request.args.get('date')
    congestion_filter = request.args.get('congestion')
    camera_filter = request.args.get('camera')
    status_filter = request.args.get('status')

    history_data = db_manager.get_history(
        page=page,
        limit=limit,
        date_filter=date_filter,
        congestion_filter=congestion_filter,
        camera_filter=camera_filter,
        status_filter=status_filter
    )
    return jsonify(history_data)

# 8b. Record Current Analysis Interval Immediately
@api_bp.route('/traffic/record-now', methods=['POST'])
def record_traffic_now():
    try:
        saved = event_manager.flush_current_buffer(force=True)
        if saved:
            return jsonify({"message": "Current analysis interval recorded successfully", "record": saved}), 200
        return jsonify({"message": "No active telemetry to record", "record": None}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 8c. Clear All Traffic History and Events
@api_bp.route('/traffic/clear', methods=['POST'])
def clear_traffic_history():
    try:
        res = db_manager.clear_all_events()
        event_manager.reset_session()
        return jsonify({"message": "All history records and traffic events cleared", "details": res}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 8d. Get List of Corridors / Video Sources
@api_bp.route('/corridors', methods=['GET'])
def get_corridors():
    try:
        corridors = db_manager.get_distinct_corridors()
        return jsonify({"corridors": corridors}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 9. Get Events List
@api_bp.route('/events', methods=['GET'])
def get_events():
    status_filter = request.args.get('status', 'ALL')
    history_data = db_manager.get_history(page=1, limit=50, status_filter=status_filter)
    return jsonify(history_data)

# 10. Acknowledge Red Blinking Alert / Event
@api_bp.route('/events/<int:event_id>/acknowledge', methods=['POST'])
def acknowledge_event(event_id):
    # Update event manager state
    event_manager.acknowledge_current_alert()
    # Ensure DB record is acknowledged
    updated = db_manager.acknowledge_event(event_id)
    if not updated:
        return jsonify({"error": "Event not found"}), 404
    return jsonify({"message": f"Event #{event_id} acknowledged successfully", "event": updated})

# 11. Close Event
@api_bp.route('/events/<int:event_id>/close', methods=['POST'])
def close_event(event_id):
    event_manager.close_current_alert()
    closed = db_manager.close_event(event_id)
    if not closed:
        return jsonify({"error": "Event not found"}), 404
    return jsonify({"message": f"Event #{event_id} closed", "event": closed})

# 12. Generate or Test AI Recommendation
@api_bp.route('/ai/recommendation', methods=['POST'])
def get_ai_recommendation():
    data = request.get_json(silent=True) or {}
    previous_status = data.get('previous_status', 'LOW')
    recommendation = ai_service.generate_recommendation(data, previous_status=previous_status)
    return jsonify(recommendation)

# 13. System Analytics Summary
@api_bp.route('/analytics', methods=['GET'])
def get_analytics():
    summary = db_manager.get_analytics_summary()
    return jsonify(summary)

# 14. Configure System Settings
@api_bp.route('/settings', methods=['GET', 'POST'])
def handle_settings():
    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        if 'confidence_threshold' in data:
            vehicle_detector.set_confidence(float(data['confidence_threshold']))
        if 'interval_seconds' in data:
            event_manager.set_interval(int(data['interval_seconds']))
        if 'ai_api_key' in data:
            ai_service.api_key = str(data['ai_api_key']).strip()
        if 'ai_model' in data:
            ai_service.gemini_model = str(data['ai_model']).strip()

        if 'roi_x_start_pct' in data and 'roi_x_end_pct' in data:
            vehicle_detector.set_roi(float(data['roi_x_start_pct']), float(data['roi_x_end_pct']))
        elif 'roi_x_start' in data and 'roi_x_end' in data:
            vehicle_detector.set_roi(float(data['roi_x_start']) / 100.0, float(data['roi_x_end']) / 100.0)

        return jsonify({
            "message": "Settings updated successfully",
            "confidence_threshold": vehicle_detector.conf_threshold,
            "interval_seconds": event_manager.interval_seconds,
            "ai_configured": bool(ai_service.api_key),
            "ai_model": ai_service.gemini_model,
            "roi_x_start_pct": vehicle_detector.roi_x_start_pct,
            "roi_x_end_pct": vehicle_detector.roi_x_end_pct
        })

    return jsonify({
        "confidence_threshold": vehicle_detector.conf_threshold,
        "interval_seconds": event_manager.interval_seconds,
        "ai_configured": bool(ai_service.api_key),
        "ai_model": ai_service.gemini_model,
        "is_postgres": db_manager.is_postgres,
        "roi_x_start_pct": vehicle_detector.roi_x_start_pct,
        "roi_x_end_pct": vehicle_detector.roi_x_end_pct
    })

# 15. Health Check
@api_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "system": "SMART TRAFFIC CONGESTION PREDICTION AND MANAGEMENT SYSTEM",
        "version": "1.0.0-PROTOTYPE",
        "database": "PostgreSQL" if db_manager.is_postgres else "SQLite (Fallback Ready)",
        "models": {
            "yolo_detection": vehicle_detector.model is not None,
            "congestion_classifier": predictor.model is not None
        },
        "video_service": {
            "is_running": video_service.is_running,
            "source": video_service.source_type
        },
        "ai_recommendation": {
            "configured": bool(ai_service.api_key),
            "model": ai_service.gemini_model
        },
        "timestamp": time.time()
    })
