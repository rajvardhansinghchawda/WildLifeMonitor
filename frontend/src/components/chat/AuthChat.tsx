'use client';

import React from 'react';
import ChatWidget from '@/components/chat/ChatWidget';
import api, { API_BASE, tokens } from '@/lib/api';

async function loadAnalyses() {
  const res = await api.analyses.list({});
  return res.items
    .filter((a) => a.status === 'succeeded' || a.status === 'partial')
    .map((a) => ({
      id: a.analysis_id,
      label: `${a.area_name ?? 'Custom AOI'} · ${a.comparison.start}${a.is_curated_demo ? ' · curated' : ''}`,
    }));
}

async function send(
  analysisId: string,
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  language: string
) {
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.access ?? ''}`,
    },
    body: JSON.stringify({ message, conversation_history: history, language: language === 'auto' ? undefined : language }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? `Chat failed (HTTP ${res.status})`);
  return body;
}

export default function AuthChat() {
  return <ChatWidget
      loadAnalyses={loadAnalyses}
      send={send}
      eventHref={(id) => `/hotspots?id=${id}`}
    />;
}
