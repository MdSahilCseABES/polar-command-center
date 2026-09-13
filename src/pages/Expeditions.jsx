/**
 * EXPEDITION MANAGEMENT
 * =====================
 * The first real module, and the template every other page follows:
 *
 *   1. read data with useData()
 *   2. show it with <DataTable> and <Badge>
 *   3. change it by calling an action from the store
 *
 * THE CONNECTED BIT (master prompt sections 12 and 19):
 *   Click any expedition and the right-hand panel loads its assigned team
 *   from the PERSONNEL data and its consignments from the CARGO data.
 *   Nothing is duplicated — the expedition record only stores an id, and
 *   the people and cargo are looked up live. Change someone's expedition
 *   and this panel changes with it.
 *
 *   Change an expedition's status in the dropdown and the dashboard's
 *   "Active Expeditions" count updates immediately, because that count is
 *   calculated from this same data.
 */

import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Compass,
  LayoutGrid,
  List,
  Package,
  Plus,
  Siren,
  Users,
  X,
} from 'lucide-react'

import Badge from '../components/Badge'
import DataTable from '../components/DataTable'
import Panel from '../components/Panel'
import StateBlock from '../components/StateBlock'
import { useData } from '../store/DataContext'
import { useAuth } from '../store/AuthContext'
import { clampPercent, formatDate, formatNumber } from '../lib/format'
import {
  CARGO_STATUS,
  EXPEDITION_STATUS,
  EMERGENCY_STATUS,
  EMERGENCY_TYPE,
  PERSONNEL_STATUS,
  PRIORITY,
  optionsFrom,
  statusLabel,
} from '../lib/statuses'

/* The blank form, kept here so "reset the form" is one line. */
const EMPTY_FORM = {
  name: '',
  destination: '',
  leader: '',
  start_date: '',
  end_date: '',
  team_size: '',
  objective: '',
}

export default function Expeditions({ goTo }) {
  const {
    expeditions,
    loading,
    error,
    updateExpedition,
    addExpedition,
    personnelForExpedition,
    cargoForExpedition,
    locations,
    emergencies,
  } = useData()

  /* WHAT THIS ROLE MAY CHANGE. A read-only session still sees every record
     and every number on this page — it just cannot edit them. See
     src/lib/roles.js. */
  const { canManage } = useAuth()

  /* Which expedition's details are open on the right. Defaults to the
     first one so the panel is never empty when the page loads. */
  const [selectedId, setSelectedId] = useState(expeditions[0]?.id ?? null)
  const [viewMode, setViewMode] = useState('sections') // 'sections' | 'detail'
  const [filterExpedition, setFilterExpedition] = useState('ALL')

  /* Form state for adding a new expedition. */
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [formSuccess, setFormSuccess] = useState(null)

  const selected = expeditions.find((e) => e.id === selectedId) || null
  const team = selected ? personnelForExpedition(selected.id) : []
  const consignments = selected ? cargoForExpedition(selected.id) : []

  /* One handler for every text field, using the input's own name. */
  const setField = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))
    setFormError(null)
  }

  /**
   * VALIDATION (master prompt section 21 — validate user input).
   * We check before saving, and we say exactly what is wrong.
   */
  function handleSubmit(event) {
    event.preventDefault()
    setFormSuccess(null)

    if (!form.name.trim()) return setFormError('Expedition name is required.')
    if (!form.destination.trim()) return setFormError('Destination is required.')
    if (!form.start_date) return setFormError('Start date is required.')
    if (!form.end_date) return setFormError('End date is required.')
    if (new Date(form.end_date) < new Date(form.start_date))
      return setFormError('End date cannot be before the start date.')

    const size = Number(form.team_size)
    if (form.team_size && (!Number.isInteger(size) || size < 0))
      return setFormError('Team size must be a whole number.')

    try {
      const created = addExpedition({
        name: form.name.trim(),
        destination: form.destination.trim(),
        leader: form.leader.trim() || 'To be assigned',
        start_date: form.start_date,
        end_date: form.end_date,
        team_size: size || 0,
        objective: form.objective.trim() || 'Objective to be confirmed.',
        location_id: null,
      })

      setForm(EMPTY_FORM)
      setFormError(null)
      setFormSuccess(`${created.id} created and added to the register.`)
      setSelectedId(created.id)
      setShowForm(false)
    } catch (err) {
      /* If saving ever fails, say so instead of silently doing nothing. */
      setFormError(`Could not save: ${err.message}`)
    }
  }

  return (
    <div className="space-y-5">
      {/* ---------- Summary strip ---------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: expeditions.length, tone: undefined },
          {
            label: 'Active',
            value: expeditions.filter((e) => e.status === 'ACTIVE').length,
            tone: 'ok',
          },
          {
            label: 'Planning',
            value: expeditions.filter((e) => e.status === 'PLANNING').length,
            tone: undefined,
          },
          {
            label: 'Completed',
            value: expeditions.filter((e) => e.status === 'COMPLETED').length,
            tone: undefined,
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

      {/* ---------- Add form (hidden until asked for) ---------- */}
      {formSuccess && (
        <div className="alert-strip" style={{ borderLeftColor: 'var(--green)', borderColor: 'rgba(79,201,138,0.4)', background: 'rgba(79,201,138,0.07)' }}>
          <div className="text-[12.5px] text-mid">{formSuccess}</div>
        </div>
      )}

      {showForm && (
        <Panel
          eyebrow="New record"
          title="Register Expedition"
          subtitle="It will be created with PLANNING status and 0% progress."
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
                <label className="field-label" htmlFor="exp-name">
                  Expedition name *
                </label>
                <input
                  id="exp-name"
                  name="name"
                  className="input"
                  value={form.name}
                  onChange={setField}
                  placeholder="e.g. Bharati Ice Core Survey"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="exp-dest">
                  Destination *
                </label>
                <input
                  id="exp-dest"
                  name="destination"
                  className="input"
                  value={form.destination}
                  onChange={setField}
                  placeholder="e.g. Bharati Station, Larsemann Hills"
                  list="known-locations"
                />
                {/* A datalist gives suggestions without forcing a choice. */}
                <datalist id="known-locations">
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="field-label" htmlFor="exp-leader">
                  Expedition leader
                </label>
                <input
                  id="exp-leader"
                  name="leader"
                  className="input"
                  value={form.leader}
                  onChange={setField}
                  placeholder="e.g. Dr. Arjun Sharma"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="exp-start">
                  Start date *
                </label>
                <input
                  id="exp-start"
                  name="start_date"
                  type="date"
                  className="input"
                  value={form.start_date}
                  onChange={setField}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="exp-end">
                  End date *
                </label>
                <input
                  id="exp-end"
                  name="end_date"
                  type="date"
                  className="input"
                  value={form.end_date}
                  onChange={setField}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="exp-team">
                  Team size
                </label>
                <input
                  id="exp-team"
                  name="team_size"
                  type="number"
                  min="0"
                  className="input"
                  value={form.team_size}
                  onChange={setField}
                  placeholder="e.g. 18"
                />
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="exp-obj">
                Objective
              </label>
              <input
                id="exp-obj"
                name="objective"
                className="input"
                value={form.objective}
                onChange={setField}
                placeholder="What is this expedition for?"
              />
            </div>

            {formError && (
              <div className="alert-strip">
                <div className="text-[12.5px] text-hi">{formError}</div>
              </div>
            )}

            <button type="submit" className="btn">
              <Plus size={14} /> Create expedition
            </button>
          </form>
        </Panel>
      )}

      {/* ---------- EXPEDITION SELECTION TABS & VIEW SWITCHER ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-card)] p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="mr-1 flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-wider text-mid">
            <Compass size={13} className="text-[var(--ice)]" />
            <span>Expedition:</span>
          </div>
          <button
            type="button"
            onClick={() => setFilterExpedition('ALL')}
            className={`rounded px-2.5 py-1 text-xs font-mono transition-all ${
              filterExpedition === 'ALL'
                ? 'bg-[var(--ice)] font-semibold text-white shadow-sm'
                : 'bg-[var(--surface-sunken)] text-mid hover:bg-[var(--surface-hover)] hover:text-hi'
            }`}
          >
            All Expeditions ({expeditions.length})
          </button>
          {expeditions.map((exp) => {
            const expTeam = personnelForExpedition(exp.id)
            const hasEmergency = emergencies.some(
              (e) => e.expedition_id === exp.id && e.status !== 'RESOLVED'
            )
            const isSelected = filterExpedition === exp.id
            return (
              <button
                key={exp.id}
                type="button"
                onClick={() => {
                  setFilterExpedition(isSelected ? 'ALL' : exp.id)
                  setSelectedId(exp.id)
                }}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-mono transition-all ${
                  isSelected
                    ? 'bg-[var(--ice)] font-semibold text-white shadow-sm'
                    : 'bg-[var(--surface-sunken)] text-mid hover:bg-[var(--surface-hover)] hover:text-hi'
                }`}
              >
                {hasEmergency && (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--red)]" />
                )}
                <span>{exp.id}</span>
                <span className="text-[10px] opacity-70">({expTeam.length})</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          {canManage && !showForm && (
            <button type="button" className="btn btn--sm" onClick={() => setShowForm(true)}>
              <Plus size={13} /> New Expedition
            </button>
          )}
          <div className="flex items-center rounded border border-[var(--line)] bg-[var(--surface-sunken)] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('sections')}
              className={`flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] transition ${
                viewMode === 'sections'
                  ? 'bg-[var(--surface-card)] font-semibold text-hi shadow-sm'
                  : 'text-mid hover:text-hi'
              }`}
              title="View separate sections for each expedition"
            >
              <LayoutGrid size={11} />
              <span>Expedition Sections</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('detail')}
              className={`flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] transition ${
                viewMode === 'detail'
                  ? 'bg-[var(--surface-card)] font-semibold text-hi shadow-sm'
                  : 'text-mid hover:text-hi'
              }`}
              title="View register and detail inspection panel"
            >
              <List size={11} />
              <span>Register &amp; Detail</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'sections' ? (
        /* ================= SEPARATE EXPEDITION SECTIONS ================= */
        <div className="space-y-6">
          {(filterExpedition === 'ALL'
            ? expeditions
            : expeditions.filter((e) => e.id === filterExpedition)
          ).map((exp) => {
            const expTeam = personnelForExpedition(exp.id)
            const expCargo = cargoForExpedition(exp.id)
            const expEmergencies = emergencies.filter(
              (em) => em.expedition_id === exp.id && em.status !== 'RESOLVED'
            )
            const totalCargoWeight = expCargo.reduce(
              (sum, c) => sum + (Number(c.weight_kg) || 0),
              0
            )

            return (
              <div
                key={exp.id}
                className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-card)] shadow-md"
              >
                {/* Expedition Section Header */}
                <div className="border-b border-[var(--line)] bg-[var(--surface-raised)] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-card)] border border-[var(--line)] text-[var(--ice)] shadow-sm">
                        <Compass size={24} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="mono text-xs font-bold text-[var(--ice)]">{exp.id}</span>
                          <span className="text-low">·</span>
                          <Badge map={EXPEDITION_STATUS} value={exp.status} dot />
                          <span className="text-xs text-low">· {exp.destination}</span>
                        </div>
                        <h3 className="mt-0.5 font-display text-xl font-bold text-hi">{exp.name}</h3>
                        <p className="mt-1 text-xs text-mid max-w-3xl leading-relaxed">
                          {exp.objective}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 text-right">
                      {canManage ? (
                        <select
                          className="select-inline text-xs font-mono"
                          value={exp.status}
                          onChange={(e) => updateExpedition(exp.id, { status: e.target.value })}
                          aria-label={`Status for ${exp.name}`}
                        >
                          {optionsFrom(EXPEDITION_STATUS).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-mid font-mono">Leader: {exp.leader}</span>
                      )}
                      <div className="text-[11.5px] font-mono text-low">
                        {formatDate(exp.start_date)} → {formatDate(exp.end_date)}
                      </div>
                    </div>
                  </div>

                  {/* Progress & Quick Stats Bar */}
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--line-soft)] pt-3.5 sm:grid-cols-4">
                    <div>
                      <div className="text-[10.5px] font-mono uppercase tracking-wider text-low">
                        Mission Progress
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                          <div
                            className="h-full bg-[var(--ice)] transition-all"
                            style={{ width: `${clampPercent(exp.progress)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-hi">
                          {clampPercent(exp.progress)}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10.5px] font-mono uppercase tracking-wider text-low">
                        Personnel Assigned
                      </div>
                      <div className="mt-0.5 font-mono text-sm font-bold text-hi">
                        {expTeam.length} <span className="text-xs font-normal text-low">/ {exp.team_size} planned</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10.5px] font-mono uppercase tracking-wider text-low">
                        Cargo Consignments
                      </div>
                      <div className="mt-0.5 font-mono text-sm font-bold text-hi">
                        {expCargo.length} items{' '}
                        <span className="text-xs font-normal text-low">
                          ({formatNumber(totalCargoWeight)} kg)
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10.5px] font-mono uppercase tracking-wider text-low">
                        Incident Status
                      </div>
                      <div className="mt-0.5">
                        {expEmergencies.length > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-[rgba(239,68,68,0.15)] px-2 py-0.5 font-mono text-xs font-bold text-[var(--red)] animate-pulse">
                            <Siren size={11} /> {expEmergencies.length} Open Alert
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-[rgba(34,197,94,0.12)] px-2 py-0.5 font-mono text-xs font-bold text-[var(--green)]">
                            <CheckCircle2 size={11} /> All Clear
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emergency Notice if open incident */}
                {expEmergencies.length > 0 && (
                  <div className="alert-strip m-4">
                    <Siren size={16} className="animate-pulse text-[var(--red)] shrink-0" />
                    <div className="flex-1 text-xs text-mid">
                      <strong className="text-[var(--red)] font-semibold">
                        Emergency in {exp.name}:
                      </strong>{' '}
                      {expEmergencies.map((em) => `${em.id} (${statusLabel(EMERGENCY_TYPE, em.type)}) - ${em.description}`).join('; ')}
                    </div>
                    <button
                      type="button"
                      className="btn btn--alert btn--sm"
                      onClick={() => goTo('emergency')}
                    >
                      Respond
                    </button>
                  </div>
                )}

                {/* Sub-sections: Assigned Team & Assigned Cargo */}
                <div className="grid gap-4 p-5 lg:grid-cols-2">
                  {/* Sub-section 1: Assigned Team */}
                  <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-base)] p-4">
                    <div className="mb-3 flex items-center justify-between border-b border-[var(--line-soft)] pb-2">
                      <div className="flex items-center gap-2">
                        <Users size={15} className="text-[var(--ice)]" />
                        <span className="font-display text-sm font-bold text-hi uppercase tracking-wide">
                          Assigned Team ({expTeam.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm text-[11px]"
                        onClick={() => goTo('personnel')}
                      >
                        Open Roster
                      </button>
                    </div>

                    {expTeam.length === 0 ? (
                      <div className="py-4 text-center text-xs text-low">
                        No team members currently assigned to {exp.id}.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {expTeam.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between rounded border border-[var(--line-soft)] bg-[var(--surface-card)] px-3 py-2 text-xs"
                          >
                            <div>
                              <div className="font-medium text-hi">{member.name}</div>
                              <div className="text-[11px] text-low">
                                <span className="mono">{member.id}</span> · {member.role}
                              </div>
                            </div>
                            <Badge map={PERSONNEL_STATUS} value={member.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sub-section 2: Assigned Cargo */}
                  <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-base)] p-4">
                    <div className="mb-3 flex items-center justify-between border-b border-[var(--line-soft)] pb-2">
                      <div className="flex items-center gap-2">
                        <Package size={15} className="text-[var(--ice)]" />
                        <span className="font-display text-sm font-bold text-hi uppercase tracking-wide">
                          Assigned Cargo ({expCargo.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm text-[11px]"
                        onClick={() => goTo('cargo')}
                      >
                        Open Cargo
                      </button>
                    </div>

                    {expCargo.length === 0 ? (
                      <div className="py-4 text-center text-xs text-low">
                        No consignments assigned to {exp.id}.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {expCargo.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded border border-[var(--line-soft)] bg-[var(--surface-card)] px-3 py-2 text-xs"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <div className="truncate font-medium text-hi">{item.item_name}</div>
                              <div className="text-[11px] text-low">
                                <span className="mono">{item.id}</span> · {item.quantity} {item.unit} · {item.weight_kg ? `${formatNumber(item.weight_kg)} kg` : ''} · {statusLabel(CARGO_STATUS, item.status)}
                              </div>
                            </div>
                            <Badge map={PRIORITY} value={item.priority} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ================= REGISTER & DETAIL INSPECTION VIEW ================= */
        <div className="grid gap-4 xl:grid-cols-5">
          <Panel
            className="xl:col-span-3"
            eyebrow="Register"
            title="All Expeditions"
            subtitle="Click a row to load its team and cargo"
            action={
              canManage &&
              !showForm && (
                <button type="button" className="btn btn--sm" onClick={() => setShowForm(true)}>
                  <Plus size={13} /> New
                </button>
              )
            }
          >
            <DataTable
              loading={loading}
              error={error}
              rows={expeditions}
              rowKey={(row) => row.id}
              onRowClick={(row) => setSelectedId(row.id)}
              maxHeight="520px"
              emptyTitle="No expeditions registered"
              emptyMessage="Use the New button to add the first one."
              columns={[
                { header: 'ID', cell: (r) => r.id, mono: true, width: '78px' },
                {
                  header: 'Expedition',
                  strong: true,
                  cell: (r) => (
                    <div className="flex items-center gap-1.5">
                      <div>
                        <div>{r.name}</div>
                        <div className="text-[11px] font-normal text-low">{r.destination}</div>
                      </div>
                      {r.id === selectedId && (
                        <ChevronRight size={14} className="shrink-0 text-[var(--ice)]" />
                      )}
                    </div>
                  ),
                },
                {
                  header: 'Dates',
                  width: '116px',
                  mono: true,
                  cell: (r) => (
                    <span className="text-[11px] text-mid">
                      {formatDate(r.start_date)}
                      <br />
                      {formatDate(r.end_date)}
                    </span>
                  ),
                },
                {
                  header: 'Progress',
                  width: '110px',
                  cell: (r) => (
                    <div>
                      <div className="mono mb-1 text-right text-[11px] text-mid">
                        {clampPercent(r.progress)}%
                      </div>
                      <div
                        className={`progress ${
                          r.status === 'COMPLETED'
                            ? 'progress--muted'
                            : r.progress < 30
                              ? 'progress--warn'
                              : ''
                        }`}
                      >
                        <span style={{ width: `${clampPercent(r.progress)}%` }} />
                      </div>
                    </div>
                  ),
                },
                {
                  header: 'Status',
                  width: '132px',
                  cell: (r) => (
                    <select
                      className="select-inline"
                      value={r.status}
                      disabled={!canManage}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateExpedition(r.id, { status: e.target.value })}
                      aria-label={`Status for ${r.name}`}
                    >
                      {optionsFrom(EXPEDITION_STATUS).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ),
                },
              ]}
            />
          </Panel>

          {/* ---------- DETAIL: team and cargo, looked up live ---------- */}
          <div className="space-y-4 xl:col-span-2">
            {!selected ? (
              <Panel eyebrow="Detail" title="Expedition Detail">
                <StateBlock
                  kind="empty"
                  title="Nothing selected"
                  message="Click an expedition in the register."
                />
              </Panel>
            ) : (
              <>
                <Panel
                  eyebrow={selected.id}
                  title={selected.name}
                  subtitle={selected.objective}
                  action={<Badge map={EXPEDITION_STATUS} value={selected.status} dot />}
                >
                  <dl className="space-y-0">
                    <div className="kv">
                      <dt>Destination</dt>
                      <dd>{selected.destination}</dd>
                    </div>
                    <div className="kv">
                      <dt>Leader</dt>
                      <dd>{selected.leader}</dd>
                    </div>
                    <div className="kv">
                      <dt>Window</dt>
                      <dd className="mono text-[12px]">
                        {formatDate(selected.start_date)} → {formatDate(selected.end_date)}
                      </dd>
                    </div>
                    <div className="kv">
                      <dt>Planned team size</dt>
                      <dd className="mono">{selected.team_size}</dd>
                    </div>
                    <div className="kv">
                      <dt>Assigned on roster</dt>
                      <dd className="mono">{team.length}</dd>
                    </div>
                    <div className="kv">
                      <dt>Consignments</dt>
                      <dd className="mono">{consignments.length}</dd>
                    </div>
                  </dl>
                </Panel>

                {/* Team roster */}
                <Panel
                  eyebrow="Connected data"
                  title="Assigned Team"
                  subtitle="Read live from Personnel Tracking"
                  action={
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => goTo('personnel')}
                    >
                      <Users size={13} /> Open
                    </button>
                  }
                >
                  {team.length === 0 ? (
                    <StateBlock
                      kind="empty"
                      title="Nobody assigned yet"
                      message="Add team members from the Personnel module."
                    />
                  ) : (
                    <ul className="space-y-2.5">
                      {team.map((person) => (
                        <li key={person.id} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-[13px] text-hi">{person.name}</div>
                            <div className="truncate text-[11px] text-low">
                              <span className="mono">{person.id}</span> · {person.role}
                            </div>
                          </div>
                          <Badge map={PERSONNEL_STATUS} value={person.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                {/* Cargo */}
                <Panel
                  eyebrow="Connected data"
                  title="Assigned Cargo"
                  subtitle="Read live from Cargo Tracking"
                  action={
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => goTo('cargo')}
                    >
                      <Package size={13} /> Open
                    </button>
                  }
                >
                  {consignments.length === 0 ? (
                    <StateBlock
                      kind="empty"
                      title="No cargo assigned yet"
                      message="Log consignments from the Cargo module."
                    />
                  ) : (
                    <ul className="space-y-2.5">
                      {consignments.map((item) => (
                        <li key={item.id} className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-[13px] text-hi">{item.item_name}</div>
                            <div className="truncate text-[11px] text-low">
                              <span className="mono">{item.id}</span> · {item.quantity} {item.unit} ·{' '}
                              {statusLabel(CARGO_STATUS, item.status)}
                            </div>
                          </div>
                          <Badge map={PRIORITY} value={item.priority} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
