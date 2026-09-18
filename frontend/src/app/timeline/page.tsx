'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MOCK_TIMELINE, MOCK_AREAS } from '@/lib/mock-data';
import { PhenologyChart } from '@/components/analytics/PhenologyChart';
import { apiClient } from '@/lib/api-client';
import { ProtectedArea, TimelineDataPoint } from '@/types';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TreePine,
  Droplet,
  Flame,
  Info,
  Radio,
} from 'lucide-react';

export default function TimelinePage() {
  const [areas, setAreas] = useState<ProtectedArea[]>(MOCK_AREAS);
  const [selectedArea, setSelectedArea] = useState<ProtectedArea>(MOCK_AREAS[0]);
  const [timelineData, setTimelineData] = useState<TimelineDataPoint[]>(MOCK_TIMELINE);
  const [metricMode, setMetricMode] = useState<'ndvi' | 'water' | 'loss'>('ndvi');
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    apiClient.checkHealth().then((h) => {
      if (isMounted) setIsBackendOnline(h.isOnline);
    });
    apiClient.getAreas().then((data) => {
      if (isMounted && data && data.length > 0) {
        setAreas(data);
        setSelectedArea(data[0]);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (selectedArea?.id) {
      apiClient.getAreaTimeline(selectedArea.id).then((tl) => {
        if (isMounted && tl && tl.length > 0) {
          setTimelineData(tl);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [selectedArea?.id]);

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span>PHENOLOGY TIMELINE & LONGITUDINAL TRENDS</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Multi-year seasonal vegetation cycles, historical baseline deviation & degradation acceleration
          </p>
        </div>

        {/* Reserve Selector & Backend Health */}
        <div className="flex items-center gap-3 flex-wrap">
          {isBackendOnline !== null && (
            <span
              className={cn(
                'px-2.5 py-1 rounded font-mono text-[11px] flex items-center gap-1.5 border',
                isBackendOnline
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', isBackendOnline ? 'bg-emerald-400' : 'bg-amber-400')} />
              {isBackendOnline ? 'FASTAPI: CONNECTED' : 'OFFLINE FALLBACK'}
            </span>
          )}
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-slate-400">TARGET RESERVE:</label>
            <select
              value={selectedArea.id}
              onChange={(e) => {
                const a = areas.find((x) => x.id === e.target.value) || MOCK_AREAS.find((x) => x.id === e.target.value);
                if (a) setSelectedArea(a);
              }}
              className="h-9 px-3 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-medium focus:outline-none"
            >
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name} ({area.country})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Metric Mode Switcher */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMetricMode('ndvi')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
            metricMode === 'ndvi'
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 shadow'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          <TreePine className="w-3.5 h-3.5 text-emerald-400" />
          <span>NDVI PHENOLOGY CURVE</span>
        </button>

        <button
          onClick={() => setMetricMode('water')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
            metricMode === 'water'
              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 shadow'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          <Droplet className="w-3.5 h-3.5 text-cyan-400" />
          <span>SURFACE WATER AREA (HA)</span>
        </button>

        <button
          onClick={() => setMetricMode('loss')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
            metricMode === 'loss'
              ? 'bg-red-950/80 text-red-300 border border-red-500/50 shadow'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-red-400" />
          <span>DEGRADATION & FIRES (YTD)</span>
        </button>
      </div>

      {/* Main Chart Card */}
      <div className="gis-glass-card rounded-xl p-6 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              {metricMode === 'ndvi' && 'Multi-Spectral NDVI Seasonality vs 5-Year Baseline'}
              {metricMode === 'water' && 'Wetland & Water Body NDWI Area Trajectory (Hectares)'}
              {metricMode === 'loss' && 'Monthly Canopy Loss (Hectares) & Active Fire Thermal Counts'}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Acquisitions from Sentinel-2 MSI and Landsat-9 OLI-2 • Harmonized Surface Reflectance
            </p>
          </div>

          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
            Oct 2025 - Sep 2026 (12 Months)
          </span>
        </div>

        {/* Dynamic Chart */}
        <PhenologyChart data={timelineData} mode={metricMode} />

        {/* Interpretation Callout */}
        <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white uppercase">ANOMALY INTERPRETATION:</span>{' '}
            Vegetation index drops markedly below historical baseline between July and September 2026 (ΔNDVI -0.16 deviation), strongly correlated with elevated active fire counts and illegal logging operations.
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
