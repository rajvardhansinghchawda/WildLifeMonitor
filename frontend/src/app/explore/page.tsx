'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LocationSearch } from '@/components/map/LocationSearch';
import { MapContainer } from '@/components/map/MapContainer';
import { MapLayers, MAP_LAYER_CONFIGS } from '@/components/map/MapLayers';
import { MOCK_AREAS } from '@/lib/mock-data';
import { ProtectedArea, ChangeEventHotspot } from '@/types';
import { MapLayerId, MapMode } from '@/types/map';
import {
  Calendar,
  Layers,
  SplitSquareVertical,
  Box,
  MapPin,
  ChevronRight,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ExplorePage() {
  // Active selected reserve (Default to Kanha National Park as a showcase for Indian reserves)
  const [selectedArea, setSelectedArea] = useState<ProtectedArea>(
    () => MOCK_AREAS.find((a) => a.id === 'area-kanha') || MOCK_AREAS[0]
  );

  // Date range selector state
  const [dateRange, setDateRange] = useState<'30d' | '90d' | 'ytd' | 'baseline'>('30d');

  // Map mode state: standard GIS view, before/after compare slider, or 3D terrain
  const [mapMode, setMapMode] = useState<MapMode>('standard');

  // Right Layers Panel collapse state
  const [showLayersPanel, setShowLayersPanel] = useState(true);

  // 11 Map Layers visibility state
  const [visibleLayers, setVisibleLayers] = useState<Record<MapLayerId, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    MAP_LAYER_CONFIGS.forEach((layer) => {
      initial[layer.id] = layer.defaultVisible;
    });
    return initial as Record<MapLayerId, boolean>;
  });

  // Layer Opacities state (0 - 100)
  const [layerOpacities, setLayerOpacities] = useState<Record<MapLayerId, number>>(() => {
    const initial: Record<string, number> = {};
    MAP_LAYER_CONFIGS.forEach((layer) => {
      initial[layer.id] = layer.defaultOpacity;
    });
    return initial as Record<MapLayerId, number>;
  });

  const handleToggleLayer = (id: MapLayerId) => {
    setVisibleLayers((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleChangeOpacity = (id: MapLayerId, opacity: number) => {
    setLayerOpacities((prev) => ({
      ...prev,
      [id]: opacity,
    }));
  };

  const handleResetDefaults = () => {
    const defaultVis: Record<string, boolean> = {};
    const defaultOp: Record<string, number> = {};
    MAP_LAYER_CONFIGS.forEach((layer) => {
      defaultVis[layer.id] = layer.defaultVisible;
      defaultOp[layer.id] = layer.defaultOpacity;
    });
    setVisibleLayers(defaultVis as Record<MapLayerId, boolean>);
    setLayerOpacities(defaultOp as Record<MapLayerId, number>);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-5.5rem)] min-h-[700px] space-y-3">
        {/* ======================================================================= */}
        {/* TOP: GLOBAL SEARCH, DATE RANGE SELECTOR & MAP MODE SELECTOR */}
        {/* ======================================================================= */}
        <div className="gis-glass-card rounded-xl px-4 py-2.5 border border-slate-800/90 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0 relative z-50">
          {/* Global Location Search Field */}
          <div className="flex-1 max-w-xl relative">
            <LocationSearch
              selectedArea={selectedArea}
              onSelectArea={(area) => setSelectedArea(area)}
            />
          </div>

          {/* Right Controls: Date Range & Map Mode Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Selector */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-xs font-mono">
              <Calendar className="w-3.5 h-3.5 text-emerald-400 ml-1.5 mr-1" />
              <button
                onClick={() => setDateRange('30d')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] transition-colors',
                  dateRange === '30d'
                    ? 'bg-slate-800 text-white font-semibold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                30 Days
              </button>
              <button
                onClick={() => setDateRange('90d')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] transition-colors',
                  dateRange === '90d'
                    ? 'bg-slate-800 text-white font-semibold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                Quarter
              </button>
              <button
                onClick={() => setDateRange('ytd')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] transition-colors',
                  dateRange === 'ytd'
                    ? 'bg-slate-800 text-white font-semibold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                YTD
              </button>
              <button
                onClick={() => setDateRange('baseline')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] transition-colors',
                  dateRange === 'baseline'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                5-Yr Base
              </button>
            </div>

            {/* Map Mode Selector */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setMapMode('standard')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition-all',
                  mapMode === 'standard'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 shadow font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                )}
                title="Standard Multi-Band GIS Layer View"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>GIS View</span>
              </button>

              <button
                onClick={() => setMapMode('compare')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition-all',
                  mapMode === 'compare'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 shadow font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                )}
                title="Dual-Epoch Before / After Comparison Slider"
              >
                <SplitSquareVertical className="w-3.5 h-3.5 text-amber-400" />
                <span>Compare Slider</span>
              </button>

              <button
                onClick={() => setMapMode('terrain3d')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition-all',
                  mapMode === 'terrain3d'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 shadow font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                )}
                title="High-Resolution 3D Digital Elevation View"
              >
                <Box className="w-3.5 h-3.5 text-cyan-400" />
                <span>3D Terrain</span>
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* CENTER & RIGHT: LARGE INTERACTIVE MAP + MAP LAYERS PANEL */}
        {/* ======================================================================= */}
        <div className="relative flex-1 flex overflow-hidden rounded-xl border border-slate-800 shadow-2xl">
          {/* CENTER: Large Interactive Mapbox Container */}
          <div className="flex-1 relative h-full">
            <MapContainer
              selectedArea={selectedArea}
              visibleLayers={visibleLayers}
              layerOpacities={layerOpacities}
              mapMode={mapMode}
              showLayersPanel={showLayersPanel}
              onToggleLayersPanel={() => setShowLayersPanel(!showLayersPanel)}
            />
          </div>

          {/* RIGHT: Map Layers Panel (Collapsible / Toggleable) */}
          {showLayersPanel && (
            <div className="shrink-0 h-full">
              <MapLayers
                visibleLayers={visibleLayers}
                layerOpacities={layerOpacities}
                onToggleLayer={handleToggleLayer}
                onChangeOpacity={handleChangeOpacity}
                onResetDefaults={handleResetDefaults}
                onClose={() => setShowLayersPanel(false)}
              />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
