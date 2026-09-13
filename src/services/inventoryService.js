/**
 * INVENTORY SERVICE
 * =================
 * How station stock is stored. Same three parts as expeditionService.js.
 *
 * NOTICE WHAT IS *NOT* IN THE COLUMN LIST: there is no `low_stock` column,
 * and there never will be. Low stock is quantity <= minimum_quantity, worked
 * out by stockStatus() every time it is drawn (src/lib/statuses.js).
 *
 * Storing it would mean two places that both claim to know whether an item
 * needs reordering, and the moment a quantity changes without the flag being
 * updated they disagree — with the badge on the screen saying one thing and
 * the dashboard warning saying another. The database holds the two numbers.
 * The answer is derived from them. That is the whole design of this app,
 * and it is the same rule at the database layer as in the UI.
 */

import { insertRow, readTable, updateRow } from './db'

export const TABLE = 'inventory'

const COLUMNS = [
  'id',
  'item_name',
  'category',
  'quantity',
  'minimum_quantity',
  'unit',
  'location',
  'condition',
  'updated_at',
]

export function toRow(record) {
  const row = {}
  for (const column of COLUMNS) {
    if (record[column] !== undefined) row[column] = record[column]
  }
  return row
}

export function fetchInventory() {
  return readTable(TABLE, 'id')
}

export function insertInventoryItem(record) {
  return insertRow(TABLE, toRow(record))
}

export function updateInventoryItem(id, changes) {
  return updateRow(TABLE, id, toRow(changes))
}
