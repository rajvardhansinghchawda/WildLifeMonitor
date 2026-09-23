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
  if (!mounted) return <div style={{ height }} className="animate-pulse bg-slate-100 rounded-2xl" />;
  const data = points.map((p) => ({ ...p, month: p.date.slice(0, 7) }));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {mode === 'ndvi' ? (
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5ebe4" />
            <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis domain={[0, 1]} stroke="#94a3b8" tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip
              contentStyle={{ background: '#ffffff', border: '1px solid #e5ebe4', borderRadius: '12px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', color: '#0f172a' }}
              formatter={(v: any) => (typeof v === 'number' ? v.toFixed(3) : '—')}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
            <Line
              type="monotone"
              dataKey="ndvi"
              name="NDVI (this year)"
              stroke="#059669"
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: '#059669' }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="baseline"
              name="Same month, previous year"
              stroke="#94a3b8"
              strokeDasharray="4 4"
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5ebe4" />
            <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip
              contentStyle={{ background: '#ffffff', border: '1px solid #e5ebe4', borderRadius: '12px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', color: '#0f172a' }}
              formatter={(v: any) => (typeof v === 'number' ? `${v.toFixed(0)} ha` : '—')}
            />
            <Bar dataKey="water_cover_ha" name="Surface water (ha)" fill="#0284c7" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
