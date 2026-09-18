'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { KPICards } from '@/components/dashboard/KPICards';
import { DashboardMap } from '@/components/dashboard/DashboardMap';
import { DashboardAlerts } from '@/components/dashboard/DashboardAlerts';
import { LandCoverChart } from '@/components/dashboard/LandCoverChart';
import { ChangeDetectionPreview } from '@/components/dashboard/ChangeDetectionPreview';
import { PhenologyChart } from '@/components/analytics/PhenologyChart';
import { MOCK_AREAS, MOCK_TIMELINE } from '@/lib/mock-data';
import { ProtectedArea, TimelineDataPoint } from '@/types';
import { apiClient } from '@/lib/api-client';
import {
  Search,
  Calendar,
  Compass,
  Layers,
  Download,
  RefreshCw,
  Globe,
  MapPin,
  TrendingUp,
  Activity,
  SlidersHorizontal,
  ChevronDown,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  // State for reserves list and dynamic timeline
  const [areas, setAreas] = useState<ProtectedArea[]>(MOCK_AREAS);
  const [timelineData, setTimelineData] = useState<TimelineDataPoint[]>(MOCK_TIMELINE);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);

  // State for selected protected reserve
  const [selectedAreaId, setSelectedAreaId] = useState<string>('area-5'); // Default to Virunga National Park
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // State for date range selector
  const [dateRangePreset, setDateRangePreset] = useState<'30d' | '90d' | 'ytd' | 'baseline'>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State for vegetation trend chart mode
  const [chartMode, setChartMode] = useState<'ndvi' | 'water' | 'loss'>('ndvi');

  // Load areas and backend health on mount
  useEffect(() => {
    let isMounted = true;
    apiClient.getAreas().then((fetched) => {
      if (isMounted && fetched && fetched.length > 0) {
        setAreas(fetched);
      }
    });
    apiClient.checkHealth().then((h) => {
      if (isMounted) setIsBackendOnline(h.isOnline);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Update timeline when selected reserve changes
  useEffect(() => {
    let isMounted = true;
    apiClient.getAreaTimeline(selectedAreaId).then((tl) => {
      if (isMounted && tl && tl.length > 0) {
        setTimelineData(tl);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedAreaId]);

  // Find active selected area
  const selectedArea: ProtectedArea =
    areas.find((a) => a.id === selectedAreaId) || areas[0] || MOCK_AREAS[0];

  // Filtered areas for search
  const filteredAreas = areas.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.biome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [fetchedAreas, fetchedTl, health] = await Promise.all([
        apiClient.getAreas(),
        apiClient.getAreaTimeline(selectedAreaId),
        apiClient.checkHealth(),
      ]);
      if (fetchedAreas && fetchedAreas.length > 0) setAreas(fetchedAreas);
      if (fetchedTl && fetchedTl.length > 0) setTimelineData(fetchedTl);
      setIsBackendOnline(health.isOnline);
    } catch {
      // fallback preserved
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* ========================================================================= */}
        {/* SECTION 1: HEADER (Command Briefing & Operational Status) */}
        {/* ========================================================================= */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
                WILDLIFE HABITAT SURVEILLANCE
              </h1>
              <span className="px-2.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 font-mono text-[11px] font-semibold flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                COPERNICUS NRT ACTIVE
              </span>
              {isBackendOnline !== null && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded font-mono text-[10px] flex items-center gap-1 border',
                    isBackendOnline
                      ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', isBackendOnline ? 'bg-emerald-400' : 'bg-amber-400')} />
                  {isBackendOnline ? 'FASTAPI: CONNECTED' : 'OFFLINE FALLBACK'}
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[10px]">
                REVISIT: 5 DAYS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 max-w-3xl leading-relaxed">
              Automated multi-spectral change detection platform monitoring canopy dynamics, water fluctuation, and anthropogenic encroachment across global biodiversity hotspots.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Poll latest Sentinel-2 L2A & VIIRS passes"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 text-emerald-400', isRefreshing && 'animate-spin')} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Telemetry'}</span>
            </button>

            <Link
              href={`/reports?areaId=${selectedArea.id}`}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export Dossier</span>
            </Link>

            <Link
              href="/explore"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-950/50"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Tactical Map</span>
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTIONS 2 & 3: LOCATION SEARCH & DATE RANGE SELECTOR BAR */}
        {/* ========================================================================= */}
        <div className="gis-glass-card rounded-xl p-4 border border-slate-800/90 shadow-lg grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* SECTION 2: Location Search */}
          <div className="md:col-span-7 relative">
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>Select Monitored Habitat / Protected Reserve:</span>
            </label>

            <div className="relative">
              <div className="flex items-center gap-2">
                {/* Active Reserve Button / Selector */}
                <div className="relative flex-1">
                  <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs">
                    <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search reserve by name, country or biome..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsSearchOpen(true);
                      }}
                      onFocus={() => setIsSearchOpen(true)}
                      className="bg-transparent border-none outline-none text-white placeholder:text-slate-500 w-full text-xs font-sans"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-slate-400 hover:text-white text-xs px-1"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Dropdown Suggestions */}
                  {isSearchOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setIsSearchOpen(false)}
                      />
                      <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-40 max-h-64 overflow-y-auto divide-y divide-slate-800">
                        {filteredAreas.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 font-mono text-center">
                            No reserves matching &ldquo;{searchQuery}&rdquo;
                          </div>
                        ) : (
                          filteredAreas.map((area) => (
                            <button
                              key={area.id}
                              onClick={() => {
                                setSelectedAreaId(area.id);
                                setSearchQuery('');
                                setIsSearchOpen(false);
                              }}
                              className={cn(
                                'w-full text-left p-3 hover:bg-slate-800/80 transition-colors flex items-start justify-between gap-3',
                                area.id === selectedArea.id && 'bg-emerald-950/30 border-l-2 border-emerald-500'
                              )}
                            >
                              <div>
                                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                                  <span>{area.name}</span>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    ({area.country})
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 font-sans">
                                  {area.biome}
                                </div>
                              </div>
                              <div className="text-right shrink-0 font-mono text-[10px]">
                                <div className="text-emerald-400 font-bold">
                                  {area.forest_cover_percent}% Cover
                                </div>
                                <div className="text-slate-500">
                                  {area.total_hectares.toLocaleString()} ha
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Quick Quick-Select Pill for Current Reserve */}
                <div className="hidden sm:flex items-center px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono shrink-0">
                  <Globe className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                  <span className="font-semibold">{selectedArea.name}</span>
                  <span className="text-emerald-500/70 ml-1.5 text-[10px]">
                    [{selectedArea.coordinates.lat.toFixed(2)}°, {selectedArea.coordinates.lon.toFixed(2)}°]
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Date Range Selector */}
          <div className="md:col-span-5">
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-400" />
              <span>Observation & Comparison Period:</span>
            </label>

            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setDateRangePreset('30d')}
                className={cn(
                  'flex-1 py-1.5 px-2 rounded text-center transition-colors text-[11px]',
                  dateRangePreset === '30d'
                    ? 'bg-slate-800 text-white font-semibold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setDateRangePreset('90d')}
                className={cn(
                  'flex-1 py-1.5 px-2 rounded text-center transition-colors text-[11px]',
                  dateRangePreset === '90d'
                    ? 'bg-slate-800 text-white font-semibold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                Quarter
              </button>
              <button
                onClick={() => setDateRangePreset('ytd')}
                className={cn(
                  'flex-1 py-1.5 px-2 rounded text-center transition-colors text-[11px]',
                  dateRangePreset === 'ytd'
                    ? 'bg-slate-800 text-white font-semibold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                2026 YTD
              </button>
              <button
                onClick={() => setDateRangePreset('baseline')}
                className={cn(
                  'flex-1 py-1.5 px-2 rounded text-center transition-colors text-[11px]',
                  dateRangePreset === 'baseline'
                    ? 'bg-emerald-900/60 text-emerald-300 font-semibold shadow border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                5-Yr Base
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4: KPI CARDS (Forest Cover, Water Bodies, Urban, Habitat Change) */}
        {/* ========================================================================= */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="uppercase tracking-wider">Telemetry Core Metrics ({selectedArea.name})</span>
            <span>Sensor Source: Sentinel-2 L2A BOA Reflectance</span>
          </div>
          <KPICards />
        </div>

        {/* ========================================================================= */}
        {/* SECTIONS 5 & 6: MAIN SATELLITE MAP & MAP LAYER CONTROLS */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Tactical Multi-Spectral Geospatial View</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Interactive Mapbox GL JS engine • Centered on {selectedArea.name} ({selectedArea.wdpa_id})
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
              <span>Resolution: 10m Sentinel / 375m VIIRS</span>
            </div>
          </div>

          {/* Interactive Map with embedded Layer controls, Zoom, Satellite toggle & Legend */}
          <DashboardMap selectedArea={selectedArea} />
        </div>

        {/* ========================================================================= */}
        {/* SECTIONS 7, 8 & 9: RECENT ALERTS, VEGETATION TREND CHART & LAND COVER */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* SECTION 7: Recent Alerts (Critical, High, Medium, Information) */}
          <div className="lg:col-span-5 flex flex-col">
            <DashboardAlerts />
          </div>

          {/* SECTIONS 8 & 9: Analytics (Vegetation Trend Chart & Land-Cover Distribution) */}
          <div className="lg:col-span-7 space-y-6">
            {/* SECTION 8: Vegetation Trend Chart (NDVI Seasonality vs 5-Yr Baseline) */}
            <div className="gis-glass-card rounded-xl p-5 border border-slate-800 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-2">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Vegetation Phenology & Time-Series Trend
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Trailing 12-month Sentinel-2 NDVI trajectory vs historical multi-year baseline
                  </p>
                </div>

                {/* Metric Mode Switcher */}
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 self-start sm:self-auto">
                  <button
                    onClick={() => setChartMode('ndvi')}
                    className={cn(
                      'px-2.5 py-1 rounded text-xs font-mono transition-colors',
                      chartMode === 'ndvi'
                        ? 'bg-slate-800 text-emerald-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    NDVI Index
                  </button>
                  <button
                    onClick={() => setChartMode('water')}
                    className={cn(
                      'px-2.5 py-1 rounded text-xs font-mono transition-colors',
                      chartMode === 'water'
                        ? 'bg-slate-800 text-cyan-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    Water (ha)
                  </button>
                  <button
                    onClick={() => setChartMode('loss')}
                    className={cn(
                      'px-2.5 py-1 rounded text-xs font-mono transition-colors',
                      chartMode === 'loss'
                        ? 'bg-slate-800 text-red-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    Loss / Fires
                  </button>
                </div>
              </div>

              {/* Phenology Chart */}
              <PhenologyChart data={timelineData} mode={chartMode} />

              <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-0.5 bg-emerald-400" />
                    Observed 2026 Cycle
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2.5 h-0.5 bg-slate-500 border-t border-dashed" />
                    5-Yr Historical Median
                  </span>
                </div>
                <Link
                  href="/timeline"
                  className="text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Extended Multi-Decadal Trends</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* SECTION 9: Land-Cover Distribution Chart */}
            <LandCoverChart />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 10: CHANGE DETECTION PREVIEW (Dual-Epoch Comparison) */}
        {/* ========================================================================= */}
        <div>
          <ChangeDetectionPreview selectedArea={selectedArea} />
        </div>
      </div>
    </AppLayout>
  );
}
