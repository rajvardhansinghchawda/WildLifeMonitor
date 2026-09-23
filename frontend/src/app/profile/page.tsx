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
      <div className="space-y-5 pb-12 max-w-2xl font-sans">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit">RANGER PROFILE</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Manage your personal credentials, contact email, and workspace assignments.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#e5ebe4] p-6 space-y-4 shadow-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full px-3.5 rounded-xl bg-white border border-[#dde4dc] hover:border-emerald-600 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 shadow-xs transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
            <p className="text-sm font-semibold text-slate-800 bg-[#f8faf7] px-3.5 py-2.5 rounded-xl border border-[#e5ebe4]">{user?.email}</p>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Member since {fmtDate(user?.created_at)} · last sign-in {fmtDate(user?.last_login_at)}
          </p>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={save}
              disabled={busy || name.trim().length < 2 || name === user?.full_name}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs disabled:opacity-40 transition-all"
            >
              {busy ? 'Saving…' : 'Save changes'}
            </button>
            {msg && <span className="text-xs text-slate-600 font-medium">{msg}</span>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5ebe4] p-6 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">Workspaces & roles</h2>
          <div className="divide-y divide-[#f0f3ee]">
            {user?.memberships.map((m) => (
              <div key={m.workspace_id} className="py-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">{m.workspace_name}</span>
                <span className="font-mono text-slate-600 bg-[#f8faf7] px-2 py-0.5 rounded-lg border border-[#e5ebe4]">
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
