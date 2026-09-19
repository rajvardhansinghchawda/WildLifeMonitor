'use client';

import React from 'react';
import Link from 'next/link';

// Models often emit non-breaking / unicode hyphens inside UUIDs, so accept them and normalise.
const UUID_PART = /[0-9a-fA-F]{8}[-‐-―−][0-9a-fA-F]{4}[-‐-―−][0-9a-fA-F]{4}[-‐-―−][0-9a-fA-F]{4}[-‐-―−][0-9a-fA-F]{12}/;
const INLINE = new RegExp(`(\\*\\*[^*]+\\*\\*|\`[^\`]+\`|${UUID_PART.source})`, 'g');

const normaliseId = (raw: string) => raw.replace(/[‐-―−]/g, '-').toLowerCase();

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
        if (new RegExp(`^${UUID_PART.source}$`).test(part)) {
          const id = normaliseId(part);
          const chip = (
            <span
              title={id}
              className="inline-block px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono text-[10px] align-baseline"
            >
              #{id.slice(0, 8)}
            </span>
          );
          return eventHref ? (
            <Link key={i} href={eventHref(id)} className="hover:opacity-80">
              {chip}
            </Link>
          ) : (
            <React.Fragment key={i}>{chip}</React.Fragment>
          );
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

    // table
    if (isTableRow(line) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      const header = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i++]));
      blocks.push(
        <div key={key++} className="overflow-x-auto my-1.5">
          <table className="text-[11px] border-collapse w-full">
            <thead>
              <tr>
                {header.map((h, c) => (
                  <th key={c} className="text-left px-2 py-1 border-b border-slate-700 text-slate-300 font-semibold">
                    <Inline text={h} eventHref={eventHref} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-slate-800/70">
                  {r.map((c, ci) => (
                    <td key={ci} className="px-2 py-1 align-top">
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
        <p key={key++} className="font-semibold text-white mt-2 mb-0.5">
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
        <Tag key={key++} className={`${ordered ? 'list-decimal' : 'list-disc'} pl-4 my-1 space-y-0.5`}>
          {items.map((it, n) => (
            <li key={n}>
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
      !isTableRow(lines[i]) &&
      !/^\s*#{1,4}\s+/.test(lines[i]) &&
      !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i])
    ) {
      para.push(lines[i++]);
    }
    blocks.push(
      <p key={key++} className="my-1 leading-relaxed">
        <Inline text={para.join(' ')} eventHref={eventHref} />
      </p>
    );
  }

  return <div className="space-y-0.5">{blocks}</div>;
}
