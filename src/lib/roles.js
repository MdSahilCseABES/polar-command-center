/**
 * WHO IS SIGNED IN, AND WHAT THEY ARE ALLOWED TO CHANGE
 * =====================================================
 * The four roles from the problem statement, defined ONCE — exactly the way
 * every status word in the app is defined once in src/lib/statuses.js.
 *
 * ------------------------------------------------------------------
 * OPERATIONAL ROLE SPECIFICATION:
 *
 *   This is a DEMO ROLE SELECTOR for showcasing multi-role authorization.
 *   to check, no user table, no token and nothing is verified. Anyone who
 *   opens the app can pick any role.
 *
 *   That is deliberate. A password box that accepts anything you type is
 *   WORSE than no password box at all, because it looks like security that
 *   is not there. We would rather show the part that is real.
 *
 *   The part that IS real is the part that matters to the design: the
 *   console knows who is using it, and it shows different controls to
 *   different people. Sign in as the Field Scientist and the buttons that
 *   create and edit records are gone — not decoration, actually not
 *   rendered. The dropdowns that also DISPLAY a value stay on screen but
 *   are disabled, because a read-only session still has to be able to read.
 *
 *   A real deployment would put NCPOR's own sign-in (or Supabase Auth) in
 *   front of this screen, and would enforce these same rules ON THE SERVER
 *   as well. Hiding a button in a browser prevents a mistake; it does not
 *   stop an attacker. Both halves are needed, and we have built the half
 *   that a prototype can honestly build.
 * ------------------------------------------------------------------
 *
 * EACH ROLE HAS:
 *   label       what the sidebar and the badge show
 *   tone        which badge colour it uses (see TONE_COLOUR in statuses.js)
 *   icon        a Lucide icon component, same idea as src/lib/navigation.js
 *   remit       one line explaining the job, shown on the sign-in screen
 *   operator    a FICTIONAL default name, pre-filled into the sign-in box
 *   canManage   may edit expeditions, the roster, cargo and stock records
 *   canRespond  may acknowledge and resolve incidents
 *
 * WHY ONLY TWO PERMISSION FLAGS?
 *   Because two is all it takes to tell the four roles apart, and every
 *   flag here has a visible effect somewhere in the UI. A permission that
 *   nothing checks is dead code pretending to be a feature.
 *
 * THE ONE THING THAT IS NOT A PERMISSION:
 *   EVERY role can REPORT an emergency — including the read-only one. The
 *   field scientist standing next to the casualty is exactly the person who
 *   raises the alarm, so blocking that would be unrealistic here and
 *   dangerous in a real system. "Read-only" in this app means *cannot
 *   change the logistics record*. It never means *cannot ask for help*.
 */

import { Compass, Microscope, ShieldCheck, Truck } from 'lucide-react'

export const ROLES = {
  ADMIN: {
    label: 'System Administrator',
    tone: 'violet',
    icon: ShieldCheck,
    remit: 'Full access to every module. Used for setup and demonstration.',
    operator: 'Nikhil Raut',
    canManage: true,
    canRespond: true,
  },

  COMMANDER: {
    label: 'Expedition Commander',
    tone: 'info',
    icon: Compass,
    remit: 'Runs the expedition. Moves people, and closes out incidents.',
    operator: 'Cdr. Anjali Kulkarni',
    canManage: true,
    canRespond: true,
  },

  LOGISTICS: {
    label: 'Logistics Officer',
    tone: 'blue',
    icon: Truck,
    /* The difference between this role and the Commander is the one worth
       demonstrating: a stores officer keeps the supply chain correct, but
       deciding that a medical emergency is over is not their call. */
    remit: 'Keeps cargo and station stock correct. Cannot close incidents.',
    operator: 'Devendra Joshi',
    canManage: true,
    canRespond: false,
  },

  SCIENTIST: {
    label: 'Field Scientist',
    tone: 'ok',
    icon: Microscope,
    remit: 'Reads the situation, and can raise an emergency. Changes nothing else.',
    operator: 'Dr. Farah Siddiqui',
    canManage: false,
    canRespond: false,
  },
}

/* The sign-in screen lists the roles in this order: most access first, so
   reading down the list is reading a shrinking set of powers. */
export const ROLE_KEYS = ['ADMIN', 'COMMANDER', 'LOGISTICS', 'SCIENTIST']

/* Pre-selected on the sign-in screen. Commander rather than Admin, because
   Commander is the role the demo story in the problem statement follows. */
export const DEFAULT_ROLE = 'COMMANDER'

/**
 * One role by key, or null if the key is not one of ours.
 *
 * Returning null rather than a guessed default is on purpose: it is what
 * lets AuthContext throw away a saved session whose role we no longer
 * recognise, instead of silently signing somebody in as something else.
 */
export function getRole(key) {
  return ROLES[key] || null
}

/** The display label for a role key. Safe to call with anything. */
export function roleLabel(key) {
  return ROLES[key]?.label || 'Unknown role'
}

/**
 * The labels of every role allowed to acknowledge and resolve incidents.
 *
 * The Emergency page prints this in the sentence it shows to a role that
 * cannot respond. DERIVING the list rather than typing it out means that
 * sentence can never end up naming the wrong roles after somebody edits the
 * table above — the same reason the dashboard counts its own alerts instead
 * of storing them.
 */
export function rolesThatCanRespond() {
  return ROLE_KEYS.filter((key) => ROLES[key].canRespond).map((key) => ROLES[key].label)
}

/**
 * THE INPUT CHECK FOR THE OPERATOR NAME.
 *
 * Returns a cleaned-up name, or an error message explaining what is wrong.
 * Never both. The sign-in screen shows whichever it gets.
 *
 * The rules are deliberately gentle — this is a name field on a demo login,
 * not a security boundary — but it does have to reject the two cases that
 * would break the sidebar: nothing at all, and something so long it pushes
 * the layout apart. The character rule keeps stray HTML or script text out
 * of a value that we then print on screen.
 */
export function checkOperatorName(raw) {
  const name = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!name) return { error: 'Enter the name of the operator signing in.' }
  if (name.length < 2) return { error: 'That name is too short to identify anyone.' }
  if (name.length > 40) return { error: 'Please keep the name under 40 characters.' }
  if (!/^[A-Za-z.'\- ]+$/.test(name)) {
    return { error: 'Letters, spaces, full stops, apostrophes and hyphens only.' }
  }
  return { name }
}
