/**
 * INVENTORY MANAGEMENT
 * ====================
 * What is in stock, where it is stored, and what is running out.
 *
 * THE ONE IDEA TO UNDERSTAND HERE (master prompt section 5):
 *   "Low stock" is NEVER saved in the data. There is no `is_low` column.
 *   stockStatus() in src/lib/statuses.js compares quantity against
 *   minimum_quantity every single time the screen draws:
 *
 *       quantity === 0        -> OUT OF STOCK
 *       quantity <= minimum   -> LOW STOCK
 *       otherwise             -> AVAILABLE
 *
 *   Because it is calculated, the badge can never disagree with the
 *   numbers printed next to it. A saved flag could.
 *
 * THE CONNECTED BITS (master prompt section 12):
 *   1. Press the minus button until an item reaches its minimum. The badge
 *      flips to LOW STOCK by itself, the "Low stock" card above counts it,
 *      and the dashboard's "Low Stock Items" card counts it too — all from
 *      the same recalculation. No code links those three places.
 *   2. Crossing below the minimum writes one line into Recent Activity
 *      (once, at the crossing — not on every later edit).
 *   3. Press Restock and it all reverses.
 *   4. Running an item to zero adds to the dashboard's Critical Alerts,
 *      because that number is open incidents + items that have run out.
 */

import { useState } from 'react'
import { Boxes, Filter, Minus, Package, PackageCheck, Plus, RotateCcw, X } from 'lucide-react'

import Badge from '../components/Badge'
import DataTable from '../components/DataTable'
import HorizontalBarChart from '../components/HorizontalBarChart'
import Panel from '../components/Panel'
import StateBlock from '../components/StateBlock'
import { useData } from '../store/DataContext'
import { useAuth } from '../store/AuthContext'
import { clampPercent, formatNumber, timeAgo } from '../lib/format'
import {
  CONDITION,
  STOCK_STATUS,
  isLowStock,
  optionsFrom,
  statusColour,
  statusLabel,
  stockStatus,
} from '../lib/statuses'

/* The blank form, at module level so "reset the form" is one line. */
const EMPTY_FORM = {
  item_name: '',
  category: '',
  location: '',
  quantity: '',
  minimum_quantity: '',
  unit: 'units',
  condition: 'GOOD',
}

/* "No filters applied" — the starting value AND what the Clear button
   restores, so the two can never drift apart. */
const NO_FILTERS = { search: '', category: 'ALL', location: 'ALL', stock: 'ALL' }

/**
 * HOW BIG SHOULD ONE PRESS OF +/- BE?
 * Based on the item's MINIMUM, not its current quantity, so the step never
 * changes underneath you mid-demo. 6000 litres of diesel moves in 100s;
 * 8 avalanche beacons move in 1s.
 */
function stepFor(item) {
  const min = Number(item?.minimum_quantity) || 0
  if (min >= 1000) return 100
  if (min >= 100) return 10
  return 1
}

/**
 * The little bar in the Stock column.
 * Drawn against TWICE the minimum, so an item sitting exactly on its
 * minimum shows a half-full bar. That makes "getting close to trouble"
 * visible before it crosses, not only after.
 */
function stockPercent(item) {
  const min = Number(item?.minimum_quantity) || 0
  const qty = Number(item?.quantity) || 0
  if (min <= 0) return qty > 0 ? 100 : 0
  return clampPercent((qty / (min * 2)) * 100)
}

export default function Inventory({ goTo }) {
  const {
    inventory,
    stats,
    loading,
    error,
    addInventoryItem,
    updateInventoryItem,
    adjustInventoryQuantity,
  } = useData()

  /* WHAT THIS ROLE MAY CHANGE — see src/lib/roles.js. The low-stock warnings
     are still fully visible to a read-only session; only the +/- buttons,
     the Restock shortcut and the Add form are withheld. */
  const { canManage } = useAuth()

  const [filters, setFilters] = useState(NO_FILTERS)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [formSuccess, setFormSuccess] = useState(null)

  /* Categories and locations are READ FROM THE DATA. Add an item in a new
     category and it appears in these dropdowns on its own. */
  const categories = [...new Set(inventory.map((i) => i.category).filter(Boolean))].sort()
  const places = [...new Set(inventory.map((i) => i.location).filter(Boolean))].sort()

  /* ---------- THE FILTER CHAIN ----------
     One .filter() per rule so the whole thing reads top to bottom. */
  const term = filters.search.trim().toLowerCase()
  const visible = inventory
    .filter((i) => filters.category === 'ALL' || i.category === filters.category)
    .filter((i) => filters.location === 'ALL' || i.location === filters.location)
    .filter((i) => filters.stock === 'ALL' || stockStatus(i) === filters.stock)
    .filter((i) => {
      if (!term) return true
      return (
        i.item_name.toLowerCase().includes(term) ||
        i.id.toLowerCase().includes(term) ||
        (i.location || '').toLowerCase().includes(term)
      )
    })

  const filtersActive =
    filters.search !== '' ||
    filters.category !== 'ALL' ||
    filters.location !== 'ALL' ||
    filters.stock !== 'ALL'

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }))

  /* ---------- RESTOCK LIST ----------
     Everything at or below minimum, worst shortfall first. `stats.lowStockItems`
     is the very same array the dashboard counts — one source, two screens. */
  const restockList = [...stats.lowStockItems]
    .map((item) => ({
      item,
      shortfall: (Number(item.minimum_quantity) || 0) - (Number(item.quantity) || 0),
    }))
    .sort((a, b) => b.shortfall - a.shortfall)

  /* ---------- GROUPED VIEWS ----------
     NOTE: we count ITEMS, never sum quantities. Adding 8600 litres of water
     to 18 medical kits would produce a number that means nothing. */
  function groupBy(field) {
    return Object.values(
      inventory.reduce((acc, item) => {
        const key = item[field] || 'Unspecified'
        if (!acc[key]) acc[key] = { key, count: 0, low: 0 }
        acc[key].count += 1
        if (isLowStock(item)) acc[key].low += 1
        return acc
      }, {})
    ).sort((a, b) => b.count - a.count)
  }
  const byLocation = groupBy('location')
  const byCategory = groupBy('category')

  /* ---------- THE STOCK CHART (master prompt section 7) ----------
     One bar per item, drawn against a FULL HOLDING, which we define as
     twice the minimum. That is the same rule as the little bars in the
     Stock column of the table, so the chart and the table can never
     disagree — see stockPercent() at the top of this file.

     Why "twice the minimum" and not "percent of the minimum": an item
     holding 14,200 litres against a 6,000 litre minimum is 237%, and one
     bar like that squashes every other bar into the left edge. Against a
     full holding the scale stops at 100%, everything stays readable, and
     the dashed line at 50% is exactly the minimum. Left of the line means
     trouble, and the bar's colour says the same thing again.

     Items with no minimum set are left out rather than quietly drawn at
     full: "stock against minimum" has no meaning without a minimum. The
     count of those is shown under the chart so nothing disappears
     silently. */
  const noMinimumCount = inventory.filter((i) => !(Number(i.minimum_quantity) > 0)).length

  /* Two stations may stock the same item, so an item name on its own is
     not guaranteed to be unique — and two bars with the same name would be
     drawn on top of each other as one. Where a name repeats we add the
     station to tell them apart. */
  const nameCounts = inventory.reduce((acc, i) => {
    acc[i.item_name] = (acc[i.item_name] || 0) + 1
    return acc
  }, {})

  const stockChartData = inventory
    .filter((i) => Number(i.minimum_quantity) > 0)
    .map((item) => ({
      label: nameCounts[item.item_name] > 1 ? `${item.item_name} · ${item.location}` : item.item_name,
      value: Math.round(stockPercent(item)),
      colour: statusColour(STOCK_STATUS, stockStatus(item)),
      note: `${formatNumber(item.quantity)}/${formatNumber(item.minimum_quantity)}`,
      tip: `${formatNumber(item.quantity)} of ${formatNumber(item.minimum_quantity)} ${item.unit} minimum · ${statusLabel(STOCK_STATUS, stockStatus(item))}`,
    }))
    /* Worst first, so whatever needs attention is at the top of the
       chart where the eye lands. */
    .sort((a, b) => a.value - b.value)

  /** Raise an item back to a full holding (twice its minimum). */
  function restock(item) {
    const min = Number(item.minimum_quantity) || 0
    if (min <= 0) return
    updateInventoryItem(item.id, { quantity: min * 2 })
  }

  /* ---------- THE FORM ---------- */
  const setField = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))
    setFormError(null)
  }

  /**
   * VALIDATION (master prompt section 21 — validate user input).
   */
  function handleSubmit(event) {
    event.preventDefault()
    setFormSuccess(null)

    const name = form.item_name.trim()
    const place = form.location.trim()

    if (name.length < 2) return setFormError('Item name needs at least 2 characters.')
    if (!form.category.trim()) return setFormError('Category is required.')
    if (!place) return setFormError('Storage location is required.')

    /* The same item can be stocked at two different stations, but not
       twice at the same one — otherwise the totals stop making sense. */
    const clash = inventory.find(
      (i) =>
        i.item_name.toLowerCase() === name.toLowerCase() &&
        (i.location || '').toLowerCase() === place.toLowerCase()
    )
    if (clash)
      return setFormError(
        `${clash.item_name} is already tracked at ${clash.location} (${clash.id}). Adjust its quantity instead of adding it twice.`
      )

    const qty = form.quantity === '' ? 0 : Number(form.quantity)
    if (Number.isNaN(qty) || qty < 0) return setFormError('Quantity must be 0 or more.')

    const min = form.minimum_quantity === '' ? 0 : Number(form.minimum_quantity)
    if (Number.isNaN(min) || min < 0) return setFormError('Minimum quantity must be 0 or more.')

    try {
      const created = addInventoryItem({
        item_name: name,
        category: form.category.trim(),
        location: place,
        quantity: qty,
        minimum_quantity: min,
        unit: form.unit.trim() || 'units',
        condition: form.condition,
      })

      setForm(EMPTY_FORM)
      setFormError(null)
      /* Say straight away whether the new item is already a problem. */
      setFormSuccess(
        isLowStock(created)
          ? `${created.id} ${created.item_name} added — and it is already at or below its minimum, so it is flagged immediately.`
          : `${created.id} ${created.item_name} added at ${created.location}.`
      )
      setShowForm(false)
    } catch (err) {
      setFormError(`Could not save: ${err.message}`)
    }
  }

  return (
    <div className="space-y-5">
      {/* ================= SUMMARY STRIP =================
          A note on the labels, because it is easy to get this wrong:
          "At or below min" is the count of everything needing attention,
          and "Out of stock" is a SUBSET of it (an item at zero is also
          below its minimum). So Available + At-or-below-min = the total,
          and 'At or below min' is the same number the dashboard shows. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: 'Items tracked', value: stats.inventoryTotal },
          {
            label: 'Available',
            value: inventory.filter((i) => stockStatus(i) === 'AVAILABLE').length,
            tone: 'ok',
          },
          { label: 'At or below min', value: stats.lowStockCount, tone: 'warn' },
          { label: 'Out of stock', value: stats.outOfStockCount, tone: 'alert' },
          { label: 'Storage locations', value: stats.inventoryLocations },
        ].map((item) => (
          <div key={item.label} className="card-tight">
            <div className="eyebrow">{item.label}</div>
            <div className={`stat-value ${item.tone ? `stat-value--${item.tone}` : ''}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* ================= LIVE LOW-STOCK WARNING =================
          Rendered from stats.lowStockItems, which is recalculated on every
          change. Press minus in the table below and this strip grows. */}
      {stats.lowStockCount > 0 && (
        <div className="alert-strip alert-strip--warn">
          <Package size={16} className="mt-0.5 shrink-0 text-[var(--amber)]" />
          <div className="min-w-0">
            <div className="text-[13px] text-hi">
              {stats.lowStockCount} {stats.lowStockCount === 1 ? 'item is' : 'items are'} at or below
              minimum stock
              {stats.outOfStockCount > 0 && (
                <span className="text-[var(--orange)]">
                  {' '}
                  · {stats.outOfStockCount} completely out
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-mid">
              {stats.lowStockItems.map((item) => (
                <span key={item.id}>
                  {item.item_name}{' '}
                  <span className="mono text-low">
                    {formatNumber(item.quantity)}/{formatNumber(item.minimum_quantity)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

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

      {/* ================= ADD FORM ================= */}
      {showForm && (
        <Panel
          eyebrow="New record"
          title="Add Stock Item"
          subtitle="Set a minimum quantity and the low-stock warning takes care of itself."
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
                <label className="field-label" htmlFor="inv-name">
                  Item name *
                </label>
                <input
                  id="inv-name"
                  name="item_name"
                  className="input"
                  value={form.item_name}
                  onChange={setField}
                  placeholder="e.g. Crampon Sets"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="inv-cat">
                  Category *
                </label>
                <input
                  id="inv-cat"
                  name="category"
                  className="input"
                  value={form.category}
                  onChange={setField}
                  placeholder="e.g. Safety"
                  list="inv-categories"
                />
                <datalist id="inv-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="field-label" htmlFor="inv-loc">
                  Stored at *
                </label>
                <input
                  id="inv-loc"
                  name="location"
                  className="input"
                  value={form.location}
                  onChange={setField}
                  placeholder="e.g. Maitri Station"
                  list="inv-places"
                />
                <datalist id="inv-places">
                  {places.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="field-label" htmlFor="inv-qty">
                  Quantity in stock
                </label>
                <input
                  id="inv-qty"
                  name="quantity"
                  type="number"
                  min="0"
                  className="input"
                  value={form.quantity}
                  onChange={setField}
                  placeholder="e.g. 40"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="inv-min">
                  Minimum before warning
                </label>
                <input
                  id="inv-min"
                  name="minimum_quantity"
                  type="number"
                  min="0"
                  className="input"
                  value={form.minimum_quantity}
                  onChange={setField}
                  placeholder="e.g. 15"
                />
                <p className="mt-1.5 text-[11px] text-low">
                  Reach this number and the item is flagged automatically.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label" htmlFor="inv-unit">
                    Unit
                  </label>
                  <input
                    id="inv-unit"
                    name="unit"
                    className="input"
                    value={form.unit}
                    onChange={setField}
                    placeholder="kits"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="inv-cond">
                    Condition
                  </label>
                  <select
                    id="inv-cond"
                    name="condition"
                    className="input"
                    value={form.condition}
                    onChange={setField}
                  >
                    {optionsFrom(CONDITION).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {formError && (
              <div className="alert-strip">
                <div className="text-[12.5px] text-hi">{formError}</div>
              </div>
            )}

            <button type="submit" className="btn">
              <Plus size={14} /> Add to inventory
            </button>
          </form>
        </Panel>
      )}

      {/* ================= THE STOCK REGISTER ================= */}
      <Panel
        eyebrow="Register"
        title="Stock Register"
        subtitle={
          filtersActive
            ? `Showing ${visible.length} of ${inventory.length} items`
            : 'Use the minus and plus buttons to change a quantity and watch the badge follow'
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
                <Plus size={13} /> Add
              </button>
            )}
          </div>
        }
      >
        {/* ---------- FILTERS ---------- */}
        <div className="mb-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="field-label" htmlFor="inv-search">
              <Filter size={10} className="mr-1 inline" /> Search
            </label>
            <input
              id="inv-search"
              className="input"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder="Item, ID or location"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="inv-f-stock">
              Stock status
            </label>
            <select
              id="inv-f-stock"
              className="input"
              value={filters.stock}
              onChange={(e) => setFilter('stock', e.target.value)}
            >
              <option value="ALL">All stock levels</option>
              {optionsFrom(STOCK_STATUS).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="inv-f-cat">
              Category
            </label>
            <select
              id="inv-f-cat"
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
            <label className="field-label" htmlFor="inv-f-loc">
              Location
            </label>
            <select
              id="inv-f-loc"
              className="input"
              value={filters.location}
              onChange={(e) => setFilter('location', e.target.value)}
            >
              <option value="ALL">All locations</option>
              {places.map((p) => (
                <option key={p} value={p}>
                  {p}
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
          maxHeight="520px"
          emptyTitle="No stock items match these filters"
          emptyMessage="Clear the filters to see the full register."
          columns={[
            { header: 'ID', cell: (r) => r.id, mono: true, width: '66px' },
            {
              header: 'Item',
              strong: true,
              cell: (r) => (
                <div>
                  <div>{r.item_name}</div>
                  <div className="text-[11px] font-normal text-low">{r.category}</div>
                </div>
              ),
            },
            {
              /* Location names are long, so clip to one line — otherwise
                 every row grows and the table becomes a wall of text. */
              header: 'Stored at',
              cell: (r) => (
                <div style={{ maxWidth: 150 }}>
                  <div className="truncate text-[12px]" title={r.location}>
                    {r.location}
                  </div>
                  <div className="text-[10.5px] text-low">{timeAgo(r.updated_at)}</div>
                </div>
              ),
            },
            {
              header: 'Stock level',
              width: '146px',
              cell: (r) => {
                const status = stockStatus(r)
                return (
                  <div>
                    <div className="mono flex items-baseline justify-between gap-2 text-[12px]">
                      <span className="text-hi">{formatNumber(r.quantity)}</span>
                      <span className="text-[10.5px] text-low">
                        min {formatNumber(r.minimum_quantity)} {r.unit}
                      </span>
                    </div>
                    <div
                      className={`progress mt-1 ${
                        status === 'AVAILABLE' ? '' : status === 'LOW_STOCK' ? 'progress--warn' : 'progress--muted'
                      }`}
                    >
                      <span style={{ width: `${stockPercent(r)}%` }} />
                    </div>
                  </div>
                )
              },
            },
            {
              /* THE CONNECTED CONTROL. Press minus until quantity reaches
                 the minimum: the badge in the next column flips to LOW
                 STOCK, the cards at the top of this page count it, and so
                 does the dashboard — all without any code joining them.
                 The step is printed on the button so there is no guessing. */
              header: 'Adjust',
              width: '118px',
              cell: (r) => {
                const step = stepFor(r)
                return (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm mono"
                      style={{ padding: '4px 7px', fontSize: 11 }}
                      disabled={!canManage || Number(r.quantity) <= 0}
                      onClick={() => adjustInventoryQuantity(r.id, -step)}
                      aria-label={`Reduce ${r.item_name} by ${step}`}
                    >
                      <Minus size={11} />
                      {step}
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm mono"
                      style={{ padding: '4px 7px', fontSize: 11 }}
                      disabled={!canManage}
                      onClick={() => adjustInventoryQuantity(r.id, step)}
                      aria-label={`Increase ${r.item_name} by ${step}`}
                    >
                      <Plus size={11} />
                      {step}
                    </button>
                  </div>
                )
              },
            },
            {
              header: 'Condition',
              width: '126px',
              cell: (r) => (
                <select
                  className="select-inline"
                  value={r.condition}
                  disabled={!canManage}
                  onChange={(e) => updateInventoryItem(r.id, { condition: e.target.value })}
                  aria-label={`Condition of ${r.item_name}`}
                >
                  {optionsFrom(CONDITION).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ),
            },
            {
              /* Calculated, not stored. This badge reads stockStatus(r)
                 fresh on every render. */
              header: 'Stock',
              width: '112px',
              cell: (r) => <Badge map={STOCK_STATUS} value={stockStatus(r)} dot />,
            },
          ]}
        />
      </Panel>

      {/* ================= STOCK CHART (master prompt section 7) =================
          The same three facts as the table above — quantity, minimum,
          status — drawn instead of listed. Nothing here is a separate
          copy of the data: press minus in the table and this bar shrinks
          and changes colour on the very same render. */}
      <Panel
        eyebrow="Stock levels"
        title="Stock Against Minimum"
        subtitle="Lowest first. A full holding is twice the minimum, so the dashed line is the minimum itself."
        action={
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => goTo('cargo')}>
            <Package size={13} /> Incoming cargo
          </button>
        }
      >
        <HorizontalBarChart
          data={stockChartData}
          maxValue={100}
          unitSuffix="%"
          reference={50}
          referenceLabel="Minimum"
          labelWidth={190}
          noteWidth={78}
          emptyTitle="Nothing to chart"
          emptyMessage="No items with a minimum quantity set."
        />

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-low">
          <span className="flex items-center gap-1.5">
            <i className="legend-swatch" style={{ background: 'var(--green)' }} /> Available
          </span>
          <span className="flex items-center gap-1.5">
            <i className="legend-swatch" style={{ background: 'var(--orange)' }} /> At or below
            minimum
          </span>
          <span className="flex items-center gap-1.5">
            <i className="legend-swatch" style={{ background: 'var(--red)' }} /> Out of stock
          </span>
          <span className="text-mid">
            Bars stop at a full holding — the figures beside each bar are the real quantities.
          </span>
          {noMinimumCount > 0 && (
            <span className="text-[var(--amber)]">
              {noMinimumCount} item{noMinimumCount === 1 ? '' : 's'} not charted — no minimum set.
            </span>
          )}
        </div>
      </Panel>

      {/* ================= RESTOCK LIST + GROUPED VIEWS ================= */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* ---------- Restock list ---------- */}
        <Panel
          eyebrow="Action required"
          title="Restock List"
          subtitle="Biggest shortfall first. Restock raises an item to twice its minimum."
        >
          {restockList.length === 0 ? (
            <StateBlock
              kind="empty"
              title="Everything is above minimum"
              message="Nothing needs reordering right now."
            />
          ) : (
            <ul className="space-y-3">
              {restockList.map(({ item, shortfall }) => (
                <li key={item.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] text-hi">{item.item_name}</div>
                    <div className="truncate text-[11px] text-low">
                      <span className="mono">{item.id}</span> · {item.location}
                    </div>
                    <div className="mono mt-0.5 text-[11px] text-[var(--amber)]">
                      {formatNumber(item.quantity)} / {formatNumber(item.minimum_quantity)}{' '}
                      {item.unit}
                      {shortfall > 0 && ` · short by ${formatNumber(shortfall)}`}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Badge map={STOCK_STATUS} value={stockStatus(item)} />
                    {canManage && Number(item.minimum_quantity) > 0 && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => restock(item)}
                        title={`Raise to ${formatNumber(Number(item.minimum_quantity) * 2)} ${item.unit}`}
                      >
                        <RotateCcw size={11} /> Restock
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ---------- By location ---------- */}
        <Panel
          eyebrow="Connected data"
          title="Stock by Location"
          subtitle="Item counts, not quantities — litres and kits cannot be added together"
          action={
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => goTo('map')}>
              <Boxes size={13} /> Map
            </button>
          }
        >
          {byLocation.length === 0 ? (
            <StateBlock kind="empty" title="Nothing in stock yet" />
          ) : (
            <GroupList rows={byLocation} />
          )}
        </Panel>

        {/* ---------- By category ---------- */}
        <Panel
          eyebrow="Connected data"
          title="Stock by Category"
          subtitle="Where the shortages are concentrated"
        >
          {byCategory.length === 0 ? (
            <StateBlock kind="empty" title="Nothing in stock yet" />
          ) : (
            <GroupList rows={byCategory} />
          )}
        </Panel>
      </div>

      {/* ================= OPERATIONAL LOGISTICS FOOTER ================= */}
      <div className="alert-strip alert-strip--info">
        <PackageCheck size={15} className="mt-0.5 shrink-0 text-[var(--accent)]" />
        <div className="text-[12px] text-mid">
          <strong className="text-hi">Station Logistics Directory.</strong> Consumable buffer thresholds, fuels, and critical spares calibrated to Antarctic wintering standards. Stock alerts recalculate dynamically across active field stations and remote shelters.
        </div>
      </div>
    </div>
  )
}

/**
 * The "by location" and "by category" lists are the same shape, so they
 * share one small component instead of the JSX being written twice.
 */
function GroupList({ rows }) {
  const biggest = rows[0]?.count || 1

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[12.5px] text-hi">{row.key}</span>
            <span className="mono shrink-0 text-[12px] text-mid">{row.count}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className={`progress flex-1 ${row.low ? 'progress--warn' : ''}`}>
              <span style={{ width: `${(row.count / biggest) * 100}%` }} />
            </div>
            <span className="shrink-0 text-[10.5px] text-low">
              {row.low > 0 ? (
                <span className="text-[var(--amber)]">{row.low} low</span>
              ) : (
                'all stocked'
              )}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
