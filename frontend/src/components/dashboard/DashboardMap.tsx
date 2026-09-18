'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  TreePine,
  Droplet,
  Building,
  Flame,
  Shield,
  Eye,
  Info,
  MapPin,
  Compass,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProtectedArea } from '@/types';

interface DashboardMapProps {
  selectedArea: ProtectedArea;
}

interface MapHotspotMarker {
  id: string;
  name: string;
  lat: number;
  lon: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  area_ha: number;
  delta_ndvi: number;
  type: string;
}

export const DashboardMap: React.FC<DashboardMapProps> = ({ selectedArea }) => {
  const [mapStyle, setMapStyle] = useState<'satellite' | 'vector'>('satellite');
  const [zoom, setZoom] = useState<number>(11.8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<MapHotspotMarker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Layer visibility state
  const [layers, setLayers] = useState({
    boundary: true,
    vegetationLoss: true,
    waterBodies: true,
    urbanExpansion: true,
    hotspots: true,
  });

  const [showLegend, setShowLegend] = useState(true);

  // Mock spatial features centered around the selected reserve
  const mockHotspots: MapHotspotMarker[] = [
    {
      id: 'hs-1',
      name: 'North-West Corridor Sector 3',
      lat: selectedArea.coordinates.lat + 0.045,
      lon: selectedArea.coordinates.lon - 0.052,
      severity: 'CRITICAL',
      area_ha: 14.8,
      delta_ndvi: -0.52,
      type: 'Deforestation Clearing',
    },
    {
      id: 'hs-2',
      name: 'Eastern Floodplain Margin',
      lat: selectedArea.coordinates.lat - 0.038,
      lon: selectedArea.coordinates.lon + 0.061,
      severity: 'HIGH',
      area_ha: 8.3,
      delta_ndvi: -0.41,
      type: 'Illegal Logging Trail',
    },
    {
      id: 'hs-3',
      name: 'Southern Boundary Buffer Spur',
      lat: selectedArea.coordinates.lat - 0.065,
      lon: selectedArea.coordinates.lon - 0.025,
      severity: 'MEDIUM',
      area_ha: 5.1,
      delta_ndvi: -0.28,
      type: 'Canopy Thinning',
    },
  ];

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full rounded-xl overflow-hidden border border-slate-800 bg-[#070b10] flex flex-col justify-between shadow-2xl transition-all',
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'h-[520px]'
      )}
    >
      {/* Dynamic Satellite Canvas / Imagery Backdrop */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {mapStyle === 'satellite' ? (
          <div
            className="w-full h-full opacity-70 transition-opacity duration-500"
            style={{
              backgroundImage: `radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.05) 0%, rgba(7, 11, 16, 0.95) 75%),
                                linear-gradient(135deg, #09121d 0%, #060a0f 50%, #0b1713 100%)`,
              backgroundSize: 'cover',
            }}
          >
            {/* Fine coordinate grid lines */}
            <div
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(52, 211, 153, 0.15) 1px, transparent 1px),
                                  linear-gradient(to bottom, rgba(52, 211, 153, 0.15) 1px, transparent 1px)`,
                backgroundSize: '60px 60px',
              }}
            />
          </div>
        ) : (
          <div
            className="w-full h-full opacity-80 transition-opacity duration-500 bg-[#080d14]"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(30, 41, 59, 0.3) 1px, transparent 1px),
                                linear-gradient(to bottom, rgba(30, 41, 59, 0.3) 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />
        )}

        {/* Vector Polygons Layer (Protected Boundary, Water, Loss, Urban) */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="none">
          <defs>
            {/* Diagonal hatch for degradation */}
            <pattern id="lossHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="1.5" opacity="0.6" />
            </pattern>
            <pattern id="urbanHatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#f59e0b" strokeWidth="1.5" opacity="0.5" />
            </pattern>
          </defs>

          {/* 1. Protected Area Boundary Polygon */}
          {layers.boundary && (
            <g className="transition-opacity duration-300">
              <polygon
                points="120,90 420,60 840,110 920,380 780,520 460,540 180,480 90,260"
                fill="rgba(16, 185, 129, 0.04)"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="6 4"
                className="filter drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]"
              />
              <text x="140" y="120" fill="#10b981" fontSize="12" fontFamily="monospace" fontWeight="bold">
                {selectedArea.name.toUpperCase()} (WDPA BUFFER)
              </text>
            </g>
          )}

          {/* 2. Water Bodies Polygons (Cyan/Blue) */}
          {layers.waterBodies && (
            <g className="transition-opacity duration-300">
              <path
                d="M 280,240 Q 380,220 460,270 T 640,310 Q 720,360 680,420 T 490,460 Q 320,440 280,330 Z"
                fill="rgba(6, 182, 212, 0.25)"
                stroke="#06b6d4"
                strokeWidth="1.5"
              />
              <text x="440" y="320" fill="#06b6d4" fontSize="11" fontFamily="monospace">
                Mara Wetland Basin (NDWI +0.64)
              </text>
            </g>
          )}

          {/* 3. Vegetation Loss Polygons (Red / Critical Deforestation) */}
          {layers.vegetationLoss && (
            <g className="transition-opacity duration-300">
              <polygon
                points="240,160 320,140 350,190 280,220 220,190"
                fill="url(#lossHatch)"
                stroke="#ef4444"
                strokeWidth="2"
                className="animate-pulse"
              />
              <polygon
                points="680,180 760,170 780,230 710,240 660,210"
                fill="rgba(239, 68, 68, 0.3)"
                stroke="#ef4444"
                strokeWidth="2"
              />
              <polygon
                points="360,420 440,390 460,450 390,480"
                fill="rgba(239, 68, 68, 0.35)"
                stroke="#ef4444"
                strokeWidth="1.8"
              />
            </g>
          )}

          {/* 4. Urban Expansion Polygons (Amber) */}
          {layers.urbanExpansion && (
            <g className="transition-opacity duration-300">
              <polygon
                points="780,380 880,360 910,430 830,460 760,420"
                fill="url(#urbanHatch)"
                stroke="#f59e0b"
                strokeWidth="1.8"
              />
              <text x="810" y="420" fill="#f59e0b" fontSize="10" fontFamily="monospace">
                Track Spur (NDBI +0.22)
              </text>
            </g>
          )}
        </svg>

        {/* 5. Hotspot Interactive Markers */}
        {layers.hotspots && (
          <div className="absolute inset-0 pointer-events-auto">
            {mockHotspots.map((hs, i) => {
              const positions = [
                { top: '30%', left: '28%' },
                { top: '36%', left: '72%' },
                { top: '74%', left: '42%' },
              ];
              const pos = positions[i] || { top: '50%', left: '50%' };

              return (
                <div
                  key={hs.id}
                  style={{ top: pos.top, left: pos.left }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
                  onClick={() => setActiveTooltip(hs)}
                >
                  <div className="relative flex items-center justify-center">
                    {/* Pulsing Radar Ring */}
                    <span
                      className={cn(
                        'absolute w-8 h-8 rounded-full animate-ping opacity-75',
                        hs.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-amber-500'
                      )}
                    />
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-125',
                        hs.severity === 'CRITICAL' ? 'bg-red-600' : 'bg-amber-600'
                      )}
                    >
                      <Flame className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  {/* Marker mini label */}
                  <span className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white font-mono text-[9px] px-1.5 py-0.5 rounded border border-slate-700 whitespace-nowrap shadow opacity-80 group-hover:opacity-100">
                    {hs.area_ha} ha
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top Floating Control Bar: Satellite/Map Toggle, Layer Visibility, Coordinates */}
      <div className="relative z-30 p-4 flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        {/* Left: Satellite / Topo Vector Toggle */}
        <div className="gis-panel rounded-lg p-1 flex items-center gap-1 border border-slate-700/80 shadow-lg">
          <button
            onClick={() => setMapStyle('satellite')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium transition-all',
              mapStyle === 'satellite'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50 shadow'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>SATELLITE</span>
          </button>
          <button
            onClick={() => setMapStyle('vector')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium transition-all',
              mapStyle === 'vector'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50 shadow'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>TACTICAL MAP</span>
          </button>
        </div>

        {/* Center: Live GPS HUD */}
        <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg gis-panel border border-slate-700/80 font-mono text-[11px] text-slate-300">
          <span className="text-emerald-400 font-bold">
            LAT: {selectedArea.coordinates.lat.toFixed(4)}°
          </span>
          <span className="text-emerald-400 font-bold">
            LON: {selectedArea.coordinates.lon.toFixed(4)}°
          </span>
          <span className="text-slate-500">|</span>
          <span>ALT: 1,420m</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">ZOOM: {zoom.toFixed(1)}</span>
        </div>

        {/* Right: Quick Action Icons */}
        <div className="gis-panel rounded-lg p-1 flex items-center gap-1 border border-slate-700/80 text-slate-300">
          <button
            onClick={() => setZoom((prev) => Math.min(prev + 0.5, 18))}
            className="p-1.5 hover:bg-slate-800 rounded transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((prev) => Math.max(prev - 0.5, 6))}
            className="p-1.5 hover:bg-slate-800 rounded transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-slate-800 rounded transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Interactive Tooltip Card for Clicked Hotspot */}
      {activeTooltip && (
        <div className="absolute top-20 left-6 z-40 gis-glass-card rounded-xl p-4 border border-red-500/60 max-w-sm shadow-2xl animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-red-400">
              <Flame className="w-4 h-4 text-red-400" />
              <span>{activeTooltip.severity} CHANGE INCIDENT</span>
            </div>
            <button
              onClick={() => setActiveTooltip(null)}
              className="text-slate-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
          <p className="text-xs font-bold text-white mb-1">{activeTooltip.name}</p>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 mt-2 bg-slate-900/80 p-2.5 rounded border border-slate-800">
            <div>Area Loss: <span className="text-white font-bold">{activeTooltip.area_ha} ha</span></div>
            <div>Δ NDVI: <span className="text-red-400 font-bold">{activeTooltip.delta_ndvi}</span></div>
            <div>Detection: <span className="text-slate-200">Sentinel-2 10m</span></div>
            <div>Confidence: <span className="text-emerald-400 font-bold">94%</span></div>
          </div>
        </div>
      )}

      {/* Bottom Floating Control Bar: Layer Visibility Toggles & Dynamic Legend */}
      <div className="relative z-30 p-4 flex flex-wrap items-end justify-between gap-4 pointer-events-auto">
        {/* Layer Visibility Checkbox Bar */}
        <div className="gis-panel rounded-lg p-2.5 flex flex-wrap items-center gap-4 text-xs font-mono border border-slate-700/80 shadow-xl">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">LAYERS:</span>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={layers.boundary}
              onChange={(e) => setLayers({ ...layers, boundary: e.target.checked })}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span className="text-emerald-400">Reserve Boundary</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={layers.vegetationLoss}
              onChange={(e) => setLayers({ ...layers, vegetationLoss: e.target.checked })}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span className="text-red-400">Vegetation Loss</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={layers.waterBodies}
              onChange={(e) => setLayers({ ...layers, waterBodies: e.target.checked })}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span className="text-cyan-400">Water Bodies</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={layers.urbanExpansion}
              onChange={(e) => setLayers({ ...layers, urbanExpansion: e.target.checked })}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span className="text-amber-400">Urban Expansion</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={layers.hotspots}
              onChange={(e) => setLayers({ ...layers, hotspots: e.target.checked })}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span className="text-purple-400">Hotspot Markers</span>
          </label>
        </div>

        {/* Legend Drawer */}
        <div className="gis-panel rounded-lg p-2.5 border border-slate-700/80 text-[11px] font-mono shadow-xl flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-600/70 border border-red-500 inline-block" />
            <span className="text-slate-300">Loss (ΔNDVI &lt; -0.3)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cyan-600/70 border border-cyan-400 inline-block" />
            <span className="text-slate-300">Water (NDWI &gt; 0)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-600/70 border border-amber-400 inline-block" />
            <span className="text-slate-300">Built-up (NDBI &gt; +0.1)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border border-emerald-400 bg-emerald-950 inline-block" />
            <span className="text-slate-300">WDPA Perimeter</span>
          </div>
        </div>
      </div>
    </div>
  );
};
