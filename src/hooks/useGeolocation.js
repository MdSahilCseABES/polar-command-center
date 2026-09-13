import { useCallback, useEffect, useRef, useState } from 'react'

const OPTIONS = { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }

function friendlyError(error) {
  if (!error) return 'GPS temporarily unavailable.'
  if (error.code === 1) return 'Location permission was denied. Allow location access in your browser settings to use Live GPS.'
  if (error.code === 2) return 'GPS position is temporarily unavailable. Check the device location service and try again.'
  if (error.code === 3) return 'GPS request timed out. The browser will keep trying while tracking is active.'
  return 'GPS is temporarily unavailable.'
}

function normalize(position) {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    altitude: position.coords.altitude,
    heading: position.coords.heading,
    speed: position.coords.speed,
    timestamp: position.timestamp,
  }
}

export default function useGeolocation() {
  const watchId = useRef(null)
  const [position, setPosition] = useState(null)
  const [error, setError] = useState(null)
  const [tracking, setTracking] = useState(false)
  const [permission, setPermission] = useState('prompt')

  const stop = useCallback(() => {
    if (watchId.current != null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchId.current)
    }
    watchId.current = null
    setTracking(false)
  }, [])

  const start = useCallback(() => {
    setError(null)
    if (!('geolocation' in navigator)) {
      setPermission('unsupported')
      setError('This browser does not provide location services.')
      return
    }

    setTracking(true)
    watchId.current = navigator.geolocation.watchPosition(
      (next) => {
        setPermission('granted')
        setError(null)
        setPosition(normalize(next))
      },
      (nextError) => {
        if (nextError?.code === 1) setPermission('denied')
        setError(friendlyError(nextError))
        if (nextError?.code === 1) stop()
      },
      OPTIONS
    )
  }, [stop])

  const locateOnce = useCallback(() => new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      const err = new Error('This browser does not provide location services.')
      setPermission('unsupported')
      setError(err.message)
      reject(err)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (next) => {
        const value = normalize(next)
        setPermission('granted')
        setPosition(value)
        setError(null)
        resolve(value)
      },
      (nextError) => {
        const message = friendlyError(nextError)
        if (nextError?.code === 1) setPermission('denied')
        setError(message)
        reject(new Error(message))
      },
      OPTIONS
    )
  }), [])

  useEffect(() => () => {
    if (watchId.current != null && 'geolocation' in navigator) navigator.geolocation.clearWatch(watchId.current)
  }, [])

  return { position, error, tracking, permission, start, stop, locateOnce }
}
