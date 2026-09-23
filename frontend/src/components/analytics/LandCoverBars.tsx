import React from 'react';

const COLORS: Record<string, string> = {
  trees: '#16a34a',
  grass: '#a3e635',
  crops: '#eab308',
  shrub_and_scrub: '#f97316',
  flooded_vegetation: '#14b8a6',
  water: '#38bdf8',
  built: '#ef4444',
  bare: '#a8a29e',
  snow_and_ice: '#e2e8f0',
};

export const LandCoverBars: React.FC<{ distribution: Record<string, number> }> = ({
  distribution,
}) => {
  const rows = Object.entries(distribution)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  if (!rows.length) return <p className="text-xs text-slate-500">No land-cover statistics computed yet.</p>;
  return (
    <div className="space-y-2">
      {rows.map(([k, v]) => (
        <div key={k}>
          <div className="flex justify-between text-[11px] text-slate-700 font-medium mb-1">
            <span className="capitalize">{k.replace(/_/g, ' ')}</span>
            <span className="font-mono font-semibold text-slate-900">{v.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, v)}%`, background: COLORS[k] ?? '#94a3b8' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
