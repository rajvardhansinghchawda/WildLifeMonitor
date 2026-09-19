'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AppLayout } from '@/components/layout/AppLayout';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/common/ApiState';
import api, { ApiError, HotspotDetail } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { fmtDate, fmtHa, fmtNum } from '@/lib/format';
import { formatCoordinatesWithPlace } from '@/lib/geo-names';
import { HotspotAiSummaryCard } from '@/components/hotspots/HotspotAiSummaryCard';

const GeoMap = dynamic(() => import('@/components/map/GeoMap'), { ssr: false });

const STATUSES = [
  'pendingfieldverification',
  'investigating',
  'verifiedchange',
  'dismissed',
  'inconclusive',
];

function HotspotsInner() {
  const params = useSearchParams();
  const areas = useApi(() => api.areas.list(), []);
  const [areaSlug, setAreaSlug] = useState<string>(params.get('area') ?? '');
  const [severity, setSeverity] = useState('');
  const [changeType, setChangeType] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<'priority' | 'area' | 'date'>('priority');
  const [selectedId, setSelectedId] = useState<string | null>(params.get('id'));

  const area = areas.data?.items.find((a) => a.slug === areaSlug);
  const list = useApi(
    () =>
      api.hotspots.list({
        area_id: area?.id,
        severity: severity || undefined,
        change_type: changeType || undefined,
        status: status || undefined,
        sort,
        include_geometry: true,
        limit: 200,
      }),
    [area?.id, severity, changeType, status, sort, areas.loading]
  );
  const boundary = useApi(() => (area ? api.areas.boundary(area.id) : Promise.resolve(null)), [area?.id]);
  const items = list.data?.items ?? [];
  const types = useMemo(() => Array.from(new Set(items.map((i) => i.change_type))), [items]);

  const detail = useApi(
    () => (selectedId ? api.hotspots.get(selectedId) : Promise.resolve(null)),
    [selectedId]
  );

  useEffect(() => {
    if (!selectedId && items.length) setSelectedId(items[0].id);
  }, [items, selectedId]);

  return (
    <AppLayout>
      <div className="space-y-5 pb-12">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-mono">HOTSPOTS</h1>
          <p className="text-xs text-slate-400 mt-1">
            Satellite-derived change candidates from the newest completed analysis per area. Field
            verification is required before any conclusion.
          </p>
        </div>

        <div className="gis-glass-card rounded-xl border border-slate-800 p-3 flex flex-wrap gap-3 items-end">
          <Filter label="Area" value={areaSlug} onChange={setAreaSlug}>
            <option value="">All areas</option>
            {areas.data?.items.map((a) => (
              <option key={a.id} value={a.slug}>
                {a.name}
              </option>
            ))}
          </Filter>
          <Filter label="Severity (from magnitude)" value={severity} onChange={setSeverity}>
            <option value="">Any</option>
            {['critical', 'high', 'medium', 'low'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Filter>
          <Filter label="Change type" value={changeType} onChange={setChangeType}>
            <option value="">Any</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Filter>
          <Filter label="Verification" value={status} onChange={setStatus}>
            <option value="">Any</option>
            {STATUSES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Filter>
          <Filter label="Sort" value={sort} onChange={(v) => setSort(v as typeof sort)}>
            <option value="priority">Investigation priority</option>
            <option value="area">Affected area</option>
            <option value="date">Detection date</option>
          </Filter>
          <span className="ml-auto text-[11px] text-slate-500 font-mono">
            {list.data ? `${list.data.total} events` : ''}
          </span>
        </div>

        {list.loading && <LoadingBlock />}
        {list.error && <ErrorBlock error={list.error} onRetry={list.reload} />}
        {list.data && items.length === 0 && (
          <EmptyBlock
            title="No hotspots match"
            hint="Either no analysis has completed for this area, or the filters exclude everything."
          />
        )}

        {items.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7 space-y-4">
              <GeoMap
                center={area?.coordinates}
                boundary={boundary.data}
                hotspots={items}
                selectedId={selectedId}
                onSelect={(h) => setSelectedId(h.id)}
                height="420px"
              />
              <div className="gis-glass-card rounded-xl border border-slate-800 overflow-hidden">
                <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400 uppercase text-[10px] tracking-wider">
                    Change Candidates Ledger
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {items.length} detected incidents
                  </span>
                </div>
                <div className="max-h-[460px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-900/80 text-slate-400 font-mono uppercase text-[10px] sticky top-0 z-10">
                      <tr>
                        <th className="text-left p-2">Change</th>
                        <th className="text-left p-2">Area</th>
                        <th className="text-right p-2">Size</th>
                        <th className="text-right p-2">Priority</th>
                        <th className="text-left p-2">Severity</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {items.map((h) => (
                        <tr
                          key={h.id}
                          onClick={() => setSelectedId(h.id)}
                          className={`cursor-pointer hover:bg-slate-800/40 transition-colors ${
                            selectedId === h.id ? 'bg-emerald-950/40 border-l-2 border-emerald-500' : ''
                          }`}
                        >
                          <td className="p-2 text-slate-200">
                            <div className="font-medium">{h.change_label}</div>
                            <div className="text-[10px] text-cyan-400 font-mono mt-0.5">
                              📍 {formatCoordinatesWithPlace(h.coordinates.lat, h.coordinates.lon, h.area_name)}
                            </div>
                          </td>
                          <td className="p-2 text-slate-400">{h.area_name ?? 'Custom AOI'}</td>
                          <td className="p-2 text-right font-mono">{fmtHa(h.affected_area_ha)}</td>
                          <td className="p-2 text-right font-mono">
                            {h.priority_score !== null ? h.priority_score.toFixed(0) : '—'}
                          </td>
                          <td className="p-2">
                            <SeverityBadge severity={h.severity} />
                          </td>
                          <td className="p-2 text-slate-400">{h.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 lg:sticky lg:top-4 space-y-4">
              {detail.loading && <LoadingBlock label="Loading hotspot telemetry…" />}
              {detail.error && <ErrorBlock error={detail.error} />}
              {detail.data && <DetailPanel h={detail.data} onChanged={detail.reload} />}
              {!detail.loading && !detail.data && (
                <div className="gis-glass-card rounded-xl border border-slate-800 p-8 text-center text-slate-400 text-xs">
                  <span className="text-3xl mb-2 block">🌿</span>
                  <p className="font-semibold text-slate-200 text-sm">Select a Change Hotspot</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Click any incident row in the ledger table or any marker on the map to review natural language AI intelligence and field telemetry.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Filter({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 px-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
      >
        {children}
      </select>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-xs border-b border-slate-800/50">
      <span className="text-slate-500">{k}</span>
      <span className="text-slate-200 font-mono text-right">{v}</span>
    </div>
  );
}

function DetailPanel({ h, onChanged }: { h: HotspotDetail; onChanged: () => void }) {
  const [status, setStatus] = useState(h.status);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  useEffect(() => {
    setStatus(h.status);
    setNotes('');
    setErr(null);
  }, [h.id, h.status]);

  const needsNotes = status === 'dismissed' || status === 'inconclusive';

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.hotspots.verify(h.id, {
        status,
        notes: notes || undefined,
        expected_record_version: h.record_version,
      });
      onChanged();
    } catch (e) {
      setErr(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gis-glass-card rounded-xl border border-slate-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">{h.change_label}</h2>
        <SeverityBadge severity={h.severity} />
      </div>
      <p className="text-[11px] text-slate-500">
        {h.area_name ?? 'Custom AOI'} · detected {fmtDate(h.detected_at)}
      </p>

      {/* Natural Language Field Intelligence Brief */}
      <HotspotAiSummaryCard hotspot={h} />

      <div>
        <Row k="Affected area" v={fmtHa(h.affected_area_ha)} />
        <Row k="Location" v={formatCoordinatesWithPlace(h.coordinates.lat, h.coordinates.lon, h.area_name)} />
        <Row
          k={h.value_name ?? 'Indicator'}
          v={`${fmtNum(h.baseline_value, 3)} → ${fmtNum(h.comparison_value, 3)}`}
        />
        <Row k="Mean NDVI change" v={fmtNum(h.mean_ndvi_change, 3)} />
        <Row
          k="Valid pixels"
          v={h.valid_pixel_fraction !== null ? `${(h.valid_pixel_fraction * 100).toFixed(0)}%` : '—'}
        />
        <Row k="Quality" v={h.quality_label ?? '—'} />
        <Row k="Sensor" v={h.sensor ?? '—'} />
        <Row k="Baseline" v={h.baseline_window ?? '—'} />
        <Row k="Comparison" v={h.comparison_window ?? '—'} />
        <Row
          k="Nearest known road"
          v={h.nearest_known_road_distance_m !== null ? `${(h.nearest_known_road_distance_m / 1000).toFixed(2)} km` : 'unavailable'}
        />
        <Row
          k="Nearest known settlement"
          v={
            h.nearest_known_settlement_distance_m !== null
              ? `${(h.nearest_known_settlement_distance_m / 1000).toFixed(2)} km`
              : 'unavailable'
          }
        />
        <Row k="Method" v={h.method_version} />
      </div>

      <div className="rounded-lg bg-slate-900/70 border border-slate-800 p-3">
        <p className="text-[10px] font-mono uppercase text-slate-400 mb-1">
          Investigation priority {h.priority_method_version ? `(${h.priority_method_version})` : ''}
        </p>
        <p className="text-2xl font-mono text-emerald-300">
          {h.priority_score !== null ? h.priority_score.toFixed(0) : 'unscored'}
          <span className="text-xs text-slate-500"> / 100</span>
        </p>
        {h.priority_components ? (
          <div className="mt-2 space-y-0.5">
            {Object.entries(h.priority_components).map(([k, v]) => (
              <Row key={k} k={k} v={v === null ? 'missing' : Number(v).toFixed(2)} />
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-amber-400/80 mt-1">
            A required component is unavailable, so no score is shown (never defaulted to zero).
          </p>
        )}
      </div>

      {h.layer_warnings.length > 0 && (
        <ul className="text-[11px] text-amber-400/90 list-disc pl-4">
          {h.layer_warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <div className="border-t border-slate-800 pt-3">
        <p className="text-[10px] font-mono uppercase text-slate-400 mb-1.5">Field verification</p>
        {h.read_only ? (
          <p className="text-[11px] text-slate-500">
            Curated analysis — read-only. Run your own analysis to record verification decisions.
          </p>
        ) : (
          <div className="space-y-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-8 px-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={needsNotes ? 'Notes are required for this status' : 'Investigator notes'}
              className="w-full rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 p-2 h-16"
            />
            {err && (
              <p className="text-[11px] text-red-400">
                {err.code === 'VERSION_CONFLICT'
                  ? 'Someone else updated this event. Reload and retry.'
                  : err.message}
              </p>
            )}
            <button
              onClick={save}
              disabled={busy || status === h.status || (needsNotes && !notes.trim())}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-40"
            >
              {busy ? 'Saving…' : 'Record decision'}
            </button>
          </div>
        )}
        {h.verifications.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {h.verifications.map((v) => (
              <li key={v.id} className="text-[11px] text-slate-400">
                <span className="font-mono text-slate-300">{fmtDate(v.created_at)}</span> {v.from_status} →{' '}
                {v.to_status}
                {v.notes ? ` — ${v.notes}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function HotspotsPage() {
  return (
    <Suspense fallback={null}>
      <HotspotsInner />
    </Suspense>
  );
}
