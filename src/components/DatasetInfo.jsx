/**
 * DATASET INFO COMPONENT
 * ======================
 * Small informative popover or inline snippet explaining dataset provenance.
 */

import { useState } from 'react'
import { Info, X, ExternalLink } from 'lucide-react'
import SourceBadge from './SourceBadge'

export default function DatasetInfo({
  title,
  source,
  sourceUrl,
  status = 'OFFICIAL REFERENCE',
  description,
  children,
}) {
  const [open, setOpen] = useState(false)

  return (
    <span className="inline-flex items-center gap-1.5 relative">
      {children}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded p-0.5 text-mid hover:text-hi hover:bg-[var(--surface-raised)] transition"
        title="View dataset source and provenance"
        aria-label="Dataset info"
      >
        <Info size={13} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-40 w-72 rounded-lg border border-[var(--line)] bg-[var(--surface-card)] p-3 shadow-xl text-xs">
          <div className="flex items-start justify-between gap-2 border-b border-[var(--line-soft)] pb-2 mb-2">
            <span className="font-bold text-hi">{title || 'Dataset Provenance'}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-mid hover:text-hi"
            >
              <X size={12} />
            </button>
          </div>

          <div className="space-y-1.5">
            <div>
              <span className="text-lo block">Source Authority:</span>
              <span className="font-medium text-hi">{source}</span>
            </div>

            <div className="pt-1">
              <SourceBadge status={status} size="xs" />
            </div>

            {description && <p className="text-lo text-[11px] pt-1 leading-relaxed">{description}</p>}

            {sourceUrl && (
              <div className="pt-1 border-t border-[var(--line-soft)] mt-2">
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline font-medium"
                >
                  <span>Verify at official portal</span>
                  <ExternalLink size={10} />
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  )
}
