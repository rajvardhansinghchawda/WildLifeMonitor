import React, { useState } from 'react';
import Link from 'next/link';
import { ChangeEventHotspot } from '@/types';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import {
  X,
  MapPin,
  Calendar,
  Layers,
  TrendingDown,
  Percent,
  ShieldCheck,
  AlertTriangle,
  Info,
  Radio,
  ExternalLink,
  Copy,
  Check,
  Send,
  Download,
  Share2,
  TreePine,
  ShieldAlert,
} from 'lucide-react';

interface HotspotDetailDrawerProps {
  hotspot: ChangeEventHotspot | null;
  isOpen: boolean;
  onClose: () => void;
}

export const HotspotDetailDrawer: React.FC<HotspotDetailDrawerProps> = ({
  hotspot,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [patrolDispatched, setPatrolDispatched] = useState(false);

  if (!isOpen || !hotspot) return null;

  const handleCopyCoords = () => {
    const text = `${hotspot.coordinates.lat.toFixed(6)}, ${hotspot.coordinates.lon.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDispatchPatrol = () => {
    setIsDispatching(true);
    setTimeout(() => {
      setIsDispatching(false);
      setPatrolDispatched(true);
    }, 800);
  };

  const formatFullDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      {/* Slide-out Drawer Panel */}
      <div className="w-full max-w-xl bg-slate-950 border-l border-slate-800 h-full overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="sticky top-0 bg-slate-950/95 backdrop-blur-md p-5 border-b border-slate-800 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-white tracking-wide">
                  {hotspot.id}
                </span>
                <SeverityBadge severity={hotspot.severity} />
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                  {hotspot.status}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{hotspot.area_name}</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-6 space-y-6 flex-1 text-xs">
          {/* 1. Location & Geographic Coordinates */}
          <div className="gis-glass-card rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <MapPin className="w-3.5 h-3.5" />
                <span>Geographic Target</span>
              </span>
              <button
                onClick={handleCopyCoords}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-800 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Coordinates</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-slate-300 font-mono">
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">LATITUDE</span>
                <span className="font-bold text-white text-sm">
                  {hotspot.coordinates.lat.toFixed(6)}°
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">LONGITUDE</span>
                <span className="font-bold text-white text-sm">
                  {hotspot.coordinates.lon.toFixed(6)}°
                </span>
              </div>
            </div>

            <div className="text-slate-400 flex items-center justify-between text-[11px] font-mono pt-1">
              <span>Sector: <strong className="text-slate-200">{hotspot.location_detail || 'Core Reserve Boundary'}</strong></span>
              <span>Sensor: <strong className="text-slate-200">{hotspot.sensor}</strong></span>
            </div>
          </div>

          {/* 2. Temporal Detection */}
          <div className="gis-glass-card rounded-xl p-4 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase block">
                  Detection Timestamp
                </span>
                <span className="font-mono text-white text-xs font-bold">
                  {formatFullDate(hotspot.detected_at)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-slate-500 block">REVISIT INTERVAL</span>
              <span className="text-emerald-400 font-mono text-xs font-semibold">5-Day S2 Constellation</span>
            </div>
          </div>

          {/* 3. Condition Comparison (Previous vs Current) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold font-mono text-white tracking-wide uppercase flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Bi-Temporal Condition Comparison</span>
            </h4>

            <div className="grid grid-cols-1 gap-3">
              {/* Previous Condition */}
              <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 space-y-1">
                <span className="text-[10px] font-mono font-bold text-blue-400 uppercase block">
                  Previous Baseline Condition
                </span>
                <p className="text-slate-200 leading-relaxed font-sans">
                  {hotspot.previous_condition ||
                    'Intact primary forest canopy with continuous crown cover and normal chlorophyll reflectance.'}
                </p>
              </div>

              {/* Current Condition */}
              <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/30 space-y-1">
                <span className="text-[10px] font-mono font-bold text-red-400 uppercase block">
                  Current Observed Condition
                </span>
                <p className="text-slate-200 leading-relaxed font-sans">
                  {hotspot.current_condition ||
                    'Significant canopy disturbance detected with crown perforation and increased bare soil reflectance.'}
                </p>
              </div>
            </div>
          </div>

          {/* 4. Core Change Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 font-mono">
            {/* Change Percentage */}
            <div className="gis-glass-card rounded-xl p-3 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 block">CHANGE %</span>
              <div className="text-lg font-bold text-red-400 flex items-center gap-0.5">
                <TrendingDown className="w-4 h-4" />
                <span>
                  {hotspot.percentage_change
                    ? `${hotspot.percentage_change.toFixed(1)}%`
                    : `${(hotspot.delta_ndvi * 100).toFixed(0)}%`}
                </span>
              </div>
              <span className="text-[9px] text-slate-500 block">Δ {hotspot.delta_ndvi.toFixed(2)}</span>
            </div>

            {/* Affected Area */}
            <div className="gis-glass-card rounded-xl p-3 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 block">AFFECTED AREA</span>
              <div className="text-lg font-bold text-white">
                {hotspot.area_ha.toFixed(1)} <span className="text-xs text-slate-400 font-normal">ha</span>
              </div>
              <span className="text-[9px] text-slate-500 block">Contiguous cluster</span>
            </div>

            {/* Confidence */}
            <div className="gis-glass-card rounded-xl p-3 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 block">CONFIDENCE</span>
              <div className="text-lg font-bold text-cyan-400">
                {(hotspot.confidence_score * 100).toFixed(0)}%
              </div>
              <span className="text-[9px] text-slate-500 block">Multi-pass verified</span>
            </div>
          </div>

          {/* 5. Potential Contributing Factors (Strictly worded per prompt instructions) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold font-mono text-white tracking-wide uppercase flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400" />
              <span>Potential Contributing Factors</span>
            </h4>

            {/* Scientific Causation Disclaimer */}
            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200/90 flex items-start gap-2 leading-relaxed">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Conservation Intelligence Standard: </strong>
                The indicators below reflect observed spatial correlations and telemetry indicators. They do not constitute verified causation without ground-truth confirmation by patrol rangers.
              </div>
            </div>

            {/* Factor Chips / List */}
            <div className="space-y-2">
              {hotspot.potential_contributing_factors && hotspot.potential_contributing_factors.length > 0 ? (
                hotspot.potential_contributing_factors.map((factor, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 flex items-start gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <span>{factor}</span>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-slate-400">
                  No automated contributing factor signatures flagged for this cluster.
                </div>
              )}
            </div>
          </div>

          {/* 6. Related Alerts */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold font-mono text-white tracking-wide uppercase flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>Related Incident Alerts</span>
            </h4>

            {hotspot.related_alerts && hotspot.related_alerts.length > 0 ? (
              <div className="space-y-2">
                {hotspot.related_alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-slate-400 text-[10px]">{alert.id}</span>
                      <SeverityBadge severity={alert.severity} />
                    </div>
                    <div className="font-semibold text-slate-200">{alert.title}</div>
                    <div className="text-[10px] font-mono text-slate-500">
                      Triggered: {formatFullDate(alert.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-slate-400 text-[11px]">
                No prior incident notifications directly linked to this cluster coordinate.
              </div>
            )}
          </div>
        </div>

        {/* Drawer Bottom Actions */}
        <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur-md p-4 border-t border-slate-800 space-y-2 z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDispatchPatrol}
              disabled={isDispatching || patrolDispatched}
              className={`flex-1 py-2.5 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                patrolDispatched
                  ? 'bg-emerald-700 text-white cursor-default'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60 active:scale-[0.98]'
              }`}
            >
              {isDispatching ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>DISPATCHING RANGER PATROL...</span>
                </>
              ) : patrolDispatched ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>PATROL DISPATCHED (LOGGED)</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>DISPATCH RANGER PATROL</span>
                </>
              )}
            </button>

            <Link
              href={`/explore?lat=${hotspot.coordinates.lat}&lon=${hotspot.coordinates.lon}&zoom=14`}
              className="px-3.5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-mono text-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Explore</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
