import { supabase } from '../lib/supabase'
import { describeDbError } from './db'

export const TABLE = 'personnel_locations'

function validPosition(position) {
  const latitude = Number(position?.latitude)
  const longitude = Number(position?.longitude)
  const accuracy = position?.accuracy == null ? null : Number(position.accuracy)
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null
  if (accuracy != null && (!Number.isFinite(accuracy) || accuracy < 0)) return null
  return {
    latitude,
    longitude,
    accuracy,
    altitude: position?.altitude == null ? null : Number(position.altitude),
    heading: position?.heading == null ? null : Number(position.heading),
    speed: position?.speed == null ? null : Number(position.speed),
    recorded_at: new Date(position.timestamp || Date.now()).toISOString(),
  }
}

export function toLocationRow(personnelId, position) {
  const clean = validPosition(position)
  if (!supabase) return { row: null, error: 'Live GPS requires Supabase configuration.' }
  if (!clean) return { row: null, error: 'Invalid GPS coordinates were rejected.' }
  return { row: { personnel_id: personnelId, ...clean }, error: null }
}

export async function recordLocation(personnelId, position) {
  const { row, error } = toLocationRow(personnelId, position)
  if (error) return { error }
  try {
    const { error: insertError } = await supabase.from(TABLE).insert(row)
    if (insertError) return { error: describeDbError(insertError) }

    const patch = {
      latitude: row.latitude,
      longitude: row.longitude,
      last_updated: row.recorded_at,
      gps_source: 'DEVICE',
      gps_accuracy: row.accuracy,
      gps_altitude: row.altitude,
      gps_heading: row.heading,
      gps_speed: row.speed,
    }
    const { error: updateError } = await supabase.from('personnel').update(patch).eq('id', personnelId)
    return { error: updateError ? describeDbError(updateError) : null, row }
  } catch (err) {
    return { error: describeDbError(err) }
  }
}

export async function fetchLocationHistory(personnelId, limit = 200) {
  if (!supabase) return { rows: [], error: 'Live GPS requires Supabase configuration.' }
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('personnel_id', personnelId)
      .order('recorded_at', { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 500))
    return { rows: data || [], error: error ? describeDbError(error) : null }
  } catch (err) {
    return { rows: [], error: describeDbError(err) }
  }
}

export function subscribeToLocations(onChange) {
  if (!supabase) return () => {}
  const channel = supabase
    .channel('personnel-live-gps')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => onChange(payload)
    )
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}
