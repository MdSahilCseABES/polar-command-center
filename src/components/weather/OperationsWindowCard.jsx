import React, { useState } from 'react'
import {
  Plane,
  Truck,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileWarning,
  Check,
} from 'lucide-react'

export function OperationsWindowCard({
  operationsWindow,
  stationName,
  onLogHazard,
}) {
  const [loggedNotice, setLoggedNotice] = useState(null)

  const getSafetyBadge = (level) => {
    switch (level) {
      case 'OPTIMAL':
      case 'OPEN':
      case 'PERMITTED':
        return {
          color: 'text-[var(--green)] bg-[var(--green)]/10 border-[var(--green)]/30',
          icon: <CheckCircle2 className="h-3.5 w-3.5 text-[var(--green)]" />,
        }
      case 'MARGINAL':
      case 'CAUTION':
      case 'LIMITED':
        return {
          color: 'text-[var(--amber)] bg-[var(--amber)]/10 border-[var(--amber)]/30',
          icon: <AlertTriangle className="h-3.5 w-3.5 text-[var(--amber)]" />,
        }
      case 'RESTRICTED':
      case 'HAZARDOUS':
      case 'SUSPENDED':
      default:
        return {
          color: 'text-[var(--red)] bg-[var(--red)]/10 border-[var(--red)]/30',
          icon: <XCircle className="h-3.5 w-3.5 text-[var(--red)]" />,
        }
    }
  }

  const handleHazardAction = () => {
    const time = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    })
    if (onLogHazard) {
      onLogHazard()
    }
    setLoggedNotice(`Logged weather advisory for ${stationName} at ${time} UTC.`)
    setTimeout(() => setLoggedNotice(null), 6000)
  }

  return (
    <div className="card flex flex-col justify-between p-5 shadow-lg">
      <div>
        <div className="mb-4 flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--ice)]" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-hi">
              Operations Safety Window
            </h3>
          </div>
          <span
            className={`mono rounded border px-2 py-0.5 text-[10px] font-bold ${
              operationsWindow.overall === 'GO'
                ? 'border-[var(--green)]/30 bg-[var(--green)]/15 text-[var(--green)]'
                : operationsWindow.overall === 'CAUTION'
                ? 'border-[var(--amber)]/30 bg-[var(--amber)]/15 text-[var(--amber)]'
                : 'border-[var(--red)]/30 bg-[var(--red)]/15 text-[var(--red)]'
            }`}
          >
            STATUS: {operationsWindow.overall}
          </span>
        </div>

        {/* 3 Pillar Modalities */}
        <div className="space-y-3">
          {/* Flight Operations */}
          <div className="flex items-center justify-between rounded border border-[var(--line)] bg-[var(--surface-sunken)] p-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--surface-card)] text-[var(--ice)]">
                <Plane className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-medium text-hi">Flight Operations</div>
                <div className="mono text-[10px] text-low">Twin Otter / Helicopter sorties</div>
              </div>
            </div>
            {(() => {
              const badge = getSafetyBadge(operationsWindow.flightSafety)
              return (
                <div className={`mono flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold ${badge.color}`}>
                  {badge.icon}
                  <span>{operationsWindow.flightSafety}</span>
                </div>
              )
            })()}
          </div>

          {/* Overland Traverse */}
          <div className="flex items-center justify-between rounded border border-[var(--line)] bg-[var(--surface-sunken)] p-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--surface-card)] text-[var(--ice)]">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-medium text-hi">Overland Traverse</div>
                <div className="mono text-[10px] text-low">PistenBully / Sledge Convoys</div>
              </div>
            </div>
            {(() => {
              const badge = getSafetyBadge(operationsWindow.traverseSafety)
              return (
                <div className={`mono flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold ${badge.color}`}>
                  {badge.icon}
                  <span>{operationsWindow.traverseSafety}</span>
                </div>
              )
            })()}
          </div>

          {/* Exterior Station Science */}
          <div className="flex items-center justify-between rounded border border-[var(--line)] bg-[var(--surface-sunken)] p-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--surface-card)] text-[var(--ice)]">
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-medium text-hi">Exterior Science Work</div>
                <div className="mono text-[10px] text-low">Sampling & Sensor Maintenance</div>
              </div>
            </div>
            {(() => {
              const badge = getSafetyBadge(operationsWindow.exteriorWork)
              return (
                <div className={`mono flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold ${badge.color}`}>
                  {badge.icon}
                  <span>{operationsWindow.exteriorWork}</span>
                </div>
              )
            })()}
          </div>
        </div>

        {/* Safety Advisory Banner */}
        <div className="mt-4 rounded border border-[var(--line)] bg-[var(--surface-sunken)] p-3">
          <div className="eyebrow mb-1">Safety Advisory Directive</div>
          <p className="text-xs leading-relaxed text-mid">
            {operationsWindow.advisory}
          </p>
          <div className="mono mt-2 flex items-center gap-2 text-[10.5px]">
            <span className="text-low">Wind Chill Risk:</span>
            <span
              className={`font-semibold ${
                operationsWindow.windChillSeverity === 'EXTREME'
                  ? 'text-[var(--red)]'
                  : operationsWindow.windChillSeverity === 'SEVERE'
                  ? 'text-[var(--orange)]'
                  : operationsWindow.windChillSeverity === 'MODERATE'
                  ? 'text-[var(--amber)]'
                  : 'text-[var(--green)]'
              }`}
            >
              {operationsWindow.windChillSeverity}
            </span>
          </div>
        </div>
      </div>

      {/* Log Hazard Button & Confirmation */}
      <div className="mt-4 pt-3 border-t border-[var(--line)]">
        {loggedNotice ? (
          <div className="mono flex items-center gap-2 rounded border border-[var(--green)]/40 bg-[var(--green)]/15 p-2 text-xs text-[var(--green)]">
            <Check className="h-4 w-4" />
            <span>{loggedNotice}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleHazardAction}
            className={`btn btn--sm w-full flex items-center justify-center gap-2 ${
              operationsWindow.overall === 'NO_GO'
                ? 'btn--alert'
                : 'btn--ghost'
            }`}
          >
            <FileWarning className="h-3.5 w-3.5" />
            <span>
              {operationsWindow.overall === 'NO_GO'
                ? 'Log Weather Hazard & Alert Station'
                : 'File Weather Advisory Log'}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
