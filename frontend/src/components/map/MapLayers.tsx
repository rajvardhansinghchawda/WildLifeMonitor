'use client';

import React, { useState } from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  Sliders,
  RotateCcw,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  Satellite,
  Shield,
  TreePine,
  TrendingDown,
  TrendingUp,
  Droplet,
  Building,
  Flame,
  Route,
  MapPin,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MapLayerId, LayerCategory, MapLayerConfig } from '@/types/map';

export const MAP_LAYER_CONFIGS: MapLayerConfig[] = [
  {
    id: 'satellite_imagery',
    name: 'Satellite Imagery',
    category: 'BASE_IMAGERY',
    description: 'Sentinel-2 L2A BOA True Color / False Color reflectance (10m)',
    color: '#3b82f6',
    defaultVisible: true,
    defaultOpacity: 100,
    badge: '10M RASTER',
  },
  {
    id: 'protected_area_boundary',
    name: 'Protected Area Boundary',
    category: 'BIOSPHERE',
    description: 'UNEP-WCMC World Database on Protected Areas (WDPA) vectors',
    color: '#10b981',
    defaultVisible: true,
    defaultOpacity: 100,
    badge: 'VECTOR',
  },
  {
    id: 'forest_cover',
    name: 'Forest Cover',
    category: 'BIOSPHERE',
    description: 'Dense and open canopy baseline partition (NDVI > 0.65)',
    color: '#059669',
    defaultVisible: true,
    defaultOpacity: 85,
    badge: 'ESA 10M',
  },
  {
    id: 'vegetation_loss',
    name: 'Vegetation Loss',
    category: 'BIOSPHERE',
    description: 'Pixel-level CVA deforestation and logging scars (ΔNDVI < -0.3)',
    color: '#ef4444',
    defaultVisible: true,
    defaultOpacity: 90,
    badge: 'HIGH ALERT',
  },
  {
    id: 'vegetation_gain',
    name: 'Vegetation Gain',
    category: 'BIOSPHERE',
    description: 'Seasonal canopy flush, reforested parcels & natural regeneration',
    color: '#84cc16',
    defaultVisible: false,
    defaultOpacity: 75,
    badge: 'ECO GAIN',
  },
  {
    id: 'water_bodies',
    name: 'Water Bodies',
    category: 'HYDROLOGY',
    description: 'NDWI wetland extent, perennial rivers, lakes and reservoirs',
    color: '#06b6d4',
    defaultVisible: true,
    defaultOpacity: 85,
    badge: 'HYDRO 10M',
  },
  {
    id: 'water_loss',
    name: 'Water Loss',
    category: 'HYDROLOGY',
    description: 'Desiccated lake margins and seasonal drought shrinkage',
    color: '#f97316',
    defaultVisible: true,
    defaultOpacity: 80,
    badge: 'DROUGHT',
  },
  {
    id: 'urban_expansion',
    name: 'Urban Expansion',
    category: 'INFRASTRUCTURE',
    description: 'NDBI built-up structures, settlement growth, and illegal camps',
    color: '#f59e0b',
    defaultVisible: true,
    defaultOpacity: 85,
    badge: 'NDBI DIFF',
  },
  {
    id: 'fire_hotspots',
    name: 'Fire Hotspots',
    category: 'THERMAL',
    description: 'NASA FIRMS VIIRS 375m thermal anomaly alert clusters',
    color: '#dc2626',
    defaultVisible: true,
    defaultOpacity: 100,
    badge: 'VIIRS 375M',
  },
  {
    id: 'roads',
    name: 'Roads & Tracks',
    category: 'INFRASTRUCTURE',
    description: 'Paved highways, logging tracks, and ranger patrol trails',
    color: '#cbd5e1',
    defaultVisible: true,
    defaultOpacity: 70,
    badge: 'OSM LINES',
  },
  {
    id: 'osm_features',
    name: 'OpenStreetMap features',
    category: 'BASE_IMAGERY',
    description: 'Ranger stations, watchtowers, water points & park gates',
    color: '#a855f7',
    defaultVisible: false,
    defaultOpacity: 80,
    badge: 'POI NODES',
  },
];

interface MapLayersProps {
  visibleLayers: Record<MapLayerId, boolean>;
  layerOpacities: Record<MapLayerId, number>;
  onToggleLayer: (id: MapLayerId) => void;
  onChangeOpacity: (id: MapLayerId, opacity: number) => void;
  onResetDefaults: () => void;
  onClose?: () => void;
  className?: string;
}

export const MapLayers: React.FC<MapLayersProps> = ({
  visibleLayers,
  layerOpacities,
  onToggleLayer,
  onChangeOpacity,
  onResetDefaults,
  onClose,
  className,
}) => {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const categories: { key: LayerCategory; title: string }[] = [
    { key: 'BASE_IMAGERY', title: 'Base Imagery & Cartography' },
    { key: 'BIOSPHERE', title: 'Biosphere & Canopy Dynamics' },
    { key: 'HYDROLOGY', title: 'Hydrology & Wetlands' },
    { key: 'INFRASTRUCTURE', title: 'Anthropogenic Footprint' },
    { key: 'THERMAL', title: 'Thermal & Fire Telemetry' },
  ];

  const toggleCategory = (key: LayerCategory) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getLayerIcon = (id: MapLayerId) => {
    switch (id) {
      case 'satellite_imagery':
        return Satellite;
      case 'protected_area_boundary':
        return Shield;
      case 'forest_cover':
        return TreePine;
      case 'vegetation_loss':
        return TrendingDown;
      case 'vegetation_gain':
        return TrendingUp;
      case 'water_bodies':
      case 'water_loss':
        return Droplet;
      case 'urban_expansion':
        return Building;
      case 'fire_hotspots':
        return Flame;
      case 'roads':
        return Route;
      case 'osm_features':
        return MapPin;
    }
  };

  const activeLayersCount = Object.values(visibleLayers).filter(Boolean).length;

  return (
    <div
      className={cn(
        'w-80 h-full bg-slate-900/95 backdrop-blur-md border-l border-slate-800 flex flex-col justify-between shadow-2xl text-xs font-sans select-none z-30',
        className
      )}
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-800/90 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-mono font-bold text-white uppercase tracking-wider text-xs">
              Map Layers
            </h3>
            <p className="text-[10px] text-slate-400">
              {activeLayersCount} of {MAP_LAYER_CONFIGS.length} layers active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onResetDefaults}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset Layers to Default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Layers Panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Layers Accordion List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 custom-scrollbar">
        {categories.map((cat) => {
          const isCollapsed = collapsedCategories[cat.key];
          const catLayers = MAP_LAYER_CONFIGS.filter((l) => l.category === cat.key);
          const catActiveCount = catLayers.filter((l) => visibleLayers[l.id]).length;

          return (
            <div key={cat.key} className="rounded-xl border border-slate-800/80 bg-slate-950/40 overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(cat.key)}
                className="w-full px-3 py-2 bg-slate-900/80 hover:bg-slate-800/80 transition-colors flex items-center justify-between text-left"
              >
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                  {cat.title}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                    {catActiveCount}/{catLayers.length}
                  </span>
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
              </button>

              {/* Category Layers */}
              {!isCollapsed && (
                <div className="p-2 space-y-2 divide-y divide-slate-800/50">
                  {catLayers.map((layer) => {
                    const isVisible = visibleLayers[layer.id] ?? false;
                    const opacity = layerOpacities[layer.id] ?? layer.defaultOpacity;
                    const Icon = getLayerIcon(layer.id);

                    return (
                      <div key={layer.id} className="pt-2 first:pt-0 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isVisible}
                              onChange={() => onToggleLayer(layer.id)}
                              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: layer.color }}
                            />
                            <span
                              className={cn(
                                'text-xs font-medium font-sans truncate',
                                isVisible ? 'text-slate-100' : 'text-slate-500'
                              )}
                            >
                              {layer.name}
                            </span>
                          </label>

                          {layer.badge && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                              {layer.badge}
                            </span>
                          )}
                        </div>

                        {/* Opacity Control (Visible when layer is active) */}
                        {isVisible && (
                          <div className="pl-6 pr-1 flex items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
                            <span className="shrink-0 flex items-center gap-1">
                              <Sliders className="w-3 h-3 text-slate-500" />
                              Opacity:
                            </span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={opacity}
                              onChange={(e) =>
                                onChangeOpacity(layer.id, Number(e.target.value))
                              }
                              className="flex-1 accent-emerald-500 h-1 bg-slate-800 rounded cursor-pointer"
                            />
                            <span className="w-8 text-right text-slate-300 font-semibold">
                              {opacity}%
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/90 text-[10px] font-mono text-slate-400 flex items-center justify-between bg-slate-950/60">
        <span>CRS: WGS 84 / UTM</span>
        <span className="text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live Vector Cache
        </span>
      </div>
    </div>
  );
};
