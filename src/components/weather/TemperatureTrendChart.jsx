import React, { useState, useRef, useEffect } from 'react'
import { TrendingUp, Droplets, Info } from 'lucide-react'
import { formatTemp, formatWindSpeed } from '../../utils/units'
import { getWeatherCodeDetails } from '../../utils/weatherCodes'
import { WeatherIcon } from './WeatherIcon'

export function TemperatureTrendChart({
  daily = [],
  tempUnit = 'celsius',
  windUnit = 'kmh',
  onSelectDay,
  selectedDay,
}) {
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 320 })
  const [hoveredIdx, setHoveredIdx] = useState(null)

  // ResizeObserver for responsive SVG dimensions
  useEffect(() => {
    if (!containerRef.current) return

    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth } = containerRef.current
        setDimensions({
          width: Math.max(clientWidth, 380),
          height: clientWidth < 640 ? 260 : 320,
        })
      }
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [])

  if (!daily || daily.length === 0) return null

  const { width, height } = dimensions

  // Chart padding
  const padding = {
    top: 40,
    bottom: 65,
    left: 45,
    right: 25,
  }

  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Find min and max across high and low temperatures with safe filtering
  const validMins = daily.map((d) => Number(d.temperatureMin)).filter((v) => Number.isFinite(v))
  const validMaxs = daily.map((d) => Number(d.temperatureMax)).filter((v) => Number.isFinite(v))
  const minTempRaw = validMins.length ? Math.min(...validMins) : -30
  const maxTempRaw = validMaxs.length ? Math.max(...validMaxs) : -10

  // Add margin to prevent points hitting edges
  const tempPadding = Math.max((maxTempRaw - minTempRaw) * 0.15, 3)
  const minTemp = minTempRaw - tempPadding
  const maxTemp = maxTempRaw + tempPadding
  const tempRange = maxTemp - minTemp || 1

  // Coordinates mapping
  const getX = (index) => {
    if (daily.length <= 1) return padding.left
    return padding.left + (index / (daily.length - 1)) * chartWidth
  }

  const getY = (temp) => {
    const ratio = (temp - minTemp) / tempRange
    return padding.top + chartHeight - ratio * chartHeight
  }

  // Helper to generate smooth SVG cubic bezier path
  const buildSmoothPath = (points) => {
    if (points.length === 0) return ''
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

    let path = `M ${points[0].x} ${points[0].y}`

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[i + 2] || p2

      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6

      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }

    return path
  }

  // Highs and Lows points with safe fallback
  const highPoints = daily.map((d, i) => {
    const t = Number.isFinite(Number(d.temperatureMax)) ? Number(d.temperatureMax) : maxTempRaw
    return { x: getX(i), y: getY(t) }
  })
  const lowPoints = daily.map((d, i) => {
    const t = Number.isFinite(Number(d.temperatureMin)) ? Number(d.temperatureMin) : minTempRaw
    return { x: getX(i), y: getY(t) }
  })

  const highLinePath = buildSmoothPath(highPoints)
  const lowLinePath = buildSmoothPath(lowPoints)

  // Area between high and low curves
  const areaPath =
    highPoints.length > 0 && lowPoints.length > 0
      ? `${highLinePath} L ${lowPoints[lowPoints.length - 1].x} ${lowPoints[lowPoints.length - 1].y} ${buildSmoothPath(
          [...lowPoints].reverse()
        ).replace('M', 'L')} Z`
      : ''

  // Freezing line Y (0°C)
  const freezingY = 0 >= minTemp && 0 <= maxTemp ? getY(0) : null

  // Currently active item (hovered or selected or first)
  const activeIndex =
    hoveredIdx !== null
      ? hoveredIdx
      : selectedDay
      ? daily.findIndex((d) => d.date === selectedDay.date)
      : 0
  const activeDay = activeIndex >= 0 && activeIndex < daily.length ? daily[activeIndex] : daily[0]

  return (
    <div className="card p-4 sm:p-6 shadow-xl relative" ref={containerRef}>
      {/* Chart Header */}
      <div className="mb-4 flex flex-col justify-between gap-3 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[var(--ice)]" />
            <h3 className="font-display text-base font-bold uppercase tracking-wider text-hi sm:text-lg">
              15-Day Temperature Trend &amp; Thermal Envelopes
            </h3>
          </div>
          <p className="mono mt-0.5 text-xs text-mid">
            Hover over points to inspect diurnal range, thermal envelope, and precipitation probability
          </p>
        </div>

        {/* Selected / Hovered Snapshot badge */}
        {activeDay && (
          <div className="mono flex items-center gap-2 rounded border border-[var(--line)] bg-[var(--surface-sunken)] px-3 py-1 text-xs">
            <span className="font-semibold text-hi">
              {activeDay.dayName} ({activeDay.shortDate}):
            </span>
            <span className="font-bold text-[var(--orange)]">
              Max {formatTemp(activeDay.temperatureMax, tempUnit)}
            </span>
            <span className="text-low">/</span>
            <span className="font-bold text-[var(--blue)]">
              Min {formatTemp(activeDay.temperatureMin, tempUnit)}
            </span>
            <span className="text-low">|</span>
            <span className="text-[var(--blue)] flex items-center gap-0.5">
              <Droplets className="h-3 w-3" /> {activeDay.precipitationProbabilityMax}%
            </span>
          </div>
        )}
      </div>

      {/* SVG Chart Engine */}
      <div className="relative overflow-x-auto select-none">
        <svg
          width={width}
          height={height}
          className="overflow-visible font-mono"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            {/* Shaded Area Gradient */}
            <linearGradient id="envelopeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--orange)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--blue)" stopOpacity="0.1" />
            </linearGradient>

            {/* High Line Gradient */}
            <linearGradient id="highLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--orange)" />
              <stop offset="50%" stopColor="var(--amber)" />
              <stop offset="100%" stopColor="var(--orange)" />
            </linearGradient>

            {/* Low Line Gradient */}
            <linearGradient id="lowLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--blue)" />
              <stop offset="50%" stopColor="var(--ice)" />
              <stop offset="100%" stopColor="var(--blue)" />
            </linearGradient>
          </defs>

          {/* Grid lines: 4 horizontal tiers */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = padding.top + pct * chartHeight
            const tempVal = maxTemp - pct * tempRange
            return (
              <g key={pct}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke="var(--line)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  fill="var(--ink-low)"
                  fontSize="10"
                  textAnchor="end"
                >
                  {formatTemp(tempVal, tempUnit)}
                </text>
              </g>
            )
          })}

          {/* Freezing Reference Line (0°C) */}
          {freezingY !== null && (
            <g>
              <line
                x1={padding.left}
                y1={freezingY}
                x2={padding.left + chartWidth}
                y2={freezingY}
                stroke="var(--ice)"
                strokeDasharray="6 3"
                strokeWidth="1.25"
                opacity="0.6"
              />
              <text
                x={padding.left + chartWidth + 5}
                y={freezingY + 3}
                fill="var(--ice)"
                fontSize="9"
                fontWeight="bold"
              >
                0°C Freezing
              </text>
            </g>
          )}

          {/* Precipitation bars at chart bottom */}
          {daily.map((d, i) => {
            const x = getX(i)
            const barWidth = Math.max(chartWidth / (daily.length * 2.8), 6)
            const maxBarHeight = 35
            const barHeight = Math.min((d.precipitationSum / 15) * maxBarHeight, maxBarHeight)
            const yBottom = padding.top + chartHeight

            return (
              <g key={`precip-${d.date}`}>
                {d.precipitationSum > 0 && (
                  <rect
                    x={x - barWidth / 2}
                    y={yBottom - barHeight}
                    width={barWidth}
                    height={barHeight}
                    fill="var(--blue)"
                    opacity="0.4"
                    rx="1"
                  />
                )}
              </g>
            )
          })}

          {/* Shaded Thermal Envelope Area */}
          <path d={areaPath} fill="url(#envelopeGrad)" />

          {/* High Line */}
          <path
            d={highLinePath}
            fill="none"
            stroke="url(#highLineGrad)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Low Line */}
          <path
            d={lowLinePath}
            fill="none"
            stroke="url(#lowLineGrad)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Day Columns, Points and Click/Hover Targets */}
          {daily.map((d, i) => {
            const x = getX(i)
            const yHigh = getY(d.temperatureMax)
            const yLow = getY(d.temperatureMin)
            const isHovered = hoveredIdx === i
            const isSelected = selectedDay?.date === d.date
            const isToday = i === 0

            return (
              <g
                key={d.date}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onClick={() => onSelectDay?.(d)}
              >
                {/* Vertical tracking column hover */}
                {(isHovered || isSelected) && (
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + chartHeight}
                    stroke="var(--ice)"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.8"
                  />
                )}

                {/* High Point Dot */}
                <circle
                  cx={x}
                  cy={yHigh}
                  r={isHovered || isSelected ? 6 : 4}
                  fill="var(--orange)"
                  stroke="var(--surface-card)"
                  strokeWidth="2"
                  className="transition-all"
                />

                {/* Low Point Dot */}
                <circle
                  cx={x}
                  cy={yLow}
                  r={isHovered || isSelected ? 6 : 4}
                  fill="var(--blue)"
                  stroke="var(--surface-card)"
                  strokeWidth="2"
                  className="transition-all"
                />

                {/* Top Temp Label on Hover or Key Points */}
                {(isHovered || isSelected || i % 2 === 0) && (
                  <text
                    x={x}
                    y={yHigh - 9}
                    fill="var(--ink-hi)"
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {formatTemp(d.temperatureMax, tempUnit)}
                  </text>
                )}

                {/* Bottom Temp Label */}
                {(isHovered || isSelected || i % 2 === 0) && (
                  <text
                    x={x}
                    y={yLow + 15}
                    fill="var(--ink-mid)"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {formatTemp(d.temperatureMin, tempUnit)}
                  </text>
                )}

                {/* Bottom Date Label */}
                <text
                  x={x}
                  y={height - 24}
                  fill={isToday ? 'var(--ice)' : isSelected ? 'var(--ink-hi)' : 'var(--ink-mid)'}
                  fontSize="10.5"
                  fontWeight={isToday || isSelected ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {d.dayName}
                </text>

                <text
                  x={x}
                  y={height - 11}
                  fill="var(--ink-low)"
                  fontSize="9.5"
                  textAnchor="middle"
                >
                  {d.shortDate ? (d.shortDate.includes(' ') ? d.shortDate.split(' ')[1] : d.shortDate) : ''}
                </text>

                {/* Transparent Hit Box */}
                <rect
                  x={x - chartWidth / (daily.length * 2)}
                  y={padding.top}
                  width={chartWidth / daily.length}
                  height={chartHeight + 35}
                  fill="transparent"
                />
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend & Guide */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3 text-xs mono text-mid">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--orange)]" />
            <span>Daytime High Curve</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--blue)]" />
            <span>Nighttime Low Curve</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-[var(--blue)] opacity-50" />
            <span>Precipitation (mm)</span>
          </span>
        </div>

        <div className="flex items-center gap-1 text-low text-[11px]">
          <Info className="h-3 w-3" />
          <span>Click any day on chart to inspect hourly trajectory</span>
        </div>
      </div>
    </div>
  )
}
