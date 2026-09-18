import type { Severity } from '@/lib/api';

export const SEVERITY_COLORS: Record<Severity, string> = {
  low: '#38bdf8',
  medium: '#facc15',
  high: '#fb923c',
  critical: '#ef4444',
};

export function fmtHa(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return v >= 100 ? `${Math.round(v).toLocaleString()} ha` : `${v.toFixed(1)} ha`;
}

export function fmtNum(v: number | null | undefined, digits = 1): string {
  return v === null || v === undefined ? '—' : v.toFixed(digits);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function priorityBand(score: number | null): string {
  if (score === null) return 'unscored';
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

export function healthColor(band: string | null | undefined): string {
  switch (band) {
    case 'stable':
      return 'text-emerald-400';
    case 'minor':
      return 'text-lime-400';
    case 'moderate':
      return 'text-amber-400';
    case 'critical':
      return 'text-red-400';
    default:
      return 'text-slate-400';
  }
}
