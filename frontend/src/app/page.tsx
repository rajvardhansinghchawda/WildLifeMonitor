'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  ExternalLink,
  RefreshCw,
  MapPin,
  Flame,
  Droplets,
  Activity,
  Play,
  ArrowRight,
  Search,
  ChevronDown,
  Sparkles,
  Radio,
  Eye,
  ShieldCheck,
  X,
  Volume2,
  Share2,
  CheckCircle2,
  Menu,
} from 'lucide-react';
import {
  getPublicOverview,
  getPublicDemonstrations,
  getPublicDemonstrationEvents,
  PublicOverview,
  PublicDemonstrationItem,
  PublicChangeEvent,
} from '@/lib/public-api';
import {
  FALLBACK_OVERVIEW,
  FALLBACK_DEMOS,
  FALLBACK_EVENTS,
} from '@/lib/public-demo-data';

// Dynamically import PublicMap to avoid SSR Leaflet window errors
const PublicMap = dynamic(() => import('@/components/public/PublicMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[480px] w-full rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 font-mono text-sm">
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

  // UI Interactive States
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNav, setActiveNav] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      console.warn('Backend API offline, loading curated local demonstration suite.');
      setOverview(FALLBACK_OVERVIEW);
      setDemonstrations(FALLBACK_DEMOS);
      if (FALLBACK_DEMOS.length > 0) {
        setActiveDemo(FALLBACK_DEMOS[0]);
      }
      setError(null);
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
        if (isSubscribed) {
          const fallback = FALLBACK_EVENTS[activeDemo.id] || FALLBACK_EVENTS['demo-pench'] || [];
          setEvents(fallback);
          setSelectedEvent(fallback.length > 0 ? fallback[0] : null);
        }
      })
      .finally(() => {
        if (isSubscribed) setEventsLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [activeDemo]);

  const scrollToSection = (id: string) => {
    setActiveNav(id);
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Filtered demonstrations for search modal
  const filteredDemos = demonstrations.filter(
    (d) =>
      d.area_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.designation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION BAR                                                     */}
      {/* ========================================================================= */}
      <header className="fixed top-0 inset-x-0 z-50 h-16 bg-black/35 backdrop-blur-md border-b border-white/10 px-6 lg:px-12 flex items-center justify-between transition-all">
        {/* Brand Logo & Tagline */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-full bg-[#1a6b3c]/80 border-2 border-[#2ecc71]/70 flex items-center justify-center text-[#2ecc71] shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <TreePine className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-white leading-tight">
              Wildlife Watch
            </span>
            <span className="text-[10px] text-slate-300 font-medium tracking-wider">
              Monitor • Protect • Conserve
            </span>
          </div>
        </Link>

        {/* Center Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { id: 'home', label: 'Home', href: '/' },
            { id: 'about', label: 'About Us', href: '/about' },
            { id: 'features', label: 'Features', href: '/features' },
            { id: 'impact', label: 'Impact', href: '/#impact' },
            { id: 'blogs', label: 'Blogs', href: '/blogs' },
            { id: 'contact', label: 'Contact', href: '/#contact' },
          ].map((item) => {
            const isActive = activeNav === item.id;
            if (item.href.startsWith('/#')) {
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.href.replace('/#', ''))}
                  className="relative px-4 py-2 text-sm font-semibold tracking-wide transition-all text-white/80 hover:text-white"
                >
                  {item.label}
                </button>
              );
            }
            if (item.href === '/') {
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection('home')}
                  className={`relative px-4 py-2 text-sm font-semibold tracking-wide transition-all ${
                    isActive ? 'text-white bg-[#2ecc71] rounded-sm' : 'text-white/80 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            }
            return (
              <Link
                key={item.id}
                href={item.href}
                className="relative px-4 py-2 text-sm font-semibold transition-colors text-white/80 hover:text-white tracking-wide"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Icons & Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Quick Search Button */}
          <button
            onClick={() => setSearchModalOpen(true)}
            aria-label="Search reserves and incidents"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Login Button */}
          <Link
            href="/login"
            className="px-4 py-1.5 rounded-sm bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-semibold text-white transition-all"
          >
            Login
          </Link>

          {/* Get Started Button */}
          <Link
            href="/explore"
            className="px-4 py-1.5 rounded-sm bg-[#2ecc71] hover:bg-[#27b360] text-slate-950 text-sm font-bold tracking-tight shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => setSearchModalOpen(true)}
            className="p-2 text-white"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="fixed top-16 inset-x-0 z-40 bg-black/95 border-b border-white/10 p-6 space-y-4 backdrop-blur-2xl md:hidden">
          <div className="flex flex-col gap-3">
            {[
              { id: 'home', label: 'Home', href: '/' },
              { id: 'about', label: 'About Us', href: '/about' },
              { id: 'features', label: 'Features', href: '/features' },
              { id: 'impact', label: 'Impact', href: '/#impact' },
              { id: 'blogs', label: 'Blogs', href: '/blogs' },
              { id: 'contact', label: 'Contact', href: '/#contact' },
            ].map((item) => {
              if (item.href.startsWith('/#')) {
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      scrollToSection(item.href.replace('/#', ''));
                    }}
                    className="text-left py-2 text-sm font-semibold text-white/80 hover:text-[#2ecc71] tracking-wide"
                  >
                    {item.label}
                  </button>
                );
              }
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-left py-2 text-sm font-semibold text-white/80 hover:text-[#2ecc71] tracking-wide"
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="pt-4 border-t border-white/10 flex gap-3">
            <Link
              href="/login"
              className="flex-1 py-2 rounded-sm text-center bg-white/10 text-white text-sm font-semibold"
            >
              Login
            </Link>
            <Link
              href="/explore"
              className="flex-1 py-2 rounded-sm text-center bg-[#2ecc71] text-slate-950 text-sm font-bold"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CINEMATIC HERO SECTION (MATCHING MOCKUP)                               */}
      {/* ========================================================================= */}
      <section
        id="home"
        className="relative min-h-screen w-full flex flex-col justify-between pt-16 overflow-hidden"
      >
        {/* Deer Landscape Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/deer-bg.png"
            alt="Deer standing in a lush green forest"
            fill
            priority
            className="object-cover object-center"
            quality={95}
          />
          {/* Light overlay — keep the vibrant green forest visible like the reference */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
        </div>

        {/* Top-right brand badge (like World Animal Protection logo in reference) */}
        <div className="absolute top-20 right-6 z-10 flex flex-col items-center text-center select-none pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-[#2ecc71]/20 border-2 border-[#2ecc71]/60 flex items-center justify-center text-[#2ecc71] mb-1">
            <TreePine className="w-5 h-5" />
          </div>
          <span className="text-[9px] text-white/70 font-semibold leading-tight tracking-wide text-center max-w-[60px]">Wildlife Watch</span>
        </div>

        {/* ── HERO HEADLINE (centre-left, vertically centred) ── */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-8 sm:px-14 lg:px-20 pb-32">
          {/* "the" small italic prefix */}
          <div className="flex items-baseline gap-2 sm:gap-3">
            <span
              className="text-white font-serif italic font-normal select-none"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 3.5rem)', lineHeight: 1 }}
            >
              the
            </span>
            {/* "Forest" — massive mixed-case serif, NOT uppercase */}
            <h1
              className="text-white font-black tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)] leading-none"
              style={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontSize: 'clamp(5rem, 14vw, 13rem)',
                lineHeight: 0.88,
                textTransform: 'none',
              }}
            >
              Forest
            </h1>
          </div>

          {/* "is their house" — white text on solid green banner, full width feel */}
          <div
            className="inline-flex items-center mt-2 sm:mt-3"
            style={{ marginLeft: 'clamp(4rem, 9vw, 12rem)' }}
          >
            <div
              className="bg-[#1e8c3a] px-5 sm:px-8 py-3 sm:py-4"
              style={{ display: 'inline-block' }}
            >
              <span
                className="text-white font-bold tracking-tight leading-none"
                style={{
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  fontSize: 'clamp(2rem, 5.5vw, 5.5rem)',
                }}
              >
                is their house
              </span>
            </div>
          </div>
        </div>

        {/* ── BOTTOM TICKER / STATS BAR ── */}
        <div className="relative z-10 w-full bg-black/60 backdrop-blur-md border-t border-white/10">
          <div className="flex items-stretch divide-x divide-white/10">
            {/* Ticker item 1 */}
            <div className="flex-1 min-w-0 px-4 sm:px-6 py-4 flex flex-col justify-center">
              <div className="w-8 h-[2px] bg-white/50 mb-2" />
              <p className="text-white text-xs sm:text-sm font-bold leading-tight truncate">Defenders Meeting</p>
              <p className="text-white/50 text-[10px] sm:text-xs mt-0.5">01-05 September</p>
            </div>

            {/* Ticker item 2 */}
            <div className="flex-1 min-w-0 px-4 sm:px-6 py-4 flex flex-col justify-center">
              <div className="w-8 h-[2px] bg-white/50 mb-2" />
              <p className="text-white text-xs sm:text-sm font-bold leading-tight truncate">World Animal Rights Day</p>
              <p className="text-white/50 text-[10px] sm:text-xs mt-0.5">10 December</p>
            </div>

            {/* Ticker item 3 */}
            <div className="flex-1 min-w-0 px-4 sm:px-6 py-4 flex flex-col justify-center">
              <div className="w-8 h-[2px] bg-white/50 mb-2" />
              <p className="text-white text-xs sm:text-sm font-bold leading-tight">10 most unusual moms</p>
              <p className="text-white/50 text-[10px] sm:text-xs mt-0.5">from the animal world</p>
            </div>

            {/* Arrow navigation */}
            <div className="px-4 sm:px-6 py-4 flex items-center gap-3">
              <button
                onClick={() => scrollToSection('map-workspace')}
                className="text-white/60 hover:text-white transition-colors text-lg font-light"
                aria-label="previous"
              >
                ←
              </button>
              <button
                onClick={() => scrollToSection('map-workspace')}
                className="text-white/60 hover:text-white transition-colors text-lg font-light"
                aria-label="next"
              >
                →
              </button>
            </div>

            {/* Watch video button */}
            <div className="px-4 sm:px-8 py-4 flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setVideoModalOpen(true)}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center text-black shadow-lg hover:scale-105 transition-transform flex-shrink-0"
                aria-label="Watch video"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
              </button>
              <div className="hidden sm:flex flex-col">
                <span className="text-white text-xs font-bold leading-tight">Watch video</span>
                <span className="text-white/50 text-[10px]">about us</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE GIS SPATIAL WORKSPACE (MAP & INCIDENTS)                    */}
      {/* ========================================================================= */}
      <section id="map-workspace" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider mb-2">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Live Observation Canvas</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Satellite Spatial Telemetry & Change Verification
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Inspect multi-spectral surface reflectance differences computed from Sentinel-2 L2A and Google
              Dynamic World across verified reserve boundaries.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono">
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
              href="/explore"
              className="px-4 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <span>Full GIS Mode</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

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

        {/* Demonstration Disclaimer Banner */}
        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3.5 text-xs text-emerald-200 shadow-lg">
          <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-mono tracking-wide text-emerald-300 uppercase">
              Scientific Demonstration Standard & Disclaimer:{' '}
            </strong>
            This public portal presents curated satellite telemetry observations computed from Sentinel-2
            L2A surface reflectance and Google Dynamic World. Priority scores represent operational
            screening heuristics for field patrols, not confirmed ecological outcome or causation. Exact
            incident coordinates are generalized to prevent exposing sensitive wildlife nesting
            receptors.
          </div>
        </div>

        {/* Curated Reserve Selector Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2">
              <span>Select Curated Demonstration Reserve</span>
              <span className="text-[10px] text-emerald-400 font-normal px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                100% Real PostGIS Geometry
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {demonstrations.map((demo) => {
              const isSelected = activeDemo?.id === demo.id;
              return (
                <button
                  key={demo.id}
                  onClick={() => setActiveDemo(demo)}
                  className={`p-4 rounded-2xl text-left transition-all border ${
                    isSelected
                      ? 'bg-slate-900/90 border-emerald-500 shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-500/40'
                      : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-white tracking-tight">
                      {demo.area_name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
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

        {/* Interactive Spatial Canvas & Inspector */}
        {activeDemo && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map Canvas (2 Columns) */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-white font-medium">{activeDemo.area_name}</span>
                  <span>
                    ({activeDemo.centroid.lat.toFixed(3)}°N, {activeDemo.centroid.lon.toFixed(3)}°E)
                  </span>
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

            {/* Sidebar Inspector (1 Column) */}
            <div className="space-y-4">
              {/* Observation Window Details */}
              <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
                    Observation Windows
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
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

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                  Observation windows reflect identical seasonal dry months to minimize false
                  phenological alarms.
                </div>
              </div>

              {/* Selected Incident Telemetry Inspector */}
              {selectedEvent ? (
                <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
                      Selected Incident
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
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
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-slate-500 text-[10px]">Area</div>
                      <div className="text-slate-200 font-bold">{selectedEvent.affected_area_ha} ha</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-slate-500 text-[10px]">Priority Score</div>
                      <div className="text-emerald-400 font-bold">
                        {selectedEvent.priority_score?.toFixed(2) ?? '—'}
                      </div>
                    </div>
                  </div>

                  {/* Priority Breakdown Components */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-xs">
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
                        <span>Nearest Mapped Track:</span>
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
                      Source: {selectedEvent.context_source}. Distance indicates nearest known feature.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center text-xs text-slate-500 font-mono">
                  Select an incident marker from the map or list below to inspect telemetry evidence.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Curated Incident Gallery */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Curated Change Detection Incidents
              </h3>
              <p className="text-xs text-slate-400">
                Vectorized incident polygons identified across observation windows.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {events.length} Incident{events.length !== 1 ? 's' : ''} Documented
            </span>
          </div>

          {eventsLoading ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center font-mono text-xs text-slate-400">
              Loading incident records...
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center font-mono text-xs text-slate-500">
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
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                        : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
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

        {/* Data Source Registry & Provenance */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                Satellite Telemetry & Ingestion Sources
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Verified provider provenance records matching Copernicus and Open Access standards
              </p>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
              OPEN ACCESS / ODbL
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {overview?.data_sources.map((src, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-1.5"
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
      </section>

      {/* ========================================================================= */}
      {/* 4. PLATFORM FEATURES SHOWCASE                                             */}
      {/* ========================================================================= */}
      <section id="features" className="w-full py-20 bg-slate-950/60 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold tracking-widest text-[#48e596] uppercase">
              Core Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              AI-Driven Planetary Habitat Surveillance
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Harnessing multi-spectral Earth observation and automated heuristic triage to empower
              park rangers, researchers, and wildlife conservationists.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/50 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-[#48e596] mb-5 group-hover:scale-110 transition-transform">
                <Satellite className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Multi-Spectral Analysis</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Computes 10m Sentinel-2 band differences (NDVI, NBR, NDWI) to pinpoint illegal logging,
                canopy disturbance, and water body shrinkage.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/50 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-teal-950/80 border border-teal-500/40 flex items-center justify-center text-teal-400 mb-5 group-hover:scale-110 transition-transform">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">AI Priority Scoring</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Multi-component heuristic engine combining change magnitude (50%), core reserve zone
                sensitivity (30%), and road/settlement proximity (20%).
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/50 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 transition-transform">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Ranger Dispatch</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Direct export of incident polygons to field GPS and patrol routing software, prioritizing
                critical threats before irreversible destruction occurs.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/50 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-5 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Anti-Poaching Privacy</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enforces differential privacy and coordinate generalization on public feeds to prevent
                exposing endangered species denning and nesting sites.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. CONSERVATION IMPACT & METRICS SECTION                                  */}
      {/* ========================================================================= */}
      <section id="impact" className="w-full py-20 bg-[#0b0f14] border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold tracking-widest text-[#48e596] uppercase">
              Proven Conservation Impact
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Safeguarding Critical Ecological Corridors
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Measurable conservation outcomes delivered across protected tiger reserves, biosphere
              reserves, and wildlife sanctuaries globally.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
              <div className="text-4xl sm:text-5xl font-black text-white font-mono">1.4M+</div>
              <div className="text-sm font-semibold text-emerald-400">Hectares Monitored</div>
              <p className="text-xs text-slate-500">Under constant 5-day Sentinel-2 revisit orbit</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
              <div className="text-4xl sm:text-5xl font-black text-white font-mono">420+</div>
              <div className="text-sm font-semibold text-teal-400">Early Alerts Intercepted</div>
              <p className="text-xs text-slate-500">Unauthorized encroachments identified early</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
              <div className="text-4xl sm:text-5xl font-black text-white font-mono">88%</div>
              <div className="text-sm font-semibold text-cyan-400">False Alarms Reduced</div>
              <p className="text-xs text-slate-500">Via dry-season matched baseline windows</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
              <div className="text-4xl sm:text-5xl font-black text-white font-mono">12</div>
              <div className="text-sm font-semibold text-purple-400">Partner Forest Reserves</div>
              <p className="text-xs text-slate-500">Collaborating with local forest departments</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. CONSERVATION STORIES & BLOGS                                           */}
      {/* ========================================================================= */}
      <section id="blogs" className="w-full py-20 bg-slate-950/60 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold tracking-widest text-[#48e596] uppercase">
                Field Dispatches
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
                Conservation Stories & Research
              </h2>
            </div>
            <Link
              href="/explore"
              className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>Explore Interactive Reserve Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Story 1 */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden group hover:border-slate-700 transition-all">
              <div className="relative h-48 w-full overflow-hidden">
                <Image
                  src="/hero-tiger.jpg"
                  alt="Tiger Corridor Story"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-950/80 text-emerald-300 border border-emerald-500/30">
                  Tiger Telemetry
                </span>
              </div>
              <div className="p-5 space-y-2">
                <span className="text-[11px] text-slate-500 font-mono">September 2026 • 6 min read</span>
                <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                  The Corridors of Kanha: Safeguarding Central India&apos;s Tiger Dispersal
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2">
                  How high-frequency satellite telemetry helps preserve forest stepping stones between
                  Kanha and Pench Tiger Reserves.
                </p>
              </div>
            </div>

            {/* Story 2 */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden group hover:border-slate-700 transition-all">
              <div className="relative h-48 w-full overflow-hidden">
                <Image
                  src="/story-elephant.jpg"
                  alt="Elephant Migration Story"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-950/80 text-teal-300 border border-teal-500/30">
                  Habitat Corridors
                </span>
              </div>
              <div className="p-5 space-y-2">
                <span className="text-[11px] text-slate-500 font-mono">August 2026 • 8 min read</span>
                <h3 className="text-base font-bold text-white group-hover:text-teal-400 transition-colors">
                  Dry-Season Spectral Analysis: Distinguishing Leaf-Fall from Deforestation
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2">
                  Leveraging matched temporal observation windows to eliminate seasonal false alarms in
                  tropical dry deciduous ecosystems.
                </p>
              </div>
            </div>

            {/* Story 3 */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden group hover:border-slate-700 transition-all">
              <div className="relative h-48 w-full overflow-hidden">
                <Image
                  src="/attenborough.jpg"
                  alt="Sir David Attenborough Voice Story"
                  fill
                  className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-950/80 text-cyan-300 border border-cyan-500/30">
                  Global Voice
                </span>
              </div>
              <div className="p-5 space-y-2">
                <span className="text-[11px] text-slate-500 font-mono">July 2026 • 5 min read</span>
                <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors">
                  AI in the Bush: How Forest Rangers Use Satellite Change Alerts
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2">
                  Frontline patrol commanders share how priority-scored polygons reduced investigation
                  times from weeks to under 48 hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. ABOUT & SCIENTIFIC COMMITMENT                                          */}
      {/* ========================================================================= */}
      <section id="about" className="w-full py-20 bg-[#0b0f14] border-t border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-center">
          <span className="text-xs font-mono font-bold tracking-widest text-[#48e596] uppercase">
            About Our Mission
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Scientific Rigor Meets Autonomous Satellite Intelligence
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Wildlife Watch was conceived to bridge the gap between orbital satellite telemetry and on-the-ground
            conservation enforcement. By combining European Space Agency Copernicus Sentinel-2 surface
            reflectance with AI-powered multi-factor spatial heuristics, we provide an open, transparent,
            and privacy-conscious system dedicated to protecting our planet&apos;s biodiversity.
          </p>

          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <Link
              href="/explore"
              className="px-6 py-3 rounded-full bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold border border-slate-700 flex items-center gap-2"
            >
              <span>Explore Spatial Engine</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 rounded-full bg-[#48e596] hover:bg-[#3cd084] text-slate-950 text-xs sm:text-sm font-bold flex items-center gap-2"
            >
              <span>Sign In as Ranger</span>
              <ShieldCheck className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. CONTACT & CLEARANCE REQUEST                                            */}
      {/* ========================================================================= */}
      <section id="contact" className="w-full py-16 bg-slate-950 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <h3 className="text-2xl font-bold text-white">Join the Conservation Telemetry Network</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Are you a protected area warden, wildlife NGO, or GIS researcher? Request authorized telemetry
            access or register your reserve boundary for continuous automated monitoring.
          </p>
          <div className="pt-2 flex justify-center">
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-full bg-[#48e596] hover:bg-[#3cd084] text-slate-950 text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/20"
            >
              Request Ranger Clearance
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. PUBLIC FOOTER                                                          */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-800 bg-[#070a0e] px-6 lg:px-12 py-8 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
            <TreePine className="w-4 h-4" />
          </div>
          <span>Wildlife Watch • Habitat Monitoring & Change Detection System v1.0</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-slate-400">
          <button onClick={() => scrollToSection('home')} className="hover:text-white transition-colors">
            Back to Top
          </button>
          <span>•</span>
          <Link href="/login" className="hover:text-white transition-colors">
            Ranger Portal
          </Link>
          <span>•</span>
          <Link href="/explore" className="hover:text-white transition-colors">
            Interactive GIS
          </Link>
          <span>•</span>
          <span>© OpenStreetMap (ODbL) • Copernicus Sentinel-2</span>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 10. INTERACTIVE VIDEO MODAL                                               */}
      {/* ========================================================================= */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xl p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl space-y-0">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Wildlife Watch • Our Story</h4>
                  <p className="text-[11px] text-slate-400">
                    Defending Endangered Habitats with Space Telemetry
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVideoModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Player Box */}
            <div className="relative w-full aspect-video bg-black flex items-center justify-center">
              <video
                controls
                autoPlay
                className="w-full h-full object-contain"
                poster="/story-elephant.jpg"
              >
                <source
                  src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
                  type="video/mp4"
                />
                Your browser does not support video playback.
              </video>
            </div>

            {/* Modal Footer Note */}
            <div className="px-6 py-3 bg-slate-950 text-xs text-slate-400 flex items-center justify-between">
              <span>Featuring Field Operations from Central India Tiger Reserves</span>
              <button
                onClick={() => setVideoModalOpen(false)}
                className="text-emerald-400 hover:text-emerald-300 font-medium"
              >
                Close Video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 11. QUICK SEARCH MODAL                                                    */}
      {/* ========================================================================= */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center gap-3">
              <Search className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reserves, countries, or designations (e.g. Kanha, Tiger Reserve)..."
                autoFocus
                className="w-full bg-transparent border-none text-white text-sm focus:outline-none placeholder:text-slate-500"
              />
              <button
                onClick={() => setSearchModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filteredDemos.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 font-mono">
                  No matching reserves found for &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                filteredDemos.map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => {
                      setActiveDemo(demo);
                      setSearchModalOpen(false);
                      scrollToSection('map-workspace');
                    }}
                    className="w-full p-3 rounded-xl hover:bg-slate-800/80 flex items-center justify-between text-left transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">{demo.area_name}</div>
                      <div className="text-xs text-slate-400">{demo.designation} • {demo.country}</div>
                    </div>
                    <span className="text-xs font-mono text-emerald-400">{demo.area_km2.toLocaleString()} km²</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
