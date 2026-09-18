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
  Map as MapIcon,
  TrendingUp,
  Flame,
  Footprints,
  FileText,
  Users,
  Compass,
  CheckCircle2,
} from 'lucide-react';

export default function FeaturesPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const features = [
    {
      id: 'interactive-map',
      title: 'Interactive Map',
      description: 'Explore protected areas, habitats and real-time environmental changes.',
      icon: MapIcon,
      iconColor: 'text-[#0d472a] bg-[#e6efe8]',
      badgeColor: 'text-emerald-800 bg-emerald-100',
      href: '/explore',
      image: '/features/feat_map.jpg',
      alt: 'Interactive GIS Map with Reserve Boundaries',
      tag: '11 GIS Layers',
    },
    {
      id: 'change-analysis',
      title: 'Change Analysis',
      description: 'Compare satellite data over time to detect forest loss, water changes and more.',
      icon: TrendingUp,
      iconColor: 'text-[#0d472a] bg-[#e6efe8]',
      badgeColor: 'text-emerald-800 bg-emerald-100',
      href: '/change-analysis',
      image: '/features/feat_change.jpg',
      alt: 'Bi-Temporal Satellite Forest Change Analysis',
      tag: 'Bi-Temporal Delta',
    },
    {
      id: 'hotspots-detection',
      title: 'Hotspots Detection',
      description: 'Identify areas at risk from deforestation, fires, or human activity.',
      icon: Flame,
      iconColor: 'text-orange-600 bg-orange-100',
      badgeColor: 'text-orange-800 bg-orange-100',
      href: '/hotspots',
      image: '/features/feat_hotspots.jpg',
      alt: 'Thermal and Canopy Disturbance Hotspot Cluster',
      tag: 'Thermal Clusters',
    },
    {
      id: 'species-insights',
      title: 'Species Insights',
      description: 'Learn about species, their habitats and conservation status.',
      icon: Footprints,
      iconColor: 'text-[#0d472a] bg-[#e6efe8]',
      badgeColor: 'text-emerald-800 bg-emerald-100',
      href: '/areas',
      image: '/features/feat_species.jpg',
      alt: 'Royal Bengal Tiger Species Insights',
      tag: 'Endangered Species',
    },
    {
      id: 'reports-data',
      title: 'Reports & Data',
      description: 'Generate detailed reports for research, policy and action.',
      icon: FileText,
      iconColor: 'text-[#0d472a] bg-[#e6efe8]',
      badgeColor: 'text-emerald-800 bg-emerald-100',
      href: '/reports',
      image: '/features/feat_reports.jpg',
      alt: 'Conservation Telemetry Analytics & PDF Reports',
      tag: 'ODbL Verified Data',
    },
    {
      id: 'community-awareness',
      title: 'Community & Awareness',
      description: 'Join a growing community of nature enthusiasts and conservation supporters.',
      icon: Users,
      iconColor: 'text-[#0d472a] bg-[#e6efe8]',
      badgeColor: 'text-emerald-800 bg-emerald-100',
      href: '/dashboard',
      image: '/features/feat_community.jpg',
      alt: 'Wildlife Rangers and Field Conservation Community',
      tag: 'Active Rangers',
    },
  ];

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
            const isActive = item.id === 'features';
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
            className="px-5 py-2 rounded-full bg-[#48e596] hover:bg-[#3cd084] text-slate-950 text-xs sm:text-sm font-bold tracking-tight shadow-md shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95"
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
              className="flex-1 py-2 rounded-full text-center bg-[#48e596] text-slate-950 text-sm font-bold"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. HERO SECTION WITH SOARING EAGLE                                        */}
      {/* ========================================================================= */}
      <section className="relative w-full pt-8 sm:pt-14 pb-8 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Title & Subtitle */}
          <div className="lg:col-span-8 space-y-4 max-w-2xl">
            {/* Pill Badge */}
            <div className="inline-block px-3.5 py-1 rounded-full bg-[#e6efe8] border border-[#c8e6c9] text-[#0d472a] text-xs font-bold uppercase tracking-wider">
              Features
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-[76px] font-black tracking-tight leading-[0.98] text-slate-950 font-sans">
              What<br />
              Wildlife Watch <span className="text-[#0d472a]">Can Do?</span>
            </h1>

            {/* Subtitle */}
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed pt-1">
              From satellites to real-world action — powerful tools for a wilder, safer tomorrow.
            </p>
          </div>

          {/* Right Column: Soaring Eagle Illustration & Calligraphy */}
          <div className="lg:col-span-4 relative flex items-center justify-center lg:justify-end">
            <div className="relative w-80 sm:w-96 lg:w-[440px] h-48 sm:h-56 select-none hover:scale-105 transition-transform duration-500">
              <Image
                src="/features/eagle_calligraphy_combo.png"
                alt="Technology for a brighter tomorrow - Eagle in flight"
                fill
                priority
                className="object-contain drop-shadow-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SIX CORE FEATURE CARDS (2 ROWS x 3 COLUMNS)                            */}
      {/* ========================================================================= */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                className="bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-200/70 border border-slate-100 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 group flex flex-col justify-between"
              >
                {/* Top Section: Icon, Title & Description */}
                <div className="space-y-3 mb-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center ${feat.iconColor} group-hover:scale-110 transition-transform shadow-sm`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-950 tracking-tight">
                        {feat.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed pl-1">
                    {feat.description}
                  </p>
                </div>

                {/* Preview Image Thumbnail Container */}
                <div className="relative h-44 sm:h-48 w-full rounded-2xl overflow-hidden border border-slate-100 group-hover:border-emerald-200 transition-colors">
                  <Image
                    src={feat.image}
                    alt={feat.alt}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Subtle Gradient Shade */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                  {/* Floating Action Arrow Button */}
                  <Link
                    href={feat.href}
                    className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white hover:bg-emerald-50 text-slate-900 hover:text-emerald-700 flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 group/btn"
                    aria-label={`Open ${feat.title}`}
                  >
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. BOTTOM MISTY MOUNTAIN HORIZON BANNER                                   */}
      {/* ========================================================================= */}
      <section className="relative w-full min-h-[300px] sm:min-h-[340px] flex items-center justify-center overflow-hidden mt-8">
        {/* Background Image: Misty Mountain Forest */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/misty-pines.jpg"
            alt="Misty evergreen mountain valley"
            fill
            className="object-cover object-center"
            quality={95}
          />
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]" />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#f7f8f5] to-transparent" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 text-center space-y-6">
          {/* Centered Quote */}
          <p className="font-serif italic text-white text-2xl sm:text-3xl lg:text-4xl leading-snug drop-shadow-lg select-none">
            &ldquo;Data gives us the power to protect what we love.&rdquo;
          </p>

          {/* Call to Action Button */}
          <div>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-slate-950/90 hover:bg-slate-900 text-white font-bold text-sm sm:text-base border border-white/20 shadow-2xl hover:scale-105 active:scale-95 transition-all"
            >
              <span>Get Started Today</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. LIGHT FOOTER                                                           */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200 bg-[#f7f8f5] px-6 lg:px-12 py-8 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-[#0d472a] flex items-center justify-center text-emerald-300">
            <TreePine className="w-4 h-4" />
          </div>
          <span>Wildlife Watch • Habitat Telemetry & Detection Features</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-slate-600">
          <Link href="/" className="hover:text-slate-900 transition-colors">
            Home
          </Link>
          <span>•</span>
          <Link href="/about" className="hover:text-slate-900 transition-colors">
            About
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
      {/* 6. SEARCH MODAL                                                           */}
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
                placeholder="Search features, tools, or protected areas..."
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
                  Interactive Map
                </Link>
                <Link
                  href="/change-analysis"
                  onClick={() => setSearchModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium"
                >
                  Change Analysis
                </Link>
                <Link
                  href="/hotspots"
                  onClick={() => setSearchModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium"
                >
                  Hotspots Detection
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
