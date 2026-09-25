import React, { useState, useEffect } from 'react';
import { ShieldCheck, Video, Clock } from 'lucide-react';
import logoImg from '../assets/logo.svg';

export default function Navbar({ health, currentSource, isRunning }) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-sky-100 px-6 py-3 sticky top-0 z-40 flex items-center justify-between shadow-xs">
      {/* Front Logo Only (No bulky text as requested) */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2.5">
          <img src={logoImg} alt="Logo" className="w-8 h-8 object-contain" />
          <span className="text-base font-extrabold text-black tracking-tight font-sans">
            TrafficFlow
          </span>
        </div>
      </div>

      {/* Right Status Controls */}
      <div className="flex items-center space-x-3">
        {/* Source Status */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-100 text-xs">
          <Video className="w-3.5 h-3.5 text-sky-600" />
          <span className="text-slate-600 font-medium">Source:</span>
          <span className="font-bold text-black">
            {isRunning ? (currentSource === 'CAMERA' ? 'Live CCTV' : 'Video File') : 'Standby'}
          </span>
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
        </div>

        {/* System Online */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs font-semibold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-black">Online</span>
          <ShieldCheck className="w-3.5 h-3.5 text-sky-600 ml-0.5" />
        </div>

        {/* Live Clock */}
        <div className="hidden sm:flex items-center space-x-1.5 text-xs font-mono text-black bg-sky-50/70 px-3 py-1.5 rounded-lg border border-sky-100">
          <Clock className="w-3.5 h-3.5 text-sky-600" />
          <span className="font-semibold">{timeStr}</span>
        </div>
      </div>
    </header>
  );
}
