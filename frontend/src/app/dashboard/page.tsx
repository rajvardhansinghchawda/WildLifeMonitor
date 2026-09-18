'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Activity, Flame, Layers, MapPin, Trees, Waves } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MetricCard } from '@/components/common/MetricCard';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/common/ApiState';
import { TimelineChart } from '@/components/analytics/TimelineChart';
import { LandCoverBars } from '@/components/analytics/LandCoverBars';
import api from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { fmtDate, fmtHa, fmtNum, healthColor } from '@/lib/format';

const GeoMap = dynamic(() => import('@/components/map/GeoMap'), { ssr: false });

export default function DashboardPage() {
  const areas = useApi(() => api.areas.list(), []);
  const [areaId, setAreaId] = useState<string | null>(null);

  useEffect(() => {
    if (!areaId && areas.data?.items.length) {
      const withData = areas.data.items.find((a) => a.latest_analysis_id) ?? areas.data.items[0];
      setAreaId(withData.id);
    }
  }, [areas.data, areaId]);

  const area = areas.data?.items.find((a) => a.id === areaId) ?? null;
  const stats = useApi(() => (areaId ? api.areas.statistics(areaId) : Promise.resolve(null)), [areaId]);
  const timeline = useApi(() => (areaId ? api.areas.timeline(areaId) : Promise.resolve(null)), [areaId]);
  const boundary = useApi(() => (areaId ? api.areas.boundary(areaId) : Promise.resolve(null)), [areaId]);
  const hotspots = useApi(
    () =>
      areaId
        ? api.hotspots.list({ area_id: areaId, sort: 'priority', include_geometry: true, limit: 200 })
        : Promise.resolve(null),
    [areaId]
  );
  const alerts = useApi(() => api.alerts.list({ area_id: areaId ?? undefined }), [areaId]);

  const s = stats.data;
  const items = hotspots.data?.items ?? [];

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
              HABITAT CHANGE DASHBOARD
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 max-w-3xl leading-relaxed">
              Satellite-derived change candidates (Sentinel-2, Dynamic World, OpenStreetMap context)
              prioritised for field investigation. Results are candidates, not proof of cause.
            </p>
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
              <MapPin className="w-3 h-3 inline mr-1 text-emerald-400" />
              Protected area
            </label>
            <select
              value={areaId ?? ''}
              onChange={(e) => setAreaId(e.target.value)}
              className="h-9 px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 min-w-[260px]"
            >
              {areas.data?.items.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {areas.loading && <LoadingBlock />}
        {areas.error && <ErrorBlock error={areas.error} onRetry={areas.reload} />}
        {areas.data && areas.data.items.length === 0 && (
          <EmptyBlock
            title="No protected areas in the catalog"
            hint="Run the seed_areas script to import real boundaries."
          />
        )}

        {area && (
          <>
            {!area.latest_analysis_id && (
              <EmptyBlock
                title={`No completed analysis for ${area.name} yet`}
                hint="Run a change analysis from the Change Analysis page."
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard
                title="Habitat Health Index"
                value={area.health_index?.score != null ? fmtNum(area.health_index.score, 0) : '—'}
                icon={Activity}
                subtitle={
                  area.health_index?.band
                    ? `Band: ${area.health_index.band} (indicative)`
                    : 'Needs a completed analysis'
                }
              />
              <MetricCard
                title="Hotspots (latest analysis)"
                value={area.hotspot_count}
                icon={Flame}
                subtitle={`Vegetation loss candidates: ${fmtHa(s?.vegetation_loss_candidate_ha)}`}
              />
              <MetricCard
                title="Forest cover (Dynamic World)"
                value={s?.forest_cover_percent != null ? `${fmtNum(s.forest_cover_percent)}%` : '—'}
                icon={Trees}
                subtitle={s?.window ? `Window ${s.window}` : 'Statistics not computed'}
              />
              <MetricCard
                title="Surface water"
                value={fmtHa(s?.water_bodies_ha)}
                icon={Waves}
                subtitle={s?.last_cloud_free_pass ? `Last clear pass ${s.last_cloud_free_pass}` : ''}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 gis-glass-card rounded-xl border border-slate-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
                    {area.name} — change hotspots
                  </h2>
                  <Link href={`/areas/${area.slug}`} className="text-[11px] text-emerald-400 hover:underline">
                    Area detail →
                  </Link>
                </div>
                <GeoMap
                  center={area.coordinates}
                  boundary={boundary.data}
                  hotspots={items}
                  height="440px"
                />
                <p className="text-[10px] text-slate-500 mt-2">
                  Boundary © OpenStreetMap contributors (ODbL). Hotspots contain modified Copernicus
                  Sentinel data.
                </p>
              </div>

              <div className="gis-glass-card rounded-xl border border-slate-800 p-4">
                <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider mb-3">
                  Land cover
                </h2>
                {stats.loading ? (
                  <LoadingBlock label="Loading…" />
                ) : (
                  <LandCoverBars distribution={s?.land_cover_distribution ?? {}} />
                )}
                {s?.source && <p className="text-[10px] text-slate-500 mt-3">{s.source}</p>}
                {s?.unavailable.map((u) => (
                  <p key={u} className="text-[10px] text-amber-400/80 mt-1">
                    {u}
                  </p>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="gis-glass-card rounded-xl border border-slate-800 p-4">
                <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider mb-2">
                  NDVI — monthly median
                </h2>
                {timeline.loading ? (
                  <LoadingBlock label="Loading…" />
                ) : timeline.data && timeline.data.points.length ? (
                  <TimelineChart points={timeline.data.points} mode="ndvi" height={260} />
                ) : (
                  <p className="text-xs text-slate-500">Timeline has not been computed for this area.</p>
                )}
              </div>

              <div className="gis-glass-card rounded-xl border border-slate-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
                    Top investigation priorities
                  </h2>
                  <Link href={`/hotspots?area=${area.slug}`} className="text-[11px] text-emerald-400 hover:underline">
                    All hotspots →
                  </Link>
                </div>
                {hotspots.loading && <LoadingBlock label="Loading…" />}
                {!hotspots.loading && items.length === 0 && (
                  <p className="text-xs text-slate-500">No change events for the latest analysis.</p>
                )}
                <div className="divide-y divide-slate-800/60">
                  {items.slice(0, 6).map((h) => (
                    <Link
                      key={h.id}
                      href={`/hotspots?id=${h.id}`}
                      className="flex items-center justify-between py-2 hover:bg-slate-800/30 px-1 rounded"
                    >
                      <div>
                        <p className="text-xs text-slate-200">{h.change_label}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {fmtHa(h.affected_area_ha)} · {fmtDate(h.detected_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-400">
                          {h.priority_score !== null ? `P${h.priority_score.toFixed(0)}` : 'unscored'}
                        </span>
                        <SeverityBadge severity={h.severity} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="gis-glass-card rounded-xl border border-slate-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
                  <Layers className="w-4 h-4 inline mr-1 text-emerald-400" />
                  Health Index components
                </h2>
                <span className={`text-xs font-mono ${healthColor(area.health_index?.band)}`}>
                  {area.health_index?.method_version ?? ''}
                </span>
              </div>
              {area.health_index ? (
                <div className="text-[11px] text-slate-400 space-y-1">
                  <pre className="whitespace-pre-wrap font-mono text-slate-300">
                    {JSON.stringify(area.health_index.components ?? {}, null, 2)}
                  </pre>
                  {area.health_index.missing_inputs && area.health_index.missing_inputs.length > 0 && (
                    <p className="text-amber-400/80">
                      Not included (data unavailable): {area.health_index.missing_inputs.join(', ')}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Requires at least one completed analysis.</p>
              )}
              {alerts.data && (
                <p className="text-[11px] text-slate-500 mt-3">
                  {alerts.data.total} alert(s) for this area.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
