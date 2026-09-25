import React, { useState, useEffect } from 'react';
import { 
  History, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  RefreshCw, 
  Calendar, 
  Trash2, 
  BookmarkCheck, 
  Video, 
  Camera 
} from 'lucide-react';
import { api } from '../services/api';
import EventModal from '../components/EventModal';

export default function HistoryPage({ onNavigateTab }) {
  const [historyData, setHistoryData] = useState({ events: [], total: 0, page: 1, pages: 1 });
  const [corridors, setCorridors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const [dateFilter, setDateFilter] = useState('');
  const [congestionFilter, setCongestionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cameraFilter, setCameraFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const fetchCorridors = async () => {
    try {
      const res = await api.getCorridors();
      if (res?.corridors) {
        setCorridors(res.corridors);
      }
    } catch {
      // ignore
    }
  };

  const fetchHistory = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getHistory({
        page,
        limit: 10,
        date: dateFilter,
        congestion: congestionFilter,
        camera: cameraFilter,
        status: statusFilter,
      });
      setHistoryData(res);
      fetchCorridors();
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, congestionFilter, statusFilter, cameraFilter, dateFilter]);

  // Polling for live updates when auto-refresh is active
  useEffect(() => {
    let interval = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchHistory(true);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, page, congestionFilter, statusFilter, cameraFilter, dateFilter]);

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all historical traffic records and events?')) {
      return;
    }
    try {
      await api.clearHistory();
      setActionMsg('History cleared successfully. Fresh records will be logged on next analysis.');
      setTimeout(() => setActionMsg(''), 4000);
      fetchHistory();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordNow = async () => {
    try {
      const res = await api.recordNow();
      if (res?.record) {
        setActionMsg(`Recorded interval #${res.record.id} for ${res.record.camera_id}.`);
      } else {
        setActionMsg('Saved current analysis snapshot to History.');
      }
      setTimeout(() => setActionMsg(''), 4000);
      fetchHistory();
    } catch (err) {
      console.error(err);
    }
  };

  const congStyles = {
    LOW: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    MEDIUM: 'bg-amber-50 text-amber-800 border border-amber-200',
    HIGH: 'bg-red-50 text-red-700 border border-red-200 font-bold',
  };

  const statusStyles = {
    ACTIVE: 'bg-red-100 text-red-800 border border-red-200',
    ACKNOWLEDGED: 'bg-amber-100 text-amber-800 border border-amber-200',
    CLOSED: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-black tracking-tight">
            1-Minute Historical Records
          </h2>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            Chronological records for uploaded video analysis and live CCTV feeds. Click any row for details.
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {/* Record current interval button */}
          <button
            onClick={handleRecordNow}
            className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 hover:bg-sky-100 text-sky-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <BookmarkCheck className="w-3.5 h-3.5 text-sky-600" />
            <span>Record Milestone Now</span>
          </button>

          {/* Auto Refresh toggle */}
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
            onClick={() => fetchHistory()}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Clear records button */}
          <button
            onClick={handleClearHistory}
            className="px-3 py-1.5 rounded-xl bg-white border border-red-200 hover:bg-red-50 text-red-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Purge old records to start fresh"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            <span>Clear Old Records</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-medium">
          {actionMsg}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-3.5 rounded-2xl bg-white border border-sky-100 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600">
          <Filter className="w-3.5 h-3.5 text-sky-600" />
          <span>Filters:</span>
        </div>

        <select
          value={congestionFilter}
          onChange={(e) => { setCongestionFilter(e.target.value); setPage(1); }}
          className="bg-sky-50/50 border border-sky-200 text-black text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:border-sky-500"
        >
          <option value="ALL">All Congestion Levels</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-sky-50/50 border border-sky-200 text-black text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:border-sky-500"
        >
          <option value="ALL">All Alert Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
          <option value="CLOSED">CLOSED</option>
        </select>

        {/* Dynamic Corridors Filter */}
        <select
          value={cameraFilter}
          onChange={(e) => { setCameraFilter(e.target.value); setPage(1); }}
          className="bg-sky-50/50 border border-sky-200 text-black text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:border-sky-500 max-w-xs"
        >
          <option value="ALL">All Sources & Uploaded Videos</option>
          {corridors.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="flex items-center space-x-1.5 bg-sky-50/50 border border-sky-200 rounded-xl px-2.5 py-1 text-xs text-black">
          <Calendar className="w-3.5 h-3.5 text-sky-600" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
            className="bg-transparent text-black font-medium focus:outline-none text-xs"
          />
        </div>

        {dateFilter && (
          <button
            onClick={() => { setDateFilter(''); setPage(1); }}
            className="text-[11px] text-sky-700 font-semibold hover:underline"
          >
            Clear Date
          </button>
        )}
      </div>

      {/* History Records Table */}
      <div className="rounded-2xl bg-white border border-sky-100 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sky-50/70 border-b border-sky-100 text-[11px] uppercase tracking-wider text-black font-bold">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Source / Video</th>
                <th className="py-3 px-4">Vehicles</th>
                <th className="py-3 px-4">Congestion</th>
                <th className="py-3 px-4">Velocity</th>
                <th className="py-3 px-4">Occupancy</th>
                <th className="py-3 px-4">AI Recommendation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-black">
              {historyData.events && historyData.events.length > 0 ? (
                historyData.events.map((ev) => {
                  const isVideo = ev.input_type === 'VIDEO_UPLOAD' || (ev.camera_id && ev.camera_id.startsWith('Video:'));
                  const displayCorridor = ev.camera_id ? ev.camera_id.replace(/^Video:\s*/, '') : 'CAM-01';

                  return (
                    <tr
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="hover:bg-sky-50/40 transition cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-black">
                        {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
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
                          <span className="font-semibold text-black truncate max-w-[160px]" title={ev.camera_id}>
                            {displayCorridor}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-black">
                        {ev.total_vehicles} <span className="text-[10px] text-slate-500 font-normal">({ev.cars}c/{ev.buses}b)</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${congStyles[ev.congestion_level] || congStyles.LOW}`}>
                          {ev.congestion_level}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-black font-medium">
                        {ev.average_movement} px/s
                      </td>
                      <td className="py-3 px-4 font-mono text-black font-medium">
                        {ev.road_occupancy}%
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-700">
                        {ev.ai_recommendation || ev.ai_summary || 'Normal flow.'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusStyles[ev.status] || statusStyles.CLOSED}`}>
                          {ev.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(ev);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-700 hover:bg-sky-50 transition cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <History className="w-7 h-7 mx-auto text-slate-300 mb-1.5" />
                    <span className="text-xs">No records found. Run an analysis on an uploaded video or live stream to log records.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-3.5 border-t border-sky-100 bg-sky-50/40 flex items-center justify-between text-xs text-slate-600 font-medium">
          <div>
            Showing Page <strong className="text-black">{historyData.page}</strong> of <strong className="text-black">{historyData.pages}</strong> ({historyData.total} total records)
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-semibold text-black">
              {page}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(historyData.pages, p + 1))}
              disabled={page >= historyData.pages}
              className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onAcknowledged={(updated) => {
            setSelectedEvent(updated);
            fetchHistory();
          }}
        />
      )}
    </div>
  );
}
