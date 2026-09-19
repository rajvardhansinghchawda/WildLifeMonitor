'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Map as MapIcon,
  Layers,
  Flame,
  Compass,
  TrendingUp,
  FileText,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Heart,
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
      name: 'Compare Slider',
      href: '/compare',
      icon: ArrowUpDown,
      badge: 'LIVE',
      badgeColor: 'bg-[#e6f4ea] text-[#137333] border-emerald-500/30',
    },
    {
      name: 'Explore Map',
      href: '/explore',
      icon: MapIcon,
      badge: null,
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
      badge: null,
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
      badge: '3',
      badgeColor: 'bg-[#ea4335] text-white border-transparent',
    },
    {
      name: 'Saved Areas',
      href: '/areas?saved=true',
      icon: Heart,
      badge: null,
    },
    {
      name: 'Community',
      href: '/blogs',
      icon: Users,
      badge: null,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-[#e8eee5] bg-white transition-all duration-300 z-30 select-none shadow-[2px_0_12px_rgba(0,0,0,0.02)] overflow-hidden',
        isCollapsed ? 'w-20' : 'w-64'
      )}
      style={{
        backgroundImage: isCollapsed ? undefined : "url('/sidebar-bg.png')",
        backgroundPosition: 'left bottom',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% auto',
      }}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#e8eee5] bg-white/95 backdrop-blur-xs relative z-10">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden group">
          <div className="flex-shrink-0 flex items-center justify-center">
            <Image
              src="/primary logo 1.png"
              alt="VANYORA Logo"
              width={32}
              height={38}
              className="h-9 w-auto object-contain group-hover:scale-105 transition-transform"
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-base font-black tracking-[0.14em] text-slate-900 uppercase font-outfit leading-tight">
                VANYORA
              </span>
              <span className="text-[9px] text-[#137333] font-bold tracking-[0.16em] uppercase">
                HABITAT GIS INTELLIGENCE
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5 scrollbar-thin relative z-10">
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
                'flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all group relative',
                isActive
                  ? 'bg-[#e6f4ea] text-[#137333] font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#f3f7f2]/80 border border-transparent'
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon
                className={cn(
                  'w-4 h-4 flex-shrink-0 transition-colors',
                  isActive ? 'text-[#137333]' : 'text-slate-500 group-hover:text-slate-800'
                )}
              />

              {!isCollapsed && (
                <span className="truncate flex-1 tracking-wide">{item.name}</span>
              )}

              {!isCollapsed && item.badge && (
                <span
                  className={cn(
                    'text-[9px] font-bold px-1.5 py-0.5 rounded-full border leading-none',
                    item.badgeColor || 'bg-[#e6f4ea] text-[#137333] border-emerald-500/30'
                  )}
                >
                  {item.badge}
                </span>
              )}

              {/* Active Indicator Bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-[#137333] rounded-r" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle Footer */}
      <div className="p-2 flex items-center justify-between relative z-10">
        {!isCollapsed && (
          <div className="text-[10px] text-slate-400 font-mono pl-1">v1.0.4</div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white/90 transition-colors ml-auto border border-[#e2e8e0] bg-white/70 shadow-xs"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>
    </aside>
  );
};

