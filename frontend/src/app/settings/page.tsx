'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Settings as SettingsIcon,
  Satellite,
  Bell,
  Sliders,
  Shield,
  Save,
  CheckCircle2,
} from 'lucide-react';

export default function SettingsPage() {
  const [satellitePlatform, setSatellitePlatform] = useState('sentinel-2');
  const [maxCloudCover, setMaxCloudCover] = useState(20);
  const [ndviThreshold, setNdviThreshold] = useState(-0.25);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('https://field-dispatch.kenyawildlife.org/hooks/habitat-alarms');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-emerald-400" />
            <span>PLATFORM SETTINGS & SENSOR CONFIGURATION</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure satellite acquisition parameters, cloud masking tolerances, and dispatch webhook endpoints
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono flex items-center gap-2 transition-colors shadow-lg shadow-emerald-950/40"
        >
          {isSaved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>SAVED SUCCESSFULLY</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>SAVE CONFIGURATION</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Remote Sensing & Ingestion Settings */}
        <div className="gis-glass-card rounded-xl p-6 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-800 pb-3">
            <Satellite className="w-4 h-4 text-emerald-400" />
            <span>Satellite Sensor & Ingestion Engine</span>
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-mono uppercase text-slate-400 mb-1">
                Default Sensor Constellation
              </label>
              <select
                value={satellitePlatform}
                onChange={(e) => setSatellitePlatform(e.target.value)}
                className="w-full h-9 px-3 rounded bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="sentinel-2">Sentinel-2A/2B MSI (10m - 5 Day Revisit)</option>
                <option value="landsat-9">Landsat 8/9 OLI-2 (30m - Decadal Baseline)</option>
                <option value="harmonized">Harmonized Landsat-Sentinel (HLS 30m)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1 font-mono text-slate-400">
                <span>MAX CLOUD COVER TOLERANCE</span>
                <span className="text-emerald-400 font-bold">{maxCloudCover}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                value={maxCloudCover}
                onChange={(e) => setMaxCloudCover(Number(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Scenes exceeding this percentage will be rejected before Scene Classification Layer (SCL) cloud masking.
              </p>
            </div>
          </div>
        </div>

        {/* Change Detection Sensitivity */}
        <div className="gis-glass-card rounded-xl p-6 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Change Detection & Hotspot Sensitivity</span>
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1 font-mono text-slate-400">
                <span>CANOPY LOSS TRIGGER THRESHOLD (ΔNDVI)</span>
                <span className="text-red-400 font-bold">{ndviThreshold}</span>
              </div>
              <input
                type="range"
                min="-0.50"
                max="-0.10"
                step="0.05"
                value={ndviThreshold}
                onChange={(e) => setNdviThreshold(Number(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Pixel drops sharper than this threshold trigger spatial clustering into candidate degradation polygons.
              </p>
            </div>

            <div>
              <label className="block font-mono uppercase text-slate-400 mb-1">
                DBSCAN Clustering Kernel Radius (ε)
              </label>
              <select className="w-full h-9 px-3 rounded bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none">
                <option value="30">30 meters (Fine - 3x3 pixel kernel)</option>
                <option value="50">50 meters (Medium - Consolidates nearby gaps)</option>
                <option value="100">100 meters (Coarse - Large landscape clearings)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Alert & Dispatch Webhook Configuration */}
        <div className="gis-glass-card rounded-xl p-6 border border-slate-800 space-y-4 lg:col-span-2">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-800 pb-3">
            <Bell className="w-4 h-4 text-red-400" />
            <span>Incident Alert Webhooks & Ranger Notification Dispatch</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-mono uppercase text-slate-400 mb-1">
                Ranger Field Dispatch Webhook (HTTP POST)
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full h-9 px-3 rounded bg-slate-900 border border-slate-700 font-mono text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Payload emits RFC 7807 GeoJSON Feature when Critical change or Fire is detected.
              </p>
            </div>

            <div className="flex flex-col justify-center gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 w-4 h-4"
                />
                <span className="font-mono">Enable Immediate Email Alarms for Critical Severity</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 w-4 h-4"
                />
                <span className="font-mono">Sync with NASA FIRMS active fire feed every 6 hours</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
