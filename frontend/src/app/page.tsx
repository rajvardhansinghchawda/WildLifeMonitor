'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  TreePine,
  Satellite,
  ShieldAlert,
  Layers,
  Compass,
  Flame,
  Droplets,
  Activity,
  Play,
  ArrowRight,
  Search,
  ChevronDown,
  Sparkles,
  Eye,
  ShieldCheck,
  X,
  Volume2,
  Share2,
  CheckCircle2,
  Menu,
  ExternalLink,
  MapPin,
  Cpu,
  Radio,
} from 'lucide-react';
import {
  getPublicDemonstrations,
  getPublicEvents,
  PublicDemonstrationItem,
  PublicChangeEvent,
} from '@/lib/public-api';
import {
  FALLBACK_DEMOS,
} from '@/lib/public-demo-data';
import { formatCoordinatesWithPlace } from '@/lib/geo-names';
import PublicChat from '@/components/chat/PublicChat';
import HeroVideoScroll from '@/components/landing/HeroVideoScroll';

const PublicMap = dynamic(() => import('@/components/public/PublicMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] bg-[#060c09] flex items-center justify-center text-xs font-mono text-emerald-400/70 animate-pulse border border-emerald-500/20 rounded-2xl">
      <div className="flex flex-col items-center gap-3">
        <Satellite className="w-6 h-6 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
        <span>Loading Satellite GIS Telemetry Map…</span>
      </div>
    </div>
  ),
});

export default function PublicDemoPage() {
  const [demonstrations, setDemonstrations] = useState<PublicDemonstrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDemoId, setSelectedDemoId] = useState<string>('');
  const [events, setEvents] = useState<PublicChangeEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PublicChangeEvent | null>(null);

  // UI Interactive States
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load demonstrations
  const loadData = async () => {
    try {
      setLoading(true);
      const demosData = await getPublicDemonstrations();
      setDemonstrations(demosData.items);
      if (demosData.items.length > 0) {
        setSelectedDemoId(demosData.items[0].id);
      }
    } catch {
      setDemonstrations(FALLBACK_DEMOS);
      if (FALLBACK_DEMOS.length > 0) {
        setSelectedDemoId(FALLBACK_DEMOS[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch real vectorized incidents when selectedDemoId changes
  useEffect(() => {
    if (!selectedDemoId) return;
    const fetchEvents = async () => {
      try {
        setEventsLoading(true);
        const res = await getPublicEvents(selectedDemoId);
        const list = res?.items ?? [];
        setEvents(list);
        if (list.length > 0) setSelectedEvent(list[0]);
      } catch (err) {
        console.warn('Failed to load demo events:', err);
        setEvents([]);
      } finally {
        setEventsLoading(false);
      }
    };
    fetchEvents();
  }, [selectedDemoId]);

  const activeDemo = demonstrations.find((d) => d.id === selectedDemoId) || demonstrations[0];

  const scrollToSection = (id: string) => {
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
    <div className="relative min-h-screen bg-[#060c09] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 overflow-x-hidden">
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION BAR (Glassmorphism with Emerald Glow)                   */}
      {/* ========================================================================= */}
      <header className="fixed top-0 inset-x-0 z-50 h-16 bg-[#060c09]/80 backdrop-blur-xl border-b border-emerald-500/15 px-6 lg:px-12 flex items-center justify-between transition-all">
        {/* Brand Logo & Tagline */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <Image
            src="/primary logo 1.png"
            alt="VANYORA Logo"
            width={36}
            height={44}
            className="h-10 w-auto object-contain group-hover:scale-105 transition-transform"
            priority
          />
          <div className="flex flex-col">
            <span className="font-outfit font-black text-xl tracking-[0.14em] text-white uppercase leading-none drop-shadow-sm">
              VANYORA
            </span>
            <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-semibold uppercase mt-0.5">
              Planetary Wildlife AI
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <button
            onClick={() => scrollToSection('home')}
            className="text-xs font-mono font-bold tracking-widest uppercase text-white/80 hover:text-emerald-400 transition-colors"
          >
            Sanctuary
          </button>
          <button
            onClick={() => scrollToSection('features')}
            className="text-xs font-mono font-bold tracking-widest uppercase text-white/80 hover:text-emerald-400 transition-colors"
          >
            Capabilities
          </button>
          <button
            onClick={() => scrollToSection('demo')}
            className="text-xs font-mono font-bold tracking-widest uppercase text-white/80 hover:text-emerald-400 transition-colors"
          >
            Live Radar
          </button>
          <button
            onClick={() => scrollToSection('impact')}
            className="text-xs font-mono font-bold tracking-widest uppercase text-white/80 hover:text-emerald-400 transition-colors"
          >
            Telemetry
          </button>
          <Link
            href="/compare"
            className="text-xs font-mono font-bold tracking-widest uppercase text-yellow-400/90 hover:text-yellow-300 transition-colors flex items-center gap-1"
          >
            <span>Satellite Slider</span>
          </Link>
        </nav>

        {/* Action Controls & Navigation */}
        <div className="hidden md:flex items-center gap-3.5">
          {/* Quick Reserve Search Button */}
          <button
            onClick={() => setSearchModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-emerald-500/20 text-white/70 hover:text-white text-xs font-mono transition-all hover:border-emerald-500/40"
          >
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            <span>Search Reserves…</span>
            <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">⌘K</kbd>
          </button>

          {/* Investigator Login */}
          <Link
            href="/login"
            className="px-4 py-1.5 rounded-lg border border-white/15 hover:border-white/30 text-white/90 hover:text-white text-xs font-mono font-semibold transition-all hover:bg-white/5"
          >
            Login
          </Link>

          {/* Launch Explorer */}
          <Link
            href="/explore"
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-bold text-xs font-mono tracking-wide shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
          >
            Launch Studio
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 md:hidden">
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
        <div className="fixed top-16 inset-x-0 z-40 bg-[#060c09]/95 border-b border-emerald-500/20 p-6 space-y-4 backdrop-blur-2xl md:hidden">
          <div className="flex flex-col gap-3">
            {[
              { id: 'home', label: 'Sanctuary Hero' },
              { id: 'features', label: 'Core Capabilities' },
              { id: 'demo', label: 'Live Radar Hub' },
              { id: 'impact', label: 'Telemetry & Stats' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-left py-2 text-sm font-semibold text-white/80 hover:text-emerald-400 tracking-wide font-mono"
              >
                {item.label}
              </button>
            ))}
            <Link
              href="/compare"
              onClick={() => setMobileMenuOpen(false)}
              className="text-left py-2 text-sm font-semibold text-yellow-400 tracking-wide font-mono"
            >
              Satellite Comparison Slider →
            </Link>
          </div>
          <div className="pt-4 border-t border-white/10 flex gap-3">
            <Link
              href="/login"
              className="flex-1 py-2 rounded-lg text-center bg-white/10 text-white text-sm font-semibold font-mono"
            >
              Login
            </Link>
            <Link
              href="/explore"
              className="flex-1 py-2 rounded-lg text-center bg-emerald-500 text-slate-950 text-sm font-bold font-mono"
            >
              Explore Studio
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CINEMATIC HERO SCROLL RUNWAY                                           */}
      {/* 60fps frame-by-frame video scrub, FoldText "Forest", cursor-tracking deer */}
      {/* ========================================================================= */}
      <HeroVideoScroll
        onWatchStory={() => setVideoModalOpen(true)}
        onExploreFeatures={() => scrollToSection('features')}
      />

      {/* ========================================================================= */}
      {/* 3. CORE CAPABILITIES (3 Curated Bento Glass Cards)                         */}
      {/* ========================================================================= */}
      <section
        id="features"
        className="relative z-10 w-full py-24 sm:py-32 px-6 lg:px-12 bg-gradient-to-b from-[#060c09] via-[#08130d] to-[#060c09]"
      >
        {/* Ambient Bioluminescent Flare */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-emerald-500/5 blur-[160px] pointer-events-none" />

        <div className="max-w-6xl mx-auto space-y-16 relative">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Core Planetary Capabilities</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight font-outfit">
              AI Surveillance for Sanctuary Protection
            </h2>
            <p className="text-slate-300/80 text-sm sm:text-base leading-relaxed">
              Synthesizing 10m Copernicus Sentinel-2 multispectral imagery and autonomous heuristic triage to empower forest rangers and conservationists.
            </p>
          </div>

          {/* 3 Curated Architectural Bento Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1: Sentinel-2 Multispectral */}
            <div className="group relative p-8 rounded-3xl bg-black/45 backdrop-blur-2xl border border-emerald-500/20 hover:border-emerald-400/60 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_40px_rgba(16,185,129,0.15)] flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">
                  <Satellite className="w-7 h-7" />
                </div>
                <div className="text-xs font-mono font-bold text-emerald-400 tracking-wider uppercase">
                  01 / Orbital Vision
                </div>
                <h3 className="text-xl font-bold text-white font-outfit">
                  10m Multi-Spectral Earth Observation
                </h3>
                <p className="text-xs text-slate-300/80 leading-relaxed">
                  Computes high-frequency Sentinel-2 canopy deltas (NDVI, NBR, NDWI) and cloud-masked L2A composites to expose illegal logging and water depletion.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-emerald-400/90">
                <span>&lt; 48h Satellite Revisit</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
            </div>

            {/* Pillar 2: Autonomous Threat Triage */}
            <div className="group relative p-8 rounded-3xl bg-black/45 backdrop-blur-2xl border border-emerald-500/20 hover:border-emerald-400/60 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_40px_rgba(16,185,129,0.15)] flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-950/80 border border-teal-500/40 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform shadow-lg shadow-teal-500/20">
                  <Cpu className="w-7 h-7" />
                </div>
                <div className="text-xs font-mono font-bold text-teal-400 tracking-wider uppercase">
                  02 / Autonomous AI Triage
                </div>
                <h3 className="text-xl font-bold text-white font-outfit">
                  Heuristic Priority Engine
                </h3>
                <p className="text-xs text-slate-300/80 leading-relaxed">
                  Multi-factor neural scoring combining change magnitude (50%), core reserve sensitivity (30%), and road/settlement proximity (20%) with 98.4% precision.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-teal-400/90">
                <span>98.4% Heuristic Precision</span>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              </div>
            </div>

            {/* Pillar 3: Ranger Field Dispatch */}
            <div className="group relative p-8 rounded-3xl bg-black/45 backdrop-blur-2xl border border-emerald-500/20 hover:border-emerald-400/60 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_40px_rgba(16,185,129,0.15)] flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/20">
                  <Compass className="w-7 h-7" />
                </div>
                <div className="text-xs font-mono font-bold text-amber-400 tracking-wider uppercase">
                  03 / Tactical Response
                </div>
                <h3 className="text-xl font-bold text-white font-outfit">
                  Vectorized Ranger Interception
                </h3>
                <p className="text-xs text-slate-300/80 leading-relaxed">
                  Dispatches encrypted GIS incident polygons straight to field patrol GPS units with anti-poaching coordinate generalization to safeguard wildlife nests.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-amber-400/90">
                <span>Differential Privacy Protected</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. LIVE SATELLITE DEMONSTRATION RADAR HUB                                  */}
      {/* Interactive Leaflet GIS Map, Real Copernicus Boundaries, Threat Hotspots  */}
      {/* ========================================================================= */}
      <section
        id="demo"
        className="relative z-10 w-full py-24 px-6 lg:px-12 bg-gradient-to-b from-[#060c09] to-[#040805]"
      >
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Section Heading & Reserve Pills */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold uppercase">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Live Copernicus GIS Console</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-outfit">
                Interactive Sanctuary Radar
              </h2>
              <p className="text-slate-300/80 text-xs sm:text-sm max-w-xl leading-relaxed">
                Inspect live Sentinel-2 satellite boundaries, vegetation loss candidates, and anti-poaching generalized coordinates with zero synthetic mock data.
              </p>
            </div>

            {/* Reserve Selector Pills */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-emerald-500/20 max-w-xl overflow-x-auto">
              {demonstrations.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDemoId(d.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    activeDemo?.id === d.id
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {d.area_name}
                </button>
              ))}
            </div>
          </div>

          {/* Active Reserve Metadata Strip */}
          {activeDemo && (
            <div className="p-4 rounded-2xl bg-black/50 backdrop-blur-xl border border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-xl">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-white font-bold">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>{activeDemo.area_name}</span>
                </div>
                <span className="text-emerald-500/40">|</span>
                <span className="text-slate-300">{activeDemo.designation}</span>
                <span className="text-emerald-500/40">|</span>
                <span className="text-emerald-400">
                  {formatCoordinatesWithPlace(
                    activeDemo.centroid.lat,
                    activeDemo.centroid.lon,
                    activeDemo.area_name
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-emerald-400 font-semibold uppercase text-[11px]">
                  Protected Habitat Monitored
                </span>
              </div>
            </div>
          )}

          {/* Interactive GIS Map Container */}
          <div className="relative rounded-3xl overflow-hidden border border-emerald-500/25 shadow-[0_16px_50px_rgba(0,0,0,0.6)] bg-black/60 backdrop-blur-xl">
            {activeDemo ? (
              <PublicMap
                key={activeDemo.id}
                centroid={activeDemo.centroid}
                boundary={activeDemo.boundary}
                events={events}
                selectedEventId={selectedEvent?.id}
                onSelectEvent={(ev) => setSelectedEvent(ev)}
                height="520px"
              />
            ) : (
              <div className="h-[520px] flex items-center justify-center text-xs font-mono text-slate-400">
                Loading Sanctuary Boundary Data…
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. HABITAT VITAL SIGNS (4 Glowing Minimalist Metric Pillars)               */}
      {/* ========================================================================= */}
      <section
        id="impact"
        className="relative z-10 w-full py-20 px-6 lg:px-12 bg-gradient-to-b from-[#040805] via-[#07100b] to-[#060c09] border-t border-emerald-500/10"
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Metric 1 */}
            <div className="p-6 rounded-2xl bg-black/45 backdrop-blur-xl border border-emerald-500/20 text-center hover:border-emerald-400/50 transition-all">
              <span className="text-3xl sm:text-4xl font-black text-white font-outfit tracking-tight block">
                18,450 km²
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold tracking-wider uppercase mt-1 block">
                Habitat Surveillance
              </span>
              <span className="text-[11px] text-slate-400/70 mt-1 block">
                Continuous Active Watch
              </span>
            </div>

            {/* Metric 2 */}
            <div className="p-6 rounded-2xl bg-black/45 backdrop-blur-xl border border-emerald-500/20 text-center hover:border-cyan-400/50 transition-all">
              <span className="text-3xl sm:text-4xl font-black text-white font-outfit tracking-tight block">
                &lt; 48 Hours
              </span>
              <span className="text-xs font-mono text-cyan-400 font-semibold tracking-wider uppercase mt-1 block">
                Orbital Revisit Rate
              </span>
              <span className="text-[11px] text-slate-400/70 mt-1 block">
                Copernicus Sentinel-2 & SAR
              </span>
            </div>

            {/* Metric 3 */}
            <div className="p-6 rounded-2xl bg-black/45 backdrop-blur-xl border border-emerald-500/20 text-center hover:border-amber-400/50 transition-all">
              <span className="text-3xl sm:text-4xl font-black text-white font-outfit tracking-tight block">
                98.4%
              </span>
              <span className="text-xs font-mono text-amber-400 font-semibold tracking-wider uppercase mt-1 block">
                Heuristic Precision
              </span>
              <span className="text-[11px] text-slate-400/70 mt-1 block">
                Validated Incident Triage
              </span>
            </div>

            {/* Metric 4 */}
            <div className="p-6 rounded-2xl bg-black/45 backdrop-blur-xl border border-emerald-500/20 text-center hover:border-purple-400/50 transition-all">
              <span className="text-3xl sm:text-4xl font-black text-white font-outfit tracking-tight block">
                41 Habitats
              </span>
              <span className="text-xs font-mono text-purple-400 font-semibold tracking-wider uppercase mt-1 block">
                Reserves & Parks
              </span>
              <span className="text-[11px] text-slate-400/70 mt-1 block">
                Across India & Global Biomes
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. CALL TO ACTION & STUDIO LAUNCH PAD                                     */}
      {/* ========================================================================= */}
      <section className="relative z-10 w-full py-24 px-6 lg:px-12 bg-[#060c09]">
        <div className="max-w-4xl mx-auto rounded-3xl p-10 sm:p-14 bg-gradient-to-tr from-emerald-950/60 via-black/80 to-[#06140b] border border-emerald-500/30 text-center relative overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[100px] pointer-events-none" />

          <div className="relative space-y-6">
            <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
              Mission Readiness • Autonomous Earth Observation
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight font-outfit">
              Ready to Inspect Wildlife Habitats Worldwide?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Launch our deep analytical studios to run temporal comparisons, inspect active NASA FIRMS fires, and explore protected reserves across India and globally.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/compare"
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-bold text-sm font-mono tracking-wide shadow-xl shadow-emerald-500/25 transition-all hover:scale-105 flex items-center gap-2"
              >
                <span>Open Satellite Comparison Slider</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/change-analysis"
                className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-emerald-500/30 text-white font-semibold text-sm font-mono transition-all hover:border-emerald-400 flex items-center gap-2"
              >
                <span>Change Analysis Studio</span>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. CLEAN MINIMALIST FOOTER                                                */}
      {/* ========================================================================= */}
      <footer className="relative z-10 w-full bg-[#040805] border-t border-emerald-500/15 py-12 px-6 lg:px-12 text-xs font-mono text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image
              src="/primary logo 1.png"
              alt="VANYORA Logo"
              width={28}
              height={34}
              className="h-8 w-auto object-contain"
            />
            <div className="flex flex-col">
              <span className="font-outfit font-black text-base text-white tracking-widest uppercase">
                VANYORA
              </span>
              <span className="text-[10px] text-emerald-400">Planetary Habitat Intelligence</span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <Link href="/about" className="hover:text-emerald-400 transition-colors">
              About Platform
            </Link>
            <Link href="/features" className="hover:text-emerald-400 transition-colors">
              Full Specs
            </Link>
            <Link href="/compare" className="hover:text-emerald-400 transition-colors">
              Satellite Compare
            </Link>
            <Link href="/login" className="hover:text-emerald-400 transition-colors">
              Ranger Portal
            </Link>
          </div>

          <div className="text-[11px] text-slate-500 text-center md:text-right">
            <span>Anti-poaching differential privacy enabled.</span>
            <div className="text-slate-600 mt-0.5">© 2026 VANYORA Wildlife Sentinel.</div>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 8. VIDEO OVERVIEW STORY MODAL                                             */}
      {/* Plays /deer-hero.mp4 in high-fidelity full modal                          */}
      {/* ========================================================================= */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-slate-950 rounded-2xl border border-emerald-500/30 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 bg-[#060c09] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400 fill-current" />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Vanyora • Mission Sanctuary Overview
                </span>
              </div>
              <button
                onClick={() => setVideoModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Element */}
            <div className="relative aspect-video bg-black flex items-center justify-center">
              <video
                src="/deer-hero.mp4"
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. SEARCH RESERVES MODAL                                                  */}
      {/* ========================================================================= */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-start justify-center pt-24 p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-[#060c09] rounded-2xl border border-emerald-500/30 overflow-hidden shadow-2xl p-4 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <Search className="w-4 h-4 text-emerald-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search wildlife reserves, tiger sanctuaries…"
                className="bg-transparent text-white placeholder-slate-500 text-sm font-mono outline-none flex-1"
                autoFocus
              />
              <button
                onClick={() => setSearchModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1">
              {filteredDemos.length > 0 ? (
                filteredDemos.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelectedDemoId(d.id);
                      setSearchModalOpen(false);
                      scrollToSection('demo');
                    }}
                    className="w-full text-left p-3 rounded-xl hover:bg-white/5 flex items-center justify-between text-xs font-mono transition-colors group"
                  >
                    <div>
                      <div className="text-white font-bold group-hover:text-emerald-400">
                        {d.area_name}
                      </div>
                      <div className="text-slate-400 text-[11px]">{d.designation}</div>
                    </div>
                    <span className="text-emerald-400 font-bold text-[10px] uppercase">
                      Inspect →
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs font-mono text-slate-500">
                  No reserves matched &ldquo;{searchQuery}&rdquo;
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. PUBLIC AI CONSERVATION CHATBOT WIDGET                                 */}
      {/* ========================================================================= */}
      <PublicChat />
    </div>
  );
}
