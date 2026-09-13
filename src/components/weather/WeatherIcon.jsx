import React from 'react'
import {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Snowflake,
} from 'lucide-react'
import { getWeatherCodeDetails } from '../../utils/weatherCodes'

export function WeatherIcon({ code, isDay = true, className = 'w-6 h-6', size }) {
  const details = getWeatherCodeDetails(code, isDay)

  const iconProps = {
    className,
    size,
    style: { color: details.color },
  }

  switch (details.iconName) {
    case 'Sun':
      return <Sun {...iconProps} />
    case 'Moon':
      return <Moon {...iconProps} />
    case 'CloudSun':
      return <CloudSun {...iconProps} />
    case 'CloudMoon':
      return <CloudMoon {...iconProps} />
    case 'Cloud':
      return <Cloud {...iconProps} />
    case 'CloudFog':
      return <CloudFog {...iconProps} />
    case 'CloudDrizzle':
      return <CloudDrizzle {...iconProps} />
    case 'CloudRain':
      return <CloudRain {...iconProps} />
    case 'CloudSnow':
      return <CloudSnow {...iconProps} />
    case 'CloudLightning':
      return <CloudLightning {...iconProps} />
    case 'Snowflake':
      return <Snowflake {...iconProps} />
    default:
      return <Cloud {...iconProps} />
  }
}
