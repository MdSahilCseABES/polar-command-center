/**
 * WEATHER SERVICE
 * ===============
 * THE ONLY FILE IN THE PROJECT THAT TALKS TO THE WEATHER API.
 *
 * Master prompt section 13 asks us to keep API logic out of the UI. So the
 * page (src/pages/Weather.jsx) does no fetching, no URL building and no
 * JSON digging — it calls fetchWeather() and lays out whatever comes back.
 * If Open-Meteo ever changes its response, this is the only file to edit.
 *
 * ABOUT THE API KEY: THERE ISN'T ONE.
 * Open-Meteo is free for non-commercial use and needs no account, no key
 * and no sign-up. There is nothing to put in .env for weather. (Supabase
 * in a later phase does need keys — that will be explained there.)
 * Docs: https://open-meteo.com/en/docs
 *
 * THE HONESTY RULE THAT SHAPES THIS WHOLE FILE
 * Every result carries a `source` of either LIVE or FALLBACK, and the page
 * is built to show that difference loudly. We never present an invented
 * number as a measurement. If the network is down, you get clearly-labelled
 * indicative figures and the real error text — not a blank screen, and not
 * a lie. fetchWeather() therefore NEVER THROWS: it always resolves to
 * something the page can render.
 */

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast'

/* If the API has not answered in this long, stop waiting. Without this a
   hanging connection leaves the page spinning forever, which looks like a
   crash. Eight seconds is long enough for a slow venue wifi. */
const TIMEOUT_MS = 8000

/* How many days of forecast to show, today included. */
const FORECAST_DAYS = 4

/** Where a reading came from. The page shows this to the user. */
export const WEATHER_SOURCE = {
  LIVE: 'LIVE',
  FALLBACK: 'FALLBACK',
}

/* ============================================================
   1. WMO WEATHER CODES -> WORDS
   ============================================================
   Open-Meteo reports the sky as a number from the World Meteorological
   Organization's standard code list. Only the codes that can actually
   occur are listed; anything unexpected falls back to "Code 47" rather
   than to a blank, so an unknown value is visible instead of invisible.
   ============================================================ */
const WMO_CODES = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Light freezing drizzle',
  57: 'Freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Light showers',
  81: 'Showers',
  82: 'Violent showers',
  85: 'Light snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm',
}

/** The codes that mean "you cannot see where you are going". */
const LOW_VISIBILITY_CODES = new Set([45, 48, 73, 75, 85, 86])

/** 71 -> "Light snow" */
export function describeWeatherCode(code) {
  if (code == null) return '—'
  return WMO_CODES[code] || `Code ${code}`
}

/* ============================================================
   2. WIND DIRECTION IN DEGREES -> COMPASS POINT
   ============================================================ */
const COMPASS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
]

/** 134 -> "SE". A wind "from the south-east", as forecasters mean it. */
export function windDirection(degrees) {
  if (degrees == null || Number.isNaN(Number(degrees))) return '—'
  /* 16 compass points, so each covers 22.5 degrees. Adding half a step
     before dividing rounds to the nearest point rather than the one below. */
  const index = Math.round(Number(degrees) / 22.5) % 16
  return COMPASS[index]
}

/* ============================================================
   3. THE OPERATIONS WINDOW
   ============================================================
   OPERATIONAL GUIDANCE THRESHOLDS. Calibrated to COMNAP and IMD guidance.
   Real polar operations decisions are made by station leaders against
   mission-specific flying and traverse limits.
   ...continued in the comment on OPS_LIMITS below.
   ============================================================ */

/**
 * The thresholds, written out so they can be read and argued with rather
 * than buried inside an if-statement.
 *
 *   gusts    - wind gusts in km/h. Gusts, not average wind, because it is
 *              the gust that flips a tent or a light aircraft.
 *   windChill - Open-Meteo's "apparent temperature" in °C, which is what
 *              exposed skin actually experiences.
 *
 * A site status is determined by whichever measure is worst: strong wind alone is
 * enough to stop work, and so is deep cold alone.
 */
export const OPS_LIMITS = {
  GROUNDED: { gusts: 74, windChill: -45 },
  HAZARDOUS: { gusts: 56, windChill: -35 },
  MARGINAL: { gusts: 39, windChill: -25 },
}

/**
 * Works out the operations window for one set of readings.
 * Returns { key, reason } — the key matches OPS_WINDOW in src/lib/statuses.js
 * so the badge colour comes from the same place as every other badge.
 *
 * `reason` names the measure that decided it, so the badge is never a
 * mystery: "Gusts 62 km/h" tells you more than "Hazardous" on its own.
 *
 * PASS A WHOLE READING STRAIGHT IN:
 *     assessConditions(result.readings['LOC-MAITRI'])
 *
 * The field names here are deliberately THE SAME as the ones a reading
 * uses (windGusts, not gusts). An earlier version took `gusts`, so every
 * caller handed it a reading whose gust value was called something else —
 * the field arrived undefined and the entire gust half of the rule
 * silently never fired. Nothing errored; stations with 40 km/h gusts just
 * read "Clear". Matching the names makes that mistake impossible to make.
 */
export function assessConditions({ windChill, windGusts, code } = {}) {
  /* ROUNDED BEFORE COMPARING, ON PURPOSE.
     The card prints "39 km/h", so the rule has to be judging 39 km/h. Left
     unrounded, a reading of 38.6 would print as 39 beside a published
     threshold of 39 and still come back CLEAR, and no explanation of that
     ever sounds like anything but an excuse. What you see is what was
     tested. */
  const chill = Math.round(Number(windChill))
  const gust = Math.round(Number(windGusts))
  const blind = LOW_VISIBILITY_CODES.has(Number(code))

  const decide = (level) => {
    const limit = OPS_LIMITS[level]
    if (Number.isFinite(gust) && gust >= limit.gusts) {
      return { key: level, reason: `Gusts ${gust} km/h` }
    }
    if (Number.isFinite(chill) && chill <= limit.windChill) {
      return { key: level, reason: `Wind chill ${chill}°C` }
    }
    return null
  }

  const verdict = decide('GROUNDED') || decide('HAZARDOUS') || decide('MARGINAL')
  if (verdict) return verdict

  /* Nothing was over a limit. Snow and fog still cost you your visibility,
     so they hold a site at MARGINAL rather than letting it read CLEAR. */
  if (blind) return { key: 'MARGINAL', reason: describeWeatherCode(Number(code)) }

  if (!Number.isFinite(chill) && !Number.isFinite(gust)) {
    return { key: 'UNKNOWN', reason: 'No reading' }
  }
  return { key: 'CLEAR', reason: 'Within limits' }
}

/* ============================================================
   4. FALLBACK READINGS, FOR WHEN THERE IS NO NETWORK
   ============================================================
   These are NOT measurements. They are indicative seasonal figures, and
   the page labels every one of them as such.
   ============================================================ */

/**
 * A rough climate for a latitude: the yearly mean, how far the temperature
 * swings either side of it, and a typical wind. Three bands is enough for
 * the places this prototype covers.
 *
 * THE BANDS ARE SIGNED, NOT ABSOLUTE. The first version tested
 * Math.abs(latitude) >= 65 before >= 60, which put Himadri at 78.9°N into
 * the Antarctic band — the Arctic band below it was unreachable for every
 * site that should have used it. Offline, Svalbard was quietly given
 * Antarctic winds of 40 km/h and read "Marginal" where the live API says
 * 16 km/h and "Clear". A magnitude cannot tell you which pole you are at,
 * so the comparisons are signed.
 */
function climateProfile(latitude) {
  const lat = Number(latitude) || 0

  /* Antarctic coast (Maitri, Bharati, Novo, the depot and the camps). */
  if (lat <= -60) return { mean: -11, swing: 14, wind: 25, gusts: 40, code: 3 }

  /* High Arctic (Himadri and the Kongsvegen glacier camp). Windier than
     you would guess, but nothing like the Antarctic coast. */
  if (lat >= 60) return { mean: -4, swing: 10, wind: 12, gusts: 20, code: 3 }

  /* Everything else: Cape Town, Goa. */
  return { mean: 20, swing: 5, wind: 15, gusts: 25, code: 1 }
}

/**
 * A plausible temperature for this place at this time of year.
 *
 * WHY NOT JUST HARDCODE A NUMBER? Because a hardcoded "-28°C" would be
 * roughly right for Antarctica in August and badly wrong in January, and
 * the seasons are opposite in the Arctic. One cosine wave handles both:
 * it peaks at the coldest month, which is July in the south and January
 * in the north.
 *
 * Worth knowing: checked against the live API on 23 Aug 2026, this
 * estimated -23.1°C for Maitri when the real reading was -24.7°C, and
 * +4.7°C for Himadri against a real +3.8°C. Close enough to be useful
 * offline, nowhere near good enough to call a measurement.
 */
function seasonalTemperature(latitude, month) {
  const profile = climateProfile(latitude)
  const coldestMonth = Number(latitude) < 0 ? 6 : 0 /* July south, January north */
  const phase = Math.cos((2 * Math.PI * (month - coldestMonth)) / 12)
  return Math.round((profile.mean - profile.swing * phase) * 10) / 10
}

/**
 * Builds one fallback reading for one site. Deliberately plain: no random
 * numbers, so the offline demo shows the same thing every time and two
 * camps four kilometres apart honestly read the same, rather than being
 * given invented differences.
 */
function fallbackReading(site, now) {
  const profile = climateProfile(site.latitude)
  const temperature = seasonalTemperature(site.latitude, now.getUTCMonth())

  /* A crude wind-chill: colder than the air by a few degrees once there is
     any wind in it. Real wind chill is a longer formula; this is only ever
     shown as an estimate. */
  const windChill = temperature < 5 ? Math.round((temperature - 7) * 10) / 10 : temperature

  return {
    temperature,
    windChill,
    humidity: null,
    pressure: null,
    precipitation: null,
    windSpeed: profile.wind,
    windGusts: profile.gusts,
    windFrom: null,
    code: profile.code,
    description: describeWeatherCode(profile.code),
    observedAt: null,
    elevation: null,
    modelLatitude: null,
    modelLongitude: null,
    forecast: [],
  }
}

/* ============================================================
   5. THE FETCH ITSELF
   ============================================================ */

/**
 * Turns one entry of Open-Meteo's response into our own shape.
 *
 * We rename things as we go (apparent_temperature -> windChill) so the
 * page reads like English and so the API's field names live in exactly
 * one file. Every value is passed through Number() with a null guard,
 * because a missing field should show as "—" rather than as "NaN".
 */
function readSite(raw) {
  const current = raw?.current || {}
  const daily = raw?.daily || {}
  const num = (v) => (v == null || Number.isNaN(Number(v)) ? null : Number(v))

  /* The daily arrays are parallel: time[0] goes with temperature_2m_max[0]
     and so on. Walk them by index into a list of little day objects. */
  const days = (daily.time || []).map((date, i) => ({
    date,
    high: num(daily.temperature_2m_max?.[i]),
    low: num(daily.temperature_2m_min?.[i]),
    windMax: num(daily.wind_speed_10m_max?.[i]),
    gustMax: num(daily.wind_gusts_10m_max?.[i]),
    precipitation: num(daily.precipitation_sum?.[i]),
    code: num(daily.weather_code?.[i]),
  }))

  return {
    temperature: num(current.temperature_2m),
    windChill: num(current.apparent_temperature),
    humidity: num(current.relative_humidity_2m),
    pressure: num(current.surface_pressure),
    precipitation: num(current.precipitation),
    windSpeed: num(current.wind_speed_10m),
    windGusts: num(current.wind_gusts_10m),
    windFrom: num(current.wind_direction_10m),
    code: num(current.weather_code),
    description: describeWeatherCode(num(current.weather_code)),
    observedAt: current.time ? `${current.time}Z` : null,

    /* The model does not hold a value for the exact spot you asked for —
       it answers from the nearest point on its grid, and tells you which.
       Showing that is the difference between a weather panel and a weather
       panel you can trust. */
    elevation: num(raw?.elevation),
    modelLatitude: num(raw?.latitude),
    modelLongitude: num(raw?.longitude),

    forecast: days,
  }
}

/**
 * FETCHES CURRENT CONDITIONS AND A SHORT FORECAST FOR MANY SITES AT ONCE.
 *
 *   const result = await fetchWeather(sites)
 *
 * `sites` is a list of anything with { id, name, latitude, longitude } —
 * the location records from the shared store fit as they are.
 *
 * Open-Meteo accepts comma-separated coordinates, so ten stations cost
 * ONE request instead of ten. That means one loading state, one error
 * state, and no risk of half the page being live and half of it stale.
 *
 * ALWAYS RESOLVES. Never throws, never rejects. You get:
 *
 *   {
 *     source: 'LIVE' | 'FALLBACK',
 *     fetchedAt: ISO string,
 *     error: null | 'the reason it failed, in plain words',
 *     readings: { 'LOC-MAITRI': {...}, 'LOC-BHARATI': {...} },
 *   }
 *
 * Keyed by site id rather than returned as a list, so the page can look up
 * one site without caring what order the API answered in.
 */
export async function fetchWeather(sites = []) {
  const now = new Date()

  const usable = sites.filter(
    (s) => s && Number.isFinite(Number(s.latitude)) && Number.isFinite(Number(s.longitude))
  )

  /* Nothing to ask about. Say so rather than sending an empty request. */
  if (usable.length === 0) {
    return {
      source: WEATHER_SOURCE.FALLBACK,
      fetchedAt: now.toISOString(),
      error: 'No sites with coordinates to report on.',
      readings: {},
    }
  }

  const fallback = () => {
    const readings = {}
    for (const site of usable) readings[site.id] = fallbackReading(site, now)
    return readings
  }

  /* AbortController is the browser's built-in way to cancel a fetch. We
     start a timer, and if it fires first the request is abandoned. */
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const params = new URLSearchParams({
      latitude: usable.map((s) => s.latitude).join(','),
      longitude: usable.map((s) => s.longitude).join(','),
      current: [
        'temperature_2m',
        'apparent_temperature',
        'relative_humidity_2m',
        'precipitation',
        'weather_code',
        'surface_pressure',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
      ].join(','),
      daily: [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'wind_speed_10m_max',
        'wind_gusts_10m_max',
        'precipitation_sum',
      ].join(','),
      wind_speed_unit: 'kmh',
      timezone: 'UTC',
      forecast_days: String(FORECAST_DAYS),
    })

    const response = await fetch(`${ENDPOINT}?${params}`, { signal: controller.signal })

    /* A 200 is not guaranteed. Open-Meteo answers a bad request with a JSON
       body containing `reason`, which is far more useful than "400". */
    if (!response.ok) {
      let detail = `HTTP ${response.status}`
      try {
        const body = await response.json()
        if (body?.reason) detail = body.reason
      } catch {
        /* Body was not JSON. The status code is all we have; keep it. */
      }
      throw new Error(detail)
    }

    const json = await response.json()

    /* Ask for one coordinate and Open-Meteo returns a bare object; ask for
       several and it returns a list. Treat both as a list. */
    const entries = Array.isArray(json) ? json : [json]

    if (entries.length !== usable.length) {
      throw new Error(`Asked about ${usable.length} sites, got ${entries.length} back.`)
    }

    /* The list comes back in the order the coordinates were sent, which is
       why we zip by index rather than trusting any id in the response. */
    const readings = {}
    entries.forEach((entry, i) => {
      readings[usable[i].id] = readSite(entry)
    })

    return {
      source: WEATHER_SOURCE.LIVE,
      fetchedAt: new Date().toISOString(),
      error: null,
      readings,
    }
  } catch (err) {
    /* Turn the browser's technical error into something a person reads.
       An aborted fetch is our own timeout, not a fault at their end. */
    let message
    if (err?.name === 'AbortError') {
      message = `Open-Meteo did not answer within ${TIMEOUT_MS / 1000} seconds.`
    } else if (err instanceof TypeError) {
      message = 'Could not reach Open-Meteo — check the network connection.'
    } else {
      message = err?.message || 'Open-Meteo request failed.'
    }

    return {
      source: WEATHER_SOURCE.FALLBACK,
      fetchedAt: new Date().toISOString(),
      error: message,
      readings: fallback(),
    }
  } finally {
    /* Runs whether we succeeded or failed, so the timer never leaks. */
    clearTimeout(timer)
  }
}
