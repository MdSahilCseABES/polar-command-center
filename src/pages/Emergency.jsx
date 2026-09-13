/**
 * EMERGENCY RESPONSE
 * ==================
 * The demo's centrepiece (master prompt sections 5, 12 and 19).
 *
 * WHAT A DUTY OFFICER DOES HERE, top to bottom:
 *   1. Sees how many incidents are open, and how many nobody has picked up.
 *   2. Works down the RESPONSE BOARD — worst first, longest-waiting first.
 *   3. Acknowledges an incident, assigns a team, resolves it.
 *   4. Reports a new one.
 *   5. Checks whether the people and the stores to respond actually exist.
 *
 * THE CONNECTIONS (master prompt section 12) — six of them, and every one
 * works because there is only ONE copy of the data in
 * src/store/DataContext.jsx. No page tells another page anything:
 *
 *   1. Report an incident -> the Dashboard's "Critical Alerts" number goes
 *      up on its own, because that number is COUNTED from the same array.
 *   2. Report it against a person -> that person flips to EMERGENCY, which
 *      changes their badge on Personnel and their marker on the Live Map.
 *   3. Every incident carries coordinates, so it appears on the Live Map as
 *      a pulsing red ring the moment it is filed.
 *   4. RESOLVE it -> the same person is released back to ACTIVE, and the
 *      marker goes from red to green. The connection runs both ways.
 *   5. The readiness panel reads the INVENTORY of the site the incident
 *      happened at. An open medical call at Maitri sits next to Maitri's
 *      medical kits — and those kits are below minimum.
 *   6. Every action writes a line into the Dashboard's Recent Activity.
 *
 * THE HONEST PART (master prompt section 21):
 *   THIS CONSOLE SENDS NOTHING. No SMS, no satellite message, no radio
 *   call, no pager. Assigning a team RECORDS a decision for the operator;
 *   telling that team happens on the radio, the way it really does. The
 *   page says so in plain words rather than implying a capability the
 *   prototype does not have. Coordinates are simulated demo positions,
 *   not a live GPS or beacon feed.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Filter,
  MapPin,
  Plus,
  Radio,
  ShieldAlert,
  Siren,
  User,
  Users,
  X,
} from 'lucide-react'

import Badge from '../components/Badge'
import DataTable from '../components/DataTable'
import Panel from '../components/Panel'
import StateBlock from '../components/StateBlock'
import EmergencyRadio from '../components/EmergencyRadio'
import { playEmergencyAlertSound } from '../services/audioAlert'
import { useData } from '../store/DataContext'
import { useAuth } from '../store/AuthContext'
import { formatCoords, formatDateTime, formatQuantity, timeAgo } from '../lib/format'
import { rolesThatCanRespond } from '../lib/roles'
import {
  EMERGENCY_STATUS,
  EMERGENCY_TYPE,
  PERSONNEL_STATUS,
  SEVERITY,
  STOCK_STATUS,
  optionsFrom,
  statusColour,
  statusLabel,
  stockStatus,
} from '../lib/statuses'

/* The blank report form. Kept at module level so "reset the form" is one
   line, and so the object is not rebuilt on every render.

   MEDICAL and HIGH are the defaults because they are the commonest and
   most urgent combination — the fastest possible report is: pick a place,
   type what happened, submit. */
const EMPTY_FORM = {
  type: 'MEDICAL',
  severity: 'HIGH',
  location_id: '',
  detail: '',
  personnel_id: '',
  assigned_team: '',
  description: '',
}

/* "No filters applied" — used both as the starting value and by the Clear
   button, so the two can never disagree. */
const NO_FILTERS = {
  search: '',
  status: 'ALL',
  severity: 'ALL',
  type: 'ALL',
  expedition: 'ALL',
}

/* Worst first. Written out rather than relying on the order of the keys in
   SEVERITY, because a sort must not silently change if that map is ever
   reordered for display reasons. */
const SEVERITY_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

/**
 * WHICH STORES MATTER FOR WHICH KIND OF INCIDENT.
 *
 * A medical call needs the medical shelf. A whiteout needs shelter, food
 * and heating fuel. A dead generator needs the spares bin and the fuel.
 * Medical is included in most rows because almost any incident can turn
 * into a casualty; it is left out of EQUIPMENT_FAILURE because a tripped
 * generator is a maintenance job, not a medical one.
 *
 * These are our own sensible groupings, not an official NCPOR response
 * matrix, and the page says so.
 */
const RELEVANT_STOCK = {
  MEDICAL: ['Medical'],
  EQUIPMENT_FAILURE: ['Spares', 'Fuel'],
  WEATHER: ['Safety', 'Food', 'Fuel'],
  OVERDUE_CHECKIN: ['Communications', 'Safety', 'Medical'],
  FIRE: ['Safety', 'Medical'],
  VEHICLE: ['Spares', 'Safety', 'Medical'],
  OTHER: ['Medical', 'Safety'],
}

/* Who counts as medical staff. Matched on the WORD in the job title rather
   than against a hardcoded list of names, so adding a "Nurse" or a
   "Paramedic" to the roster needs no change here. */
const MEDICAL_ROLE = /medic|doctor|nurse|paramedic|physician/i

/**
 * HOW LONG BETWEEN TWO MOMENTS, written the way a duty log writes it:
 * "12m", "1h 41m", "2d 3h".
 *
 * Deliberately NOT timeAgo() from src/lib/format.js. "2h ago" is fine for
 * a cargo record, but an incident that has been open for ninety-four
 * minutes has to say 1h 34m — rounding an emergency to the nearest hour
 * is the one place a vague number is actually harmful.
 */
function duration(fromIso, toMs) {
  if (!fromIso || toMs == null) return '—'
  const from = new Date(fromIso).getTime()
  if (Number.isNaN(from)) return '—'

  /* Clamped at zero. A clock skew that produced "-3m open" would look
     like a bug in the data rather than a bug in the clock. */
  const mins = Math.max(0, Math.round((toMs - from) / 60000))
  if (mins < 60) return `${mins}m`

  const hours = Math.floor(mins / 60)
  const restMins = mins % 60
  if (hours < 24) return restMins ? `${hours}h ${restMins}m` : `${hours}h`

  const days = Math.floor(hours / 24)
  const restHours = hours % 24
  return restHours ? `${days}d ${restHours}h` : `${days}d`
}

/** The gap between two recorded timestamps, e.g. report -> acknowledgement. */
function gap(fromIso, toIso) {
  if (!fromIso || !toIso) return '—'
  const to = new Date(toIso).getTime()
  if (Number.isNaN(to)) return '—'
  return duration(fromIso, to)
}

/**
 * TRIAGE ORDER — the order a duty officer works down the board.
 *
 * Worst severity first; where two are equally severe, the one that has
 * been waiting longest goes first. An unknown severity sorts to the
 * bottom rather than to the top, so a typo cannot fake an emergency.
 *
 * Sorts a COPY. .sort() rearranges the array it is handed, and this one
 * belongs to the shared store.
 */
function triage(incidents) {
  return [...incidents].sort(
    (a, b) =>
      (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9) ||
      new Date(a.reported_at) - new Date(b.reported_at)
  )
}

export default function Emergency({ goTo, focusedIncidentId, onClearFocus, onOpenSos }) {
  const {
    emergencies,
    personnel,
    expeditions,
    inventory,
    locations,
    loading,
    error,
    reportEmergency,
    updateEmergency,
    getExpedition,
    getLocation,
    getPerson,
  } = useData()

  /* WHAT THIS ROLE MAY DO HERE — and note which half is NOT gated.

     canRespond controls acknowledging and resolving. Reporting is not
     controlled by anything: every role can file an incident, including the
     read-only one. The reasoning is at the top of src/lib/roles.js, and it
     is the one permission decision on this page worth defending out loud —
     the person standing next to the casualty is often the person with the
     least authority in the system. */
  const { user, canRespond } = useAuth()

  /* Sub-tab: 'board' (Response Board & Readiness) | 'radio' (Tactical Field Radio Comms) */
  const [activeSubTab, setActiveSubTab] = useState('board')

  /* Which incident is open in the detail panel. Defaults to the most
     urgent OPEN one, because that is what a duty officer opens the page
     to look at — not whatever happens to be first in the array. */
  const [selectedId, setSelectedId] = useState(() => {
    const open = emergencies.filter((e) => e.status !== 'RESOLVED')
    return (triage(open)[0] || emergencies[0])?.id ?? null
  })

  // When parent passes a focused incident (e.g. from EmergencyBanner)
  useEffect(() => {
    if (focusedIncidentId) {
      setSelectedId(focusedIncidentId)
      setActiveSubTab('board')
      onClearFocus?.()
    }
  }, [focusedIncidentId, onClearFocus])

  const [filters, setFilters] = useState(NO_FILTERS)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [formSuccess, setFormSuccess] = useState(null)

  /* A clock, so "open for 1h 41m" keeps counting while the page is left on
     screen. Thirty seconds: the display has minute resolution, so ticking
     faster would change nothing, and ticking slower would let a visible
     number sit more than half a minute out of date. */
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  /* ---------- WHAT IS OPEN ----------
     Calculated on every render from the raw array, exactly like the
     dashboard's cards. Nothing here is stored. */
  const openIncidents = emergencies.filter((e) => e.status !== 'RESOLVED')
  const board = triage(openIncidents)

  /* Unacknowledged means "no team has picked this up yet" — tested on the
     TIMESTAMP rather than on the status, because the timestamp is the
     thing that proves it. */
  const unacknowledged = openIncidents.filter((e) => !e.acknowledged_at)

  const oldestOpen = openIncidents.length
    ? openIncidents.reduce((oldest, e) =>
        new Date(e.reported_at) < new Date(oldest.reported_at) ? e : oldest
      )
    : null

  /* ---------- THE FILTER CHAIN ----------
     One .filter() per rule, so the whole thing reads top to bottom. */
  const term = filters.search.trim().toLowerCase()
  const visible = triage(emergencies)
    .filter((e) => filters.status === 'ALL' || e.status === filters.status)
    .filter((e) => filters.severity === 'ALL' || e.severity === filters.severity)
    .filter((e) => filters.type === 'ALL' || e.type === filters.type)
    .filter((e) => filters.expedition === 'ALL' || e.expedition_id === filters.expedition)
    .filter((e) => {
      if (!term) return true
      return (
        e.id.toLowerCase().includes(term) ||
        (e.location || '').toLowerCase().includes(term) ||
        (e.description || '').toLowerCase().includes(term) ||
        (e.assigned_team || '').toLowerCase().includes(term)
      )
    })

  const filtersActive =
    filters.search !== '' ||
    filters.status !== 'ALL' ||
    filters.severity !== 'ALL' ||
    filters.type !== 'ALL' ||
    filters.expedition !== 'ALL'

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }))

  const selected = emergencies.find((e) => e.id === selectedId) || null

  /* ---------- RESPONSE READINESS (connection 5) ----------
     Two questions, answered from the personnel and inventory records
     rather than from anything typed on this page.

     WHICH STORES A RESPONDER CAN ACTUALLY REACH: first choice is the site
     the incident happened at. Field camps hold no stores of their own,
     though, so if that site has nothing on the shelf we follow the
     incident's expedition back to its base station — which is where a
     camp's resupply really comes from. When we do that, the panel SAYS
     we did, rather than quietly showing another station's stock as if it
     were on hand. */
  const supply = useMemo(() => {
    if (!selected) return null

    const site = selected.location_id ? getLocation(selected.location_id) : null
    if (site && inventory.some((i) => i.location === site.name)) {
      return { name: site.name, via: null }
    }

    const expedition = selected.expedition_id ? getExpedition(selected.expedition_id) : null
    const base = expedition?.location_id ? getLocation(expedition.location_id) : null
    if (base && inventory.some((i) => i.location === base.name)) {
      return { name: base.name, via: expedition }
    }
    return null
  }, [selected, inventory, getLocation, getExpedition])

  /* The stores that matter for this kind of incident, at that supply
     point. Low and out-of-stock first — the whole point of the panel is
     to surface a shortage at the moment it matters. */
  const relevantStock = useMemo(() => {
    if (!selected || !supply) return []
    const wanted = RELEVANT_STOCK[selected.type] || RELEVANT_STOCK.OTHER
    const rank = { OUT_OF_STOCK: 0, LOW_STOCK: 1, AVAILABLE: 2 }
    return inventory
      .filter((i) => i.location === supply.name && wanted.includes(i.category))
      .sort((a, b) => rank[stockStatus(a)] - rank[stockStatus(b)])
  }, [selected, supply, inventory])

  /* Medical staff on the whole roster, with whoever is at the incident's
     own site listed first. */
  const medics = useMemo(() => {
    const here = selected?.location_id
    return personnel
      .filter((p) => MEDICAL_ROLE.test(p.role || ''))
      .sort((a, b) => (b.location_id === here) - (a.location_id === here))
  }, [personnel, selected])

  /* ---------- THE FORM ---------- */
  const setField = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))
    setFormError(null)
  }

  /**
   * WHICH EXPEDITION THIS BELONGS TO — worked out, not asked for.
   *
   * The person already knows which expedition they are on, and a site
   * usually has exactly one expedition running at it. Asking the operator
   * to repeat that during an emergency would be one more field to get
   * wrong. It matters because it is what links the incident to an
   * expedition's records and to a base station's stores.
   */
  function deriveExpedition(personId, locationId) {
    const person = personnel.find((p) => p.id === personId)
    if (person?.expedition_id) return person.expedition_id

    const active = expeditions.find((e) => e.location_id === locationId && e.status === 'ACTIVE')
    return active ? active.id : null
  }

  /* Shown live under the form, so the operator sees the link being made
     BEFORE they commit rather than being told about it afterwards. */
  const previewExpedition = getExpedition(deriveExpedition(form.personnel_id, form.location_id))

  /**
   * VALIDATION (master prompt section 21 — validate user input).
   * Checked before saving, naming the field that is wrong.
   */
  function handleSubmit(event) {
    event.preventDefault()
    setFormSuccess(null)

    const site = getLocation(form.location_id)
    if (!site) {
      return setFormError(
        'Choose the nearest known location. It is what places the incident on the Live Map and finds the stores nearby.'
      )
    }

    const description = form.description.trim()
    if (description.length < 15) {
      return setFormError(
        'Describe what has happened — at least 15 characters. A responder needs to know what they are walking into.'
      )
    }

    /* The free-text detail is where the position really is: "Maitri
       Station" is the site, "Sector B" is the casualty. Composed into one
       readable line, with the site kept first so the log sorts sensibly. */
    const detail = form.detail.trim()
    const locationText = detail ? `${site.name} — ${detail}` : site.name

    try {
      const created = reportEmergency({
        type: form.type,
        severity: form.severity,
        location: locationText,
        location_id: site.id,
        /* SIMULATED coordinates, taken from the site record. Nothing here
           reads a GPS or a beacon — see the footer. */
        latitude: site.latitude,
        longitude: site.longitude,
        personnel_id: form.personnel_id || null,
        expedition_id: deriveExpedition(form.personnel_id, site.id),
        assigned_team: form.assigned_team.trim() || null,
        description,
      })

      playEmergencyAlertSound()

      const person = form.personnel_id ? getPerson(form.personnel_id) : null

      setForm(EMPTY_FORM)
      setFormError(null)
      setSelectedId(created.id)
      setShowForm(false)
      setFormSuccess(
        `${created.id} logged. It is on the response board above, on the Dashboard's alert count, ` +
          `and on the Live Map at ${formatCoords(site.latitude, site.longitude)}.` +
          (person ? ` ${person.name} is now flagged EMERGENCY on Personnel and on the map.` : '')
      )
    } catch (err) {
      /* If saving ever fails, say so rather than silently doing nothing. */
      setFormError(`Could not file the report: ${err.message}`)
    }
  }

  /* ---------- THE TWO RESPONSE ACTIONS ----------
     Both are one call into the shared store. The store stamps the
     timestamps and releases the affected person; nothing on this page
     needs to know that happened. */
  const acknowledge = (id) => updateEmergency(id, { status: 'RESPONDING' })
  const resolve = (id) => updateEmergency(id, { status: 'RESOLVED' })

  return (
    <div className="space-y-5">
      {/* ================= 1. SUMMARY STRIP ================= */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: 'Open incidents', value: openIncidents.length, tone: openIncidents.length ? 'alert' : 'ok' },
          {
            label: 'Unacknowledged',
            value: unacknowledged.length,
            tone: unacknowledged.length ? 'alert' : 'ok',
          },
          {
            label: 'Responding',
            value: emergencies.filter((e) => e.status === 'RESPONDING').length,
            tone: 'warn',
          },
          {
            label: 'Resolved',
            value: emergencies.filter((e) => e.status === 'RESOLVED').length,
            tone: 'ok',
          },
          {
            label: 'Longest open',
            value: oldestOpen ? duration(oldestOpen.reported_at, now) : '—',
            tone: openIncidents.length ? 'alert' : undefined,
          },
        ].map((item) => (
          <div key={item.label} className="card-tight">
            <div className="eyebrow">{item.label}</div>
            <div className={`stat-value ${item.tone ? `stat-value--${item.tone}` : ''}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* ================= TACTICAL SUB-NAVIGATION & ACTIONS ================= */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b pb-3"
        style={{ borderColor: 'var(--line)' }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('board')}
            className={`btn btn--sm flex items-center gap-1.5 ${
              activeSubTab === 'board' ? 'btn--primary' : 'btn--ghost'
            }`}
          >
            <Siren size={13} />
            <span>Response Board &amp; Triage</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('radio')}
            className={`btn btn--sm flex items-center gap-1.5 ${
              activeSubTab === 'radio' ? 'btn--primary' : 'btn--ghost'
            }`}
          >
            <Radio size={13} className={activeSubTab === 'radio' ? 'animate-pulse' : ''} />
            <span>Tactical Field Radio Comms</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenSos?.()}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow transition active:scale-95"
            style={{ backgroundColor: 'var(--red)' }}
          >
            <ShieldAlert size={14} className="animate-pulse" />
            <span>ACTIVATE ARMED SOS</span>
          </button>

          {!showForm && (
            <button
              type="button"
              className="btn btn--alert btn--sm flex items-center gap-1"
              onClick={() => {
                setShowForm(true)
                setActiveSubTab('board')
              }}
            >
              <Plus size={13} />
              <span>Report Incident</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= RADIO COMMS SUB-TAB ================= */}
      {activeSubTab === 'radio' && (
        <div className="fade-up space-y-4">
          <div
            className="rounded border p-3"
            style={{
              borderColor: 'var(--line)',
              backgroundColor: 'var(--surface-raised)',
            }}
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-hi">
              <Radio size={14} className="text-[var(--ice)] animate-pulse" />
              <span>Direct Polar Satellite / HF Emergency Transceiver</span>
            </div>
            <p className="mt-1 text-[11.5px] text-mid">
              Encrypted tactical field channel. Messages broadcast to all mobile teams, stations,
              and command consoles. Toggle the comms link to simulate offline satellite dropouts and
              test queue resilience.
            </p>
          </div>

          <EmergencyRadio
            activeIncidentId={selectedId}
            currentOperator={user?.name || 'Field Operator'}
            currentRole={user?.role || 'Field Scientist'}
          />
        </div>
      )}

      {/* ================= BOARD SUB-TAB ================= */}
      {activeSubTab === 'board' && (
        <div className="space-y-5">
          {/* ================= 2. SUCCESS MESSAGE ================= */}
          {formSuccess && (
            <div
              className="alert-strip"
              style={{
                borderLeftColor: 'var(--green)',
                borderColor: 'rgba(34,197,94,0.25)',
                background: 'rgba(34,197,94,0.05)',
              }}
            >
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--green)]" />
              <div className="flex-1 text-[12.5px] text-mid">{formSuccess}</div>
              <button
                type="button"
                className="btn btn--ghost btn--sm shrink-0"
                onClick={() => setFormSuccess(null)}
              >
                Dismiss
              </button>
            </div>
          )}

      {/* ================= 3. THE RESPONSE BOARD =================
          Master prompt section 5 asks for a PROMINENT alert section, and
          this is it: every open incident, worst first, with the two
          actions that move it along on the card itself.

          Only rendered when something is genuinely open. An always-on red
          board trains people to ignore red boards. */}
      {openIncidents.length > 0 && (
        <div className="space-y-3">
          <div className="alert-strip">
            <Siren size={18} strokeWidth={2} className="pulse mt-0.5 shrink-0 text-[var(--red)]" />
            <div className="min-w-0 flex-1">
              <div className="font-display text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--red)]">
                {openIncidents.length} open incident{openIncidents.length === 1 ? '' : 's'}
                {unacknowledged.length > 0 && ` · ${unacknowledged.length} not yet acknowledged`}
              </div>
              <div className="mt-1 text-[12.5px] text-mid">
                Worst first, then longest waiting.{' '}
                {canRespond
                  ? 'Acknowledge to record that a team has picked it up; resolve to close it and release the person involved.'
                  : 'Acknowledging and resolving belong to another role, so this board is read-only for you — open any card to read the full record.'}
              </div>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {board.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                person={incident.personnel_id ? getPerson(incident.personnel_id) : null}
                now={now}
                selected={incident.id === selectedId}
                canRespond={canRespond}
                onAcknowledge={() => acknowledge(incident.id)}
                onResolve={() => resolve(incident.id)}
                onOpen={() => setSelectedId(incident.id)}
              />
            ))}
          </div>
        </div>
      )}

      {openIncidents.length === 0 && (
        <Panel eyebrow="Response board" title="Nothing Open">
          <StateBlock
            kind="empty"
            title="No open incidents"
            message="Every incident on record has been resolved. Report one below to see the alert flow."
          />
        </Panel>
      )}

      {/* ================= 4. THE REPORT FORM ================= */}
      {showForm && (
        <Panel
          eyebrow="New report"
          title="Report an Incident"
          subtitle="It is filed as ACTIVE and unacknowledged, which is what puts it at the top of the board."
          action={
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setShowForm(false)
                setFormError(null)
              }}
            >
              <X size={13} /> Cancel
            </button>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="field-label" htmlFor="em-type">
                  Incident type *
                </label>
                <select
                  id="em-type"
                  name="type"
                  className="input"
                  value={form.type}
                  onChange={setField}
                >
                  {optionsFrom(EMERGENCY_TYPE).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label" htmlFor="em-sev">
                  Severity *
                </label>
                <select
                  id="em-sev"
                  name="severity"
                  className="input"
                  value={form.severity}
                  onChange={setField}
                >
                  {optionsFrom(SEVERITY).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label" htmlFor="em-loc">
                  Nearest known location *
                </label>
                {/* A known site rather than free text, because this is
                    where the coordinates come from — and coordinates are
                    what put the incident on the Live Map. */}
                <select
                  id="em-loc"
                  name="location_id"
                  className="input"
                  value={form.location_id}
                  onChange={setField}
                >
                  <option value="">Select a location…</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label" htmlFor="em-detail">
                  Where exactly
                </label>
                {/* Optional, and the useful half of the location: the site
                    is "Maitri Station", the casualty is in "Sector B". */}
                <input
                  id="em-detail"
                  name="detail"
                  className="input"
                  value={form.detail}
                  onChange={setField}
                  placeholder="e.g. Sector B, 2 km east"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="field-label" htmlFor="em-person">
                  Person affected
                </label>
                {/* Naming someone here is connection 2: they flip to
                    EMERGENCY status across Personnel and the Live Map. */}
                <select
                  id="em-person"
                  name="personnel_id"
                  className="input"
                  value={form.personnel_id}
                  onChange={setField}
                >
                  <option value="">Nobody / not known yet</option>
                  {personnel.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.name} · {p.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="field-label" htmlFor="em-team">
                  Responding team
                </label>
                <input
                  id="em-team"
                  name="assigned_team"
                  className="input"
                  value={form.assigned_team}
                  onChange={setField}
                  placeholder="Leave blank if not assigned yet"
                  list="em-teams"
                />
                {/* Suggests the teams already on record while still
                    allowing a new one to be typed. */}
                <datalist id="em-teams">
                  {[...new Set(emergencies.map((e) => e.assigned_team).filter(Boolean))].map(
                    (team) => (
                      <option key={team} value={team} />
                    )
                  )}
                </datalist>
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="em-desc">
                What has happened *
              </label>
              <textarea
                id="em-desc"
                name="description"
                className="input"
                rows={3}
                value={form.description}
                onChange={setField}
                placeholder="Condition, immediate risk, what is being requested."
              />
            </div>

            {/* The derived link, shown before the operator commits. */}
            <p className="text-[11.5px] text-low">
              {previewExpedition ? (
                <>
                  Will be filed against{' '}
                  <span className="text-[var(--ice)]">
                    {previewExpedition.id} {previewExpedition.name}
                  </span>
                  , worked out from the person and location above.
                </>
              ) : (
                'No expedition matches this person or location yet — the incident will be filed without one.'
              )}
            </p>

            {formError && (
              <div className="alert-strip">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--red)]" />
                <div className="text-[12.5px] text-hi">{formError}</div>
              </div>
            )}

            <button type="submit" className="btn btn--alert">
              <Siren size={14} /> File incident report
            </button>
          </form>
        </Panel>
      )}

      {/* ================= 5. THE INCIDENT LOG ================= */}
      <Panel
        eyebrow="Log"
        title="Incident Log"
        subtitle={
          filtersActive
            ? `Showing ${visible.length} of ${emergencies.length} incidents`
            : 'Every incident on record, resolved ones included. Click a row for detail.'
        }
        action={
          <div className="flex gap-2">
            {filtersActive && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setFilters(NO_FILTERS)}
              >
                <X size={13} /> Clear filters
              </button>
            )}
            {!showForm && (
              <button type="button" className="btn btn--alert btn--sm" onClick={() => setShowForm(true)}>
                <Plus size={13} /> Report
              </button>
            )}
          </div>
        }
      >
        {/* ---------- EXPEDITION SELECTION TABS ---------- */}
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line-soft)] pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="mr-1 flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-wider text-mid">
              <Compass size={13} className="text-[var(--ice)]" />
              <span>Expedition:</span>
            </div>
            <button
              type="button"
              onClick={() => setFilter('expedition', 'ALL')}
              className={`rounded px-2.5 py-1 text-xs font-mono transition-all ${
                filters.expedition === 'ALL'
                  ? 'bg-[var(--ice)] font-semibold text-white shadow-sm'
                  : 'bg-[var(--surface-sunken)] text-mid hover:bg-[var(--surface-hover)] hover:text-hi'
              }`}
            >
              All Expeditions ({emergencies.length})
            </button>
            {expeditions.map((exp) => {
              const count = emergencies.filter((e) => e.expedition_id === exp.id).length
              const hasActiveAlert = emergencies.some(
                (e) => e.expedition_id === exp.id && e.status !== 'RESOLVED'
              )
              const isSelected = filters.expedition === exp.id
              return (
                <button
                  key={exp.id}
                  type="button"
                  onClick={() => setFilter('expedition', isSelected ? 'ALL' : exp.id)}
                  className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-mono transition-all ${
                    isSelected
                      ? 'bg-[var(--ice)] font-semibold text-white shadow-sm'
                      : 'bg-[var(--surface-sunken)] text-mid hover:bg-[var(--surface-hover)] hover:text-hi'
                  }`}
                >
                  {hasActiveAlert && (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--red)]" />
                  )}
                  <span>{exp.id}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ---------- FILTERS ---------- */}
        <div className="mb-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="field-label" htmlFor="em-search">
              <Filter size={10} className="mr-1 inline" /> Search
            </label>
            <input
              id="em-search"
              className="input"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder="ID, location, team or description"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="em-f-exp">
              Expedition
            </label>
            <select
              id="em-f-exp"
              className="input"
              value={filters.expedition}
              onChange={(e) => setFilter('expedition', e.target.value)}
            >
              <option value="ALL">All expeditions</option>
              {expeditions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.id} · {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="em-f-status">
              Status
            </label>
            <select
              id="em-f-status"
              className="input"
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value)}
            >
              <option value="ALL">All statuses</option>
              {optionsFrom(EMERGENCY_STATUS).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="em-f-sev">
              Severity
            </label>
            <select
              id="em-f-sev"
              className="input"
              value={filters.severity}
              onChange={(e) => setFilter('severity', e.target.value)}
            >
              <option value="ALL">All severities</option>
              {optionsFrom(SEVERITY).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="em-f-type">
              Type
            </label>
            <select
              id="em-f-type"
              className="input"
              value={filters.type}
              onChange={(e) => setFilter('type', e.target.value)}
            >
              <option value="ALL">All types</option>
              {optionsFrom(EMERGENCY_TYPE).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DataTable
          loading={loading}
          error={error}
          rows={visible}
          rowKey={(row) => row.id}
          onRowClick={(row) => setSelectedId(row.id)}
          maxHeight="500px"
          emptyTitle="No incidents match these filters"
          emptyMessage="Clear the filters to see the whole log."
          columns={[
            { header: 'ID', cell: (r) => r.id, mono: true, width: '76px' },
            {
              header: 'Incident',
              strong: true,
              cell: (r) => (
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span>{statusLabel(EMERGENCY_TYPE, r.type)}</span>
                    {r.id === selectedId && (
                      <ChevronRight size={14} className="shrink-0 text-[var(--ice)]" />
                    )}
                  </div>
                  <div className="truncate text-[11px] font-normal text-low" style={{ maxWidth: 260 }}>
                    {r.location}
                  </div>
                </div>
              ),
            },
            {
              header: 'Expedition',
              width: '90px',
              cell: (r) => {
                const exp = getExpedition(r.expedition_id)
                return exp ? (
                  <span className="mono text-[11px] text-[var(--ice)]" title={exp.name}>
                    {exp.id}
                  </span>
                ) : (
                  <span className="text-[11px] text-low">—</span>
                )
              },
            },
            {
              header: 'Severity',
              width: '100px',
              cell: (r) => <Badge map={SEVERITY} value={r.severity} />,
            },
            {
              header: 'Status',
              width: '108px',
              cell: (r) => <Badge map={EMERGENCY_STATUS} value={r.status} dot />,
            },
            {
              header: 'Reported',
              width: '96px',
              align: 'right',
              mono: true,
              cell: (r) => <span className="text-[12px] text-mid">{timeAgo(r.reported_at)}</span>,
            },
            {
              /* One column that answers a different question depending on
                 whether the incident is finished: how long it has been
                 open, or how long it took to close. The label says which. */
              header: 'Open / took',
              width: '104px',
              align: 'right',
              mono: true,
              cell: (r) =>
                r.status === 'RESOLVED' ? (
                  <span className="text-[12px] text-low">{gap(r.reported_at, r.resolved_at)}</span>
                ) : (
                  <span className="text-[12px] text-[var(--orange)]">
                    {duration(r.reported_at, now)}
                  </span>
                ),
            },
          ]}
        />
      </Panel>

      {/* ================= 6. DETAIL + READINESS ================= */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* ---------- Selected incident ---------- */}
        {!selected ? (
          <Panel className="xl:col-span-2" eyebrow="Detail" title="Incident Detail">
            <StateBlock
              kind="empty"
              title="Nothing selected"
              message="Click an incident in the log above."
            />
          </Panel>
        ) : (
          <Panel
            className="xl:col-span-2"
            eyebrow={selected.id}
            title={statusLabel(EMERGENCY_TYPE, selected.type)}
            subtitle={selected.location}
            action={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge map={SEVERITY} value={selected.severity} />
                <Badge map={EMERGENCY_STATUS} value={selected.status} dot />
              </div>
            }
          >
            <p className="mb-4 text-[12.5px] leading-relaxed text-mid">{selected.description}</p>

            <dl className="space-y-0">
              <div className="kv">
                <dt>Reported</dt>
                <dd className="mono text-[12px]">
                  {formatDateTime(selected.reported_at)} · {timeAgo(selected.reported_at)}
                </dd>
              </div>
              <div className="kv">
                <dt>Acknowledged</dt>
                <dd className="mono text-[12px]">
                  {selected.acknowledged_at ? (
                    <span className="text-[var(--green)]">
                      {gap(selected.reported_at, selected.acknowledged_at)} after the report
                    </span>
                  ) : (
                    <span className="text-[var(--orange)]">Not yet</span>
                  )}
                </dd>
              </div>
              {selected.status === 'RESOLVED' && (
                <div className="kv">
                  <dt>Resolved</dt>
                  <dd className="mono text-[12px]">
                    {formatDateTime(selected.resolved_at)} · took{' '}
                    {gap(selected.reported_at, selected.resolved_at)}
                  </dd>
                </div>
              )}
              <div className="kv">
                <dt>Position</dt>
                <dd className="mono text-[12px]">
                  {formatCoords(selected.latitude, selected.longitude)}
                </dd>
              </div>
              <div className="kv">
                <dt>Expedition</dt>
                <dd>
                  {selected.expedition_id ? (
                    <button
                      type="button"
                      className="text-[12.5px] text-[var(--ice)] underline decoration-dotted"
                      onClick={() => goTo('expeditions')}
                    >
                      {getExpedition(selected.expedition_id)?.name || selected.expedition_id}
                    </button>
                  ) : (
                    <span className="text-low">Unassigned</span>
                  )}
                </dd>
              </div>
            </dl>

            {/* ---------- The person involved ----------
                Read live from the personnel roster, so their status here
                is the same status the Personnel page and the map show.
                Blood group and satellite phone are on the card because
                those are the two facts a responder actually needs. */}
            <div className="mt-4 border-t border-[var(--line-soft)] pt-4">
              <div className="eyebrow mb-2">Person involved</div>
              {(() => {
                const person = selected.personnel_id ? getPerson(selected.personnel_id) : null
                if (!person) {
                  return (
                    <p className="text-[12px] text-low">
                      Nobody is named on this incident. Naming someone is what flips their status to
                      EMERGENCY across Personnel and the Live Map.
                    </p>
                  )
                }
                return (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <User size={13} className="shrink-0 text-low" />
                        <span className="text-[13px] text-hi">{person.name}</span>
                        <Badge map={PERSONNEL_STATUS} value={person.status} />
                      </div>
                      <div className="mt-1 text-[11.5px] text-low">
                        <span className="mono">{person.id}</span> · {person.role}
                      </div>
                      <div className="mono mt-1 text-[11.5px] text-mid">
                        Blood group {person.blood_group || '—'} · Satphone{' '}
                        {person.satphone || '—'}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => goTo('personnel')}
                      >
                        <Users size={13} /> Roster
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => goTo('map')}
                      >
                        <MapPin size={13} /> Map
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* ---------- Team + running log ----------
                Typing writes straight into the shared store on every
                keystroke, the same way the cargo delay reason does, so
                there is no separate "save" step to explain. */}
            <div className="mt-4 grid gap-4 border-t border-[var(--line-soft)] pt-4 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="em-assign">
                  Responding team
                </label>
                <input
                  id="em-assign"
                  className="input"
                  value={selected.assigned_team || ''}
                  disabled={!canRespond}
                  onChange={(e) => updateEmergency(selected.id, { assigned_team: e.target.value })}
                  placeholder="Who is dealing with this?"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="em-note">
                  Response log
                </label>
                <input
                  id="em-note"
                  className="input"
                  value={selected.response_note || ''}
                  disabled={!canRespond}
                  onChange={(e) => updateEmergency(selected.id, { response_note: e.target.value })}
                  placeholder="e.g. Sled team departed 02:15, ETA 40 min"
                />
              </div>
            </div>

            {/* ---------- DISPATCH LOG ---------- */}
            <div className="mt-3 flex items-start gap-2 text-[11.5px] text-low">
              <Radio size={13} className="mt-0.5 shrink-0" />
              <span>
                Assigning a team <strong className="text-mid">logs the dispatch order</strong>.
                Field coordination proceeds over dedicated VHF/HF polar emergency frequencies.
              </span>
            </div>

            {/* ---------- Actions ---------- */}
            {selected.status !== 'RESOLVED' && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line-soft)] pt-4">
                {canRespond ? (
                  <>
                    {!selected.acknowledged_at && (
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() => acknowledge(selected.id)}
                      >
                        <Clock size={13} /> Acknowledge
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn--sm"
                      onClick={() => resolve(selected.id)}
                      style={{ borderColor: 'rgba(79,201,138,0.45)', color: 'var(--green)' }}
                    >
                      <CheckCircle2 size={13} /> Resolve
                    </button>
                    {selected.personnel_id && (
                      <span className="self-center text-[11px] text-low">
                        Resolving releases {getPerson(selected.personnel_id)?.name || 'the person'}{' '}
                        back to Active.
                      </span>
                    )}
                  </>
                ) : (
                  /* The role names in this sentence are DERIVED from the
                     table in src/lib/roles.js, not typed here, so the page
                     cannot end up naming the wrong roles. */
                  <span className="text-[11.5px] leading-relaxed text-low">
                    Deciding that an incident is being handled, or is over, belongs to the{' '}
                    <span className="text-mid">{rolesThatCanRespond().join(' and the ')}</span>, so
                    those controls are not shown for this role. Reporting an incident is not
                    restricted — the form below works for everyone.
                  </span>
                )}
              </div>
            )}
          </Panel>
        )}

        {/* ---------- Response readiness (connection 5) ---------- */}
        <Panel
          eyebrow="Connected data"
          title="Response Readiness"
          subtitle="Read from the roster and the stock records, not typed here"
        >
          {!selected ? (
            <StateBlock kind="empty" title="Select an incident" />
          ) : (
            <div className="space-y-4">
              {/* --- Medical staff --- */}
              <div>
                <div className="eyebrow mb-2">Medical staff on roster</div>
                {medics.length === 0 ? (
                  <p className="text-[12px] text-low">
                    No medical role on the roster. Worth flagging on its own.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {medics.map((p) => {
                      const atSite = p.location_id === selected.location_id
                      return (
                        <li key={p.id} className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-[12.5px] text-hi">{p.name}</div>
                            <div className="truncate text-[11px] text-low">
                              {getLocation(p.location_id)?.name || '—'}
                              {atSite && (
                                <span className="text-[var(--green)]"> · at the incident site</span>
                              )}
                            </div>
                          </div>
                          <Badge map={PERSONNEL_STATUS} value={p.status} />
                        </li>
                      )
                    })}
                  </ul>
                )}
                <p className="mt-2 text-[11px] text-low">
                  {medics.length} of {personnel.length} on the roster hold a medical role.
                </p>
              </div>

              {/* --- Relevant stores --- */}
              <div className="border-t border-[var(--line-soft)] pt-4">
                <div className="eyebrow mb-2">
                  Stores for a {statusLabel(EMERGENCY_TYPE, selected.type).toLowerCase()} call
                </div>

                {!supply ? (
                  <p className="text-[12px] text-low">
                    No stores are recorded at this site, and no expedition links it to a base
                    station. Nothing to show rather than another station&apos;s stock.
                  </p>
                ) : (
                  <>
                    <p className="mb-2.5 text-[11.5px] text-low">
                      At <span className="text-mid">{supply.name}</span>
                      {supply.via && (
                        <>
                          {' '}
                          — the incident site holds no stores of its own, so this is the base station
                          of{' '}
                          <span className="text-[var(--ice)]">{supply.via.id}</span>, where its
                          resupply comes from.
                        </>
                      )}
                    </p>

                    {relevantStock.length === 0 ? (
                      <p className="text-[12px] text-low">
                        Nothing in the{' '}
                        {(RELEVANT_STOCK[selected.type] || RELEVANT_STOCK.OTHER).join(' or ')}{' '}
                        categories is held at {supply.name}.
                      </p>
                    ) : (
                      <ul className="space-y-2.5">
                        {relevantStock.map((item) => (
                          <li key={item.id} className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-[12.5px] text-hi">{item.item_name}</div>
                              <div className="mono truncate text-[11px] text-low">
                                {formatQuantity(item.quantity, item.unit)} · minimum{' '}
                                {item.minimum_quantity}
                              </div>
                            </div>
                            <Badge map={STOCK_STATUS} value={stockStatus(item)} />
                          </li>
                        ))}
                      </ul>
                    )}

                    <button
                      type="button"
                      className="btn btn--ghost btn--sm mt-3"
                      onClick={() => goTo('inventory')}
                    >
                      <Boxes size={13} /> Open inventory
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* ================= OPERATIONAL EMERGENCY PROTOCOL ================= */}
      <div className="alert-strip alert-strip--info">
        <Radio size={15} className="mt-0.5 shrink-0 text-[var(--accent)]" />
        <div className="text-[12px] text-mid">
          <strong className="text-hi">
            Emergency Dispatch & Triage Matrix.
          </strong>{' '}
          Logging an incident synchronizes response teams, alerts medical bay, and updates station status. Severity levels adhere to COMNAP Antarctic incident management guidelines. Field telemetry and distress radio protocols maintain offline persistence across satellite blackouts.
        </div>
      </div>
    </div>
  )}
</div>
)
}

/* ============================================================
   ONE CARD ON THE RESPONSE BOARD
   ============================================================
   Split out for the same reason the weather station card is: the page
   body stays readable, and one incident's layout lives in one place.
   ============================================================ */
function IncidentCard({ incident, person, now, selected, canRespond, onAcknowledge, onResolve, onOpen }) {
  const waiting = !incident.acknowledged_at

  return (
    <div
      className="incident"
      /* THE SEVERITY COLOUR ON THE LEFT EDGE, taken from the same tone the
         badge beside it uses. An SVG fill and a CSS variable cannot meet,
         which is why statusColour() exists — this is the same problem: a
         colour chosen from data at runtime. Because both the stripe and
         the badge read one tone, they can never disagree. */
      style={{
        borderLeftColor: statusColour(SEVERITY, incident.severity),
        /* The selected card is outlined so the board and the detail panel
           below visibly refer to the same incident. */
        boxShadow: selected ? 'inset 0 0 0 1px var(--ice-dim)' : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono text-[12px] text-mid">{incident.id}</span>
            <span className="text-[13.5px] text-hi">
              {statusLabel(EMERGENCY_TYPE, incident.type)}
            </span>
            <Badge map={SEVERITY} value={incident.severity} />
            <Badge map={EMERGENCY_STATUS} value={incident.status} dot />
          </div>
          <div className="mt-1 flex items-start gap-1.5 text-[11.5px] text-low">
            <MapPin size={11} className="mt-0.5 shrink-0" />
            <span className="min-w-0">
              {incident.location}
              <span className="mono">
                {' · '}
                {formatCoords(incident.latitude, incident.longitude)}
              </span>
            </span>
          </div>
        </div>

        {/* The clock. Red while nobody has picked it up, amber once a team
            has — the number a duty officer is looking for either way. */}
        <div className="shrink-0 text-right">
          <div
            className="incident-clock"
            style={{ color: waiting ? 'var(--red)' : 'var(--amber)' }}
          >
            {duration(incident.reported_at, now)}
          </div>
          <div className="text-[10px] uppercase tracking-[0.07em] text-low">
            {waiting ? 'unacknowledged' : 'open'}
          </div>
        </div>
      </div>

      <p className="mt-2.5 text-[12px] leading-relaxed text-mid">{incident.description}</p>

      <div className="mt-2.5 space-y-1 text-[11.5px]">
        {person && (
          <div className="flex items-center gap-1.5 text-mid">
            <User size={11} className="shrink-0 text-low" />
            <span className="truncate">
              {person.name} · {person.role}
              <span className="mono text-low"> · {person.blood_group || '—'}</span>
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Users size={11} className="shrink-0 text-low" />
          {incident.assigned_team ? (
            <span className="truncate text-mid">{incident.assigned_team}</span>
          ) : (
            /* An unassigned incident is a real state worth shouting about,
               not a blank field. */
            <span className="text-[var(--orange)]">No team assigned</span>
          )}
        </div>
        {incident.response_note && (
          <div className="flex items-start gap-1.5 text-low">
            <Clock size={11} className="mt-0.5 shrink-0" />
            <span>{incident.response_note}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {/* Acknowledge and Resolve belong to the roles that may respond.
            Detail is always there, so a read-only session can still open the
            incident and read everything about it. */}
        {canRespond && waiting && (
          <button type="button" className="btn btn--sm" onClick={onAcknowledge}>
            <Clock size={12} /> Acknowledge
          </button>
        )}
        {canRespond && (
          <button
            type="button"
            className="btn btn--sm"
            onClick={onResolve}
            style={{ borderColor: 'rgba(79,201,138,0.45)', color: 'var(--green)' }}
          >
            <CheckCircle2 size={12} /> Resolve
          </button>
        )}
        <button type="button" className="btn btn--ghost btn--sm" onClick={onOpen}>
          Detail
        </button>
      </div>
    </div>
  )
}
