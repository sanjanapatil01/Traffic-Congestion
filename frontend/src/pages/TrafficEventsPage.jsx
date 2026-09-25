import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  Video, 
  Camera, 
  CheckCircle2 
} from 'lucide-react';
import { api } from '../services/api';
import EventModal from '../components/EventModal';

export default function TrafficEventsPage({ onNavigateTab }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const fetchEvents = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getEvents(activeTab);
      setEvents(res.events || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [activeTab]);

  // Live polling for real-time events
  useEffect(() => {
    let interval = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchEvents(true);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, activeTab]);

  const handleAcknowledge = async (id, e) => {
    e.stopPropagation();
    try {
      await api.acknowledgeEvent(id);
      setActionMsg(`Event #${id} acknowledged.`);
      setTimeout(() => setActionMsg(''), 4000);
      fetchEvents();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClose = async (id, e) => {
    e.stopPropagation();
    try {
      await api.closeEvent(id);
      setActionMsg(`Event #${id} closed.`);
      setTimeout(() => setActionMsg(''), 4000);
      fetchEvents();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all traffic events and history records?')) {
      return;
    }
    try {
      await api.clearHistory();
      setActionMsg('All events cleared successfully.');
      setTimeout(() => setActionMsg(''), 4000);
      fetchEvents();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-black tracking-tight">
            Traffic Events & Incidents
          </h2>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            Active and historical congestion alerts generated across monitored video uploads and live CCTV feeds.
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {/* Live Polling toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
              autoRefresh 
                ? 'bg-sky-600 text-white border-sky-600' 
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
            <span>{autoRefresh ? 'Live Polling ON' : 'Live Polling OFF'}</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={() => fetchEvents()}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Clear events button */}
          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 rounded-xl bg-white border border-red-200 hover:bg-red-50 text-red-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Purge old events to start fresh"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            <span>Clear Events</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-medium">
          {actionMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center space-x-1.5 border-b border-sky-100 pb-2">
        {['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'CLOSED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === tab
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-black hover:text-sky-900 hover:bg-sky-50'
            }`}
          >
            {tab} Events
          </button>
        ))}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.length > 0 ? (
          events.map((ev) => {
            const isHigh = ev.congestion_level === 'HIGH';
            const isActive = ev.status === 'ACTIVE';
            const isVideo = ev.input_type === 'VIDEO_UPLOAD' || (ev.camera_id && ev.camera_id.startsWith('Video:'));
            const displayCorridor = ev.camera_id ? ev.camera_id.replace(/^Video:\s*/, '') : 'CAM-01';

            return (
              <div
                key={ev.id}
                onClick={() => setSelectedEvent(ev)}
                className={`p-5 rounded-2xl bg-white border transition-all cursor-pointer hover:shadow-md ${
                  isHigh && isActive 
                    ? 'border-red-400 bg-red-50/30' 
                    : 'border-sky-100 hover:border-sky-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center space-x-1.5 truncate max-w-[70%]">
                    {isVideo ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 shrink-0 flex items-center gap-1">
                        <Video className="w-3 h-3 text-sky-600" />
                        <span>Video</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0 flex items-center gap-1">
                        <Camera className="w-3 h-3 text-slate-600" />
                        <span>Live</span>
                      </span>
                    )}
                    <span className="text-xs font-mono text-black font-semibold truncate" title={ev.camera_id}>
                      #{ev.id} • {displayCorridor}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                      ev.status === 'ACTIVE'
                        ? 'bg-red-600 text-white animate-pulse'
                        : ev.status === 'ACKNOWLEDGED'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {ev.status}
                  </span>
                </div>

                <div className="flex items-baseline space-x-2 mb-1.5">
                  <span
                    className={`text-base font-black uppercase ${
                      isHigh ? 'text-red-600' : (ev.congestion_level === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-700')
                    }`}
                  >
                    {ev.congestion_level} Congestion
                  </span>
                  <span className="text-xs font-semibold text-slate-600">({ev.total_vehicles} vehicles)</span>
                </div>

                <p className="text-xs text-black font-normal line-clamp-2 leading-relaxed mb-3">
                  {ev.ai_summary || ev.ai_recommendation || 'Flow nominal.'}
                </p>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500">
                    {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}
                  </span>

                  <div className="flex items-center space-x-2">
                    {ev.status === 'ACTIVE' && (
                      <button
                        onClick={(e) => handleAcknowledge(ev.id, e)}
                        className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold transition cursor-pointer shadow-xs"
                      >
                        Acknowledge
                      </button>
                    )}
                    {ev.status !== 'CLOSED' && (
                      <button
                        onClick={(e) => handleClose(ev.id, e)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-black text-[11px] font-semibold transition cursor-pointer border border-slate-200"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-14 text-center text-slate-400 bg-white rounded-2xl border border-sky-100 shadow-xs">
            <AlertTriangle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-black">No Events Found</p>
            <p className="text-xs text-slate-500 mt-1">
              Events are generated when congestion reaches HIGH or when manual intervals are logged.
            </p>
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onAcknowledged={(updated) => {
            setSelectedEvent(updated);
            fetchEvents();
          }}
        />
      )}
    </div>
  );
}
