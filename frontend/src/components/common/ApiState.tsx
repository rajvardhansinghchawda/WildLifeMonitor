import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { ApiError } from '@/lib/api';

export function LoadingBlock({ label = 'Loading real satellite-derived data…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono p-6">
      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
      {label}
    </div>
  );
}

export function ErrorBlock({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div className="gis-glass-card rounded-xl border border-red-900/60 p-4 text-xs text-red-300 flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">{error.message}</p>
        <p className="text-red-400/70 font-mono mt-0.5">{error.code}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="px-2 py-1 rounded border border-red-800 hover:bg-red-950">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyBlock({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="gis-glass-card rounded-xl border border-slate-800 p-8 text-center">
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}
