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
import { formatCoordinatesWithPlace } from '@/lib/geo-names';

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
      <div className="space-y-6 pb-12 font-sans">
        <Link href="/areas" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1">
          ← Back to all protected areas
        </Link>
        {area.loading && <LoadingBlock />}
        {area.error && <ErrorBlock error={area.error} onRetry={area.reload} />}

        {a && (
          <>
            <div className="border-b border-[#e5ebe4] pb-4">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-outfit">{a.name}</h1>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {[a.designation, a.iucn_category ? `IUCN ${a.iucn_category}` : null, a.state, a.country]
                  .filter(Boolean)
                  .join(' · ')}{' '}
                · {a.area_km2.toLocaleString(undefined, { maximumFractionDigits: 0 })} km²
              </p>
              {a.coordinates && (
                <p className="text-xs text-emerald-800 font-mono mt-2 flex items-center gap-1.5 bg-[#e6f4ea] w-fit px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  <span>📍 {formatCoordinatesWithPlace(a.coordinates.lat, a.coordinates.lon, a.name)}</span>
                </p>
              )}
              {a.analysis_aoi_note && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg mt-2 w-fit">
                  Analysis extent: {a.analysis_aoi_note}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 bg-white rounded-2xl border border-[#e5ebe4] p-4 shadow-xs">
                <GeoMap
                  center={a.coordinates}
                  boundary={boundary.data}
                  hotspots={hotspots.data?.items ?? []}
                  height="460px"
                />
                <p className="text-[11px] text-slate-500 mt-2 font-medium">{a.attribution}</p>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-[#e5ebe4] p-5 shadow-xs">
                  <p className="text-[10.5px] font-bold uppercase text-slate-500 tracking-wider">
                    Habitat Health Index (indicative)
                  </p>
                  <p className={`text-4xl font-black font-mono mt-1.5 ${healthColor(a.health_index?.band)}`}>
                    {a.health_index?.score != null ? fmtNum(a.health_index.score, 0) : '—'}
                  </p>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    {a.health_index?.band ? `Band: ${a.health_index.band}` : 'Needs a completed analysis'}
                  </p>
                  {a.health_index?.missing_inputs && a.health_index.missing_inputs.length > 0 && (
                    <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                      Not included: {a.health_index.missing_inputs.join('; ')}
                    </p>
                  )}
                  {typeof a.health_index?.label === 'string' && (
                    <p className="text-xs text-slate-500 mt-2 font-medium">{a.health_index.label as string}</p>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-[#e5ebe4] p-5 shadow-xs">
                  <p className="text-[10.5px] font-bold uppercase text-slate-500 tracking-wider mb-3">Land cover</p>
                  {stats.loading ? (
                    <LoadingBlock label="Loading…" />
                  ) : (
                    <LandCoverBars distribution={s?.land_cover_distribution ?? {}} />
                  )}
                  {s && (
                    <div className="mt-3 text-xs text-slate-500 space-y-1 border-t border-[#f0f3ee] pt-2">
                      <p>Water: {fmtHa(s.water_bodies_ha)} · Built-up: {fmtHa(s.urban_builtup_ha)}</p>
                      <p className="text-[11px] font-mono">{s.source}</p>
                      <p className="text-[11px] font-mono">Window {s.window} · scale {s.scale_m} m · computed {fmtDate(s.computed_at)}</p>
                      <p>Last clear Sentinel-2 pass: {s.last_cloud_free_pass ?? '—'}</p>
                      {s.active_fires_count !== null && s.active_fires_count !== undefined && (
                        <p className="text-[#dc2626] font-semibold flex items-center gap-1 mt-1">
                          🔥 NASA FIRMS Active Fires: {s.active_fires_count} (VIIRS 375m live feed)
                        </p>
                      )}
                      {s.unavailable.map((u) => (
                        <p key={u} className="text-amber-800">
                          {u}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-[#e5ebe4] p-5 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">
                  NDVI — monthly median vs previous year
                </h2>
                {timeline.data && timeline.data.points.length ? (
                  <>
                    <TimelineChart points={timeline.data.points} mode="ndvi" height={260} />
                    {timeline.data.notes.map((n) => (
                      <p key={n} className="text-xs text-slate-500 mt-2 font-medium">
                        {n}
                      </p>
                    ))}
                  </>
                ) : (
                  <p className="text-xs text-slate-500 font-medium">Not computed yet.</p>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-[#e5ebe4] p-5 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">
                  Surface water — monthly
                </h2>
                {timeline.data && timeline.data.points.length ? (
                  <TimelineChart points={timeline.data.points} mode="water" height={260} />
                ) : (
                  <p className="text-xs text-slate-500 font-medium">Not computed yet.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-[#e5ebe4] p-5 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">
                  Top hotspots ({hotspots.data?.total ?? 0})
                </h2>
                <div className="divide-y divide-[#f0f3ee]">
                  {hotspots.data?.items.slice(0, 8).map((h) => (
                    <Link
                      key={h.id}
                      href={`/hotspots?id=${h.id}&area=${a.slug}`}
                      className="flex items-center justify-between py-2.5 hover:bg-[#f3f7f2] px-2 rounded-xl transition-colors"
                    >
                      <span className="text-xs font-semibold text-slate-800">
                        {h.change_label} · {fmtHa(h.affected_area_ha)}
                      </span>
                      <SeverityBadge severity={h.severity} />
                    </Link>
                  ))}
                  {hotspots.data && hotspots.data.items.length === 0 && (
                    <p className="text-xs text-slate-500 py-3 font-medium">No hotspots for the latest analysis.</p>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-[#e5ebe4] p-5 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">
                  Analysis history
                </h2>
                <div className="divide-y divide-[#f0f3ee]">
                  {analyses.data?.items.map((r) => (
                    <div key={r.analysis_id} className="py-2.5 text-xs">
                      <p className="text-slate-800 font-semibold">
                        {r.baseline.start} → {r.baseline.end} vs {r.comparison.start} → {r.comparison.end}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {r.status} · {r.event_count} events · layers: {r.layers.map((l) => l.type).join(', ')}
                        {r.is_curated_demo ? ' · curated' : ''}
                      </p>
                    </div>
                  ))}
                  {analyses.data && analyses.data.items.length === 0 && (
                    <p className="text-xs text-slate-500 py-3 font-medium">No analyses yet.</p>
                  )}
                </div>
                <Link
                  href={`/change-analysis?area=${a.slug}`}
                  className="inline-block mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-all"
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
