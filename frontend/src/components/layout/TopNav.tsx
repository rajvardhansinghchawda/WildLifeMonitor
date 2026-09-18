'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, User as UserIcon, ChevronDown, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

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

  const own = user?.memberships.find((m) => !m.is_public);
  const role = own?.role ?? 'viewer';
  const workspace = own?.workspace_name ?? '';

  return (
    <header className="h-16 border-b border-slate-800/80 bg-gis-surface/90 backdrop-blur-md px-6 flex items-center justify-between gap-4 z-20 sticky top-0">
      <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search protected areas by name, state or country…"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 transition-all font-sans"
          />
        </div>
      </form>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            aria-label="Alerts"
          >
            <Bell className="w-4 h-4" />
            {unread.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-gis-surface animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg bg-gis-card border border-slate-700 shadow-2xl py-2 z-50">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                  Unread alerts ({alerts.data?.unread_count ?? 0})
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
                {unread.length === 0 && (
                  <p className="p-3 text-xs text-slate-500">No unread alerts in your workspace.</p>
                )}
                {unread.slice(0, 4).map((alert) => (
                  <div key={alert.id} className="p-3 hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono uppercase font-bold text-red-400">
                        {alert.severity}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(alert.triggered_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-200 line-clamp-1">{alert.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-mono text-xs font-bold">
              {user ? initials(user.full_name) : '?'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-medium text-slate-200 leading-tight">
                {user?.full_name ?? '—'}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono leading-tight capitalize">
                {role}
                {workspace ? ` • ${workspace}` : ''}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-52 rounded-lg bg-gis-card border border-slate-700 shadow-2xl py-1.5 z-50">
              <div className="px-3 py-2 border-b border-slate-800">
                <p className="text-xs font-semibold text-white">{user?.full_name}</p>
                <p className="text-[11px] text-slate-400">{user?.email}</p>
              </div>
              <Link
                href="/profile"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Profile</span>
              </Link>
              <Link
                href="/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Security</span>
              </Link>
              <div className="border-t border-slate-800 my-1" />
              <button
                onClick={async () => {
                  setShowUserMenu(false);
                  await logout();
                  router.push('/login');
                }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-slate-800 hover:text-red-300"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
