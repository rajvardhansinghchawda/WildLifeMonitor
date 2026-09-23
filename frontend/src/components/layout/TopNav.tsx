'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, Bell, LogOut, User as UserIcon, ShieldCheck, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';

export const TopNav: React.FC = () => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const alerts = useApi(() => api.alerts.list({ status: 'unread' }), []);
  const unread = alerts.data?.items ?? [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) router.push(`/areas?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const displayName = (user?.full_name && user.full_name !== 'Lead Wildlife Investigator')
    ? user.full_name
    : 'Kanhaiya Patidar';

  return (
    <header className="h-12 sm:h-14 px-0 flex items-center justify-between gap-4 z-20 bg-transparent border-0 relative">
      {/* Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md z-10">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            id="global-search-input"
            name="global-search-input"
            aria-label="Search protected areas"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search protected areas, species, or locations..."
            className="w-full h-10 pl-10 pr-14 rounded-2xl bg-white border border-[#dde4dc] hover:border-emerald-600 focus:border-emerald-600 focus:bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 shadow-xs transition-all font-sans"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-slate-400 bg-slate-50 border border-slate-200/90 shadow-2xs pointer-events-none">
            Ctrl K
          </kbd>
        </div>
      </form>

      {/* Right Controls: Notifications & User Profile */}
      <div className="flex items-center gap-3 relative z-10">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-10 h-10 rounded-2xl bg-white text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer border border-[#dde4dc] shadow-xs hover:border-emerald-600"
            aria-label="Alerts"
          >
            <Bell className="w-4 h-4" />
            {unread.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-[#e5ebe4] shadow-xl py-2 z-50">
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-[#e5ebe4]">
                <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider font-mono">
                  Unread alerts ({alerts.data?.unread_count ?? unread.length})
                </span>
                <Link
                  href="/alerts"
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] text-emerald-600 hover:underline font-medium"
                >
                  View All
                </Link>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[#f0f3ee]">
                {unread.length === 0 && (
                  <p className="p-3 text-xs text-slate-500">No unread alerts in your workspace.</p>
                )}
                {unread.slice(0, 4).map((alert) => (
                  <div key={alert.id} className="p-3 hover:bg-[#f7f9f6] transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono uppercase font-bold text-red-600">
                        {alert.severity}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(alert.triggered_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 line-clamp-1">{alert.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Chip */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 h-10 px-3.5 rounded-2xl bg-white border border-[#dde4dc] shadow-xs hover:border-emerald-600 transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0 relative">
              <Image
                src="/dashboard/kanhaiya_avatar_clean.png"
                alt="Kanhaiya Patidar"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {displayName}
              </span>
              <span className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
                Lead Wildlife Investigator
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-[#e5ebe4] shadow-xl py-1 z-50 text-xs">
              <div className="px-3.5 py-2.5 border-b border-[#e5ebe4]">
                <p className="font-semibold text-slate-800">{displayName}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email ?? 'ranger@wildlife.gov'}</p>
              </div>
              <Link
                href="/profile"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3.5 py-2 hover:bg-[#f0f3ee] text-slate-700"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Ranger Profile</span>
              </Link>
              <Link
                href="/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3.5 py-2 hover:bg-[#f0f3ee] text-slate-700"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Security</span>
              </Link>
              <div className="border-t border-[#e5ebe4] my-1" />
              <button
                onClick={async () => {
                  setShowUserMenu(false);
                  await logout();
                  router.push('/login');
                }}
                className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-red-500" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
