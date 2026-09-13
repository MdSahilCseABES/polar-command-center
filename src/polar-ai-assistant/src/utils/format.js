/**
 * FORMATTING HELPERS
 * ==================
 * Small functions for formatting coordinates, timestamps, and numbers.
 */

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

export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

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

export function formatCoords(lat, lng, decimals = 3) {
  if (lat == null || lng == null) return '—'
  const latHem = lat >= 0 ? 'N' : 'S'
  const lngHem = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(decimals)}°${latHem}, ${Math.abs(lng).toFixed(decimals)}°${lngHem}`
}

export function formatNumber(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Number(n).toLocaleString()
}
