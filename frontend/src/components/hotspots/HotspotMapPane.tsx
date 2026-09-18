import React, { useState, useEffect } from 'react';
import { ChangeEventHotspot } from '@/types';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import {
  Compass,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  MapPin,
  Flame,
  ShieldAlert,
  Info,
  ExternalLink,
  X,
  Crosshair,
} from 'lucide-react';

interface HotspotMapPaneProps {
  hotspots: ChangeEventHotspot[];
  selectedHotspot: ChangeEventHotspot | null;
  onSelectHotspot: (hotspot: ChangeEventHotspot) => void;
  onOpenDrawer: (hotspot: ChangeEventHotspot) => void;
}

export const HotspotMapPane: React.FC<HotspotMapPaneProps> = ({
  hotspots,
  selectedHotspot,
  onSelectHotspot,
  onOpenDrawer,
}) => {
  const [zoom, setZoom] = useState(1.0);
  const [mapStyle, setMapStyle] = useState<'satellite' | 'vector'>('satellite');
  const [showPopup, setShowPopup] = useState(true);

  // When selectedHotspot changes, ensure popup is visible and reset zoom focus
  useEffect(() => {
    if (selectedHotspot) {
      setShowPopup(true);
      setZoom(1.35); // Simulated zoom in
    }
  }, [selectedHotspot]);

  // Position calculation for visual representation of hotspots on map canvas
  // We can map lat/lon or assign balanced relative positions
  const getMarkerPosition = (hs: ChangeEventHotspot, index: number) => {
    // Generate deterministic screen positions based on hotspot coordinates
    const basePositions = [
      { top: '35%', left: '40%' },
      { top: '55%', left: '62%' },
      { top: '28%', left: '70%' },
      { top: '65%', left: '30%' },
      { top: '42%', left: '52%' },
      { top: '75%', left: '60%' },
      { top: '22%', left: '32%' },
      { top: '50%', left: '25%' },
      { top: '70%', left: '78%' },
    ];
    return basePositions[index % basePositions.length];
  };

  const getSeverityRingColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'border-red-500 bg-red-500/30 text-red-400 shadow-red-950/80';
      case 'HIGH':
        return 'border-orange-500 bg-orange-500/30 text-orange-400 shadow-orange-950/80';
      case 'MEDIUM':
        return 'border-amber-500 bg-amber-500/30 text-amber-400 shadow-amber-950/80';
      case 'LOW':
      default:
        return 'border-emerald-500 bg-emerald-500/30 text-emerald-400 shadow-emerald-950/80';
    }
  };

  return (
    <div className="gis-glass-card rounded-xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col h-full relative select-none">
      {/* Map Header HUD */}
      <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-400 animate-spin-slow" />
          <h3 className="text-xs font-bold font-mono text-white tracking-wide uppercase">
            Geospatial Telemetry & Cluster Map
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            {hotspots.length} Active Nodes
          </span>
        </div>

        {/* Map Style & Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMapStyle(mapStyle === 'satellite' ? 'vector' : 'satellite')}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-300 hover:text-white transition-colors"
          >
            {mapStyle === 'satellite' ? 'Satellite' : 'Tactical'}
          </button>
          <div className="h-4 w-px bg-slate-800 mx-0.5" />
          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.2))}
            className="p-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))}
            className="p-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1.0)}
            className="p-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
            title="Reset Scale"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative w-full flex-1 min-h-[520px] bg-[#05080c] overflow-hidden">
        {/* Scalable Container */}
        <div
          className="absolute inset-0 transition-transform duration-300"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          {/* Satellite / Tactical Background */}
          <div
            className="absolute inset-0 transition-opacity"
            style={{
              backgroundImage:
                mapStyle === 'satellite'
                  ? `radial-gradient(ellipse at 50% 50%, rgba(6, 78, 59, 0.4) 0%, rgba(2, 44, 34, 0.85) 60%, rgba(3, 10, 8, 0.98) 100%),
                     repeating-linear-gradient(45deg, rgba(16, 185, 129, 0.04) 0px, rgba(16, 185, 129, 0.04) 2px, transparent 2px, transparent 24px)`
                  : `radial-gradient(ellipse at 50% 50%, rgba(15, 23, 42, 0.6) 0%, rgba(10, 15, 26, 0.95) 100%),
                     linear-gradient(to right, rgba(30, 41, 59, 0.25) 1px, transparent 1px),
                     linear-gradient(to bottom, rgba(30, 41, 59, 0.25) 1px, transparent 1px)`,
              backgroundSize: mapStyle === 'satellite' ? 'auto' : '40px 40px',
            }}
          />

          {/* Coordinate Grid Mesh */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(51, 65, 85, 0.3) 1px, transparent 1px),
                                linear-gradient(to bottom, rgba(51, 65, 85, 0.3) 1px, transparent 1px)`,
              backgroundSize: '80px 80px',
            }}
          />

          {/* Simulated Reserve Boundary Overlay */}
          <div className="absolute inset-12 rounded-[52px] border-2 border-dashed border-emerald-500/40 pointer-events-none p-4 flex flex-col justify-between">
            <div className="self-start text-[9px] font-mono text-emerald-400 bg-slate-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
              Sentinel-2 Surface Reflectance Tile
            </div>
            <div className="self-end text-[9px] font-mono text-slate-500 bg-slate-950/80 px-2 py-0.5 rounded">
              GSD: 10m Multi-spectral
            </div>
          </div>

          {/* Hotspot Markers */}
          {hotspots.map((hs, index) => {
            const isSelected = selectedHotspot?.id === hs.id;
            const pos = getMarkerPosition(hs, index);
            const ringStyle = getSeverityRingColor(hs.severity);

            return (
              <div
                key={hs.id}
                className="absolute z-20 transition-all cursor-pointer group"
                style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -50%)' }}
                onClick={() => onSelectHotspot(hs)}
              >
                {/* Outer Pulsing Wave for Selected or Critical Marker */}
                {(isSelected || hs.severity === 'CRITICAL') && (
                  <div
                    className={`absolute -inset-3 rounded-full animate-ping opacity-60 border-2 ${
                      hs.severity === 'CRITICAL' ? 'border-red-500' : 'border-emerald-400'
                    }`}
                  />
                )}

                {/* Marker Pin */}
                <div
                  className={`relative w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-lg transition-transform ${ringStyle} ${
                    isSelected ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-950 z-30' : 'group-hover:scale-110'
                  }`}
                >
                  <MapPin className="w-4 h-4 fill-current" />
                </div>

                {/* Label Tag */}
                <div className="absolute top-9 left-1/2 -translate-x-1/2 bg-slate-950/90 backdrop-blur-sm border border-slate-800 px-2 py-0.5 rounded text-[9px] font-mono text-slate-300 whitespace-nowrap shadow-md pointer-events-none group-hover:text-white">
                  {hs.id}
                </div>
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* INTERACTIVE POPUP (DISPLAYS AT BOTTOM OR ANCHORED WHEN ROW CLICKED) */}
        {/* ========================================================================= */}
        {selectedHotspot && showPopup && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-30 animate-in fade-in slide-in-from-bottom-2">
            <div className="gis-glass-card rounded-xl p-4 border border-emerald-500/50 bg-slate-950/95 shadow-2xl space-y-3 relative">
              {/* Close popup button */}
              <button
                onClick={() => setShowPopup(false)}
                className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Popup Header */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-emerald-400">
                    {selectedHotspot.id}
                  </span>
                  <SeverityBadge severity={selectedHotspot.severity} />
                </div>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  {selectedHotspot.area_name}
                </h4>
                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                  <Crosshair className="w-3 h-3 text-slate-500" />
                  <span>
                    {selectedHotspot.coordinates.lat.toFixed(4)}°,{' '}
                    {selectedHotspot.coordinates.lon.toFixed(4)}°
                  </span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[10px] font-mono">
                <div>
                  <span className="text-slate-500 block">CHANGE</span>
                  <span className="text-red-400 font-bold">
                    {selectedHotspot.percentage_change
                      ? `${selectedHotspot.percentage_change.toFixed(1)}%`
                      : `${(selectedHotspot.delta_ndvi * 100).toFixed(0)}%`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">AREA</span>
                  <span className="text-white font-medium">
                    {selectedHotspot.area_ha.toFixed(1)} ha
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">CONFIDENCE</span>
                  <span className="text-cyan-400 font-bold">
                    {(selectedHotspot.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Action Trigger for Detail Drawer */}
              <button
                onClick={() => onOpenDrawer(selectedHotspot)}
                className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/60"
              >
                <span>OPEN FULL DOSSIER</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Bottom Left Coordinate Indicator */}
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none hidden sm:block">
          <div className="bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>COPERNICUS S2A/B MSI</span>
            <span className="text-slate-600">|</span>
            <span>ZOOM: {zoom.toFixed(1)}x</span>
          </div>
        </div>
      </div>
    </div>
  );
};
