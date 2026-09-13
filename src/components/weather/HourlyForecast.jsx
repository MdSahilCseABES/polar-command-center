import React, { useRef } from 'react'
import { ChevronLeft, ChevronRight, Droplets, Wind, Clock } from 'lucide-react'
import { WeatherIcon } from './WeatherIcon'
import { formatTemp, formatWindSpeed } from '../../utils/units'
import { getWeatherCodeDetails } from '../../utils/weatherCodes'

export function HourlyForecast({
  hourly = [],
  tempUnit = 'celsius',
  windUnit = 'kmh',
}) {
  const scrollRef = useRef(null)

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  if (!hourly || hourly.length === 0) return null

  return (
    <div className="card p-4 sm:p-5 shadow-lg">
      <div className="mb-3 flex items-center justify-between border-b border-[var(--line)] pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--ice)]" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-hi">
            Hourly Atmospheric Projection (Next 36 Hours)
          </h3>
        </div>

        {/* Scroll Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="btn btn--ghost btn--sm p-1.5"
            title="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="btn btn--ghost btn--sm p-1.5"
            title="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Hourly Track */}
      <div
        ref={scrollRef}
        className="custom-scrollbar flex gap-2.5 overflow-x-auto pb-2 pt-1 select-none"
      >
        {hourly.map((hour, index) => {
          const details = getWeatherCodeDetails(hour.weatherCode, hour.isDay)
          const isNow = index === 0

          return (
            <div
              key={hour.time}
              className={`w-24 shrink-0 rounded-lg p-2.5 text-center transition-all border sm:w-28 sm:p-3 ${
                isNow
                  ? 'border-[var(--ice)] bg-[var(--surface-raised)] shadow-sm'
                  : 'border-[var(--line)] bg-[var(--surface-sunken)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              {/* Hour time */}
              <div className="mono mb-1.5 text-xs font-semibold text-hi">
                {isNow ? (
                  <span className="font-bold text-[var(--ice)]">Now</span>
                ) : (
                  hour.formattedTime
                )}
              </div>

              {/* Weather Icon */}
              <div className="my-2 flex justify-center">
                <WeatherIcon code={hour.weatherCode} isDay={hour.isDay} size={26} />
              </div>

              {/* Temperature */}
              <div className="mono text-base font-bold text-hi">
                {formatTemp(hour.temperature, tempUnit)}
              </div>

              {/* Short condition text */}
              <div className="mt-0.5 truncate text-[10px] text-mid" title={details.shortLabel}>
                {details.shortLabel}
              </div>

              {/* Precipitation probability & wind */}
              <div className="mono mt-2 space-y-1 border-t border-[var(--line)]/70 pt-2 text-[10px]">
                <div className="flex items-center justify-center gap-1 text-[var(--blue)]">
                  <Droplets className="h-2.5 w-2.5" />
                  <span>{hour.precipitationProbability}%</span>
                </div>
                <div className="flex items-center justify-center gap-1 text-low">
                  <Wind className="h-2.5 w-2.5" />
                  <span>{formatWindSpeed(hour.windSpeed, windUnit)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
