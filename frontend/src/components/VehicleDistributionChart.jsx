import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function VehicleDistributionChart({ 
  counts = { cars: 0, motorcycles: 0, buses: 0, trucks: 0 } 
}) {
  const chartData = [
    { name: 'Cars', count: counts.cars || 0, color: '#f97316' },
    { name: 'Bikes', count: counts.motorcycles || 0, color: '#eab308' },
    { name: 'Buses', count: counts.buses || 0, color: '#10b981' },
    { name: 'Trucks', count: counts.trucks || 0, color: '#ef4444' },
  ];

  const total = (counts.cars || 0) + (counts.motorcycles || 0) + (counts.buses || 0) + (counts.trucks || 0);

  return (
    <div className="h-60 w-full flex flex-col justify-between">
      <div className="flex items-center justify-between px-1 text-xs text-slate-500 mb-1">
        <span>Active Categories</span>
        <span className="font-bold text-slate-800">Total Moving: {total}</span>
      </div>

      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white border border-slate-200 p-2 rounded-xl shadow-md text-xs">
                      <p className="font-bold text-slate-900">{d.name}</p>
                      <p className="text-slate-600">Count: <strong>{d.count}</strong></p>
                      <p className="text-slate-400 text-[10px]">
                        {total > 0 ? `${Math.round((d.count / total) * 100)}% of traffic` : '0%'}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Mini Legend Badges */}
      <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 text-center">
        {chartData.map((item) => (
          <div key={item.name} className="p-1 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 block truncate">{item.name}</span>
            <span className="text-xs font-bold text-slate-800">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
