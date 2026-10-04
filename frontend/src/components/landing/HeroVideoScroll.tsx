'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  TreePine,
  Satellite,
  Activity,
  ArrowRight,
  Play,
  ChevronDown,
  Crosshair,
  Sparkles,
} from 'lucide-react';
import FoldText from '@/components/ui/FoldText';

interface HeroVideoScrollProps {
  onWatchStory: () => void;
  onExploreFeatures: () => void;
}

const TOTAL_FRAMES = 80;
const FRAME_PATH = (index: number) =>
  `/frames/frame_${String(index).padStart(4, '0')}.jpg`;

export default function HeroVideoScroll({
  onWatchStory,
  onExploreFeatures,
}: HeroVideoScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const [firstFrameReady, setFirstFrameReady] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDeerFacing, setIsDeerFacing] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // normalized -1 to +1

  // Physics animation state for buttery 60fps lerp
  const animStateRef = useRef({
    currentProgress: 0,
    targetProgress: 0,
    currentMouseX: 0,
    currentMouseY: 0,
    targetMouseX: 0,
    targetMouseY: 0,
    renderedFrame: -1,
  });

  // 1. PRELOAD FRAMES
  useEffect(() => {
    let isMounted = true;
    const images: HTMLImageElement[] = [];
    framesRef.current = images;

    // Load Frame 0 immediately for instant poster display
    const firstImg = new window.Image();
    firstImg.src = FRAME_PATH(0);
    firstImg.onload = () => {
      if (!isMounted) return;
      setFirstFrameReady(true);
    };
    images[0] = firstImg;

    // Preload remaining frames
    for (let i = 1; i < TOTAL_FRAMES; i++) {
      const img = new window.Image();
      img.src = FRAME_PATH(i);
      images[i] = img;
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. SCROLL LISTENER
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalScrollable = rect.height - windowHeight;

      if (totalScrollable <= 0) return;

      const scrolled = -rect.top;
      const progress = Math.min(Math.max(scrolled / totalScrollable, 0), 1);

      animStateRef.current.targetProgress = progress;
      setScrollProgress(progress);
      setIsDeerFacing(progress >= 0.78);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 3. MOUSE TRACKING (Normalized -1 to +1)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = (e.clientY / window.innerHeight) * 2 - 1;

      animStateRef.current.targetMouseX = normX;
      animStateRef.current.targetMouseY = normY;
      setMousePos({ x: normX, y: normY });
    };

    const handleMouseLeave = () => {
      animStateRef.current.targetMouseX = 0;
      animStateRef.current.targetMouseY = 0;
      setMousePos({ x: 0, y: 0 });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // 4. CANVAS RENDER LOOP WITH DYNAMIC GAZE INTERPOLATION
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      const state = animStateRef.current;

      // Smooth progress lerp
      state.currentProgress += (state.targetProgress - state.currentProgress) * 0.12;

      // Smooth mouse lerp
      state.currentMouseX += (state.targetMouseX - state.currentMouseX) * 0.08;
      state.currentMouseY += (state.targetMouseY - state.currentMouseY) * 0.08;

      // Base frame index calculated from scroll progress
      let frameIndex = Math.round(state.currentProgress * (TOTAL_FRAMES - 1));
      frameIndex = Math.min(Math.max(frameIndex, 0), TOTAL_FRAMES - 1);

      // Interactive Cursor Gaze:
      // When deer is facing forward at the end (progress >= 0.78),
      // mouse X shifts frame dynamically between 73 and 79 for natural head turning!
      if (state.currentProgress >= 0.78) {
        const gazeOffset = Math.round(state.currentMouseX * 3); // -3 to +3
        const interactiveIndex = 76 + gazeOffset;
        frameIndex = Math.min(Math.max(interactiveIndex, 73), 79);
      }

      // Screen & DPR Dimensions
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const displayWidth = window.innerWidth;
      const displayHeight = window.innerHeight;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      const img = framesRef.current[frameIndex] || framesRef.current[0];

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.scale(dpr, dpr);

        // Aspect ratio cover calculation
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const screenAspect = displayWidth / displayHeight;

        let drawW: number;
        let drawH: number;
        let drawX: number;
        let drawY: number;

        if (screenAspect > imgAspect) {
          drawW = displayWidth;
          drawH = displayWidth / imgAspect;
          drawX = 0;
          drawY = (displayHeight - drawH) / 2;
        } else {
          drawH = displayHeight;
          drawW = displayHeight * imgAspect;
          drawX = (displayWidth - drawW) / 2;
          drawY = 0;
        }

        // Precise Deer Head Anchor Point (approx 66.8% X, 30.5% Y on original 1280x720 frame)
        const deerHeadX = drawX + drawW * 0.668;
        const deerHeadY = drawY + drawH * 0.305;

        // Apply interactive 2.5D head micro-perspective & translation when deer is in focus
        if (state.currentProgress >= 0.75) {
          const deerFocusFactor = Math.min((state.currentProgress - 0.75) / 0.25, 1);
          const shiftX = state.currentMouseX * 18 * deerFocusFactor;
          const shiftY = state.currentMouseY * 12 * deerFocusFactor;
          const scaleBonus = 1 + Math.abs(state.currentMouseX * state.currentMouseY) * 0.018 * deerFocusFactor;

          ctx.translate(deerHeadX, deerHeadY);
          ctx.translate(shiftX, shiftY);
          ctx.scale(scaleBonus, scaleBonus);
          ctx.translate(-deerHeadX, -deerHeadY);
        }

        // Draw image frame
        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        // Wildlife Specular Eye Tracking Gleams (Drawn precisely at eye coordinates)
        if (state.currentProgress >= 0.78) {
          const eyeShiftX = state.currentMouseX * 1.8;
          const eyeShiftY = state.currentMouseY * 1.3;
          const leftEyeX = drawX + drawW * 0.648 + eyeShiftX;
          const leftEyeY = drawY + drawH * 0.308 + eyeShiftY;
          const rightEyeX = drawX + drawW * 0.690 + eyeShiftX;
          const rightEyeY = drawY + drawH * 0.308 + eyeShiftY;

          ctx.save();
          ctx.globalAlpha = Math.min((state.currentProgress - 0.78) / 0.15, 0.85);
          ctx.fillStyle = '#fef08a'; // Subtle warm amber glint
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 6;

          // Left Eye Specular Reflection
          ctx.beginPath();
          ctx.arc(leftEyeX, leftEyeY, 1.8, 0, Math.PI * 2);
          ctx.fill();

          // Right Eye Specular Reflection
          ctx.beginPath();
          ctx.arc(rightEyeX, rightEyeY, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.restore();
        state.renderedFrame = frameIndex;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Text transitions based on scroll progress
  const textOpacity = Math.max(0, 1 - scrollProgress * 2.2);
  const textTranslateY = scrollProgress * -80;

  // Final gaze badge opacity
  const gazeBadgeOpacity = isDeerFacing
    ? Math.min((scrollProgress - 0.85) / 0.12, 1)
    : 0;

  return (
    <div
      ref={containerRef}
      id="home"
      className="relative w-full h-[270vh] bg-[#0b0f14]"
      style={{ willChange: 'transform' }}
    >
      {/* ── STICKY VIEWPORT CONTAINER (Pins for the duration of video scroll) ── */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between">
        {/* HTML5 Canvas Background */}
        <div className="absolute inset-0 z-0 select-none overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-cover block cursor-crosshair"
          />

          {/* Initial Poster Fallback */}
          {!firstFrameReady && (
            <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
              <Image
                src="/deer-bg.png"
                alt="Deer in forest"
                fill
                priority
                className="object-cover object-center"
              />
            </div>
          )}

          {/* Cinematic Vignettes for Optimal Typography Contrast */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/65 via-black/30 to-black/15" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/70" />
        </div>

        {/* Top-Right Brand Badge */}
        <div className="absolute top-20 right-6 z-20 flex flex-col items-center text-center select-none pointer-events-none">
          <Image
            src="/primary logo 1.png"
            alt="VANYORA Logo"
            width={36}
            height={44}
            className="h-11 w-auto object-contain mb-1 drop-shadow-md"
          />
          <span className="font-outfit font-black text-[10px] text-white/85 leading-tight tracking-[0.18em] uppercase text-center">
            VANYORA
          </span>
        </div>

        {/* ── HERO HEADLINE ("The Forest is their house") ── */}
        <div
          className="relative z-10 flex-1 flex flex-col justify-center px-8 sm:px-14 lg:px-20 pb-32 transition-all duration-300 pointer-events-none"
          style={{
            opacity: textOpacity,
            transform: `translateY(${textTranslateY}px)`,
          }}
        >
          {/* "the" small italic prefix */}
          <div className="flex items-baseline gap-2 sm:gap-3">
            <span
              className="text-white font-serif italic font-normal select-none"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 3.5rem)', lineHeight: 1 }}
            >
              The
            </span>
            {/* "Forest" — animated 3D FoldText unfolding effect */}
            <h1 className="leading-none select-none">
              <FoldText
                text="Forest"
                splitBy="char"
                hinge="top"
                trigger="mount"
                duration={1.8}
                stagger={0.16}
                ease="power3.out"
                perspective={700}
                creaseShading={0.55}
                fontSize="clamp(5rem, 14vw, 13rem)"
                fontWeight={900}
                color="#ffffff"
                className="drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)] tracking-tight"
                style={{
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  lineHeight: 0.88,
                  textTransform: 'none',
                }}
              />
            </h1>
          </div>

          {/* "is their house" — golden-yellow bold serif text */}
          <div
            className="inline-flex items-center mt-2 sm:mt-3"
            style={{ marginLeft: 'clamp(4rem, 9vw, 12rem)' }}
          >
            <span
              className="text-yellow-400 font-bold tracking-tight leading-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]"
              style={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontSize: 'clamp(2rem, 5.5vw, 5.5rem)',
              }}
            >
              is their house
            </span>
          </div>
        </div>

        {/* ── INTERACTIVE GAZE TELEMETRY HUD (Appears when deer looks at camera at ~80-100% scroll) ── */}
        {isDeerFacing && (
          <div
            className="absolute top-28 left-8 sm:left-14 z-20 pointer-events-none transition-all duration-500"
            style={{ opacity: gazeBadgeOpacity }}
          >
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/75 backdrop-blur-xl border border-emerald-500/50 text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
              <Crosshair className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
              <span className="text-[11px] font-mono font-bold tracking-wider uppercase">
                Wildlife Gaze Attached • Move Cursor
              </span>
            </div>
            <div className="text-[10px] font-mono text-emerald-300/80 mt-1.5 pl-2 flex items-center gap-2 drop-shadow-md">
              <span>Gaze Vector: X:{(mousePos.x * 22).toFixed(1)}° Y:{(-mousePos.y * 14).toFixed(1)}°</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span className="text-white/70">Subject: Axis axis (Spotted Deer)</span>
            </div>
          </div>
        )}

        {/* ── SCROLL PROGRESS BAR (Right vertical track) ── */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 hidden lg:flex flex-col items-center gap-2 pointer-events-none">
          <div className="w-1.5 h-28 rounded-full bg-white/10 overflow-hidden relative">
            <div
              className="w-full bg-gradient-to-b from-emerald-400 to-[#2ecc71] rounded-full transition-all duration-75"
              style={{ height: `${Math.round(scrollProgress * 100)}%` }}
            />
          </div>
          <span className="text-[9px] font-mono font-bold text-white/60 tracking-wider">
            {Math.round(scrollProgress * 100)}%
          </span>
        </div>

        {/* ── BOTTOM TELEMETRY STATS & ACTION BAR (Smoothly dissolves as video animates) ── */}
        <div
          className="relative z-20 w-full bg-black/75 backdrop-blur-xl border-t border-white/10 shadow-2xl transition-all duration-500"
          style={{
            opacity: Math.max(0, 1 - scrollProgress * 3.5),
            transform: `translateY(${Math.min(scrollProgress * 120, 120)}px)`,
            pointerEvents: scrollProgress > 0.15 ? 'none' : 'auto',
          }}
        >
          <div className="flex flex-col md:flex-row items-stretch divide-y md:divide-y-0 md:divide-x divide-white/10">
            {/* Stat 1: Protected Habitat */}
            <div className="flex-1 min-w-0 px-5 sm:px-7 py-3.5 sm:py-4 flex flex-col justify-center hover:bg-white/[0.03] transition-colors group">
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
                  <TreePine className="w-3 h-3 text-emerald-400" />
                  Live Surveillance
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-white font-extrabold text-base sm:text-lg tracking-tight font-outfit">
                  18,450 km²
                </span>
                <span className="text-white/80 text-xs font-semibold">Protected Habitat</span>
              </div>
              <p className="text-white/50 text-[11px] truncate mt-0.5 group-hover:text-white/70 transition-colors">
                24 Wildlife Corridors & Reserves Under Active Watch
              </p>
            </div>

            {/* Stat 2: Satellite Sensing */}
            <div className="flex-1 min-w-0 px-5 sm:px-7 py-3.5 sm:py-4 flex flex-col justify-center hover:bg-white/[0.03] transition-colors group">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase flex items-center gap-1.5">
                  <Satellite className="w-3 h-3 text-cyan-400" />
                  Sentinel-2 & SAR
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-white font-extrabold text-base sm:text-lg tracking-tight font-outfit">
                  10m Resolution
                </span>
                <span className="text-white/80 text-xs font-semibold">&lt; 48h Revisit</span>
              </div>
              <p className="text-white/50 text-[11px] truncate mt-0.5 group-hover:text-white/70 transition-colors">
                Multi-Spectral Canopy & Surface Hydrology Delta
              </p>
            </div>

            {/* Stat 3: AI Heuristic Triage */}
            <div className="flex-1 min-w-0 px-5 sm:px-7 py-3.5 sm:py-4 flex flex-col justify-center hover:bg-white/[0.03] transition-colors group">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-amber-400" />
                  AI Heuristic Triage
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-white font-extrabold text-base sm:text-lg tracking-tight font-outfit">
                  98.4% Precision
                </span>
                <span className="text-white/80 text-xs font-semibold">Instant Alert</span>
              </div>
              <p className="text-white/50 text-[11px] truncate mt-0.5 group-hover:text-white/70 transition-colors">
                Automated Verification for Forest Ranger Patrols
              </p>
            </div>

            {/* Explore Section Navigation */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 flex items-center gap-2 flex-shrink-0">
              <button
                onClick={onExploreFeatures}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all hover:scale-105"
                aria-label="Explore features"
                title="Explore platform features"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Watch Story Video Button */}
            <div className="px-5 sm:px-8 py-3.5 sm:py-4 flex items-center gap-3.5 flex-shrink-0 bg-white/[0.02]">
              <button
                onClick={onWatchStory}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all flex-shrink-0"
                aria-label="Watch story"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </button>
              <div className="flex flex-col cursor-pointer" onClick={onWatchStory}>
                <span className="text-white text-xs font-bold leading-tight hover:text-emerald-400 transition-colors">
                  Watch Story
                </span>
                <span className="text-white/50 text-[10px]">Mission Overview</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Scroll / Unpin Action Pill */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          {scrollProgress < 0.9 ? (
            <button
              onClick={() => {
                if (containerRef.current) {
                  const targetY = containerRef.current.offsetTop + containerRef.current.offsetHeight;
                  window.scrollTo({ top: targetY, behavior: 'smooth' });
                }
              }}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/80 hover:text-white hover:border-emerald-400 text-xs font-medium tracking-wide shadow-xl transition-all group"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Scroll to animate video</span>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
            </button>
          ) : (
            <button
              onClick={onExploreFeatures}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 text-xs font-bold tracking-wide shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105 animate-bounce"
            >
              <span>Explore Features & Habitat Map</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
