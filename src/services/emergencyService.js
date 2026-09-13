/**
 * EMERGENCY SERVICE
 * =================
 * How incidents are stored. Same three parts as expeditionService.js.
 *
 * THE TWO TIMESTAMPS THAT ONLY EXIST IF THEY ARE WRITTEN DOWN:
 *   `acknowledged_at` and `resolved_at` are stamped the moment an incident is
 *   picked up and the moment it is closed. Neither can be reconstructed
 *   afterwards from anything else in the row — if they are not saved at the
 *   time, the answer to "how long before somebody responded" is gone for
 *   good. That is the key operational metric for emergency response readiness, so
 *   these two columns are the ones in this whole schema most worth having in
 *   a database rather than in a browser tab.
 *
 * WHAT THIS FILE DELIBERATELY DOES NOT DO:
 *   It does not send an SMS, page a satellite terminal or call anybody. It
 *   writes a row. The master prompt rules real emergency communications out
 *   of this prototype, and pretending otherwise would be the most dangerous
 *   thing this app could get wrong — a console that looks like it alerted a
 *   rescue team when it only wrote to a table. Reporting an incident here
 *   makes it visible to whoever is looking at the console. Nothing more.
 */

import { insertRow, readTable, updateRow } from './db'

export const TABLE = 'emergencies'

const COLUMNS = [
  'id',
  'type',
  'location',
  'location_id',
  'latitude',
  'longitude',
  'severity',
  'description',
  'status',
  'reported_at',
  'acknowledged_at',
  'resolved_at',
  'assigned_team',
  'response_note',
  'personnel_id',
  'expedition_id',
]

export function toRow(record) {
  const row = {}
  for (const column of COLUMNS) {
    if (record[column] !== undefined) row[column] = record[column]
  }
  return row
}

/* Newest first — an incident board is read from the top, and the newest
   incident is the one somebody is standing in. Every other table in this
   folder sorts by id; this is the one that does not, and that is why. */
export function fetchEmergencies() {
  return readTable(TABLE, 'reported_at').then((result) => ({
    ...result,
    rows: [...result.rows].reverse(),
  }))
}

export function insertEmergency(record) {
  return insertRow(TABLE, toRow(record))
}

export function updateEmergency(id, changes) {
  return updateRow(TABLE, id, toRow(changes))
}
