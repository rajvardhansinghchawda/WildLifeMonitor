'use client';

import React from 'react';
import Link from 'next/link';

// Models emit full UUIDs, 8-character hex hashes (#b4adf8ac, [#b4adf8ac]), or markdown links.
const UUID_REGEX = /[0-9a-fA-F]{8}[-‐-―−][0-9a-fA-F]{4}[-‐-―−][0-9a-fA-F]{4}[-‐-―−][0-9a-fA-F]{4}[-‐-―−][0-9a-fA-F]{12}/;
const INLINE = new RegExp(
  `(\\*\\*[^*]+\\*\\*|\`[^\`]+\`|\\[[^\\]]+\\]\\([^)]+\\)|\\[📍?\\s*#?[0-9a-fA-F]{8}\\]|${UUID_REGEX.source}|#[0-9a-fA-F]{8}\\b)`,
  'g'
);

const normaliseId = (raw: string) => raw.replace(/[‐-―−]/g, '-').toLowerCase();

function EventChip({
  id,
  label,
  eventHref,
}: {
  id: string;
  label?: string;
  eventHref?: (id: string) => string;
}) {
  const cleanId = id.replace(/^[📍\s#\[]+|[\]\s]+$/g, '').toLowerCase();
  const shortId = cleanId.slice(0, 8);
  const displayLabel = label ? label.replace(/^[📍\s#\[]+|[\]\s]+$/g, '') : shortId;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Dispatch custom event for any map component listening on the current page
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('vanyora:select-hotspot', {
          detail: { id: cleanId },
        })
      );

      const isHotspots = window.location.pathname.startsWith('/hotspots');
      const isExplore = window.location.pathname.startsWith('/explore');

      if (isHotspots) {
        // On hotspots page: smoothly update query param in URL without full page reload
        const url = new URL(window.location.href);
        url.searchParams.set('id', cleanId);
        window.history.pushState({}, '', url.toString());
      } else if (!isExplore) {
        // On other pages: route to hotspots page with event id
        const targetUrl = eventHref ? eventHref(cleanId) : `/hotspots?id=${cleanId}`;
        window.location.href = targetUrl;
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`Click to view #${shortId} on interactive map & inspect GPS location`}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 my-0.5 mx-0.5 rounded-md bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 font-mono text-[11px] font-medium align-baseline hover:bg-emerald-900 hover:border-emerald-400 hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer group select-none"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="group-hover:underline font-semibold">📍 #{shortId}</span>
      <span className="text-[9px] bg-emerald-900/80 text-emerald-300 px-1 py-0.2 rounded border border-emerald-700/50 opacity-80 group-hover:opacity-100 flex items-center gap-0.5">
        <span>Map</span> ↗
      </span>
    </button>
  );
}

function Inline({ text, eventHref }: { text: string; eventHref?: (id: string) => string }) {
  return (
    <>
      {text.split(INLINE).map((part, i) => {
        if (!part) return null;
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return (
            <strong key={i} className="text-white font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return (
            <code key={i} className="px-1 rounded bg-slate-800 text-emerald-300 text-[11px]">
              {part.slice(1, -1)}
            </code>
          );
        }

        // Markdown links: [Label](url)
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          const [, linkLabel, linkUrl] = linkMatch;
          // Check if link points to an event/hotspot
          const hotspotUrlMatch = linkUrl.match(/\/hotspots\?id=([0-9a-fA-F-]+)/);
          const hexMatch = linkLabel.match(/([0-9a-fA-F]{8})/);
          if (hotspotUrlMatch) {
            return <EventChip key={i} id={hotspotUrlMatch[1]} label={linkLabel} eventHref={eventHref} />;
          }
          if (hexMatch) {
            return <EventChip key={i} id={hexMatch[1]} label={linkLabel} eventHref={eventHref} />;
          }
          return (
            <a
              key={i}
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline"
            >
              {linkLabel}
            </a>
          );
        }

        // Bracketed Event ID: [#b4adf8ac] or [b4adf8ac]
        const bracketMatch = part.match(/^\[📍?\s*#?([0-9a-fA-F]{8})\]$/);
        if (bracketMatch) {
          return <EventChip key={i} id={bracketMatch[1]} eventHref={eventHref} />;
        }

        // Standalone Hash ID: #b4adf8ac
        const hashMatch = part.match(/^#([0-9a-fA-F]{8})$/);
        if (hashMatch) {
          return <EventChip key={i} id={hashMatch[1]} eventHref={eventHref} />;
        }

        // Full UUID
        if (new RegExp(`^${UUID_REGEX.source}$`).test(part)) {
          const id = normaliseId(part);
          return <EventChip key={i} id={id} eventHref={eventHref} />;
        }

        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isSeparator = (l: string) => /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(l) && l.includes('-');
const cells = (l: string) =>
  l
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());

export default function ChatMarkdown({
  text,
  eventHref,
}: {
  text: string;
  eventHref?: (id: string) => string;
}) {
  const lines = text.replace(/\r/g, '').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // blockquote
    if (line.trim().startsWith('>')) {
      const quotes: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quotes.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push(
        <div
          key={key++}
          className="my-2 p-2.5 rounded-lg bg-amber-950/20 border-l-2 border-amber-500 text-[11px] text-amber-200/90 space-y-1"
        >
          <Inline text={quotes.join(' ')} eventHref={eventHref} />
        </div>
      );
      continue;
    }

    // table
    if (isTableRow(line) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      const header = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i++]));
      blocks.push(
        <div key={key++} className="overflow-x-auto my-2 rounded-lg border border-slate-800 bg-slate-950/60 shadow-xs">
          <table className="text-[11px] border-collapse w-full">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800">
                {header.map((h, c) => (
                  <th key={c} className="text-left px-2.5 py-1.5 text-emerald-400 font-semibold uppercase tracking-wider text-[10px]">
                    <Inline text={h} eventHref={eventHref} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rows.map((r, ri) => (
                <tr key={ri} className="even:bg-slate-900/30 hover:bg-slate-800/40 transition-colors">
                  {r.map((c, ci) => (
                    <td key={ci} className="px-2.5 py-1.5 align-top text-slate-200">
                      <Inline text={c} eventHref={eventHref} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // heading
    const h = line.match(/^\s*#{1,4}\s+(.*)$/);
    if (h) {
      blocks.push(
        <p key={key++} className="font-semibold text-emerald-300 text-xs mt-2.5 mb-1 flex items-center gap-1.5">
          <Inline text={h[1]} eventHref={eventHref} />
        </p>
      );
      i++;
      continue;
    }

    // list
    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, ''));
        i++;
      }
      const Tag = ordered ? 'ol' : 'ul';
      blocks.push(
        <Tag key={key++} className={`${ordered ? 'list-decimal' : 'list-disc'} pl-4 my-1.5 space-y-1 text-slate-200`}>
          {items.map((it, n) => (
            <li key={n} className="leading-relaxed">
              <Inline text={it} eventHref={eventHref} />
            </li>
          ))}
        </Tag>
      );
      continue;
    }

    // paragraph (merge consecutive plain lines)
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('>') &&
      !isTableRow(lines[i]) &&
      !/^\s*#{1,4}\s+/.test(lines[i]) &&
      !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i])
    ) {
      para.push(lines[i++]);
    }
    blocks.push(
      <p key={key++} className="my-1 leading-relaxed text-slate-200">
        <Inline text={para.join(' ')} eventHref={eventHref} />
      </p>
    );
  }

  return <div className="space-y-0.5 text-xs">{blocks}</div>;
}
