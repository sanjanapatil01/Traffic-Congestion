"""
Main Flask Application for SMART TRAFFIC CONGESTION PREDICTION AND MANAGEMENT SYSTEM.
Enterprise Intelligent Transportation System (ITS).
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add project root to sys.path so ml/ and backend/ can be imported easily
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

# Load environment variables
dotenv_path = project_root / ".env"
load_dotenv(dotenv_path=dotenv_path)

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from backend.routes.api import api_bp
from backend.database.db import db_manager, TrafficEvent
import datetime

def create_app():
    app = Flask(__name__, static_folder=str(project_root / "frontend" / "dist"))
    
    # Configure Upload Folder
    upload_dir = project_root / "ml" / "videos"
    upload_dir.mkdir(parents=True, exist_ok=True)
    app.config['UPLOAD_FOLDER'] = str(upload_dir)
    app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500 MB max upload

    # Enable CORS for React frontend (Vite port 5173 and all origins)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register Blueprints
    app.register_blueprint(api_bp, url_prefix='/api')

    # Seed initial prototype history records if table is brand new
    _seed_initial_records()

    # Serve React production build if available
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        dist_dir = project_root / "frontend" / "dist"
        if dist_dir.exists() and (dist_dir / path).exists() and path != "":
            return send_from_directory(str(dist_dir), path)
        elif dist_dir.exists() and (dist_dir / "index.html").exists():
            return send_from_directory(str(dist_dir), "index.html")
        else:
            return jsonify({
                "message": "Smart Traffic System Backend API is Running",
                "docs": "/api/health",
                "frontend_dev_server": "http://localhost:5173"
            })

    return app

def _seed_initial_records():
    session = db_manager.get_session()
    try:
        count = session.query(TrafficEvent).count()
        if count == 0:
            print("[Database] Seeding initial prototype historical records for demonstration...")
            base_time = datetime.datetime.utcnow() - datetime.timedelta(minutes=30)
            
            sample_data = [
                {"min": 0, "cars": 12, "m": 6, "b": 1, "t": 1, "mov": 105.0, "occ": 14.5, "lvl": "LOW", "st": "CLOSED"},
                {"min": 5, "cars": 15, "m": 7, "b": 1, "t": 2, "mov": 98.0, "occ": 18.2, "lvl": "LOW", "st": "CLOSED"},
                {"min": 10, "cars": 22, "m": 11, "b": 3, "t": 3, "mov": 52.0, "occ": 42.0, "lvl": "MEDIUM", "st": "CLOSED"},
                {"min": 15, "cars": 26, "m": 12, "b": 4, "t": 3, "mov": 44.0, "occ": 49.5, "lvl": "MEDIUM", "st": "CLOSED"},
                {"min": 20, "cars": 38, "m": 18, "b": 6, "t": 6, "mov": 18.0, "occ": 72.0, "lvl": "HIGH", "st": "ACKNOWLEDGED", "ack": 22},
                {"min": 25, "cars": 34, "m": 15, "b": 5, "t": 5, "mov": 24.0, "occ": 65.0, "lvl": "HIGH", "st": "ACKNOWLEDGED", "ack": 26},
            ]

            for s in sample_data:
                t = base_time + datetime.timedelta(minutes=s["min"])
                tot = s["cars"] + s["m"] + s["b"] + s["t"]
                
                ai_sum = f"{s['lvl']} congestion recorded with {tot} vehicles detected."
                ai_rec = "Corridor is moving smoothly." if s["lvl"] == "LOW" else ("Monitor entry ramps." if s["lvl"] == "MEDIUM" else "Adjust signal timing and deploy traffic marshals.")
                
                ev = TrafficEvent(
                    camera_id="CAM-01",
                    input_type="VIDEO_UPLOAD",
                    timestamp=t,
                    cars=s["cars"],
                    motorcycles=s["m"],
                    buses=s["b"],
                    trucks=s["t"],
                    total_vehicles=tot,
                    average_movement=s["mov"],
                    road_occupancy=s["occ"],
                    congestion_level=s["lvl"],
                    confidence=0.96,
                    ai_summary=ai_sum,
                    ai_reason="Standard commuter density variation observed on expressway corridor.",
                    ai_recommendation=ai_rec,
                    priority=s["lvl"],
                    status=s["st"],
                    acknowledged_at=t + datetime.timedelta(minutes=2) if "ack" in s else None,
                    closed_at=t + datetime.timedelta(minutes=5) if s["st"] == "CLOSED" else None
                )
                session.add(ev)
            session.commit()
            print("[Database] Seeded 6 prototype records successfully.")
    except Exception as e:
        session.rollback()
        print(f"[Database] Notice during seeding: {e}")
    finally:
        session.close()

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"\n=======================================================")
    print(f" SMART TRAFFIC CONGESTION PREDICTION AND MANAGEMENT SYSTEM")
    print(f" REST API Server starting on http://127.0.0.1:{port}")
    print(f"=======================================================\n")
    app.run(host=host, port=port, debug=False, threaded=True)
