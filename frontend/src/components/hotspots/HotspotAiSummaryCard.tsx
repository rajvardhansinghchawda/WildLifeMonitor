'use client';

import React, { useEffect, useState, useId } from 'react';
import api, { Hotspot, HotspotDetail, HotspotSummaryResponse } from '@/lib/api';
import { formatCoordinatesWithPlace } from '@/lib/geo-names';

interface HotspotAiSummaryCardProps {
  hotspot: HotspotDetail | Hotspot;
  className?: string;
}

// Client-side immediate fallback in case of network latency
function generateLocalFallback(h: HotspotDetail | Hotspot, lang: 'en' | 'hinglish'): HotspotSummaryResponse {
  const lat = h.coordinates?.lat ?? (h as any).centroid_lat ?? 0;
  const lon = h.coordinates?.lon ?? (h as any).centroid_lon ?? 0;
  const loc = formatCoordinatesWithPlace(lat, lon, h.area_name);
  const ha = h.affected_area_ha ? `${h.affected_area_ha.toFixed(2)} ha` : 'significant area';
  const drop = h.mean_ndvi_change !== null && h.mean_ndvi_change !== undefined ? `${h.mean_ndvi_change.toFixed(3)}` : 'unspecified';
  const road =
    h.nearest_known_road_distance_m !== null && h.nearest_known_road_distance_m !== undefined
      ? `${(h.nearest_known_road_distance_m / 1000).toFixed(2)} km`
      : 'unknown distance';
  const settle =
    h.nearest_known_settlement_distance_m !== null && h.nearest_known_settlement_distance_m !== undefined
      ? `${(h.nearest_known_settlement_distance_m / 1000).toFixed(2)} km`
      : 'unknown distance';
  const priority = h.priority_score !== null && h.priority_score !== undefined ? `${h.priority_score.toFixed(0)}/100` : 'Unscored';
  const sensor = h.sensor || 'Sentinel-2';
  const sev = (h.severity || 'medium').toUpperCase();

  if (lang === 'hinglish') {
    return {
      headline: `${loc} me ${ha} ka ${h.change_label || 'Disturbance'}`,
      short_summary: `${loc} me lagbhag ${ha} par canopy disturbance detect hua hai (NDVI change: ${drop}). Patrol road se ${road} doori par sthit hone se field patrol recommended hai (Priority: ${priority}).`,
      full_brief: `1. Incident Synopsis:\n${sensor} satellite data ke mutabik ${loc} me ${ha} kshetra par ${h.change_label || 'canopy loss'} identify hua hai.\n\n2. Ecological Impact:\nVegetation greenness me ${drop} ki girawat darj hui hai (${h.baseline_value?.toFixed(3) ?? 'N/A'} → ${h.comparison_value?.toFixed(3) ?? 'N/A'}). Yeh aam seasonal sukhe ke mukable achanak ped kataai ya canopy degradation ki taraf ishara karta hai.\n\n3. Corridor & Field Verification:\nSthan patrol road se lagbhag ${road} aur human basti se ${settle} door hai. Priority score ${priority} ke sath forest patrol team ko coordinates par inspection ke liye bheja jana chahiye.`,
      key_takeaways: [
        `${loc} me ${ha} kshetra prabhavit`,
        `NDVI indicator me ${drop} ka significant drop`,
        `Patrol road se ${road} door, field investigation priority ${priority}`,
      ],
      recommended_action: `Patrol team ko coordinates (${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E) par inspection ke liye bhejein.`,
      confidence: 'high',
      source: 'deterministic_engine',
      language: 'hinglish',
    };
  }

  return {
    headline: `${h.change_label || 'Canopy Disturbance'} (${ha}) in ${loc}`,
    short_summary: `A ${ha} ${h.change_label?.toLowerCase() || 'disturbance'} was identified in ${loc} with an NDVI drop of ${drop}. Proximity to patrol roads (${road}) enables feasible ground inspection (Priority: ${priority}).`,
    full_brief: `1. Incident Synopsis:\nEarth observation imagery from ${sensor} detected a ${ha} ${h.change_label?.toLowerCase() || 'canopy change'} in ${loc} classified under ${sev} severity.\n\n2. Ecological & Spectral Impact:\nCanopy greenness index shifted by ${drop} (${h.baseline_value?.toFixed(3) ?? 'N/A'} → ${h.comparison_value?.toFixed(3) ?? 'N/A'}), reflecting abrupt vegetative loss rather than normal seasonal variation.\n\n3. Corridor Access & Patrol Priority:\nThe location is situated ${road} from known patrol routes and ${settle} from human settlements. With an investigation priority of ${priority}, ground team dispatch is advised for physical verification.`,
    key_takeaways: [
      `${ha} disturbance detected via ${sensor}`,
      `Vegetation index decreased by ${drop}`,
      `Accessible patrol corridor (${road}); priority score ${priority}`,
    ],
    recommended_action: `Dispatch field patrol to coordinates (${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E) to verify disturbance cause.`,
    confidence: 'high',
    source: 'deterministic_engine',
    language: 'en',
  };
}

export function HotspotAiSummaryCard({ hotspot, className = '' }: HotspotAiSummaryCardProps) {
  const [lang, setLang] = useState<'en' | 'hinglish'>('en');
  const [summary, setSummary] = useState<HotspotSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const modalId = useId();

  // Cache key per hotspot id + record version + language
  const cacheKey = `h_summary_${hotspot.id}_v${hotspot.record_version}_${lang}`;

  useEffect(() => {
    let cancelled = false;

    // Check session cache first
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setSummary(JSON.parse(cached));
        return;
      }
    } catch {
      /* ignore */
    }

    // Set immediate fallback so UI never waits empty
    const local = generateLocalFallback(hotspot, lang);
    setSummary(local);
    setLoading(true);

    // Fetch from backend API
    api.hotspots
      .summary(hotspot.id, lang)
      .then((res) => {
        if (!cancelled && res) {
          setSummary(res);
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(res));
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {
        // Local fallback is already active; silently retain
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hotspot.id, hotspot.record_version, lang, cacheKey]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showModal]);

  const safeLat = hotspot.coordinates?.lat ?? (hotspot as any).centroid_lat ?? 0;
  const safeLon = hotspot.coordinates?.lon ?? (hotspot as any).centroid_lon ?? 0;
  const placeName = formatCoordinatesWithPlace(
    safeLat,
    safeLon,
    hotspot.area_name
  );

  return (
    <>
      {/* Compact Inline Card: Takes very minimal space (~80px) with rich AI styling */}
      <div
        className={`relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/50 via-slate-900/80 to-slate-950/90 p-3 text-xs shadow-lg ${className}`}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40 text-[11px]">
              ✨
            </span>
            <span className="font-bold text-emerald-300 text-[11px] tracking-wide uppercase font-mono">
              AI Threat Summary
            </span>
            {summary?.source === 'groq_llm' ? (
              <span className="rounded bg-emerald-900/80 px-1.5 py-0.5 text-[9px] font-mono text-emerald-300 border border-emerald-500/40 font-semibold shadow-xs">
                LLM Synthesized
              </span>
            ) : (
              <span className="rounded bg-slate-800/90 px-1.5 py-0.5 text-[9px] font-mono text-slate-300 border border-slate-700">
                Live Telemetry
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setLang((l) => (l === 'en' ? 'hinglish' : 'en'))}
              className="rounded px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition border border-transparent hover:border-slate-700"
              title="Toggle English / Hinglish"
            >
              {lang === 'en' ? 'EN' : 'HI-EN'}
            </button>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-200 hover:text-white border border-emerald-500/50 px-2 py-0.5 text-[10.5px] font-semibold transition shadow-sm"
              title="Open full expanded AI summary dossier"
            >
              <span>Full Summary</span>
              <span className="text-[10px]">↗</span>
            </button>
          </div>
        </div>

        {/* Short Natural Language Summary */}
        <p className="text-[11.5px] leading-relaxed text-slate-200 line-clamp-2">
          {summary?.short_summary || (
            <span className="text-slate-400 animate-pulse">Synthesizing field intelligence...</span>
          )}
        </p>
      </div>

      {/* Floating Modal Dossier (Opens on "Full Summary") */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalId}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="relative w-full max-w-xl rounded-2xl border border-emerald-500/50 bg-slate-950 shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800/80 bg-slate-900/95 p-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-300 border border-emerald-500/40">
                    ✨ AI Executive Threat Summary & Dossier
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {summary?.source === 'groq_llm' ? 'Groq LLaMA-3.3 Intelligence' : 'Scientific Telemetry Engine'}
                  </span>
                </div>
                <h3 id={modalId} className="text-base font-bold text-white tracking-tight">
                  {summary?.headline || hotspot.change_label}
                </h3>
                <p className="text-[11px] text-cyan-400 font-mono mt-0.5">
                  📍 {placeName}
                </p>
              </div>

              {/* Prominent Cross Button to close */}
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close dossier"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/80 text-slate-300 hover:text-white hover:bg-rose-500/30 hover:border-rose-500/60 border border-slate-700 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 max-h-[72vh] overflow-y-auto text-xs text-slate-300">
              {/* Language Switcher inside modal */}
              <div className="flex items-center justify-between bg-slate-900/60 rounded-lg p-2 border border-slate-800">
                <span className="text-[11px] text-slate-400">Narrative Language:</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setLang('en')}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                      lang === 'en'
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang('hinglish')}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                      lang === 'hinglish'
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Hinglish (Roman)
                  </button>
                </div>
              </div>

              {/* Key Takeaways Cards */}
              {summary?.key_takeaways && summary.key_takeaways.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {summary.key_takeaways.map((point, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-slate-900/90 border border-slate-800 p-2.5 flex items-start gap-2"
                    >
                      <span className="text-emerald-400 font-bold text-xs">✔</span>
                      <span className="text-[11px] text-slate-200 leading-snug">{point}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Full Detailed Brief */}
              <div className="space-y-3 bg-slate-900/50 rounded-xl p-3.5 border border-slate-800/80">
                <h4 className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
                  Detailed Situation Analysis
                </h4>
                <div className="space-y-2 text-[11.5px] leading-relaxed text-slate-200 whitespace-pre-line font-sans">
                  {summary?.full_brief}
                </div>
              </div>

              {/* Recommended Field Action */}
              {summary?.recommended_action && (
                <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/40 p-3 flex items-start gap-2.5">
                  <span className="text-emerald-400 text-sm mt-0.5">🎯</span>
                  <div>
                    <div className="font-semibold text-emerald-300 text-[11px] font-mono uppercase">
                      Recommended Patrol Action
                    </div>
                    <div className="text-[11px] text-slate-200 mt-0.5">
                      {summary.recommended_action}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/80 px-4 py-2.5">
              <span className="text-[10px] text-slate-500 font-mono">
                Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">Esc</kbd> to close
              </span>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 text-xs font-medium transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HotspotAiSummaryCard;
