'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Sliders, Calendar, X, Eye, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProtectedArea } from '@/types';

interface BeforeAfterSliderProps {
  selectedArea: ProtectedArea;
  onClose?: () => void;
  className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  selectedArea,
  onClose,
  className,
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isDragging, setIsDragging] = useState(false);
  const [diffMode, setDiffMode] = useState<'mask' | 'ndvi' | 'natural'>('mask');
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPos(percentage);
    },
    []
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handlePointerMove(e.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches[0]) {
      handlePointerMove(e.touches[0].clientX);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onMouseUp={() => setIsDragging(false)}
      onTouchEnd={() => setIsDragging(false)}
      className={cn(
        'relative w-full h-full overflow-hidden select-none bg-[#05080c]',
        className
      )}
    >
      {/* ========================================================================= */}
      {/* BASE LAYER (LEFT / EPOCH 1 - HISTORICAL BASELINE) */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Simulated High-Res Pristine Forest Texture (Epoch 1) */}
        <div
          className="w-full h-full relative"
          style={{
            background: `
              radial-gradient(ellipse at 40% 45%, rgba(6, 95, 70, 0.7) 0%, rgba(4, 47, 46, 0.85) 50%, rgba(2, 28, 24, 0.98) 100%),
              repeating-linear-gradient(45deg, rgba(16, 185, 129, 0.05) 0px, rgba(16, 185, 129, 0.05) 2px, transparent 2px, transparent 16px)
            `,
          }}
        >
          {/* Pristine river stream */}
          <div
            className="absolute top-0 bottom-0 left-1/4 w-8 bg-cyan-500/30 blur-[2px] rotate-12 pointer-events-none"
            style={{
              clipPath: 'polygon(20% 0%, 80% 0%, 60% 100%, 0% 100%)',
            }}
          />

          {/* Epoch 1 Top HUD Badge */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-slate-700 text-xs font-mono text-slate-200 shadow-xl flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                EPOCH 1: <strong className="text-white">Jan 15, 2025</strong> (Baseline)
              </span>
            </div>
            <span className="px-2 py-1 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">
              S2 L2A (10m)
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COMPARISON LAYER (RIGHT / EPOCH 2 - OBSERVED CLEARINGS) */}
      {/* ========================================================================= */}
      <div
        className="absolute inset-0 overflow-hidden z-10"
        style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
      >
        <div
          className="w-full h-full relative"
          style={{
            background:
              diffMode === 'mask'
                ? `radial-gradient(ellipse at 40% 45%, rgba(185, 28, 28, 0.4) 0%, rgba(30, 41, 59, 0.85) 50%, rgba(7, 11, 16, 0.98) 100%),
                   repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.12) 0px, rgba(239, 68, 68, 0.12) 3px, transparent 3px, transparent 14px)`
                : diffMode === 'ndvi'
                ? `radial-gradient(ellipse at 40% 45%, rgba(245, 158, 11, 0.45) 0%, rgba(30, 41, 59, 0.85) 50%, rgba(7, 11, 16, 0.98) 100%)`
                : `radial-gradient(ellipse at 40% 45%, rgba(5, 150, 105, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)`,
          }}
        >
          {/* Deforestation Scars & Corridors */}
          <div className="absolute top-1/3 left-1/3 w-36 h-24 rounded-2xl border-2 border-red-500/90 bg-red-600/30 blur-[1px] animate-pulse flex items-center justify-center pointer-events-none">
            <span className="text-[10px] font-mono text-red-200 bg-red-950/90 px-2 py-0.5 rounded border border-red-500/60 shadow-lg">
              -18.4 ha canopy loss
            </span>
          </div>

          <div className="absolute bottom-1/3 right-1/4 w-48 h-3 rounded bg-amber-500/80 rotate-[-18deg] shadow-lg shadow-amber-500/50 pointer-events-none flex items-center justify-center">
            <span className="text-[9px] font-mono text-amber-200 bg-amber-950 px-1 py-0.5 rounded border border-amber-500/50">
              New road track (2.4 km)
            </span>
          </div>

          {/* Epoch 2 Top HUD Badge */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-red-950/80 border border-red-500/40 text-red-300 text-[10px] font-mono">
              DIFF DETECTED
            </span>
            <div className="px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-red-800/60 text-xs font-mono text-red-200 shadow-xl flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-red-400" />
              <span>
                EPOCH 2: <strong className="text-white">Sep 18, 2026</strong> (Current Pass)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DIVIDER LINE & DRAG HANDLE */}
      {/* ========================================================================= */}
      <div
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
        className="absolute top-0 bottom-0 w-1 bg-white/90 shadow-[0_0_15px_rgba(255,255,255,0.9)] cursor-ew-resize z-30 flex items-center justify-center transition-opacity"
        style={{ left: `${sliderPos}%` }}
      >
        <div
          className={cn(
            'w-8 h-8 rounded-full bg-slate-900 border-2 border-white shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-125',
            isDragging && 'scale-125 ring-4 ring-emerald-500/50'
          )}
        >
          <Sliders className="w-3.5 h-3.5 text-white rotate-90" />
        </div>
      </div>

      {/* Hidden range input overlay for accessibility */}
      <input
        type="range"
        min="0"
        max="100"
        value={sliderPos}
        onChange={(e) => setSliderPos(Number(e.target.value))}
        className="sr-only"
        aria-label="Before / After Satellite Comparison Slider"
      />

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-950/90 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-xl shadow-2xl">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDiffMode('mask')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-mono transition-colors',
              diffMode === 'mask'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Change Mask
          </button>
          <button
            onClick={() => setDiffMode('ndvi')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-mono transition-colors',
              diffMode === 'ndvi'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'text-slate-400 hover:text-white'
            )}
          >
            NDVI Delta
          </button>
          <button
            onClick={() => setDiffMode('natural')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-mono transition-colors',
              diffMode === 'natural'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Natural Color
          </button>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        <div className="text-[11px] font-mono text-slate-400 px-2">
          Position: <strong className="text-white">{sliderPos.toFixed(0)}%</strong>
        </div>

        {onClose && (
          <>
            <div className="h-4 w-px bg-slate-800" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-mono"
              title="Exit Comparison Mode"
            >
              <X className="w-3.5 h-3.5" />
              <span>Exit Compare</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
