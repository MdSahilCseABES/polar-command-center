/**
 * THE SIGN-IN STORE  ("AuthContext")
 * ==================================
 * Remembers who is signed in and what they may change. That is all it does.
 *
 * It is a second Context sitting beside DataContext, deliberately kept
 * separate: DataContext is about the EXPEDITION (people, cargo, stock,
 * incidents), this one is about the PERSON LOOKING AT IT. Mixing the two
 * would mean every re-render of a cargo row also depended on the login.
 *
 * IT IS NOT SECURITY, AND IT DOES NOT PRETEND TO BE.
 *   No password is checked, because there is no password. Nothing is sent
 *   anywhere. Nothing is verified. The full, honest explanation lives at the
 *   top of src/lib/roles.js.
 *
 * WHAT PAGES DO WITH IT:
 *     const { canManage } = useAuth()
 *     {canManage && <button>New</button>}
 *
 *   That is the whole API a page needs. Same shape as useData().
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_ROLE, getRole } from '../lib/roles'
import { USERS, validateCredentials } from '../lib/credentials'

const AuthContext = createContext(null)

/* WHERE THE CHOICE IS REMEMBERED, AND WHY sessionStorage.
   sessionStorage lasts as long as the browser TAB is open and is wiped when
   it closes — so refreshing mid-demo does not throw you back to the sign-in
   screen, but nothing about the session outlives the visit.
   localStorage would remember it for months, which for a screen with no
   password would be a promise we cannot keep. */
const STORAGE_KEY = 'polar.demoSession'

/**
 * Reads a saved session back out of the tab.
 *
 * Everything here is wrapped in try/catch because sessionStorage genuinely
 * throws in some browsers (Safari private mode, and any browser with storage
 * disabled). An app that crashes on a privacy setting is a broken app, so a
 * failure to read simply means "nobody is signed in" and you see the sign-in
 * screen — which is exactly the right outcome.
 */
function readSavedSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const saved = JSON.parse(raw)

    /* Re-check the saved values instead of trusting them. A stored role that
       we no longer recognise (because this file changed between visits)
       would otherwise give somebody a session with no permissions at all,
       which looks like a bug rather than a signed-out user. */
    if (!getRole(saved?.role)) return null
    if (!saved?.name || typeof saved.name !== 'string') return null

    return { name: saved.name, role: saved.role, signedInAt: saved.signedInAt || null }
  } catch {
    return null
  }
}

function saveSession(session) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    /* Storage is unavailable. The session still works for as long as the
       page stays open — it just will not survive a refresh. Not worth
       interrupting anybody over, so we say nothing. */
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* Nothing was saved in the first place. */
  }
}

export function AuthProvider({ children }) {
  /* The signed-in operator: { name, role, signedInAt } — or null for nobody.
     The function form of useState means readSavedSession() runs once on
     mount rather than on every render. */
  const [user, setUser] = useState(readSavedSession)

  /* The three states every operation in this app has (master prompt
     section 15): busy, failed, and neither. */
  const [signingIn, setSigningIn] = useState(false)
  const [authError, setAuthError] = useState(null)

  /* Clearing the error when the user starts fixing the problem, rather than
     leaving a stale red line under a field they have already corrected. */
  const clearAuthError = useCallback(() => setAuthError(null), [])

  /**
   * SIGN IN. Validates, waits a moment, then sets the session.
   *
   * WHY THE SHORT DELAY: it makes the "Signing in…" state a real code path
   * that we have actually watched work, rather than a branch nobody has ever
   * rendered. DataContext does the same thing for the same reason. When a
   * genuine sign-in is wired up later (Supabase Auth, or NCPOR's own), the
   * loading state already exists and nothing about the screen is new.
   */
  const signIn = useCallback(({ userId, password, expectedRole }) => {
    setAuthError(null)

    if (!userId?.trim()) {
      setAuthError('Enter your User ID to continue.')
      return false
    }

    if (!password?.trim()) {
      setAuthError('Enter your password to continue.')
      return false
    }

    const matchedUser = validateCredentials(userId, password)
    if (!matchedUser) {
      setAuthError('Invalid User ID or password. Please check your credentials.')
      return false
    }

    if (expectedRole && matchedUser.role !== expectedRole) {
      const roleName = getRole(expectedRole)?.label || expectedRole
      setAuthError(`These credentials do not belong to the selected role (${roleName}).`)
      return false
    }

    setSigningIn(true)
    setTimeout(() => {
      const session = {
        name: matchedUser.name,
        role: matchedUser.role,
        signedInAt: new Date().toISOString(),
      }
      setUser(session)
      setSigningIn(false)
      saveSession(session)
    }, 400)

    return true
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    setAuthError(null)
    setSigningIn(false)
    clearSession()

    // Clear active view and data session, then notify listeners
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('polar.activeView')
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname)
        }
        window.dispatchEvent(new CustomEvent('polar:auth-signout'))
      }
    } catch {
      // Storage unavailable
    }
  }, [])

  /* A stray "signing in" flag left behind by a hot reload would show a
     spinner forever. Clearing it whenever a user exists costs one line. */
  useEffect(() => {
    if (user) setSigningIn(false)
  }, [user])

  const value = useMemo(() => {
    const role = user ? getRole(user.role) : null

    return {
      /* who is signed in */
      user,
      roleKey: user?.role ?? null,
      role,
      roleLabel: role?.label ?? null,

      /* status of the sign-in itself */
      signingIn,
      authError,
      clearAuthError,

      /* WHAT THEY MAY DO — read straight from src/lib/roles.js, never
         stored on the user. Same rule as the rest of the app: a permission
         is CALCULATED from the role, so it cannot drift out of step with
         the table that defines it.

         Both default to false when nobody is signed in. That way a page
         that forgets to check `user` still cannot show a write button. */
      canManage: role?.canManage ?? false,
      canRespond: role?.canRespond ?? false,

      /* actions */
      signIn,
      signOut,

      /* Which role the sign-in screen starts on. */
      defaultRole: DEFAULT_ROLE,
    }
  }, [user, signingIn, authError, clearAuthError, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * THE HOOK EVERY COMPONENT USES.
 *
 *     const { user, canManage } = useAuth()
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth() must be used inside <AuthProvider>. Check src/main.jsx.')
  }
  return context
}
