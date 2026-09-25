import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Activity, 
  Gauge, 
  Percent, 
  Play, 
  Square, 
  Pause, 
  Video, 
  Sparkles,
  ParkingSquare
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import RedBlinkingAlert from '../components/RedBlinkingAlert';
import AIRecommendationCard from '../components/AIRecommendationCard';
import TrafficTrendChart from '../components/TrafficTrendChart';
import VehicleDistributionChart from '../components/VehicleDistributionChart';
import RoadCorridorControl from '../components/RoadCorridorControl';
import { api } from '../services/api';

export default function DashboardPage({ onNavigateTab }) {
  const [currentData, setCurrentData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const [curr, anal] = await Promise.all([
          api.getCurrentTraffic(),
          api.getAnalytics()
        ]);
        if (isMounted) {
          setCurrentData(curr);
          setIsRunning(curr.is_running);
          setIsPaused(curr.is_paused);
          setAnalytics(anal);
        }
      } catch (err) {}
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1200);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const telemetry = currentData?.telemetry || {};
  const activeEvent = currentData?.active_high_event || telemetry.active_event;
  const isBlinking = telemetry.is_alert_blinking;
  const congLevel = (telemetry.congestion_level || 'LOW').toUpperCase();

  const handleStartSample = async () => {
    setLoadingAction(true);
    try {
      await api.startAnalysis('SAMPLE');
      setIsRunning(true);
      setIsPaused(false);
    } catch (err) {
      alert(`Error starting analysis: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handlePause = async () => {
    try {
      const res = await api.pauseAnalysis();
      setIsPaused(res.is_paused);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStop = async () => {
    try {
      await api.stopAnalysis();
      setIsRunning(false);
      setIsPaused(false);
    } catch (err) {
      console.error(err);
    }
  };

  const congColor = congLevel === 'HIGH' ? 'red' : (congLevel === 'MEDIUM' ? 'yellow' : 'green');

  return (
    <div className="space-y-5">
      {/* Red Blinking Alert Banner */}
      <RedBlinkingAlert
        activeEvent={activeEvent}
        isBlinking={isBlinking}
        onAcknowledged={(ev) => {
          if (currentData) {
            setCurrentData({
              ...currentData,
              active_high_event: ev,
              telemetry: { ...telemetry, is_alert_blinking: false, active_event: ev }
            });
          }
        }}
      />

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Current Congestion"
          value={congLevel}
          subtitle={`Model Confidence: ${Math.round((telemetry.confidence || 0.95) * 100)}%`}
          icon={Activity}
          colorScheme={congColor}
          trend={
            congLevel === 'HIGH' ? 'High Congestion' : (congLevel === 'MEDIUM' ? 'Moderate Flow' : 'Fluid Flow')
          }
        />

        <MetricCard
          title="Active Vehicles"
          value={telemetry.total_vehicles || 0}
          subtitle="Moving vehicles in active corridor"
          icon={Car}
          colorScheme="blue"
          extra={
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span>C:{telemetry.cars || 0} M:{telemetry.motorcycles || 0} B:{telemetry.buses || 0} T:{telemetry.trucks || 0}</span>
              {telemetry.parked_vehicles > 0 && (
                <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  {telemetry.parked_vehicles} Parked
                </span>
              )}
            </div>
          }
        />

        <MetricCard
          title="Average Velocity"
          value={`${telemetry.average_movement || 0.0} px/s`}
          subtitle="Estimated vehicle movement speed"
          icon={Gauge}
          colorScheme="blue"
        />

        <MetricCard
          title="Road Occupancy"
          value={`${telemetry.road_occupancy || 0.0}%`}
          subtitle="Active corridor coverage"
          icon={Percent}
          colorScheme={telemetry.road_occupancy > 55 ? 'red' : (telemetry.road_occupancy > 25 ? 'yellow' : 'green')}
          extra={
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  telemetry.road_occupancy > 55 ? 'bg-red-500' : (telemetry.road_occupancy > 25 ? 'bg-amber-500' : 'bg-emerald-500')
                }`}
                style={{ width: `${Math.min(100, telemetry.road_occupancy || 0)}%` }}
              />
            </div>
          }
        />
      </div>

      {/* Main Grid: Live Video Stream & AI Recommendation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Live Video View */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase">
                    Live Traffic CCTV Feed
                  </h2>
                  <p className="text-xs text-slate-500">
                    Real-time vehicle detection with active corridor filtering
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className="text-xs font-semibold text-slate-700">
                  {isRunning ? (isPaused ? 'PAUSED' : 'PROCESSING') : 'STANDBY'}
                </span>
              </div>
            </div>

            {/* Video Canvas Container */}
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-200 aspect-video flex items-center justify-center shadow-inner group">
              {isRunning ? (
                <img
                  src="/api/video/feed"
                  alt="Live Traffic Video Feed"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-8 space-y-3 bg-slate-900 w-full h-full flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                    <Video className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Video Stream Standby</h3>
                    <p className="text-xs text-slate-400 mt-0.5 max-w-sm mx-auto">
                      Click below to start expressway traffic analysis or upload a video.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2.5 pt-1">
                    <button
                      onClick={handleStartSample}
                      disabled={loadingAction}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>{loadingAction ? 'Starting...' : 'Start Demo Stream'}</span>
                    </button>
                    <button
                      onClick={() => onNavigateTab && onNavigateTab('upload')}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer border border-slate-700"
                    >
                      Upload Video
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Video Controls Toolbar */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              {!isRunning ? (
                <button
                  onClick={handleStartSample}
                  disabled={loadingAction}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Start Analysis</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={handlePause}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>{isPaused ? 'Resume' : 'Pause'}</span>
                  </button>
                  <button
                    onClick={handleStop}
                    className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-red-600" />
                    <span>Stop</span>
                  </button>
                </>
              )}

              <button
                onClick={() => onNavigateTab && onNavigateTab('upload')}
                className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                Change Video
              </button>
            </div>

            <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
              <span>Active Tracks: <strong className="text-slate-800">{telemetry.active_tracks || 0}</strong></span>
              <span>•</span>
              <span>Model: <strong className="text-blue-600">YOLOv8n</strong></span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: AI Recommendation Card */}
        <div className="lg:col-span-1">
          <AIRecommendationCard
            recommendation={telemetry.latest_record ? {
              summary: telemetry.latest_record.ai_summary,
              reason: telemetry.latest_record.ai_reason,
              recommendation: telemetry.latest_record.ai_recommendation,
              priority: telemetry.latest_record.priority,
            } : null}
            intervalSecondsRemaining={telemetry.interval_seconds_remaining}
            intervalProgress={telemetry.interval_progress}
            congestionLevel={congLevel}
          />
        </div>
      </div>

      {/* Road Width & Parking Filter Control */}
      <RoadCorridorControl />

      {/* Bottom Grid: Live Status Timeline & Vehicle Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Live Status Timeline */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                Congestion Trend Timeline
              </h3>
              <p className="text-[11px] text-slate-500">
                1-Minute discrete historical levels: LOW (1), MEDIUM (2), HIGH (3)
              </p>
            </div>
          </div>

          <TrafficTrendChart data={analytics?.traffic_trend || []} />
        </div>

        {/* Right 1 Col: Vehicle Distribution Breakdown */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
              Vehicle Distribution
            </h3>
          </div>

          <VehicleDistributionChart
            counts={{
              cars: telemetry.cars || 0,
              motorcycles: telemetry.motorcycles || 0,
              buses: telemetry.buses || 0,
              trucks: telemetry.trucks || 0,
            }}
          />
        </div>
      </div>
    </div>
  );
}
