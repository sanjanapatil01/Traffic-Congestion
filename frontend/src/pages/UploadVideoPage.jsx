import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  Play, 
  Pause, 
  Square, 
  FileVideo, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Zap, 
  History, 
  AlertTriangle, 
  BookmarkCheck, 
  Car, 
  Gauge, 
  Layers 
} from 'lucide-react';
import { api } from '../services/api';
import RoadCorridorControl from '../components/RoadCorridorControl';

export default function UploadVideoPage({ onNavigateTab }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedInfo, setUploadedInfo] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Full Batch Video Analysis state
  const [isAnalyzingFull, setIsAnalyzingFull] = useState(false);
  const [fullAnalysisResult, setFullAnalysisResult] = useState(null);

  // Live telemetry state while stream is active
  const [liveTelemetry, setLiveTelemetry] = useState(null);

  const fileInputRef = useRef(null);

  // Poll current telemetry while stream is running
  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(async () => {
        try {
          const res = await api.getCurrentTraffic();
          if (res?.telemetry) {
            setLiveTelemetry(res.telemetry);
          }
        } catch {
          // ignore transient poll error
        }
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg('');
      setFullAnalysisResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.uploadVideo(formData);
      setUploadedInfo(res);
      setSuccessToast(`Uploaded ${res.original_name} successfully.`);
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Video upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (!uploadedInfo?.video_path) {
      setErrorMsg('Please upload a video first, or use the preloaded sample video below');
      return;
    }
    setErrorMsg('');
    try {
      await api.startAnalysis('VIDEO', uploadedInfo.video_path, 0, uploadedInfo.original_name);
      setIsRunning(true);
      setIsPaused(false);
      setSuccessToast('Live stream analysis active. Records are saved to History every interval and on stop.');
      setTimeout(() => setSuccessToast(''), 4500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to start video analysis');
    }
  };

  const handleStartSample = async () => {
    setErrorMsg('');
    try {
      await api.startAnalysis('SAMPLE', null, 0, 'sample_traffic.mp4');
      setUploadedInfo({
        original_name: 'sample_traffic.mp4 (Expressway Corridor)',
        video_path: 'ml/videos/sample_traffic.mp4',
        duration_seconds: 25.0,
        resolution: '800x500',
        fps: 25,
      });
      setIsRunning(true);
      setIsPaused(false);
      setSuccessToast('Sample corridor video stream started.');
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to start sample video');
    }
  };

  const handleRunFullAnalysis = async () => {
    const videoPath = uploadedInfo?.video_path || 'ml/videos/sample_traffic.mp4';
    const videoName = uploadedInfo?.original_name || 'sample_traffic.mp4';

    setIsAnalyzingFull(true);
    setErrorMsg('');
    try {
      const res = await api.analyzeFullVideo({
        video_path: videoPath,
        video_name: videoName,
        interval_seconds: 15,
      });
      setFullAnalysisResult(res);
      setSuccessToast(`Video fully analyzed: ${res.records_generated} records recorded to History & Events.`);
      setTimeout(() => setSuccessToast(''), 5000);
    } catch (err) {
      setErrorMsg(err.message || 'Batch video analysis failed');
    } finally {
      setIsAnalyzingFull(false);
    }
  };

  const handleRecordNow = async () => {
    try {
      const res = await api.recordNow();
      if (res?.record) {
        setSuccessToast(`Interval recorded successfully! Saved as Event #${res.record.id} in History.`);
      } else {
        setSuccessToast('Current snapshot saved to History.');
      }
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to record interval');
    }
  };

  const handlePause = async () => {
    try {
      const res = await api.pauseAnalysis();
      setIsPaused(res.is_paused);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStop = async () => {
    try {
      await api.stopAnalysis();
      setIsRunning(false);
      setIsPaused(false);
      setSuccessToast('Analysis stopped. Buffer flushed and written to History.');
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-black tracking-tight">
            Traffic Video Analysis
          </h2>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            Process recorded traffic footage, configure parking exclusion corridors, and log records to History.
          </p>
        </div>

        {onNavigateTab && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onNavigateTab('history')}
              className="px-3 py-1.5 rounded-xl bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>History Records</span>
            </button>
            <button
              onClick={() => onNavigateTab('events')}
              className="px-3 py-1.5 rounded-xl bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Traffic Events</span>
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successToast && (
        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-center space-x-2 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-sky-600" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Upload Zone & Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Dropzone */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-white border border-sky-100 shadow-xs flex flex-col justify-between">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-sky-200 hover:border-sky-500 rounded-xl p-7 text-center cursor-pointer transition bg-sky-50/30 hover:bg-sky-50/70 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/avi,video/quicktime,video/mkv,video/webm"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-105 transition">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-black">
              {file ? file.name : 'Select or drop traffic video file'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Supports MP4, AVI, MOV, WebM (Up to 500 MB)
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{uploading ? 'Uploading...' : 'Upload Video'}</span>
              </button>

              <button
                onClick={handleStartSample}
                className="px-4 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-black text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border border-sky-200"
              >
                <Sparkles className="w-4 h-4 text-sky-600" />
                <span>Use Sample Video</span>
              </button>
            </div>

            {uploadedInfo && (
              <span className="text-xs text-emerald-800 flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Video ready for analysis</span>
              </span>
            )}
          </div>
        </div>

        {/* Video Metadata & Dual Actions Card */}
        <div className="md:col-span-1 p-5 rounded-2xl bg-white border border-sky-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-black uppercase tracking-wider mb-3">
              <FileVideo className="w-4 h-4 text-sky-600" />
              <span>Video Metadata</span>
            </div>

            {uploadedInfo ? (
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-sky-50/60 border border-sky-100">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">File</span>
                  <span className="font-semibold text-black break-all">{uploadedInfo.original_name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-sky-50/60 border border-sky-100">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Duration</span>
                    <span className="font-bold text-black">{uploadedInfo.duration_seconds}s</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-sky-50/60 border border-sky-100">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">FPS</span>
                    <span className="font-bold text-black">{uploadedInfo.fps}</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-50/60 border border-sky-100">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Resolution</span>
                  <span className="font-mono text-black font-semibold">{uploadedInfo.resolution}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                <FileVideo className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
                <span>Upload a video or choose sample</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            {/* Primary Action 1: Run Full Video Analysis Fast */}
            <button
              onClick={handleRunFullAnalysis}
              disabled={!uploadedInfo || isAnalyzingFull || isRunning}
              className="w-full py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className={`w-4 h-4 fill-white ${isAnalyzingFull ? 'animate-bounce' : ''}`} />
              <span>{isAnalyzingFull ? 'Analyzing Entire Video...' : 'Run Full Video Analysis (Fast)'}</span>
            </button>

            {/* Primary Action 2: Stream Live With Detection Overlays */}
            {!isRunning ? (
              <button
                onClick={handleStartAnalysis}
                disabled={!uploadedInfo || isAnalyzingFull}
                className="w-full py-2 rounded-xl bg-white hover:bg-sky-50 border border-sky-200 text-sky-800 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-sky-700" />
                <span>Play Live Stream</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePause}
                  className="py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-black font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                >
                  <Pause className="w-4 h-4" />
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
                <button
                  onClick={handleStop}
                  className="py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-red-600" />
                  <span>Stop & Save</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Batch Analysis Summary Card (Appears after Full Analysis) */}
      {fullAnalysisResult && (
        <div className="p-5 rounded-2xl bg-white border-2 border-sky-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-sky-100">
            <div>
              <div className="flex items-center space-x-2">
                <BookmarkCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-extrabold text-black">
                  Video Analysis Complete & Saved to Database
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Corridor: <strong className="text-black font-semibold">{fullAnalysisResult.corridor_id}</strong> • Processed {fullAnalysisResult.frames_analyzed} frames across {fullAnalysisResult.duration_seconds}s
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {onNavigateTab && (
                <>
                  <button
                    onClick={() => onNavigateTab('history')}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>View in History</span>
                  </button>
                  <button
                    onClick={() => onNavigateTab('events')}
                    className="px-3.5 py-1.5 rounded-xl bg-white border border-sky-300 text-sky-800 hover:bg-sky-50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>View Events</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Records Generated</span>
              <span className="text-xl font-black text-sky-700">{fullAnalysisResult.records_generated}</span>
            </div>
            <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Highest Congestion</span>
              <span className={`text-base font-black uppercase ${
                fullAnalysisResult.highest_congestion === 'HIGH' ? 'text-red-600' : (fullAnalysisResult.highest_congestion === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600')
              }`}>
                {fullAnalysisResult.highest_congestion}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Peak Moving Vehicles</span>
              <span className="text-xl font-black text-black">{fullAnalysisResult.peak_vehicles}</span>
            </div>
            <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Avg Speed / Occupancy</span>
              <span className="text-xs font-bold text-black">{fullAnalysisResult.avg_movement} px/s • {fullAnalysisResult.avg_occupancy}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Road Width / Parking Corridor Control */}
      <RoadCorridorControl />

      {/* Video Stream Player with Detection Overlay */}
      <div className="p-5 rounded-2xl bg-white border border-sky-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-black tracking-wide uppercase">
              Processed Video Stream with Overlays
            </h3>
            <p className="text-[11px] text-slate-500">
              YOLOv8 vehicle bounding boxes, velocity vector, and parking exclusion boundaries
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {isRunning && (
              <button
                onClick={handleRecordNow}
                className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                <BookmarkCheck className="w-3.5 h-3.5 text-sky-600" />
                <span>Save Current Interval Now</span>
              </button>
            )}

            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${isRunning ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
              {isRunning ? (isPaused ? 'Paused' : 'Analyzing...') : 'Standby'}
            </span>
          </div>
        </div>

        <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-200 aspect-video flex items-center justify-center shadow-inner">
          {isRunning ? (
            <img
              src="/api/video/feed"
              alt="Video Processing Feed"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-center p-8 text-slate-400 text-xs">
              <FileVideo className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <span>Select or upload a video and click "Play Live Stream" or "Run Full Video Analysis"</span>
            </div>
          )}
        </div>

        {/* Live Telemetry Underneath Video When Active */}
        {isRunning && liveTelemetry && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Current Flow</span>
                <span className={`text-sm font-extrabold uppercase ${
                  liveTelemetry.congestion_level === 'HIGH' ? 'text-red-600' : (liveTelemetry.congestion_level === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600')
                }`}>
                  {liveTelemetry.congestion_level}
                </span>
              </div>
              <Layers className="w-5 h-5 text-sky-600 opacity-60" />
            </div>

            <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Active Vehicles</span>
                <span className="text-sm font-extrabold text-black">
                  {liveTelemetry.total_vehicles || 0}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  C:{liveTelemetry.cars || 0} B:{liveTelemetry.buses || 0}
                </span>
              </div>
              <Car className="w-5 h-5 text-sky-600 opacity-60" />
            </div>

            <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Road Occupancy</span>
                <span className="text-sm font-extrabold text-black">
                  {liveTelemetry.road_occupancy || 0}%
                </span>
              </div>
              <Layers className="w-5 h-5 text-sky-600 opacity-60" />
            </div>

            <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Avg Movement</span>
                <span className="text-sm font-extrabold text-black">
                  {liveTelemetry.average_movement || 0} px/s
                </span>
              </div>
              <Gauge className="w-5 h-5 text-sky-600 opacity-60" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
