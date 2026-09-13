import React from 'react'
import {
  X,
  Calendar,
  Wind,
  Droplets,
  Sunrise,
  Sunset,
  Sun,
  Thermometer,
  Shield,
  Compass,
} from 'lucide-react'
import { WeatherIcon } from './WeatherIcon'
import { getWeatherCodeDetails, formatWindDirection } from '../../utils/weatherCodes'
import { formatTemp, formatWindSpeed } from '../../utils/units'

export function DayDetailModal({
  day,
  onClose,
  tempUnit = 'celsius',
  windUnit = 'kmh',
  location,
}) {
  if (!day) return null

  const details = getWeatherCodeDetails(day.weatherCode, true)

  const formatSolar = (iso) => {
    if (!iso) return Math.abs(location?.latitude || 0) > 66.5 ? '24h Polar Sun / Night' : 'N/A'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso.slice(11, 16) || 'N/A'
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="card relative w-full max-w-lg rounded-xl p-6 shadow-2xl overflow-hidden border border-[var(--line)]">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg border border-[var(--line)] bg-[var(--surface-sunken)] p-1.5 text-mid hover:text-hi transition-colors"
          title="Close details"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-5 flex items-center gap-3 border-b border-[var(--line)] pb-4">
          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-sunken)] p-3">
            <WeatherIcon code={day.weatherCode} isDay={true} size={36} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="mono rounded border border-[var(--line)] bg-[var(--surface-sunken)] px-2 py-0.5 text-xs text-[var(--ice)]">
                {day.dayName}
              </span>
              <span className="mono text-xs text-mid">{day.date}</span>
            </div>
            <h3 className="mt-0.5 font-display text-xl font-bold text-hi">
              {details.description}
            </h3>
            <p className="mono text-xs text-low">{location?.name || 'Polar Station'}</p>
          </div>
        </div>

        {/* Temperature Breakdown Grid */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-sunken)] p-3">
            <div className="mono mb-1 flex items-center gap-1 text-[11px] text-[var(--orange)]">
              <Thermometer className="h-3.5 w-3.5" />
              Maximum Daytime High
            </div>
            <div className="mono text-2xl font-bold text-hi">
              {formatTemp(day.temperatureMax, tempUnit)}
            </div>
            <div className="mono mt-0.5 text-[10px] text-low">
              Apparent Peak: {formatTemp(day.apparentTemperatureMax, tempUnit)}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-sunken)] p-3">
            <div className="mono mb-1 flex items-center gap-1 text-[11px] text-[var(--blue)]">
              <Thermometer className="h-3.5 w-3.5" />
              Minimum Night Low
            </div>
            <div className="mono text-2xl font-bold text-hi">
              {formatTemp(day.temperatureMin, tempUnit)}
            </div>
            <div className="mono mt-0.5 text-[10px] text-low">
              Apparent Minimum: {formatTemp(day.apparentTemperatureMin, tempUnit)}
            </div>
          </div>
        </div>

        {/* Secondary Parameters Grid */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          {/* Wind Analysis */}
          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-sunken)] p-3">
            <div className="mono mb-1 flex items-center gap-1 text-[11px] text-low">
              <Wind className="h-3.5 w-3.5 text-[var(--ice)]" />
              Wind Vector
            </div>
            <div className="mono text-base font-bold text-hi">
              {formatWindSpeed(day.windSpeedMax, windUnit)}
            </div>
            <div className="mono mt-0.5 text-[10px] text-low">
              Gusts to <span className="text-[var(--orange)]">{formatWindSpeed(day.windGustsMax, windUnit)}</span>
            </div>
            <div className="mono mt-0.5 text-[10px] text-low">
              Dir: {formatWindDirection(day.windDirectionDominant)}
            </div>
          </div>

          {/* Precipitation Analysis */}
          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-sunken)] p-3">
            <div className="mono mb-1 flex items-center gap-1 text-[11px] text-low">
              <Droplets className="h-3.5 w-3.5 text-[var(--blue)]" />
              Precipitation Probability
            </div>
            <div className="mono text-base font-bold text-hi">
              {day.precipitationProbabilityMax}%
            </div>
            <div className="mono mt-0.5 text-[10px] text-low">
              Accumulation: {day.precipitationSum} mm
            </div>
            <div className="mono mt-0.5 text-[10px] text-low">
              Phase: {day.temperatureMax <= 0 ? 'Snow / Ice Pellets' : 'Mixed / Liquid'}
            </div>
          </div>
        </div>

        {/* Solar & UV Indices */}
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-sunken)] p-3">
          <div className="mono mb-2 flex items-center justify-between text-xs text-mid">
            <span className="flex items-center gap-1.5">
              <Sun className="h-3.5 w-3.5 text-[var(--amber)]" />
              Solar Ephemeris
            </span>
            {day.uvIndexMax !== undefined && (
              <span className="rounded bg-[var(--surface-card)] px-2 py-0.5 border border-[var(--line)]">
                Max UV Index: {day.uvIndexMax}
              </span>
            )}
          </div>
          <div className="mono grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-mid">
              <Sunrise className="h-3.5 w-3.5 text-[var(--amber)]" />
              <span>Sunrise:</span>
              <span className="text-hi font-medium">{formatSolar(day.sunrise)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-mid">
              <Sunset className="h-3.5 w-3.5 text-[var(--orange)]" />
              <span>Sunset:</span>
              <span className="text-hi font-medium">{formatSolar(day.sunset)}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn btn--sm"
          >
            Dismiss Overview
          </button>
        </div>
      </div>
    </div>
  )
}
