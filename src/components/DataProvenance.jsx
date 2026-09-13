/**
 * DATA PROVENANCE COMPONENT
 * =========================
 * Displays an explicit, audit-ready data provenance panel for any dataset.
 *
 * Renders:
 * - Source Provider / Authority (e.g. NCPOR, MoES, Open-Meteo)
 * - Dataset Title & Identifier
 * - Observation Location & Geographic Coordinates
 * - Timestamp / Frequency
 * - Data Integrity Status Badge
 * - Direct Clickable Official Source URL
 */

import { ExternalLink, Database, MapPin, Calendar, Activity, Info } from 'lucide-react'
import SourceBadge from './SourceBadge'

export default function DataProvenance({
  provider = 'National Centre for Polar and Ocean Research (NCPOR)',
  dataset = 'Official Antarctic Station Infrastructure Registry',
  location = 'East Antarctica',
  coordinates,
  date,
  dataType = 'Official Reference Specification',
  status = 'OFFICIAL REFERENCE',
  sourceUrl,
  methodologyNote,
  compact = false,
}) {
  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--line-soft)] bg-[var(--surface-raised)] px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <Database size={13} className="text-[var(--accent)] shrink-0" />
          <span className="text-lo">Source:</span>
          <span className="font-medium text-hi">{provider}</span>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline ml-1"
            >
              <span>Verify Source</span>
              <ExternalLink size={10} />
            </a>
          )}
        </div>
        <SourceBadge status={status} size="xs" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-card)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line-soft)] pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-[var(--accent)]">
            <Database size={13} />
            <span>Data Provenance Record</span>
          </div>
          <h4 className="mt-0.5 text-sm font-bold text-hi truncate">{dataset}</h4>
          <p className="text-xs text-lo mt-0.5">{provider}</p>
        </div>
        <SourceBadge status={status} size="sm" />
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {location && (
          <div className="flex items-start gap-2">
            <MapPin size={13} className="mt-0.5 text-mid shrink-0" />
            <div>
              <span className="text-lo block">Location</span>
              <span className="font-medium text-hi">{location}</span>
              {coordinates && <span className="block text-[11px] text-lo font-mono">{coordinates}</span>}
            </div>
          </div>
        )}

        {dataType && (
          <div className="flex items-start gap-2">
            <Activity size={13} className="mt-0.5 text-mid shrink-0" />
            <div>
              <span className="text-lo block">Data Classification</span>
              <span className="font-medium text-hi">{dataType}</span>
            </div>
          </div>
        )}

        {date && (
          <div className="flex items-start gap-2">
            <Calendar size={13} className="mt-0.5 text-mid shrink-0" />
            <div>
              <span className="text-lo block">Period / Timestamp</span>
              <span className="font-medium text-hi">{date}</span>
            </div>
          </div>
        )}

        {sourceUrl && (
          <div className="flex items-start gap-2">
            <ExternalLink size={13} className="mt-0.5 text-[var(--accent)] shrink-0" />
            <div>
              <span className="text-lo block">Authoritative Portal</span>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1"
              >
                <span>Direct Source Link</span>
                <ExternalLink size={10} />
              </a>
            </div>
          </div>
        )}
      </div>

      {methodologyNote && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-[var(--surface-raised)] px-3 py-2 text-[11px] text-lo">
          <Info size={12} className="mt-0.5 text-mid shrink-0" />
          <span>{methodologyNote}</span>
        </div>
      )}
    </div>
  )
}
