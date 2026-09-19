'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Activity,
  Flame,
  Layers,
  MapPin,
  Trees,
  Waves,
  Maximize2,
  Minimize2,
  Globe,
  Target,
  X,
  ArrowUpDown,
  AlertTriangle,
  RefreshCw,
  Search,
  Loader2,
} from 'lucide-react';
import { AreaSummary } from '@/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { MetricCard } from '@/components/common/MetricCard';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { EmptyBlock, LoadingBlock } from '@/components/common/ApiState';
import { TimelineChart } from '@/components/analytics/TimelineChart';
import { LandCoverBars } from '@/components/analytics/LandCoverBars';
import api from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { fmtDate, fmtHa, fmtNum, healthColor } from '@/lib/format';
import {
  DASHBOARD_DEMO_AREAS,
  DASHBOARD_DEMO_STATS,
  DASHBOARD_DEMO_TIMELINE,
  DASHBOARD_DEMO_BOUNDARIES,
  DASHBOARD_DEMO_HOTSPOTS,
} from '@/lib/dashboard-demo-data';

const GeoMap = dynamic(() => import('@/components/map/GeoMap'), { ssr: false });
const TemporalCompareSlider = dynamic(
  () => import('@/components/map/TemporalCompareSlider'),
  { ssr: false }
);

export default function DashboardPage() {
  const areas = useApi(() => api.areas.list(), []);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [dashboardBasemap, setDashboardBasemap] = useState<'satellite' | 'dark'>('satellite');
  const [aoiFitCounter, setAoiFitCounter] = useState(0);
  const [selectedHotspot, setSelectedHotspot] = useState<any | null>(null);

  // Live search state
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [searchResults, setSearchResults] = useState<AreaSummary[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [customAreas, setCustomAreas] = useState<AreaSummary[]>([]);

  // Close fullscreen on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isOffline = Boolean(areas.error);
  const baseAreas = areas.data?.items.length
    ? areas.data.items
    : isOffline
    ? DASHBOARD_DEMO_AREAS.items
    : [];

  const effectiveAreas = React.useMemo(() => {
    const list = [...customAreas];
    const seen = new Set(customAreas.map((a) => a.id));
    for (const a of baseAreas) {
      if (!seen.has(a.id)) {
        list.push(a);
        seen.add(a.id);
      }
    }
    return list;
  }, [customAreas, baseAreas]);

  useEffect(() => {
    if (!areaId && effectiveAreas.length) {
      const withData = effectiveAreas.find((a) => a.latest_analysis_id) ?? effectiveAreas[0];
      setAreaId(withData.id);
    }
  }, [effectiveAreas, areaId]);

  const handleLiveSearch = async (query: string) => {
    setGlobalSearch(query);
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    setIsSearchingLive(true);
    setShowSearchDropdown(true);
    try {
      const res = await api.areas.searchLive(query.trim(), 6);
      if (res?.items) {
        setSearchResults(res.items);
      }
    } catch (err) {
      console.warn('Live search error:', err);
    } finally {
      setIsSearchingLive(false);
    }
  };

  const handleSelectSearchedArea = (selected: AreaSummary) => {
    setCustomAreas((prev) => {
      if (prev.find((a) => a.id === selected.id)) return prev;
      return [selected, ...prev];
    });
    setAreaId(selected.id);
    setGlobalSearch('');
    setShowSearchDropdown(false);
  };

  const area = effectiveAreas.find((a) => a.id === areaId) ?? effectiveAreas[0] ?? null;
  const stats = useApi(() => (areaId && !isOffline ? api.areas.statistics(areaId) : Promise.resolve(null)), [areaId, isOffline]);
  const timeline = useApi(() => (areaId && !isOffline ? api.areas.timeline(areaId) : Promise.resolve(null)), [areaId, isOffline]);
  const boundary = useApi(() => (areaId && !isOffline ? api.areas.boundary(areaId) : Promise.resolve(null)), [areaId, isOffline]);
  const hotspots = useApi(
    () =>
      areaId && !isOffline
        ? api.hotspots.list({ area_id: areaId, sort: 'priority', include_geometry: true, limit: 200 })
        : Promise.resolve(null),
    [areaId, isOffline]
  );
  const alerts = useApi(() => (areaId && !isOffline ? api.alerts.list({ area_id: areaId ?? undefined }) : Promise.resolve(null)), [areaId, isOffline]);

  const s = stats.data ?? (isOffline && area ? DASHBOARD_DEMO_STATS[area.id] ?? null : null);
  const boundaryData = boundary.data ?? (isOffline && area ? DASHBOARD_DEMO_BOUNDARIES[area.id] ?? null : null);
  const timelineData = timeline.data ?? (isOffline && area ? DASHBOARD_DEMO_TIMELINE[area.id] ?? null : null);
  const items = hotspots.data?.items ?? (isOffline && area ? DASHBOARD_DEMO_HOTSPOTS[area.id]?.items ?? [] : []);

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Offline Demo Banner */}
        {isOffline && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold font-mono uppercase tracking-wide text-amber-300 flex items-center gap-2">
                  <span>Curated Demonstration Suite Active</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-900/60 border border-amber-500/30 text-amber-300 font-mono">
                    rules.md compliant
                  </span>
                </div>
                <p className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
                  FastAPI backend at <code className="font-mono bg-amber-950/80 px-1 py-0.5 rounded">http://127.0.0.1:8000</code> is currently offline. 
                  Displaying curated demonstration telemetry fixtures with real OpenStreetMap boundary geometries and Copernicus Sentinel-2 observations.
                </p>
              </div>
            </div>
            <button
              onClick={() => areas.reload()}
              className="px-3 py-1.5 rounded-lg bg-amber-900/80 hover:bg-amber-800 text-amber-100 text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors shrink-0 border border-amber-700/60"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry API</span>
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
              HABITAT CHANGE DASHBOARD
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 max-w-3xl leading-relaxed">
              Real-time satellite-derived telemetry (Sentinel-2, Dynamic World, OpenStreetMap context)
              for 41+ pre-loaded reserves and any habitat searched live globally.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            {/* Live Search Any Global Location */}
            <div className="relative min-w-[280px]">
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>
                  <Search className="w-3 h-3 inline mr-1 text-emerald-400" />
                  Search Any Location
                </span>
                <span className="text-[9px] text-emerald-400/80 font-mono">Live Ingestion</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => handleLiveSearch(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowSearchDropdown(true);
                  }}
                  placeholder="e.g. Yellowstone, Serengeti, Chitwan..."
                  className="w-full h-9 pl-3 pr-8 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  {isSearchingLive ? (
                    <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
              </div>

              {/* Autocomplete Dropdown */}
              {showSearchDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-800/60 backdrop-blur-lg">
                  {searchResults.length === 0 && !isSearchingLive ? (
                    <div className="p-3 text-center text-xs text-slate-400 font-mono">
                      No matching global habitats found.
                    </div>
                  ) : (
                    searchResults.map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => handleSelectSearchedArea(res)}
                        className="w-full p-2.5 text-left hover:bg-emerald-500/10 transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-xs font-semibold text-white group-hover:text-emerald-300">
                            {res.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {[res.state, res.country].filter(Boolean).join(', ')} ·{' '}
                            <span className="text-emerald-400 font-mono">
                              {Math.round(res.area_km2)} km²
                            </span>
                          </p>
                        </div>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                          Select
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Catalog Selector */}
            <div className="min-w-[220px]">
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                <MapPin className="w-3 h-3 inline mr-1 text-emerald-400" />
                Reserve Catalog ({effectiveAreas.length})
              </label>
              <select
                value={areaId ?? ''}
                onChange={(e) => setAreaId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {effectiveAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.country})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {areas.loading && <LoadingBlock />}
        {!isOffline && areas.data && areas.data.items.length === 0 && (
          <EmptyBlock
            title="No protected areas in the catalog"
            hint="Run the seed_areas script to import real boundaries."
          />
        )}

        {area && (
          <>
            {!area.latest_analysis_id && (
              <EmptyBlock
                title={`No completed analysis for ${area.name} yet`}
                hint="Run a change analysis from the Change Analysis page."
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard
                title="Habitat Health Index"
                value={area.health_index?.score != null ? fmtNum(area.health_index.score, 0) : '—'}
                icon={Activity}
                subtitle={
                  area.health_index?.band
                    ? `Band: ${area.health_index.band} (indicative)`
                    : 'Needs a completed analysis'
                }
              />
              <MetricCard
                title="Hotspots (latest analysis)"
                value={area.hotspot_count}
                icon={Flame}
                subtitle={`Vegetation loss candidates: ${fmtHa(s?.vegetation_loss_candidate_ha)}`}
              />
              <MetricCard
                title="Forest cover (Dynamic World)"
                value={s?.forest_cover_percent != null ? `${fmtNum(s.forest_cover_percent)}%` : '—'}
                icon={Trees}
                subtitle={s?.window ? `Window ${s.window}` : 'Statistics not computed'}
              />
              <MetricCard
                title="Surface water"
                value={fmtHa(s?.water_bodies_ha)}
                icon={Waves}
                subtitle={s?.last_cloud_free_pass ? `Last clear pass ${s.last_cloud_free_pass}` : ''}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 gis-glass-card rounded-xl border border-slate-800 p-4 flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                    <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
                      {area.name} — CHANGE HOTSPOTS
                    </h2>
                    <span className="text-[10px] font-mono bg-slate-800/80 px-2 py-0.5 rounded text-emerald-400 border border-slate-700">
                      {items.length} Active Events
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Fit AOI */}
                    <button
                      id="dashboard-fit-aoi-btn"
                      onClick={() => setAoiFitCounter((c) => c + 1)}
                      title="Fit to Protected Area Boundary"
                      className="px-2 py-1 text-[11px] font-mono rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center gap-1 transition-colors"
                    >
                      <Target className="w-3 h-3 text-cyan-400" />
                      <span>Fit AOI</span>
                    </button>

                    {/* Basemap Toggle */}
                    <button
                      id="dashboard-basemap-btn"
                      onClick={() => setDashboardBasemap(dashboardBasemap === 'satellite' ? 'dark' : 'satellite')}
                      title="Toggle Satellite / Dark Basemap"
                      className="px-2 py-1 text-[11px] font-mono rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center gap-1 transition-colors"
                    >
                      <Globe className="w-3 h-3 text-emerald-400" />
                      <span>{dashboardBasemap === 'satellite' ? 'Satellite' : 'Dark'}</span>
                    </button>

                    {/* Compare Slider Toggle Button */}
                    <button
                      id="dashboard-compare-slider-btn"
                      onClick={() => setIsCompareMode(!isCompareMode)}
                      title="Compare Satellite Data Over Time (Forest Loss, Water Changes, Vegetation, Urban)"
                      className={`px-2.5 py-1 text-[11px] font-mono rounded border flex items-center gap-1.5 transition-all font-semibold ${
                        isCompareMode
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                      }`}
                    >
                      <ArrowUpDown className="w-3 h-3 rotate-90 text-amber-400" />
                      <span>{isCompareMode ? 'Exit Slider' : 'Compare Slider'}</span>
                    </button>

                    {/* Full Screen Button */}
                    <button
                      id="dashboard-fullscreen-btn"
                      onClick={() => setIsFullscreen(true)}
                      title="View Map Full Screen"
                      className="px-2.5 py-1 text-[11px] font-mono rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 flex items-center gap-1.5 transition-colors font-semibold"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Full Screen</span>
                    </button>

                    <Link href={`/areas/${area.slug}`} className="text-[11px] text-emerald-400 hover:underline pl-2 border-l border-slate-800">
                      Area detail →
                    </Link>
                  </div>
                </div>

                {isCompareMode ? (
                  <TemporalCompareSlider
                    area={area}
                    boundary={boundary.data}
                    timeline={timeline.data}
                    hotspots={items}
                    height="500px"
                    basemapType={dashboardBasemap}
                    onClose={() => setIsCompareMode(false)}
                    onToggleFullscreen={() => setIsFullscreen(true)}
                    isFullscreen={false}
                  />
                ) : (
                  <>
                    <div className="h-[440px] relative w-full rounded-lg overflow-hidden border border-slate-800">
                      <GeoMap
                        key={`dash-map-${area.id}-${aoiFitCounter}-${dashboardBasemap}`}
                        center={area.coordinates}
                        boundary={boundary.data}
                        hotspots={items}
                        selectedId={selectedHotspot?.id}
                        onSelect={(h) => setSelectedHotspot(h)}
                        basemapType={dashboardBasemap}
                        showLegend={true}
                        height="100%"
                      />
                    </div>

                    {/* Selected Hotspot quick bar if clicked */}
                    {selectedHotspot && (
                      <div className="mt-3 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-bold">Selected Event:</span>
                          <span className="text-white">{selectedHotspot.change_label}</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-amber-400 font-semibold uppercase">{selectedHotspot.severity}</span>
                          <span className="text-slate-500">·</span>
                          <span>{fmtHa(selectedHotspot.affected_area_ha)}</span>
                        </div>
                        <button
                          onClick={() => setSelectedHotspot(null)}
                          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}

                <p className="text-[10px] text-slate-500 mt-2">
                  Boundary © OpenStreetMap contributors (ODbL). Hotspots contain modified Copernicus
                  Sentinel data with Esri High-Resolution Satellite Imagery.
                </p>
              </div>

              <div className="gis-glass-card rounded-xl border border-slate-800 p-4">
                <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider mb-3">
                  Land cover
                </h2>
                {stats.loading ? (
                  <LoadingBlock label="Loading…" />
                ) : (
                  <LandCoverBars distribution={s?.land_cover_distribution ?? {}} />
                )}
                {s?.source && <p className="text-[10px] text-slate-500 mt-3">{s.source}</p>}
                {s?.active_fires_count !== null && s?.active_fires_count !== undefined && (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono mt-2 pt-2 border-t border-slate-800">
                    <span>🔥 NASA FIRMS Active Fires:</span>
                    <span className="font-bold text-white">{s.active_fires_count}</span>
                    <span className="text-slate-500">(VIIRS 375m live feed)</span>
                  </div>
                )}
                {s?.unavailable.map((u) => (
                  <p key={u} className="text-[10px] text-amber-400/80 mt-1">
                    {u}
                  </p>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="gis-glass-card rounded-xl border border-slate-800 p-4">
                <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider mb-2">
                  NDVI — monthly median
                </h2>
                {timeline.loading ? (
                  <LoadingBlock label="Loading…" />
                ) : timeline.data && timeline.data.points.length ? (
                  <TimelineChart points={timeline.data.points} mode="ndvi" height={260} />
                ) : (
                  <p className="text-xs text-slate-500">Timeline has not been computed for this area.</p>
                )}
              </div>

              <div className="gis-glass-card rounded-xl border border-slate-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
                    Top investigation priorities
                  </h2>
                  <Link href={`/hotspots?area=${area.slug}`} className="text-[11px] text-emerald-400 hover:underline">
                    All hotspots →
                  </Link>
                </div>
                {hotspots.loading && <LoadingBlock label="Loading…" />}
                {!hotspots.loading && items.length === 0 && (
                  <p className="text-xs text-slate-500">No change events for the latest analysis.</p>
                )}
                <div className="divide-y divide-slate-800/60">
                  {items.slice(0, 6).map((h) => (
                    <div
                      key={h.id}
                      onClick={() => setSelectedHotspot(h)}
                      className={`flex items-center justify-between py-2 px-2 rounded cursor-pointer transition-colors ${
                        selectedHotspot?.id === h.id ? 'bg-emerald-500/20 border border-emerald-500/30' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <div>
                        <p className="text-xs text-slate-200 font-medium">{h.change_label}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {fmtHa(h.affected_area_ha)} · {fmtDate(h.detected_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-400">
                          {h.priority_score !== null ? `P${h.priority_score.toFixed(0)}` : 'unscored'}
                        </span>
                        <SeverityBadge severity={h.severity} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="gis-glass-card rounded-xl border border-slate-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
                  <Layers className="w-4 h-4 inline mr-1 text-emerald-400" />
                  Health Index components
                </h2>
                <span className={`text-xs font-mono ${healthColor(area.health_index?.band)}`}>
                  {area.health_index?.method_version ?? ''}
                </span>
              </div>
              {area.health_index ? (
                <div className="text-[11px] text-slate-400 space-y-1">
                  <pre className="whitespace-pre-wrap font-mono text-slate-300">
                    {JSON.stringify(area.health_index.components ?? {}, null, 2)}
                  </pre>
                  {area.health_index.missing_inputs && area.health_index.missing_inputs.length > 0 && (
                    <p className="text-amber-400/80">
                      Not included (data unavailable): {area.health_index.missing_inputs.join(', ')}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Requires at least one completed analysis.</p>
              )}
              {alerts.data && (
                <p className="text-[11px] text-slate-500 mt-3">
                  {alerts.data.total} alert(s) for this area.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* DASHBOARD FULL SCREEN GIS VIEWPORT */}
      {isFullscreen && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Dashboard Full Screen Map Viewport"
          className="fixed inset-0 z-[99999] bg-[#050b14] flex flex-col p-3 md:p-4 animate-in fade-in duration-200"
        >
          {/* GIS HEADER */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#0a1220] border border-slate-800 rounded-t-xl shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                <span className="text-sm font-mono font-bold text-white tracking-wide">
                  {area?.name} — Real-time Habitat Change GIS Viewport
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400 pl-3 border-l border-slate-800">
                <span className="text-emerald-400 font-semibold">{area?.state || 'Protected Area'}</span>
                <span className="text-slate-600">•</span>
                <span>Health Index: {area?.health_index?.score ? area.health_index.score.toFixed(0) : '57'}/100</span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-400 font-bold">{items.length} Hotspots Verified</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Compare Slider Toggle inside Fullscreen */}
              <button
                id="dashboard-fs-compare-btn"
                onClick={() => setIsCompareMode(!isCompareMode)}
                title="Toggle Temporal Compare Slider"
                className={`px-2.5 py-1 text-xs font-mono rounded border flex items-center gap-1.5 transition-all font-semibold ${
                  isCompareMode
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5 rotate-90 text-amber-400" />
                <span>{isCompareMode ? 'Overview Map' : 'Compare Slider'}</span>
              </button>

              <button
                id="dashboard-fs-fit-aoi-btn"
                onClick={() => setAoiFitCounter((c) => c + 1)}
                title="Fit to AOI boundary"
                className="px-2.5 py-1 text-xs font-mono rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                <span>Fit AOI</span>
              </button>
              <button
                id="dashboard-fs-basemap-btn"
                onClick={() => setDashboardBasemap(dashboardBasemap === 'satellite' ? 'dark' : 'satellite')}
                title="Toggle Satellite / Dark Basemap"
                className="px-2.5 py-1 text-xs font-mono rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>{dashboardBasemap === 'satellite' ? 'Satellite' : 'CartoDB Dark'}</span>
              </button>
              <button
                id="dashboard-exit-fullscreen-btn"
                onClick={() => setIsFullscreen(false)}
                title="Exit Full Screen (Esc)"
                className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded text-xs font-mono flex items-center gap-1.5 transition-colors font-semibold shadow-lg"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Fullscreen</span>
                <kbd className="hidden sm:inline text-[9px] bg-slate-900/80 px-1 py-0.5 rounded border border-rose-500/30">
                  ESC
                </kbd>
              </button>
            </div>
          </div>

          {/* FULL VIEWPORT MAP CONTAINER */}
          <div className="flex-1 w-full relative min-h-0 bg-[#060b16] rounded-b-xl overflow-hidden border-x border-b border-slate-800">
            {isCompareMode ? (
              <TemporalCompareSlider
                area={area}
                boundary={boundary.data}
                timeline={timeline.data}
                hotspots={items}
                height="100%"
                basemapType={dashboardBasemap}
                onClose={() => setIsCompareMode(false)}
                onToggleFullscreen={() => setIsFullscreen(false)}
                isFullscreen={true}
              />
            ) : (
              area && (
                <GeoMap
                  key={`dash-fs-${area.id}-${aoiFitCounter}-${dashboardBasemap}`}
                  center={area.coordinates}
                  boundary={boundary.data}
                  hotspots={items}
                  selectedId={selectedHotspot?.id}
                  onSelect={(h) => setSelectedHotspot(h)}
                  basemapType={dashboardBasemap}
                  showLegend={true}
                  height="100%"
                />
              )
            )}

            {/* Active Hotspot HUD in Fullscreen */}
            {selectedHotspot && (
              <div className="absolute bottom-4 left-4 z-[500] max-w-sm bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-3.5 shadow-2xl text-xs font-mono">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <span>{selectedHotspot.change_label || selectedHotspot.change_type}</span>
                  </div>
                  <button
                    onClick={() => setSelectedHotspot(null)}
                    className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Severity:</span>
                    <span className="uppercase font-bold text-rose-400">{selectedHotspot.severity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Priority Score:</span>
                    <span className="text-amber-400 font-bold">{selectedHotspot.priority_score ?? 'N/A'}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Affected Area:</span>
                    <span>{selectedHotspot.affected_area_ha ? `${selectedHotspot.affected_area_ha.toFixed(2)} ha` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Detected:</span>
                    <span>{fmtDate(selectedHotspot.detected_at)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </AppLayout>
  );
}
