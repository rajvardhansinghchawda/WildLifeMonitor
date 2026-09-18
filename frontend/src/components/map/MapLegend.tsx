'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ListFilter,
  Shield,
  TreePine,
  TrendingDown,
  TrendingUp,
  Droplet,
  Building,
  Flame,
  Route,
  MapPin,
  Satellite,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MapLayerId } from '@/types/map';

interface MapLegendProps {
  visibleLayers: Record<MapLayerId, boolean>;
  onClose?: () => void;
  className?: string;
}

interface LegendItem {
  id: MapLayerId;
  label: string;
  symbol: React.ReactNode;
  category: string;
}

export const MapLegend: React.FC<MapLegendProps> = ({
  visibleLayers,
  onClose,
  className,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const legendItems: LegendItem[] = [
    {
      id: 'satellite_imagery',
      label: 'Sentinel-2 L2A / Landsat-9',
      symbol: <Satellite className="w-3.5 h-3.5 text-blue-400" />,
      category: 'Base Imagery',
    },
    {
      id: 'protected_area_boundary',
      label: 'Protected Area Boundary (WDPA)',
      symbol: (
        <span className="w-4 h-2 border-2 border-dashed border-emerald-400 rounded-sm inline-block" />
      ),
      category: 'Biosphere',
    },
    {
      id: 'forest_cover',
      label: 'Intact Forest Canopy (NDVI > 0.65)',
      symbol: <span className="w-3.5 h-3.5 rounded-sm bg-emerald-600/70 border border-emerald-500 inline-block" />,
      category: 'Biosphere',
    },
    {
      id: 'vegetation_loss',
      label: 'Vegetation Loss Scars (ΔNDVI < -0.3)',
      symbol: <span className="w-3.5 h-3.5 rounded-sm bg-red-600/80 border border-red-400 animate-pulse inline-block" />,
      category: 'Biosphere',
    },
    {
      id: 'vegetation_gain',
      label: 'Canopy Regrowth / Revegetation',
      symbol: <span className="w-3.5 h-3.5 rounded-sm bg-lime-500/70 border border-lime-400 inline-block" />,
      category: 'Biosphere',
    },
    {
      id: 'water_bodies',
      label: 'Permanent Wetlands & Rivers (NDWI)',
      symbol: <span className="w-3.5 h-3.5 rounded-sm bg-cyan-500/70 border border-cyan-400 inline-block" />,
      category: 'Hydrology',
    },
    {
      id: 'water_loss',
      label: 'Desiccated Floodplains & Drying',
      symbol: <span className="w-3.5 h-3.5 rounded-sm bg-orange-600/70 border border-orange-400 inline-block" />,
      category: 'Hydrology',
    },
    {
      id: 'urban_expansion',
      label: 'Settlement & Built-up Encroachment',
      symbol: <span className="w-3.5 h-3.5 rounded-sm bg-amber-500/70 border border-amber-400 inline-block" />,
      category: 'Infrastructure',
    },
    {
      id: 'fire_hotspots',
      label: 'Active Fire Hotspot (VIIRS 375m)',
      symbol: <Flame className="w-3.5 h-3.5 text-red-400" />,
      category: 'Thermal',
    },
    {
      id: 'roads',
      label: 'Primary Roads & Patrol Trails',
      symbol: <span className="w-4 h-1 bg-slate-300 rounded inline-block" />,
      category: 'Infrastructure',
    },
    {
      id: 'osm_features',
      label: 'Ranger Outposts & OSM Landmarks',
      symbol: <span className="w-3 h-3 rounded-full bg-purple-500 border border-purple-300 inline-block" />,
      category: 'Base Imagery',
    },
  ];

  // Filter to active layers or display all with visibility indicators
  const activeCount = Object.values(visibleLayers).filter(Boolean).length;

  return (
    <div
      className={cn(
        'w-72 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl p-3 text-xs font-mono transition-all z-20 pointer-events-auto',
        className
      )}
    >
      {/* Legend Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 text-slate-200 hover:text-white font-bold text-xs"
        >
          <ListFilter className="w-3.5 h-3.5 text-emerald-400" />
          <span>GIS MAP LEGEND</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-300 ml-1">
            {activeCount}/11
          </span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded text-slate-400 hover:text-white"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white"
              title="Close Legend"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Legend Body */}
      {!isCollapsed && (
        <div className="mt-2 space-y-1.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar text-[11px]">
          {legendItems.map((item) => {
            const isVisible = visibleLayers[item.id] ?? false;
            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-center justify-between p-1.5 rounded transition-colors',
                  isVisible ? 'text-slate-200 bg-slate-950/40' : 'text-slate-500 opacity-60'
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-4 h-4 flex items-center justify-center shrink-0">
                    {item.symbol}
                  </div>
                  <span className="truncate">{item.label}</span>
                </div>
                <span className="text-[9px] uppercase px-1 rounded bg-slate-800 text-slate-400 shrink-0 ml-1">
                  {isVisible ? 'ON' : 'OFF'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
