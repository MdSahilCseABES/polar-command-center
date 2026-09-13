/**
 * TOPBAR — the strip across the top of every page.
 *
 * Holds the page title, a live IST clock (Indian Standard Time,
 * UTC+5:30), and a red pill showing how many things currently need
 * attention. That pill is counted from the shared data, so it changes by
 * itself the moment anything anywhere changes.
 */

import { useEffect, useState } from 'react'
import { AlertTriangle, HelpCircle, Menu, Moon, ShieldAlert, Sun, Volume2, VolumeX } from 'lucide-react'
import { formatUtcClock } from '../lib/format'
import { useData } from '../store/DataContext'
import { useTheme } from '../store/ThemeContext'
import { getAudioEnabled, setAudioEnabled } from '../services/audioAlert'

export default function TopBar({ title, blurb, onMenuClick, onAlertClick, onSosClick, onHelpClick }) {
  const { stats } = useData()
  const { theme, toggleTheme } = useTheme()
  const [soundOn, setSoundOn] = useState(getAudioEnabled)

  useEffect(() => {
    const handleAudio = (e) => setSoundOn(e.detail)
    window.addEventListener('polar:audio-toggle', handleAudio)
    return () => window.removeEventListener('polar:audio-toggle', handleAudio)
  }, [])

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    setAudioEnabled(next)
  }

  /* Timezone selector list */
  const TIMEZONES = [
    { value: 'UTC', label: 'UTC (Polar)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'America/New_York', label: 'New York (EST)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Pacific/Auckland', label: 'New Zealand' },
    { value: 'Antarctica/McMurdo', label: 'McMurdo (NZST)' },
  ]
  const [tz, setTz] = useState('Asia/Kolkata')

  /* A clock that actually ticks. setInterval updates it once a second and
     the cleanup function stops it when the component goes away — leaving
     that out is one of the classic React memory leaks. */
  const [clock, setClock] = useState(() => formatUtcClock(new Date(), tz))
  useEffect(() => {
    const timer = setInterval(() => setClock(formatUtcClock(new Date(), tz)), 1000)
    return () => clearInterval(timer)
  }, [tz])

  return (
    <header
      className="flex items-center gap-2.5 border-b bg-[var(--surface-card)]/95 px-3.5 py-2 backdrop-blur-md sm:gap-3 sm:px-5"
      style={{ borderColor: 'var(--line)' }}
    >
      {/* Hamburger — only shown on small screens. */}
      <button
        type="button"
        onClick={onMenuClick}
        className="shrink-0 text-mid hover:text-hi lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="page-title truncate">{title}</h1>
        {blurb && <p className="page-blurb hidden truncate sm:block">{blurb}</p>}
      </div>

      {/* Alert pill. Only appears when there is genuinely something open. */}
      {stats.criticalAlerts > 0 && (
        <button
          type="button"
          onClick={onAlertClick}
          className="badge badge--critical shrink-0"
          title="Go to Emergency Response"
        >
          <AlertTriangle size={12} strokeWidth={2.25} className="pulse" />
          <span className="hidden sm:inline">
            {stats.criticalAlerts} alert{stats.criticalAlerts === 1 ? '' : 's'}
          </span>
          <span className="sm:hidden">{stats.criticalAlerts}</span>
        </button>
      )}

      {/* Quick SOS Trigger Button */}
      <button
        type="button"
        id="topbar-sos-btn"
        onClick={onSosClick}
        className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/40 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-red-300 shadow-sm transition-all hover:border-red-400 hover:bg-red-900/60 hover:text-white active:scale-95"
        title="Broadcast Emergency SOS"
      >
        <ShieldAlert size={14} className="animate-pulse text-red-400" />
        <span className="hidden sm:inline">SOS Distress</span>
      </button>

      {/* Audio Siren Mute/Unmute Toggle */}
      <button
        type="button"
        onClick={toggleSound}
        className="shrink-0 rounded-lg p-1.5 text-mid transition-colors hover:bg-[var(--surface-raised)] hover:text-hi"
        aria-label={soundOn ? 'Mute emergency siren' : 'Unmute emergency siren'}
        title={soundOn ? 'Emergency siren: ACTIVE' : 'Emergency siren: MUTED'}
      >
        {soundOn ? (
          <Volume2 size={18} className="text-[var(--ice)]" />
        ) : (
          <VolumeX size={18} className="text-low" />
        )}
      </button>

      {/* Theme toggle — switches between Cyan Dark, Pitch Black, and Light Snow mode. */}
      <button
        type="button"
        onClick={toggleTheme}
        className="shrink-0 flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-raised)]/60 px-2.5 py-1 text-xs font-mono transition-all hover:border-[var(--ice)] hover:bg-[var(--surface-raised)] active:scale-95"
        aria-label="Switch theme (Cyan Dark, Pitch Black, Light)"
        title={`Theme: ${theme === 'black' ? 'Pitch Black' : theme === 'light' ? 'Light Snow' : 'Arctic Cyan'} (Click to cycle)`}
      >
        {(theme === 'cyan' || theme === 'dark') && (
          <>
            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22D3EE]" />
            <span className="hidden sm:inline text-cyan-400 font-semibold text-[11px] uppercase tracking-wider">
              Cyan
            </span>
          </>
        )}
        {theme === 'black' && (
          <>
            <Moon size={14} className="text-white fill-white" />
            <span className="hidden sm:inline text-white font-semibold text-[11px] uppercase tracking-wider">
              Black
            </span>
          </>
        )}
        {theme === 'light' && (
          <>
            <Sun size={14} className="text-amber-500 fill-amber-400" />
            <span className="hidden sm:inline text-amber-600 font-semibold text-[11px] uppercase tracking-wider">
              Light
            </span>
          </>
        )}
      </button>

      {/* Hidden Data Methodology & Sources Registry Trigger (?) */}
      <button
        type="button"
        onClick={onHelpClick}
        className="shrink-0 rounded-lg p-1.5 text-mid transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--ice)]"
        aria-label="System Information & Data Sources"
        title="System Information & Data Sources"
      >
        <HelpCircle size={18} />
      </button>

      {/* Clock with Timezone Selector */}
      <div className="hidden shrink-0 text-right md:block">
        <select
          value={tz}
          onChange={(e) => setTz(e.target.value)}
          className="eyebrow block w-full appearance-none bg-transparent pr-2 text-right outline-none cursor-pointer hover:text-hi focus:ring-0"
          title="Change timezone"
          style={{ backgroundImage: 'none' }} /* hide default browser dropdown arrow */
        >
          {TIMEZONES.map((z) => (
            <option
              key={z.value}
              value={z.value}
              className="bg-[var(--surface-card)] text-[var(--ink-hi)]"
            >
              {z.label}
            </option>
          ))}
        </select>
        <div className="mono text-[13px] text-hi">{clock}</div>
      </div>
    </header>
  )
}
