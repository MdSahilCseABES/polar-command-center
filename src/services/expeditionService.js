/**
 * EXPEDITION SERVICE
 * ==================
 * Everything the app knows about how expeditions are STORED. The pages know
 * nothing about tables or columns; they call DataContext, and DataContext
 * calls this (master prompt section 13 — keep API logic out of the UI).
 *
 * All five table services in this folder have the same three parts, and the
 * comments explaining WHY live here so the other four can stay short.
 *
 * 1. TABLE — the name in Postgres. Written once.
 *
 * 2. COLUMNS — the list of columns that actually exist.
 *
 *    This is the part that earns the file. Postgres rejects an INSERT
 *    mentioning a column it does not have, with the whole row lost. So if
 *    somebody later adds a screen-only field to an expedition object — a
 *    `selected` flag, a computed `daysLeft` — every save would start failing
 *    for a reason that has nothing to do with saving. toRow() keeps only the
 *    columns in this list, so the database sees exactly what it has room for
 *    and the app is free to carry whatever else it likes.
 *
 * 3. THE THREE CALLS — fetch, insert, update. Each returns { error } or
 *    { rows, error } and never throws, because db.js never throws.
 *
 * WHAT IS NOT HERE: no counting, no filtering, no "is this expedition late".
 * Those are derived values and they are calculated in the UI from the rows.
 * A service that starts answering questions about the data is a service that
 * can disagree with the screen.
 */

import { insertRow, readTable, updateRow, deleteRow } from './db'

export const TABLE = 'expeditions'

const COLUMNS = [
  'id',
  'name',
  'destination',
  'location_id',
  'start_date',
  'end_date',
  'team_size',
  'status',
  'progress',
  'leader',
  'objective',
  'created_at',
]

/** Keep only the columns the table has. See point 2 above. */
export function toRow(record) {
  const row = {}
  for (const column of COLUMNS) {
    if (record[column] !== undefined) row[column] = record[column]
  }
  return row
}

/** Every expedition, oldest ID first. */
export function fetchExpeditions() {
  return readTable(TABLE, 'id')
}

export function insertExpedition(record) {
  return insertRow(TABLE, toRow(record))
}

export function updateExpedition(id, changes) {
  return updateRow(TABLE, id, toRow(changes))
}

export function deleteExpedition(id) {
  return deleteRow(TABLE, id)
}
