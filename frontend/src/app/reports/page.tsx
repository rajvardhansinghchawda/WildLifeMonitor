'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MOCK_REPORTS, MOCK_AREAS } from '@/lib/mock-data';
import { formatDate, cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { ProtectedArea, ReportItem } from '@/types';
import {
  FileText,
  Download,
  Plus,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  Shield,
  Clock,
  Sparkles,
  Radio,
} from 'lucide-react';

export default function ReportsPage() {
  const [reportsList, setReportsList] = useState<ReportItem[]>(MOCK_REPORTS);
  const [areas, setAreas] = useState<ProtectedArea[]>(MOCK_AREAS);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedArea, setSelectedArea] = useState(MOCK_AREAS[0].id);
  const [reportFormat, setReportFormat] = useState('GEOPDF');
  const [reportTitle, setReportTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    apiClient.checkHealth().then((h) => {
      if (isMounted) setIsBackendOnline(h.isOnline);
    });
    apiClient.getReports().then((data) => {
      if (isMounted && data && data.length > 0) setReportsList(data);
    });
    apiClient.getAreas().then((data) => {
      if (isMounted && data && data.length > 0) {
        setAreas(data);
        setSelectedArea(data[0].id);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    setTimeout(() => {
      const areaObj = areas.find((a) => a.id === selectedArea) || MOCK_AREAS.find((a) => a.id === selectedArea);
      const newRep: ReportItem = {
        id: `rep-${Date.now()}`,
        title: reportTitle || `Habitat Audit - ${areaObj?.name}`,
        format: reportFormat as any,
        date_range: '2026-06-01 to 2026-09-18',
        area_name: areaObj?.name || 'Serengeti National Park',
        file_size_mb: reportFormat === 'GEOPDF' ? 24.5 : reportFormat === 'CSV' ? 3.8 : 55.2,
        status: 'READY' as const,
        generated_at: new Date().toISOString(),
      };

      setReportsList([newRep, ...reportsList]);
      setIsGenerating(false);
      setShowModal(false);
      setReportTitle('');
    }, 800);
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span>AUDIT REPORTS & COMPLIANCE EXPORTS</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate verifiable GeoPDF compliance documents, GeoPackage spatial layers, and CSV metric summaries
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {isBackendOnline !== null && (
            <span
              className={cn(
                'px-2.5 py-1 rounded font-mono text-[11px] flex items-center gap-1.5 border',
                isBackendOnline
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', isBackendOnline ? 'bg-emerald-400' : 'bg-amber-400')} />
              {isBackendOnline ? 'FASTAPI: CONNECTED' : 'OFFLINE FALLBACK'}
            </span>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Dispatch New Audit</span>
          </button>
        </div>
      </div>

      {/* Reports Grid / Table */}
      <div className="gis-glass-card rounded-xl p-5 border border-slate-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                <th className="pb-3">Document Title</th>
                <th className="pb-3">Monitored Reserve</th>
                <th className="pb-3">Format</th>
                <th className="pb-3">Temporal Coverage</th>
                <th className="pb-3">File Size</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {reportsList.map((rep) => (
                <tr key={rep.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5">
                    <div className="flex items-center gap-2.5">
                      {rep.format === 'GEOPDF' ? (
                        <div className="p-1.5 rounded bg-red-950/60 border border-red-700/50 text-red-400">
                          <FileText className="w-4 h-4" />
                        </div>
                      ) : rep.format === 'CSV' ? (
                        <div className="p-1.5 rounded bg-emerald-950/60 border border-emerald-700/50 text-emerald-400">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded bg-blue-950/60 border border-blue-700/50 text-blue-400">
                          <FileCode className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-slate-200 block">{rep.title}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Generated: {formatDate(rep.generated_at)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 font-medium text-slate-300">
                    {rep.area_name}
                  </td>
                  <td className="py-3.5">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {rep.format}
                    </span>
                  </td>
                  <td className="py-3.5 font-mono text-slate-400 text-[11px]">
                    {rep.date_range}
                  </td>
                  <td className="py-3.5 font-mono text-slate-300">
                    {rep.file_size_mb.toFixed(1)} MB
                  </td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      {rep.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <button
                      onClick={() => alert(`Downloading ${rep.title} (${rep.format})...`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-emerald-500 text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>Get File</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog for Generating Report */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="gis-glass-card rounded-xl p-6 border border-slate-700 max-w-lg w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Configure Conservation Audit Report</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateReport} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Report Title
                </label>
                <input
                  type="text"
                  required
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="e.g. Q3 2026 Serengeti Habitat Audit"
                  className="w-full h-9 px-3 rounded bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Target Reserve
                </label>
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="w-full h-9 px-3 rounded bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.country})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Export Format
                </label>
                <select
                  value={reportFormat}
                  onChange={(e) => setReportFormat(e.target.value)}
                  className="w-full h-9 px-3 rounded bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="GEOPDF">GeoPDF (Includes high-res satellite map & audit stamps)</option>
                  <option value="CSV">CSV (Tabular telemetry & NDVI records)</option>
                  <option value="GEOPACKAGE">GeoPackage (Vector polygons & raster difference masks)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Compiling GeoPDF...</span>
                    </>
                  ) : (
                    <span>Generate & Archive</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
