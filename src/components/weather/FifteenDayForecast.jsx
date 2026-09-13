import React, { useRef, useState } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Wind,
  LayoutGrid,
  Rows3,
  Info,
} from 'lucide-react'
import { WeatherIcon } from './WeatherIcon'
import { formatTemp, formatWindSpeed } from '../../utils/units'
import { getWeatherCodeDetails } from '../../utils/weatherCodes'

export function FifteenDayForecast({
  daily = [],
  tempUnit = 'celsius',
  windUnit = 'kmh',
  selectedDay,
  onSelectDay,
}) {
  const [viewMode, setViewMode] = useState('cards') // 'cards' | 'list'
  const scrollRef = useRef(null)

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  // Calculate overall min and max across all 15 days for relative temperature bars
  const validMins = daily.map((d) => Number(d.temperatureMin)).filter((v) => Number.isFinite(v))
  const validMaxs = daily.map((d) => Number(d.temperatureMax)).filter((v) => Number.isFinite(v))
  const overallMin = validMins.length ? Math.min(...validMins) : -30
  const overallMax = validMaxs.length ? Math.max(...validMaxs) : 10
  const tempSpan = Math.max(overallMax - overallMin, 1)

  return (
    <div className="card p-4 sm:p-6 shadow-xl">
      {/* Header */}
      <div className="mb-4 flex flex-col justify-between gap-3 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[var(--ice)]" />
            <h3 className="font-display text-base font-bold uppercase tracking-wider text-hi sm:text-lg">
              15-Day Extended Weather Outlook
            </h3>
            <span className="mono rounded border border-[var(--line)] bg-[var(--surface-sunken)] px-2 py-0.5 text-xs text-[var(--ice)]">
              15 DAYS
            </span>
          </div>
          <p className="mono mt-0.5 text-xs text-mid">
            Probabilistic numerical weather prediction · Select any day to inspect full operational parameters
          </p>
        </div>

        {/* View mode toggle & scroll buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* List vs Cards View */}
          <div className="flex rounded border border-[var(--line)] bg-[var(--surface-sunken)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`rounded p-1.5 transition-colors ${
                viewMode === 'cards'
                  ? 'bg-[var(--surface-raised)] text-[var(--ice)]'
                  : 'text-mid hover:text-hi'
              }`}
              title="Horizontal Cards View"
            >
              <Rows3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded p-1.5 transition-colors ${
                viewMode === 'list'
                  ? 'bg-[var(--surface-raised)] text-[var(--ice)]'
                  : 'text-mid hover:text-hi'
              }`}
              title="Dense Grid / Table View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {viewMode === 'cards' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                className="btn btn--ghost btn--sm p-1.5"
                title="Scroll previous days"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                className="btn btn--ghost btn--sm p-1.5"
                title="Scroll next days"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mode 1: Horizontal Cards View */}
      {viewMode === 'cards' ? (
        <div
          ref={scrollRef}
          className="custom-scrollbar flex gap-3 overflow-x-auto pb-3 pt-1 select-none"
        >
          {daily.map((day, idx) => {
            const details = getWeatherCodeDetails(day.weatherCode, true)
            const isSelected = selectedDay?.date === day.date
            const isToday = idx === 0

            // Calculate percentage positions for the temperature range bar
            const minT = Number.isFinite(Number(day.temperatureMin)) ? Number(day.temperatureMin) : overallMin
            const maxT = Number.isFinite(Number(day.temperatureMax)) ? Number(day.temperatureMax) : overallMax
            const leftPercent = Math.max(0, Math.min(100, ((minT - overallMin) / tempSpan) * 100))
            const widthPercent = Math.max(
              10,
              Math.min(100 - leftPercent, ((maxT - minT) / tempSpan) * 100)
            )

            return (
              <div
                key={day.date}
                onClick={() => onSelectDay?.(day)}
                className={`w-44 shrink-0 cursor-pointer rounded-lg p-3.5 transition-all border flex flex-col justify-between sm:w-48 ${
                  isSelected
                    ? 'border-[var(--ice)] bg-[var(--surface-raised)] ring-1 ring-[var(--ice)]/40 shadow-lg'
                    : 'border-[var(--line)] bg-[var(--surface-sunken)] hover:border-[var(--ice-dim)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                {/* Card Top: Day and Date */}
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isToday ? 'text-[var(--ice)]' : 'text-hi'
                      }`}
                    >
                      {day.dayName}
                    </span>
                    <span className="mono text-[11px] text-mid">{day.shortDate}</span>
                  </div>

                  {/* Weather Icon and Short Condition */}
                  <div className="my-3 flex items-center gap-2.5">
                    <div className="rounded-md border border-[var(--line)] bg-[var(--surface-card)] p-1.5">
                      <WeatherIcon code={day.weatherCode} isDay={true} size={28} />
                    </div>
                    <div className="overflow-hidden">
                      <div
                        className="truncate text-xs font-medium text-hi"
                        title={details.description}
                      >
                        {details.description}
                      </div>
                      <div className="mono text-[10px] text-mid">
                        POP: {day.precipitationProbabilityMax}%
                      </div>
                    </div>
                  </div>

                  {/* High and Low Temperatures */}
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="mono text-sm font-bold text-hi">
                      {formatTemp(day.temperatureMax, tempUnit)}
                    </span>
                    <span className="mono text-xs font-medium text-mid">
                      {formatTemp(day.temperatureMin, tempUnit)}
                    </span>
                  </div>

                  {/* Relative Temperature Range Bar */}
                  <div className="relative mb-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-base)]">
                    <div
                      className="absolute bottom-0 top-0 rounded-full bg-gradient-to-r from-[var(--blue)] via-[var(--ice)] to-[var(--orange)]"
                      style={{
                        left: `${leftPercent}%`,
                        width: `${Math.min(widthPercent, 100 - leftPercent)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Card Bottom: Precipitation & Wind Metrics */}
                <div className="mono space-y-1.5 border-t border-[var(--line)]/70 pt-2.5 text-[11px]">
                  {/* Precipitation */}
                  <div className="flex items-center justify-between text-mid">
                    <span className="flex items-center gap-1">
                      <Droplets className="h-3 w-3 text-[var(--blue)]" />
                      Precip
                    </span>
                    <span className="text-hi font-medium">
                      {day.precipitationSum > 0 ? `${day.precipitationSum} mm` : '0 mm'}
                    </span>
                  </div>

                  {/* Max Wind */}
                  <div className="flex items-center justify-between text-mid">
                    <span className="flex items-center gap-1">
                      <Wind className="h-3 w-3 text-[var(--ice)]" />
                      Wind Max
                    </span>
                    <span className="text-hi font-medium">
                      {formatWindSpeed(day.windSpeedMax, windUnit)}
                    </span>
                  </div>

                  {/* Peak Gusts */}
                  <div className="flex items-center justify-between text-low">
                    <span>Gusts</span>
                    <span className="font-medium text-[var(--orange)]">
                      {formatWindSpeed(day.windGustsMax, windUnit)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Mode 2: Dense Grid/Table View */
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {daily.map((day, idx) => {
            const details = getWeatherCodeDetails(day.weatherCode, true)
            const isSelected = selectedDay?.date === day.date
            const isToday = idx === 0

            return (
              <div
                key={day.date}
                onClick={() => onSelectDay?.(day)}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all ${
                  isSelected
                    ? 'border-[var(--ice)] bg-[var(--surface-raised)] ring-1 ring-[var(--ice)]/40'
                    : 'border-[var(--line)] bg-[var(--surface-sunken)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0 rounded bg-[var(--surface-card)] p-2 border border-[var(--line)]">
                    <WeatherIcon code={day.weatherCode} isDay={true} size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold ${
                          isToday ? 'text-[var(--ice)]' : 'text-hi'
                        }`}
                      >
                        {day.dayName}
                      </span>
                      <span className="mono text-[10px] text-mid">{day.shortDate}</span>
                    </div>
                    <div className="max-w-[140px] truncate text-xs text-mid">
                      {details.description}
                    </div>
                  </div>
                </div>

                <div className="mono text-right">
                  <div className="text-sm font-bold text-hi">
                    {formatTemp(day.temperatureMax, tempUnit)} /{' '}
                    <span className="text-mid">
                      {formatTemp(day.temperatureMin, tempUnit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1 text-[10px] text-[var(--blue)]">
                    <Droplets className="h-2.5 w-2.5" />
                    <span>
                      {day.precipitationProbabilityMax}% ({day.precipitationSum}mm)
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-mid">
                    <Wind className="h-2.5 w-2.5 text-[var(--ice)]" />
                    <span>{formatWindSpeed(day.windSpeedMax, windUnit)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Guidance Note */}
      <div className="mono mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)]/70 pt-3 text-xs text-low">
        <div className="flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-[var(--ice)]" />
          <span>Long-range polar forecasts (Day 8–15) reflect multi-ensemble model trend trajectories.</span>
        </div>
        <span className="text-mid">Click any card to inspect full operational parameters</span>
      </div>
    </div>
  )
}
