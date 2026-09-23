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

  // Sync selectedId with URL parameter whenever search params change
  const paramId = params.get('id');
  useEffect(() => {
    if (paramId) setSelectedId(paramId);
  }, [paramId]);

  // Listen to global selection events from the chat widget
  useEffect(() => {
    const handleSelect = (e: any) => {
      const id = e.detail?.id;
      if (id) {
        setSelectedId(id);
      }
    };
    window.addEventListener('vanyora:select-hotspot', handleSelect);
    return () => window.removeEventListener('vanyora:select-hotspot', handleSelect);
  }, []);

  // Resolve short prefix (e.g. b4adf8ac) to full hotspot object when items are loaded
  useEffect(() => {
    if (selectedId && items.length) {
      const clean = selectedId.replace(/^#/, '').toLowerCase();
      const match = items.find((i) => i.id.toLowerCase().startsWith(clean));
      if (match && match.id !== selectedId) {
        setSelectedId(match.id);
      }
    }
  }, [selectedId, items]);

  // If selected hotspot is from an area not covered by current filter, clear filter
  useEffect(() => {
    if (detail.data?.area_name && areaSlug) {
      const currentArea = areas.data?.items.find((a) => a.slug === areaSlug);
      if (currentArea && currentArea.name !== detail.data.area_name) {
        setAreaSlug('');
      }
    }
  }, [detail.data, areas.data, areaSlug]);

  // Scroll matching table row into view
  useEffect(() => {
    if (selectedId) {
      const clean = selectedId.replace(/^#/, '').toLowerCase();
      const match = items.find((i) => i.id.toLowerCase().startsWith(clean));
      const targetId = match?.id ?? selectedId;
      const el = document.getElementById(`hotspot-row-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedId, items]);

  useEffect(() => {
    if (!selectedId && items.length) setSelectedId(items[0].id);
  }, [items, selectedId]);

  return (
    <AppLayout>
      <div className="space-y-5 pb-12 font-sans">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit">HOTSPOTS</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Satellite-derived change candidates from the newest completed analysis per area. Field
            verification is required before any conclusion.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5ebe4] p-3.5 flex flex-wrap gap-3 items-end shadow-xs">
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
          <span className="ml-auto text-xs font-semibold text-slate-500 font-mono">
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
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
            <div className="xl:col-span-3 space-y-4">
              <div className="rounded-2xl border border-[#e5ebe4] overflow-hidden bg-white shadow-xs">
                <GeoMap
                  center={area?.coordinates}
                  boundary={boundary.data}
                  hotspots={items}
                  selectedId={selectedId}
                  onSelect={(h) => setSelectedId(h.id)}
                  height="420px"
                />
              </div>
              <div className="bg-white rounded-2xl border border-[#e5ebe4] overflow-hidden shadow-xs">
                <table className="w-full text-xs">
                  <thead className="bg-[#f8faf7] text-slate-600 font-bold uppercase text-[10.5px] border-b border-[#e5ebe4]">
                    <tr>
                      <th className="text-left p-3">Change</th>
                      <th className="text-left p-3">Area</th>
                      <th className="text-right p-3">Size</th>
                      <th className="text-right p-3">Priority</th>
                      <th className="text-left p-3">Severity</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f3ee]">
                    {items.map((h) => {
                      const isRowSelected =
                        selectedId === h.id ||
                        selectedId?.toLowerCase()?.startsWith(h.id.slice(0, 8).toLowerCase());
                      return (
                        <tr
                          key={h.id}
                          id={`hotspot-row-${h.id}`}
                          onClick={() => setSelectedId(h.id)}
                          className={`cursor-pointer transition-colors hover:bg-[#f3f7f2] ${
                            isRowSelected ? 'bg-[#e6f4ea]/70 font-semibold' : ''
                          }`}
                        >
                          <td className="p-3 text-slate-900">
                            <div className="font-bold">{h.change_label}</div>
                            <div className="text-[11px] text-emerald-700 font-mono mt-0.5">
                              📍 {formatCoordinatesWithPlace(h.coordinates.lat, h.coordinates.lon, h.area_name)}
                            </div>
                          </td>
                          <td className="p-3 text-slate-600 font-medium">{h.area_name ?? 'Custom AOI'}</td>
                          <td className="p-3 text-right font-mono font-semibold text-slate-800">{fmtHa(h.affected_area_ha)}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {h.priority_score !== null ? h.priority_score.toFixed(0) : '—'}
                          </td>
                          <td className="p-3">
                            <SeverityBadge severity={h.severity} />
                          </td>
                          <td className="p-3 text-slate-500 capitalize">{h.status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="xl:col-span-2 xl:sticky xl:top-4 space-y-4">
              {detail.loading && <LoadingBlock label="Loading hotspot telemetry…" />}
              {detail.error && <ErrorBlock error={detail.error} />}
              {detail.data && <DetailPanel h={detail.data} onChanged={detail.reload} />}
              {!detail.loading && !detail.data && (
                <div className="rounded-2xl border border-[#e5ebe4] bg-white p-8 text-center text-slate-400 text-xs shadow-xs">
                  <span className="text-3xl mb-2 block">🌿</span>
                  <p className="font-bold text-slate-800 text-sm">Select a Change Hotspot</p>
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
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 px-2.5 rounded-xl bg-white border border-[#dde4dc] hover:border-emerald-600 text-xs font-semibold text-slate-800 shadow-xs focus:outline-none focus:border-emerald-600 transition-all"
      >
        {children}
      </select>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-xs border-b border-[#f0f3ee]">
      <span className="text-slate-500 font-medium">{k}</span>
      <span className="text-slate-900 font-semibold font-mono text-right">{v}</span>
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
    <div className="bg-white rounded-2xl border border-[#e5ebe4] p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">{h.change_label}</h2>
        <SeverityBadge severity={h.severity} />
      </div>
      <p className="text-xs text-slate-500 font-medium">
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

      <div className="rounded-xl bg-[#f8faf7] border border-[#e5ebe4] p-3.5">
        <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">
          Investigation priority {h.priority_method_version ? `(${h.priority_method_version})` : ''}
        </p>
        <p className="text-2xl font-black font-mono text-[#137333]">
          {h.priority_score !== null ? h.priority_score.toFixed(0) : 'unscored'}
          <span className="text-xs text-slate-400 font-medium"> / 100</span>
        </p>
        {h.priority_components ? (
          <div className="mt-2 space-y-0.5">
            {Object.entries(h.priority_components).map(([k, v]) => (
              <Row key={k} k={k} v={v === null ? 'missing' : Number(v).toFixed(2)} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-amber-700 mt-1 font-medium">
            A required component is unavailable, so no score is shown (never defaulted to zero).
          </p>
        )}
      </div>

      {h.layer_warnings.length > 0 && (
        <ul className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 list-disc pl-5">
          {h.layer_warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <div className="border-t border-[#f0f3ee] pt-3">
        <p className="text-[10.5px] font-bold uppercase text-slate-500 mb-2">Field verification</p>
        {h.read_only ? (
          <p className="text-xs text-slate-500 font-medium">
            Curated analysis — read-only. Run your own analysis to record verification decisions.
          </p>
        ) : (
          <div className="space-y-2.5">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-9 px-3 rounded-xl bg-white border border-[#dde4dc] text-xs font-semibold text-slate-800 shadow-xs focus:border-emerald-600 focus:outline-none"
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
              className="w-full rounded-xl bg-white border border-[#dde4dc] text-xs text-slate-800 p-2.5 h-16 shadow-xs focus:border-emerald-600 focus:outline-none"
            />
            {err && (
              <p className="text-xs text-red-600 font-medium">
                {err.code === 'VERSION_CONFLICT'
                  ? 'Someone else updated this event. Reload and retry.'
                  : err.message}
              </p>
            )}
            <button
              onClick={save}
              disabled={busy || status === h.status || (needsNotes && !notes.trim())}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-40"
            >
              {busy ? 'Saving…' : 'Record decision'}
            </button>
          </div>
        )}
        {h.verifications.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {h.verifications.map((v) => (
              <li key={v.id} className="text-xs text-slate-600">
                <span className="font-mono text-slate-500 font-semibold">{fmtDate(v.created_at)}</span> {v.from_status} →{' '}
                <span className="font-semibold text-slate-800">{v.to_status}</span>
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
