import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  subtitle?: string;
  badge?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  subtitle,
  badge,
  className,
}) => {
  return (
    <div
      className={cn(
        'gis-glass-card rounded-lg p-5 flex flex-col justify-between border border-slate-800/80 hover:border-emerald-500/40 transition-colors',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white font-mono">
              {value}
            </span>
            {badge && (
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                {badge}
              </span>
            )}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-emerald-400">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || change) && (
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-400">{subtitle}</span>}
          {change && (
            <span
              className={cn(
                'font-mono font-medium',
                changeType === 'positive' && 'text-emerald-400',
                changeType === 'negative' && 'text-red-400',
                changeType === 'neutral' && 'text-slate-400'
              )}
            >
              {change}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
