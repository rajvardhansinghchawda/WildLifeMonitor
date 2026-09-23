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
      <div className="space-y-5 pb-12 font-sans">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit">REPORTS & EXPORTS</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Export the change events of an area's latest analysis with provenance and attribution.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5ebe4] p-4 flex flex-wrap items-end gap-3 shadow-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Area</label>
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className="h-9 px-3 rounded-xl bg-white border border-[#dde4dc] hover:border-emerald-600 text-xs font-semibold text-slate-800 shadow-xs focus:outline-none focus:border-emerald-600 min-w-[240px] transition-all"
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
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'csv' | 'geojson')}
              className="h-9 px-3 rounded-xl bg-white border border-[#dde4dc] hover:border-emerald-600 text-xs font-semibold text-slate-800 shadow-xs focus:outline-none focus:border-emerald-600 transition-all"
            >
              <option value="csv">CSV (table)</option>
              <option value="geojson">GeoJSON (geometry)</option>
            </select>
          </div>
          <button
            onClick={generate}
            disabled={!areaId || busy}
            className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs disabled:opacity-40 transition-all"
          >
            {busy ? 'Generating…' : 'Generate export'}
          </button>
          {err && <span className="text-xs text-red-600 font-medium">{err.message}</span>}
        </div>

        {reports.loading && <LoadingBlock />}
        {reports.error && <ErrorBlock error={reports.error} onRetry={reports.reload} />}
        {reports.data && reports.data.items.length === 0 && (
          <EmptyBlock title="No exports yet" hint="Generated exports appear here." />
        )}

        <div className="bg-white rounded-2xl border border-[#e5ebe4] shadow-xs divide-y divide-[#f0f3ee] overflow-hidden">
          {reports.data?.items.map((r) => (
            <div key={r.id} className="p-4 flex items-center justify-between gap-3 hover:bg-[#f3f7f2]/50 transition-colors">
              <div>
                <p className="text-sm font-bold text-slate-900">{r.title}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {r.format.toUpperCase()} · {r.event_count} events · {fmtBytes(r.byte_size)} ·{' '}
                  {fmtDate(r.created_at)} · <span className="font-semibold text-emerald-700">{r.status}</span>
                </p>
              </div>
              {r.status === 'ready' && (
                <button
                  onClick={() => download(r.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#e6f4ea] hover:bg-emerald-100 text-[#137333] border border-emerald-300/80 text-xs font-semibold shadow-xs transition-colors"
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
