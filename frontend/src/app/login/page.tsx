'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldCheck,
  Radio,
  KeyRound,
  Compass,
  Building2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

type Persona = 'ranger' | 'command';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [selectedPersona, setSelectedPersona] = useState<Persona>('ranger');
  const [email, setEmail] = useState('ranger@wildlife.gov');
  const [password, setPassword] = useState('VanyoraRanger#2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePersonaSelect = (persona: Persona) => {
    setSelectedPersona(persona);
    setError(null);
    if (persona === 'ranger') {
      setEmail('ranger@wildlife.gov');
      setPassword('VanyoraRanger#2026');
    } else {
      setEmail('command@vanyora.org');
      setPassword('CentralCommand#99');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen bg-[#04070a] flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-cover bg-center bg-no-repeat font-sans selection:bg-emerald-500 selection:text-slate-950"
      style={{ backgroundImage: "url('/login-bg.png')" }}
    >
      {/* Background Image & Master Cinema Grade Vignette */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none">
        <Image
          src="/login-bg.png"
          alt="Wildlife Telemetry Defense - Lion & Tiger"
          fill
          priority
          unoptimized
          className="object-cover object-center"
        />
        {/* Layered cinematic vignette that preserves feline beauty while focusing attention */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px]" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/45 to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/70" />
      </div>

      {/* Floating Navigation Pill: Return Home */}
      <div className="absolute top-5 left-5 sm:top-7 sm:left-8 z-20">
        <Link
          href="/"
          className="group flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/55 hover:bg-black/85 border border-white/10 hover:border-emerald-500/40 text-slate-300 hover:text-white text-xs font-mono tracking-wide transition-all duration-300 backdrop-blur-xl shadow-xl hover:shadow-emerald-500/10 hover:scale-105"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-emerald-400 group-hover:-translate-x-1 transition-transform duration-300" />
          <span>Return Home</span>
        </Link>
      </div>

      {/* Top-Right Live Sentinel Indicator */}
      <div className="absolute top-5 right-5 sm:top-7 sm:right-8 z-20 hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/55 border border-white/10 backdrop-blur-xl shadow-xl">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <span className="text-[11px] font-mono text-slate-300 tracking-wider font-medium">
          SENTINEL-2 LINK: <span className="text-emerald-400 font-semibold">ACTIVE</span>
        </span>
      </div>

      {/* Main Column Container */}
      <div className="relative z-10 w-full max-w-[430px] -translate-y-3 sm:-translate-y-7">
        {/* Brand Header */}
        <div className="text-center mb-5 sm:mb-6">
          <Link href="/" className="inline-flex flex-col items-center group">
            {/* Logo Badge */}
            <div className="relative mb-3">
              {/* Dual-glow: Amber warmth for Tiger/Lion & Emerald for telemetry */}
              <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/30 via-emerald-500/25 to-amber-500/20 rounded-2xl blur-lg opacity-85 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative p-2.5 rounded-2xl bg-[#090e14]/90 border border-white/20 shadow-2xl backdrop-blur-md transition-transform duration-300 group-hover:scale-105">
                <Image
                  src="/primary logo 1.png"
                  alt="VANYORA Emblem"
                  width={46}
                  height={56}
                  className="h-11 sm:h-12 w-auto object-contain drop-shadow-[0_0_14px_rgba(234,179,8,0.5)]"
                  priority
                />
              </div>
            </div>

            {/* Tactical Status Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 mb-2 shadow-inner">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-[0.22em] text-emerald-300 uppercase">
                Protected Ranger Terminal
              </span>
            </div>

            {/* Title with Titanium Specular Gradient */}
            <h1 className="text-2xl sm:text-3xl font-black tracking-[0.24em] uppercase font-outfit drop-shadow-md bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              VANYORA
            </h1>
            <p className="text-xs text-slate-300/80 mt-1 font-medium tracking-wide max-w-xs">
              Wildlife Habitat Monitoring & Planetary Defense
            </p>
          </Link>
        </div>

        {/* Ambient Backlight Glow behind the card */}
        <div className="relative">
          <div className="absolute -inset-1.5 bg-gradient-to-b from-emerald-500/20 via-amber-500/10 to-emerald-500/10 rounded-[34px] blur-xl opacity-75 pointer-events-none" />

          {/* Master Luxury Glassmorphism Card */}
          <div className="relative rounded-[30px] p-6 sm:p-8 bg-gradient-to-b from-[#101822]/85 via-[#0b1016]/90 to-[#070b0f]/95 backdrop-blur-2xl border border-white/[0.14] shadow-[0_24px_64px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.18)] overflow-hidden">
            {/* Top Hairline Specular Edge */}
            <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent pointer-events-none" />

            {/* Persona Quick Switcher (Senior UX Polish) */}
            <div className="relative z-10 mb-5 p-1 rounded-xl bg-black/45 border border-white/[0.08] grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => handlePersonaSelect('ranger')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-[11px] font-mono font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  selectedPersona === 'ranger'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-[0_2px_12px_rgba(16,185,129,0.4)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Field Ranger</span>
              </button>

              <button
                type="button"
                onClick={() => handlePersonaSelect('command')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-[11px] font-mono font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  selectedPersona === 'command'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-[0_2px_12px_rgba(251,191,36,0.4)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Sanctuary HQ</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
              {/* Email / Ranger Identifier */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 font-mono">
                    Ranger Identity / Email
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400/80 font-medium">gov.in / gov</span>
                </div>

                <div className="group relative flex items-center rounded-xl bg-[#090e14]/80 border border-white/[0.12] hover:border-white/[0.25] focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-500/20 focus-within:bg-[#0c141d] transition-all duration-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                  <div className="pl-3.5 pr-2.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-400 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="ranger@wildlife.gov"
                    className="w-full h-11 pr-3.5 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-medium"
                  />
                </div>
              </div>

              {/* Access Key / Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 font-mono">
                    Access Key / Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('ranger@wildlife.gov');
                      setPassword('VanyoraRanger#2026');
                      setSelectedPersona('ranger');
                    }}
                    className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Reset to Demo</span>
                  </button>
                </div>

                <div className="group relative flex items-center rounded-xl bg-[#090e14]/80 border border-white/[0.12] hover:border-white/[0.25] focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-500/20 focus-within:bg-[#0c141d] transition-all duration-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                  <div className="pl-3.5 pr-2.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-400 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full h-11 pr-11 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-white/5 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Station Persistence Checkbox */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-black/40 accent-emerald-500 cursor-pointer focus:ring-0"
                  />
                  <span className="text-[11.5px] font-medium text-slate-300">Remember Station Terminal</span>
                </label>

                <span className="text-[10px] font-mono text-slate-500">256-Bit Link</span>
              </div>

              {/* Error Message Alert */}
              {error && (
                <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5 shadow-inner animate-in fade-in slide-in-from-top-1 duration-200">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Senior UX High-Impact CTA Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full h-12 rounded-xl mt-2 overflow-hidden bg-gradient-to-r from-emerald-500 via-emerald-400 to-[#10b981] hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_8px_28px_-4px_rgba(16,185,129,0.4)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_12px_36px_-4px_rgba(16,185,129,0.6)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {/* Specular sheen animation */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

                {isLoading ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    <span>Verifying Authorization...</span>
                  </div>
                ) : (
                  <>
                    <span>Authenticate & Enter Terminal</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </>
                )}
              </button>
            </form>

            {/* Card Footer Divider & Agency Registration Link */}
            <div className="mt-6 pt-4 border-t border-white/[0.08] text-center text-xs text-slate-400">
              <span>New station or agency deployment? </span>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors hover:underline ml-1"
              >
                <span>Register Agency</span>
                <ArrowRight className="w-3 h-3 inline-block" />
              </Link>
            </div>
          </div>
        </div>

        {/* Security & Cryptographic Provenance Badge */}
        <div className="flex items-center justify-center gap-2 text-center mt-5 text-[11px] font-mono text-slate-400 select-none">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>Restricted Portal • End-to-End Encrypted Telemetry</span>
        </div>
      </div>
    </div>
  );
}
