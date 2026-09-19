'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Search,
  Menu,
  X,
  ArrowRight,
  Map as MapIcon,
  TrendingUp,
  Flame,
  Footprints,
  FileText,
  Users,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export type ActiveNavPage =
  | 'home'
  | 'about'
  | 'features'
  | 'impact'
  | 'blogs'
  | 'contact';

interface SiteNavbarProps {
  activePage?: ActiveNavPage;
}

interface SearchItem {
  id: string;
  title: string;
  category: 'Page' | 'Feature' | 'Tool' | 'Article';
  description: string;
  href: string;
  icon: React.ElementType;
}

const SEARCH_CATALOG: SearchItem[] = [
  {
    id: 'explore-map',
    title: 'Interactive GIS Map',
    category: 'Feature',
    description: 'Explore protected areas, habitats, and real-time environmental layers.',
    href: '/explore',
    icon: MapIcon,
  },
  {
    id: 'change-analysis',
    title: 'Bi-Temporal Change Analysis',
    category: 'Tool',
    description: 'Compare satellite data over time to detect forest loss and water shifts.',
    href: '/change-analysis',
    icon: TrendingUp,
  },
  {
    id: 'hotspots-detection',
    title: 'Hotspots Detection',
    category: 'Feature',
    description: 'Identify areas at risk from deforestation, thermal fires, and disturbances.',
    href: '/hotspots',
    icon: Flame,
  },
  {
    id: 'species-insights',
    title: 'Species Insights & Habitats',
    category: 'Tool',
    description: 'Track tiger corridors, wildlife populations, and conservation metrics.',
    href: '/areas',
    icon: Footprints,
  },
  {
    id: 'reports-data',
    title: 'Conservation Reports & Telemetry',
    category: 'Tool',
    description: 'Generate verified PDF reports and download ODbL geospatial data.',
    href: '/reports',
    icon: FileText,
  },
  {
    id: 'page-features',
    title: 'Features & Capabilities',
    category: 'Page',
    description: 'Complete breakdown of what VANYORA satellite telemetry can do.',
    href: '/features',
    icon: Sparkles,
  },
  {
    id: 'page-about',
    title: 'About VANYORA & Mission',
    category: 'Page',
    description: 'Learn about our technological conservation mission, team, and story.',
    href: '/about',
    icon: Users,
  },
  {
    id: 'page-blogs',
    title: 'Conservation Stories & Blogs',
    category: 'Article',
    description: 'Read the latest deep-dives into satellite telemetry and reserve protection.',
    href: '/blogs',
    icon: FileText,
  },
];

export const SiteNavbar: React.FC<SiteNavbarProps> = ({ activePage = 'home' }) => {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);

  // Monitor scroll for enhanced glassmorphism elevation
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard shortcut: Ctrl+K or Cmd+K to open search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setSearchModalOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navLinks = [
    { id: 'home', label: 'Home', href: '/' },
    { id: 'about', label: 'About', href: '/about' },
    { id: 'features', label: 'Features', href: '/features' },
    { id: 'impact', label: 'Impact', href: '/#impact' },
    { id: 'blogs', label: 'Blogs', href: '/blogs' },
    { id: 'contact', label: 'Contact', href: '/#contact' },
  ];

  // Search filter
  const filteredResults = searchQuery.trim()
    ? SEARCH_CATALOG.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : SEARCH_CATALOG.slice(0, 5);

  const handleNavClick = (href: string, id: string) => {
    setMobileMenuOpen(false);
    if (href.startsWith('/#') && typeof window !== 'undefined') {
      const targetId = href.replace('/#', '');
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      } else {
        router.push(href);
      }
    }
  };

  return (
    <>
      <header
        className={`sticky top-0 z-50 h-20 transition-all duration-300 px-6 lg:px-12 flex items-center justify-between border-b ${
          scrolled
            ? 'bg-[#f7f8f5]/95 backdrop-blur-xl border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.07)]'
            : 'bg-[#f7f8f5]/90 backdrop-blur-md border-slate-200/80 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)]'
        }`}
      >
        {/* Brand Logo & Tagline */}
        <Link href="/" className="flex items-center gap-3.5 group select-none">
          <div className="relative">
            <Image
              src="/primary logo 1.png"
              alt="VANYORA Logo"
              width={36}
              height={44}
              className="h-10 w-auto object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-xs"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-outfit font-black text-xl tracking-[0.14em] text-slate-900 uppercase leading-none group-hover:text-emerald-950 transition-colors">
              VANYORA
            </span>
            <span className="text-[10px] text-emerald-800 font-bold tracking-[0.2em] uppercase mt-1 flex items-center gap-1.5">
              <span>Monitor</span>
              <span className="w-1 h-1 rounded-full bg-emerald-600/60 inline-block" />
              <span>Protect</span>
              <span className="w-1 h-1 rounded-full bg-emerald-600/60 inline-block" />
              <span>Conserve</span>
            </span>
          </div>
        </Link>

        {/* Center Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((item) => {
            const isActive = activePage === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => handleNavClick(item.href, item.id)}
                className={`relative px-3.5 py-1.5 rounded-full text-sm transition-all duration-200 ${
                  isActive
                    ? 'text-slate-950 font-bold'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-900/[0.04] font-medium'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute -bottom-1 inset-x-2.5 h-[2.5px] bg-[#0d472a] rounded-full shadow-[0_2px_8px_rgba(13,71,42,0.35)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Icons & Buttons */}
        <div className="hidden sm:flex items-center gap-3 lg:gap-4">
          {/* Circular Quick Search Button */}
          <button
            onClick={() => setSearchModalOpen(true)}
            aria-label="Search site and telemetry"
            title="Search (Ctrl + K)"
            className="w-9 h-9 rounded-full bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-emerald-600/60 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all duration-200 shadow-xs hover:shadow-sm hover:scale-105 active:scale-95 cursor-pointer group"
          >
            <Search className="w-4 h-4 text-slate-600 group-hover:text-emerald-800 transition-colors" />
          </button>

          {/* Login Pill Button */}
          <Link
            href="/login"
            className="px-5 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 transition-all duration-200 shadow-xs hover:shadow-sm hover:border-slate-400 hover:text-slate-950 active:scale-95"
          >
            Login
          </Link>

          {/* Get Started Emerald CTA Button */}
          <Link
            href="/explore"
            className="px-5 py-2 rounded-full bg-[#48e596] hover:bg-[#3cd084] text-slate-950 text-xs sm:text-sm font-bold tracking-tight shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/35 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1.5 group"
          >
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Mobile Hamburger & Search Toggle */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => setSearchModalOpen(true)}
            aria-label="Search"
            className="p-2 text-slate-600 hover:text-slate-900"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            className="p-2 text-slate-700 hover:text-slate-950 focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="fixed top-20 inset-x-0 z-40 bg-[#f7f8f5]/98 backdrop-blur-2xl border-b border-slate-200 p-6 space-y-5 shadow-2xl md:hidden animate-in slide-in-from-top-3 duration-200">
          <div className="flex flex-col gap-1.5">
            {navLinks.map((item) => {
              const isActive = activePage === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => handleNavClick(item.href, item.id)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${
                    isActive
                      ? 'bg-emerald-100/70 text-[#0d472a] font-bold'
                      : 'text-slate-800 hover:bg-slate-200/50 hover:text-slate-950'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && <span className="w-2 h-2 rounded-full bg-[#0d472a]" />}
                </Link>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-200/80 flex gap-3">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 py-2.5 rounded-full text-center bg-white border border-slate-300 text-slate-800 text-sm font-semibold shadow-xs"
            >
              Login
            </Link>
            <Link
              href="/explore"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 py-2.5 rounded-full text-center bg-[#48e596] hover:bg-[#3cd084] text-slate-950 text-sm font-bold shadow-md shadow-emerald-500/25"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}

      {/* Unified Search Modal */}
      {searchModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 bg-slate-950/65 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={() => setSearchModalOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
              <Search className="w-5 h-5 text-emerald-700 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools, satellite maps, reserves, or articles..."
                autoFocus
                className="w-full bg-transparent border-none text-slate-900 text-sm focus:outline-none placeholder:text-slate-400"
              />
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-slate-400 bg-white border border-slate-200 shadow-2xs">
                ESC
              </kbd>
              <button
                onClick={() => setSearchModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close search"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Results or Quick Links */}
            <div className="max-h-[60vh] overflow-y-auto p-3 divide-y divide-slate-100">
              {filteredResults.length > 0 ? (
                <div className="space-y-1">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {searchQuery.trim() ? 'Matching Results' : 'Recommended Tools & Pages'}
                  </div>
                  {filteredResults.map((item) => {
                    const IconComp = item.icon;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setSearchModalOpen(false)}
                        className="group flex items-start gap-3 p-3 rounded-xl hover:bg-emerald-50/60 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0d472a] flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900 group-hover:text-[#0d472a] transition-colors">
                              {item.title}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {item.description}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all self-center" />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-slate-800">No results found for &ldquo;{searchQuery}&rdquo;</p>
                  <p className="text-xs text-slate-500 mt-1">Try searching for map, tiger, change, or reports.</p>
                </div>
              )}
            </div>

            {/* Modal Footer Quick Chips */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span className="text-[11px] font-medium text-slate-600">Quick Shortcuts:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href="/explore"
                  onClick={() => setSearchModalOpen(false)}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:border-emerald-600 text-[11px] font-medium text-slate-700 transition-colors"
                >
                  GIS Map
                </Link>
                <Link
                  href="/change-analysis"
                  onClick={() => setSearchModalOpen(false)}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:border-emerald-600 text-[11px] font-medium text-slate-700 transition-colors"
                >
                  Change Analysis
                </Link>
                <Link
                  href="/hotspots"
                  onClick={() => setSearchModalOpen(false)}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:border-emerald-600 text-[11px] font-medium text-slate-700 transition-colors"
                >
                  Hotspots
                </Link>
                <Link
                  href="/reports"
                  onClick={() => setSearchModalOpen(false)}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:border-emerald-600 text-[11px] font-medium text-slate-700 transition-colors"
                >
                  Reports
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SiteNavbar;
