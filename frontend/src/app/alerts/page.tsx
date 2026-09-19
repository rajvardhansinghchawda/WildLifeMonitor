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
      <div className="space-y-5 pb-12 font-sans">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit">ALERTS</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Raised automatically from high-severity change events. {alerts.data?.unread_count ?? 0} unread in
            your workspace.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 px-3.5 rounded-xl bg-white border border-[#dde4dc] hover:border-emerald-600 text-xs font-semibold text-slate-800 shadow-xs focus:outline-none focus:border-emerald-600 transition-all"
          >
            <option value="">All statuses</option>
            <option value="unread">Unread</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="h-10 px-3.5 rounded-xl bg-white border border-[#dde4dc] hover:border-emerald-600 text-xs font-semibold text-slate-800 shadow-xs focus:outline-none focus:border-emerald-600 transition-all"
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
            <div key={a.id} className="bg-white rounded-2xl border border-[#e5ebe4] p-5 shadow-xs hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={a.severity} />
                    <span className="text-[10px] font-bold text-slate-500 uppercase px-1.5 py-0.5 bg-[#f0f3ee] rounded-md border border-[#dde4dc]">{a.status}</span>
                    {a.read_only && (
                      <span className="text-[10px] font-semibold text-slate-500">curated · read-only</span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-2">{a.title}</h2>
                  <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">{a.message}</p>
                  <p className="text-xs text-slate-500 font-mono mt-2 flex items-center gap-2">
                    <span>{a.area_name ?? 'Custom AOI'}</span>
                    <span>·</span>
                    <span>{fmtDate(a.triggered_at)}</span>
                    <span>·</span>
                    <Link href={`/hotspots?id=${a.event_id}`} className="text-emerald-700 font-semibold hover:underline">
                      View hotspot →
                    </Link>
                  </p>
                </div>
                {!a.read_only && (
                  <div className="flex gap-2 shrink-0">
                    {a.status === 'unread' && (
                      <button
                        disabled={busy === a.id}
                        onClick={() => setAlertStatus(a, 'acknowledged')}
                        className="px-3.5 py-1.5 rounded-xl bg-[#e6f4ea] hover:bg-emerald-100 text-[#137333] border border-emerald-300/80 text-xs font-semibold shadow-xs transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                    {a.status !== 'dismissed' && (
                      <button
                        disabled={busy === a.id}
                        onClick={() => setAlertStatus(a, 'dismissed')}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-colors"
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
