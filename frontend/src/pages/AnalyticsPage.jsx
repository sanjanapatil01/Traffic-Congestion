import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Car, TrendingUp, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import TrafficTrendChart from '../components/TrafficTrendChart';
import VehicleDistributionChart from '../components/VehicleDistributionChart';
import MetricCard from '../components/MetricCard';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.getAnalytics();
      setAnalytics(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const cong = analytics?.congestion_distribution || { LOW: 0, MEDIUM: 0, HIGH: 0 };
  const totalRecs = analytics?.total_records || 0;
  const lowPct = totalRecs > 0 ? Math.round((cong.LOW / totalRecs) * 100) : 0;
  const medPct = totalRecs > 0 ? Math.round((cong.MEDIUM / totalRecs) * 100) : 0;
  const highPct = totalRecs > 0 ? Math.round((cong.HIGH / totalRecs) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Traffic Intelligence & Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Statistical performance and congestion distribution analysis across all recorded sessions.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Intervals Logged"
          value={totalRecs}
          subtitle="Discrete 1-minute records"
          icon={Activity}
          colorScheme="blue"
        />

        <MetricCard
          title="High Congestion Events"
          value={analytics?.high_congestion_count || 0}
          subtitle="Corridor bottlenecks registered"
          icon={ShieldAlert}
          colorScheme="red"
        />

        <MetricCard
          title="Avg Vehicles / Min"
          value={analytics?.avg_vehicles_per_minute || 0}
          subtitle="Mean moving density"
          icon={Car}
          colorScheme="green"
        />

        <MetricCard
          title="Optimal Flow Rate"
          value={`${lowPct}%`}
          subtitle="Intervals in LOW state"
          icon={TrendingUp}
          colorScheme="green"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Traffic Trend Over Time */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="mb-3">
            <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
              Corridor Congestion Trend
            </h3>
            <p className="text-[11px] text-slate-500">
              Level variations across chronological 1-minute intervals (1=LOW, 2=MEDIUM, 3=HIGH)
            </p>
          </div>
          <TrafficTrendChart data={analytics?.traffic_trend || []} />
        </div>

        {/* Right 1 Col: Congestion Distribution Breakdown */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase mb-0.5">
              Congestion Distribution
            </h3>
            <p className="text-[11px] text-slate-500 mb-5">
              Proportion of corridor operational states
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-700 font-bold">LOW (Fluid Flow)</span>
                  <span className="text-slate-700 font-mono font-semibold">{cong.LOW} ({lowPct}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${lowPct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-amber-700 font-bold">MEDIUM (Moderate)</span>
                  <span className="text-slate-700 font-mono font-semibold">{cong.MEDIUM} ({medPct}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${medPct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-red-700 font-bold">HIGH (Bottleneck)</span>
                  <span className="text-slate-700 font-mono font-semibold">{cong.HIGH} ({highPct}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-red-500 h-full rounded-full transition-all" style={{ width: `${highPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
            Neural Network Multi-Layer Perceptron (MLP) trained on corridor dynamics.
          </div>
        </div>
      </div>

      {/* Vehicle Type Breakdown */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase mb-0.5">
          Cumulative Vehicle Distribution
        </h3>
        <p className="text-[11px] text-slate-500 mb-3">
          Total vehicles detected across recorded intervals
        </p>

        <VehicleDistributionChart counts={analytics?.vehicle_breakdown} />
      </div>
    </div>
  );
}
