'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Globe, Loader2, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/common/ApiState';
import api from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { fmtDate, fmtNum, healthColor } from '@/lib/format';
import { AreaSummary } from '@/types';

function AreasInner() {
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const areas = useApi(() => api.areas.list({ search: search || undefined }), [search]);

  const [liveSearchedItems, setLiveSearchedItems] = useState<AreaSummary[]>([]);
  const [isLiveSearching, setIsLiveSearching] = useState(false);
  const [liveSearchAttempted, setLiveSearchAttempted] = useState(false);

  const handleGlobalLiveSearch = async () => {
    if (!search.trim()) return;
    setIsLiveSearching(true);
    setLiveSearchAttempted(true);
    try {
      const res = await api.areas.searchLive(search.trim(), 8);
      if (res?.items && res.items.length > 0) {
        setLiveSearchedItems(res.items);
      }
    } catch (err) {
      console.warn('Live search error:', err);
    } finally {
      setIsLiveSearching(false);
    }
  };

  const localItems = areas.data?.items ?? [];
  const displayItems = localItems.length > 0 ? localItems : liveSearchedItems;

  return (
    <AppLayout>
      <div className="space-y-5 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-mono">PROTECTED AREAS</h1>
            <p className="text-xs text-slate-400 mt-1">
              41 pre-loaded national parks & reserves. Search any location worldwide for real-time OpenStreetMap ingestion & satellite telemetry.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setLiveSearchedItems([]);
                  setLiveSearchAttempted(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGlobalLiveSearch();
                }}
                placeholder="Search catalog or global reserve…"
                className="h-9 w-72 pl-3 pr-8 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {search.trim().length >= 2 && localItems.length === 0 && (
              <button
                onClick={handleGlobalLiveSearch}
                disabled={isLiveSearching}
                className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50"
              >
                {isLiveSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                <span>Live Fetch</span>
              </button>
            )}
          </div>
        </div>

        {areas.loading && <LoadingBlock />}
        {areas.error && <ErrorBlock error={areas.error} onRetry={areas.reload} />}

        {!areas.loading && displayItems.length === 0 && (
          <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-4 max-w-lg mx-auto">
            <Globe className="w-8 h-8 text-emerald-400 mx-auto" />
            <div>
              <h3 className="text-sm font-semibold text-white font-mono">
                {search ? `No catalog areas matching "${search}"` : 'No protected areas found'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                TerraWatch can fetch the real boundary of ANY protected reserve worldwide via OpenStreetMap and calculate live satellite telemetry.
              </p>
            </div>
            {search.trim().length >= 2 && (
              <button
                onClick={handleGlobalLiveSearch}
                disabled={isLiveSearching}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold flex items-center gap-2 mx-auto shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
              >
                {isLiveSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                <span>{isLiveSearching ? 'Ingesting OpenStreetMap Boundary...' : `Fetch "${search}" from OpenStreetMap Live`}</span>
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayItems.map((a) => (
            <Link
              key={a.id}
              href={`/areas/${a.slug}`}
              className="gis-glass-card rounded-xl border border-slate-800 hover:border-emerald-500/50 p-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-white">{a.name}</h2>
                  <p className="text-[11px] text-slate-500">
                    {[a.state, a.country].filter(Boolean).join(', ')}
                  </p>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 shrink-0">
                  {a.designation ?? 'Protected area'}
                  {a.iucn_category ? ` · IUCN ${a.iucn_category}` : ''}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <Stat
                  label="Area km²"
                  value={a.area_km2.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                />
                <Stat label="Hotspots" value={String(a.hotspot_count)} />
                <div>
                  <p className={`text-lg font-mono ${healthColor(a.health_index?.band)}`}>
                    {a.health_index?.score != null ? fmtNum(a.health_index.score, 0) : '—'}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase">Health idx</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-3 font-mono">
                Last analysed: {fmtDate(a.last_analyzed)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-mono text-slate-200">{value}</p>
      <p className="text-[10px] text-slate-500 uppercase">{label}</p>
    </div>
  );
}

export default function AreasPage() {
  return (
    <Suspense fallback={null}>
      <AreasInner />
    </Suspense>
  );
}
