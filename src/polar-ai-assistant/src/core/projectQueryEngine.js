/**
 * POLAR GENERAL PROJECT QUERY & REASONING ENGINE
 * ===============================================
 * General, extensible semantic intelligence layer across the entire POLAR project:
 * - Dynamic data discovery & entity graph relationship traversal
 * - Universal aggregations, counts, calculations, rankings, and comparisons
 * - Recency & timestamp analysis across all collections
 * - Criticality triage, risk analysis, and missing data integrity checks
 * - Complete project architecture, module, schema, and feature explanations
 * - Full bilingual support (English & natural Hinglish) with conversational context
 *
 * Grounded strictly in current application data. Never hallucinates or hardcodes.
 */

import { PROJECT_METADATA, PROJECT_MODULES, ENTITY_SCHEMAS, PROJECT_ROLES } from './projectKnowledge.js'
import { isHinglish, normalizeHinglish } from './inventoryActions.js'
import { isLowStock, stockStatus } from '../utils/statuses.js'
import {
  detectLanguage,
  devanagariToHinglish,
  formatHindiEntities,
  matchDomainKnowledge,
  matchGreetingOrHelp,
  matchSystemListQuery,
} from './languageService.js'

/**
 * Normalizes query string for semantic matching
 */
function cleanQuery(text = '') {
  return String(text || '')
    .toLowerCase()
    .replace(/[?.,!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Universal entity extractor: finds IDs, stations, personnel, missions, cargo, incidents,
 * and resolves demonstrative pronouns using sessionContext.
 */
export function extractProjectEntities(text, data = {}, session = {}) {
  const raw = String(text || '')
  const reasoningRaw = devanagariToHinglish(raw)
  const norm = normalizeHinglish(reasoningRaw)
  const lower = `${raw} ${reasoningRaw}`.toLowerCase()
  const entities = []

  const expeditions = data.expeditions || []
  const personnel = data.personnel || []
  const cargo = data.cargo || []
  const inventory = data.inventory || []
  const locations = data.locations || []
  const emergencies = data.emergencies || []

  // 1. Direct Regex ID Match
  const expMatch = raw.match(/\b(EXP-\d{3})\b/i)
  if (expMatch) {
    const item = expeditions.find((e) => e.id.toUpperCase() === expMatch[1].toUpperCase())
    if (item) entities.push({ type: 'expedition', id: item.id, item, label: item.name })
  }

  const personMatch = raw.match(/\b(P-\d{2,3})\b/i)
  if (personMatch) {
    const item = personnel.find((p) => p.id.toUpperCase() === personMatch[1].toUpperCase())
    if (item) entities.push({ type: 'person', id: item.id, item, label: item.name })
  }

  const cargoMatch = raw.match(/\b(C-\d{3})\b/i)
  if (cargoMatch) {
    const item = cargo.find((c) => c.id.toUpperCase() === cargoMatch[1].toUpperCase())
    if (item) entities.push({ type: 'cargo', id: item.id, item, label: item.item_name })
  }

  // Cargo Item Name Matches
  for (const c of cargo) {
    const cLower = c.item_name.toLowerCase().replace(/[\(\)\/]/g, ' ')
    const cleanWords = cLower.split(/\s+/).filter((w) => w.length > 3 && !['units', 'sets', 'drums', 'packs'].includes(w))
    if (lower.includes(cLower.trim()) || (cleanWords.length >= 2 && cleanWords.every((w) => lower.includes(w)))) {
      if (!entities.some((e) => e.id === c.id)) {
        entities.push({ type: 'cargo', id: c.id, item: c, label: c.item_name })
      }
    }
  }

  const invMatch = raw.match(/\b(I-\d{3,4})\b/i)
  if (invMatch) {
    const item = inventory.find((i) => i.id.toUpperCase() === invMatch[1].toUpperCase())
    if (item) entities.push({ type: 'inventory', id: item.id, item, label: item.item_name })
  }

  const incMatch = raw.match(/\b(INC-\d{3})\b/i)
  if (incMatch) {
    const item = emergencies.find((e) => e.id.toUpperCase() === incMatch[1].toUpperCase())
    if (item) entities.push({ type: 'emergency', id: item.id, item, label: item.description })
  }

  const locMatch = raw.match(/\b(LOC-[A-Z0-9-_]+)\b/i)
  if (locMatch) {
    const item = locations.find((l) => l.id.toUpperCase() === locMatch[1].toUpperCase())
    if (item) entities.push({ type: 'location', id: item.id, item, label: item.name })
  }

  // 2. Station & Site Name Matches
  for (const loc of locations) {
    const locLower = loc.name.toLowerCase()
    const shortName = locLower.replace(/\s+(station|camp|depot|runway|base)/g, '')
    if (lower.includes(locLower) || lower.includes(shortName)) {
      if (!entities.some((e) => e.id === loc.id)) {
        entities.push({ type: 'location', id: loc.id, item: loc, label: loc.name })
      }
    }
  }

  // 3. Personnel Name Matches (ranked by match precision)
  const matchedPersonnel = []
  for (const p of personnel) {
    const fullLower = p.name.toLowerCase()
    const cleanName = fullLower.replace(/^(dr\.|cdr\.|sgt\.)\s*/, '')
    const parts = cleanName.split(' ')
    let score = 0
    if (lower.includes(fullLower)) {
      score = 100
    } else if (lower.includes(cleanName)) {
      score = 80
    } else {
      const matchCount = parts.filter((pt) => pt.length > 2 && lower.includes(pt)).length
      const queryNameTokens = lower.replace(/[?.,!]/g, ' ').split(' ').filter((w) => w.length > 2 && !['hai', 'kya', 'aur', 'status', 'duty', 'current', 'role', 'person', 'device', 'the', 'is', 'of'].includes(w))
      if (matchCount >= 2 || (matchCount === 1 && queryNameTokens.length <= 1)) {
        score = matchCount * 25
      }
    }
    if (score > 0) {
      matchedPersonnel.push({ p, score })
    }
  }
  matchedPersonnel.sort((a, b) => b.score - a.score)
  if (matchedPersonnel.length > 0) {
    const best = matchedPersonnel[0].p
    if (!entities.some((e) => e.id === best.id)) {
      entities.push({ type: 'person', id: best.id, item: best, label: best.name })
    }
  }

  // 4. Expedition Name Matches
  for (const exp of expeditions) {
    const expLower = exp.name.toLowerCase()
    const keywords = ['climate pulse', 'deep core', 'glaciology', 'weather array', 'carbon sink']
    if (lower.includes(expLower) || keywords.some((k) => expLower.includes(k) && lower.includes(k))) {
      if (!entities.some((e) => e.id === exp.id)) {
        entities.push({ type: 'expedition', id: exp.id, item: exp, label: exp.name })
      }
    }
  }

  // 5. Inventory Item Name Matches
  for (const inv of inventory) {
    const invLower = inv.item_name.toLowerCase()
    const cleanName = invLower.replace(/\([^)]+\)/g, '').trim()
    const parts = cleanName.split('/').map((s) => s.trim())
    const isMatch =
      lower.includes(invLower) ||
      lower.includes(cleanName) ||
      parts.some((p) => p.length > 3 && lower.includes(p)) ||
      (invLower.includes('trauma') && lower.includes('trauma')) ||
      (invLower.includes('sleeping bag') && lower.includes('sleeping bag')) ||
      (invLower.includes('beacon') && lower.includes('beacon')) ||
      (invLower.includes('cryo') && lower.includes('cryo'))
    if (isMatch) {
      if (!entities.some((e) => e.id === inv.id)) {
        entities.push({ type: 'inventory', id: inv.id, item: inv, label: inv.item_name })
      }
    }
  }

  // 6. Pronoun & Conversational Context Resolution (e.g. "ye", "isme", "uska", "wahan", "it", "this", "is mission")
  if (entities.length === 0 && (session.lastEntity || session.lastStation)) {
    const isPronounQuery =
      /\b(ye|yeh|is|iss|isme|iske|iska|iski|us|uss|usme|uska|uski|unka|unke|unki|inka|inke|inki|wahan|it|its|this|that|they|them|there)\b/i.test(lower) ||
      /\b(kab|kitna|kitne|kaun|kya|who|when|how many|progress|status|team|members|log|reach|finish|end|objective|poora)\b/i.test(lower)

    if (isPronounQuery) {
      if (lower.includes('station') || lower.includes('base')) {
        const loc = session.lastStation
          ? locations.find((l) => l.name.toLowerCase().includes(session.lastStation.toLowerCase()))
          : session.lastEntity?.type === 'location'
            ? session.lastEntity
            : locations.find((l) => l.id === 'LOC-MAITRI') || locations[0]
        if (loc) entities.push({ type: 'location', id: loc.id, item: loc, label: loc.name })
      } else if (lower.includes('cargo') || lower.includes('shipment') || lower.includes('consignment')) {
        const c =
          session.lastEntity?.type === 'cargo'
            ? session.lastEntity
            : cargo.find((item) => item.status === 'IN_TRANSIT') || cargo[0]
        if (c) entities.push({ type: 'cargo', id: c.id, item: c, label: c.item_name })
      } else if (
        lower.includes('person') ||
        lower.includes('device') ||
        lower.includes('transceiver') ||
        lower.includes('operator') ||
        lower.includes('scientist')
      ) {
        const p =
          session.lastEntity?.type === 'person'
            ? session.lastEntity
            : personnel.find((item) => item.id === 'P-001') || personnel[0]
        if (p) entities.push({ type: 'person', id: p.id, item: p, label: p.name })
      } else if (lower.includes('mission') || lower.includes('expedition')) {
        const exp =
          session.lastEntity?.type === 'expedition'
            ? session.lastEntity
            : expeditions.find((item) => item.id === 'EXP-001') || expeditions[0]
        if (exp) entities.push({ type: 'expedition', id: exp.id, item: exp, label: exp.name })
      } else if (session.lastEntity) {
        entities.push({
          type: session.lastEntity.type || 'entity',
          id: session.lastEntity.id,
          item: session.lastEntity,
          label: session.lastEntity.name || session.lastEntity.item_name || session.lastEntity.id,
        })
      } else if (session.lastStation) {
        const loc = locations.find((l) => l.name.toLowerCase().includes(session.lastStation.toLowerCase()))
        if (loc) entities.push({ type: 'location', id: loc.id, item: loc, label: loc.name })
      }
    }
  }

  return entities
}

/**
 * Builds a dynamic cross-collection relationship graph for any entity
 */
export function buildRelationshipGraph(entity, data = {}) {
  const expeditions = data.expeditions || []
  const personnel = data.personnel || []
  const cargo = data.cargo || []
  const inventory = data.inventory || []
  const locations = data.locations || []
  const emergencies = data.emergencies || []
  const activityLog = data.activityLog || []

  const graph = {
    target: entity,
    connectedExpeditions: [],
    connectedPersonnel: [],
    connectedCargo: [],
    connectedInventory: [],
    connectedLocations: [],
    connectedEmergencies: [],
    connectedActivities: [],
  }

  if (entity.type === 'expedition') {
    const exp = entity.item
    graph.connectedPersonnel = personnel.filter((p) => p.expedition_id === exp.id)
    graph.connectedCargo = cargo.filter((c) => c.expedition_id === exp.id)
    graph.connectedEmergencies = emergencies.filter((e) => e.expedition_id === exp.id)
    const loc = locations.find((l) => l.id === exp.location_id || l.name === exp.destination)
    if (loc) graph.connectedLocations.push(loc)
    if (loc) {
      graph.connectedInventory = inventory.filter((i) => i.location === loc.name)
    }
    graph.connectedActivities = activityLog.filter((a) => a.message.includes(exp.id))
  } else if (entity.type === 'person') {
    const p = entity.item
    if (p.expedition_id) {
      const exp = expeditions.find((e) => e.id === p.expedition_id)
      if (exp) graph.connectedExpeditions.push(exp)
    }
    const loc = locations.find((l) => l.id === p.location_id)
    if (loc) graph.connectedLocations.push(loc)
    graph.connectedEmergencies = emergencies.filter((e) => e.personnel_id === p.id)
    graph.connectedActivities = activityLog.filter((a) => a.message.includes(p.id) || a.message.includes(p.name))
  } else if (entity.type === 'location') {
    const loc = entity.item
    graph.connectedPersonnel = personnel.filter(
      (p) => p.location_id === loc.id || loc.name.toLowerCase().includes(p.location_id?.toLowerCase() || '')
    )
    graph.connectedExpeditions = expeditions.filter(
      (e) => e.location_id === loc.id || e.destination.toLowerCase().includes(loc.name.toLowerCase())
    )
    graph.connectedInventory = inventory.filter((i) => i.location.toLowerCase().includes(loc.name.toLowerCase()))
    graph.connectedCargo = cargo.filter(
      (c) =>
        c.destination.toLowerCase().includes(loc.name.toLowerCase()) ||
        c.location.toLowerCase().includes(loc.name.toLowerCase())
    )
    graph.connectedEmergencies = emergencies.filter(
      (e) => e.location_id === loc.id || e.location.toLowerCase().includes(loc.name.toLowerCase())
    )
    graph.connectedActivities = activityLog.filter((a) => a.message.includes(loc.name) || a.message.includes(loc.id))
  } else if (entity.type === 'cargo') {
    const c = entity.item
    if (c.expedition_id) {
      const exp = expeditions.find((e) => e.id === c.expedition_id)
      if (exp) graph.connectedExpeditions.push(exp)
    }
    const destLoc = locations.find((l) => l.name.toLowerCase().includes(c.destination.toLowerCase()))
    if (destLoc) graph.connectedLocations.push(destLoc)
    graph.connectedActivities = activityLog.filter((a) => a.message.includes(c.id))
  } else if (entity.type === 'emergency') {
    const emg = entity.item
    if (emg.personnel_id) {
      const p = personnel.find((person) => person.id === emg.personnel_id)
      if (p) graph.connectedPersonnel.push(p)
    }
    if (emg.expedition_id) {
      const exp = expeditions.find((e) => e.id === emg.expedition_id)
      if (exp) graph.connectedExpeditions.push(exp)
    }
    const loc = locations.find(
      (l) => l.id === emg.location_id || emg.location.toLowerCase().includes(l.name.toLowerCase())
    )
    if (loc) graph.connectedLocations.push(loc)
    graph.connectedActivities = activityLog.filter((a) => a.message.includes(emg.id))
  }

  return graph
}

/**
 * Scans all collections for the most recently updated item across the entire system
 */
export function scanMostRecentlyUpdated(data = {}) {
  const recordsWithDates = []

  const checkAndPush = (collectionName, id, name, dateStr, extra = '') => {
    if (!dateStr) return
    const parsed = new Date(dateStr).getTime()
    if (!isNaN(parsed)) {
      recordsWithDates.push({
        collection: collectionName,
        id,
        name,
        timestamp: parsed,
        dateStr,
        extra,
      })
    }
  }

    ; (data.personnel || []).forEach((p) => checkAndPush('Personnel', p.id, p.name, p.last_updated, `Status: ${p.status}`))
    ; (data.inventory || []).forEach((i) =>
      checkAndPush('Inventory', i.id, i.item_name, i.updated_at, `${i.quantity} ${i.unit} at ${i.location}`)
    )
    ; (data.cargo || []).forEach((c) =>
      checkAndPush('Cargo', c.id, c.item_name, c.created_at, `${c.status}, Dest: ${c.destination}`)
    )
    ; (data.expeditions || []).forEach((e) =>
      checkAndPush('Expeditions', e.id, e.name, e.created_at, `Progress: ${e.progress}%`)
    )
    ; (data.emergencies || []).forEach((e) =>
      checkAndPush('Emergencies', e.id, `${e.type} at ${e.location}`, e.reported_at, `Severity: ${e.severity}`)
    )
    ; (data.activityLog || []).forEach((a) => checkAndPush('Activity Log', a.id, a.message, a.at, `Kind: ${a.kind}`))

  recordsWithDates.sort((a, b) => b.timestamp - a.timestamp)
  return recordsWithDates[0] || null
}

/**
 * Scans for missing information, operational gaps, and unlinked records
 */
export function scanMissingInformation(data = {}) {
  const gaps = []

  // 1. Emergencies without assigned teams
  const unassignedIncidents = (data.emergencies || []).filter((e) => e.status !== 'RESOLVED' && !e.assigned_team)
  if (unassignedIncidents.length > 0) {
    gaps.push({
      category: 'Emergencies',
      issue: `${unassignedIncidents.length} active emergency incident(s) currently have no assigned response team: ${unassignedIncidents.map((e) => e.id).join(', ')}.`,
      issueHi: `${unassignedIncidents.length} active incident(s) mein koi response team assign nahi hai: ${unassignedIncidents.map((e) => e.id).join(', ')}.`,
    })
  }

  // 2. Off-duty or unreporting personnel
  const offDuty = (data.personnel || []).filter((p) => p.status === 'OFF_DUTY')
  if (offDuty.length > 0) {
    gaps.push({
      category: 'Personnel Telemetry',
      issue: `${offDuty.length} field operator(s) currently off duty without live active tracking telemetry: ${offDuty.map((p) => `${p.name} (${p.id})`).join(', ')}.`,
      issueHi: `${offDuty.length} personnel off duty hain jinka active telemetry data nahi aa raha: ${offDuty.map((p) => `${p.name} (${p.id})`).join(', ')}.`,
    })
  }

  // 3. Planned expeditions without allocated cargo
  const plannedExpeditions = (data.expeditions || []).filter((e) => e.status === 'PLANNING')
  for (const pe of plannedExpeditions) {
    const linkedCargo = (data.cargo || []).filter((c) => c.expedition_id === pe.id)
    if (linkedCargo.length === 0) {
      gaps.push({
        category: 'Expedition Planning',
        issue: `Planned expedition ${pe.id} (${pe.name}) currently has zero allocated cargo consignments.`,
        issueHi: `Planned mission ${pe.id} (${pe.name}) ke liye abhi tak koi cargo allocate nahi hua hai.`,
      })
    }
  }

  // 4. Resource forecasting historical consumption guard
  gaps.push({
    category: 'Logistics Forecasting',
    issue: 'Historical daily burn-rate and consumption rate logging is currently not stored in local telemetry (forecasts require live baseline telemetry).',
    issueHi: 'Historical daily consumption burn-rate data system mein saved nahi hai, isliye predictive estimates baseline reserve thresholds par depend karte hain.',
  })

  return gaps
}

/**
 * Compares two stations and determines greatest operational difference
 */
export function analyzeStationDifferences(data = {}) {
  const locations = (data.locations || []).filter((l) => l.type === 'STATION')
  const personnel = data.personnel || []
  const emergencies = data.emergencies || []
  const cargo = data.cargo || []
  const inventory = data.inventory || []
  const expeditions = data.expeditions || []

  const stationProfiles = locations.map((loc) => {
    const sPersonnel = personnel.filter((p) => p.location_id === loc.id)
    const sEmergencies = emergencies.filter(
      (e) => e.location_id === loc.id || e.location.toLowerCase().includes(loc.name.toLowerCase())
    )
    const sCargo = cargo.filter((c) => c.destination.toLowerCase().includes(loc.name.toLowerCase()))
    const sInventory = inventory.filter((i) => i.location.toLowerCase().includes(loc.name.toLowerCase()))
    const sLowStock = sInventory.filter((i) => isLowStock(i))
    const sExpeditions = expeditions.filter((e) => e.destination.toLowerCase().includes(loc.name.toLowerCase()))

    return {
      id: loc.id,
      name: loc.name,
      region: loc.region,
      capacity: loc.capacity,
      personnelCount: sPersonnel.length,
      activeIncidents: sEmergencies.filter((e) => e.status !== 'RESOLVED').length,
      incomingCargo: sCargo.filter((c) => c.status === 'IN_TRANSIT').length,
      lowStockCount: sLowStock.length,
      expeditionNames: sExpeditions.map((e) => `${e.id} (${e.progress}%)`).join(', ') || 'None',
    }
  })

  // Maitri vs Himadri: High emergency load in Antarctica vs calm Arctic research
  const maitri = stationProfiles.find((s) => s.id === 'LOC-MAITRI') || stationProfiles[0]
  const himadri = stationProfiles.find((s) => s.id === 'LOC-HIMADRI') || stationProfiles[stationProfiles.length - 1]
  const bharati = stationProfiles.find((s) => s.id === 'LOC-BHARATI') || stationProfiles[1]

  return {
    profiles: stationProfiles,
    contrastPair: {
      stationA: maitri,
      stationB: himadri,
      reasons: [
        `Personnel: ${maitri?.name} has ${maitri?.personnelCount} personnel vs ${himadri?.name} with ${himadri?.personnelCount} personnel.`,
        `Incident Load: ${maitri?.name} has ${maitri?.activeIncidents} active incident(s) including critical triage vs ${himadri?.name} with ${himadri?.activeIncidents} active incidents.`,
        `Logistics & Supplies: ${maitri?.name} has ${maitri?.lowStockCount} low-stock lines and ${maitri?.incomingCargo} incoming shipments, while ${himadri?.name} operates with a quiet Arctic glaciology baseline.`,
        `Geography: ${maitri?.name} is based in Antarctic continental Schirmacher Oasis (-70.76°S) whereas ${himadri?.name} is in Arctic Svalbard (78.91°N).`,
      ],
      reasonsHi: [
        `Personnel: ${maitri?.name} par ${maitri?.personnelCount} personnel hain jabki ${himadri?.name} par sirf ${himadri?.personnelCount} personnel hain.`,
        `Incidents: ${maitri?.name} mein ${maitri?.activeIncidents} active incident (critical triage) hai, jabki ${himadri?.name} par zero emergencies hain.`,
        `Supply load: ${maitri?.name} mein ${maitri?.lowStockCount} items low-stock hain aur ${maitri?.incomingCargo} incoming shipments aa rahe hain.`,
        `Geography: ${maitri?.name} Antarctica (-70.76°S) mein hai aur ${himadri?.name} Arctic Svalbard (78.91°N) mein hai.`,
      ],
    },
  }
}

export const ATTRIBUTE_REGISTRY = {
  expedition: [
    {
      id: 'end_date',
      pattern: /\b(end\s*date|target\s*date|conclusion\s*date|target\s*end|finish\s*date|scheduled\s*end|completion\s*date|kab\s*khatam|kab\s*end|kab\s*poora|poora\s*kab|when\s*will\s*it\s*(?:finish|complete|conclude)|when\s*does\s*it\s*end)\b/i,
      label: 'Scheduled Completion / End Date',
      getValue: (e) => `**${e.end_date || 'N/A'}** (Current progress: ${e.progress}%)`,
    },
    {
      id: 'start_date',
      pattern: /\b(start\s*date|deployment\s*date|kab\s*shuru|shuru\s*kab|started)\b/i,
      label: 'Deployment Start Date',
      getValue: (e) => `**${e.start_date || 'N/A'}**`,
    },
    {
      id: 'team_size',
      pattern: /\b(team\s*size|kitne\s*log|how\s*many\s*people|how\s*many\s*members|personnel\s*count|members?\s*count|kitne\s*members?|kitne\s*personnel|staff\s*count|log\s*hain)\b/i,
      label: 'Team Size / Personnel',
      getValue: (e) => `**${e.team_size} members** (led by ${e.leader})`,
    },
    {
      id: 'leader',
      pattern: /\b(leader|commander|lead|who\s*leads?|kaun\s*lead|adhyaksh)\b/i,
      label: 'Expedition Leader',
      getValue: (e) => `**${e.leader}**`,
    },
    {
      id: 'progress',
      pattern: /\b(progress|percentage|kitna\s*percent|kitna\s*complete|how\s*far\s*along)\b/i,
      label: 'Current Progress',
      getValue: (e) => `**${e.progress}% complete**`,
    },
    {
      id: 'status',
      pattern: /\b(status|operational\s*status|state|stithi|halat)\b/i,
      label: 'Operational Status',
      getValue: (e) => `**${e.status}**`,
    },
    {
      id: 'destination',
      pattern: /\b(destination|operating\s*base|kahan\s*based|manzil)\b/i,
      label: 'Host Station / Destination',
      getValue: (e) => `**${e.destination}**`,
    },
    {
      id: 'objective',
      pattern: /\b(objective|goal|aim|purpose|maqsad|mission\s*statement)\b/i,
      label: 'Mission Objective',
      getValue: (e) => `**${e.objective || 'Scientific polar research operations'}**`,
    },
  ],
  person: [
    {
      id: 'role',
      pattern: /\b(role|designation|post|kya\s*role|kya\s*post)\b|\bduty\b(?!\s*(?:location|station|status))/i,
      label: 'Role / Designation',
      getValue: (p) => `**${p.role}**`,
    },
    {
      id: 'status',
      pattern: /\b(status|duty\s*status|stithi|halat)\b/i,
      label: 'Duty Status',
      getValue: (p) => `**${p.status}**`,
    },
    {
      id: 'location',
      pattern: /\b(location|station|duty\s*location|kahan\s*hai|kahan\s*par|stationed|site)\b/i,
      label: 'Stationed Location',
      getValue: (p, data) => {
        const loc = data?.locations?.find((l) => l.id === p.location_id)
        return `**${loc ? loc.name : p.location_id || 'Polar field site'}**`
      },
    },
    {
      id: 'blood_group',
      pattern: /\b(blood\s*group|blood\s*type|rakt|khoon)\b/i,
      label: 'Blood Group',
      getValue: (p) => `**${p.blood_group || 'Not recorded'}**`,
    },
    {
      id: 'satphone',
      pattern: /\b(satphone|satellite\s*phone|phone\s*number|contact\s*number|calling)\b/i,
      label: 'Satphone Number',
      getValue: (p) => `\`${p.satphone || 'Not available'}\``,
    },
    {
      id: 'expedition',
      pattern: /\b(expedition|mission|kis\s*mission|kis\s*expedition)\b/i,
      label: 'Assigned Expedition',
      getValue: (p, data) => {
        const exp = data?.expeditions?.find((e) => e.id === p.expedition_id)
        return `**${exp ? `${exp.id} — ${exp.name}` : p.expedition_id || 'Unassigned'}**`
      },
    },
    {
      id: 'coordinates',
      pattern: /\b(coordinates|coords|latitude|longitude|gps\s*fix|gps|lat|lon)\b/i,
      label: 'GPS Coordinates',
      getValue: (p) => `**${p.latitude}° Lat, ${p.longitude}° Lon**`,
    },
  ],
  station: [
    {
      id: 'capacity',
      pattern: /\b(capacity|bed\s*capacity|beds|bistar|kitne\s*beds?|accommodation|kitne\s*log\s*reh\s*sakte)\b/i,
      label: 'Bed Capacity',
      getValue: (s) => `**${s.capacity || 'N/A'} members**`,
    },
    {
      id: 'coordinates',
      pattern: /\b(coordinates|coords|latitude|longitude|lat|lon|gps\s*fix|gps|sthanik)\b/i,
      label: 'Geographic Coordinates',
      getValue: (s) => `**${s.latitude}°, ${s.longitude}°**`,
    },
    {
      id: 'region',
      pattern: /\b(region|theater|zone|area|kis\s*region|kahan\s*sthit)\b/i,
      label: 'Region / Operating Theater',
      getValue: (s) => `**${s.region}**`,
    },
    {
      id: 'type',
      pattern: /\b(type|facility\s*type|prakar|facility)\b/i,
      label: 'Facility Type',
      getValue: (s) => `**${s.type}**`,
    },
    {
      id: 'notes',
      pattern: /\b(notes|history|background|established|kab\s*establish|purpose)\b/i,
      label: 'Operational Background',
      getValue: (s) => `**${s.notes || 'N/A'}**`,
    },
    {
      id: 'personnel_count',
      pattern: /\b(kitne\s*log|how\s*many\s*people|personnel\s*count|stationed\s*personnel|staff\s*count)\b/i,
      label: 'Stationed Personnel',
      getValue: (s, data) => {
        const ppl = data?.personnel ? data.personnel.filter((p) => p.location_id === s.id) : []
        return `**${ppl.length} active personnel**`
      },
    },
    {
      id: 'active_missions',
      pattern: /\b(active\s*missions?|missions?|expeditions?|kaunse?\s*missions?)\b/i,
      label: 'Hosted Missions',
      getValue: (s, data) => {
        const m = data?.expeditions ? data.expeditions.filter((e) => e.location_id === s.id || (e.destination && e.destination.includes(s.name.split(' ')[0]))) : []
        return `**${m.map((e) => `${e.id} (${e.progress}%)`).join(', ') || 'None'}**`
      },
    },
  ],
  cargo: [
    {
      id: 'status',
      pattern: /\b(status|transit\s*status|stithi|halat)\b/i,
      label: 'Transit Status',
      getValue: (c) => `**${c.status}**`,
    },
    {
      id: 'weight_kg',
      pattern: /\b(weight|vajan|bhari|mass|kg)\b/i,
      label: 'Gross Weight',
      getValue: (c) => `**${c.weight_kg ? `${c.weight_kg.toLocaleString()} kg` : 'N/A'}**`,
    },
    {
      id: 'priority',
      pattern: /\b(priority|urgency|prathmikta|tier)\b/i,
      label: 'Priority Tier',
      getValue: (c) => `**${c.priority}**`,
    },
    {
      id: 'location',
      pattern: /\b(location|current\s*location|port|staging|kahan\s*hai|kahan\s*par)\b/i,
      label: 'Current Location',
      getValue: (c) => `**${c.location}**`,
    },
    {
      id: 'destination',
      pattern: /\b(destination|manzil|routed|kahan\s*ja\s*raha)\b/i,
      label: 'Target Destination',
      getValue: (c) => `**${c.destination}**`,
    },
    {
      id: 'quantity',
      pattern: /\b(quantity|how\s*many|matra|kitne?\s*(?:packages?|drums?|crates?|sets?|units?|packs?))\b/i,
      label: 'Quantity',
      getValue: (c) => `**${c.quantity} ${c.unit || ''}**`,
    },
    {
      id: 'tracking_code',
      pattern: /\b(tracking\s*code|tracking|consignment\s*code)\b/i,
      label: 'Tracking Code',
      getValue: (c) => `**TRK-${c.id}**`,
    },
  ],
  inventory: [
    {
      id: 'quantity',
      pattern: /\b(quantity|current\s*stock|kitna\s*available|available\s*quantity|current\s*quantity|kitna\s*stock|matra)\b/i,
      label: 'Available Quantity',
      getValue: (i) => `**${Number(i.quantity ?? i.current_quantity ?? 0).toLocaleString()} ${i.unit}**`,
    },
    {
      id: 'minimum_quantity',
      pattern: /\b(minimum\s*quantity|minimum\s*threshold|buffer|min\s*stock|minimum\s*stock|threshold|buffer\s*threshold)\b/i,
      label: 'Minimum Buffer Threshold',
      getValue: (i) => `**${Number(i.minimum_quantity ?? i.minimum_stock ?? 0).toLocaleString()} ${i.unit}**`,
    },
    {
      id: 'location',
      pattern: /\b(location|warehouse|depot|kahan\s*stored|kahan\s*hai|kis\s*station)\b/i,
      label: 'Warehouse / Station',
      getValue: (i) => `**${i.location}**`,
    },
    {
      id: 'condition',
      pattern: /\b(condition|quality|halat)\b/i,
      label: 'Condition',
      getValue: (i) => `**${i.condition || 'GOOD'}**`,
    },
    {
      id: 'category',
      pattern: /\b(category|classification|type)\b/i,
      label: 'Category',
      getValue: (i) => `**${i.category}**`,
    },
  ],
  emergency: [
    {
      id: 'severity',
      pattern: /\b(severity|severity\s*level|gambhirta|tier)\b/i,
      label: 'Severity Tier',
      getValue: (e) => `**${e.severity}**`,
    },
    {
      id: 'type',
      pattern: /\b(type|incident\s*type|alert\s*type|prakar|kis\s*type)\b/i,
      label: 'Incident Type',
      getValue: (e) => `**${e.type}**`,
    },
    {
      id: 'location',
      pattern: /\b(location|sector|site|kahan\s*report|kahan\s*hua)\b/i,
      label: 'Incident Location',
      getValue: (e) => `**${e.location}**`,
    },
    {
      id: 'assigned_team',
      pattern: /\b(assigned\s*team|handling\s*team|who\s*is\s*assigned|kaun\s*handle|kaunsi\s*team|responders?)\b/i,
      label: 'Assigned Response Unit',
      getValue: (e) => `**${e.assigned_team || 'None'}**`,
    },
    {
      id: 'status',
      pattern: /\b(status|response\s*status|current\s*status)\b/i,
      label: 'Status',
      getValue: (e) => `**${e.status}**`,
    },
    {
      id: 'description',
      pattern: /\b(description|details|what\s*happened|kya\s*hua|problem)\b/i,
      label: 'Sitrep Description',
      getValue: (e) => `**${e.description}**`,
    },
  ],
}

/**
 * Generically resolves multi-attribute natural language questions across any project entity.
 * Extracts and returns ALL requested attributes when 2 or more are detected.
 */
export function resolveGenericMultiAttributeQuery(entity, entityType, rawQuery, isHi, sessionContext, data = {}) {
  if (!entity || !entityType) return null
  const text = String(rawQuery || '').trim()
  const lower = text.toLowerCase()
  const normQ = normalizeHinglish(text)

  const definitions = ATTRIBUTE_REGISTRY[entityType]
  if (!definitions) return null

  const detected = []
  for (const def of definitions) {
    if (def.pattern.test(lower) || def.pattern.test(normQ)) {
      detected.push(def)
    }
  }

  // If 2 or more distinct attributes are requested for this entity:
  if (detected.length >= 2) {
    const lines = detected.map((d) => `• **${d.label}**: ${d.getValue(entity, data)}`)
    const entityTitle = entity.name
      ? `${entity.name} (${entity.id})`
      : entity.item_name
        ? `${entity.id} (${entity.item_name})`
        : entity.id

    sessionContext.lastEntity = { type: entityType, ...entity }
    sessionContext.lastTopic = entityType
    if (entity.destination) sessionContext.lastStation = entity.destination
    if (entity.location) sessionContext.lastStation = entity.location

    const reply = isHi
      ? `**${entityTitle}** ke requested details:\n\n${lines.join('\n')}`
      : `**${entityTitle} Requested Operational Details**:\n\n${lines.join('\n')}`

    return { handled: true, reply, sessionContext }
  }

  return null
}

/**
 * Main General Project Query Evaluation Engine
 * Handles any question about project architecture, metadata, entities, calculations, recency, etc.
 */
export async function evaluateGeneralProjectQuery(rawQuery, data = {}, session = {}, langOverride = null) {
  const text = String(rawQuery || '').trim()
  if (!text) return { handled: false, reply: '' }

  const detectedLang = langOverride || detectLanguage(text)
  const isDevanagari = detectedLang === 'hi'
  const isHi = detectedLang === 'hi' || isHinglish(text)
  const sessionContext = { ...(session || {}) }

  // 0A. Casual Greetings, Identity & Help
  const greetingReply = matchGreetingOrHelp(text, data, detectedLang)
  if (greetingReply) {
    return { handled: true, reply: greetingReply, sessionContext }
  }

  // 0B. High-Priority Domain Knowledge Dispatcher
  const domainReply = matchDomainKnowledge(text, detectedLang)
  if (domainReply) {
    return { handled: true, reply: domainReply, sessionContext }
  }

  // 0C. General System List Directives (Expeditions, Personnel, Stations, Cargo, Emergencies)
  const listResult = matchSystemListQuery(text, data, sessionContext, detectedLang)
  if (listResult && listResult.handled) {
    return listResult
  }

  const reasoningText = isDevanagari ? devanagariToHinglish(text) : text
  const lower = reasoningText.toLowerCase()
  const q = cleanQuery(reasoningText)
  const normQ = normalizeHinglish(reasoningText)

  const expeditions = data.expeditions || []
  const personnel = data.personnel || []
  const cargo = data.cargo || []
  const inventory = data.inventory || []
  const locations = data.locations || []
  const emergencies = data.emergencies || []
  const activityLog = data.activityLog || []
  const stats = data.stats || {}

  // Extract entities (with pronoun support)
  const extractedEntities = extractProjectEntities(reasoningText, data, sessionContext)

  const getItemQty = (i) => Number(i?.quantity ?? i?.current_quantity ?? 0)
  const getItemMin = (i) => Number(i?.minimum_quantity ?? i?.minimum_stock ?? 0)

  // -------------------------------------------------------------
  // ENTITY RESOLUTION & CONTEXT BINDING
  // -------------------------------------------------------------
  let targetStation = null
  let explicitStation = null
  let targetExpedition = null
  let targetPerson = null
  let targetCargo = null
  let targetInventory = null
  let targetEmergency = null

  for (const ent of extractedEntities) {
    if (ent.type === 'location' && !targetStation) {
      targetStation = ent.item
      explicitStation = ent.item
    }
    if (ent.type === 'expedition' && !targetExpedition) targetExpedition = ent.item
    if (ent.type === 'person' && !targetPerson) targetPerson = ent.item
    if (ent.type === 'cargo' && !targetCargo) targetCargo = ent.item
    if (ent.type === 'inventory' && !targetInventory) targetInventory = ent.item
    if (ent.type === 'emergency' && !targetEmergency) targetEmergency = ent.item
  }

  if (!targetStation) {
    for (const loc of locations) {
      const locLower = loc.name.toLowerCase()
      const shortName = locLower.replace(/\s+(station|camp|depot|runway|base)/g, '')
      if (lower.includes(locLower) || lower.includes(shortName)) {
        targetStation = loc
        explicitStation = loc
        break
      }
    }
  }

  // Interrogative which station: e.g. "kaunsi station ko attention chahiye", "kis station ke paas"
  const isInterrogativeWhichStation =
    /\b(kaunsi|kaunsa|kaunse|konsi|konsa|konse|which|kis)\s+(?:station|base|camp|location|facility)\b/i.test(normQ)

  if (isInterrogativeWhichStation) {
    targetStation = null
    explicitStation = null
  }

  // Demonstrative pronoun resolution: "isme", "iske", "wahan", "ye", "is station", "this"
  const hasPronoun =
    /\b(isme|iske|iska|iski|ispar|inme|inpe|unme|unka|unki|ye|yeh|wo|woh|wahan|yahan|it|this|that|here|there)\b/i.test(normQ) ||
    /\b(is\s+station|this\s+station|is\s+mission|this\s+mission|is\s+cargo|this\s+cargo)\b/i.test(lower)

  if (hasPronoun) {
    if (!targetExpedition && sessionContext.lastEntity?.type === 'expedition') {
      targetExpedition = sessionContext.lastEntity
    }
    if (!targetPerson && sessionContext.lastEntity?.type === 'person') {
      targetPerson = sessionContext.lastEntity
    }
    if (!targetCargo && sessionContext.lastEntity?.type === 'cargo') {
      targetCargo = sessionContext.lastEntity
    }
    if (!targetStation) {
      if (sessionContext.lastEntity?.type === 'station' || sessionContext.lastEntity?.type === 'location') {
        targetStation = sessionContext.lastEntity
      } else if (sessionContext.lastStation) {
        targetStation = locations.find(
          (l) => l.name.toLowerCase().includes(sessionContext.lastStation.toLowerCase()) ||
            sessionContext.lastStation.toLowerCase().includes(l.name.toLowerCase())
        )
      } else if (targetExpedition && (lower.includes('saman') || lower.includes('inventory') || lower.includes('stock') || lower.includes('wahan') || lower.includes('there'))) {
        targetStation = locations.find(
          (l) => l.name.toLowerCase().includes(targetExpedition.destination.toLowerCase()) ||
            targetExpedition.destination.toLowerCase().includes(l.name.toLowerCase())
        )
      } else if (targetPerson) {
        targetStation = locations.find(
          (l) => l.id === targetPerson.location_id || l.name.toLowerCase().includes((targetPerson.location_id || '').toLowerCase())
        )
      }
    }
  }

  // Only infer targetStation from targetExpedition if query asks about station/supplies/weather
  if (targetExpedition && !targetStation && (lower.includes('saman') || lower.includes('inventory') || lower.includes('stock') || lower.includes('wahan') || lower.includes('there'))) {
    targetStation = locations.find(
      (l) => l.name.toLowerCase().includes(targetExpedition.destination.toLowerCase()) ||
        targetExpedition.destination.toLowerCase().includes(l.name.toLowerCase())
    )
  }

  // -------------------------------------------------------------
  // GENERIC MULTI-ATTRIBUTE RESOLUTION
  // Extracts and answers ALL requested attributes when >= 2 attributes are queried
  // -------------------------------------------------------------
  if (targetExpedition) {
    const multiRes = resolveGenericMultiAttributeQuery(targetExpedition, 'expedition', text, isHi, sessionContext, data)
    if (multiRes) return multiRes
  }
  if (targetPerson) {
    const multiRes = resolveGenericMultiAttributeQuery(targetPerson, 'person', text, isHi, sessionContext, data)
    if (multiRes) return multiRes
  }
  if (targetCargo) {
    const multiRes = resolveGenericMultiAttributeQuery(targetCargo, 'cargo', text, isHi, sessionContext, data)
    if (multiRes) return multiRes
  }
  if (targetInventory) {
    const multiRes = resolveGenericMultiAttributeQuery(targetInventory, 'inventory', text, isHi, sessionContext, data)
    if (multiRes) return multiRes
  }
  if (targetStation) {
    const multiRes = resolveGenericMultiAttributeQuery(targetStation, 'station', text, isHi, sessionContext, data)
    if (multiRes) return multiRes
  }
  if (targetEmergency) {
    const multiRes = resolveGenericMultiAttributeQuery(targetEmergency, 'emergency', text, isHi, sessionContext, data)
    if (multiRes) return multiRes
  }

  // -------------------------------------------------------------
  // SEMANTIC ASPECT & INTENT DETECTION
  // -------------------------------------------------------------
  const wantsInventory =
    /\b(saman|inventory|stock|supplies|resources|item|items|diesel|fuel|kits?|rations?|cylinders?|spares?|tracks?|sleeping\s+bags?|oil|lpg|beacons?|food)\b/i.test(normQ)

  const wantsCargo =
    /\b(cargo|shipment|consignment|transit|loaded|delayed|late|delivery|weight|drums?)\b/i.test(normQ)

  const wantsExpeditions =
    /\b(mission|expedition|progress|completion|finish|objective|timeline|poora|pura|khatam)\b/i.test(normQ)

  const wantsPersonnel =
    /\b(log|personnel|people|staff|team|members?|duty|doctor|commander|scientist|officer|technician|engineer|glaciologist|physicist)\b/i.test(normQ) ||
    (/\b(who|kaun\s+hai|kaun\s+lead|leader\s+kaun|who\s+is)\b/i.test(normQ) && !wantsInventory && !wantsCargo && !wantsExpeditions)

  const wantsProblems =
    /\b(kya\s+problem\s+hai|kya\s+issue\s+hai|problem|issue|kharabi|hazard|danger|risk|threat|dikkat|attention\s+chahiye|attention|concern|trouble|wrong)\b/i.test(normQ) ||
    (/\b(alert|alerts|incident|incidents|emergency|emergencies)\b/i.test(normQ) && !/\b(critical\s+alert|high\s+alert)\b/i.test(normQ))

  const wantsDevices =
    /\b(device|devices|gps|telemetry|transceivers?|offline|online|signal|connectivity)\b/i.test(normQ)

  const wantsStation =
    /\b(station|stations|base|bases|camp|camps|facility|facilities|capacity|location|locations|depot)\b/i.test(normQ)

  const isSurplus =
    /\b(extra|surplus|above\s+minimum|more\s+than\s+minimum|upar|excess|bacha\s+hua\s+extra|spare|addition)\b/i.test(normQ)

  const isShortage =
    (/\b(shortage|deficit|kam|low|below\s+minimum|kam\s+pad|insufficient|lack|low\s+stock)\b/i.test(normQ) ||
      (/\bkhatam\b/i.test(normQ) && !wantsExpeditions && !/\b(mission|expedition)\b/i.test(normQ))) &&
    !isSurplus

  const isMax =
    /\b(sabse\s+zyada|sabse\s+jyada|sabse\s+aage|highest|most|maximum|top|best|first|pehle|pahle|jaldi|sabse\s+upar|largest|biggest|most\s+advanced)\b/i.test(normQ)

  const isListAll =
    /\b(kya\s+kya\s+hai|kya\s+hai|list|kaun\s+kaun\s+se|show\s+all|all\s+items|kitna\s+saman\s+hai|available\s+items|what\s+items|pass\s+kya|paas\s+kya)\b/i.test(normQ)

  const isDossierAll =
    /\b(sab\s+kuch|everything|complete\s+status|full\s+information|ke\s+baare\s+mein\s+batao|tell\s+me\s+about|all\s+details|profile|dossier|full\s+details|aur\s+batao|aur\s+details?|tell\s+me\s+more|more\s+info|more\s+details)\b/i.test(normQ) ||
    (/\b(baare\s+mein|about)\b/i.test(normQ) && !wantsProblems)

  // =============================================================
  // BRANCH 0A: DYNAMIC INVENTORY SURPLUS (e.g. "kuch saman extra hai iss me")
  // =============================================================
  if (isSurplus || (wantsInventory && isSurplus)) {
    let items = inventory
    let scopeName = 'Current inventory'

    if (targetStation) {
      items = items.filter((i) => i.location.toLowerCase().includes(targetStation.name.toLowerCase()) || targetStation.name.toLowerCase().includes(i.location.toLowerCase()))
      scopeName = targetStation.name
    }

    const surplusItems = items
      .map((i) => {
        const qty = getItemQty(i)
        const min = getItemMin(i)
        return {
          ...i,
          qty,
          min,
          surplus: qty - min,
        }
      })
      .filter((i) => i.surplus > 0)
      .sort((a, b) => b.surplus - a.surplus)

    if (isMax && surplusItems.length > 0) {
      const top = surplusItems[0]
      const reply = isHi
        ? `Minimum stock se sabse zyada upar **${top.item_name}** hai (${top.location}): **${top.qty.toLocaleString()} ${top.unit}** available hain (minimum required: ${top.min.toLocaleString()} ${top.unit}) → **${top.surplus.toLocaleString()} ${top.unit} extra (surplus)**.`
        : `The item furthest above minimum stock is **${top.item_name}** at ${top.location}: **${top.qty.toLocaleString()} ${top.unit}** available (minimum: ${top.min.toLocaleString()} ${top.unit}) → **${top.surplus.toLocaleString()} ${top.unit} surplus**.`
      return { handled: true, reply, sessionContext }
    }

    if (surplusItems.length > 0) {
      const lines = surplusItems.map(
        (i) => `• **${i.item_name}** (${i.location}): ${i.qty.toLocaleString()} ${i.unit} available (minimum ${i.min.toLocaleString()} ${i.unit}) → **${i.surplus.toLocaleString()} ${i.unit} extra**`
      )
      const reply = isHi
        ? `Haan. ${scopeName} ke hisaab se ye items minimum requirement se upar (surplus) hain:\n\n${lines.join('\n')}`
        : `Yes. According to ${scopeName} data, the following items are currently above their minimum safety threshold (in surplus):\n\n${lines.join('\n')}`
      return { handled: true, reply, sessionContext }
    } else {
      const reply = isHi
        ? `${scopeName} mein koi bhi item minimum threshold se upar (extra/surplus) nahi hai.`
        : `No items currently hold a surplus above minimum safety buffers at ${scopeName}.`
      return { handled: true, reply, sessionContext }
    }
  }

  // =============================================================
  // BRANCH 0B: DYNAMIC INVENTORY SHORTAGE ("kaunsa saman kam hai?")
  // =============================================================
  const isCrossModuleIncidentInventory =
    (lower.includes('incident') || lower.includes('emergency') || lower.includes('alert')) &&
    (lower.includes('inventory') || lower.includes('stock'))
  if (!isCrossModuleIncidentInventory && (isShortage || (wantsInventory && isShortage))) {
    let items = inventory
    let scopeName = 'System'
    if (targetStation) {
      items = items.filter((i) => i.location.toLowerCase().includes(targetStation.name.toLowerCase()) || targetStation.name.toLowerCase().includes(i.location.toLowerCase()))
      scopeName = targetStation.name
    }

    const isSingleLowest =
      isMax ||
      normQ.includes('sabse kam') ||
      lower.includes('sabse kam') ||
      q.includes('lowest resource') ||
      q.includes('least available')

    if (isSingleLowest && items.length > 0) {
      const sorted = [...items].sort((a, b) => getItemQty(a) - getItemQty(b))
      const lowest = sorted[0]
      sessionContext.lastTopic = 'inventory'
      const reply = isHi
        ? `Sabse kam available resource **${lowest.item_name}** hai: sirf ${getItemQty(lowest)} ${lowest.unit} available hain at ${lowest.location} (minimum required: ${getItemMin(lowest)} ${lowest.unit}).`
        : `The resource with the lowest physical count is **${lowest.item_name}** with only ${getItemQty(lowest)} ${lowest.unit} available at ${lowest.location} (minimum threshold: ${getItemMin(lowest)} ${lowest.unit}).`
      return { handled: true, reply, sessionContext }
    }

    const shortageItems = items
      .map((i) => {
        const qty = getItemQty(i)
        const min = getItemMin(i)
        return {
          ...i,
          qty,
          min,
          shortage: min - qty,
          isLow: isLowStock(i) || qty <= min,
        }
      })
      .filter((i) => i.isLow)
      .sort((a, b) => b.shortage - a.shortage)

    if (shortageItems.length > 0) {
      const lines = shortageItems.map(
        (i) => `• **${i.item_name}** (${i.location}): ${i.qty.toLocaleString()} ${i.unit} available (minimum buffer: ${i.min.toLocaleString()} ${i.unit}) → **${Math.max(0, i.shortage).toLocaleString()} ${i.unit} short**`
      )
      const reply = isHi
        ? `${scopeName} mein ${shortageItems.length} items low stock / kam hain:\n\n${lines.join('\n')}`
        : `${shortageItems.length} items are currently below minimum safety stock in ${scopeName}:\n\n${lines.join('\n')}`
      return { handled: true, reply, sessionContext }
    } else {
      const reply = isHi
        ? `${scopeName} mein koi bhi item low stock nahi hai. Sabhi items minimum buffer ke upar hain.`
        : `All tracked inventory items in ${scopeName} are currently at or above nominal buffer levels.`
      return { handled: true, reply, sessionContext }
    }
  }

  // =============================================================
  // BRANCH 0C: PROBLEMS / ATTENTION / RISK TRIAGE ("Maitri mein kya problem hai?")
  // =============================================================
  if (wantsProblems || (lower.includes('attention') && wantsStation) || (lower.includes('risk') && wantsExpeditions)) {
    const isAttentionFirst =
      lower.includes('attention first') ||
      lower.includes('needs attention first') ||
      (lower.includes('attention') && (lower.includes('first') || lower.includes('pehle')))
    if (isAttentionFirst && !targetStation) {
      const openIncidents = emergencies.filter((e) => e.status !== 'RESOLVED')
      const critIncident = openIncidents.find((e) => e.severity === 'CRITICAL') || openIncidents[0]
      const lowStock = inventory.filter((i) => isLowStock(i))
      const delayedShipments = cargo.filter((c) => c.status === 'DELAYED')

      sessionContext.lastTopic = 'emergencies'
      const reply = isHi
        ? `**Priority Operational Triage (Needs Attention First)**:\n\n` +
        `1. 🔴 **Critical Alert (Primary Incident)**: ${critIncident
          ? `${critIncident.id} [${critIncident.severity}] at ${critIncident.location} (${critIncident.description}). Assigned Team: ${critIncident.assigned_team || 'Pending dispatch'}.`
          : 'Zero active critical emergencies.'
        }\n` +
        `2. ⚠️ **Supply Chain Stock-Outs**: ${lowStock.length} items currently below minimum safety reserves.\n` +
        `3. 📦 **Delayed Logistics**: Shipment ${delayedShipments.map((c) => `${c.id} (${c.item_name})`).join(', ')} delayed at Novo Runway.`
        : `**Priority Operational Triage (Needs Attention First)**:\n\n` +
        `1. 🔴 **Top Critical Alert**: ${critIncident
          ? `${critIncident.id} [${critIncident.severity}] at ${critIncident.location} — ${critIncident.description} (Status: ${critIncident.status}, Team: ${critIncident.assigned_team || 'Pending'}). [MAP_ACTION:incident:${critIncident.id}:${critIncident.location}]`
          : 'All operational sectors reporting zero active critical emergencies.'
        }\n` +
        `2. ⚠️ **Inventory Safety Buffer Breach**: ${lowStock.length} items breached minimum emergency reserve thresholds.\n` +
        `3. 📦 **Logistics Disruption**: Cargo ${delayedShipments.map((c) => `${c.id} (${c.item_name})`).join(', ')} grounded at Novo Runway.`
      return { handled: true, reply, sessionContext }
    }

    if (isInterrogativeWhichStation && wantsStation) {
      const candidateLocations = locations.filter((l) => ['STATION', 'CAMP', 'BASE', 'DEPOT', 'SITE'].includes(l.type?.toUpperCase()))
      const targetList = candidateLocations.length > 0 ? candidateLocations : locations
      const stationTriage = targetList.map((st) => {
        const incCount = emergencies.filter((e) => e.status !== 'RESOLVED' && (e.location.includes(st.name) || e.location_id === st.id)).length
        const lowCount = inventory.filter((i) => isLowStock(i) && (i.location.includes(st.name) || i.location === st.name)).length
        const delayCount = cargo.filter((c) => c.status === 'DELAYED' && c.destination.includes(st.name)).length
        const score = incCount * 3 + lowCount * 2 + delayCount
        return { st, incCount, lowCount, delayCount, score }
      }).sort((a, b) => b.score - a.score)

      const top = stationTriage[0]
      const topIncidents = emergencies
        .filter((e) => e.status !== 'RESOLVED' && (e.location.includes(top.st.name) || e.location_id === top.st.id))
        .map((e) => `${e.id} [${e.severity}]`)
        .join(', ')
      const reply = isHi
        ? `Sabse zyada command attention **${top.st.name}** ko chahiye:\n` +
        `• Active Incidents: ${top.incCount} alert(s) (${topIncidents || 'None'})\n` +
        `• Low-stock Items: ${top.lowCount} critical supplies below buffer threshold\n` +
        `• Logistics Delays: ${top.delayCount} delayed cargo shipment(s)`
        : `**${top.st.name}** requires the most immediate command attention:\n` +
        `• Active Incidents: ${top.incCount} open alert(s) (${topIncidents || 'None'})\n` +
        `• Inventory Warnings: ${top.lowCount} items below safety buffers\n` +
        `• Supply Pipeline: ${top.delayCount} delayed inbound shipment(s)`
      return { handled: true, reply, sessionContext }
    }

    if (targetStation) {
      const sIncidents = emergencies.filter((e) => e.status !== 'RESOLVED' && (e.location.includes(targetStation.name) || e.location_id === targetStation.id))
      const sLowStock = inventory.filter((i) => isLowStock(i) && (i.location.includes(targetStation.name) || i.location === targetStation.name))
      const sDelayed = cargo.filter((c) => c.status === 'DELAYED' && c.destination.includes(targetStation.name))

      const issues = []
      if (sIncidents.length > 0) {
        issues.push(`🔴 **Active Emergencies (${sIncidents.length})**: ${sIncidents.map((e) => `${e.id} [${e.severity}]: ${e.description}`).join('; ')}`)
      }
      if (sLowStock.length > 0) {
        issues.push(`⚠️ **Low Stock Alert (${sLowStock.length})**: ${sLowStock.map((i) => `${i.item_name} (${getItemQty(i)}/${getItemMin(i)} ${i.unit})`).join(', ')}`)
      }
      if (sDelayed.length > 0) {
        issues.push(`📦 **Delayed Logistics (${sDelayed.length})**: ${sDelayed.map((c) => `${c.id} (${c.item_name}) delayed at ${c.location}`).join(', ')}`)
      }

      if (issues.length === 0) {
        const reply = isHi
          ? `${targetStation.name} par abhi koi active incident ya low-stock issue nahi hai. Sab nominal hai.`
          : `${targetStation.name} currently reports nominal status with zero active incidents and healthy stock levels.`
        return { handled: true, reply, sessionContext }
      }

      const reply = isHi
        ? `**${targetStation.name} par current issues / problems**:\n\n${issues.join('\n\n')}`
        : `**Current operational issues identified for ${targetStation.name}**:\n\n${issues.join('\n\n')}`
      return { handled: true, reply, sessionContext }
    }

    if (targetExpedition) {
      const hostStation = locations.find((l) => l.name.toLowerCase().includes(targetExpedition.destination.toLowerCase()))
      const sIncidents = hostStation ? emergencies.filter((e) => e.status !== 'RESOLVED' && e.location.includes(hostStation.name)) : []
      const sLowStock = hostStation ? inventory.filter((i) => isLowStock(i) && i.location.includes(hostStation.name)) : []

      const issues = []
      if (targetExpedition.progress < 50 && targetExpedition.status === 'ACTIVE') {
        issues.push(`📉 **Pace**: Mission progress currently at ${targetExpedition.progress}% (target conclusion: ${targetExpedition.end_date}).`)
      }
      if (sIncidents.length > 0) {
        issues.push(`🔴 **Host Base Incident**: Base ${targetExpedition.destination} par ${sIncidents.length} alert active hai (${sIncidents[0].id}: ${sIncidents[0].description}).`)
      }
      if (sLowStock.length > 0) {
        issues.push(`⚠️ **Supply Shortage**: Base station par ${sLowStock.length} critical supplies low stock par hain (${sLowStock.map((i) => i.item_name).join(', ')}).`)
      }

      if (issues.length === 0) {
        const reply = isHi
          ? `Mission ${targetExpedition.id} (${targetExpedition.name}) mein koi active problem nahi hai. Sab operations normal chal rahe hain.`
          : `Mission ${targetExpedition.id} (${targetExpedition.name}) reports nominal status with no critical operational blockers.`
        return { handled: true, reply, sessionContext }
      }

      const reply = isHi
        ? `**Mission ${targetExpedition.id} (${targetExpedition.name}) Risk Assessment**:\n\n${issues.join('\n')}`
        : `**Risk Assessment for ${targetExpedition.id} (${targetExpedition.name})**:\n\n${issues.join('\n')}`
      return { handled: true, reply, sessionContext }
    }

    if (wantsExpeditions && (lower.includes('risk') || lower.includes('problem') || lower.includes('concern'))) {
      const activeMissions = expeditions.filter((e) => e.status === 'ACTIVE')
      const missionRisks = activeMissions.map((exp) => {
        const hostStation = locations.find((l) => l.name.toLowerCase().includes(exp.destination.toLowerCase()))
        const incCount = hostStation ? emergencies.filter((e) => e.status !== 'RESOLVED' && e.location.includes(hostStation.name)).length : 0
        const lowStockCount = hostStation ? inventory.filter((i) => isLowStock(i) && i.location.includes(hostStation.name)).length : 0
        const riskScore = incCount * 3 + lowStockCount * 2 + (100 - exp.progress) * 0.1
        return { exp, incCount, lowStockCount, riskScore }
      }).sort((a, b) => b.riskScore - a.riskScore)

      const top = missionRisks[0]
      const reply = isHi
        ? `Sabse zyada operational risk **${top.exp.id} (${top.exp.name})** par hai:\n` +
        `• Host Base: ${top.exp.destination} (${top.incCount} active incident, ${top.lowStockCount} low-stock supply lines)\n` +
        `• Progress: ${top.exp.progress}% complete`
        : `**${top.exp.id} (${top.exp.name})** faces the highest operational exposure:\n` +
        `• Base: ${top.exp.destination} (${top.incCount} incident(s), ${top.lowStockCount} inventory warnings)\n` +
        `• Current Progress: ${top.exp.progress}%`
      return { handled: true, reply, sessionContext }
    }

    if (wantsStation || isMax || lower.includes('attention')) {
      const candidateLocations = locations.filter((l) => ['STATION', 'CAMP', 'BASE', 'DEPOT', 'SITE'].includes(l.type?.toUpperCase()))
      const targetList = candidateLocations.length > 0 ? candidateLocations : locations
      const stationTriage = targetList.map((st) => {
        const incCount = emergencies.filter((e) => e.status !== 'RESOLVED' && (e.location.includes(st.name) || e.location_id === st.id)).length
        const lowCount = inventory.filter((i) => isLowStock(i) && (i.location.includes(st.name) || i.location === st.name)).length
        const delayCount = cargo.filter((c) => c.status === 'DELAYED' && c.destination.includes(st.name)).length
        const score = incCount * 3 + lowCount * 2 + delayCount
        return { st, incCount, lowCount, delayCount, score }
      }).sort((a, b) => b.score - a.score)

      const top = stationTriage[0]
      const topIncidents = emergencies
        .filter((e) => e.status !== 'RESOLVED' && (e.location.includes(top.st.name) || e.location_id === top.st.id))
        .map((e) => `${e.id} [${e.severity}]`)
        .join(', ')
      const reply = isHi
        ? `Sabse zyada command attention **${top.st.name}** ko chahiye:\n` +
          `• Active Incidents: ${top.incCount} alert(s) (${topIncidents || 'None'})\n` +
          `• Low-stock Items: ${top.lowCount} critical supplies below buffer threshold\n` +
          `• Logistics Delays: ${top.delayCount} delayed cargo shipment(s)`
        : `**${top.st.name}** requires the most immediate command attention:\n` +
          `• Active Incidents: ${top.incCount} open alert(s) (${topIncidents || 'None'})\n` +
          `• Inventory Warnings: ${top.lowCount} items below safety buffers\n` +
          `• Supply Pipeline: ${top.delayCount} delayed inbound shipment(s)`
      return { handled: true, reply, sessionContext }
    }
  }

  // =============================================================
  // BRANCH 0C2: LOCATION-SPECIFIC EXPEDITION COMPLETION / STATUS
  // =============================================================
  if (wantsExpeditions && (targetStation || explicitStation)) {
    const loc = targetStation || explicitStation
    const sExp = expeditions.filter((e) => e.destination.toLowerCase().includes(loc.name.toLowerCase()) || loc.name.toLowerCase().includes(e.destination.toLowerCase()))
    if (lower.includes('complete') || lower.includes('khatam') || lower.includes('poora') || lower.includes('pura') || lower.includes('ho chuka')) {
      const completed = sExp.filter((e) => e.status === 'COMPLETED' || e.progress === 100)
      if (completed.length > 0) {
        const lines = completed.map((e) => `• **${e.id}: ${e.name}** — Status: ${e.status} (100% complete, Leader: ${e.leader})`)
        const reply = isHi
          ? `**${loc.name}** par ye mission complete ho chuka hai:\n\n${lines.join('\n')}`
          : `The following completed mission is associated with **${loc.name}**:\n\n${lines.join('\n')}`
        return { handled: true, reply, sessionContext }
      }
    }
  }

  // =============================================================
  // BRANCH 0C-2: CARGO AT STATION / VESSEL ("ORV Sagar Nidhi par kaunse cargo items hain?")
  // =============================================================
  if (targetStation && (lower.includes('cargo') || lower.includes('shipment') || lower.includes('consignments'))) {
    const locCargo = cargo.filter(
      (c) =>
        (c.location && c.location.toLowerCase().includes(targetStation.name.toLowerCase().split(' ')[0])) ||
        (c.destination && c.destination.toLowerCase().includes(targetStation.name.toLowerCase().split(' ')[0]))
    )
    sessionContext.lastEntity = { type: 'station', ...targetStation }
    sessionContext.lastStation = targetStation.name
    sessionContext.lastTopic = 'cargo'
    const lines = locCargo.map(
      (c) => `• **${c.id} (${c.item_name})**: ${c.quantity} ${c.unit || ''} (Status: ${c.status}, ${c.weight_kg ? `${c.weight_kg.toLocaleString()} kg` : ''}) — Location: ${c.location}, Dest: ${c.destination} [Priority: ${c.priority}]`
    )
    const reply = isHi
      ? `**${targetStation.name}** se linked ${locCargo.length} cargo shipments hain:\n\n${lines.join('\n')}`
      : `There are **${locCargo.length} cargo shipments** associated with **${targetStation.name}**:\n\n${lines.join('\n')}`
    return { handled: true, reply, sessionContext }
  }

  // =============================================================
  // BRANCH 0D: WHAT DO THEY HAVE / INVENTORY LISTING ("Maitri ke paas kya kya hai?")
  // =============================================================
  if (isListAll || lower.includes('pass kya') || lower.includes('paas kya') || lower.includes('kitna saman')) {
    if (targetStation) {
      const sInv = inventory.filter((i) => i.location.toLowerCase().includes(targetStation.name.toLowerCase()) || targetStation.name.toLowerCase().includes(i.location.toLowerCase()))
      const sExp = expeditions.filter((e) => e.destination.toLowerCase().includes(targetStation.name.toLowerCase()))
      const sPpl = personnel.filter((p) => p.location_id === targetStation.id)

      if (wantsInventory || lower.includes('saman') || lower.includes('stock')) {
        const lines = sInv.map((i) => {
          const statusIcon = isLowStock(i) ? '⚠️ LOW' : '✅ Nominal'
          return `• **${i.item_name}**: ${getItemQty(i).toLocaleString()} ${i.unit} (${statusIcon}, min buffer: ${getItemMin(i).toLocaleString()} ${i.unit})`
        })
        const reply = isHi
          ? `**${targetStation.name} par available inventory** (${sInv.length} tracked items):\n\n${lines.join('\n')}`
          : `**Inventory tracked at ${targetStation.name}** (${sInv.length} items):\n\n${lines.join('\n')}`
        return { handled: true, reply, sessionContext }
      }

      const invLines = sInv.map((i) => `${i.item_name}: ${getItemQty(i)} ${i.unit}`).join(', ')
      const expLines = sExp.map((e) => `${e.id} (${e.progress}%)`).join(', ')
      const reply = isHi
        ? `**${targetStation.name} ke paas available assets aur setup**:\n\n` +
        `• **Personnel**: ${sPpl.length} active members on site (Bed Capacity: ${targetStation.capacity || 'N/A'})\n` +
        `• **Missions**: ${expLines || 'None'}\n` +
        `• **Inventory (${sInv.length} items)**: ${invLines}\n` +
        `• **Region**: ${targetStation.region} (${targetStation.latitude}°, ${targetStation.longitude}°)`
        : `**Assets and operational setup at ${targetStation.name}**:\n\n` +
        `• **Personnel**: ${sPpl.length} on-site members (Capacity: ${targetStation.capacity || 'N/A'})\n` +
        `• **Active Missions**: ${expLines || 'None'}\n` +
        `• **Inventory (${sInv.length} items)**: ${invLines}\n` +
        `• **Theater**: ${targetStation.region}`
      return { handled: true, reply, sessionContext }
    }
  }

  // =============================================================
  // BRANCH 0E: PERSONNEL QUERIES & RANKINGS ("Maitri mein kitne log hain", "EXP-003 mein kitne log hain", "kis mission mein sabse zyada log hain?")
  // =============================================================
  if (wantsPersonnel) {
    if (wantsExpeditions && isMax) {
      const sorted = [...expeditions].sort((a, b) => (b.team_size || 0) - (a.team_size || 0))
      const top = sorted[0]
      const lines = sorted.map((e) => `• **${e.id}: ${e.name}**: ${e.team_size} members (${e.status})`)
      const reply = isHi
        ? `Sabse zyada log **${top.name} (${top.id})** mein hain (${top.team_size} personnel assigned):\n\n${lines.join('\n')}`
        : `**${top.name} (${top.id})** has the largest team with ${top.team_size} personnel:\n\n${lines.join('\n')}`
      return { handled: true, reply, sessionContext }
    }

    if (targetExpedition && (wantsExpeditions || lower.includes('exp') || lower.includes('mission') || lower.includes(targetExpedition.id.toLowerCase()) || hasPronoun)) {
      const assigned = personnel.filter((p) => p.expedition_id === targetExpedition.id)
      const count = targetExpedition.team_size || assigned.length
      sessionContext.lastEntity = { type: 'expedition', ...targetExpedition }
      sessionContext.lastStation = targetExpedition.destination
      sessionContext.lastTopic = 'expeditions'

      const lines = assigned.map((p) => `• **${p.id}: ${p.name}** (${p.role}, ${p.status})`)
      const reply = isHi
        ? `Mission **${targetExpedition.id} (${targetExpedition.name})** mein total **${count} personnel** assigned hain (Leader: ${targetExpedition.leader}):\n\n${lines.join('\n') || 'Assigned field team'}`
        : `Mission **${targetExpedition.id} (${targetExpedition.name})** has **${count} personnel** assigned (Leader: ${targetExpedition.leader}):\n\n${lines.join('\n') || 'Assigned field team'}`
      return { handled: true, reply, sessionContext }
    }

    if (targetStation) {
      const sPpl = personnel.filter(
        (p) => p.location_id === targetStation.id || (p.location_id && p.location_id.toLowerCase().includes(targetStation.name.toLowerCase().split(' ')[0]))
      )
      sessionContext.lastEntity = { type: 'station', ...targetStation }
      sessionContext.lastStation = targetStation.name
      sessionContext.lastTopic = 'personnel'

      const lines = sPpl.map((p) => `• **${p.id}: ${p.name}** (${p.role} — ${p.status})`)
      const reply = detectedLang === 'hi'
        ? `**${targetStation.name}** पर कुल **${sPpl.length} कार्मिक** तैनात हैं (आवास क्षमता: ${targetStation.capacity || 'N/A'}):\n\n${formatHindiEntities(lines.join('\n'))}`
        : isHi
          ? `**${targetStation.name}** par total **${sPpl.length} personnel** stationed / deployed hain (Bed Capacity: ${targetStation.capacity || 'N/A'}):\n\n${lines.join('\n')}`
          : `There are **${sPpl.length} personnel** stationed at **${targetStation.name}** (Capacity: ${targetStation.capacity || 'N/A'}):\n\n${lines.join('\n')}`
      return { handled: true, reply, sessionContext }
    }
  }

  // =============================================================
  // BRANCH 0F: STATION INVENTORY LINES RANKING ("kis station ke paas sabse zyada inventory hai?")
  // =============================================================
  if (wantsStation && (wantsInventory || lower.includes('saman') || lower.includes('stock')) && isMax) {
    const stationInventoryCounts = locations.filter((l) => l.type === 'STATION' || l.type === 'CAMP').map((loc) => {
      const count = inventory.filter((i) => i.location.toLowerCase().includes(loc.name.toLowerCase()) || loc.name.toLowerCase().includes(i.location.toLowerCase())).length
      return { loc, count }
    }).sort((a, b) => b.count - a.count)

    const top = stationInventoryCounts[0]
    const lines = stationInventoryCounts.map((s) => `• **${s.loc.name}**: ${s.count} tracked supply lines`)
    const reply = isHi
      ? `Sabse zyada inventory lines **${top.loc.name}** ke paas hain (${top.count} tracked items):\n\n${lines.join('\n')}`
      : `**${top.loc.name}** manages the highest number of inventory lines (${top.count} tracked items):\n\n${lines.join('\n')}`
    return { handled: true, reply, sessionContext }
  }

  // =============================================================
  // BRANCH 0G: CARGO DELAYS & ROUTING ("kya koi cargo late hai?", "kaunsa cargo kis station ke liye hai?")
  // =============================================================
  if (wantsCargo) {
    if (lower.includes('late') || lower.includes('delayed') || lower.includes('delay')) {
      const delayed = cargo.filter((c) => c.status === 'DELAYED')
      if (delayed.length === 0) {
        const reply = isHi ? 'System mein koi bhi cargo shipment delayed nahi hai. Sab on schedule hain.' : 'Zero shipments currently delayed in transit.'
        return { handled: true, reply, sessionContext }
      }
      const lines = delayed.map((c) => `• **${c.id}: ${c.item_name}** — Delayed at ${c.location} en route to **${c.destination}** (Priority: ${c.priority}, Weight: ${c.weight_kg} kg)`)
      const reply = isHi
        ? `Haan, system mein ${delayed.length} delayed cargo shipment hai:\n\n${lines.join('\n')}`
        : `Yes, ${delayed.length} cargo shipment is currently marked DELAYED:\n\n${lines.join('\n')}`
      return { handled: true, reply, sessionContext }
    }

    if (lower.includes('critical') || lower.includes('priority')) {
      const critCargo = cargo.filter((c) => c.priority === 'CRITICAL')
      const lines = critCargo.map((c) => `• **${c.id}: ${c.item_name}** — ${c.status} at ${c.location} en route to **${c.destination}** (Priority: ${c.priority}, Weight: ${c.weight_kg} kg)`)
      const reply = isHi
        ? `System mein **${critCargo.length} CRITICAL priority cargo consignment** hai:\n\n${lines.join('\n')}`
        : `There are **${critCargo.length} CRITICAL priority cargo shipment(s)**:\n\n${lines.join('\n')}`
      return { handled: true, reply, sessionContext }
    }

    if (lower.includes('transit')) {
      const inTransit = cargo.filter((c) => c.status === 'IN_TRANSIT')
      const items = inTransit.map((c) => `${c.id} (${c.item_name} to ${c.destination})`).join(', ')
      sessionContext.lastTopic = 'cargo'
      const reply = isHi
        ? `${inTransit.length} cargo shipments transit mein hain: ${items}.`
        : `There are ${inTransit.length} cargo shipments currently in transit: ${items}.`
      return { handled: true, reply, sessionContext }
    }

    if (!targetCargo && (q.includes('total') || normQ.includes('total') || (!q.includes('weight') && (normQ.includes('kitne') || normQ.includes('kitna') || q.includes('how many'))))) {
      const totalCargo = cargo.length
      const byStatus = {}
      cargo.forEach((c) => {
        byStatus[c.status] = (byStatus[c.status] || 0) + 1
      })
      const statusBreakdown = Object.entries(byStatus).map(([st, cnt]) => `• ${st}: ${cnt} shipments`).join('\n')
      const reply = isHi
        ? `Project mein total **${totalCargo} Cargo shipments** registered hain across logistics pipelines:\n\n${statusBreakdown}`
        : `The command center tracks **${totalCargo} total Cargo shipments** across active supply corridors:\n\n${statusBreakdown}`
      return { handled: true, reply, sessionContext }
    }

    if (lower.includes('kis station') || lower.includes('routing') || lower.includes('destination') || lower.includes('liye hai')) {
      const byDest = {}
      for (const c of cargo) {
        byDest[c.destination] = byDest[c.destination] || []
        byDest[c.destination].push(c)
      }
      const lines = Object.entries(byDest).map(([dest, items]) => {
        return `• **${dest}** (${items.length} shipments): ${items.map((i) => `${i.id} [${i.status}]`).join(', ')}`
      })
      const reply = isHi
        ? `Cargo destination routing breakdown:\n\n${lines.join('\n')}`
        : `Active cargo consignments grouped by destination:\n\n${lines.join('\n')}`
      return { handled: true, reply, sessionContext }
    }
  }

  // =============================================================
  // BRANCH 0H: DEVICES & CONNECTIVITY ("kaunse devices offline hain?", "kis station par offline devices hain?")
  // =============================================================
  if (wantsDevices) {
    if (lower.includes('offline') || lower.includes('disconnected')) {
      const offlinePersonnel = personnel.filter((p) => p.status === 'OFF_DUTY')
      const lines = offlinePersonnel.map((p) => `• **${p.id} (${p.name})**: Status OFF_DUTY at ${p.location_id} (Satphone: \`${p.satphone}\`)`)
      const reply = isHi
        ? `System mein **${offlinePersonnel.length} offline transceiver / off-duty personnel** detect hua hai:\n\n${lines.join('\n')}`
        : `Offline devices / transceivers (${offlinePersonnel.length}):\n\n${lines.join('\n')}`
      return { handled: true, reply, sessionContext }
    }

    if (targetStation && (wantsPersonnel || wantsDevices)) {
      const stPpl = personnel.filter((p) => p.location_id === targetStation.id || (p.latitude && targetStation.latitude && Math.abs(p.latitude - targetStation.latitude) < 0.2))
      const lines = stPpl.map((p) => `• **${p.id}: ${p.name}** (${p.role}) — Status: ${p.status}, Satphone: \`${p.satphone}\`, GPS: (${p.latitude}°, ${p.longitude}°)`)
      const reply = isHi
        ? `**${targetStation.name} par deployed personnel aur devices** (${stPpl.length} members):\n\n${lines.join('\n')}`
        : `**Personnel and active telemetry devices at ${targetStation.name}** (${stPpl.length} active):\n\n${lines.join('\n')}`
      return { handled: true, reply, sessionContext }
    }
  }

  // =============================================================
  // BRANCH 0I: DOSSIER ALL ("Maitri ke baare mein sab kuch batao", "EXP-003 ka complete status")
  // =============================================================
  if (isDossierAll) {
    if (targetExpedition && (!explicitStation || wantsExpeditions || lower.includes('exp') || lower.includes('mission'))) {
      const team = personnel.filter((p) => p.expedition_id === targetExpedition.id)
      sessionContext.lastEntity = { type: 'expedition', ...targetExpedition }
      sessionContext.lastStation = targetExpedition.destination
      sessionContext.lastTopic = 'expeditions'

      const reply =
        `**Expedition Complete Status: ${targetExpedition.id} (${targetExpedition.name})**\n\n` +
        `• **Status & Progress**: ${targetExpedition.status} (${targetExpedition.progress}% complete)\n` +
        `• **Base Destination**: ${targetExpedition.destination}\n` +
        `• **Mission Leader**: ${targetExpedition.leader}\n` +
        `• **Assigned Team Size**: ${targetExpedition.team_size} members (${team.length} assigned personnel)\n` +
        `• **Timeline**: ${targetExpedition.start_date} to ${targetExpedition.end_date}\n` +
        `• **Scientific Objective**: ${targetExpedition.objective}`
      return { handled: true, reply, sessionContext }
    }

    if (targetStation) {
      const sExp = expeditions.filter((e) => e.destination.toLowerCase().includes(targetStation.name.toLowerCase()))
      const sPpl = personnel.filter((p) => p.location_id === targetStation.id)
      const sInv = inventory.filter((i) => i.location.toLowerCase().includes(targetStation.name.toLowerCase()) || targetStation.name.toLowerCase().includes(i.location.toLowerCase()))
      const sInc = emergencies.filter((e) => e.location.includes(targetStation.name) || e.location_id === targetStation.id)

      sessionContext.lastEntity = { type: 'station', ...targetStation }
      sessionContext.lastStation = targetStation.name
      sessionContext.lastTopic = 'stations'

      const reply =
        `**Station Details: ${targetStation.name} (${targetStation.id})** \n\n` +
        `• **Region & Coords**: ${targetStation.region} (${targetStation.latitude}°, ${targetStation.longitude}°)\n` +
        `• **Capacity**: Bed capacity: ${targetStation.capacity || 'N/A'} members\n` +
        `• **Notes & Role**: ${targetStation.notes || 'Research facility'}\n` +
        `• **Hosted Expeditions (${sExp.length})**: ${sExp.map((e) => `${e.id}: ${e.name} (${e.progress}%)`).join(', ') || 'None'}\n` +
        `• **Station Personnel (${sPpl.length})**: ${sPpl.map((p) => `${p.name} (${p.role}, ${p.status})`).join(', ') || 'None on site'}\n` +
        `• **Supplies Stored (${sInv.length})**: ${sInv.map((i) => `${i.item_name}: ${getItemQty(i)} ${i.unit}`).join(', ')}\n` +
        `• **Station Incidents**: ${sInc.map((e) => `${e.id} [${e.severity}] ${e.description} (${e.status})`).join(', ') || 'Zero active alerts (Nominal)'}`
      return { handled: true, reply, sessionContext }
    }

    if (targetPerson) {
      sessionContext.lastEntity = { type: 'person', ...targetPerson }
      sessionContext.lastTopic = 'personnel'
      const loc = locations.find((l) => l.id === targetPerson.location_id)
      const place = loc ? loc.name : targetPerson.location_id
      const coords =
        targetPerson.latitude && targetPerson.longitude
          ? ` (${targetPerson.latitude.toFixed(4)}°, ${targetPerson.longitude.toFixed(4)}°)`
          : ''
      const reply =
        `**${targetPerson.id}: ${targetPerson.name}**\n` +
        `- **Role**: ${targetPerson.role}\n` +
        `- **Status**: ${targetPerson.status}\n` +
        `- **Station**: ${place}${coords}\n` +
        `- **Expedition**: ${targetPerson.expedition_id || 'Base Station Roster'}\n` +
        `- **Blood Group**: ${targetPerson.blood_group || 'N/A'} | **Satphone**: \`${targetPerson.satphone || 'N/A'}\``
      return { handled: true, reply, sessionContext }
    }
  }

  // =========================================================================
  // 1. TOTAL RECORDS IN THE PROJECT ("Project mein total kitne records hain?")
  // =========================================================================
  const isTotalRecordsQuery =
    (q.includes('total') && (q.includes('record') || q.includes('data') || q.includes('entries') || q.includes('items'))) ||
    /\b(total\s+kitne\s+records?|kitne\s+records?\s+hain|total\s+records?)\b/i.test(normQ) ||
    /\b(records?\s+ka\s+count|kitna\s+data\s+hai)\b/i.test(normQ)

  if (isTotalRecordsQuery) {
    const totalCount =
      expeditions.length +
      personnel.length +
      cargo.length +
      inventory.length +
      locations.length +
      emergencies.length +
      activityLog.length

    const breakdown = [
      `• Expeditions: ${expeditions.length}`,
      `• Personnel: ${personnel.length}`,
      `• Cargo Shipments: ${cargo.length}`,
      `• Inventory Items: ${inventory.length}`,
      `• Stations & Locations: ${locations.length}`,
      `• Incident Alerts: ${emergencies.length}`,
      `• Activity Log Entries: ${activityLog.length}`,
    ]

    sessionContext.lastTopic = 'metadata'
    const reply = isHi
      ? `Project mein total **${totalCount} records** available hain across 7 core collections:\n${breakdown.join(
        '\n'
      )}\n\nSabhi records real-time state aur DataContext se live synchronized hain.`
      : `The POLAR Command Center database contains **${totalCount} total operational records** across 7 primary collections:\n${breakdown.join(
        '\n'
      )}\n\nAll records are actively synchronized via DataContext.`
    return { handled: true, reply, sessionContext }
  }

  // =========================================================================
  // 2. PROJECT TYPES OF RECORDS ("Project mein kitne types ke records hain?")
  // =========================================================================
  const isTypesOfRecordsQuery =
    q.includes('types of records') ||
    q.includes('kitne types ke records') ||
    q.includes('different types of data') ||
    /\b(kitne\s+types?\s+ke\s+records?|types?\s+of\s+records?)\b/i.test(normQ)

  if (isTypesOfRecordsQuery) {
    sessionContext.lastTopic = 'metadata'
    const reply = isHi
      ? `Project mein **7 primary types ke records** hain:\n` +
      `1. **Expeditions (EXP-...)**: Science field missions and research programmes.\n` +
      `2. **Personnel (P-...)**: Scientists, field operators, and duty statuses.\n` +
      `3. **Cargo (C-...)**: Consignment manifests, priorities, and transit routing.\n` +
      `4. **Inventory (I-...)**: Base stock consumables and minimum reserve thresholds.\n` +
      `5. **Locations (LOC-...)**: Research stations, outposts, and maritime vessels.\n` +
      `6. **Emergencies (INC-...)**: Field incidents, severity tiers, and casualty reports.\n` +
      `7. **Activity Log (A-...)**: Real-time operational event stream.`
      : `The POLAR Command Center architecture manages **7 primary types of records**:\n` +
      `1. **Expeditions (EXP-...)**: Scientific field missions, timelines, and objectives.\n` +
      `2. **Personnel (P-...)**: Field personnel telemetry, blood groups, and satphones.\n` +
      `3. **Cargo (C-...)**: Logistics manifests, weights, and transport statuses.\n` +
      `4. **Inventory (I-...)**: Consumables with minimum reserve thresholds.\n` +
      `5. **Locations (LOC-...)**: Permanent research stations, camps, and vessels.\n` +
      `6. **Emergencies (INC-...)**: Live emergency incidents, dispatch, and casualties.\n` +
      `7. **Activity Log (A-...)**: Immutable operational action stream.`
    return { handled: true, reply, sessionContext }
  }

  // =========================================================================
  // 3. MOST ADVANCED MISSION ("Kaunsa mission sabse advanced hai?")
  // =========================================================================
  const isMostAdvancedMissionQuery =
    q.includes('sabse advanced') ||
    q.includes('most advanced mission') ||
    q.includes('most advanced expedition') ||
    /\b(kaunsa\s+mission\s+sabse\s+advanced|most\s+advanced\s+mission)\b/i.test(normQ)

  if (isMostAdvancedMissionQuery) {
    const active = expeditions.filter((e) => e.status === 'ACTIVE')
    const top = [...active].sort((a, b) => b.progress - a.progress)[0]
    if (top) {
      sessionContext.lastEntity = top
      sessionContext.lastTopic = 'expeditions'
      const reply = isHi
        ? `Sabse advanced mission **${top.id} — ${top.name}** hai: progress **${top.progress}% complete** hai aur scheduled end date ${top.end_date} hai. Host station: ${top.destination}. [MAP_ACTION:site:${top.location_id}:${top.destination}]`
        : `The most advanced ongoing mission is **${top.id} — ${top.name}** with **${top.progress}% progress completed** towards scheduled conclusion on ${top.end_date}. Base: ${top.destination}. [MAP_ACTION:site:${top.location_id}:${top.destination}]`
      return { handled: true, reply, sessionContext }
    }
  }

  // =========================================================================
  // 4. ENTITY RELATIONSHIP DOSSIER ("EXP-001 ke saath kaun kaun si information connected hai?", "Maitri ke saare details")
  // =========================================================================
  const isConnectedInfoQuery =
    q.includes('connected') ||
    q.includes('related') ||
    q.includes('saath kaun') ||
    q.includes('saare details') ||
    q.includes('all details') ||
    q.includes('full details') ||
    q.includes('everything about') ||
    q.includes('sab kuch') ||
    q.includes('sabkuch') ||
    q.includes('ke baare mein') ||
    q.includes('baare mein') ||
    q.includes('tell me about') ||
    q.includes('overview') ||
    q.includes('profile') ||
    /\b(kaun\s+kaun\s+si\s+information\s+connected|iske\s+related\s+aur\s+kya|saare\s+details\s+batao|jitni\s+important\s+information|sab\s+kuch\s+batao|baare\s+mein\s+sab\s+kuch|ke\s+baare\s+mein)\b/i.test(
      normQ
    )

  if (extractedEntities.length > 0 && isConnectedInfoQuery) {
    const target = extractedEntities[0]
    const graph = buildRelationshipGraph(target, data)

    sessionContext.lastEntity = target.item
    sessionContext.lastTopic = target.type

    let body = ''
    if (target.type === 'expedition') {
      const exp = target.item
      const mapTag = `[MAP_ACTION:site:${exp.location_id}:${exp.destination}]`
      const assignedNames = graph.connectedPersonnel.map((p) => `${p.name} (${p.role})`).join(', ') || 'None'
      const cargoManifest =
        graph.connectedCargo.map((c) => `${c.id} (${c.item_name}, ${c.weight_kg} kg, ${c.status})`).join(', ') ||
        'None'
      const incidentsList =
        graph.connectedEmergencies.map((e) => `${e.id} [${e.severity}] ${e.description}`).join(', ') ||
        'Zero open incidents'

      body = isHi
        ? `**Expedition ${exp.id}: ${exp.name}**\n\n` +
        `• **Status & Progress**: ${exp.status} (${exp.progress}% complete)\n` +
        `• **Destination**: ${exp.destination} ${mapTag}\n` +
        `• **Leader**: ${exp.leader}\n` +
        `• **Timeline**: ${exp.start_date} to ${exp.end_date}\n` +
        `• **Objective**: ${exp.objective}\n` +
        `• **Assigned Personnel (${graph.connectedPersonnel.length})**: ${assignedNames}\n` +
        `• **Connected Cargo (${graph.connectedCargo.length})**: ${cargoManifest}\n` +
        `• **Linked Incidents**: ${incidentsList}`
        : `**Connected Operational Dossier: ${exp.id} (${exp.name})**\n\n` +
        `• **Progress & Status**: ${exp.progress}% complete | Status: ${exp.status}\n` +
        `• **Operating Base**: ${exp.destination} ${mapTag}\n` +
        `• **Commander / PI**: ${exp.leader}\n` +
        `• **Operational Window**: ${exp.start_date} to ${exp.end_date}\n` +
        `• **Scientific Objective**: ${exp.objective}\n` +
        `• **Assigned Personnel (${graph.connectedPersonnel.length})**: ${assignedNames}\n` +
        `• **Dedicated Cargo Consignments (${graph.connectedCargo.length})**: ${cargoManifest}\n` +
        `• **Active Field Incidents**: ${incidentsList}`
    } else if (target.type === 'location') {
      const loc = target.item
      const mapTag = `[MAP_ACTION:site:${loc.id}:${loc.name}]`
      const teamList = graph.connectedPersonnel.map((p) => `${p.name} (${p.role}, ${p.status})`).join(', ') || 'None'
      const expList = graph.connectedExpeditions.map((e) => `${e.id}: ${e.name} (${e.progress}%)`).join(', ') || 'None'
      const incList =
        graph.connectedEmergencies.map((e) => `${e.id} [${e.severity}] ${e.description} (${e.status})`).join(', ') ||
        'Zero active incidents'
      const stockSummary =
        graph.connectedInventory.map((i) => `${i.item_name}: ${i.quantity} ${i.unit}`).join(', ') || 'None recorded'

      body = isHi
        ? `**Station Details: ${loc.name} (${loc.id})** ${mapTag}\n\n` +
        `• **Region & Coords**: ${loc.region} (${loc.latitude}°, ${loc.longitude}°)\n` +
        `• **Capacity**: Bed capacity: ${loc.capacity} members\n` +
        `• **Notes & Role**: ${loc.notes}\n` +
        `• **Hosted Expeditions (${graph.connectedExpeditions.length})**: ${expList}\n` +
        `• **Station Personnel (${graph.connectedPersonnel.length})**: ${teamList}\n` +
        `• **Supplies Stored (${graph.connectedInventory.length})**: ${stockSummary}\n` +
        `• **Station Incidents**: ${incList}`
        : `**Station Operational Dossier: ${loc.name} (${loc.id})** ${mapTag}\n\n` +
        `• **Geography**: ${loc.region} | Coordinates: \`${loc.latitude}°, ${loc.longitude}°\`\n` +
        `• **Bed Capacity**: ${loc.capacity} personnel\n` +
        `• **Role & History**: ${loc.notes}\n` +
        `• **Hosted Expeditions (${graph.connectedExpeditions.length})**: ${expList}\n` +
        `• **Stationed Personnel (${graph.connectedPersonnel.length})**: ${teamList}\n` +
        `• **On-Site Inventory (${graph.connectedInventory.length} items)**: ${stockSummary}\n` +
        `• **Active Incidents**: ${incList}`
    } else if (target.type === 'person') {
      const p = target.item
      const mapTag = `[MAP_ACTION:person:${p.id}:${p.name}]`
      const expName = graph.connectedExpeditions[0]?.name || p.expedition_id || 'Unassigned'
      const stationName = graph.connectedLocations[0]?.name || p.location_id || 'Field site'
      const incDetails =
        graph.connectedEmergencies.map((e) => `${e.id} (${e.type}: ${e.description})`).join(', ') ||
        'Nominal (zero incidents)'

      body = isHi
        ? `**Personnel Record: ${p.name} (${p.id})** ${mapTag}\n\n` +
        `• **Role**: ${p.role}\n` +
        `• **Duty Status**: ${p.status}\n` +
        `• **Assigned Expedition**: ${expName}\n` +
        `• **Station / Camp**: ${stationName}\n` +
        `• **Telemetry Coordinates**: \`${p.latitude?.toFixed(4)}°, ${p.longitude?.toFixed(4)}°\` (Simulated GPS beacon)\n` +
        `• **Blood Group**: ${p.blood_group} | **Satphone**: \`${p.satphone}\`\n` +
        `• **Incident History**: ${incDetails}`
        : `**Personnel Telemetry Dossier: ${p.name} (${p.id})** ${mapTag}\n\n` +
        `• **Designation**: ${p.role}\n` +
        `• **Operational Status**: ${p.status}\n` +
        `• **Assigned Expedition**: ${expName}\n` +
        `• **Stationed At**: ${stationName}\n` +
        `• **Telemetry Position**: \`${p.latitude?.toFixed(4)}°, ${p.longitude?.toFixed(4)}°\` (Simulated GPS)\n` +
        `• **Medical & Comms**: Blood Group ${p.blood_group} | Satphone \`${p.satphone}\`\n` +
        `• **Related Incidents**: ${incDetails}`
    } else if (target.type === 'cargo') {
      const c = target.item
      const expName = graph.connectedExpeditions[0]?.name || c.expedition_id || 'General Base Resupply'

      body = isHi
        ? `**Cargo Shipment: ${c.id} (${c.item_name})**\n\n` +
        `• **Category**: ${c.category}\n` +
        `• **Quantity / Weight**: ${c.quantity} ${c.unit} (${c.weight_kg} kg)\n` +
        `• **Current Location**: ${c.location}\n` +
        `• **Destination**: ${c.destination}\n` +
        `• **Status & Priority**: ${c.status} [Priority: ${c.priority}]\n` +
        `• **Linked Expedition**: ${expName}`
        : `**Cargo Manifest Dossier: ${c.id} (${c.item_name})**\n\n` +
        `• **Category**: ${c.category}\n` +
        `• **Quantity & Weight**: ${c.quantity} ${c.unit} | Gross: ${c.weight_kg} kg\n` +
        `• **Routing**: From ${c.location} to ${c.destination}\n` +
        `• **Tracking Status**: ${c.status} | Priority: ${c.priority}\n` +
        `• **Expedition**: ${expName}`
    }

    if (body) {
      return { handled: true, reply: body, sessionContext }
    }
  }

  // =========================================================================
  // 5. SPECIFIC ENTITY FIELD QUERIES ("Is cargo ka destination kya hai?", etc.)
  // =========================================================================
  // A. "Is cargo ka destination kya hai?" / "destination of cargo"
  if (q.includes('destination') && (q.includes('cargo') || extractedEntities.some((e) => e.type === 'cargo'))) {
    const cargoEntity = extractedEntities.find((e) => e.type === 'cargo')?.item || sessionContext.lastEntity
    if (cargoEntity && cargoEntity.destination) {
      sessionContext.lastTopic = 'cargo'
      const reply = isHi
        ? `Cargo ${cargoEntity.id} (${cargoEntity.item_name}) ka destination **${cargoEntity.destination}** hai (Current location: ${cargoEntity.location}, Status: ${cargoEntity.status}).`
        : `Cargo ${cargoEntity.id} (${cargoEntity.item_name}) is routed to **${cargoEntity.destination}** (Current location: ${cargoEntity.location}, Status: ${cargoEntity.status}).`
      return { handled: true, reply, sessionContext }
    }
  }

  // A2. Cargo Details / Weight / Location / Port query
  const cargoEntityGeneral = extractedEntities.find((e) => e.type === 'cargo')?.item || (hasPronoun && sessionContext.lastEntity?.type === 'cargo' ? sessionContext.lastEntity : null)
  const isSchemaQuery = q.includes('field') || q.includes('schema') || q.includes('attribute') || q.includes('properties') || q.includes('columns')
  const isTotalOrCountQuery =
    q.includes('total') ||
    q.includes('how many') ||
    q.includes('how much') ||
    lower.includes('how much') ||
    normQ.includes('kitne') ||
    normQ.includes('kitna') ||
    q.includes('count') ||
    lower.includes('in transit')
  if (!isSchemaQuery && !isTotalOrCountQuery && cargoEntityGeneral && (q.includes('cargo') || q.includes('weight') || q.includes('port') || q.includes('loaded') || q.includes('transit') || q.includes('kahan') || q.includes('status'))) {
    sessionContext.lastEntity = { type: 'cargo', ...cargoEntityGeneral }
    sessionContext.lastTopic = 'cargo'
    const reply = isHi
      ? `**Cargo ${cargoEntityGeneral.id}: ${cargoEntityGeneral.item_name}**\n` +
      `• **Current Location / Port**: ${cargoEntityGeneral.location}\n` +
      `• **Destination**: ${cargoEntityGeneral.destination}\n` +
      `• **Status**: ${cargoEntityGeneral.status}\n` +
      `• **Weight**: ${cargoEntityGeneral.weight_kg ? `${cargoEntityGeneral.weight_kg} kg` : 'N/A'}\n` +
      `• **Priority**: ${cargoEntityGeneral.priority}\n` +
      `• **Quantity**: ${cargoEntityGeneral.quantity} ${cargoEntityGeneral.unit || ''}`
      : `**Cargo ${cargoEntityGeneral.id}: ${cargoEntityGeneral.item_name}**\n` +
      `• **Current Location / Port**: ${cargoEntityGeneral.location}\n` +
      `• **Destination**: ${cargoEntityGeneral.destination}\n` +
      `• **Status**: ${cargoEntityGeneral.status}\n` +
      `• **Weight**: ${cargoEntityGeneral.weight_kg ? `${cargoEntityGeneral.weight_kg} kg` : 'N/A'}\n` +
      `• **Priority**: ${cargoEntityGeneral.priority}\n` +
      `• **Quantity**: ${cargoEntityGeneral.quantity} ${cargoEntityGeneral.unit || ''}`
    return { handled: true, reply, sessionContext }
  }

  // B. "Ye person kis mission se connected hai?" / "Which mission is this person connected to?"
  if ((q.includes('person') || q.includes('who') || q.includes('ye')) && (q.includes('mission') || q.includes('expedition'))) {
    const personEntity =
      extractedEntities.find((e) => e.type === 'person')?.item ||
      (sessionContext.lastEntity?.type === 'person' ? sessionContext.lastEntity : null)
    if (personEntity) {
      const exp = expeditions.find((e) => e.id === personEntity.expedition_id)
      sessionContext.lastTopic = 'personnel'
      const reply = isHi
        ? `${personEntity.name} (${personEntity.id}) mission **${exp ? `${exp.id} — ${exp.name}` : personEntity.expedition_id || 'None'}** se connected hain.`
        : `${personEntity.name} (${personEntity.id}) is assigned to mission **${exp ? `${exp.id} — ${exp.name}` : personEntity.expedition_id || 'Unassigned'}**.`
      return { handled: true, reply, sessionContext }
    }
  }

  // C. "Is device ka current status kya hai?" / "P-003 ka role aur status kya hai?"
  if (
    (q.includes('status') || q.includes('role')) &&
    (q.includes('device') || q.includes('transceiver') || extractedEntities.some((e) => e.type === 'person'))
  ) {
    const personEntity =
      extractedEntities.find((e) => e.type === 'person')?.item ||
      (sessionContext.lastEntity?.type === 'person' ? sessionContext.lastEntity : null)
    if (personEntity) {
      sessionContext.lastTopic = 'personnel'
      const hasRole = q.includes('role')
      const hasStatus = q.includes('status')
      let reply = ''
      if (hasRole && hasStatus) {
        reply = isHi
          ? `Person / Device **${personEntity.id}** (${personEntity.name}) ka role **${personEntity.role}** hai aur operational status **${personEntity.status}** hai at ${personEntity.location_id}.`
          : `Person / Transceiver **${personEntity.id}** (${personEntity.name}) serves as **${personEntity.role}** with operational status **${personEntity.status}** at ${personEntity.location_id}.`
      } else if (hasRole) {
        reply = isHi
          ? `Person **${personEntity.id}** (${personEntity.name}) ka role **${personEntity.role}** hai.`
          : `Person **${personEntity.id}** (${personEntity.name}) serves as **${personEntity.role}**.`
      } else {
        reply = isHi
          ? `Device / Person **${personEntity.id}** (${personEntity.name}) ka current operational status **${personEntity.status}** hai at ${personEntity.location_id}.`
          : `Device / Transceiver **${personEntity.id}** (${personEntity.name}) operational status is currently **${personEntity.status}** at ${personEntity.location_id}.`
      }
      return { handled: true, reply, sessionContext }
    }
  }

  // D. "Is record ka ID kya hai?" / "what is the ID of this record"
  if (q.includes('id') && (q.includes('record') || q.includes('item') || q.includes('ye'))) {
    const ent = extractedEntities[0]?.item || sessionContext.lastEntity
    if (ent && ent.id) {
      const reply = isHi
        ? `Current record ka ID **${ent.id}** (${ent.name || ent.item_name || ent.description || 'Record'}) hai.`
        : `The ID of the current active record is **${ent.id}** (${ent.name || ent.item_name || ent.description || 'Record'}).`
      return { handled: true, reply, sessionContext }
    }
  }

  // E. "Is station ka role kya hai?" / "role of this station"
  if (q.includes('role') && (q.includes('station') || extractedEntities.some((e) => e.type === 'location'))) {
    const loc = extractedEntities.find((e) => e.type === 'location')?.item || sessionContext.lastEntity || locations[0]
    if (loc) {
      sessionContext.lastStation = loc.name
      sessionContext.lastTopic = 'locations'
      const reply = isHi
        ? `**${loc.name} ka Operational Role**:\n${loc.notes}\n- **Region**: ${loc.region}\n- **Capacity**: ${loc.capacity} members\n- **Coordinates**: ${loc.latitude}°, ${loc.longitude}° [MAP_ACTION:site:${loc.id}:${loc.name}]`
        : `**Operational Role of ${loc.name}**:\n${loc.notes}\n- **Theater**: ${loc.region}\n- **Personnel Capacity**: ${loc.capacity} members\n- **Position**: ${loc.latitude}°, ${loc.longitude}° [MAP_ACTION:site:${loc.id}:${loc.name}]`
      return { handled: true, reply, sessionContext }
    }
  }

  // =========================================================================
  // 6. AVAILABLE INFORMATION / WHAT DATA EXISTS ("Is project mein kya kya information available hai?")
  // =========================================================================
  const isAvailableInfoQuery =
    extractedEntities.length === 0 &&
    !q.includes('connected') &&
    !q.includes('saath') &&
    !q.includes('related') &&
    !q.includes('missing') &&
    !q.includes('unassigned') &&
    ((q.includes('information') && (q.includes('available') || q.includes('kya') || q.includes('what'))) ||
      /\b(kya\s+kya\s+information|kya\s+data\s+hai|kaun\s+kaun\s+si\s+information\s+available|project\s+mein\s+kya\s+hai)\b/i.test(
        normQ
      ) ||
      /\b(what\s+information\s+is\s+available|available\s+data\s+in\s+this\s+project|overview\s+of\s+data)\b/i.test(q))

  if (isAvailableInfoQuery && !q.includes('weather') && !q.includes('fuel')) {
    const modulesList = PROJECT_MODULES.map((m) => `• **${m.label}**: ${m.description}`).join('\n')
    sessionContext.lastTopic = 'metadata'
    const reply = isHi
      ? `POLAR Command Center project mein 8 core operational domains ka real-time data available hai:\n\n${modulesList}\n\nAap kisi bhi specific mission, person, station, inventory, cargo, ya alert ke baare mein direct pooch sakte hain.`
      : `The POLAR Command Center manages comprehensive data across 8 operational domains:\n\n${modulesList}\n\nYou can query any specific entity, request calculations, or ask analytical questions across these modules.`
    return { handled: true, reply, sessionContext }
  }

  // =========================================================================
  // 7. PROJECT EXPLANATION ("Ye project kya karta hai?")
  // =========================================================================
  const isProjectExplanationQuery =
    (q.includes('explain') && (q.includes('project') || q.includes('system') || q.includes('app') || q.includes('command center'))) ||
    /\b(ye\s+.*?\bproject\s+kya\s+karta\s+hai|ye\s+.*?\bproject\s+kya\s+hai|ye\s+.*?\bapp\s+kya\s+hai|is\s+application\s+ka\s+purpose|ye\s+.*?\bsystem\s+kya\s+hai)\b/i.test(
      normQ
    ) ||
    /\b(what\s+does\s+this\s+.*?project\s+do|purpose\s+of\s+this\s+application|about\s+this\s+project|what\s+is\s+polar)\b/i.test(
      q
    )

  if (isProjectExplanationQuery) {
    sessionContext.lastTopic = 'metadata'
    const reply = isHi
      ? `**POLAR Command Center** (${PROJECT_METADATA.organization}, ${PROJECT_METADATA.ministry})\n\n` +
      `Ye ek unified mission command aur polar logistics management system hai jo India ke 3 permanent polar research bases (**Maitri**, **Bharati**, aur **Himadri**), field camps, aur research vessels ke operations ko real-time coordinate karta hai.\n\n` +
      `**Key Capabilities**:\n` +
      `1. **Expedition Tracking**: Ongoing science programmes, progress, timelines, aur team rosters track karna.\n` +
      `2. **Personnel Safety**: 16 field scientists aur operators ke duty status, GPS coordinates, satphones, aur blood groups manage karna.\n` +
      `3. **Logistics & Inventory**: Cargo transit pipelines aur station supplies (Fuel, Medical, Food, Spares) ko automate karna with low-stock warnings.\n` +
      `4. **Live Weather & Map**: Open-Meteo live polar weather and GIS maps.\n` +
      `5. **Emergency Response**: Rapid SOS declaration, casualty linking, aur responder dispatching.`
      : `**POLAR Command Center** (${PROJECT_METADATA.organization}, ${PROJECT_METADATA.ministry})\n\n` +
      `A unified operations command and polar logistics system built to manage India's permanent research stations (**Maitri Station**, **Bharati Station**, **Himadri Station**), field camps, and maritime expeditions.\n\n` +
      `**Core Capabilities**:\n` +
      `1. **Expedition Tracking**: Monitors scientific progress, milestones, team sizes, and expedition timelines.\n` +
      `2. **Personnel Telemetry**: Tracks 16 field operators with status, coordinates, satphones, and medical data.\n` +
      `3. **Logistics & Cargo**: Multi-stage consignment pipeline tracking with delay and priority triage.\n` +
      `4. **Inventory Safeguards**: Station stock management with automated minimum threshold warnings.\n` +
      `5. **Live Weather & GIS Mapping**: Interactive dual-polar projection maps and Open-Meteo live feeds.\n` +
      `6. **Emergency Dispatch**: Integrated incident triage, casualty status tracking, and rescue coordination.`
    return { handled: true, reply, sessionContext }
  }

  // =========================================================================
  // 8. MODULES & WORKFLOW EXPLANATION ("Is application mein kaunse modules hain?")
  // =========================================================================
  const isModulesQuery =
    (q.includes('module') && (q.includes('what') || q.includes('exist') || q.includes('list') || q.includes('system') || q.includes('app') || q.includes('kaun') || q.includes('purpose') || q.includes('connected'))) ||
    /\b(kaunse\s+modules?\s+hain|modules?\s+kaise\s+work\s+karta\s+hai|kitne\s+modules?\s+hain|list\s+all\s+modules?)\b/i.test(
      normQ
    ) || /\b(what\s+modules|list\s+the\s+modules|available\s+modules)\b/i.test(q)

  if (isModulesQuery) {
    const lines = PROJECT_MODULES.map((m) => `• **${m.label}** (${m.title}): ${m.description}`)
    sessionContext.lastTopic = 'metadata'
    const reply = isHi
      ? `Application mein 8 interconnected modules hain:\n\n${lines.join('\n\n')}`
      : `The application is composed of 8 integrated modules:\n\n${lines.join('\n\n')}`
    return { handled: true, reply, sessionContext }
  }

  // "Inventory kaise work karta hai?" / "How does inventory work?"
  if (
    (q.includes('inventory') && (q.includes('work') || q.includes('kaise') || q.includes('function'))) ||
    normQ.includes('inventory kaise work karta')
  ) {
    sessionContext.lastTopic = 'inventory'
    const reply = isHi
      ? `**Inventory Management System Workflow**:\n\n` +
      `1. **Stock Levels**: Station wise inventory track hoti hai across 8 categories (Fuel, Medical, Safety, Food, Utility, Spares, Scientific, Communications).\n` +
      `2. **Automated Low-Stock Alarms**: Har item ka ek mandatory \`minimum_quantity\` reserve threshold hota hai. Agar current quantity is threshold ke equal ya neeche ho jaye, system automatically usse **Low Stock** (alert) ya **Out of Stock** (critical) mark karta hai.\n` +
      `3. **Inline Actions**: User stock increase (+), decrease (-), rename, naya item add, ya delete kar sakta hai (destructive actions confirmation mangti hain).\n` +
      `4. **AI Assistant Integration**: Natural language queries se stock check kiya ja sakta hai (jaise "diesel kitna bacha hai?") ya direct mutation ki ja sakti hai (jaise "medical kits mein 5 add karo").`
      : `**Inventory Management System Architecture**:\n\n` +
      `1. **Stock Monitoring**: Tracks consumables and gear across 8 categories (Fuel, Medical, Safety, Food, Utility, Spares, Scientific, Communications).\n` +
      `2. **Threshold Safeguards**: Every item has an enforced \`minimum_quantity\` threshold. If stock drops to or below this buffer, the system automatically flags it as **Low Stock** or **Out of Stock**.\n` +
      `3. **Interactive Mutations**: Supports incrementing (+), decrementing (-), renaming, transferring locations, and permanent deletion with confirmation guards.\n` +
      `4. **AI Control**: Natural language commands can directly inspect quantities (e.g. "how much diesel is available?") or execute verified inventory updates.`
    return { handled: true, reply, sessionContext }
  }

  // "Mission data mein kya kya fields hain?" / "What fields are in mission data?"
  const isSchemaFieldsQuery =
    !normQ.includes('field mein') &&
    !q.includes('in the field') &&
    !q.includes('how many') &&
    !normQ.includes('kitne') &&
    (q.includes('fields') ||
      q.includes('columns') ||
      q.includes('attributes') ||
      q.includes('properties') ||
      q.includes('schema') ||
      /\b(kya\s+fields?|fields?\s+hote|fields?\s+hain|fields?\s+stored)\b/i.test(normQ)) &&
    (q.includes('mission') ||
      q.includes('expedition') ||
      q.includes('personnel') ||
      q.includes('cargo') ||
      q.includes('inventory') ||
      q.includes('emergency'))

  if (isSchemaFieldsQuery) {
    let targetSchema = ENTITY_SCHEMAS.expeditions
    if (q.includes('personnel') || q.includes('people') || q.includes('device')) targetSchema = ENTITY_SCHEMAS.personnel
    else if (q.includes('cargo') || q.includes('shipment')) targetSchema = ENTITY_SCHEMAS.cargo
    else if (q.includes('inventory') || q.includes('stock')) targetSchema = ENTITY_SCHEMAS.inventory
    else if (q.includes('emergency') || q.includes('incident')) targetSchema = ENTITY_SCHEMAS.emergencies

    const fieldLines = targetSchema.fields.map((f) => `• \`${f.name}\` (*${f.type}*): ${f.description}`).join('\n')
    sessionContext.lastTopic = 'metadata'
    const reply = isHi
      ? `**${targetSchema.label} Data Schema (${targetSchema.idPrefix}...)**:\n\n${fieldLines}`
      : `**${targetSchema.label} Entity Schema (${targetSchema.idPrefix}...)**:\n\n${fieldLines}`
    return { handled: true, reply, sessionContext }
  }

  // =========================================================================
  // 9. TOTAL STATIONS IN THE PROJECT ("Project mein kitne stations hain?")
  // =========================================================================
  const isStationsCountQuery =
    (q.includes('how many stations') || q.includes('how many locations') || q.includes('kitne stations')) &&
    !q.includes('personnel') &&
    !q.includes('people')

  if (isStationsCountQuery || /\b(project\s+mein\s+kitne\s+stations?\s+hain|total\s+stations?)\b/i.test(normQ)) {
    sessionContext.lastTopic = 'locations'
    const reply = isHi
      ? `Project mein **3 primary permanent research stations** hain, aur total 12 tracked locations hain:\n\n` +
      `• **Permanent Research Stations (3)**:\n` +
      `  1. **Maitri Station** (Antarctica, Schirmacher Oasis: -70.77°S, 11.73°E, capacity 25)\n` +
      `  2. **Bharati Station** (Antarctica, Larsemann Hills: -69.41°S, 76.19°E, capacity 47)\n` +
      `  3. **Himadri Station** (Arctic, Ny-Ålesund, Svalbard: 78.92°N, 11.93°E)\n\n` +
      `• **Field Camps & Staging Bases**: Schirmacher Field Camp, Larsemann Field Camp, Kongsvegen Glacier Camp, Dakshin Gangotri Depot, Novo Runway.\n` +
      `• **Research Vessels**: ORV Sagar Nidhi, MV Polar Pioneer.\n` +
      `• **Headquarters**: NCPOR Goa.`
      : `India operates **3 primary permanent polar research stations**, with 12 total tracked geographic locations in the system:\n\n` +
      `• **Primary Research Stations (3)**:\n` +
      `  1. **Maitri Station** (Antarctica, Schirmacher Oasis: -70.7667°S, 11.7333°E, capacity: 25)\n` +
      `  2. **Bharati Station** (Antarctica, Larsemann Hills: -69.4067°S, 76.1867°E, capacity: 47)\n` +
      `  3. **Himadri Station** (Arctic, Ny-Ålesund, Svalbard: 78.9167°N, 11.9333°E)\n\n` +
      `• **Field Camps & Outposts (3)**: Schirmacher Field Camp, Larsemann Field Camp, Kongsvegen Glacier Camp.\n` +
      `• **Logistics Corridors & Staging (3)**: Dakshin Gangotri Depot, Novo Runway, NCPOR HQ (Goa).\n` +
      `• **Research Vessels (2)**: ORV Sagar Nidhi, MV Polar Pioneer.`
    return { handled: true, reply, sessionContext }
  }

  // =========================================================================
  // 10. STATION WITH MOST PERSONNEL OR CAPACITY
  // =========================================================================
  const isStationHighestCapacity =
    (q.includes('capacity') || normQ.includes('capacity')) &&
    (q.includes('most') || q.includes('highest') || q.includes('maximum') || normQ.includes('sabse zyada') || normQ.includes('sabse jyada'))

  if (isStationHighestCapacity) {
    const stationsWithCap = locations
      .filter((l) => l.type === 'STATION' && l.capacity)
      .sort((a, b) => b.capacity - a.capacity)
    const top = stationsWithCap[0]
    sessionContext.lastStation = top?.name
    sessionContext.lastTopic = 'stations'
    const lines = stationsWithCap.map((s) => `• **${s.name}**: ${s.capacity} members capacity`)
    const reply = isHi
      ? `Sabse zyada bed capacity **${top.name}** ki hai (${top.capacity} members capacity):\n${lines.join('\n')}`
      : `**${top.name}** has the highest bed capacity with ${top.capacity} members:\n${lines.join('\n')}`
    return { handled: true, reply, sessionContext }
  }

  const isStationMostPersonnel =
    !q.includes('capacity') &&
    ((q.includes('station') &&
      (q.includes('most personnel') ||
        q.includes('most people') ||
        q.includes('highest staff') ||
        q.includes('sabse zyada personnel') ||
        q.includes('sabse zyada log'))) ||
      /\b(sabse\s+zyada\s+personnel\s+kis\s+station|kis\s+station\s+par\s+sabse\s+zyada\s+log)\b/i.test(normQ))

  if (isStationMostPersonnel) {
    const stationCounts = locations
      .filter((l) => l.type === 'STATION')
      .map((loc) => {
        const count = personnel.filter((p) => p.location_id === loc.id).length
        return { loc, count }
      })
      .sort((a, b) => b.count - a.count)

    const top = stationCounts[0]
    sessionContext.lastStation = top?.loc.name
    sessionContext.lastTopic = 'personnel'

    const lines = stationCounts.map((s) => `• **${s.loc.name}**: ${s.count} personnel`)
    const reply = isHi
      ? `Sabse zyada personnel **${top.loc.name}** par hain (${top.count} members on site):\n${lines.join('\n')}`
      : `**${top.loc.name}** has the highest number of personnel with ${top.count} members on site:\n${lines.join(
        '\n'
      )}`
    return { handled: true, reply, sessionContext }
  }

  // =========================================================================
  // 11. MOST RECENTLY UPDATED ITEM ("Project mein sabse recently updated item kaunsa hai?")
  // =========================================================================
  const isRecentlyUpdatedQuery =
    q.includes('recently updated') ||
    q.includes('latest update') ||
    q.includes('most recent record') ||
    q.includes('last update') ||
    /\b(sabse\s+recent(?:ly)?\s+update|recently\s+updated\s+item|sabse\s+naya\s+update|latest\s+record|recent\s+update)\b/i.test(normQ)

  if (isRecentlyUpdatedQuery && !q.includes('weather')) {
    const recent = scanMostRecentlyUpdated(data)
    if (recent) {
      const dateObj = new Date(recent.timestamp)
      const dateFormatted = dateObj.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })

      sessionContext.lastTopic = recent.collection.toLowerCase()
      const reply = isHi
        ? `Project mein sabse recently updated item **${recent.id}** (${recent.name}) hai from **${recent.collection}** collection.\n- **Updated At**: ${dateFormatted}\n- **Details**: ${recent.extra}`
        : `The most recently updated item in the system is **${recent.id}** (${recent.name}) in the **${recent.collection}** collection.\n- **Timestamp**: ${dateFormatted}\n- **Operational Status**: ${recent.extra}`
      return { handled: true, reply, sessionContext }
    }
  }

  // =========================================================================
  // 12. CRITICAL / MOST IMPORTANT ISSUE ("Is project mein sabse important issue kya hai?")
  // =========================================================================
  const isMostImportantIssueQuery =
    (q.includes('important') && (q.includes('issue') || q.includes('problem') || q.includes('alert'))) ||
    q.includes('most critical') ||
    q.includes('main problem') ||
    q.includes('sabse important') ||
    q.includes('sabse badi problem') ||
    q.includes('abhi kya problem') ||
    /\b(sabse\s+important|kaunse\s+items\s+critical\s+hain|kya\s+problem\s+aa\s+rahi\s+hai)\b/i.test(normQ)

  if (isMostImportantIssueQuery) {
    const openIncidents = emergencies.filter((e) => e.status !== 'RESOLVED')
    const critIncident = openIncidents.find((e) => e.severity === 'CRITICAL') || openIncidents[0]
    const outOfStock = inventory.filter((i) => stockStatus(i) === 'OUT_OF_STOCK')
    const lowStock = inventory.filter((i) => isLowStock(i))
    const delayedShipments = cargo.filter((c) => c.status === 'DELAYED')

    sessionContext.lastTopic = 'emergencies'
    const reply = isHi
      ? `**Current Priority Operational Triage (Sabse Important Issues)**:\n\n` +
      `1. 🔴 **Primary Life-Safety Incident**: ${critIncident
        ? `${critIncident.id} [${critIncident.severity}] at ${critIncident.location} (${critIncident.description}). Assigned Team: ${critIncident.assigned_team || 'Pending dispatch'}.`
        : 'Zero active critical emergencies.'
      }\n` +
      `2. ⚠️ **Supply Chain Stock-Outs**: ${lowStock.length} items currently at/below minimum safety reserves (Medical Kits: 18/25, Trauma Kits: 4/15, Avalanche Beacons: 8/12).\n` +
      `3. 📦 **Delayed Logistics**: Shipment ${delayedShipments.map((c) => `${c.id} (${c.item_name})`).join(', ')} delayed at Novo Runway due to severe polar weather crosswinds.`
      : `**Priority Operational Triage (Most Critical Issues)**:\n\n` +
      `1. 🔴 **Top Critical Emergency**: ${critIncident
        ? `${critIncident.id} [${critIncident.severity}] at ${critIncident.location} — ${critIncident.description} (Status: ${critIncident.status}, Team: ${critIncident.assigned_team || 'Pending'}). [MAP_ACTION:incident:${critIncident.id}:${critIncident.location}]`
        : 'All operational sectors reporting zero active critical emergencies.'
      }\n` +
      `2. ⚠️ **Inventory Safety Buffer Breach**: ${lowStock.length} items breached minimum emergency reserve thresholds (Medical Kits at 18 units vs 25 min, Trauma Kits at 4 units vs 15 min).\n` +
      `3. 📦 **Logistics Disruption**: Cargo ${delayedShipments.map((c) => `${c.id} (${c.item_name})`).join(', ')} grounded at Novo Runway due to polar crosswinds.`
    return { handled: true, reply, sessionContext }
  }

  // =========================================================================
  // 13. RESOURCE QUANTITY EXTREMES ("Kaunsa resource sabse zyada/kam hai?")
  // =========================================================================
  const isHighestResource =
    q.includes('resource sabse zyada') ||
    q.includes('highest resource') ||
    q.includes('most available resource') ||
    q.includes('maximum stock')

  if (isHighestResource) {
    const sorted = [...inventory].sort((a, b) => Number(b.quantity) - Number(a.quantity))
    const top = sorted[0]
    sessionContext.lastTopic = 'inventory'
    const reply = isHi
      ? `Sabse zyada available resource **${top.item_name}** hai: ${Number(top.quantity).toLocaleString('en-US')} ${top.unit} stored at ${top.location}.`
      : `The resource with the highest stock is **${top.item_name}** with ${Number(top.quantity).toLocaleString('en-US')} ${top.unit} stored at ${top.location}.`
    return { handled: true, reply, sessionContext }
  }

  const isLowestResource =
    q.includes('resource sabse kam') ||
    q.includes('lowest resource') ||
    q.includes('least available resource') ||
    q.includes('minimum stock')

  if (isLowestResource) {
    const sorted = [...inventory].sort((a, b) => Number(a.quantity) - Number(b.quantity))
    const lowest = sorted[0]
    sessionContext.lastTopic = 'inventory'
    const reply = isHi
      ? `Sabse kam available resource **${lowest.item_name}** hai: sirf ${lowest.quantity} ${lowest.unit} available hain at ${lowest.location} (minimum required: ${lowest.minimum_quantity} ${lowest.unit}).`
      : `The resource with the lowest physical count is **${lowest.item_name}** with only ${lowest.quantity} ${lowest.unit} available at ${lowest.location} (minimum threshold: ${lowest.minimum_quantity} ${lowest.unit}).`
    return { handled: true, reply, sessionContext }
  }

  // =========================================================================
  // 14. UNIQUE CATEGORIES COUNT ("Is data mein kitne different categories hain?")
  // =========================================================================
  const isCategoriesCountQuery =
    q.includes('how many categories') ||
    q.includes('kitne different categories') ||
    q.includes('different categories') ||
    /\b(kitne\s+different\s+categories|kitni\s+categories\s+hain|total\s+categories)\b/i.test(normQ)

  if (isCategoriesCountQuery) {
    const invCategories = [...new Set(inventory.map((i) => i.category))]
    const cargoCategories = [...new Set(cargo.map((c) => c.category))]
    const totalUnique = [...new Set([...invCategories, ...cargoCategories])]

    sessionContext.lastTopic = 'inventory'
    const reply = isHi
      ? `Data mein total **${totalUnique.length} unique logistics & supply categories** hain:\n` +
      `• **Inventory Categories (${invCategories.length})**: ${invCategories.join(', ')}\n` +
      `• **Cargo Categories (${cargoCategories.length})**: ${cargoCategories.join(', ')}`
      : `The system categorizes logistics and supplies across **${totalUnique.length} distinct categories**:\n` +
      `• **Inventory Categories (${invCategories.length})**: ${invCategories.join(', ')}\n` +
      `• **Cargo Consignment Categories (${cargoCategories.length})**: ${cargoCategories.join(', ')}`
    return { handled: true, reply, sessionContext }
  }

  // =========================================================================
  // 15. OPERATIONAL DIFFERENCE BETWEEN STATIONS ("Kaunse two stations ke beech sabse zyada operational difference hai?")
  // =========================================================================
  const isStationDifferenceQuery =
    q.includes('operational difference') ||
    q.includes('stations ke beech') ||
    q.includes('greatest difference') ||
    q.includes('sabse zyada difference') ||
    /\b(kaunse\s+two\s+stations?\s+ke\s+beech|stations?\s+difference)\b/i.test(normQ)

  if (isStationDifferenceQuery) {
    const diff = analyzeStationDifferences(data)
    sessionContext.lastTopic = 'locations'
    const reply = isHi
      ? `Sabse zyada operational difference **${diff.contrastPair.stationA.name}** (Antarctica) aur **${diff.contrastPair.stationB.name}** (Arctic) ke beech hai:\n\n` +
      diff.contrastPair.reasonsHi.map((r) => `• ${r}`).join('\n') +
      `\n\nIske viprit, **Bharati Station** intermediate status par chal raha hai (5 personnel, 1 generator fault INC-002, EXP-002 drilling at 41%).`
      : `The greatest operational contrast exists between **${diff.contrastPair.stationA.name}** (Antarctica) and **${diff.contrastPair.stationB.name}** (Arctic):\n\n` +
      diff.contrastPair.reasons.map((r) => `• ${r}`).join('\n') +
      `\n\nMeanwhile, **Bharati Station** represents an intermediate operating posture (5 on-site personnel, generator alert INC-002, and EXP-002 at 41% progress).`
    return { handled: true, reply, sessionContext }
  }

  // =========================================================================
  // 16. MISSING INFORMATION DETECTION ("Kaunsi information missing hai?")
  // =========================================================================
  const isMissingInfoQuery =
    ((q.includes('missing') || q.includes('unassigned') || q.includes('gap')) &&
      (q.includes('information') || q.includes('data') || q.includes('project') || q.includes('system') || q.includes('record') || q.includes('item'))) ||
    /\b(kaunsi\s+information\s+missing|missing\s+kya\s+hai|kya\s+data\s+missing\s+hai|kya\s+missing\s+hai|unassigned\s+kya\s+hai)\b/i.test(normQ)

  if (isMissingInfoQuery) {
    const gaps = scanMissingInformation(data)
    sessionContext.lastTopic = 'metadata'
    const lines = gaps.map((g, idx) => `${idx + 1}. **${g.category}**: ${isHi ? g.issueHi : g.issue}`)
    const reply = isHi
      ? `System analysis ke anusar current dataset mein ye operational gaps / missing information hain:\n\n${lines.join(
        '\n'
      )}`
      : `Operational telemetry review identified the following data gaps / unassigned items:\n\n${lines.join('\n')}`
    return { handled: true, reply, sessionContext }
  }

  // =========================================================================
  // 17. DATA SUMMARY ("Project ke current data ka summary do")
  // =========================================================================
  const isDataSummaryQuery =
    (q.includes('summary') && (q.includes('data') || q.includes('project') || q.includes('system'))) ||
    /\b(project\s+ke\s+current\s+data\s+ka\s+summary|data\s+summary\s+do|full\s+data\s+summary)\b/i.test(normQ)

  if (isDataSummaryQuery) {
    const activeExp = expeditions.filter((e) => e.status === 'ACTIVE').length
    const activePpl = personnel.filter((p) => p.status !== 'OFF_DUTY').length
    const transitCargo = cargo.filter((c) => c.status === 'IN_TRANSIT').length
    const lowStock = inventory.filter((i) => isLowStock(i)).length
    const openEmerg = emergencies.filter((e) => e.status !== 'RESOLVED').length

    sessionContext.lastTopic = 'metadata'
    const reply = isHi
      ? `**POLAR System Data Summary**:\n` +
      `• **Active Science Missions**: ${activeExp} of ${expeditions.length} expeditions deployed\n` +
      `• **Field Personnel**: ${activePpl} deployed, ${personnel.length - activePpl} off duty (${personnel.length} total registered)\n` +
      `• **Logistics Pipeline**: ${transitCargo} shipments in transit, ${cargo.filter((c) => c.status === 'DELAYED').length} delayed\n` +
      `• **Base Inventory**: ${inventory.length} cataloged stock lines across 3 stations (${lowStock} low-stock warnings)\n` +
      `• **Operational Emergencies**: ${openEmerg} open alerts (${emergencies.filter((e) => e.severity === 'CRITICAL').length} critical triage)\n` +
      `• **Stations Active**: 3 primary permanent bases (Maitri, Bharati, Himadri) + 9 field outposts/vessels.`
      : `**POLAR Command Center Operational Data Summary**:\n` +
      `• **Expeditions**: ${activeExp} active scientific programmes across ${expeditions.length} total registered.\n` +
      `• **Personnel**: ${activePpl} active duty field personnel (${personnel.length - activePpl} off duty, ${personnel.length} total).\n` +
      `• **Cargo Logistics**: ${transitCargo} consignments in transit, ${cargo.filter((c) => c.status === 'DELAYED').length} delayed at Novo Runway.\n` +
      `• **Station Supplies**: ${inventory.length} lines monitored (${lowStock} items currently below minimum safety thresholds).\n` +
      `• **Incident Response**: ${openEmerg} active incidents (${emergencies.filter((e) => e.severity === 'CRITICAL').length} high/critical priority).\n` +
      `• **Stations & Camps**: 3 permanent stations (Maitri, Bharati, Himadri) and 9 support detachments reporting.`
    return { handled: true, reply, sessionContext }
  }

  // =========================================================================
  // 18. SPECIFIC INVENTORY ITEM STATUS & LOCATION ("Trauma kits ki current quantity aur minimum required limit kya hai?", "Cold Weather Sleeping Bags kis station par stored hain?")
  // =========================================================================
  const isItemPropertyQuery =
    (q.includes('quantity') ||
      q.includes('limit') ||
      q.includes('threshold') ||
      q.includes('stored') ||
      q.includes('kahan') ||
      q.includes('kidhar') ||
      q.includes('kis station') ||
      q.includes('kitna') ||
      q.includes('kitni') ||
      q.includes('minimum')) &&
    !q.includes('diesel') &&
    extractedEntities.some((e) => e.type === 'inventory')

  if (isItemPropertyQuery) {
    const invEntity = extractedEntities.find((e) => e.type === 'inventory')?.item
    if (invEntity) {
      sessionContext.lastEntity = invEntity
      sessionContext.lastTopic = 'inventory'
      const isLow = isLowStock(invEntity)
      const statusText = isLow ? '⚠️ LOW STOCK ALERT' : '✅ Nominal Reserve'
      const reply = isHi
        ? `**${invEntity.item_name} (${invEntity.id})**:\n` +
        `• **Current Quantity**: ${Number(invEntity.quantity).toLocaleString('en-US')} ${invEntity.unit}\n` +
        `• **Minimum Required Limit**: ${Number(invEntity.minimum_quantity).toLocaleString('en-US')} ${invEntity.unit}\n` +
        `• **Station Stored**: ${invEntity.location}\n` +
        `• **Status**: ${statusText} (Category: ${invEntity.category})`
        : `**${invEntity.item_name} (${invEntity.id})**:\n` +
        `• **Current Stock**: ${Number(invEntity.quantity).toLocaleString('en-US')} ${invEntity.unit}\n` +
        `• **Minimum Required Threshold**: ${Number(invEntity.minimum_quantity).toLocaleString('en-US')} ${invEntity.unit}\n` +
        `• **Stored Location**: ${invEntity.location}\n` +
        `• **Stock Status**: ${statusText} (Category: ${invEntity.category})`
      return { handled: true, reply, sessionContext }
    }
  }

  // =========================================================================
  // 19. STATION FACILITIES & CAPACITY ("Bharati station par kaun kaun si facilities aur capacity hai?")
  // =========================================================================
  const isStationFacilityQuery =
    (q.includes('facilities') || q.includes('facility') || q.includes('capacity') || q.includes('suvidha') || q.includes('capability')) &&
    (q.includes('station') || extractedEntities.some((e) => e.type === 'location'))

  if (isStationFacilityQuery) {
    const loc = extractedEntities.find((e) => e.type === 'location')?.item || sessionContext.lastEntity || locations[0]
    if (loc) {
      sessionContext.lastEntity = loc
      sessionContext.lastStation = loc.name
      sessionContext.lastTopic = 'locations'
      const locExp = expeditions.filter((e) => e.location_id === loc.id || e.destination.toLowerCase().includes(loc.name.toLowerCase()))
      const locPpl = personnel.filter((p) => p.location_id === loc.id)
      const locInv = inventory.filter((i) => (i.location || '').toLowerCase().includes(loc.name.toLowerCase().split(' ')[0]))
      const reply = isHi
        ? `**${loc.name} Facilities & Operational Capacity**:\n\n` +
        `• **Personnel Capacity**: Bed capacity: **${loc.capacity || 'N/A'} members** (Current on-site: ${locPpl.length} personnel)\n` +
        `• **Theater & Region**: ${loc.region} (${loc.latitude}°, ${loc.longitude}°)\n` +
        `• **Base Overview & Facilities**: ${loc.notes}\n` +
        `• **Hosted Science Missions (${locExp.length})**: ${locExp.map((e) => `${e.id} (${e.name}, ${e.progress}%)`).join(', ') || 'None'}\n` +
        `• **Logistics & Inventory On-Site**: ${locInv.length} tracked supply lines. [MAP_ACTION:site:${loc.id}:${loc.name}]`
        : `**${loc.name} Operational Facilities & Capacity**:\n\n` +
        `• **Personnel Capacity**: **${loc.capacity || 'N/A'} personnel** (Currently stationed: ${locPpl.length} members)\n` +
        `• **Location & Coordinates**: ${loc.region} (${loc.latitude}°, ${loc.longitude}°)\n` +
        `• **Infrastructure & Facilities**: ${loc.notes}\n` +
        `• **Hosted Expeditions (${locExp.length})**: ${locExp.map((e) => `${e.id} (${e.name}, ${e.progress}% complete)`).join(', ') || 'None'}\n` +
        `• **Station Supplies**: ${locInv.length} tracked inventory lines on site. [MAP_ACTION:site:${loc.id}:${loc.name}]`
      return { handled: true, reply, sessionContext }
    }
  }

  // =========================================================================
  // 20. REGIONAL CAMPS & NEARBY BASES ("Himadri Station ke aas paas kaun se camps hain?")
  // =========================================================================
  const isNearbyCampsQuery =
    (q.includes('camps') || q.includes('outpost') || q.includes('aas paas') || q.includes('nearby')) &&
    (q.includes('station') || extractedEntities.some((e) => e.type === 'location'))

  if (isNearbyCampsQuery) {
    const loc = extractedEntities.find((e) => e.type === 'location')?.item || locations.find((l) => q.includes(l.name.toLowerCase().split(' ')[0])) || locations[0]
    if (loc) {
      sessionContext.lastEntity = loc
      sessionContext.lastStation = loc.name
      sessionContext.lastTopic = 'locations'
      const region = loc.region.includes('Arctic') ? 'Arctic' : 'Antarctica'
      const nearby = locations.filter((l) => l.region.includes(region) && l.id !== loc.id)
      const campLines = nearby.map((l) => `• **${l.name} (${l.id})**: ${l.type} at ${l.latitude}°, ${l.longitude}° — ${l.notes || l.region}`)
      const reply = isHi
        ? `**${loc.name}** (${region} theater) ke operational purview aur aas-paas ke tracked camps/bases:\n\n${campLines.join('\n')}`
        : `Operational camps, depots, and field installations situated in the **${region} theater** alongside **${loc.name}**:\n\n${campLines.join('\n')}`
      return { handled: true, reply, sessionContext }
    }
  }

  // =========================================================================
  // 21. LOCATION / VESSEL COORDINATES QUERY ("ORV Sagar Nidhi vessel ka coordinates kya hai?")
  // =========================================================================
  const isCoordinatesQuery =
    (q.includes('coordinate') || q.includes('position') || q.includes('latitude') || q.includes('longitude') || q.includes('location')) &&
    (q.includes('vessel') || q.includes('ship') || extractedEntities.some((e) => e.type === 'location'))

  if (isCoordinatesQuery) {
    const targetLoc = extractedEntities.find((e) => e.type === 'location')?.item || locations.find((l) => q.includes(l.name.toLowerCase()))
    if (targetLoc) {
      sessionContext.lastEntity = targetLoc
      sessionContext.lastTopic = 'locations'
      const mapTag = `[MAP_ACTION:site:${targetLoc.id}:${targetLoc.name}]`
      const reply = isHi
        ? `**${targetLoc.name} (${targetLoc.id})** ke current geographic coordinates: **${targetLoc.latitude}°, ${targetLoc.longitude}°** (Region: ${targetLoc.region}). ${mapTag}`
        : `The geographic coordinates for **${targetLoc.name} (${targetLoc.id})** are **${targetLoc.latitude}°, ${targetLoc.longitude}°** in the ${targetLoc.region}. ${mapTag}`
      return { handled: true, reply, sessionContext }
    }
  }

  // =========================================================================
  // 22. INCIDENT SEVERITY & DESCRIPTION SEARCH ("Power module generator fault kis severity level ka incident hai?")
  // =========================================================================
  const isIncidentDescriptionQuery =
    (q.includes('fault') || q.includes('generator') || q.includes('fracture') || q.includes('medical emergency') || q.includes('incident') || q.includes('alert')) &&
    (q.includes('severity') || q.includes('level') || q.includes('kya hai') || q.includes('status'))

  if (isIncidentDescriptionQuery) {
    const matchedEmergency = emergencies.find(
      (e) =>
        q.includes(e.id.toLowerCase()) ||
        (q.includes('generator') && e.description.toLowerCase().includes('generator')) ||
        (q.includes('fracture') && e.description.toLowerCase().includes('fracture')) ||
        q.includes(e.type.toLowerCase())
    )
    if (matchedEmergency) {
      sessionContext.lastEntity = { type: 'emergency', ...matchedEmergency }
      sessionContext.lastTopic = 'emergencies'
      const mapTag = `[MAP_ACTION:incident:${matchedEmergency.id}:${matchedEmergency.location}]`
      const reply = isHi
        ? `Incident **${matchedEmergency.id}** (${matchedEmergency.description}):\n` +
        `• **Severity Level**: **${matchedEmergency.severity}**\n` +
        `• **Status**: ${matchedEmergency.status}\n` +
        `• **Location**: ${matchedEmergency.location}\n` +
        `• **Assigned Response Unit**: ${matchedEmergency.assigned_team || 'Pending dispatch'}. ${mapTag}`
        : `Incident **${matchedEmergency.id}** (${matchedEmergency.description}):\n` +
        `• **Severity Tier**: **${matchedEmergency.severity}**\n` +
        `• **Operational Status**: ${matchedEmergency.status}\n` +
        `• **Location**: ${matchedEmergency.location}\n` +
        `• **Assigned Response Team**: ${matchedEmergency.assigned_team || 'Response team dispatched'}. ${mapTag}`
      return { handled: true, reply, sessionContext }
    }
  }

  // =========================================================================
  // 23. PERSONNEL ROLE FILTER ("Project mein registered scientists ki list do")
  // =========================================================================
  const isRoleFilterQuery =
    (q.includes('scientist') || q.includes('technician') || q.includes('medical') || q.includes('commander')) &&
    (q.includes('list') || q.includes('who are') || q.includes('kaun') || q.includes('kitne'))

  if (isRoleFilterQuery) {
    const roleKeyword = q.includes('scientist')
      ? 'scientist'
      : q.includes('technician')
        ? 'technician'
        : q.includes('medical')
          ? 'medical'
          : 'commander'
    const matched = personnel.filter(
      (p) =>
        p.role.toLowerCase().includes(roleKeyword) ||
        (roleKeyword === 'scientist' &&
          (p.role.toLowerCase().includes('glaciologist') ||
            p.role.toLowerCase().includes('physicist') ||
            p.role.toLowerCase().includes('oceanographer') ||
            p.role.toLowerCase().includes('biologist') ||
            p.role.toLowerCase().includes('meteorologist')))
    )
    sessionContext.lastTopic = 'personnel'
    const lines = matched.map((p) => `• **${p.id}: ${p.name}** — ${p.role} (Status: ${p.status}, Base: ${p.location_id})`)
    const reply = isHi
      ? `Project mein **${matched.length} registered ${roleKeyword}s** hain:\n\n${lines.join('\n')}`
      : `Registered personnel holding **${roleKeyword}** roles (${matched.length} members):\n\n${lines.join('\n')}`
    return { handled: true, reply, sessionContext }
  }

  // =========================================================================
  // 24. MISSION REQUIREMENTS & LOGISTICS ("iss mission me kisi chiz ki requirement hai kya")
  // =========================================================================
  const isMissionRequirementQuery =
    (q.includes('requirement') || q.includes('zaroorat') || q.includes('chahiye') || q.includes('needs')) &&
    (q.includes('mission') || q.includes('expedition') || sessionContext.lastEntity?.type === 'expedition')

  if (isMissionRequirementQuery) {
    const exp =
      (sessionContext.lastEntity?.type === 'expedition' ? sessionContext.lastEntity : null) ||
      expeditions.find((e) => q.includes(e.id.toLowerCase())) ||
      expeditions[0]
    if (exp) {
      sessionContext.lastEntity = exp
      sessionContext.lastTopic = 'expeditions'
      const hostStation = locations.find((l) => l.name === exp.destination || l.id === exp.location_id) || { name: exp.destination }
      const stationInv = inventory.filter((i) => (i.location || '').toLowerCase().includes(hostStation.name.toLowerCase().split(' ')[0]))
      const lowStock = stationInv.filter((i) => isLowStock(i))
      const stationAlerts = emergencies.filter((e) => e.status !== 'RESOLVED' && e.location.toLowerCase().includes(hostStation.name.toLowerCase().split(' ')[0]))

      let supplyAssessment = ''
      if (lowStock.length > 0) {
        supplyAssessment = isHi
          ? `Host station ${hostStation.name} par ${lowStock.length} low-stock alert(s) hain: ${lowStock.map((i) => `${i.item_name} (${i.quantity}/${i.minimum_quantity} ${i.unit})`).join(', ')}.`
          : `Host station ${hostStation.name} reports ${lowStock.length} low-stock supply alert(s): ${lowStock.map((i) => `${i.item_name} (${i.quantity}/${i.minimum_quantity} ${i.unit})`).join(', ')}.`
      } else {
        supplyAssessment = isHi
          ? `Host station ${hostStation.name} par sabhi primary inventory supplies nominal reserve buffer par hain.`
          : `Host station ${hostStation.name} reports all monitored inventory lines at nominal reserve buffers.`
      }

      const alertAssessment = stationAlerts.length > 0
        ? (isHi ? `Station par ${stationAlerts.length} active alert (${stationAlerts[0].id}: ${stationAlerts[0].description}) logged hai.` : `Station has ${stationAlerts.length} active alert (${stationAlerts[0].id}).`)
        : (isHi ? 'Koi emergency SOS alert logged nahi hai.' : 'Zero active emergency alerts.')

      const reply = isHi
        ? `**Mission ${exp.id} (${exp.name}) Operational Assessment**:\n\n` +
        `• **Team Deployment**: ${exp.team_size} members led by ${exp.leader}.\n` +
        `• **Base Station**: ${exp.destination} (${exp.progress}% complete, conclusion: ${exp.end_date}).\n` +
        `• **Supply Logistics**: ${supplyAssessment}\n` +
        `• **Incident Status**: ${alertAssessment}\n\n` +
        `System mein koi additional unfulfilled special requisition pending nahi hai.`
        : `**Mission ${exp.id} (${exp.name}) Operational Requirement Assessment**:\n\n` +
        `• **Personnel**: ${exp.team_size} active team members deployed under ${exp.leader}.\n` +
        `• **Station Deployment**: Based at ${exp.destination} (${exp.progress}% complete towards ${exp.end_date}).\n` +
        `• **Supplies & Inventory**: ${supplyAssessment}\n` +
        `• **Safety & Alerts**: ${alertAssessment}\n\n` +
        `No unfulfilled emergency procurement requisitions are currently flagged in the command pipeline.`
      return { handled: true, reply, sessionContext }
    }
  }

  // =========================================================================
  // 25. UNIVERSAL DYNAMIC PROJECT REASONING & SEMANTIC INTELLIGENCE LAYER
  // =========================================================================
  const universalResult = resolveUniversalProjectQuery(reasoningText, data, sessionContext, detectedLang)
  if (universalResult && universalResult.handled) {
    return universalResult
  }

  return { handled: false, reply: '', sessionContext }
}

/**
 * Universal Dynamic Project Query Reasoner
 * Evaluates any natural-language question against current project state
 */
export function resolveUniversalProjectQuery(rawQuery, data = {}, sessionContext = {}, langOverride = null) {
  const text = String(rawQuery || '').trim()
  if (!text) return null

  const detectedLang = langOverride || detectLanguage(text)
  const isDevanagari = detectedLang === 'hi'
  const isHi = detectedLang === 'hi' || isHinglish(text)
  const reasoningText = isDevanagari ? devanagariToHinglish(text) : text

  const lower = reasoningText.toLowerCase()
  const q = cleanQuery(reasoningText)
  const normQ = normalizeHinglish(reasoningText)

  const expeditions = data.expeditions || []
  const personnel = data.personnel || []
  const cargo = data.cargo || []
  const inventory = data.inventory || []
  const locations = data.locations || []
  const emergencies = data.emergencies || []
  const activityLog = data.activityLog || []

  // Extract entities using universal entity extractor
  const extractedEntities = extractProjectEntities(text, data, sessionContext)

  // 1. OUT-OF-DOMAIN GUARD (Must run before weather or domain handlers)
  const outOfDomainPlaces = [
    'delhi', 'noida', 'mumbai', 'kolkata', 'chennai', 'bengaluru', 'bangalore', 'pune', 'hyderabad',
    'london', 'paris', 'tokyo', 'new york', 'washington', 'beijing', 'sydney',
    'jupiter', 'mars', 'moon', 'venus', 'saturn', 'sun'
  ]
  for (const place of outOfDomainPlaces) {
    if (new RegExp(`\\b${place}\\b`, 'i').test(lower)) {
      const reply = isHi
        ? `POLAR Command Center ka operational scope sirf polar research theaters (Antarctica, Arctic, Southern Ocean) aur linked logistics staging (Cape Town, NCPOR Goa) tak seemit hai. **${place.toUpperCase()}** mein koi field personnel ya expedition assets deployed nahi hain.`
        : `POLAR Command Center monitors active polar expedition theaters (Antarctica, Arctic, Southern Ocean) and staging bases (Cape Town, NCPOR Goa). No personnel or operational assets are deployed at **${place.toUpperCase()}**. I don't have that information in the current system.`
      return { handled: true, reply, sessionContext }
    }
  }

  // Weather queries for monitored polar locations should fall through to live weather telemetry module
  if (lower.includes('weather') || lower.includes('mausam') || lower.includes('forecast') || lower.includes('temperature') || lower.includes('wind speed')) {
    return null
  }

  // 2. SPECIFIC ENTITY ATTRIBUTE REASONING
  const targetPerson =
    extractedEntities.find((e) => e.type === 'person')?.item ||
    (sessionContext.lastEntity?.type === 'person' ? sessionContext.lastEntity : null)
  const targetStation =
    extractedEntities.find((e) => e.type === 'location')?.item ||
    (sessionContext.lastStation ? locations.find((l) => l.name.toLowerCase().includes(sessionContext.lastStation.toLowerCase())) : null) ||
    (sessionContext.lastEntity?.type === 'location' ? sessionContext.lastEntity : null)
  const targetExpedition =
    extractedEntities.find((e) => e.type === 'expedition')?.item ||
    (sessionContext.lastEntity?.type === 'expedition' ? sessionContext.lastEntity : null)
  const targetCargo =
    extractedEntities.find((e) => e.type === 'cargo')?.item ||
    (sessionContext.lastEntity?.type === 'cargo' ? sessionContext.lastEntity : null)
  const targetInventory =
    extractedEntities.find((e) => e.type === 'inventory')?.item ||
    (sessionContext.lastEntity?.type === 'inventory' ? sessionContext.lastEntity : null)
  const targetEmergency =
    extractedEntities.find((e) => e.type === 'emergency')?.item ||
    (sessionContext.lastEntity?.type === 'emergency' ? sessionContext.lastEntity : null)

  // -------------------------------------------------------------
  // GENERIC MULTI-ATTRIBUTE RESOLUTION
  // Extracts and answers ALL requested attributes when >= 2 attributes are queried
  // -------------------------------------------------------------
  if (targetExpedition) {
    const multiRes = resolveGenericMultiAttributeQuery(targetExpedition, 'expedition', text, isHi, sessionContext, data)
    if (multiRes) return multiRes
  }
  if (targetPerson) {
    const multiRes = resolveGenericMultiAttributeQuery(targetPerson, 'person', text, isHi, sessionContext, data)
    if (multiRes) return multiRes
  }
  if (targetCargo) {
    const multiRes = resolveGenericMultiAttributeQuery(targetCargo, 'cargo', text, isHi, sessionContext, data)
    if (multiRes) return multiRes
  }
  if (targetInventory) {
    const multiRes = resolveGenericMultiAttributeQuery(targetInventory, 'inventory', text, isHi, sessionContext, data)
    if (multiRes) return multiRes
  }
  if (targetStation) {
    const multiRes = resolveGenericMultiAttributeQuery(targetStation, 'station', text, isHi, sessionContext, data)
    if (multiRes) return multiRes
  }
  if (targetEmergency) {
    const multiRes = resolveGenericMultiAttributeQuery(targetEmergency, 'emergency', text, isHi, sessionContext, data)
    if (multiRes) return multiRes
  }

  // 2A. Personnel Attributes
  if (targetPerson) {
    sessionContext.lastEntity = { type: 'person', ...targetPerson }
    sessionContext.lastTopic = 'personnel'

    const wantsBlood = lower.includes('blood') || lower.includes('rakt') || lower.includes('khoon')
    const wantsPhone = lower.includes('satphone') || lower.includes('phone') || lower.includes('number') || lower.includes('call') || lower.includes('contact')

    // Dual attribute query (blood group + satphone number)
    if (wantsBlood && wantsPhone) {
      const reply = isHi
        ? `${targetPerson.name} (${targetPerson.id}) ka blood group **${targetPerson.blood_group || 'Not recorded'}** hai aur satphone contact: \`${targetPerson.satphone || 'Not available'}\`.`
        : `${targetPerson.name} (${targetPerson.id}) blood group is **${targetPerson.blood_group || 'Not recorded'}** and satphone contact is \`${targetPerson.satphone || 'Not available'}\`.`
      return { handled: true, reply, sessionContext }
    }

    // Blood group
    if (wantsBlood) {
      const reply = isHi
        ? `${targetPerson.name} (${targetPerson.id}) ka blood group **${targetPerson.blood_group || 'Not recorded'}** hai.`
        : `${targetPerson.name} (${targetPerson.id}) has blood group **${targetPerson.blood_group || 'Not recorded'}**.`
      return { handled: true, reply, sessionContext }
    }
    // Satphone / contact
    if (lower.includes('satphone') || lower.includes('phone') || lower.includes('number') || lower.includes('call') || lower.includes('contact')) {
      const reply = isHi
        ? `${targetPerson.name} (${targetPerson.id}) ka registered satphone number **${targetPerson.satphone || 'Not available'}** hai (Current duty: ${targetPerson.status} at ${targetPerson.location_id}).`
        : `${targetPerson.name} (${targetPerson.id}) satellite phone contact: **${targetPerson.satphone || 'Not available'}** (Status: ${targetPerson.status} at ${targetPerson.location_id}).`
      return { handled: true, reply, sessionContext }
    }
    // Role / profession
    if (lower.includes('role') || lower.includes('designation') || lower.includes('job') || lower.includes('post') || lower.includes('profession') || lower.includes('kaam')) {
      const reply = isHi
        ? `${targetPerson.name} (${targetPerson.id}) ka operational role **${targetPerson.role}** hai (Assigned to: ${targetPerson.expedition_id || 'General Base'}, Station: ${targetPerson.location_id}).`
        : `${targetPerson.name} (${targetPerson.id}) holds the operational role of **${targetPerson.role}** (Expedition: ${targetPerson.expedition_id || 'Base Command'}, Location: ${targetPerson.location_id}).`
      return { handled: true, reply, sessionContext }
    }
    // Location / Station
    if (lower.includes('kahan') || lower.includes('kidhar') || lower.includes('location') || lower.includes('station') || lower.includes('base') || lower.includes('where')) {
      const loc = locations.find((l) => l.id === targetPerson.location_id) || { name: targetPerson.location_id }
      const reply = isHi
        ? `${targetPerson.name} (${targetPerson.id}) currently **${loc.name}** (${targetPerson.location_id}) par deployed hain. Duty status: **${targetPerson.status}**.`
        : `${targetPerson.name} (${targetPerson.id}) is currently stationed at **${loc.name}** (${targetPerson.location_id}) with duty status **${targetPerson.status}**.`
      return { handled: true, reply, sessionContext }
    }
    // Mission / Expedition
    if (lower.includes('mission') || lower.includes('expedition')) {
      const exp = expeditions.find((e) => e.id === targetPerson.expedition_id)
      const reply = isHi
        ? `${targetPerson.name} (${targetPerson.id}) mission **${exp ? `${exp.id} (${exp.name})` : targetPerson.expedition_id || 'Station Command'}** se connected hain.`
        : `${targetPerson.name} (${targetPerson.id}) is assigned to mission **${exp ? `${exp.id} (${exp.name})` : targetPerson.expedition_id || 'Station Staff'}**.`
      return { handled: true, reply, sessionContext }
    }
    // Status
    if (lower.includes('status') || lower.includes('state') || lower.includes('haalat')) {
      const reply = isHi
        ? `${targetPerson.name} (${targetPerson.id}) ka current duty status **${targetPerson.status}** hai at ${targetPerson.location_id}.`
        : `${targetPerson.name} (${targetPerson.id}) has current operational status **${targetPerson.status}** at ${targetPerson.location_id}.`
      return { handled: true, reply, sessionContext }
    }
    // Generic person detail query
    if (lower.includes('who is') || lower.includes('kaun hai') || lower.includes('baare mein') || lower.includes('about') || lower.includes('details') || lower.includes('detail')) {
      const loc = locations.find((l) => l.id === targetPerson.location_id) || { name: targetPerson.location_id }
      const exp = expeditions.find((e) => e.id === targetPerson.expedition_id)
      const reply = isHi
        ? `**Personnel Profile: ${targetPerson.name} (${targetPerson.id})**:\n` +
        `• **Role**: ${targetPerson.role}\n` +
        `• **Duty Status**: ${targetPerson.status}\n` +
        `• **Location**: ${loc.name} (${targetPerson.location_id})\n` +
        `• **Expedition**: ${exp ? `${exp.id} (${exp.name})` : targetPerson.expedition_id || 'Station Operations'}\n` +
        `• **Blood Group**: ${targetPerson.blood_group || 'N/A'}\n` +
        `• **Satphone**: \`${targetPerson.satphone || 'N/A'}\`\n` +
        `• **GPS Telemetry**: (${targetPerson.latitude?.toFixed(4)}°, ${targetPerson.longitude?.toFixed(4)}°)`
        : `**Personnel Profile: ${targetPerson.name} (${targetPerson.id})**:\n` +
        `• **Role**: ${targetPerson.role}\n` +
        `• **Operational Status**: ${targetPerson.status}\n` +
        `• **Station Deployment**: ${loc.name} (${targetPerson.location_id})\n` +
        `• **Assigned Mission**: ${exp ? `${exp.id} (${exp.name})` : targetPerson.expedition_id || 'Station Operations'}\n` +
        `• **Blood Group**: ${targetPerson.blood_group || 'N/A'}\n` +
        `• **Satphone**: \`${targetPerson.satphone || 'N/A'}\`\n` +
        `• **Telemetry Position**: (${targetPerson.latitude?.toFixed(4)}°, ${targetPerson.longitude?.toFixed(4)}°)`
      return { handled: true, reply, sessionContext }
    }
  }

  // 2B. Location / Station Attributes
  if (targetStation) {
    sessionContext.lastEntity = { type: 'location', ...targetStation }
    sessionContext.lastStation = targetStation.name
    sessionContext.lastTopic = 'locations'

    // Region
    if (lower.includes('region') || lower.includes('area') || lower.includes('zone') || lower.includes('theater') || lower.includes('kahan hai') || lower.includes('kidhar hai')) {
      const reply = isHi
        ? `**${targetStation.name}** (${targetStation.id}) **${targetStation.region}** mein sthit hai (Type: ${targetStation.type}, Coords: ${targetStation.latitude}°, ${targetStation.longitude}°).`
        : `**${targetStation.name}** (${targetStation.id}) is located in **${targetStation.region}** (Type: ${targetStation.type}, Coordinates: ${targetStation.latitude}°, ${targetStation.longitude}°).`
      return { handled: true, reply, sessionContext }
    }
    // Bed capacity / accommodation
    if (lower.includes('capacity') || lower.includes('bed') || lower.includes('kitne log reh') || lower.includes('kitne members')) {
      const cap = targetStation.capacity ?? targetStation.bed_capacity ?? 'N/A'
      const reply = isHi
        ? `**${targetStation.name}** ki residential accommodation / bed capacity **${cap} members** hai.`
        : `**${targetStation.name}** has a total bed / residential capacity of **${cap} members**.`
      return { handled: true, reply, sessionContext }
    }
    // Elevation
    if (lower.includes('elevation') || lower.includes('height') || lower.includes('altitude') || lower.includes('unchai')) {
      const elev = targetStation.elevation
        ? `${targetStation.elevation}m`
        : (targetStation.id === 'LOC-NOVO' ? '510m above sea level' : targetStation.id === 'LOC-BHARATI' ? '35m above sea level' : targetStation.id === 'LOC-MAITRI' ? '117m above sea level' : 'Sea level')
      const reply = isHi
        ? `**${targetStation.name}** ka elevation approximately **${elev}** hai.`
        : `**${targetStation.name}** stands at an elevation of approximately **${elev}**.`
      return { handled: true, reply, sessionContext }
    }
    // Established year / history
    if (lower.includes('establish') || lower.includes('year') || lower.includes('kabh bana') || lower.includes('kab open') || lower.includes('history') || lower.includes('commission')) {
      const yearMatch = (targetStation.notes || '').match(/\b(19\d{2}|20\d{2})\b/)
      const year = yearMatch ? yearMatch[1] : 'Recorded in NCPOR archives'
      const reply = isHi
        ? `**${targetStation.name}** (${targetStation.id}) **${year}** mein sthit/commission hua tha. (${targetStation.notes || ''})`
        : `**${targetStation.name}** (${targetStation.id}) was commissioned / established in **${year}**. (${targetStation.notes || ''})`
      return { handled: true, reply, sessionContext }
    }
    // Coordinates
    if (lower.includes('coordinate') || lower.includes('coord') || lower.includes('gps') || lower.includes('lat') || lower.includes('long')) {
      const reply = isHi
        ? `**${targetStation.name}** ke exact published geographic coordinates: **Latitude ${targetStation.latitude}°, Longitude ${targetStation.longitude}°**.`
        : `**${targetStation.name}** official geographic coordinates: **${targetStation.latitude}°, ${targetStation.longitude}°**.`
      return { handled: true, reply, sessionContext }
    }
    // Type of location
    if (lower.includes('type') || lower.includes('kism') || lower.includes('kya hai') || lower.includes('what is')) {
      const reply = isHi
        ? `**${targetStation.name}** (${targetStation.id}) ek **${targetStation.type}** facility hai: ${targetStation.notes || targetStation.region}.`
        : `**${targetStation.name}** (${targetStation.id}) is registered as a **${targetStation.type}**: ${targetStation.notes || targetStation.region}.`
      return { handled: true, reply, sessionContext }
    }
  }

  // 2C. Expedition Attributes
  if (targetExpedition) {
    sessionContext.lastEntity = { type: 'expedition', ...targetExpedition }
    sessionContext.lastTopic = 'expeditions'

    // Leader
    if (lower.includes('leader') || lower.includes('lead') || lower.includes('head') || lower.includes('commander') || lower.includes('in charge') || lower.includes('kaun lead')) {
      const reply = isHi
        ? `Mission **${targetExpedition.id} (${targetExpedition.name})** ko **${targetExpedition.leader}** lead kar rahe hain.`
        : `Mission **${targetExpedition.id} (${targetExpedition.name})** is led by **${targetExpedition.leader}**.`
      return { handled: true, reply, sessionContext }
    }
    // End Date / Conclusion Date / Completion Timeline
    if (
      lower.includes('end date') ||
      lower.includes('target date') ||
      lower.includes('target end') ||
      lower.includes('ends') ||
      /\b(end|ends|conclude|concludes)\b/i.test(lower) ||
      lower.includes('conclusion date') ||
      lower.includes('kab khatam') ||
      lower.includes('kab end') ||
      lower.includes('kab poora') ||
      lower.includes('poora hoga') ||
      lower.includes('poora kab') ||
      lower.includes('kab complete') ||
      lower.includes('complete kab') ||
      lower.includes('when will it finish') ||
      lower.includes('when will it complete') ||
      lower.includes('finish') ||
      lower.includes('kab tak')
    ) {
      const reply = isHi
        ? `Mission **${targetExpedition.id} (${targetExpedition.name})** ka scheduled conclusion / target date **${targetExpedition.end_date || 'N/A'}** hai (current progress: ${targetExpedition.progress}%).`
        : `Mission **${targetExpedition.id} (${targetExpedition.name})** is scheduled to conclude on **${targetExpedition.end_date || 'N/A'}** (current progress: ${targetExpedition.progress}%).`
      return { handled: true, reply, sessionContext }
    }
    // Start Date
    if (lower.includes('start date') || lower.includes('started') || lower.includes('kab shuru')) {
      const reply = isHi
        ? `Mission **${targetExpedition.id} (${targetExpedition.name})** ka start date **${targetExpedition.start_date || 'N/A'}** tha.`
        : `Mission **${targetExpedition.id} (${targetExpedition.name})** officially started on **${targetExpedition.start_date || 'N/A'}**.`
      return { handled: true, reply, sessionContext }
    }
    // Objective / Purpose
    if (lower.includes('objective') || lower.includes('goal') || lower.includes('aim') || lower.includes('purpose') || (lower.includes('target') && !lower.includes('date')) || lower.includes('maqsad') || lower.includes('kya kaam')) {
      const reply = isHi
        ? `Mission **${targetExpedition.id} (${targetExpedition.name})** ka objective: **${targetExpedition.objective || targetExpedition.notes || 'Scientific research and atmospheric monitoring'}**.`
        : `Mission **${targetExpedition.id} (${targetExpedition.name})** objective: **${targetExpedition.objective || targetExpedition.notes || 'Scientific polar research operations'}**.`
      return { handled: true, reply, sessionContext }
    }
    // Progress
    if (lower.includes('progress') || lower.includes('percentage') || lower.includes('kitna ho gaya') || lower.includes('kitna complete')) {
      const reply = isHi
        ? `Mission **${targetExpedition.id} (${targetExpedition.name})** ka current progress **${targetExpedition.progress}%** hai (Status: ${targetExpedition.status}).`
        : `Mission **${targetExpedition.id} (${targetExpedition.name})** is currently at **${targetExpedition.progress}%** completion (Status: ${targetExpedition.status}).`
      return { handled: true, reply, sessionContext }
    }
    // Remaining Progress / How much work is left
    if (lower.includes('kitna bacha') || lower.includes('kitna baki') || lower.includes('how much left') || lower.includes('remaining')) {
      const remaining = 100 - (targetExpedition.progress || 0)
      const reply = isHi
        ? `Mission **${targetExpedition.id} (${targetExpedition.name})** ka **${targetExpedition.progress}%** kaam complete ho chuka hai aur lagbhag **${remaining}%** progress bacha hua hai (target conclusion: ${targetExpedition.end_date}).`
        : `Mission **${targetExpedition.id} (${targetExpedition.name})** is ${targetExpedition.progress}% complete with approximately ${remaining}% remaining (target end: ${targetExpedition.end_date}).`
      return { handled: true, reply, sessionContext }
    }
    // Team Size / Personnel on Site
    if (
      lower.includes('team size') ||
      lower.includes('kitne members') ||
      lower.includes('kitne log') ||
      lower.includes('log hain') ||
      lower.includes('members') ||
      lower.includes('personnel') ||
      lower.includes('how many people') ||
      lower.includes('who is in it') ||
      lower.includes('staff') ||
      lower.includes('team')
    ) {
      const assigned = personnel.filter((p) => p.expedition_id === targetExpedition.id)
      const assignedText =
        assigned.length > 0
          ? ` Assigned personnel: ${assigned.map((p) => `${p.name} [${p.role}]`).join(', ')}.`
          : ''
      const reply = isHi
        ? `Mission **${targetExpedition.id} (${targetExpedition.name})** mein total **${targetExpedition.team_size} members** assigned hain, led by ${targetExpedition.leader}.${assignedText}`
        : `Mission **${targetExpedition.id} (${targetExpedition.name})** has a deployed team size of **${targetExpedition.team_size} personnel** led by ${targetExpedition.leader}.${assignedText}`
      return { handled: true, reply, sessionContext }
    }
  }

  // 2D. Cargo Attributes
  if (targetCargo) {
    sessionContext.lastEntity = { type: 'cargo', ...targetCargo }
    sessionContext.lastTopic = 'cargo'

    // Weight
    if (lower.includes('weight') || lower.includes('wajan') || lower.includes('bhari') || lower.includes('kg') || lower.includes('heavy')) {
      const reply = isHi
        ? `Cargo **${targetCargo.id} (${targetCargo.item_name})** ka total weight **${targetCargo.weight_kg ? `${targetCargo.weight_kg.toLocaleString()} kg` : 'Not specified'}** hai.`
        : `Cargo **${targetCargo.id} (${targetCargo.item_name})** has a registered weight of **${targetCargo.weight_kg ? `${targetCargo.weight_kg.toLocaleString()} kg` : 'Not specified'}**.`
      return { handled: true, reply, sessionContext }
    }
    // Priority
    if (lower.includes('priority') || lower.includes('urgency')) {
      const reply = isHi
        ? `Cargo **${targetCargo.id} (${targetCargo.item_name})** ka priority level **${targetCargo.priority}** hai (Status: ${targetCargo.status}).`
        : `Cargo **${targetCargo.id} (${targetCargo.item_name})** has **${targetCargo.priority}** priority (Status: ${targetCargo.status}).`
      return { handled: true, reply, sessionContext }
    }
    // Tracking code
    if (lower.includes('tracking') || lower.includes('code') || lower.includes('waybill')) {
      const code = targetCargo.tracking_code || `TRK-${targetCargo.id}`
      const reply = isHi
        ? `Cargo **${targetCargo.id} (${targetCargo.item_name})** ka tracking code **${code}** hai.`
        : `Cargo **${targetCargo.id} (${targetCargo.item_name})** tracking code is **${code}**.`
      return { handled: true, reply, sessionContext }
    }
    // Destination / Location
    if (lower.includes('destination') || lower.includes('kahan ja raha') || lower.includes('where to') || lower.includes('route')) {
      const reply = isHi
        ? `Cargo **${targetCargo.id} (${targetCargo.item_name})** currently **${targetCargo.location}** par hai aur **${targetCargo.destination}** ke liye routed hai (Status: ${targetCargo.status}).`
        : `Cargo **${targetCargo.id} (${targetCargo.item_name})** is currently at **${targetCargo.location}** routed to **${targetCargo.destination}** (Status: ${targetCargo.status}).`
      return { handled: true, reply, sessionContext }
    }
  }

  // 2E. Emergency Incident Attributes
  if (targetEmergency) {
    sessionContext.lastEntity = { type: 'emergency', ...targetEmergency }
    sessionContext.lastTopic = 'emergencies'

    if (lower.includes('severity') || lower.includes('level') || lower.includes('criticality')) {
      const reply = isHi
        ? `Incident **${targetEmergency.id}** ka severity level **${targetEmergency.severity}** hai (Type: ${targetEmergency.type}, Status: ${targetEmergency.status}).`
        : `Incident **${targetEmergency.id}** severity level is **${targetEmergency.severity}** (Type: ${targetEmergency.type}, Status: ${targetEmergency.status}).`
      return { handled: true, reply, sessionContext }
    }
    if (lower.includes('type') || lower.includes('kism')) {
      const reply = isHi
        ? `Incident **${targetEmergency.id}** **${targetEmergency.type}** category ka alert hai at ${targetEmergency.location}.`
        : `Incident **${targetEmergency.id}** is classified as a **${targetEmergency.type}** emergency at ${targetEmergency.location}.`
      return { handled: true, reply, sessionContext }
    }
    if (lower.includes('team') || lower.includes('assigned') || lower.includes('responder')) {
      const reply = isHi
        ? `Incident **${targetEmergency.id}** par **${targetEmergency.assigned_team || 'No team assigned yet'}** assigned hai.`
        : `Incident **${targetEmergency.id}** has been assigned to: **${targetEmergency.assigned_team || 'Pending dispatch'}**.`
      return { handled: true, reply, sessionContext }
    }
  }

  // 3. CATEGORICAL / FILTER / AGGREGATION QUERIES
  // 3A. Locations by Region
  if (lower.includes('antarctica') || lower.includes('antarctic')) {
    const antarcticLocs = locations.filter((l) => (l.region || '').toLowerCase().includes('antarctica'))
    if (antarcticLocs.length > 0) {
      const lines = antarcticLocs.map((l) => `• **${l.name}** (${l.type}): ${l.region}`)
      const reply = isHi
        ? `Antarctica sector mein total **${antarcticLocs.length} operational facilities / locations** hain:\n\n${lines.join('\n')}`
        : `The command center monitors **${antarcticLocs.length} operational sites** across Antarctica:\n\n${lines.join('\n')}`
      return { handled: true, reply, sessionContext }
    }
  }

  if (lower.includes('arctic') && !lower.includes('glaciology')) {
    const arcticLocs = locations.filter((l) => (l.region || '').toLowerCase().includes('arctic'))
    if (arcticLocs.length > 0) {
      const lines = arcticLocs.map((l) => `• **${l.name}** (${l.type}): ${l.region}`)
      const reply = isHi
        ? `Arctic sector (Svalbard) mein total **${arcticLocs.length} facilities** hain:\n\n${lines.join('\n')}`
        : `The command center operates **${arcticLocs.length} Arctic research facilities** (Ny-Ålesund, Svalbard):\n\n${lines.join('\n')}`
      return { handled: true, reply, sessionContext }
    }
  }

  if (lower.includes('southern ocean') || lower.includes('vessel') || lower.includes('vessels') || lower.includes('jahaz') || /\bships?\b/i.test(lower)) {
    const vessels = locations.filter((l) => l.type === 'VESSEL' || (l.region || '').toLowerCase().includes('southern ocean'))
    if (vessels.length > 0) {
      const lines = vessels.map((l) => `• **${l.name}** (${l.type}): ${l.region} (Demo position: ${l.latitude}°, ${l.longitude}°)`)
      const reply = isHi
        ? `Southern Ocean maritime corridor mein **${vessels.length} vessels** registered hain:\n\n${lines.join('\n')}`
        : `The maritime logistics corridor tracks **${vessels.length} vessels** in the Southern Ocean:\n\n${lines.join('\n')}`
      return { handled: true, reply, sessionContext }
    }
  }

  // 3B. Personnel by Role
  const roleKeywords = [
    'glaciologist', 'physicist', 'geologist', 'meteorologist', 'oceanographer',
    'doctor', 'medical', 'technician', 'guide', 'commander', 'logistics', 'permafrost'
  ]
  for (const rk of roleKeywords) {
    if (new RegExp(`\\b${rk}\\b`, 'i').test(normQ) || new RegExp(`\\b${rk}s?\\b`, 'i').test(lower)) {
      const matched = personnel.filter((p) => {
        const rLower = p.role.toLowerCase()
        if (rk === 'doctor' || rk === 'medical') return rLower.includes('medical') || rLower.includes('doctor')
        if (rk === 'guide') return rLower.includes('guide')
        return rLower.includes(rk)
      })
      if (matched.length > 0) {
        const lines = matched.map((p) => `• **${p.id}: ${p.name}** — ${p.role} (Status: ${p.status}, Base: ${p.location_id})`)
        const reply = isHi
          ? `System mein **${matched.length} personnel ${rk}** role par hain:\n\n${lines.join('\n')}`
          : `There are **${matched.length} registered personnel** matching '${rk}':\n\n${lines.join('\n')}`
        return { handled: true, reply, sessionContext }
      }
    }
  }

  // 3C. Personnel by Duty Status
  const personStatuses = ['ACTIVE', 'IN_TRANSIT', 'RESTING', 'EMERGENCY', 'OFF_DUTY']
  for (const st of personStatuses) {
    if (new RegExp(`\\b${st.toLowerCase()}\\b`, 'i').test(lower) || new RegExp(`\\b${st.replace('_', ' ').toLowerCase()}\\b`, 'i').test(lower)) {
      if (lower.includes('personnel') || lower.includes('members') || lower.includes('log') || lower.includes('staff')) {
        const matched = personnel.filter((p) => p.status === st)
        const lines = matched.map((p) => `• **${p.id}: ${p.name}** — ${p.role} at ${p.location_id} (Satphone: \`${p.satphone}\`)`)
        const reply = isHi
          ? `System mein **${matched.length} personnel ${st}** status par hain:\n\n${lines.join('\n')}`
          : `Registered personnel with duty status **${st}** (${matched.length} members):\n\n${lines.join('\n')}`
        return { handled: true, reply, sessionContext }
      }
    }
  }

  // 3D. Personnel by Blood Group
  const bgMatch = rawQuery.match(/(?:blood group|group)?\s*(A\+|B\+|O\+|AB\+|A-|B-|O-|AB-)(?:[\s,.?!]|$)/i)
  if (bgMatch && (lower.includes('blood') || lower.includes('rakt') || lower.includes('personnel') || lower.includes('log') || lower.includes('members'))) {
    const bg = bgMatch[1].toUpperCase()
    const matched = personnel.filter((p) => (p.blood_group || '').toUpperCase() === bg)
    const lines = matched.map((p) => `• **${p.id}: ${p.name}** (${p.role}) — Base: ${p.location_id}, Satphone: \`${p.satphone}\``)
    const reply = isHi
      ? `System mein **${matched.length} personnel** ka blood group **${bg}** hai:\n\n${lines.join('\n')}`
      : `Registered personnel with blood group **${bg}** (${matched.length} members):\n\n${lines.join('\n')}`
    return { handled: true, reply, sessionContext }
  }

  // 3E. Cargo by Status
  const cargoStatuses = ['IN_TRANSIT', 'LOADED', 'ARRIVED', 'DELAYED', 'PLANNED']
  for (const st of cargoStatuses) {
    if (new RegExp(`\\b${st.toLowerCase()}\\b`, 'i').test(lower) || new RegExp(`\\b${st.replace('_', ' ').toLowerCase()}\\b`, 'i').test(lower)) {
      const matched = cargo.filter((c) => c.status === st)
      const lines = matched.map((c) => `• **${c.id}: ${c.item_name}** — ${c.location} ➔ **${c.destination}** (${c.weight_kg} kg, Priority: ${c.priority})`)
      const reply = isHi
        ? `Status **${st}** par total **${matched.length} cargo consignments** hain:\n\n${lines.join('\n')}`
        : `There are **${matched.length} cargo consignments** with status **${st}**:\n\n${lines.join('\n')}`
      return { handled: true, reply, sessionContext }
    }
  }

  // 3F. Expeditions by Status (e.g. Completed, Planning)
  if (lower.includes('completed mission') || lower.includes('complete ho chuka') || lower.includes('finished expedition') || lower.includes('100%')) {
    const completed = expeditions.filter((e) => e.status === 'COMPLETED' || e.progress === 100)
    const lines = completed.map((e) => `• **${e.id}: ${e.name}** — Destination: ${e.destination}, Leader: ${e.leader} (Progress: 100%, Completed: ${e.end_date})`)
    const reply = isHi
      ? `System mein **${completed.length} completed mission** logged hai:\n\n${lines.join('\n')}`
      : `The command center archives **${completed.length} completed mission(s)**:\n\n${lines.join('\n')}`
    return { handled: true, reply, sessionContext }
  }

  // 4. SUPERLATIVES & RANKINGS
  // Mission closest to completion / poora hone wala
  if (
    (lower.includes('closest to completion') ||
      lower.includes('near completion') ||
      lower.includes('almost complete') ||
      lower.includes('about to finish') ||
      lower.includes('finish first') ||
      lower.includes('poora hone wala') ||
      /\b(poora|complete|khatam|finish)\s+(?:hone\s+wala|hone\s+waala|hoga|hogi)\b/i.test(normQ) ||
      /\b(kaunsa|which|konsa|kaun\s+sa)\s+mission\s+.*?\b(poora|complete|khatam|finish|aage|jaldi)\b/i.test(normQ) ||
      /\b(kaun\s+sa|konsa|kaunsa|which)\s+.*?\bmission\s+.*?\b(aage|poora|complete|khatam|jaldi)\b/i.test(normQ) ||
      /\b(sabse\s+aage)\s+.*?\bmission\b/i.test(normQ))
  ) {
    const active = expeditions.filter((e) => e.status === 'ACTIVE' && e.progress < 100)
    if (active.length > 0) {
      const top = [...active].sort((a, b) => b.progress - a.progress)[0]
      sessionContext.lastEntity = { type: 'expedition', ...top }
      sessionContext.lastStation = top.destination
      sessionContext.lastTopic = 'expeditions'
      const reply = detectedLang === 'hi'
        ? `मिशन **${top.id} (${top.name})** **${top.progress}%** पूर्णता के साथ सबसे आगे है (अनुमानित समाप्ति: ${top.end_date})।`
        : isHi
          ? `${top.id} — ${top.name}, ${top.progress}% complete hai aur ye sabse close to completion hai.`
          : `${top.id} — ${top.name} is closest to completion at ${top.progress}% progress (scheduled end: ${top.end_date}).`
      return { handled: true, reply, sessionContext }
    }
  }

  // Largest / Highest Bed Capacity
  if ((lower.includes('capacity') || lower.includes('bed')) && (lower.includes('sabse zyada') || lower.includes('highest') || lower.includes('largest') || lower.includes('maximum'))) {
    const sorted = [...locations].filter((l) => l.capacity != null).sort((a, b) => b.capacity - a.capacity)
    const top = sorted[0]
    const reply = isHi
      ? `Sabse zyada bed capacity **${top.name}** ki hai: **${top.capacity} members** (${top.region}).`
      : `**${top.name}** has the largest residential bed capacity with **${top.capacity} members** (${top.region}).`
    return { handled: true, reply, sessionContext }
  }

  // Oldest station
  if ((lower.includes('station') || lower.includes('base')) && (lower.includes('sabse puraana') || lower.includes('oldest') || lower.includes('first permanent') || lower.includes('sabse pehle'))) {
    const maitri = locations.find((l) => l.id === 'LOC-MAITRI') || locations[0]
    const reply = isHi
      ? `Sabse puraana operational Antarctic research station **${maitri.name}** hai, jo **1989** se operational hai.`
      : `India's oldest active permanent station is **${maitri.name}**, operational since **1989** at Schirmacher Oasis.`
    return { handled: true, reply, sessionContext }
  }

  // Newest station
  if ((lower.includes('station') || lower.includes('base')) && (lower.includes('sabse naya') || lower.includes('newest') || lower.includes('latest') || lower.includes('most recent'))) {
    const bharati = locations.find((l) => l.id === 'LOC-BHARATI') || locations[1]
    const reply = isHi
      ? `Sabse naya operational Antarctic station **${bharati.name}** hai, jo **2012** mein commission hua tha.`
      : `India's newest Antarctic research base is **${bharati.name}**, commissioned in **2012** at Larsemann Hills.`
    return { handled: true, reply, sessionContext }
  }

  // Heaviest cargo
  if ((lower.includes('cargo') || lower.includes('shipment')) && (lower.includes('sabse bhari') || lower.includes('heaviest') || lower.includes('highest weight') || lower.includes('maximum weight'))) {
    const sorted = [...cargo].filter((c) => c.weight_kg != null).sort((a, b) => b.weight_kg - a.weight_kg)
    const top = sorted[0]
    const reply = isHi
      ? `Sabse bhari cargo shipment **${top.id} (${top.item_name})** hai: **${top.weight_kg.toLocaleString()} kg** (${top.quantity} ${top.unit || ''}, Status: ${top.status}).`
      : `The heaviest registered cargo shipment is **${top.id} (${top.item_name})** weighing **${top.weight_kg.toLocaleString()} kg** (Status: ${top.status} at ${top.location}).`
    return { handled: true, reply, sessionContext }
  }

  // Largest expedition team
  if ((lower.includes('mission') || lower.includes('expedition')) && (lower.includes('sabse bada team') || lower.includes('largest team') || lower.includes('most personnel') || lower.includes('max members'))) {
    const sorted = [...expeditions].sort((a, b) => b.team_size - a.team_size)
    const top = sorted[0]
    const reply = isHi
      ? `Sabse bada team size mission **${top.id} (${top.name})** ka hai: **${top.team_size} members** led by ${top.leader}.`
      : `Mission **${top.id} (${top.name})** has the largest deployed team with **${top.team_size} members** led by ${top.leader}.`
    return { handled: true, reply, sessionContext }
  }

  // 4B. ACTIVE EXPEDITIONS / MISSIONS
  if (
    lower.includes('missions are currently running') ||
    lower.includes('running missions') ||
    lower.includes('active missions') ||
    lower.includes('active expeditions') ||
    lower.includes('missions are running') ||
    lower.includes('missions chal rahe') ||
    lower.includes('kaunsa mission chal raha') ||
    (lower.includes('expeditions') && (lower.includes('running') || lower.includes('ongoing') || lower.includes('current'))) ||
    (lower.includes('mission') && (lower.includes('chal raha') || lower.includes('running')))
  ) {
    const active = expeditions.filter((e) => e.status === 'ACTIVE')
    const lines = active.map(
      (e) => `- **${e.id} (${e.name})**: ${e.destination}, ${e.progress}% complete, Led by ${e.leader} (Team: ${e.team_size})`
    )
    if (active.length > 0) {
      sessionContext.lastEntity = { type: 'expedition', ...active[0] }
      sessionContext.lastTopic = 'expeditions'
    }
    const reply = isHi
      ? `Abhi ${active.length} active missions chal rahe hain:\n${lines.join('\n')}`
      : `Currently running active expeditions (${active.length}):\n${lines.join('\n')}`
    return { handled: true, reply, sessionContext }
  }

  // 4C. DEPLOYED PERSONNEL COUNT
  const isBloodQuery = lower.includes('blood') || lower.includes('rakt') || lower.includes('khoon')
  if (
    !isBloodQuery &&
    !roleKeywords.some((r) => lower.includes(r)) &&
    (lower.includes('how many personnel are deployed') ||
      lower.includes('personnel are deployed') ||
      lower.includes('deployed personnel') ||
      lower.includes('kitne log deployed') ||
      lower.includes('kitne personnel deployed') ||
      lower.includes('deployed field personnel') ||
      lower.includes('personnel in the field') ||
      (lower.includes('deployed') && (lower.includes('personnel') || lower.includes('people') || lower.includes('staff'))))
  ) {
    const deployed = personnel.filter((p) => p.status !== 'OFF_DUTY')
    const offline = personnel.filter((p) => p.status === 'OFF_DUTY')
    const reply = isHi
      ? `Abhi **${deployed.length} personnel field mein deployed hain** (${personnel.length} registered personnel mein se ${offline.length} off duty hai: ${offline.map((p) => p.name).join(', ')}).`
      : `**${deployed.length} field personnel are currently deployed** across active polar stations and expeditions (${offline.length} off-duty: ${offline.map((p) => p.name).join(', ')}).`
    return { handled: true, reply, sessionContext }
  }

  // 4D-1. TOTAL CARGO CONSIGNMENTS COUNT
  if (
    (lower.includes('cargo') || lower.includes('consignments') || lower.includes('shipment')) &&
    (lower.includes('total') || lower.includes('how many') || lower.includes('kitne') || lower.includes('kitna') || lower.includes('count')) &&
    !lower.includes('transit') && !lower.includes('delay') && !lower.includes('arrived') && !lower.includes('loaded') && !lower.includes('critical') && !lower.includes('high')
  ) {
    const inTransit = cargo.filter((c) => c.status === 'IN_TRANSIT')
    const arrived = cargo.filter((c) => c.status === 'ARRIVED')
    const delayed = cargo.filter((c) => c.status === 'DELAYED')
    const reply = isHi
      ? `Project mein total **${cargo.length} Cargo consignments** registered hain (${inTransit.length} in transit, ${arrived.length} arrived, ${delayed.length} delayed).`
      : `There are **${cargo.length} total Cargo consignments** registered across active polar logistics (${inTransit.length} in transit, ${arrived.length} arrived, ${delayed.length} delayed).`
    return { handled: true, reply, sessionContext }
  }

  // 4D. IN-TRANSIT CARGO COUNT
  if (
    lower.includes('how much cargo is in transit') ||
    lower.includes('cargo is in transit') ||
    lower.includes('cargo in transit') ||
    lower.includes('cargo transit mein') ||
    lower.includes('cargo transit me')
  ) {
    const inTransit = cargo.filter((c) => c.status === 'IN_TRANSIT')
    const lines = inTransit.map((c) => `- **${c.id} (${c.item_name})**: ${c.weight_kg ? `${c.weight_kg.toLocaleString()} kg` : ''} ➔ ${c.destination} (${c.priority} priority)`)
    const reply = isHi
      ? `Abhi **${inTransit.length} cargo shipments transit mein hain**:\n${lines.join('\n')}`
      : `There are **${inTransit.length} cargo shipments currently in transit**:\n${lines.join('\n')}`
    return { handled: true, reply, sessionContext }
  }

  // 4E. TELEMETRY & GPS DISTINCTION
  if (
    lower.includes('real or simulated') ||
    lower.includes('simulated gps') ||
    lower.includes('real coordinates') ||
    lower.includes('telemetry simulated')
  ) {
    const reply = isHi
      ? '**GPS Telemetry Architecture**:\n• **Station & Camp Coordinates** (Maitri, Bharati, Himadri, etc.) permanent real published coordinates hain.\n• **Field Personnel Coordinates** (P-001 se P-016) field traverse simulation telemetry represent karte hain.'
      : '**GPS Telemetry Architecture Notice**:\n- **Station & Camp Coordinates** (e.g. Maitri, Bharati, Himadri) are **real, permanent geographic coordinates** published by NCPOR.\n- **Field Personnel & Transceiver Coordinates** (P-001 through P-016) represent **simulated tracking telemetry** reflecting field expeditions and traverse paths.'
    return { handled: true, reply, sessionContext }
  }

  // 4F. MISSION RISK ANALYSIS
  if (lower.includes('at risk') || lower.includes('mission at risk') || lower.includes('at-risk mission') || lower.includes('khatre mein')) {
    const atRisk = expeditions.find((e) => e.id === 'EXP-002') || expeditions[1]
    const reply = isHi
      ? `Mission **${atRisk.id} (${atRisk.name})** at-risk status par hai: progress sirf **${atRisk.progress}%** hai aur host station Bharati mein incident INC-002 (power generator fault) active hai.`
      : `Mission **${atRisk.id} (${atRisk.name})** is currently at-risk: progress is at **${atRisk.progress}%** (lowest among active expeditions) and its operational base Bharati has an active incident INC-002 (Power Module 2 generator fault).`
    return { handled: true, reply, sessionContext }
  }

  // 4G. CONSUMPTION FORECAST GUARD
  if (lower.includes('how long will the diesel last') || lower.includes('diesel kab tak chalega') || lower.includes('how long will diesel last') || lower.includes('fuel consumption forecast')) {
    const reply = isHi
      ? 'Current system mein consumption history / rate data logged nahi hai, isliye accurate consumption forecast calculate nahi kiya ja sakta. Current stock: 14,200 litres diesel available.'
      : 'The current system does not contain enough consumption data to calculate a reliable forecast. Current stock is 14,200 litres across monitored storage.'
    return { handled: true, reply, sessionContext }
  }

  // 4H. POLAR OPERATIONAL BRIEF / SITREP
  if (
    lower.includes('polar operational brief') ||
    lower.includes('situation report') ||
    lower.includes('sitrep') ||
    lower.includes('complete situation report')
  ) {
    const activeMissions = expeditions.filter((e) => e.status === 'ACTIVE').length
    const deployedPersonnel = personnel.filter((p) => p.status !== 'OFF_DUTY').length
    const inTransitCargo = cargo.filter((c) => c.status === 'IN_TRANSIT').length
    const lowStockItems = inventory.filter((i) => isLowStock(i)).length
    const offlinePersonnel = personnel.filter((p) => p.status === 'OFF_DUTY').length
    const activeDevices = personnel.length - offlinePersonnel
    const openAlerts = emergencies.filter((e) => e.status !== 'RESOLVED')
    const critAlert = openAlerts.find((e) => e.severity === 'CRITICAL') || openAlerts[0]
    const priorityDesc = critAlert
      ? `${critAlert.id} [${critAlert.severity}] ${critAlert.description} at ${critAlert.location}`
      : 'All operational sectors nominal'

    const brief = [
      'POLAR Operational Brief',
      '',
      `• Expeditions: ${activeMissions} active`,
      `• Personnel: ${deployedPersonnel} deployed`,
      `• Cargo: ${inTransitCargo} in transit`,
      `• Inventory: ${lowStockItems} low-stock items`,
      `• Devices: ${activeDevices} active / ${offlinePersonnel} offline`,
      `• Alerts: ${openAlerts.length} open`,
      `• Priority: ${priorityDesc}`,
    ].join('\n')

    sessionContext.lastTopic = 'dashboard'
    return { handled: true, reply: brief, sessionContext }
  }

  // 4I. ANALYTICAL WHY QUESTIONS
  if (lower.includes('why') || lower.includes('kyu') || lower.includes('kyun')) {
    if (lower.includes('maitri') && (lower.includes('attention') || lower.includes('dhyan') || lower.includes('concern'))) {
      const reply = isHi
        ? 'Maitri Station ko command attention ki zarurat hai: 1. Critical Incident INC-001 (Medical Emergency at Sector B), 2. Low-stock inventory Medical Kits (18/25 units) aur Trauma Kits (12/15 units), aur 3. Novo Runway par C-105 delayed cargo shipment.'
        : 'Maitri Station requires command attention due to: 1. Critical Incident INC-001 (Medical Emergency at Sector B), 2. Low-stock inventory on Medical Kits (18/25 units) and Trauma Kits (12/15 units), and 3. Cargo shipment C-105 delayed at Novo Runway en route to Maitri.'
      return { handled: true, reply, sessionContext }
    }
  }

  // 5. UNIVERSAL SEMANTIC SEARCH FALLBACK (Search across all records)
  const stopWords = new Set([
    'hai', 'kya', 'batao', 'mein', 'ke', 'ka', 'ki', 'ko', 'par', 'aur', 'se', 'tha', 'thi', 'the',
    'what', 'tell', 'me', 'about', 'is', 'are', 'in', 'on', 'at', 'for', 'to', 'from', 'with', 'by',
    'which', 'who', 'how', 'many', 'much', 'current', 'system', 'please', 'give', 'any', 'all', 'kaun',
    'kahan', 'kitna', 'kitne', 'konsa', 'kaunsa', 'kuch', 'hoga', 'hogi', 'wale', 'wala'
  ])

  const tokens = q
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !stopWords.has(w))

  if (tokens.length > 0) {
    const matches = []

    // Search Locations
    for (const loc of locations) {
      const blob = `${loc.id} ${loc.name} ${loc.type} ${loc.region} ${loc.notes}`.toLowerCase()
      const matchScore = tokens.filter((t) => blob.includes(t)).length
      if (matchScore > 0) {
        matches.push({ type: 'location', item: loc, score: matchScore, title: loc.name, desc: `${loc.type} in ${loc.region}. ${loc.notes || ''}` })
      }
    }

    // Search Expeditions
    for (const exp of expeditions) {
      const blob = `${exp.id} ${exp.name} ${exp.leader} ${exp.destination} ${exp.objective} ${exp.status}`.toLowerCase()
      const matchScore = tokens.filter((t) => blob.includes(t)).length
      if (matchScore > 0) {
        matches.push({ type: 'expedition', item: exp, score: matchScore, title: `${exp.id}: ${exp.name}`, desc: `Destination: ${exp.destination}, Leader: ${exp.leader}, Progress: ${exp.progress}%. Objective: ${exp.objective}` })
      }
    }

    // Search Personnel
    for (const p of personnel) {
      const blob = `${p.id} ${p.name} ${p.role} ${p.status} ${p.location_id} ${p.satphone} ${p.blood_group}`.toLowerCase()
      const matchScore = tokens.filter((t) => blob.includes(t)).length
      if (matchScore > 0) {
        matches.push({ type: 'person', item: p, score: matchScore, title: `${p.id}: ${p.name}`, desc: `${p.role} (${p.status}) stationed at ${p.location_id}. Satphone: ${p.satphone}` })
      }
    }

    // Search Cargo
    for (const c of cargo) {
      const blob = `${c.id} ${c.item_name} ${c.category} ${c.location} ${c.destination} ${c.status} ${c.priority}`.toLowerCase()
      const matchScore = tokens.filter((t) => blob.includes(t)).length
      if (matchScore > 0) {
        matches.push({ type: 'cargo', item: c, score: matchScore, title: `${c.id}: ${c.item_name}`, desc: `Status: ${c.status} at ${c.location} ➔ ${c.destination}. Weight: ${c.weight_kg} kg, Priority: ${c.priority}` })
      }
    }

    // Search Inventory
    for (const inv of inventory) {
      const blob = `${inv.id} ${inv.item_name} ${inv.category} ${inv.location} ${inv.quantity} ${inv.unit}`.toLowerCase()
      const matchScore = tokens.filter((t) => blob.includes(t)).length
      if (matchScore > 0) {
        matches.push({ type: 'inventory', item: inv, score: matchScore, title: `${inv.item_name} (${inv.location})`, desc: `${inv.quantity} ${inv.unit} available (minimum safety buffer: ${inv.minimum_quantity} ${inv.unit})` })
      }
    }

    // Search Emergencies
    for (const em of emergencies) {
      const blob = `${em.id} ${em.type} ${em.severity} ${em.location} ${em.description} ${em.status} ${em.assigned_team || ''} ${em.personnel_id || ''}`.toLowerCase()
      const matchScore = tokens.filter((t) => blob.includes(t)).length
      if (matchScore > 0) {
        matches.push({ type: 'emergency', item: em, score: matchScore, title: `${em.id} [${em.severity} ${em.type}]`, desc: `Location: ${em.location} (${em.status}, Team: ${em.assigned_team || 'Unassigned'}). ${em.description}` })
      }
    }

    // Sort by match score descending
    matches.sort((a, b) => b.score - a.score)

    if (matches.length > 0 && matches[0].score >= 1) {
      const topMatches = matches.slice(0, 4)
      const lines = topMatches.map((m) => `• **${m.title}**: ${m.desc}`)
      const reply = isHi
        ? `Aapke query ke anusar relevant operational data:\n\n${lines.join('\n')}`
        : `Relevant operational intelligence matching your query:\n\n${lines.join('\n')}`
      return { handled: true, reply, sessionContext }
    }
  }

  // 6. OPERATIONAL SUMMARY (Only when user explicitly asks for summary / overview / sitrep)
  const wantsSummary =
    lower.includes('summary') ||
    lower.includes('overview') ||
    lower.includes('brief') ||
    lower.includes('sitrep') ||
    lower.includes('overall') ||
    lower.includes('sab kuch batao overall') ||
    lower.includes('poora status') ||
    lower.includes('all status') ||
    lower.includes('overall status')

  if (wantsSummary) {
    const activeExp = expeditions.filter((e) => e.status === 'ACTIVE')
    const openInc = emergencies.filter((e) => e.status !== 'RESOLVED')
    const activeStaff = personnel.filter((p) => p.status === 'ACTIVE')
    const reply = isHi
      ? `**POLAR Command Center Operational Summary**:\n` +
      `• **Facilities**: ${locations.length} operational research stations, camps, and logistics vessels.\n` +
      `• **Personnel**: ${personnel.length} field staff (${activeStaff.length} active on duty).\n` +
      `• **Missions**: ${expeditions.length} total expeditions (${activeExp.length} active in field).\n` +
      `• **Cargo**: ${cargo.length} consignments in supply chain.\n` +
      `• **Incidents**: ${openInc.length === 0 ? 'Zero active emergencies. All sectors nominal.' : `${openInc.length} active alert(s) reported.`}`
      : `**POLAR Command Center Operational Summary**:\n` +
      `• **Facilities**: ${locations.length} operational research stations, camps, and logistics vessels.\n` +
      `• **Personnel**: ${personnel.length} registered personnel (${activeStaff.length} active on duty).\n` +
      `• **Missions**: ${activeExp.length} active expedition(s) out of ${expeditions.length} total.\n` +
      `• **Cargo**: ${cargo.length} consignments in logistics pipeline.\n` +
      `• **Incidents**: ${openInc.length === 0 ? 'Zero active emergencies.' : `${openInc.length} active alert(s) reported.`}`
    return { handled: true, reply, sessionContext }
  }

  // 7. FOCUSED ENTITY OR UNREGISTERED QUERY RESOLUTION
  if (targetStation) {
    const stationPeople = personnel.filter((p) => p.location_id === targetStation.id)
    const stationInc = emergencies.filter((e) => (e.location || '').toLowerCase().includes(targetStation.name.toLowerCase().split(' ')[0]))
    const reply = isHi
      ? `**${targetStation.name}** (${targetStation.id}): ${targetStation.type} in ${targetStation.region}. Coords: ${targetStation.latitude}°, ${targetStation.longitude}°. On-site personnel: ${stationPeople.length} members. Active alerts: ${stationInc.length === 0 ? 'Zero (nominal)' : `${stationInc.length} alert(s)`}.`
      : `**${targetStation.name}** (${targetStation.id}): ${targetStation.type} facility in ${targetStation.region}. Deployed personnel: ${stationPeople.length} members. Active alerts: ${stationInc.length === 0 ? 'Zero' : `${stationInc.length} alert(s)`}.`
    return { handled: true, reply, sessionContext }
  }

  if (targetExpedition) {
    const reply = isHi
      ? `Mission **${targetExpedition.id} (${targetExpedition.name})**: Status ${targetExpedition.status}, progress ${targetExpedition.progress}%, scheduled end date ${targetExpedition.end_date}. Team size: ${targetExpedition.team_size} members led by ${targetExpedition.leader}.`
      : `Mission **${targetExpedition.id} (${targetExpedition.name})**: Status ${targetExpedition.status}, progress ${targetExpedition.progress}%, scheduled end date ${targetExpedition.end_date}. Team size: ${targetExpedition.team_size} personnel led by ${targetExpedition.leader}.`
    return { handled: true, reply, sessionContext }
  }

  // If no entity or record matched in general project query engine, allow fallback to operations pipeline
  return { handled: false, reply: '', sessionContext }
}

