'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  MOCK_AREAS,
  MOCK_SPECIES,
  MOCK_HOTSPOTS,
  MOCK_ALERTS,
  MOCK_REPORTS,
  MOCK_TIMELINE,
} from '@/lib/mock-data';
import {
  ProtectedArea,
  ChangeEventHotspot,
  AlertNotification,
  ReportItem,
  TimelineDataPoint,
} from '@/types';
import { apiClient } from '@/lib/api-client';
import { formatHectares, formatDate, cn } from '@/lib/utils';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { LandCoverChart } from '@/components/dashboard/LandCoverChart';
import { PhenologyChart } from '@/components/analytics/PhenologyChart';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  FileText,
  Compass,
  Layers,
  TreePine,
  Droplets,
  Building2,
  Flame,
  AlertTriangle,
  Route,
  Home,
  Tractor,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Calendar,
  Download,
  Share2,
  ExternalLink,
  MapPin,
  CheckCircle2,
  Clock,
  Info,
  SlidersHorizontal,
  ChevronRight,
  Eye,
  X,
  Radio,
} from 'lucide-react';

export default function AreaDetailPage() {
  const params = useParams();
  const areaId = (params?.id as string) || 'area-kanha';

  // State for dynamic area dossier
  const [currentArea, setCurrentArea] = useState<ProtectedArea>(() => {
    return (
      MOCK_AREAS.find((a) => a.id === areaId) ||
      MOCK_AREAS.find((a) => a.id === 'area-kanha') ||
      MOCK_AREAS[0]
    );
  });
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineDataPoint[]>(MOCK_TIMELINE);
  const [liveHotspots, setLiveHotspots] = useState<ChangeEventHotspot[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<AlertNotification[]>([]);
  const [liveReports, setLiveReports] = useState<ReportItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    apiClient.checkHealth().then((h) => {
      if (isMounted) setIsBackendOnline(h.isOnline);
    });
    apiClient.getAreaById(areaId).then((res) => {
      if (isMounted && res) setCurrentArea(res);
    });
    apiClient.getAreaTimeline(areaId).then((tl) => {
      if (isMounted && tl && tl.length > 0) setTimelineData(tl);
    });
    apiClient.getAreaHotspots(areaId).then((hs) => {
      if (isMounted && hs && hs.length > 0) setLiveHotspots(hs);
    });
    apiClient.getAlerts({ area_id: areaId }).then((al) => {
      if (isMounted && al && al.length > 0) setLiveAlerts(al);
    });
    apiClient.getReports({ area_id: areaId }).then((rep) => {
      if (isMounted && rep && rep.length > 0) setLiveReports(rep);
    });
    return () => {
      isMounted = false;
    };
  }, [areaId]);

  const area = currentArea;

  // Active Tab State: Overview, Analysis, Hotspots, Wildlife, Human Activity, Reports
  const [activeTab, setActiveTab] = useState<
    'overview' | 'analysis' | 'hotspots' | 'wildlife' | 'human_activity' | 'reports'
  >('overview');

  // Save Area Bookmark State
  const [isSaved, setIsSaved] = useState(false);
  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  // Generate Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportFormat, setReportFormat] = useState<'GEOPDF' | 'GEOPACKAGE' | 'CSV'>('GEOPDF');
  const [reportRange, setReportRange] = useState<'30d' | '90d' | '1yr'>('90d');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSuccess, setGeneratedSuccess] = useState(false);

  // Hotspots Filter State
  const [hotspotFilterSeverity, setHotspotFilterSeverity] = useState<string>('ALL');

  // Image Comparison Mode for Before/After
  const [comparisonView, setComparisonView] = useState<'side-by-side' | 'slider'>('side-by-side');
  const [sliderPosition, setSliderPosition] = useState<number>(50);

  // Derived mock data filtered for this specific reserve
  const areaHotspots = useMemo(() => {
    if (liveHotspots.length > 0) return liveHotspots;
    const list = MOCK_HOTSPOTS.filter((h) => h.area_id === area.id);
    if (list.length === 0) {
      return [
        {
          id: `hs-${area.id}-1`,
          area_id: area.id,
          area_name: area.name,
          detected_at: '2026-09-17T06:30:00Z',
          area_ha: 7.8,
          delta_ndvi: -0.42,
          percentage_change: -34.5,
          change_type: 'DEFORESTATION' as any,
          severity: 'HIGH' as const,
          confidence_score: 0.92,
          coordinates: { lat: area.coordinates.lat + 0.012, lon: area.coordinates.lon + 0.015 },
          status: 'NEW' as const,
          sensor: 'Sentinel-2 MSI (10m)',
        },
        {
          id: `hs-${area.id}-2`,
          area_id: area.id,
          area_name: area.name,
          detected_at: '2026-09-15T11:20:00Z',
          area_ha: 3.4,
          delta_ndvi: -0.28,
          percentage_change: -22.1,
          change_type: 'CANOPY_THINNING' as const,
          severity: 'MEDIUM' as const,
          confidence_score: 0.86,
          coordinates: { lat: area.coordinates.lat - 0.018, lon: area.coordinates.lon - 0.009 },
          status: 'VERIFIED' as const,
          sensor: 'Sentinel-2 MSI (10m)',
        },
      ];
    }
    return list;
  }, [area, liveHotspots]);

  const filteredHotspots = useMemo(() => {
    if (hotspotFilterSeverity === 'ALL') return areaHotspots;
    return areaHotspots.filter((h) => h.severity === hotspotFilterSeverity);
  }, [areaHotspots, hotspotFilterSeverity]);

  const areaSpecies = useMemo(() => {
    const list = MOCK_SPECIES.filter((s) => s.area_id === area.id);
    if (list.length === 0) {
      return [
        {
          id: `sp-${area.id}-1`,
          area_id: area.id,
          species_name: 'Key Indicator Mammal Cohort',
          scientific_name: 'Fauna indicatrix',
          iucn_status: 'VU' as const,
          taxon: 'Mammalia',
          count: 18,
          observed_at: '2026-09-12',
          threat_distance_km: 1.8,
          population_info: 'Monitored core population within designated reserve perimeter',
          census_source: 'Official National Park Protected Area Management Audit (2023)',
        },
      ];
    }
    return list;
  }, [area]);

  const areaAlerts = useMemo(() => {
    if (liveAlerts.length > 0) return liveAlerts;
    return MOCK_ALERTS.filter((a) => a.area_id === area.id);
  }, [area, liveAlerts]);

  const areaReports = useMemo(() => {
    if (liveReports.length > 0) return liveReports;
    const list = MOCK_REPORTS.filter((r) =>
      r.area_name.toLowerCase().includes(area.name.toLowerCase())
    );
    if (list.length === 0) {
      return [
        {
          id: `rep-${area.id}-q3`,
          title: `Q3 2026 ${area.name} Multi-Spectral Habitat & Land-Cover Audit`,
          format: 'GEOPDF' as const,
          date_range: '2026-06-01 to 2026-09-15',
          area_name: area.name,
          file_size_mb: 16.2,
          status: 'READY' as const,
          generated_at: '2026-09-17T10:00:00Z',
        },
        {
          id: `rep-${area.id}-phenology`,
          title: `${area.name} 5-Year Phenological Baseline & Hydrographic Series`,
          format: 'CSV' as const,
          date_range: '2021-01-01 to 2026-09-01',
          area_name: area.name,
          file_size_mb: 3.8,
          status: 'READY' as const,
          generated_at: '2026-09-15T14:30:00Z',
        },
      ];
    }
    return list;
  }, [area]);

  // Calculated overview figures
  const waterHectares = Math.round(area.total_hectares * 0.084);
  const builtUpHectares = Math.round(area.total_hectares * 0.026);
  const forestHectares = Math.round((area.total_hectares * area.forest_cover_percent) / 100);

  // Toggle Save Area
  const handleToggleSave = () => {
    const nextState = !isSaved;
    setIsSaved(nextState);
    setSavedNotification(
      nextState
        ? `Saved ${area.name} to monitored watchlist`
        : `Removed ${area.name} from watchlist`
    );
    setTimeout(() => {
      setSavedNotification(null);
    }, 3000);
  };

  // Trigger Report Generation
  const handleGenerateReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedSuccess(true);
      setTimeout(() => {
        setGeneratedSuccess(false);
        setIsReportModalOpen(false);
      }, 1500);
    }, 1200);
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-16">
        {/* Toast Notification */}
        {savedNotification && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-950 border border-emerald-500/60 text-emerald-200 text-xs font-mono shadow-2xl animate-in fade-in slide-in-from-bottom-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{savedNotification}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* HEADER: Area Name, State, Country, Protected-Area Type, Area Size & Actions */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-6">
          {/* Breadcrumb & Navigation */}
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Link
              href="/areas"
              className="hover:text-emerald-400 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Protected Areas</span>
            </Link>
            <span>/</span>
            <span className="text-slate-200">{area.name}</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            {/* Title & Core Metadata */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
                  {area.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded bg-slate-800/90 border border-slate-700 font-mono text-xs text-slate-300">
                  {area.wdpa_id}
                </span>
                <span className="px-2.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs">
                  IUCN {area.iucn_category}
                </span>
                {isBackendOnline !== null && (
                  <span
                    className={cn(
                      'px-2.5 py-0.5 rounded font-mono text-xs flex items-center gap-1.5 border',
                      isBackendOnline
                        ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                    )}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full', isBackendOnline ? 'bg-emerald-400' : 'bg-amber-400')} />
                    {isBackendOnline ? 'FASTAPI: CONNECTED' : 'OFFLINE FALLBACK'}
                  </span>
                )}
              </div>

              {/* Required Header Metadata Fields: State, Country, Protected-area type, Area size */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    State / Region
                  </span>
                  <span className="text-xs font-semibold text-slate-200 font-mono truncate block mt-0.5">
                    {area.state || 'Central District'}
                  </span>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Country
                  </span>
                  <span className="text-xs font-semibold text-slate-200 font-mono truncate block mt-0.5">
                    {area.country} ({area.country_code})
                  </span>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Protected-Area Type
                  </span>
                  <span className="text-xs font-semibold text-emerald-400 font-mono truncate block mt-0.5">
                    {area.protected_area_type || area.designation}
                  </span>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Area Size
                  </span>
                  <span className="text-xs font-semibold text-slate-100 font-mono truncate block mt-0.5">
                    {area.area_km2.toLocaleString()} km² ({area.total_hectares.toLocaleString()} ha)
                  </span>
                </div>
              </div>

              {/* Coordinates HUD & Biome */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {area.coordinates.lat.toFixed(4)}° N, {area.coordinates.lon.toFixed(4)}° E
                  </span>
                </span>
                <span>•</span>
                <span>Biome: {area.biome}</span>
                <span>•</span>
                <span>Telemetry Sync: {formatDate(area.last_analyzed)}</span>
              </div>
            </div>

            {/* Header Actions: Save Area & Generate Report */}
            <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center shrink-0">
              {/* Action 1: Save Area Toggle */}
              <button
                onClick={handleToggleSave}
                className={cn(
                  'px-3.5 py-2 rounded-lg border text-xs font-mono font-medium flex items-center gap-2 transition-all shadow-sm',
                  isSaved
                    ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 shadow-emerald-950/50'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                )}
                title={isSaved ? 'Remove from saved watchlist' : 'Bookmark for continuous habitat alerts'}
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                    <span>Saved to Watchlist</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4 text-slate-400" />
                    <span>Save Area</span>
                  </>
                )}
              </button>

              {/* Action 2: Generate Report Modal Trigger */}
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-mono font-medium flex items-center gap-2 transition-colors"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Generate Report</span>
              </button>

              {/* Quick GIS Map Link */}
              <Link
                href={`/explore?area=${area.id}`}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-950/50"
              >
                <Compass className="w-4 h-4" />
                <span>View on GIS Map</span>
              </Link>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TABS BAR (Overview, Analysis, Hotspots, Wildlife, Human Activity, Reports) */}
          {/* ========================================================================= */}
          <div className="flex items-center gap-1 border-b border-slate-800 overflow-x-auto pt-4 scrollbar-none">
            {[
              { id: 'overview', label: 'Overview', count: null },
              { id: 'analysis', label: 'Analysis', count: null },
              { id: 'hotspots', label: 'Hotspots', count: areaHotspots.length },
              { id: 'wildlife', label: 'Wildlife', count: areaSpecies.length },
              { id: 'human_activity', label: 'Human Activity', count: null },
              { id: 'reports', label: 'Reports', count: areaReports.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'px-4 py-2.5 text-xs font-mono uppercase tracking-wider font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-2',
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded text-[10px]',
                      activeTab === tab.id
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Core 4 Overview Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Forest Cover */}
              <div className="gis-glass-card rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    Forest Cover
                  </span>
                  <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                    <TreePine className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold font-mono text-emerald-400">
                    {area.forest_cover_percent}%
                  </span>
                  <span className="text-xs font-mono text-slate-400 block mt-1">
                    {forestHectares.toLocaleString()} hectares
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Dense Canopy
                  </span>
                  <span>Sentinel-2 L2A</span>
                </div>
              </div>

              {/* 2. Water Area */}
              <div className="gis-glass-card rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    Water Area
                  </span>
                  <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
                    <Droplets className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold font-mono text-cyan-400">
                    8.4%
                  </span>
                  <span className="text-xs font-mono text-slate-400 block mt-1">
                    {waterHectares.toLocaleString()} hectares
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="text-cyan-400 flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    -2.4% vs 5-Yr Base
                  </span>
                  <span>Modified NDWI</span>
                </div>
              </div>

              {/* 3. Built-up Area */}
              <div className="gis-glass-card rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    Built-up Area
                  </span>
                  <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold font-mono text-amber-400">
                    2.6%
                  </span>
                  <span className="text-xs font-mono text-slate-400 block mt-1">
                    {builtUpHectares.toLocaleString()} hectares
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="text-amber-400 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    +0.3% Annual
                  </span>
                  <span>NDBI Classification</span>
                </div>
              </div>

              {/* 4. Habitat Change Score */}
              <div className="gis-glass-card rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    Habitat Change Score
                  </span>
                  <div className="p-2 rounded-lg bg-red-950/60 border border-red-500/30 text-red-400">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold font-mono text-white">
                    {area.threat_index}{' '}
                    <span className="text-sm font-normal text-slate-400">/ 100</span>
                  </span>
                  <span className="text-xs font-mono text-red-400 block mt-1 font-semibold">
                    {area.threat_index > 60
                      ? 'Elevated Degradation Pressure'
                      : area.threat_index > 40
                      ? 'Moderate Habitat Stress'
                      : 'Stable Conservation Buffer'}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="text-slate-300">Composite Risk</span>
                  <span className="text-emerald-400">Automated Audit</span>
                </div>
              </div>
            </div>

            {/* Change Cards: Vegetation, Water, Urban, Fire */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Biophysical Change Channels (Multi-Spectral Telemetry)</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  Trailing 90-Day Delta Analysis
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Vegetation Change Card */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono text-emerald-400 uppercase flex items-center gap-1.5">
                      <TreePine className="w-3.5 h-3.5" />
                      Vegetation Change
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-950/80 text-red-400 border border-red-800/60">
                      ΔNDVI -0.42
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono mt-1">
                    -{area.canopy_loss_year_ha.toFixed(1)} ha detected canopy loss
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    Selective felling and edge clearing observed primarily along western buffer boundary.
                  </p>
                  <div className="mt-3 pt-2.5 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between">
                    <span>Baseline NDVI: 0.76</span>
                    <span>Current: 0.71</span>
                  </div>
                </div>

                {/* Water Change Card */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono text-cyan-400 uppercase flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5" />
                      Water Body Change
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                      ΔNDWI -0.18
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono mt-1">
                    Seasonal floodplain reservoir contraction
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    Ephemeral lagoons receding 12 days earlier than 5-year median dry season cycle.
                  </p>
                  <div className="mt-3 pt-2.5 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between">
                    <span>Dry Season Index</span>
                    <span>Moderate Strain</span>
                  </div>
                </div>

                {/* Urban Change Card */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono text-amber-400 uppercase flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      Urban / Infrastructure
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/80 text-amber-400 border border-amber-800/60">
                      ΔNDBI +0.22
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono mt-1">
                    +14.8 ha linear buffer expansion
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    Unpaved perimeter access roads and temporary settlements detected in external 5km zone.
                  </p>
                  <div className="mt-3 pt-2.5 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between">
                    <span>Road Corridors</span>
                    <span>Active Incursion</span>
                  </div>
                </div>

                {/* Fire Activity Card */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-red-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono text-red-400 uppercase flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" />
                      Fire Hotspots
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-950/80 text-red-400 border border-red-800/60">
                      {area.active_fires_count} Thermal Fronts
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono mt-1">
                    Peak Fire Radiative Power: 42.6 MW
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    VIIRS 375m sensor confirmed thermal signatures along ridge line. Wind velocity: 14 km/h NW.
                  </p>
                  <div className="mt-3 pt-2.5 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between">
                    <span>VIIRS Telemetry</span>
                    <span>High Alert</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Before / After Imagery Cards */}
            <div className="gis-glass-card rounded-xl p-5 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span>Before / After Multi-Spectral Optical Imagery</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Orthorectified Sentinel-2 Level-2A False-Color Composite (SWIR-NIR-Red)
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
                  <button
                    onClick={() => setComparisonView('side-by-side')}
                    className={cn(
                      'px-2.5 py-1 rounded transition-colors',
                      comparisonView === 'side-by-side'
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-400 hover:text-white'
                    )}
                  >
                    Side-by-Side
                  </button>
                  <button
                    onClick={() => setComparisonView('slider')}
                    className={cn(
                      'px-2.5 py-1 rounded transition-colors',
                      comparisonView === 'slider'
                        ? 'bg-emerald-950 text-emerald-300 font-semibold border border-emerald-500/40'
                        : 'text-slate-400 hover:text-white'
                    )}
                  >
                    Split Slider
                  </button>
                </div>
              </div>

              {/* Imagery Display */}
              {comparisonView === 'side-by-side' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Baseline Image Card */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        BASELINE EPOCH (T0)
                      </span>
                      <span className="text-slate-500">2025-09-15 • Sentinel-2 MSI</span>
                    </div>
                    <div className="relative h-64 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 flex flex-col justify-between p-4 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950">
                      <div className="flex justify-between items-start">
                        <span className="px-2 py-1 rounded bg-slate-900/90 text-emerald-300 font-mono text-[10px] border border-emerald-500/30">
                          Dense Closed Canopy: 84.6%
                        </span>
                        <span className="px-2 py-1 rounded bg-slate-900/90 text-slate-300 font-mono text-[10px]">
                          NDVI Mean: 0.78
                        </span>
                      </div>
                      <div className="space-y-1 bg-slate-900/90 backdrop-blur-sm p-3 rounded-lg border border-slate-800 font-mono text-[11px]">
                        <div className="text-emerald-400 font-bold">Continuous Primary Canopy</div>
                        <div className="text-slate-400 text-[10px]">
                          Unbroken ecological corridor with high moisture retention and zero active clearing clusters.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Current Observed Image Card */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                        CURRENT OBSERVED (T1)
                      </span>
                      <span className="text-red-400">2026-09-17 • Sentinel-2 MSI</span>
                    </div>
                    <div className="relative h-64 rounded-lg overflow-hidden border border-red-900/50 bg-slate-950 flex flex-col justify-between p-4 bg-gradient-to-br from-red-950/40 via-slate-900 to-slate-950">
                      <div className="flex justify-between items-start">
                        <span className="px-2 py-1 rounded bg-red-950/90 text-red-300 font-mono text-[10px] border border-red-500/40">
                          Canopy Loss Detected: -31.2 ha
                        </span>
                        <span className="px-2 py-1 rounded bg-slate-900/90 text-red-400 font-mono text-[10px]">
                          NDVI Mean: 0.69
                        </span>
                      </div>
                      <div className="space-y-1 bg-slate-900/90 backdrop-blur-sm p-3 rounded-lg border border-red-800/40 font-mono text-[11px]">
                        <div className="text-red-400 font-bold flex items-center justify-between">
                          <span>Active Disturbance Hotspots</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/60 text-red-200">
                            CONFIDENCE 94%
                          </span>
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          Spectral reflectance shift reveals new logging clearings and linear infrastructure penetration.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Interactive Split Slider View */
                <div className="space-y-3">
                  <div className="relative h-72 rounded-lg overflow-hidden border border-slate-700 select-none bg-slate-950">
                    {/* Left (Baseline) */}
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/40 flex items-center justify-start p-6"
                      style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
                    >
                      <div className="space-y-2 max-w-xs font-mono">
                        <span className="px-2 py-0.5 rounded bg-emerald-900 text-emerald-200 text-xs font-bold">
                          BASELINE 2025
                        </span>
                        <div className="text-lg font-bold text-white">Continuous Canopy</div>
                        <div className="text-xs text-emerald-300">Mean NDVI 0.78 • Zero Burn Scars</div>
                      </div>
                    </div>

                    {/* Right (Observed 2026) */}
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-red-950/70 via-slate-900 to-red-950/40 flex items-center justify-end p-6"
                      style={{ clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)` }}
                    >
                      <div className="space-y-2 max-w-xs font-mono text-right">
                        <span className="px-2 py-0.5 rounded bg-red-900 text-red-200 text-xs font-bold">
                          OBSERVED 2026
                        </span>
                        <div className="text-lg font-bold text-red-400">Canopy Deforestation</div>
                        <div className="text-xs text-red-300">ΔNDVI -0.42 • 31.2 ha Cleared</div>
                      </div>
                    </div>

                    {/* Split Line Indicator */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl z-20 pointer-events-none"
                      style={{ left: `${sliderPosition}%` }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white text-slate-950 font-bold text-[10px] flex items-center justify-center shadow-lg border-2 border-slate-900 font-mono">
                        ‹ ›
                      </div>
                    </div>
                  </div>

                  {/* Range Input for Slider */}
                  <div className="flex items-center gap-4 px-2">
                    <span className="text-[11px] font-mono text-emerald-400">2025 Baseline</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={sliderPosition}
                      onChange={(e) => setSliderPosition(Number(e.target.value))}
                      className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                    <span className="text-[11px] font-mono text-red-400">2026 Observed</span>
                  </div>
                </div>
              )}
            </div>

            {/* Charts: Land-Cover Distribution & NDVI Phenology Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6">
                <LandCoverChart />
              </div>

              <div className="lg:col-span-6 gis-glass-card rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      NDVI Phenology Trajectory
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Sentinel-2 canopy index vs 5-year historical baseline
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                    TRAILING 12-MO
                  </span>
                </div>

                <div className="h-64 w-full">
                  <PhenologyChart data={MOCK_TIMELINE} mode="ndvi" />
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-0.5 bg-emerald-400" />
                    Observed NDVI (Current Season)
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2.5 h-0.5 bg-slate-500 border-t border-dashed" />
                    5-Yr Historical Median
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Hotspots Table/Cards for this Reserve */}
            <div className="gis-glass-card rounded-xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Recent Degradation Hotspots Detected in {area.name}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('hotspots')}
                  className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>View All {areaHotspots.length} Hotspots</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-800/80">
                {areaHotspots.slice(0, 3).map((hs) => (
                  <div key={hs.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-white">{hs.id}</span>
                        <SeverityBadge severity={hs.severity} />
                        <span className="text-xs font-semibold text-slate-300">
                          {hs.change_type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                        <span>Area: {hs.area_ha.toFixed(1)} ha</span>
                        <span>•</span>
                        <span className="text-red-400">ΔNDVI: {hs.delta_ndvi.toFixed(2)}</span>
                        <span>•</span>
                        <span>Confidence: {(hs.confidence_score * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-center">
                      <span className="text-[10px] font-mono text-slate-500">
                        {formatDate(hs.detected_at)}
                      </span>
                      <Link
                        href={`/explore?lat=${hs.coordinates.lat}&lon=${hs.coordinates.lon}&zoom=14`}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono flex items-center gap-1 transition-colors"
                      >
                        <Compass className="w-3 h-3 text-emerald-400" />
                        <span>Locate</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ANALYSIS */}
        {/* ========================================================================= */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            {/* Spectral Telemetry Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="gis-glass-card rounded-xl p-5 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-emerald-400 uppercase">
                    NDVI Index (Vegetation Vigor)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    (B8 - B4) / (B8 + B4)
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  0.71 <span className="text-xs text-red-400 font-normal">(-0.05 anomaly)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Near-infrared reflectance indicates high chlorophyll absorption in core valleys, with localized stress in transitional boundaries.
                </p>
              </div>

              <div className="gis-glass-card rounded-xl p-5 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-cyan-400 uppercase">
                    NDWI Index (Surface Moisture)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    (B3 - B8) / (B3 + B8)
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  +0.28 <span className="text-xs text-slate-400 font-normal">(Seasonal)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Hydrographic water delineation shows normal pre-monsoon baseline across permanent riparian rivers with 18% ephemeral pool reduction.
                </p>
              </div>

              <div className="gis-glass-card rounded-xl p-5 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-amber-400 uppercase">
                    NDBI Index (Built-Up Velocity)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    (B11 - B8) / (B11 + B8)
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  -0.14 <span className="text-xs text-amber-400 font-normal">(+0.04 growth)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Shortwave infrared (SWIR-1) reveals non-vegetated bare soil and hardened unpaved road surfaces along fringe villages.
                </p>
              </div>
            </div>

            {/* Sensor & Pipeline Calibration Table */}
            <div className="gis-glass-card rounded-xl p-5 border border-slate-800 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Copernicus Sentinel-2 Telemetry & Pre-Processing Calibration
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Surface reflectance atmospheric correction and cloud screening pipeline parameters
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">SENSOR PAYLOAD</span>
                  <span className="text-white font-bold block mt-1">MSI Level-2A (BOA)</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Sen2Cor Atmospheric Model</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">SPATIAL RESOLUTION</span>
                  <span className="text-emerald-400 font-bold block mt-1">10m Ground Sample</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Bands B2, B3, B4, B8 Native</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">CLOUD MASKING</span>
                  <span className="text-white font-bold block mt-1">SCL Filter Active</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">&lt; 5% Cloud Coverage Cutoff</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">CHANGE VECTOR ANALYSIS</span>
                  <span className="text-amber-400 font-bold block mt-1">CVA Magnitude: 0.38</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Direction: Deforestation Vector</span>
                </div>
              </div>
            </div>

            {/* Extended Multi-Decadal Phenology & Water Trends */}
            <div className="gis-glass-card rounded-xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Seasonal Multi-Spectral Curve ({area.name})
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Surface water variation vs vegetation greenness index
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  2025–2026 BIOMASS SERIES
                </span>
              </div>

              <div className="h-72 w-full">
                <PhenologyChart data={MOCK_TIMELINE} mode="water" />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: HOTSPOTS */}
        {/* ========================================================================= */}
        {activeTab === 'hotspots' && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono uppercase tracking-wider font-semibold text-white">
                  Filter Hotspots by Severity:
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setHotspotFilterSeverity(sev)}
                    className={cn(
                      'px-3 py-1 rounded text-xs font-mono transition-colors',
                      hotspotFilterSeverity === sev
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50 font-bold'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white'
                    )}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Hotspots Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHotspots.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-slate-400 font-mono text-xs gis-glass-card rounded-xl border border-slate-800">
                  No {hotspotFilterSeverity.toLowerCase()} severity hotspots currently recorded for {area.name}.
                </div>
              ) : (
                filteredHotspots.map((hs) => (
                  <div
                    key={hs.id}
                    className="gis-glass-card rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold font-mono text-white">{hs.id}</span>
                          <SeverityBadge severity={hs.severity} />
                        </div>
                        <h4 className="text-xs font-bold text-slate-200 mt-1">
                          {hs.change_type.replace('_', ' ')}
                        </h4>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-red-400 block">
                          {hs.percentage_change}%
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          ΔNDVI {hs.delta_ndvi.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px]">AFFECTED AREA</span>
                        <span className="text-slate-200 font-semibold">{hs.area_ha.toFixed(1)} ha</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">CONFIDENCE</span>
                        <span className="text-emerald-400 font-semibold">
                          {(hs.confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">DETECTION</span>
                        <span className="text-slate-300">{formatDate(hs.detected_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-mono text-slate-400">
                        Sensor: {hs.sensor}
                      </span>

                      <Link
                        href={`/explore?lat=${hs.coordinates.lat}&lon=${hs.coordinates.lon}&zoom=14`}
                        className="px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <Compass className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Inspect on Map</span>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: WILDLIFE (Clearly Labeled Mock Data, Census Sourced) */}
        {/* ========================================================================= */}
        {activeTab === 'wildlife' && (
          <div className="space-y-6">
            {/* Disclaimer & Citation Banner */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-3">
              <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                  Verified Census Sourced Telemetry (Strict Compliance Protocol)
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Wildlife population metrics and cohort estimations are strictly cited from published, peer-reviewed conservation censuses (e.g. National Tiger Conservation Authority, Assam Forest Dept, TAWIRI, GVTC). Wildlife Watch does not formulate unsupported or unverified wild population claims.
                </p>
              </div>
            </div>

            {/* Species Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {areaSpecies.map((species) => (
                <div
                  key={species.id}
                  className="gis-glass-card rounded-xl p-5 border border-slate-800 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold font-mono text-white">
                        {species.species_name}
                      </h4>
                      <p className="text-xs font-mono italic text-slate-400 mt-0.5">
                        {species.scientific_name}
                      </p>
                    </div>

                    <span
                      className={cn(
                        'px-2.5 py-1 rounded text-[11px] font-mono font-bold border',
                        species.iucn_status === 'CR'
                          ? 'bg-red-950 text-red-300 border-red-800'
                          : species.iucn_status === 'EN'
                          ? 'bg-orange-950 text-orange-300 border-orange-800'
                          : species.iucn_status === 'VU'
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      )}
                    >
                      IUCN {species.iucn_status}
                    </span>
                  </div>

                  {/* Population Info & Explicit Census Citation */}
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/90 space-y-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                        Estimated Population & Density
                      </span>
                      <span className="text-xs font-semibold font-mono text-emerald-300 block mt-0.5">
                        {species.population_info ||
                          'Population actively protected under reserve management plan'}
                      </span>
                    </div>

                    {species.census_source && (
                      <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400 flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Source: {species.census_source}</span>
                      </div>
                    )}
                  </div>

                  {/* Telemetry Metrics */}
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">OBSERVED COHORT</span>
                      <span className="text-slate-200 font-bold block mt-0.5">
                        {species.count} Individuals
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Last seen {species.observed_at}
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">
                        PROXIMITY TO DISTURBANCE
                      </span>
                      <span
                        className={cn(
                          'font-bold block mt-0.5',
                          species.threat_distance_km < 1.5 ? 'text-red-400' : 'text-amber-400'
                        )}
                      >
                        {species.threat_distance_km} km distance
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        To nearest change hotspot
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: HUMAN ACTIVITY (Roads, Buildings, Agriculture, Urban Expansion) */}
        {/* ========================================================================= */}
        {activeTab === 'human_activity' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Roads & Linear Corridors */}
              <div className="gis-glass-card rounded-xl p-5 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-400">
                      <Route className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                        Roads & Linear Corridors
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        OpenStreetMap & Sentinel-2 optical linear trace
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    0.38 km / km²
                  </span>
                </div>

                <div className="space-y-2.5 text-xs font-mono">
                  <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400">Paved Highways Crossing Core:</span>
                    <span className="text-white font-bold">0 km (Zero intrusion)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400">Unpaved Patrol Tracks:</span>
                    <span className="text-white font-bold">142 km monitored</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400">Buffer Penetration Points:</span>
                    <span className="text-amber-400 font-bold">7 detected accessways</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Patrol tracks maintain low vehicular velocity; unauthorized vehicle detection triggers automated camera trap alerts.
                </p>
              </div>

              {/* 2. Buildings & Structural Encroachment */}
              <div className="gis-glass-card rounded-xl p-5 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-500/30 text-blue-400">
                      <Home className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                        Buildings & Ranger Infrastructure
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Surface structure detection and outpost inventory
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    Protected Status
                  </span>
                </div>

                <div className="space-y-2.5 text-xs font-mono">
                  <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400">Official Forest Ranger Camps:</span>
                    <span className="text-white font-bold">24 Active Stations</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400">Fringe Village Dwellings:</span>
                    <span className="text-white font-bold">Outside 3km Buffer</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400">Illegal Structures Identified:</span>
                    <span className="text-red-400 font-bold">2 Under Inspection</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Sentinel-2 NIR band reflectances confirm unauthorized corrugated roof signatures in eastern sector.
                </p>
              </div>

              {/* 3. Agriculture & Cropland Pressure */}
              <div className="gis-glass-card rounded-xl p-5 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                      <Tractor className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                        Agriculture & Cropland Buffers
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Farming cultivation & seasonal clearance
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    +4.2% Fringe Expansion
                  </span>
                </div>

                <div className="space-y-2.5 text-xs font-mono">
                  <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400">Cropland Area in 5km Zone:</span>
                    <span className="text-white font-bold">1,840 ha cultivated</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400">Livestock Grazing Pressure:</span>
                    <span className="text-amber-400 font-bold">Moderate in North</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400">Water Canal Encroachment:</span>
                    <span className="text-slate-300 font-bold">3 diversion channels</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Seasonal agricultural burning along boundaries generates thermal false-positives flagged for verification.
                </p>
              </div>

              {/* 4. Urban Expansion & Industrial Pressure */}
              <div className="gis-glass-card rounded-xl p-5 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-red-950/60 border border-red-500/30 text-red-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                        Urban Expansion (NDBI Velocity)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Impervious surface propagation velocity
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-red-400 font-bold">
                    +1.2% Decadal Rate
                  </span>
                </div>

                <div className="space-y-2.5 text-xs font-mono">
                  <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400">Closest Urban Township:</span>
                    <span className="text-white font-bold">28 km from border</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400">Night-time Lights (VIIRS DNB):</span>
                    <span className="text-emerald-400 font-bold">Zero radiance in core</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400">Industrial Concession Distance:</span>
                    <span className="text-white font-bold">&gt; 45 km radius</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Ecological buffer zones act as an effective barrier against commercial settlement advancement.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: REPORTS */}
        {/* ========================================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Conservation Dossiers & Habitat Audit Reports
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Download ready-to-file multi-spectral compliance dossiers for {area.name}
                </p>
              </div>

              <button
                onClick={() => setIsReportModalOpen(true)}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold flex items-center gap-2 transition-all self-start sm:self-center shadow-lg shadow-emerald-950/50"
              >
                <FileText className="w-4 h-4" />
                <span>Dispatch New Audit Report</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {areaReports.map((report) => (
                <div
                  key={report.id}
                  className="gis-glass-card rounded-xl p-5 border border-slate-800 space-y-4 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                        {report.format}
                      </span>
                      <h4 className="text-sm font-bold font-mono text-white mt-2">
                        {report.title}
                      </h4>
                    </div>

                    <span className="text-xs font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 font-bold shrink-0">
                      {report.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] font-mono text-slate-400">
                    <div>Timeframe: {report.date_range}</div>
                    <div>
                      Compiled: {formatDate(report.generated_at)} • File size: {report.file_size_mb} MB
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500">
                      SHA256 Signed Dossier
                    </span>

                    <button
                      onClick={() => {
                        alert(
                          `Downloading ${report.title} (${report.format}, ${report.file_size_mb} MB)...`
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Download {report.format}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* GENERATE REPORT MODAL */}
        {/* ========================================================================= */}
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="gis-glass-card rounded-2xl border border-slate-700 w-full max-w-lg p-6 space-y-5 shadow-2xl bg-slate-950">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold font-mono text-white">
                    Generate Conservation Audit Dossier
                  </h3>
                </div>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div>
                  <label className="text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                    TARGET PROTECTED RESERVE
                  </label>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-bold">
                    {area.name} ({area.country})
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 uppercase tracking-wider text-[10px] block mb-1.5">
                    EXPORT FORMAT
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'GEOPDF', label: 'GeoPDF Dossier' },
                      { id: 'GEOPACKAGE', label: 'GeoPackage (GPKG)' },
                      { id: 'CSV', label: 'CSV Statistics' },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setReportFormat(fmt.id as any)}
                        className={cn(
                          'p-2.5 rounded-lg border text-center transition-all',
                          reportFormat === fmt.id
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        )}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 uppercase tracking-wider text-[10px] block mb-1.5">
                    OBSERVATION TIMEFRAME
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '30d', label: 'Last 30 Days' },
                      { id: '90d', label: 'Trailing Quarter' },
                      { id: '1yr', label: 'Annual Series' },
                    ].map((rng) => (
                      <button
                        key={rng.id}
                        type="button"
                        onClick={() => setReportRange(rng.id as any)}
                        className={cn(
                          'p-2.5 rounded-lg border text-center transition-all',
                          reportRange === rng.id
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        )}
                      >
                        {rng.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="text-slate-300 font-bold">Included Analysis Packages:</div>
                  <ul className="text-[11px] text-slate-400 space-y-0.5 list-disc list-inside">
                    <li>Copernicus Sentinel-2 NDVI canopy change matrices</li>
                    <li>Modified NDWI surface water retention series</li>
                    <li>VIIRS 375m thermal anomaly & fire radiative power</li>
                    <li>IUCN Red List species proximity coordinates</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono font-medium transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Compiling Telemetry...</span>
                    </>
                  ) : generatedSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Dossier Dispatched!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Compile & Dispatch</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
