'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  MessageCircle,
  Mic,
  MicOff,
  PhoneCall,
  Send,
  Trash2,
  Volume2,
  X,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Sparkles,
  TreePine,
  Droplets,
  Activity,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import ChatMarkdown from '@/components/chat/ChatMarkdown';
import VoiceCallModal from '@/components/chat/VoiceCallModal';

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
    language: string,
    voiceMode?: boolean
  ) => Promise<ChatReply>;
  title?: string;
  notice?: string;
  /** Where an event ID chip should link to (omit for public mode). */
  eventHref?: (eventId: string) => string;
}

// speech = BCP-47 tag for the browser's speech recognition / synthesis
const LANGUAGES: Array<{ code: string; label: string; speech: string }> = [
  { code: 'auto', label: 'Auto-detect (Hinglish/English)', speech: 'en-IN' },
  { code: 'hinglish', label: 'Hinglish (Hindi in English letters)', speech: 'en-IN' },
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

const QUICK_TOPICS = [
  { label: '🌲 Forest Loss', query: 'Is reserve me ped kitne kate hain aur forest loss kahan hua hai? Hectares aur coordinates batao.' },
  { label: '💧 Water Bodies', query: 'Paani ke talaabo aur water bodies me kya badlav aaya hai? Drying ya expansion batao.' },
  { label: '📊 Health Score', query: 'Overall reserve ka health profile, health index (0-100) aur precomputed statistics batao.' },
  { label: '📍 High-Risk GPS', query: 'Top urgent high-priority hotspots aur unke GPS coordinates batao field patrol ke liye.' },
  { label: '🇮🇳 Hinglish Mode', query: 'Is reserve ka summary saral Hinglish me samjhao.' },
];

const SUGGESTIONS: Record<string, string[]> = {
  en: [
    'Summarise forest cover & canopy loss in this reserve.',
    'What are the top 3 high-priority disturbance events?',
    'What does the water bodies dynamics layer show?',
  ],
  hinglish: [
    'Is reserve me ped kitne kate hain aur canopy kahan kam hui?',
    'Paani ke talaabo aur water bodies me kya badlaav aaya hai?',
    'Top priority ke urgent hotspots kaunse hain?',
    'Reserve ka overall habitat health score kaisa hai?',
  ],
  hi: [
    'इस संरक्षित क्षेत्र में वन आवरण और वृक्ष कटाई का सारांश दो।',
    'जल स्रोतों और तालाबों में क्या बदलाव हुआ है?',
    'प्राथमिकता के अनुसार शीर्ष 3 संवेदनशील स्थान बताओ।',
  ],
  mr: ['या अभयारण्याचा सारांश आणि झाडे तोडण्याचे प्रमाण सांगा.', 'प्राधान्यानुसार पहिल्या ३ घटना सांगा.'],
  bn: ['এই বনাঞ্চলের ক্যানোপি ক্ষয় এবং জলের উৎসের সারসংক্ষেপ দাও।', 'শীর্ষ ৩টি ঘটনা বলো।'],
  ta: ['இந்த காப்பகத்தின் மரங்கள் இழப்பு மற்றும் நீர்நிலைகள் சுருக்கம் தருக.', 'முக்கிய 3 நிகழ்வுகள்?'],
  te: ['ఈ అభయారణ్యంలో చెట్ల నష్టం మరియు నీటి వనరుల మార్పుల సారాంశం చెప్పండి.'],
  gu: ['આ અભયારણ્યમાં વનસ્પતિ નુકસાન અને જળ સ્ત્રોતોનો સારાંશ આપો.'],
  kn: ['ಈ ಅರಣ್ಯ ಪ್ರದೇಶದ ಸಸ್ಯವರ್ಗದ ನಷ್ಟ ಮತ್ತು ಜಲಮೂಲಗಳ ಬದಲಾವಣೆಗಳ ಸಾರಾಂಶ ನೀಡಿ.'],
  pa: ['ਇਸ ਰਿਜ਼ਰਵ ਵਿੱਚ ਜੰਗਲੀ ਕਟਾਈ ਅਤੇ ਪਾਣੀ ਦੇ ਸਰੋਤਾਂ ਦਾ ਸਾਰ ਦੱਸੋ।'],
};

const LANG_KEY = 'ww_chat_lang';

function speechCtor(): any {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// Feature flag: Temporarily hide Voice Calling Agent UI across the frontend
const SHOW_VOICE_CALLING_AGENT = false;

export default function ChatWidget({
  loadAnalyses,
  send,
  title = 'Ask the Habitat',
  notice,
  eventHref,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCallOpen, setIsCallOpen] = useState(false);
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
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const recRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setMicSupported(!!speechCtor());
    try {
      const saved = window.localStorage.getItem(LANG_KEY);
      if (saved && LANGUAGES.some((l) => l.code === saved)) setLanguage(saved);
    } catch {
      /* storage unavailable */
    }

    const handleVoiceCallTrigger = () => {
      if (!SHOW_VOICE_CALLING_AGENT) return;
      setOpen(false);
      setIsCallOpen(true);
    };
    window.addEventListener('open-voice-call', handleVoiceCallTrigger);
    return () => window.removeEventListener('open-voice-call', handleVoiceCallTrigger);
  }, []);

  useEffect(() => {
    if ((!open && !isCallOpen) || options.length) return;
    loadAnalyses()
      .then((opts) => {
        setOptions(opts);
        if (opts.length && !analysisId) setAnalysisId(opts[0].id);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Could not load analyses'));
  }, [open, isCallOpen, options.length, loadAnalyses, analysisId]);

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
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
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
      if (spoken) void ask(spoken);
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

  const copyText = (idx: number, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (listening) stopListening();
      void ask(input);
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const selectedOption = options.find((o) => o.id === analysisId);
  const reserveLabel = selectedOption?.label?.split('·')[0]?.trim() || 'Select Reserve';
  const observationPeriod = selectedOption?.label?.split('·')[1]?.trim() || '';
  const suggestions = SUGGESTIONS[language] ?? SUGGESTIONS.en;

  return (
    <>
      {!open && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9990] flex items-center gap-2">
          {/* Real-time Voice Call Button (Feature flag guarded) */}
          {SHOW_VOICE_CALLING_AGENT && (
            <button
              onClick={() => setIsCallOpen(true)}
              aria-label="Call Habitat AI Ranger"
              className="group relative flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-xl shadow-emerald-950/70 transition-all hover:scale-105 active:scale-95 border border-emerald-400/40"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
              </span>
              <PhoneCall className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
              <span className="tracking-wide">Call AI Ranger</span>
            </button>
          )}

          {/* Text Chat Button with subtle glowing pulse */}
          <button
            onClick={() => setOpen(true)}
            aria-label="Open Habitat AI Assistant"
            className="group flex items-center gap-2.5 px-4 py-3 rounded-full bg-slate-900/95 hover:bg-slate-800 text-slate-100 hover:text-white text-xs font-semibold shadow-2xl shadow-emerald-950/40 transition-all hover:scale-105 active:scale-95 border border-emerald-500/30 backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <MessageCircle className="w-4 h-4 text-emerald-400 group-hover:rotate-6 transition-transform" />
            <span className="font-medium tracking-wide">{title}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-600/40 text-[9px] font-mono text-emerald-300">
              AI
            </span>
          </button>
        </div>
      )}

      {open && (
        <div
          className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9990] flex flex-col rounded-2xl border border-slate-700/80 bg-slate-950/95 shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-all ${
            isExpanded
              ? 'w-[780px] max-w-[calc(100vw-2rem)] h-[84vh] max-h-[850px]'
              : 'w-[440px] max-w-[calc(100vw-1.5rem)] h-[620px] max-h-[calc(100vh-3.5rem)]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800/80 bg-slate-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <TreePine className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-semibold text-white tracking-wide">{title}</h3>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 border border-emerald-700/60 text-[9px] text-emerald-400 font-mono">
                    Grounded AI
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-[260px]">
                  Real satellite telemetry · Zero hallucinations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {SHOW_VOICE_CALLING_AGENT && (
                <button
                  onClick={() => {
                    setOpen(false);
                    setIsCallOpen(true);
                  }}
                  aria-label="Switch to Voice Call"
                  title="Switch to Voice Call with AI Ranger"
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-[10px] font-medium transition-colors"
                >
                  <PhoneCall className="w-3 h-3 animate-pulse text-emerald-400" />
                  <span>Call</span>
                </button>
              )}

              {/* Expand / Minimize Toggle */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={isExpanded ? 'Collapse drawer' : 'Expand drawer'}
                title={isExpanded ? 'Collapse drawer' : 'Expand full view'}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              {turns.length > 0 && (
                <button
                  onClick={() => setTurns([])}
                  aria-label="Clear conversation"
                  title="Clear conversation"
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Reserve Context & Language Selector Banner */}
          <div className="px-3 py-2 border-b border-slate-800/80 bg-slate-900/30 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <label htmlFor="chat-analysis-selector" className="sr-only">
                  Select monitored reserve
                </label>
                <select
                  id="chat-analysis-selector"
                  name="chat_analysis_selector"
                  aria-label="Select monitored reserve for chat context"
                  value={analysisId}
                  onChange={(e) => {
                    setAnalysisId(e.target.value);
                    setTurns([]);
                  }}
                  className="w-full h-7 px-2 rounded-md bg-slate-900 border border-slate-700/60 text-[11px] font-medium text-slate-200 focus:outline-none focus:border-emerald-500 truncate"
                >
                  {options.length === 0 && <option value="">No completed analyses available</option>}
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      🌿 {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-36 shrink-0">
                <label htmlFor="chat-language-selector" className="sr-only">
                  Language selection
                </label>
                <select
                  id="chat-language-selector"
                  name="chat_language_selector"
                  value={language}
                  onChange={(e) => changeLanguage(e.target.value)}
                  aria-label="Language selection"
                  className="w-full h-7 px-2 rounded-md bg-slate-900 border border-slate-700/60 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500 truncate"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      🌐 {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Reserve Status Pill */}
            {selectedOption && (
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="font-medium text-slate-300">{reserveLabel}</span>
                  {observationPeriod && <span>· {observationPeriod}</span>}
                </div>
                <span className="font-mono text-emerald-400 text-[9px]">Live Grounding Active</span>
              </div>
            )}

            {notice && <p className="text-[10px] text-amber-400/80 px-1">{notice}</p>}
            {loadError && <p className="text-[10px] text-red-400 px-1">{loadError}</p>}
          </div>

          {/* Message Turns Scroll Area */}
          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3.5 scroll-smooth">
            {options.length === 0 && !busy && (
              <div className="p-3.5 bg-amber-950/20 border border-amber-800/40 rounded-xl text-xs text-amber-300 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5">
                  <span>ℹ️</span> No monitored reserve selected
                </p>
                <p className="text-[11px] text-amber-400/80 leading-relaxed">
                  Please select a reserve with satellite data (e.g. Jim Corbett, Pench, Sundarbans) or click &quot;Run Analysis&quot; on the dashboard to compute satellite metrics.
                </p>
              </div>
            )}

            {turns.length === 0 && options.length > 0 && (
              <div className="space-y-3 my-2">
                <div className="p-3 rounded-xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 text-xs text-slate-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Welcome to Habitat AI</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Ask any question in **Hinglish, Hindi, or English**. I provide 100% grounded answers directly from Sentinel-2 and Earth Engine satellite telemetry for **{reserveLabel}**.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400 px-1">
                    Suggested Questions:
                  </p>
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      disabled={!analysisId}
                      className="block w-full text-left text-xs px-3 py-2 rounded-lg border border-slate-800/80 bg-slate-900/40 text-slate-300 hover:border-emerald-600/60 hover:bg-slate-800/60 hover:text-white disabled:opacity-40 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {turns.map((t, i) => (
              <div key={i} className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[94%] rounded-xl px-3.5 py-2.5 text-xs ${
                    t.role === 'user'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md'
                      : 'bg-slate-900/90 border border-slate-800/80 text-slate-200 shadow-sm'
                  }`}
                >
                  {t.role === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{t.content}</p>
                  ) : (
                    <ChatMarkdown text={t.content} eventHref={eventHref} />
                  )}
                </div>

                {/* Assistant Metadata & Action Toolbar */}
                {t.role === 'assistant' && (
                  <div className="flex items-center gap-2 mt-1 px-1">
                    {t.meta && (
                      <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1.5">
                        <span className={t.meta.grounded ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                          {t.meta.grounded ? '✓' : 'ℹ'}
                        </span>
                        <span className={t.meta.grounded ? 'text-emerald-400/90' : 'text-slate-400'}>
                          {t.meta.grounded ? 'grounded in telemetry' : 'general LLM context (not in database)'}
                        </span>
                        {t.meta.tools.length > 0 && (
                          <span className="text-slate-400">
                            · {Array.from(new Set(t.meta.tools)).map(tn => tn.replace('get_', '')).join(', ')}
                          </span>
                        )}
                      </span>
                    )}

                    <div className="flex items-center gap-1 ml-auto">
                      {/* Copy message button */}
                      <button
                        onClick={() => copyText(i, t.content)}
                        aria-label="Copy response"
                        title="Copy response"
                        className="p-1 rounded text-slate-500 hover:text-emerald-400 transition-colors"
                      >
                        {copiedIdx === i ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>

                      {/* Read aloud button */}
                      <button
                        onClick={() => speak(t.content)}
                        aria-label="Read aloud"
                        title="Read aloud"
                        className="p-1 rounded text-slate-500 hover:text-emerald-400 transition-colors"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Dynamic Telemetry Loading Indicator */}
            {busy && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-950/30 border border-emerald-800/30 text-emerald-300 text-xs animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="font-mono text-[11px]">Scanning Sentinel-2 telemetry & water dynamics…</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick-Action Topic Chips Bar (Persistent above input) */}
          <div className="px-3 py-1.5 border-t border-slate-800/80 bg-slate-900/40 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
            {QUICK_TOPICS.map((topic) => (
              <button
                key={topic.label}
                onClick={() => ask(topic.query)}
                disabled={busy || !analysisId}
                className="shrink-0 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-emerald-600/20 border border-slate-700/60 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 text-[10px] font-medium transition-all disabled:opacity-40"
              >
                {topic.label}
              </button>
            ))}
          </div>

          {micError && <p className="px-3.5 pb-1 text-[10px] text-red-400">{micError}</p>}

          {/* Input Form with Auto-resizing Textarea */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (listening) stopListening();
              void ask(input);
            }}
            className="flex items-end gap-2 p-3 border-t border-slate-800/80 bg-slate-950"
          >
            {micSupported && (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                disabled={busy || !analysisId}
                aria-label={listening ? 'Stop listening' : 'Speak your question'}
                title={`Voice input (${speechTag})`}
                className={`h-9 w-9 shrink-0 flex items-center justify-center rounded-xl border text-white disabled:opacity-40 transition-all ${
                  listening
                    ? 'bg-red-600 border-red-500 animate-pulse shadow-md shadow-red-950'
                    : 'bg-slate-900 border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-white'
                }`}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            <div className="flex-1 relative min-w-0">
              <label htmlFor="chat-user-message-textarea" className="sr-only">
                Ask about this reserve or analysis
              </label>
              <textarea
                id="chat-user-message-textarea"
                ref={textareaRef}
                rows={1}
                name="chat_message"
                aria-label={listening ? 'Listening to voice input' : 'Ask about this analysis'}
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                maxLength={2000}
                placeholder={listening ? 'Listening to speech…' : 'Ask anything in Hinglish, Hindi, or English… (Shift+Enter for newline)'}
                className="w-full resize-none min-h-[38px] max-h-[120px] py-2 px-3 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={busy || !input.trim() || !analysisId}
              className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-all shadow-md shadow-emerald-950 hover:scale-105 active:scale-95"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Real-time Voice Call Modal (Feature flag guarded) */}
      {SHOW_VOICE_CALLING_AGENT && (
        <VoiceCallModal
          isOpen={isCallOpen}
          onClose={() => setIsCallOpen(false)}
          options={options}
          activeAnalysisId={analysisId}
          onSelectAnalysis={setAnalysisId}
          language={language}
          onLanguageChange={changeLanguage}
          send={send}
        />
      )}
    </>
  );
}
