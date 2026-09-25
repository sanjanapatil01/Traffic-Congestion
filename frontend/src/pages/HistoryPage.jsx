import React, { useState, useEffect } from 'react';
import { History, Filter, ChevronLeft, ChevronRight, Eye, RefreshCw, Calendar } from 'lucide-react';
import { api } from '../services/api';
import EventModal from '../components/EventModal';

export default function HistoryPage() {
  const [historyData, setHistoryData] = useState({ events: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [dateFilter, setDateFilter] = useState('');
  const [congestionFilter, setCongestionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cameraFilter, setCameraFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const fetchHistory = async () => {
    setLoading(true);
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, congestionFilter, statusFilter, cameraFilter, dateFilter]);

  const congStyles = {
    LOW: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border border-amber-200',
    HIGH: 'bg-red-50 text-red-700 border border-red-200 font-bold',
  };

  const statusStyles = {
    ACTIVE: 'bg-red-100 text-red-800 border border-red-200',
    ACKNOWLEDGED: 'bg-amber-100 text-amber-800 border border-amber-200',
    CLOSED: 'bg-slate-100 text-slate-600 border border-slate-200',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            1-Minute Historical Records
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Discrete chronological traffic records stored in PostgreSQL. Click any row for details.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        <select
          value={congestionFilter}
          onChange={(e) => { setCongestionFilter(e.target.value); setPage(1); }}
          className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">All Congestion</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
          <option value="CLOSED">CLOSED</option>
        </select>

        <select
          value={cameraFilter}
          onChange={(e) => { setCameraFilter(e.target.value); setPage(1); }}
          className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">All Corridors</option>
          <option value="CAM-01">CAM-01</option>
          <option value="CAM-LIVE-01">CAM-LIVE-01</option>
        </select>

        <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-700">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
            className="bg-transparent text-slate-800 focus:outline-none text-xs"
          />
        </div>

        {dateFilter && (
          <button
            onClick={() => { setDateFilter(''); setPage(1); }}
            className="text-[11px] text-blue-600 font-semibold hover:underline"
          >
            Clear Date
          </button>
        )}
      </div>

      {/* History Records Table */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Corridor</th>
                <th className="py-3 px-4">Vehicles</th>
                <th className="py-3 px-4">Congestion</th>
                <th className="py-3 px-4">Velocity</th>
                <th className="py-3 px-4">Occupancy</th>
                <th className="py-3 px-4">AI Recommendation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {historyData.events && historyData.events.length > 0 ? (
                historyData.events.map((ev) => (
                  <tr
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {ev.camera_id}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {ev.total_vehicles} <span className="text-[10px] text-slate-400 font-normal">({ev.cars}c/{ev.buses}b)</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${congStyles[ev.congestion_level] || congStyles.LOW}`}>
                        {ev.congestion_level}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {ev.average_movement} px/s
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {ev.road_occupancy}%
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-500">
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
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <History className="w-7 h-7 mx-auto text-slate-300 mb-1.5" />
                    <span>No records matching criteria</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing Page <strong className="text-slate-800">{historyData.page}</strong> of <strong className="text-slate-800">{historyData.pages}</strong> ({historyData.total} total records)
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(historyData.pages, p + 1))}
              disabled={page >= historyData.pages || loading}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onStatusChange={(updated) => {
            setSelectedEvent(updated);
            fetchHistory();
          }}
        />
      )}
    </div>
  );
}
