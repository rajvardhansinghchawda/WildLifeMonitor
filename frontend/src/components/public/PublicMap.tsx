'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { PublicChangeEvent } from '@/lib/public-api';
import { formatCoordinatesWithPlace } from '@/lib/geo-names';

interface PublicMapProps {
  centroid: { lat: number; lon: number };
  boundary?: any;
  events?: PublicChangeEvent[];
  selectedEventId?: string | null;
  onSelectEvent?: (event: PublicChangeEvent) => void;
  height?: string;
}

export default function PublicMap({
  centroid,
  boundary,
  events = [],
  selectedEventId,
  onSelectEvent,
  height = '480px',
}: PublicMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const boundaryLayerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    // Dynamically load leaflet on client only
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Initialize map once
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [centroid.lat, centroid.lon],
          zoom: 10,
          zoomControl: false,
          attributionControl: false,
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Standard free OpenStreetMap tile layer (No token required)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        // Attribution in bottom left
        L.control.attribution({ position: 'bottomleft', prefix: false }).addAttribution(
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" class="text-emerald-400">OpenStreetMap</a> contributors'
        ).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // Clear existing layers
      if (boundaryLayerRef.current) {
        map.removeLayer(boundaryLayerRef.current);
        boundaryLayerRef.current = null;
      }
      if (markersLayerRef.current) {
        map.removeLayer(markersLayerRef.current);
        markersLayerRef.current = null;
      }

      // Add Boundary GeoJSON Layer
      if (boundary) {
        try {
          const boundaryLayer = L.geoJSON(boundary, {
            style: {
              color: '#10b981',
              weight: 2.5,
              opacity: 0.9,
              fillColor: '#059669',
              fillOpacity: 0.12,
              dashArray: '4, 4',
            },
          }).addTo(map);

          boundaryLayerRef.current = boundaryLayer;

          const bounds = boundaryLayer.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
          }
        } catch (err) {
          console.error('Failed to render boundary GeoJSON:', err);
          map.setView([centroid.lat, centroid.lon], 10);
        }
      } else {
        map.setView([centroid.lat, centroid.lon], 10);
      }

      // Add Generalized Change Event Markers
      const markersGroup = L.layerGroup();
      events.forEach((ev) => {
        const lat = ev.generalized_coordinates.lat;
        const lon = ev.generalized_coordinates.lon;

        let color = '#3b82f6'; // Low
        if (ev.priority_band === 'CRITICAL') color = '#ef4444';
        else if (ev.priority_band === 'HIGH') color = '#f97316';
        else if (ev.priority_band === 'MEDIUM') color = '#eab308';

        const isSelected = selectedEventId === ev.id;
        const radius = isSelected ? 11 : 8;

        const circle = L.circleMarker([lat, lon], {
          radius: radius,
          fillColor: color,
          color: isSelected ? '#ffffff' : '#0f172a',
          weight: isSelected ? 3 : 1.5,
          opacity: 1,
          fillOpacity: 0.85,
        });

        // Popup content with real provenance & security disclaimer
        const popupContent = `
          <div style="font-family: sans-serif; font-size: 12px; min-width: 180px; color: #0f172a;">
            <div style="font-weight: bold; margin-bottom: 4px; color: #1e293b;">
              ${ev.change_label}
            </div>
            <div style="margin-bottom: 2px;">
              <strong>Severity:</strong> <span style="color: ${color}; font-weight: bold;">${ev.priority_band}</span>
            </div>
            <div style="margin-bottom: 2px;">
              <strong>Area:</strong> ${ev.affected_area_ha} ha
            </div>
            <div style="margin-bottom: 2px; color: #0284c7;">
              <strong>Location:</strong> ${formatCoordinatesWithPlace(lat, lon)}
            </div>
            ${
              ev.nearest_known_road_distance_m
                ? `<div style="margin-bottom: 2px;"><strong>Nearest Track:</strong> ${ev.nearest_known_road_distance_m}m</div>`
                : ''
            }
            <div style="font-size: 10px; color: #64748b; margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
              📍 Generalized coordinate (Anti-poaching protection)
            </div>
          </div>
        `;
        circle.bindPopup(popupContent);

        if (onSelectEvent) {
          circle.on('click', () => onSelectEvent(ev));
        }

        markersGroup.addLayer(circle);
      });

      markersGroup.addTo(map);
      markersLayerRef.current = markersGroup;
    });

    return () => {
      isMounted = false;
    };
  }, [centroid, boundary, events, selectedEventId, onSelectEvent]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      <div
        ref={mapContainerRef}
        style={{ height, width: '100%', minHeight: '350px' }}
        className="z-0"
      />
      {/* Visual Overlay Indicators */}
      <div className="absolute top-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/70 text-[11px] font-mono text-slate-300 flex items-center gap-2 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>REAL SATELLITE BOUNDARY OVERLAY (OSM / S2)</span>
      </div>

      <div className="absolute top-3 right-3 z-[400] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/70 text-[11px] font-mono text-slate-300 flex items-center gap-3 shadow-lg">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          <span className="text-[10px]">Critical</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
          <span className="text-[10px]">High</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
          <span className="text-[10px]">Medium</span>
        </div>
      </div>
    </div>
  );
}
