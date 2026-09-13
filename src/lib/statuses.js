/**
 * STATUS VOCABULARY
 * =================
 * Every status word used anywhere in the app is defined ONCE, here.
 *
 * Why bother? Because if "IN_TRANSIT" is typed by hand in six different
 * files, one typo silently breaks a filter or a count. Importing from one
 * file means a typo becomes an immediate, obvious error instead.
 *
 * Each status has three things:
 *   - the KEY   ("IN_TRANSIT")  used in data and comparisons
 *   - the LABEL ("In Transit")  shown to the user
 *   - the TONE  ("info")        which colour the badge uses
 */

/* ---------- EXPEDITIONS ---------- */
export const EXPEDITION_STATUS = {
  PLANNING: { label: 'Planning', tone: 'info' },
  ACTIVE: { label: 'Active', tone: 'ok' },
  COMPLETED: { label: 'Completed', tone: 'muted' },
  SUSPENDED: { label: 'Suspended', tone: 'warn' },
}

/* ---------- PERSONNEL ---------- */
export const PERSONNEL_STATUS = {
  ACTIVE: { label: 'Active', tone: 'ok' },
  IN_TRANSIT: { label: 'In Transit', tone: 'info' },
  RESTING: { label: 'Resting', tone: 'blue' },
  EMERGENCY: { label: 'Emergency', tone: 'critical' },
  OFF_DUTY: { label: 'Off Duty', tone: 'muted' },
}

/* ---------- CARGO ---------- */
export const CARGO_STATUS = {
  PLANNED: { label: 'Planned', tone: 'muted' },
  LOADED: { label: 'Loaded', tone: 'blue' },
  IN_TRANSIT: { label: 'In Transit', tone: 'info' },
  ARRIVED: { label: 'Arrived', tone: 'ok' },
  DELAYED: { label: 'Delayed', tone: 'alert' },
}

export const PRIORITY = {
  LOW: { label: 'Low', tone: 'muted' },
  MEDIUM: { label: 'Medium', tone: 'blue' },
  HIGH: { label: 'High', tone: 'warn' },
  CRITICAL: { label: 'Critical', tone: 'critical' },
}

/* ---------- INVENTORY ---------- */
// Stock status is never stored in the data. It is always CALCULATED from
// quantity vs minimum_quantity — see stockStatus() below. That guarantees
// the badge can never disagree with the numbers next to it.
export const STOCK_STATUS = {
  AVAILABLE: { label: 'Available', tone: 'ok' },
  LOW_STOCK: { label: 'Low Stock', tone: 'alert' },
  OUT_OF_STOCK: { label: 'Out of Stock', tone: 'critical' },
}

export const CONDITION = {
  NEW: { label: 'New', tone: 'ok' },
  GOOD: { label: 'Good', tone: 'ok' },
  SERVICEABLE: { label: 'Serviceable', tone: 'warn' },
  NEEDS_REPAIR: { label: 'Needs Repair', tone: 'alert' },
  EXPIRED: { label: 'Expired', tone: 'critical' },
}

/* ---------- EMERGENCIES ---------- */
export const EMERGENCY_STATUS = {
  ACTIVE: { label: 'Active', tone: 'critical' },
  RESPONDING: { label: 'Responding', tone: 'warn' },
  RESOLVED: { label: 'Resolved', tone: 'ok' },
}

export const EMERGENCY_TYPE = {
  MEDICAL: { label: 'Medical' },
  EQUIPMENT_FAILURE: { label: 'Equipment Failure' },
  WEATHER: { label: 'Weather Hazard' },
  OVERDUE_CHECKIN: { label: 'Overdue Check-in' },
  FIRE: { label: 'Fire' },
  VEHICLE: { label: 'Vehicle Incident' },
  OTHER: { label: 'Other' },
}

export const SEVERITY = {
  LOW: { label: 'Low', tone: 'muted' },
  MEDIUM: { label: 'Medium', tone: 'blue' },
  HIGH: { label: 'High', tone: 'alert' },
  CRITICAL: { label: 'Critical', tone: 'critical' },
}

/* ---------- LOCATION TYPES (used by the map) ---------- */
export const LOCATION_TYPE = {
  STATION: { label: 'Research Station', tone: 'info' },
  CAMP: { label: 'Field Camp', tone: 'blue' },
  VESSEL: { label: 'Vessel', tone: 'violet' },
  RUNWAY: { label: 'Air Link', tone: 'warn' },
  PORT: { label: 'Staging Port', tone: 'muted' },
  DEPOT: { label: 'Depot', tone: 'muted' },
  HQ: { label: 'Headquarters', tone: 'ok' },
}

/* ---------- WEATHER: THE OPERATIONS WINDOW ----------
   Can you fly, drive and work outside right now? One word for it.

   OPERATIONAL ARCHITECTURE NOTE: this rule is derived
   based on wind gusts and wind chill thresholds calibrated to COMNAP polar limits.
   The thresholds and the reasoning live in one place —
   OPS_LIMITS and assessConditions() in src/services/weatherService.js.

   Like stock status, this is never stored. It is calculated from whatever
   the weather reading currently says, so it cannot disagree with the
   numbers printed beside it. */
export const OPS_WINDOW = {
  CLEAR: { label: 'Clear', tone: 'ok' },
  MARGINAL: { label: 'Marginal', tone: 'warn' },
  HAZARDOUS: { label: 'Hazardous', tone: 'alert' },
  GROUNDED: { label: 'Grounded', tone: 'critical' },
  UNKNOWN: { label: 'No Data', tone: 'muted' },
}

/* ============================================================
   HELPERS
   ============================================================ */

/**
 * Turns a status KEY into its display label.
 * Falls back to a readable version of the key if it isn't in the map,
 * so an unexpected value shows "Some Thing" rather than crashing.
 */
export function statusLabel(map, key) {
  if (map[key]?.label) return map[key].label
  if (!key) return '—'
  return String(key)
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Turns a status KEY into its badge colour tone. */
export function statusTone(map, key) {
  return map[key]?.tone || 'muted'
}

/**
 * THE LOW-STOCK RULE (master prompt section 5).
 *
 *   quantity === 0            -> OUT_OF_STOCK
 *   quantity <= minimum       -> LOW_STOCK
 *   otherwise                 -> AVAILABLE
 *
 * This is a plain function, not stored data, so it can never go stale.
 */
export function stockStatus(item) {
  const qty = Number(item?.quantity) || 0
  const min = Number(item?.minimum_quantity) || 0
  if (qty === 0) return 'OUT_OF_STOCK'
  if (qty <= min) return 'LOW_STOCK'
  return 'AVAILABLE'
}

/** True when an inventory item needs attention (low or out of stock). */
export function isLowStock(item) {
  return stockStatus(item) !== 'AVAILABLE'
}

/** Builds a <select> friendly list: [{ value, label }, ...] */
export function optionsFrom(map) {
  return Object.entries(map).map(([value, meta]) => ({ value, label: meta.label }))
}

/* ============================================================
   TONE -> COLOUR, WHERE CSS CANNOT DO THE JOB
   ============================================================
   Almost everywhere in the app, a tone becomes a colour through CSS:
   `tone: 'alert'` renders <span class="badge badge--alert">, and
   src/index.css decides what orange means. That is always the first
   choice, because then the colour is defined in exactly one place.

   Two situations cannot use it, and both need the colour written out:

   1. CHARTS. Recharts draws real SVG shapes, and an SVG `fill` cannot
      read a CSS variable — fill="var(--orange)" simply does not paint.

   2. A COLOUR PICKED FROM DATA AT RUNTIME. The severity stripe down the
      left edge of an incident card (see src/pages/Emergency.jsx) is one
      of four colours depending on the record. A stylesheet cannot look
      at a record, so the component sets that one border colour inline
      from statusColour(SEVERITY, …). It reads the SAME tone the badge
      beside it reads, so the two can never disagree.

   These eight values are THE SAME COLOURS as the variables in
   src/index.css, copied here as plain text. The comment on each line
   names the variable it mirrors. If you ever change a colour in
   index.css, change it here too, otherwise a bar and the badge next to
   it will disagree — which on this app would be a real bug, because the
   whole point is that the charts and the badges are the same facts.
   ============================================================ */
/**
 * Reads the current tone colours from CSS custom properties so they
 * automatically follow the active theme. Falls back to light-mode values
 * when getComputedStyle is not yet available (e.g. SSR or tests).
 */
function readToneColours() {
  if (typeof window === 'undefined') {
    return {
      ok: '#22c55e', info: '#0ea5e9', blue: '#3b82f6', warn: '#f59e0b',
      alert: '#f97316', critical: '#ef4444', violet: '#8b5cf6', muted: '#64748b',
    }
  }
  const s = getComputedStyle(document.documentElement)
  const v = (name) => s.getPropertyValue(name).trim()
  return {
    ok: v('--green') || '#22c55e',
    info: v('--ice') || '#0ea5e9',
    blue: v('--blue') || '#3b82f6',
    warn: v('--amber') || '#f59e0b',
    alert: v('--orange') || '#f97316',
    critical: v('--red') || '#ef4444',
    violet: v('--violet') || '#8b5cf6',
    muted: v('--ink-mid') || '#64748b',
  }
}

/** Static snapshot used where a reactive read is not needed.
 *  For charts that must react to theme changes, call readToneColours()
 *  at render time instead. */
export const TONE_COLOUR = readToneColours()

/** Re-read live — call this in components that need to react to theme switches. */
export { readToneColours }

/**
 * The chart colour for one status key.
 *   statusColour(CARGO_STATUS, 'DELAYED')   -> '#f97316'
 *   statusColour(STOCK_STATUS, 'AVAILABLE') -> '#22c55e'
 *
 * Because it reads the very same tone the badge reads, a bar is always
 * the colour of its badge. Nothing is chosen twice.
 * Reads live CSS values so it follows the current theme.
 */
export function statusColour(map, key) {
  const colours = readToneColours()
  return colours[statusTone(map, key)] || colours.muted
}
