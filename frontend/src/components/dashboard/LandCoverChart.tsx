'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

export const LandCoverChart: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const landCoverData = [
    { name: 'Dense Forest', percentage: 54.2, hectares: 800154, color: '#10b981' },
    { name: 'Open Woodland', percentage: 20.0, hectares: 295260, color: '#059669' },
    { name: 'Savanna / Grass', percentage: 14.8, hectares: 218492, color: '#84cc16' },
    { name: 'Water / Wetland', percentage: 8.4, hectares: 124009, color: '#06b6d4' },
    { name: 'Built-up / Bare', percentage: 2.6, hectares: 38385, color: '#f59e0b' },
  ];

  return (
    <div className="gis-glass-card rounded-xl p-5 border border-slate-800 flex flex-col justify-between shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Land-Cover Distribution
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            WorldCover 10m baseline classification & biome partitioning
          </p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
          ESA 10M CLASSIFIER
        </span>
      </div>

      {/* Recharts Horizontal Bar or Distribution Bars */}
      <div className="h-44 w-full">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={landCoverData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <XAxis type="number" domain={[0, 60]} tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 10, fill: '#cbd5e1' }}
                width={85}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
                formatter={(value: any, name: any, item: any) => [
                  `${value}% (${item.payload.hectares.toLocaleString()} ha)`,
                  'Coverage',
                ]}
              />
              <Bar dataKey="percentage" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {landCoverData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full animate-pulse bg-slate-900/50 rounded-lg" />
        )}
      </div>

      {/* Legend and Total Breakdown */}
      <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
        {landCoverData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-slate-400 truncate">{item.name}:</span>
            <span className="text-slate-200 font-bold ml-auto">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
