import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export default function TrafficTrendChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-60 flex flex-col items-center justify-center text-slate-400 text-xs">
        <p>No traffic timeline recorded yet.</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Start video or camera to generate 1-minute trends.</p>
      </div>
    );
  }

  const levelNames = { 1: 'LOW', 2: 'MEDIUM', 3: 'HIGH' };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-lg text-xs">
          <p className="font-mono text-slate-500 mb-0.5">{item.time || item.timestamp}</p>
          <p className="font-bold text-slate-900 flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                item.congestion_level === 'HIGH'
                  ? 'bg-red-500'
                  : item.congestion_level === 'MEDIUM'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
            />
            <span>Congestion: {item.congestion_level || levelNames[item.numeric_level]}</span>
          </p>
          <p className="text-slate-600 mt-0.5">Total Vehicles: <strong>{item.total_vehicles}</strong></p>
          {item.average_movement && (
            <p className="text-slate-500 text-[10px]">Speed: {item.average_movement} px/s</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="congestionGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis 
            dataKey="time" 
            stroke="#94a3b8" 
            fontSize={11} 
            tickLine={false} 
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={10}
            ticks={[1, 2, 3]}
            domain={[0.5, 3.5]}
            tickFormatter={(val) => levelNames[val] || ''}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="numeric_level"
            stroke="#2563eb"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#congestionGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
