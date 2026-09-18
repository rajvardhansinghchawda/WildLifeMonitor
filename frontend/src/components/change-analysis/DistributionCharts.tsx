import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { BarChart3, TrendingDown, Sparkles, Layers, Info } from 'lucide-react';
import { AnalysisType } from '@/types/change-analysis';

interface DistributionChartsProps {
  analysisType: AnalysisType;
  areaName: string;
}

// Mock NDVI distribution data (Period 1 vs Period 2)
const NDVI_DISTRIBUTION_DATA = [
  { ndvi: '0.00 - 0.10', baseline: 120, current: 280 },
  { ndvi: '0.10 - 0.20', baseline: 240, current: 650 },
  { ndvi: '0.20 - 0.30', baseline: 410, current: 980 },
  { ndvi: '0.30 - 0.40', baseline: 680, current: 1420 },
  { ndvi: '0.40 - 0.50', baseline: 1250, current: 1840 },
  { ndvi: '0.50 - 0.60', baseline: 2450, current: 2310 },
  { ndvi: '0.60 - 0.70', baseline: 5890, current: 4120 },
  { ndvi: '0.70 - 0.80', baseline: 9240, current: 6850 },
  { ndvi: '0.80 - 0.90', baseline: 4850, current: 3120 },
  { ndvi: '0.90 - 1.00', baseline: 950, current: 520 },
];

// Mock Change distribution histogram bins (Δ values)
const CHANGE_DISTRIBUTION_DATA = [
  {
    interval: '< -0.40',
    label: 'Severe Loss',
    areaHa: 420,
    color: '#ef4444',
    desc: 'High severity canopy depletion / clear-cut',
  },
  {
    interval: '-0.40 to -0.15',
    label: 'Moderate Loss',
    areaHa: 860,
    color: '#f97316',
    desc: 'Selective logging / canopy thinning',
  },
  {
    interval: '-0.15 to +0.15',
    label: 'Stable',
    areaHa: 14200,
    color: '#64748b',
    desc: 'Intact forest canopy equilibrium',
  },
  {
    interval: '+0.15 to +0.40',
    label: 'Moderate Gain',
    areaHa: 410,
    color: '#84cc16',
    desc: 'Secondary succession / seasonal flush',
  },
  {
    interval: '> +0.40',
    label: 'High Gain',
    areaHa: 150,
    color: '#10b981',
    desc: 'Active reforestation / riparian recovery',
  },
];

export const DistributionCharts: React.FC<DistributionChartsProps> = ({
  analysisType,
  areaName,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="gis-glass-card rounded-xl p-5 border border-slate-800 h-80 flex items-center justify-center">
          <div className="text-xs font-mono text-slate-500 animate-pulse">Loading NDVI distribution curve...</div>
        </div>
        <div className="gis-glass-card rounded-xl p-5 border border-slate-800 h-80 flex items-center justify-center">
          <div className="text-xs font-mono text-slate-500 animate-pulse">Loading change distribution histogram...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ========================================================================= */}
      {/* 1. NDVI DISTRIBUTION CHART (PERIOD 1 VS PERIOD 2) */}
      {/* ========================================================================= */}
      <div className="gis-glass-card rounded-xl p-5 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-blue-950/60 border border-blue-500/30 text-blue-400">
                <BarChart3 className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold font-mono text-white tracking-wide uppercase">
                NDVI Frequency Distribution
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Spectral density comparison between Baseline (T1) and Current (T2)
            </p>
          </div>

          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>T1 Baseline</span>
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>T2 Current</span>
            </span>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={NDVI_DISTRIBUTION_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="baselineColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="currentColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="ndvi"
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                interval={1}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-950/95 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs font-mono space-y-1">
                        <div className="font-bold text-white">NDVI Bin: {label}</div>
                        <div className="text-blue-400">
                          T1 Baseline: {payload[0]?.value?.toLocaleString()} pixels
                        </div>
                        <div className="text-rose-400">
                          T2 Current: {payload[1]?.value?.toLocaleString()} pixels
                        </div>
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                          Δ Shift: Deforestation shoulder at 0.20-0.40
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="baseline"
                name="T1 Baseline"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#baselineColor)"
              />
              <Area
                type="monotone"
                dataKey="current"
                name="T2 Current"
                stroke="#f43f5e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#currentColor)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Insight footer */}
        <div className="flex items-center gap-2 p-2 rounded bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-300">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            Distribution shift reveals a significant leftward displacement of pixel densities into the 0.20–0.45 NDVI range.
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CHANGE DISTRIBUTION CHART (ΔNDVI HISTOGRAM BINS) */}
      {/* ========================================================================= */}
      <div className="gis-glass-card rounded-xl p-5 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                <Layers className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold font-mono text-white tracking-wide uppercase">
                Change Distribution (Δ Severity Bins)
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Hectares affected across diverging change classes
            </p>
          </div>

          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800 self-start sm:self-auto">
            Total Monitored: 16,040 ha
          </span>
        </div>

        {/* Recharts Bar Chart with Custom Diverging Fills */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={CHANGE_DISTRIBUTION_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="interval"
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-950/95 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs font-mono space-y-1">
                        <div className="font-bold flex items-center gap-1.5" style={{ color: data.color }}>
                          <span>{data.label}</span>
                          <span className="text-slate-400">({data.interval})</span>
                        </div>
                        <div className="text-white">Area: {data.areaHa.toLocaleString()} ha</div>
                        <div className="text-[10px] text-slate-400">{data.desc}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="areaHa" radius={[4, 4, 0, 0]}>
                {CHANGE_DISTRIBUTION_DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] font-mono">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-red-500" />
            <span className="text-red-400">Loss (1,280 ha)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-slate-500" />
            <span className="text-slate-400">Stable (14,200 ha)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-emerald-500" />
            <span className="text-emerald-400">Gain (560 ha)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
