'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/common/ApiState';
import { TimelineChart } from '@/components/analytics/TimelineChart';
import api from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { fmtDate } from '@/lib/format';

export default function TimelinePage() {
  const areas = useApi(() => api.areas.list(), []);
  const [areaId, setAreaId] = useState('');
  useEffect(() => {
    if (!areaId && areas.data?.items.length) setAreaId(areas.data.items[0].id);
  }, [areas.data, areaId]);
  const timeline = useApi(
    () => (areaId ? api.areas.timeline(areaId) : Promise.resolve(null)),
    [areaId]
  );
  const t = timeline.data;

  return (
    <AppLayout>
      <div className="space-y-5 pb-12">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-mono">TIMELINE & TRENDS</h1>
            <p className="text-xs text-slate-400 mt-1">
              Monthly cloud-masked Sentinel-2 NDVI and Dynamic World surface water, computed from Earth Engine.
            </p>
          </div>
          <select
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="h-9 px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 min-w-[260px]"
          >
            {areas.data?.items.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {timeline.loading && <LoadingBlock />}
        {timeline.error && <ErrorBlock error={timeline.error} onRetry={timeline.reload} />}
        {t && t.points.length === 0 && (
          <EmptyBlock title="Timeline not computed for this area" hint={t.notes.join(' ')} />
        )}
        {t && t.points.length > 0 && (
          <>
            <div className="gis-glass-card rounded-xl border border-slate-800 p-4">
              <h2 className="text-sm font-semibold text-white font-mono uppercase mb-2">
                NDVI — monthly median vs same month previous year
              </h2>
              <TimelineChart points={t.points} mode="ndvi" height={320} />
            </div>
            <div className="gis-glass-card rounded-xl border border-slate-800 p-4">
              <h2 className="text-sm font-semibold text-white font-mono uppercase mb-2">
                Surface water (ha)
              </h2>
              <TimelineChart points={t.points} mode="water" height={280} />
            </div>
            <div className="text-[11px] text-slate-500 space-y-1">
              <p>
                {t.source} · scale {t.scale_m} m · computed {fmtDate(t.computed_at)}
              </p>
              {t.notes.map((n) => (
                <p key={n}>{n}</p>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
