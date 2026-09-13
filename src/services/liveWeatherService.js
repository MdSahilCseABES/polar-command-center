/**
 * LIVE WEATHER & 15-DAY FORECAST TELEMETRY SERVICE
 * Talks directly to Open-Meteo Numerical Weather Prediction API.
 */

import { calculateOperationsWindow } from '../utils/operationsWindow'

const BASE_URL = 'https://api.open-meteo.com/v1/forecast'
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

export async function fetchLiveWeather(location) {
  const params = new URLSearchParams({
    latitude: Number(location.latitude).toFixed(4),
    longitude: Number(location.longitude).toFixed(4),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'weather_code',
      'cloud_cover',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
    ].join(','),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation_probability',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'is_day',
      'visibility',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'apparent_temperature_max',
      'apparent_temperature_min',
      'sunrise',
      'sunset',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'wind_direction_10m_dominant',
      'uv_index_max',
    ].join(','),
    forecast_days: '16', // Today (Day 0) + 15 day outlook
    timezone: location.timezone || 'auto',
  })

  const url = `${BASE_URL}?${params.toString()}`

  const response = await fetch(url)
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Open-Meteo API rate limit reached. Please wait a moment before retrying.')
    }
    throw new Error(`Weather service responded with status ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()

  if (!data.current || !data.daily) {
    throw new Error('Incomplete weather payload received from numerical forecast engine.')
  }

  // Parse Current Weather
  const current = data.current
  const currentDaily = data.daily
  const todaySunrise = currentDaily.sunrise?.[0] || null
  const todaySunset = currentDaily.sunset?.[0] || null

  // Visibility from hourly data closest to current hour
  const currentHourStr = current.time ? current.time.slice(0, 13) : null
  let currentVisibility = null
  if (data.hourly && data.hourly.time && data.hourly.visibility) {
    const idx = currentHourStr
      ? data.hourly.time.findIndex((t) => t.startsWith(currentHourStr))
      : 0
    if (idx >= 0 && data.hourly.visibility[idx] !== undefined) {
      currentVisibility = data.hourly.visibility[idx]
    }
  }

  const currentParsed = {
    temperature: Math.round((current.temperature_2m ?? 0) * 10) / 10,
    apparentTemperature:
      Math.round((current.apparent_temperature ?? current.temperature_2m ?? 0) * 10) / 10,
    weatherCode: current.weather_code ?? 0,
    relativeHumidity: Math.round(current.relative_humidity_2m ?? 0),
    windSpeed: Math.round((current.wind_speed_10m ?? 0) * 10) / 10,
    windDirection: Math.round(current.wind_direction_10m ?? 0),
    windGusts: Math.round((current.wind_gusts_10m ?? current.wind_speed_10m ?? 0) * 10) / 10,
    precipitation: Math.round((current.precipitation ?? 0) * 10) / 10,
    cloudCover: Math.round(current.cloud_cover ?? 0),
    visibility: currentVisibility,
    surfacePressure: Math.round((current.surface_pressure ?? 1013.25) * 10) / 10,
    sunrise: todaySunrise,
    sunset: todaySunset,
    isDay: Boolean(current.is_day ?? 1),
    timestamp: current.time || new Date().toISOString(),
  }

  // Parse Hourly Forecast (next 36 hours starting from current hour)
  const hourlyList = []
  if (data.hourly && data.hourly.time) {
    const currentTimeIso = current.time || new Date().toISOString()
    let startIdx = data.hourly.time.findIndex((t) => t >= currentTimeIso.slice(0, 13))
    if (startIdx < 0) startIdx = 0
    const endIdx = Math.min(data.hourly.time.length, startIdx + 36)

    for (let i = startIdx; i < endIdx; i++) {
      const timeRaw = data.hourly.time[i]
      const hourDate = new Date(timeRaw)
      const formattedTime = isNaN(hourDate.getTime())
        ? timeRaw.slice(11, 16)
        : hourDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

      hourlyList.push({
        time: timeRaw,
        formattedTime,
        temperature: Math.round((data.hourly.temperature_2m[i] ?? 0) * 10) / 10,
        apparentTemperature:
          Math.round((data.hourly.apparent_temperature?.[i] ?? data.hourly.temperature_2m[i] ?? 0) * 10) /
          10,
        weatherCode: data.hourly.weather_code?.[i] ?? 0,
        precipitationProbability: Math.round(data.hourly.precipitation_probability?.[i] ?? 0),
        precipitation: Math.round((data.hourly.precipitation?.[i] ?? 0) * 10) / 10,
        windSpeed: Math.round((data.hourly.wind_speed_10m?.[i] ?? 0) * 10) / 10,
        windDirection: Math.round(data.hourly.wind_direction_10m?.[i] ?? 0),
        isDay: Boolean(data.hourly.is_day?.[i] ?? 1),
      })
    }
  }

  // Parse Daily Forecast: 15 to 16 days
  const dailyList = []
  const dailyData = data.daily
  const numDays = Math.min(dailyData.time?.length || 0, 16)

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  for (let i = 0; i < numDays; i++) {
    const dateStr = dailyData.time[i]
    const d = new Date(dateStr + 'T12:00:00Z')
    let dayName = daysOfWeek[d.getUTCDay()]
    if (i === 0) dayName = 'Today'
    else if (i === 1) dayName = 'Tomorrow'

    const shortDate = `${months[d.getUTCMonth()]} ${d.getUTCDate()}`

    dailyList.push({
      date: dateStr,
      dayName,
      shortDate,
      weatherCode: dailyData.weather_code?.[i] ?? 0,
      temperatureMax: Math.round((dailyData.temperature_2m_max?.[i] ?? 0) * 10) / 10,
      temperatureMin: Math.round((dailyData.temperature_2m_min?.[i] ?? 0) * 10) / 10,
      apparentTemperatureMax:
        Math.round(
          (dailyData.apparent_temperature_max?.[i] ?? dailyData.temperature_2m_max?.[i] ?? 0) * 10
        ) / 10,
      apparentTemperatureMin:
        Math.round(
          (dailyData.apparent_temperature_min?.[i] ?? dailyData.temperature_2m_min?.[i] ?? 0) * 10
        ) / 10,
      precipitationProbabilityMax: Math.round(dailyData.precipitation_probability_max?.[i] ?? 0),
      precipitationSum: Math.round((dailyData.precipitation_sum?.[i] ?? 0) * 10) / 10,
      windSpeedMax: Math.round((dailyData.wind_speed_10m_max?.[i] ?? 0) * 10) / 10,
      windGustsMax:
        Math.round(
          (dailyData.wind_gusts_10m_max?.[i] ?? dailyData.wind_speed_10m_max?.[i] ?? 0) * 10
        ) / 10,
      windDirectionDominant: Math.round(dailyData.wind_direction_10m_dominant?.[i] ?? 0),
      sunrise: dailyData.sunrise?.[i] || '',
      sunset: dailyData.sunset?.[i] || '',
      uvIndexMax: dailyData.uv_index_max?.[i] ?? undefined,
    })
  }

  // Calculate Operational Safety Window
  const operationsWindow = calculateOperationsWindow(
    currentParsed.temperature,
    currentParsed.apparentTemperature,
    currentParsed.windSpeed,
    currentParsed.windGusts,
    currentParsed.visibility,
    currentParsed.weatherCode,
    currentParsed.precipitation
  )

  return {
    location,
    current: currentParsed,
    hourly: hourlyList,
    daily: dailyList,
    operationsWindow,
    lastUpdated:
      new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' UTC',
    isLive: true,
    model: 'Open-Meteo High-Resolution (ECMWF IFS / GFS / ICON)',
  }
}

export async function searchGlobalLocations(query) {
  if (!query || query.trim().length < 2) return []

  const url = `${GEOCODING_URL}?name=${encodeURIComponent(query.trim())}&count=6&language=en&format=json`
  const response = await fetch(url)
  if (!response.ok) return []

  const data = await response.json()
  if (!data.results || !Array.isArray(data.results)) return []

  return data.results.map((res) => ({
    id: `geo-${res.id}-${res.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: res.name,
    region: [res.admin1, res.country].filter(Boolean).join(', ') || 'Global Observatory',
    type: 'global_city',
    latitude: res.latitude,
    longitude: res.longitude,
    elevation: res.elevation,
    country: res.country,
    timezone: res.timezone || 'auto',
  }))
}
