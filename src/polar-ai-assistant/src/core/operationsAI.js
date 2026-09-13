/**
 * POLAR OPERATIONS AI BRIDGE
 * ===========================
 * Bridges the comprehensive Operations Intelligence Engine with the AI Chatbot,
 * handling local fallback, context extraction, and map actions.
 */

import { processOperationsQuery, extractMapActions } from './operationsIntelligence.js'
import { processInventoryCommand } from './inventoryActions.js'

export { extractMapActions }

/**
 * Normalizes volume units to litres when possible
 */
function normalizeVolumeToLitres(rawQty, rawUnit) {
  const u = String(rawUnit || '').toLowerCase()
  let numeric = Number(rawQty) || 0
  if (u.includes('kl') || u.includes('kilolitre')) {
    numeric *= 1000
    return { qty: numeric.toLocaleString('en-US'), unit: 'litres' }
  }
  if (u.includes('ml') || u.includes('millilitre')) {
    numeric /= 1000
    return { qty: numeric.toLocaleString('en-US'), unit: 'litres' }
  }
  if (u.includes('gal')) {
    numeric = Math.round(numeric * 3.78541)
    return { qty: numeric.toLocaleString('en-US'), unit: 'litres' }
  }
  if (u.includes('barrel') || u.includes('bbl')) {
    numeric = Math.round(numeric * 158.987)
    return { qty: numeric.toLocaleString('en-US'), unit: 'litres' }
  }
  if (u.includes('litre') || u.includes('liter') || u === 'l') {
    return { qty: numeric.toLocaleString('en-US'), unit: 'litres' }
  }
  return { qty: numeric.toLocaleString('en-US'), unit: rawUnit || 'units' }
}

/**
 * Checks for direct, single-value factual questions and returns concise responses
 */
function formatDirectFactualAnswer(query, context, data = {}) {
  const q = String(query || '').toLowerCase().trim()
  const inventory = (data && data.inventory) || context.all_inventory || context.matched_inventory_items || []
  const cargo = (data && data.cargo) || []
  const expeditions = (data && data.expeditions) || context.expeditions || []
  const personnel = (data && data.personnel) || context.all_devices_roster || []
  const emergencies = (data && data.emergencies) || context.active_and_open_emergencies || []

  // 1. Diesel Stock / Quantity
  if (q.includes('diesel')) {
    const item = inventory.find((i) => i.item_name.toLowerCase().includes('diesel'))
    if (item) {
      const { qty, unit } = normalizeVolumeToLitres(item.quantity, item.unit)
      return `Current available diesel quantity is ${qty} ${unit}.`
    }
  }

  // 2. Fuel Stock (general fuel query)
  if (q.includes('fuel')) {
    const diesel = inventory.find((i) => i.item_name.toLowerCase().includes('diesel'))
    if (diesel) {
      const { qty, unit } = normalizeVolumeToLitres(diesel.quantity, diesel.unit)
      return `Current available fuel quantity is ${qty} ${unit}.`
    }
  }

  // 3. Oxygen Cylinders
  if (q.includes('oxygen') || (q.includes('cylinder') && !q.includes('lpg'))) {
    const item = inventory.find((i) => i.item_name.toLowerCase().includes('oxygen'))
    if (item) {
      const qty = Number(item.quantity).toLocaleString('en-US')
      return `Current available oxygen cylinders are ${qty}.`
    }
  }

  // 4. Potable Water
  if (q.includes('water')) {
    const item = inventory.find((i) => i.item_name.toLowerCase().includes('water'))
    if (item) {
      const { qty, unit } = normalizeVolumeToLitres(item.quantity, item.unit)
      return `Current available potable water quantity is ${qty} ${unit}.`
    }
  }

  // 5. Medical Kits
  if (q.includes('medical kit') || q.includes('medicine')) {
    const item = inventory.find((i) => i.item_name.toLowerCase().includes('medical kit'))
    if (item) {
      const qty = Number(item.quantity).toLocaleString('en-US')
      return `Current available medical kits quantity is ${qty} ${item.unit}.`
    }
  }

  return null
}

/**
 * Generates an operational response based on the query and current application telemetry
 */
export function generateLocalOperationsReply(query, context = {}, data = {}) {
  // Check for short, direct factual answers first
  const directAnswer = formatDirectFactualAnswer(query, context, data)
  if (directAnswer) {
    return directAnswer
  }

  const q = String(query || '').toLowerCase().trim()
  const overview = context.expedition_overview || {}
  const queriedDevices = context.queried_devices || []
  const emergencies = context.active_and_open_emergencies || []

  // Out-of-theater check (Delhi, Noida, etc.)
  if (context.geographic_coverage_notice || q.includes('delhi') || q.includes('noida')) {
    return (
      '**Polar Command Center Operational Scope Notice**\n\n' +
      'The Polar Expedition Logistics System operates exclusively within polar scientific corridors and maritime staging bases:\n' +
      '- **Antarctica**: Maitri Station, Bharati Station, Dakshin Gangotri\n' +
      '- **Arctic**: Himadri Station (Ny-Ålesund, Svalbard)\n' +
      '- **Support Corridors**: Southern Ocean transit & NCPOR HQ (Goa)\n\n' +
      '⚠️ **Zero expedition assets or field personnel are deployed in ' + (q.includes('delhi') ? 'Delhi' : 'Noida') + '.**'
    )
  }

  // Specific device or personnel query
  if (queriedDevices.length > 0) {
    if (queriedDevices.length === 1 && !q.includes('detail') && !q.includes('report')) {
      const d = queriedDevices[0]
      const coords = d.coordinates?.formatted || 'coordinates pending'
      return `${d.device_id} ${d.operator_name} (${d.role}) is currently ${d.operational_status} at ${d.stationed_at} (${coords}). [MAP_ACTION:person:${d.device_id}:${d.operator_name}]`
    }
    const lines = queriedDevices.map((d) => {
      const statusBadge = d.is_active ? '🟢 ACTIVE' : '🔴 ' + d.operational_status
      const mapTag = '[MAP_ACTION:person:' + d.device_id + ':' + d.operator_name + ']'
      return (
        '### Device Telemetry: ' + d.device_id + ' (' + d.operator_name + ')\n' +
        '- **Role**: ' + d.role + '\n' +
        '- **Station / Base**: ' + d.stationed_at + '\n' +
        '- **Operational Status**: ' + statusBadge + '\n' +
        '- **Field Coordinates**: `' + (d.coordinates?.formatted || 'Unknown') + '` *(Simulated GPS Telemetry)*\n' +
        '- **Last Telemetry Signal**: ' + (d.last_reported_human || 'Recent') + '\n' +
        '- **Satphone**: `' + (d.satphone || 'N/A') + '` | **Blood Group**: ' + (d.blood_group || 'N/A') + '\n' +
        '- **Map Locator**: ' + mapTag
      )
    })
    return lines.join('\n\n')
  }

  // Emergency / Alert Query
  const isEmergencyQuery =
    q.includes('emergenc') ||
    q.includes('alert') ||
    q.includes('incident') ||
    q.includes('sos') ||
    q.includes('danger') ||
    q.includes('hazard')

  if (isEmergencyQuery) {
    if (emergencies.length === 0) {
      return '**Emergency Dispatch Report**: All operational sectors reporting nominal. There are zero active emergencies across Maitri, Bharati, and Himadri.'
    }
    let body = '🚨 **Active Polar Emergencies & Priority Alerts (' + emergencies.length + ')**\n\n'
    emergencies.forEach((e) => {
      const sevIcon = e.severity === 'CRITICAL' ? '🔴' : '⚠️'
      body += '- ' + sevIcon + ' **' + e.incident_id + ' [' + e.type + ']**: ' + e.location + ' (`' + e.coordinates + '`)\n'
      body += '  - **Description**: ' + e.description + '\n'
      body += '  - **Status**: `' + e.status + '` | **Assigned Team**: ' + (e.assigned_team || 'Unassigned') + '\n'
      body += '  - **Action**: [MAP_ACTION:incident:' + e.incident_id + ':' + e.location + ']\n\n'
    })
    return body
  }

  return (
    `**Polar Command Center Operational Status**\n\n` +
    `- **Active Expeditions**: ${overview.active_expeditions_count || 3} ongoing science programmes\n` +
    `- **Deployed Personnel**: ${overview.total_deployed_personnel || 15} field operators reporting active telemetry\n` +
    `- **Open Alerts**: ${overview.critical_alerts_count || 3} incidents active\n` +
    `- **Stations Online**: Maitri Station, Bharati Station, Himadri Station, Dakshin Gangotri\n\n` +
    `Ask about any specific mission (e.g., *"Which mission is closest to completion?"*), personnel, cargo, inventory, or weather.`
  )
}

/**
 * Executes local operational AI response with full multi-module intelligence and map tags
 */
export async function executeOperationsAI(query, history = [], context = {}, data = {}, session = {}) {
  // First, run the comprehensive Operational Intelligence engine
  const opResult = await processOperationsQuery(query, data, session)
  if (opResult && opResult.handled) {
    return {
      reply: opResult.reply,
      actions: opResult.actions || [],
      model: 'polar-operations-engine',
      sessionContext: opResult.sessionContext,
    }
  }

  // Fallback to local operations reply generator
  const replyText = generateLocalOperationsReply(query, context, data)
  const { cleanedText, actions } = extractMapActions(replyText)

  return {
    reply: cleanedText,
    actions,
    model: 'polar-operations-engine',
    sessionContext: session,
  }
}
