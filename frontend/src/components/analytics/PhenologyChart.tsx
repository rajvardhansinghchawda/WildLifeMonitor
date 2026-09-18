'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { TimelineDataPoint } from '@/types';

interface PhenologyChartProps {
  data: TimelineDataPoint[];
  mode: 'ndvi' | 'water' | 'loss';
}

export const PhenologyChart: React.FC<PhenologyChartProps> = ({ data, mode }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-[380px] w-full pt-4 animate-pulse bg-slate-900/50 rounded-lg" />;
  }

  return (
    <div className="h-[380px] w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        {mode === 'ndvi' ? (
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis domain={[0.4, 0.9]} stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
            <Line
              type="monotone"
              dataKey="ndvi"
              name="Observed NDVI (Current Season)"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#10b981' }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="baseline"
              name="5-Yr Historical Baseline"
              stroke="#64748b"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        ) : mode === 'water' ? (
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
            <Line
              type="monotone"
              dataKey="waterCoverHa"
              name="Surface Water Coverage (ha)"
              stroke="#06b6d4"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#06b6d4' }}
              isAnimationActive={false}
            />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
            <Bar
              dataKey="canopyLossHa"
              name="Canopy Loss (ha)"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="fireIncidents"
              name="Thermal Incidents"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
