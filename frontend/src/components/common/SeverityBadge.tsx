import React from 'react';
import { SeverityLevel } from '@/types';
import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  className?: string;
  showIcon?: boolean;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  className,
  showIcon = true,
}) => {
  const configs: Record<
    SeverityLevel,
    { bg: string; text: string; border: string; icon: React.ReactNode; label: string }
  > = {
    CRITICAL: {
      bg: 'bg-red-950/70',
      text: 'text-red-400',
      border: 'border-red-600/60',
      icon: <ShieldAlert className="w-3.5 h-3.5 mr-1" />,
      label: 'Critical Alert',
    },
    HIGH: {
      bg: 'bg-amber-950/70',
      text: 'text-amber-400',
      border: 'border-amber-600/60',
      icon: <AlertTriangle className="w-3.5 h-3.5 mr-1" />,
      label: 'High Severity',
    },
    MEDIUM: {
      bg: 'bg-yellow-950/50',
      text: 'text-yellow-300',
      border: 'border-yellow-600/50',
      icon: <AlertCircle className="w-3.5 h-3.5 mr-1" />,
      label: 'Medium Risk',
    },
    LOW: {
      bg: 'bg-emerald-950/50',
      text: 'text-emerald-300',
      border: 'border-emerald-600/40',
      icon: <Info className="w-3.5 h-3.5 mr-1" />,
      label: 'Low Impact',
    },
    INFO: {
      bg: 'bg-cyan-950/50',
      text: 'text-cyan-300',
      border: 'border-cyan-600/40',
      icon: <Info className="w-3.5 h-3.5 mr-1" />,
      label: 'Information',
    },
  };

  const current = configs[severity] || configs.LOW;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border tracking-wide uppercase',
        current.bg,
        current.text,
        current.border,
        className
      )}
    >
      {showIcon && current.icon}
      {current.label}
    </span>
  );
};
