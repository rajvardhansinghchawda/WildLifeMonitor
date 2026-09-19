'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Globe, Loader2, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/common/ApiState';
import api, { AreaSummary } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { fmtDate, fmtNum, healthColor } from '@/lib/format';

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
      <div className="space-y-5 pb-12 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit">PROTECTED AREAS</h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
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
                className="h-10 w-72 pl-3.5 pr-8 rounded-xl bg-white border border-[#dde4dc] hover:border-emerald-600 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 shadow-xs transition-all"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {search.trim().length >= 2 && localItems.length === 0 && (
              <button
                onClick={handleGlobalLiveSearch}
                disabled={isLiveSearching}
                className="h-10 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 disabled:opacity-50"
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
          <div className="p-8 rounded-2xl bg-white border border-[#e5ebe4] text-center space-y-4 max-w-lg mx-auto shadow-xs">
            <Globe className="w-8 h-8 text-emerald-600 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-sans">
                {search ? `No catalog areas matching "${search}"` : 'No protected areas found'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                TerraWatch can fetch the real boundary of ANY protected reserve worldwide via OpenStreetMap and calculate live satellite telemetry.
              </p>
            </div>
            {search.trim().length >= 2 && (
              <button
                onClick={handleGlobalLiveSearch}
                disabled={isLiveSearching}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 mx-auto shadow-xs transition-all disabled:opacity-50"
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
              className="bg-white rounded-2xl border border-[#e5ebe4] hover:border-emerald-500/60 shadow-xs hover:shadow-md p-5 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{a.name}</h2>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {[a.state, a.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f0f3ee] border border-[#dde4dc] text-slate-600 shrink-0">
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
                    <p className={`text-lg font-mono font-bold ${healthColor(a.health_index?.band)}`}>
                      {a.health_index?.score != null ? fmtNum(a.health_index.score, 0) : '—'}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Health idx</p>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 font-mono border-t border-[#f0f3ee] pt-2">
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
      <p className="text-lg font-mono font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500 uppercase font-semibold">{label}</p>
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
