'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  Search,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  getAdminMembers,
  updateMemberRole,
  AdminMembersResponse,
  MemberItem,
} from '@/lib/admin-api';

export default function AdminMembersPage() {
  const [data, setData] = useState<AdminMembersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminMembers();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load members:', err);
      setError(err.message || 'Unable to load workspace members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUpdatingId(userId);
      await updateMemberRole(userId, { role: newRole });
      setSuccessMessage(`Updated role to ${newRole.toUpperCase()}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchMembers();
    } catch (err: any) {
      setError(err.message || 'Failed to update member role.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      setUpdatingId(userId);
      await updateMemberRole(userId, { is_active: !currentStatus });
      setSuccessMessage(`User status changed to ${!currentStatus ? 'ACTIVE' : 'SUSPENDED'}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchMembers();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredMembers =
    data?.items.filter(
      (m) =>
        m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.user_id.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <span>WORKSPACE ACCESS CONTROL & RBAC ROSTER</span>
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                RBAC
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Manage member roles, clearance authorization, and active account status
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchMembers}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              title="Refresh Roster"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Feedback alerts */}
        {successMessage && (
          <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}
        {error && (
          <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Top Analytics: Role Breakdown Chart & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Role Composition Donut */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
                RBAC Role Composition
              </span>
              <span className="text-[10px] font-mono text-slate-400">Total: {data?.total || 0}</span>
            </div>

            <div className="h-44 w-full relative">
              {data?.role_distribution ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.role_distribution}
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="count"
                    >
                      {data.role_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#090d16',
                        borderColor: '#1e293b',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#f8fafc',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-bold font-mono text-white">{data?.total ?? 0}</span>
                <span className="text-[9px] font-mono text-slate-400 uppercase">Users</span>
              </div>
            </div>

            <div className="flex justify-around text-xs font-mono pt-1">
              {data?.role_distribution.map((r) => (
                <div key={r.role} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                  <span className="text-slate-400">{r.role}:</span>
                  <span className="text-white font-bold">{r.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RBAC Privilege Guidelines */}
          <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3 text-xs">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold block border-b border-slate-800 pb-2">
              Privilege Enforcement Matrix (rules.md / systemdesign.md)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="font-bold text-red-400 font-mono flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span>ADMIN</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Full cluster administration, scientific weight calibration, role delegation, and audit log inspection.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="font-bold text-emerald-400 font-mono flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>ANALYST</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Submit new satellite analyses, execute change detection, and perform field verification status updates.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="font-bold text-cyan-400 font-mono flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>VIEWER</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Read-only telemetry access to authorized workspace results, spatial layers, and public demonstrations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Member Directory Table */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Workspace Member Roster ({filteredMembers.length})
            </h2>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email..."
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="pb-2.5">User</th>
                  <th className="pb-2.5">Role</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5">Last Active</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMembers.map((m) => (
                  <tr key={m.user_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3">
                      <div className="font-bold text-white">{m.full_name}</div>
                      <div className="text-[11px] text-slate-400">{m.email}</div>
                    </td>
                    <td className="py-3">
                      <select
                        value={m.role}
                        disabled={updatingId === m.user_id}
                        onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                        className={`h-7 px-2 rounded font-bold text-[11px] border focus:outline-none cursor-pointer ${
                          m.role === 'admin'
                            ? 'bg-red-950/80 text-red-300 border-red-700'
                            : m.role === 'analyst'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                            : 'bg-cyan-950/80 text-cyan-300 border-cyan-700'
                        }`}
                      >
                        <option value="admin">ADMIN</option>
                        <option value="analyst">ANALYST</option>
                        <option value="viewer">VIEWER</option>
                      </select>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleStatusToggle(m.user_id, m.is_active)}
                        disabled={updatingId === m.user_id}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                          m.is_active
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-600 hover:bg-red-950 hover:text-red-300 hover:border-red-600'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-emerald-950 hover:text-emerald-300'
                        }`}
                      >
                        {m.is_active ? 'ACTIVE' : 'SUSPENDED'}
                      </button>
                    </td>
                    <td className="py-3 text-slate-400 text-[11px]">
                      {m.last_login_at ? new Date(m.last_login_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 text-right text-slate-500 text-[11px]">
                      {updatingId === m.user_id ? 'Updating...' : 'Saved'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
