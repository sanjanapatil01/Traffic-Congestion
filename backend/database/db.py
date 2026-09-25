"""
Database module for Smart Traffic Congestion System.
Supports PostgreSQL (via psycopg2 / SQLAlchemy) with automatic SQLite fallback.
Creates the `traffic_events` table and provides CRUD functions.
"""

import os
import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, desc
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

class TrafficEvent(Base):
    __tablename__ = 'traffic_events'

    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String(50), nullable=False, default='CAM-01')
    input_type = Column(String(20), nullable=False, default='VIDEO_UPLOAD')  # VIDEO_UPLOAD or LIVE_CAMERA
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    cars = Column(Integer, default=0, nullable=False)
    motorcycles = Column(Integer, default=0, nullable=False)
    buses = Column(Integer, default=0, nullable=False)
    trucks = Column(Integer, default=0, nullable=False)
    total_vehicles = Column(Integer, default=0, nullable=False)
    average_movement = Column(Float, default=0.0, nullable=False)  # px/sec
    road_occupancy = Column(Float, default=0.0, nullable=False)    # %
    congestion_level = Column(String(10), nullable=False)          # LOW, MEDIUM, HIGH
    confidence = Column(Float, default=0.95, nullable=False)
    ai_summary = Column(Text, nullable=True)
    ai_reason = Column(Text, nullable=True)
    ai_recommendation = Column(Text, nullable=True)
    priority = Column(String(10), default='LOW', nullable=False)   # LOW, MEDIUM, HIGH
    status = Column(String(20), default='ACTIVE', nullable=False)  # ACTIVE, ACKNOWLEDGED, CLOSED
    acknowledged_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "camera_id": self.camera_id,
            "input_type": self.input_type,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "cars": self.cars,
            "motorcycles": self.motorcycles,
            "buses": self.buses,
            "trucks": self.trucks,
            "total_vehicles": self.total_vehicles,
            "average_movement": round(self.average_movement, 2),
            "road_occupancy": round(self.road_occupancy, 2),
            "congestion_level": self.congestion_level,
            "confidence": round(self.confidence, 4),
            "ai_summary": self.ai_summary or "",
            "ai_reason": self.ai_reason or "",
            "ai_recommendation": self.ai_recommendation or "",
            "priority": self.priority,
            "status": self.status,
            "acknowledged_at": self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            "closed_at": self.closed_at.isoformat() if self.closed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class DatabaseManager:
    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL")
        self.engine = None
        self.SessionLocal = None
        self.is_postgres = False
        self._init_db()

    def _init_db(self):
        # Check if PostgreSQL URL is provided
        if self.db_url and ("postgres" in self.db_url or "postgresql" in self.db_url):
            try:
                # Normalizing postgres:// to postgresql:// for SQLAlchemy
                url = self.db_url.replace("postgres://", "postgresql://", 1)
                self.engine = create_engine(url, pool_pre_ping=True)
                Base.metadata.create_all(bind=self.engine)
                self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
                self.is_postgres = True
                print(f"[Database] Connected to PostgreSQL successfully at {url.split('@')[-1] if '@' in url else 'Postgres'}")
                return
            except Exception as e:
                print(f"[Database] PostgreSQL connection failed: {e}. Falling back to SQLite.")

        # Fallback to local SQLite database in database folder
        current_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.dirname(os.path.dirname(current_dir))
        sqlite_path = os.path.join(root_dir, "database", "smart_traffic.db")
        os.makedirs(os.path.dirname(sqlite_path), exist_ok=True)
        sqlite_url = f"sqlite:///{sqlite_path}"
        
        self.engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.is_postgres = False
        print(f"[Database] Using SQLite database at {sqlite_path}")

    def get_session(self):
        return self.SessionLocal()

    def save_event(self, event_data: dict) -> dict:
        session = self.get_session()
        try:
            event = TrafficEvent(
                camera_id=event_data.get('camera_id', 'CAM-01'),
                input_type=event_data.get('input_type', 'VIDEO_UPLOAD'),
                timestamp=event_data.get('timestamp') or datetime.datetime.utcnow(),
                cars=int(event_data.get('cars', 0)),
                motorcycles=int(event_data.get('motorcycles', 0)),
                buses=int(event_data.get('buses', 0)),
                trucks=int(event_data.get('trucks', 0)),
                total_vehicles=int(event_data.get('total_vehicles', 0)),
                average_movement=float(event_data.get('average_movement', 0.0)),
                road_occupancy=float(event_data.get('road_occupancy', 0.0)),
                congestion_level=event_data.get('congestion_level', 'LOW'),
                confidence=float(event_data.get('confidence', 0.95)),
                ai_summary=event_data.get('ai_summary', ''),
                ai_reason=event_data.get('ai_reason', ''),
                ai_recommendation=event_data.get('ai_recommendation', ''),
                priority=event_data.get('priority', 'LOW'),
                status=event_data.get('status', 'ACTIVE')
            )
            session.add(event)
            session.commit()
            session.refresh(event)
            return event.to_dict()
        except Exception as e:
            session.rollback()
            print(f"[Database] Error saving event: {e}")
            raise e
        finally:
            session.close()

    def update_event(self, event_id: int, update_data: dict) -> dict:
        session = self.get_session()
        try:
            event = session.query(TrafficEvent).filter(TrafficEvent.id == event_id).first()
            if not event:
                return None
            for key, val in update_data.items():
                if hasattr(event, key):
                    setattr(event, key, val)
            session.commit()
            session.refresh(event)
            return event.to_dict()
        except Exception as e:
            session.rollback()
            print(f"[Database] Error updating event #{event_id}: {e}")
            raise e
        finally:
            session.close()

    def acknowledge_event(self, event_id: int) -> dict:
        session = self.get_session()
        try:
            event = session.query(TrafficEvent).filter(TrafficEvent.id == event_id).first()
            if not event:
                return None
            event.status = 'ACKNOWLEDGED'
            event.acknowledged_at = datetime.datetime.utcnow()
            session.commit()
            session.refresh(event)
            return event.to_dict()
        except Exception as e:
            session.rollback()
            print(f"[Database] Error acknowledging event #{event_id}: {e}")
            raise e
        finally:
            session.close()

    def close_event(self, event_id: int) -> dict:
        session = self.get_session()
        try:
            event = session.query(TrafficEvent).filter(TrafficEvent.id == event_id).first()
            if not event:
                return None
            event.status = 'CLOSED'
            event.closed_at = datetime.datetime.utcnow()
            session.commit()
            session.refresh(event)
            return event.to_dict()
        except Exception as e:
            session.rollback()
            print(f"[Database] Error closing event #{event_id}: {e}")
            raise e
        finally:
            session.close()

    def get_latest_active_high_event(self, camera_id='CAM-01'):
        session = self.get_session()
        try:
            event = session.query(TrafficEvent).filter(
                TrafficEvent.camera_id == camera_id,
                TrafficEvent.congestion_level == 'HIGH',
                TrafficEvent.status.in_(['ACTIVE', 'ACKNOWLEDGED'])
            ).order_by(desc(TrafficEvent.id)).first()
            return event.to_dict() if event else None
        finally:
            session.close()

    def get_history(self, page=1, limit=10, date_filter=None, congestion_filter=None, camera_filter=None, status_filter=None):
        session = self.get_session()
        try:
            query = session.query(TrafficEvent)
            if congestion_filter and congestion_filter.upper() != 'ALL':
                query = query.filter(TrafficEvent.congestion_level == congestion_filter.upper())
            if status_filter and status_filter.upper() != 'ALL':
                query = query.filter(TrafficEvent.status == status_filter.upper())
            if camera_filter and camera_filter.upper() != 'ALL':
                query = query.filter(TrafficEvent.camera_id == camera_filter)
            if date_filter:
                try:
                    target_date = datetime.datetime.strptime(date_filter, "%Y-%m-%d").date()
                    next_day = target_date + datetime.timedelta(days=1)
                    query = query.filter(TrafficEvent.timestamp >= target_date, TrafficEvent.timestamp < next_day)
                except Exception:
                    pass

            total_count = query.count()
            offset = (page - 1) * limit
            events = query.order_by(desc(TrafficEvent.timestamp)).offset(offset).limit(limit).all()
            
            return {
                "events": [e.to_dict() for e in events],
                "total": total_count,
                "page": page,
                "limit": limit,
                "pages": max(1, (total_count + limit - 1) // limit)
            }
        finally:
            session.close()

    def get_analytics_summary(self):
        session = self.get_session()
        try:
            events = session.query(TrafficEvent).order_by(TrafficEvent.timestamp.asc()).all()
            if not events:
                return {
                    "total_records": 0,
                    "congestion_distribution": {"LOW": 0, "MEDIUM": 0, "HIGH": 0},
                    "vehicle_breakdown": {"cars": 0, "motorcycles": 0, "buses": 0, "trucks": 0},
                    "high_congestion_count": 0,
                    "avg_vehicles_per_minute": 0,
                    "traffic_trend": []
                }

            cong_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
            veh_counts = {"cars": 0, "motorcycles": 0, "buses": 0, "trucks": 0}
            trend = []

            for e in events:
                lvl = e.congestion_level.upper() if e.congestion_level else "LOW"
                cong_counts[lvl] = cong_counts.get(lvl, 0) + 1
                veh_counts["cars"] += e.cars
                veh_counts["motorcycles"] += e.motorcycles
                veh_counts["buses"] += e.buses
                veh_counts["trucks"] += e.trucks

                trend.append({
                    "time": e.timestamp.strftime("%H:%M") if e.timestamp else "00:00",
                    "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                    "total_vehicles": e.total_vehicles,
                    "congestion_level": e.congestion_level,
                    "numeric_level": 1 if lvl == "LOW" else (2 if lvl == "MEDIUM" else 3),
                    "average_movement": e.average_movement,
                    "road_occupancy": e.road_occupancy
                })

            high_count = cong_counts.get("HIGH", 0)
            avg_v = round(sum(e.total_vehicles for e in events) / max(1, len(events)), 1)

            return {
                "total_records": len(events),
                "congestion_distribution": cong_counts,
                "vehicle_breakdown": veh_counts,
                "high_congestion_count": high_count,
                "avg_vehicles_per_minute": avg_v,
                "traffic_trend": trend[-50:]  # Latest 50 intervals
            }
        finally:
            session.close()

# Global database manager instance
db_manager = DatabaseManager()
