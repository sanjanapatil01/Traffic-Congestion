import React from 'react';
import { 
  LayoutDashboard, 
  Camera, 
  UploadCloud, 
  History, 
  AlertTriangle, 
  BarChart3, 
  Settings 
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, hasActiveAlert }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live', label: 'Live Monitoring', icon: Camera },
    { id: 'upload', label: 'Upload Video', icon: UploadCloud },
    { id: 'history', label: 'History Records', icon: History },
    { 
      id: 'events', 
      label: 'Traffic Events', 
      icon: AlertTriangle,
      badge: hasActiveAlert ? 'ACTIVE' : null 
    },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-sky-100 flex flex-col justify-between shrink-0 select-none shadow-xs">
      <div className="py-5 px-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-3">
          Dashboard Menu
        </div>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                  isActive
                    ? 'bg-sky-600 text-white font-bold shadow-xs'
                    : 'text-black hover:bg-sky-50 hover:text-sky-900 font-medium'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-sky-600'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-600 text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Pipeline Status Card at Bottom */}
      <div className="p-3.5 m-3 rounded-xl bg-sky-50/70 border border-sky-100">
        <div className="flex items-center space-x-2 text-xs font-bold text-black mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Vision Engine Active</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
          YOLOv8 + ByteTrack object tracking with active parking exclusion.
        </p>
      </div>
    </aside>
  );
}
