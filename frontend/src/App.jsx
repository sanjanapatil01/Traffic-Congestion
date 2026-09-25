import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import LiveCameraPage from './pages/LiveCameraPage';
import UploadVideoPage from './pages/UploadVideoPage';
import HistoryPage from './pages/HistoryPage';
import TrafficEventsPage from './pages/TrafficEventsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [health, setHealth] = useState(null);
  const [currentTraffic, setCurrentTraffic] = useState(null);

  // Poll health and alerts periodically
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const [h, curr] = await Promise.all([
          api.getHealth(),
          api.getCurrentTraffic(),
        ]);
        setHealth(h);
        setCurrentTraffic(curr);
      } catch (err) {
        // console.error(err);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 2000);
    return () => clearInterval(interval);
  }, []);

  const isRunning = currentTraffic?.is_running || false;
  const currentSource = currentTraffic?.source_type || 'NONE';
  const hasActiveAlert =
    currentTraffic?.active_high_event?.status === 'ACTIVE' ||
    currentTraffic?.telemetry?.is_alert_blinking;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 antialiased font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <Navbar health={health} currentSource={currentSource} isRunning={isRunning} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Control Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          hasActiveAlert={hasActiveAlert}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-5 md:p-6 overflow-y-auto bg-slate-50 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && <DashboardPage onNavigateTab={setActiveTab} />}
          {activeTab === 'live' && <LiveCameraPage />}
          {activeTab === 'upload' && <UploadVideoPage onNavigateTab={setActiveTab} />}
          {activeTab === 'history' && <HistoryPage onNavigateTab={setActiveTab} />}
          {activeTab === 'events' && <TrafficEventsPage onNavigateTab={setActiveTab} />}
          {activeTab === 'analytics' && <AnalyticsPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}
