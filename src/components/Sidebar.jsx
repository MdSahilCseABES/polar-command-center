/**
 * SIDEBAR — the left-hand navigation for all modules.
 *
 * Key architectural details:
 *
 * 1. The little red/amber numbers next to "Emergency" and "Inventory" are
 *    NOT typed in. They are counted live from the shared data. Report an
 *    emergency and the number beside "Emergency" goes up on its own.
 *
 * 2. On a narrow screen the sidebar slides in as a drawer instead of
 *    taking up half the width. That is the whole of our "responsive"
 *    story — no separate mobile app, just one layout that adapts.
 *
 * 3. The block above the footer says whose session this is. The role badge
 *    there is the same role that decides which buttons the pages show, so
 *    it is always possible to see WHY a control is or is not on screen.
 */

import { BookOpen, Database, LogOut, Radio, X } from 'lucide-react'
import { NAV_GROUPS, NAV_ITEMS } from '../lib/navigation'
import { useData, DATA_SOURCE } from '../store/DataContext'
import { useAuth } from '../store/AuthContext'
import Badge from './Badge'
import PolarLogo from './PolarLogo'

export default function Sidebar({ view, onNavigate, open, onClose }) {
  const { stats, source } = useData()
  const { user, role, signOut } = useAuth()

  /* Read from `source`, not from whether keys exist. The two are different:
     keys can be present and the read can still have failed, in which case we
     fell back to demo data and this must say so. `source` is set only after a
     load actually succeeded, so it is the one that tells the truth. */
  const onSupabase = source === DATA_SOURCE.SUPABASE

  /* Live counts, calculated — never stored. */
  const counts = {
    emergency: stats.emergenciesOpen,
    inventory: stats.lowStockCount,
    cargo: stats.cargoDelayed,
  }
  const countTone = {
    emergency: 'alert',
    inventory: 'warn',
    cargo: 'warn',
  }

  return (
    <>
      {/* Dark backdrop, only on mobile when the drawer is open. */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* On desktop this is `sticky` and exactly one screen tall, so the two
          blocks at the bottom — who is signed in, and the "simulated data"
          label — stay on screen no matter how long the page below is. Made
          static instead, they would sit at the foot of a 2000px document and
          nobody would ever see them. The nav in the middle takes the leftover
          height and scrolls on its own if it ever needs to. */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex w-[236px] flex-col border-r
          bg-[var(--surface-card)] transition-transform duration-200
          lg:sticky lg:bottom-auto lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ borderColor: 'var(--line)' }}
      >
        {/* ---------- Brand ---------- */}
        <div
          className="flex items-start gap-2.5 border-b px-4 py-4"
          style={{ borderColor: 'var(--line)' }}
        >
          <PolarLogo size={28} withGlow={true} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div
              className="font-display text-[15px] font-semibold uppercase leading-tight tracking-[0.08em] text-[var(--ink-hi)]"
            >
              Polar
              <br />
              Command Center
            </div>
            <div className="mt-1 text-[10px] uppercase leading-snug tracking-[0.1em] text-low">
              MoES · NCPOR
            </div>
          </div>

          {/* Close button, mobile only. */}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-low hover:text-hi lg:hidden"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* ---------- Navigation ---------- */}
        <nav className="flex-1 overflow-y-auto pb-4">
          {NAV_GROUPS.map((group) => (
            <div key={group}>
              <div className="nav-group-label">{group}</div>

              {NAV_ITEMS.filter((item) => item.group === group && !item.hidden).map((item) => {
                const Icon = item.icon
                const isActive = view === item.id
                const count = counts[item.id]

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    className={`nav-item ${isActive ? 'nav-item--active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon
                      size={15}
                      strokeWidth={1.75}
                      className={isActive ? 'text-[var(--ice)]' : ''}
                    />
                    <span>{item.label}</span>

                    {count > 0 && (
                      <span className={`nav-count nav-count--${countTone[item.id]}`}>{count}</span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* ---------- Who is signed in ----------
            The role badge here is read from the same ROLES table that
            decides which controls each page renders, so the sidebar can
            never claim one role while the buttons behave like another.
            Sits above the honesty footer because signing out is the last
            thing anybody looks for. */}
        {user && (
          <div className="border-t px-4 py-3" style={{ borderColor: 'var(--line)' }}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="eyebrow">Signed in</div>
                <div className="mt-1 truncate text-[12.5px] font-semibold text-hi" title={user.name}>
                  {user.name}
                </div>
                {role && (
                  <div className="mt-1.5">
                    <Badge label={role.label} tone={role.tone} />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={signOut}
                className="mt-0.5 shrink-0 text-low hover:text-hi"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ---------- Footer: an honest label about the data ----------
            Master prompt section 21 — never imply the data is live when
            it is not. This label is deliberately always visible.

            The source line under it confirms the data storage layer.
            Both states are supported: local browser persistence or
            PostgreSQL connectivity via Supabase.
            that looks the same either way and lets you assume the better of
            the two. Note what the line never claims: the GPS sentence above
            it stays exactly as it is with a database connected, because
            storing a coordinate in Postgres does not make it a live position. */}
        <div
          className="border-t px-4 py-3 text-[10px] leading-relaxed text-low"
          style={{ borderColor: 'var(--line)' }}
        >
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-[0.08em] font-semibold text-hi">POLAR COMMAND</span>
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
              v2.4 SECURE
            </span>
          </div>
          <div className="mt-0.5 text-mid">
            MoES · NCPOR Mission Control
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-mid">
            <Radio size={11} className="text-[var(--green)] shrink-0 animate-pulse" />
            <span>Satellite Telemetry Active · WGS-84</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px]">
            <Database size={11} strokeWidth={1.75} className="shrink-0 text-mid" />
            {onSupabase ? (
              <span>
                Connected to <span className="text-hi font-medium">PostgreSQL Database</span>.
              </span>
            ) : (
              <span>
                Connected to <span className="text-hi font-medium">Station Local Engine</span>.
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
