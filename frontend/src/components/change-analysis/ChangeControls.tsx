import React from 'react';
import { MOCK_AREAS } from '@/lib/mock-data';
import { AnalysisType } from '@/types/change-analysis';
import {
  Calendar,
  Play,
  RotateCcw,
  TreePine,
  Droplets,
  Building2,
  Layers,
  Flame,
  Globe2,
  Sparkles,
} from 'lucide-react';

interface ChangeControlsProps {
  selectedAreaId: string;
  onSelectArea: (id: string) => void;
  startDate: string;
  onStartDateChange: (d: string) => void;
  endDate: string;
  onEndDateChange: (d: string) => void;
  analysisType: AnalysisType;
  onAnalysisTypeChange: (t: AnalysisType) => void;
  isAnalyzing: boolean;
  onRunAnalysis: () => void;
  onReset: () => void;
}

const ANALYSIS_TYPE_CONFIG: {
  id: AnalysisType;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  badgeColor: string;
}[] = [
  {
    id: 'vegetation_ndvi',
    label: 'Vegetation / NDVI',
    sublabel: 'NIR & Red (B8/B4)',
    icon: TreePine,
    badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30',
  },
  {
    id: 'water_ndwi',
    label: 'Water / NDWI',
    sublabel: 'Green & NIR (B3/B8)',
    icon: Droplets,
    badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/30',
  },
  {
    id: 'builtup_ndbi',
    label: 'Built-up / NDBI',
    sublabel: 'SWIR & NIR (B11/B8)',
    icon: Building2,
    badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-500/30',
  },
  {
    id: 'land_cover',
    label: 'Land Cover',
    sublabel: 'Multi-class CVA',
    icon: Layers,
    badgeColor: 'text-indigo-400 bg-indigo-950/60 border-indigo-500/30',
  },
  {
    id: 'fire_activity',
    label: 'Fire Activity',
    sublabel: 'NBR & VIIRS MW',
    icon: Flame,
    badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-500/30',
  },
];

export const ChangeControls: React.FC<ChangeControlsProps> = ({
  selectedAreaId,
  onSelectArea,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  analysisType,
  onAnalysisTypeChange,
  isAnalyzing,
  onRunAnalysis,
  onReset,
}) => {
  return (
    <div className="gis-glass-card rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title & Status */}
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-sm font-bold font-mono text-white tracking-wide uppercase">
              Bi-Temporal Analysis Parameters
            </h2>
            <span className="text-[10px] font-mono text-slate-500 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
              Sentinel-2 L2A BOA
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Select protected area, temporal baseline and target observation windows, and spectral index
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            onClick={onReset}
            disabled={isAnalyzing}
            className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Reset to 2-year baseline"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={onRunAnalysis}
            disabled={isAnalyzing}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-emerald-950/60 active:scale-[0.98]"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>COMPUTING RASTER Δ...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white text-white" />
                <span>RUN ANALYSIS</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-800/60">
        {/* 1. Area Selector */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
            <Globe2 className="w-3 h-3 text-emerald-400" />
            <span>Protected Area (AOI)</span>
          </label>
          <select
            value={selectedAreaId}
            onChange={(e) => onSelectArea(e.target.value)}
            disabled={isAnalyzing}
            className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-emerald-500 transition-colors"
          >
            {MOCK_AREAS.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name} ({area.country})
              </option>
            ))}
          </select>
        </div>

        {/* 2. Start Date (Previous Period) */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-blue-400" />
            <span>Start Date (Previous Period)</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            disabled={isAnalyzing}
            className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* 3. End Date (Current Period) */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-emerald-400" />
            <span>End Date (Current Period)</span>
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            disabled={isAnalyzing}
            className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* 4. Analysis Type Selector */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Analysis Type</span>
          </label>
          <select
            value={analysisType}
            onChange={(e) => onAnalysisTypeChange(e.target.value as AnalysisType)}
            disabled={isAnalyzing}
            className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-amber-500 transition-colors"
          >
            {ANALYSIS_TYPE_CONFIG.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Analysis Type Quick Selection Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">Modes:</span>
        {ANALYSIS_TYPE_CONFIG.map((opt) => {
          const Icon = opt.icon;
          const isActive = analysisType === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onAnalysisTypeChange(opt.id)}
              disabled={isAnalyzing}
              className={`px-2.5 py-1 rounded-md text-xs font-mono flex items-center gap-1.5 border transition-all ${
                isActive
                  ? `${opt.badgeColor} font-bold shadow-md shadow-emerald-950/40`
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
