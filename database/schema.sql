-- ====================================================================
-- SMART TRAFFIC CONGESTION PREDICTION AND MANAGEMENT SYSTEM
-- Database Schema: PostgreSQL
-- ====================================================================

-- Create table: traffic_events
CREATE TABLE IF NOT EXISTS traffic_events (
    id SERIAL PRIMARY KEY,
    camera_id VARCHAR(50) NOT NULL DEFAULT 'CAM-01',
    input_type VARCHAR(20) NOT NULL DEFAULT 'VIDEO_UPLOAD', -- 'VIDEO_UPLOAD' or 'LIVE_CAMERA'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cars INTEGER NOT NULL DEFAULT 0,
    motorcycles INTEGER NOT NULL DEFAULT 0,
    buses INTEGER NOT NULL DEFAULT 0,
    trucks INTEGER NOT NULL DEFAULT 0,
    total_vehicles INTEGER NOT NULL DEFAULT 0,
    average_movement NUMERIC(8, 2) NOT NULL DEFAULT 0.0, -- Estimated pixels/second
    road_occupancy NUMERIC(5, 2) NOT NULL DEFAULT 0.0,   -- Percentage 0-100%
    congestion_level VARCHAR(10) NOT NULL,              -- 'LOW', 'MEDIUM', 'HIGH'
    confidence NUMERIC(5, 4) NOT NULL DEFAULT 0.95,     -- Prediction confidence 0.0 to 1.0
    ai_summary TEXT,
    ai_reason TEXT,
    ai_recommendation TEXT,
    priority VARCHAR(10) NOT NULL DEFAULT 'LOW',        -- 'LOW', 'MEDIUM', 'HIGH'
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',       -- 'ACTIVE', 'ACKNOWLEDGED', 'CLOSED'
    acknowledged_at TIMESTAMP WITH TIME ZONE NULL,
    closed_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for performance and query optimization
CREATE INDEX IF NOT EXISTS idx_traffic_events_timestamp ON traffic_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_events_congestion ON traffic_events(congestion_level);
CREATE INDEX IF NOT EXISTS idx_traffic_events_status ON traffic_events(status);
CREATE INDEX IF NOT EXISTS idx_traffic_events_camera ON traffic_events(camera_id);
