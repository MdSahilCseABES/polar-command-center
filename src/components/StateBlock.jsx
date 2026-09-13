/**
 * STATEBLOCK — the message shown when there is no table to show.
 *
 * Master prompt section 15 requires every data operation to have a
 * LOADING, ERROR and EMPTY state. Rather than inventing those three
 * screens on every page, each page uses this one component:
 *
 *   <StateBlock kind="loading" />
 *   <StateBlock kind="empty" title="No cargo matches these filters" />
 *   <StateBlock kind="error" title="Weather unavailable" message={err} onRetry={fn} />
 *
 * The important part is that the UI never shows a blank white area and
 * never crashes — it always says something a human can act on.
 */

import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'

const PRESETS = {
  loading: {
    icon: Loader2,
    title: 'Loading…',
    message: 'Fetching records.',
    spin: true,
  },
  empty: {
    icon: Inbox,
    title: 'Nothing to show',
    message: 'No records match the current view.',
  },
  error: {
    icon: AlertTriangle,
    title: 'Could not load data',
    message: 'Something went wrong. The rest of the console still works.',
  },
}

export default function StateBlock({ kind = 'empty', title, message, onRetry, retryLabel = 'Retry' }) {
  const preset = PRESETS[kind] || PRESETS.empty
  const Icon = preset.icon

  return (
    <div className="state-block">
      <Icon
        size={20}
        strokeWidth={1.75}
        className={`mx-auto mb-2 ${preset.spin ? 'animate-spin' : ''} ${
          kind === 'error' ? 'text-[var(--red)]' : 'text-[var(--ink-low)]'
        }`}
      />
      <strong>{title || preset.title}</strong>
      <span>{message || preset.message}</span>

      {onRetry && (
        <button type="button" className="btn btn--ghost btn--sm mt-3" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  )
}
