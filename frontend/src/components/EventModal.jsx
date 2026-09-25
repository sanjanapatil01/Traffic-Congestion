import React from 'react';
import { X, ShieldAlert, CheckCircle2, Car } from 'lucide-react';
import { api } from '../services/api';

export default function EventModal({ event, onClose, onStatusChange }) {
  if (!event) return null;

  const handleAcknowledge = async () => {
    try {
      const res = await api.acknowledgeEvent(event.id);
      if (onStatusChange) onStatusChange(res.event);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClose = async () => {
    try {
      const res = await api.closeEvent(event.id);
      if (onStatusChange) onStatusChange(res.event);
    } catch (err) {
      console.error(err);
    }
  };

  const congStyles = {
    LOW: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    MEDIUM: 'text-amber-700 bg-amber-50 border-amber-200',
    HIGH: 'text-red-700 bg-red-50 border-red-200',
  };

  const currentLevel = (event.congestion_level || 'LOW').toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Traffic Event #{event.id} Details
              </h2>
              <p className="text-xs text-slate-500">
                Corridor: {event.camera_id || 'CAM-01'} • Source: {event.input_type}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Top Quick Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Congestion</span>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${congStyles[currentLevel]}`}>
                {currentLevel}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Status</span>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 uppercase border border-slate-200">
                {event.status}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Confidence</span>
              <span className="text-sm font-bold text-slate-900 block mt-1">
                {Math.round((event.confidence || 0.95) * 100)}%
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Timestamp</span>
              <span className="text-xs font-mono text-slate-700 block mt-1 truncate">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Vehicle Dynamics */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Car className="w-4 h-4 text-blue-600" />
              <span>Vehicle Dynamics & Monitored Road Coverage</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-xs text-slate-500 block">Total Vehicles</span>
                <span className="text-lg font-black text-slate-900">{event.total_vehicles}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-xs text-slate-500 block">Cars / Bikes</span>
                <span className="text-sm font-bold text-slate-800">{event.cars} / {event.motorcycles}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-xs text-slate-500 block">Buses / Trucks</span>
                <span className="text-sm font-bold text-slate-800">{event.buses} / {event.trucks}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-xs text-slate-500 block">Road Occupancy</span>
                <span className="text-sm font-bold text-blue-600">{event.road_occupancy}%</span>
              </div>
            </div>
            <div className="mt-2.5 text-xs text-slate-500 flex justify-between px-1">
              <span>Velocity: <strong>{event.average_movement} px/s</strong></span>
              <span className="text-[10px]">Active road corridor calculation</span>
            </div>
          </div>

          {/* AI Recommendation Section */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2.5">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wide block">
              AI Decision Support Advisory
            </span>
            
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Situation</span>
              <p className="text-xs text-slate-800 font-medium mt-0.5">{event.ai_summary || "Flow maintained."}</p>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Diagnosis</span>
              <p className="text-xs text-slate-700 mt-0.5">{event.ai_reason || "Corridor velocities nominal."}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-blue-200">
              <span className="text-[10px] text-blue-700 font-bold uppercase block">Recommended Action</span>
              <p className="text-xs text-blue-950 font-semibold mt-0.5">{event.ai_recommendation || "Maintain standard signal timing."}</p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <div>Created: <span className="font-mono text-slate-800">{event.created_at ? new Date(event.created_at).toLocaleTimeString() : 'N/A'}</span></div>
            <div>Acknowledged: <span className="font-mono text-slate-800">{event.acknowledged_at ? new Date(event.acknowledged_at).toLocaleTimeString() : 'Pending'}</span></div>
            <div>Closed: <span className="font-mono text-slate-800">{event.closed_at ? new Date(event.closed_at).toLocaleTimeString() : 'Open'}</span></div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Database Record: <strong className="text-slate-800">PostgreSQL</strong>
          </span>
          <div className="flex items-center space-x-2.5">
            {event.status === 'ACTIVE' && (
              <button
                onClick={handleAcknowledge}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Acknowledge Alert</span>
              </button>
            )}
            {event.status !== 'CLOSED' && (
              <button
                onClick={handleClose}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Close Event
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
