'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/common/ApiState';
import api from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { fmtDate, fmtNum, healthColor } from '@/lib/format';

function AreasInner() {
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const areas = useApi(() => api.areas.list({ search: search || undefined }), [search]);

  return (
    <AppLayout>
      <div className="space-y-5 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-mono">PROTECTED AREAS</h1>
            <p className="text-xs text-slate-400 mt-1">
              Boundaries from OpenStreetMap (ODbL). Health index is indicative and not ecologically validated.
            </p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, state, country…"
            className="h-9 w-72 px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {areas.loading && <LoadingBlock />}
        {areas.error && <ErrorBlock error={areas.error} onRetry={areas.reload} />}
        {areas.data && areas.data.items.length === 0 && <EmptyBlock title="No areas found" />}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {areas.data?.items.map((a) => (
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
