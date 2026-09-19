'use client';

import React from 'react';
import ChatWidget from '@/components/chat/ChatWidget';
import api, { API_BASE, tokens } from '@/lib/api';
import { PUBLIC_API_BASE, getPublicDemonstrations } from '@/lib/public-api';

async function loadAnalyses() {
  try {
    const res = await api.analyses.list({});
    const items = (res?.items ?? [])
      .filter((a) => a.status === 'succeeded' || a.status === 'partial')
      .map((a) => ({
        id: a.analysis_id,
        label: `${a.area_name ?? 'Custom AOI'} · ${a.comparison.start}${a.is_curated_demo ? ' · curated' : ''}`,
      }));
    if (items.length > 0) return items;
  } catch {
    /* fallback to public demonstration analyses */
  }

  // Graceful fallback: ensure investigator always has rich demo reserves available
  const demos = await getPublicDemonstrations().catch(() => ({ items: [] }));
  return (demos?.items ?? []).map((d) => ({
    id: d.id,
    label: `${d.area_name} · ${d.comparison_period.start} · curated demo`,
  }));
}

async function send(
  analysisId: string,
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  language: string,
  voiceMode?: boolean
) {
  // First attempt: authenticated workspace endpoint
  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (tokens.access) {
    authHeaders.Authorization = `Bearer ${tokens.access}`;
  }

  let res = await fetch(`${API_BASE}/analyses/${analysisId}/chat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      message,
      conversation_history: history,
      language: language === 'auto' ? undefined : language,
      voice_mode: voiceMode ?? false,
    }),
  });

  // If analysis is a public curated demo not owned by current workspace, fallback to public endpoint
  if (res.status === 404 || res.status === 403) {
    res = await fetch(`${PUBLIC_API_BASE}/public/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analysis_id: analysisId,
        message,
        conversation_history: history,
        language: language === 'auto' ? undefined : language,
        voice_mode: voiceMode ?? false,
      }),
    });
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? `Chat failed (HTTP ${res.status})`);
  return body;
}

export default function AuthChat() {
  return (
    <ChatWidget
      loadAnalyses={loadAnalyses}
      send={send}
      eventHref={(id) => `/hotspots?id=${id}`}
    />
  );
}

