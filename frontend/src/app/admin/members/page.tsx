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
  Settings,
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e5ebe4] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="text-slate-500 hover:text-slate-900 transition-colors p-1.5 rounded-lg hover:bg-[#f3f7f2] border border-transparent hover:border-[#dde4dc]"
                title="Back to Admin"
              >
                <ChevronLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 font-outfit flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>Workspace Access Control & RBAC Roster</span>
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                RBAC
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Manage member roles, clearance authorization, and active account status
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/settings"
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#f3f7f2] text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors border border-[#dde4dc] shadow-xs"
            >
              <Settings className="w-3.5 h-3.5 text-amber-600" />
              <span>Scientific Tuning</span>
            </Link>

            <button
              onClick={fetchMembers}
              className="p-2 rounded-xl bg-white hover:bg-[#f3f7f2] text-slate-700 transition-colors border border-[#dde4dc] shadow-xs"
              title="Refresh Roster"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Feedback alerts */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono flex items-center gap-2 shadow-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Top Analytics: Role Breakdown Chart & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Role Composition Donut */}
          <div className="p-5 rounded-2xl bg-white border border-[#e5ebe4] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#e5ebe4] pb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-700 font-bold">
                RBAC Role Composition
              </span>
              <span className="text-[10px] font-mono text-slate-500">Total: {data?.total || 0}</span>
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
                        backgroundColor: '#ffffff',
                        borderColor: '#e5ebe4',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#0f172a',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-bold font-mono text-slate-900">{data?.total ?? 0}</span>
                <span className="text-[9px] font-mono text-slate-500 uppercase">Users</span>
              </div>
            </div>

            <div className="flex justify-around text-xs font-mono pt-1">
              {data?.role_distribution.map((r) => (
                <div key={r.role} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                  <span className="text-slate-500">{r.role}:</span>
                  <span className="text-slate-900 font-bold">{r.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RBAC Privilege Guidelines */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-[#e5ebe4] shadow-xs space-y-3 text-xs">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-700 font-bold block border-b border-[#e5ebe4] pb-2">
              Privilege Enforcement Matrix
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/80 space-y-1">
                <div className="font-bold text-rose-700 font-mono flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-rose-600" />
                  <span>ADMIN</span>
                </div>
                <p className="text-[11px] text-rose-900/80 leading-relaxed">
                  Full cluster administration, scientific weight calibration, role delegation, and audit log inspection.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
                <div className="font-bold text-emerald-700 font-mono flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ANALYST</span>
                </div>
                <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                  Submit new satellite analyses, execute change detection, and perform field verification status updates.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200/80 space-y-1">
                <div className="font-bold text-sky-700 font-mono flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-sky-600" />
                  <span>VIEWER</span>
                </div>
                <p className="text-[11px] text-sky-900/80 leading-relaxed">
                  Read-only telemetry access to authorized workspace results, spatial layers, and public demonstrations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Member Directory Table */}
        <div className="p-5 rounded-2xl bg-white border border-[#e5ebe4] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5ebe4] pb-3">
            <h2 className="text-sm font-bold text-slate-900 font-outfit uppercase tracking-wider">
              Workspace Member Roster ({filteredMembers.length})
            </h2>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email..."
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-[#f8faf7] border border-[#dde4dc] text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 font-mono"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#e5ebe4] text-slate-600 uppercase text-[10px] bg-[#f8faf7]">
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Last Active</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f3ee]">
                {filteredMembers.map((m) => (
                  <tr key={m.user_id} className="hover:bg-[#f3f7f2] transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{m.full_name}</div>
                      <div className="text-[11px] text-slate-500">{m.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={m.role}
                        disabled={updatingId === m.user_id}
                        onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                        className={`h-7 px-2.5 rounded-lg font-bold text-[11px] border focus:outline-none cursor-pointer shadow-xs ${
                          m.role === 'admin'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-300'
                            : m.role === 'analyst'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300'
                            : 'bg-sky-50 text-sky-700 border-sky-200 hover:border-sky-300'
                        }`}
                      >
                        <option value="admin">ADMIN</option>
                        <option value="analyst">ANALYST</option>
                        <option value="viewer">VIEWER</option>
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleStatusToggle(m.user_id, m.is_active)}
                        disabled={updatingId === m.user_id}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors shadow-xs ${
                          m.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        {m.is_active ? 'ACTIVE' : 'SUSPENDED'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {m.last_login_at ? new Date(m.last_login_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400 text-[11px]">
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
