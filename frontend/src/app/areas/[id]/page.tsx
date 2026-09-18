'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { ErrorBlock, LoadingBlock } from '@/components/common/ApiState';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { TimelineChart } from '@/components/analytics/TimelineChart';
import { LandCoverBars } from '@/components/analytics/LandCoverBars';
import api from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { fmtDate, fmtHa, fmtNum, healthColor } from '@/lib/format';

const GeoMap = dynamic(() => import('@/components/map/GeoMap'), { ssr: false });

export default function AreaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const area = useApi(() => api.areas.get(id), [id]);
  const stats = useApi(() => api.areas.statistics(id), [id]);
  const timeline = useApi(() => api.areas.timeline(id), [id]);
  const boundary = useApi(() => api.areas.boundary(id), [id]);
  const hotspots = useApi(
    () => api.hotspots.list({ area_id: area.data?.id ?? id, sort: 'priority', include_geometry: true }),
    [id, area.data?.id]
  );
  const analyses = useApi(() => api.analyses.list({ area_id: area.data?.id }), [area.data?.id]);

  const a = area.data;
  const s = stats.data;

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        <Link href="/areas" className="text-[11px] text-emerald-400 hover:underline">
          ← All areas
        </Link>
        {area.loading && <LoadingBlock />}
        {area.error && <ErrorBlock error={area.error} onRetry={area.reload} />}

        {a && (
          <>
            <div className="border-b border-slate-800/80 pb-4">
              <h1 className="text-2xl font-bold text-white">{a.name}</h1>
              <p className="text-xs text-slate-400 mt-1">
                {[a.designation, a.iucn_category ? `IUCN ${a.iucn_category}` : null, a.state, a.country]
                  .filter(Boolean)
                  .join(' · ')}{' '}
                · {a.area_km2.toLocaleString(undefined, { maximumFractionDigits: 0 })} km²
              </p>
              {a.analysis_aoi_note && (
                <p className="text-[11px] text-amber-400/80 mt-1">Analysis extent: {a.analysis_aoi_note}</p>
              )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 gis-glass-card rounded-xl border border-slate-800 p-4">
                <GeoMap
                  center={a.coordinates}
                  boundary={boundary.data}
                  hotspots={hotspots.data?.items ?? []}
                  height="460px"
                />
                <p className="text-[10px] text-slate-500 mt-2">{a.attribution}</p>
              </div>

              <div className="space-y-4">
                <div className="gis-glass-card rounded-xl border border-slate-800 p-4">
                  <p className="text-[10px] font-mono uppercase text-slate-400">
                    Habitat Health Index (indicative)
                  </p>
                  <p className={`text-4xl font-mono mt-1 ${healthColor(a.health_index?.band)}`}>
                    {a.health_index?.score != null ? fmtNum(a.health_index.score, 0) : '—'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {a.health_index?.band ? `Band: ${a.health_index.band}` : 'Needs a completed analysis'}
                  </p>
                  {a.health_index?.missing_inputs && a.health_index.missing_inputs.length > 0 && (
                    <p className="text-[10px] text-amber-400/80 mt-2">
                      Not included: {a.health_index.missing_inputs.join('; ')}
                    </p>
                  )}
                  {typeof a.health_index?.label === 'string' && (
                    <p className="text-[10px] text-slate-500 mt-2">{a.health_index.label as string}</p>
                  )}
                </div>

                <div className="gis-glass-card rounded-xl border border-slate-800 p-4">
                  <p className="text-[10px] font-mono uppercase text-slate-400 mb-2">Land cover</p>
                  {stats.loading ? (
                    <LoadingBlock label="Loading…" />
                  ) : (
                    <LandCoverBars distribution={s?.land_cover_distribution ?? {}} />
                  )}
                  {s && (
                    <div className="mt-3 text-[10px] text-slate-500 space-y-0.5">
                      <p>Water: {fmtHa(s.water_bodies_ha)} · Built-up: {fmtHa(s.urban_builtup_ha)}</p>
                      <p>{s.source}</p>
                      <p>Window {s.window} · scale {s.scale_m} m · computed {fmtDate(s.computed_at)}</p>
                      <p>Last clear Sentinel-2 pass: {s.last_cloud_free_pass ?? '—'}</p>
                      {s.active_fires_count !== null && s.active_fires_count !== undefined && (
                        <p className="text-emerald-400 font-mono font-medium">
                          🔥 NASA FIRMS Active Fires: {s.active_fires_count} (VIIRS 375m live feed)
                        </p>
                      )}
                      {s.unavailable.map((u) => (
                        <p key={u} className="text-amber-400/80">
                          {u}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="gis-glass-card rounded-xl border border-slate-800 p-4">
                <h2 className="text-sm font-semibold text-white font-mono uppercase mb-2">
                  NDVI — monthly median vs previous year
                </h2>
                {timeline.data && timeline.data.points.length ? (
                  <>
                    <TimelineChart points={timeline.data.points} mode="ndvi" height={260} />
                    {timeline.data.notes.map((n) => (
                      <p key={n} className="text-[10px] text-slate-500 mt-1">
                        {n}
                      </p>
                    ))}
                  </>
                ) : (
                  <p className="text-xs text-slate-500">Not computed yet.</p>
                )}
              </div>
              <div className="gis-glass-card rounded-xl border border-slate-800 p-4">
                <h2 className="text-sm font-semibold text-white font-mono uppercase mb-2">
                  Surface water — monthly
                </h2>
                {timeline.data && timeline.data.points.length ? (
                  <TimelineChart points={timeline.data.points} mode="water" height={260} />
                ) : (
                  <p className="text-xs text-slate-500">Not computed yet.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="gis-glass-card rounded-xl border border-slate-800 p-4">
                <h2 className="text-sm font-semibold text-white font-mono uppercase mb-2">
                  Top hotspots ({hotspots.data?.total ?? 0})
                </h2>
                <div className="divide-y divide-slate-800/60">
                  {hotspots.data?.items.slice(0, 8).map((h) => (
                    <Link
                      key={h.id}
                      href={`/hotspots?id=${h.id}&area=${a.slug}`}
                      className="flex items-center justify-between py-2 hover:bg-slate-800/30 px-1 rounded"
                    >
                      <span className="text-xs text-slate-200">
                        {h.change_label} · {fmtHa(h.affected_area_ha)}
                      </span>
                      <SeverityBadge severity={h.severity} />
                    </Link>
                  ))}
                  {hotspots.data && hotspots.data.items.length === 0 && (
                    <p className="text-xs text-slate-500 py-2">No hotspots for the latest analysis.</p>
                  )}
                </div>
              </div>
              <div className="gis-glass-card rounded-xl border border-slate-800 p-4">
                <h2 className="text-sm font-semibold text-white font-mono uppercase mb-2">
                  Analysis history
                </h2>
                <div className="divide-y divide-slate-800/60">
                  {analyses.data?.items.map((r) => (
                    <div key={r.analysis_id} className="py-2 text-xs">
                      <p className="text-slate-200">
                        {r.baseline.start} → {r.baseline.end} vs {r.comparison.start} → {r.comparison.end}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {r.status} · {r.event_count} events · layers: {r.layers.map((l) => l.type).join(', ')}
                        {r.is_curated_demo ? ' · curated' : ''}
                      </p>
                    </div>
                  ))}
                  {analyses.data && analyses.data.items.length === 0 && (
                    <p className="text-xs text-slate-500 py-2">No analyses yet.</p>
                  )}
                </div>
                <Link
                  href={`/change-analysis?area=${a.slug}`}
                  className="inline-block mt-3 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Run new analysis
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
