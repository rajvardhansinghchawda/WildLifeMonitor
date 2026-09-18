'use client';

import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MOCK_AREAS } from '@/lib/mock-data';
import {
  User,
  Shield,
  Building,
  Mail,
  Key,
  Calendar,
  CheckCircle2,
  Copy,
  Terminal,
} from 'lucide-react';

export default function ProfilePage() {
  const user = {
    name: 'Dr. Sarah Connor',
    role: 'PARK_RANGER (Field Commander)',
    email: 'sarah.connor@kenyawildlife.org',
    organization: 'Kenya Wildlife Service & IUCN Species Survival Commission',
    joined: '2024-03-15',
    activeToken: 'ww_live_9f82a17c4b6e8201de39fa12',
    monitoredCount: MOCK_AREAS.length,
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-400" />
          <span>FIELD PRACTITIONER DOSSIER & CREDENTIALS</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Identity management, operational clearance, and assigned conservation sectors
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Card */}
        <div className="gis-glass-card rounded-xl p-6 border border-slate-800 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-500/60 flex items-center justify-center text-emerald-400 font-mono text-xl font-bold">
              SC
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{user.name}</h2>
              <span className="inline-block mt-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                {user.role}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 space-y-3 text-xs">
            <div className="flex items-center gap-2.5 text-slate-300">
              <Building className="w-4 h-4 text-slate-500" />
              <span>{user.organization}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-300">
              <Mail className="w-4 h-4 text-slate-500" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-300">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Commissioned: {user.joined}</span>
            </div>
          </div>
        </div>

        {/* Assigned Habitats & API Access */}
        <div className="lg:col-span-2 space-y-6">
          {/* API Keys */}
          <div className="gis-glass-card rounded-xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <span>Geospatial Programmatic Access Token</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                ACTIVE
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Use this bearer key to query the REST API, download GeoTIFF masks, or integrate telemetry scripts into QGIS / ArcGIS.
            </p>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-9 px-3 rounded bg-slate-900 border border-slate-700 font-mono text-xs text-slate-300 flex items-center truncate">
                {user.activeToken}
              </div>
              <button
                onClick={() => alert('API key copied to clipboard')}
                className="px-3 h-9 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-white flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
            </div>
          </div>

          {/* Assigned Reserves */}
          <div className="gis-glass-card rounded-xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Assigned Monitored Habitats ({MOCK_AREAS.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MOCK_AREAS.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">{a.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {a.country} • {a.wdpa_id}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    {a.forest_cover_percent}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
