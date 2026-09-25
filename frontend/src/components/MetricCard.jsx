import React from 'react';

export default function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  colorScheme = 'blue', 
  trend,
  extra
}) {
  const schemeStyles = {
    green: {
      border: 'border-emerald-200',
      bg: 'bg-white',
      iconBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      value: 'text-emerald-700',
    },
    yellow: {
      border: 'border-amber-200',
      bg: 'bg-white',
      iconBg: 'bg-amber-50 text-amber-700 border border-amber-200',
      value: 'text-amber-700',
    },
    red: {
      border: 'border-red-200',
      bg: 'bg-white',
      iconBg: 'bg-red-50 text-red-700 border border-red-200',
      value: 'text-red-700',
    },
    blue: {
      border: 'border-sky-100',
      bg: 'bg-white',
      iconBg: 'bg-sky-50 text-sky-700 border border-sky-200',
      value: 'text-black',
    },
  };

  const currentScheme = schemeStyles[colorScheme] || schemeStyles.blue;

  return (
    <div className={`p-4 rounded-2xl ${currentScheme.bg} border ${currentScheme.border} shadow-xs transition-all hover:border-sky-300`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-xl ${currentScheme.iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline space-x-2">
        <span className={`text-2xl font-black tracking-tight ${currentScheme.value}`}>
          {value}
        </span>
        {trend && (
          <span className="text-xs font-bold text-slate-700">
            {trend}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-600 font-medium leading-snug">
          {subtitle}
        </p>
      )}

      {extra && <div className="mt-2.5">{extra}</div>}
    </div>
  );
}
