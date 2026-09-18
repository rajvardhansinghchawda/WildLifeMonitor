'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Sliders,
  Shield,
  Users,
  Activity,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
  Compass,
  Cloud,
  Layers,
  Save,
  RotateCcw,
  Check,
  History,
  FileCode2,
} from 'lucide-react';
import {
  getAdminSettings,
  updateAdminSettings,
  getAdminAuditLogs,
  AdminSettingsResponse,
  AuditLogItem,
} from '@/lib/admin-api';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettingsResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [magnitudeWeight, setMagnitudeWeight] = useState(0.50);
  const [sensitivityWeight, setSensitivityWeight] = useState(0.30);
  const [contextWeight, setContextWeight] = useState(0.20);
  const [contextBufferKm, setContextBufferKm] = useState(5.0);
  const [maxCloudCover, setMaxCloudCover] = useState(20);
  const [ndviThreshold, setNdviThreshold] = useState(-0.25);

  const weightSum = +(magnitudeWeight + sensitivityWeight + contextWeight).toFixed(2);
  const isWeightValid = Math.abs(weightSum - 1.0) <= 0.01;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [conf, logs] = await Promise.all([
        getAdminSettings(),
        getAdminAuditLogs(20),
      ]);
      setSettings(conf);
      setAuditLogs(logs.items || []);

      // Populate form
      setMagnitudeWeight(conf.scientific_weights.magnitude);
      setSensitivityWeight(conf.scientific_weights.sensitivity);
      setContextWeight(conf.scientific_weights.context);
      setContextBufferKm(conf.context_buffer_km);
      setMaxCloudCover(conf.max_cloud_cover_percent);
      setNdviThreshold(conf.ndvi_loss_threshold);
    } catch (err: any) {
      console.error('Failed to load admin settings:', err);
      setError(err.message || 'Unable to load workspace settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!isWeightValid) {
      setError(`Priority weights must sum to exactly 1.00 (current sum: ${weightSum.toFixed(2)})`);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      await updateAdminSettings({
        magnitude_weight: magnitudeWeight,
        sensitivity_weight: sensitivityWeight,
        context_weight: contextWeight,
        context_buffer_km: contextBufferKm,
        max_cloud_cover_percent: maxCloudCover,
        ndvi_loss_threshold: ndviThreshold,
      });

      setSuccessMsg('Workspace scientific parameters updated and audit logged.');
      setTimeout(() => setSuccessMsg(null), 4000);

      // Refresh audit logs
      const updatedLogs = await getAdminAuditLogs(20);
      setAuditLogs(updatedLogs.items || []);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setMagnitudeWeight(0.50);
    setSensitivityWeight(0.30);
    setContextWeight(0.20);
    setContextBufferKm(5.0);
    setMaxCloudCover(20);
    setNdviThreshold(-0.25);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header & Sub-nav */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-800"
                title="Back to Admin"
              >
                <ChevronLeft className="w-4 h-4" />
              </Link>
              <span className="text-xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <span>SCIENTIFIC TUNING & GUARDRAILS</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40">
                ADMIN LEVEL
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Multi-criteria prioritization formulas, raster spatial tolerances, and immutable audit ledger
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Telemetry</span>
            </Link>

            <Link
              href="/admin/members"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Members</span>
            </Link>

            <button
              onClick={fetchData}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              title="Refresh Settings"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="rounded-lg bg-red-950/60 border border-red-800/80 p-3.5 flex items-center gap-3 text-red-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="font-mono">{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="rounded-lg bg-emerald-950/60 border border-emerald-800/80 p-3.5 flex items-center gap-3 text-emerald-200 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <p className="font-mono">{successMsg}</p>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scientific Prioritization Weights Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="gis-glass-card rounded-xl border border-slate-800 p-5 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-white font-mono uppercase flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span>Multi-Criteria Priority Weights</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Defines hotspot composite priority: Score = (W_m × Magnitude) + (W_s × Sensitivity) + (W_c × Context)
                  </p>
                </div>
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
                    isWeightValid
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                      : 'bg-red-950 text-red-300 border-red-500/50 animate-pulse'
                  }`}
                >
                  Sum: {weightSum.toFixed(2)} / 1.00
                </span>
              </div>

              {/* Weight 1: Magnitude */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">W_magnitude (Change Intensity & Area)</span>
                  <span className="text-emerald-400 font-bold">{magnitudeWeight.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={magnitudeWeight}
                  onChange={(e) => setMagnitudeWeight(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <p className="text-[10px] text-slate-500">
                  Weight applied to NDVI drop rate, deforestation hectare size, and pixel density.
                </p>
              </div>

              {/* Weight 2: Sensitivity */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">W_sensitivity (Ecological & Habitat Value)</span>
                  <span className="text-cyan-400 font-bold">{sensitivityWeight.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={sensitivityWeight}
                  onChange={(e) => setSensitivityWeight(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <p className="text-[10px] text-slate-500">
                  Weight applied to core tiger reserve boundaries, critical wildlife corridors, and UNESCO status.
                </p>
              </div>

              {/* Weight 3: Context */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">W_context (Proximity to Roads & Settlements)</span>
                  <span className="text-amber-400 font-bold">{contextWeight.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={contextWeight}
                  onChange={(e) => setContextWeight(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <p className="text-[10px] text-slate-500">
                  Weight applied to human accessibility vector risks (distance to nearest highway, rail, village).
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Context Buffer */}
                <div className="space-y-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <label className="text-[11px] font-mono text-slate-300 block">Context Buffer (km)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0.5"
                      max="50.0"
                      step="0.5"
                      value={contextBufferKm}
                      onChange={(e) => setContextBufferKm(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-white"
                    />
                    <span className="text-[10px] text-slate-400">km</span>
                  </div>
                </div>

                {/* Cloud Cover */}
                <div className="space-y-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <label className="text-[11px] font-mono text-slate-300 block">Max Cloud Cover (%)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="80"
                      step="5"
                      value={maxCloudCover}
                      onChange={(e) => setMaxCloudCover(parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-white"
                    />
                    <span className="text-[10px] text-slate-400">%</span>
                  </div>
                </div>

                {/* NDVI Loss Threshold */}
                <div className="space-y-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <label className="text-[11px] font-mono text-slate-300 block">NDVI Loss Floor</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="-0.90"
                      max="-0.05"
                      step="0.05"
                      value={ndviThreshold}
                      onChange={(e) => setNdviThreshold(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-white"
                    />
                    <span className="text-[10px] text-slate-400">ΔNDVI</span>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Defaults</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !isWeightValid}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-950"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Parameters</span>
                </button>
              </div>
            </div>

            {/* Audit Trail Table */}
            <div className="gis-glass-card rounded-xl border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <h2 className="text-sm font-semibold text-white font-mono uppercase flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-400" />
                  <span>Administrative Audit Trail ({auditLogs.length} Records)</span>
                </h2>
                <span className="text-[10px] font-mono text-slate-400">Immutable Ledger</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Timestamp</th>
                      <th className="py-2 px-3">Actor</th>
                      <th className="py-2 px-3">Action</th>
                      <th className="py-2 px-3">Target</th>
                      <th className="py-2 px-3">Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-500 text-xs">
                          No audit log entries recorded yet.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 text-emerald-400 font-semibold">{log.actor_id}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {log.target_type} ({log.target_id.slice(0, 8)}…)
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate text-[11px]">
                            {JSON.stringify(log.payload)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Hard Guardrails & Provider Status Column */}
          <div className="space-y-6">
            {/* Hard Guardrails Card */}
            <div className="gis-glass-card rounded-xl border border-slate-800 p-5 space-y-4">
              <h3 className="text-xs font-semibold text-white font-mono uppercase flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
                <Lock className="w-3.5 h-3.5 text-red-400" />
                <span>Hard Architectural Guardrails</span>
              </h3>
              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between items-center p-2 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-slate-400">Max AOI Area</span>
                  <span className="text-amber-400 font-bold">50,000 km²</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-slate-400">Max Polygon Vertices</span>
                  <span className="text-amber-400 font-bold">2,000 pts</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-slate-400">Max Temporal Window</span>
                  <span className="text-amber-400 font-bold">180 days</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-slate-400">Concurrent Jobs/Org</span>
                  <span className="text-amber-400 font-bold">5 jobs</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 italic">
                Enforced by systemdesign.md and Pydantic validators. Changes require engine redeployment.
              </p>
            </div>

            {/* Earth Observation Providers */}
            <div className="gis-glass-card rounded-xl border border-slate-800 p-5 space-y-4">
              <h3 className="text-xs font-semibold text-white font-mono uppercase flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>Telemetry Ingestion Providers</span>
              </h3>
              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-slate-300">Google Earth Engine</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                    ACTIVE
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-slate-300">Global Forest Watch (GFW)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                    ACTIVE
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-slate-300">NASA FIRMS Active Fires</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                    NOMINAL
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-slate-300">Overpass Context Vector</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                    ONLINE
                  </span>
                </div>
              </div>
            </div>

            {/* Storage & Caching Layer */}
            <div className="gis-glass-card rounded-xl border border-slate-800 p-5 space-y-4">
              <h3 className="text-xs font-semibold text-white font-mono uppercase flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Persistence & Data Integrity</span>
              </h3>
              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-slate-300">PostGIS Spatial Store</span>
                  <span className="text-emerald-400 font-bold">SRID 4326</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-slate-300">MinIO GeoTIFF Bucket</span>
                  <span className="text-emerald-400 font-bold">codeniti-rasters</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-slate-300">Redis Result Caching</span>
                  <span className="text-emerald-400 font-bold">TTL 300s</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-slate-300">Outbox Event Queue</span>
                  <span className="text-emerald-400 font-bold">At-least-once</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
