/**
 * PERSONNEL SERVICE
 * =================
 * How the roster is stored. Same three parts as expeditionService.js, which
 * is where the reasoning behind them is written down.
 *
 * The one thing worth noticing here: latitude and longitude are ORDINARY
 * COLUMNS on a person. They are not a live feed. Nothing in this file ever
 * asks a device where anybody is — a coordinate only changes when somebody
 * is reassigned on the Personnel page and updatePerson() copies the new
 * location's coordinates across. The app says so on every screen that shows
 * a position, and it must keep saying so.
 */

import { insertRow, readTable, updateRow } from './db'

export const TABLE = 'personnel'

const COLUMNS = [
  'id',
  'name',
  'role',
  'expedition_id',
  'status',
  'location_id',
  'latitude',
  'longitude',
  'last_updated',
  'blood_group',
  'satphone',
]

export function toRow(record) {
  const row = {}
  for (const column of COLUMNS) {
    if (record[column] !== undefined) row[column] = record[column]
  }
  return row
}

export function fetchPersonnel() {
  return readTable(TABLE, 'id')
}

export function insertPerson(record) {
  return insertRow(TABLE, toRow(record))
}

export function updatePerson(id, changes) {
  return updateRow(TABLE, id, toRow(changes))
}
