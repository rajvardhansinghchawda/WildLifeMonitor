'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Hotspot } from '@/lib/api';
import { SEVERITY_COLORS } from '@/lib/format';

export interface MapOverlay {
  id: string;
  url: string;
  bounds: [[number, number], [number, number]];
  opacity?: number;
}

interface GeoMapProps {
  center?: { lat: number; lon: number };
  boundary?: GeoJSON.GeoJSON | null;
  hotspots?: Hotspot[];
  overlays?: MapOverlay[];
  selectedId?: string | null;
  onSelect?: (h: Hotspot) => void;
  height?: string;
  className?: string;
}

/** Leaflet map: real OSM basemap, protected-area boundary, hotspot polygons, raster overlays. */
export default function GeoMap({
  center,
  boundary,
  hotspots = [],
  overlays = [],
  selectedId,
  onSelect,
  height = '480px',
  className,
}: GeoMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);
  const LRef = useRef<any>(null);
  const [ready, setReady] = React.useState(false);

  // one-time init
  useEffect(() => {
    let cancelled = false;
    import('leaflet').then((mod) => {
      const L = (mod as any).default ?? mod;
      if (cancelled || !containerRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(containerRef.current, {
        center: center ? [center.lat, center.lon] : [21.5, 79.5],
        zoom: 9,
        zoomControl: false,
        attributionControl: false,
      });
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
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

  // redraw dynamic layers
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];
    let fit: any = null;

    overlays.forEach((o) => {
      const layer = L.imageOverlay(o.url, o.bounds, { opacity: o.opacity ?? 0.75 });
      layer.addTo(map);
      layersRef.current.push(layer);
    });

    if (boundary) {
      const b = L.geoJSON(boundary as any, {
        style: { color: '#10b981', weight: 2, opacity: 0.9, fillOpacity: 0.03, dashArray: '4 4' },
        interactive: false,
      }).addTo(map);
      layersRef.current.push(b);
      fit = b.getBounds();
    }

    hotspots.forEach((h) => {
      if (!h.geometry) return;
      const color = SEVERITY_COLORS[h.severity] ?? '#94a3b8';
      const selected = h.id === selectedId;
      const g = L.geoJSON(h.geometry as any, {
        style: {
          color: selected ? '#ffffff' : color,
          weight: selected ? 3 : 1.5,
          fillColor: color,
          fillOpacity: selected ? 0.7 : 0.45,
        },
      }).addTo(map);
      g.bindTooltip(
        `${h.change_label} · ${h.affected_area_ha.toFixed(1)} ha` +
          (h.priority_score !== null ? ` · priority ${h.priority_score.toFixed(0)}` : ''),
        { sticky: true }
      );
      if (onSelect) g.on('click', () => onSelect(h));
      layersRef.current.push(g);
    });

    if (fit && fit.isValid()) map.fitBounds(fit, { padding: [20, 20] });
    else if (overlays.length) map.fitBounds(overlays[0].bounds as any);
    else if (center) map.setView([center.lat, center.lon], 9);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, boundary, hotspots, overlays, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [height, ready]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className={`w-full rounded-lg overflow-hidden border border-slate-800 z-0 ${className ?? ''}`}
    />
  );
}
