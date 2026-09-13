import React from 'react'
import {
  Wind,
  Droplets,
  Eye,
  Compass,
  Gauge,
  Sunrise,
  Sunset,
  Cloud,
  Thermometer,
  CloudRain,
  Radio,
  Sun,
  ShieldAlert,
} from 'lucide-react'
import { WeatherIcon } from './WeatherIcon'
import { getWeatherCodeDetails, formatWindDirection } from '../../utils/weatherCodes'
import { formatTemp, formatTempExact, formatWindSpeed } from '../../utils/units'

export function CurrentWeatherCard({
  report,
  tempUnit = 'celsius',
  windUnit = 'kmh',
  onToggleWindUnit,
}) {
  const { location, current, daily } = report
  const conditionDetails = getWeatherCodeDetails(current.weatherCode, current.isDay)

  // Helper for formatting sunrise / sunset in polar vs temperate latitudes
  const formatSolarTime = (isoString, type) => {
    if (!isoString) {
      if (Math.abs(location.latitude) > 66.5) {
        return current.isDay ? '24h Polar Day' : '24h Polar Night'
      }
      return 'N/A'
    }
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString.slice(11, 16) || 'N/A'
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const sunriseText = formatSolarTime(current.sunrise, 'sunrise')
  const sunsetText = formatSolarTime(current.sunset, 'sunset')

  const cycleWindUnit = () => {
    if (windUnit === 'kmh') onToggleWindUnit('knots')
    else if (windUnit === 'knots') onToggleWindUnit('ms')
    else onToggleWindUnit('kmh')
  }

  return (
    <div className="card relative overflow-hidden shadow-xl p-5 sm:p-6">
      {/* Subtle background glow based on condition category */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-10 blur-3xl"
        style={{ backgroundColor: conditionDetails.color }}
      />

      {/* Card Header: Station / Location info */}
      <div className="mb-5 flex flex-col justify-between gap-2 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono rounded border border-[var(--line)] bg-[var(--surface-sunken)] px-2 py-0.5 text-xs text-[var(--ice)]">
              {location.type === 'polar_station'
                ? 'POLAR RESEARCH STATION'
                : location.type === 'vessel'
                ? 'RESEARCH EXPEDITION VESSEL'
                : location.type === 'field_camp'
                ? 'FIELD RESEARCH OUTPOST'
                : 'GLOBAL OBSERVATORY'}
            </span>
            <span className="mono text-xs text-mid">
              Coord: {Number(location.latitude).toFixed(3)}°, {Number(location.longitude).toFixed(3)}°
            </span>
            {location.elevation !== undefined && (
              <span className="mono text-xs text-low">
                Alt: {location.elevation}m
              </span>
            )}
          </div>
          <h2 className="mt-1 font-display text-xl font-bold text-hi sm:text-2xl">
            {location.name}
          </h2>
          <p className="mono text-xs text-mid">{location.region}</p>
        </div>

        <div className="flex items-center gap-2 sm:self-start">
          <div className="flex items-center gap-1.5 rounded border border-[var(--line)] bg-[var(--surface-sunken)] px-2.5 py-1 font-mono text-xs text-[var(--green)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--green)] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--green)]" />
            </span>
            <span>TELEMETRY ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Main Meteorological Core */}
      <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
        {/* Left: Huge Temp & Weather Icon */}
        <div className="flex items-center gap-5 lg:col-span-7">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-sunken)] shadow-inner sm:h-24 sm:w-24">
            <WeatherIcon code={current.weatherCode} isDay={current.isDay} size={48} />
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-4xl font-extrabold text-hi sm:text-5xl lg:text-6xl">
                {formatTempExact(current.temperature, tempUnit)}
              </span>
              <span className="text-lg font-bold text-mid">
                {tempUnit === 'celsius' ? '°C' : '°F'}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-hi">
                {conditionDetails.description}
              </span>
              <span className="text-low">·</span>
              <span className="mono text-mid">
                Wind Chill / Apparent:{' '}
                <strong className={current.apparentTemperature < -30 ? 'text-[var(--orange)] font-bold' : 'text-hi'}>
                  {formatTemp(current.apparentTemperature, tempUnit)}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Primary Wind & Surface Pressure Block */}
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-sunken)] p-3.5 lg:col-span-5">
          <div className="flex items-center justify-between">
            <span className="eyebrow flex items-center gap-1.5">
              <Wind className="h-3.5 w-3.5 text-[var(--ice)]" />
              Wind Telemetry
            </span>
            <button
              onClick={cycleWindUnit}
              className="mono rounded border border-[var(--line)] bg-[var(--surface-card)] px-1.5 py-0.5 text-[10px] text-mid hover:text-hi"
              title="Click to cycle wind units (km/h -> knots -> m/s)"
            >
              Unit: {windUnit}
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <div className="mono text-lg font-bold text-hi">
                {formatWindSpeed(current.windSpeed, windUnit)}
              </div>
              <div className="mono text-[10px] text-low">
                Dir: {formatWindDirection(current.windDirection)}
              </div>
            </div>
            <div>
              <div className="mono text-lg font-bold text-[var(--orange)]">
                {formatWindSpeed(current.windGusts, windUnit)}
              </div>
              <div className="mono text-[10px] text-low">Peak Gusts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Telemetry Grid Strip */}
      <div className="mt-6 grid grid-cols-2 gap-2.5 border-t border-[var(--line)] pt-5 sm:grid-cols-3 lg:grid-cols-6">
        {/* Humidity */}
        <div className="rounded-md border border-[var(--line)] bg-[var(--surface-sunken)] p-2.5">
          <div className="mono flex items-center gap-1 text-[11px] text-low">
            <Droplets className="h-3 w-3 text-[var(--blue)]" />
            Humidity
          </div>
          <div className="mono mt-1 text-base font-bold text-hi">
            {current.relativeHumidity}%
          </div>
        </div>

        {/* Pressure */}
        <div className="rounded-md border border-[var(--line)] bg-[var(--surface-sunken)] p-2.5">
          <div className="mono flex items-center gap-1 text-[11px] text-low">
            <Gauge className="h-3 w-3 text-[var(--ice)]" />
            Pressure
          </div>
          <div className="mono mt-1 text-base font-bold text-hi">
            {current.surfacePressure} hPa
          </div>
        </div>

        {/* Cloud Cover */}
        <div className="rounded-md border border-[var(--line)] bg-[var(--surface-sunken)] p-2.5">
          <div className="mono flex items-center gap-1 text-[11px] text-low">
            <Cloud className="h-3 w-3 text-mid" />
            Cloud Cover
          </div>
          <div className="mono mt-1 text-base font-bold text-hi">
            {current.cloudCover}%
          </div>
        </div>

        {/* Visibility */}
        <div className="rounded-md border border-[var(--line)] bg-[var(--surface-sunken)] p-2.5">
          <div className="mono flex items-center gap-1 text-[11px] text-low">
            <Eye className="h-3 w-3 text-[var(--green)]" />
            Visibility
          </div>
          <div className="mono mt-1 text-base font-bold text-hi">
            {current.visibility !== null
              ? current.visibility >= 1000
                ? `${(current.visibility / 1000).toFixed(1)} km`
                : `${current.visibility} m`
              : '—'}
          </div>
        </div>

        {/* Sunrise / Solar Event */}
        <div className="rounded-md border border-[var(--line)] bg-[var(--surface-sunken)] p-2.5">
          <div className="mono flex items-center gap-1 text-[11px] text-low">
            <Sunrise className="h-3 w-3 text-[var(--amber)]" />
            Solar Noon/Rise
          </div>
          <div className="mono mt-1 truncate text-xs font-semibold text-hi" title={sunriseText}>
            {sunriseText}
          </div>
        </div>

        {/* Sunset / Polar Regime */}
        <div className="rounded-md border border-[var(--line)] bg-[var(--surface-sunken)] p-2.5">
          <div className="mono flex items-center gap-1 text-[11px] text-low">
            <Sunset className="h-3 w-3 text-[var(--orange)]" />
            Sunset / Cycle
          </div>
          <div className="mono mt-1 truncate text-xs font-semibold text-hi" title={sunsetText}>
            {sunsetText}
          </div>
        </div>
      </div>
    </div>
  )
}
