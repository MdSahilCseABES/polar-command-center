import React from 'react'
import { AlertTriangle, RefreshCw, Radio } from 'lucide-react'

export function WeatherError({ message, onRetry, stationName }) {
  return (
    <div className="card my-8 mx-auto max-w-xl p-6 sm:p-8 text-center border-[var(--red)]/40 shadow-2xl">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--red)]/30 bg-[var(--red)]/10 text-[var(--red)]">
        <AlertTriangle className="h-7 w-7" />
      </div>

      <span className="mono rounded border border-[var(--red)]/30 bg-[var(--surface-sunken)] px-2.5 py-1 text-xs uppercase tracking-wider text-[var(--red)]">
        Telemetry Link Interruption
      </span>

      <h3 className="mt-3 font-display text-lg font-bold text-hi sm:text-xl">
        Weather Feed Unavailable for {stationName}
      </h3>

      <p className="mono mt-2 text-xs text-mid leading-relaxed sm:text-sm">
        {message}
      </p>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onRetry}
          className="btn btn--sm flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Re-establish Telemetry Link</span>
        </button>
      </div>

      <div className="mono mt-4 flex items-center justify-center gap-1.5 text-[11px] text-low">
        <Radio className="h-3 w-3" />
        <span>Open-Meteo API Gateway · Polar atmospheric models</span>
      </div>
    </div>
  )
}
