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
  CartesianGrid,
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e5ebe4] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-slate-900 font-outfit flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                <span>Admin Command Console</span>
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                SYSTEM TELEMETRY
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time compute cluster throughput, latency distributions, and microservice status
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/members"
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#f3f7f2] text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#dde4dc] shadow-xs"
            >
              <Users className="w-3.5 h-3.5 text-sky-600" />
              <span>Manage Members</span>
            </Link>

            <Link
              href="/admin/settings"
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#f3f7f2] text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#dde4dc] shadow-xs"
            >
              <Settings className="w-3.5 h-3.5 text-amber-600" />
              <span>Scientific Tuning</span>
            </Link>

            <button
              onClick={fetchTelemetry}
              className="p-2 rounded-xl bg-white hover:bg-[#f3f7f2] text-slate-600 transition-colors border border-[#dde4dc] shadow-xs"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-center justify-between text-xs font-mono shadow-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchTelemetry}
              className="px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 font-bold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Top KPI Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-[#e5ebe4] shadow-xs">
            <div className="text-slate-500 text-xs font-semibold uppercase mb-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>24h Throughput</span>
            </div>
            <div className="text-2xl font-black text-slate-900 font-outfit">
              {telemetry ? telemetry.kpis.jobs_processed_24h : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Satellite Ingestion Runs</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#e5ebe4] shadow-xs">
            <div className="text-slate-500 text-xs font-semibold uppercase mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span>p95 Pipeline Latency</span>
            </div>
            <div className="text-2xl font-black text-sky-700 font-outfit">
              {telemetry ? `${telemetry.kpis.p95_execution_latency_ms} ms` : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Target: &lt; 500 ms (Met)</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#e5ebe4] shadow-xs">
            <div className="text-slate-500 text-xs font-semibold uppercase mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Redis Cache Hit Rate</span>
            </div>
            <div className="text-2xl font-black text-emerald-700 font-outfit">
              {telemetry ? `${(telemetry.kpis.redis_cache_hit_rate * 100).toFixed(1)}%` : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Scientific + Idempotency Cache</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#e5ebe4] shadow-xs">
            <div className="text-slate-500 text-xs font-semibold uppercase mb-1 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-purple-600" />
              <span>Artifact Storage</span>
            </div>
            <div className="text-2xl font-black text-slate-900 font-outfit">
              {telemetry ? `${telemetry.kpis.storage_used_mb} MB` : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">MinIO GeoTIFF Raster Masks</div>
          </div>
        </div>

        {/* Primary Data Visualizations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: 24h Latency & Processing Volume Curve (AreaChart, 2 cols) */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-[#e5ebe4] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5ebe4] pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 font-outfit uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>24-Hour Processing Throughput & Execution Latency</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dual-axis telemetry: Hourly completed analyses vs p50/p95 response times
                </p>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-[#f8faf7] border border-[#dde4dc] text-slate-600">
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
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5ebe4" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      stroke="#64748b"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e5ebe4',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#0f172a',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="throughput"
                      name="Throughput (Jobs)"
                      stroke="#059669"
                      fillOpacity={1}
                      fill="url(#colorThroughput)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="p95_ms"
                      name="Latency p95 (ms)"
                      stroke="#0284c7"
                      fillOpacity={1}
                      fill="url(#colorLatency)"
                      strokeWidth={1.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono">
                  Loading telemetry stream...
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: Analysis Lifecycle Status Distribution (Donut Chart, 1 col) */}
          <div className="p-5 rounded-2xl bg-white border border-[#e5ebe4] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5ebe4] pb-3">
              <h2 className="text-sm font-bold text-slate-900 font-outfit uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-600" />
                <span>Job Status Breakdown</span>
              </h2>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-[#f8faf7] border border-[#dde4dc] text-slate-600">
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
                        backgroundColor: '#ffffff',
                        borderColor: '#e5ebe4',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#0f172a',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
              {/* Central Counter */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black font-outfit text-slate-900">
                  {telemetry?.kpis.total_analyses_all_time ?? 0}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase font-mono">Analyses</span>
              </div>
            </div>

            {/* Legend List */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-3 border-t border-[#e5ebe4]">
              {telemetry?.status_distribution.map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-slate-600 text-[11px] font-medium">{s.name}:</span>
                  </div>
                  <span className="text-slate-900 font-bold">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Secondary Grid: Method Compute & Cluster Service Heartbeats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 3: Method Compute Resource Consumption (BarChart) */}
          <div className="p-5 rounded-2xl bg-white border border-[#e5ebe4] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5ebe4] pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 font-outfit uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>Compute Workload by Method Family</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aggregated execution seconds consumed per satellite analysis layer
                </p>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-[#f8faf7] border border-[#dde4dc] text-slate-600">
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5ebe4" vertical={false} />
                    <XAxis
                      dataKey="method"
                      stroke="#64748b"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e5ebe4',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#0f172a',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
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
          <div className="p-5 rounded-2xl bg-white border border-[#e5ebe4] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5ebe4] pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 font-outfit uppercase tracking-wider flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-600" />
                  <span>Cluster Process Heartbeat Matrix</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Microservices monitored under Docker Compose orchestrator
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                ALL NOMINAL
              </span>
            </div>

            <div className="space-y-2.5">
              {telemetry?.service_heartbeats.map((srv) => (
                <div
                  key={srv.name}
                  className="p-3 rounded-xl bg-[#f8faf7] border border-[#e5ebe4] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <span className="font-bold text-slate-900 block">{srv.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{srv.role}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-500 text-[11px]">{srv.latency_ms} ms</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
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
