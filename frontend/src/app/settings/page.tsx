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
      <div className="space-y-5 pb-12 max-w-2xl font-sans">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit">SECURITY</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Manage your account password and security credentials.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#e5ebe4] p-6 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Change password</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Current Password</label>
              <input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="Current password"
                className="h-10 w-full px-3.5 rounded-xl bg-white border border-[#dde4dc] hover:border-emerald-600 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 shadow-xs transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">New Password</label>
              <input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="New password (min 8 characters)"
                className="h-10 w-full px-3.5 rounded-xl bg-white border border-[#dde4dc] hover:border-emerald-600 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 shadow-xs transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={change}
              disabled={busy || !current || next.length < 8}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs disabled:opacity-40 transition-all"
            >
              {busy ? 'Updating…' : 'Update password'}
            </button>
            {msg && <span className="text-xs text-slate-600 font-medium">{msg}</span>}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
