import React from 'react';
import { Bot, Sparkles, Clock, Cpu } from 'lucide-react';

export default function AIRecommendationCard({ 
  recommendation, 
  intervalSecondsRemaining,
  intervalProgress = 0,
  congestionLevel = 'LOW' 
}) {
  const priorityStyles = {
    LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    HIGH: 'bg-red-50 text-red-700 border-red-200',
  };

  const priority = (recommendation?.priority || congestionLevel || 'LOW').toUpperCase();
  const summary = recommendation?.summary || "Analyzing vehicle dynamics and traffic velocity across corridor...";
  const reason = recommendation?.reason || "Flow velocity and road occupancy are within nominal limits.";
  const rec = recommendation?.recommendation || "Corridor is moving smoothly. Maintain baseline automated signal cycle.";
  const source = recommendation?.source || "FALLBACK";

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                AI Traffic Advisory
              </h3>
              <p className="text-[11px] text-slate-500">
                1-Minute Decision Support Engine
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${priorityStyles[priority] || priorityStyles.LOW}`}>
              {priority} Priority
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-blue-600" />
              <span>{source === 'LLM' ? 'Gemini AI' : 'Rule Engine'}</span>
            </span>
          </div>
        </div>

        {/* Advisory Sections */}
        <div className="space-y-2.5 mt-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-0.5">
              Current Situation
            </span>
            <p className="text-xs text-slate-800 font-semibold leading-relaxed">
              {summary}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-0.5">
              Causal Diagnosis
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              {reason}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
            <span className="text-[10px] font-bold tracking-wider text-blue-700 uppercase block mb-0.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-600" />
              Recommended Action
            </span>
            <p className="text-xs text-blue-950 font-semibold leading-relaxed">
              {rec}
            </p>
          </div>
        </div>
      </div>

      {/* 1-Minute Interval Progress Bar */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
          <span className="flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>1-Minute Aggregation Cycle</span>
          </span>
          <span className="font-mono font-semibold text-slate-700">
            {intervalSecondsRemaining != null ? `${intervalSecondsRemaining}s remaining` : 'Syncing...'}
          </span>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-blue-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${intervalProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
