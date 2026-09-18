import React from 'react';
import { ChangeAnalysisStats, AnalysisType } from '@/types/change-analysis';
import {
  Layers,
  TrendingDown,
  TrendingUp,
  Activity,
  Percent,
  ShieldCheck,
  TreePine,
  Flame,
} from 'lucide-react';

interface ChangeStatsGridProps {
  stats: ChangeAnalysisStats;
  analysisType: AnalysisType;
}

export const ChangeStatsGrid: React.FC<ChangeStatsGridProps> = ({ stats, analysisType }) => {
  const isLossDominant = stats.lossAreaHa > stats.gainAreaHa;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Area Affected */}
      <div className="gis-glass-card rounded-xl p-4 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase text-slate-400">Total Area Affected</span>
          <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-500/30 text-blue-400">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {stats.areaAffectedHa.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ha</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 mt-1">
            <span className="text-blue-400 font-semibold">
              {(stats.areaAffectedHa / 100).toFixed(1)} km²
            </span>
            <span>total disturbance footprint</span>
          </div>
        </div>
      </div>

      {/* 2. Vegetation Loss Area */}
      <div className="gis-glass-card rounded-xl p-4 border border-slate-800 space-y-2 hover:border-red-950/80 transition-colors shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase text-slate-400">Vegetation Loss Area</span>
          <div className="p-2 rounded-lg bg-red-950/60 border border-red-500/30 text-red-400">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-red-400 tracking-tight">
            {stats.lossAreaHa.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ha</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 mt-1">
            <span className="text-red-400 font-semibold">
              {((stats.lossAreaHa / (stats.areaAffectedHa || 1)) * 100).toFixed(0)}%
            </span>
            <span>of total altered canopy</span>
          </div>
        </div>
      </div>

      {/* 3. Vegetation Gain Area */}
      <div className="gis-glass-card rounded-xl p-4 border border-slate-800 space-y-2 hover:border-emerald-950/80 transition-colors shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase text-slate-400">Vegetation Gain Area</span>
          <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
            {stats.gainAreaHa.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ha</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 mt-1">
            <span className="text-emerald-400 font-semibold">
              {((stats.gainAreaHa / (stats.areaAffectedHa || 1)) * 100).toFixed(0)}%
            </span>
            <span>natural regrowth & restoration</span>
          </div>
        </div>
      </div>

      {/* 4. Net Change */}
      <div className="gis-glass-card rounded-xl p-4 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase text-slate-400">Net Change</span>
          <div
            className={`p-2 rounded-lg border ${
              isLossDominant
                ? 'bg-amber-950/60 border-amber-500/30 text-amber-400'
                : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
            }`}
          >
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div
            className={`text-2xl font-bold font-mono tracking-tight ${
              stats.netChangeHa < 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {stats.netChangeHa > 0 ? `+${stats.netChangeHa}` : stats.netChangeHa}{' '}
            <span className="text-xs text-slate-400 font-normal">ha</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 mt-1">
            <span
              className={`font-semibold ${
                isLossDominant ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {isLossDominant ? 'Net Deficit' : 'Net Surplus'}
            </span>
            <span>across observation window</span>
          </div>
        </div>
      </div>

      {/* 5. Percentage Change */}
      <div className="gis-glass-card rounded-xl p-4 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase text-slate-400">Percentage Change</span>
          <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-400">
            <Percent className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div
            className={`text-2xl font-bold font-mono tracking-tight ${
              stats.percentageChange < 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {stats.percentageChange > 0 ? `+${stats.percentageChange}%` : `${stats.percentageChange}%`}
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 mt-1">
            <span className="text-cyan-400 font-semibold">
              {stats.confidenceScore}% conf
            </span>
            <span>S2 MSI multi-pass</span>
          </div>
        </div>
      </div>
    </div>
  );
};
