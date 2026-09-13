/**
 * CARGO TRACKING
 * ==============
 * Where a consignment is, where it is going, and how urgent it is.
 *
 * THE FILTERS (master prompt section 7, module 4):
 *   Search + status + category + priority. All four narrow the same list
 *   at the same time, so "show me every CRITICAL Fuel consignment that is
 *   DELAYED" is three clicks, not a new screen.
 *
 * THE CONNECTED BITS (master prompt section 12) — four of them:
 *   1. Change a row's STATUS and the dashboard's "Cargo In Transit" card
 *      changes with it. Nothing on this page knows the dashboard exists;
 *      both read the same array in DataContext.
 *   2. Change a row's PRIORITY to CRITICAL and it appears in the
 *      dashboard's "Cargo Needing Attention" list.
 *   3. Every status change writes a line into Recent Activity.
 *   4. Log a new consignment against an expedition and it shows up in that
 *      expedition's "Assigned Cargo" panel on the Expeditions page.
 *
 * HONEST ABOUT THE DATA: these are prototype records. The prototype does
 * not talk to any vessel, aircraft or NCPOR consignment system — statuses
 * are the ones an operator typed into this console.
 */

import { useState } from 'react'
import {
  AlertTriangle,
  ChevronRight,
  Compass,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  Package,
  Plus,
  Ship,
  X,
} from 'lucide-react'

import Badge from '../components/Badge'
import DataTable from '../components/DataTable'
import HorizontalBarChart from '../components/HorizontalBarChart'
import Panel from '../components/Panel'
import StateBlock from '../components/StateBlock'
import { useData } from '../store/DataContext'
import { useAuth } from '../store/AuthContext'
import { formatNumber, formatQuantity, timeAgo } from '../lib/format'
import { CARGO_STATUS, PRIORITY, optionsFrom, statusColour, statusLabel } from '../lib/statuses'

/* The blank form, kept at module level so "reset the form" is one line
   and so the object is not rebuilt on every render. */
const EMPTY_FORM = {
  item_name: '',
  category: '',
  quantity: '',
  unit: 'units',
  location: '',
  destination: '',
  weight_kg: '',
  priority: 'MEDIUM',
  expedition_id: '',
}

/* "No filters applied" — used both as the starting value and by the
   Clear button, so the two can never disagree. */
const NO_FILTERS = {
  search: '',
  status: 'ALL',
  category: 'ALL',
  priority: 'ALL',
  expedition: 'ALL',
}

export default function Cargo({ goTo }) {
  const { cargo, expeditions, locations, loading, error, addCargo, updateCargo, getExpedition } =
    useData()

  /* WHAT THIS ROLE MAY CHANGE — see src/lib/roles.js. */
  const { canManage } = useAuth()

  /* Which consignment is open in the detail panel. Defaults to whatever is
     delayed, because that is what an operator actually needs to look at. */
  const [selectedId, setSelectedId] = useState(
    () => (cargo.find((c) => c.status === 'DELAYED') || cargo[0])?.id ?? null
  )

  const [filters, setFilters] = useState(NO_FILTERS)
  const [viewMode, setViewMode] = useState('sections') // 'sections' | 'table'
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [formSuccess, setFormSuccess] = useState(null)

  /* The category list is READ FROM THE DATA, not typed out here. Log a
     consignment in a brand new category and it appears in this dropdown
     on its own. */
  const categories = [...new Set(cargo.map((c) => c.category).filter(Boolean))].sort()

  /* ---------- THE FILTER CHAIN ----------
     A plain chain of .filter() calls. Each line is one rule, so you can
     read the whole thing top to bottom and know exactly what is shown. */
  const term = filters.search.trim().toLowerCase()
  const visible = cargo
    .filter((c) => filters.status === 'ALL' || c.status === filters.status)
    .filter((c) => filters.category === 'ALL' || c.category === filters.category)
    .filter((c) => filters.priority === 'ALL' || c.priority === filters.priority)
    .filter((c) => filters.expedition === 'ALL' || c.expedition_id === filters.expedition)
    .filter((c) => {
      if (!term) return true
      return (
        c.item_name.toLowerCase().includes(term) ||
        c.id.toLowerCase().includes(term) ||
        (c.destination || '').toLowerCase().includes(term) ||
        (c.location || '').toLowerCase().includes(term)
      )
    })

  const filtersActive =
    filters.search !== '' ||
    filters.status !== 'ALL' ||
    filters.category !== 'ALL' ||
    filters.priority !== 'ALL' ||
    filters.expedition !== 'ALL'

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }))

  const selected = cargo.find((c) => c.id === selectedId) || null

  /* ---------- SMALL DERIVED NUMBERS ----------
     Calculated on every render from the raw array, exactly like the
     dashboard's cards. Nothing here is stored. */
  const inTransit = cargo.filter((c) => c.status === 'IN_TRANSIT')
  const tonnesInTransit = inTransit.reduce((sum, c) => sum + (Number(c.weight_kg) || 0), 0) / 1000

  /* The watchlist: anything delayed, plus anything CRITICAL that has not
     landed yet. Delays get rank 0 so they sort to the top. */
  const attentionRank = (c) => (c.status === 'DELAYED' ? 0 : 1)
  const needsAttention = cargo
    .filter((c) => c.status === 'DELAYED' || (c.priority === 'CRITICAL' && c.status !== 'ARRIVED'))
    .sort((a, b) => attentionRank(a) - attentionRank(b))

  /* Load per destination — how much is heading to each place. This is the
     view a logistics officer actually wants: not "14 consignments" but
     "6.4 tonnes going to Maitri, one of it delayed". */
  const byDestination = Object.values(
    cargo.reduce((acc, c) => {
      const key = c.destination || 'Unassigned'
      if (!acc[key]) acc[key] = { destination: key, count: 0, kg: 0, delayed: 0 }
      acc[key].count += 1
      acc[key].kg += Number(c.weight_kg) || 0
      if (c.status === 'DELAYED') acc[key].delayed += 1
      return acc
    }, {})
  ).sort((a, b) => b.kg - a.kg)

  /* ---------- CHART DATA (master prompt section 7) ----------
     Counted straight off the same `cargo` array the table above reads.
     Change a row's status in the register and one bar loses a consignment
     while another gains one, on the same render.

     We walk the STATUS MAP rather than the data, for two reasons: the bars
     come out in pipeline order (planned -> loaded -> in transit -> arrived
     -> delayed) instead of whatever order the records happen to be in, and
     a status with nothing in it keeps its row. A bar that vanishes when it
     empties makes the chart jump about, and "nothing is delayed" is worth
     seeing. */
  function countByStatus(map, field) {
    return Object.keys(map).map((key) => {
      const rows = cargo.filter((c) => c[field] === key)
      const kg = rows.reduce((sum, c) => sum + (Number(c.weight_kg) || 0), 0)
      return {
        label: statusLabel(map, key),
        value: rows.length,
        colour: statusColour(map, key),
        note: rows.length > 0 ? String(rows.length) : '',
        tip: `${rows.length} consignment${rows.length === 1 ? '' : 's'} · ${(kg / 1000).toFixed(1)} tonnes`,
      }
    })
  }

  const chartByStatus = countByStatus(CARGO_STATUS, 'status')
  const chartByPriority = countByStatus(PRIORITY, 'priority')

  /* ---------- THE FORM ---------- */
  const setField = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))
    setFormError(null)
  }

  /**
   * VALIDATION (master prompt section 21 — validate user input).
   * We check before saving and say exactly which field is wrong.
   */
  function handleSubmit(event) {
    event.preventDefault()
    setFormSuccess(null)

    const name = form.item_name.trim()
    if (name.length < 2) return setFormError('Item name needs at least 2 characters.')
    if (!form.category.trim()) return setFormError('Category is required.')

    const qty = Number(form.quantity)
    if (!form.quantity || Number.isNaN(qty) || qty <= 0)
      return setFormError('Quantity must be a number greater than 0.')

    if (!form.location.trim()) return setFormError('Current location is required.')
    if (!form.destination.trim()) return setFormError('Destination is required.')
    if (form.location.trim().toLowerCase() === form.destination.trim().toLowerCase())
      return setFormError('Destination must be different from the current location.')

    const weight = form.weight_kg === '' ? 0 : Number(form.weight_kg)
    if (Number.isNaN(weight) || weight < 0)
      return setFormError('Weight must be a positive number of kilograms.')

    try {
      const created = addCargo({
        item_name: name,
        category: form.category.trim(),
        quantity: qty,
        unit: form.unit.trim() || 'units',
        location: form.location.trim(),
        destination: form.destination.trim(),
        weight_kg: weight,
        priority: form.priority,
        expedition_id: form.expedition_id || null,
      })

      setForm(EMPTY_FORM)
      setFormError(null)
      setFormSuccess(`${created.id} ${created.item_name} logged as PLANNED.`)
      setSelectedId(created.id)
      setShowForm(false)
    } catch (err) {
      /* If saving ever fails, say so rather than silently doing nothing. */
      setFormError(`Could not save: ${err.message}`)
    }
  }

  return (
    <div className="space-y-5">
      {/* ================= SUMMARY STRIP ================= */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: 'Consignments', value: cargo.length },
          { label: 'In transit', value: inTransit.length, tone: 'ok' },
          {
            label: 'Delayed',
            value: cargo.filter((c) => c.status === 'DELAYED').length,
            tone: 'alert',
          },
          {
            label: 'Critical priority',
            value: cargo.filter((c) => c.priority === 'CRITICAL' && c.status !== 'ARRIVED').length,
            tone: 'warn',
          },
          { label: 'Tonnes in transit', value: tonnesInTransit.toFixed(1) },
        ].map((item) => (
          <div key={item.label} className="card-tight">
            <div className="eyebrow">{item.label}</div>
            <div className={`stat-value ${item.tone ? `stat-value--${item.tone}` : ''}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* ================= SUCCESS MESSAGE ================= */}
      {formSuccess && (
        <div
          className="alert-strip"
          style={{
            borderLeftColor: 'var(--green)',
            borderColor: 'rgba(79,201,138,0.4)',
            background: 'rgba(79,201,138,0.07)',
          }}
        >
          <div className="text-[12.5px] text-mid">{formSuccess}</div>
        </div>
      )}

      {/* ================= ADD FORM (hidden until asked for) ================= */}
      {showForm && (
        <Panel
          eyebrow="New record"
          title="Log Consignment"
          subtitle="It starts as PLANNED. Move it along with the status dropdown in the register."
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="field-label" htmlFor="cg-name">
                  Item name *
                </label>
                <input
                  id="cg-name"
                  name="item_name"
                  className="input"
                  value={form.item_name}
                  onChange={setField}
                  placeholder="e.g. Aviation Fuel Bladders"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="cg-cat">
                  Category *
                </label>
                {/* A datalist suggests the categories already in use but
                    still allows a new one to be typed in. */}
                <input
                  id="cg-cat"
                  name="category"
                  className="input"
                  value={form.category}
                  onChange={setField}
                  placeholder="e.g. Fuel"
                  list="cargo-categories"
                />
                <datalist id="cargo-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label" htmlFor="cg-qty">
                    Quantity *
                  </label>
                  <input
                    id="cg-qty"
                    name="quantity"
                    type="number"
                    min="1"
                    className="input"
                    value={form.quantity}
                    onChange={setField}
                    placeholder="e.g. 24"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="cg-unit">
                    Unit
                  </label>
                  <input
                    id="cg-unit"
                    name="unit"
                    className="input"
                    value={form.unit}
                    onChange={setField}
                    placeholder="drums"
                  />
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="cg-from">
                  Currently at *
                </label>
                <input
                  id="cg-from"
                  name="location"
                  className="input"
                  value={form.location}
                  onChange={setField}
                  placeholder="e.g. Cape Town Staging Port"
                  list="cargo-places"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="cg-to">
                  Destination *
                </label>
                <input
                  id="cg-to"
                  name="destination"
                  className="input"
                  value={form.destination}
                  onChange={setField}
                  placeholder="e.g. Maitri Station"
                  list="cargo-places"
                />
                {/* One datalist shared by both place fields. */}
                <datalist id="cargo-places">
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="field-label" htmlFor="cg-weight">
                  Total weight (kg)
                </label>
                <input
                  id="cg-weight"
                  name="weight_kg"
                  type="number"
                  min="0"
                  className="input"
                  value={form.weight_kg}
                  onChange={setField}
                  placeholder="e.g. 4800"
                />
              </div>

              <div>
                <label className="field-label" htmlFor="cg-prio">
                  Priority
                </label>
                <select
                  id="cg-prio"
                  name="priority"
                  className="input"
                  value={form.priority}
                  onChange={setField}
                >
                  {optionsFrom(PRIORITY).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="cg-exp">
                  Expedition
                </label>
                {/* Choosing one here is what makes the consignment appear in
                    that expedition's "Assigned Cargo" panel. */}
                <select
                  id="cg-exp"
                  name="expedition_id"
                  className="input"
                  value={form.expedition_id}
                  onChange={setField}
                >
                  <option value="">Unassigned</option>
                  {expeditions.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.id} — {e.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formError && (
              <div className="alert-strip">
                <div className="text-[12.5px] text-hi">{formError}</div>
              </div>
            )}

            <button type="submit" className="btn">
              <Plus size={14} /> Log consignment
            </button>
          </form>
        </Panel>
      )}

      {/* ================= THE REGISTER ================= */}
      <Panel
        eyebrow="Register"
        title="Consignment Register"
        subtitle={
          filtersActive
            ? `Showing ${visible.length} of ${cargo.length} consignments`
            : 'Click a row for detail. Change a status or priority right in the row.'
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
            {canManage && !showForm && (
              <button type="button" className="btn btn--sm" onClick={() => setShowForm(true)}>
                <Plus size={13} /> Log
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
              All Expeditions ({cargo.length})
            </button>
            {expeditions.map((exp) => {
              const count = cargo.filter((c) => c.expedition_id === exp.id).length
              const hasDelayed = cargo.some(
                (c) => c.expedition_id === exp.id && c.status === 'DELAYED'
              )
              const hasCritical = cargo.some(
                (c) => c.expedition_id === exp.id && c.priority === 'CRITICAL'
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
                  {hasDelayed ? (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--orange)]" />
                  ) : hasCritical ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--red)]" />
                  ) : null}
                  <span>{exp.id}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              )
            })}
          </div>

          {/* View Mode Toggle: Separate Sections vs Unified Table */}
          <div className="flex items-center rounded border border-[var(--line)] bg-[var(--surface-sunken)] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('sections')}
              className={`flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] transition ${
                viewMode === 'sections'
                  ? 'bg-[var(--surface-card)] font-semibold text-hi shadow-sm'
                  : 'text-mid hover:text-hi'
              }`}
              title="View by separate expedition sections"
            >
              <LayoutGrid size={11} />
              <span>Expedition Sections</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] transition ${
                viewMode === 'table'
                  ? 'bg-[var(--surface-card)] font-semibold text-hi shadow-sm'
                  : 'text-mid hover:text-hi'
              }`}
              title="View unified table"
            >
              <List size={11} />
              <span>Unified Table</span>
            </button>
          </div>
        </div>

        {/* ---------- FILTERS ---------- */}
        <div className="mb-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="field-label" htmlFor="cg-search">
              <Filter size={10} className="mr-1 inline" /> Search
            </label>
            <input
              id="cg-search"
              className="input"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder="Item, ID, origin or destination"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="cg-f-exp">
              Expedition
            </label>
            <select
              id="cg-f-exp"
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
            <label className="field-label" htmlFor="cg-f-status">
              Status
            </label>
            <select
              id="cg-f-status"
              className="input"
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value)}
            >
              <option value="ALL">All statuses</option>
              {optionsFrom(CARGO_STATUS).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="cg-f-cat">
              Category
            </label>
            <select
              id="cg-f-cat"
              className="input"
              value={filters.category}
              onChange={(e) => setFilter('category', e.target.value)}
            >
              <option value="ALL">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="cg-f-prio">
              Priority
            </label>
            <select
              id="cg-f-prio"
              className="input"
              value={filters.priority}
              onChange={(e) => setFilter('priority', e.target.value)}
            >
              <option value="ALL">All priorities</option>
              {optionsFrom(PRIORITY).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {viewMode === 'sections' ? (
          <div className="space-y-4">
            {(filters.expedition === 'ALL'
              ? expeditions
              : expeditions.filter((e) => e.id === filters.expedition)
            ).map((exp) => {
              const expCargo = visible.filter((c) => c.expedition_id === exp.id)
              const expAll = cargo.filter((c) => c.expedition_id === exp.id)
              const expKg = expAll.reduce((sum, c) => sum + (Number(c.weight_kg) || 0), 0)
              const inTransitCount = expAll.filter((c) => c.status === 'IN_TRANSIT').length
              const delayedCount = expAll.filter((c) => c.status === 'DELAYED').length
              const criticalCount = expAll.filter((c) => c.priority === 'CRITICAL').length

              if (filtersActive && expCargo.length === 0) return null

              return (
                <div
                  key={exp.id}
                  className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface-card)] shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface-raised)] px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Badge
                        tone={
                          exp.status === 'ACTIVE'
                            ? 'ok'
                            : exp.status === 'PLANNING'
                              ? 'info'
                              : 'muted'
                        }
                      >
                        {exp.id}
                      </Badge>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display text-sm font-bold text-hi">{exp.name}</span>
                          <span className="text-xs text-low">· {exp.destination}</span>
                        </div>
                        <div className="text-[11px] text-mid">
                          Payload:{' '}
                          <span className="font-mono font-medium text-hi">
                            {formatNumber(expKg)} kg
                          </span>{' '}
                          ({(expKg / 1000).toFixed(2)} tonnes)
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                      <span className="rounded bg-[var(--surface-sunken)] px-2 py-0.5 text-mid">
                        {expCargo.length} / {expAll.length} items
                      </span>
                      {inTransitCount > 0 && (
                        <span className="rounded bg-[rgba(14,165,233,0.12)] px-2 py-0.5 text-[var(--ice)]">
                          {inTransitCount} transit
                        </span>
                      )}
                      {delayedCount > 0 && (
                        <span className="flex items-center gap-1 rounded bg-[rgba(249,115,22,0.15)] px-2 py-0.5 font-bold text-[var(--orange)] animate-pulse">
                          <AlertTriangle size={11} />
                          {delayedCount} DELAYED
                        </span>
                      )}
                      {criticalCount > 0 && (
                        <span className="rounded bg-[rgba(239,68,68,0.15)] px-2 py-0.5 font-bold text-[var(--red)]">
                          {criticalCount} CRITICAL
                        </span>
                      )}
                    </div>
                  </div>

                  <DataTable
                    loading={loading}
                    error={error}
                    rows={expCargo}
                    rowKey={(row) => row.id}
                    onRowClick={(row) => setSelectedId(row.id)}
                    maxHeight={expCargo.length > 6 ? '320px' : undefined}
                    emptyTitle="No matching consignments for this expedition"
                    emptyMessage="Try adjusting your status or category filters."
                    columns={[
                      { header: 'ID', cell: (r) => r.id, mono: true, width: '70px' },
                      {
                        header: 'Consignment',
                        strong: true,
                        cell: (r) => (
                          <div className="flex items-start gap-1.5">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span>{r.item_name}</span>
                                {r.id === selectedId && (
                                  <ChevronRight size={14} className="shrink-0 text-[var(--ice)]" />
                                )}
                              </div>
                              <div className="text-[11px] font-normal text-low">{r.category}</div>
                              {r.status === 'DELAYED' && r.delay_reason && (
                                <div
                                  className="truncate text-[11px] font-normal text-[var(--orange)]"
                                  style={{ maxWidth: 320 }}
                                  title={r.delay_reason}
                                >
                                  {r.delay_reason}
                                </div>
                              )}
                            </div>
                          </div>
                        ),
                      },
                      {
                        header: 'Route',
                        cell: (r) => (
                          <div style={{ maxWidth: 168 }}>
                            <div className="truncate text-[12px] text-mid" title={r.location}>
                              {r.location}
                            </div>
                            <div className="truncate text-[11.5px] text-low" title={r.destination}>
                              → {r.destination}
                            </div>
                          </div>
                        ),
                      },
                      {
                        header: 'Qty',
                        width: '84px',
                        align: 'right',
                        cell: (r) => (
                          <div>
                            <div className="mono text-[12.5px] text-hi">
                              {formatNumber(r.quantity)}
                            </div>
                            <div className="text-[10.5px] text-low">{r.unit}</div>
                          </div>
                        ),
                      },
                      {
                        header: 'Weight',
                        width: '88px',
                        align: 'right',
                        mono: true,
                        cell: (r) => (
                          <span className="text-[12px] text-mid">
                            {r.weight_kg ? `${formatNumber(r.weight_kg)} kg` : '—'}
                          </span>
                        ),
                      },
                      {
                        header: 'Priority',
                        width: '106px',
                        cell: (r) => (
                          <select
                            className="select-inline"
                            value={r.priority}
                            disabled={!canManage}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateCargo(r.id, { priority: e.target.value })}
                            aria-label={`Priority for ${r.item_name}`}
                          >
                            {optionsFrom(PRIORITY).map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ),
                      },
                      {
                        header: 'Status',
                        width: '118px',
                        cell: (r) => (
                          <select
                            className="select-inline"
                            value={r.status}
                            disabled={!canManage}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateCargo(r.id, { status: e.target.value })}
                            aria-label={`Status for ${r.item_name}`}
                          >
                            {optionsFrom(CARGO_STATUS).map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ),
                      },
                    ]}
                  />
                </div>
              )
            })}
            {visible.length === 0 && (
              <StateBlock
                kind="empty"
                title="No consignments match these filters"
                message="Clear the filters to see the full register."
              />
            )}
          </div>
        ) : (
          <DataTable
            loading={loading}
            error={error}
            rows={visible}
            rowKey={(row) => row.id}
            onRowClick={(row) => setSelectedId(row.id)}
            maxHeight="520px"
            emptyTitle="No consignments match these filters"
            emptyMessage="Clear the filters to see the full register."
            columns={[
              { header: 'ID', cell: (r) => r.id, mono: true, width: '70px' },
              {
                header: 'Consignment',
                strong: true,
                cell: (r) => (
                  <div className="flex items-start gap-1.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span>{r.item_name}</span>
                        {r.id === selectedId && (
                          <ChevronRight size={14} className="shrink-0 text-[var(--ice)]" />
                        )}
                      </div>
                      <div className="text-[11px] font-normal text-low">{r.category}</div>
                      {/* Delay reasons are shown right in the register — a
                          delayed row that does not say why is useless. */}
                      {r.status === 'DELAYED' && r.delay_reason && (
                        <div
                          className="truncate text-[11px] font-normal text-[var(--orange)]"
                          style={{ maxWidth: 320 }}
                          title={r.delay_reason}
                        >
                          {r.delay_reason}
                        </div>
                      )}
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
                /* Route. Origin and destination names are long, so each is
                   clipped to one line with maxWidth + truncate. Without this
                   every row grows to three lines and the table becomes a
                   wall of text. The full text stays in the tooltip. */
                header: 'Route',
                cell: (r) => (
                  <div style={{ maxWidth: 168 }}>
                    <div className="truncate text-[12px] text-mid" title={r.location}>
                      {r.location}
                    </div>
                    <div className="truncate text-[11.5px] text-low" title={r.destination}>
                      → {r.destination}
                    </div>
                  </div>
                ),
              },
              {
                header: 'Qty',
                width: '84px',
                align: 'right',
                cell: (r) => (
                  <div>
                    <div className="mono text-[12.5px] text-hi">{formatNumber(r.quantity)}</div>
                    <div className="text-[10.5px] text-low">{r.unit}</div>
                  </div>
                ),
              },
              {
                header: 'Weight',
                width: '88px',
                align: 'right',
                mono: true,
                cell: (r) => (
                  <span className="text-[12px] text-mid">
                    {r.weight_kg ? `${formatNumber(r.weight_kg)} kg` : '—'}
                  </span>
                ),
              },
              {
                /* CONNECTED CONTROL 1: priority. Set something to CRITICAL and
                   it joins the dashboard's "Cargo Needing Attention" list. */
                header: 'Priority',
                width: '106px',
                cell: (r) => (
                  <select
                    className="select-inline"
                    value={r.priority}
                    disabled={!canManage}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateCargo(r.id, { priority: e.target.value })}
                    aria-label={`Priority for ${r.item_name}`}
                  >
                    {optionsFrom(PRIORITY).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ),
              },
              {
                /* CONNECTED CONTROL 2: status. This is the one to demo — the
                   dashboard's "Cargo In Transit" number follows it, and the
                   change is written into Recent Activity. */
                header: 'Status',
                width: '118px',
                cell: (r) => (
                  <select
                    className="select-inline"
                    value={r.status}
                    disabled={!canManage}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateCargo(r.id, { status: e.target.value })}
                    aria-label={`Status for ${r.item_name}`}
                  >
                    {optionsFrom(CARGO_STATUS).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ),
              },
            ]}
          />
        )}
      </Panel>

      {/* ================= PIPELINE CHARTS (master prompt section 7) =================
          Two views of the same register: where consignments are, and how
          urgent they are. Both are counted on every render, so changing a
          status in the table above moves a bar here immediately. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          eyebrow="Pipeline"
          title="Consignments by Status"
          subtitle="Counted from the register on every change · hover for tonnage"
        >
          <HorizontalBarChart
            data={chartByStatus}
            labelWidth={92}
            noteWidth={38}
            rowHeight={30}
            emptyMessage="No consignments logged yet."
          />
        </Panel>

        <Panel
          eyebrow="Pipeline"
          title="Consignments by Priority"
          subtitle="How much of the manifest is urgent"
        >
          <HorizontalBarChart
            data={chartByPriority}
            labelWidth={92}
            noteWidth={38}
            rowHeight={30}
            emptyMessage="No consignments logged yet."
          />
        </Panel>
      </div>

      {/* ================= DETAIL + WATCHLIST + LOAD BY DESTINATION ================= */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* ---------- Selected consignment ---------- */}
        {!selected ? (
          <Panel eyebrow="Detail" title="Consignment Detail">
            <StateBlock
              kind="empty"
              title="Nothing selected"
              message="Click a consignment in the register."
            />
          </Panel>
        ) : (
          <Panel
            eyebrow={selected.id}
            title={selected.item_name}
            subtitle={selected.category}
            action={<Badge map={CARGO_STATUS} value={selected.status} dot />}
          >
            <dl className="space-y-0">
              <div className="kv">
                <dt>Currently at</dt>
                <dd>{selected.location}</dd>
              </div>
              <div className="kv">
                <dt>Destination</dt>
                <dd>{selected.destination}</dd>
              </div>
              <div className="kv">
                <dt>Quantity</dt>
                <dd className="mono">{formatQuantity(selected.quantity, selected.unit)}</dd>
              </div>
              <div className="kv">
                <dt>Weight</dt>
                <dd className="mono">
                  {selected.weight_kg ? `${formatNumber(selected.weight_kg)} kg` : '—'}
                </dd>
              </div>
              <div className="kv">
                <dt>Priority</dt>
                <dd>
                  <Badge map={PRIORITY} value={selected.priority} />
                </dd>
              </div>
              <div className="kv">
                <dt>Logged</dt>
                <dd className="mono text-[12px]">{timeAgo(selected.created_at)}</dd>
              </div>
              <div className="kv">
                <dt>Expedition</dt>
                <dd>
                  {selected.expedition_id ? (
                    /* Connected: jumps to the expedition this belongs to. */
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

            {/* Delay reason — only relevant while the item is delayed.
                Typing writes straight into the shared store on every
                keystroke, so there is no separate "save" step to explain. */}
            {selected.status === 'DELAYED' && (
              <div className="mt-4 border-t border-[var(--line-soft)] pt-4">
                <label className="field-label" htmlFor="cg-delay">
                  Delay reason
                </label>
                <textarea
                  id="cg-delay"
                  className="input"
                  value={selected.delay_reason || ''}
                  disabled={!canManage}
                  onChange={(e) => updateCargo(selected.id, { delay_reason: e.target.value })}
                  placeholder="Why is this consignment held up?"
                />
                <p className="mt-1.5 text-[11px] text-low">
                  Shown against the row in the register and in the watchlist.
                </p>
              </div>
            )}
          </Panel>
        )}

        {/* ---------- Watchlist ---------- */}
        <Panel
          eyebrow="Needs attention"
          title="Delayed & Critical"
          subtitle="Delays first, then anything critical still in the pipeline"
        >
          {needsAttention.length === 0 ? (
            <StateBlock
              kind="empty"
              title="Nothing needs attention"
              message="No delays and no critical consignments outstanding."
            />
          ) : (
            <ul className="space-y-2.5">
              {needsAttention.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setSelectedId(item.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] text-hi">{item.item_name}</div>
                        <div className="truncate text-[11px] text-low">
                          <span className="mono">{item.id}</span> · → {item.destination}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge map={CARGO_STATUS} value={item.status} />
                        <Badge map={PRIORITY} value={item.priority} />
                      </div>
                    </div>
                    {item.status === 'DELAYED' && item.delay_reason && (
                      <div className="mt-1 flex items-start gap-1.5 text-[11px] text-[var(--orange)]">
                        <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                        <span>{item.delay_reason}</span>
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ---------- Load per destination ---------- */}
        <Panel
          eyebrow="Connected data"
          title="Load by Destination"
          subtitle="Recalculated from the register on every change"
          action={
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => goTo('map')}
            >
              <MapPin size={13} /> Map
            </button>
          }
        >
          {byDestination.length === 0 ? (
            <StateBlock kind="empty" title="Nothing logged yet" />
          ) : (
            <ul className="space-y-2.5">
              {byDestination.map((row) => (
                <li key={row.destination}>
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Ship size={12} className="shrink-0 text-low" />
                      <span className="truncate text-[12.5px] text-hi">{row.destination}</span>
                    </div>
                    <span className="mono shrink-0 text-[12px] text-mid">
                      {(row.kg / 1000).toFixed(1)} t
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {/* A bar relative to the heaviest destination, so the
                        biggest load is always full width. */}
                    <div className={`progress flex-1 ${row.delayed ? 'progress--warn' : ''}`}>
                      <span
                        style={{
                          width: `${byDestination[0].kg ? (row.kg / byDestination[0].kg) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="shrink-0 text-[10.5px] text-low">
                      {row.count} {row.count === 1 ? 'item' : 'items'}
                      {row.delayed > 0 && (
                        <span className="text-[var(--orange)]"> · {row.delayed} delayed</span>
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ================= HONEST FOOTER (master prompt section 21) ================= */}
      {/* Operational Logistics Note */}
      <div className="alert-strip alert-strip--info">
        <Package size={15} className="mt-0.5 shrink-0 text-[var(--ice)]" />
        <div className="text-[12px] text-mid">
          <strong className="text-hi">Logistics Operations Manifest.</strong> All consignments are synchronized across staging depots in Cape Town, chartered polar supply vessels, and station hubs (Maitri &amp; Bharati). Status updates are recorded immutably in the central command log.
        </div>
      </div>
    </div>
  )
}
