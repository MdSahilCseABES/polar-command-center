/**
 * CONTEXT BUILDER FOR POLAR AI ASSISTANT
 * =====================================
 * Dynamically builds a lean, highly relevant context snapshot from the
 * application's actual data state so the AI can answer with 100% precision.
 */

import { formatCoords, timeAgo } from '../utils/format.js'

/**
 * Normalizes query string for keyword inspection
 */
function tokenize(text = '') {
  return String(text).toLowerCase()
}

/**
 * Builds the customized context payload for the LLM request
 */
export function buildAIContext(query, data) {
  if (!data) return {}

  const {
    locations = [],
    expeditions = [],
    personnel = [],
    cargo = [],
    inventory = [],
    emergencies = [],
    stats = {},
  } = data

  const q = tokenize(query)

  // 1. Check for specific Device / Personnel IDs (P-001 to P-099)
  const deviceIdMatches = query.match(/P-\d{2,3}/gi) || []
  const specificPersonnel = []

  if (deviceIdMatches.length > 0) {
    deviceIdMatches.forEach((rawId) => {
      const idUpper = rawId.toUpperCase()
      const found = personnel.find((p) => p.id.toUpperCase() === idUpper)
      if (found) specificPersonnel.push(found)
    })
  }

  // Also check for personnel by name
  if (specificPersonnel.length === 0) {
    personnel.forEach((p) => {
      if (q.includes(p.name.toLowerCase())) {
        specificPersonnel.push(p)
      }
    })
  }

  // 2. Check for Location mentions
  const mentionedLocations = []
  locations.forEach((loc) => {
    if (q.includes(loc.name.toLowerCase()) || q.includes(loc.id.toLowerCase())) {
      mentionedLocations.push(loc)
    }
  })

  // Check for Indian cities often queried (Delhi, Noida, Mumbai, Goa, etc.)
  const isDelhiQueried = q.includes('delhi')
  const isNoidaQueried = q.includes('noida')

  // 3. Detect Query Intent Topics
  const isDeviceQuery =
    deviceIdMatches.length > 0 ||
    specificPersonnel.length > 0 ||
    q.includes('device') ||
    q.includes('personnel') ||
    q.includes('team') ||
    q.includes('member') ||
    q.includes('tracker') ||
    q.includes('gps') ||
    q.includes('who') ||
    q.includes('offline') ||
    q.includes('online') ||
    q.includes('active')

  const isAlertQuery =
    q.includes('alert') ||
    q.includes('emergenc') ||
    q.includes('incident') ||
    q.includes('sos') ||
    q.includes('critical') ||
    q.includes('danger') ||
    q.includes('attention') ||
    q.includes('hazard')

  const isCargoQuery =
    q.includes('cargo') ||
    q.includes('consignment') ||
    q.includes('shipment') ||
    q.includes('delayed') ||
    q.includes('transit') ||
    q.includes('c-')

  const inventoryKeywords = [
    'inventory', 'stock', 'suppl', 'ration', 'i-', 'diesel', 'fuel', 'petrol', 'lpg',
    'gas', 'oxygen', 'cylinder', 'water', 'food', 'medical', 'kit', 'frostbite',
    'beacon', 'sleeping bag', 'track', 'battery', 'oil', 'vial', 'available', 'how much',
    'how many', 'quantity', 'remaining'
  ]
  const isInventoryQuery = inventoryKeywords.some((k) => q.includes(k))

  const isExpeditionQuery =
    q.includes('expedition') ||
    q.includes('mission') ||
    q.includes('maitri') ||
    q.includes('bharati') ||
    q.includes('himadri') ||
    q.includes('progress') ||
    q.includes('summary') ||
    q.includes('overview')

  // 4. Assemble the tailored context
  const context = {
    expedition_overview: {
      active_expeditions_count: stats.expeditionsActive ?? 3,
      total_expeditions_count: stats.expeditionsTotal ?? 5,
      total_field_personnel_count: stats.personnelTotal ?? 16,
      active_personnel_count: stats.personnelDeployed ?? 15,
      open_emergencies_count: stats.emergenciesOpen ?? 3,
      critical_alerts_count: stats.criticalAlerts ?? 4,
      gps_data_notice:
        'Personnel coordinates (P-001 to P-016) are SIMULATED for this mission prototype. Station coordinates (Maitri, Bharati, Himadri) are REAL published positions.',
    },
  }

  // Location Special Notes
  if (isDelhiQueried || isNoidaQueried) {
    context.geographic_coverage_notice =
      'POLAR COMMAND CENTER GEOGRAPHIC SCOPE: The expedition operates solely in polar and maritime support corridors (Antarctica, Arctic, Southern Ocean, Cape Town, and NCPOR Goa). There are ZERO devices, personnel, stations, or operations located in Delhi, Noida, or other non-expedition cities.'
  }

  // Specific Personnel / Device Data
  if (specificPersonnel.length > 0) {
    context.queried_devices = specificPersonnel.map((p) => {
      const loc = locations.find((l) => l.id === p.location_id)
      const exp = expeditions.find((e) => e.id === p.expedition_id)
      return {
        device_id: p.id,
        operator_name: p.name,
        role: p.role,
        operational_status: p.status,
        is_active: p.status === 'ACTIVE',
        is_offline: p.status === 'OFF_DUTY',
        last_reported_time: p.last_updated,
        last_reported_human: timeAgo(p.last_updated),
        coordinates: {
          latitude: p.latitude,
          longitude: p.longitude,
          formatted: formatCoords(p.latitude, p.longitude),
          nature: 'SIMULATED field coordinates',
        },
        stationed_at: loc ? loc.name : p.location_id,
        assigned_expedition: exp ? `${exp.id} - ${exp.name}` : p.expedition_id,
        satphone: p.satphone,
        blood_group: p.blood_group,
      }
    })
  } else if (isDeviceQuery) {
    // Provide full compact list of all 16 tracked field units/personnel
    context.all_devices_roster = personnel.map((p) => {
      const loc = locations.find((l) => l.id === p.location_id)
      return {
        id: p.id,
        name: p.name,
        role: p.role,
        status: p.status,
        is_active: p.status === 'ACTIVE',
        is_offline: p.status === 'OFF_DUTY',
        station: loc ? loc.name : p.location_id,
        latitude: p.latitude,
        longitude: p.longitude,
        coordinates_formatted: formatCoords(p.latitude, p.longitude),
        last_updated: timeAgo(p.last_updated),
      }
    })
  }

  // Emergencies & Alerts
  if (isAlertQuery || emergencies.some((e) => e.status !== 'RESOLVED')) {
    context.active_and_open_emergencies = emergencies
      .filter((e) => e.status !== 'RESOLVED')
      .map((e) => ({
        incident_id: e.id,
        type: e.type,
        severity: e.severity,
        status: e.status,
        location: e.location,
        coordinates: formatCoords(e.latitude, e.longitude),
        assigned_team: e.assigned_team,
        casualty_or_personnel_id: e.personnel_id,
        description: e.description,
        reported_at: timeAgo(e.reported_at),
      }))
  }

  // Stations / Sites
  if (mentionedLocations.length > 0 || isExpeditionQuery) {
    context.expedition_stations_and_sites = (
      mentionedLocations.length > 0 ? mentionedLocations : locations
    ).map((l) => ({
      id: l.id,
      name: l.name,
      type: l.type,
      region: l.region,
      latitude: l.latitude,
      longitude: l.longitude,
      coordinates_formatted: formatCoords(l.latitude, l.longitude),
      coordinates_type: l.type === 'VESSEL' ? 'SIMULATED' : 'REAL PUBLISHED STATION COORDINATE',
      capacity: l.capacity,
    }))
  }

  // Expeditions
  if (isExpeditionQuery) {
    context.expeditions = expeditions.map((e) => ({
      id: e.id,
      name: e.name,
      destination: e.destination,
      status: e.status,
      progress_pct: e.progress,
      leader: e.leader,
      team_size: e.team_size,
      objective: e.objective,
    }))
  }

  // Cargo Attention (Delayed / Critical) and Summary
  if (isCargoQuery || q.includes('attention')) {
    const inTransit = cargo.filter((c) => c.status === 'IN_TRANSIT').length
    const delivered = cargo.filter((c) => c.status === 'DELIVERED').length
    const delayed = cargo.filter((c) => c.status === 'DELAYED').length
    context.cargo_summary = {
      total: cargo.length,
      in_transit: inTransit,
      delivered,
      delayed,
      text_summary: `${inTransit} in transit, ${delivered} delivered, ${delayed} delayed`
    }
    context.cargo_critical_and_delayed = cargo
      .filter((c) => c.status === 'DELAYED' || c.priority === 'CRITICAL')
      .map((c) => ({
        id: c.id,
        item: c.item_name,
        status: c.status,
        priority: c.priority,
        location: c.location,
        destination: c.destination,
        delay_reason: c.delay_reason || 'N/A',
      }))
  }

  // Inventory: Full actual stock & queried matches
  if (true) {
    context.all_inventory = inventory.map((i) => ({
      id: i.id,
      item_name: i.item_name,
      category: i.category,
      quantity: i.quantity,
      unit: i.unit,
      location: i.location,
      minimum_quantity: i.minimum_quantity,
      condition: i.condition,
    }))

    // Match specific item if referenced in query
    context.matched_inventory_items = inventory.filter((item) => {
      const name = item.item_name.toLowerCase()
      const cat = item.category.toLowerCase()
      if (q.includes('diesel') && (name.includes('diesel') || cat.includes('fuel'))) return true
      if (q.includes('oxygen') && name.includes('oxygen')) return true
      if (q.includes('fuel') && (cat.includes('fuel') || name.includes('diesel') || name.includes('lpg'))) return true
      if (q.includes('water') && name.includes('water')) return true
      if (q.includes('food') && (name.includes('food') || name.includes('ration'))) return true
      if (q.includes('medical') && name.includes('medical')) return true
      if (q.includes('sleeping') && name.includes('sleeping')) return true
      if (q.includes('beacon') && name.includes('beacon')) return true
      if (q.includes('oil') && name.includes('oil')) return true
      if (q.includes('lpg') && name.includes('lpg')) return true
      return false
    }).map((i) => ({
      id: i.id,
      item_name: i.item_name,
      quantity: i.quantity,
      unit: i.unit,
      location: i.location
    }))

    context.low_or_out_of_stock_inventory = inventory
      .filter((i) => i.quantity <= i.minimum_quantity)
      .map((i) => ({
        id: i.id,
        item: i.item_name,
        current_quantity: i.quantity,
        minimum_required: i.minimum_quantity,
        location: i.location,
        unit: i.unit,
        condition: i.condition,
      }))
  }

  return context
}
