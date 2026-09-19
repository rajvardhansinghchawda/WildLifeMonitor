'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Mic, MicOff, Send, Trash2, Volume2, X } from 'lucide-react';
import ChatMarkdown from '@/components/chat/ChatMarkdown';

export interface ChatAnalysisOption {
  id: string;
  label: string;
}

export interface ChatReply {
  answer: string;
  tool_calls_made: string[];
  grounded: boolean;
}

export type ChatHistory = Array<{ role: 'user' | 'assistant'; content: string }>;

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  meta?: { tools: string[]; grounded: boolean };
}

interface Props {
  loadAnalyses: () => Promise<ChatAnalysisOption[]>;
  /** `language` is 'auto' or a code from LANGUAGES. */
  send: (
    analysisId: string,
    message: string,
    history: ChatHistory,
    language: string
  ) => Promise<ChatReply>;
  title?: string;
  notice?: string;
  /** Where an event ID chip should link to (omit for public mode). */
  eventHref?: (eventId: string) => string;
}

// speech = BCP-47 tag for the browser's speech recognition / synthesis
const LANGUAGES: Array<{ code: string; label: string; speech: string }> = [
  { code: 'auto', label: 'Auto-detect', speech: 'en-IN' },
  { code: 'en', label: 'English', speech: 'en-IN' },
  { code: 'hi', label: 'हिन्दी (Hindi)', speech: 'hi-IN' },
  { code: 'mr', label: 'मराठी (Marathi)', speech: 'mr-IN' },
  { code: 'bn', label: 'বাংলা (Bengali)', speech: 'bn-IN' },
  { code: 'ta', label: 'தமிழ் (Tamil)', speech: 'ta-IN' },
  { code: 'te', label: 'తెలుగు (Telugu)', speech: 'te-IN' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)', speech: 'gu-IN' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)', speech: 'kn-IN' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)', speech: 'pa-IN' },
];

const SUGGESTIONS: Record<string, string[]> = {
  en: ['Summarise this analysis.', 'What are the top 3 events by priority?', 'What does the water layer show?'],
  hi: ['इस विश्लेषण का सारांश दो।', 'प्राथमिकता के अनुसार शीर्ष 3 घटनाएँ बताओ।', 'जल परत क्या दिखाती है?'],
  mr: ['या विश्लेषणाचा सारांश सांगा.', 'प्राधान्यानुसार पहिल्या 3 घटना सांगा.'],
  bn: ['এই বিশ্লেষণের সারসংক্ষেপ দাও।', 'অগ্রাধিকার অনুযায়ী শীর্ষ ৩টি ঘটনা বলো।'],
  ta: ['இந்த பகுப்பாய்வின் சுருக்கம் தரவும்.', 'முன்னுரிமைப்படி முதல் 3 நிகழ்வுகள்?'],
  te: ['ఈ విశ్లేషణ సారాంశం చెప్పండి.', 'ప్రాధాన్యత ప్రకారం టాప్ 3 సంఘటనలు?'],
  gu: ['આ વિશ્લેષણનો સારાંશ આપો.', 'પ્રાથમિકતા મુજબ ટોચની 3 ઘટનાઓ?'],
  kn: ['ಈ ವಿಶ್ಲೇಷಣೆಯ ಸಾರಾಂಶ ನೀಡಿ.', 'ಆದ್ಯತೆಯ ಪ್ರಕಾರ ಮೊದಲ 3 ಘಟನೆಗಳು?'],
  pa: ['ਇਸ ਵਿਸ਼ਲੇਸ਼ਣ ਦਾ ਸਾਰ ਦੱਸੋ।', 'ਤਰਜੀਹ ਅਨੁਸਾਰ ਚੋਟੀ ਦੇ 3 ਇਵੈਂਟ?'],
};

const LANG_KEY = 'ww_chat_lang';

function speechCtor(): any {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function ChatWidget({
  loadAnalyses,
  send,
  title = 'Ask the Habitat',
  notice,
  eventHref,
}: Props) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ChatAnalysisOption[]>([]);
  const [analysisId, setAnalysisId] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [language, setLanguage] = useState('auto');
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [micSupported, setMicSupported] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const recRef = useRef<any>(null);

  useEffect(() => {
    setMicSupported(!!speechCtor());
    try {
      const saved = window.localStorage.getItem(LANG_KEY);
      if (saved && LANGUAGES.some((l) => l.code === saved)) setLanguage(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    if (!open || options.length) return;
    loadAnalyses()
      .then((opts) => {
        setOptions(opts);
        if (opts.length) setAnalysisId(opts[0].id);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Could not load analyses'));
  }, [open, options.length, loadAnalyses]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, busy]);

  const speechTag = LANGUAGES.find((l) => l.code === language)?.speech ?? 'en-IN';

  const ask = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || !analysisId || busy) return;
      const history = turns.map(({ role, content }) => ({ role, content }));
      setTurns((t) => [...t, { role: 'user', content: message }]);
      setInput('');
      setBusy(true);
      try {
        const reply = await send(analysisId, message, history, language);
        setTurns((t) => [
          ...t,
          {
            role: 'assistant',
            content: reply.answer,
            meta: { tools: reply.tool_calls_made, grounded: reply.grounded },
          },
        ]);
      } catch (e) {
        setTurns((t) => [
          ...t,
          { role: 'assistant', content: e instanceof Error ? e.message : 'The assistant is unavailable right now.' },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [analysisId, busy, turns, send, language]
  );

  const changeLanguage = (code: string) => {
    setLanguage(code);
    try {
      window.localStorage.setItem(LANG_KEY, code);
    } catch {
      /* ignore */
    }
  };

  const stopListening = () => {
    recRef.current?.stop();
    setListening(false);
  };

  const startListening = () => {
    const Ctor = speechCtor();
    if (!Ctor) {
      setMicError('Voice input is not supported in this browser. Use Chrome or Edge.');
      return;
    }
    setMicError(null);
    const rec = new Ctor();
    rec.lang = speechTag;
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = '';
    rec.onresult = (ev: any) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setInput((finalText + interim).trim());
    };
    rec.onerror = (ev: any) => {
      setListening(false);
      setMicError(
        ev.error === 'not-allowed'
          ? 'Microphone permission denied. Allow it in the browser address bar.'
          : ev.error === 'no-speech'
          ? 'No speech heard. Tap the mic and try again.'
          : `Voice input error: ${ev.error}`
      );
    };
    rec.onend = () => {
      setListening(false);
      const spoken = finalText.trim();
      if (spoken) void ask(spoken); // transcript is sent as text
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const plain = text.replace(/\*\*|`|#/g, '').replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, '');
    const u = new SpeechSynthesisUtterance(plain);
    u.lang = speechTag;
    window.speechSynthesis.speak(u);
  };

  const suggestions = SUGGESTIONS[language] ?? SUGGESTIONS.en;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open chat assistant"
          className="fixed bottom-5 right-5 z-[1000] flex items-center gap-2 px-4 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xl shadow-emerald-950/60"
        >
          <MessageCircle className="w-4 h-4" />
          {title}
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-[1000] w-[420px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-2.5rem)] flex flex-col rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800">
            <div>
              <p className="text-xs font-semibold text-white font-mono uppercase">{title}</p>
              <p className="text-[10px] text-slate-500">
                Answers come only from this analysis&apos;s data. Candidates, not proof of cause.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {turns.length > 0 && (
                <button
                  onClick={() => setTurns([])}
                  aria-label="Clear conversation"
                  title="Clear conversation"
                  className="text-slate-500 hover:text-white"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-3 py-2 border-b border-slate-800 space-y-1.5">
            <select
              value={analysisId}
              onChange={(e) => {
                setAnalysisId(e.target.value);
                setTurns([]);
              }}
              className="w-full h-8 px-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-200"
            >
              {options.length === 0 && <option value="">No analyses available</option>}
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
              aria-label="Language"
              className="w-full h-8 px-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-200"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  🌐 {l.label}
                </option>
              ))}
            </select>
            {notice && <p className="text-[10px] text-amber-400/80">{notice}</p>}
            {loadError && <p className="text-[10px] text-red-400">{loadError}</p>}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {turns.length === 0 && (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400">
                  Type or tap the mic 🎤 — ask in your language.
                </p>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    disabled={!analysisId}
                    className="block w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-800 text-slate-300 hover:border-emerald-600 disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className={t.role === 'user' ? 'text-right' : ''}>
                <div
                  className={`inline-block max-w-[94%] text-left rounded-lg px-3 py-2 text-xs ${
                    t.role === 'user'
                      ? 'bg-emerald-700/40 text-emerald-50 whitespace-pre-wrap'
                      : 'bg-slate-900 border border-slate-800 text-slate-200'
                  }`}
                >
                  {t.role === 'user' ? t.content : <ChatMarkdown text={t.content} eventHref={eventHref} />}
                </div>
                {t.meta && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-slate-600 font-mono">
                      {t.meta.grounded ? '✓ grounded in analysis data' : 'not grounded'}
                      {t.meta.tools.length ? ` · ${Array.from(new Set(t.meta.tools)).join(', ')}` : ''}
                    </span>
                    <button
                      onClick={() => speak(t.content)}
                      aria-label="Read aloud"
                      title="Read aloud"
                      className="text-slate-500 hover:text-emerald-400"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {busy && <p className="text-[11px] text-slate-500 font-mono animate-pulse">Looking up data…</p>}
            <div ref={endRef} />
          </div>

          {micError && <p className="px-3 pb-1 text-[10px] text-red-400">{micError}</p>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (listening) stopListening();
              void ask(input);
            }}
            className="flex gap-2 p-3 border-t border-slate-800"
          >
            {micSupported && (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                disabled={busy || !analysisId}
                aria-label={listening ? 'Stop listening' : 'Speak your question'}
                title={`Voice input (${speechTag})`}
                className={`h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border text-white disabled:opacity-40 ${
                  listening ? 'bg-red-600 border-red-500 animate-pulse' : 'bg-slate-900 border-slate-700 hover:border-emerald-600'
                }`}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={2000}
              placeholder={listening ? 'Listening…' : 'Ask about this analysis…'}
              className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={busy || !input.trim() || !analysisId}
              className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
