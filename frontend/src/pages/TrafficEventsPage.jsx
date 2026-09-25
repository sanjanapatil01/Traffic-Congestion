import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import EventModal from '../components/EventModal';

export default function TrafficEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await api.getEvents(activeTab);
      setEvents(res.events || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [activeTab]);

  const handleAcknowledge = async (id, e) => {
    e.stopPropagation();
    try {
      await api.acknowledgeEvent(id);
      fetchEvents();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClose = async (id, e) => {
    e.stopPropagation();
    try {
      await api.closeEvent(id);
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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Traffic Events & Incidents
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active and historical congestion alerts generated across monitored expressway corridors.
          </p>
        </div>

        <button
          onClick={fetchEvents}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1.5 border-b border-slate-200 pb-2">
        {['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'CLOSED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
            return (
              <div
                key={ev.id}
                onClick={() => setSelectedEvent(ev)}
                className={`p-5 rounded-2xl bg-white border transition-all cursor-pointer hover:shadow-md ${
                  isHigh && isActive ? 'border-red-400 bg-red-50/40' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-mono text-slate-500">
                    Event #{ev.id} • {ev.camera_id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      ev.status === 'ACTIVE'
                        ? 'bg-red-600 text-white animate-pulse'
                        : ev.status === 'ACKNOWLEDGED'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {ev.status}
                  </span>
                </div>

                <div className="flex items-baseline space-x-2 mb-1.5">
                  <span
                    className={`text-base font-black uppercase ${
                      isHigh ? 'text-red-600' : (ev.congestion_level === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600')
                    }`}
                  >
                    {ev.congestion_level} Congestion
                  </span>
                  <span className="text-xs font-semibold text-slate-500">({ev.total_vehicles} vehicles)</span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                  {ev.ai_summary || ev.ai_recommendation || 'Flow nominal.'}
                </p>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">
                    {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}
                  </span>

                  <div className="flex items-center space-x-2">
                    {ev.status === 'ACTIVE' && (
                      <button
                        onClick={(e) => handleAcknowledge(ev.id, e)}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold transition cursor-pointer"
                      >
                        Acknowledge
                      </button>
                    )}
                    {ev.status !== 'CLOSED' && (
                      <button
                        onClick={(e) => handleClose(ev.id, e)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition cursor-pointer"
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
          <div className="col-span-full py-16 text-center text-slate-400 text-xs">
            <AlertTriangle className="w-7 h-7 mx-auto text-slate-300 mb-1.5" />
            <span>No traffic events in "{activeTab}" status</span>
          </div>
        )}
      </div>

      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onStatusChange={() => {
            setSelectedEvent(null);
            fetchEvents();
          }}
        />
      )}
    </div>
  );
}
