import React from 'react';
import { cn } from '@/lib/utils';
import type { Severity } from '@/lib/api';

const STYLES: Record<Severity, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200/80',
  high: 'bg-amber-50 text-amber-700 border-amber-200/80',
  medium: 'bg-yellow-50 text-yellow-800 border-yellow-200/80',
  low: 'bg-sky-50 text-sky-700 border-sky-200/80',
};

export const SeverityBadge: React.FC<{ severity: Severity; className?: string }> = ({
  severity,
  className,
}) => (
  <span
    className={cn(
      'inline-flex items-center px-2 py-0.5 rounded border font-mono text-[10px] font-semibold uppercase tracking-wider',
      STYLES[severity] ?? STYLES.low,
      className
    )}
  >
    {severity}
  </span>
);
