/**
 * BADGE — the small coloured status pill used everywhere.
 *
 * Usage:
 *   <Badge map={CARGO_STATUS} value={item.status} />
 *
 * You pass it a status MAP (from src/lib/statuses.js) and a VALUE.
 * It works out the label and the colour itself, so no page ever has to
 * decide "is DELAYED red or orange?" — that lives in one place.
 */

import { statusLabel, statusTone } from '../lib/statuses'

export default function Badge({ map, value, label, tone, dot = false }) {
  /* If a map is given, look up the label and tone. Otherwise use the ones
     passed in directly (handy for one-off badges like "SIMULATED"). */
  const text = label ?? (map ? statusLabel(map, value) : value)
  const colour = tone ?? (map ? statusTone(map, value) : 'muted')

  return (
    <span className={`badge badge--${colour}`}>
      {dot && <i className={`dot dot--${colour === 'critical' ? 'alert' : colour}`} />}
      {text}
    </span>
  )
}
