import React, { useState, useEffect } from 'react';
import { Sliders, Key, Database, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import RoadCorridorControl from '../components/RoadCorridorControl';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [health, setHealth] = useState(null);
  const [conf, setConf] = useState(0.45);
  const [intervalSec, setIntervalSec] = useState(60);
  const [apiKey, setApiKey] = useState('');
  const [aiModel, setAiModel] = useState('gemini-1.5-flash');
  const [savedMsg, setSavedMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [s, h] = await Promise.all([api.getSettings(), api.getHealth()]);
      setSettings(s);
      setHealth(h);
      if (s.confidence_threshold != null) setConf(s.confidence_threshold);
      if (s.interval_seconds != null) setIntervalSec(s.interval_seconds);
      if (s.ai_model) setAiModel(s.ai_model);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSavedMsg('');
    try {
      const payload = {
        confidence_threshold: parseFloat(conf),
        interval_seconds: parseInt(intervalSec),
        ai_model: aiModel,
      };
      if (apiKey) {
        payload.ai_api_key = apiKey;
      }
      const res = await api.updateSettings(payload);
      setSettings(res);
      setSavedMsg('Settings saved successfully!');
      setTimeout(() => setSavedMsg(''), 3000);
      setApiKey('');
    } catch (err) {
      alert(`Error saving settings: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          System Configuration & Settings
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Adjust Computer Vision thresholds, road corridor width, aggregation interval, and AI recommendation keys.
        </p>
      </div>

      {savedMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Road Width & Parking Area Filter */}
      <RoadCorridorControl />

      <form onSubmit={handleSave} className="space-y-5">
        {/* Computer Vision Detection Tuning */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Detection Sensitivity & Aggregation</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-700 font-medium">YOLOv8 Confidence Threshold</span>
              <span className="font-mono font-bold text-blue-600">{Math.round(conf * 100)}% ({conf})</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={conf}
              onChange={(e) => setConf(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="pt-3 border-t border-slate-100">
            <label className="text-xs text-slate-700 font-medium block mb-2">
              Status Aggregation Interval
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { sec: 15, label: '15s (Rapid Demo)', desc: 'Fast presentation cycle' },
                { sec: 30, label: '30s (Evaluation)', desc: 'Balanced evaluation' },
                { sec: 60, label: '60s (Standard 1-Min)', desc: 'Operational standard' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.sec}
                  onClick={() => setIntervalSec(opt.sec)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    intervalSec === opt.sec
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-bold block">{opt.label}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AI Recommendation Engine */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Key className="w-4 h-4 text-blue-600" />
            <span>AI Recommendation Service (LLM)</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-700 font-medium block mb-1">
                Google Gemini API Key (Optional)
              </label>
              <input
                type="password"
                placeholder={settings?.ai_configured ? '••••••••••••••••••••••••••••••••' : 'Enter AI_API_KEY from Google AI Studio'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                If left empty, the intelligent rule-based traffic engine automatically provides expert recommendations.
              </p>
            </div>

            <div>
              <label className="text-xs text-slate-700 font-medium block mb-1">
                Model Selection
              </label>
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              </select>
            </div>
          </div>
        </div>

        {/* Database & Infrastructure */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>Database & System Status</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Database Engine</span>
              <span className="font-bold text-emerald-700 block mt-0.5">
                {health?.database || 'PostgreSQL (or SQLite Fallback)'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Neural Network Classifier</span>
              <span className="font-bold text-slate-800 block mt-0.5">
                {health?.models?.congestion_classifier ? 'MLPClassifier (Trained & Active)' : 'Rule Engine Fallback'}
              </span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition shadow-xs cursor-pointer"
        >
          {loading ? 'Saving...' : 'Save Configuration'}
        </button>
      </form>
    </div>
  );
}
