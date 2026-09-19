'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Compass,
  AlertCircle,
} from 'lucide-react';
import { ChatAnalysisOption } from '@/components/chat/ChatWidget';

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: ChatAnalysisOption[];
  activeAnalysisId: string;
  onSelectAnalysis: (id: string) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  send: (
    analysisId: string,
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    language: string,
    voiceMode?: boolean
  ) => Promise<{ answer: string; tool_calls_made?: string[]; grounded?: boolean }>;
}

const LANGUAGES = [
  { code: 'auto', label: 'Auto (Hinglish/English)', speech: 'en-IN' },
  { code: 'hinglish', label: 'Hinglish (Hindi in English)', speech: 'en-IN' },
  { code: 'en', label: 'English', speech: 'en-IN' },
  { code: 'hi', label: 'हिन्दी (Hindi)', speech: 'hi-IN' },
  { code: 'mr', label: 'मराठी (Marathi)', speech: 'mr-IN' },
  { code: 'bn', label: 'বাংলা (Bengali)', speech: 'bn-IN' },
];

function speechCtor(): any {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function VoiceCallModal({
  isOpen,
  onClose,
  options,
  activeAnalysisId,
  onSelectAnalysis,
  language,
  onLanguageChange,
  send,
}: VoiceCallModalProps) {
  // Call state: 'dialing' | 'connected' | 'ended'
  const [callState, setCallState] = useState<'dialing' | 'connected' | 'ended'>('dialing');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [statusText, setStatusText] = useState('Connecting to Habitat Satellite Link...');
  const [userTranscript, setUserTranscript] = useState('');
  const [aiSpokenText, setAiSpokenText] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Audio & Hardware refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const historyRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const ringOscRef = useRef<{ stop: () => void } | null>(null);
  const isBusyRef = useRef<boolean>(false);
  const isAiSpeakingRef = useRef<boolean>(false);
  const isSpeakerMutedRef = useRef<boolean>(false);

  // Keep ref sync
  isAiSpeakingRef.current = isAiSpeaking;
  isSpeakerMutedRef.current = isSpeakerMuted;

  const currentSpeechTag =
    LANGUAGES.find((l) => l.code === language)?.speech ?? 'en-IN';

  // -------------------------------------------------------------
  // Web Audio Telephony Sound Synthesizer (Ringtone, Chime, Beep)
  // -------------------------------------------------------------
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playRingTone = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = 440; // Telephony dual frequency standard
      osc2.frequency.value = 480;

      gain.gain.setValueAtTime(0.04, ctx.currentTime);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      ringOscRef.current = {
        stop: () => {
          try {
            gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
            setTimeout(() => {
              osc1.stop();
              osc2.stop();
              osc1.disconnect();
              osc2.disconnect();
            }, 120);
          } catch {
            /* ignore */
          }
        },
      };
    } catch {
      /* ignore audio context errors */
    }
  }, [getAudioContext]);

  const stopRingTone = useCallback(() => {
    if (ringOscRef.current) {
      ringOscRef.current.stop();
      ringOscRef.current = null;
    }
  }, []);

  const playConnectChime = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.25); // G5

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.46);
    } catch {
      /* ignore */
    }
  }, [getAudioContext]);

  const playEndTone = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(260, now + 0.25);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.31);
    } catch {
      /* ignore */
    }
  }, [getAudioContext]);

  // -------------------------------------------------------------
  // Text-To-Speech Clean Spoken Output (SpeechSynthesis)
  // -------------------------------------------------------------
  const speakSpokenAnswer = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      if (isSpeakerMutedRef.current) return;

      window.speechSynthesis.cancel();

      // Clean conversational text for audio transmission
      const plain = text
        .replace(/\*\*|`|#/g, '')
        .replace(/[-*•]\s+/g, '')
        .replace(/\[[⌖🔥🌿💧🏢]\]/g, '')
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
        .replace(/https?:\/\/\S+/gi, '')
        .trim();

      if (!plain) return;

      setAiSpokenText(plain);
      setIsAiSpeaking(true);
      setStatusText('Ranger Mitra Speaking...');

      const utterance = new SpeechSynthesisUtterance(plain);
      utterance.lang = currentSpeechTag;
      utterance.rate = 1.05; // natural conversational tempo
      utterance.pitch = 1.02;

      // Prefer Indian English / Hindi voice if available
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().includes(currentSpeechTag.toLowerCase().replace('_', '-')) ||
          (currentSpeechTag.startsWith('en') && (v.name.includes('India') || v.name.includes('IN'))) ||
          (currentSpeechTag.startsWith('hi') && v.lang.includes('hi'))
      );
      if (matchedVoice) utterance.voice = matchedVoice;

      utterance.onend = () => {
        setIsAiSpeaking(false);
        setStatusText('Listening to your voice...');
      };

      utterance.onerror = () => {
        setIsAiSpeaking(false);
        setStatusText('Listening to your voice...');
      };

      window.speechSynthesis.speak(utterance);
    },
    [currentSpeechTag]
  );

  // -------------------------------------------------------------
  // Dispatch voice query to backend with voice_mode=True
  // -------------------------------------------------------------
  const handleUserSpokenQuery = useCallback(
    async (spoken: string) => {
      const query = spoken.trim();
      if (!query || !activeAnalysisId || isBusyRef.current) return;

      isBusyRef.current = true;
      setStatusText('Analyzing satellite telemetry...');
      setUserTranscript(query);

      // Add to conversation history
      const prev = historyRef.current;
      historyRef.current = [...prev, { role: 'user', content: query }];

      try {
        const reply = await send(activeAnalysisId, query, prev, language, true);
        const answer = reply.answer || 'No telemetry update received.';
        historyRef.current = [...historyRef.current, { role: 'assistant', content: answer }];
        speakSpokenAnswer(answer);
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : 'Could not fetch telemetry';
        speakSpokenAnswer(`Apologies ranger, ${msg}`);
      } finally {
        isBusyRef.current = false;
      }
    },
    [activeAnalysisId, language, send, speakSpokenAnswer]
  );

  // -------------------------------------------------------------
  // Continuous Speech Recognition (Hands-Free Loop + Barge-In)
  // -------------------------------------------------------------
  const startSpeechRecognition = useCallback(() => {
    const Ctor = speechCtor();
    if (!Ctor) {
      setErrorMsg('Voice speech recognition not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const rec = new Ctor();
      rec.lang = currentSpeechTag;
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (ev: any) => {
        let interim = '';
        let finalChunk = '';

        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          if (res.isFinal) finalChunk += res[0].transcript;
          else interim += res[0].transcript;
        }

        const combined = (finalChunk || interim).trim();
        if (combined) {
          setIsUserSpeaking(true);
          setUserTranscript(combined);

          // BARGE-IN INTERRUPTION: If AI is speaking and user starts talking, interrupt AI immediately!
          if (isAiSpeakingRef.current) {
            window.speechSynthesis.cancel();
            setIsAiSpeaking(false);
          }

          // Reset silence timer on active speech
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

          // Voice Activity Detection (VAD): If user pauses for 1.3s after speaking, dispatch query
          silenceTimerRef.current = setTimeout(() => {
            setIsUserSpeaking(false);
            if (combined.length > 2) {
              void handleUserSpokenQuery(combined);
            }
          }, 1300);
        }
      };

      rec.onerror = (ev: any) => {
        if (ev.error !== 'no-speech') {
          console.warn('Speech recognition warning:', ev.error);
        }
      };

      rec.onend = () => {
        // Automatically restart speech recognition in connected call unless user hung up or muted
        if (callState === 'connected' && !isMuted) {
          try {
            rec.start();
          } catch {
            /* already started */
          }
        }
      };

      recRef.current = rec;
      rec.start();
    } catch (e: any) {
      console.warn('Speech recognition init error:', e);
    }
  }, [currentSpeechTag, callState, isMuted, handleUserSpokenQuery]);

  // -------------------------------------------------------------
  // Microphone Stream & Live Frequency Visualizer (Canvas)
  // -------------------------------------------------------------
  const setupAudioVisualizer = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ctx = getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const renderWave = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const cCtx = canvas.getContext('2d');
        if (!cCtx) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        cCtx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = canvas.width / 24 - 2;
        const centerX = canvas.width / 2;

        for (let i = 0; i < 24; i++) {
          let value = dataArray[i] || 0;

          // If AI is speaking, generate animated harmonic sine pulses
          if (isAiSpeakingRef.current) {
            value = Math.sin(Date.now() / 90 + i) * 60 + 130;
          }

          const barHeight = Math.max(4, (value / 255) * (canvas.height * 0.8));
          const x = centerX + (i % 2 === 0 ? 1 : -1) * Math.floor(i / 2) * (barWidth + 2);
          const y = (canvas.height - barHeight) / 2;

          // Holographic glowing gradient
          const grad = cCtx.createLinearGradient(0, y, 0, y + barHeight);
          if (isAiSpeakingRef.current) {
            grad.addColorStop(0, '#06b6d4'); // Cyan
            grad.addColorStop(1, '#3b82f6'); // Blue
          } else if (isUserSpeaking) {
            grad.addColorStop(0, '#10b981'); // Emerald
            grad.addColorStop(1, '#059669');
          } else {
            grad.addColorStop(0, '#64748b'); // Slate idle
            grad.addColorStop(1, '#334155');
          }

          cCtx.fillStyle = grad;
          cCtx.beginPath();
          cCtx.roundRect(x, y, barWidth, barHeight, 3);
          cCtx.fill();
        }

        animFrameRef.current = requestAnimationFrame(renderWave);
      };

      animFrameRef.current = requestAnimationFrame(renderWave);
    } catch {
      setErrorMsg('Microphone access denied. Please allow microphone in browser.');
    }
  }, [getAudioContext, isUserSpeaking]);

  // -------------------------------------------------------------
  // Call Lifecycle: Start call -> Ringing -> Connect -> Active Loop
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    setCallState('dialing');
    setCallDuration(0);
    setUserTranscript('');
    setAiSpokenText('');
    setStatusText('Dialing Habitat Satellite Link...');
    historyRef.current = [];

    playRingTone();

    // 1.8s realistic telephone connection latency
    const connectTimer = setTimeout(() => {
      stopRingTone();
      playConnectChime();
      setCallState('connected');
      setStatusText('Ranger Mitra Online. Speak freely...');

      void setupAudioVisualizer();
      startSpeechRecognition();

      // Initial friendly voice greeting
      const selectedOption = options.find((o) => o.id === activeAnalysisId);
      const reserveName = selectedOption ? selectedOption.label.split('·')[0].trim() : 'Protected Reserve';
      speakSpokenAnswer(
        `Ranger Mitra online for ${reserveName}. Monitoring active. How can I assist your field investigation today?`
      );

      // Start call timer
      timerRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    }, 1800);

    return () => {
      clearTimeout(connectTimer);
      stopRingTone();
    };
  }, [
    isOpen,
    activeAnalysisId,
    options,
    playRingTone,
    stopRingTone,
    playConnectChime,
    setupAudioVisualizer,
    startSpeechRecognition,
    speakSpokenAnswer,
  ]);

  // -------------------------------------------------------------
  // Clean Hang Up Call
  // -------------------------------------------------------------
  const handleEndCall = useCallback(() => {
    setCallState('ended');
    playEndTone();

    if (timerRef.current) clearInterval(timerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (recRef.current) {
      try {
        recRef.current.stop();
      } catch {
        /* ignore */
      }
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    stopRingTone();

    setTimeout(() => {
      onClose();
    }, 400);
  }, [playEndTone, stopRingTone, onClose]);

  // Format timer MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentReserveLabel =
    options.find((o) => o.id === activeAnalysisId)?.label ?? 'Selected Habitat';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-950/95 shadow-2xl shadow-emerald-950/40 overflow-hidden flex flex-col items-center">
        {/* Top telemetry status ribbon */}
        <div className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono tracking-wider text-emerald-400 uppercase font-semibold">
              Live Satellite Call
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-mono text-slate-300">
              {callState === 'connected' ? formatTime(callDuration) : 'DIALING...'}
            </span>
          </div>
        </div>

        {/* Central Reserve & Hologram Orb */}
        <div className="w-full px-6 pt-8 pb-6 flex flex-col items-center text-center">
          <div className="relative flex items-center justify-center w-36 h-36 mb-6">
            {/* Pulsing ring aura */}
            <div
              className={`absolute inset-0 rounded-full blur-xl transition-all duration-500 ${
                isAiSpeaking
                  ? 'bg-cyan-500/30 scale-125 animate-pulse'
                  : isUserSpeaking
                  ? 'bg-emerald-500/40 scale-125 animate-ping'
                  : 'bg-emerald-600/15 scale-100'
              }`}
            />
            {/* Holographic core */}
            <div
              className={`relative z-10 w-28 h-28 rounded-full border-2 flex items-center justify-center transition-all duration-300 shadow-xl ${
                isAiSpeaking
                  ? 'border-cyan-400 bg-cyan-950/60 shadow-cyan-500/30'
                  : isUserSpeaking
                  ? 'border-emerald-400 bg-emerald-950/70 shadow-emerald-500/40'
                  : 'border-slate-700 bg-slate-900/80 shadow-slate-900/50'
              }`}
            >
              {isAiSpeaking ? (
                <Sparkles className="w-12 h-12 text-cyan-400 animate-bounce" />
              ) : isUserSpeaking ? (
                <Mic className="w-12 h-12 text-emerald-400 animate-pulse" />
              ) : (
                <Compass className="w-12 h-12 text-emerald-500" />
              )}
            </div>
          </div>

          <h3 className="text-lg font-bold text-white tracking-wide">
            {currentReserveLabel.split('·')[0]}
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-mono">{statusText}</p>

          {/* Habitat switcher dropdown for switching reserve during call */}
          <div className="mt-4 w-full max-w-xs flex gap-2">
            <select
              value={activeAnalysisId}
              onChange={(e) => {
                onSelectAnalysis(e.target.value);
                const chosen = options.find((o) => o.id === e.target.value);
                if (chosen) {
                  speakSpokenAnswer(
                    `Switching satellite channel to ${chosen.label.split('·')[0]}. Telemetry loaded.`
                  );
                }
              }}
              className="flex-1 h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  📍 {o.label}
                </option>
              ))}
            </select>
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="h-8 px-2 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  🌐 {l.label.split(' ')[0]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Real-time Dynamic Waveform Canvas */}
        <div className="w-full px-6 flex justify-center py-2">
          <canvas
            ref={canvasRef}
            width={340}
            height={48}
            className="w-full max-w-sm h-12 rounded-xl bg-slate-900/50 border border-slate-800/60"
          />
        </div>

        {/* Live Subtitles HUD */}
        <div className="w-full px-6 py-3 min-h-[90px] max-h-[120px] overflow-y-auto text-center">
          {userTranscript && (
            <p className="text-xs text-emerald-300/90 font-medium mb-1">
              <span className="text-[10px] text-emerald-500 uppercase mr-1">You:</span>
              &ldquo;{userTranscript}&rdquo;
            </p>
          )}
          {aiSpokenText && (
            <p className="text-xs text-cyan-200/90 leading-relaxed">
              <span className="text-[10px] text-cyan-400 uppercase mr-1">Ranger:</span>
              &ldquo;{aiSpokenText}&rdquo;
            </p>
          )}
          {!userTranscript && !aiSpokenText && (
            <p className="text-[11px] text-slate-500 italic">
              Speak naturally into your microphone (e.g., &ldquo;Suno, kitna deforestation hua hai?&rdquo; or &ldquo;How many active fires?&rdquo;)
            </p>
          )}
        </div>

        {errorMsg && (
          <div className="mx-6 mb-2 px-3 py-1.5 rounded-lg bg-red-950/50 border border-red-800 text-[11px] text-red-300 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Telephony Action Buttons */}
        <div className="w-full px-6 py-6 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-center gap-6">
          {/* Mute Mic */}
          <button
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              if (recRef.current) {
                if (next) {
                  try {
                    recRef.current.stop();
                  } catch {}
                  setStatusText('Microphone Muted');
                } else {
                  try {
                    recRef.current.start();
                  } catch {}
                  setStatusText('Listening to your voice...');
                }
              }
            }}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            className={`w-13 h-13 p-3.5 rounded-full border transition-all ${
              isMuted
                ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-emerald-500'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* End Call (Red Hangup) */}
          <button
            onClick={handleEndCall}
            title="End Call"
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-red-950/60 transition-all hover:scale-105"
          >
            <PhoneOff className="w-7 h-7" />
          </button>

          {/* Mute Speaker */}
          <button
            onClick={() => {
              const next = !isSpeakerMuted;
              setIsSpeakerMuted(next);
              if (next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
            }}
            title={isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker'}
            className={`w-13 h-13 p-3.5 rounded-full border transition-all ${
              isSpeakerMuted
                ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-emerald-500'
            }`}
          >
            {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
