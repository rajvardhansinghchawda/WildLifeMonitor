'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  TreePine,
  Search,
  Menu,
  X,
  ArrowRight,
  Play,
  Leaf,
  TrendingUp,
  Globe,
  Users,
  Satellite,
  ShieldCheck,
  Compass,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export default function AboutPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoTitle, setVideoTitle] = useState('A Healthier Tomorrow');
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const openVideo = (title: string) => {
    setVideoTitle(title);
    setVideoModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-slate-800 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* ========================================================================= */}
      {/* 1. LIGHT HEADER / NAVBAR                                                  */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 h-20 bg-[#f7f8f5]/90 backdrop-blur-md border-b border-slate-200/80 px-6 lg:px-12 flex items-center justify-between transition-all">
        {/* Brand Logo & Tagline */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <Image
            src="/primary logo 1.png"
            alt="Wildlife Watch Logo"
            width={34}
            height={42}
            className="h-10 w-auto object-contain group-hover:scale-105 transition-transform"
            priority
          />
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight text-slate-900 leading-tight">
              Wildlife Watch
            </span>
            <span className="text-[11px] text-slate-500 font-medium tracking-wider">
              Monitor • Protect • Conserve
            </span>
          </div>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { id: 'home', label: 'Home', href: '/' },
            { id: 'about', label: 'About', href: '/about' },
            { id: 'features', label: 'Features', href: '/features' },
            { id: 'impact', label: 'Impact', href: '/#impact' },
            { id: 'blogs', label: 'Blogs', href: '/blogs' },
            { id: 'contact', label: 'Contact', href: '/#contact' },
          ].map((item) => {
            const isActive = item.id === 'about';
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`relative py-1 text-sm font-medium transition-colors ${
                  isActive ? 'text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#0d472a] rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Icons & Buttons */}
        <div className="hidden sm:flex items-center gap-4">
          <button
            onClick={() => setSearchModalOpen(true)}
            aria-label="Search"
            className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
          >
            <Search className="w-4 h-4" />
          </button>

          <Link
            href="/login"
            className="px-5 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-300 text-xs sm:text-sm font-medium text-slate-800 transition-all shadow-sm"
          >
            Login
          </Link>

          <Link
            href="/explore"
            className="px-5 py-2 rounded-full bg-[#0d472a] hover:bg-[#09331e] text-white text-xs sm:text-sm font-bold tracking-tight shadow-md shadow-emerald-950/20 transition-all hover:scale-105 active:scale-95"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => setSearchModalOpen(true)}
            className="p-2 text-slate-600 hover:text-slate-900"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:text-slate-900"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="fixed top-20 inset-x-0 z-40 bg-[#f7f8f5] border-b border-slate-200 p-6 space-y-4 shadow-xl md:hidden">
          <div className="flex flex-col gap-3">
            {[
              { label: 'Home', href: '/' },
              { label: 'About', href: '/about' },
              { label: 'Features', href: '/features' },
              { label: 'Impact', href: '/#impact' },
              { label: 'Blogs', href: '/blogs' },
              { label: 'Contact', href: '/#contact' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="py-2 text-sm font-semibold text-slate-800 hover:text-[#0d472a]"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-200 flex gap-3">
            <Link
              href="/login"
              className="flex-1 py-2 rounded-full text-center bg-white border border-slate-300 text-slate-800 text-sm font-medium"
            >
              Login
            </Link>
            <Link
              href="/explore"
              className="flex-1 py-2 rounded-full text-center bg-[#0d472a] text-white text-sm font-bold"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. HERO & MISSION SECTION (MATCHING MOCKUP)                               */}
      {/* ========================================================================= */}
      <section className="relative w-full pt-8 sm:pt-14 pb-12 overflow-hidden">
        {/* Elephant Backdrop (Desktop Right Side) */}
        <div className="absolute right-0 top-0 bottom-0 w-full lg:w-3/5 z-0 pointer-events-none opacity-90 lg:opacity-100">
          <Image
            src="/about-elephant.jpg"
            alt="Majestic elephant in lush forest mountain canopy"
            fill
            priority
            className="object-cover object-right-top lg:object-center"
            quality={95}
          />
          {/* Subtle Gradient Blend to Ivory Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#f7f8f5] via-[#f7f8f5]/80 sm:via-[#f7f8f5]/50 to-transparent lg:w-2/3" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f7f8f5] to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Heading & Narrative */}
          <div className="lg:col-span-7 space-y-5 max-w-xl">
            {/* Pill Badge */}
            <div className="inline-block px-3.5 py-1 rounded-full bg-[#e6efe8] border border-[#c8e6c9] text-[#0d472a] text-xs font-bold uppercase tracking-wider">
              About Us
            </div>

            {/* Giant Title */}
            <h1 className="text-5xl sm:text-6xl lg:text-[76px] font-black tracking-tight leading-[0.98] text-slate-950 font-sans">
              Why<br />
              Wildlife Watch?
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm font-extrabold tracking-widest text-[#15803d] uppercase font-mono pt-1">
              A Healthier Planet Starts With A Deeper Understanding
            </p>

            {/* Narrative Paragraph */}
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Wildlife is under constant threat — from habitat loss, climate change, poaching, and human
              expansion. Wildlife Watch exists to bring technology, data and people together to protect
              what matters.
            </p>

            {/* Mission CTA Button */}
            <div className="pt-2">
              <a
                href="#pillars"
                className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-[#0d472a] hover:bg-[#08301c] text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-950/20 transition-all hover:scale-105 active:scale-95"
              >
                <span>Our Mission</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Right Column: John Muir Quote & Video Badge */}
          <div className="lg:col-span-5 flex flex-col justify-between h-full pt-4 lg:pt-10 lg:pl-8 space-y-24 sm:space-y-36">
            {/* John Muir Quote */}
            <div className="max-w-xs bg-white/60 sm:bg-transparent p-4 sm:p-0 rounded-2xl backdrop-blur-sm sm:backdrop-blur-none">
              <p className="font-serif italic text-slate-800 text-base sm:text-lg leading-relaxed">
                &ldquo;In every walk<br />
                with nature, one<br />
                receives far more<br />
                than he seeks.&rdquo;
              </p>
              <p className="text-xs font-sans text-slate-500 font-semibold mt-2">
                — John Muir
              </p>
            </div>

            {/* "A Healthier Tomorrow" Play Button Trigger */}
            <div className="flex justify-end pr-2 sm:pr-8">
              <button
                onClick={() => openVideo('A Healthier Tomorrow')}
                className="flex items-center gap-3 bg-white/90 hover:bg-white p-2 sm:p-2.5 pr-4 rounded-full border border-slate-200/80 shadow-lg hover:scale-105 transition-all group backdrop-blur-md"
              >
                <div className="w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center text-white group-hover:scale-105 transition-transform shadow-md">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
                <span className="text-xs font-bold text-slate-900 tracking-tight text-left">
                  A Healthier<br />Tomorrow
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. FOUR CORE PILLAR FEATURE CARDS                                         */}
      {/* ========================================================================= */}
      <section id="pillars" className="relative z-20 max-w-7xl mx-auto px-6 lg:px-12 -mt-4 sm:mt-2 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Protect Biodiversity */}
          <div className="bg-white rounded-3xl p-7 shadow-xl shadow-slate-200/70 border border-slate-100 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#e6efe8] flex items-center justify-center text-[#0d472a] mb-6 group-hover:scale-110 transition-transform">
                <Leaf className="w-6 h-6 fill-current" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-950 mb-2 leading-snug">
                Protect<br />Biodiversity
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Monitor habitats and support conservation efforts.
              </p>
            </div>
          </div>

          {/* Card 2: Enable Evidence-Based Action */}
          <div className="bg-white rounded-3xl p-7 shadow-xl shadow-slate-200/70 border border-slate-100 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#e6efe8] flex items-center justify-center text-[#0d472a] mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-950 mb-2 leading-snug">
                Enable Evidence-<br />Based Action
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Provide reliable insights for real-world impact.
              </p>
            </div>
          </div>

          {/* Card 3: Build a Sustainable Future */}
          <div className="bg-white rounded-3xl p-7 shadow-xl shadow-slate-200/70 border border-slate-100 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#e6efe8] flex items-center justify-center text-[#0d472a] mb-6 group-hover:scale-110 transition-transform">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-950 mb-2 leading-snug">
                Build a Sustainable<br />Future
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Help create a balance between people and wildlife.
              </p>
            </div>
          </div>

          {/* Card 4: Empower Communities */}
          <div className="bg-white rounded-3xl p-7 shadow-xl shadow-slate-200/70 border border-slate-100 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#e6efe8] flex items-center justify-center text-[#0d472a] mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-950 mb-2 leading-snug">
                Empower<br />Communities
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Make conservation a shared responsibility.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. BOTTOM MISTY MOUNTAIN HORIZON BANNER                                   */}
      {/* ========================================================================= */}
      <section className="relative w-full min-h-[300px] sm:min-h-[360px] flex items-center overflow-hidden">
        {/* Background Image: Misty Mountain Pine Forest */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/misty-pines.jpg"
            alt="Misty pine tree mountain ridges and forest canopy"
            fill
            className="object-cover object-center"
            quality={95}
          />
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]" />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#f7f8f5] to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl w-full mx-auto px-6 lg:px-12 py-12 flex flex-col sm:flex-row items-center justify-between gap-8">
          {/* Left: Cursive Handwriting Calligraphy */}
          <div className="text-center sm:text-left">
            <p className="font-caveat text-3xl sm:text-4xl lg:text-5xl text-white font-bold leading-tight drop-shadow-lg select-none">
              Healthy ecosystems.<br />
              Thriving wildlife.<br />
              A brighter tomorrow.
            </p>
          </div>

          {/* Right: Floating Play Widget "Our Impact in 2 Minutes" */}
          <div>
            <button
              onClick={() => openVideo('Our Impact in 2 Minutes')}
              className="flex items-center gap-3.5 bg-slate-950/80 hover:bg-slate-950 px-5 py-3 rounded-full border border-white/20 shadow-2xl transition-all hover:scale-105 active:scale-95 group backdrop-blur-md"
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-950 group-hover:scale-110 transition-transform shadow-md">
                <Play className="w-4 h-4 fill-current ml-0.5 text-slate-950" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-white tracking-tight drop-shadow text-left">
                Our Impact<br />in 2 Minutes
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. DETAILED CONSERVATION TECHNOLOGY & ETHOS SECTION                      */}
      {/* ========================================================================= */}
      <section className="w-full py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold tracking-widest text-[#15803d] uppercase">
              Operational Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Bridging Earth Observation and Ranger Enforcement
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Traditional conservation relies on retrospective ground patrols or sporadic aerial
              surveys. Wildlife Watch shifts the paradigm to autonomous multi-spectral telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-[#f7f8f5] border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#0d472a] text-white flex items-center justify-center mb-4">
                <Satellite className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Orbital Constellations</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                European Space Agency Copernicus Sentinel-2 L2A surface reflectance data combined with
                Google Dynamic World land cover at 10m/pixel resolution.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#f7f8f5] border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#0d472a] text-white flex items-center justify-center mb-4">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Dry-Season Calibration</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Observation windows are strictly matched against identical dry-season dates to eliminate
                natural phenological leaf-fall and minimize false alarms.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#f7f8f5] border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#0d472a] text-white flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Differential Privacy</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Coordinates on public feeds are systematically generalized to prevent exposing sensitive
                nesting and denning sites to illegal poachers.
              </p>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-[#0d472a] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-emerald-950/20">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-xl font-bold">Ready to explore active reserve telemetry?</h3>
              <p className="text-xs sm:text-sm text-emerald-100 max-w-xl">
                Access live PostGIS reserve polygons, multi-spectral change vectors, and prioritized patrol
                alerts across protected areas.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/explore"
                className="px-6 py-3 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md"
              >
                Launch Spatial Canvas
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 rounded-full bg-[#1b5e20] hover:bg-[#144718] text-white font-bold text-xs sm:text-sm border border-emerald-400/30 transition-all"
              >
                Ranger Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. LIGHT FOOTER                                                           */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200 bg-[#f7f8f5] px-6 lg:px-12 py-8 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-[#0d472a] flex items-center justify-center text-emerald-300">
            <TreePine className="w-4 h-4" />
          </div>
          <span>Wildlife Watch • Mission & Conservation Principles</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-slate-600">
          <Link href="/" className="hover:text-slate-900 transition-colors">
            Home
          </Link>
          <span>•</span>
          <Link href="/explore" className="hover:text-slate-900 transition-colors">
            Interactive GIS
          </Link>
          <span>•</span>
          <Link href="/login" className="hover:text-slate-900 transition-colors">
            Ranger Portal
          </Link>
          <span>•</span>
          <span>© OpenStreetMap (ODbL) • Copernicus Sentinel-2</span>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 7. VIDEO PLAYER MODAL                                                     */}
      {/* ========================================================================= */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xl p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl space-y-0">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{videoTitle}</h4>
                  <p className="text-[11px] text-slate-400">Wildlife Watch • Field Telemetry & Impact</p>
                </div>
              </div>
              <button
                onClick={() => setVideoModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative w-full aspect-video bg-black flex items-center justify-center">
              <video
                controls
                autoPlay
                className="w-full h-full object-contain"
                poster="/about-elephant.jpg"
              >
                <source
                  src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
                  type="video/mp4"
                />
                Your browser does not support video playback.
              </video>
            </div>

            <div className="px-6 py-3 bg-slate-950 text-xs text-slate-400 flex items-center justify-between">
              <span>Featuring Protected Area Operations & Sentinel-2 Telemetry</span>
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
      {/* 8. SEARCH MODAL                                                           */}
      {/* ========================================================================= */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <Search className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reserves, topics, or conservation tools..."
                autoFocus
                className="w-full bg-transparent border-none text-slate-900 text-sm focus:outline-none placeholder:text-slate-400"
              />
              <button
                onClick={() => setSearchModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 text-xs text-slate-500 space-y-2">
              <div className="font-semibold text-slate-700">Quick Links:</div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/explore"
                  onClick={() => setSearchModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium"
                >
                  Interactive GIS Map
                </Link>
                <Link
                  href="/login"
                  onClick={() => setSearchModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium"
                >
                  Ranger Portal
                </Link>
                <Link
                  href="/features"
                  onClick={() => setSearchModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium"
                >
                  Features Overview
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
