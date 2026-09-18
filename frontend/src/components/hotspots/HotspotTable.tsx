import React from 'react';
import { ChangeEventHotspot } from '@/types';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import {
  Flame,
  Droplets,
  TreePine,
  Building2,
  Layers,
  ChevronRight,
  TrendingDown,
  Activity,
  Calendar,
} from 'lucide-react';

interface HotspotTableProps {
  hotspots: ChangeEventHotspot[];
  selectedHotspotId: string | null;
  onSelectHotspot: (hotspot: ChangeEventHotspot) => void;
}

export const HotspotTable: React.FC<HotspotTableProps> = ({
  hotspots,
  selectedHotspotId,
  onSelectHotspot,
}) => {
  // Format readable date
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  // Render type icon and label
  const renderType = (type: string) => {
    switch (type) {
      case 'VEGETATION_LOSS':
      case 'DEFORESTATION':
      case 'CANOPY_THINNING':
        return (
          <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
            <TreePine className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Vegetation Loss</span>
          </span>
        );
      case 'WATER_LOSS':
        return (
          <span className="flex items-center gap-1.5 text-cyan-400 font-mono text-[11px]">
            <Droplets className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Water Loss</span>
          </span>
        );
      case 'URBAN_EXPANSION':
      case 'ENCROACHMENT':
        return (
          <span className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px]">
            <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Urban Expansion</span>
          </span>
        );
      case 'FIRE':
      case 'BURN_SCAR':
        return (
          <span className="flex items-center gap-1.5 text-rose-400 font-mono text-[11px]">
            <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Fire Hotspot</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-indigo-400 font-mono text-[11px]">
            <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Other Change</span>
          </span>
        );
    }
  };

  return (
    <div className="gis-glass-card rounded-xl border border-slate-800 overflow-hidden shadow-xl flex flex-col h-full">
      {/* Table Top Header Bar */}
      <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold font-mono text-white tracking-wide uppercase">
            Detected Hotspots Registry
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Click any row to zoom map & inspect dossier
        </span>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto flex-1 max-h-[620px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-950/95 backdrop-blur-sm z-10">
            <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
              <th className="py-3 px-3">ID</th>
              <th className="py-3 px-3">Location</th>
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-3">Severity</th>
              <th className="py-3 px-3">Change</th>
              <th className="py-3 px-3">Affected Area</th>
              <th className="py-3 px-3">Confidence</th>
              <th className="py-3 px-3">Date</th>
              <th className="py-3 px-2 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {hotspots.map((hs) => {
              const isSelected = selectedHotspotId === hs.id;
              return (
                <tr
                  key={hs.id}
                  onClick={() => onSelectHotspot(hs)}
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-950/40 border-l-4 border-l-emerald-400 shadow-inner'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  {/* ID */}
                  <td className="py-3 px-3 font-mono font-bold text-[11px]">
                    <span className={isSelected ? 'text-emerald-300' : 'text-slate-300'}>
                      {hs.id}
                    </span>
                  </td>

                  {/* Location */}
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-200">{hs.area_name}</div>
                    <div className="text-[10px] font-mono text-slate-500 truncate max-w-[150px]">
                      {hs.location_detail || `${hs.coordinates.lat.toFixed(2)}°, ${hs.coordinates.lon.toFixed(2)}°`}
                    </div>
                  </td>

                  {/* Type */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {renderType(hs.change_type)}
                  </td>

                  {/* Severity */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <SeverityBadge severity={hs.severity} />
                  </td>

                  {/* Change */}
                  <td className="py-3 px-3 font-mono whitespace-nowrap">
                    <span className="text-red-400 font-bold flex items-center gap-0.5">
                      <TrendingDown className="w-3 h-3 text-red-400" />
                      <span>{hs.percentage_change ? `${hs.percentage_change.toFixed(1)}%` : `${(hs.delta_ndvi * 100).toFixed(0)}%`}</span>
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      Δ {hs.delta_ndvi.toFixed(2)}
                    </span>
                  </td>

                  {/* Affected Area */}
                  <td className="py-3 px-3 font-mono font-medium text-slate-200 whitespace-nowrap">
                    {hs.area_ha.toFixed(1)} ha
                  </td>

                  {/* Confidence */}
                  <td className="py-3 px-3 font-mono font-bold text-cyan-400 whitespace-nowrap">
                    {(hs.confidence_score * 100).toFixed(0)}%
                  </td>

                  {/* Date */}
                  <td className="py-3 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                    {formatDate(hs.detected_at)}
                  </td>

                  {/* Action arrow */}
                  <td className="py-3 px-2 text-right">
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        isSelected ? 'text-emerald-400 translate-x-0.5' : 'text-slate-600'
                      }`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {hotspots.length === 0 && (
          <div className="p-12 text-center text-slate-500 font-mono text-xs">
            No change detection hotspots matched the selected filters.
          </div>
        )}
      </div>
    </div>
  );
};
