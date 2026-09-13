/**
 * STATUS VOCABULARY & INVENTORY CALCULATIONS
 * ==========================================
 * Portable status definitions and dynamic calculation logic.
 */

export const EXPEDITION_STATUS = {
  PLANNING: { label: 'Planning', tone: 'info' },
  ACTIVE: { label: 'Active', tone: 'ok' },
  COMPLETED: { label: 'Completed', tone: 'muted' },
  SUSPENDED: { label: 'Suspended', tone: 'warn' },
}

export const PERSONNEL_STATUS = {
  ACTIVE: { label: 'Active', tone: 'ok' },
  IN_TRANSIT: { label: 'In Transit', tone: 'info' },
  RESTING: { label: 'Resting', tone: 'blue' },
  EMERGENCY: { label: 'Emergency', tone: 'critical' },
  OFF_DUTY: { label: 'Off Duty', tone: 'muted' },
}

export const CARGO_STATUS = {
  PLANNED: { label: 'Planned', tone: 'muted' },
  LOADED: { label: 'Loaded', tone: 'blue' },
  IN_TRANSIT: { label: 'In Transit', tone: 'info' },
  ARRIVED: { label: 'Arrived', tone: 'ok' },
  DELAYED: { label: 'Delayed', tone: 'alert' },
}

export const PRIORITY = {
  LOW: { label: 'Low', tone: 'muted' },
  MEDIUM: { label: 'Medium', tone: 'blue' },
  HIGH: { label: 'High', tone: 'warn' },
  CRITICAL: { label: 'Critical', tone: 'critical' },
}

export const STOCK_STATUS = {
  AVAILABLE: { label: 'Available', tone: 'ok' },
  LOW_STOCK: { label: 'Low Stock', tone: 'alert' },
  OUT_OF_STOCK: { label: 'Out of Stock', tone: 'critical' },
}

export const CONDITION = {
  NEW: { label: 'New', tone: 'ok' },
  GOOD: { label: 'Good', tone: 'ok' },
  FAIR: { label: 'Fair', tone: 'warn' },
  MAINTENANCE_REQUIRED: { label: 'Needs Maintenance', tone: 'alert' },
  DECOMMISSIONED: { label: 'Decommissioned', tone: 'critical' },
}

export const EMERGENCY_TYPE = {
  MEDICAL: { label: 'Medical Emergency', tone: 'critical' },
  WEATHER: { label: 'Severe Weather', tone: 'alert' },
  EQUIPMENT: { label: 'Equipment Failure', tone: 'warn' },
  COMMUNICATION: { label: 'Comms Blackout', tone: 'info' },
  ENVIRONMENTAL: { label: 'Environmental Hazard', tone: 'alert' },
}

export const EMERGENCY_SEVERITY = {
  LOW: { label: 'Advisory', tone: 'info' },
  MEDIUM: { label: 'Elevated', tone: 'warn' },
  HIGH: { label: 'Severe', tone: 'alert' },
  CRITICAL: { label: 'Critical', tone: 'critical' },
}

export const EMERGENCY_STATUS = {
  REPORTED: { label: 'Reported', tone: 'critical' },
  INVESTIGATING: { label: 'Investigating', tone: 'alert' },
  RESOLVED: { label: 'Resolved', tone: 'ok' },
}

export function stockStatus(item) {
  if (!item) return STOCK_STATUS.OUT_OF_STOCK
  const q = Number(item.quantity ?? item.current_quantity ?? 0)
  const m = Number(item.minimum_quantity ?? item.minimum_stock ?? 0)
  if (q <= 0) return STOCK_STATUS.OUT_OF_STOCK
  if (q < m) return STOCK_STATUS.LOW_STOCK
  return STOCK_STATUS.AVAILABLE
}

export function isLowStock(item) {
  if (!item) return false
  const q = Number(item.quantity ?? item.current_quantity ?? 0)
  const m = Number(item.minimum_quantity ?? item.minimum_stock ?? 0)
  return q < m
}
