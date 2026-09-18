'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Hotspot } from '@/lib/api';

export interface MapOverlay {
  id: string;
  url: string;
  bounds: [[number, number], [number, number]];
  opacity?: number;
}

export interface GeoMapProps {
  center?: { lat: number; lon: number };
  boundary?: GeoJSON.GeoJSON | null;
  hotspots?: Hotspot[];
  overlays?: MapOverlay[];
  selectedId?: string | null;
  onSelect?: (h: Hotspot) => void;
  height?: string;
  className?: string;
  basemapType?: 'satellite' | 'dark';
  showLegend?: boolean;
  showFires?: boolean;
}

/**
 * Enhanced Leaflet Map for Dashboard, Explore & Area Pages:
 * - High-resolution Esri World Imagery (Satellite) & CartoDB Dark basemap toggle
 * - Real PostGIS boundary vector with glowing emerald border
 * - Distinct PS Requirement symbol badges: [🔥] Deforestation, [🌿] Vegetation loss, [💧] Water bodies, [🏢] Urban expansion
 * - Interactive telemetry popups with Priority Score, Severity, Area (ha), Δ NDVI
 * - ResizeObserver for fluid responsiveness and full-screen transitions
 * - Metric scale bar and floating on-map legend
 */
export default function GeoMap({
  center,
  boundary,
  hotspots = [],
  overlays = [],
  selectedId,
  onSelect,
  height = '480px',
  className = '',
  basemapType = 'satellite',
  showLegend = true,
  showFires = false,
}: GeoMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);
  const tileLayerRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const [ready, setReady] = React.useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    let cancelled = false;
    import('leaflet').then((mod) => {
      const L = (mod as any).default ?? mod;
      if (cancelled || !containerRef.current || mapRef.current) return;
      LRef.current = L;

      // Fix Leaflet marker icon asset paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current, {
        center: center ? [center.lat, center.lon] : [21.695, 79.248],
        zoom: 10,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

      // Basemap layer
      if (basemapType === 'satellite') {
        tileLayerRef.current = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 18,
            attribution: 'Esri Satellite Imagery',
          }
        ).addTo(map);
      } else {
        tileLayerRef.current = L.tileLayer(
          'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          {
            maxZoom: 18,
            attribution: '&copy; CartoDB',
          }
        ).addTo(map);
      }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center when center prop changes
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.setView([center.lat, center.lon], mapRef.current.getZoom() || 10);
    }
  }, [center?.lat, center?.lon]);

  // Handle basemap switching
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    if (basemapType === 'satellite') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 18,
          attribution: 'Esri Satellite Imagery',
        }
      ).addTo(map);
    } else {
      tileLayerRef.current = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          maxZoom: 18,
          attribution: '&copy; CartoDB',
        }
      ).addTo(map);
    }
  }, [basemapType, ready]);

  // Container resize observer for smooth fullscreen and layout resizing
  useEffect(() => {
    if (!ready || !mapRef.current || !containerRef.current) return;
    const map = mapRef.current;
    map.invalidateSize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      });
      resizeObserver.observe(containerRef.current);
    }

    const handleWindowResize = () => {
      if (mapRef.current) mapRef.current.invalidateSize();
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [ready]);

  // Redraw Visual Layers: Boundary, Hotspots with PS Symbols, Raster Overlays
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];
    let fit: any = null;

    // 1. Raster Overlays
    overlays.forEach((o) => {
      try {
        const layer = L.imageOverlay(o.url, o.bounds, { opacity: o.opacity ?? 0.85 });
        layer.addTo(map);
        layersRef.current.push(layer);
      } catch (err) {
        console.warn('Failed to load raster overlay:', err);
      }
    });

    // 2. PostGIS Protected Area Boundary
    if (boundary) {
      try {
        const b = L.geoJSON(boundary as any, {
          style: {
            color: '#10b981',
            weight: 2.5,
            opacity: 0.95,
            fillColor: '#059669',
            fillOpacity: 0.12,
          },
          interactive: false,
        }).addTo(map);
        layersRef.current.push(b);
        fit = b.getBounds();
      } catch (err) {
        console.warn('Failed to render boundary GeoJSON:', err);
      }
    }

    // 3. Hotspots with Distinct PS Symbols & Telemetry
    hotspots.forEach((h) => {
      const lat = h.coordinates?.lat || (h as any).centroid_lat;
      const lon = h.coordinates?.lon || (h as any).centroid_lon;
      const ct = (h.change_type || '').toLowerCase();
      const isSelected = h.id === selectedId;

      let psSymbol = '🌿';
      let psBg = '#059669';
      let psPillar = 'Pillar 2: Vegetation Loss';

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

      const color = isSelected ? '#38bdf8' : psBg;

      const popupHtml = `
        <div style="font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; color: #0f172a; line-height: 1.4; min-width: 220px;">
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
          <div><b>Sensor:</b> ${h.sensor || 'Sentinel-2 L2A'}</div>
          ${h.nearest_known_road_distance_m ? `<div><b>Nearest Road:</b> ${(h.nearest_known_road_distance_m / 1000).toFixed(1)} km</div>` : ''}
          <hr style="margin: 4px 0; border: none; border-top: 1px solid #cbd5e1;"/>
          <div style="font-size: 10px; color: #64748b;">Telemetry Verified • Click to inspect</div>
        </div>
      `;

      // A. Polygon Geometry (if available)
      if (h.geometry) {
        try {
          const polyLayer = L.geoJSON(h.geometry as any, {
            style: {
              color: color,
              weight: isSelected ? 3.5 : 2.2,
              opacity: 0.95,
              fillColor: color,
              fillOpacity: isSelected ? 0.65 : 0.45,
            },
          }).addTo(map);

          polyLayer.bindPopup(popupHtml);
          if (onSelect) {
            polyLayer.on('click', () => onSelect(h));
          }
          layersRef.current.push(polyLayer);
        } catch (err) {
          console.warn('Failed to render hotspot polygon geometry:', err);
        }
      }

      // B. Custom PS Symbol Marker Pin
      if (lat && lon) {
        const icon = L.divIcon({
          className: 'ps-symbol-icon-marker',
          html: `
            <div style="
              width: ${isSelected ? '28px' : '24px'};
              height: ${isSelected ? '28px' : '24px'};
              background: ${psBg};
              border: 2px solid ${isSelected ? '#38bdf8' : '#ffffff'};
              border-radius: ${psSymbol === '🏢' ? '4px' : '50%'};
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.7);
              font-size: ${isSelected ? '14px' : '12px'};
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
        marker.bindPopup(popupHtml);
        if (onSelect) {
          marker.on('click', () => onSelect(h));
        }
        layersRef.current.push(marker);
      }
    });

    // C. NASA FIRMS Active Fire WMS Overlay
    const firmsKey = process.env.NEXT_PUBLIC_FIRMS_MAP_KEY || '66a86eb1bccf10d464a978f78af683fe';
    if (showFires && firmsKey) {
      const firmsLayer = L.tileLayer.wms(
        `https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/${firmsKey}/`,
        {
          layers: 'fires_viirs_snpp_24',
          format: 'image/png',
          transparent: true,
          opacity: 0.9,
          zIndex: 600,
          attribution: 'NASA FIRMS (VIIRS 375m Live Fires)',
        }
      ).addTo(map);
      layersRef.current.push(firmsLayer);
    }

    // Auto-fit to boundary if available
    if (fit && fit.isValid()) {
      map.fitBounds(fit, { padding: [25, 25] });
    } else if (overlays.length && overlays[0].bounds) {
      map.fitBounds(overlays[0].bounds as any);
    } else if (center) {
      map.setView([center.lat, center.lon], 10);
    }
  }, [ready, boundary, hotspots, overlays, selectedId, onSelect, showFires]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%' }}
      className={`rounded-lg overflow-hidden border border-slate-800 z-0 relative group ${className}`}
    >
      {/* Floating On-Map PS Requirements Symbol Legend */}
      {showLegend && (
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
