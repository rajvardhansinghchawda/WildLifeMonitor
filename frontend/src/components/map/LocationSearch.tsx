'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Globe, Compass, X, Check } from 'lucide-react';
import { ProtectedArea } from '@/types';
import { MOCK_AREAS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

interface LocationSearchProps {
  selectedArea: ProtectedArea;
  onSelectArea: (area: ProtectedArea) => void;
}

const EXAMPLE_SEARCHES = [
  'Kanha National Park',
  'Bandhavgarh National Park',
  'Satpura Tiger Reserve',
  'Kaziranga National Park',
];

export const LocationSearch: React.FC<LocationSearchProps> = ({
  selectedArea,
  onSelectArea,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filtered = MOCK_AREAS.filter(
    (area) =>
      area.name.toLowerCase().includes(query.toLowerCase()) ||
      area.country.toLowerCase().includes(query.toLowerCase()) ||
      area.biome.toLowerCase().includes(query.toLowerCase()) ||
      area.wdpa_id.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (area: ProtectedArea) => {
    onSelectArea(area);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-lg">
      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
          <Search className="w-4 h-4 text-emerald-400" />
        </div>

        <input
          ref={inputRef}
          type="text"
          placeholder="Search reserve, national park, coordinates (press '/' to focus)..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full h-9 pl-9 pr-24 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-emerald-500/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-slate-100 placeholder:text-slate-500 font-sans transition-all outline-none"
        />

        {query ? (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-2 text-slate-400 hover:text-white p-1 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="absolute right-2 flex items-center gap-1 pointer-events-none">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">
              /
            </kbd>
          </div>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900/98 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl z-[100] overflow-hidden divide-y divide-slate-800">
          {/* Quick example search chips */}
          <div className="p-2.5 bg-slate-950/60 text-[11px] font-mono text-slate-400">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 font-semibold">
              Suggested Wildlife Reserves:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_SEARCHES.map((name) => {
                const targetArea = MOCK_AREAS.find((a) => a.name === name);
                if (!targetArea) return null;
                const isSelected = selectedArea.id === targetArea.id;
                return (
                  <button
                    key={name}
                    onClick={() => handleSelect(targetArea)}
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-mono transition-colors border',
                      isSelected
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                    )}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 font-mono">
                No reserves found matching &ldquo;{query}&rdquo;
              </div>
            ) : (
              filtered.map((area) => {
                const isCurrent = area.id === selectedArea.id;
                return (
                  <button
                    key={area.id}
                    onClick={() => handleSelect(area)}
                    className={cn(
                      'w-full text-left p-3 hover:bg-slate-800/70 transition-colors flex items-center justify-between gap-3 group',
                      isCurrent && 'bg-emerald-950/30'
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-md bg-slate-800 text-emerald-400 group-hover:bg-emerald-900/60 transition-colors mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <span>{area.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            ({area.country})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">
                          {area.biome}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono text-[10px] flex items-center gap-2">
                      <div>
                        <span className="text-emerald-400 font-bold block">
                          {area.forest_cover_percent}% Cover
                        </span>
                        <span className="text-slate-500">
                          {area.coordinates.lat.toFixed(2)}°, {area.coordinates.lon.toFixed(2)}°
                        </span>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
