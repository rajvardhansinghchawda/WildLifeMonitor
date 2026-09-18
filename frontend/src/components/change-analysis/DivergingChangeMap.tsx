import React, { useState } from 'react';
import { ProtectedArea } from '@/types';
import { AnalysisType, ChangeAnalysisStats } from '@/types/change-analysis';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Shield,
  Compass,
  Crosshair,
  TrendingDown,
  TrendingUp,
  Minus,
  Sliders,
  Info,
} from 'lucide-react';

interface DivergingChangeMapProps {
  selectedArea: ProtectedArea;
  analysisType: AnalysisType;
  stats: ChangeAnalysisStats;
}

interface HoveredPixelInfo {
  lat: number;
  lon: number;
  delta: number;
  type: 'gain' | 'stable' | 'loss';
  label: string;
  confidence: number;
  areaHa: number;
}

export const DivergingChangeMap: React.FC<DivergingChangeMapProps> = ({
  selectedArea,
  analysisType,
  stats,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredPixel, setHoveredPixel] = useState<HoveredPixelInfo | null>(null);

  // Default hover sample for initial display or inspection
  const activeInspection = hoveredPixel || {
    lat: selectedArea.coordinates.lat + 0.0142,
    lon: selectedArea.coordinates.lon - 0.0215,
    delta: -0.48,
    type: 'loss',
    label: 'Vegetation Loss (Disturbed Canopy)',
    confidence: 96.2,
    areaHa: 14.8,
  };

  const getUnitName = () => {
    switch (analysisType) {
      case 'water_ndwi':
        return 'Δ NDWI';
      case 'builtup_ndbi':
        return 'Δ NDBI';
      case 'fire_activity':
        return 'Δ NBR';
      case 'land_cover':
        return 'Δ LULC';
      case 'vegetation_ndvi':
      default:
        return 'Δ NDVI';
    }
  };

  const deltaUnit = getUnitName();

  return (
    <div className="gis-glass-card rounded-xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
      {/* Map Top Bar */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h3 className="text-sm font-bold font-mono text-white tracking-wide uppercase flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Diverging Change Detection Map</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
              Bi-Temporal Raster Differencing
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Pixel-level classification highlighting vegetation gain, stable equilibrium, and vegetation loss
          </p>
        </div>

        {/* Quick Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2.5 py-1.5 rounded text-xs font-mono border transition-colors ${
              showGrid
                ? 'bg-slate-800 border-slate-600 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-2.5 py-1.5 rounded text-xs font-mono border transition-colors ${
              showLabels
                ? 'bg-slate-800 border-slate-600 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            Labels
          </button>
          <div className="h-4 w-px bg-slate-800 mx-1" />
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.2))}
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.2))}
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(1.0)}
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
            title="Reset Scale"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Map GIS Canvas */}
      <div className="relative w-full h-[460px] bg-[#04070a] overflow-hidden select-none">
        {/* Scalable Container for Zoom */}
        <div
          className="absolute inset-0 transition-transform duration-200"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
        >
          {/* Base Neutral Satellite Texture */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(ellipse at 50% 50%, rgba(15, 23, 42, 0.9) 0%, rgba(8, 12, 20, 0.98) 100%),
                                linear-gradient(to right, rgba(30, 41, 59, 0.3) 1px, transparent 1px),
                                linear-gradient(to bottom, rgba(30, 41, 59, 0.3) 1px, transparent 1px)`,
              backgroundSize: 'auto, 50px 50px, 50px 50px',
            }}
          />

          {/* Coordinate Grid Mesh (Optional) */}
          {showGrid && (
            <div
              className="absolute inset-0 pointer-events-none opacity-25"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(56, 189, 248, 0.2) 1px, transparent 1px),
                                  linear-gradient(to bottom, rgba(56, 189, 248, 0.2) 1px, transparent 1px)`,
                backgroundSize: '100px 100px',
              }}
            />
          )}

          {/* Protected Area Perimeter Boundary */}
          <div className="absolute inset-8 rounded-[56px] pointer-events-none border-2 border-dashed border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)] flex flex-col justify-between p-4">
            <div className="self-start bg-slate-950/80 px-2.5 py-1 rounded border border-emerald-500/40 text-[10px] font-mono text-emerald-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>{selectedArea.name} Official Perimeter</span>
            </div>
            <div className="self-end text-[10px] font-mono text-slate-500 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
              Total Monitored Area: {selectedArea.total_hectares.toLocaleString()} ha
            </div>
          </div>

          {/* ======================================================================= */}
          {/* DIVERGING CHANGE POLYS / RASTER PATCHES */}
          {/* ======================================================================= */}

          {/* 1. STABLE CANOPY ZONE (Neutral / Slate Gray) */}
          <div
            className="absolute inset-16 rounded-[48px] border border-slate-700/50 transition-colors pointer-events-auto cursor-crosshair"
            style={{
              backgroundColor: 'rgba(71, 85, 105, 0.12)',
              boxShadow: 'inset 0 0 40px rgba(71, 85, 105, 0.15)',
            }}
            onMouseEnter={() =>
              setHoveredPixel({
                lat: selectedArea.coordinates.lat + 0.005,
                lon: selectedArea.coordinates.lon + 0.008,
                delta: 0.02,
                type: 'stable',
                label: 'Stable Intact Forest',
                confidence: 97.5,
                areaHa: 2450.0,
              })
            }
          >
            {showLabels && (
              <div className="absolute top-6 left-10 text-[9px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                Stable Canopy (ΔNDVI ±0.03)
              </div>
            )}
          </div>

          {/* 2. VEGETATION LOSS AREAS (Crimson / Red #ef4444) */}
          {/* Major Loss Cluster (Sector NW) */}
          <div
            className="absolute top-[22%] left-[26%] w-48 h-32 rounded-2xl border-2 border-red-500 bg-red-600/30 shadow-xl shadow-red-950/80 cursor-crosshair transition-transform hover:scale-[1.03] pointer-events-auto"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.35) 0px, rgba(239, 68, 68, 0.35) 3px, transparent 3px, transparent 12px)',
            }}
            onMouseEnter={() =>
              setHoveredPixel({
                lat: selectedArea.coordinates.lat + 0.0215,
                lon: selectedArea.coordinates.lon - 0.031,
                delta: -0.54,
                type: 'loss',
                label: 'Vegetation Loss (High Severity Canopy Depletion)',
                confidence: 98.1,
                areaHa: 14.8,
              })
            }
          >
            {showLabels && (
              <div className="absolute -top-3 left-2 text-[9px] font-mono font-bold text-red-200 bg-red-950/95 px-2 py-0.5 rounded border border-red-500 shadow-md">
                Loss Cluster: -{stats.lossAreaHa} ha (Δ -0.54)
              </div>
            )}
          </div>

          {/* Secondary Loss Scar (Corridor Encroachment) */}
          <div
            className="absolute top-[48%] left-[20%] w-60 h-10 rounded-lg border-2 border-amber-500 bg-amber-600/30 rotate-[10deg] cursor-crosshair transition-transform hover:scale-[1.03] pointer-events-auto"
            onMouseEnter={() =>
              setHoveredPixel({
                lat: selectedArea.coordinates.lat - 0.008,
                lon: selectedArea.coordinates.lon - 0.024,
                delta: -0.32,
                type: 'loss',
                label: 'Linear Encroachment (Vegetation Loss)',
                confidence: 94.6,
                areaHa: 4.2,
              })
            }
          >
            {showLabels && (
              <div className="absolute -top-3 right-2 text-[8px] font-mono text-amber-200 bg-amber-950/95 px-1.5 py-0.5 rounded border border-amber-500">
                Linear Disturbance (Δ -0.32)
              </div>
            )}
          </div>

          {/* 3. VEGETATION GAIN AREAS (Emerald Green #10b981) */}
          {/* Regrowth Block 1 (Riparian Buffer East) */}
          <div
            className="absolute bottom-[24%] right-[22%] w-44 h-28 rounded-2xl border-2 border-emerald-400 bg-emerald-600/30 shadow-xl shadow-emerald-950/80 cursor-crosshair transition-transform hover:scale-[1.03] pointer-events-auto"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(16, 185, 129, 0.4) 15%, transparent 20%)',
              backgroundSize: '10px 10px',
            }}
            onMouseEnter={() =>
              setHoveredPixel({
                lat: selectedArea.coordinates.lat - 0.018,
                lon: selectedArea.coordinates.lon + 0.035,
                delta: +0.38,
                type: 'gain',
                label: 'Vegetation Gain (Secondary Regrowth & Riparian Flush)',
                confidence: 93.4,
                areaHa: stats.gainAreaHa,
              })
            }
          >
            {showLabels && (
              <div className="absolute -top-3 left-2 text-[9px] font-mono font-bold text-emerald-200 bg-emerald-950/95 px-2 py-0.5 rounded border border-emerald-400 shadow-md">
                Vegetation Gain: +{stats.gainAreaHa} ha (Δ +0.38)
              </div>
            )}
          </div>

          {/* Regrowth Block 2 (Southern Wetland Transition) */}
          <div
            className="absolute bottom-[16%] left-[45%] w-32 h-16 rounded-xl border border-lime-400 bg-lime-600/25 cursor-crosshair pointer-events-auto"
            onMouseEnter={() =>
              setHoveredPixel({
                lat: selectedArea.coordinates.lat - 0.035,
                lon: selectedArea.coordinates.lon - 0.005,
                delta: +0.22,
                type: 'gain',
                label: 'Vegetation Gain (Grassland Flush)',
                confidence: 91.8,
                areaHa: 3.5,
              })
            }
          >
            {showLabels && (
              <div className="text-[8px] font-mono text-lime-200 bg-lime-950/90 px-1 py-0.5 rounded absolute -top-2.5 left-1 border border-lime-500/40">
                Regrowth (+0.22)
              </div>
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* FLOATING PIXEL INSPECTOR HUD */}
        {/* ======================================================================= */}
        <div className="absolute top-4 left-4 z-20 pointer-events-none">
          <div className="gis-glass-card rounded-lg p-3 border border-slate-700/80 bg-slate-950/90 backdrop-blur-md shadow-2xl max-w-xs space-y-1.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white">
                <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pixel Vector Inspector</span>
              </div>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                  activeInspection.type === 'loss'
                    ? 'bg-red-950 text-red-300 border border-red-500/50'
                    : activeInspection.type === 'gain'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                    : 'bg-slate-800 text-slate-300 border border-slate-600'
                }`}
              >
                {activeInspection.type}
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-300 font-semibold">
              {activeInspection.label}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
              <div>
                <span className="text-slate-500 block">COORDINATES</span>
                <span className="text-slate-300 font-medium">
                  {activeInspection.lat.toFixed(4)}°, {activeInspection.lon.toFixed(4)}°
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">OBSERVED {deltaUnit}</span>
                <span
                  className={`font-bold ${
                    activeInspection.delta < 0
                      ? 'text-red-400'
                      : activeInspection.delta > 0
                      ? 'text-emerald-400'
                      : 'text-slate-300'
                  }`}
                >
                  {activeInspection.delta > 0 ? `+${activeInspection.delta}` : activeInspection.delta}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">CONFIDENCE</span>
                <span className="text-cyan-400 font-medium">{activeInspection.confidence}%</span>
              </div>
              <div>
                <span className="text-slate-500 block">POLYGON FOOTPRINT</span>
                <span className="text-slate-300 font-medium">{activeInspection.areaHa} ha</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top-Right Geographic HUD */}
        <div className="absolute top-4 right-4 z-20 pointer-events-none hidden sm:block">
          <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 text-[10px] font-mono text-slate-300 flex items-center gap-3 shadow-lg">
            <div className="flex items-center gap-1 text-emerald-400 font-bold">
              <Compass className="w-3.5 h-3.5 animate-spin-slow" />
              <span>{selectedArea.name}</span>
            </div>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              CVA Threshold: <strong className="text-slate-200">|Δ| &gt; 0.15</strong>
            </span>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* DIVERGING SCALE COLOR RAMP BAR (BOTTOM CENTER) */}
        {/* ======================================================================= */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[92%] sm:w-auto min-w-[340px] max-w-xl">
          <div className="bg-slate-950/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700/90 shadow-2xl space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold">
              <span className="text-red-400 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                <span>Vegetation Loss</span>
              </span>
              <span className="text-slate-400 flex items-center gap-1">
                <Minus className="w-3 h-3" />
                <span>Stable</span>
              </span>
              <span className="text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>Vegetation Gain</span>
              </span>
            </div>

            {/* Continuous Diverging Color Gradient Bar */}
            <div className="relative w-full h-3 rounded-full overflow-hidden border border-slate-600/70 shadow-inner">
              <div
                className="w-full h-full"
                style={{
                  background:
                    'linear-gradient(to right, #dc2626 0%, #f97316 25%, #475569 50%, #84cc16 75%, #10b981 100%)',
                }}
              />
              {/* Midpoint tick marker */}
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white shadow-sm" />
            </div>

            {/* Legend Numeric Values */}
            <div className="flex justify-between text-[9px] font-mono text-slate-400">
              <span>&lt; -0.40</span>
              <span>-0.20</span>
              <span className="text-white font-bold">0.00</span>
              <span>+0.20</span>
              <span>&gt; +0.40</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
