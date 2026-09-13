/**
 * LIVE STATUS COMPONENT
 * =====================
 * Standardized status bar showing:
 * - Data source status (Live, Reanalysis, Fallback)
 * - Last updated timestamp
 * - Manual Refresh button
 * - Provider accreditation
 */

import { RefreshCw, Clock } from 'lucide-react'
import SourceBadge from './SourceBadge'

export default function LiveStatus({
  status = 'LIVE',
  lastUpdated,
  onRefresh,
  loading = false,
  sourceName = 'Open-Meteo NWP Model',
  sourceUrl,
  className = '',
}) {
  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC',
      }) + ' UTC'
    : 'Recent'

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line-soft)] bg-[var(--surface-raised)] px-3 py-2 text-xs ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge status={status} sourceUrl={sourceUrl} size="sm" showLinkIcon={!!sourceUrl} />
        <span className="text-lo">Provider:</span>
        <span className="font-medium text-hi">{sourceName}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-lo">
          <Clock size={12} className="text-mid" />
          <span>Last updated:</span>
          <span className="font-mono font-medium text-hi">{formattedTime}</span>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1 rounded bg-[var(--surface-card)] border border-[var(--line-soft)] px-2 py-1 font-medium text-mid hover:text-hi hover:border-[var(--line)] disabled:opacity-50 transition active:scale-95"
            title="Fetch latest meteorological telemetry"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin text-[var(--accent)]' : ''} />
            <span>{loading ? 'Fetching...' : 'Refresh'}</span>
          </button>
        )}
      </div>
    </div>
  )
}
