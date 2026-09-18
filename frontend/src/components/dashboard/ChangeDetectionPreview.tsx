'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  ArrowRight,
  Sliders,
  Eye,
  Calendar,
  Sparkles,
  TrendingDown,
  AlertTriangle,
  TreePine,
  Droplet,
  Building,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProtectedArea } from '@/types';

interface ChangeDetectionPreviewProps {
  selectedArea: ProtectedArea;
}

export const ChangeDetectionPreview: React.FC<ChangeDetectionPreviewProps> = ({
  selectedArea,
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [activeOverlay, setActiveOverlay] = useState<'difference' | 'ndvi' | 'natural'>('difference');

  return (
    <div className="gis-glass-card rounded-xl p-5 border border-slate-800 shadow-xl flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Change Detection Preview (Dual-Epoch)
              </h3>
              <p className="text-[11px] text-slate-400">
                Pixel-level Change Vector Analysis (CVA) & Sentinel-2 MSI spectral differencing
              </p>
            </div>
          </div>

          <Link
            href={`/change-analysis?areaId=${selectedArea.id}`}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-950/40 self-start sm:self-auto"
          >
            <span>Full Analysis Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Epoch labels & visualization selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
              Epoch 1: <strong className="text-white">Jan 15, 2025</strong> (Baseline)
            </span>
            <span className="text-slate-500">vs</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
              Epoch 2: <strong className="text-emerald-400">Sep 16, 2026</strong> (Current Pass)
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-md border border-slate-800">
            <button
              onClick={() => setActiveOverlay('difference')}
              className={cn(
                'px-2 py-0.5 rounded text-[10px] font-mono transition-colors',
                activeOverlay === 'difference'
                  ? 'bg-slate-800 text-emerald-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              Difference Mask
            </button>
            <button
              onClick={() => setActiveOverlay('ndvi')}
              className={cn(
                'px-2 py-0.5 rounded text-[10px] font-mono transition-colors',
                activeOverlay === 'ndvi'
                  ? 'bg-slate-800 text-emerald-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              NDVI Anomaly
            </button>
            <button
              onClick={() => setActiveOverlay('natural')}
              className={cn(
                'px-2 py-0.5 rounded text-[10px] font-mono transition-colors',
                activeOverlay === 'natural'
                  ? 'bg-slate-800 text-emerald-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              Natural Color
            </button>
          </div>
        </div>

        {/* Interactive Comparison Preview Canvas with Slider */}
        <div className="relative h-60 w-full rounded-lg overflow-hidden border border-slate-800 select-none bg-slate-950">
          {/* Epoch 1 Base Layer (Left / Historical) */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Simulated Satellite Landscape (Epoch 1: Pristine dense canopy) */}
            <div
              className="w-full h-full"
              style={{
                background: `
                  radial-gradient(ellipse at 40% 40%, rgba(5, 150, 105, 0.45) 0%, rgba(6, 78, 59, 0.8) 45%, rgba(2, 44, 34, 0.95) 100%),
                  repeating-linear-gradient(45deg, rgba(16, 185, 129, 0.05) 0px, rgba(16, 185, 129, 0.05) 2px, transparent 2px, transparent 12px)
                `,
              }}
            >
              <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/70 backdrop-blur-sm border border-slate-700 text-[10px] font-mono text-slate-200">
                T1: 2025-01-15 (Intact Canopy)
              </div>
            </div>
          </div>

          {/* Epoch 2 Layer with Clipping (Right / Detected degradation) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
          >
            <div
              className="w-full h-full relative"
              style={{
                background: `
                  radial-gradient(ellipse at 40% 40%, rgba(239, 68, 68, 0.35) 0%, rgba(180, 83, 9, 0.5) 40%, rgba(15, 23, 42, 0.95) 100%),
                  repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.12) 0px, rgba(239, 68, 68, 0.12) 3px, transparent 3px, transparent 14px)
                `,
              }}
            >
              {/* Highlighted degradation scars */}
              <div className="absolute top-1/4 left-1/3 w-28 h-16 rounded-full border border-red-500/80 bg-red-600/30 blur-[1px] animate-pulse flex items-center justify-center">
                <span className="text-[9px] font-mono text-red-200 bg-red-950/80 px-1 py-0.5 rounded border border-red-500/50">
                  -14.8 ha clearing
                </span>
              </div>
              <div className="absolute bottom-1/4 right-1/4 w-36 h-2 rounded bg-amber-500/70 rotate-[-12deg] shadow-lg shadow-amber-500/40" />

              <div className="absolute top-3 right-3 px-2 py-1 rounded bg-red-950/80 backdrop-blur-sm border border-red-600/60 text-[10px] font-mono text-red-200">
                T2: 2026-09-16 (Loss Detected)
              </div>
            </div>
          </div>

          {/* Divider Line & Handle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] cursor-ew-resize z-20 flex items-center justify-center"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="w-6 h-6 rounded-full bg-slate-900 border-2 border-white shadow-xl flex items-center justify-center">
              <Sliders className="w-3 h-3 text-white rotate-90" />
            </div>
          </div>

          {/* Hidden range input overlay for dragging */}
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPos}
            onChange={(e) => setSliderPos(Number(e.target.value))}
            className="absolute inset-0 opacity-0 cursor-ew-resize z-30 w-full h-full"
            aria-label="Before / After Epoch Slider"
          />

          {/* Instruction hint */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-mono text-slate-300 pointer-events-none">
            Drag slider to inspect canopy change
          </div>
        </div>

        {/* Change Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono">
              <TreePine className="w-3 h-3 text-red-400" />
              <span>Net Canopy Loss</span>
            </div>
            <span className="text-base font-bold font-mono text-red-400 mt-1">
              -{selectedArea.canopy_loss_year_ha.toFixed(1)} ha
            </span>
            <span className="text-[10px] text-slate-500 font-mono">ΔNDVI avg -0.42</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono">
              <Droplet className="w-3 h-3 text-cyan-400" />
              <span>Wetland Shift</span>
            </div>
            <span className="text-base font-bold font-mono text-cyan-400 mt-1">
              +85.4 ha
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Seasonal hydro-recharge</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono">
              <Building className="w-3 h-3 text-amber-400" />
              <span>Built-up / Roads</span>
            </div>
            <span className="text-base font-bold font-mono text-amber-400 mt-1">
              +64.2 ha
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Linear track intrusions</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Detection Confidence</span>
            </div>
            <span className="text-base font-bold font-mono text-emerald-400 mt-1">
              94.6%
            </span>
            <span className="text-[10px] text-slate-500 font-mono">CVA p &lt; 0.001</span>
          </div>
        </div>
      </div>
    </div>
  );
};
