'use client';

import React from 'react';
import { TreePine, Droplet, Building2, ShieldAlert, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KPICardData {
  title: string;
  value: string;
  subvalue?: string;
  change: string;
  changeType: 'positive' | 'negative' | 'warning';
  trend: 'up' | 'down' | 'warning';
  period: string;
  icon: React.ElementType;
  badge?: string;
}

export const KPICards: React.FC = () => {
  const kpis: KPICardData[] = [
    {
      title: 'Forest Cover',
      value: '74.2%',
      subvalue: '1,095,414 ha intact canopy',
      change: '-1.8%',
      changeType: 'negative',
      trend: 'down',
      period: 'vs 2025 dry season baseline',
      icon: TreePine,
      badge: 'S2 L2A',
    },
    {
      title: 'Water Bodies',
      value: '14,820 ha',
      subvalue: 'Surface wetland & lake extent',
      change: '-3.4%',
      changeType: 'warning',
      trend: 'down',
      period: 'vs historical September median',
      icon: Droplet,
      badge: 'NDWI MASK',
    },
    {
      title: 'Urban / Built-up',
      value: '3,240 ha',
      subvalue: 'Linear tracks & settlement clusters',
      change: '+8.6%',
      changeType: 'negative',
      trend: 'up',
      period: 'vs 12-month trailing expansion',
      icon: Building2,
      badge: 'NDBI DIFF',
    },
    {
      title: 'Habitat Change Score',
      value: '42 / 100',
      subvalue: 'Moderate-Elevated Vulnerability',
      change: '+6.5 pts',
      changeType: 'warning',
      trend: 'warning',
      period: 'Threat composite velocity index',
      icon: ShieldAlert,
      badge: 'HIGH ALERT',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.title}
            className="gis-glass-card rounded-xl p-5 border border-slate-800/90 hover:border-emerald-500/50 transition-all flex flex-col justify-between group shadow-lg"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 group-hover:border-emerald-500/50 transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                {kpi.badge && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 uppercase font-semibold">
                    {kpi.badge}
                  </span>
                )}
              </div>

              <h3 className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
                {kpi.title}
              </h3>

              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white tracking-tight">
                  {kpi.value}
                </span>
              </div>

              {kpi.subvalue && (
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                  {kpi.subvalue}
                </p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-mono font-medium">
                {kpi.trend === 'down' ? (
                  <TrendingDown
                    className={cn(
                      'w-4 h-4',
                      kpi.changeType === 'negative' ? 'text-red-400' : 'text-amber-400'
                    )}
                  />
                ) : kpi.trend === 'up' ? (
                  <TrendingUp
                    className={cn(
                      'w-4 h-4',
                      kpi.changeType === 'negative' ? 'text-red-400' : 'text-emerald-400'
                    )}
                  />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span
                  className={cn(
                    kpi.changeType === 'negative' && 'text-red-400',
                    kpi.changeType === 'warning' && 'text-amber-400',
                    kpi.changeType === 'positive' && 'text-emerald-400'
                  )}
                >
                  {kpi.change}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]" title={kpi.period}>
                {kpi.period}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
