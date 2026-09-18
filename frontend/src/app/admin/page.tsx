'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Activity,
  Cpu,
  Database,
  Clock,
  HardDrive,
  Users,
  Settings,
  Shield,
  RefreshCw,
  AlertTriangle,
  Server,
  Layers,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getAdminTelemetry, AdminTelemetryResponse } from '@/lib/admin-api';

export default function AdminTelemetryPage() {
  const [telemetry, setTelemetry] = useState<AdminTelemetryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTelemetry = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminTelemetry();
      setTelemetry(data);
    } catch (err: any) {
      console.error('Failed to load admin telemetry:', err);
      setError(err.message || 'Unable to load telemetry metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header & Sub-navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <span>ADMIN COMMAND CONSOLE</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                SYSTEM TELEMETRY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Real-time compute cluster throughput, latency distributions, and microservice status
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/members"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Manage Members</span>
            </Link>

            <Link
              href="/settings"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>Workspace Settings</span>
            </Link>

            <button
              onClick={fetchTelemetry}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-200 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchTelemetry}
              className="px-3 py-1 rounded bg-red-900 hover:bg-red-800 text-white font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Top KPI Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <div className="text-slate-400 text-xs font-mono uppercase mb-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>24h Throughput</span>
            </div>
            <div className="text-2xl font-extrabold text-white font-mono">
              {telemetry ? telemetry.kpis.jobs_processed_24h : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Satellite Ingestion Runs</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <div className="text-slate-400 text-xs font-mono uppercase mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>p95 Pipeline Latency</span>
            </div>
            <div className="text-2xl font-extrabold text-cyan-400 font-mono">
              {telemetry ? `${telemetry.kpis.p95_execution_latency_ms} ms` : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Target: &lt; 500 ms (Met)</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <div className="text-slate-400 text-xs font-mono uppercase mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Redis Cache Hit Rate</span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">
              {telemetry ? `${(telemetry.kpis.redis_cache_hit_rate * 100).toFixed(1)}%` : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Scientific + Idempotency Cache</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <div className="text-slate-400 text-xs font-mono uppercase mb-1 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-purple-400" />
              <span>Artifact Storage</span>
            </div>
            <div className="text-2xl font-extrabold text-white font-mono">
              {telemetry ? `${telemetry.kpis.storage_used_mb} MB` : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">MinIO GeoTIFF Raster Masks</div>
          </div>
        </div>

        {/* Primary Data Visualizations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: 24h Latency & Processing Volume Curve (AreaChart, 2 cols) */}
          <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>24-Hour Processing Throughput & Execution Latency</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dual-axis telemetry: Hourly completed analyses vs p50/p95 response times
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                Hourly Bucket
              </span>
            </div>

            <div className="h-72 w-full">
              {telemetry?.throughput_latency_series ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={telemetry.throughput_latency_series}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="hour"
                      stroke="#64748b"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#090d16',
                        borderColor: '#1e293b',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#f8fafc',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="throughput"
                      name="Throughput (Jobs)"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorThroughput)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="p95_ms"
                      name="Latency p95 (ms)"
                      stroke="#06b6d4"
                      fillOpacity={1}
                      fill="url(#colorLatency)"
                      strokeWidth={1.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                  Loading telemetry stream...
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: Analysis Lifecycle Status Distribution (Donut Chart, 1 col) */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Job Status Breakdown</span>
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                All-Time
              </span>
            </div>

            <div className="h-48 w-full relative">
              {telemetry?.status_distribution ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={telemetry.status_distribution}
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {telemetry.status_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#090d16',
                        borderColor: '#1e293b',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#f8fafc',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
              {/* Central Counter */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold font-mono text-white">
                  {telemetry?.kpis.total_analyses_all_time ?? 0}
                </span>
                <span className="text-[9px] font-mono text-slate-400 uppercase">Analyses</span>
              </div>
            </div>

            {/* Legend List */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-800/80">
              {telemetry?.status_distribution.map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-slate-400 text-[11px]">{s.name}:</span>
                  </div>
                  <span className="text-white font-bold">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Secondary Grid: Method Compute & Cluster Service Heartbeats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 3: Method Compute Resource Consumption (BarChart) */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Compute Workload by Method Family</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Aggregated execution seconds consumed per satellite analysis layer
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                Seconds
              </span>
            </div>

            <div className="h-60 w-full">
              {telemetry?.method_compute_breakdown ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={telemetry.method_compute_breakdown}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="method"
                      stroke="#64748b"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#090d16',
                        borderColor: '#1e293b',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#f8fafc',
                      }}
                    />
                    <Bar dataKey="compute_seconds" name="Compute Seconds" radius={[4, 4, 0, 0]}>
                      {telemetry.method_compute_breakdown.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>

          {/* Microservice Cluster Health Matrix */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <span>Cluster Process Heartbeat Matrix</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Microservices monitored under Docker Compose orchestrator
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                ALL NOMINAL
              </span>
            </div>

            <div className="space-y-2.5">
              {telemetry?.service_heartbeats.map((srv) => (
                <div
                  key={srv.name}
                  className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <span className="font-bold text-white block">{srv.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{srv.role}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-400 text-[11px]">{srv.latency_ms} ms</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                      {srv.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
