import React from 'react';
import { cn } from '@/lib/utils';
import type { Severity } from '@/lib/api';

const STYLES: Record<Severity, string> = {
  critical: 'bg-red-950/70 text-red-400 border-red-600/60',
  high: 'bg-amber-950/70 text-amber-400 border-amber-600/60',
  medium: 'bg-yellow-950/50 text-yellow-300 border-yellow-600/50',
  low: 'bg-sky-950/50 text-sky-300 border-sky-600/40',
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
