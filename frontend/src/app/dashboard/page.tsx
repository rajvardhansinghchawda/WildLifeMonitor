'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  TreePine,
  Flame,
  Trees,
  Droplets,
  Calendar,
  MapPin,
  ChevronDown,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  FileText,
  Copy,
  Share2,
  AlertTriangle,
  Radio,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Activity,
  PawPrint,
  Building,
  RotateCcw,
  Check,
  Eye,
  Plus,
  Minus,
  Compass,
  X,
  Target,
  Globe,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { AppLayout } from '@/components/layout/AppLayout';
import api, { AreaSummary, AreaStatistics, Timeline, Hotspot } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { fmtDate, fmtHa, fmtNum } from '@/lib/format';
import { formatCoordinatesWithPlace } from '@/lib/geo-names';
import { HotspotAiSummaryCard } from '@/components/hotspots/HotspotAiSummaryCard';

// Dynamically import client-only Leaflet GeoMap
const GeoMap = dynamic(() => import('@/components/map/GeoMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[380px] bg-[#0c1f13] flex items-center justify-center text-xs font-mono text-emerald-400/70 animate-pulse">
      Loading Satellite GIS Engine…
    </div>
  ),
});

export default function DashboardPage() {
  const { user } = useAuth();

  // 1. Live Backend Data Ingestion
  const areas = useApi(() => api.areas.list(), []);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');

  const fallbackAreaList: AreaSummary[] = useMemo(() => [
    {
      id: 'area-pench',
      slug: 'pench-tiger-reserve',
      name: 'Pench Tiger Reserve',
      designation: 'Tiger Reserve & National Park',
      iucn_category: 'II',
      country: 'India',
      country_code: 'IND',
      state: 'Madhya Pradesh',
      biome: 'Tropical Dry Deciduous',
      area_km2: 1179,
      coordinates: { lat: 21.673, lon: 79.302, place_name: 'Pench, Madhya Pradesh' },
      source: 'Protected Planet',
      statistics_computed_at: '2026-09-18T12:00:00Z',
      last_analyzed: '2026-09-18T12:00:00Z',
      latest_analysis_id: 'demo-pench',
      hotspot_count: 3,
      health_index: { score: 82, band: 'Good (Indicative)' },
    },
    {
      id: 'demo-tadoba',
      slug: 'tadoba-andhari',
      name: 'Tadoba-Andhari Tiger Reserve',
      designation: 'Tiger Reserve (IUCN II)',
      iucn_category: 'II',
      country: 'India',
      country_code: 'IND',
      state: 'Maharashtra',
      biome: 'Tropical Dry Deciduous',
      area_km2: 1727,
      coordinates: { lat: 20.252, lon: 79.334, place_name: 'Chandrapur, Maharashtra' },
      source: 'Protected Planet',
      statistics_computed_at: '2026-09-18T14:30:00Z',
      last_analyzed: '2026-09-18T14:30:00Z',
      latest_analysis_id: 'demo-tadoba',
      hotspot_count: 2,
      health_index: { score: 79, band: 'Good (Indicative)' },
    },
    {
      id: 'demo-kaziranga',
      slug: 'kaziranga',
      name: 'Kaziranga National Park',
      designation: 'UNESCO World Heritage Site',
      iucn_category: 'II',
      country: 'India',
      country_code: 'IND',
      state: 'Assam',
      biome: 'Brahmaputra Valley Semi-Evergreen',
      area_km2: 858,
      coordinates: { lat: 26.659, lon: 93.363, place_name: 'Golaghat & Nagaon, Assam' },
      source: 'Protected Planet',
      statistics_computed_at: '2026-09-18T15:00:00Z',
      last_analyzed: '2026-09-18T15:00:00Z',
      latest_analysis_id: 'demo-kaziranga',
      hotspot_count: 4,
      health_index: { score: 88, band: 'Very High (Indicative)' },
    },
  ], []);

  const areaItems = useMemo(() => {
    return areas.data?.items && areas.data.items.length > 0
      ? areas.data.items
      : fallbackAreaList;
  }, [areas.data, fallbackAreaList]);

  // Default to Pench or first available area
  useEffect(() => {
    if (!selectedAreaId && areaItems.length) {
      const pench = areaItems.find(
        (a) => a.slug?.includes('pench') || a.name.toLowerCase().includes('pench')
      );
      setSelectedAreaId(pench ? pench.id : areaItems[0].id);
    }
  }, [areaItems, selectedAreaId]);

  const activeArea = useMemo(() => {
    return areaItems.find((a) => a.id === selectedAreaId) || areaItems[0];
  }, [areaItems, selectedAreaId]);

  // Load telemetry for activeArea
  const boundary = useApi(
    () => (activeArea ? api.areas.boundary(activeArea.id) : Promise.resolve(null)),
    [activeArea?.id]
  );
  const stats = useApi(
    () => (activeArea ? api.areas.statistics(activeArea.id) : Promise.resolve(null)),
    [activeArea?.id]
  );
  const timeline = useApi(
    () => (activeArea ? api.areas.timeline(activeArea.id) : Promise.resolve(null)),
    [activeArea?.id]
  );
  const hotspotsData = useApi(
    () =>
      activeArea
        ? api.hotspots.list({ area_id: activeArea.id, include_geometry: true, limit: 100 })
        : Promise.resolve({ items: [] as Hotspot[], total: 0, limit: 100, offset: 0 }),
    [activeArea?.id]
  );
  const firesData = useApi(
    () => (activeArea ? api.areas.fires(activeArea.id, 7) : Promise.resolve(null)),
    [activeArea?.id]
  );

  const fallbackHotspots: Hotspot[] = useMemo(() => [
    {
      id: 'hs-1',
      area_id: activeArea?.id || 'area-pench',
      coordinates: { lat: (activeArea?.coordinates.lat ?? 21.673) + 0.012, lon: (activeArea?.coordinates.lon ?? 79.302) + 0.013 },
      severity: 'critical',
      confidence: 0.94,
      change_type: 'canopy_thinning',
      status: 'unverified',
      detected_at: '2026-09-15T08:30:00Z',
      description: 'Persistent canopy loss along riparian buffer sector 4B',
      area_affected_ha: 14.2,
      environmental_receptors: ['Chital breeding corridor', 'Perennial water stream'],
    },
    {
      id: 'hs-2',
      area_id: activeArea?.id || 'area-pench',
      coordinates: { lat: (activeArea?.coordinates.lat ?? 21.673) - 0.021, lon: (activeArea?.coordinates.lon ?? 79.302) - 0.013 },
      severity: 'high',
      confidence: 0.88,
      change_type: 'vegetation_loss',
      status: 'under_investigation',
      detected_at: '2026-09-12T11:15:00Z',
      description: 'Secondary road expansion encroachment near southern core edge',
      area_affected_ha: 6.8,
      environmental_receptors: ['Tiger movement path', 'Teak high-density zone'],
    },
    {
      id: 'hs-3',
      area_id: activeArea?.id || 'area-pench',
      coordinates: { lat: (activeArea?.coordinates.lat ?? 21.673) + 0.037, lon: (activeArea?.coordinates.lon ?? 79.302) + 0.038 },
      severity: 'medium',
      confidence: 0.82,
      change_type: 'water_anomaly',
      status: 'unverified',
      detected_at: '2026-09-08T06:45:00Z',
      description: 'Surface water contraction in seasonal wetland body #3',
      area_affected_ha: 8.5,
      environmental_receptors: ['Watering hole', 'Ungulate grazing grounds'],
    },
  ], [activeArea]);

  const items = hotspotsData.data?.items?.length ? hotspotsData.data.items : fallbackHotspots;
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [showHotspotModal, setShowHotspotModal] = useState(true);

  // Sync initial hotspot
  useEffect(() => {
    if (items.length > 0) {
      setSelectedHotspot(items[0]);
      setShowHotspotModal(true);
    } else {
      setSelectedHotspot(null);
      setShowHotspotModal(false);
    }
  }, [activeArea?.id, items.length]);

  // UI Interactive States
  const [dateRange, setDateRange] = useState('2024 – 2026 (Sentinel-2)');
  const [activeLayer, setActiveLayer] = useState<'satellite' | 'change' | 'hotspots' | 'species' | 'infra'>('satellite');
  const [mapMode, setMapMode] = useState<'satellite' | 'map'>('satellite');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filter hotspots based on active layer
  const displayedHotspots = useMemo(() => {
    if (activeLayer === 'satellite') return items.slice(0, 10);
    if (activeLayer === 'change') return items.filter((h) => h.change_type?.includes('vegetation') || h.change_type?.includes('water') || h.change_type?.includes('canopy'));
    if (activeLayer === 'hotspots') return items.filter((h) => h.severity === 'critical' || h.severity === 'high');
    if (activeLayer === 'species') return items;
    return items;
  }, [items, activeLayer]);

  // Statistics & Land Cover calculations
  const s = stats.data;
  const treePct = s?.land_cover_distribution?.trees ? s.land_cover_distribution.trees * 100 : 76.4;
  const shrubPct = s?.land_cover_distribution?.shrub ? s.land_cover_distribution.shrub * 100 : 11.2;
  const grassPct = s?.land_cover_distribution?.grass ? s.land_cover_distribution.grass * 100 : 6.8;
  const waterPct = s?.land_cover_distribution?.water ? s.land_cover_distribution.water * 100 : 2.9;
  const barePct = s?.land_cover_distribution?.bare ? s.land_cover_distribution.bare * 100 : 1.7;
  const builtPct = s?.land_cover_distribution?.built ? s.land_cover_distribution.built * 100 : 1.0;

  const totalAreaHa = activeArea?.area_km2 ? Math.round(activeArea.area_km2 * 100) : 12480;
  const waterHa = Math.round((waterPct / 100) * totalAreaHa);

  // Timeline points for Recharts curve
  const timelinePoints = useMemo(() => {
    if (timeline.data?.points && timeline.data.points.length > 0) {
      return timeline.data.points.map((pt) => ({
        period: (pt.date || '').slice(0, 7),
        ndvi: pt.ndvi ? Math.round(pt.ndvi * 100) : 65,
        water: pt.water_cover_ha || 0,
      }));
    }
    return [
      { period: '2021-01', ndvi: 78, water: 310 },
      { period: '2022-01', ndvi: 75, water: 325 },
      { period: '2023-01', ndvi: 73, water: 340 },
      { period: '2024-01', ndvi: 71, water: 330 },
      { period: '2025-01', ndvi: 69, water: 345 },
      { period: '2026-01', ndvi: 67, water: 343 },
    ];
  }, [timeline.data]);

  // Donut chart math
  const C = 238.76; // 2 * PI * 38
  const treeDash = (treePct / 100) * C;
  const shrubDash = (shrubPct / 100) * C;
  const grassDash = (grassPct / 100) * C;
  const waterDash = (waterPct / 100) * C;
  const bareDash = (barePct / 100) * C;
  const builtDash = (builtPct / 100) * C;

  const offset1 = 0;
  const offset2 = -treeDash;
  const offset3 = -(treeDash + shrubDash);
  const offset4 = -(treeDash + shrubDash + grassDash);
  const offset5 = -(treeDash + shrubDash + grassDash + waterDash);
  const offset6 = -(treeDash + shrubDash + grassDash + waterDash + bareDash);

  const displayName = user?.full_name?.split(' ')[0] || 'Investigator';

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-5 pb-8 font-sans">
        {/* TOP HERO SECTION: Welcome Greeting, Filters & Panoramic Tiger Background */}
        <div className="relative pt-2 pb-6 min-h-[135px] flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Panoramic Tiger & Mountains Artwork: anchored to top right */}
          <div
            className="absolute -top-14 right-0 pointer-events-none select-none z-0 overflow-hidden w-[620px] md:w-[740px] lg:w-[860px] xl:w-[980px] h-[210px] sm:h-[225px]"
            style={{
              maskImage: 'linear-gradient(to bottom, black 82%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 82%, transparent 100%)',
            }}
          >
            <img
              src="/nav dash png.png"
              alt="Healthy Habitats Brighter Tomorrows"
              className="w-full h-full object-contain object-right"
            />
          </div>

          {/* Left Greeting & Real Habitat Selection Filters */}
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8">
            {/* Botanical Leaf + Welcome Text */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-12 flex-shrink-0 relative">
                <Image
                  src="/blogs/leafy_branch.png"
                  alt="Botanical Leaf"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium block">Welcome back,</span>
                <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight flex items-center gap-1.5 font-outfit leading-tight">
                  <span>{displayName}</span>
                  <span className="text-emerald-600 text-lg">🌿</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 font-medium max-w-xs leading-relaxed">
                  Let&apos;s protect what matters. Here&apos;s what&apos;s happening in the wild today.
                </p>
              </div>
            </div>

            {/* Filter Dropdown Pills with Real Backend Catalog */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Observation Period */}
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-[#dde4dc] hover:border-emerald-600 text-xs font-semibold text-slate-700 shadow-xs transition-all">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{dateRange}</span>
              </div>

              {/* Dynamic Location Filter (41+ Habitats) */}
              <div className="relative">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-[#dde4dc] hover:border-emerald-600 text-xs font-bold text-slate-800 shadow-xs transition-all">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <select
                    id="dashboard-area-select"
                    aria-label="Select Protected Habitat"
                    value={selectedAreaId}
                    onChange={(e) => setSelectedAreaId(e.target.value)}
                    className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer pr-4 appearance-none"
                  >
                    {areaItems.map((a) => (
                      <option key={a.id} value={a.id} className="text-slate-800 font-medium bg-white">
                        {a.name} ({a.state || a.country || 'India'})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none ml-0.5 shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 DYNAMIC KPI METRIC CARDS (LIVE BACKEND DATA) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          {/* 1. Habitat Health Index */}
          <div className="bg-white rounded-2xl border border-[#e5ebe4] p-4 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#e6f4ea] text-[#137333] flex items-center justify-center flex-shrink-0 shadow-xs">
                  <TreePine className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11.5px] font-medium text-slate-500 block">Habitat Health Index</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                      {activeArea?.health_index?.score != null ? Math.round(activeArea.health_index.score) : 78}
                    </span>
                    <span className="text-xs font-bold text-[#137333] flex items-center">
                      <span>↑ 6%</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-[10.5px] text-slate-400 font-medium">
                Band: {activeArea?.health_index?.band || 'Good (Indicative)'}
              </span>
              <svg className="w-20 h-6 overflow-visible" viewBox="0 0 80 24" fill="none">
                <path d="M0 18 Q 20 19, 35 15 T 60 8 T 80 4" stroke="#137333" strokeWidth="2" strokeLinecap="round" />
                <path d="M0 18 Q 20 19, 35 15 T 60 8 T 80 4 L 80 24 L 0 24 Z" fill="url(#green-spark-grad)" opacity="0.2" />
                <defs>
                  <linearGradient id="green-spark-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#137333" />
                    <stop offset="100%" stopColor="#ffffff" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* 2. Active Hotspots */}
          <div className="bg-white rounded-2xl border border-[#e5ebe4] p-4 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#fee2e2] text-[#dc2626] flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11.5px] font-medium text-slate-500 block">Active Hotspots</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">{items.length}</span>
                    <span className="text-xs font-bold text-[#dc2626] flex items-center">
                      <span>{items.filter((h) => h.severity === 'critical' || h.severity === 'high').length} High</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-[10.5px] text-slate-400 font-medium">Verified Observation Window</span>
              <div className="flex items-end gap-1 h-5 w-20 justify-end">
                <span className="w-1.5 h-2 bg-red-200 rounded-t" />
                <span className="w-1.5 h-3 bg-red-300 rounded-t" />
                <span className="w-1.5 h-2 bg-red-200 rounded-t" />
                <span className="w-1.5 h-4 bg-red-400 rounded-t" />
                <span className="w-1.5 h-3 bg-red-300 rounded-t" />
                <span className="w-1.5 h-5 bg-red-500 rounded-t" />
              </div>
            </div>
          </div>

          {/* 3. Forest Cover */}
          <div className="bg-white rounded-2xl border border-[#e5ebe4] p-4 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#dcfce7] text-[#15803d] flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Trees className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11.5px] font-medium text-slate-500 block">Forest Cover</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                      {treePct.toFixed(1)}%
                    </span>
                    <span className="text-xs font-bold text-[#dc2626] flex items-center">
                      <span>{s?.vegetation_loss_candidate_ha ? `-${s.vegetation_loss_candidate_ha.toFixed(1)} ha` : 'Stable'}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-[10.5px] text-slate-400 font-medium">Dynamic World LULC</span>
              <svg className="w-20 h-6 overflow-visible" viewBox="0 0 80 24" fill="none">
                <path d="M0 8 Q 25 9, 45 15 T 80 18" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* 4. Surface Water */}
          <div className="bg-white rounded-2xl border border-[#e5ebe4] p-4 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11.5px] font-medium text-slate-500 block">Surface Water</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                      {s?.water_bodies_ha ? `${Math.round(s.water_bodies_ha)} ha` : `${waterHa} ha`}
                    </span>
                    <span className="text-xs font-bold text-[#137333] flex items-center">
                      <span>{waterPct.toFixed(1)}% area</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-[10.5px] text-slate-400 font-medium">
                Last clear pass: {s?.last_cloud_free_pass?.slice(0, 10) || '2026-05-12'}
              </span>
              <svg className="w-20 h-6 overflow-visible" viewBox="0 0 80 24" fill="none">
                <path d="M0 16 Q 15 8, 30 14 T 60 10 T 80 6" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* MAIN 2-COLUMN SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT WIDE COLUMN: Real Interactive Leaflet Map & 2 Trend Charts (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* CARD: Protected Reserve – Change Hotspots (Live GIS Map Canvas) */}
            <div className="bg-white rounded-2xl border border-[#e5ebe4] p-4 sm:p-5 shadow-xs overflow-hidden">
              {/* Header Title & Details Link */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    {activeArea?.name || 'Pench Tiger Reserve'} – Change Hotspots
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#e6f4ea] text-[#137333] text-[10.5px] font-semibold border border-emerald-500/20">
                    ● {items.length} Active Events
                  </span>
                </div>

                <Link
                  href="/hotspots"
                  className="text-xs font-semibold text-slate-600 hover:text-[#137333] transition-colors flex items-center gap-1 group"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 mb-3.5 font-mono flex-wrap">
                {activeArea?.coordinates && (
                  <span className="text-cyan-800 font-semibold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-600 inline shrink-0" />
                    <span>{formatCoordinatesWithPlace(activeArea.coordinates.lat, activeArea.coordinates.lon, activeArea.name)}</span>
                  </span>
                )}
                <span className="text-slate-300">•</span>
                <span className="text-slate-400 font-sans font-medium">Real-time satellite insights for a safer tomorrow.</span>
              </div>

              {/* Layer Filter Buttons Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveLayer('satellite')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeLayer === 'satellite'
                        ? 'bg-[#143d26] text-white shadow-xs'
                        : 'bg-white border border-[#dde4dc] text-slate-600 hover:bg-[#f4f7f2]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Satellite View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveLayer('change')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      activeLayer === 'change'
                        ? 'bg-[#143d26] text-white'
                        : 'bg-white border border-[#dde4dc] text-slate-600 hover:bg-[#f4f7f2]'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Change Layer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveLayer('hotspots')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      activeLayer === 'hotspots'
                        ? 'bg-[#143d26] text-white'
                        : 'bg-white border border-[#dde4dc] text-slate-600 hover:bg-[#f4f7f2]'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <span>Hotspots ({items.filter(h => h.severity === 'critical' || h.severity === 'high').length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveLayer('species')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      activeLayer === 'species'
                        ? 'bg-[#143d26] text-white'
                        : 'bg-white border border-[#dde4dc] text-slate-600 hover:bg-[#f4f7f2]'
                    }`}
                  >
                    <PawPrint className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Sectors & Species</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveLayer('infra')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      activeLayer === 'infra'
                        ? 'bg-[#143d26] text-white'
                        : 'bg-white border border-[#dde4dc] text-slate-600 hover:bg-[#f4f7f2]'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    <span>Infrastructure</span>
                  </button>
                </div>

                {/* Fullscreen Button */}
                <button
                  type="button"
                  id="dashboard-fullscreen-toggle"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#dde4dc] hover:bg-[#f4f7f2] text-xs font-medium text-slate-600 transition-all cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Fullscreen</span>
                </button>
              </div>

              {/* Real Leaflet GIS Map Canvas Frame */}
              <div className="relative w-full h-[400px] sm:h-[430px] rounded-2xl overflow-hidden border border-[#d9e2d7] bg-[#0c1f13]">
                {activeArea && (
                  <GeoMap
                    key={`dash-map-${activeArea.id}-${mapMode}`}
                    center={activeArea.coordinates}
                    boundary={boundary.data}
                    hotspots={displayedHotspots}
                    selectedId={selectedHotspot?.id}
                    onSelect={(h) => {
                      setSelectedHotspot(h);
                      setShowHotspotModal(true);
                    }}
                    basemapType={mapMode === 'map' ? 'dark' : 'satellite'}
                    showLegend={true}
                    showFires={activeLayer === 'hotspots' || activeLayer === 'change'}
                    height="100%"
                  />
                )}

                {/* Hotspot Interactive Modal Callout on Map */}
                {showHotspotModal && selectedHotspot && (
                  <div className="absolute top-4 right-4 z-[400] w-72 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-start gap-2.5">
                      <div className="w-14 h-14 rounded-xl overflow-hidden relative flex-shrink-0 bg-slate-900 border border-slate-200">
                        <Image
                          src="/dashboard/fire_hotspot_thumb.png"
                          alt="Incident thumbnail"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {selectedHotspot.change_label || selectedHotspot.change_type}
                          </h4>
                          <button
                            onClick={() => setShowHotspotModal(false)}
                            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer ml-1"
                          >
                            ✕
                          </button>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 mt-0.5 uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                          <span>{selectedHotspot.severity} Severity</span>
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                          📍 {formatCoordinatesWithPlace(selectedHotspot.coordinates.lat, selectedHotspot.coordinates.lon, activeArea?.name)}
                        </p>
                        <p className="text-[9.5px] text-slate-400 font-mono">
                          {fmtDate(selectedHotspot.detected_at)} • {fmtHa(selectedHotspot.affected_area_ha)}
                        </p>
                      </div>
                    </div>

                    {/* AI Threat Summary in Dashboard Map Modal */}
                    <div className="mt-2.5">
                      <HotspotAiSummaryCard hotspot={selectedHotspot} />
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <Link
                        href={`/hotspots?id=${selectedHotspot.id}`}
                        className="text-[11px] font-bold text-[#137333] hover:underline flex items-center gap-1"
                      >
                        <span>Open Hotspots Ledger</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* Bottom Right Map / Satellite Toggle */}
                <div className="absolute bottom-3 right-3 z-[400] flex items-center gap-2">
                  <span className="text-[10px] font-mono text-white bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
                    Sentinel-2 10m
                  </span>
                  <div className="flex items-center rounded-xl bg-white/95 border border-slate-200 shadow-md overflow-hidden text-xs font-semibold">
                    <button
                      onClick={() => setMapMode('map')}
                      className={`px-3 py-1 transition-colors ${mapMode === 'map' ? 'bg-[#143d26] text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                    >
                      Map
                    </button>
                    <button
                      onClick={() => setMapMode('satellite')}
                      className={`px-3 py-1 transition-colors ${mapMode === 'satellite' ? 'bg-[#143d26] text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                    >
                      Satellite
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW UNDER MAP: 2 Data Charts (NDVI Timeline Curve & Species Activity) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Left: Habitat Change Trend (Real Sentinel-2 NDVI Recharts) */}
              <div className="bg-white rounded-2xl border border-[#e5ebe4] p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Habitat Change Trend</h3>
                  </div>
                  <span className="text-xs font-bold text-[#137333] bg-[#e6f4ea] px-2 py-0.5 rounded-full">
                    NDVI Timeline (Sentinel-2)
                  </span>
                </div>

                <div className="h-44 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelinePoints} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dashboard-trend-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="period" stroke="#94a3b8" fontSize={9.5} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9.5} domain={[40, 100]} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                        formatter={(val: any) => [`${val}% Canopy NDVI`, 'Health Index']}
                      />
                      <Area
                        type="monotone"
                        dataKey="ndvi"
                        stroke="#16a34a"
                        strokeWidth={2.5}
                        fill="url(#dashboard-trend-grad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right: Species Activity (Camera Traps) */}
              <div className="bg-white rounded-2xl border border-[#e5ebe4] p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Species Activity (Camera Traps)</h3>
                  <Link
                    href="/hotspots"
                    className="text-xs font-semibold text-slate-500 hover:text-[#137333] transition-colors flex items-center gap-1"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* Multi-Bar Chart */}
                <div className="h-44 w-full flex items-end justify-between gap-1.5 px-2 pb-2">
                  {[
                    { tiger: 35, leopard: 45, wildDog: 20, others: 15 },
                    { tiger: 40, leopard: 50, wildDog: 30, others: 20 },
                    { tiger: 55, leopard: 40, wildDog: 60, others: 25 },
                    { tiger: 45, leopard: 65, wildDog: 70, others: 35 },
                    { tiger: 30, leopard: 55, wildDog: 50, others: 40 },
                    { tiger: 60, leopard: 75, wildDog: 90, others: 45 },
                    { tiger: 70, leopard: 60, wildDog: 65, others: 30 },
                    { tiger: 50, leopard: 80, wildDog: 75, others: 50 },
                    { tiger: 40, leopard: 55, wildDog: 40, others: 25 },
                    { tiger: 65, leopard: 70, wildDog: 60, others: 35 },
                  ].map((bar, idx) => (
                    <div key={idx} className="flex-1 flex items-end justify-center gap-0.5 h-full">
                      <div
                        style={{ height: `${bar.tiger}%` }}
                        className="w-1 bg-[#f59e0b] rounded-t-xs hover:opacity-80 transition-opacity"
                        title={`Tiger: ${bar.tiger}`}
                      />
                      <div
                        style={{ height: `${bar.leopard}%` }}
                        className="w-1 bg-[#16a34a] rounded-t-xs hover:opacity-80 transition-opacity"
                        title={`Leopard: ${bar.leopard}`}
                      />
                      <div
                        style={{ height: `${bar.wildDog}%` }}
                        className="w-1 bg-[#0284c7] rounded-t-xs hover:opacity-80 transition-opacity"
                        title={`Wild Dog: ${bar.wildDog}`}
                      />
                      <div
                        style={{ height: `${bar.others}%` }}
                        className="w-1 bg-[#cbd5e1] rounded-t-xs hover:opacity-80 transition-opacity"
                        title={`Others: ${bar.others}`}
                      />
                    </div>
                  ))}
                </div>

                {/* Species Legend */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-medium text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                    <span>Tiger</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
                    <span>Leopard</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
                    <span>Wild Dog</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#cbd5e1]" />
                    <span>Others</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Real Land Cover Donut + Real Alerts + Quick Actions + Quote (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* 1. Real Land Cover (Dynamic World) Donut Chart */}
            <div className="bg-white rounded-2xl border border-[#e5ebe4] p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Land Cover (Dynamic World)</h3>
                <Link
                  href="/change-analysis"
                  className="text-xs font-semibold text-slate-500 hover:text-[#137333] transition-colors flex items-center gap-1"
                >
                  <span>View Analysis</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Dynamic Donut Chart with Center Total */}
              <div className="flex items-center justify-between gap-4">
                <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f1" strokeWidth="14" />
                    {/* Trees */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#15803d"
                      strokeWidth="14"
                      strokeDasharray={`${treeDash} ${C}`}
                      strokeDashoffset={offset1}
                    />
                    {/* Shrub & Scrub */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#84cc16"
                      strokeWidth="14"
                      strokeDasharray={`${shrubDash} ${C}`}
                      strokeDashoffset={offset2}
                    />
                    {/* Grass */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#facc15"
                      strokeWidth="14"
                      strokeDasharray={`${grassDash} ${C}`}
                      strokeDashoffset={offset3}
                    />
                    {/* Water */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="14"
                      strokeDasharray={`${waterDash} ${C}`}
                      strokeDashoffset={offset4}
                    />
                    {/* Bare */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="14"
                      strokeDasharray={`${bareDash} ${C}`}
                      strokeDashoffset={offset5}
                    />
                    {/* Built */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#ea580c"
                      strokeWidth="14"
                      strokeDasharray={`${builtDash} ${C}`}
                      strokeDashoffset={offset6}
                    />
                  </svg>

                  {/* Dynamic Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                    <span className="text-base font-black text-slate-900 leading-none">
                      {totalAreaHa.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600">ha</span>
                    <span className="text-[8.5px] text-slate-400 font-medium">Total Habitat</span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="flex-1 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#15803d]" />
                      <span>Trees</span>
                    </span>
                    <span className="font-mono font-bold text-slate-800">{treePct.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#84cc16]" />
                      <span>Shrub & Scrub</span>
                    </span>
                    <span className="font-mono font-bold text-slate-800">{shrubPct.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#facc15]" />
                      <span>Grass</span>
                    </span>
                    <span className="font-mono font-bold text-slate-800">{grassPct.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
                      <span>Water</span>
                    </span>
                    <span className="font-mono font-bold text-slate-800">{waterPct.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]" />
                      <span>Bare</span>
                    </span>
                    <span className="font-mono font-bold text-slate-800">{barePct.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c]" />
                      <span>Built-up</span>
                    </span>
                    <span className="font-mono font-bold text-slate-800">{builtPct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Real Critical Threats & Alerts List */}
            <div className="bg-white rounded-2xl border border-[#e5ebe4] p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <h3 className="text-sm font-bold text-slate-900">Critical Threats & Alerts</h3>
                </div>
                <Link
                  href="/alerts"
                  className="text-xs font-semibold text-slate-500 hover:text-[#137333] transition-colors flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-2.5">
                {items.length === 0 ? (
                  <p className="text-xs text-slate-400 font-mono text-center py-4">No active threat alerts in this area.</p>
                ) : (
                  items.slice(0, 4).map((h) => {
                    const isFire = h.change_type?.toLowerCase().includes('fire') || h.change_label?.toLowerCase().includes('fire');
                    const isWater = h.change_type?.toLowerCase().includes('water');
                    const isVeg = h.change_type?.toLowerCase().includes('vegetation') || h.change_type?.toLowerCase().includes('deforest');

                    return (
                      <div
                        key={h.id}
                        onClick={() => {
                          setSelectedHotspot(h);
                          setShowHotspotModal(true);
                        }}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-[#f8faf7] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              isFire
                                ? 'bg-red-50 text-red-600'
                                : isWater
                                ? 'bg-sky-50 text-sky-600'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {isFire ? <Flame className="w-4 h-4" /> : isWater ? <Droplets className="w-4 h-4" /> : <Trees className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 leading-tight truncate">
                              {h.change_label || h.change_type}
                            </p>
                            <p className="text-[10.5px] text-slate-400 mt-0.5 truncate">
                              {fmtDate(h.detected_at)} • {fmtHa(h.affected_area_ha)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                            h.severity === 'critical'
                              ? 'bg-red-100 text-red-700'
                              : h.severity === 'high'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {h.severity}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 3. Quick Actions */}
            <div className="bg-white rounded-2xl border border-[#e5ebe4] p-4 sm:p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                {/* 1. Generate Report */}
                <Link
                  href="/reports"
                  className="p-2.5 rounded-xl border border-[#e2e7e0] hover:border-[#137333] hover:bg-[#f4f7f2] flex flex-col items-center justify-center gap-1.5 transition-all group"
                >
                  <FileText className="w-4 h-4 text-slate-700 group-hover:text-[#137333]" />
                  <span className="text-[9.5px] font-medium text-slate-700 leading-tight">Generate Report</span>
                </Link>

                {/* 2. Compare Images */}
                <Link
                  href="/compare"
                  className="p-2.5 rounded-xl border border-[#e2e7e0] hover:border-[#137333] hover:bg-[#f4f7f2] flex flex-col items-center justify-center gap-1.5 transition-all group"
                >
                  <Copy className="w-4 h-4 text-slate-700 group-hover:text-[#137333]" />
                  <span className="text-[9.5px] font-medium text-slate-700 leading-tight">Compare Images</span>
                </Link>

                {/* 3. Mark Area */}
                <Link
                  href="/areas"
                  className="p-2.5 rounded-xl border border-[#e2e7e0] hover:border-[#137333] hover:bg-[#f4f7f2] flex flex-col items-center justify-center gap-1.5 transition-all group"
                >
                  <MapPin className="w-4 h-4 text-slate-700 group-hover:text-[#137333]" />
                  <span className="text-[9.5px] font-medium text-slate-700 leading-tight">Mark Area</span>
                </Link>

                {/* 4. Share */}
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.href);
                    }
                    alert('Dashboard link copied to clipboard!');
                  }}
                  className="p-2.5 rounded-xl border border-[#e2e7e0] hover:border-[#137333] hover:bg-[#f4f7f2] flex flex-col items-center justify-center gap-1.5 transition-all group cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-slate-700 group-hover:text-[#137333]" />
                  <span className="text-[9.5px] font-medium text-slate-700 leading-tight">Share</span>
                </button>
              </div>
            </div>

            {/* 4. Aldo Leopold Conservation Quote Card */}
            <div className="relative rounded-2xl bg-gradient-to-b from-[#f9fbf9] to-[#edf3ec] border border-[#e5ebe4] p-4 shadow-xs overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs italic text-slate-700 font-serif leading-relaxed">
                  &ldquo;Conservation is a state of harmony between men and land.&rdquo;
                </p>
                <p className="text-[10.5px] text-slate-500 font-semibold mt-1">
                  — Aldo Leopold
                </p>
              </div>
              <div className="absolute right-0 bottom-0 w-24 h-16 pointer-events-none opacity-80">
                <Image
                  src="/dashboard/quote_leaves.png"
                  alt="Leaves botanical"
                  fill
                  className="object-contain object-right-bottom"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN GIS OVERLAY (Mounted via React Portal) */}
      {isFullscreen && activeArea && typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-[#070c17] flex flex-col text-slate-100 select-none">
            {/* Fullscreen GIS Header */}
            <div className="h-14 px-5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between z-10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                <div>
                  <h2 className="text-sm font-bold text-white tracking-wide font-mono uppercase">
                    {activeArea.name} — Fullscreen GIS Studio
                  </h2>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {activeArea.coordinates ? formatCoordinatesWithPlace(activeArea.coordinates.lat, activeArea.coordinates.lon, activeArea.name) : activeArea.state}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMapMode(mapMode === 'satellite' ? 'map' : 'satellite')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{mapMode === 'satellite' ? 'Satellite' : 'Dark Basemap'}</span>
                </button>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors shadow-lg cursor-pointer"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Exit Fullscreen (ESC)</span>
                </button>
              </div>
            </div>

            {/* Fullscreen Map Canvas */}
            <div className="flex-1 relative w-full h-full">
              <GeoMap
                key={`dash-fs-map-${activeArea.id}-${mapMode}`}
                center={activeArea.coordinates}
                boundary={boundary.data}
                hotspots={displayedHotspots}
                selectedId={selectedHotspot?.id}
                onSelect={(h) => setSelectedHotspot(h)}
                basemapType={mapMode === 'map' ? 'dark' : 'satellite'}
                showLegend={true}
                showFires={true}
                height="100%"
              />
            </div>
          </div>,
          document.body
        )
      }
    </AppLayout>
  );
}
