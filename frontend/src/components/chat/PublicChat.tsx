'use client';

import React from 'react';
import ChatWidget from '@/components/chat/ChatWidget';
import { PUBLIC_API_BASE, getPublicDemonstrations } from '@/lib/public-api';

async function loadAnalyses() {
  const res = await getPublicDemonstrations();
  return res.items.map((d) => ({ id: d.id, label: `${d.area_name} · ${d.comparison_period.start}` }));
}

async function send(
  analysisId: string,
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  language: string,
  voiceMode?: boolean
) {
  const res = await fetch(`${PUBLIC_API_BASE}/public/chat`, {
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
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? `Chat failed (HTTP ${res.status})`);
  return body;
}

export default function PublicChat() {
  return (
    <ChatWidget
      loadAnalyses={loadAnalyses}
      send={send}
      notice="Public demo data only. Locations are generalised."
    />
  );
}
