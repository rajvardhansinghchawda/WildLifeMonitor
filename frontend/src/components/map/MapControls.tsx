'use client';

import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Crosshair,
  RotateCcw,
  Layers,
  Map as MapIcon,
  Satellite,
  ListFilter,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MapControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onGeolocate: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  mapStyle: 'satellite' | 'vector';
  onToggleMapStyle: () => void;
  showLayersPanel: boolean;
  onToggleLayersPanel: () => void;
  showLegend: boolean;
  onToggleLegend: () => void;
  className?: string;
}

export const MapControls: React.FC<MapControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
  onGeolocate,
  isFullscreen,
  onToggleFullscreen,
  mapStyle,
  onToggleMapStyle,
  showLayersPanel,
  onToggleLayersPanel,
  showLegend,
  onToggleLegend,
  className,
}) => {
  return (
    <div className={cn('flex flex-col gap-2 z-20 pointer-events-auto', className)}>
      {/* Map Style Switcher (Satellite vs Tactical Vector) */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1 rounded-xl shadow-xl flex flex-col gap-1">
        <button
          onClick={onToggleMapStyle}
          className={cn(
            'p-2 rounded-lg text-xs font-mono flex items-center gap-2 transition-all',
            mapStyle === 'satellite'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          )}
          title={mapStyle === 'satellite' ? 'Switch to Tactical Vector' : 'Switch to Satellite'}
        >
          {mapStyle === 'satellite' ? (
            <Satellite className="w-4 h-4 text-emerald-400" />
          ) : (
            <MapIcon className="w-4 h-4 text-cyan-400" />
          )}
          <span className="hidden sm:inline capitalize">{mapStyle}</span>
        </button>
      </div>

      {/* Navigation & Zoom Tools */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1 rounded-xl shadow-xl flex flex-col gap-1">
        <button
          onClick={onZoomIn}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="px-1 text-center font-mono text-[10px] text-slate-400 py-0.5 select-none">
          {zoom.toFixed(1)}x
        </div>

        <button
          onClick={onZoomOut}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* View Position Tools (Geolocation, Reset View, Fullscreen) */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1 rounded-xl shadow-xl flex flex-col gap-1">
        <button
          onClick={onGeolocate}
          className="p-2 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 transition-colors"
          title="Center on Monitored Reserve AOI"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        <button
          onClick={onResetView}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="Reset Camera & Tilt"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleFullscreen}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen GIS Canvas'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Panel Toggles (Layers Panel & Legend) */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1 rounded-xl shadow-xl flex flex-col gap-1">
        <button
          onClick={onToggleLayersPanel}
          className={cn(
            'p-2 rounded-lg text-xs font-mono flex items-center justify-center transition-all',
            showLayersPanel
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          )}
          title="Toggle Map Layers Panel"
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleLegend}
          className={cn(
            'p-2 rounded-lg text-xs font-mono flex items-center justify-center transition-all',
            showLegend
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          )}
          title="Toggle GIS Symbology Legend"
        >
          <ListFilter className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
