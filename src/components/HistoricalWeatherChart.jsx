/**
 * HISTORICAL WEATHER CHART COMPONENT
 * ==================================
 * Interactive meteorological time-series visualization for Indian Antarctic Stations.
 *
 * Grounded in:
 * 1. Open-Meteo Historical Weather API (ERA5-Land reanalysis)
 * 2. Published NCPOR AWS Benchmark Archive (Maitri 89514 & Bharati 89512)
 *
 * Transparently labeled as HISTORICAL REANALYSIS or NCPOR OBSERVATION.
 */

import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  Calendar,
  CloudRain,
  Compass,
  Database,
  Droplets,
  Gauge,
  RefreshCw,
  Thermometer,
  Wind,
} from 'lucide-react'

import SourceBadge from './SourceBadge'
import DataProvenance from './DataProvenance'
import { fetchHistoricalWeather } from '../services/historicalWeatherService'
import { OFFICIAL_STATIONS } from '../data/stationData'

const VARIABLES = [
  { id: 'temperature', label: 'Temperature', unit: '°C', icon: Thermometer, color: '#38BDF8', gradient: ['#38BDF8', '#0284C7'] },
  { id: 'windSpeed', label: 'Wind Speed', unit: 'km/h', icon: Wind, color: '#A855F7', gradient: ['#A855F7', '#7E22CE'] },
  { id: 'windGusts', label: 'Wind Gusts', unit: 'km/h', icon: Activity, color: '#F43F5E', gradient: ['#F43F5E', '#BE123C'] },
  { id: 'pressure', label: 'Surface Pressure', unit: 'hPa', icon: Gauge, color: '#10B981', gradient: ['#10B981', '#047857'] },
  { id: 'humidity', label: 'Rel. Humidity', unit: '%', icon: Droplets, color: '#06B6D4', gradient: ['#06B6D4', '#0E7490'] },
]

const TIME_PRESETS = [
  { id: 'winter-2024', label: 'Mid-Winter Benchmark (July 2024)', start: '2024-07-01', end: '2024-07-07', note: 'Extreme polar night freeze & katabatic storms' },
  { id: 'summer-2024', label: 'Peak Summer Resupply (Jan 2024)', start: '2024-01-10', end: '2024-01-17', note: 'Maritime resupply and aviation window' },
  { id: 'recent-7d', label: 'Recent 7 Days', start: getPastDate(7), end: getPastDate(1), note: 'Recent ERA5-Land reanalysis' },
  { id: 'recent-14d', label: 'Recent 14 Days', start: getPastDate(14), end: getPastDate(1), note: 'Bi-weekly synoptic trajectory' },
]

function getPastDate(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

export default function HistoricalWeatherChart() {
  const [selectedStationId, setSelectedStationId] = useState('LOC-MAITRI')
  const [selectedPresetId, setSelectedPresetId] = useState('winter-2024')
  const [activeVariableId, setActiveVariableId] = useState('temperature')
  const [loading, setLoading] = useState(false)
  const [datasetResult, setDatasetResult] = useState(null)
  const [errorNotice, setErrorNotice] = useState(null)

  const stations = OFFICIAL_STATIONS.filter((s) => s.id === 'LOC-MAITRI' || s.id === 'LOC-BHARATI')
  const currentStation = stations.find((s) => s.id === selectedStationId) || stations[0]
  const currentPreset = TIME_PRESETS.find((p) => p.id === selectedPresetId) || TIME_PRESETS[0]
  const activeVar = VARIABLES.find((v) => v.id === activeVariableId) || VARIABLES[0]

  const loadData = async (station, preset) => {
    setLoading(true)
    setErrorNotice(null)
    try {
      const res = await fetchHistoricalWeather(station, preset.start, preset.end)
      setDatasetResult(res)
      if (res.errorNotice) {
        setErrorNotice(res.errorNotice)
      }
    } catch (err) {
      setErrorNotice(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(currentStation, currentPreset)
  }, [selectedStationId, selectedPresetId])

  const stats = datasetResult?.stats?.[activeVariableId]
  const chartData = datasetResult?.dataPoints || []

  return (
    <div className="space-y-4">
      {/* Top Header & Methodology Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-card)] p-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-hi">Historical Weather Analysis</h3>
            <SourceBadge
              status={datasetResult?.dataStatus || 'HISTORICAL REANALYSIS'}
              sourceUrl={datasetResult?.sourceUrl}
              size="sm"
            />
          </div>
          <p className="mt-1 text-xs text-lo">
            Multi-variable retrospective analysis of Indian Antarctic stations. Data queries Copernicus ERA5-Land reanalysis via Open-Meteo or published NCPOR AWS baseline archives.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData(currentStation, currentPreset)}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-medium text-hi hover:bg-[var(--surface-card)] transition disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-[var(--accent)]' : ''} />
          <span>{loading ? 'Querying Archive...' : 'Refresh Archive'}</span>
        </button>
      </div>

      {errorNotice && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          <Database size={14} className="mt-0.5 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Control Bar: Station Selector & Time Presets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Station Selector */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-card)] p-3 shadow-sm">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-lo mb-1.5">
            Select Indian Antarctic Station
          </label>
          <div className="grid grid-cols-2 gap-2">
            {stations.map((st) => {
              const active = st.id === selectedStationId
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStationId(st.id)}
                  className={`flex flex-col text-left rounded-lg p-2.5 border transition ${
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-tint)] text-hi shadow-sm'
                      : 'border-[var(--line-soft)] bg-[var(--surface-raised)] text-mid hover:text-hi hover:border-[var(--line)]'
                  }`}
                >
                  <span className="font-bold text-xs">{st.name}</span>
                  <span className="text-[10px] text-lo mt-0.5">{st.coordinatesFormatted}</span>
                  <span className="text-[10px] text-lo">Elev: {st.elevationFormatted}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Time Window Presets */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-card)] p-3 shadow-sm">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-lo mb-1.5">
            Observation Period / Benchmark Window
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TIME_PRESETS.map((preset) => {
              const active = preset.id === selectedPresetId
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`flex flex-col text-left rounded-lg p-2 border transition ${
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-tint)] text-hi shadow-sm'
                      : 'border-[var(--line-soft)] bg-[var(--surface-raised)] text-mid hover:text-hi hover:border-[var(--line)]'
                  }`}
                >
                  <span className="font-semibold text-xs truncate">{preset.label}</span>
                  <span className="text-[10px] text-lo mt-0.5 font-mono">{preset.start} to {preset.end}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Variable Toggle Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {VARIABLES.map((v) => {
          const Icon = v.icon
          const active = v.id === activeVariableId
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setActiveVariableId(v.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'bg-sky-600 text-white shadow'
                  : 'border border-[var(--line-soft)] bg-[var(--surface-card)] text-mid hover:text-hi hover:border-[var(--line)]'
              }`}
            >
              <Icon size={13} />
              <span>{v.label}</span>
              <span className="text-[10px] opacity-80">({v.unit})</span>
            </button>
          )
        })}
      </div>

      {/* Statistics Strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-card)] p-3 shadow-sm">
            <span className="text-[11px] text-lo block uppercase font-medium">Minimum Value</span>
            <span className="text-xl font-bold text-hi font-mono mt-0.5 block">
              {stats.min} <span className="text-xs font-normal text-lo">{activeVar.unit}</span>
            </span>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-card)] p-3 shadow-sm">
            <span className="text-[11px] text-lo block uppercase font-medium">Maximum Recorded</span>
            <span className="text-xl font-bold text-hi font-mono mt-0.5 block">
              {stats.max} <span className="text-xs font-normal text-lo">{activeVar.unit}</span>
            </span>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-card)] p-3 shadow-sm">
            <span className="text-[11px] text-lo block uppercase font-medium">Period Average</span>
            <span className="text-xl font-bold text-hi font-mono mt-0.5 block">
              {stats.avg} <span className="text-xs font-normal text-lo">{activeVar.unit}</span>
            </span>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-card)] p-3 shadow-sm">
            <span className="text-[11px] text-lo block uppercase font-medium">Data Points</span>
            <span className="text-xl font-bold text-hi font-mono mt-0.5 block">
              {chartData.length} <span className="text-xs font-normal text-lo">hourly steps</span>
            </span>
          </div>
        </div>
      )}

      {/* Recharts Graphical Chart */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-card)] p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <activeVar.icon size={15} style={{ color: activeVar.color }} />
            <h4 className="text-sm font-bold text-hi">
              {currentStation.name} — {activeVar.label} History ({activeVar.unit})
            </h4>
          </div>
          <span className="text-[11px] text-lo font-mono">
            {currentPreset.start} to {currentPreset.end}
          </span>
        </div>

        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-xs text-lo">
            <RefreshCw size={20} className="animate-spin text-[var(--accent)] mb-2" />
            <span>Fetching historical reanalysis dataset...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-lo">
            No historical records available for the selected parameters.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${activeVar.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={activeVar.color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={activeVar.color} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" vertical={false} />
                <XAxis
                  dataKey="formattedTime"
                  stroke="var(--fg-lo)"
                  tick={{ fontSize: 10, fill: 'var(--fg-lo)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--line-soft)' }}
                  interval={Math.max(1, Math.floor(chartData.length / 8))}
                />
                <YAxis
                  stroke="var(--fg-lo)"
                  tick={{ fontSize: 10, fill: 'var(--fg-lo)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--line-soft)' }}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-card)] p-2.5 shadow-xl text-xs space-y-1">
                        <div className="font-semibold text-hi border-b border-[var(--line-soft)] pb-1">
                          {d.formattedTime} UTC
                        </div>
                        <div className="flex items-center justify-between gap-3 text-lo">
                          <span>{activeVar.label}:</span>
                          <span className="font-bold text-hi font-mono">
                            {d[activeVariableId]} {activeVar.unit}
                          </span>
                        </div>
                        {activeVariableId === 'windSpeed' && d.windGusts != null && (
                          <div className="flex items-center justify-between gap-3 text-lo">
                            <span>Peak Gust:</span>
                            <span className="font-mono text-hi">{d.windGusts} km/h</span>
                          </div>
                        )}
                        {d.windDirection != null && (
                          <div className="flex items-center justify-between gap-3 text-lo">
                            <span>Wind Heading:</span>
                            <span className="font-mono text-hi">{d.windDirection}°</span>
                          </div>
                        )}
                      </div>
                    )
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={activeVariableId}
                  stroke={activeVar.color}
                  strokeWidth={2}
                  fill={`url(#grad-${activeVar.id})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Dataset Provenance Panel */}
      <DataProvenance
        provider={datasetResult?.provider || 'Open-Meteo Historical Weather API / Copernicus ERA5-Land'}
        dataset={`${currentStation.name} Historical Reanalysis Time-Series`}
        location={currentStation.region}
        coordinates={currentStation.coordinatesFormatted}
        date={`${currentPreset.start} to ${currentPreset.end}`}
        dataType="Atmospheric Numerical Reanalysis"
        status={datasetResult?.dataStatus || 'HISTORICAL REANALYSIS'}
        sourceUrl={datasetResult?.sourceUrl || 'https://open-meteo.com/en/docs/historical-weather-api'}
        methodologyNote="Reanalysis data integrates numerical weather prediction models with historical observations. Not direct live station observations. For direct official station archives, consult the NCPOR Polar Data Centre."
      />
    </div>
  )
}
