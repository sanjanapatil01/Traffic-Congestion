"""
Generates a realistic synthetic road traffic video (MP4) with cars, trucks, buses, and motorcycles.
Useful for instant demonstration and automated pipeline testing.
"""

import cv2
import numpy as np
import os
import random

def generate_traffic_video(output_path="sample_traffic.mp4", duration_sec=20, fps=25, width=800, height=500):
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    total_frames = duration_sec * fps
    
    # Road geometry
    road_top = 80
    road_bottom = 500
    lanes = [
        {"x_start": 120, "width": 130, "dir": 1},  # Lane 1 (down)
        {"x_start": 260, "width": 130, "dir": 1},  # Lane 2 (down)
        {"x_start": 410, "width": 130, "dir": 1},  # Lane 3 (down)
        {"x_start": 550, "width": 130, "dir": 1},  # Lane 4 (down)
    ]
    
    # Vehicle templates: (type, width, height, color, base_speed, name)
    # Realistic vehicle visual representation that YOLO or OpenCV can track
    vehicle_types = [
        {"type": "car", "w": 65, "h": 110, "color": (40, 50, 200), "speed": 4.5, "name": "car"},
        {"type": "car", "w": 60, "h": 105, "color": (220, 220, 220), "speed": 5.0, "name": "car"},
        {"type": "motorcycle", "w": 30, "h": 55, "color": (0, 165, 255), "speed": 6.2, "name": "motorcycle"},
        {"type": "bus", "w": 85, "h": 190, "color": (30, 180, 50), "speed": 3.2, "name": "bus"},
        {"type": "truck", "w": 85, "h": 180, "color": (180, 130, 70), "speed": 3.0, "name": "truck"},
    ]
    
    # Active vehicles on road
    active_vehicles = []
    
    def spawn_vehicle(lane_idx):
        lane = lanes[lane_idx]
        v_template = random.choice(vehicle_types)
        x = lane["x_start"] + (lane["width"] - v_template["w"]) // 2
        y = -v_template["h"] - random.randint(10, 80)
        return {
            "x": x,
            "y": y,
            "w": v_template["w"],
            "h": v_template["h"],
            "color": v_template["color"],
            "speed": v_template["speed"] + random.uniform(-0.5, 0.5),
            "type": v_template["type"],
            "lane": lane_idx
        }
    
    # Initial vehicles
    for i in range(len(lanes)):
        active_vehicles.append(spawn_vehicle(i))
        v2 = spawn_vehicle(i)
        v2["y"] = random.randint(100, 350)
        active_vehicles.append(v2)
        
    for frame_idx in range(total_frames):
        # Create road background
        frame = np.full((height, width, 3), (35, 38, 42), dtype=np.uint8)
        
        # Draw road asphalt
        cv2.rectangle(frame, (100, 0), (700, height), (48, 52, 58), -1)
        # Road borders
        cv2.line(frame, (100, 0), (100, height), (220, 220, 220), 4)
        cv2.line(frame, (700, 0), (700, height), (220, 220, 220), 4)
        
        # Draw lane dashed markings
        dash_offset = (frame_idx * 4) % 40
        for lx in [250, 400, 540]:
            for y_mark in range(-40 + dash_offset, height + 40, 40):
                cv2.line(frame, (lx, y_mark), (lx, y_mark + 20), (255, 255, 255), 2)
                
        # Overhead gantry / sign simulation
        cv2.rectangle(frame, (0, 0), (width, 35), (20, 22, 26), -1)
        cv2.putText(frame, "TRAFFIC CCTV CAM-01: EXPRESSWAY CORRIDOR [LIVE FEED]", (15, 24),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 200), 2)
        
        # Congestion phases during video:
        # 0-5s: smooth flow (high speed)
        # 6-13s: density surge / slowing down
        # 14-20s: recovery / medium flow
        t = frame_idx / fps
        speed_factor = 1.0
        if 6 <= t <= 13:
            speed_factor = 0.35  # Congestion slowdown
        elif t > 13:
            speed_factor = 0.75
            
        # Update and draw vehicles
        for v in active_vehicles:
            v["y"] += v["speed"] * speed_factor
            
            # Vehicle body
            vx, vy, vw, vh = int(v["x"]), int(v["y"]), int(v["w"]), int(v["h"])
            # Shadow
            cv2.rectangle(frame, (vx + 4, vy + 4), (vx + vw + 4, vy + vh + 4), (20, 20, 20), -1)
            # Body
            cv2.rectangle(frame, (vx, vy), (vx + vw, vy + vh), v["color"], -1)
            cv2.rectangle(frame, (vx, vy), (vx + vw, vy + vh), (255, 255, 255), 2)
            
            # Windshield / windows
            if v["type"] in ["car", "bus", "truck"]:
                ww = int(vw * 0.75)
                wx = vx + (vw - ww) // 2
                wy = vy + int(vh * 0.2)
                cv2.rectangle(frame, (wx, wy), (wx + ww, wy + int(vh * 0.2)), (60, 80, 100), -1)
                
                # Headlights
                cv2.circle(frame, (vx + 10, vy + vh - 6), 5, (0, 255, 255), -1)
                cv2.circle(frame, (vx + vw - 10, vy + vh - 6), 5, (0, 255, 255), -1)
                # Tail lights
                cv2.circle(frame, (vx + 8, vy + 6), 4, (0, 0, 220), -1)
                cv2.circle(frame, (vx + vw - 8, vy + 6), 4, (0, 0, 220), -1)
                
            # Respawn if vehicle passes bottom
            if v["y"] > height + 50:
                new_v = spawn_vehicle(v["lane"])
                v.update(new_v)
                
        out.write(frame)
        
    out.release()
    print(f"Sample traffic video generated at: {output_path}")

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    output_video = os.path.join(current_dir, "sample_traffic.mp4")
    generate_traffic_video(output_video, duration_sec=25, fps=25)
