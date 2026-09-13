/**
 * WMO WEATHER CODE MAPPINGS & WIND HELPERS
 */

export function getWeatherCodeDetails(code, isDay = true) {
  switch (code) {
    case 0:
      return {
        description: isDay ? 'Clear Sky' : 'Clear Night',
        shortLabel: 'Clear',
        iconName: isDay ? 'Sun' : 'Moon',
        color: '#E8B84B',
        category: 'clear',
      }
    case 1:
      return {
        description: isDay ? 'Mainly Clear' : 'Mainly Clear Night',
        shortLabel: 'Mostly Clear',
        iconName: isDay ? 'CloudSun' : 'CloudMoon',
        color: '#6FD6D6',
        category: 'clear',
      }
    case 2:
      return {
        description: 'Partly Cloudy',
        shortLabel: 'Partly Cloudy',
        iconName: isDay ? 'CloudSun' : 'CloudMoon',
        color: '#A5BDC7',
        category: 'cloudy',
      }
    case 3:
      return {
        description: 'Overcast',
        shortLabel: 'Overcast',
        iconName: 'Cloud',
        color: '#6A8593',
        category: 'cloudy',
      }
    case 45:
    case 48:
      return {
        description: code === 48 ? 'Depositing Rime Fog' : 'Fog & Reduced Visibility',
        shortLabel: 'Fog',
        iconName: 'CloudFog',
        color: '#8BA1B0',
        category: 'fog',
      }
    case 51:
    case 53:
    case 55:
      return {
        description: code === 55 ? 'Heavy Drizzle' : code === 53 ? 'Moderate Drizzle' : 'Light Drizzle',
        shortLabel: 'Drizzle',
        iconName: 'CloudDrizzle',
        color: '#5AA9FF',
        category: 'rain',
      }
    case 56:
    case 57:
      return {
        description: 'Freezing Drizzle',
        shortLabel: 'Freezing Drizzle',
        iconName: 'CloudDrizzle',
        color: '#6FD6D6',
        category: 'rain',
      }
    case 61:
    case 63:
    case 65:
      return {
        description: code === 65 ? 'Heavy Rain' : code === 63 ? 'Moderate Rain' : 'Slight Rain',
        shortLabel: 'Rain',
        iconName: 'CloudRain',
        color: '#5AA9FF',
        category: 'rain',
      }
    case 66:
    case 67:
      return {
        description: 'Freezing Rain',
        shortLabel: 'Freezing Rain',
        iconName: 'CloudRain',
        color: '#6FD6D6',
        category: 'rain',
      }
    case 71:
    case 73:
    case 75:
      return {
        description: code === 75 ? 'Heavy Snowfall / Blizzard' : code === 73 ? 'Moderate Snowfall' : 'Slight Snowfall',
        shortLabel: 'Snow',
        iconName: 'CloudSnow',
        color: '#EAF3F5',
        category: 'snow',
      }
    case 77:
      return {
        description: 'Snow Grains',
        shortLabel: 'Snow Grains',
        iconName: 'Snowflake',
        color: '#EAF3F5',
        category: 'snow',
      }
    case 80:
    case 81:
    case 82:
      return {
        description: code === 82 ? 'Violent Rain Showers' : code === 81 ? 'Moderate Rain Showers' : 'Light Showers',
        shortLabel: 'Showers',
        iconName: 'CloudRain',
        color: '#5AA9FF',
        category: 'rain',
      }
    case 85:
    case 86:
      return {
        description: code === 86 ? 'Heavy Snow Showers / Ground Blizzard' : 'Slight Snow Showers',
        shortLabel: 'Snow Showers',
        iconName: 'CloudSnow',
        color: '#EAF3F5',
        category: 'snow',
      }
    case 95:
      return {
        description: 'Thunderstorm',
        shortLabel: 'Thunderstorm',
        iconName: 'CloudLightning',
        color: '#FF6A3D',
        category: 'thunder',
      }
    case 96:
    case 99:
      return {
        description: 'Severe Thunderstorm with Hail',
        shortLabel: 'Severe Storm',
        iconName: 'CloudLightning',
        color: '#FF5A5A',
        category: 'thunder',
      }
    default:
      return {
        description: 'Standard Polar Conditions',
        shortLabel: 'Variable',
        iconName: 'Cloud',
        color: '#A5BDC7',
        category: 'cloudy',
      }
  }
}

export function formatWindDirection(degrees) {
  if (degrees == null || Number.isNaN(Number(degrees))) return '—'
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
  ]
  const index = Math.round(((degrees % 360) / 22.5)) % 16
  return `${directions[index]} (${Math.round(degrees)}°)`
}
