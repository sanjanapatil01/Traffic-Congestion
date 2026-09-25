import React, { useState, useRef } from 'react';
import { UploadCloud, Play, Pause, Square, FileVideo, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import RoadCorridorControl from '../components/RoadCorridorControl';

export default function UploadVideoPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedInfo, setUploadedInfo] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg('');
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
      await api.startAnalysis('VIDEO', uploadedInfo.video_path);
      setIsRunning(true);
      setIsPaused(false);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to start video analysis');
    }
  };

  const handleStartSample = async () => {
    setErrorMsg('');
    try {
      await api.startAnalysis('SAMPLE');
      setUploadedInfo({
        original_name: 'sample_traffic.mp4 (Expressway Corridor)',
        duration_seconds: 25.0,
        resolution: '800x500',
        fps: 25,
      });
      setIsRunning(true);
      setIsPaused(false);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to start sample video');
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
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Traffic Video Analysis
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Process recorded traffic footage with custom active road width and parking area exclusion.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Zone & Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Dropzone */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-7 text-center cursor-pointer transition bg-slate-50/60 hover:bg-blue-50/20 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/avi,video/quicktime,video/mkv,video/webm"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-105 transition">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">
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
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{uploading ? 'Uploading...' : 'Upload Video'}</span>
              </button>

              <button
                onClick={handleStartSample}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
              >
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Use Sample Corridor Video</span>
              </button>
            </div>

            {uploadedInfo && (
              <span className="text-xs text-emerald-700 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Video ready for analysis</span>
              </span>
            )}
          </div>
        </div>

        {/* Video Metadata Card */}
        <div className="md:col-span-1 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              <FileVideo className="w-4 h-4 text-blue-600" />
              <span>Video Information</span>
            </div>

            {uploadedInfo ? (
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block uppercase">File</span>
                  <span className="font-semibold text-slate-800 break-all">{uploadedInfo.original_name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 block uppercase">Duration</span>
                    <span className="font-bold text-slate-900">{uploadedInfo.duration_seconds}s</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 block uppercase">FPS</span>
                    <span className="font-bold text-slate-900">{uploadedInfo.fps}</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block uppercase">Resolution</span>
                  <span className="font-mono text-slate-800">{uploadedInfo.resolution}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                <FileVideo className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
                <span>Upload a video or choose sample</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100">
            {!isRunning ? (
              <button
                onClick={handleStartAnalysis}
                disabled={!uploadedInfo}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Video Analysis</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePause}
                  className="py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                >
                  <Pause className="w-4 h-4" />
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
                <button
                  onClick={handleStop}
                  className="py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-red-600" />
                  <span>Stop</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Road Width / Parking Corridor Control */}
      <RoadCorridorControl />

      {/* Video Stream Player with Detection Overlay */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
              Processed Video Stream with Overlays
            </h3>
            <p className="text-[11px] text-slate-500">
              YOLOv8 vehicle bounding boxes, velocity vector, and parking exclusion boundaries
            </p>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${isRunning ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
            {isRunning ? (isPaused ? 'Paused' : 'Analyzing...') : 'Standby'}
          </span>
        </div>

        <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-200 aspect-video flex items-center justify-center shadow-inner">
          {isRunning ? (
            <img
              src="/api/video/feed"
              alt="Video Processing Feed"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-center p-8 text-slate-500 text-xs">
              <FileVideo className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <span>Select or upload a video and click "Start Video Analysis"</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
