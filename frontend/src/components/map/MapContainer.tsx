'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ProtectedArea, ChangeEventHotspot } from '@/types';
import { MapLayerId, MapMode } from '@/types/map';
import { MOCK_HOTSPOTS, MOCK_FIRES } from '@/lib/mock-data';
import { HotspotMarker } from './HotspotMarker';
import { HotspotPopup } from './HotspotPopup';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { MapControls } from './MapControls';
import { MapLegend } from './MapLegend';
import { Shield, MapPin, Compass, Flame, Route, Waves } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MapContainerProps {
  selectedArea: ProtectedArea;
  visibleLayers: Record<MapLayerId, boolean>;
  layerOpacities: Record<MapLayerId, number>;
  mapMode: MapMode;
  onSelectHotspot?: (hotspot: ChangeEventHotspot) => void;
  showLayersPanel: boolean;
  onToggleLayersPanel: () => void;
  className?: string;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  selectedArea,
  visibleLayers,
  layerOpacities,
  mapMode,
  onSelectHotspot,
  showLayersPanel,
  onToggleLayersPanel,
  className,
}) => {
  const [zoom, setZoom] = useState<number>(12.2);
  const [mapStyle, setMapStyle] = useState<'satellite' | 'vector'>('satellite');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [selectedHotspot, setSelectedHotspot] = useState<ChangeEventHotspot | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Filter hotspots relevant to the selected area (or fallback to reserve-centered markers)
  const activeHotspots = MOCK_HOTSPOTS.filter(
    (hs) => hs.area_id === selectedArea.id || hs.area_name.includes(selectedArea.name)
  );

  // If no mock hotspots exist for this park, generate dynamic reserve-centered hotspots
  const displayHotspots: ChangeEventHotspot[] =
    activeHotspots.length > 0
      ? activeHotspots
      : [
          {
            id: `hs-${selectedArea.id}-1`,
            area_id: selectedArea.id,
            area_name: selectedArea.name,
            detected_at: '2026-09-17T06:30:00Z',
            area_ha: 14.2,
            delta_ndvi: -0.48,
            percentage_change: -38.5,
            change_type: 'DEFORESTATION',
            severity: 'CRITICAL',
            confidence_score: 0.95,
            coordinates: {
              lat: selectedArea.coordinates.lat + 0.025,
              lon: selectedArea.coordinates.lon - 0.035,
            },
            status: 'NEW',
            sensor: 'Sentinel-2 MSI (10m)',
          },
          {
            id: `hs-${selectedArea.id}-2`,
            area_id: selectedArea.id,
            area_name: selectedArea.name,
            detected_at: '2026-09-16T14:15:00Z',
            area_ha: 7.8,
            delta_ndvi: -0.34,
            percentage_change: -27.2,
            change_type: 'ENCROACHMENT',
            severity: 'HIGH',
            confidence_score: 0.88,
            coordinates: {
              lat: selectedArea.coordinates.lat - 0.028,
              lon: selectedArea.coordinates.lon + 0.032,
            },
            status: 'NEW',
            sensor: 'Sentinel-2 MSI (10m)',
          },
          {
            id: `hs-${selectedArea.id}-3`,
            area_id: selectedArea.id,
            area_name: selectedArea.name,
            detected_at: '2026-09-15T09:45:00Z',
            area_ha: 5.1,
            delta_ndvi: -0.25,
            percentage_change: -19.4,
            change_type: 'CANOPY_THINNING',
            severity: 'MEDIUM',
            confidence_score: 0.81,
            coordinates: {
              lat: selectedArea.coordinates.lat - 0.045,
              lon: selectedArea.coordinates.lon - 0.021,
            },
            status: 'VERIFIED',
            sensor: 'Sentinel-2 MSI (10m)',
          },
        ];

  // Active fires in this park
  const activeFires = MOCK_FIRES.filter((f) => f.area_id === selectedArea.id);

  // Fullscreen handler
  const handleToggleFullscreen = () => {
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

  const handleResetView = () => {
    setZoom(12.2);
    setSelectedHotspot(null);
  };

  const handleHotspotClick = (hs: ChangeEventHotspot) => {
    setSelectedHotspot(hs);
    onSelectHotspot?.(hs);
  };

  // Close popup when clicking on empty map canvas
  const handleCanvasClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName !== 'BUTTON' && !(e.target as HTMLElement).closest('.group')) {
      setSelectedHotspot(null);
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handleCanvasClick}
      className={cn(
        'relative w-full h-full min-h-[580px] rounded-xl overflow-hidden border border-slate-800 bg-[#060a0f] flex flex-col justify-between shadow-2xl transition-all select-none',
        isFullscreen && 'fixed inset-0 z-50 rounded-none h-screen min-h-screen',
        className
      )}
    >
      {/* ========================================================================= */}
      {/* MODE: BEFORE / AFTER SPLIT COMPARISON SLIDER */}
      {/* ========================================================================= */}
      {mapMode === 'compare' ? (
        <BeforeAfterSlider selectedArea={selectedArea} />
      ) : (
        <>
          {/* ======================================================================= */}
          {/* SATELLITE CANVAS / VECTOR MAP VIEWPORT */}
          {/* ======================================================================= */}
          <div className="absolute inset-0 overflow-hidden">
            {/* 1. Satellite Imagery Layer */}
            {visibleLayers.satellite_imagery && (
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                  opacity: (layerOpacities.satellite_imagery ?? 100) / 100,
                  backgroundImage:
                    mapStyle === 'satellite'
                      ? `radial-gradient(ellipse at 50% 50%, rgba(6, 78, 59, 0.4) 0%, rgba(2, 44, 34, 0.85) 60%, rgba(3, 10, 8, 0.98) 100%),
                         repeating-linear-gradient(45deg, rgba(16, 185, 129, 0.04) 0px, rgba(16, 185, 129, 0.04) 2px, transparent 2px, transparent 20px)`
                      : `radial-gradient(ellipse at 50% 50%, rgba(15, 23, 42, 0.6) 0%, rgba(10, 15, 26, 0.9) 100%),
                         linear-gradient(to right, rgba(30, 41, 59, 0.25) 1px, transparent 1px),
                         linear-gradient(to bottom, rgba(30, 41, 59, 0.25) 1px, transparent 1px)`,
                  backgroundSize: mapStyle === 'satellite' ? 'auto' : '40px 40px',
                }}
              />
            )}

            {/* Simulated Geographic Grid Lines */}
            <div
              className="absolute inset-0 opacity-25 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(51, 65, 85, 0.3) 1px, transparent 1px),
                                  linear-gradient(to bottom, rgba(51, 65, 85, 0.3) 1px, transparent 1px)`,
                backgroundSize: '100px 100px',
              }}
            />

            {/* 3. Forest Cover Layer (Intact Canopy Polygon) */}
            {visibleLayers.forest_cover && (
              <div
                className="absolute inset-16 rounded-[40px] pointer-events-none transition-opacity border border-emerald-500/20"
                style={{
                  opacity: (layerOpacities.forest_cover ?? 85) / 100,
                  backgroundColor: 'rgba(5, 150, 105, 0.12)',
                  backgroundImage:
                    'radial-gradient(ellipse at 45% 45%, rgba(16, 185, 129, 0.22) 0%, transparent 70%)',
                }}
              />
            )}

            {/* 2. Protected Area Boundary (WDPA Polygon) */}
            {visibleLayers.protected_area_boundary && (
              <div
                className="absolute inset-12 rounded-[48px] pointer-events-none border-2 border-dashed border-emerald-400/70 shadow-[0_0_20px_rgba(16,185,129,0.15)] flex flex-col justify-between p-4"
                style={{
                  opacity: (layerOpacities.protected_area_boundary ?? 100) / 100,
                }}
              >
                <div className="flex items-center gap-2 self-start bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-emerald-500/40 text-[10px] font-mono text-emerald-300">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{selectedArea.name} Official Boundary ({selectedArea.wdpa_id})</span>
                </div>
                <div className="self-end text-[10px] font-mono text-slate-500 bg-slate-950/70 px-2 py-0.5 rounded">
                  Legal Area: {selectedArea.total_hectares.toLocaleString()} ha
                </div>
              </div>
            )}

            {/* 6. Water Bodies Layer */}
            {visibleLayers.water_bodies && (
              <div
                className="absolute top-1/4 right-1/4 w-72 h-36 rounded-full pointer-events-none transition-opacity blur-[1px] border border-cyan-400/50"
                style={{
                  opacity: (layerOpacities.water_bodies ?? 85) / 100,
                  backgroundColor: 'rgba(6, 182, 212, 0.25)',
                  boxShadow: '0 0 25px rgba(6, 182, 212, 0.2)',
                }}
              >
                <div className="absolute top-2 left-4 text-[9px] font-mono text-cyan-300 flex items-center gap-1">
                  <Waves className="w-3 h-3 text-cyan-400" />
                  <span>River Basin & Wetland</span>
                </div>
              </div>
            )}

            {/* 7. Water Loss Layer */}
            {visibleLayers.water_loss && (
              <div
                className="absolute top-[28%] right-[22%] w-24 h-16 rounded-full pointer-events-none border border-orange-500/60 bg-orange-600/20"
                style={{
                  opacity: (layerOpacities.water_loss ?? 80) / 100,
                }}
              >
                <span className="text-[8px] font-mono text-orange-300 px-1 py-0.5 bg-orange-950/80 rounded absolute -top-3 left-1">
                  Desiccated -32%
                </span>
              </div>
            )}

            {/* 4. Vegetation Loss Layer */}
            {visibleLayers.vegetation_loss && (
              <div
                className="absolute top-1/3 left-1/4 w-44 h-28 rounded-2xl pointer-events-none border-2 border-dashed border-red-500/80 bg-red-900/25 blur-[0.5px]"
                style={{
                  opacity: (layerOpacities.vegetation_loss ?? 90) / 100,
                  backgroundImage:
                    'repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.18) 0px, rgba(239, 68, 68, 0.18) 2px, transparent 2px, transparent 10px)',
                }}
              >
                <div className="absolute top-1 left-2 text-[9px] font-mono text-red-200 bg-red-950/90 px-1 py-0.5 rounded border border-red-500/50">
                  Canopy Loss Zone (-14.8 ha)
                </div>
              </div>
            )}

            {/* 5. Vegetation Gain Layer */}
            {visibleLayers.vegetation_gain && (
              <div
                className="absolute bottom-1/4 left-1/3 w-36 h-20 rounded-xl pointer-events-none border border-lime-400/60 bg-lime-900/20"
                style={{
                  opacity: (layerOpacities.vegetation_gain ?? 75) / 100,
                  backgroundImage:
                    'radial-gradient(circle, rgba(132, 204, 22, 0.3) 10%, transparent 20%)',
                  backgroundSize: '8px 8px',
                }}
              >
                <div className="absolute top-1 left-2 text-[9px] font-mono text-lime-300 bg-lime-950/90 px-1 py-0.5 rounded">
                  Canopy Regrowth (+6.2 ha)
                </div>
              </div>
            )}

            {/* 8. Urban Expansion Layer */}
            {visibleLayers.urban_expansion && (
              <div
                className="absolute bottom-1/3 right-1/3 w-56 h-12 rounded-lg pointer-events-none border border-amber-500/60 bg-amber-900/25 rotate-[-8deg]"
                style={{
                  opacity: (layerOpacities.urban_expansion ?? 85) / 100,
                }}
              >
                <div className="text-[8px] font-mono text-amber-200 bg-amber-950/90 px-1.5 py-0.5 rounded border border-amber-500/40 inline-block m-1">
                  Encroachment Corridor (+2.4 km)
                </div>
              </div>
            )}

            {/* 10. Roads Layer */}
            {visibleLayers.roads && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  opacity: (layerOpacities.roads ?? 70) / 100,
                }}
              >
                {/* Simulated Road Line */}
                <svg className="w-full h-full">
                  <path
                    d="M 50 200 Q 250 240, 500 180 T 950 350"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="2.5"
                    strokeDasharray="6 3"
                  />
                  <path
                    d="M 400 50 Q 420 300, 600 550"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            )}

            {/* 11. OpenStreetMap Features Layer */}
            {visibleLayers.osm_features && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  opacity: (layerOpacities.osm_features ?? 80) / 100,
                }}
              >
                <div className="absolute top-[20%] left-[60%] flex items-center gap-1 text-[10px] font-mono text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/40">
                  <MapPin className="w-3 h-3 text-purple-400" />
                  <span>North Sector Ranger Outpost</span>
                </div>
                <div className="absolute bottom-[25%] left-[20%] flex items-center gap-1 text-[10px] font-mono text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/40">
                  <MapPin className="w-3 h-3 text-purple-400" />
                  <span>Observation Watchtower 04</span>
                </div>
              </div>
            )}

            {/* 9. Fire Hotspots Layer */}
            {visibleLayers.fire_hotspots && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  opacity: (layerOpacities.fire_hotspots ?? 100) / 100,
                }}
              >
                {activeFires.length > 0 ? (
                  activeFires.map((fire) => (
                    <div
                      key={fire.id}
                      className="absolute top-1/2 left-[58%] flex items-center gap-1 text-xs font-mono text-amber-300 bg-amber-950/90 px-2 py-1 rounded-lg border border-amber-500/70 shadow-xl shadow-amber-950 pointer-events-auto"
                    >
                      <Flame className="w-4 h-4 text-red-500 animate-pulse" />
                      <div>
                        <div className="font-bold text-red-400 text-[11px]">
                          VIIRS: {fire.frp_mw} MW
                        </div>
                        <div className="text-[9px] text-slate-400">{fire.brightness_kelvin} K</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="absolute bottom-[35%] right-[28%] flex items-center gap-1 text-xs font-mono text-amber-300 bg-amber-950/90 px-2 py-1 rounded-lg border border-amber-500/70 shadow-xl shadow-amber-950 pointer-events-auto">
                    <Flame className="w-4 h-4 text-red-500 animate-pulse" />
                    <div>
                      <div className="font-bold text-red-400 text-[11px]">VIIRS 42.6 MW</div>
                      <div className="text-[9px] text-slate-400">Temp: 348.2 K</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hotspot Markers (Pulsing Pins) */}
            <div className="absolute inset-0 pointer-events-auto">
              {displayHotspots.map((hs, index) => {
                // Determine mock visual placement within the canvas
                const positions = [
                  { top: '35%', left: '32%' },
                  { top: '55%', left: '65%' },
                  { top: '70%', left: '42%' },
                ];
                const pos = positions[index % positions.length];
                const isSelected = selectedHotspot?.id === hs.id;

                return (
                  <div key={hs.id} className="absolute" style={{ top: pos.top, left: pos.left }}>
                    <HotspotMarker
                      hotspot={hs}
                      isSelected={isSelected}
                      onClick={handleHotspotClick}
                    />
                  </div>
                );
              })}
            </div>

            {/* Hotspot Popup (Displayed when a marker is clicked) */}
            {selectedHotspot && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-auto">
                <HotspotPopup
                  hotspot={selectedHotspot}
                  onClose={() => setSelectedHotspot(null)}
                />
              </div>
            )}
          </div>

          {/* ======================================================================= */}
          {/* TOP HUD: COORDINATES, SCALE & SATELLITE STATUS */}
          {/* ======================================================================= */}
          <div className="relative z-20 m-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
            {/* Top Left: Active Reserve & Sensor Telemetry */}
            <div className="gis-panel rounded-lg px-3 py-1.5 border border-slate-700/80 text-xs font-mono text-slate-300 flex items-center gap-3 pointer-events-auto shadow-lg">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Compass className="w-4 h-4 animate-spin-slow" />
                <span>{selectedArea.name}</span>
              </div>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">
                LAT: <strong className="text-slate-200">{selectedArea.coordinates.lat.toFixed(4)}°</strong>
              </span>
              <span className="text-slate-400">
                LON: <strong className="text-slate-200">{selectedArea.coordinates.lon.toFixed(4)}°</strong>
              </span>
              <span className="text-slate-600">|</span>
              <span>ZOOM: {zoom.toFixed(1)}</span>
            </div>

            {/* Top Right: Remote Sensing Metadata */}
            <div className="gis-panel rounded-lg px-3 py-1.5 border border-slate-700/80 text-[11px] font-mono text-slate-300 flex items-center gap-2 pointer-events-auto shadow-lg">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>COPERNICUS S2A/B MSI</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">SCL FILTERED</span>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* BOTTOM FLOATING CONTROLS & LEGEND */}
          {/* ======================================================================= */}
          <div className="relative z-20 m-4 flex items-end justify-between gap-4 pointer-events-none">
            {/* Bottom-Left: Map Legend */}
            {showLegend && (
              <div className="pointer-events-auto">
                <MapLegend
                  visibleLayers={visibleLayers}
                  onClose={() => setShowLegend(false)}
                />
              </div>
            )}

            {/* Bottom-Right: Map Navigation Controls */}
            <div className="ml-auto pointer-events-auto">
              <MapControls
                zoom={zoom}
                onZoomIn={() => setZoom((z) => Math.min(18, z + 0.5))}
                onZoomOut={() => setZoom((z) => Math.max(4, z - 0.5))}
                onResetView={handleResetView}
                onGeolocate={handleResetView}
                isFullscreen={isFullscreen}
                onToggleFullscreen={handleToggleFullscreen}
                mapStyle={mapStyle}
                onToggleMapStyle={() =>
                  setMapStyle((s) => (s === 'satellite' ? 'vector' : 'satellite'))
                }
                showLayersPanel={showLayersPanel}
                onToggleLayersPanel={onToggleLayersPanel}
                showLegend={showLegend}
                onToggleLegend={() => setShowLegend(!showLegend)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
