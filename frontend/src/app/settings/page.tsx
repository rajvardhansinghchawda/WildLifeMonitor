'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import api from '@/lib/api';

export default function SettingsPage() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const caps = api;

  const change = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await caps.auth.changePassword(current, next);
      setCurrent('');
      setNext('');
      setMsg('Password changed. Other sessions were signed out.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5 pb-12 max-w-2xl">
        <h1 className="text-xl font-bold tracking-tight text-white font-mono">SECURITY</h1>
        <div className="gis-glass-card rounded-xl border border-slate-800 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white font-mono uppercase">Change password</h2>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Current password"
            className="h-9 w-full px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
          />
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="New password (min 8 characters)"
            className="h-9 w-full px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={change}
              disabled={busy || !current || next.length < 8}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-40"
            >
              Update password
            </button>
            {msg && <span className="text-[11px] text-slate-400">{msg}</span>}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
