/**
 * WEATHER SERVICE UTILITIES
 * =========================
 * Standalone weather decoding and condition evaluation for polar operations.
 */

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
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
}

const LOW_VISIBILITY_CODES = new Set([45, 48, 71, 73, 75, 77, 85, 86])

export const OPS_LIMITS = {
  GROUNDED: { gusts: 74, windChill: -45 },
  HAZARDOUS: { gusts: 56, windChill: -35 },
  MARGINAL: { gusts: 39, windChill: -25 },
}

export function describeWeatherCode(code) {
  return WMO_CODES[Number(code)] || `Code ${code}`
}

export function assessConditions({ windChill, windGusts, code } = {}) {
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

  if (blind) return { key: 'MARGINAL', reason: describeWeatherCode(Number(code)) }

  if (!Number.isFinite(chill) && !Number.isFinite(gust)) {
    return { key: 'UNKNOWN', reason: 'No reading' }
  }
  return { key: 'CLEAR', reason: 'Within limits' }
}

export async function fetchWeather(locations = []) {
  return { source: 'FALLBACK', readings: {}, timestamp: new Date().toISOString() }
}
