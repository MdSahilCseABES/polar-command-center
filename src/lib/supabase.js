/**
 * THE SUPABASE CLIENT — AND THE SWITCH THAT MAKES IT OPTIONAL
 * ==========================================================
 * This is the ONLY file that creates a database connection. Nothing else in
 * the project calls `createClient`.
 *
 * ------------------------------------------------------------------
 * THE ONE RULE THIS WHOLE PHASE IS BUILT AROUND:
 *
 *   THE APP MUST WORK WITH NO DATABASE AT ALL.
 *
 * With no keys set, `supabase` below is simply `null`, the app runs on the
 * built-in demo data exactly as it did before this file existed, and nothing
 * anywhere shows an error — because nothing is wrong. A database you have
 * not set up yet is not a failure, it is just an upgrade you have not taken.
 *
 * That is not a nicety. It is the difference between a demo that survives a
 * dead venue wifi and one that does not.
 * ------------------------------------------------------------------
 *
 * WHERE THE KEYS COME FROM AND WHERE THEY GO:
 *   They go in a file called `.env` in the project root — the same folder as
 *   package.json. Copy `.env.example` to `.env` and fill in two lines.
 *   `.env.example` has click-by-click instructions for finding both values
 *   in the Supabase dashboard.
 *
 *   `.env` is listed in .gitignore, so it is never committed. Nothing in
 *   this project ever contains a real key in its source code.
 *
 * WHY "VITE_" IS AT THE START OF BOTH NAMES:
 *   Vite refuses to hand a variable to browser code unless its name starts
 *   with VITE_. That is a safety feature: it means you cannot leak a server
 *   secret into a web page by accident. The prefix is required.
 *
 * IS IT SAFE TO PUT THIS KEY IN A BROWSER? YES — THAT ONE.
 *   The "anon public" key is designed to be public; every Supabase web app
 *   ships it to the browser. What actually protects the data is Row Level
 *   Security, the policies at the bottom of supabase/schema.sql.
 *
 *   And here is the honest part: current policies allow demonstration access,
 *   so the console can read and write the operational tables without complex auth.
 *   A restricted production deployment would replace them with per-user rules.
 *
 *   The "service_role" key is the opposite: a real secret that must never
 *   reach a browser. This app never reads it, and you should never put it
 *   in a VITE_ variable.
 */

import { createClient } from '@supabase/supabase-js'

/* import.meta.env is Vite's version of process.env. These are baked in when
   the app is built, so changing .env needs the dev server restarted. */
const rawUrl = import.meta.env.VITE_SUPABASE_URL
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/* Trim, because a value pasted into .env very often arrives with a trailing
   space or a stray quote, and " https://x.supabase.co" is not a URL. */
const url = String(rawUrl ?? '').trim().replace(/^["']|["']$/g, '')
const key = String(rawKey ?? '').trim().replace(/^["']|["']$/g, '')

/**
 * Why check the shape at all, instead of just handing it to createClient?
 *
 * Because the two most likely mistakes are a half-filled .env (`VITE_SUPABASE_URL=`
 * with nothing after it) and pasting the dashboard page address instead of
 * the API URL. Catching those here turns a confusing runtime crash into a
 * clear sentence, and leaves the app running on demo data meanwhile.
 */
function describeConfig() {
  if (!url && !key) {
    return {
      ok: false,
      reason: 'no-keys',
      message:
        'No Supabase keys found, so the app is running on built-in demo data. ' +
        'That is a supported way to run it — see .env.example if you want to connect a database.',
    }
  }
  if (!url || !key) {
    return {
      ok: false,
      reason: 'half-filled',
      message:
        `Your .env has ${url ? 'VITE_SUPABASE_URL' : 'VITE_SUPABASE_ANON_KEY'} but not the other one. ` +
        'Supabase needs both, so the app is staying on demo data.',
    }
  }
  if (!/^https:\/\/[^\s.]+\.supabase\.co\/?$/.test(url)) {
    return {
      ok: false,
      reason: 'bad-url',
      message:
        `VITE_SUPABASE_URL does not look like a Supabase API URL. It should be exactly ` +
        `"https://yourprojectid.supabase.co" with no path on the end. Staying on demo data.`,
    }
  }
  /* The anon key is a JWT, which always has two dots in it. A short value is
     almost always the project ID pasted by mistake. */
  if (key.length < 40 || key.split('.').length !== 3) {
    return {
      ok: false,
      reason: 'bad-key',
      message:
        'VITE_SUPABASE_ANON_KEY does not look like a Supabase anon key — it should be a long ' +
        'token with two dots in it. Staying on demo data.',
    }
  }
  return { ok: true, reason: 'configured', message: `Connected to ${url}` }
}

/** What we made of the .env file. The UI prints `message` when ok is false. */
export const supabaseConfig = describeConfig()

/**
 * THE CLIENT, or null.
 *
 * Every caller must cope with null. That is not defensive padding — null is
 * the NORMAL state of this project until somebody sets up a database.
 *
 * The try/catch is there because createClient throws on a malformed URL, and
 * a throw at module load time white-screens the entire app before React
 * starts. A prototype must not be one typo in a text file away from showing
 * a blank page on stage.
 */
let client = null
if (supabaseConfig.ok) {
  try {
    client = createClient(url, key, {
      auth: {
        /* We do not use Supabase Auth — the sign-in screen is a demo role
           selector (see src/lib/roles.js). Turning these off stops the
           library writing session tokens into localStorage for an account
           that does not exist. */
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  } catch (err) {
    client = null
    supabaseConfig.ok = false
    supabaseConfig.reason = 'client-failed'
    supabaseConfig.message = `Supabase client could not start: ${err?.message || err}. Staying on demo data.`
  }
}

export const supabase = client

/**
 * The one question the rest of the app asks.
 *
 *     if (!isSupabaseConfigured()) return   // nothing to do, demo mode
 *
 * A function rather than the bare `supabase` variable, because reading it as
 * a question makes the branches in DataContext say what they mean.
 */
export function isSupabaseConfigured() {
  return client !== null
}
