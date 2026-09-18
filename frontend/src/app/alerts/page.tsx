'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { MOCK_ALERTS } from '@/lib/mock-data';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { formatDate, cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Flame,
  TreePine,
  ExternalLink,
  ShieldAlert,
  Clock,
  Filter,
  Radio,
} from 'lucide-react';
import { AlertStatus } from '@/types';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  useEffect(() => {
    let isMounted = true;
    apiClient.checkHealth().then((h) => {
      if (isMounted) setIsBackendOnline(h.isOnline);
    });
    apiClient.getAlerts().then((data) => {
      if (isMounted && data && data.length > 0) setAlerts(data);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAcknowledge = (id: string) => {
    setAlerts(
      alerts.map((a) => (a.id === id ? { ...a, status: 'ACKNOWLEDGED' as AlertStatus } : a))
    );
  };

  const handleDismiss = (id: string) => {
    setAlerts(
      alerts.map((a) => (a.id === id ? { ...a, status: 'DISMISSED' as AlertStatus } : a))
    );
  };

  const filtered = alerts.filter((a) => {
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    return true;
  });

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-400" />
            <span>INCIDENT DISPATCH & REAL-TIME HABITAT ALERTS</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Prioritized canopy loss disturbances, active wildfire vectors, and illegal linear encroachment events
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-slate-400 flex-wrap">
          {isBackendOnline !== null && (
            <span
              className={cn(
                'px-2.5 py-1 rounded font-mono text-[11px] flex items-center gap-1.5 border',
                isBackendOnline
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', isBackendOnline ? 'bg-emerald-400' : 'bg-amber-400')} />
              {isBackendOnline ? 'FASTAPI: CONNECTED' : 'OFFLINE FALLBACK'}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <span>ACTIVE UNREAD:</span>
            <span className="text-red-400 font-bold">
              {alerts.filter((a) => a.status === 'UNREAD').length} ALARMS
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="gis-glass-card rounded-xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-slate-400">STATUS:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value="ALL">All Alerts</option>
              <option value="UNREAD">Unread Alarms</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-slate-400">SEVERITY:</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="h-8 px-2.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setAlerts(alerts.map((a) => ({ ...a, status: 'ACKNOWLEDGED' as AlertStatus })));
          }}
          className="text-xs font-mono text-emerald-400 hover:text-emerald-300 hover:underline"
        >
          Mark All As Acknowledged
        </button>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3.5">
        {filtered.map((alert) => (
          <div
            key={alert.id}
            className={`gis-glass-card rounded-xl p-5 border transition-all ${
              alert.status === 'UNREAD'
                ? 'border-red-500/40 bg-red-950/10 shadow-lg shadow-red-950/20'
                : 'border-slate-800/90'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2 rounded-lg border mt-0.5 ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-red-950/80 border-red-600/60 text-red-400'
                      : alert.severity === 'HIGH'
                      ? 'bg-amber-950/80 border-amber-600/60 text-amber-400'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  <ShieldAlert className="w-5 h-5" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <SeverityBadge severity={alert.severity} />
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {alert.area_name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      • {formatDate(alert.triggered_at)}
                    </span>
                  </div>

                  <h2 className="text-sm font-bold text-white mb-1">{alert.title}</h2>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                    {alert.message}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex sm:flex-col items-end gap-2 flex-shrink-0 pt-2 sm:pt-0">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                    alert.status === 'UNREAD'
                      ? 'bg-red-950 text-red-300 border-red-700 font-bold'
                      : alert.status === 'ACKNOWLEDGED'
                      ? 'bg-amber-950 text-amber-300 border-amber-700'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  {alert.status}
                </span>

                <div className="flex items-center gap-1.5 mt-2">
                  {alert.status === 'UNREAD' && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  <Link
                    href={`/explore?area=${alert.area_id}`}
                    className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-1 transition-colors"
                  >
                    <span>Locate</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500 font-mono text-xs">
            No incident alerts found for the selected status and severity parameters.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
