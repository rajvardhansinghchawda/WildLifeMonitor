'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

export default function DashboardPage() {
  const [selectedArea, setSelectedArea] = useState('Pench Tiger Reserve (India)');
  const [dateRange, setDateRange] = useState('Jan 2024 – Jan 2025');
  const [activeLayer, setActiveLayer] = useState<'satellite' | 'change' | 'hotspots' | 'species' | 'infra'>('satellite');
  const [showHotspotModal, setShowHotspotModal] = useState(true);
  const [mapMode, setMapMode] = useState<'satellite' | 'map'>('satellite');
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-5 pb-8 font-sans">
        {/* TOP HERO SECTION: Welcome Greeting, Filters & Panoramic Tiger Background */}
        <div className="relative pt-2 pb-6 min-h-[135px] flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Panoramic Tiger & Mountains Artwork: anchored to top right, extends behind TopNav */}
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

          {/* Left Greeting & Filters */}
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
                  <span>Kanhaiya</span>
                  <span className="text-emerald-600 text-lg">🌿</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 font-medium max-w-xs leading-relaxed">
                  Let&apos;s protect what matters. Here&apos;s what&apos;s happening in the wild today.
                </p>
              </div>
            </div>

            {/* Filter Dropdown Pills */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Date Filter */}
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-[#dde4dc] hover:border-emerald-600 text-xs font-semibold text-slate-700 shadow-xs transition-all cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{dateRange}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>

              {/* Location Filter */}
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-[#dde4dc] hover:border-emerald-600 text-xs font-semibold text-slate-800 shadow-xs transition-all cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-bold text-slate-800">{selectedArea}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* 4 KPI METRIC CARDS */}
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
                    <span className="text-2xl font-black text-slate-900 tracking-tight">78</span>
                    <span className="text-xs font-bold text-[#137333] flex items-center">
                      <span>↑ 6%</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-[10.5px] text-slate-400 font-medium">Band: Good (Indicative)</span>
              {/* Green Sparkline Curve */}
              <svg className="w-20 h-6 overflow-visible" viewBox="0 0 80 24" fill="none">
                <path
                  d="M0 18 Q 20 19, 35 15 T 60 8 T 80 4"
                  stroke="#137333"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M0 18 Q 20 19, 35 15 T 60 8 T 80 4 L 80 24 L 0 24 Z"
                  fill="url(#green-spark-grad)"
                  opacity="0.2"
                />
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
                    <span className="text-2xl font-black text-slate-900 tracking-tight">3</span>
                    <span className="text-xs font-bold text-[#dc2626] flex items-center">
                      <span>↑ 2</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-[10.5px] text-slate-400 font-medium">Last 24 hours</span>
              {/* Red Mini Bar Chart Sparkline */}
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
                    <span className="text-2xl font-black text-slate-900 tracking-tight">76.4%</span>
                    <span className="text-xs font-bold text-[#dc2626] flex items-center">
                      <span>↓ 1.2%</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-[10.5px] text-slate-400 font-medium">Compared to previous period</span>
              {/* Red Downward Curve Sparkline */}
              <svg className="w-20 h-6 overflow-visible" viewBox="0 0 80 24" fill="none">
                <path
                  d="M0 8 Q 25 9, 45 15 T 80 18"
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
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
                    <span className="text-2xl font-black text-slate-900 tracking-tight">343 ha</span>
                    <span className="text-xs font-bold text-[#137333] flex items-center">
                      <span>↑ 12%</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-[10.5px] text-slate-400 font-medium">Last clear pass: 2026-05-12</span>
              {/* Blue Wave Sparkline */}
              <svg className="w-20 h-6 overflow-visible" viewBox="0 0 80 24" fill="none">
                <path
                  d="M0 16 Q 15 8, 30 14 T 60 10 T 80 6"
                  stroke="#0284c7"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* MAIN 2-COLUMN SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT WIDE COLUMN: Map & 2 Bottom Trend Charts (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* CARD: Pench Tiger Reserve – Change Hotspots (Map Canvas) */}
            <div className="bg-white rounded-2xl border border-[#e5ebe4] p-4 sm:p-5 shadow-xs overflow-hidden">
              {/* Header Title & Details Link */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Pench Tiger Reserve – Change Hotspots
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#e6f4ea] text-[#137333] text-[10.5px] font-semibold border border-emerald-500/20">
                    ● Active Events
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

              <p className="text-xs text-slate-400 mb-3.5 font-medium">
                Real-time satellite insights for a safer tomorrow.
              </p>

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
                    <span>Hotspots</span>
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
                    <span>Species</span>
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
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#dde4dc] hover:bg-[#f4f7f2] text-xs font-medium text-slate-600 transition-all cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Fullscreen</span>
                </button>
              </div>

              {/* Map Canvas Frame */}
              <div className="relative w-full h-[400px] sm:h-[430px] rounded-2xl overflow-hidden border border-[#d9e2d7] bg-[#0c1f13] select-none">
                {/* Satellite Imagery with Pench Polygon & Markers */}
                <Image
                  src="/dashboard/pench_map_satellite.jpg"
                  alt="Pench Tiger Reserve Satellite Map"
                  fill
                  className="object-cover object-center"
                  priority
                  unoptimized
                />

                {/* Left Floating Tools Palette */}
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 p-1 bg-white/95 rounded-xl border border-slate-200 shadow-md backdrop-blur-xs">
                  <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors" title="Layers">
                    <Layers className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors" title="Draw polygon">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors" title="Measure">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </button>
                  <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors" title="Camera Points">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>

                {/* Hotspot Interactive Modal Callout on Map */}
                {showHotspotModal && (
                  <div className="absolute top-[28%] left-[45%] sm:left-[47%] z-20 w-72 rounded-2xl bg-white border border-slate-200/90 shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-start gap-2.5">
                      {/* Real Forest Smoke Thumbnail */}
                      <div className="w-16 h-14 rounded-xl overflow-hidden relative flex-shrink-0 bg-slate-900 border border-slate-200">
                        <Image
                          src="/dashboard/fire_hotspot_thumb.png"
                          alt="Wildfire Incident"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900">Fire Detected</h4>
                          <button
                            onClick={() => setShowHotspotModal(false)}
                            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                          <span>High Severity</span>
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                          📍 Pench Tiger Reserve
                        </p>
                        <p className="text-[9.5px] text-slate-400 font-mono">
                          Jan 12, 2025 • 10:24 AM
                        </p>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <Link
                        href="/hotspots"
                        className="text-[11px] font-bold text-[#137333] hover:underline flex items-center gap-1"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* Bottom Left Legend Box */}
                <div className="absolute bottom-3 left-3 z-10 p-2.5 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-md text-[10.5px] font-medium text-slate-700 flex flex-wrap gap-x-3 gap-y-1 max-w-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]" />
                    <span>Protected Area</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                    <span>Hotspot (Medium)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" />
                    <span>Hotspot (High)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" />
                    <span>Camera Trap</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
                    <span>Water Body</span>
                  </span>
                </div>

                {/* Bottom Right Map / Satellite Toggle & Scale */}
                <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-white bg-black/50 px-2 py-0.5 rounded backdrop-blur-xs">
                    10 km
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

            {/* ROW UNDER MAP: 2 Data Charts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Left: Habitat Change Trend */}
              <div className="bg-white rounded-2xl border border-[#e5ebe4] p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Habitat Change Trend</h3>
                  </div>
                  <span className="text-xs font-bold text-[#137333] bg-[#e6f4ea] px-2 py-0.5 rounded-full">
                    ↓ 4.8% since 2019
                  </span>
                </div>

                {/* SVG Area Line Chart */}
                <div className="relative h-44 w-full">
                  <svg className="w-full h-full" viewBox="0 0 320 160" preserveAspectRatio="none">
                    {/* Horizontal grid lines */}
                    <line x1="40" y1="20" x2="310" y2="20" stroke="#f1f5f1" strokeWidth="1" />
                    <line x1="40" y1="55" x2="310" y2="55" stroke="#f1f5f1" strokeWidth="1" />
                    <line x1="40" y1="90" x2="310" y2="90" stroke="#f1f5f1" strokeWidth="1" />
                    <line x1="40" y1="125" x2="310" y2="125" stroke="#f1f5f1" strokeWidth="1" />

                    {/* Y Axis Labels */}
                    <text x="5" y="24" fill="#94a3b8" fontSize="9" fontFamily="monospace">100%</text>
                    <text x="5" y="59" fill="#94a3b8" fontSize="9" fontFamily="monospace">75%</text>
                    <text x="5" y="94" fill="#94a3b8" fontSize="9" fontFamily="monospace">50%</text>
                    <text x="5" y="129" fill="#94a3b8" fontSize="9" fontFamily="monospace">25%</text>
                    <text x="5" y="155" fill="#94a3b8" fontSize="9" fontFamily="monospace">0%</text>

                    {/* Gradient Area Fill */}
                    <defs>
                      <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    <path
                      d="M 50 35 L 90 48 L 130 68 L 175 85 L 220 92 L 265 98 L 305 102 L 305 150 L 50 150 Z"
                      fill="url(#trend-grad)"
                    />

                    {/* Curve Line */}
                    <path
                      d="M 50 35 Q 70 42, 90 48 T 130 68 T 175 85 T 220 92 T 265 98 T 305 102"
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth="2.5"
                    />

                    {/* Node Points */}
                    <circle cx="50" cy="35" r="3.5" fill="#16a34a" stroke="#fff" strokeWidth="1.5" />
                    <circle cx="90" cy="48" r="3.5" fill="#16a34a" stroke="#fff" strokeWidth="1.5" />
                    <circle cx="130" cy="68" r="3.5" fill="#16a34a" stroke="#fff" strokeWidth="1.5" />
                    <circle cx="175" cy="85" r="3.5" fill="#16a34a" stroke="#fff" strokeWidth="1.5" />
                    <circle cx="220" cy="92" r="3.5" fill="#16a34a" stroke="#fff" strokeWidth="1.5" />
                    <circle cx="265" cy="98" r="3.5" fill="#16a34a" stroke="#fff" strokeWidth="1.5" />
                    <circle cx="305" cy="102" r="3.5" fill="#16a34a" stroke="#fff" strokeWidth="1.5" />
                  </svg>

                  {/* X Axis Labels */}
                  <div className="flex justify-between pl-10 pr-2 pt-1 text-[9.5px] font-mono text-slate-400">
                    <span>2019</span>
                    <span>2020</span>
                    <span>2021</span>
                    <span>2022</span>
                    <span>2023</span>
                    <span>2024</span>
                    <span>2025</span>
                  </div>
                </div>
              </div>

              {/* Right: Species Activity (Camera Traps) */}
              <div className="bg-white rounded-2xl border border-[#e5ebe4] p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Species Activity (Camera Traps)</h3>
                  <Link
                    href="/species"
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

          {/* RIGHT COLUMN: Land Cover Donut + Recent Alerts + Quick Actions + Quote (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* 1. Land Cover (Dynamic World) Donut Chart */}
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

              {/* Donut Chart with Center Total */}
              <div className="flex items-center justify-between gap-4">
                <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    {/* Donut Segments */}
                    {/* Background Circle */}
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f1" strokeWidth="14" />
                    {/* Trees: 76.4% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#15803d"
                      strokeWidth="14"
                      strokeDasharray="182 238"
                      strokeDashoffset="0"
                    />
                    {/* Shrub & Scrub: 11.2% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#84cc16"
                      strokeWidth="14"
                      strokeDasharray="27 238"
                      strokeDashoffset="-182"
                    />
                    {/* Grass: 6.8% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#facc15"
                      strokeWidth="14"
                      strokeDasharray="16 238"
                      strokeDashoffset="-209"
                    />
                    {/* Water: 2.9% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="14"
                      strokeDasharray="7 238"
                      strokeDashoffset="-225"
                    />
                    {/* Bare: 1.7% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="14"
                      strokeDasharray="4 238"
                      strokeDashoffset="-232"
                    />
                    {/* Built: 1.0% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#ea580c"
                      strokeWidth="14"
                      strokeDasharray="2 238"
                      strokeDashoffset="-236"
                    />
                  </svg>

                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                    <span className="text-base font-black text-slate-900 leading-none">12,480</span>
                    <span className="text-[10px] font-bold text-slate-600">ha</span>
                    <span className="text-[8.5px] text-slate-400 font-medium">Total Area</span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="flex-1 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-[#15803d]" />
                      <span>Trees</span>
                    </span>
                    <span className="font-bold text-slate-900">76.4%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-[#84cc16]" />
                      <span>Shrub & Scrub</span>
                    </span>
                    <span className="font-bold text-slate-900">11.2%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-[#facc15]" />
                      <span>Grass</span>
                    </span>
                    <span className="font-bold text-slate-900">6.8%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
                      <span>Water</span>
                    </span>
                    <span className="font-bold text-slate-900">2.9%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-[#94a3b8]" />
                      <span>Bare</span>
                    </span>
                    <span className="font-bold text-slate-900">1.7%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-[#ea580c]" />
                      <span>Built</span>
                    </span>
                    <span className="font-bold text-slate-900">1.0%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Recent Alerts */}
            <div className="bg-white rounded-2xl border border-[#e5ebe4] p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Recent Alerts</h3>
                <Link
                  href="/alerts"
                  className="text-xs font-semibold text-slate-500 hover:text-[#137333] transition-colors flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-2.5">
                {/* Alert 1 */}
                <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#f8faf7] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">Deforestation Spike</p>
                      <p className="text-[10.5px] text-slate-400 mt-0.5">2 hours ago</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                    High
                  </span>
                </div>

                {/* Alert 2 */}
                <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#f8faf7] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                      <Trees className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">Unusual Human Activity</p>
                      <p className="text-[10.5px] text-slate-400 mt-0.5">5 hours ago</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                    Medium
                  </span>
                </div>

                {/* Alert 3 */}
                <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#f8faf7] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">Fire Detected</p>
                      <p className="text-[10.5px] text-slate-400 mt-0.5">1 day ago</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                    High
                  </span>
                </div>

                {/* Alert 4 */}
                <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#f8faf7] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">Water Body Shrinkage</p>
                      <p className="text-[10.5px] text-slate-400 mt-0.5">2 days ago</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                    Medium
                  </span>
                </div>
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
                  onClick={() => alert('Link copied to clipboard!')}
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
    </AppLayout>
  );
}
