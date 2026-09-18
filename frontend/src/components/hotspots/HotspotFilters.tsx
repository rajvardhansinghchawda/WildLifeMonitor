import React from 'react';
import { MOCK_AREAS } from '@/lib/mock-data';
import {
  Search,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  Flame,
  ShieldAlert,
  Calendar,
  Globe2,
  Percent,
} from 'lucide-react';

import { ProtectedArea } from '@/types';

export interface HotspotFilterState {
  search: string;
  changeType: string;
  severity: string;
  dateRange: string;
  areaId: string;
  minConfidence: number;
}

interface HotspotFiltersProps {
  filters: HotspotFilterState;
  onFilterChange: (filters: HotspotFilterState) => void;
  onReset: () => void;
  activeCount: number;
  totalCount: number;
  areas?: ProtectedArea[];
}

export const HotspotFilters: React.FC<HotspotFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  activeCount,
  totalCount,
  areas = MOCK_AREAS,
}) => {
  const handleChange = <K extends keyof HotspotFilterState>(
    key: K,
    value: HotspotFilterState[K]
  ) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.search !== '' ||
    filters.changeType !== 'ALL' ||
    filters.severity !== 'ALL' ||
    filters.dateRange !== 'ALL' ||
    filters.areaId !== 'ALL' ||
    filters.minConfidence > 0;

  return (
    <div className="gis-glass-card rounded-xl p-4 border border-slate-800 space-y-3 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold font-mono text-white tracking-wide uppercase">
            Multidimensional Hotspot Filters
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
            Showing <strong className="text-emerald-400">{activeCount}</strong> of {totalCount}
          </span>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors self-start sm:self-auto"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Grid of 5 filters + search */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Free Search */}
        <div className="space-y-1">
          <label className="block text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
            <Search className="w-3 h-3 text-slate-400" />
            <span>Search</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
              placeholder="ID, sector, park..."
              className="w-full h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* 2. Change Type Filter */}
        <div className="space-y-1">
          <label className="block text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400" />
            <span>Change Type</span>
          </label>
          <select
            value={filters.changeType}
            onChange={(e) => handleChange('changeType', e.target.value)}
            className="w-full h-8 px-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
          >
            <option value="ALL">All Change Types</option>
            <option value="VEGETATION_LOSS">Vegetation Loss</option>
            <option value="WATER_LOSS">Water Loss</option>
            <option value="URBAN_EXPANSION">Urban Expansion</option>
            <option value="FIRE">Fire</option>
            <option value="OTHER">Other Environmental Change</option>
          </select>
        </div>

        {/* 3. Severity Filter */}
        <div className="space-y-1">
          <label className="block text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-red-400" />
            <span>Severity</span>
          </label>
          <select
            value={filters.severity}
            onChange={(e) => handleChange('severity', e.target.value)}
            className="w-full h-8 px-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* 4. Date Filter */}
        <div className="space-y-1">
          <label className="block text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-blue-400" />
            <span>Date Detected</span>
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => handleChange('dateRange', e.target.value)}
            className="w-full h-8 px-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
          >
            <option value="ALL">All Time</option>
            <option value="24H">Last 24 Hours</option>
            <option value="7D">Last 7 Days</option>
            <option value="30D">Last 30 Days</option>
            <option value="90D">Last 90 Days</option>
          </select>
        </div>

        {/* 5. Area Filter */}
        <div className="space-y-1">
          <label className="block text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
            <Globe2 className="w-3 h-3 text-emerald-400" />
            <span>Protected Area</span>
          </label>
          <select
            value={filters.areaId}
            onChange={(e) => handleChange('areaId', e.target.value)}
            className="w-full h-8 px-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Protected Areas</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>

        {/* 6. Confidence Filter */}
        <div className="space-y-1">
          <label className="block text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
            <Percent className="w-3 h-3 text-purple-400" />
            <span>Confidence</span>
          </label>
          <select
            value={filters.minConfidence}
            onChange={(e) => handleChange('minConfidence', Number(e.target.value))}
            className="w-full h-8 px-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
          >
            <option value="0">All Confidence</option>
            <option value="70">≥ 70% Confirmed</option>
            <option value="80">≥ 80% Confirmed</option>
            <option value="90">≥ 90% High Precision</option>
            <option value="95">≥ 95% Verified</option>
          </select>
        </div>
      </div>
    </div>
  );
};
