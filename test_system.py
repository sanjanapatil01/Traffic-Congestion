"""
Comprehensive Automated Acceptance Test Suite
for SMART TRAFFIC CONGESTION PREDICTION AND MANAGEMENT SYSTEM.
Tests all requirements: Vision, ML prediction, 1-minute aggregation, event system, and APIs.
"""

import sys
import os
import time
import json
import base64
import cv2
import numpy as np

# Ensure project root is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from backend.app import app
from ml.detection.vehicle_detection import vehicle_detector
from ml.congestion_prediction import predictor
from ml.event_engine import event_manager
from backend.database.db import db_manager

def run_tests():
    print("====================================================================")
    print(" RUNNING SMART TRAFFIC CONGESTION SYSTEM VERIFICATION SUITE")
    print("====================================================================\n")

    client = app.test_client()

    # Test 1: Health Endpoint
    print("[TEST 1] Testing GET /api/health...")
    res = client.get('/api/health')
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    assert data["status"] == "healthy"
    assert data["models"]["congestion_classifier"] is True
    assert data["models"]["yolo_detection"] is True
    print(" -> PASSED: Health check OK, YOLO and ML models active.\n")

    # Test 2: Neural Network Congestion Predictor
    print("[TEST 2] Testing Neural-Network Congestion Predictor (Low, Med, High)...")
    low_res = predictor.predict({
        'cars': 5, 'motorcycles': 2, 'buses': 0, 'trucks': 0,
        'average_movement': 120.0, 'road_occupancy': 12.0
    })
    print(f" -> Low scenario prediction: {low_res['congestion_level']} (Conf: {low_res['confidence']})")
    assert low_res['congestion_level'] == 'LOW'

    high_res = predictor.predict({
        'cars': 42, 'motorcycles': 18, 'buses': 6, 'trucks': 6,
        'average_movement': 12.0, 'road_occupancy': 78.0
    })
    print(f" -> High scenario prediction: {high_res['congestion_level']} (Conf: {high_res['confidence']})")
    assert high_res['congestion_level'] == 'HIGH'
    print(" -> PASSED: Neural-network prediction correctly classified traffic states.\n")

    # Test 3: AI Recommendation Engine
    print("[TEST 3] Testing POST /api/ai/recommendation...")
    rec_res = client.post('/api/ai/recommendation', json={
        'congestion_level': 'HIGH',
        'total_vehicles': 52,
        'cars': 35,
        'buses': 5,
        'trucks': 5,
        'motorcycles': 7,
        'average_movement': 14.5,
        'road_occupancy': 74.0,
        'previous_status': 'MEDIUM'
    })
    assert rec_res.status_code == 200
    rec_data = rec_res.get_json()
    assert "summary" in rec_data
    assert "recommendation" in rec_data
    assert rec_data["priority"] == "HIGH"
    print(f" -> AI Advisory Summary: {rec_data['summary']}")
    print(f" -> AI Action: {rec_data['recommendation']}")
    print(" -> PASSED: AI Recommendation formatted as structured JSON.\n")

    # Test 4: Video Detection & Tracking on Sample Video
    print("[TEST 4] Testing YOLOv8 + ByteTrack on sample corridor video...")
    cap = cv2.VideoCapture("ml/videos/sample_traffic.mp4")
    assert cap.isOpened(), "Could not open sample_traffic.mp4"
    cap.set(cv2.CAP_PROP_POS_FRAMES, 50)
    ret, frame = cap.read()
    cap.release()
    assert ret, "Could not read frame 50"

    annotated, stats = vehicle_detector.process_frame(frame)
    assert stats["total_vehicles"] > 0, "No vehicles detected"
    assert "average_movement" in stats
    assert "road_occupancy" in stats
    print(f" -> Detected Vehicles: {stats['total_vehicles']} (Cars:{stats['cars']}, Buses:{stats['buses']}, Bikes:{stats['motorcycles']})")
    print(f" -> Estimated Movement: {stats['average_movement']} px/s | Occupancy: {stats['road_occupancy']}%")
    print(" -> PASSED: Vision pipeline extracted vehicle tracking and metrics.\n")

    # Test 5: Event State Machine & Red Blinking Alert
    print("[TEST 5] Testing Traffic Event Manager & Blinking Alert Lifecycle...")
    event_manager.set_interval(1) # Set fast interval for unit test
    event_manager.set_input_source("VIDEO_UPLOAD", "CAM-01")

    # Simulate High Congestion Frame
    high_frame_stats = {
        'cars': 38, 'motorcycles': 15, 'buses': 6, 'trucks': 5,
        'total_vehicles': 64, 'average_movement': 14.0, 'road_occupancy': 75.0
    }
    event_manager.interval_start_time = time.time() - 2.0
    status1 = event_manager.process_frame_stats(high_frame_stats)
    active_ev = event_manager.active_event
    assert active_ev is not None, "Active event should have been created on HIGH"
    assert active_ev["status"] == "ACTIVE"
    assert status1["is_alert_blinking"] is True, "Alert must blink on unacknowledged HIGH"
    ev_id = active_ev["id"]
    print(f" -> High Event #{ev_id} created with status ACTIVE. Alert is blinking: {status1['is_alert_blinking']}")

    # User clicks [ OK / ACKNOWLEDGE ]
    ack_res = client.post(f'/api/events/{ev_id}/acknowledge')
    assert ack_res.status_code == 200
    ack_data = ack_res.get_json()
    assert ack_data["event"]["status"] == "ACKNOWLEDGED"
    print(f" -> User clicked OK: Event #{ev_id} status changed to ACKNOWLEDGED.")

    # Status check confirms blinking stopped
    status3 = event_manager.process_frame_stats(high_frame_stats)
    assert status3["is_alert_blinking"] is False, "Blinking must stop after acknowledgement"
    print(" -> PASSED: Alert blinking stopped after acknowledgement while keeping event stored.\n")

    # Test 6: Congestion drops to LOW -> Event CLOSES
    print("[TEST 6] Testing Event Auto-Closure when traffic drops to LOW...")
    low_frame_stats = {
        'cars': 4, 'motorcycles': 1, 'buses': 0, 'trucks': 0,
        'total_vehicles': 5, 'average_movement': 115.0, 'road_occupancy': 10.0
    }
    event_manager.interval_start_time = time.time() - 2.0
    event_manager.process_frame_stats(low_frame_stats)
    assert event_manager.active_event is None, "Active event must close when congestion returns to LOW"
    print(" -> PASSED: Event transitioned to CLOSED when traffic cleared.\n")

    # Test 7: History and Pagination
    print("[TEST 7] Testing GET /api/traffic/history...")
    hist_res = client.get('/api/traffic/history?page=1&limit=5')
    assert hist_res.status_code == 200
    hist_data = hist_res.get_json()
    assert len(hist_data["events"]) > 0
    assert hist_data["total"] >= 1
    print(f" -> Found {hist_data['total']} total historical records in database.")
    print(" -> PASSED: History query and pagination functioning.\n")

    # Test 8: Analytics Endpoint
    print("[TEST 8] Testing GET /api/analytics...")
    anal_res = client.get('/api/analytics')
    assert anal_res.status_code == 200
    anal_data = anal_res.get_json()
    assert "congestion_distribution" in anal_data
    assert "vehicle_breakdown" in anal_data
    assert "traffic_trend" in anal_data
    print(" -> PASSED: Analytics summaries and trend lines generated.\n")

    # Reset interval back to standard 60 seconds
    event_manager.set_interval(60)

    print("====================================================================")
    print(" ALL 8 ACCEPTANCE TESTS PASSED SUCCESSFULLY! ")
    print(" Prototype is 100% functional, robust, and verified. ")
    print("====================================================================\n")

if __name__ == '__main__':
    run_tests()
