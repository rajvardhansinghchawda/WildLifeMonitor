'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Settings as SettingsIcon,
  Sliders,
  Shield,
  Save,
  CheckCircle2,
  AlertTriangle,
  History,
  Activity,
  Layers,
  MapPin,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  getAdminSettings,
  updateAdminSettings,
  getAdminAuditLogs,
  AdminSettingsResponse,
  AuditLogItem,
} from '@/lib/admin-api';

export default function SettingsPage() {
  const [settingsData, setSettingsData] = useState<AdminSettingsResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [magWeight, setMagWeight] = useState(0.50);
  const [sensWeight, setSensWeight] = useState(0.30);
  const [ctxWeight, setCtxWeight] = useState(0.20);
  const [bufferKm, setBufferKm] = useState(5.0);
  const [cloudCover, setCloudCover] = useState(20);
  const [ndviThreshold, setNdviThreshold] = useState(-0.25);

  const loadSettingsAndAudit = async () => {
    try {
      setLoading(true);
      setError(null);
      const [st, logs] = await Promise.all([getAdminSettings(), getAdminAuditLogs(15)]);

      setSettingsData(st);
      setAuditLogs(logs.items);

      if (st.scientific_weights) {
        setMagWeight(st.scientific_weights.magnitude);
        setSensWeight(st.scientific_weights.sensitivity);
        setCtxWeight(st.scientific_weights.context);
      }
      if (st.context_buffer_km) setBufferKm(st.context_buffer_km);
      if (st.max_cloud_cover_percent) setCloudCover(st.max_cloud_cover_percent);
      if (st.ndvi_loss_threshold) setNdviThreshold(st.ndvi_loss_threshold);
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      setError(err.message || 'Unable to load workspace settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsAndAudit();
  }, []);

  const totalWeight = Math.round((magWeight + sensWeight + ctxWeight) * 100) / 100;
  const isWeightValid = Math.abs(totalWeight - 1.0) < 0.01;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWeightValid) {
      setError(`Weights must sum to 1.00 (current sum: ${totalWeight.toFixed(2)})`);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await updateAdminSettings({
        magnitude_weight: magWeight,
        sensitivity_weight: sensWeight,
        context_weight: ctxWeight,
        context_buffer_km: bufferKm,
        max_cloud_cover_percent: cloudCover,
        ndvi_loss_threshold: ndviThreshold,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadSettingsAndAudit();
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-emerald-400" />
                <span>WORKSPACE SCIENTIFIC TUNING & LIMITS</span>
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                ADMIN
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Calibrate Investigation Priority formula weights, infrastructure buffers, and review audit records
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Telemetry Console</span>
            </Link>

            <button
              onClick={handleSave}
              disabled={saving || !isWeightValid}
              className={`px-4 py-2 rounded-lg text-white text-xs font-bold font-mono flex items-center gap-2 transition-all shadow-lg ${
                saveSuccess
                  ? 'bg-emerald-600 shadow-emerald-950/40'
                  : isWeightValid
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>SAVED TO POSTGIS</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'SAVING...' : 'SAVE PARAMETERS'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scientific Priority Score Weights Formula Tuning */}
          <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Investigation Priority Weights ($W_m + W_s + W_c$)</span>
              </h2>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                  isWeightValid
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-red-950 text-red-300 border border-red-700'
                }`}
              >
                Sum: {totalWeight.toFixed(2)} / 1.00
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Heuristic screening formula weights defined in <code className="text-emerald-300">rules.md</code> and{' '}
              <code className="text-emerald-300">superpower.md</code>. Weights must sum exactly to 1.00.
            </p>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">1. Magnitude Weight ($W_m$)</span>
                  <span className="text-emerald-400 font-bold">{magWeight.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.80"
                  step="0.05"
                  value={magWeight}
                  onChange={(e) => setMagWeight(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Affected area in hectares and magnitude of index delta (NDVI change).
                </span>
              </div>


              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">2. Zone Sensitivity Weight ($W_s$)</span>
                  <span className="text-emerald-400 font-bold">{sensWeight.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.80"
                  step="0.05"
                  value={sensWeight}
                  onChange={(e) => setSensWeight(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Ecological sensitivity classification of core habitat vs buffer corridor.
                </span>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">3. Human Proximity Context Weight ($W_c$)</span>
                  <span className="text-emerald-400 font-bold">{ctxWeight.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.50"
                  step="0.05"
                  value={ctxWeight}
                  onChange={(e) => setCtxWeight(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Proximity pressure to nearest known road and settlement from OpenStreetMap.
                </span>
              </div>
            </div>
          </div>

          {/* Spatial Proximity & Threshold Parameters */}
          <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-800 pb-3">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span>Spatial Proximity & Sensor Tolerance</span>
            </h2>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Road & Settlement Search Radius</span>
                  <span className="text-cyan-400 font-bold">{bufferKm.toFixed(1)} km</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="20.0"
                  step="0.5"
                  value={bufferKm}
                  onChange={(e) => setBufferKm(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Spatial search buffer around AOI for nearest known track/settlement via PostGIS.
                </span>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Max Cloud Cover Tolerance</span>
                  <span className="text-cyan-400 font-bold">{cloudCover}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="5"
                  value={cloudCover}
                  onChange={(e) => setCloudCover(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Scenes exceeding this threshold are rejected before Scene Classification Layer (SCL) masking.
                </span>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Canopy Loss Trigger Threshold (delta-NDVI)</span>
                  <span className="text-red-400 font-bold">{ndviThreshold.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="-0.50"
                  max="-0.10"
                  step="0.05"
                  value={ndviThreshold}
                  onChange={(e) => setNdviThreshold(parseFloat(e.target.value))}
                  className="w-full accent-red-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Pixel-level drop threshold vectorizing pixels into degradation polygon clusters.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* System Limits Matrix (Read-Only per spec.md) */}
        <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Configured System Operational Limits (Read-Only)</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">spec.md Guardrails</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
              <div className="text-slate-500 text-[10px]">MAX AOI SIZE</div>
              <div className="text-white font-bold text-base mt-0.5">
                {settingsData?.limits.max_aoi_km2.toLocaleString() ?? 2500} km²
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Prevents GEE quota exhaustion</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
              <div className="text-slate-500 text-[10px]">MAX VERTICES</div>
              <div className="text-white font-bold text-base mt-0.5">
                {settingsData?.limits.max_vertices.toLocaleString() ?? 5000}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">GeoJSON complexity cap</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
              <div className="text-slate-500 text-[10px]">MAX WINDOW</div>
              <div className="text-white font-bold text-base mt-0.5">
                {settingsData?.limits.max_window_days ?? 180} Days
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Observation period cap</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
              <div className="text-slate-500 text-[10px]">CONCURRENT JOBS</div>
              <div className="text-white font-bold text-base mt-0.5">
                {settingsData?.limits.max_active_jobs_per_workspace ?? 5} / Workspace
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Redis semaphore lock</div>
            </div>
          </div>
        </div>

        {/* Audit Log Trail Table */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-purple-400" />
                <span>Security & Administrative Audit Log Trail</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Immutable audit records stored in PostgreSQL (<code className="text-slate-300">audit_logs</code>)
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              {auditLogs.length} Events Logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="pb-2.5">Timestamp</th>
                  <th className="pb-2.5">Actor</th>
                  <th className="pb-2.5">Action</th>
                  <th className="pb-2.5">Target</th>
                  <th className="pb-2.5">Payload Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 text-slate-400 whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 font-bold text-slate-200">{log.actor_id}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800 text-[10px] font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400">
                      {log.target_type}: {log.target_id.slice(0, 12)}
                    </td>
                    <td className="py-2.5 text-slate-400 max-w-xs truncate text-[11px]">
                      {JSON.stringify(log.payload)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
