/**
 * APP — the layout, the sign-in gate, and the thing that decides which page
 * is on screen.
 *
 * HOW NAVIGATION WORKS HERE (and why it looks so simple):
 *   We keep the name of the current page in a single piece of state:
 *       const [view, setView] = useState('dashboard')
 *   Clicking a sidebar link calls setView('cargo'), and the switch
 *   statement below renders the Cargo page.
 *
 *   Most tutorials would reach for React Router here. We deliberately do
 *   not: this is a single-screen operations console with eight panes, so
 *   one line of state does the same job with no extra dependency and
 *   nothing new to explain. (Master prompt section 18 — don't overengineer.)
 *
 * THE SIGN-IN GATE:
 *   If nobody is signed in, this file renders the sign-in screen INSTEAD of
 *   the console — one `if` near the top of the component. That is the whole
 *   gate. It is not a security boundary and does not pretend to be; see the
 *   comment at the top of src/lib/roles.js for the honest version.
 *
 * THE LAYOUT: sidebar on the left, top bar across, page content below.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { CloudOff, Eye, X } from 'lucide-react'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import EmergencyBanner from './components/EmergencyBanner'
import EmergencyModal from './components/EmergencyModal'
import ErrorBoundary from './components/ErrorBoundary'
import { findNavItem } from './lib/navigation'
import { useAuth } from './store/AuthContext'
import { useData } from './store/DataContext'
import { playAcknowledgeChirp } from './services/audioAlert'
import { saveMessage } from './services/emergencyStorage'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Expeditions from './pages/Expeditions'
import Personnel from './pages/Personnel'
import Cargo from './pages/Cargo'
import Inventory from './pages/Inventory'
import MapView from './pages/MapView'
import Weather from './pages/Weather'
import Emergency from './pages/Emergency'
import AiCopilot from './pages/AiCopilot'
import ResearchSources from './pages/ResearchSources'
import { AIChatbot, createProjectDataAdapter } from './polar-ai-assistant/src/index.js'

function getInitialView() {
  try {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase()
      if (hash && findNavItem(hash)?.id === hash) {
        return hash
      }
      const saved = sessionStorage.getItem('polar.activeView')
      if (saved && findNavItem(saved)?.id === saved) {
        return saved
      }
    }
  } catch {
    // Storage or location issue
  }
  return 'dashboard'
}

export default function App() {
  /* Who is signed in, and what they may change. */
  const { user, canManage, canRespond } = useAuth()

  /* Whether the database is keeping up. `dbNotice` is null unless a database
     is configured AND something went wrong with it, so on demo data — the
     default — it is always null and the strip below never renders. */
  const {
    dbNotice,
    dismissDbNotice,
    reload,
    emergencies,
    personnel,
    expeditions,
    locations,
    cargo,
    inventory,
    stats,
    reportEmergency,
    updateEmergency,
  } = useData()

  /* Universal Project Data Adapter for the Portable AI Assistant */
  const projectDataAdapter = useMemo(() => {
    return createProjectDataAdapter(
      {
        expeditions,
        personnel,
        locations,
        cargo,
        inventory,
        emergencies,
        stats,
      },
      {
        projectName: 'POLAR COMMAND CENTER',
      }
    )
  }, [expeditions, personnel, locations, cargo, inventory, emergencies, stats])

  /* Which module is on screen — initialized from URL hash or sessionStorage. */
  const [view, setView] = useState(getInitialView)

  /* Whether the mobile drawer is open. Ignored on desktop. */
  const [navOpen, setNavOpen] = useState(false)

  /* SOS Modal & Focused Incident state */
  const [sosModalOpen, setSosModalOpen] = useState(false)
  const [focusedIncidentId, setFocusedIncidentId] = useState(null)
  const [readonlyDismissed, setReadonlyDismissed] = useState(false)

  /* Browser History & Back/Forward integration:
     Allows native browser Back (<-) and Forward (->) buttons to move
     between operational modules seamlessly. */
  useEffect(() => {
    const handlePopState = (event) => {
      let target = event.state?.view
      if (!target && typeof window !== 'undefined') {
        const hash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase()
        if (hash && findNavItem(hash)?.id === hash) {
          target = hash
        }
      }
      if (!target || !findNavItem(target)) {
        target = 'dashboard'
      }
      setView(target)
      try {
        sessionStorage.setItem('polar.activeView', target)
      } catch {}
      setNavOpen(false)
      window.scrollTo({ top: 0 })
    }

    window.addEventListener('popstate', handlePopState)
    window.addEventListener('hashchange', handlePopState)

    // Sync initial state if needed
    if (typeof window !== 'undefined' && user) {
      const current = getInitialView()
      const targetHash = `#${current}`
      if (window.location.hash !== targetHash) {
        window.history.replaceState({ view: current }, '', targetHash)
      } else if (!window.history.state?.view) {
        window.history.replaceState({ view: current }, '', targetHash)
      }
    }

    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('hashchange', handlePopState)
    }
  }, [user])

  /* Used when one page wants to send you to another — e.g. clicking the
     "Low Stock" card on the dashboard takes you to Inventory. Pushes history
     so browser Back (<-) and Forward (->) buttons work seamlessly. */
  const goTo = useCallback((nextView, options = {}) => {
    const { replace = false } = options
    setView(nextView)
    try {
      sessionStorage.setItem('polar.activeView', nextView)
      const targetHash = `#${nextView}`
      if (window.location.hash !== targetHash) {
        if (replace) {
          window.history.replaceState({ view: nextView }, '', targetHash)
        } else {
          window.history.pushState({ view: nextView }, '', targetHash)
        }
      }
    } catch {}
    setNavOpen(false)
    window.scrollTo({ top: 0 })
  }, [])

  const handleSosSubmit = (payload) => {
    let mappedType = 'OTHER'
    if (payload.type.includes('Medical')) mappedType = 'MEDICAL'
    else if (payload.type.includes('Blizzard')) mappedType = 'WEATHER'
    else if (payload.type.includes('Equipment')) mappedType = 'EQUIPMENT_FAILURE'
    else if (payload.type.includes('Fire')) mappedType = 'FIRE'
    else if (payload.type.includes('Lost') || payload.type.includes('Check')) mappedType = 'OVERDUE_CHECKIN'
    else if (payload.type.includes('Crevasse') || payload.type.includes('Vehicle')) mappedType = 'VEHICLE'

    const rec = reportEmergency({
      type: mappedType,
      severity: payload.severity || 'CRITICAL',
      detail: payload.detail,
      description: payload.description,
      location: payload.detail,
      latitude: payload.lat,
      longitude: payload.lng,
    })

    saveMessage({
      id: `MSG-${Date.now()}`,
      incidentId: rec.id,
      senderId: 'PERS-CURRENT',
      senderName: user?.name || 'Field Operator',
      senderRole: user?.role || 'Field Scientist',
      text: `🚨 SOS BROADCAST: [${payload.type}] at ${payload.detail}. "${payload.description}"`,
      priority: 'CRITICAL',
      timestamp: new Date().toISOString(),
      status: 'delivered',
    })

    setFocusedIncidentId(rec.id)
    goTo('emergency')
  }

  const handleAcknowledge = (id) => {
    updateEmergency(id, {
      status: 'RESPONDING',
      assigned_team: user?.name || 'Response Team Alpha',
    })
    playAcknowledgeChirp()
  }

  const nav = findNavItem(view)

  /* THE GATE. Nobody signed in means the sign-in screen and nothing else —
     no sidebar, no top bar, no data pages mounted behind it. */
  if (!user) return <Login />

  /* Pick the page component for the current view. Every page receives
     goTo so it can link elsewhere in the console. */
  function renderPage() {
    switch (view) {
      case 'dashboard':
        return <Dashboard goTo={goTo} />
      case 'expeditions':
        return <Expeditions goTo={goTo} />
      case 'personnel':
        return <Personnel goTo={goTo} />
      case 'cargo':
        return <Cargo goTo={goTo} />
      case 'inventory':
        return <Inventory goTo={goTo} />
      case 'map':
        return <MapView goTo={goTo} />
      case 'weather':
        return <Weather goTo={goTo} />
      case 'emergency':
        return <Emergency goTo={goTo} focusedIncidentId={focusedIncidentId} onClearFocus={() => setFocusedIncidentId(null)} onOpenSos={() => setSosModalOpen(true)} />
      case 'copilot':
        return <AiCopilot goTo={goTo} />
      case 'sources':
        return <ResearchSources goTo={goTo} />
      default:
        return <Dashboard goTo={goTo} />
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        view={view}
        onNavigate={goTo}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />

      {/* min-w-0 matters: without it, a wide table would stretch this
          column and break the layout instead of scrolling inside it. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Unified sticky header container: keeps TopBar and EmergencyBanner perfectly docked with zero viewport drift */}
        <div className="sticky top-0 z-30">
          <TopBar
            title={nav.title}
            blurb={nav.blurb}
            onMenuClick={() => setNavOpen(true)}
            onAlertClick={() => goTo('emergency')}
            onSosClick={() => setSosModalOpen(true)}
            onHelpClick={() => goTo('sources')}
          />

          {/* Global Real-Time Emergency Banner */}
          <EmergencyBanner
            emergencies={emergencies}
            personnel={personnel}
            canRespond={canRespond}
            onOpenEmergencyRoom={(id) => {
              setFocusedIncidentId(id)
              goTo('emergency')
            }}
            onAcknowledge={handleAcknowledge}
          />
        </div>

        {/* ---------- READ-ONLY NOTICE ----------
            One line, in ONE place, shown on every page for a role that
            cannot change records. Without it the missing New / Add buttons
            look like a bug rather than a permission.

            The wording says "switched off" rather than "hidden" because both
            things happen and the difference is deliberate: a button that only
            performs an action is removed, while a dropdown that also DISPLAYS
            a value is dimmed instead, so the value can still be read.

            It is also where we make the important exception clear: a
            read-only session can still report an emergency. The reason is
            in src/lib/roles.js — blocking that would be dangerous in a
            real system, so we do not model it here either. */}
        {!canManage && !readonlyDismissed && (
          <div className="readonly-strip flex items-center justify-between px-4 py-1 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Eye size={13} strokeWidth={2} className="shrink-0 text-[var(--green)]" />
              <span className="truncate">
                <span className="text-hi font-semibold">Read-only session:</span> Controls that modify records are restricted for {user?.role || 'your role'}. Emergency reporting remains armed.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setReadonlyDismissed(true)}
              className="ml-3 shrink-0 rounded p-0.5 text-low hover:text-hi transition"
              title="Dismiss notice"
              aria-label="Dismiss notice"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* ---------- DATABASE NOTICE ----------
            One strip, two problems, and it knows which one happened:

              kind 'load' — the five tables could not be read, so the console
                            is running on its built-in demo data. Everything
                            works; nothing you change will be kept.
              kind 'save' — the tables were read fine, but a background write
                            failed. The change you just made is still on
                            screen and still correct in this tab, and it will
                            be gone after a refresh.

            NEITHER CAN APPEAR WITH NO DATABASE CONFIGURED, which is the
            default state of this project. Nothing is attempted, so nothing
            can fail, so this strip stays away during a demo on demo data.

            Why the 'save' case leaves the change on screen: the two
            alternatives are both dishonest. Doing nothing lets somebody walk
            away believing a record was filed. Silently undoing it makes a
            working button look broken. So the change stays and this says
            plainly what did not happen. Retry re-reads all five tables, which
            is the only route back to a state we can vouch for. */}
        {dbNotice && (
          <div className="sync-strip">
            <CloudOff size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-[var(--amber)]" />
            <span className="flex-1">
              {dbNotice.kind === 'save' ? (
                <>
                  <span className="text-hi">Not saved to the database.</span> {dbNotice.message} The
                  change is still on screen and still correct here, but it will be gone if you
                  refresh.
                </>
              ) : (
                <>
                  <span className="text-hi">Running on demo data.</span> {dbNotice.message} Every
                  module works normally; changes just will not survive a refresh.
                </>
              )}
            </span>
            <button type="button" onClick={reload} className="sync-strip__action">
              Retry
            </button>
            <button type="button" onClick={dismissDbNotice} className="sync-strip__action">
              Dismiss
            </button>
          </div>
        )}

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          {/* key={view} restarts the error boundary when you navigate, so
              one broken page does not stay broken forever. */}
          <ErrorBoundary key={view} onReset={() => goTo('dashboard')}>
            <div className="fade-up">{renderPage()}</div>
          </ErrorBoundary>
        </main>
      </div>

      {/* Fail-Safe Armed SOS Distress Modal */}
      <EmergencyModal
        isOpen={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        onSubmitSos={handleSosSubmit}
        operatorName={user?.name}
        operatorRole={user?.role}
      />

      {/* Global Floating AI Assistant — powered by portable Polar AI Assistant */}
      <AIChatbot
        dataAdapter={projectDataAdapter}
        projectName="POLAR COMMAND CENTER"
        title="Polar AI Assistant"
        subtitle="NCPOR Mission Intelligence"
        goTo={goTo}
        onFocusMap={(action) => {
          goTo('map')
        }}
      />
    </div>
  )
}
