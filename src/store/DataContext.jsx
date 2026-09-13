/**
 * THE SHARED DATA STORE  ("DataContext")
 * ======================================
 * THIS IS THE MOST IMPORTANT FILE IN THE PROJECT. Read this comment before
 * anything else — it is what makes the modules feel CONNECTED instead of
 * being six unrelated CRUD screens (master prompt section 12).
 *
 * THE IDEA, in one sentence:
 *   All the data lives in ONE place, and every page reads from that one
 *   place — so a change made on any page is instantly visible everywhere.
 *
 * WHY THAT MATTERS FOR THE DEMO:
 *   You report an emergency on the Emergency page.
 *     -> It is added to `emergencies` here.
 *     -> The Dashboard's "Critical Alerts" number is COUNTED from
 *        `emergencies`, so it goes up by itself.
 *     -> The Emergency list shows it, because it reads the same array.
 *   Nobody had to write code to "tell the dashboard to update". There is
 *   only one copy of the truth, so nothing can drift out of sync.
 *
 * THE ONE RULE THAT KEEPS IT HONEST:
 *   Numbers like "how many alerts" and "is this low stock" are never
 *   SAVED. They are always CALCULATED from the raw data (see `stats`
 *   below). A saved count can go stale. A calculated one cannot.
 *
 * "Context" is React's own built-in way of sharing data with every
 * component without passing it down by hand through every level. We are
 * using it instead of a library like Redux because it needs no extra
 * dependencies and keeps the architecture lean and inspectable.
 *
 * ============================================================
 * WHERE THE DATABASE FITS (added in the Supabase phase)
 * ============================================================
 * Everything above still describes how this file works. Supabase was added
 * UNDERNEATH it without changing any of it, and the arrangement is worth
 * understanding because it is what makes the demo safe:
 *
 *   1. ON STARTUP, if and only if .env has keys, we try to read the five
 *      tables. If that works, the arrays start out full of database rows
 *      instead of demo rows. If ANYTHING goes wrong — no keys, no network,
 *      no tables, no policies — we keep the demo data and say so in one
 *      sentence. There is no state in which the console has nothing to show.
 *
 *   2. ON EVERY CHANGE, the screen updates FIRST and the database is told
 *      afterwards, in the background, without anybody waiting for it. So
 *      pressing a button feels instant whether the database is fast, slow or
 *      not there at all — and the connected behaviour in section 12 of the
 *      brief happens at exactly the same speed either way.
 *
 *   3. IF A BACKGROUND WRITE FAILS, the change stays on screen and a strip
 *      appears saying it was not saved. That is the honest thing to show:
 *      the change is real in this tab and really will be lost on refresh.
 *      Silently rolling the screen back would be worse — it would look like
 *      the button did not work.
 *
 * THE PRICE OF DOING IT THIS WAY, said plainly: the browser is the thing you
 * are looking at, and the database is a copy that catches up a moment later.
 * With one operator that is invisible. With two people editing the same row
 * at once, the last write wins and neither is told. Fixing that properly
 * means realtime subscriptions and conflict handling, which is a different
 * and much larger project than this prototype.
 */

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import demoData from '../data/demoData'
import { EMERGENCY_STATUS, EMERGENCY_TYPE, SEVERITY, isLowStock, statusLabel, stockStatus } from '../lib/statuses'
import { nextId } from '../lib/format'
import { isSupabaseConfigured, supabaseConfig } from '../lib/supabase'
import { describeDbError } from '../services/db'
import * as personnelLocationDb from '../services/personnelLocationService'

/* THE FIVE TABLE SERVICES, imported as whole modules.
   `import * as expeditionDb` instead of `import { updateExpedition }` for one
   very practical reason: this file already has functions called
   updateExpedition, updatePerson, updateCargo and so on, and the services use
   the same names. Importing them plainly would collide. This way every
   database call is spelled `expeditionDb.updateExpedition(...)`, which also
   makes it obvious at a glance which lines talk to the network. */
import * as expeditionDb from '../services/expeditionService'
import * as personnelDb from '../services/personnelService'
import * as cargoDb from '../services/cargoService'
import * as inventoryDb from '../services/inventoryService'
import * as emergencyDb from '../services/emergencyService'

/* The context object itself. Components never touch this directly —
   they call the useData() hook at the bottom of this file. */
const DataContext = createContext(null)

/* Where the data came from. Shown in the UI so we never mislead anyone
   about whether they are looking at a real database or demo data. */
export const DATA_SOURCE = {
  DEMO: 'DEMO',
  SUPABASE: 'SUPABASE',
}

export const SESSION_STORAGE_KEYS = {
  LOCATIONS: 'polar.session.locations',
  EXPEDITIONS: 'polar.session.expeditions',
  PERSONNEL: 'polar.session.personnel',
  CARGO: 'polar.session.cargo',
  INVENTORY: 'polar.session.inventory',
  EMERGENCIES: 'polar.session.emergencies',
  ACTIVITY_LOG: 'polar.session.activityLog',
}

function loadSessionArray(key, fallback) {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return fallback
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function saveSessionArray(key, array) {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(key, JSON.stringify(array))
    }
  } catch {
    // Quota exceeded or private browsing
  }
}

export function clearDataSession() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      Object.values(SESSION_STORAGE_KEYS).forEach((k) => window.sessionStorage.removeItem(k))
    }
  } catch {
    // ignore
  }
}

export function DataProvider({ children }) {
  /* ---------- 1. THE RAW DATA (with tab session persistence) ----------
     Reads from sessionStorage if available in this tab so created or modified
     records survive page refreshes, and resets automatically when the tab closes
     or on sign-out. */
  const [locations, setLocations] = useState(() =>
    loadSessionArray(SESSION_STORAGE_KEYS.LOCATIONS, demoData.locations)
  )
  const [expeditions, setExpeditions] = useState(() =>
    loadSessionArray(SESSION_STORAGE_KEYS.EXPEDITIONS, demoData.expeditions)
  )
  const [personnel, setPersonnel] = useState(() =>
    loadSessionArray(SESSION_STORAGE_KEYS.PERSONNEL, demoData.personnel)
  )
  const [cargo, setCargo] = useState(() =>
    loadSessionArray(SESSION_STORAGE_KEYS.CARGO, demoData.cargo)
  )
  const [inventory, setInventory] = useState(() =>
    loadSessionArray(SESSION_STORAGE_KEYS.INVENTORY, demoData.inventory)
  )
  const [emergencies, setEmergencies] = useState(() =>
    loadSessionArray(SESSION_STORAGE_KEYS.EMERGENCIES, demoData.emergencies)
  )
  const [activityLog, setActivityLog] = useState(() =>
    loadSessionArray(SESSION_STORAGE_KEYS.ACTIVITY_LOG, demoData.activityLog)
  )

  /* Synchronize each table to sessionStorage whenever it changes */
  useEffect(() => {
    saveSessionArray(SESSION_STORAGE_KEYS.LOCATIONS, locations)
  }, [locations])

  useEffect(() => {
    saveSessionArray(SESSION_STORAGE_KEYS.EXPEDITIONS, expeditions)
  }, [expeditions])

  useEffect(() => {
    saveSessionArray(SESSION_STORAGE_KEYS.PERSONNEL, personnel)
  }, [personnel])

  useEffect(() => {
    saveSessionArray(SESSION_STORAGE_KEYS.CARGO, cargo)
  }, [cargo])

  useEffect(() => {
    saveSessionArray(SESSION_STORAGE_KEYS.INVENTORY, inventory)
  }, [inventory])

  useEffect(() => {
    saveSessionArray(SESSION_STORAGE_KEYS.EMERGENCIES, emergencies)
  }, [emergencies])

  useEffect(() => {
    saveSessionArray(SESSION_STORAGE_KEYS.ACTIVITY_LOG, activityLog)
  }, [activityLog])

  /* Auto-register any expedition destinations that are not yet in locations */
  useEffect(() => {
    const unmapped = expeditions.filter((exp) => {
      if (!exp.destination || !exp.destination.trim()) return false
      const dest = exp.destination.trim().toLowerCase()
      return !locations.some(
        (l) => l.name.toLowerCase() === dest || (exp.location_id && l.id === exp.location_id)
      )
    })
    if (unmapped.length > 0) {
      setLocations((prev) => {
        const toAdd = []
        for (const exp of unmapped) {
          const destName = exp.destination.trim()
          if (!prev.some((l) => l.name.toLowerCase() === destName.toLowerCase())) {
            toAdd.push({
              id: exp.location_id || `LOC-EXP-${exp.id}`,
              name: destName,
              type: 'CAMP',
              region: 'Antarctica — Field Operations',
              latitude: -70.7667 + (Math.random() - 0.5) * 3,
              longitude: 11.7333 + (Math.random() - 0.5) * 6,
              notes: `Field destination for expedition ${exp.id} (${exp.name})`,
              capacity: exp.team_size || 10,
            })
          }
        }
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev
      })
    }
  }, [expeditions, locations])

  /* Reset data to default demo state whenever sign-out occurs */
  useEffect(() => {
    const handleSignOut = () => {
      clearDataSession()
      setLocations(demoData.locations)
      setExpeditions(demoData.expeditions)
      setPersonnel(demoData.personnel)
      setCargo(demoData.cargo)
      setInventory(demoData.inventory)
      setEmergencies(demoData.emergencies)
      setActivityLog(demoData.activityLog)
    }

    window.addEventListener('polar:auth-signout', handleSignOut)
    return () => window.removeEventListener('polar:auth-signout', handleSignOut)
  }, [])

  /* ---------- 2. LOADING / ERROR STATE ----------
     Master prompt section 15 asks every data operation to have a loading,
     error and empty state. These flags drive that. */
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [source, setSource] = useState(DATA_SOURCE.DEMO)

  /* `dbNotice` is a DIFFERENT thing from `error`, and keeping them apart is
     not fussiness — it is a bug that was nearly written.

     `error` is handed to the DataTable on six pages, and a DataTable given an
     error shows the error INSTEAD of its rows. That is right when there is
     nothing to show. But a database that fails to load leaves us showing the
     demo data, which means every one of those six tables has perfectly good
     rows in it. Putting "could not reach the database" into `error` would have
     replaced six full tables with six error boxes to report a problem that
     did not empty a single one of them.

     So the database's own complaints live here instead, and are shown as one
     line across the top of the page by src/App.jsx. Two shapes:
       { kind: 'load', message }  — could not READ, so you are seeing demo data
       { kind: 'save', message }  — could not WRITE, so what you changed is on
                                    screen but not in the database
     Two genuinely different problems, told apart, because a single message
     that covered both would be wrong half the time it appeared. */
  const [dbNotice, setDbNotice] = useState(null)
  const dismissDbNotice = useCallback(() => setDbNotice(null), [])

  /* ---------- READING THE DATABASE ----------
     Called on mount, and again by reload(). Returns a description of what
     happened rather than throwing, because the caller's job is to decide
     whether to switch source — not to catch exceptions.

     Promise.all runs all five reads AT THE SAME TIME. Done one after another
     they would take five round trips; done together they take one, which on a
     conference wifi connection is the difference between a console that opens
     and a console that appears broken. */
  const loadFromDatabase = useCallback(async () => {
    const [exp, ppl, crg, inv, emg] = await Promise.all([
      expeditionDb.fetchExpeditions(),
      personnelDb.fetchPersonnel(),
      cargoDb.fetchCargo(),
      inventoryDb.fetchInventory(),
      emergencyDb.fetchEmergencies(),
    ])

    const failed = [exp, ppl, crg, inv, emg].find((r) => r.error)
    if (failed) {
      return { ok: false, message: describeDbError(failed.error) }
    }

    /* ALL FIVE TABLES EMPTY IS TREATED AS "NOT SET UP", NOT AS "NO DATA".
       This is the one genuinely tricky case in the whole file. When Row Level
       Security is on and no policy has been created, Supabase does not return
       an error — it returns zero rows, cheerfully. From here that looks exactly
       like a database whose tables exist but were never seeded. Either way the
       honest move is the same: keep the demo data so the console has something
       to show, and say which two things it might be. */
    const total = exp.rows.length + ppl.rows.length + crg.rows.length + inv.rows.length + emg.rows.length
    if (total === 0) {
      return {
        ok: false,
        message:
          'Connected to Supabase, but all five tables came back empty. Either the seed data was never run, or Row Level Security is blocking reads — those look identical from the browser. Run supabase/schema.sql in the SQL Editor; it creates the tables, the rows and the policies. Showing demo data meanwhile.',
      }
    }

    setExpeditions(exp.rows)
    setPersonnel(ppl.rows)
    setCargo(crg.rows)
    setInventory(inv.rows)
    setEmergencies(emg.rows)
    return { ok: true }
  }, [])

  /* ---------- THE STARTUP LOAD ----------
     Two paths, and the demo one is deliberately untouched from the nine
     phases before the database existed: a short pause, then the data that was
     already in state. The pause is not padding — it means the loading
     spinners on every page are real code paths we have actually watched work.

     Nothing here can leave the app with no data. The demo arrays are already
     in state before this runs; a database read either replaces them or does
     not. There is no in-between where the screen is empty. */
  useEffect(() => {
    let cancelled = false

    if (!isSupabaseConfigured()) {
      const timer = setTimeout(() => setLoading(false), 350)
      return () => clearTimeout(timer)
    }

    loadFromDatabase()
      .then((result) => {
        if (cancelled) return
        if (result.ok) {
          setSource(DATA_SOURCE.SUPABASE)
          setDbNotice(null)
        } else {
          setSource(DATA_SOURCE.DEMO)
          setDbNotice({ kind: 'load', message: result.message })
        }
      })
      .catch((err) => {
        /* Belt and braces. db.js is written so that nothing in it throws, so
           reaching here means something genuinely unexpected happened — and
           the response is still to show the demo data rather than a blank
           page with a stack trace behind it. */
        if (cancelled) return
        setSource(DATA_SOURCE.DEMO)
        setDbNotice({
          kind: 'load',
          message: `Unexpected problem reading the database: ${err?.message || err}`,
        })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    /* `cancelled` guards against a reply arriving after this component has
       gone away — which happens constantly in development, every time Vite
       hot-reloads this file mid-request. Without it React warns about setting
       state on something that no longer exists. */
    return () => {
      cancelled = true
    }
  }, [loadFromDatabase])

  /* ---------- LIVE GPS REALTIME ----------
     Location telemetry is the one data stream that should arrive in other
     open consoles without a refresh. The telemetry row is authoritative;
     when another device inserts a point, mirror it into the shared personnel
     state so MapView and every other page update together. */
  useEffect(() => {
    if (!isSupabaseConfigured()) return undefined
    const unsubscribe = personnelLocationDb.subscribeToLocations((payload) => {
      const row = payload?.new
      if (!row?.personnel_id || !Number.isFinite(Number(row.latitude)) || !Number.isFinite(Number(row.longitude))) return
      setPersonnel((prev) =>
        prev.map((person) =>
          person.id === row.personnel_id
            ? {
                ...person,
                latitude: Number(row.latitude),
                longitude: Number(row.longitude),
                last_updated: row.recorded_at || person.last_updated,
                gps_source: 'DEVICE',
                gps_accuracy: row.accuracy,
                gps_altitude: row.altitude,
                gps_heading: row.heading,
                gps_speed: row.speed,
              }
            : person
        )
      )
    })
    return unsubscribe
  }, [])

  /** Used by the Retry button on the notice strip. */
  const reload = useCallback(async () => {
    if (!isSupabaseConfigured()) return
    setLoading(true)
    setDbNotice(null)
    const result = await loadFromDatabase()
    if (result.ok) {
      setSource(DATA_SOURCE.SUPABASE)
    } else {
      setDbNotice({ kind: 'load', message: result.message })
    }
    setLoading(false)
  }, [loadFromDatabase])

  /* ---------- WRITING TO THE DATABASE ----------
     THE SINGLE MOST IMPORTANT LINE IN THIS FILE IS THE ONE THAT IS MISSING:
     nothing ever `await`s this function. It is called and forgotten.

     Why that is the right design and not laziness:
       Every action below has already updated the screen by the time this
       runs. If the UI waited for the database, then reporting an emergency
       would take as long as the slowest network round trip — and the
       connected chain from section 12 of the brief (alert count goes up,
       person flips to EMERGENCY, marker turns red) would visibly lag on a bad
       connection. Fire-and-forget means the demo behaves IDENTICALLY whether
       the database is fast, slow, or not configured at all. The only thing
       the network can affect is whether the change is still there tomorrow.

     When it is not configured this returns immediately and does nothing, so
     every action can call it unconditionally. There is no `if (database)`
     scattered through the twelve actions below — that check lives here. */
  const pushToDatabase = useCallback((what, run) => {
    if (!isSupabaseConfigured()) return

    Promise.resolve()
      .then(run)
      .then((result) => {
        if (result?.error) {
          setDbNotice({
            kind: 'save',
            message: `Could not save ${what}: ${describeDbError(result.error)}`,
          })
        }
      })
      .catch((err) => {
        setDbNotice({
          kind: 'save',
          message: `Could not save ${what}: ${err?.message || err}`,
        })
      })
  }, [])

  /* ---------- 3. ACTIVITY LOG ----------
     Every change records a line here, which is what makes the dashboard's
     "Recent Activity" panel look alive during a demo. */
  const logActivity = useCallback((kind, message) => {
    setActivityLog((prev) => [
      { id: `A-${Date.now()}`, at: new Date().toISOString(), kind, message },
      ...prev,
    ])
  }, [])

  /* ---------- 4. LOOKUP HELPERS ----------
     Small functions so pages don't repeat .find() everywhere. */
  const getExpedition = useCallback(
    (id) => expeditions.find((e) => e.id === id) || null,
    [expeditions]
  )
  const getLocation = useCallback((id) => locations.find((l) => l.id === id) || null, [locations])
  const getPerson = useCallback((id) => personnel.find((p) => p.id === id) || null, [personnel])

  /** Everyone assigned to one expedition. */
  const personnelForExpedition = useCallback(
    (expeditionId) => personnel.filter((p) => p.expedition_id === expeditionId),
    [personnel]
  )

  /** Every consignment belonging to one expedition. */
  const cargoForExpedition = useCallback(
    (expeditionId) => cargo.filter((c) => c.expedition_id === expeditionId),
    [cargo]
  )

  /* ============================================================
     5. ACTIONS — the only ways the data is allowed to change.
     ============================================================ */

  /* --- LOCATIONS --- */
  const addLocation = useCallback(
    (fields) => {
      const trimmedName = (fields.name || '').trim()
      if (!trimmedName) return null

      // Check if location already exists by name or id
      const existing = locations.find(
        (l) =>
          l.name.toLowerCase() === trimmedName.toLowerCase() ||
          (fields.id && l.id.toLowerCase() === fields.id.toLowerCase())
      )
      if (existing) return existing

      const newId =
        fields.id || `LOC-CUST-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
      const lat = Number.isFinite(Number(fields.latitude))
        ? Number(fields.latitude)
        : -70.7667 + (Math.random() - 0.5) * 4
      const lng = Number.isFinite(Number(fields.longitude))
        ? Number(fields.longitude)
        : 11.7333 + (Math.random() - 0.5) * 8

      const record = {
        id: newId,
        name: trimmedName,
        type: fields.type || 'CAMP',
        region: fields.region || 'Antarctica — Field Operations',
        latitude: lat,
        longitude: lng,
        notes: fields.notes || `Field operations site for ${trimmedName}`,
        capacity: fields.capacity || 10,
        ...fields,
        id: newId,
        name: trimmedName,
      }

      setLocations((prev) => [...prev, record])
      logActivity('LOCATION', `New location registered: ${record.name} (${record.type})`)
      return record
    },
    [locations, logActivity]
  )

  /* --- EXPEDITIONS ---
     Each action follows the same three steps, in this order:
       1. update the screen        (setExpeditions)
       2. write the activity line  (logActivity)
       3. tell the database        (pushToDatabase — nobody waits for it)
     Steps 1 and 2 are what the demo shows. Step 3 is what makes it survive a
     refresh, and does nothing at all when there is no database. */
  const addExpedition = useCallback(
    (fields) => {
      const recordId = nextId(expeditions, 'EXP')

      // Ensure destination is registered as a location
      let locId = fields.location_id || null
      if (fields.destination && fields.destination.trim()) {
        const destName = fields.destination.trim()
        const existingLoc = locations.find(
          (l) => l.name.toLowerCase() === destName.toLowerCase() || l.id === destName
        )
        if (existingLoc) {
          locId = existingLoc.id
        } else {
          const newLoc = addLocation({
            name: destName,
            type: 'CAMP',
            region: 'Antarctica — Field Operations',
            notes: `Field operations site for ${fields.name || destName}`,
          })
          if (newLoc) locId = newLoc.id
        }
      }

      const record = {
        id: recordId,
        status: 'PLANNING',
        progress: 0,
        team_size: 0,
        created_at: new Date().toISOString(),
        ...fields,
        location_id: locId,
      }
      setExpeditions((prev) => [...prev, record])
      logActivity('EXPEDITION', `${record.id} ${record.name} created`)
      pushToDatabase(`expedition ${record.id}`, () => expeditionDb.insertExpedition(record))
      return record
    },
    [expeditions, locations, addLocation, logActivity, pushToDatabase]
  )

  const updateExpedition = useCallback(
    (id, changes) => {
      setExpeditions((prev) => prev.map((e) => (e.id === id ? { ...e, ...changes } : e)))
      if (changes.status) logActivity('EXPEDITION', `${id} status changed to ${changes.status}`)
      else logActivity('EXPEDITION', `${id} updated`)
      pushToDatabase(`expedition ${id}`, () => expeditionDb.updateExpedition(id, changes))
    },
    [logActivity, pushToDatabase]
  )

  const deleteExpedition = useCallback(
    (id) => {
      setExpeditions((prev) => prev.filter((e) => e.id !== id))
      logActivity('EXPEDITION', `${id} removed`)
      pushToDatabase(`removal of expedition ${id}`, () => expeditionDb.deleteExpedition(id))
    },
    [logActivity, pushToDatabase]
  )

  /* --- PERSONNEL --- */
  const addPerson = useCallback(
    (fields) => {
      const record = {
        id: nextId(personnel, 'P'),
        status: 'ACTIVE',
        last_updated: new Date().toISOString(),
        ...fields,
      }
      setPersonnel((prev) => [...prev, record])
      logActivity('PERSONNEL', `${record.id} ${record.name} added to roster`)
      pushToDatabase(`${record.name}'s record`, () => personnelDb.insertPerson(record))
      return record
    },
    [personnel, logActivity, pushToDatabase]
  )

  const updatePerson = useCallback(
    (id, changes) => {
      /* MOVING SOMEONE ALSO MOVES THEIR COORDINATES.
         If a page changes location_id without giving explicit lat/lng, we
         copy the coordinates from that location. That is why re-assigning
         someone on the Personnel page also moves their marker on the map —
         one edit, two modules updated, no extra code on either page. */
      let patch = changes
      if (changes.location_id && changes.latitude == null) {
        const place = locations.find((l) => l.id === changes.location_id)
        if (place) {
          patch = {
            ...changes,
            latitude: place.latitude,
            longitude: place.longitude,
            gps_source: 'DEMO',
            gps_accuracy: null,
            gps_altitude: null,
            gps_heading: null,
            gps_speed: null,
          }
        }
      }

      /* ONE timestamp, made once, used by both the screen and the database.
         Calling new Date() twice — once inside setPersonnel and once in the
         push below — would store two values milliseconds apart and leave the
         browser and the database quietly disagreeing about when this
         happened. Cheap to get wrong, so it is made here and shared. */
      const stampedPatch = { ...patch, last_updated: new Date().toISOString() }

      setPersonnel((prev) => prev.map((p) => (p.id === id ? { ...p, ...stampedPatch } : p)))

      const person = personnel.find((p) => p.id === id)
      const who = `${id}${person ? ` ${person.name}` : ''}`

      if (changes.status) {
        logActivity('PERSONNEL', `${who} set to ${changes.status.replace('_', ' ')}`)
      } else if (changes.location_id) {
        const place = locations.find((l) => l.id === changes.location_id)
        logActivity('PERSONNEL', `${who} moved to ${place ? place.name : changes.location_id}`)
      }

      pushToDatabase(`${person ? person.name : id}'s record`, () =>
        personnelDb.updatePerson(id, stampedPatch)
      )
    },
    [personnel, locations, logActivity, pushToDatabase]
  )

  const recordPersonnelLocation = useCallback(
    async (personnelId, position) => {
      const result = await personnelLocationDb.recordLocation(personnelId, position)
      if (result.error) {
        setDbNotice({ kind: 'save', message: `Could not save GPS location: ${result.error}` })
        return result
      }
      const row = result.row
      setPersonnel((prev) =>
        prev.map((person) =>
          person.id === personnelId
            ? {
                ...person,
                latitude: row.latitude,
                longitude: row.longitude,
                last_updated: row.recorded_at,
                gps_source: 'DEVICE',
                gps_accuracy: row.accuracy,
                gps_altitude: row.altitude,
                gps_heading: row.heading,
                gps_speed: row.speed,
              }
            : person
        )
      )
      return result
    },
    []
  )

  /* --- CARGO --- */
  const addCargo = useCallback(
    (fields) => {
      const record = {
        id: nextId(cargo, 'C'),
        status: 'PLANNED',
        priority: 'MEDIUM',
        created_at: new Date().toISOString(),
        ...fields,
      }
      setCargo((prev) => [...prev, record])
      logActivity('CARGO', `${record.id} ${record.item_name} logged`)
      pushToDatabase(`consignment ${record.id}`, () => cargoDb.insertCargo(record))
      return record
    },
    [cargo, logActivity, pushToDatabase]
  )

  const updateCargo = useCallback(
    (id, changes) => {
      setCargo((prev) => prev.map((c) => (c.id === id ? { ...c, ...changes } : c)))
      if (changes.status) {
        const item = cargo.find((c) => c.id === id)
        logActivity(
          'CARGO',
          `${id}${item ? ` ${item.item_name}` : ''} marked ${changes.status.replace('_', ' ')}`
        )
      }
      pushToDatabase(`consignment ${id}`, () => cargoDb.updateCargo(id, changes))
    },
    [cargo, logActivity, pushToDatabase]
  )

  /* --- INVENTORY ---
     Note what happens when a quantity drops below its minimum: we do NOT
     set a "low stock" flag. stockStatus() recalculates it on every render,
     so the badge and the dashboard warning appear on their own. */
  const addInventoryItem = useCallback(
    (fields) => {
      const record = {
        id: nextId(inventory, 'I'),
        quantity: 0,
        minimum_quantity: 0,
        condition: 'GOOD',
        updated_at: new Date().toISOString(),
        ...fields,
      }
      setInventory((prev) => [...prev, record])
      logActivity('INVENTORY', `${record.item_name} added at ${record.location}`)
      pushToDatabase(`${record.item_name}`, () => inventoryDb.insertInventoryItem(record))
      return record
    },
    [inventory, logActivity, pushToDatabase]
  )

  const updateInventoryItem = useCallback(
    (id, changes) => {
      /* Same one-timestamp rule as updatePerson: made once here, used by both
         the screen and the database. */
      const stampedChanges = { ...changes, updated_at: new Date().toISOString() }

      setInventory((prev) => {
        return prev.map((item) => {
          if (item.id !== id) return item

          const updated = { ...item, ...stampedChanges }

          /* If this change is what pushed the item below its minimum,
             record that in the activity log. Comparing before/after means
             we log the crossing once, not on every later edit. */
          if (!isLowStock(item) && isLowStock(updated)) {
            logActivity(
              'INVENTORY',
              `${updated.item_name} fell below minimum at ${updated.location}`
            )
          }
          return updated
        })
      })

      /* Note what is sent: the two numbers, never a "low stock" flag. There is
         no such column and there never will be — the database stores quantity
         and minimum_quantity, and both the badge on screen and the SQL view in
         supabase/schema.sql work the answer out from them. */
      pushToDatabase(`stock for ${id}`, () => inventoryDb.updateInventoryItem(id, stampedChanges))
    },
    [logActivity, pushToDatabase]
  )

  /** Convenience used by the +/- buttons on the Inventory page. */
  const adjustInventoryQuantity = useCallback(
    (id, delta) => {
      const item = inventory.find((i) => i.id === id)
      if (!item) return
      const next = Math.max(0, (Number(item.quantity) || 0) + delta)
      updateInventoryItem(id, { quantity: next })
    },
    [inventory, updateInventoryItem]
  )

  /* --- EMERGENCIES ---
     Reporting an emergency also flips the affected person's status,
     demonstrating seamless cross-module reactivity. */
  const reportEmergency = useCallback(
    (fields) => {
      const linkedPerson = fields.personnel_id ? personnel.find((p) => p.id === fields.personnel_id) : null
      const record = {
        id: nextId(emergencies, 'INC'),
        status: 'ACTIVE',
        severity: 'HIGH',
        type: 'OTHER',
        reported_at: new Date().toISOString(),
        ...(linkedPerson && linkedPerson.latitude != null && linkedPerson.longitude != null
          ? { latitude: Number(linkedPerson.latitude), longitude: Number(linkedPerson.longitude) }
          : {}),
        ...fields,
      }
      setEmergencies((prev) => [record, ...prev])
      pushToDatabase(`incident ${record.id}`, () => emergencyDb.insertEmergency(record))

      /* Connected effect 1: the affected person goes to EMERGENCY status,
         which changes their badge on Personnel AND their marker on the map. */
      if (record.personnel_id) {
        const stamp = new Date().toISOString()
        setPersonnel((prev) =>
          prev.map((p) =>
            p.id === record.personnel_id ? { ...p, status: 'EMERGENCY', last_updated: stamp } : p
          )
        )
        /* AND THE SAME CHANGE IS SAVED. This is a SECOND write, to a second
           table, from one button press — and it has to be here, because this
           status change does not go through updatePerson(). Miss it and the
           demo's centrepiece half-persists: refresh the page and the incident
           is still there but the person it happened to looks fine. */
        pushToDatabase('the affected person’s status', () =>
          personnelDb.updatePerson(record.personnel_id, {
            status: 'EMERGENCY',
            last_updated: stamp,
          })
        )
      }

      /* statusLabel() rather than the raw key, so the line reads "Weather
         Hazard" and not "WEATHER". Every type used to be a single word, so
         printing the key looked fine until the Weather module started
         filing incidents of type WEATHER — whose label is two words. */
      logActivity(
        'EMERGENCY',
        `${record.id} declared — ${statusLabel(EMERGENCY_TYPE, record.type)}, ${record.location} (${statusLabel(SEVERITY, record.severity)})`
      )
      return record
    },
    [emergencies, personnel, logActivity, pushToDatabase]
  )

  const updateEmergency = useCallback(
    (id, changes) => {
      const incident = emergencies.find((e) => e.id === id)

      /* THE TIMESTAMPS ARE WORKED OUT HERE, NOT INSIDE setEmergencies.
         They used to be computed inside the mapper, which was fine while the
         screen was the only place they went. Now they also have to be sent to
         the database, and a value computed inside a setState updater is not
         available out here to send. So the whole patch is built first, then
         handed to both. */
      const patch = { ...changes }

      if (changes.status === 'RESOLVED' && !incident?.resolved_at) {
        patch.resolved_at = new Date().toISOString()
      }

      /* The same idea for the moment a team picked the incident up.
         "How long until somebody acknowledged it" is the critical readiness
         metric for emergency response, and it cannot be
         worked out afterwards from the record — it only exists if it
         is stamped here, at the moment it happens.

         The `!incident.acknowledged_at` guard means a second edit does
         not move the stamp. The first acknowledgement is the one that
         counts. */
      if (changes.status === 'RESPONDING' && !incident?.acknowledged_at) {
        patch.acknowledged_at = new Date().toISOString()
      }

      setEmergencies((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
      pushToDatabase(`incident ${id}`, () => emergencyDb.updateEmergency(id, patch))

      /* Connected effect 2: resolving an incident releases the person
         back to ACTIVE, so the map marker turns from red to green. */
      if (changes.status === 'RESOLVED' && incident?.personnel_id) {
        const person = personnel.find((p) => p.id === incident.personnel_id)
        if (person?.status === 'EMERGENCY') {
          const stamp = new Date().toISOString()
          setPersonnel((prev) =>
            prev.map((p) =>
              p.id === incident.personnel_id ? { ...p, status: 'ACTIVE', last_updated: stamp } : p
            )
          )
          /* Saved for the same reason the flip to EMERGENCY is saved: it is a
             change to a person made from the Emergency page, so nothing else
             is going to write it. */
          pushToDatabase('the released person’s status', () =>
            personnelDb.updatePerson(incident.personnel_id, {
              status: 'ACTIVE',
              last_updated: stamp,
            })
          )
        }
      }

      if (changes.status) {
        /* statusLabel() for the same reason reportEmergency() uses it: the
           raw key would print "RESPONDING" in a log whose every other line
           is written in plain words. */
        logActivity(
          'EMERGENCY',
          `${id} status changed to ${statusLabel(EMERGENCY_STATUS, changes.status)}`
        )
      }
    },
    [emergencies, personnel, logActivity, pushToDatabase]
  )

  /* ============================================================
     6. DERIVED STATISTICS — calculated, never stored.
        This object is what the Dashboard cards read.
     ============================================================ */
  const stats = useMemo(() => {
    const lowStockItems = inventory.filter(isLowStock)
    const outOfStockItems = inventory.filter((i) => stockStatus(i) === 'OUT_OF_STOCK')
    const activeEmergencies = emergencies.filter((e) => e.status === 'ACTIVE')
    const respondingEmergencies = emergencies.filter((e) => e.status === 'RESPONDING')
    const openEmergencies = emergencies.filter((e) => e.status !== 'RESOLVED')

    return {
      /* Expeditions */
      expeditionsTotal: expeditions.length,
      expeditionsActive: expeditions.filter((e) => e.status === 'ACTIVE').length,
      expeditionsPlanning: expeditions.filter((e) => e.status === 'PLANNING').length,

      /* Personnel — "deployed" means everyone not off duty. */
      personnelTotal: personnel.length,
      personnelDeployed: personnel.filter((p) => p.status !== 'OFF_DUTY').length,
      personnelInTransit: personnel.filter((p) => p.status === 'IN_TRANSIT').length,
      personnelEmergency: personnel.filter((p) => p.status === 'EMERGENCY').length,

      /* Cargo */
      cargoTotal: cargo.length,
      cargoInTransit: cargo.filter((c) => c.status === 'IN_TRANSIT').length,
      cargoDelayed: cargo.filter((c) => c.status === 'DELAYED').length,
      cargoArrived: cargo.filter((c) => c.status === 'ARRIVED').length,
      cargoCritical: cargo.filter((c) => c.priority === 'CRITICAL' && c.status !== 'ARRIVED')
        .length,

      /* Inventory */
      inventoryTotal: inventory.length,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      lowStockItems,
      inventoryLocations: new Set(inventory.map((i) => i.location)).size,

      /* Emergencies */
      emergenciesActive: activeEmergencies.length,
      emergenciesResponding: respondingEmergencies.length,
      emergenciesOpen: openEmergencies.length,
      activeEmergencies,
      openEmergencies,

      /* The single "Critical Alerts" number on the dashboard:
         open incidents + items that have run out entirely. */
      criticalAlerts: openEmergencies.length + outOfStockItems.length,
    }
  }, [expeditions, personnel, cargo, inventory, emergencies])

  /* ---------- 7. HAND EVERYTHING TO THE APP ---------- */
  const value = useMemo(
    () => ({
      /* raw data */
      locations,
      expeditions,
      personnel,
      cargo,
      inventory,
      emergencies,
      activityLog,

      /* status of the data itself */
      loading,
      error,
      source,
      setError,
      setSource,

      /* the database, and whether it is behaving */
      dbNotice,
      dismissDbNotice,
      reload,
      databaseConfigured: isSupabaseConfigured(),
      databaseMessage: supabaseConfig.message,

      /* calculated numbers */
      stats,

      /* lookups */
      getExpedition,
      getLocation,
      getPerson,
      personnelForExpedition,
      cargoForExpedition,

      /* actions */
      addLocation,
      addExpedition,
      updateExpedition,
      deleteExpedition,
      addPerson,
      updatePerson,
      recordPersonnelLocation,
      addCargo,
      updateCargo,
      addInventoryItem,
      updateInventoryItem,
      adjustInventoryQuantity,
      reportEmergency,
      updateEmergency,
      logActivity,
    }),
    [
      locations,
      expeditions,
      personnel,
      cargo,
      inventory,
      emergencies,
      activityLog,
      loading,
      error,
      source,
      dbNotice,
      dismissDbNotice,
      reload,
      stats,
      getExpedition,
      getLocation,
      getPerson,
      personnelForExpedition,
      cargoForExpedition,
      addLocation,
      addExpedition,
      updateExpedition,
      deleteExpedition,
      addPerson,
      updatePerson,
      recordPersonnelLocation,
      addCargo,
      updateCargo,
      addInventoryItem,
      updateInventoryItem,
      adjustInventoryQuantity,
      reportEmergency,
      updateEmergency,
      logActivity,
    ]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

/**
 * THE HOOK EVERY PAGE USES.
 *
 * In any component, write:
 *     const { expeditions, stats } = useData()
 *
 * and you have the shared data. That is the whole API.
 */
export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData() must be used inside <DataProvider>. Check src/main.jsx.')
  }
  return context
}
