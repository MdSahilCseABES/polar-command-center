/**
 * UNIT FORMATTERS & CONVERTERS
 */

export function formatTemp(celsius, unit = 'celsius') {
  if (celsius == null || Number.isNaN(Number(celsius))) return '—'
  if (unit === 'fahrenheit') {
    const f = (Number(celsius) * 9) / 5 + 32
    return `${Math.round(f)}°F`
  }
  return `${Math.round(Number(celsius))}°C`
}

export function formatTempExact(celsius, unit = 'celsius') {
  if (celsius == null || Number.isNaN(Number(celsius))) return '—'
  const val = Number(celsius)
  if (unit === 'fahrenheit') {
    const f = (val * 9) / 5 + 32
    return `${f.toFixed(1)}°F`
  }
  return `${val > 0 ? '+' : ''}${val.toFixed(1)}°C`
}

export function formatWindSpeed(kmh, unit = 'kmh') {
  if (kmh == null || Number.isNaN(Number(kmh))) return '—'
  const val = Number(kmh)
  switch (unit) {
    case 'ms':
      return `${(val / 3.6).toFixed(1)} m/s`
    case 'knots':
      return `${(val / 1.852).toFixed(1)} kn`
    case 'kmh':
    default:
      return `${Math.round(val)} km/h`
  }
}
