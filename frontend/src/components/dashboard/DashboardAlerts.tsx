'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ArrowUpRight,
  Filter,
  Clock,
  MapPin,
  Flame,
  TreePine,
  Droplets,
  Radio,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { SeverityLevel } from '@/types';

export interface DashboardAlertItem {
  id: string;
  title: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  status: 'UNREAD' | 'ACKNOWLEDGED' | 'RESOLVED';
  triggered_at: string;
  area_name: string;
  coordinates?: { lat: number; lon: number };
  category: 'DEFORESTATION' | 'FIRE' | 'WATER' | 'TELEMETRY' | 'ENCROACHMENT';
  confidence?: number;
  delta_ndvi?: number;
  hotspot_id?: string;
}

const INITIAL_ALERTS: DashboardAlertItem[] = [
  {
    id: 'alt-c1',
    title: 'Rapid Canopy Collapse in Virunga Sector 3',
    message: 'Sudden loss of 14.8 ha detected with severe ΔNDVI (-0.52). Probable mechanized clearing adjacent to gorilla corridor.',
    severity: 'CRITICAL',
    status: 'UNREAD',
    triggered_at: '2026-09-18T04:35:00Z',
    area_name: 'Virunga National Park',
    coordinates: { lat: -0.082, lon: 29.491 },
    category: 'DEFORESTATION',
    confidence: 0.94,
    delta_ndvi: -0.52,
    hotspot_id: 'hs-101',
  },
  {
    id: 'alt-c2',
    title: 'High-Temperature Thermal Flank (FRP 42.6 MW)',
    message: 'NASA VIIRS telemetry confirmed active front spreading east along dry savannah border at 1.2 km/hr.',
    severity: 'CRITICAL',
    status: 'UNREAD',
    triggered_at: '2026-09-18T02:20:00Z',
    area_name: 'Virunga National Park',
    coordinates: { lat: -0.091, lon: 29.475 },
    category: 'FIRE',
    confidence: 0.96,
  },
  {
    id: 'alt-h1',
    title: 'Linear Road Intrusion into Primary Canopy',
    message: 'New unpaved logging corridor (2.3 km) identified via Sentinel-2 NDBI edge differencing.',
    severity: 'HIGH',
    status: 'UNREAD',
    triggered_at: '2026-09-17T16:15:00Z',
    area_name: 'Yasuní National Park',
    coordinates: { lat: -0.985, lon: -76.012 },
    category: 'ENCROACHMENT',
    confidence: 0.89,
    delta_ndvi: -0.44,
    hotspot_id: 'hs-102',
  },
  {
    id: 'alt-m1',
    title: 'Wetland Desiccation & Drainage Anomaly',
    message: 'Seasonal lake volume registered 32% decline relative to historical 5-year September baseline.',
    severity: 'MEDIUM',
    status: 'ACKNOWLEDGED',
    triggered_at: '2026-09-17T11:40:00Z',
    area_name: 'Mamirauá Reserve',
    coordinates: { lat: -2.261, lon: -65.228 },
    category: 'WATER',
    confidence: 0.84,
  },
  {
    id: 'alt-m2',
    title: 'Canopy Thinning in Northern Buffer Perimeter',
    message: 'Diffuse canopy loss (5.1 ha) detected along legal park perimeter fence.',
    severity: 'MEDIUM',
    status: 'UNREAD',
    triggered_at: '2026-09-16T19:10:00Z',
    area_name: 'Serengeti National Park',
    coordinates: { lat: -2.312, lon: 34.814 },
    category: 'DEFORESTATION',
    confidence: 0.82,
  },
  {
    id: 'alt-i1',
    title: 'Sentinel-2 Revisit Pass Imagery Ingested',
    message: 'Tile 36MVE ingested with 2.1% cloud cover. Surface reflectance atmospheric correction completed.',
    severity: 'INFO',
    status: 'ACKNOWLEDGED',
    triggered_at: '2026-09-18T05:10:00Z',
    area_name: 'Serengeti National Park',
    category: 'TELEMETRY',
    confidence: 0.99,
  },
  {
    id: 'alt-i2',
    title: 'Automated DBSCAN Cluster Calibration Finished',
    message: 'Spatial clustering model converged across 12,400 spectral difference pixels. 3 candidate clusters flagged.',
    severity: 'INFO',
    status: 'ACKNOWLEDGED',
    triggered_at: '2026-09-17T23:50:00Z',
    area_name: 'Kaziranga National Park',
    category: 'TELEMETRY',
    confidence: 0.98,
  },
];

type SeverityFilter = 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';

export const DashboardAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<DashboardAlertItem[]>(INITIAL_ALERTS);
  const [filter, setFilter] = useState<SeverityFilter>('ALL');

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'ALL') return true;
    return a.severity === filter;
  });

  const getCount = (sev: SeverityFilter) => {
    if (sev === 'ALL') return alerts.length;
    return alerts.filter((a) => a.severity === sev).length;
  };

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a))
    );
  };

  return (
    <div className="gis-glass-card rounded-xl p-5 border border-slate-800 shadow-xl flex flex-col justify-between">
      {/* Header & Tabs */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Recent Threat Alerts
              </h2>
              <p className="text-[11px] text-slate-400">
                Automated multi-spectral alarms flagged by CVA & VIIRS telemetry
              </p>
            </div>
          </div>

          <Link
            href="/alerts"
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono font-medium transition-colors self-start sm:self-auto"
          >
            <span>Alert Console</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Severity Filter Tabs: Critical, High, Medium, Information */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-slate-900/90 border border-slate-800 mb-4">
          {(
            [
              { key: 'ALL', label: 'All Alerts' },
              { key: 'CRITICAL', label: 'Critical' },
              { key: 'HIGH', label: 'High' },
              { key: 'MEDIUM', label: 'Medium' },
              { key: 'INFO', label: 'Information' },
            ] as const
          ).map((tab) => {
            const count = getCount(tab.key);
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-mono font-medium flex items-center gap-1.5 transition-all',
                  isActive
                    ? 'bg-slate-800 text-white shadow border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px]',
                    tab.key === 'CRITICAL' && (isActive ? 'bg-red-900/80 text-red-200' : 'bg-red-950 text-red-400'),
                    tab.key === 'HIGH' && (isActive ? 'bg-amber-900/80 text-amber-200' : 'bg-amber-950 text-amber-400'),
                    tab.key === 'MEDIUM' && (isActive ? 'bg-yellow-900/80 text-yellow-200' : 'bg-yellow-950 text-yellow-400'),
                    tab.key === 'INFO' && (isActive ? 'bg-cyan-900/80 text-cyan-200' : 'bg-cyan-950 text-cyan-400'),
                    tab.key === 'ALL' && 'bg-slate-700/80 text-slate-300'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
        {filteredAlerts.length === 0 ? (
          <div className="py-8 text-center text-slate-500 font-mono text-xs">
            No active {filter.toLowerCase()} alerts detected for this time period.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            return (
              <div
                key={alert.id}
                className={cn(
                  'p-3.5 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3',
                  alert.severity === 'CRITICAL' && 'bg-red-950/15 border-red-900/40 hover:border-red-700/60',
                  alert.severity === 'HIGH' && 'bg-amber-950/15 border-amber-900/40 hover:border-amber-700/60',
                  alert.severity === 'MEDIUM' && 'bg-yellow-950/10 border-yellow-900/40 hover:border-yellow-700/60',
                  alert.severity === 'INFO' && 'bg-cyan-950/10 border-cyan-900/30 hover:border-cyan-700/50'
                )}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={alert.severity} showIcon={true} />
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {alert.area_name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(alert.triggered_at)}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-100 font-sans">
                    {alert.title}
                  </h4>

                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    {alert.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] font-mono text-slate-400">
                    {alert.coordinates && (
                      <span>
                        Coords: {alert.coordinates.lat.toFixed(3)}°, {alert.coordinates.lon.toFixed(3)}°
                      </span>
                    )}
                    {alert.confidence && (
                      <span className="text-emerald-400">
                        Confidence: {(alert.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                    {alert.delta_ndvi && (
                      <span className="text-red-400">
                        ΔNDVI: {alert.delta_ndvi.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-1">
                  {alert.status === 'UNREAD' ? (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-mono transition-colors"
                    >
                      Acknowledge
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400/80">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Acked
                    </span>
                  )}

                  {alert.hotspot_id && (
                    <Link
                      href={`/hotspots?id=${alert.hotspot_id}`}
                      className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono transition-colors flex items-center gap-1"
                    >
                      <span>Inspect</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer quick link */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span>Displaying {filteredAlerts.length} alarms</span>
        <span className="text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          VIIRS / Sentinel-2 Stream Synchronized
        </span>
      </div>
    </div>
  );
};
