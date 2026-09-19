import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { ApiError } from '@/lib/api';

export function LoadingBlock({ label = 'Loading real satellite-derived data…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 text-xs text-slate-500 font-medium p-8 bg-white/70 rounded-2xl border border-[#e5ebe4] shadow-xs">
      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorBlock({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div className="bg-red-50/90 rounded-2xl border border-red-200 p-4 text-xs text-red-800 flex items-start gap-3 shadow-xs">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
      <div className="flex-1">
        <p className="font-semibold">{error.message}</p>
        <p className="text-red-500/80 font-mono mt-0.5">{error.code}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="px-3 py-1 rounded-lg border border-red-300 bg-white hover:bg-red-100 text-red-800 text-xs font-medium shadow-xs transition-colors">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyBlock({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e5ebe4] p-8 text-center shadow-xs">
      <p className="text-sm font-bold text-slate-800">{title}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}
