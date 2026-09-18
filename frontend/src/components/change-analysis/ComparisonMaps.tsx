import React from 'react';
import { ProtectedArea } from '@/types';
import { AnalysisType, ChangeAnalysisStats } from '@/types/change-analysis';
import {
  Calendar,
  Layers,
  Compass,
  TrendingDown,
  Shield,
  Activity,
  AlertTriangle,
  Waves,
  TreePine,
} from 'lucide-react';

interface ComparisonMapsProps {
  selectedArea: ProtectedArea;
  startDate: string;
  endDate: string;
  analysisType: AnalysisType;
  stats: ChangeAnalysisStats;
}

export const ComparisonMaps: React.FC<ComparisonMapsProps> = ({
  selectedArea,
  startDate,
  endDate,
  analysisType,
  stats,
}) => {
  // Format date readable
  const formatReadableDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getIndexName = () => {
    switch (analysisType) {
      case 'water_ndwi':
        return 'NDWI';
      case 'builtup_ndbi':
        return 'NDBI';
      case 'fire_activity':
        return 'NBR';
      case 'land_cover':
        return 'LULC';
      case 'vegetation_ndvi':
      default:
        return 'NDVI';
    }
  };

  const indexName = getIndexName();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ========================================================================= */}
      {/* LEFT: PREVIOUS PERIOD MAP (BASELINE) */}
      {/* ========================================================================= */}
      <div className="gis-glass-card rounded-xl border border-slate-800 overflow-hidden flex flex-col shadow-xl">
        {/* Map Header */}
        <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <h3 className="text-xs font-bold font-mono text-white tracking-wide uppercase">
              Previous Period (Baseline)
            </h3>
            <span className="text-[10px] font-mono text-blue-300 px-2 py-0.5 rounded bg-blue-950/80 border border-blue-500/30 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-400" />
              <span>{formatReadableDate(startDate)}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="text-slate-400">Mean {indexName}:</span>
            <span className="text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
              +{stats.baselineIndexMean.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Map Viewport Canvas */}
        <div className="relative w-full h-[360px] bg-[#05080c] overflow-hidden select-none">
          {/* Simulated Satellite Multispectral Backdrop */}
          <div
            className="absolute inset-0 transition-opacity"
            style={{
              backgroundImage: `radial-gradient(ellipse at 50% 50%, rgba(6, 78, 59, 0.45) 0%, rgba(2, 44, 34, 0.85) 65%, rgba(3, 10, 8, 0.98) 100%),
                                repeating-linear-gradient(45deg, rgba(16, 185, 129, 0.04) 0px, rgba(16, 185, 129, 0.04) 2px, transparent 2px, transparent 24px)`,
            }}
          />

          {/* Grid lines */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(51, 65, 85, 0.3) 1px, transparent 1px),
                                linear-gradient(to bottom, rgba(51, 65, 85, 0.3) 1px, transparent 1px)`,
              backgroundSize: '80px 80px',
            }}
          />

          {/* Protected Area Boundary */}
          <div className="absolute inset-10 rounded-[44px] pointer-events-none border-2 border-dashed border-emerald-400/60 flex flex-col justify-between p-3">
            <div className="flex items-center gap-1.5 self-start bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded border border-emerald-500/40 text-[10px] font-mono text-emerald-300">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>{selectedArea.name} Boundary</span>
            </div>
            <div className="self-end text-[9px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
              Canopy Equilibrium: 88.4% Intact
            </div>
          </div>

          {/* Pristine Forest Canopy Polygon */}
          <div
            className="absolute inset-14 rounded-[36px] pointer-events-none border border-emerald-500/30"
            style={{
              backgroundColor: 'rgba(5, 150, 105, 0.18)',
              backgroundImage:
                'radial-gradient(ellipse at 45% 45%, rgba(16, 185, 129, 0.28) 0%, transparent 70%)',
            }}
          >
            <div className="absolute top-4 left-6 flex items-center gap-1 text-[10px] font-mono text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/30">
              <TreePine className="w-3 h-3 text-emerald-400" />
              <span>Dense Primary Forest Block</span>
            </div>
          </div>

          {/* Hydro feature */}
          <div className="absolute top-1/3 right-1/4 w-52 h-20 rounded-full pointer-events-none bg-cyan-500/20 border border-cyan-400/40 blur-[0.5px]">
            <span className="text-[9px] font-mono text-cyan-300 px-2 py-0.5 bg-slate-950/80 rounded absolute top-2 left-3 flex items-center gap-1">
              <Waves className="w-2.5 h-2.5 text-cyan-400" />
              <span>Perennial Wetland Basin</span>
            </span>
          </div>

          {/* Overlay Status Badge */}
          <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded border border-slate-700/80 text-[10px] font-mono text-slate-300 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>S2 MSI BOA Level-2A</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Cloud: &lt;1.2%</span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400">Res: 10m</span>
          </div>

          <div className="absolute bottom-3 right-3 bg-slate-950/85 backdrop-blur-md px-2 py-0.5 rounded border border-slate-700/80 text-[10px] font-mono text-slate-400">
            T1 Reference Pass
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT: CURRENT PERIOD MAP (TARGET) */}
      {/* ========================================================================= */}
      <div className="gis-glass-card rounded-xl border border-slate-800 overflow-hidden flex flex-col shadow-xl">
        {/* Map Header */}
        <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <h3 className="text-xs font-bold font-mono text-white tracking-wide uppercase">
              Current Period (Target)
            </h3>
            <span className="text-[10px] font-mono text-emerald-300 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-400" />
              <span>{formatReadableDate(endDate)}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="text-slate-400">Mean {indexName}:</span>
            <span className="text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-amber-400" />
              <span>+{stats.currentIndexMean.toFixed(2)}</span>
              <span className="text-[10px] text-red-400">
                ({(stats.percentageChange).toFixed(1)}%)
              </span>
            </span>
          </div>
        </div>

        {/* Map Viewport Canvas */}
        <div className="relative w-full h-[360px] bg-[#05080c] overflow-hidden select-none">
          {/* Simulated Satellite Multispectral Backdrop */}
          <div
            className="absolute inset-0 transition-opacity"
            style={{
              backgroundImage: `radial-gradient(ellipse at 50% 50%, rgba(15, 40, 30, 0.45) 0%, rgba(15, 23, 42, 0.85) 65%, rgba(3, 10, 8, 0.98) 100%),
                                repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.03) 0px, rgba(239, 68, 68, 0.03) 2px, transparent 2px, transparent 24px)`,
            }}
          />

          {/* Grid lines */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(51, 65, 85, 0.3) 1px, transparent 1px),
                                linear-gradient(to bottom, rgba(51, 65, 85, 0.3) 1px, transparent 1px)`,
              backgroundSize: '80px 80px',
            }}
          />

          {/* Protected Area Boundary */}
          <div className="absolute inset-10 rounded-[44px] pointer-events-none border-2 border-dashed border-emerald-400/60 flex flex-col justify-between p-3">
            <div className="flex items-center gap-1.5 self-start bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded border border-emerald-500/40 text-[10px] font-mono text-emerald-300">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>{selectedArea.name} Boundary</span>
            </div>
            <div className="self-end text-[9px] font-mono text-amber-400 bg-slate-950/80 px-2 py-0.5 rounded border border-amber-500/40">
              Canopy Disturbance Detected: -{stats.lossAreaHa.toLocaleString()} ha
            </div>
          </div>

          {/* Disturbed Canopy Loss Scars (Highlighted in Red) */}
          <div className="absolute top-1/4 left-1/3 w-36 h-24 rounded-2xl pointer-events-none border-2 border-dashed border-red-500 bg-red-950/50 shadow-lg shadow-red-950 flex flex-col justify-between p-2 animate-pulse">
            <div className="flex items-center gap-1 text-[9px] font-mono text-red-200 bg-red-950/90 px-1.5 py-0.5 rounded w-max border border-red-500/40">
              <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
              <span>Canopy Disturbance Zone</span>
            </div>
            <div className="text-[9px] font-mono text-red-300">
              Δ{indexName}: -0.52 (High Anomaly)
            </div>
          </div>

          {/* Linear Encroachment Road Scar */}
          <div className="absolute top-1/2 left-1/4 w-48 h-8 rounded-lg pointer-events-none border border-amber-500/70 bg-amber-950/40 rotate-[12deg]">
            <span className="text-[8px] font-mono text-amber-300 px-1 py-0.5 bg-amber-950/90 rounded border border-amber-500/40 absolute top-1 left-2">
              Linear Corridor / Track (+1.8 km)
            </span>
          </div>

          {/* Regrowth patch */}
          <div className="absolute bottom-1/4 right-1/3 w-28 h-16 rounded-xl pointer-events-none border border-emerald-400/50 bg-emerald-950/40">
            <span className="text-[8px] font-mono text-emerald-300 px-1 py-0.5 bg-emerald-950/90 rounded absolute bottom-1 right-2">
              Riparian Regrowth (+{stats.gainAreaHa} ha)
            </span>
          </div>

          {/* Overlay Status Badge */}
          <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded border border-slate-700/80 text-[10px] font-mono text-slate-300 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>S2 MSI BOA Level-2A</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Cloud: &lt;2.1%</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400">Disturbance Confirmed</span>
          </div>

          <div className="absolute bottom-3 right-3 bg-slate-950/85 backdrop-blur-md px-2 py-0.5 rounded border border-slate-700/80 text-[10px] font-mono text-emerald-400">
            T2 Target Pass
          </div>
        </div>
      </div>
    </div>
  );
};
