'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { fmtDate } from '@/lib/format';

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.full_name ?? '');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await api.auth.updateMe(name);
      await refresh();
      setMsg('Profile updated.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5 pb-12 max-w-2xl">
        <h1 className="text-xl font-bold tracking-tight text-white font-mono">PROFILE</h1>
        <div className="gis-glass-card rounded-xl border border-slate-800 p-4 space-y-3">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 w-full px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Email</label>
            <p className="text-xs text-slate-300">{user?.email}</p>
          </div>
          <p className="text-[11px] text-slate-500">
            Member since {fmtDate(user?.created_at)} · last sign-in {fmtDate(user?.last_login_at)}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={busy || name.trim().length < 2 || name === user?.full_name}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-40"
            >
              Save
            </button>
            {msg && <span className="text-[11px] text-slate-400">{msg}</span>}
          </div>
        </div>

        <div className="gis-glass-card rounded-xl border border-slate-800 p-4">
          <h2 className="text-sm font-semibold text-white font-mono uppercase mb-2">Workspaces & roles</h2>
          <div className="divide-y divide-slate-800/60">
            {user?.memberships.map((m) => (
              <div key={m.workspace_id} className="py-2 flex items-center justify-between text-xs">
                <span className="text-slate-200">{m.workspace_name}</span>
                <span className="font-mono text-slate-400">
                  {m.role}
                  {m.is_public ? ' · curated (read-only)' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
