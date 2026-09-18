'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { MOCK_AREAS } from '@/lib/mock-data';
import { ProtectedArea } from '@/types';
import { apiClient } from '@/lib/api-client';
import { formatHectares, formatDate, cn } from '@/lib/utils';
import {
  Compass,
  Search,
  Plus,
  Shield,
  Flame,
  TreePine,
  ArrowRight,
  Globe2,
  TrendingDown,
  Radio,
} from 'lucide-react';

export default function AreasPage() {
  const [areas, setAreas] = useState<ProtectedArea[]>(MOCK_AREAS);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [iucnFilter, setIucnFilter] = useState('ALL');

  useEffect(() => {
    let isMounted = true;
    apiClient.getAreas().then((data) => {
      if (isMounted && data && data.length > 0) setAreas(data);
    });
    apiClient.checkHealth().then((h) => {
      if (isMounted) setIsBackendOnline(h.isOnline);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredAreas = areas.filter((area) => {
    if (iucnFilter !== 'ALL' && area.iucn_category !== iucnFilter) return false;
    if (
      searchQuery &&
      !area.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !area.country.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !area.wdpa_id.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-400" />
            <span>PROTECTED HABITATS & SURVEILLED RESERVES</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            World Database on Protected Areas (WDPA) integrated boundary registry and conservation indices
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
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
          <button className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/40">
            <Plus className="w-3.5 h-3.5" />
            <span>Enroll Custom AOI</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by name, country, WDPA..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-mono text-slate-400 whitespace-nowrap">IUCN CATEGORY:</label>
          <select
            value={iucnFilter}
            onChange={(e) => setIucnFilter(e.target.value)}
            className="h-9 px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
          >
            <option value="ALL">All Categories</option>
            <option value="II">Category II (National Park)</option>
            <option value="VI">Category VI (Sustainable Resource)</option>
          </select>
        </div>
      </div>

      {/* Areas Card Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAreas.map((area) => (
          <div
            key={area.id}
            className="gis-glass-card rounded-xl p-5 border border-slate-800 flex flex-col justify-between hover:border-emerald-500/50 transition-all group"
          >
            <div>
              {/* Card Top */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    IUCN {area.iucn_category} • {area.wdpa_id}
                  </span>
                  <h2 className="text-base font-bold text-white mt-2 group-hover:text-emerald-400 transition-colors">
                    {area.name}
                  </h2>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Globe2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{area.country}</span>
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                      area.threat_index > 70
                        ? 'bg-red-950 text-red-300 border-red-700/60'
                        : area.threat_index > 40
                        ? 'bg-amber-950 text-amber-300 border-amber-700/60'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                    }`}
                  >
                    Risk: {area.threat_index}/100
                  </span>
                </div>
              </div>

              {/* Biome Description */}
              <p className="text-[11px] text-slate-400 line-clamp-1 italic mb-4">
                {area.biome}
              </p>

              {/* Metric stats */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80 text-xs font-mono">
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">TOTAL AREA</span>
                  <span className="text-slate-200 font-bold block mt-0.5">
                    {formatHectares(area.total_hectares)}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">FOREST CANOPY</span>
                  <span className="text-emerald-400 font-bold block mt-0.5">
                    {area.forest_cover_percent}% Cover
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">CANOPY LOSS (YTD)</span>
                  <span className="text-red-400 font-bold block mt-0.5">
                    -{area.canopy_loss_year_ha.toFixed(1)} ha
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">ACTIVE FIRES</span>
                  <span className="text-amber-400 font-bold block mt-0.5">
                    {area.active_fires_count} Detections
                  </span>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500">
                Audited: {formatDate(area.last_analyzed)}
              </span>
              <Link
                href={`/areas/${area.id}`}
                className="text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 flex items-center gap-1 font-mono hover:underline"
              >
                <span>Dossier & Analytics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
