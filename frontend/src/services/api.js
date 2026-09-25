/**
 * API Service for Smart Traffic Congestion Prediction and Management System
 */

const API_BASE = '/api';

export const api = {
  // Video and Stream
  uploadVideo: async (formData) => {
    const res = await fetch(`${API_BASE}/video/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }
    return res.json();
  },

  startAnalysis: async (sourceType, videoPath = null, cameraIndex = 0) => {
    const res = await fetch(`${API_BASE}/analysis/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_type: sourceType,
        video_path: videoPath,
        camera_index: cameraIndex,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to start analysis' }));
      throw new Error(err.error || 'Failed to start analysis');
    }
    return res.json();
  },

  stopAnalysis: async () => {
    const res = await fetch(`${API_BASE}/analysis/stop`, { method: 'POST' });
    return res.json();
  },

  pauseAnalysis: async () => {
    const res = await fetch(`${API_BASE}/analysis/pause`, { method: 'POST' });
    return res.json();
  },

  sendBrowserFrame: async (base64Image) => {
    const res = await fetch(`${API_BASE}/analysis/frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image }),
    });
    return res.json();
  },

  // Real-time Telemetry
  getCurrentTraffic: async () => {
    const res = await fetch(`${API_BASE}/traffic/current`);
    return res.json();
  },

  // History & Events
  getHistory: async ({ page = 1, limit = 10, date = '', congestion = 'ALL', camera = 'ALL', status = 'ALL' } = {}) => {
    const params = new URLSearchParams({
      page,
      limit,
      ...(date ? { date } : {}),
      ...(congestion !== 'ALL' ? { congestion } : {}),
      ...(camera !== 'ALL' ? { camera } : {}),
      ...(status !== 'ALL' ? { status } : {}),
    });
    const res = await fetch(`${API_BASE}/traffic/history?${params.toString()}`);
    return res.json();
  },

  getEvents: async (status = 'ALL') => {
    const res = await fetch(`${API_BASE}/events?status=${status}`);
    return res.json();
  },

  acknowledgeEvent: async (eventId) => {
    const res = await fetch(`${API_BASE}/events/${eventId}/acknowledge`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to acknowledge event');
    return res.json();
  },

  closeEvent: async (eventId) => {
    const res = await fetch(`${API_BASE}/events/${eventId}/close`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to close event');
    return res.json();
  },

  // AI Recommendation
  requestAIRecommendation: async (trafficData, previousStatus = 'LOW') => {
    const res = await fetch(`${API_BASE}/ai/recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...trafficData, previous_status: previousStatus }),
    });
    return res.json();
  },

  // Analytics
  getAnalytics: async () => {
    const res = await fetch(`${API_BASE}/analytics`);
    return res.json();
  },

  // Settings & Health
  getSettings: async () => {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },

  updateSettings: async (settings) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  getHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },
};
