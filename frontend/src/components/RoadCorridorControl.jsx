import React, { useState, useEffect } from 'react';
import { Sliders, ParkingSquare, Car, Check } from 'lucide-react';
import { api } from '../services/api';

export default function RoadCorridorControl({ onUpdate }) {
  const [leftMargin, setLeftMargin] = useState(0);   // 0% to 40% (Parking left)
  const [rightMargin, setRightMargin] = useState(100); // 60% to 100% (Parking right)
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load initial settings
    api.getSettings().then((s) => {
      if (s.roi_x_start_pct != null) setLeftMargin(Math.round(s.roi_x_start_pct * 100));
      if (s.roi_x_end_pct != null) setRightMargin(Math.round(s.roi_x_end_pct * 100));
    }).catch(() => {});
  }, []);

  const applyCorridorWidth = async (left, right) => {
    setLeftMargin(left);
    setRightMargin(right);
    setSaving(true);
    try {
      await api.updateSettings({
        roi_x_start_pct: left / 100.0,
        roi_x_end_pct: right / 100.0,
      });
      if (onUpdate) onUpdate({ left, right });
    } catch (err) {
      console.error('Failed to update corridor ROI:', err);
    } finally {
      setTimeout(() => setSaving(false), 400);
    }
  };

  const activeWidth = rightMargin - leftMargin;

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
            <ParkingSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Road Width & Parking Area Filter
            </h4>
            <p className="text-[11px] text-slate-500">
              Set active traffic corridor width to exclude parked vehicles from congestion stats
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center space-x-1.5 self-start sm:self-center">
          <button
            type="button"
            onClick={() => applyCorridorWidth(0, 100)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition cursor-pointer ${
              leftMargin === 0 && rightMargin === 100
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Full Road (0-100%)
          </button>
          <button
            type="button"
            onClick={() => applyCorridorWidth(15, 100)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition cursor-pointer ${
              leftMargin === 15 && rightMargin === 100
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Left Parking (15%)
          </button>
          <button
            type="button"
            onClick={() => applyCorridorWidth(12, 88)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition cursor-pointer ${
              leftMargin === 12 && rightMargin === 88
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Both Sides Parking
          </button>
        </div>
      </div>

      {/* Visual Corridor Bar */}
      <div className="space-y-2 mt-3">
        <div className="w-full h-7 rounded-xl bg-slate-100 border border-slate-200 flex overflow-hidden text-[10px] font-bold text-center select-none">
          {leftMargin > 0 && (
            <div
              className="bg-amber-100 text-amber-800 border-r border-amber-300 flex items-center justify-center transition-all"
              style={{ width: `${leftMargin}%` }}
            >
              PARKING ({leftMargin}%)
            </div>
          )}
          <div
            className="bg-blue-50 text-blue-700 flex items-center justify-center transition-all font-semibold"
            style={{ width: `${activeWidth}%` }}
          >
            ACTIVE MOVING CORRIDOR ({activeWidth}%)
          </div>
          {rightMargin < 100 && (
            <div
              className="bg-amber-100 text-amber-800 border-l border-amber-300 flex items-center justify-center transition-all"
              style={{ width: `${100 - rightMargin}%` }}
            >
              PARKING ({100 - rightMargin}%)
            </div>
          )}
        </div>

        {/* Sliders for precise tuning */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <span>Left Parking Boundary:</span>
              <strong className="text-slate-900 font-mono">{leftMargin}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              step="1"
              value={leftMargin}
              onChange={(e) => applyCorridorWidth(parseInt(e.target.value), rightMargin)}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <span>Right Parking Boundary:</span>
              <strong className="text-slate-900 font-mono">{rightMargin}%</strong>
            </div>
            <input
              type="range"
              min="60"
              max="100"
              step="1"
              value={rightMargin}
              onChange={(e) => applyCorridorWidth(leftMargin, parseInt(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
