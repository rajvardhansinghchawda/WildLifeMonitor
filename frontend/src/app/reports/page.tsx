'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/common/ApiState';
import api, { ApiError } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { fmtBytes, fmtDate } from '@/lib/format';

export default function ReportsPage() {
  const areas = useApi(() => api.areas.list(), []);
  const reports = useApi(() => api.reports.list(), []);
  const [areaId, setAreaId] = useState('');
  const [format, setFormat] = useState<'csv' | 'geojson'>('csv');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);

  const generate = async () => {
    if (!areaId) return;
    setBusy(true);
    setErr(null);
    try {
      await api.reports.create({ area_id: areaId, format });
      reports.reload();
    } catch (e) {
      setErr(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  const download = async (id: string) => {
    const d = await api.reports.download(id);
    window.open(d.url, '_blank', 'noopener');
  };

  return (
    <AppLayout>
      <div className="space-y-5 pb-12">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-mono">REPORTS & EXPORTS</h1>
          <p className="text-xs text-slate-400 mt-1">
            Export the change events of an area's latest analysis with provenance and attribution.
          </p>
        </div>

        <div className="gis-glass-card rounded-xl border border-slate-800 p-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Area</label>
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className="h-8 px-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 min-w-[240px]"
            >
              <option value="">Select area…</option>
              {areas.data?.items.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'csv' | 'geojson')}
              className="h-8 px-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
            >
              <option value="csv">CSV (table)</option>
              <option value="geojson">GeoJSON (geometry)</option>
            </select>
          </div>
          <button
            onClick={generate}
            disabled={!areaId || busy}
            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-40"
          >
            {busy ? 'Generating…' : 'Generate export'}
          </button>
          {err && <span className="text-[11px] text-red-400">{err.message}</span>}
        </div>

        {reports.loading && <LoadingBlock />}
        {reports.error && <ErrorBlock error={reports.error} onRetry={reports.reload} />}
        {reports.data && reports.data.items.length === 0 && (
          <EmptyBlock title="No exports yet" hint="Generated exports appear here." />
        )}

        <div className="gis-glass-card rounded-xl border border-slate-800 divide-y divide-slate-800/60">
          {reports.data?.items.map((r) => (
            <div key={r.id} className="p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-200">{r.title}</p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {r.format.toUpperCase()} · {r.event_count} events · {fmtBytes(r.byte_size)} ·{' '}
                  {fmtDate(r.created_at)} · {r.status}
                </p>
              </div>
              {r.status === 'ready' && (
                <button
                  onClick={() => download(r.id)}
                  className="px-3 py-1 rounded border border-emerald-700 text-emerald-300 text-xs hover:bg-emerald-950"
                >
                  Download
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
