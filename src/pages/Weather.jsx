/**
 * WEATHER INTEGRATION — LIVE TELEMETRY & 15-DAY EXTENDED FORECAST
 * ==============================================================
 * Comprehensive polar meteorological command platform:
 *   1. 15-Day Extended Weather Outlook with diurnal range & precipitation probability.
 *   2. Real-time Live Weather Telemetry (air temp, wind chill, gusts, pressure, humidity, UV, solar times).
 *   3. Operations Safety Window evaluation (Flight, Overland Traverse, Exterior Science limits).
 *   4. Hourly Atmospheric Projection track (next 36-48 hours).
 *   5. Interactive 15-Day Temperature Trend & Thermal Envelopes SVG chart.
 *   6. Modal Day Inspector for deep-dive diurnal analysis.
 *   7. Multi-Station Network Overview with 4-day cards & ground team cross-links.
 *   8. Directly connects to the Emergency Incident Dispatch system via reportEmergency().
 */

import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  CloudSnow,
  Compass,
  Crosshair,
  Eye,
  FileWarning,
  Globe,
  MapPin,
  Radio,
  RefreshCw,
  Search,
  Ship,
  Siren,
  TrendingUp,
  Wind,
} from 'lucide-react'

import Badge from '../components/Badge'
import DataTable from '../components/DataTable'
import Panel from '../components/Panel'
import StateBlock from '../components/StateBlock'
import { useData } from '../store/DataContext'
import { formatCoords, timeAgo } from '../lib/format'
import { LOCATION_TYPE, OPS_WINDOW, statusLabel } from '../lib/statuses'
import {
  OPS_LIMITS,
  WEATHER_SOURCE,
  assessConditions,
  fetchWeather,
  windDirection,
} from '../services/weatherService'

import { DEFAULT_LOCATIONS } from '../data/weatherLocations'
import { fetchLiveWeather, searchGlobalLocations } from '../services/liveWeatherService'
import { CurrentWeatherCard } from '../components/weather/CurrentWeatherCard'
import { OperationsWindowCard } from '../components/weather/OperationsWindowCard'
import { HourlyForecast } from '../components/weather/HourlyForecast'
import { TemperatureTrendChart } from '../components/weather/TemperatureTrendChart'
import { FifteenDayForecast } from '../components/weather/FifteenDayForecast'
import { DayDetailModal } from '../components/weather/DayDetailModal'
import { WeatherSkeleton } from '../components/weather/WeatherSkeleton'
import { WeatherError } from '../components/weather/WeatherError'
import HistoricalWeatherChart from '../components/HistoricalWeatherChart'

/* Small formatters */
function degrees(value, places = 1) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${Number(value).toFixed(places)}°C`
}

function speed(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${Math.round(Number(value))} km/h`
}

function overMarginalChill(value) {
  return value != null && Math.round(Number(value)) <= OPS_LIMITS.MARGINAL.windChill
}

function gridOffsetKm(site, reading) {
  if (reading?.modelLatitude == null || reading?.modelLongitude == null) return null
  const dLat = (reading.modelLatitude - site.latitude) * 111
  const dLng =
    (reading.modelLongitude - site.longitude) * 111 * Math.cos((site.latitude * Math.PI) / 180)
  return Math.round(Math.sqrt(dLat * dLat + dLng * dLng))
}

function Metric({ label, value, tone }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className={`mono text-[13px] mt-0.5 ${tone || 'text-hi'}`}>{value}</div>
    </div>
  )
}

function StationCard({
  site,
  reading,
  ops,
  live,
  personnel,
  expeditions,
  cargo,
  filedIncident,
  onLogHazard,
  onInspect15Day,
}) {
  const onTheGround = personnel.filter((p) => p.location_id === site.id)
  const expeditionsHere = expeditions.filter(
    (e) => e.location_id === site.id || e.destination === site.name
  )
  const cargoInbound = cargo.filter(
    (c) => c.destination === site.name && c.status !== 'ARRIVED'
  )
  const offset = gridOffsetKm(site, reading)

  return (
    <div className="card space-y-4 p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="mono text-xs font-semibold text-hi">{site.name}</span>
              <Badge map={LOCATION_TYPE} value={site.type} />
            </div>
            <div className="mono mt-0.5 text-[11px] text-low">
              {formatCoords(site.latitude, site.longitude)} · {site.region}
            </div>
          </div>
          <Badge
            label={live ? 'LIVE API' : 'DEMO DATA'}
            tone={live ? 'ok' : 'warn'}
          />
        </div>

        {/* Current Weather Snapshot */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Temperature" value={degrees(reading?.temperature)} />
          <Metric
            label="Wind Chill"
            value={degrees(reading?.windChill)}
            tone={overMarginalChill(reading?.windChill) ? 'text-[var(--orange)]' : undefined}
          />
          <Metric
            label="Wind Speed"
            value={
              reading
                ? `${speed(reading.windSpeed)} ${windDirection(reading.windDirection)}`
                : '—'
            }
          />
          <Metric label="Peak Gusts" value={speed(reading?.windGusts)} />
        </div>

        <div className="mt-3 text-[12px] text-mid">
          Sky: <span className="text-hi font-medium">{reading?.description || '—'}</span>
          {offset != null && (
            <span className="mono text-[10.5px] text-low ml-2">
              (model offset {offset} km)
            </span>
          )}
        </div>

        {/* 4-Day Micro Outlook */}
        {reading?.dailyForecast && reading.dailyForecast.length > 0 && (
          <div className="mt-4 border-t border-[var(--line)]/60 pt-3">
            <div className="eyebrow mb-2">4-Day Station Outlook</div>
            <div className="grid grid-cols-4 gap-1.5 text-center">
              {reading.dailyForecast.slice(0, 4).map((d) => (
                <div
                  key={d.date}
                  className="rounded border border-[var(--line)] bg-[var(--surface-sunken)] p-1.5"
                >
                  <div className="mono text-[10px] text-low">{d.date.slice(5)}</div>
                  <div className="mono text-[11.5px] font-bold text-hi mt-0.5">
                    {degrees(d.maxTemp, 0)}
                  </div>
                  <div className="mono text-[10px] text-mid">{degrees(d.minTemp, 0)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Operations Safety Bar */}
        <div className="mt-4 rounded border border-[var(--line)] bg-[var(--surface-sunken)] p-3">
          <div className="flex items-center justify-between">
            <div className="eyebrow">Working Limits</div>
            <Badge map={OPS_WINDOW} value={ops.key} />
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-mid">{ops.reason}</p>
        </div>

        {/* Ground Deployment & Cargo Status */}
        <div className="mt-4 space-y-1 text-[11.5px] text-mid border-t border-[var(--line)]/60 pt-3">
          <div>
            Ground Crew: <strong className="text-hi">{onTheGround.length} deployed</strong>
            {onTheGround.some((p) => p.status === 'EMERGENCY') && (
              <span className="ml-1 text-[var(--red)] font-semibold">(EMERGENCY ACTIVE)</span>
            )}
          </div>
          <div>
            Expeditions:{' '}
            <span className="text-hi">
              {expeditionsHere.length
                ? expeditionsHere.map((e) => e.name).join(', ')
                : 'None currently stationed'}
            </span>
          </div>
          <div>
            Cargo En Route:{' '}
            <span className="text-hi">
              {cargoInbound.length} consignment{cargoInbound.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* Card Actions: 15-Day Deep Dive & Hazard Report */}
      <div className="pt-2 border-t border-[var(--line)] space-y-2">
        <button
          type="button"
          onClick={onInspect15Day}
          className="btn btn--sm w-full flex items-center justify-center gap-1.5"
        >
          <Calendar size={13} className="text-[var(--ice)]" />
          <span>Inspect 15-Day Forecast &amp; Trend</span>
        </button>

        {(ops.key === 'HAZARDOUS' || ops.key === 'GROUNDED') && (
          <div>
            {filedIncident ? (
              <div className="mono text-center text-[11px] text-[var(--orange)]">
                Hazard recorded: {filedIncident}
              </div>
            ) : (
              <button
                type="button"
                className="btn btn--alert btn--sm w-full flex items-center justify-center gap-1.5"
                onClick={onLogHazard}
              >
                <AlertTriangle size={13} />
                <span>Log Weather Hazard Alert</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   MAIN WEATHER COMPONENT
   ============================================================ */

export default function Weather() {
  const { locations, personnel, expeditions, cargo, reportEmergency } = useData()

  /* Main View Switcher: '15DAY' (15-Day Extended & Live Telemetry) vs 'NETWORK' (Station Overview) */
  const [activeView, setActiveView] = useState('15DAY')

  /* ---------------- SECTION A: 15-DAY LIVE FORECAST STATE ---------------- */
  const [currentLocation, setCurrentLocation] = useState(DEFAULT_LOCATIONS[0])
  const [report15, setReport15] = useState(null)
  const [isLoading15, setIsLoading15] = useState(true)
  const [error15, setError15] = useState(null)
  const [tempUnit, setTempUnit] = useState('celsius')
  const [windUnit, setWindUnit] = useState('kmh')
  const [selectedDay, setSelectedDay] = useState(null)
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState(300)

  /* Search and Geolocation State */
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [geoNotice, setGeoNotice] = useState(null)
  const [notice, setNotice] = useState(null)

  const fetchIdRef = useRef(0)

  /* Fetch live 15-day weather */
  const load15DayData = useCallback(async (loc) => {
    const currentFetchId = ++fetchIdRef.current
    setIsLoading15(true)
    setError15(null)

    try {
      const data = await fetchLiveWeather(loc)
      if (currentFetchId === fetchIdRef.current) {
        setReport15(data)
        setAutoRefreshCountdown(300)
      }
    } catch (err) {
      if (currentFetchId === fetchIdRef.current) {
        setError15(err instanceof Error ? err.message : 'Telemetry gateway connection failed.')
      }
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        setIsLoading15(false)
      }
    }
  }, [])

  useEffect(() => {
    load15DayData(currentLocation)
  }, [currentLocation, load15DayData])

  /* Countdown timer */
  useEffect(() => {
    const timer = setInterval(() => {
      setAutoRefreshCountdown((prev) => {
        if (prev <= 1) {
          load15DayData(currentLocation)
          return 300
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [currentLocation, load15DayData])

  /* Debounced Search */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await searchGlobalLocations(searchQuery)
        setSearchResults(res)
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [searchQuery])

  /* GPS Geolocation */
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoNotice('Geolocation is not supported by your browser.')
      return
    }

    setIsLocating(true)
    setGeoNotice(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false)
        const customLoc = {
          id: `gps-${Date.now()}`,
          name: 'My Deployed Position (GPS)',
          region: 'Live GPS Satellite Fix',
          type: 'field_camp',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          elevation: pos.coords.altitude ? Math.round(pos.coords.altitude) : 0,
          timezone: 'auto',
        }
        setCurrentLocation(customLoc)
        setGeoNotice(
          `GPS Acquired: ${pos.coords.latitude.toFixed(3)}°, ${pos.coords.longitude.toFixed(3)}°`
        )
        setTimeout(() => setGeoNotice(null), 5000)
      },
      (err) => {
        setIsLocating(false)
        setGeoNotice(`GPS Fix Error: ${err.message}`)
        setTimeout(() => setGeoNotice(null), 5000)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  /* Log hazard from 15-day view */
  const handleLogHazardFrom15Day = () => {
    const desc = `${report15?.operationsWindow?.advisory || 'Hazardous weather conditions'} at ${currentLocation.name}. Recorded wind speed ${report15?.current?.windSpeed} km/h (gusts ${report15?.current?.windGusts} km/h), wind chill ${report15?.current?.apparentTemperature}°C.`

    reportEmergency({
      type: 'WEATHER',
      severity: report15?.operationsWindow?.overall === 'NO_GO' ? 'CRITICAL' : 'WARNING',
      location: currentLocation.name,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      description: desc,
      assigned_team: 'Station Meteorological Safety Officer',
    })

    setNotice(`Filed weather emergency advisory for ${currentLocation.name}. Updated across console.`)
    setTimeout(() => setNotice(null), 6000)
  }

  /* ---------------- SECTION B: NETWORK MULTI-STATION STATE ---------------- */
  const sites = useMemo(() => locations.filter((loc) => loc.type !== 'VESSEL'), [locations])
  const [phase, setPhase] = useState('loading')
  const [result, setResult] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [filed, setFiled] = useState({})

  useEffect(() => {
    let cancelled = false
    async function run() {
      setPhase('loading')
      const answer = await fetchWeather(sites)
      if (cancelled) return
      setResult(answer)
      setPhase('ready')
    }
    run()
    return () => {
      cancelled = true
    }
  }, [sites, reloadToken])

  const live = result?.source === WEATHER_SOURCE.LIVE
  const readings = result?.readings || {}

  const assessed = sites.map((site) => {
    const reading = readings[site.id] || null
    return { site, reading, ops: assessConditions(reading || {}) }
  })

  const stations = assessed.filter((row) => row.site.type === 'STATION')
  const otherSites = assessed.filter((row) => row.site.type !== 'STATION')

  const withReadings = assessed.filter((row) => row.reading)
  const coldest = withReadings.reduce(
    (worst, row) =>
      row.reading.windChill != null && (!worst || row.reading.windChill < worst.reading.windChill)
        ? row
        : worst,
    null
  )
  const windiest = withReadings.reduce(
    (worst, row) =>
      row.reading.windGusts != null && (!worst || row.reading.windGusts > worst.reading.windGusts)
        ? row
        : worst,
    null
  )
  const restricted = assessed.filter(
    (row) => row.ops.key === 'HAZARDOUS' || row.ops.key === 'GROUNDED'
  )

  function logHazardFromNetwork({ site, reading, ops }) {
    const reason = ops.reasons.join(', ') || ops.reason
    const desc = `${site.name} is ${ops.key}. Conditions: ${reading?.description || 'unspecified'}, temp ${degrees(reading?.temperature)}, wind chill ${degrees(reading?.windChill)}, wind ${speed(reading?.windSpeed)} (gusts ${speed(reading?.windGusts)}). Reason: ${reason}. Data source: ${live ? 'live Open-Meteo API' : 'demo fallback'}.`

    const rec = reportEmergency({
      type: 'WEATHER',
      severity: ops.key === 'HAZARDOUS' ? 'CRITICAL' : 'WARNING',
      location: site.name,
      latitude: Number(site.latitude),
      longitude: Number(site.longitude),
      description: desc,
      assigned_team: 'Station Meteorological Officer',
    })

    setFiled((prev) => ({ ...prev, [site.id]: rec.id }))
    setNotice(`Incident ${rec.id} filed for ${site.name}. Visible on Dashboard and Emergency pages.`)
    setTimeout(() => setNotice(null), 6000)
  }

  /* Switch to 15-day view from station card */
  const inspect15DayForSite = (site) => {
    // Find matching location in DEFAULT_LOCATIONS or build one
    const found = DEFAULT_LOCATIONS.find(
      (l) =>
        l.name.toLowerCase().includes(site.name.toLowerCase().split(' ')[0]) ||
        site.name.toLowerCase().includes(l.name.toLowerCase().split(' ')[0])
    )

    if (found) {
      setCurrentLocation(found)
    } else {
      setCurrentLocation({
        id: site.id,
        name: site.name,
        region: site.region,
        type: 'polar_station',
        latitude: Number(site.latitude),
        longitude: Number(site.longitude),
        elevation: site.elevation || 20,
        timezone: 'auto',
      })
    }
    setActiveView('15DAY')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-5">
      {/* ================= TOP VIEW SWITCHER & CONTROLS ================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView('15DAY')}
            className={`btn btn--sm flex items-center gap-1.5 ${
              activeView === '15DAY' ? '' : 'btn--ghost'
            }`}
          >
            <Calendar size={14} className="text-[var(--ice)]" />
            <span>15-Day Forecast & Live Weather</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('NETWORK')}
            className={`btn btn--sm flex items-center gap-1.5 ${
              activeView === 'NETWORK' ? '' : 'btn--ghost'
            }`}
          >
            <CloudSnow size={14} className="text-[var(--ice)]" />
            <span>All Stations Overview ({stations.length} Bases)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('HISTORICAL')}
            className={`btn btn--sm flex items-center gap-1.5 ${
              activeView === 'HISTORICAL' ? '' : 'btn--ghost'
            }`}
          >
            <TrendingUp size={14} className="text-[var(--ice)]" />
            <span>Past Weather & Trends (ERA5 / AWS)</span>
          </button>
        </div>

        {/* Global Units & Refresh Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {activeView === '15DAY' && (
            <>
              {/* Temp Unit Toggle */}
              <button
                type="button"
                onClick={() => setTempUnit(tempUnit === 'celsius' ? 'fahrenheit' : 'celsius')}
                className="btn btn--ghost btn--sm mono"
                title="Toggle Temperature Units"
              >
                {tempUnit === 'celsius' ? '°C' : '°F'}
              </button>

              {/* Wind Unit Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (windUnit === 'kmh') setWindUnit('knots')
                  else if (windUnit === 'knots') setWindUnit('ms')
                  else setWindUnit('kmh')
                }}
                className="btn btn--ghost btn--sm mono"
                title="Cycle Wind Units"
              >
                {windUnit}
              </button>

              {/* Refresh Button with Countdown */}
              <button
                type="button"
                onClick={() => load15DayData(currentLocation)}
                className="btn btn--ghost btn--sm flex items-center gap-1.5 mono"
                disabled={isLoading15}
              >
                <RefreshCw size={13} className={isLoading15 ? 'animate-spin text-[var(--ice)]' : ''} />
                <span>Auto-refresh: {autoRefreshCountdown}s</span>
              </button>
            </>
          )}

          {activeView === 'NETWORK' && (
            <button
              type="button"
              onClick={() => setReloadToken((n) => n + 1)}
              className="btn btn--ghost btn--sm flex items-center gap-1.5 mono"
              disabled={phase === 'loading'}
            >
              <RefreshCw size={13} className={phase === 'loading' ? 'animate-spin' : ''} />
              <span>Refresh Network Feed</span>
            </button>
          )}
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="alert-strip flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-hi font-medium">
            <CheckCircle2 size={15} className="text-[var(--green)] shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs text-mid hover:text-hi"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ============================================================
          VIEW 1: 15-DAY EXTENDED FORECAST & LIVE TELEMETRY SUITE
          ============================================================ */}
      {activeView === '15DAY' && (
        <div className="space-y-6">
          {/* Quick Station Switcher Bar */}
          <div className="card p-3 shadow-sm flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="custom-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1 select-none">
                <span className="mono mr-1 text-[11px] font-bold uppercase text-low shrink-0 flex items-center gap-1">
                  <Compass size={12} className="text-[var(--ice)]" /> Stations:
                </span>
                {DEFAULT_LOCATIONS.map((loc) => {
                  const isActive = loc.id === currentLocation.id
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => setCurrentLocation(loc)}
                      className={`btn btn--sm mono shrink-0 ${isActive ? '' : 'btn--ghost'}`}
                    >
                      {loc.name.replace(' Station', '').replace(' Camp', '')}
                    </button>
                  )
                })}
              </div>

              {/* Geolocation Trigger */}
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={isLocating}
                className="btn btn--ghost btn--sm mono shrink-0 flex items-center gap-1"
                title="Acquire live coordinates via GPS"
              >
                <Crosshair size={12} className={isLocating ? 'animate-spin text-[var(--ice)]' : ''} />
                <span>{isLocating ? 'Fixing GPS…' : 'My GPS Location'}</span>
              </button>
            </div>

            {/* Global Search Bar */}
            <div className="relative">
              <div className="flex items-center gap-2 rounded border border-[var(--line)] bg-[var(--surface-sunken)] px-3 py-1.5 text-xs">
                <Search size={14} className="text-low shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search global observatories, bases, or cities (e.g. McMurdo, Ny-Ålesund, Cape Town, Tromsø)…"
                  className="w-full bg-transparent text-hi outline-none placeholder:text-low"
                />
                {isSearching && (
                  <RefreshCw size={12} className="animate-spin text-[var(--ice)] shrink-0" />
                )}
              </div>

              {/* Search Dropdown Results */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--surface-card)] p-1 shadow-2xl">
                  {searchResults.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => {
                        setCurrentLocation(res)
                        setSearchQuery('')
                        setSearchResults([])
                      }}
                      className="card-interactive flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs"
                    >
                      <div>
                        <div className="font-semibold text-hi">{res.name}</div>
                        <div className="mono text-[10.5px] text-low">{res.region}</div>
                      </div>
                      <div className="mono text-[10px] text-mid">
                        {res.latitude.toFixed(2)}°, {res.longitude.toFixed(2)}°
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {geoNotice && (
              <div className="mono text-xs text-[var(--ice)] bg-[var(--surface-sunken)] p-2 rounded border border-[var(--line)]">
                {geoNotice}
              </div>
            )}
          </div>

          {/* Loading Skeleton */}
          {isLoading15 && !report15 && <WeatherSkeleton />}

          {/* Error View */}
          {error15 && (
            <WeatherError
              message={error15}
              onRetry={() => load15DayData(currentLocation)}
              stationName={currentLocation.name}
            />
          )}

          {/* Main Loaded Meteorological View */}
          {report15 && (
            <>
              {/* Section 1: Live Current Weather & Operations Safety Window */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2">
                  <CurrentWeatherCard
                    report={report15}
                    tempUnit={tempUnit}
                    windUnit={windUnit}
                    onToggleWindUnit={setWindUnit}
                  />
                </div>
                <div className="lg:col-span-1">
                  <OperationsWindowCard
                    operationsWindow={report15.operationsWindow}
                    stationName={currentLocation.name}
                    onLogHazard={handleLogHazardFrom15Day}
                  />
                </div>
              </div>

              {/* Section 2: Hourly Atmospheric Projection */}
              <HourlyForecast
                hourly={report15.hourly}
                tempUnit={tempUnit}
                windUnit={windUnit}
              />

              {/* Section 3: 15-Day Temperature Trend & Dynamics SVG Chart */}
              <TemperatureTrendChart
                daily={report15.daily}
                tempUnit={tempUnit}
                windUnit={windUnit}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />

              {/* Section 4: 15-Day Extended Weather Outlook */}
              <FifteenDayForecast
                daily={report15.daily}
                tempUnit={tempUnit}
                windUnit={windUnit}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />
            </>
          )}

          {/* Selected Day Inspect Modal */}
          {selectedDay && (
            <DayDetailModal
              day={selectedDay}
              onClose={() => setSelectedDay(null)}
              tempUnit={tempUnit}
              windUnit={windUnit}
              location={currentLocation}
            />
          )}
        </div>
      )}

      {/* ============================================================
          VIEW 2: MULTI-STATION NETWORK MATRIX (All bases on the ground)
          ============================================================ */}
      {activeView === 'NETWORK' && (
        <div className="space-y-5">
          {/* Summary Row */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="card-tight">
              <div className="eyebrow">Sites reporting</div>
              <div className="stat-value">{withReadings.length}</div>
              <div className="mt-1 text-[11px] text-low leading-snug">
                {stations.length} stations, {otherSites.length} camps &amp; logistics points
              </div>
            </div>

            <div className="card-tight">
              <div className="eyebrow">Coldest wind chill</div>
              <div className="stat-value stat-value--alert">
                {coldest ? degrees(coldest.reading.windChill, 0) : '—'}
              </div>
              <div className="mt-1 text-[11px] text-low leading-snug">
                {coldest ? coldest.site.name : 'No reading'}
              </div>
            </div>

            <div className="card-tight">
              <div className="eyebrow">Strongest gusts</div>
              <div className="stat-value stat-value--warn">
                {windiest ? speed(windiest.reading.windGusts) : '—'}
              </div>
              <div className="mt-1 text-[11px] text-low leading-snug">
                {windiest ? windiest.site.name : 'No reading'}
              </div>
            </div>

            <div className="card-tight">
              <div className="eyebrow">Outside working limits</div>
              <div className={`stat-value ${restricted.length > 0 ? 'stat-value--alert' : ''}`}>
                {restricted.length}
              </div>
              <div className="mt-1 text-[11px] text-low leading-snug">
                {restricted.length > 0
                  ? restricted.map((row) => row.site.name).join(', ')
                  : 'All sites within limits'}
              </div>
            </div>
          </div>

          {/* Research Station Cards */}
          <Panel
            eyebrow="Current conditions"
            title="Research Stations"
            subtitle="Full telemetry readings, ground personnel, inbound cargo, and quick 15-day forecast inspection."
          >
            <div className="grid gap-4 xl:grid-cols-3">
              {stations.map(({ site, reading, ops }) => (
                <StationCard
                  key={site.id}
                  site={site}
                  reading={reading}
                  ops={ops}
                  live={live}
                  personnel={personnel}
                  expeditions={expeditions}
                  cargo={cargo}
                  filedIncident={filed[site.id]}
                  onLogHazard={() => logHazardFromNetwork({ site, reading, ops })}
                  onInspect15Day={() => inspect15DayForSite(site)}
                />
              ))}
            </div>
          </Panel>

          {/* Camps & Logistics Points Table */}
          <Panel
            eyebrow="Network"
            title="Camps, Runway &amp; Logistics Points"
            subtitle="Field camps and remote logistics telemetry points. Field camps are critical — a tent has no solid walls."
          >
            <DataTable
              columns={[
                {
                  header: 'Site',
                  strong: true,
                  cell: (row) => row.site.name,
                },
                {
                  header: 'Type',
                  cell: (row) => (
                    <span className="text-[11.5px] text-mid">
                      {statusLabel(LOCATION_TYPE, row.site.type)}
                    </span>
                  ),
                },
                {
                  header: 'Temp',
                  mono: true,
                  align: 'right',
                  width: '86px',
                  cell: (row) => degrees(row.reading?.temperature),
                },
                {
                  header: 'Feels like',
                  mono: true,
                  align: 'right',
                  width: '92px',
                  cell: (row) => (
                    <span
                      className={
                        overMarginalChill(row.reading?.windChill) ? 'text-[var(--orange)]' : ''
                      }
                    >
                      {degrees(row.reading?.windChill)}
                    </span>
                  ),
                },
                {
                  header: 'Wind / gusts',
                  mono: true,
                  align: 'right',
                  width: '130px',
                  cell: (row) =>
                    row.reading
                      ? `${speed(row.reading.windSpeed)} / ${speed(row.reading.windGusts)}`
                      : '—',
                },
                {
                  header: 'Sky',
                  cell: (row) => (
                    <span className="text-[11.5px] text-mid">
                      {row.reading?.description || '—'}
                    </span>
                  ),
                },
                {
                  header: 'Ops window',
                  width: '150px',
                  cell: (row) => (
                    <div className="flex items-center gap-2">
                      <Badge map={OPS_WINDOW} value={row.ops.key} />
                      <span className="text-[10.5px] text-low">{row.ops.reason}</span>
                    </div>
                  ),
                },
                {
                  header: '',
                  width: '180px',
                  align: 'right',
                  cell: (row) => (
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => inspect15DayForSite(row.site)}
                        className="btn btn--ghost btn--sm text-[11px]"
                        title="Open 15-Day forecast for this location"
                      >
                        15-Day
                      </button>
                      {(row.ops.key === 'HAZARDOUS' || row.ops.key === 'GROUNDED') && (
                        filed[row.site.id] ? (
                          <span className="mono text-[10.5px] text-mid">
                            {filed[row.site.id]}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--alert btn--sm"
                            onClick={() => logHazardFromNetwork(row)}
                          >
                            <AlertTriangle size={12} />
                            Hazard
                          </button>
                        )
                      )}
                    </div>
                  ),
                },
              ]}
              rows={otherSites}
              rowKey={(row) => row.site.id}
              maxHeight="420px"
              emptyTitle="No other sites"
              emptyMessage="Every site in the network is a research station."
            />
          </Panel>

          {/* Operational Meteorological Note */}
          <div className="alert-strip alert-strip--info">
            <Ship size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
            <div className="text-[12px] leading-relaxed text-mid">
              <strong className="text-hi">Maritime Meteorological Feeds.</strong> High-latitude station forecasts are computed directly for fixed WGS-84 station coordinates. Oceanic research vessels <em>Sagar Nidhi</em> and <em>Maitri Support</em> receive discrete high-seas maritime weather bulletins and shipboard AWS telemetry via satellite link.
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: HISTORICAL WEATHER REANALYSIS & AWS ARCHIVES ================= */}
      {activeView === 'HISTORICAL' && <HistoricalWeatherChart />}
    </div>
  )
}
