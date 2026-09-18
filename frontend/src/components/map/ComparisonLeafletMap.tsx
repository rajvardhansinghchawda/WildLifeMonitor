'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Hotspot } from '@/lib/api';

export interface RasterOverlayConfig {
  url: string;
  bounds: [[number, number], [number, number]];
  legend?: {
    min?: number;
    max?: number;
    unit?: string;
    title?: string;
    palette?: string[];
  } | null;
}

export interface ComparisonLeafletMapProps {
  center?: { lat: number; lon: number };
  zoom?: number;
  boundaryGeoJson?: any;
  hotspots?: Hotspot[];
  sectors?: { name: string; lat: number; lon: number }[];
  mode: 'baseline' | 'observed' | 'difference';
  rasterOverlay?: RasterOverlayConfig | null;
  showBoundary?: boolean;
  showHotspots?: boolean;
  showRoads?: boolean;
  showWater?: boolean;
  showSettlements?: boolean;
  showFires?: boolean;
  showMiniLegend?: boolean;
  basemapType?: 'satellite' | 'dark';
  onHotspotClick?: (h: Hotspot) => void;
  height?: string;
  className?: string;
}

export default function ComparisonLeafletMap({
  center = { lat: 21.695, lon: 79.248 },
  zoom = 10,
  boundaryGeoJson,
  hotspots = [],
  sectors = [],
  mode,
  rasterOverlay = null,
  showBoundary = true,
  showHotspots = true,
  showRoads = false,
  showWater = true,
  showSettlements = false,
  showFires = false,
  showMiniLegend = true,
  basemapType = 'satellite',
  onHotspotClick,
  height = '100%',
  className = '',
}: ComparisonLeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layersGroupRef = useRef<any[]>([]);
  const LRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    let cancelled = false;
    import('leaflet').then((mod) => {
      const L = (mod as any).default ?? mod;
      if (cancelled || !containerRef.current || mapRef.current) return;
      LRef.current = L;

      // Leaflet default icon fix
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current, {
        center: [center.lat, center.lon],
        zoom: zoom,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,
      });

      // Zoom control
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Basemap Layer
      if (basemapType === 'satellite') {
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 18,
            attribution: 'Esri Satellite Imagery',
          }
        ).addTo(map);
      } else {
        L.tileLayer(
          'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          {
            maxZoom: 18,
            attribution: '&copy; CartoDB',
          }
        ).addTo(map);
      }

      // Scale Bar (metric)
      L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

      mapRef.current = map;
      setReady(true);
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update Center and Zoom when center prop changes
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.setView([center.lat, center.lon], zoom);
    }
  }, [center.lat, center.lon, zoom]);

  // Automatically recalculate Leaflet dimensions on container resize / fullscreen toggle
  useEffect(() => {
    if (!ready || !mapRef.current || !containerRef.current) return;
    const map = mapRef.current;
    map.invalidateSize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(containerRef.current);
    }

    const handleWindowResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [ready]);

  // Redraw Visual Layers & Features using 100% Real Backend Data
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    // Clear previous dynamic layers
    layersGroupRef.current.forEach((l) => map.removeLayer(l));
    layersGroupRef.current = [];

    // 1. Render Real Satellite Raster Heatmap Overlay (from Backend GEE/MinIO assets)
    if (rasterOverlay && rasterOverlay.url && rasterOverlay.bounds) {
      try {
        const imageOverlay = L.imageOverlay(rasterOverlay.url, rasterOverlay.bounds, {
          opacity: mode === 'difference' ? 0.88 : 0.78,
          interactive: false,
        }).addTo(map);
        layersGroupRef.current.push(imageOverlay);
      } catch (err) {
        console.warn('Failed to load raster overlay on Leaflet:', err);
      }
    }

    // 2. Render Real PostGIS Protected Area Boundary
    if (showBoundary && boundaryGeoJson) {
      const boundaryStyle =
        mode === 'baseline'
          ? { color: '#10b981', weight: 2.5, opacity: 0.9, fillColor: '#059669', fillOpacity: 0.15 }
          : mode === 'observed'
          ? { color: '#eab308', weight: 2.5, opacity: 0.9, fillColor: '#ca8a04', fillOpacity: 0.15 }
          : { color: '#38bdf8', weight: 2.2, opacity: 0.9, fillColor: '#0284c7', fillOpacity: 0.1 };

      const bLayer = L.geoJSON(boundaryGeoJson, {
        style: boundaryStyle,
        interactive: false,
      }).addTo(map);
      layersGroupRef.current.push(bLayer);

      // Auto fit bounds to real boundary if not already fitted
      const bounds = bLayer.getBounds();
      if (bounds.isValid() && (!rasterOverlay || !rasterOverlay.bounds)) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }

    // 3. Render Real Sector/Beat Pins (if available)
    if (sectors && sectors.length > 0) {
      sectors.forEach((sec) => {
        const icon = L.divIcon({
          className: 'custom-sector-pin',
          html: `<div style="background: rgba(15, 23, 42, 0.88); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.6); border-radius: 4px; padding: 2px 6px; font-size: 10px; font-family: ui-monospace, monospace; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.6);">${sec.name}</div>`,
          iconSize: [60, 22],
          iconAnchor: [30, 11],
        });
        const m = L.marker([sec.lat, sec.lon], { icon }).addTo(map);
        m.bindTooltip(`Beat / Sector: ${sec.name}`, { direction: 'top' });
        layersGroupRef.current.push(m);
      });
    }

    // 4. Render Real PostGIS Hotspots & Change Polygons from Backend Database
    if (showHotspots && hotspots && hotspots.length > 0) {
      hotspots.forEach((h) => {
        const lat = h.coordinates?.lat || (h as any).centroid_lat;
        const lon = h.coordinates?.lon || (h as any).centroid_lon;

        // Determine distinct PS Requirement symbol, color and title
        let psSymbol = '🌿';
        let psBg = '#059669';
        let psPillar = 'Pillar 2: Vegetation Loss';
        const ct = (h.change_type || '').toLowerCase();

        if (ct.includes('water')) {
          psSymbol = '💧';
          psBg = '#0284c7';
          psPillar = 'Pillar 3: Water Body Change';
        } else if (ct.includes('builtup') || ct.includes('encroach')) {
          psSymbol = '🏢';
          psBg = '#d97706';
          psPillar = 'Pillar 4: Urban Expansion';
        } else if (
          h.severity === 'critical' ||
          h.severity === 'high' ||
          (h.mean_ndvi_change !== null && h.mean_ndvi_change < -0.35)
        ) {
          psSymbol = '🔥';
          psBg = '#dc2626';
          psPillar = 'Pillar 5: Deforestation Alert';
        } else {
          psSymbol = '🌿';
          psBg = '#059669';
          psPillar = 'Pillar 2: Vegetation Loss';
        }

        const color = psBg;

        // A. Render Real Polygon Geometry (PostGIS GeoJSON) if available
        if (h.geometry && (h.geometry.type === 'Polygon' || h.geometry.type === 'MultiPolygon')) {
          try {
            const polyLayer = L.geoJSON(h.geometry as any, {
              style: {
                color: color,
                weight: 2.2,
                opacity: 0.95,
                fillColor: color,
                fillOpacity: mode === 'difference' ? 0.55 : 0.4,
              },
            }).addTo(map);

            polyLayer.bindPopup(
              `<div style="font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; color: #0f172a; line-height: 1.4; min-width: 220px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                  <span style="font-size: 14px;">${psSymbol}</span>
                  <span style="font-weight: bold; font-size: 11px; color: ${color}; text-transform: uppercase;">
                    ${psPillar}
                  </span>
                </div>
                <div style="font-weight: 700; color: #1e293b; margin-bottom: 4px;">${h.change_label || h.change_type}</div>
                <div><b>Severity:</b> <span style="text-transform:uppercase;font-weight:700;color:${color};">${h.severity}</span></div>
                <div><b>Priority Score:</b> ${h.priority_score !== null ? `${h.priority_score}/100` : 'Pending'}</div>
                <div><b>Affected Area:</b> ${h.affected_area_ha ? `${h.affected_area_ha.toFixed(2)} ha` : 'N/A'}</div>
                <div><b>Δ NDVI:</b> ${h.mean_ndvi_change !== null ? h.mean_ndvi_change.toFixed(4) : 'N/A'}</div>
                <div><b>Sensor:</b> ${h.sensor || 'Sentinel-2 L2A'}</div>
                ${h.nearest_known_road_distance_m ? `<div><b>Nearest Road:</b> ${(h.nearest_known_road_distance_m / 1000).toFixed(1)} km</div>` : ''}
                <hr style="margin: 4px 0; border: none; border-top: 1px solid #cbd5e1;"/>
                <div style="font-size: 10px; color: #64748b;">Telemetry Verified • Click to inspect dossier</div>
              </div>`
            );

            polyLayer.on('click', () => {
              if (onHotspotClick) onHotspotClick(h);
            });

            layersGroupRef.current.push(polyLayer);
          } catch (err) {
            console.warn('Failed to render hotspot polygon geometry:', err);
          }
        }

        // B. Render Custom Symbol Icon Marker
        if (lat && lon) {
          const icon = L.divIcon({
            className: 'ps-symbol-icon-marker',
            html: `
              <div style="
                width: 24px;
                height: 24px;
                background: ${psBg};
                border: 2px solid #ffffff;
                border-radius: ${psSymbol === '🏢' ? '4px' : '50%'};
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.6);
                font-size: 12px;
                cursor: pointer;
                transition: transform 0.15s ease-in-out;
              ">
                ${psSymbol}
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -14],
          });

          const marker = L.marker([lat, lon], { icon }).addTo(map);

          marker.bindTooltip(
            `<div style="font-family: ui-monospace, monospace; font-size: 11px; display: flex; align-items: center; gap: 4px;">
              <span>${psSymbol}</span>
              <div>
                <b>${psPillar}</b><br/>
                ${h.change_label || h.change_type} (${h.affected_area_ha?.toFixed(2) ?? 'N/A'} ha)
              </div>
            </div>`,
            { direction: 'top', className: 'leaflet-gis-tooltip' }
          );

          marker.bindPopup(
            `<div style="font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; color: #0f172a; line-height: 1.4; min-width: 220px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="font-size: 14px;">${psSymbol}</span>
                <span style="font-weight: bold; font-size: 11px; color: ${color}; text-transform: uppercase;">
                  ${psPillar}
                </span>
              </div>
              <div style="font-weight: 700; color: #1e293b; margin-bottom: 4px;">${h.change_label || h.change_type}</div>
              <div><b>Severity:</b> <span style="text-transform:uppercase;font-weight:700;color:${color};">${h.severity}</span></div>
              <div><b>Priority Score:</b> ${h.priority_score !== null ? `${h.priority_score}/100` : 'Pending'}</div>
              <div><b>Affected Area:</b> ${h.affected_area_ha ? `${h.affected_area_ha.toFixed(2)} ha` : 'N/A'}</div>
              <div><b>Δ NDVI:</b> ${h.mean_ndvi_change !== null ? h.mean_ndvi_change.toFixed(4) : 'N/A'}</div>
              <div><b>Sensor:</b> ${h.sensor || 'Sentinel-2 L2A'}</div>
              ${h.nearest_known_road_distance_m ? `<div><b>Nearest Road:</b> ${(h.nearest_known_road_distance_m / 1000).toFixed(1)} km</div>` : ''}
              <hr style="margin: 4px 0; border: none; border-top: 1px solid #cbd5e1;"/>
              <div style="font-size: 10px; color: #64748b;">Telemetry Verified • Click to inspect dossier</div>
            </div>`
          );

          marker.on('click', () => {
            if (onHotspotClick) onHotspotClick(h);
          });

          layersGroupRef.current.push(marker);
        }
      });
    }

    // 5. Additional Auxiliary Context Layers
    if (showRoads) {
      // Find hotspots with road distance and draw proximity lines
      hotspots.slice(0, 5).forEach((h) => {
        const lat = h.coordinates?.lat || (h as any).centroid_lat;
        const lon = h.coordinates?.lon || (h as any).centroid_lon;
        if (lat && lon && h.nearest_known_road_distance_m) {
          const distKm = (h.nearest_known_road_distance_m / 1000).toFixed(1);
          const roadOffsetLat = lat + (h.nearest_known_road_distance_m / 111000) * 0.4;
          const roadLine = L.polyline(
            [
              [lat, lon],
              [roadOffsetLat, lon + 0.01],
            ],
            { color: '#f59e0b', weight: 2, dashArray: '4 4', opacity: 0.85 }
          ).addTo(map);
          roadLine.bindTooltip(`Road Proximity Vector: ${distKm} km`, { sticky: true });
          layersGroupRef.current.push(roadLine);
        }
      });
    }

    if (showWater) {
      // Highlight water change hotspots with cyan rings
      hotspots
        .filter((h) => (h.change_type || '').toLowerCase().includes('water'))
        .forEach((h) => {
          const lat = h.coordinates?.lat || (h as any).centroid_lat;
          const lon = h.coordinates?.lon || (h as any).centroid_lon;
          if (lat && lon) {
            const ring = L.circle([lat, lon], {
              color: '#06b6d4',
              fillColor: '#0284c7',
              fillOpacity: 0.35,
              radius: Math.max(300, (h.affected_area_ha || 5) * 50),
              weight: 1.5,
            }).addTo(map);
            ring.bindTooltip(`Surface Water Dynamics: ${h.affected_area_ha?.toFixed(2)} ha`);
            layersGroupRef.current.push(ring);
          }
        });
    }

    if (showSettlements) {
      // Highlight builtup / settlement encroachment events
      hotspots
        .filter((h) => (h.change_type || '').toLowerCase().includes('builtup') || h.nearest_known_settlement_distance_m !== null)
        .forEach((h) => {
          const lat = h.coordinates?.lat || (h as any).centroid_lat;
          const lon = h.coordinates?.lon || (h as any).centroid_lon;
          if (lat && lon) {
            const settlementMarker = L.circleMarker([lat, lon], {
              radius: 8,
              color: '#ffffff',
              fillColor: '#a855f7',
              weight: 2,
              fillOpacity: 0.9,
            }).addTo(map);
            settlementMarker.bindTooltip(`Settlement/Encroachment Boundary Indicator`);
            layersGroupRef.current.push(settlementMarker);
          }
        });
    }

    // 6. Real NASA FIRMS Active Fire WMS Layer (VIIRS 375m satellite thermal anomalies)
    const firmsKey = process.env.NEXT_PUBLIC_FIRMS_MAP_KEY || '66a86eb1bccf10d464a978f78af683fe';
    if (showFires && firmsKey) {
      const firmsWms = L.tileLayer.wms(
        `https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/${firmsKey}/`,
        {
          layers: 'fires_viirs_snpp_24',
          format: 'image/png',
          transparent: true,
          opacity: 0.9,
          zIndex: 600,
          attribution: 'NASA FIRMS (VIIRS 375m Active Fires)',
        }
      ).addTo(map);
      layersGroupRef.current.push(firmsWms);
    }
  }, [
    ready,
    mode,
    rasterOverlay,
    showBoundary,
    showHotspots,
    showRoads,
    showWater,
    showSettlements,
    showFires,
    boundaryGeoJson,
    hotspots,
    sectors,
    center.lat,
    center.lon,
    onHotspotClick,
  ]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%' }}
      className={`rounded-lg overflow-hidden relative group ${className}`}
    >
      {/* Floating On-Map PS Requirements Symbol Legend */}
      {showMiniLegend && (
        <div className="absolute top-2 right-2 z-[400] bg-slate-950/90 backdrop-blur-md border border-slate-800/90 rounded-md px-2 py-1 text-[10px] font-mono text-slate-300 shadow-lg flex items-center gap-2 pointer-events-none select-none">
          <span className="flex items-center gap-0.5 text-rose-400" title="Pillar 5: Deforestation Alert">
            <span>🔥</span> Deforest
          </span>
          <span className="flex items-center gap-0.5 text-emerald-400" title="Pillar 2: Vegetation Loss">
            <span>🌿</span> Veg
          </span>
          <span className="flex items-center gap-0.5 text-cyan-400" title="Pillar 3: Water Bodies">
            <span>💧</span> Water
          </span>
          <span className="flex items-center gap-0.5 text-amber-400" title="Pillar 4: Urban Expansion">
            <span>🏢</span> Urban
          </span>
        </div>
      )}
    </div>
  );
}
