'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  TreePine,
  Satellite,
  ShieldAlert,
  Layers,
  Calendar,
  Compass,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  MapPin,
  Flame,
  Droplets,
  Activity,
} from 'lucide-react';
import {
  getPublicOverview,
  getPublicDemonstrations,
  getPublicDemonstrationEvents,
  PublicOverview,
  PublicDemonstrationItem,
  PublicChangeEvent,
} from '@/lib/public-api';

// Dynamically import PublicMap to avoid SSR Leaflet window errors
const PublicMap = dynamic(() => import('@/components/public/PublicMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[480px] w-full rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 font-mono text-sm">
      <div className="flex items-center gap-3">
        <Satellite className="w-5 h-5 animate-spin text-emerald-400" />
        <span>Loading Satellite Spatial Canvas...</span>
      </div>
    </div>
  ),
});

export default function PublicDemoPage() {
  const [overview, setOverview] = useState<PublicOverview | null>(null);
  const [demonstrations, setDemonstrations] = useState<PublicDemonstrationItem[]>([]);
  const [activeDemo, setActiveDemo] = useState<PublicDemonstrationItem | null>(null);
  const [events, setEvents] = useState<PublicChangeEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<PublicChangeEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load overview & demonstrations
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [overviewData, demosData] = await Promise.all([
        getPublicOverview(),
        getPublicDemonstrations(),
      ]);

      setOverview(overviewData);
      setDemonstrations(demosData.items);

      if (demosData.items.length > 0) {
        setActiveDemo(demosData.items[0]);
      }
    } catch (err: any) {
      console.error('Failed to load public portal data:', err);
      setError(err.message || 'Unable to connect to telemetry backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Load events when active demo changes
  useEffect(() => {
    if (!activeDemo) return;

    let isSubscribed = true;
    setEventsLoading(true);

    getPublicDemonstrationEvents(activeDemo.id)
      .then((res) => {
        if (isSubscribed) {
          setEvents(res.items);
          setSelectedEvent(res.items.length > 0 ? res.items[0] : null);
        }
      })
      .catch((err) => {
        console.error('Failed to load demo events:', err);
      })
      .finally(() => {
        if (isSubscribed) setEventsLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [activeDemo]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 h-16 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-6 lg:px-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-950/90 border border-emerald-500/60 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-950/40">
            <TreePine className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold tracking-wider text-sm text-white">
                WILDLIFE WATCH
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono">
                PUBLIC DEMO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Multi-Spectral Habitat Telemetry & Change Verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Live Engine Status Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                overview?.system_status === 'operational'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-300">
              {overview?.system_status === 'operational'
                ? 'SATELLITE ENGINE ONLINE'
                : 'CONNECTING...'}
            </span>
          </div>

          <Link
            href="/login"
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            Ranger Sign In
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <div className="font-semibold text-sm">Connection Alert</div>
                <div className="text-xs text-red-300">{error}</div>
              </div>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1.5 rounded-lg bg-red-900 hover:bg-red-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Demonstration Disclaimer Banner (rules.md compliant) */}
        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3.5 text-xs text-emerald-200 shadow-lg">
          <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-mono tracking-wide text-emerald-300 uppercase">
              Scientific Demonstration Standard & Disclaimer:{' '}
            </strong>
            This public portal presents curated satellite telemetry observations computed from
            Sentinel-2 L2A surface reflectance and Google Dynamic World. Priority scores represent
            operational screening heuristics for field patrols, not confirmed ecological outcome or
            causation. Exact incident coordinates are generalized to prevent exposing sensitive wildlife
            nesting receptors.
          </div>
        </div>

        {/* Telemetry Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <div className="text-slate-400 text-xs font-mono uppercase mb-1 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>Monitored Reserves</span>
            </div>
            <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono">
              {overview ? overview.monitored_reserves_count : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Real OpenStreetMap Catalog</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <div className="text-slate-400 text-xs font-mono uppercase mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              <span>Total Area Monitored</span>
            </div>
            <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono">
              {overview ? `${overview.total_monitored_area_km2.toLocaleString()} km²` : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Global Protected Areas</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <div className="text-slate-400 text-xs font-mono uppercase mb-1 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>Detected Change Incidents</span>
            </div>
            <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono">
              {overview ? overview.total_detected_events_count : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Vectorized Polygon Incidents</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <div className="text-slate-400 text-xs font-mono uppercase mb-1 flex items-center gap-1.5">
              <Satellite className="w-3.5 h-3.5 text-cyan-400" />
              <span>Telemetry Resolution</span>
            </div>
            <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono">10m / Pixel</div>
            <div className="text-[11px] text-slate-500 mt-1">Sentinel-2 & Dynamic World</div>
          </div>
        </div>

        {/* Reserve Selector Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2">
              <span>Select Curated Demonstration Reserve</span>
              <span className="text-[10px] text-emerald-400 font-normal px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                100% Real PostGIS Geometry
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {demonstrations.map((demo) => {
              const isSelected = activeDemo?.id === demo.id;
              return (
                <button
                  key={demo.id}
                  onClick={() => setActiveDemo(demo)}
                  className={`p-4 rounded-xl text-left transition-all border ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500/80 shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500/30'
                      : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-white tracking-tight">
                      {demo.area_name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {demo.country}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>{demo.designation}</span>
                    <span className="font-mono text-emerald-400 font-medium">
                      {demo.area_km2.toLocaleString()} km²
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Spatial Workspace */}
        {activeDemo && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map Canvas (2 cols) */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-white font-medium">{activeDemo.area_name}</span>
                  <span>({activeDemo.centroid.lat.toFixed(3)}°N, {activeDemo.centroid.lon.toFixed(3)}°E)</span>
                </div>
                <span>Click markers to inspect change events</span>
              </div>

              <PublicMap
                centroid={activeDemo.centroid}
                boundary={activeDemo.boundary}
                events={events}
                selectedEventId={selectedEvent?.id}
                onSelectEvent={(ev) => setSelectedEvent(ev)}
                height="500px"
              />
            </div>

            {/* Observation Metadata & Metrics Sidebar (1 col) */}
            <div className="space-y-4">
              {/* Observation Window Details */}
              <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
                    Observation Windows
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    Dry-Season Matched
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Baseline Period:
                    </span>
                    <span className="font-mono text-slate-200">
                      {activeDemo.baseline_period.start} → {activeDemo.baseline_period.end}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      Comparison Period:
                    </span>
                    <span className="font-mono text-slate-200">
                      {activeDemo.comparison_period.start} → {activeDemo.comparison_period.end}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">Canopy Loss Candidate:</span>
                    <span className="font-mono text-red-400 font-bold">
                      {activeDemo.vegetation_loss_ha} ha
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">Surface Water Dynamics:</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {activeDemo.water_change_ha} ha
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/90 text-[11px] text-slate-400 leading-relaxed">
                  Observation windows reflect identical seasonal dry months to minimize false
                  phenological alarms in accordance with <code className="text-slate-300 font-mono">rules.md</code>.
                </div>
              </div>

              {/* Selected Event Telemetry Inspector */}
              {selectedEvent ? (
                <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
                      Selected Incident
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        selectedEvent.priority_band === 'CRITICAL'
                          ? 'bg-red-950 text-red-300 border border-red-700'
                          : selectedEvent.priority_band === 'HIGH'
                          ? 'bg-orange-950 text-orange-300 border border-orange-700'
                          : 'bg-yellow-950 text-yellow-300 border border-yellow-700'
                      }`}
                    >
                      {selectedEvent.priority_band} PRIORITY
                    </span>
                  </div>

                  <div className="text-sm font-bold text-white">{selectedEvent.change_label}</div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                      <div className="text-slate-500 text-[10px]">Area</div>
                      <div className="text-slate-200 font-bold">{selectedEvent.affected_area_ha} ha</div>
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                      <div className="text-slate-500 text-[10px]">Priority Score</div>
                      <div className="text-emerald-400 font-bold">
                        {selectedEvent.priority_score?.toFixed(2) ?? '—'}
                      </div>
                    </div>
                  </div>

                  {/* Priority Breakdown Components */}
                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-xs">
                    <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">
                      Score Breakdown Components
                    </div>
                    <div className="flex justify-between text-slate-300 text-[11px]">
                      <span>Magnitude (50%):</span>
                      <span className="font-mono">{selectedEvent.priority_components.magnitude ?? '—'}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 text-[11px]">
                      <span>Zone Sensitivity (30%):</span>
                      <span className="font-mono">{selectedEvent.priority_components.sensitivity ?? '—'}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 text-[11px]">
                      <span>Proximity Context (20%):</span>
                      <span className="font-mono">{selectedEvent.priority_components.context ?? '—'}</span>
                    </div>
                  </div>

                  {/* Road / Settlement Context */}
                  <div className="text-[11px] text-slate-400 space-y-1 border-t border-slate-800 pt-2.5">
                    {selectedEvent.nearest_known_road_distance_m && (
                      <div className="flex justify-between">
                        <span>Nearest Mapped Road:</span>
                        <span className="font-mono text-slate-200">
                          {selectedEvent.nearest_known_road_distance_m} m
                        </span>
                      </div>
                    )}
                    {selectedEvent.nearest_known_settlement_distance_m && (
                      <div className="flex justify-between">
                        <span>Nearest Settlement:</span>
                        <span className="font-mono text-slate-200">
                          {selectedEvent.nearest_known_settlement_distance_m} m
                        </span>
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 pt-1">
                      Source: {selectedEvent.context_source}. Distance indicates nearest known feature;
                      does not prove absence of unmapped footpaths.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800/60 text-center text-xs text-slate-500 font-mono">
                  Select an incident marker from the map or gallery below to inspect evidence breakdown.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Curated Event Gallery (Public View) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Curated Change Detection Incidents
              </h3>
              <p className="text-xs text-slate-400">
                Vectorized incident polygons identified across observation windows with generalized
                locations.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {events.length} Incident{events.length !== 1 ? 's' : ''} Documented
            </span>
          </div>

          {eventsLoading ? (
            <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center font-mono text-xs text-slate-400">
              Loading incident records...
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center font-mono text-xs text-slate-500">
              No change incidents detected in this observation window.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((ev) => {
                const isSelected = selectedEvent?.id === ev.id;
                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                        : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          ev.priority_band === 'CRITICAL'
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : ev.priority_band === 'HIGH'
                            ? 'bg-orange-950 text-orange-300 border border-orange-800'
                            : 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                        }`}
                      >
                        {ev.priority_band}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {ev.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-100 mb-1">{ev.change_label}</div>

                    <div className="flex items-center justify-between text-xs font-mono text-slate-300 my-2 pt-2 border-t border-slate-800/80">
                      <span>Affected: {ev.affected_area_ha} ha</span>
                      <span className="text-emerald-400 font-bold">
                        Score: {ev.priority_score?.toFixed(2) ?? '—'}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Nearest track: {ev.nearest_known_road_distance_m ?? '—'}m</span>
                      <span className="text-slate-500">Generalized Point</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Data Source Registry & Provenance (Transparency Section) */}
        <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                Satellite Telemetry & Ingestion Sources
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Verified provider provenance records matching systemdesign.md and rules.md
              </p>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              OPEN ACCESS / ODbL
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {overview?.data_sources.map((src, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg bg-slate-950/70 border border-slate-800/90 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{src.name}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      src.status === 'operational'
                        ? 'bg-emerald-400'
                        : src.status === 'configured'
                        ? 'bg-blue-400'
                        : 'bg-slate-600'
                    }`}
                  />
                </div>
                <div className="text-[11px] text-slate-400">{src.provider}</div>
                <div className="text-[10px] font-mono text-emerald-400">{src.resolution}</div>
                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                  {src.attribution}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Public Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span>Wildlife Habitat Monitoring Platform • Public Demonstration Portal v1.0</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <Link href="/login" className="hover:text-white transition-colors">
            Analyst & Ranger Portal
          </Link>
          <span>•</span>
          <span>© OpenStreetMap Contributors (ODbL)</span>
        </div>
      </footer>
    </div>
  );
}
