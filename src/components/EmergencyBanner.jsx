/**
 * GLOBAL EMERGENCY BANNER
 * =======================
 * Appears across all pages whenever an active, unresolved emergency exists.
 * Provides high-visibility distress telemetry and one-click access to the
 * Emergency Response console.
 *
 * Refined with sleek, minimized-by-default tactical dark-glass styling,
 * non-intrusive height, and full dismissibility so it never dominates
 * or clashes with the application viewport.
 */

import React, { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  MapPin,
  X,
} from 'lucide-react'
import { playAcknowledgeChirp } from '../services/audioAlert'
import { timeAgo } from '../lib/format'

export default function EmergencyBanner({
  emergencies = [],
  personnel = [],
  onOpenEmergencyRoom,
  onAcknowledge,
  canRespond = false,
}) {
  // Start in minimized mode by default so it never overwhelms or looks odd at the top
  const [minimized, setMinimized] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  // Filter for unresolved emergencies (OPEN or IN_PROGRESS or not RESOLVED)
  const activeEmergencies = emergencies.filter(
    (e) => e.status !== 'RESOLVED' && e.status !== 'Resolved'
  )

  if (dismissed || activeEmergencies.length === 0) return null

  // Top incident (highest severity or most recent)
  const topIncident = activeEmergencies[0]

  const affectedPerson = personnel?.find(
    (p) => p.id === topIncident?.personnel_id
  )
  const affectedName =
    topIncident?.personnel_name || affectedPerson?.name
  const affectedLabel = affectedName
    ? `${affectedName} (${topIncident.personnel_id})`
    : topIncident?.personnel_id

  const handleAcknowledge = () => {
    playAcknowledgeChirp()
    if (onAcknowledge) {
      onAcknowledge(topIncident.id)
    }
  }

  // MINIMIZED MODE: Sleek, compact 30px tactical ribbon
  if (minimized) {
    return (
      <div
        id="global-emergency-banner-min"
        className="flex items-center justify-between border-b border-red-500/25 bg-[#140608]/92 px-3 py-1 text-xs text-red-200 shadow-sm backdrop-blur-md transition-all sm:px-4"
      >
        <div className="flex min-w-0 items-center gap-2">
          {/* Pulsing red tactical beacon */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>

          <span className="shrink-0 rounded border border-red-500/40 bg-red-950/80 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-red-300">
            {topIncident.id}
          </span>

          <span className="truncate text-[11px] font-semibold text-white/90">
            {topIncident.type || 'POLAR DISTRESS'}:
          </span>

          <span className="hidden truncate text-[11px] text-white/70 sm:inline">
            {affectedLabel ? `${affectedLabel} · ` : ''}
            {topIncident.location || topIncident.detail || 'Field Outpost'}
          </span>

          {activeEmergencies.length > 1 && (
            <span className="hidden rounded-full bg-red-950 px-1.5 py-0.2 text-[9.5px] font-bold text-red-400 border border-red-500/30 md:inline">
              +{activeEmergencies.length - 1} more
            </span>
          )}
        </div>

        <div className="ml-2 flex shrink-0 items-center gap-1.5">
          {canRespond && !topIncident.acknowledged_at && topIncident.status !== 'RESOLVED' && (
            <button
              type="button"
              id={`ack-banner-btn-${topIncident.id}`}
              onClick={handleAcknowledge}
              className="rounded border border-red-500/40 bg-red-950/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-200 transition hover:bg-red-900/60 hover:text-white"
            >
              Ack
            </button>
          )}

          <button
            type="button"
            id="open-emergency-room-btn"
            onClick={() => onOpenEmergencyRoom?.(topIncident.id)}
            className="flex items-center gap-1 rounded border border-red-400/40 bg-red-900/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-100 shadow-sm transition hover:bg-red-800/70 hover:text-white"
          >
            <span>Open Room</span>
            <ChevronRight size={11} />
          </button>

          <button
            type="button"
            onClick={() => setMinimized(false)}
            className="rounded p-0.5 text-white/60 transition hover:bg-white/10 hover:text-white"
            title="Expand alert details"
            aria-label="Expand alert details"
          >
            <ChevronDown size={13} />
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="ml-0.5 rounded p-0.5 text-white/60 transition hover:bg-white/10 hover:text-white"
            title="Dismiss alert banner"
            aria-label="Dismiss alert banner"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    )
  }

  // EXPANDED MODE: Refined, elegant dark-crimson glass container
  return (
    <div
      id="global-emergency-banner"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-red-500/30 bg-[#160609]/95 px-3 py-1.5 text-xs text-red-200 shadow-md backdrop-blur-md transition-all sm:px-4"
    >
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 rounded border border-red-500/40 bg-red-950/80 px-2 py-0.5 font-bold uppercase tracking-wider text-red-300">
          <AlertTriangle size={12} className="animate-pulse text-red-400" />
          <span>EMERGENCY ALERT · {topIncident.id}</span>
        </div>

        <span className="font-bold text-white">{topIncident.type || 'POLAR DISTRESS'}</span>
        <span className="text-white/30">·</span>

        {topIncident.personnel_id && (
          <>
            <span className="inline-flex items-center gap-1 text-white/90">
              <span className="text-white/60">Affected:</span>
              <strong className="rounded bg-red-950/70 px-1.5 py-0.5 font-bold text-white border border-red-500/20">
                {affectedLabel}
              </strong>
            </span>
            <span className="text-white/30">·</span>
          </>
        )}

        <span className="flex items-center gap-1 text-white/80">
          <MapPin size={11} className="shrink-0 text-red-400" />
          <span>{topIncident.detail || topIncident.location_name || 'Field Outpost'}</span>
        </span>

        {topIncident.description && (
          <>
            <span className="text-white/30">·</span>
            <span className="max-w-[260px] truncate italic text-white/80 sm:max-w-[360px]">
              "{topIncident.description}"
            </span>
          </>
        )}

        <span className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-white/60">
          {timeAgo(topIncident.reported_at || topIncident.created_at || topIncident.timestamp)}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {canRespond && !topIncident.acknowledged_at && topIncident.status !== 'RESOLVED' && (
          <button
            type="button"
            id={`ack-banner-btn-${topIncident.id}`}
            onClick={handleAcknowledge}
            className="flex items-center gap-1 rounded border border-red-500/40 bg-red-950/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-200 transition hover:bg-red-900/60 hover:text-white"
          >
            <CheckCircle2 size={11} />
            <span>Acknowledge</span>
          </button>
        )}

        <button
          type="button"
          id="open-emergency-room-btn"
          onClick={() => onOpenEmergencyRoom?.(topIncident.id)}
          className="flex items-center gap-1 rounded border border-red-400/50 bg-red-900/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-red-800/80"
        >
          <span>Emergency Room</span>
          <ChevronRight size={11} />
        </button>

        <button
          type="button"
          onClick={() => setMinimized(true)}
          className="rounded p-0.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          title="Minimize banner"
          aria-label="Minimize banner"
        >
          <ChevronUp size={13} />
        </button>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded p-0.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          title="Dismiss banner"
          aria-label="Dismiss banner"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
