'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/common/ApiState';
import api, { AlertItem } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { fmtDate } from '@/lib/format';

export default function AlertsPage() {
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const alerts = useApi(
    () => api.alerts.list({ status: status || undefined, severity: severity || undefined }),
    [status, severity]
  );
  const [busy, setBusy] = useState<string | null>(null);

  const setAlertStatus = async (a: AlertItem, next: AlertItem['status']) => {
    setBusy(a.id);
    try {
      await api.alerts.setStatus(a.id, next);
      alerts.reload();
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5 pb-12">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-mono">ALERTS</h1>
          <p className="text-xs text-slate-400 mt-1">
            Raised automatically from high-severity change events. {alerts.data?.unread_count ?? 0} unread in
            your workspace.
          </p>
        </div>

        <div className="flex gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-8 px-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
          >
            <option value="">All statuses</option>
            <option value="unread">Unread</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="h-8 px-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
          >
            <option value="">All severities</option>
            {['critical', 'high', 'medium', 'low'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {alerts.loading && <LoadingBlock />}
        {alerts.error && <ErrorBlock error={alerts.error} onRetry={alerts.reload} />}
        {alerts.data && alerts.data.items.length === 0 && (
          <EmptyBlock
            title="No alerts"
            hint="Alerts appear when an analysis in your workspace produces a high-severity change event."
          />
        )}

        <div className="space-y-3">
          {alerts.data?.items.map((a) => (
            <div key={a.id} className="gis-glass-card rounded-xl border border-slate-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={a.severity} />
                    <span className="text-[10px] font-mono text-slate-500 uppercase">{a.status}</span>
                    {a.read_only && (
                      <span className="text-[10px] font-mono text-slate-500">curated · read-only</span>
                    )}
                  </div>
                  <h2 className="text-sm text-white mt-1.5">{a.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{a.message}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1.5">
                    {a.area_name ?? 'Custom AOI'} · {fmtDate(a.triggered_at)} ·{' '}
                    <Link href={`/hotspots?id=${a.event_id}`} className="text-emerald-400 hover:underline">
                      View hotspot
                    </Link>
                  </p>
                </div>
                {!a.read_only && (
                  <div className="flex gap-2 shrink-0">
                    {a.status === 'unread' && (
                      <button
                        disabled={busy === a.id}
                        onClick={() => setAlertStatus(a, 'acknowledged')}
                        className="px-2.5 py-1 rounded border border-emerald-700 text-emerald-300 text-[11px] hover:bg-emerald-950"
                      >
                        Acknowledge
                      </button>
                    )}
                    {a.status !== 'dismissed' && (
                      <button
                        disabled={busy === a.id}
                        onClick={() => setAlertStatus(a, 'dismissed')}
                        className="px-2.5 py-1 rounded border border-slate-700 text-slate-300 text-[11px] hover:bg-slate-800"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
