'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Calendar,
  Bell,
  User as UserIcon,
  ChevronDown,
  Globe,
  Satellite,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { MOCK_ALERTS } from '@/lib/mock-data';

export const TopNav: React.FC = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState('Last 30 Days (Aug - Sep 2026)');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const datePresets = [
    'Last 7 Days',
    'Last 30 Days (Aug - Sep 2026)',
    'Last 90 Days (Q3 2026)',
    'Dry Season 2026 Baseline',
    'Year-to-Date (2026)',
  ];

  const unreadAlerts = MOCK_ALERTS.filter((a) => a.status === 'UNREAD');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-gis-surface/90 backdrop-blur-md px-6 flex items-center justify-between gap-4 z-20 sticky top-0">
      {/* Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search parks, reserves, biomes, WDPA ID, or coordinates..."
            className="w-full h-9 pl-9 pr-12 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 transition-all font-sans"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
            ⌘K
          </kbd>
        </div>
      </form>

      {/* Right Controls: Date Range, Sensor Telemetry, Notifications, Profile */}
      <div className="flex items-center gap-3">
        {/* Date Range Selector */}
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="h-9 px-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-slate-700 flex items-center gap-2 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-[11px] hidden sm:inline">{selectedDateRange}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showDatePicker && (
            <div className="absolute right-0 mt-2 w-64 rounded-lg bg-gis-card border border-slate-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                Satellite Acquisition Epoch
              </div>
              {datePresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setSelectedDateRange(preset);
                    setShowDatePicker(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white flex items-center justify-between transition-colors"
                >
                  <span>{preset}</span>
                  {selectedDateRange === preset && (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Telemetry Status Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono">
          <Satellite className="w-3 h-3 text-emerald-400" />
          <span>S2-L2A ONLINE</span>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            aria-label="Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadAlerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-gis-surface animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg bg-gis-card border border-slate-700 shadow-2xl py-2 z-50">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                  Active Habitat Alarms ({unreadAlerts.length})
                </span>
                <Link
                  href="/alerts"
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] text-emerald-400 hover:underline"
                >
                  View All
                </Link>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/50">
                {MOCK_ALERTS.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="p-3 hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono uppercase font-bold text-red-400">
                        {alert.severity}
                      </span>
                      <span className="text-[10px] text-slate-500">2h ago</span>
                    </div>
                    <p className="text-xs font-medium text-slate-200 line-clamp-1">
                      {alert.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                      {alert.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-mono text-xs font-bold">
              SC
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-medium text-slate-200 leading-tight">
                Dr. Sarah Connor
              </span>
              <span className="text-[10px] text-emerald-400 font-mono leading-tight">
                Park Ranger • KWS
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-52 rounded-lg bg-gis-card border border-slate-700 shadow-2xl py-1.5 z-50">
              <div className="px-3 py-2 border-b border-slate-800">
                <p className="text-xs font-semibold text-white">Dr. Sarah Connor</p>
                <p className="text-[11px] text-slate-400">s.connor@kenyawildlife.org</p>
              </div>
              <Link
                href="/profile"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Field Profile & Roles</span>
              </Link>
              <Link
                href="/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Security & Sensors</span>
              </Link>
              <div className="border-t border-slate-800 my-1" />
              <Link
                href="/login"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-slate-800 hover:text-red-300"
              >
                Sign Out
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
