import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldAlert,
  Compass,
  Layers,
  Flame,
  Satellite,
  ArrowRight,
  Eye,
  CheckCircle2,
  TreePine,
  Activity,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-gis-dark text-slate-100 flex flex-col overflow-hidden">
      {/* Background Image: Homepage-bg1.png with cinematic GIS atmosphere */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <Image
          src="/Homepage-bg1.png"
          alt="Wildlife Watch Bengal Tiger Habitat Background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center scale-[1.01] brightness-75"
        />
        {/* Atmospheric gradients — lightened to let the tiger image breathe */}
        <div className="absolute inset-0 bg-gis-dark/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-gis-dark/75 via-transparent to-gis-dark/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-gis-dark/50 via-transparent to-gis-dark/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(7,11,16,0.55)_100%)]" />
      </div>

      {/* Navigation Header */}
      <header className="relative z-10 h-16 border-b border-slate-800/80 bg-gis-surface/80 backdrop-blur-md px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/90 border border-emerald-500/60 flex items-center justify-center text-emerald-400">
            <TreePine className="w-4 h-4" />
          </div>
          <span className="font-mono font-bold tracking-wider text-sm text-white">
            WILDLIFE WATCH
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono">
            GEO-INTELLIGENCE v1.0
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            Ranger Sign In
          </Link>
          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/50"
          >
            <span>Launch Platform</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center px-6 py-16 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-xs text-slate-300 mb-6 font-mono shadow-lg">
          <Satellite className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '10s' }} />
          <span>Real-Time Sentinel-2 & Landsat-9 Ingestion</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight drop-shadow-md">
          Wildlife Habitat Monitoring &{' '}
          <span className="text-emerald-400 underline decoration-emerald-500/40 underline-offset-8">
            Change Detection
          </span>
        </h1>

        <p className="text-base md:text-lg text-slate-300 max-w-2xl mb-10 drop-shadow">
          Empowering conservation teams and national park authorities with autonomous multi-spectral satellite telemetry, canopy loss alerts, and threat boundary intelligence.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2 shadow-xl shadow-emerald-900/40 hover:shadow-emerald-700/40 transition-all transform hover:-translate-y-0.5"
          >
            <span>Open Intelligence Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/explore"
            className="px-6 py-3 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 backdrop-blur-md border border-slate-700/70 text-slate-200 text-sm font-semibold flex items-center gap-2 transition-all hover:border-emerald-500/50 shadow-lg transform hover:-translate-y-0.5"
          >
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>Interactive Map Explorer</span>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          <div className="gis-glass-card p-6 rounded-xl border border-slate-800/90 bg-slate-900/60 backdrop-blur-md hover:border-emerald-500/40 transition-all duration-300 shadow-2xl">
            <div className="w-10 h-10 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2 font-mono">SPECTRAL INDICES</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Automated computing of cloud-masked NDVI (vegetation), NDWI (water bodies), and NDBI (built-up encroachment).
            </p>
          </div>

          <div className="gis-glass-card p-6 rounded-xl border border-slate-800/90 bg-slate-900/60 backdrop-blur-md hover:border-amber-500/40 transition-all duration-300 shadow-2xl">
            <div className="w-10 h-10 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
              <Flame className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2 font-mono">FIRE HOTSPOTS</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              NASA FIRMS 375m thermal anomaly ingestion detecting active wildfire fronts and charcoal kilns inside reserve boundaries.
            </p>
          </div>

          <div className="gis-glass-card p-6 rounded-xl border border-slate-800/90 bg-slate-900/60 backdrop-blur-md hover:border-red-500/40 transition-all duration-300 shadow-2xl">
            <div className="w-10 h-10 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-center text-red-400 mb-4 shadow-inner">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2 font-mono">VECTORIZED ALERTS</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              DBSCAN spatial clustering vectorizing pixel-level canopy loss into discrete polygon incident records with severity tags.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 h-14 border-t border-slate-800/80 bg-gis-surface/70 backdrop-blur-md px-8 flex items-center justify-between text-xs text-slate-400">
        <div>Protected Area Database: WDPA 2026 Compatible</div>
        <div>Wildlife Habitat Monitoring Platform • Enterprise Edition</div>
      </footer>
    </div>
  );
}
