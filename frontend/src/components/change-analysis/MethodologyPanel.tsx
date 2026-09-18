import React, { useState } from 'react';
import {
  BookOpen,
  Info,
  Layers,
  Sparkles,
  TreePine,
  Droplets,
  Building2,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const MethodologyPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'indices' | 'distinction'>('distinction');
  const [expandedIndex, setExpandedIndex] = useState<string>('ndvi');

  return (
    <div className="gis-glass-card rounded-xl border border-slate-800 p-6 space-y-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold font-mono text-white tracking-wide uppercase">
              Scientific Methodology & Detection Framework
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Principles of bi-temporal satellite differencing, spectral mathematics, and empirical inference standards
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('distinction')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              activeTab === 'distinction'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Inference Distinction
          </button>
          <button
            onClick={() => setActiveTab('indices')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              activeTab === 'indices'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Spectral Indices
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: CRITICAL THREE-TIER DISTINCTION CARDS */}
      {/* ========================================================================= */}
      {activeTab === 'distinction' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-blue-950/40 border border-blue-500/30 text-xs font-mono text-blue-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-blue-300">Remote Sensing Integrity Standard: </strong>
              To prevent misattribution and maintain legal defensibility for conservation enforcement, Wildlife Watch maintains an unyielding scientific distinction between objective physical signal, ecological interpretation, and data confidence.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Observed Change */}
            <div className="rounded-xl border border-blue-500/40 bg-slate-900/90 p-5 space-y-3 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2 text-blue-400 text-xs font-mono font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>1. Observed Change</span>
              </div>

              <h3 className="text-sm font-bold text-white font-mono">
                Physical Sensor Measurement
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed">
                The objective radiometric reflectance delta recorded by spaceborne sensors between T1 and T2 passes.
              </p>

              <div className="pt-2 border-t border-slate-800/80 space-y-2 text-[11px] font-mono text-slate-400">
                <div>
                  <strong className="text-slate-200 block">Empirical Metrics:</strong>
                  <span>• Drop in Band 8 NIR (842 nm) reflectance &gt; 0.18</span>
                  <br />
                  <span>• ΔNDVI value &lt; -0.40 across contiguous pixels</span>
                  <br />
                  <span>• Spectral Change Vector Magnitude (CVA) &gt; 0.35</span>
                </div>
                <div>
                  <strong className="text-slate-200 block">Nature:</strong>
                  <span className="text-blue-300">Empirical, reproducible, objective fact.</span>
                </div>
              </div>
            </div>

            {/* Card 2: Potential Interpretation */}
            <div className="rounded-xl border border-amber-500/40 bg-slate-900/90 p-5 space-y-3 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>2. Potential Interpretation</span>
              </div>

              <h3 className="text-sm font-bold text-white font-mono">
                Ecological & Anthropogenic Drivers
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed">
                Plausible physical or human mechanisms causing the observed spectral shift, subject to field ground-truthing.
              </p>

              <div className="pt-2 border-t border-slate-800/80 space-y-2 text-[11px] font-mono text-slate-400">
                <div>
                  <strong className="text-slate-200 block">Candidate Hypotheses:</strong>
                  <span>• Illegal clear-cut / selective commercial logging</span>
                  <br />
                  <span>• Agricultural encroachment / slash-and-burn</span>
                  <br />
                  <span>• Natural phenology / extreme drought stress</span>
                  <br />
                  <span>• Windthrow / storm blowdown damage</span>
                </div>
                <div>
                  <strong className="text-slate-200 block">Nature:</strong>
                  <span className="text-amber-300">Hypothesis requiring ranger verification.</span>
                </div>
              </div>
            </div>

            {/* Card 3: Confidence */}
            <div className="rounded-xl border border-emerald-500/40 bg-slate-900/90 p-5 space-y-3 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>3. Confidence Rating</span>
              </div>

              <h3 className="text-sm font-bold text-white font-mono">
                Quality Assurance & Noise Probability
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed">
                Statistical certainty that the observed anomaly is authentic ground change rather than sensor or atmospheric noise.
              </p>

              <div className="pt-2 border-t border-slate-800/80 space-y-2 text-[11px] font-mono text-slate-400">
                <div>
                  <strong className="text-slate-200 block">Filtering Criteria:</strong>
                  <span>• Sen2Cor cloud probability &lt; 5%</span>
                  <br />
                  <span>• Topographic shadow mask verification</span>
                  <br />
                  <span>• Spatial clustering: minimum 0.5 ha contiguous</span>
                  <br />
                  <span>• Multi-pass temporal persistence (≥ 2 passes)</span>
                </div>
                <div>
                  <strong className="text-slate-200 block">Nature:</strong>
                  <span className="text-emerald-300">Statistical reliability index (0% - 100%).</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: SPECTRAL FORMULATIONS & TEMPORAL COMPARISON */}
      {/* ========================================================================= */}
      {activeTab === 'indices' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* NDVI */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TreePine className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold font-mono text-white">NDVI: Normalized Difference Vegetation Index</h4>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                Canopy Density
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 text-center">
              NDVI = (NIR - Red) / (NIR + Red) = (Band 8 - Band 4) / (Band 8 + Band 4)
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Exploits strong chlorophyll absorption in red wavelengths (665 nm) and high scattering by leaf spongy mesophyll cells in near-infrared (842 nm). Values &gt; 0.65 represent dense intact forest, while drops &gt; 0.25 indicate severe canopy disruption.
            </p>
          </div>

          {/* NDWI */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold font-mono text-white">NDWI: Normalized Difference Water Index</h4>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30">
                Hydrology & Moisture
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 text-center">
              NDWI = (Green - NIR) / (Green + NIR) = (Band 3 - Band 8) / (Band 3 + Band 8)
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Delineates surface water bodies and river corridors (McFeeters). Water exhibits high reflectance in green and total absorption in NIR. Positive values (&gt;0.0) indicate open water bodies, flooded meadows, and seasonal wetland expansion.
            </p>
          </div>

          {/* NDBI */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold font-mono text-white">NDBI: Normalized Difference Built-Up Index</h4>
              </div>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30">
                Encroachment
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-amber-300 text-center">
              NDBI = (SWIR - NIR) / (SWIR + NIR) = (Band 11 - Band 8) / (Band 11 + Band 8)
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Discriminated built-up infrastructure, unpaved logging roads, and cleared bare soil from natural vegetation. Built surfaces reflect much higher in shortwave-infrared (1610 nm) than near-infrared. Used to track illegal road construction inside buffer zones.
            </p>
          </div>

          {/* Temporal Comparison */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-bold font-mono text-white">Temporal Comparison (Bi-Temporal CVA)</h4>
              </div>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-500/30">
                Differencing
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-purple-300 text-center">
              ΔIndex = Index(T2) - Index(T1) • Like-for-Like Phenology
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Bi-temporal differencing normalizes seasonal solar illumination and phenological calendar alignment. Comparing peak dry season to peak dry season ensures observed drops represent genuine canopy deforestation rather than normal seasonal deciduous foliage loss.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
