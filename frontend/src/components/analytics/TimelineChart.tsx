'use client';

import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import type { TimelinePoint } from '@/lib/api';

export const TimelineChart: React.FC<{
  points: TimelinePoint[];
  mode: 'ndvi' | 'water';
  height?: number;
}> = ({ points, mode, height = 320 }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div style={{ height }} className="animate-pulse bg-slate-900/50 rounded-lg" />;
  const data = points.map((p) => ({ ...p, month: p.date.slice(0, 7) }));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {mode === 'ndvi' ? (
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis domain={[0, 1]} stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }}
              formatter={(v: any) => (typeof v === 'number' ? v.toFixed(3) : '—')}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="ndvi"
              name="NDVI (this year)"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="baseline"
              name="Same month, previous year"
              stroke="#64748b"
              strokeDasharray="4 4"
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }}
              formatter={(v: any) => (typeof v === 'number' ? `${v.toFixed(0)} ha` : '—')}
            />
            <Bar dataKey="water_cover_ha" name="Surface water (ha)" fill="#38bdf8" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
