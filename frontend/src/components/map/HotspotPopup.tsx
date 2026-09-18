'use client';

import React from 'react';
import Link from 'next/link';
import {
  X,
  ArrowUpRight,
  ShieldAlert,
  Flame,
  TreePine,
  Droplet,
  Building,
  Calendar,
  Layers,
  MapPin,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import { ChangeEventHotspot } from '@/types';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface HotspotPopupProps {
  hotspot: ChangeEventHotspot;
  onClose: () => void;
  onViewDetails?: (hotspot: ChangeEventHotspot) => void;
  className?: string;
}

export const HotspotPopup: React.FC<HotspotPopupProps> = ({
  hotspot,
  onClose,
  onViewDetails,
  className,
}) => {
  const percentageChange =
    hotspot.percentage_change !== undefined
      ? hotspot.percentage_change
      : Number((hotspot.delta_ndvi * 85).toFixed(1));

  return (
    <div
      className={cn(
        'w-80 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl p-4 text-xs font-sans text-slate-200 z-40 transition-all animate-in fade-in zoom-in-95',
        className
      )}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-semibold uppercase">
            {hotspot.id}
          </span>
          <SeverityBadge severity={hotspot.severity} showIcon={true} />
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close Popup"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Details Grid */}
      <div className="space-y-2 font-sans">
        <div>
          <h4 className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
            <span className="text-emerald-400">●</span>
            <span>{hotspot.change_type.replace('_', ' ')}</span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-500" />
            <span>{hotspot.area_name}</span>
          </p>
        </div>

        {/* Detailed Metrics Table */}
        <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
            <span className="text-slate-500 text-[10px] uppercase block">Affected Area</span>
            <span className="text-white font-bold text-sm">
              {hotspot.area_ha.toFixed(1)} ha
            </span>
          </div>

          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
            <span className="text-slate-500 text-[10px] uppercase block">Percentage Change</span>
            <span
              className={cn(
                'font-bold text-sm flex items-center gap-0.5',
                percentageChange < 0 ? 'text-red-400' : 'text-emerald-400'
              )}
            >
              {percentageChange > 0 ? `+${percentageChange}%` : `${percentageChange}%`}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
            <span className="text-slate-500 text-[10px] uppercase block">Confidence</span>
            <span className="text-emerald-400 font-bold text-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {(hotspot.confidence_score * 100).toFixed(0)}%
            </span>
          </div>

          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
            <span className="text-slate-500 text-[10px] uppercase block">ΔNDVI Shift</span>
            <span className="text-red-400 font-bold text-sm">
              {hotspot.delta_ndvi.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Detection Metadata */}
        <div className="pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Detection Date:</span>
            <span className="text-slate-300 font-medium">
              {formatDate(hotspot.detected_at)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Sensor:</span>
            <span className="text-slate-300">{hotspot.sensor}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Coordinates:</span>
            <span className="text-slate-300">
              {hotspot.coordinates.lat.toFixed(4)}°, {hotspot.coordinates.lon.toFixed(4)}°
            </span>
          </div>
        </div>
      </div>

      {/* Action CTA Button */}
      <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
        <Link
          href={`/hotspots?id=${hotspot.id}`}
          onClick={() => onViewDetails?.(hotspot)}
          className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/50"
        >
          <span>View Details</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
