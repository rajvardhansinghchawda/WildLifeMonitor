'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { ErrorBlock, LoadingBlock } from '@/components/common/ApiState';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import api, { Hotspot } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { fmtHa } from '@/lib/format';

const GeoMap = dynamic(() => import('@/components/map/GeoMap'), { ssr: false });

export default function ExplorePage() {
  const areas = useApi(() => api.areas.list(), []);
  const [areaId, setAreaId] = useState('');
  const [selected, setSelected] = useState<Hotspot | null>(null);
  const hotspots = useApi(
    () =>
      api.hotspots.list({
        area_id: areaId || undefined,
        include_geometry: true,
        sort: 'priority',
        limit: 200,
      }),
    [areaId]
  );
  const boundary = useApi(() => (areaId ? api.areas.boundary(areaId) : Promise.resolve(null)), [areaId]);
  const area = areas.data?.items.find((a) => a.id === areaId);

  return (
    <AppLayout>
      <div className="space-y-4 pb-12">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-mono">EXPLORE MAP</h1>
            <p className="text-xs text-slate-400 mt-1">
              OpenStreetMap basemap with real change-event polygons. Click a polygon for details.
            </p>
          </div>
          <select
            value={areaId}
            onChange={(e) => {
              setAreaId(e.target.value);
              setSelected(null);
            }}
            className="h-9 px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 min-w-[260px]"
          >
            <option value="">All areas</option>
            {areas.data?.items.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        {hotspots.loading && <LoadingBlock />}
        {hotspots.error && <ErrorBlock error={hotspots.error} onRetry={hotspots.reload} />}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          <div className="xl:col-span-3">
            <GeoMap
              center={area?.coordinates ?? areas.data?.items[0]?.coordinates}
              boundary={boundary.data}
              hotspots={hotspots.data?.items ?? []}
              selectedId={selected?.id}
              onSelect={setSelected}
              height="640px"
            />
          </div>
          <div className="gis-glass-card rounded-xl border border-slate-800 p-4 h-fit">
            {selected ? (
              <div className="space-y-1.5 text-xs">
                <SeverityBadge severity={selected.severity} />
                <h2 className="text-sm text-white mt-1">{selected.change_label}</h2>
                <p className="text-slate-400">{selected.area_name}</p>
                <p className="font-mono text-slate-300">{fmtHa(selected.affected_area_ha)}</p>
                <p className="font-mono text-slate-400">
                  priority {selected.priority_score !== null ? selected.priority_score.toFixed(0) : 'unscored'}
                </p>
                <Link href={`/hotspots?id=${selected.id}`} className="inline-block text-emerald-400 hover:underline">
                  Open full detail →
                </Link>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                {hotspots.data ? `${hotspots.data.total} events shown.` : ''} Select a polygon.
              </p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
