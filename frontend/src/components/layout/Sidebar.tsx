'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Map as MapIcon,
  Layers,
  Flame,
  ShieldAlert,
  Compass,
  TrendingUp,
  FileText,
  Bell,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  Radio,
  Shield,
  Users,
} from 'lucide-react';


interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const pathname = usePathname();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: 'Explore Map',
      href: '/explore',
      icon: MapIcon,
      badge: 'LIVE',
    },
    {
      name: 'Change Analysis',
      href: '/change-analysis',
      icon: Layers,
      badge: null,
    },
    {
      name: 'Hotspots',
      href: '/hotspots',
      icon: Flame,
      badge: '5',
    },
    {
      name: 'Areas',
      href: '/areas',
      icon: Compass,
      badge: null,
    },
    {
      name: 'Timeline & Trends',
      href: '/timeline',
      icon: TrendingUp,
      badge: null,
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: FileText,
      badge: null,
    },
    {
      name: 'Alerts',
      href: '/alerts',
      icon: Bell,
      badge: '2',
      badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: User,
      badge: null,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      badge: null,
    },
    {
      name: 'Admin Console',
      href: '/admin',
      icon: Shield,
      badge: 'ADMIN',
      badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
    {
      name: 'Members & RBAC',
      href: '/admin/members',
      icon: Users,
      badge: null,
    },
  ];


  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-slate-800/80 bg-gis-surface/95 transition-all duration-300 z-30 select-none backdrop-blur-md',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden group">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 group-hover:border-emerald-400 transition-colors">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-wider text-white uppercase font-mono">
                WILDLIFE WATCH
              </span>
              <span className="text-[10px] text-emerald-400 font-medium tracking-tight">
                HABITAT GIS INTELLIGENCE
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navigationItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group relative',
                isActive
                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon
                className={cn(
                  'w-4 h-4 flex-shrink-0 transition-colors',
                  isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                )}
              />

              {!isCollapsed && (
                <span className="truncate flex-1 tracking-wide">{item.name}</span>
              )}

              {!isCollapsed && item.badge && (
                <span
                  className={cn(
                    'text-[10px] font-mono px-1.5 py-0.5 rounded border leading-none',
                    item.badgeColor || 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                  )}
                >
                  {item.badge}
                </span>
              )}

              {/* Active Indicator Bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-500 rounded-r" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Monitored Status Pill */}
      {!isCollapsed && (
        <div className="p-3 mx-3 mb-3 rounded-lg bg-slate-900/80 border border-slate-800/90 text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-mono">SYSTEM STATUS</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div className="text-white font-mono text-[11px]">Sentinel-2 Telemetry: OK</div>
          <div className="text-[10px] text-slate-400 mt-1">FIRMS Feed: Synced 24m ago</div>
        </div>
      )}

      {/* Collapse Toggle Footer */}
      <div className="p-3 border-t border-slate-800/80 flex items-center justify-between">
        {!isCollapsed && (
          <div className="text-[11px] text-slate-400 font-mono">v1.0.4-PROD</div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors ml-auto"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
