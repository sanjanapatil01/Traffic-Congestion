import React, { useState, useEffect, useRef } from 'react';
import { Camera, Play, Square, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import RoadCorridorControl from '../components/RoadCorridorControl';

export default function LiveCameraPage() {
  const [cameraMode, setCameraMode] = useState('browser'); // 'browser' or 'server'
  const [isStreaming, setIsStreaming] = useState(false);
  const [stats, setStats] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    return () => {
      stopAllStreams();
    };
  }, []);

  const stopAllStreams = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    api.stopAnalysis().catch(() => {});
    setIsStreaming(false);
  };

  const startBrowserCamera = async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { max: 15 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsStreaming(true);

      intervalRef.current = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video.videoWidth === 0 || video.videoHeight === 0) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const base64Data = canvas.toDataURL('image/jpeg', 0.65);
        try {
          const res = await api.sendBrowserFrame(base64Data);
          if (res.stats) {
            setStats(res.stats);
          }
        } catch (err) {}
      }, 350);
    } catch (err) {
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera access in browser.'
          : `Failed to access browser camera: ${err.message}`
      );
      setIsStreaming(false);
    }
  };

  const startServerCamera = async () => {
    setErrorMsg('');
    try {
      await api.startAnalysis('CAMERA', null, 0);
      setIsStreaming(true);
      intervalRef.current = setInterval(async () => {
        try {
          const res = await api.getCurrentTraffic();
          if (res.telemetry) {
            setStats(res.telemetry);
          }
        } catch (err) {}
      }, 1000);
    } catch (err) {
      setErrorMsg(`Failed to start CCTV stream: ${err.message}`);
      setIsStreaming(false);
    }
  };

  const handleStart = () => {
    if (cameraMode === 'browser') {
      startBrowserCamera();
    } else {
      startServerCamera();
    }
  };

  const handleStop = () => {
    stopAllStreams();
    setStats(null);
  };

  const congLevel = (stats?.congestion_level || 'LOW').toUpperCase();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Live Camera Traffic Stream
            </h2>
            <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
              <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-red-600 animate-ping' : 'bg-slate-400'}`} />
              <span>{isStreaming ? 'LIVE' : 'OFFLINE'}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time video feed processed through YOLOv8 & ByteTrack with active corridor parking filters.
          </p>
        </div>

        {/* Source Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => { if (!isStreaming) setCameraMode('browser'); }}
            disabled={isStreaming}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${cameraMode === 'browser' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Browser Webcam
          </button>
          <button
            onClick={() => { if (!isStreaming) setCameraMode('server'); }}
            disabled={isStreaming}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${cameraMode === 'server' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            CCTV / Server Device
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Camera Video & Live Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Live Video */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Camera className="w-4 h-4 text-blue-600" />
                <span>Camera View ({cameraMode === 'browser' ? 'Webcam' : 'Server CCTV'})</span>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {isStreaming ? 'Active Telemetry' : 'Standby'}
              </span>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-200 aspect-video flex items-center justify-center shadow-inner">
              <video ref={videoRef} playsInline muted className={cameraMode === 'browser' && isStreaming ? 'w-full h-full object-contain' : 'hidden'} />
              <canvas ref={canvasRef} className="hidden" />

              {cameraMode === 'server' && isStreaming && (
                <img src="/api/video/feed" alt="Server Camera Feed" className="w-full h-full object-contain" />
              )}

              {!isStreaming && (
                <div className="text-center p-8 space-y-3 bg-slate-900 w-full h-full flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                    <Camera className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-200">Camera Feed Inactive</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Click "Start Live Camera" to enable video input and real-time vehicle tracking.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            {!isStreaming ? (
              <button
                onClick={handleStart}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Live Camera</span>
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Stop Camera</span>
              </button>
            )}

            <div className="text-xs text-slate-500 font-mono">
              Status: <strong className={isStreaming ? 'text-emerald-700' : 'text-slate-400'}>{isStreaming ? 'Streaming' : 'Idle'}</strong>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Telemetry Cards */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Live Stream Metrics
            </h3>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <span className="text-xs text-slate-600">Congestion Level</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                  congLevel === 'HIGH' ? 'bg-red-50 text-red-700 border border-red-200' : (congLevel === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                }`}>
                  {congLevel}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <span className="text-xs text-slate-600">Active Detected</span>
                <span className="text-base font-bold text-slate-900">{stats?.total_vehicles || 0}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <span className="text-xs text-slate-600">Estimated Velocity</span>
                <span className="text-xs font-mono font-bold text-blue-600">{stats?.average_movement || 0.0} px/s</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <span className="text-xs text-slate-600">Road Occupancy</span>
                <span className="text-xs font-mono font-bold text-slate-800">{stats?.road_occupancy || 0.0}%</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800">
              Video is processed in real time and aggregates into discrete 1-minute historical records.
            </div>
          </div>
        </div>
      </div>

      {/* Road Width & Parking Filter */}
      <RoadCorridorControl />
    </div>
  );
}
