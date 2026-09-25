import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function RedBlinkingAlert({ 
  activeEvent, 
  isBlinking, 
  onAcknowledged 
}) {
  const [loading, setLoading] = useState(false);

  if (!activeEvent || activeEvent.congestion_level !== 'HIGH') {
    return (
      <div className="p-3.5 rounded-2xl bg-white border border-sky-100 text-slate-700 text-xs flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="font-bold text-black">Corridor Status: Normal Flow</span>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">No Active Incidents</span>
      </div>
    );
  }

  const isAcknowledged = activeEvent.status === 'ACKNOWLEDGED';
  const shouldBlink = isBlinking && !isAcknowledged;

  const handleAcknowledge = async () => {
    if (!activeEvent.id) return;
    setLoading(true);
    try {
      const result = await api.acknowledgeEvent(activeEvent.id);
      if (onAcknowledged) {
        onAcknowledged(result.event || activeEvent);
      }
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`p-4.5 rounded-2xl border-2 transition-all duration-300 shadow-sm ${
        shouldBlink
          ? 'animate-alert-blink border-red-500 bg-red-50/70'
          : isAcknowledged
          ? 'border-amber-300 bg-amber-50/50'
          : 'border-red-300 bg-red-50/40'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              shouldBlink ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'
            }`}
          >
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-black tracking-wide uppercase text-red-700 flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                CRITICAL TRAFFIC CONGESTION
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                  isAcknowledged
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-red-600 text-white'
                }`}
              >
                {activeEvent.status}
              </span>
            </div>

            <h3 className="text-base font-black text-black mt-0.5">
              HIGH CONGESTION DETECTED
            </h3>

            <p className="text-xs text-black font-medium mt-0.5 max-w-xl leading-relaxed">
              Monitored Corridor: <strong>{activeEvent.camera_id || 'CAM-01'}</strong>.
              {activeEvent.total_vehicles ? ` Detected ${activeEvent.total_vehicles} vehicles with average velocity ${activeEvent.average_movement} px/s.` : ''}
              {isAcknowledged
                ? ' Alert acknowledged by operator. Continues monitoring until flow normalizes.'
                : ' Operator acknowledgement required. Click OK below to silence the alert.'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
          {!isAcknowledged ? (
            <button
              onClick={handleAcknowledge}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition flex items-center space-x-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Processing...' : 'OK / ACKNOWLEDGE'}</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-amber-700" />
              <span>Acknowledged</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
