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
        'bg-white rounded-2xl p-5 flex flex-col justify-between border border-[#e5ebe4] shadow-xs hover:shadow-sm hover:border-emerald-500/40 transition-all',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-900 font-sans">
              {value}
            </span>
            {badge && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#e6f4ea] border border-emerald-500/30 text-[#137333]">
                {badge}
              </span>
            )}
          </div>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-[#e6f4ea] text-[#137333] flex items-center justify-center flex-shrink-0 shadow-xs">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || change) && (
        <div className="mt-4 pt-3 border-t border-[#f0f3ee] flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-500">{subtitle}</span>}
          {change && (
            <span
              className={cn(
                'font-mono font-medium',
                changeType === 'positive' && 'text-[#137333]',
                changeType === 'negative' && 'text-[#dc2626]',
                changeType === 'neutral' && 'text-slate-500'
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
