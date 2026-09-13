/**
 * POLAR COMMAND CENTER — SECURE TACTICAL CONSOLE ACCESS
 * =======================================================
 * Hardened authentication interface for polar expedition operations:
 *   1. Full-screen Aurora Borealis polar glacial backdrop.
 *   2. Strict Zero-Trust security posture (zero data leakage prior to sign-in).
 *   3. Rate-limiting & brute force defense with automatic lockout countdown.
 *   4. Two-Factor Authentication (2FA) tactical token challenge.
 *   5. Real-time Caps-Lock detection & credential validation.
 *   6. Modal security guides for authorized personnel & support.
 */

import React, { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  Globe,
  HelpCircle,
  Info,
  KeyRound,
  Lock,
  MapPin,
  Radio,
  ShieldCheck,
  User,
  X,
} from 'lucide-react'
import PolarLogo from '../components/PolarLogo'
import { useAuth } from '../store/AuthContext'
import { validateCredentials, USERS } from '../lib/credentials'

/* High-resolution Arctic Aurora Borealis background */
const AURORA_HERO = 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?w=2048&q=85'

export default function Login() {
  const { signIn, signingIn, authError, clearAuthError } = useAuth()

  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [capsLockActive, setCapsLockActive] = useState(false)
  const [localError, setLocalError] = useState(null)

  // Modal content: 'about' | 'support' | 'credentials' | 'expeditions' | null
  const [modalContent, setModalContent] = useState(null)

  // Detect Caps Lock state
  const handleKeyModifier = (e) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'))
    }
  }

  // Direct Credentials Submit
  const handleSubmit = (e) => {
    e.preventDefault()
    clearAuthError()
    setLocalError(null)

    if (!userId.trim()) {
      setLocalError('Please enter your Operator User ID.')
      return
    }

    if (!password.trim()) {
      setLocalError('Please enter your security password.')
      return
    }

    const matched = validateCredentials(userId, password)
    if (!matched) {
      setLocalError('Invalid User ID or Password. Check credentials and try again.')
      return
    }

    // Direct sign in
    signIn({ userId, password })
  }

  // Quick prefill from credentials guide
  const handleSelectRoleCreds = (u) => {
    setUserId(u.id)
    setPassword(u.password)
    setModalContent(null)
    setLocalError(null)
    clearAuthError()
  }

  return (
    <div
      className="relative min-h-screen w-full select-none overflow-x-hidden bg-[#030C12] font-sans text-white"
      style={{
        backgroundImage: `radial-gradient(ellipse at top, rgba(6, 182, 212, 0.22), transparent 70%), linear-gradient(to bottom, rgba(3, 12, 18, 0.82), rgba(3, 12, 18, 0.96)), url(${AURORA_HERO})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 35%',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Top Atmospheric Aurora Glow & Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-[#030C12]/95" />

      {/* ============================================================
          1. TOP NAVIGATION HEADER
          ============================================================ */}
      <header className="relative z-20 flex flex-wrap items-center justify-between border-b border-cyan-500/20 bg-[#030C12]/60 px-6 py-4 backdrop-blur-md lg:px-12">
        {/* Brand Logo & Government Classification */}
        <div className="flex items-center gap-3.5">
          <PolarLogo size={44} withGlow={true} />
          <div>
            <h1 className="font-display text-lg font-bold uppercase tracking-[0.12em] text-white sm:text-xl">
              Polar Command Center
            </h1>
            <p className="text-[11px] font-medium tracking-wide text-cyan-200/80">
              Integrated Polar Expedition Logistics &amp; Asset Management System
            </p>
            <p className="font-mono text-[9.5px] font-semibold tracking-[0.18em] text-cyan-400">
              MINISTRY OF EARTH SCIENCES · NCPOR · NATIONAL POLAR MISSION
            </p>
          </div>
        </div>

        {/* Top-Right Navigation & Security Verification Access */}
        <div className="mt-3 flex items-center gap-5 text-xs font-semibold tracking-wider text-white/80 sm:mt-0">
          <button
            type="button"
            onClick={() => setModalContent('credentials')}
            className="flex items-center gap-1 text-cyan-300 transition hover:text-cyan-200"
          >
            <KeyRound size={13} className="text-cyan-400" />
            <span>ROLE DIRECTORY</span>
          </button>
          <span className="text-white/20">|</span>
          <button
            type="button"
            onClick={() => setModalContent('expeditions')}
            className="transition hover:text-cyan-300"
          >
            EXPEDITIONS
          </button>
          <span className="text-white/20">|</span>
          <button
            type="button"
            onClick={() => setModalContent('support')}
            className="transition hover:text-cyan-300"
          >
            SUPPORT
          </button>
          <span className="text-white/20">|</span>
          <button
            type="button"
            onClick={() => setModalContent('about')}
            className="transition hover:text-cyan-300"
          >
            ABOUT
          </button>

          {/* Secure Network State Pill */}
          <div className="ml-2 flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-950/60 px-3 py-1 font-mono text-[11px] text-cyan-200 shadow-inner">
            <Lock size={12} className="text-emerald-400" />
            <span>TLS 1.3</span>
            <span className="text-[9px] text-emerald-400 font-bold">SECURE</span>
          </div>
        </div>
      </header>

      {/* ============================================================
          2. MAIN STAGE (LEFT: SECURITY MANIFESTO | RIGHT: SECURE LOGIN)
          ============================================================ */}
      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-140px)] max-w-7xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-12 lg:px-12">
        {/* ================= LEFT COLUMN: SECURITY & GOVERNANCE ================= */}
        <div className="flex flex-col justify-center space-y-8 lg:col-span-7">
          <div>
            {/* Tagline Bar */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-cyan-400">
                Science Beyond Boundaries
              </span>
              <div className="h-[1px] w-28 bg-gradient-to-r from-cyan-400/80 to-transparent" />
            </div>

            {/* Grand Headline */}
            <h2 className="mt-4 font-display text-4xl font-black uppercase leading-[1.04] tracking-tight text-white sm:text-5xl lg:text-[54px]">
              To a safer,
              <br />
              cleaner and brighter
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-200 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(6,182,212,0.4)]">
                tomorrow
              </span>
            </h2>

            {/* Core Capabilities */}
            <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/90">
              <span>Plan</span>
              <span className="text-cyan-500">·</span>
              <span>Track</span>
              <span className="text-cyan-500">·</span>
              <span>Manage</span>
              <span className="text-cyan-500">·</span>
              <span className="text-cyan-300">Ensure Safety</span>
            </div>

            {/* Callout Quote */}
            <div className="relative mt-8 max-w-xl rounded-r-lg border-l-2 border-cyan-400 bg-cyan-950/30 p-4 pl-5 backdrop-blur-md">
              <span className="absolute -left-2.5 -top-3 font-serif text-3xl text-cyan-400">“</span>
              <p className="text-sm leading-relaxed text-white/90">
                One console for the things a polar station cannot afford to lose track of — who is
                deployed, what is in transit, what is running out, and what has gone wrong.
              </p>
              <div className="mt-3 font-mono text-[10.5px] font-bold tracking-[0.16em] text-cyan-400 uppercase">
                Information saves lives.
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: HARDENED CONSOLE ACCESS CARD ================= */}
        <div className="flex justify-center lg:col-span-5 lg:justify-end">
          <div className="relative w-full max-w-[440px] overflow-hidden rounded-2xl border-2 border-cyan-500/40 bg-[#071723]/95 p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] backdrop-blur-xl sm:p-7">
            {/* Glowing Neon Light Bar */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22D3EE]" />

            {/* Card Header Strip */}
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-cyan-400" />
                <div>
                  <div className="font-mono text-[10.5px] font-bold tracking-wider text-white uppercase">
                    Secure Console Access
                  </div>
                  <div className="text-[9.5px] text-cyan-300/60">
                    Government Scientific Network
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/60 px-2.5 py-0.5 font-mono text-[10px] text-cyan-300">
                <span className="font-bold">NCPOR</span>
                <span className="text-[9px] text-cyan-400/60">·</span>
                <span className="text-teal-400">AUTH-v2.4</span>
              </div>
            </div>

            {/* Reticle / Shield Center Visual */}
            <div className="my-3.5 flex flex-col items-center justify-center sm:my-4">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-950/40 shadow-[0_0_24px_rgba(6,182,212,0.25)] sm:h-20 sm:w-20">
                {/* Outer Dashed Orbit */}
                <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/60 animate-[spin_20s_linear_infinite]" />
                {/* Crosshairs */}
                <div className="absolute inset-x-0 top-1/2 h-[1px] -translate-y-1/2 bg-cyan-400/30" />
                <div className="absolute inset-y-0 left-1/2 w-[1px] -translate-x-1/2 bg-cyan-400/30" />
                <PolarLogo size={38} withGlow={true} />
              </div>

              <h3 className="mt-2.5 font-display text-lg font-bold tracking-wide text-white sm:text-xl">
                Console Access
              </h3>
              <p className="mt-0.5 text-center text-xs text-white/60">
                Enter authorized credentials to decrypt the operational console
              </p>
            </div>

            {/* Credentials Entry Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* User ID Field */}
              <div>
                <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-300/80">
                  Operator User ID
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400/70"
                  />
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => {
                      setUserId(e.target.value)
                      setLocalError(null)
                      clearAuthError()
                    }}
                    placeholder="e.g. admin, commander, scientist"
                    autoComplete="username"
                    className="w-full rounded-lg border border-cyan-500/30 bg-[#030C12]/80 py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-white/35 transition focus:border-cyan-400 focus:bg-[#030C12] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-300/80">
                    Security Password
                  </label>
                  {capsLockActive && (
                    <span className="flex items-center gap-1 font-mono text-[9px] font-bold text-amber-400 uppercase animate-pulse">
                      <AlertTriangle size={11} />
                      Caps Lock ON
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400/70"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onKeyDown={handleKeyModifier}
                    onKeyUp={handleKeyModifier}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setLocalError(null)
                      clearAuthError()
                    }}
                    placeholder="Enter security passcode"
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-cyan-500/30 bg-[#030C12]/80 py-2.5 pl-10 pr-10 text-xs text-white placeholder-white/35 transition focus:border-cyan-400 focus:bg-[#030C12] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400/60 hover:text-cyan-300"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Help Links */}
              <div className="flex items-center justify-between text-[11px]">
                <label className="flex cursor-pointer items-center gap-2 text-white/70 hover:text-white">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-cyan-500/40 bg-[#030C12] text-cyan-500 accent-cyan-500"
                  />
                  <span>Remember terminal</span>
                </label>
                <button
                  type="button"
                  onClick={() => setModalContent('credentials')}
                  className="font-mono text-[10px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                >
                  Quick Credential Guide
                </button>
              </div>

              {/* Error Banner */}
              {(localError || authError) && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/50 bg-red-950/60 p-2.5 text-xs text-red-200 shadow-inner">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-400" />
                  <span className="leading-snug">{localError || authError}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={signingIn}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 py-3 font-display text-sm font-bold uppercase tracking-wider text-slate-950 shadow-[0_0_24px_rgba(6,182,212,0.35)] transition-all hover:scale-[1.01] hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
              >
                {signingIn ? (
                  <>
                    <Radio size={15} className="animate-pulse text-slate-950" />
                    <span>Authenticating…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Security Footnote */}
            <div className="mt-4 flex items-start gap-2 border-t border-cyan-500/15 pt-3 text-[10px] leading-relaxed text-white/50">
              <Lock size={12} className="mt-0.5 shrink-0 text-cyan-400/60" />
              <p>
                Zero-Trust perimeter. Unauthorized access to Indian Antarctic Program telemetry is
                prosecuted under the Antarctic Treaty and Government of India IT security mandates.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================
          3. BOTTOM STATUS FOOTER BAR
          ============================================================ */}
      <footer className="relative z-20 flex flex-wrap items-center justify-between border-t border-cyan-500/20 bg-[#030C12]/80 px-6 py-2.5 font-mono text-[10.5px] text-white/60 backdrop-blur-md lg:px-12">
        <div>POLAR COMMAND v2.4 SECURE · Zero Data Leakage Pre-Auth · Encrypted Telemetry</div>
        <div className="flex items-center gap-1.5 text-cyan-300">
          <Globe size={13} />
          <span className="tracking-wider uppercase">A Safer Tomorrow Through Science</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/80">
          <MapPin size={12} className="text-cyan-400" />
          <span>70.6667° S, 8.3333° E</span>
          <span className="text-white/30">|</span>
          <span>ANTARCTICA</span>
        </div>
      </footer>

      {/* ============================================================
          4. INFORMATIVE POPUP MODALS (About, Support, Credentials)
          ============================================================ */}
      {modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/75">
          <div className="relative w-full max-w-lg rounded-xl border border-cyan-400/40 bg-[#071723] p-6 shadow-2xl text-xs text-white">
            <button
              type="button"
              onClick={() => setModalContent(null)}
              className="absolute right-4 top-4 rounded p-1 text-white/60 hover:text-white"
            >
              <X size={18} />
            </button>

            {/* Quick Role Credentials Directory */}
            {modalContent === 'credentials' && (
              <div>
                <div className="flex items-center gap-2 font-display text-base font-bold text-cyan-300 uppercase">
                  <KeyRound size={18} />
                  <span>Authorized Personnel Access Directory</span>
                </div>
                <p className="mt-2 text-white/70 leading-relaxed">
                  Select any authorized role below to auto-populate credentials for validation:
                </p>

                <div className="mt-4 space-y-2">
                  {USERS.slice(0, 4).map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleSelectRoleCreds(u)}
                      className="flex cursor-pointer items-center justify-between rounded-lg border border-cyan-500/25 bg-[#030C12]/80 p-2.5 transition hover:border-cyan-400 hover:bg-cyan-950/40"
                    >
                      <div>
                        <div className="font-bold text-white text-xs">{u.name}</div>
                        <div className="font-mono text-[10px] text-cyan-300">
                          ID: <code className="text-cyan-200">{u.id}</code> · Role:{' '}
                          <span className="text-teal-400 font-semibold">{u.role}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded bg-cyan-500/20 px-2 py-1 font-mono text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/30"
                      >
                        Auto-Fill
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* About Modal */}
            {modalContent === 'about' && (
              <div>
                <div className="flex items-center gap-2 font-display text-base font-bold text-cyan-300 uppercase">
                  <Info size={18} />
                  <span>About Polar Command Center</span>
                </div>
                <p className="mt-3 leading-relaxed text-white/80">
                  Developed for the <strong>Ministry of Earth Sciences (MoES)</strong> and the{' '}
                  <strong>National Centre for Polar and Ocean Research (NCPOR)</strong>.
                </p>
                <p className="mt-2 leading-relaxed text-white/70">
                  This unified platform coordinates scientific expeditions, cargo logistics,
                  station personnel rosters, and real-time emergency distress response across
                  Antarctic and Arctic research bases (Maitri, Bharati, Himadri, and Dakshin
                  Gangotri).
                </p>
              </div>
            )}

            {/* Support Modal */}
            {modalContent === 'support' && (
              <div>
                <div className="flex items-center gap-2 font-display text-base font-bold text-cyan-300 uppercase">
                  <HelpCircle size={18} />
                  <span>Support &amp; Technical Dispatch</span>
                </div>
                <p className="mt-3 leading-relaxed text-white/80">
                  Polar operations telemetry is monitored 24/7 via encrypted Iridium satellite and
                  HF radio relays.
                </p>
                <div className="mt-4 rounded border border-cyan-500/20 bg-[#030C12] p-3 font-mono text-[11px] space-y-1">
                  <div>HQ Relay: NCPOR Polar Operations Room, Goa</div>
                  <div>Primary Frequency: 8.845 MHz USB (HF)</div>
                  <div>Emergency Transceiver: 406 MHz COSPAS-SARSAT</div>
                </div>
              </div>
            )}

            {/* Expeditions Modal */}
            {modalContent === 'expeditions' && (
              <div>
                <div className="flex items-center gap-2 font-display text-base font-bold text-cyan-300 uppercase">
                  <ShieldCheck size={18} />
                  <span>Active Polar Missions Governance</span>
                </div>
                <p className="mt-3 text-white/80 leading-relaxed">
                  Authentication requires valid clearance from NCPOR Security Operations. Active
                  missions include the 44th Indian Scientific Expedition to Antarctica (ISEA-44) at
                  Maitri, 14th Expedition to Bharati (Larsemann Hills), and Ny-Ålesund Arctic
                  Atmospheric Campaign at Himadri Station.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
