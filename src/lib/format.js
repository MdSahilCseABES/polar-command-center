/**
 * FORMATTING HELPERS
 * ==================
 * Small functions for turning raw data into text a human reads.
 * Kept out of the components so the components stay about layout.
 */

/** "22 Aug, 14:30" — a compact date + time. */
export function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** "22 Aug 2026" — date only. */
export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** "20:00:02" — used by the sidebar clock. */
export function formatUtcClock(date = new Date(), tz = 'Asia/Kolkata') {
  return date.toLocaleTimeString('en-GB', {
    timeZone: tz,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * "18m ago", "3h ago", "2d ago".
 * Handles future timestamps gracefully ("just now") instead of "-5m ago".
 */
export function timeAgo(iso) {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'

  const mins = Math.round((Date.now() - then) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`

  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `${hrs}h ago`

  return `${Math.round(hrs / 24)}d ago`
}

/**
 * Formats latitude/longitude the way expedition logs do:
 *   -70.7667, 11.7333   ->   "70.767°S, 11.733°E"
 *
 * NOTE: In this prototype all coordinates are SIMULATED demo values.
 * We are not reading real GPS or satellite trackers.
 */
export function formatCoords(lat, lng, decimals = 3) {
  if (lat == null || lng == null) return '—'
  const latHem = lat >= 0 ? 'N' : 'S'
  const lngHem = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(decimals)}°${latHem}, ${Math.abs(lng).toFixed(decimals)}°${lngHem}`
}

/** "1,240" — thousands separators so big numbers stay readable. */
export function formatNumber(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Number(n).toLocaleString()
}

/** "48 drums" — a quantity with its unit, skipping the unit if absent. */
export function formatQuantity(qty, unit) {
  if (qty == null) return '—'
  return unit ? `${formatNumber(qty)} ${unit}` : formatNumber(qty)
}

/** Clamps a percentage into the 0-100 range so a progress bar can't overflow. */
export function clampPercent(n) {
  const v = Number(n)
  if (Number.isNaN(v)) return 0
  return Math.max(0, Math.min(100, v))
}

/**
 * Generates the next ID in a series, e.g. nextId(cargo, 'C', 3) -> "C-115".
 * Reads the highest existing number so IDs never collide.
 */
export function nextId(items, prefix, pad = 3) {
  let max = 0
  for (const item of items || []) {
    const match = String(item?.id || '').match(/(\d+)$/)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `${prefix}-${String(max + 1).padStart(pad, '0')}`
}
