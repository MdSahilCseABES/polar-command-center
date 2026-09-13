/**
 * CARGO SERVICE
 * =============
 * How consignments are stored. Same three parts as expeditionService.js.
 *
 * `delay_reason` is in the column list even though most rows never have one.
 * It is the field a logistics officer types into when a consignment goes
 * DELAYED, and it is the difference between a red badge that says nothing and
 * a red badge that says "grounded at Novo, crosswinds above rotary-wing
 * limits". Losing it on save would quietly remove the most useful sentence on
 * the page.
 */

import { insertRow, readTable, updateRow } from './db'

export const TABLE = 'cargo'

const COLUMNS = [
  'id',
  'item_name',
  'category',
  'quantity',
  'unit',
  'location',
  'destination',
  'status',
  'priority',
  'expedition_id',
  'weight_kg',
  'delay_reason',
  'created_at',
]

export function toRow(record) {
  const row = {}
  for (const column of COLUMNS) {
    if (record[column] !== undefined) row[column] = record[column]
  }
  return row
}

export function fetchCargo() {
  return readTable(TABLE, 'id')
}

export function insertCargo(record) {
  return insertRow(TABLE, toRow(record))
}

export function updateCargo(id, changes) {
  return updateRow(TABLE, id, toRow(changes))
}
