'use client';

import React from 'react';
import { TreePine, Flame, Droplet, Building, AlertTriangle } from 'lucide-react';
import { ChangeEventHotspot } from '@/types';
import { cn } from '@/lib/utils';

interface HotspotMarkerProps {
  hotspot: ChangeEventHotspot;
  isSelected?: boolean;
  onClick: (hotspot: ChangeEventHotspot) => void;
  style?: React.CSSProperties;
}

export const HotspotMarker: React.FC<HotspotMarkerProps> = ({
  hotspot,
  isSelected = false,
  onClick,
  style,
}) => {
  const getIcon = () => {
    switch (hotspot.change_type) {
      case 'DEFORESTATION':
      case 'CANOPY_THINNING':
        return TreePine;
      case 'BURN_SCAR':
        return Flame;
      case 'WATER_LOSS':
        return Droplet;
      case 'ENCROACHMENT':
        return Building;
      default:
        return AlertTriangle;
    }
  };

  const Icon = getIcon();

  const getColors = () => {
    switch (hotspot.severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-600',
          border: 'border-red-400',
          halo: 'bg-red-500/30',
          text: 'text-red-200',
          shadow: 'shadow-red-500/50',
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-600',
          border: 'border-amber-400',
          halo: 'bg-amber-500/30',
          text: 'text-amber-200',
          shadow: 'shadow-amber-500/50',
        };
      case 'MEDIUM':
        return {
          bg: 'bg-yellow-600',
          border: 'border-yellow-400',
          halo: 'bg-yellow-500/30',
          text: 'text-yellow-200',
          shadow: 'shadow-yellow-500/50',
        };
      default:
        return {
          bg: 'bg-emerald-600',
          border: 'border-emerald-400',
          halo: 'bg-emerald-500/30',
          text: 'text-emerald-200',
          shadow: 'shadow-emerald-500/50',
        };
    }
  };

  const colors = getColors();

  return (
    <div
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onClick(hotspot);
      }}
      className="group relative cursor-pointer select-none"
    >
      {/* Outer Pulsing Ping Radar */}
      <div
        className={cn(
          'absolute -inset-2 rounded-full animate-ping opacity-75 pointer-events-none',
          colors.halo
        )}
      />

      {/* Outer Halo */}
      <div
        className={cn(
          'absolute -inset-1 rounded-full blur-[2px]',
          colors.halo,
          isSelected && 'ring-2 ring-white ring-offset-2 ring-offset-slate-950'
        )}
      />

      {/* Marker Core Pin */}
      <div
        className={cn(
          'relative w-7 h-7 rounded-full flex items-center justify-center border-2 transition-transform transform group-hover:scale-125 shadow-lg',
          colors.bg,
          colors.border,
          colors.shadow,
          isSelected && 'scale-125 ring-2 ring-white'
        )}
      >
        <Icon className={cn('w-3.5 h-3.5', colors.text)} />
      </div>

      {/* Quick Hover Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-slate-950/95 border border-slate-700 text-[10px] font-mono text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-30">
        <div className="font-bold flex items-center gap-1">
          <span>{hotspot.id}</span>
          <span className="text-slate-400">({hotspot.area_ha.toFixed(1)} ha)</span>
        </div>
        <div className="text-slate-400 text-[9px]">{hotspot.change_type}</div>
      </div>
    </div>
  );
};
