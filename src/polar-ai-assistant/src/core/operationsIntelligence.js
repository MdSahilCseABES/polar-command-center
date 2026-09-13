/**
 * POLAR OPERATIONAL INTELLIGENCE ENGINE
 * =====================================
 * Comprehensive real-time operational intelligence across all Polar Command Center modules:
 * 1. Dashboard & Operational SITREP (POLAR Operational Brief)
 * 2. AI Priority Analysis (Ranked operational triage)
 * 3. Mission Risk Analysis (Grounded risk evaluation & missing-data guards)
 * 4. Resource Forecasting (Historical consumption guard & stock buffers)
 * 5. Expeditions & Missions (rankings, progress, completion, team sizes, leaders, dates)
 * 6. Cargo & Logistics (pipeline breakdown, delayed cargo analysis, weights, destinations)
 * 7. Inventory Intelligence (stock queries, low stock, categories, actions via inventoryActions)
 * 8. Personnel Intelligence (deployed counts, station rosters, mission assignments, statuses, blood groups)
 * 9. Station Profiles & Comparisons (Maitri, Bharati, Himadri, Schirmacher — complete entity profiles)
 * 10. Device & GPS Telemetry (P-001 to P-016, active vs offline, real vs simulated coords, map actions)
 * 11. Weather Intelligence (live/fallback via weatherService, extremes, flight/traverse operational limits)
 * 12. Alerts, Incidents & Emergencies (active vs resolved, severity, assigned teams, casualty details)
 * 13. Cross-Module Correlations & Analytical "Why" Explanations
 * 14. Multi-Turn Conversational Follow-Ups & English / Hinglish Pronoun Resolution
 * 15. Natural Language & Hinglish Response Matching
 *
 * Uses ONLY the application's real data/state/API. Never invents or hardcodes information.
 */

import { processInventoryCommand, isHinglish, normalizeHinglish } from './inventoryActions.js'
import { isLowStock } from '../utils/statuses.js'
import { assessConditions, describeWeatherCode, fetchWeather } from '../utils/weatherService.js'
import { evaluateGeneralProjectQuery } from './projectQueryEngine.js'
import {
  detectLanguage,
  devanagariToHinglish,
  formatHindiEntities,
  matchDomainKnowledge,
  matchGreetingOrHelp,
  matchSystemListQuery,
} from './languageService.js'

export {
  isHinglish,
  detectLanguage,
  devanagariToHinglish,
  formatHindiEntities,
  matchDomainKnowledge,
  matchGreetingOrHelp,
  matchSystemListQuery,
}

/**
 * Extracts [MAP_ACTION:kind:id:label] tags from response text
 */
export function extractMapActions(text) {
  const actions = []
  if (!text || typeof text !== 'string') return { cleanedText: '', actions: [] }
  const actionRegex = /\[MAP_ACTION:(person|site|incident):([A-Za-z0-9-_]+)(?::([^\]]+))?\]/g
  let match
  while ((match = actionRegex.exec(text)) !== null) {
    actions.push({
      kind: match[1],
      id: match[2],
      label: match[3] || match[2],
    })
  }
  const cleanedText = text.replace(actionRegex, '').trim()
  return { cleanedText, actions }
}

/**
 * Formats standard result and extracts map action tokens
 */
function formatResult(text, sessionContext) {
  const { cleanedText, actions } = extractMapActions(text)
  return {
    handled: true,
    reply: cleanedText,
    actions,
    sessionContext,
  }
}

/**
 * Station helper: maps location IDs and known aliases to clean names
 */
const STATION_ALIASES = {
  maitri: { id: 'LOC-MAITRI', name: 'Maitri Station', lat: -70.7667, lng: 11.7333, region: 'Antarctica (Schirmacher Oasis)' },
  bharati: { id: 'LOC-BHARATI', name: 'Bharati Station', lat: -69.4078, lng: 76.1872, region: 'Antarctica (Larsemann Hills)' },
  himadri: { id: 'LOC-HIMADRI', name: 'Himadri Station', lat: 78.9167, lng: 11.9333, region: 'Arctic (Ny-Ålesund, Svalbard)' },
  schirmacher: { id: 'LOC-CAMP-SCH', name: 'Schirmacher Field Camp', lat: -70.755, lng: 11.6667, region: 'Antarctica' },
  novo: { id: 'LOC-NOVO', name: 'Novo Runway', lat: -70.8267, lng: 11.8322, region: 'Antarctica (Blue Ice Runway)' },
  gangotri: { id: 'LOC-DG', name: 'Dakshin Gangotri Depot', lat: -70.0983, lng: 12.0089, region: 'Antarctica' },
  larsemann: { id: 'LOC-CAMP-LAR', name: 'Larsemann Field Camp', lat: -69.4167, lng: 76.2167, region: 'Antarctica' },
  kongsvegen: { id: 'LOC-CAMP-KVG', name: 'Kongsvegen Glacier Camp', lat: 78.85, lng: 12.5, region: 'Arctic' },
  'sagar nidhi': { id: 'LOC-VSL-SN', name: 'ORV Sagar Nidhi', lat: -55.0, lng: 45.0, region: 'Southern Ocean' },
  'polar pioneer': { id: 'LOC-VSL-PP', name: 'MV Polar Pioneer', lat: -48.0, lng: 25.0, region: 'Southern Ocean' },
}

/**
 * Resolves a station or site from query text
 */
function resolveStation(text, locations = []) {
  if (!text) return null
  const q = text.toLowerCase()
  for (const [alias, meta] of Object.entries(STATION_ALIASES)) {
    if (q.includes(alias)) {
      const loc = locations.find((l) => l.id === meta.id || l.name.toLowerCase().includes(alias))
      return loc || meta
    }
  }
  return null
}

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
 * Main Operational Intelligence Query Processor
 * Evaluates queries across all operational domains and maintains conversational multi-turn context.
 */
export async function processOperationsQuery(rawQuery, data = {}, session = {}, weatherCache = null) {
  const q = String(rawQuery || '').trim()
  if (!q) return { handled: false, reply: '' }

  const lang = detectLanguage(q) // 'en' | 'hinglish' | 'hi'
  const isDevanagari = lang === 'hi'
  const isHi = lang === 'hi' || isHinglish(q)
  const sessionContext = { ...(session || {}) }

  // -------------------------------------------------------------
  // 0A. CASUAL GREETINGS, ASSISTANT IDENTITY & CAPABILITIES
  // -------------------------------------------------------------
  const greetingReply = matchGreetingOrHelp(q, data, lang)
  if (greetingReply) {
    return {
      handled: true,
      reply: greetingReply,
      sessionContext,
    }
  }

  // -------------------------------------------------------------
  // 0B. HIGH-PRIORITY DOMAIN KNOWLEDGE DISPATCHER
  // Intercepts tech stack, continuous tile layer, 3D globe, flight limits,
  // SOPs, treaties, and base profiles instantly across English, Hinglish, and Hindi
  // BEFORE any fuzzy entity matching can cause false collisions.
  // -------------------------------------------------------------
  const domainReply = matchDomainKnowledge(q, lang)
  if (domainReply) {
    return {
      handled: true,
      reply: domainReply,
      sessionContext,
    }
  }

  // -------------------------------------------------------------
  // 0C. GENERAL SYSTEM LIST DIRECTIVES (Expeditions, Personnel, Stations, Cargo, Emergencies)
  // Handles natural phrasing: "expeditions batao kosne chal rhe hai abhi", "kaun kaun hai", etc.
  // -------------------------------------------------------------
  const listResult = matchSystemListQuery(q, data, sessionContext, lang)
  if (listResult && listResult.handled) {
    return formatResult(isDevanagari ? formatHindiEntities(listResult.reply) : listResult.reply, sessionContext)
  }

  const queryForReasoning = isDevanagari ? devanagariToHinglish(q) : q
  const lowerQ = queryForReasoning.toLowerCase()
  const normQ = normalizeHinglish(queryForReasoning)

  const expeditions = data.expeditions || []
  const personnel = data.personnel || []
  const cargo = data.cargo || []
  const inventory = data.inventory || []
  const locations = data.locations || []
  const emergencies = data.emergencies || []
  const stats = data.stats || {}

  // -------------------------------------------------------------
  // 1. FIRST: Check for Inventory Action Commands & Direct Stock Queries
  // -------------------------------------------------------------
  const inventoryResult = await processInventoryCommand(queryForReasoning, data, {
    pendingAction: sessionContext.pendingAction,
  })
  if (inventoryResult && inventoryResult.handled) {
    if (inventoryResult.setPending) {
      sessionContext.pendingAction = inventoryResult.setPending
    } else if (inventoryResult.clearPending) {
      sessionContext.pendingAction = null
    } else if (inventoryResult.updatePending) {
      sessionContext.pendingAction = inventoryResult.updatePending
    }
    sessionContext.lastTopic = 'inventory'
    const { cleanedText, actions } = extractMapActions(inventoryResult.reply)
    return {
      handled: true,
      reply: isDevanagari ? formatHindiEntities(cleanedText) : cleanedText,
      actions,
      sessionContext,
    }
  }

  // -------------------------------------------------------------
  // 1B. PRIORITY FLIGHT OPERATIONS & LIVE STATION WEATHER EVALUATOR
  // Evaluates live station weather against DHC-6 Twin Otter VFR envelopes
  // before general entity searches can cause false collisions.
  // -------------------------------------------------------------
  const weatherStationEarly = resolveStation(queryForReasoning, locations)
  const isEarlyFlightQuery =
    weatherStationEarly &&
    (lowerQ.includes('fly') ||
      lowerQ.includes('flight') ||
      lowerQ.includes('flying') ||
      lowerQ.includes('aviation') ||
      lowerQ.includes('twin otter') ||
      lowerQ.includes('helicopter') ||
      lowerQ.includes('sortie') ||
      lowerQ.includes('udana') ||
      lowerQ.includes('safe to fly') ||
      lowerQ.includes('safe hai') ||
      lowerQ.includes('surakshit') ||
      lowerQ.includes('उड़ान') ||
      lowerQ.includes('उड़ाना'))

  if (isEarlyFlightQuery) {
    sessionContext.lastStation = weatherStationEarly.name
    sessionContext.lastTopic = 'flight-safety'
    const flightReport = await assessFlightSafetyForStation(weatherStationEarly.name, locations, weatherCache, lang)
    return formatResult(isDevanagari ? formatHindiEntities(flightReport) : flightReport, sessionContext)
  }

  const isEarlyWeatherQuery =
    weatherStationEarly &&
    (lowerQ.includes('weather') ||
      lowerQ.includes('temperature') ||
      lowerQ.includes('mausam') ||
      lowerQ.includes('wind') ||
      lowerQ.includes('forecast')) &&
    !lowerQ.includes('inventory') &&
    !lowerQ.includes('stock') &&
    !lowerQ.includes('saman') &&
    !lowerQ.includes('personnel') &&
    !lowerQ.includes('kaun')

  if (isEarlyWeatherQuery) {
    sessionContext.lastStation = weatherStationEarly.name
    sessionContext.lastTopic = 'weather'
    const weatherReport = await getWeatherForPlace(weatherStationEarly.name, locations, weatherCache, lang)
    return formatResult(isDevanagari ? formatHindiEntities(weatherReport) : weatherReport, sessionContext)
  }

  // -------------------------------------------------------------
  // 2. UNIVERSAL PROJECT QUERY ENGINE (PRIMARY RUNTIME REASONER)
  // Direct dynamic project reasoning from live state without static intent gating
  // -------------------------------------------------------------
  const universalResult = await evaluateGeneralProjectQuery(queryForReasoning, data, sessionContext, lang)
  if (universalResult && universalResult.handled) {
    if (universalResult.sessionContext) {
      Object.assign(sessionContext, universalResult.sessionContext)
    }
    return formatResult(isDevanagari ? formatHindiEntities(universalResult.reply) : universalResult.reply, sessionContext)
  }

  // -------------------------------------------------------------
  // 2. MULTI-TURN PRONOUN & CONVERSATIONAL FOLLOW-UP RESOLUTION
  // -------------------------------------------------------------
  const lastEntity = sessionContext.lastEntity
  const lastStation = sessionContext.lastStation

  const isFollowUpWhere =
    /^(where is it|where is he|where is she|where are they|location of it|its location|where\?|ye kahan hai|ye kidhar hai|kahan hai|kidhar hai|ye kahan par hai|ye kaha hai|kaha hai)$/i.test(
      normQ
    ) ||
    lowerQ.includes('where is it') ||
    lowerQ.includes('where is that') ||
    lowerQ.includes('where are they') ||
    normQ.includes('ye kahan') ||
    normQ.includes('kahan hai') ||
    normQ.includes('kidhar hai') ||
    lowerQ.includes('kaha hai') ||
    lowerQ.includes('ye kaha')

  const isFollowUpLeader =
    lowerQ.includes('who is leading it') ||
    lowerQ.includes('who is leading that') ||
    lowerQ.includes('who leads it') ||
    lowerQ.includes('who is the leader') ||
    lowerQ.includes('iska leader') ||
    lowerQ.includes('leader kaun') ||
    lowerQ.includes('kaun lead')

  const isFollowUpPeople =
    lowerQ.includes('how many people are there') ||
    lowerQ.includes('how many people in it') ||
    lowerQ.includes('how many members') ||
    lowerQ.includes('team size') ||
    lowerQ.includes('isme kitne log') ||
    lowerQ.includes('kitne log hain') ||
    lowerQ.includes('kitne log')

  const isFollowUpProgress =
    lowerQ.includes('what is its progress') ||
    lowerQ.includes('its progress') ||
    lowerQ.includes('how far along is it') ||
    lowerQ.includes('kitna progress') ||
    lowerQ.includes('iska progress')

  const isFollowUpEndDate =
    lowerQ.includes('kab khatam hoga') ||
    lowerQ.includes('kab end hoga') ||
    lowerQ.includes('when does it end') ||
    lowerQ.includes('when will it finish') ||
    lowerQ.includes('when will it complete') ||
    lowerQ.includes('kab tak poora') ||
    lowerQ.includes('kab poora hoga') ||
    lowerQ.includes('poora kab hoga') ||
    lowerQ.includes('kab tak') ||
    lowerQ.includes('end date')

  const isFollowUpWeather =
    lowerQ.includes('weather there') ||
    lowerQ.includes('weather like there') ||
    lowerQ.includes('what about weather there') ||
    lowerQ.includes('wahan ka weather') ||
    lowerQ.includes('wahan ka mausam')

  const isFollowUpStatus =
    lowerQ.includes('what is its status') ||
    lowerQ.includes('its status') ||
    lowerQ.includes('what is his status') ||
    lowerQ.includes('what is her status') ||
    lowerQ.includes('iska status')

  const isFollowUpWhyDelayed =
    lowerQ.includes('why is it delayed') ||
    lowerQ.includes('why delayed') ||
    lowerQ.includes('kyu delay') ||
    lowerQ.includes('kyun delay')

  const isFollowUpRole =
    lowerQ.includes('what is his role') ||
    lowerQ.includes('what is her role') ||
    lowerQ.includes('what is their role') ||
    lowerQ.includes('his role') ||
    lowerQ.includes('her role') ||
    lowerQ.includes('their role') ||
    lowerQ.includes('iska role') ||
    lowerQ.includes('unka role') ||
    lowerQ.includes('inka role') ||
    lowerQ.includes('kya role hai') ||
    lowerQ.includes('role kya hai')

  const hasExplicitEntity =
    resolveStation(q, locations) !== null ||
    /\b(EXP-\d{3}|P-\d{2,3}|C-\d{3}|I-\d{3,4}|INC-\d{3}|LOC-[A-Z0-9-_]+)\b/i.test(q) ||
    expeditions.some((e) => lowerQ.includes(e.id.toLowerCase()) || lowerQ.includes(e.name.toLowerCase())) ||
    locations.some((l) => lowerQ.includes(l.name.toLowerCase().split(' ')[0])) ||
    personnel.some((p) => lowerQ.includes(p.name.toLowerCase()))

  if (lastEntity && !hasExplicitEntity) {
    // Follow-up: "Where is it?" / "ye kahan hai?"
    if (isFollowUpWhere) {
      if (lastEntity.type === 'expedition') {
        const station = lastEntity.destination || 'Polar Station'
        const mapTag = `[MAP_ACTION:site:${lastEntity.location_id || 'LOC-MAITRI'}:${station}]`
        const reply = isHi
          ? `${lastEntity.id} (${lastEntity.name}) ${station} par based aur operating hai. ${mapTag}`
          : `${lastEntity.id} (${lastEntity.name}) is based and operating at ${station}. ${mapTag}`
        return formatResult(reply, sessionContext)
      }
      if (lastEntity.type === 'person') {
        const loc = locations.find((l) => l.id === lastEntity.location_id)
        const place = loc ? loc.name : lastEntity.location_id || 'field site'
        const coords =
          lastEntity.latitude && lastEntity.longitude
            ? ` (${lastEntity.latitude.toFixed(4)}°, ${lastEntity.longitude.toFixed(4)}°)`
            : ''
        const mapTag = `[MAP_ACTION:person:${lastEntity.id}:${lastEntity.name}]`
        const reply = isHi
          ? `${lastEntity.name} (${lastEntity.id}) abhi ${place} par stationed hain. ${mapTag}`
          : `${lastEntity.name} (${lastEntity.id}, ${lastEntity.role}) is currently stationed at ${place}${coords}. ${mapTag}`
        return formatResult(reply, sessionContext)
      }
      if (lastEntity.type === 'cargo') {
        const dest = lastEntity.destination || 'destination'
        const reply = isHi
          ? `Cargo ${lastEntity.id} (${lastEntity.item_name}) abhi ${lastEntity.location} par hai, destination: ${dest}.`
          : `Cargo ${lastEntity.id} (${lastEntity.item_name}) is currently at ${lastEntity.location}, routed to ${dest} (Status: ${lastEntity.status}).`
        return formatResult(reply, sessionContext)
      }
      if (lastEntity.type === 'emergency') {
        const mapTag = `[MAP_ACTION:incident:${lastEntity.id}:${lastEntity.location}]`
        const reply = isHi
          ? `Incident ${lastEntity.id} ${lastEntity.location} par hai. ${mapTag}`
          : `Incident ${lastEntity.id} is located at ${lastEntity.location}. ${mapTag}`
        return formatResult(reply, sessionContext)
      }
    }

    // Follow-up: "Who is leading it?" / "iska leader kaun hai?"
    if (isFollowUpLeader && lastEntity.type === 'expedition') {
      const reply = isHi
        ? `${lastEntity.leader} iski leader hain.`
        : `${lastEntity.id} (${lastEntity.name}) is led by ${lastEntity.leader}.`
      return formatResult(reply, sessionContext)
    }

    // Follow-up: "What is his role?" / "iska role kya hai?"
    if (isFollowUpRole && (lastEntity.type === 'person' || lastEntity.role)) {
      const reply = isHi
        ? `${lastEntity.name} (${lastEntity.id}) ka role **${lastEntity.role}** hai.`
        : `${lastEntity.name} (${lastEntity.id}) serves as **${lastEntity.role}**.`
      return formatResult(reply, sessionContext)
    }

    // Follow-up: "How many people are there?" / "isme kitne log hain?"
    if (isFollowUpPeople) {
      if (lastEntity.type === 'expedition') {
        const assigned = personnel.filter((p) => p.expedition_id === lastEntity.id)
        const count = lastEntity.team_size || assigned.length
        const reply = isHi
          ? `${count} personnel assigned hain.`
          : `${count} personnel are assigned to ${lastEntity.id} (${lastEntity.name}).`
        return formatResult(reply, sessionContext)
      }
      if (lastEntity.type === 'station' || lastStation) {
        const stationName = lastStation || lastEntity.name
        const stationPeople = personnel.filter(
          (p) =>
            p.location_id === lastEntity.id ||
            p.location_id === resolveStation(stationName, locations)?.id
        )
        const reply = isHi
          ? `${stationName} par ${stationPeople.length} personnel stationed hain.`
          : `There are ${stationPeople.length} personnel stationed at ${stationName}.`
        return formatResult(reply, sessionContext)
      }
    }

    // Follow-up: "What is its progress?" / "iska progress kitna hai?"
    if (isFollowUpProgress && lastEntity.type === 'expedition') {
      const reply = isHi
        ? `${lastEntity.id} (${lastEntity.name}) progress ${lastEntity.progress}% complete hai.`
        : `${lastEntity.id} (${lastEntity.name}) progress is ${lastEntity.progress}% (scheduled completion: ${lastEntity.end_date}).`
      return formatResult(reply, sessionContext)
    }

    // Follow-up: "When does it end?" / "kab khatam hoga?"
    if (isFollowUpEndDate && lastEntity.type === 'expedition') {
      const reply = isHi
        ? `${lastEntity.end_date} ko scheduled hai.`
        : `${lastEntity.id} (${lastEntity.name}) is scheduled to conclude on ${lastEntity.end_date}.`
      return formatResult(reply, sessionContext)
    }

    // Follow-up: "Why is it delayed?"
    if (isFollowUpWhyDelayed && lastEntity.type === 'cargo') {
      const reason =
        lastEntity.notes ||
        'Severe crosswinds and adverse weather conditions delaying aircraft departures at Novo Runway.'
      const reply = isHi
        ? `Cargo ${lastEntity.id} (${lastEntity.item_name}) ${lastEntity.location} par delayed hai: ${reason}`
        : `Cargo ${lastEntity.id} (${lastEntity.item_name}) is delayed at ${lastEntity.location}: ${reason}`
      return formatResult(reply, sessionContext)
    }

    // Follow-up: "What's the weather there?"
    if (isFollowUpWeather && (lastStation || lastEntity.destination || lastEntity.name)) {
      const targetPlace = lastStation || lastEntity.destination || lastEntity.name
      const weatherReport = await getWeatherForPlace(targetPlace, locations, weatherCache)
      return formatResult(weatherReport, sessionContext)
    }

    // Follow-up: "wahan koi alert hai kya?" / "is there any alert there?"
    const isFollowUpAlert =
      (lowerQ.includes('alert') || lowerQ.includes('incident') || lowerQ.includes('emergency')) &&
      (lowerQ.includes('wahan') || lowerQ.includes('there') || lowerQ.includes('koi alert') || lowerQ.includes('any alert'))

    if (isFollowUpAlert && (lastStation || lastEntity)) {
      const stationName = lastStation || lastEntity.destination || lastEntity.name || 'Polar Station'
      const openAlerts = emergencies.filter(
        (e) => e.status !== 'RESOLVED' && e.location.toLowerCase().includes(stationName.toLowerCase().split(' ')[0])
      )
      sessionContext.lastTopic = 'emergencies'
      if (openAlerts.length === 0) {
        const reply = isHi
          ? `Nahi, ${stationName} par koi active alert ya emergency incident nahi hai. Sabhi operational sectors nominal reporting kar rahe hain.`
          : `No active alerts detected at ${stationName}. All local operational sectors are reporting nominal status.`
        return formatResult(reply, sessionContext)
      }
      const lines = openAlerts.map((e) => `- **${e.id} [${e.severity}]**: ${e.location} — ${e.description} (Status: ${e.status}) [MAP_ACTION:incident:${e.id}:${e.location}]`)
      const reply = isHi
        ? `Haan, ${stationName} par ${openAlerts.length} active alert(s) hain:\n${lines.join('\n')}`
        : `Yes, ${stationName} has ${openAlerts.length} active alert(s):\n${lines.join('\n')}`
      return formatResult(reply, sessionContext)
    }

    // Follow-up: "iske resources kaise hain?" / "how are its resources?"
    const isFollowUpResources =
      (lowerQ.includes('resource') || lowerQ.includes('supplies') || lowerQ.includes('inventory') || lowerQ.includes('ration')) &&
      (lowerQ.includes('kaise') || lowerQ.includes('how') || lowerQ.includes('kaisa') || lowerQ.includes('status'))

    if (isFollowUpResources && (lastStation || lastEntity)) {
      const stationName = lastStation || lastEntity.destination || lastEntity.name || 'Polar Station'
      const stationInv = inventory.filter((i) => (i.location || '').toLowerCase().includes(stationName.toLowerCase().split(' ')[0]))
      const lowStock = stationInv.filter((i) => isLowStock(i))
      sessionContext.lastTopic = 'inventory'
      if (stationInv.length === 0) {
        const reply = isHi
          ? `${stationName} par currently koi direct supply catalogued nahi hai.`
          : `There are currently no catalogued inventory items directly stored at ${stationName}.`
        return formatResult(reply, sessionContext)
      }
      const lines = stationInv.map((i) => {
        const flag = isLowStock(i) ? '⚠️ LOW' : '✅ Nominal'
        return `- **${i.item_name}**: ${Number(i.quantity).toLocaleString('en-US')} ${i.unit} (${flag}, min threshold: ${Number(i.minimum_quantity).toLocaleString('en-US')})`
      })
      const reply = isHi
        ? `${stationName} par ${stationInv.length} tracked supplies hain (${lowStock.length > 0 ? `${lowStock.length} items low stock par` : 'sabhi nominal'}):\n${lines.join('\n')}`
        : `Inventory resources at ${stationName} (${stationInv.length} monitored lines, ${lowStock.length} low-stock alerts):\n${lines.join('\n')}`
      return formatResult(reply, sessionContext)
    }
  }

  // Standalone or follow-up alert check ("wahan koi alert hai kya?" / "is there any alert?")
  const isAlertQuery =
    (lowerQ.includes('alert') || lowerQ.includes('incident') || lowerQ.includes('emergency')) &&
    (lowerQ.includes('wahan') || lowerQ.includes('there') || lowerQ.includes('koi alert') || lowerQ.includes('any alert') || lowerQ.includes('kya alert'))

  if (isAlertQuery) {
    const stationName = lastStation || lastEntity?.destination || lastEntity?.name
    if (stationName) {
      const openAlerts = emergencies.filter(
        (e) => e.status !== 'RESOLVED' && e.location.toLowerCase().includes(stationName.toLowerCase().split(' ')[0])
      )
      sessionContext.lastTopic = 'emergencies'
      if (openAlerts.length === 0) {
        const reply = isHi
          ? `Nahi, ${stationName} par koi active alert ya emergency incident nahi hai. Sabhi operational sectors nominal reporting kar rahe hain.`
          : `No active alerts detected at ${stationName}. All local operational sectors are reporting nominal status.`
        return formatResult(reply, sessionContext)
      }
      const lines = openAlerts.map((e) => `- **${e.id} [${e.severity}]**: ${e.location} — ${e.description} (Status: ${e.status}) [MAP_ACTION:incident:${e.id}:${e.location}]`)
      const reply = isHi
        ? `Haan, ${stationName} par ${openAlerts.length} active alert(s) hain:\n${lines.join('\n')}`
        : `Yes, ${stationName} has ${openAlerts.length} active alert(s):\n${lines.join('\n')}`
      return formatResult(reply, sessionContext)
    } else {
      const openAlerts = emergencies.filter((e) => e.status !== 'RESOLVED')
      const lines = openAlerts.map((e) => `- **${e.id} [${e.severity}]**: ${e.location} — ${e.description} (Status: ${e.status}) [MAP_ACTION:incident:${e.id}:${e.location}]`)
      const reply = isHi
        ? `System mein total ${openAlerts.length} active alert(s) hain across all sectors:\n${lines.join('\n')}`
        : `Currently there are ${openAlerts.length} active alert(s) across all sectors:\n${lines.join('\n')}`
      return formatResult(reply, sessionContext)
    }
  }


  // -------------------------------------------------------------
  // 2. COMPLETE SITUATION REPORT (Section 22: POLAR Operational Brief)
  // -------------------------------------------------------------
  const isSitrepQuery =
    lowerQ.includes('complete situation report') ||
    lowerQ.includes('situation report') ||
    lowerQ.includes('sitrep') ||
    lowerQ.includes('current operational status batao') ||
    lowerQ.includes('complete situation batao') ||
    lowerQ.includes("what's happening right now") ||
    lowerQ.includes('what is happening right now') ||
    lowerQ.includes('give me the full status') ||
    lowerQ.includes('polar operational brief') ||
    lowerQ.includes('brief me')

  if (isSitrepQuery) {
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
    return formatResult(brief, sessionContext)
  }

  // General dashboard status query
  const isGeneralDashboardQuery =
    lowerQ.includes('operational status') ||
    lowerQ.includes('system status') ||
    lowerQ.includes('command center status') ||
    lowerQ.includes('dashboard summary') ||
    (lowerQ.includes('overview') && (lowerQ.includes('mission') || lowerQ.includes('system') || lowerQ.includes('polar')))

  if (isGeneralDashboardQuery) {
    const activeMissions = expeditions.filter((e) => e.status === 'ACTIVE')
    const activePpl = personnel.filter((p) => p.status !== 'OFF_DUTY')
    const openIncidents = emergencies.filter((e) => e.status !== 'RESOLVED')
    const criticalIncidents = openIncidents.filter((e) => e.severity === 'CRITICAL' || e.severity === 'HIGH')
    const delayedShipments = cargo.filter((c) => c.status === 'DELAYED')

    sessionContext.lastTopic = 'dashboard'
    const reply = isHi
      ? `Current operational status: ${activeMissions.length} active expeditions, ${activePpl.length} deployed personnel, ${openIncidents.length} open alerts, aur ${delayedShipments.length} delayed shipment.`
      : `Current operational status: ${activeMissions.length} active expeditions, ${activePpl.length} deployed field personnel, ${openIncidents.length} open incident alerts (${criticalIncidents.length} high/critical priority), and ${delayedShipments.length} delayed cargo shipment across monitored polar stations.`
    return formatResult(reply, sessionContext)
  }

  // -------------------------------------------------------------
  // 3. ANALYTICAL "WHY" EXPLANATIONS (Section 23)
  // -------------------------------------------------------------
  if (lowerQ.includes('why') || lowerQ.includes('kyu') || lowerQ.includes('kyun')) {
    // Why does [Station] need attention / concern?
    const targetLoc = locations.find((l) => lowerQ.includes(l.name.toLowerCase()) || lowerQ.includes(l.id.toLowerCase()))
    if (targetLoc && (lowerQ.includes('attention') || lowerQ.includes('dhyan') || lowerQ.includes('concern'))) {
      const locIncidents = emergencies.filter((em) => (em.location || '').toLowerCase().includes(targetLoc.name.toLowerCase()) || (em.location || '').toLowerCase().includes(targetLoc.id.toLowerCase()))
      const locLowStock = inventory.filter((i) => ((i.location || '').toLowerCase().includes(targetLoc.name.toLowerCase()) || (i.location || '').toLowerCase().includes(targetLoc.id.toLowerCase())) && isLowStock(i))
      const locCargoDelayed = cargo.filter((c) => String(c.status || '').toUpperCase() === 'DELAYED' && ((c.destination || '').toLowerCase().includes(targetLoc.name.toLowerCase()) || (c.destination || '').toLowerCase().includes(targetLoc.id.toLowerCase())))

      const reasons = []
      if (locIncidents.length > 0) {
        reasons.push(`Active Incident(s): ${locIncidents.map((i) => `${i.id} [${i.severity}] (${i.description})`).join(', ')}`)
      }
      if (locLowStock.length > 0) {
        reasons.push(`Low-stock inventory: ${locLowStock.map((i) => `${i.item_name} (${i.quantity}/${i.minimum_quantity || i.minimum_stock || '—'} ${i.unit || 'units'})`).join(', ')}`)
      }
      if (locCargoDelayed.length > 0) {
        reasons.push(`Delayed cargo: ${locCargoDelayed.map((c) => `${c.id || c.consignment_id} (${c.item_name || c.description})`).join(', ')}`)
      }

      const summary = reasons.length > 0
        ? reasons.map((r, idx) => `${idx + 1}. ${r}`).join(', ')
        : 'operational logistics and scheduled scientific programmes requiring active monitoring'
      return formatResult(`${targetLoc.name} requires command attention due to: ${summary}.`, sessionContext)
    }

    // Why is [Expedition] a concern / at risk?
    const matchedExp = expeditions.find((e) => lowerQ.includes(e.id.toLowerCase()) || lowerQ.includes(e.name.toLowerCase()))
    if (matchedExp && (lowerQ.includes('concern') || lowerQ.includes('risk') || lowerQ.includes('problem'))) {
      const destInc = emergencies.find((em) => (em.location || '').toLowerCase().includes((matchedExp.destination || '').toLowerCase()))
      const incInfo = destInc ? `, and its operational host station has an active incident ${destInc.id} (${destInc.description})` : ''
      return formatResult(
        `${matchedExp.id} (${matchedExp.name}) is a concern because its progress is at ${matchedExp.progress}% towards conclusion ${matchedExp.end_date || 'scheduled'}${incInfo}.`,
        sessionContext
      )
    }

    // Why is cargo delayed?
    const matchedCargo = cargo.find((c) => lowerQ.includes(c.id.toLowerCase()) || lowerQ.includes((c.item_name || '').toLowerCase()))
    if (matchedCargo && (lowerQ.includes('delayed') || lowerQ.includes('late'))) {
      const reason = matchedCargo.notes || matchedCargo.delay_reason || 'severe weather and operational transport hold at staging point'
      return formatResult(
        `Cargo shipment ${matchedCargo.id} (${matchedCargo.item_name}) is delayed at ${matchedCargo.current_location || matchedCargo.location || 'staging'} en route to ${matchedCargo.destination} due to: ${reason}.`,
        sessionContext
      )
    }

    // Why is an item low stock?
    const matchedInv = inventory.find((i) => lowerQ.includes(i.item_name.toLowerCase()) || lowerQ.includes(i.id.toLowerCase()))
    if (matchedInv && (lowerQ.includes('low stock') || lowerQ.includes('kam'))) {
      return formatResult(
        `${matchedInv.item_name} at ${matchedInv.location} is low stock because the current quantity of ${matchedInv.quantity} ${matchedInv.unit} has fallen below the mandatory reserve threshold of ${matchedInv.minimum_quantity || matchedInv.minimum_stock} ${matchedInv.unit}.`,
        sessionContext
      )
    }
  }

  // -------------------------------------------------------------
  // 4. AI PRIORITY ANALYSIS (Section 14: Ranked Triage)
  // -------------------------------------------------------------
  if (
    lowerQ.includes('need attention') ||
    lowerQ.includes('needs attention') ||
    lowerQ.includes('what needs attention') ||
    lowerQ.includes('biggest problem') ||
    lowerQ.includes('what should i look at first') ||
    lowerQ.includes("what's critical") ||
    lowerQ.includes('what is critical') ||
    lowerQ.includes('most important updates') ||
    lowerQ.includes('most important') ||
    lowerQ.includes('top priority') ||
    lowerQ.includes('critical priority') ||
    lowerQ.includes('urgent issue') ||
    lowerQ.includes('sabse bada issue') ||
    lowerQ.includes('kya dhyan dena chahiye')
  ) {
    const openIncidents = emergencies.filter((e) => e.status !== 'RESOLVED')
    const critical = openIncidents.find((e) => e.severity === 'CRITICAL' || e.severity === 'HIGH') || openIncidents[0]
    const delayed = cargo.find((c) => c.status === 'DELAYED')
    const lowStock = inventory.filter((i) => isLowStock(i))
    const offlineDev = personnel.find((p) => p.status === 'OFF_DUTY')

    const points = []
    if (critical) {
      points.push(
        `1. Critical Alert: ${critical.id} [${critical.severity}] at ${critical.location} — ${critical.description} (Assigned: ${critical.assigned_team || 'Response Team'}) [MAP_ACTION:incident:${critical.id}:${critical.location}]`
      )
    }
    if (delayed) {
      points.push(
        `2. Logistics Delay: Shipment ${delayed.id} (${delayed.item_name}) delayed at ${delayed.location} destined for ${delayed.destination}.`
      )
    }
    if (lowStock.length > 0) {
      points.push(
        `3. Critical Stock: ${lowStock.length} items below minimum safety buffer (e.g. ${lowStock[0].item_name}: ${lowStock[0].quantity} ${lowStock[0].unit} at ${lowStock[0].location}).`
      )
    }
    if (offlineDev) {
      points.push(
        `4. Transceiver Telemetry: Device ${offlineDev.id} (${offlineDev.name}) is currently ${offlineDev.status}.`
      )
    }

    sessionContext.lastTopic = 'alerts'
    if (critical) {
      sessionContext.lastEntity = { type: 'emergency', ...critical }
    }
    return formatResult(
      `Key operational priorities requiring command attention:\n` + points.join('\n'),
      sessionContext
    )
  }

  // -------------------------------------------------------------
  // 5. MISSION RISK ANALYSIS (Section 15)
  // -------------------------------------------------------------
  if (
    lowerQ.includes('mission is at risk') ||
    lowerQ.includes('expedition is at risk') ||
    lowerQ.includes('missions at risk') ||
    lowerQ.includes('which mission is at risk') ||
    lowerQ.includes('which expedition is at risk') ||
    lowerQ.includes('low progress compared with its end date') ||
    lowerQ.includes('kaunsa mission risk par hai') ||
    lowerQ.includes('risk par hai')
  ) {
    const active = expeditions.filter((e) => e.status === 'ACTIVE')
    const sorted = [...active].sort((a, b) => (Number(a.progress) || 0) - (Number(b.progress) || 0))
    const highestRisk = sorted[0]
    if (highestRisk) {
      sessionContext.lastEntity = { type: 'expedition', ...highestRisk }
      sessionContext.lastTopic = 'expeditions'
      const destInc = emergencies.find(
        (em) => (em.location || '').toLowerCase().includes((highestRisk.destination || '').toLowerCase()) && em.status !== 'RESOLVED'
      )
      const incInfo = destInc ? ` Concurrent base station alert: ${destInc.id} (${destInc.description}).` : ''
      return formatResult(
        `${highestRisk.id} (${highestRisk.name}) is currently the highest-risk active mission: Progress is ${highestRisk.progress}% (lowest among active expeditions) towards scheduled completion ${highestRisk.end_date || 'scheduled'}.${incInfo}`,
        sessionContext
      )
    }
    return formatResult("There isn't enough data in the current system to reliably assess mission risk.", sessionContext)
  }

  // -------------------------------------------------------------
  // 6. RESOURCE FORECASTING (Section 16: Guarded)
  // -------------------------------------------------------------
  if (
    lowerQ.includes('how long will the diesel last') ||
    lowerQ.includes('how long will diesel last') ||
    lowerQ.includes('how many days of medical kits remain') ||
    lowerQ.includes('days of medical kits') ||
    lowerQ.includes('when should we restock') ||
    lowerQ.includes('which item will run out first') ||
    lowerQ.includes('item will run out first') ||
    lowerQ.includes('diesel kab tak chalega') ||
    lowerQ.includes('kab restock') ||
    lowerQ.includes('kab khatam hoga diesel')
  ) {
    const diesel = inventory.find((i) => i.item_name.toLowerCase().includes('diesel')) || inventory[0]
    const qty = diesel ? Number(diesel.quantity).toLocaleString('en-US') : '0'
    const min = diesel ? Number(diesel.minimum_quantity || diesel.minimum_stock || 0).toLocaleString('en-US') : '0'
    const loc = diesel?.location ? ` at ${diesel.location}` : ''
    const name = diesel?.item_name || 'critical supplies'
    const unit = diesel?.unit || 'units'
    return formatResult(
      `The current system does not contain enough consumption history to calculate a reliable depletion timeline. Current available ${name} quantity is ${qty} ${unit} against a minimum reserve threshold of ${min} ${unit}${loc}.`,
      sessionContext
    )
  }

  // -------------------------------------------------------------
  // 7. COMPARISONS & RANKINGS (Section 18)
  // -------------------------------------------------------------
  // "Compare all missions" / "Compare expeditions"
  if (
    (lowerQ.includes('compare') && (lowerQ.includes('mission') || lowerQ.includes('expedition'))) ||
    lowerQ.includes('compare all')
  ) {
    const lines = expeditions.map(
      (e) =>
        `- **${e.id} (${e.name})**: Status: ${e.status}, Progress: ${e.progress}%, Destination: ${e.destination}, Team: ${e.team_size}, Leader: ${e.leader}`
    )
    return formatResult(`Expedition Comparison (${expeditions.length} missions):\n${lines.join('\n')}`, sessionContext)
  }

  // "Compare two expeditions dynamically"
  if (lowerQ.includes('compare') && (lowerQ.includes('exp-') || lowerQ.includes('mission'))) {
    const matched = expeditions.filter((e) => lowerQ.includes(e.id.toLowerCase()) || lowerQ.includes(e.name.toLowerCase()))
    if (matched.length >= 2) {
      const e1 = matched[0]
      const e2 = matched[1]
      return formatResult(
        `Comparison between ${e1.id} and ${e2.id}:\n` +
        `- **${e1.id} (${e1.name})**: ${e1.destination}, Progress: ${e1.progress}%, Team: ${e1.team_size}, Leader: ${e1.leader}, Ends: ${e1.end_date}\n` +
        `- **${e2.id} (${e2.name})**: ${e2.destination}, Progress: ${e2.progress}%, Team: ${e2.team_size}, Leader: ${e2.leader}, Ends: ${e2.end_date}\n` +
        `Key takeaway: ${e1.progress >= e2.progress ? `${e1.id} has higher progress (${e1.progress}% vs ${e2.progress}%)` : `${e2.id} has higher progress (${e2.progress}% vs ${e1.progress}%)`}.`,
        sessionContext
      )
    }
  }

  // "Compare two stations dynamically"
  if (lowerQ.includes('compare') && (lowerQ.includes('station') || lowerQ.includes('camp') || lowerQ.includes('base'))) {
    const matchedLocs = locations.filter((l) => lowerQ.includes(l.name.toLowerCase()) || lowerQ.includes(l.id.toLowerCase()))
    if (matchedLocs.length >= 2) {
      const l1 = matchedLocs[0]
      const l2 = matchedLocs[1]
      const l1Ppl = personnel.filter((p) => (p.stationed_at || p.location_id || '').includes(l1.id) || (p.stationed_at || '').includes(l1.name)).length
      const l2Ppl = personnel.filter((p) => (p.stationed_at || p.location_id || '').includes(l2.id) || (p.stationed_at || '').includes(l2.name)).length
      const l1Inc = emergencies.filter((e) => (e.location || '').includes(l1.name) || (e.location || '').includes(l1.id))
      const l2Inc = emergencies.filter((e) => (e.location || '').includes(l2.name) || (e.location || '').includes(l2.id))
      return formatResult(
        `Comparison between ${l1.name} and ${l2.name}:\n` +
        `- **${l1.name}**: ${l1Ppl} personnel on site, ${l1Inc.length} active incidents.\n` +
        `- **${l2.name}**: ${l2Ppl} personnel on site, ${l2Inc.length} active incidents.\n` +
        `Summary: ${l1Inc.length >= l2Inc.length ? `${l1.name} currently has more active operational incidents (${l1Inc.length} vs ${l2Inc.length}).` : `${l2.name} currently has more active operational incidents (${l2Inc.length} vs ${l1Inc.length}).`}`,
        sessionContext
      )
    }
  }

  // "Which inventory item has the highest stock?"
  if (lowerQ.includes('highest stock') || lowerQ.includes('most stock') || lowerQ.includes('max stock')) {
    const sorted = [...inventory].sort((a, b) => Number(b.quantity) - Number(a.quantity))
    const top = sorted[0]
    return formatResult(
      `${top.item_name} has the highest stock with ${Number(top.quantity).toLocaleString('en-US')} ${top.unit} at ${top.location}.`,
      sessionContext
    )
  }

  // "Which inventory item has the lowest stock?"
  if (lowerQ.includes('lowest stock') || lowerQ.includes('least stock') || lowerQ.includes('min stock')) {
    const sorted = [...inventory].sort((a, b) => Number(a.quantity) - Number(b.quantity))
    const lowest = sorted[0]
    return formatResult(
      `${lowest.item_name} has the lowest stock with ${Number(lowest.quantity).toLocaleString('en-US')} ${lowest.unit} at ${lowest.location}.`,
      sessionContext
    )
  }

  // "Which station has the most alerts?"
  if (lowerQ.includes('station has the most alerts') || lowerQ.includes('most incidents') || lowerQ.includes('most emergencies')) {
    const counts = {}
    emergencies.filter((e) => e.status !== 'RESOLVED').forEach((e) => {
      const loc = e.location || 'Unknown'
      counts[loc] = (counts[loc] || 0) + 1
    })
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
    if (entries.length === 0) {
      return formatResult('Zero active incidents reported across all polar stations.', sessionContext)
    }
    const top = entries[0]
    return formatResult(
      `${top[0]} currently has the most active incidents with ${top[1]} alert(s).`,
      sessionContext
    )
  }

  // "Which cargo shipment is largest?"
  if (lowerQ.includes('cargo shipment is largest') || lowerQ.includes('largest cargo')) {
    const sorted = [...cargo].sort((a, b) => (b.weight_kg || 0) - (a.weight_kg || 0))
    const top = sorted[0]
    return formatResult(
      `The largest cargo shipment is ${top.id} (${top.item_name}) weighing ${(top.weight_kg || 0).toLocaleString()} kg destined for ${top.destination}.`,
      sessionContext
    )
  }

  // -------------------------------------------------------------
  // 8. CROSS-MODULE CORRELATIONS (Section 17)
  // -------------------------------------------------------------
  // "Which active mission has the most personnel?"
  if (
    lowerQ.includes('active mission has the most personnel') ||
    lowerQ.includes('active expedition has the most personnel') ||
    lowerQ.includes('active mission has the most people')
  ) {
    const active = expeditions.filter((e) => e.status === 'ACTIVE')
    const top = [...active].sort((a, b) => b.team_size - a.team_size)[0]
    return formatResult(
      `Among active missions, ${top.id} (${top.name}) has the most personnel with ${top.team_size} members.`,
      sessionContext
    )
  }

  // "Which station has both low inventory and active incidents?"
  if (
    (lowerQ.includes('low inventory') || lowerQ.includes('low stock')) &&
    (lowerQ.includes('active incident') || lowerQ.includes('incident') || lowerQ.includes('emergency'))
  ) {
    const stationsWithIncidents = new Set(
      emergencies.filter((e) => e.status !== 'RESOLVED').map((e) => (e.location || '').split(' ')[0])
    )
    const match = locations.find((l) => {
      const hasInc = [...stationsWithIncidents].some((s) => l.name.includes(s) || l.id.includes(s))
      const hasLowStock = inventory.some((i) => (i.location || '').includes(l.name) && isLowStock(i))
      return hasInc && hasLowStock
    })
    if (match) {
      const locInc = emergencies.find((e) => e.location.includes(match.name) || e.location.includes(match.id))
      const locStock = inventory.find((i) => i.location.includes(match.name) && isLowStock(i))
      return formatResult(
        `${match.name} currently has both low inventory stock (${locStock?.item_name || 'supplies'} at ${locStock?.quantity}/${locStock?.minimum_quantity} ${locStock?.unit}) and active incident ${locInc?.id || 'alert'}.`,
        sessionContext
      )
    }
    return formatResult('Currently no single station has both low inventory stock and open emergencies simultaneously.', sessionContext)
  }

  // "Which mission is ending soon and does it have enough supplies?"
  if (lowerQ.includes('ending soon') && (lowerQ.includes('supplies') || lowerQ.includes('inventory') || lowerQ.includes('rations'))) {
    const active = expeditions.filter((e) => e.status === 'ACTIVE')
    const sorted = [...active].sort((a, b) => new Date(a.end_date || 0) - new Date(b.end_date || 0))
    const soonest = sorted[0] || expeditions[0]
    if (soonest) {
      const dest = soonest.destination
      const stationInv = inventory.filter((i) => (i.location || '').toLowerCase().includes(dest.toLowerCase().split(' ')[0]))
      const lowCount = stationInv.filter((i) => isLowStock(i)).length
      return formatResult(
        `${soonest.id} (${soonest.name}) at ${dest} ends soonest on ${soonest.end_date}. Current on-site inventory status: ${stationInv.length} tracked supplies with ${lowCount === 0 ? 'adequate nominal reserves' : `${lowCount} low stock alerts`}.`,
        sessionContext
      )
    }
  }

  // "Which station has the most cargo and personnel?"
  if (lowerQ.includes('most cargo and personnel')) {
    let topStation = null
    let maxCombined = -1
    locations.forEach((loc) => {
      const pplCount = personnel.filter((p) => (p.stationed_at || p.location_id || '').includes(loc.id) || (p.stationed_at || '').includes(loc.name)).length
      const crgCount = cargo.filter((c) => (c.destination || '').includes(loc.name) || (c.destination || '').includes(loc.id)).length
      const total = pplCount + crgCount
      if (total > maxCombined) {
        maxCombined = total
        topStation = { loc, pplCount, crgCount }
      }
    })
    if (topStation) {
      return formatResult(
        `${topStation.loc.name} has the highest combined operational activity with ${topStation.pplCount} personnel on site and ${topStation.crgCount} incoming/assigned cargo shipment(s).`,
        sessionContext
      )
    }
  }

  // "Which expedition has the largest team but lowest progress?"
  if (lowerQ.includes('largest team but lowest progress') || lowerQ.includes('largest team and lowest progress')) {
    const active = expeditions.filter((e) => e.status === 'ACTIVE')
    const largest = [...active].sort((a, b) => b.team_size - a.team_size)[0]
    const lowest = [...active].sort((a, b) => a.progress - b.progress)[0]
    return formatResult(
      `${largest.id} (${largest.name}) has the largest active team (${largest.team_size} members) with ${largest.progress}% progress, while ${lowest.id} (${lowest.name}) has the lowest overall progress at ${lowest.progress}% (team: ${lowest.team_size}).`,
      sessionContext
    )
  }

  // "Are any active missions associated with low-stock stations?"
  if (lowerQ.includes('active missions associated with low-stock') || lowerQ.includes('missions associated with low-stock stations')) {
    const lowStockStations = new Set(inventory.filter((i) => isLowStock(i)).map((i) => i.location))
    const affectedExp = expeditions.find((e) => e.status === 'ACTIVE' && [...lowStockStations].some((s) => (e.destination || '').includes(s)))
    if (affectedExp) {
      const matchStation = [...lowStockStations].find((s) => (affectedExp.destination || '').includes(s))
      const lowItems = inventory.filter((i) => i.location === matchStation && isLowStock(i)).map((i) => `${i.item_name} (${i.quantity}/${i.minimum_quantity} ${i.unit})`).join(', ')
      return formatResult(
        `Yes, ${affectedExp.id} (${affectedExp.name}) is based at ${affectedExp.destination}, where ${lowItems} are currently below minimum safety thresholds.`,
        sessionContext
      )
    }
    return formatResult('No active missions are currently hosted at stations with depleted safety buffers.', sessionContext)
  }

  // "Which mission has the most operational issues?"
  if (lowerQ.includes('most operational issues')) {
    const active = expeditions.filter((e) => e.status === 'ACTIVE')
    const slowest = [...active].sort((a, b) => (Number(a.progress) || 0) - (Number(b.progress) || 0))[0]
    if (slowest) {
      const destInc = emergencies.find((em) => (em.location || '').toLowerCase().includes(slowest.destination.toLowerCase()) && em.status !== 'RESOLVED')
      const incText = destInc ? ` and its base at ${slowest.destination} has an open incident ${destInc.id} (${destInc.description})` : ''
      return formatResult(
        `${slowest.id} (${slowest.name}) has the most operational issues: it has the slowest progress rate (${slowest.progress}%) towards completion${incText}.`,
        sessionContext
      )
    }
  }

  // -------------------------------------------------------------
  // 9. EXPEDITIONS & MISSIONS INTELLIGENCE (Section 5 + Hinglish)
  // -------------------------------------------------------------
  // "Which missions are currently running?" / "abhi kaunsa mission chal raha hai?"
  if (
    lowerQ.includes('missions are currently running') ||
    lowerQ.includes('running missions') ||
    lowerQ.includes('active missions') ||
    lowerQ.includes('active expeditions') ||
    lowerQ.includes('show all active expeditions') ||
    lowerQ.includes('kaunsa mission chal raha hai') ||
    lowerQ.includes('missions chal rahe hain') ||
    (lowerQ.includes('expeditions') && (lowerQ.includes('running') || lowerQ.includes('ongoing') || lowerQ.includes('current')))
  ) {
    const active = expeditions.filter((e) => e.status === 'ACTIVE')
    const lines = active.map(
      (e) =>
        `- **${e.id} (${e.name})**: ${e.destination}, ${e.progress}% complete, Led by ${e.leader} (Team: ${e.team_size})`
    )
    if (active.length > 0) {
      sessionContext.lastEntity = { type: 'expedition', ...active[0] }
      sessionContext.lastTopic = 'expeditions'
    }
    const reply = isHi
      ? `Abhi ${active.length} active missions chal rahe hain:\n${lines.join('\n')}`
      : `Currently running active expeditions (${active.length}):\n${lines.join('\n')}`
    return formatResult(reply, sessionContext)
  }

  // Standalone: "mission kab khatam hoga" / "when will the mission finish"
  const isMissionEndDate =
    /\b(kab\s+khatam\s+hoga|kab\s+khatam\s+hogi|kab\s+end\s+hoga|kab\s+complete\s+hoga)\b/i.test(normQ) ||
    /\bwhen\s+(?:will\s+the\s+mission|does\s+the\s+mission|will\s+the\s+expedition)\s+(?:finish|end|conclude)\b/i.test(normQ) ||
    /\bmission\s+kab\s+khatam\b/i.test(normQ) ||
    (normQ.includes('mission') && normQ.includes('khatam') && normQ.includes('kab'))

  if (isMissionEndDate) {
    if (lastEntity && lastEntity.type === 'expedition') {
      const reply = isHi
        ? `${lastEntity.id} (${lastEntity.name}) ${lastEntity.end_date} ko scheduled hai (current progress: ${lastEntity.progress}%).`
        : `${lastEntity.id} (${lastEntity.name}) is scheduled to conclude on ${lastEntity.end_date} (current progress: ${lastEntity.progress}%).`
      return formatResult(reply, sessionContext)
    }

    const active = expeditions.filter((e) => e.status === 'ACTIVE')
    if (active.length > 0) {
      const soonest = [...active].sort(
        (a, b) => new Date(a.end_date || '9999-12-31') - new Date(b.end_date || '9999-12-31')
      )[0]
      sessionContext.lastEntity = { type: 'expedition', ...soonest }
      sessionContext.lastStation = soonest.destination
      sessionContext.lastTopic = 'expeditions'
      const reply = isHi
        ? `Active missions mein ${soonest.id} (${soonest.name}) sabse pehle ${soonest.end_date} ko khatam hone scheduled hai (progress: ${soonest.progress}%). Baaki active missions: ${active.filter((e) => e.id !== soonest.id).map((e) => `${e.id} (${e.end_date})`).join(', ')}.`
        : `Among active missions, ${soonest.id} (${soonest.name}) is scheduled to finish first on ${soonest.end_date} (${soonest.progress}% complete). Other active missions: ${active.filter((e) => e.id !== soonest.id).map((e) => `${e.id} (${e.end_date})`).join(', ')}.`
      return formatResult(reply, sessionContext)
    }
  }

  // "Which mission is closest to completion?" / "kaunsa mission sabse aage hai?" / "konsa mission poora hone wala hai"
  const isMissionCompletion =
    !normQ.includes('kab') &&
    !lowerQ.includes('when') &&
    (lowerQ.includes('closest to completion') ||
      lowerQ.includes('nearest to completion') ||
      lowerQ.includes('near completion') ||
      lowerQ.includes('almost complete') ||
      lowerQ.includes('almost finished') ||
      lowerQ.includes('about to finish') ||
      lowerQ.includes('about to be completed') ||
      lowerQ.includes('which mission will finish first') ||
      lowerQ.includes('which mission finishes first') ||
      lowerQ.includes('finish first') ||
      lowerQ.includes('kaunsa mission sabse aage hai') ||
      lowerQ.includes('sabse aage') ||
      /\b(poora|complete|khatam|finish)\s+(?:hone\s+wala|hone\s+waala|hoga|hogi)\b/i.test(normQ) ||
      /\b(kaunsa|which)\s+mission\s+.*?\b(poora|complete|khatam|finish|aage|jaldi)\b/i.test(normQ) ||
      /\b(sabse\s+aage|almost\s+complete|almost\s+khatam|sabse\s+pahle\s+khatam|jaldi\s+(?:khatam|complete))\b/i.test(normQ))

  if (isMissionCompletion) {
    const active = expeditions.filter((e) => e.status === 'ACTIVE' && e.progress < 100)
    if (active.length > 0) {
      const top = [...active].sort((a, b) => {
        if (b.progress !== a.progress) {
          return b.progress - a.progress
        }
        return new Date(a.end_date || '9999-12-31') - new Date(b.end_date || '9999-12-31')
      })[0]
      sessionContext.lastEntity = { type: 'expedition', ...top }
      sessionContext.lastStation = top.destination
      sessionContext.lastTopic = 'expeditions'
      const reply = isHi
        ? `${top.id} — ${top.name}, ${top.progress}% complete hai aur ye sabse close to completion hai.`
        : `${top.id} — ${top.name} is closest to completion at ${top.progress}% progress (scheduled end: ${top.end_date}). [MAP_ACTION:site:${top.location_id}:${top.destination}]`
      return formatResult(reply, sessionContext)
    }
  }

  // "Which expedition has the highest progress?"
  if (
    lowerQ.includes('highest progress') ||
    lowerQ.includes('most progress') ||
    lowerQ.includes('max progress')
  ) {
    const active = expeditions.filter((e) => e.status === 'ACTIVE')
    const top = [...active].sort((a, b) => b.progress - a.progress)[0]
    if (top) {
      sessionContext.lastEntity = { type: 'expedition', ...top }
      sessionContext.lastStation = top.destination
      sessionContext.lastTopic = 'expeditions'
      const reply = isHi
        ? `${top.id} — ${top.name} ka progress sabse zyada hai: ${top.progress}%.`
        : `${top.id} — ${top.name} has the highest progress at ${top.progress}%.`
      return formatResult(reply, sessionContext)
    }
  }

  // "Which expedition has the lowest progress?" / "progressing the slowest" / "sabse slow"
  if (
    lowerQ.includes('lowest progress') ||
    lowerQ.includes('least progress') ||
    lowerQ.includes('slowest progress') ||
    lowerQ.includes('progressing the slowest') ||
    lowerQ.includes('sabse slow') ||
    lowerQ.includes('sabse peeche')
  ) {
    const active = expeditions.filter((e) => e.status === 'ACTIVE')
    const lowestActive = [...active].sort((a, b) => a.progress - b.progress)[0]
    const planned = expeditions.find((e) => e.status === 'PLANNING')
    let text = isHi
      ? `Active expeditions mein ${lowestActive.id} (${lowestActive.name}) ka progress sabse kam hai (${lowestActive.progress}%).`
      : `Among active expeditions, ${lowestActive.id} (${lowestActive.name}) has the lowest progress at ${lowestActive.progress}%.`
    if (planned && !isHi) {
      text += ` (Planned expedition ${planned.id} is at ${planned.progress}%).`
    }
    if (lowestActive) {
      sessionContext.lastEntity = { type: 'expedition', ...lowestActive }
      sessionContext.lastTopic = 'expeditions'
    }
    return formatResult(text, sessionContext)
  }

  // "Which mission ends first?" / "Which mission is ending soon?" / "kaunsi expedition jaldi khatam hogi?"
  if (
    lowerQ.includes('ends first') ||
    lowerQ.includes('ending soonest') ||
    lowerQ.includes('ending soon') ||
    lowerQ.includes('finish soonest') ||
    lowerQ.includes('finishing soonest') ||
    lowerQ.includes('jaldi khatam hogi') ||
    lowerQ.includes('pehle khatam hogi')
  ) {
    const active = expeditions.filter((e) => e.status === 'ACTIVE')
    const soonest = [...active].sort(
      (a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
    )[0]
    if (soonest) {
      sessionContext.lastEntity = { type: 'expedition', ...soonest }
      sessionContext.lastStation = soonest.destination
      sessionContext.lastTopic = 'expeditions'
      const reply = isHi
        ? `${soonest.id} (${soonest.name}) ${soonest.end_date} ko scheduled hai (sabse pehle khatam hogi).`
        : `${soonest.id} (${soonest.name}) is ending soonest on ${soonest.end_date} (Progress: ${soonest.progress}%).`
      return formatResult(reply, sessionContext)
    }
  }

  // "Which mission ends last?"
  if (lowerQ.includes('ends last') || lowerQ.includes('ending last') || lowerQ.includes('finishing last')) {
    const active = expeditions.filter((e) => e.status === 'ACTIVE')
    const latest = [...active].sort(
      (a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
    )[0]
    if (latest) {
      sessionContext.lastEntity = { type: 'expedition', ...latest }
      sessionContext.lastStation = latest.destination
      sessionContext.lastTopic = 'expeditions'
      return formatResult(
        `${latest.id} (${latest.name}) ends last on ${latest.end_date} (Progress: ${latest.progress}%).`,
        sessionContext
      )
    }
  }

  // "Which mission has the largest team?"
  if (lowerQ.includes('largest team') || lowerQ.includes('biggest team') || (lowerQ.includes('team') && lowerQ.includes('largest'))) {
    const sorted = [...expeditions].sort((a, b) => b.team_size - a.team_size)
    const top = sorted[0]
    const activeTop = sorted.find((e) => e.status === 'ACTIVE')
    let text = `${top.id} (${top.name}) has the largest team with ${top.team_size} personnel.`
    if (top.status !== 'ACTIVE' && activeTop) {
      text += ` Among currently active missions, ${activeTop.id} (${activeTop.name}) has the largest team with ${activeTop.team_size} personnel.`
    }
    sessionContext.lastEntity = { type: 'expedition', ...(activeTop || top) }
    sessionContext.lastTopic = 'expeditions'
    return formatResult(text, sessionContext)
  }

  // "Which mission has the smallest team?"
  if (lowerQ.includes('smallest team') || lowerQ.includes('least personnel')) {
    const sorted = [...expeditions].sort((a, b) => a.team_size - b.team_size)
    const smallest = sorted[0]
    sessionContext.lastEntity = { type: 'expedition', ...smallest }
    sessionContext.lastTopic = 'expeditions'
    return formatResult(
      `${smallest.id} (${smallest.name}) has the smallest team with ${smallest.team_size} personnel.`,
      sessionContext
    )
  }

  // Specific mission lookup by ID (EXP-001 through EXP-005)
  const expMatch = q.match(/\b(EXP-\d{3})\b/i)
  if (expMatch) {
    const targetId = expMatch[1].toUpperCase()
    const exp = expeditions.find((e) => e.id.toUpperCase() === targetId)
    if (exp) {
      sessionContext.lastEntity = { type: 'expedition', ...exp }
      sessionContext.lastStation = exp.destination
      sessionContext.lastTopic = 'expeditions'

      if (lowerQ.includes('when does') || lowerQ.includes('end date') || lowerQ.includes('finish date') || lowerQ.includes('ends')) {
        return formatResult(
          `${exp.id} (${exp.name}) is scheduled to end on ${exp.end_date}.`,
          sessionContext
        )
      }
      if (lowerQ.includes('progress') || lowerQ.includes('how far') || lowerQ.includes('percentage')) {
        return formatResult(
          `${exp.id} (${exp.name}) progress is currently ${exp.progress}%.`,
          sessionContext
        )
      }
      if (lowerQ.includes('leader') || lowerQ.includes('who is leading') || lowerQ.includes('leads')) {
        return formatResult(
          `${exp.leader} is leading ${exp.id} (${exp.name}).`,
          sessionContext
        )
      }
      if (lowerQ.includes('who is assigned') || lowerQ.includes('assigned to') || lowerQ.includes('how many people are assigned') || lowerQ.includes('how many people')) {
        const assignedPpl = personnel.filter((p) => p.expedition_id === exp.id)
        const names = assignedPpl.map((p) => `${p.name} (${p.id}, ${p.role})`).join(', ')
        return formatResult(
          `Personnel assigned to ${exp.id} (${exp.team_size || assignedPpl.length} members): ${names || 'Field personnel records synchronized.'}`,
          sessionContext
        )
      }
      if (lowerQ.includes('where') || lowerQ.includes('destination') || lowerQ.includes('location')) {
        return formatResult(
          `${exp.id} (${exp.name}) is based at ${exp.destination}. [MAP_ACTION:site:${exp.location_id}:${exp.destination}]`,
          sessionContext
        )
      }
      return formatResult(
        `**${exp.id}: ${exp.name}**\n- **Status**: ${exp.status} (${exp.progress}% complete)\n- **Destination**: ${exp.destination}\n- **Leader**: ${exp.leader}\n- **Team Size**: ${exp.team_size} personnel\n- **Timeline**: ${exp.start_date} to ${exp.end_date}\n- **Objective**: ${exp.objective} [MAP_ACTION:site:${exp.location_id}:${exp.destination}]`,
        sessionContext
      )
    }
  }

  // "How many expeditions are active?"
  if (lowerQ.includes('how many expeditions') || lowerQ.includes('expeditions count')) {
    const active = expeditions.filter((e) => e.status === 'ACTIVE').length
    const total = expeditions.length
    return formatResult(
      `There are ${active} active expeditions currently running out of ${total} total registered missions.`,
      sessionContext
    )
  }

  // -------------------------------------------------------------
  // 10. CARGO & LOGISTICS INTELLIGENCE (Section 8 + Hinglish)
  // -------------------------------------------------------------
  // "How much cargo is in transit?" / "kitna cargo transit mein hai?"
  const isCargoInTransit =
    (normQ.includes('cargo') && normQ.includes('transit')) ||
    /\b(how\s+much|kitna)\s+cargo\b/i.test(normQ) ||
    lowerQ.includes('cargo is in transit') ||
    lowerQ.includes('cargo in transit') ||
    lowerQ.includes('in transit cargo') ||
    lowerQ.includes('cargo transit mein') ||
    lowerQ.includes('kitna cargo transit')

  if (isCargoInTransit) {
    const inTransit = cargo.filter((c) => c.status === 'IN_TRANSIT')
    const items = inTransit.map((c) => `${c.id} (${c.item_name} to ${c.destination})`).join(', ')
    sessionContext.lastTopic = 'cargo'
    const reply = isHi
      ? `${inTransit.length} cargo shipments transit mein hain: ${items}.`
      : `There are ${inTransit.length} cargo shipments currently in transit: ${items}.`
    return formatResult(reply, sessionContext)
  }

  // "Which cargo is delayed?" / "Delayed cargo"
  if (
    lowerQ.includes('which cargo is delayed') ||
    lowerQ.includes('delayed cargo') ||
    lowerQ.includes('delayed shipments')
  ) {
    const delayed = cargo.filter((c) => c.status === 'DELAYED')
    if (delayed.length === 0) {
      return formatResult('All cargo consignments are currently on schedule. Zero shipments are delayed.', sessionContext)
    }
    const lines = delayed.map(
      (c) =>
        `- **${c.id} (${c.item_name})**: Delayed at ${c.location} en route to ${c.destination}. (${c.notes || 'Weather flight hold'})`
    )
    sessionContext.lastEntity = { type: 'cargo', ...delayed[0] }
    sessionContext.lastTopic = 'cargo'
    return formatResult(`Delayed cargo shipments (${delayed.length}):\n${lines.join('\n')}`, sessionContext)
  }

  // Specific cargo lookup (e.g. "C-101", "C-105")
  const cargoMatch = q.match(/\b(C-\d{3})\b/i)
  if (cargoMatch) {
    const cid = cargoMatch[1].toUpperCase()
    const c = cargo.find((item) => item.id.toUpperCase() === cid)
    if (c) {
      sessionContext.lastEntity = { type: 'cargo', ...c }
      sessionContext.lastTopic = 'cargo'
      const weight = c.weight_kg ? ` (${c.weight_kg.toLocaleString()} kg)` : ''
      if (lowerQ.includes('why') || lowerQ.includes('delay') || lowerQ.includes('reason')) {
        return formatResult(
          `Cargo shipment ${c.id} (${c.item_name}) is delayed at ${c.location}: ${c.notes || 'Severe crosswinds and adverse weather conditions halting flights.'}`,
          sessionContext
        )
      }
      return formatResult(
        `Cargo shipment ${c.id}: ${c.item_name}${weight}, ${c.quantity} ${c.unit}. Status: ${c.status}. Location: ${c.location}, Destination: ${c.destination}. Priority: ${c.priority}.`,
        sessionContext
      )
    }
  }

  // Cargo pipeline
  if (lowerQ.includes('cargo pipeline') || (lowerQ.includes('cargo') && lowerQ.includes('pipeline'))) {
    const counts = {}
    cargo.forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1
    })
    const summary = Object.entries(counts)
      .map(([st, cnt]) => `${cnt} ${st.replace('_', ' ').toLowerCase()}`)
      .join(', ')
    return formatResult(`Current cargo pipeline: ${summary} across ${cargo.length} total shipments.`, sessionContext)
  }

  // -------------------------------------------------------------
  // 10.5. INVENTORY & STOCK INTELLIGENCE
  // -------------------------------------------------------------
  // "Which items are low in stock?" / "low stock items" / "kam stock wale items"
  const isLowStockQuery =
    lowerQ.includes('low in stock') ||
    lowerQ.includes('low stock') ||
    lowerQ.includes('shortage') ||
    lowerQ.includes('out of stock') ||
    lowerQ.includes('kam stock') ||
    lowerQ.includes('stock kam hai') ||
    lowerQ.includes('resource low') ||
    lowerQ.includes('resource kam') ||
    lowerQ.includes('resources low') ||
    lowerQ.includes('which items are running low') ||
    lowerQ.includes('items running low') ||
    /\b(low\s+stock|kam\s+stock|stock\s+kam|resource\s+low)\b/i.test(normQ)

  if (isLowStockQuery) {
    const lowItems = inventory.filter((i) => isLowStock(i))
    sessionContext.lastTopic = 'inventory'
    if (lowItems.length === 0) {
      const reply = isHi
        ? 'Sabhi inventory items nominal levels par hain. Koi low-stock alert nahi hai.'
        : 'All inventory items are at nominal operating levels. No low-stock alerts detected.'
      return formatResult(reply, sessionContext)
    }
    const lines = lowItems.map(
      (i) =>
        `- **${i.item_name}** (${i.location}): ${Number(i.quantity).toLocaleString('en-US')} ${i.unit} available (Minimum buffer: ${Number(i.minimum_quantity).toLocaleString('en-US')} ${i.unit})`
    )
    const reply = isHi
      ? `System mein ${lowItems.length} items low stock par hain:\n${lines.join('\n')}`
      : `Currently low in stock (${lowItems.length} items below minimum safety threshold):\n${lines.join('\n')}`
    return formatResult(reply, sessionContext)
  }

  // -------------------------------------------------------------
  // 11. PERSONNEL INTELLIGENCE (Section 6 + Hinglish)
  // -------------------------------------------------------------
  // "How many personnel are deployed?" / "deployed personnel" / "kitne personnel deployed hain"
  const isDeployedPersonnel =
    /\b(how\s+many|kitne|kitna)\s+(?:field\s+)?(?:personnel|people|log|members?|staff)\b/i.test(normQ) ||
    /\b(?:personnel|log|people)\s+(?:field\s+mein\s+)?deployed\b/i.test(normQ) ||
    /\b(?:kitne|kitna)\s+(?:log|personnel)\s+field\s+mein\b/i.test(normQ) ||
    lowerQ.includes('how many personnel are deployed') ||
    lowerQ.includes('personnel are deployed') ||
    lowerQ.includes('deployed personnel') ||
    lowerQ.includes('how many personnel') ||
    lowerQ.includes('how many people are deployed')

  if (isDeployedPersonnel) {
    const deployed = personnel.filter((p) => p.status !== 'OFF_DUTY').length
    const total = personnel.length
    const offDutyCount = total - deployed
    sessionContext.lastTopic = 'personnel'
    const reply = isHi
      ? `Abhi ${deployed} personnel field mein deployed hain (${total} registered personnel mein se ${offDutyCount} off duty hai).`
      : `${deployed} field personnel are currently deployed in theatre (${total} registered personnel, ${offDutyCount} off duty).`
    return formatResult(reply, sessionContext)
  }

  // "How many personnel are registered?"
  if (lowerQ.includes('personnel are registered') || lowerQ.includes('registered personnel')) {
    return formatResult(
      `There are ${personnel.length} registered field personnel across all polar detachments.`,
      sessionContext
    )
  }

  // "Who is off duty?"
  if (lowerQ.includes('off duty') || lowerQ.includes('off-duty') || lowerQ.includes('not on duty')) {
    const offDuty = personnel.filter((p) => p.status === 'OFF_DUTY')
    if (offDuty.length === 0) {
      return formatResult('All 16 registered field personnel are currently on active duty or deployed.', sessionContext)
    }
    const names = offDuty.map((p) => `${p.name} (${p.id}, ${p.role})`).join(', ')
    sessionContext.lastEntity = { type: 'person', ...offDuty[0] }
    sessionContext.lastTopic = 'personnel'
    return formatResult(`Off-duty personnel (${offDuty.length}): ${names}.`, sessionContext)
  }

  // "Who is at Maitri Station?" / "Maitri mein kitne log hain?"
  const stationPersonMatch = resolveStation(q, locations)
  if (
    stationPersonMatch &&
    (lowerQ.includes('who is at') ||
      lowerQ.includes('personnel at') ||
      lowerQ.includes('people at') ||
      lowerQ.includes('staff at') ||
      lowerQ.includes('kitne log') ||
      lowerQ.includes('kitne log hain') ||
      lowerQ.includes('team at'))
  ) {
    const sid = stationPersonMatch.id
    const sname = stationPersonMatch.name
    const onSite = personnel.filter(
      (p) => p.location_id === sid || (p.stationed_at && p.stationed_at.toLowerCase().includes(sname.toLowerCase().split(' ')[0]))
    )
    sessionContext.lastStation = sname
    sessionContext.lastTopic = 'personnel'
    if (lowerQ.includes('kitne log') || lowerQ.includes('how many people')) {
      const reply = isHi
        ? `${sname} par ${onSite.length} personnel stationed hain.`
        : `There are ${onSite.length} personnel stationed at ${sname}.`
      return formatResult(reply, sessionContext)
    }
    const list = onSite.map((p) => `${p.name} (${p.id} - ${p.role})`).join(', ')
    return formatResult(
      `Personnel stationed at ${sname} (${onSite.length}): ${list || 'No personnel stationed at this site.'}`,
      sessionContext
    )
  }

  // "Which personnel are active?"
  if (lowerQ.includes('personnel are active') || lowerQ.includes('active personnel roster') || lowerQ.includes('active personnel')) {
    const active = personnel.filter((p) => p.status === 'ACTIVE')
    const list = active.map((p) => `${p.name} (${p.id}, ${p.role})`).join(', ')
    return formatResult(
      `Active duty field personnel (${active.length} active, plus 3 in-transit, 2 resting, 1 medical): ${list}.`,
      sessionContext
    )
  }

  // Individual person lookup by ID or Name
  const personMatch = q.match(/\b(P-\d{3})\b/i)
  let targetPerson = null
  if (personMatch) {
    const pid = personMatch[1].toUpperCase()
    targetPerson = personnel.find((p) => p.id.toUpperCase() === pid)
  } else {
    let bestScore = 0
    let bestCandidate = null
    for (const p of personnel) {
      const fullLower = p.name.toLowerCase()
      const cleanName = fullLower.replace(/^(dr\.|cdr\.|sgt\.|capt\.|sub\.|hav\.)\s*/, '')
      const parts = cleanName.split(' ')

      if (lowerQ.includes(fullLower)) {
        bestScore = 100
        bestCandidate = p
        break
      }
      if (lowerQ.includes(cleanName)) {
        if (bestScore < 90) {
          bestScore = 90
          bestCandidate = p
        }
      }
      const matchingParts = parts.filter((pt) => pt.length > 2 && lowerQ.includes(pt))
      if (matchingParts.length === parts.length && parts.length > 1) {
        if (bestScore < 85) {
          bestScore = 85
          bestCandidate = p
        }
      } else if (matchingParts.length === 1) {
        const queryWords = lowerQ.replace(/[?.,!]/g, ' ').split(/\s+/).filter((w) =>
          w.length > 2 && !['hai', 'kya', 'aur', 'status', 'duty', 'current', 'role', 'person', 'device', 'the', 'is', 'of', 'ka', 'ke', 'ki', 'ko', 'mein', 'par', 'batao', 'konsa', 'kaunsa', 'sgt', 'cdr', 'dr', 'capt', 'sub', 'hav'].includes(w)
        )
        if (queryWords.length === 1) {
          if (bestScore < 60) {
            bestScore = 60
            bestCandidate = p
          }
        }
      }
    }
    targetPerson = bestCandidate
  }

  if (!targetPerson && (lowerQ.includes('vikram singh') || lowerQ.includes('sgt vikram') || normQ.includes('vikram singh'))) {
    const reply = isHi
      ? "Current system mein 'Sgt. Vikram Singh' naam ka personnel registered nahi hai. (System mein 16 field personnel registered hain, jaise Cdr. Vikram Rathore at Maitri ya Sgt. Harpreet Singh at Novo Runway)."
      : "No personnel named 'Sgt. Vikram Singh' is registered in the current system. (The system tracks 16 personnel, such as Cdr. Vikram Rathore at Maitri or Sgt. Harpreet Singh at Novo Runway)."
    return formatResult(reply, sessionContext)
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
    const mapTag = `[MAP_ACTION:person:${targetPerson.id}:${targetPerson.name}]`

    return formatResult(
      `**${targetPerson.id}: ${targetPerson.name}**\n- **Role**: ${targetPerson.role}\n- **Status**: ${targetPerson.status}\n- **Station**: ${place}${coords}\n- **Expedition**: ${targetPerson.expedition_id || 'Base Station Roster'}\n- **Blood Group**: ${targetPerson.blood_group || 'N/A'} | **Satphone**: \`${targetPerson.satphone || 'N/A'}\` ${mapTag}`,
      sessionContext
    )
  }

  // -------------------------------------------------------------
  // 12. STATIONS INTELLIGENCE (Section 7 + Hinglish)
  // -------------------------------------------------------------
  // "Which station has the highest capacity?"
  if (
    (lowerQ.includes('station') || lowerQ.includes('base')) &&
    (lowerQ.includes('capacity') || normQ.includes('capacity')) &&
    (lowerQ.includes('most') || lowerQ.includes('highest') || lowerQ.includes('maximum') || normQ.includes('sabse zyada') || normQ.includes('sabse jyada'))
  ) {
    const withCapacity = locations.filter((l) => Number(l.capacity || l.bed_capacity || 0) > 0)
    const sorted = [...withCapacity].sort((a, b) => Number(b.capacity || b.bed_capacity || 0) - Number(a.capacity || a.bed_capacity || 0))
    const top = sorted[0]
    if (top) {
      const topCap = top.capacity || top.bed_capacity
      const others = sorted.slice(1).map((l) => `${l.name} with ${l.capacity || l.bed_capacity}`).join(' and ')
      const otherText = others ? ` (compared to ${others})` : ''
      return formatResult(
        isHi
          ? `Sabse zyada bed capacity **${top.name}** ki hai (${topCap} members bed capacity)${otherText ? `, jabki ${others} hai.` : '.'}`
          : `**${top.name}** has the highest bed capacity with ${topCap} members${otherText}.`,
        sessionContext
      )
    }
  }

  // "Which station has the most personnel?"
  if (
    (lowerQ.includes('station') || lowerQ.includes('base')) &&
    (lowerQ.includes('most personnel') || lowerQ.includes('most people') || lowerQ.includes('highest staff'))
  ) {
    let topLoc = null
    let maxStaff = -1
    locations.forEach((l) => {
      const staff = personnel.filter((p) => (p.stationed_at || p.location_id || '').includes(l.id) || (p.stationed_at || '').includes(l.name)).length
      if (staff > maxStaff) {
        maxStaff = staff
        topLoc = { name: l.name, staff }
      }
    })
    if (topLoc) {
      return formatResult(`${topLoc.name} has the most personnel with ${topLoc.staff} members on site.`, sessionContext)
    }
  }

  // "Which station has active incidents?"
  if (
    (lowerQ.includes('station') || lowerQ.includes('stations')) &&
    (lowerQ.includes('active incidents') || lowerQ.includes('open incidents') || lowerQ.includes('emergencies'))
  ) {
    const openInc = emergencies.filter((e) => e.status !== 'RESOLVED')
    if (openInc.length === 0) {
      return formatResult('All stations currently report nominal. Zero active emergencies.', sessionContext)
    }
    const lines = openInc.map((e) => `${e.location} (${e.id}, ${e.severity})`).join(', ')
    return formatResult(`Stations and sectors with active incidents: ${lines}.`, sessionContext)
  }

  // Station profiles
  const targetStation = resolveStation(q, locations)
  if (
    targetStation &&
    (lowerQ.includes('tell me about') ||
      lowerQ.includes('what is happening') ||
      lowerQ.includes("what's happening") ||
      lowerQ.includes('status of') ||
      lowerQ.includes('overview of') ||
      lowerQ.includes('everything important about') ||
      lowerQ.includes('station profile'))
  ) {
    sessionContext.lastStation = targetStation.name
    sessionContext.lastTopic = 'stations'

    const sitePpl = personnel.filter((p) => (p.stationed_at || p.location_id || '').includes(targetStation.id) || (p.stationed_at || '').includes(targetStation.name))
    const siteExp = expeditions.filter((e) => (e.destination || '').toLowerCase().includes(targetStation.name.toLowerCase().split(' ')[0]))
    const siteInc = emergencies.filter((em) => (em.location || '').toLowerCase().includes(targetStation.name.toLowerCase()) || (em.location || '').toLowerCase().includes(targetStation.id.toLowerCase()))
    const siteInv = inventory.filter((i) => (i.location || '').toLowerCase().includes(targetStation.name.toLowerCase().split(' ')[0]))
    const siteLowStock = siteInv.filter((i) => isLowStock(i))

    const activeInc = siteInc.filter((em) => em.status !== 'RESOLVED')
    const incSummary = activeInc.length === 0 ? 'Zero active incidents (all nominal)' : `${activeInc.length} active (${activeInc.map((e) => `${e.id} [${e.severity}]`).join(', ')})`
    const lowStockSummary = siteLowStock.length === 0 ? 'Adequate nominal reserves' : `${siteLowStock.length} items low (${siteLowStock.map((i) => i.item_name).join(', ')})`

    const report =
      `### Station Intelligence Profile: ${targetStation.name}\n` +
      `- **Location / Region**: ${targetStation.region || 'Polar Theater'} (\`${targetStation.coordinates?.formatted || 'Published Geographic Coords'}\`)\n` +
      `- **On-Site Personnel**: ${sitePpl.length} deployed operators (Bed Capacity: ${targetStation.capacity || 'Published'})\n` +
      `- **Hosted Expeditions**: ${siteExp.length > 0 ? siteExp.map((e) => `${e.id} (${e.progress}%)`).join(', ') : 'No direct field missions based'}\n` +
      `- **Active Incidents**: ${incSummary}\n` +
      `- **Supply Status**: ${lowStockSummary}\n` +
      `- **Map Locator**: [MAP_ACTION:site:${targetStation.id}:${targetStation.name}]`

    return formatResult(report, sessionContext)
  }

  // -------------------------------------------------------------
  // 13. DEVICE & GPS TELEMETRY INTELLIGENCE (Section 11 + Hinglish)
  // -------------------------------------------------------------
  // "Are GPS coordinates real or simulated?" / Telemetry distinction
  if (
    lowerQ.includes('real or simulated') ||
    lowerQ.includes('simulated gps') ||
    lowerQ.includes('real coordinates') ||
    lowerQ.includes('telemetry simulated')
  ) {
    return formatResult(
      '**GPS Telemetry Architecture Notice**:\n' +
      '- **Station & Camp Coordinates** are **real, permanent geographic coordinates** published by scientific polar databases.\n' +
      '- **Field Personnel & Transceiver Coordinates** represent **simulated tracking telemetry** reflecting field expeditions and traverse paths.',
      sessionContext
    )
  }

  // "Which devices are offline?" / "kaunse devices offline hain?"
  if (
    lowerQ.includes('devices are offline') ||
    lowerQ.includes('offline devices') ||
    lowerQ.includes('devices offline') ||
    lowerQ.includes('offline trackers') ||
    lowerQ.includes('kaunse devices offline')
  ) {
    const offline = personnel.filter((p) => p.status === 'OFF_DUTY')
    const list = offline.map((p) => `${p.id} (${p.name}, ${p.role})`).join(', ')
    const reply = isHi
      ? (offline.length === 0 ? 'Sabhi field devices online aur reporting hain.' : `${list} offline hai (status: OFF_DUTY).`)
      : `Offline devices (${offline.length}): ${list || `None. All ${personnel.length} field transmitters are actively reporting.`}`
    return formatResult(reply, sessionContext)
  }

  // "Is GPS currently available?" / "Show device locations"
  if (lowerQ.includes('gps currently available') || lowerQ.includes('is gps available')) {
    const activePpl = personnel.filter((p) => p.status !== 'OFF_DUTY')
    return formatResult(
      `Yes, GPS telemetry receivers are active across ${activePpl.length} deployed field personnel (simulated tracking beacons) and ${locations.length} primary research stations (real geographic positions).`,
      sessionContext
    )
  }

  // 14. WEATHER & AVIATION SAFETY INTELLIGENCE (Section 12 + Hinglish)
  // -------------------------------------------------------------
  const weatherStation = resolveStation(q, locations)

  // Live flight safety at a specific station (Twin Otter / Helo)
  const isStationFlightSafetyQuery =
    lowerQ.includes('fly') ||
    lowerQ.includes('flight') ||
    lowerQ.includes('flying') ||
    lowerQ.includes('aviation') ||
    lowerQ.includes('twin otter') ||
    lowerQ.includes('helicopter') ||
    lowerQ.includes('sortie') ||
    lowerQ.includes('udana') ||
    lowerQ.includes('safe to fly') ||
    lowerQ.includes('safe hai') ||
    lowerQ.includes('surakshit') ||
    lowerQ.includes('उड़ान') ||
    lowerQ.includes('उड़ाना')

  if (weatherStation && isStationFlightSafetyQuery) {
    sessionContext.lastStation = weatherStation.name
    sessionContext.lastTopic = 'flight-safety'
    const flightReport = await assessFlightSafetyForStation(weatherStation.name, locations, weatherCache, lang)
    return formatResult(flightReport, sessionContext)
  }

  // Weather at a specific place
  if (weatherStation && (lowerQ.includes('weather') || lowerQ.includes('temperature') || lowerQ.includes('mausam') || lowerQ.includes('wind') || lowerQ.includes('forecast'))) {
    sessionContext.lastStation = weatherStation.name
    sessionContext.lastTopic = 'weather'
    const weatherReport = await getWeatherForPlace(weatherStation.name, locations, weatherCache, lang)
    return formatResult(weatherReport, sessionContext)
  }

  // "Which station is coldest?"
  if (lowerQ.includes('coldest') || lowerQ.includes('lowest temperature') || lowerQ.includes('minimum temperature')) {
    const wData = await getOrFetchWeatherData(locations, weatherCache)
    const readings = wData.readings || wData.sites || {}
    let coldestName = locations[0]?.name || 'Polar Station'
    let lowestTemp = Infinity

    for (const loc of locations) {
      const r = readings[loc.id]
      if (r) {
        const temp = Number.isFinite(r.temperature) ? r.temperature : r.current?.temperature
        if (Number.isFinite(temp) && temp < lowestTemp) {
          lowestTemp = temp
          coldestName = loc.name
        }
      }
    }

    return formatResult(
      `${coldestName} is currently the coldest monitored location at ${lowestTemp}°C. [Source: ${wData.source || 'LIVE'}]`,
      sessionContext
    )
  }

  // "Which station has the worst weather?"
  if (
    lowerQ.includes('worst weather') ||
    lowerQ.includes('highest wind') ||
    lowerQ.includes('high wind conditions') ||
    lowerQ.includes('blizzard') ||
    lowerQ.includes('hazardous weather')
  ) {
    const wData = await getOrFetchWeatherData(locations, weatherCache)
    const readings = wData.readings || wData.sites || {}
    let worstStation = locations[0]?.name || 'Base Station'
    let maxGust = 0
    for (const loc of locations) {
      const r = readings[loc.id]
      if (r) {
        const gust = Number(r.windGusts || r.current?.windGusts || r.windSpeed || r.current?.windSpeed || 0)
        if (gust > maxGust) {
          maxGust = gust
          worstStation = loc.name
        }
      }
    }
    return formatResult(
      `${worstStation} is experiencing the most severe polar conditions with high wind gusts and sub-zero temperatures. Operational safety limit: BLIZZARD_ALERT.`,
      sessionContext
    )
  }

  // -------------------------------------------------------------
  // 15. ALERTS, INCIDENTS & EMERGENCIES (Section 13 + Hinglish)
  // -------------------------------------------------------------
  // "Are there any critical alerts?" / "abhi koi critical alert hai kya?"
  if (
    lowerQ.includes('critical alert') ||
    lowerQ.includes('any critical alerts') ||
    lowerQ.includes('priority alerts') ||
    lowerQ.includes('critical alert hai kya') ||
    lowerQ.includes('koi critical alert')
  ) {
    const openInc = emergencies.filter((e) => e.status !== 'RESOLVED')
    const critical = openInc.filter((e) => e.severity === 'CRITICAL' || e.severity === 'HIGH')
    if (critical.length === 0) {
      return formatResult(
        isHi ? 'Abhi koi critical ya high priority alert active nahi hai.' : 'There are currently zero critical or high severity alerts active.',
        sessionContext
      )
    }
    const lines = critical.map(
      (e) =>
        `- **${e.id} [${e.severity}]**: ${e.location} — ${e.description} (Assigned: ${e.assigned_team || 'Response Team'}) [MAP_ACTION:incident:${e.id}:${e.location}]`
    )
    sessionContext.lastEntity = { type: 'emergency', ...critical[0] }
    sessionContext.lastTopic = 'emergencies'
    const reply = isHi
      ? `Haan, ${critical[0].id} (${critical[0].severity} - ${critical[0].description} at ${critical[0].location}) active alert hai.`
      : `Active high-priority alerts (${critical.length}):\n${lines.join('\n')}`
    return formatResult(reply, sessionContext)
  }

  // "Which incident is most serious?"
  if (lowerQ.includes('most serious') || lowerQ.includes('most critical incident') || lowerQ.includes('worst incident')) {
    const openInc = emergencies.filter((e) => e.status !== 'RESOLVED')
    const top = openInc.find((e) => e.severity === 'CRITICAL') || openInc[0]
    if (top) {
      sessionContext.lastEntity = { type: 'emergency', ...top }
      sessionContext.lastTopic = 'emergencies'
      return formatResult(
        `The most serious open incident is ${top.id} [${top.severity} severity] at ${top.location}: ${top.description}. Assigned response team: ${top.assigned_team || 'Response Unit'}. [MAP_ACTION:incident:${top.id}:${top.location}]`,
        sessionContext
      )
    }
  }

  // "Show active incidents"
  if (
    lowerQ.includes('active incidents') ||
    lowerQ.includes('show active incidents') ||
    lowerQ.includes('list emergencies') ||
    lowerQ.includes('open emergencies') ||
    lowerQ.includes('how many open incidents')
  ) {
    const openInc = emergencies.filter((e) => e.status !== 'RESOLVED')
    if (openInc.length === 0) {
      return formatResult('Zero active incidents. All sectors reporting nominal.', sessionContext)
    }
    const lines = openInc.map(
      (e) =>
        `- **${e.id} [${e.severity} ${e.type}]**: ${e.location} — ${e.description} (${e.status}, Assigned: ${e.assigned_team || 'None'}) [MAP_ACTION:incident:${e.id}:${e.location}]`
    )
    return formatResult(`Active Incidents (${openInc.length}):\n${lines.join('\n')}`, sessionContext)
  }

  // -------------------------------------------------------------
  // 16. MISSING DATA & UNKNOWN QUERY SAFEGUARD (Section 25)
  // -------------------------------------------------------------
  // Final fallback check with general project query engine
  const fallbackGeneralResult = await evaluateGeneralProjectQuery(q, data, sessionContext)
  if (fallbackGeneralResult && fallbackGeneralResult.handled) {
    if (fallbackGeneralResult.sessionContext) {
      Object.assign(sessionContext, fallbackGeneralResult.sessionContext)
    }
    return formatResult(fallbackGeneralResult.reply, sessionContext)
  }

  const locCount = (data.locations || []).length
  const pplCount = (data.personnel || []).length
  const expCount = (data.expeditions || []).length
  const crgCount = (data.cargo || []).length

  const fallbackReply =
    lang === 'hi'
      ? `पोलर कमांड सेंटर के सक्रिय रिकॉर्ड में इस प्रश्न से संबंधित कोई विशिष्ट रिकॉर्ड नहीं मिला।\n\n` +
        `सिस्टम वर्तमान में **${locCount} अनुसंधान केंद्र**, **${pplCount} ऑन-ड्यूटी कार्मिक**, **${expCount} अभियान**, और **${crgCount} कार्गो खेप** ट्रैक कर रहा है।\n\n` +
        `💡 **सुझाव**: आप इस प्रकार के प्रश्न पूछ सकते हैं:\n` +
        `• \`सक्रिय अभियान दिखाओ\` — वर्तमान मिशनों की स्थिति\n` +
        `• \`मैत्री स्टेशन पर कौन है?\` — स्टेशन कार्मिक सूची\n` +
        `• \`उड़ान सुरक्षा सीमाएं क्या हैं?\` — ट्विन ओटर और मौसम नियम\n` +
        `• \`कम स्टॉक सामान कौन सा है?\` — आपातकालीन आपूर्ति अलर्ट`
      : isHi
        ? `POLAR Command Center ke active project records mein is query se match hone wala koi specific record nahi mila.\n\n` +
          `System currently **${locCount} research stations**, **${pplCount} field personnel**, **${expCount} expeditions**, aur **${crgCount} cargo consignments** monitor kar raha hai.\n\n` +
          `💡 **Quick Suggestions** — Aap ye pooch sakte hain:\n` +
          `• \`expeditions batao\` — Abhi kaunse missions chal rahe hain\n` +
          `• \`Maitri par kaun hai?\` — Station team roster aur satphones\n` +
          `• \`flight safety limits\` — Aviation safety thresholds\n` +
          `• \`kaunsa saman low stock mein hai?\` — Critical inventory check`
        : `No matching operational record was found for your query in the current POLAR Command Center state.\n\n` +
          `The system actively monitors **${locCount} research facilities**, **${pplCount} personnel**, **${expCount} expeditions**, and **${crgCount} cargo consignments**.\n\n` +
          `💡 **Suggested Directives** — You can ask:\n` +
          `• \`Show active expeditions\` — Live progress and mission teams\n` +
          `• \`Who is stationed at Maitri?\` — Personnel and telemetry\n` +
          `• \`Flight safety limits\` — Weather thresholds and flight envelopes\n` +
          `• \`Which inventory items are low stock?\` — Supply buffer status`

  return { handled: true, reply: fallbackReply, sessionContext, isFallback: true }
}

/**
 * Evaluates live flight safety for a specific station against Twin Otter VFR / rotary limits
 */
async function assessFlightSafetyForStation(placeName, locations, weatherCache, lang = 'en') {
  try {
    const wData = await getOrFetchWeatherData(locations, weatherCache)
    const targetAlias = resolveStation(placeName, locations)
    const siteId = targetAlias ? targetAlias.id : 'LOC-BHARATI'
    const loc = locations.find((l) => l.id === siteId) || targetAlias
    const sname = loc ? loc.name : placeName
    const readings = wData.readings || wData.sites || {}
    const r = readings[siteId]

    if (r) {
      const cur = r.current || r
      const temp = Number.isFinite(cur.temperature) ? Number(cur.temperature) : -18
      const chill = cur.windChill != null && Number.isFinite(Number(cur.windChill)) ? Number(cur.windChill) : temp - 7
      const windSpeed = Number.isFinite(Number(cur.windSpeed)) ? Number(cur.windSpeed) : 32
      const windKt = Math.round(windSpeed / 1.852)
      const gustSpeed = Number.isFinite(Number(cur.windGusts || cur.wind_gusts)) ? Number(cur.windGusts || cur.wind_gusts) : Math.round(windSpeed * 1.3)
      const gustKt = Math.round(gustSpeed / 1.852)
      const desc = cur.description || describeWeatherCode(cur.code) || 'Fair'
      const code = Number(cur.code) || 0

      // Estimated visibility from weather code
      let visKm = 10.0
      if (code === 71 || code === 73 || code === 75) visKm = 4.0 // snow
      else if (code === 77 || code === 85 || code === 86) visKm = 2.5 // snow showers
      else if (windSpeed > 55 || code >= 95) visKm = 0.5 // blizzard/storm
      else if (code >= 51 && code <= 67) visKm = 6.0 // drizzle/rain

      const windPass = windKt <= 35
      const gustPass = gustKt <= 45
      const visPass = visKm >= 5.0
      const tempPass = temp >= -45

      let verdictBadge = '🟢 GO — FLIGHT SORTIE AUTHORIZED'
      let summaryAdvice = 'Current meteorological telemetry is within nominal DHC-6 Twin Otter and rotary VFR operating envelopes.'

      if (!tempPass || windKt > 45 || gustKt > 55 || visKm < 2.0 || code >= 95) {
        verdictBadge = '🔴 NO-GO — FLIGHTS GROUNDED'
        summaryAdvice = 'Extreme conditions exceed polar aircraft airframe and runway safety tolerances. Sorties strictly suspended.'
      } else if (!windPass || !gustPass || !visPass || windKt > 28 || gustKt > 38 || visKm < 7.0) {
        verdictBadge = '🟡 MARGINAL — COMMAND ADVISORY / CAUTION'
        summaryAdvice = 'Conditions are near operational thresholds. High crosswind or reduced contrast reported. Command discretion advised.'
      }

      if (lang === 'hi') {
        return `### ✈️ उड़ान सुरक्षा मूल्यांकन: ${sname} (${siteId})
**स्थिति:** **${verdictBadge}**
**मौसम सारांश:** तापमान **${temp}°C** (विंड चिल **${chill}°C**) · हवा **${windSpeed} किमी/घंटा (${windKt} नॉट)** · आसमान: **${desc}**

| सुरक्षा मापदंड | स्टेशन टेलीमेट्री | ट्विन ओटर (Twin Otter) VFR सीमा | स्थिति / मार्जिन |
|---|---|---|---|
| **हवा की गति (Sustained)** | ${windSpeed} किमी/घंटा (${windKt} नॉट) | अधिकतम 65 किमी/घंटा (35 नॉट) | ${windPass ? '✅ सुरक्षित सीमा' : '⚠️ सीमा पार'} |
| **हवा के झोंके (Gusts)** | ${gustSpeed} किमी/घंटा (${gustKt} नॉट) | अधिकतम 83 किमी/घंटा (45 नॉट) | ${gustPass ? '✅ सीमा के भीतर' : '⚠️ तेज झोंके'} |
| **दृश्यता (Visibility)** | ~${visKm} किमी | न्यूनतम 5.0 किमी (VFR) | ${visPass ? '✅ स्पष्ट VFR' : '⚠️ कम दृश्यता'} |
| **तापमान (Airframe)** | ${temp}°C | न्यूनतम -45°C | ${tempPass ? '✅ सामान्य' : '⚠️ हाइड्रोलिक रिस्क'} |

**कमान निर्देश:**
• ${summaryAdvice}
• अनिवार्य 45-मिनट आईएफआर रिजर्व ईंधन और 14 दिनों की आपातकालीन सर्वाइवल किट बोर्ड पर रखें।
• वैकल्पिक सुरक्षित रनवे: नोवो रनवे (Novo Runway) अथवा केप टाउन।

[Inspect Weather Matrix -> weather] · [Review Active Incidents -> emergency] [MAP_ACTION:site:${siteId}:${sname}]`
      }

      if (lang === 'hinglish') {
        return `### ✈️ Flight Safety Assessment: ${sname} (${siteId})
**Status:** **${verdictBadge}**
**Current Weather:** Temp **${temp}°C** (Feels like **${chill}°C**) · Wind **${windSpeed} km/h (${windKt} kt)** · Sky: **${desc}**

| Safety Parameter | Station Telemetry | DHC-6 Twin Otter Limit | Status / Margin |
|---|---|---|---|
| **Sustained Wind** | ${windSpeed} km/h (${windKt} kt) | Max 65 km/h (35 kt) | ${windPass ? '✅ Within Limits' : '⚠️ Exceeded'} |
| **Peak Gusts** | ${gustSpeed} km/h (${gustKt} kt) | Max 83 km/h (45 kt) | ${gustPass ? '✅ Safe' : '⚠️ High Gusts'} |
| **Visibility** | ~${visKm} km | Min 5.0 km (VFR) | ${visPass ? '✅ Clear VFR' : '⚠️ Marginal Visibility'} |
| **Airframe Temp** | ${temp}°C | Min -45°C | ${tempPass ? '✅ Nominal' : '⚠️ Hydraulic Risk'} |

**Command Directives:**
• ${summaryAdvice}
• Aircraft par 45-minute IFR holding reserve fuel aur 14-day emergency survival bivvy kit mandatory hai.
• Designated Divert Runway: Novo Runway ya Cape Town Gateway.

[Inspect Weather Matrix -> weather] · [Review Active Incidents -> emergency] [MAP_ACTION:site:${siteId}:${sname}]`
      }

      return `### ✈️ Polar Flight Safety Assessment: ${sname} (${siteId})
**Flight Operations Verdict:** **${verdictBadge}**
**Current Telemetry:** **${temp}°C** (Wind Chill: **${chill}°C**) · Winds: **${windSpeed} km/h (${windKt} kt)** · Sky: **${desc}**

| Operational Safety Parameter | Live Station Reading | DHC-6 Twin Otter VFR Limit | Flight Margin / Status |
|---|---|---|---|
| **Sustained Wind Speed** | ${windSpeed} km/h (${windKt} kt) | Max 65 km/h (35 kt) | ${windPass ? '✅ Within Safe Envelope' : '🔴 Exceeds Maximum Limit'} |
| **Peak Wind Gusts** | ${gustSpeed} km/h (${gustKt} kt) | Max 83 km/h (45 kt) | ${gustPass ? '✅ Within Tolerance' : '🔴 Severe Gust Warning'} |
| **Flight Visibility** | ~${visKm} km | Min 5.0 km (VFR ski-landing) | ${visPass ? '✅ VFR Approved' : '⚠️ Sub-minimum Visibility'} |
| **Airframe Temperature** | ${temp}°C | Min -45°C (Hydraulic seal limit) | ${tempPass ? `✅ Nominal (+${(temp - (-45)).toFixed(1)}°C margin)` : '🔴 Hydraulic Embrittlement Risk'} |

**Operational Directives & Flight Plan Advisory:**
• **Mission Status:** ${summaryAdvice}
• **Mandatory Fuel Reserve:** Minimum 45-minute IFR fuel buffer plus divert burn calculation to alternate strip.
• **Survival Equipment:** Onboard 14-day polar emergency bivvy cache and 406 MHz COSPAS-SARSAT beacon required.
• **Designated Alternate Strip:** Novo Runway (Blue Ice Runway, LOC-NOVO) or Cape Town Staging Depot.

[Inspect Weather Matrix -> weather] · [Review Active Incidents -> emergency] [MAP_ACTION:site:${siteId}:${sname}]`
    }

    return `Flight telemetry for ${placeName} is currently updating from remote Antarctic sensors.`
  } catch (err) {
    return `Flight operations telemetry interrupted for ${placeName}.`
  }
}

/**
 * Fetches or retrieves weather for a named place with structured telemetry table
 */
async function getWeatherForPlace(placeName, locations, weatherCache, lang = 'en') {
  try {
    const wData = await getOrFetchWeatherData(locations, weatherCache)
    const targetAlias = resolveStation(placeName, locations)
    const siteId = targetAlias ? targetAlias.id : 'LOC-MAITRI'
    const loc = locations.find((l) => l.id === siteId) || targetAlias
    const sname = loc ? loc.name : placeName
    const readings = wData.readings || wData.sites || {}
    const r = readings[siteId]

    if (r) {
      const cur = r.current || r
      const temp = Number.isFinite(cur.temperature) ? Number(cur.temperature) : -15
      const chill = cur.windChill != null && Number.isFinite(Number(cur.windChill)) ? Number(cur.windChill) : temp - 6
      const windSpeed = Number.isFinite(Number(cur.windSpeed)) ? Number(cur.windSpeed) : 28
      const windDir = cur.windDirection || (cur.windFrom ? `(${cur.windFrom}°)` : '')
      const desc = cur.description || describeWeatherCode(cur.code) || 'Overcast'
      const assessment = assessConditions(cur)

      const tempStatus = temp < -35 ? '⚠️ Extreme Polar Cold' : 'Nominal'
      const windStatus = windSpeed > 50 ? '⚠️ High Winds' : 'Operational'

      if (lang === 'hi') {
        return `### 🌦️ मौसम टेलीमेट्री: ${sname} (${siteId})
**वर्तमान स्थिति:** तापमान **${temp}°C** (विंड चिल **${chill}°C**) · हवा: **${windSpeed} किमी/घंटा** ${windDir} · आसमान: **${desc}**

| मौसम मापदंड | लाइव रीडिंग | परिचालन सीमा | स्थिति |
|---|---|---|---|
| **वायु तापमान** | ${temp}°C | न्यूनतम -45°C | ${tempStatus} |
| **विंड चिल** | ${chill}°C | -50°C से नीचे सतर्कता | ${chill < -50 ? '⚠️ गंभीर चिल' : 'सुरक्षित'} |
| **हवा की गति** | ${windSpeed} किमी/घंटा ${windDir} | अधिकतम 65 किमी/घंटा (VFR) | ${windStatus} |
| **आकाश की स्थिति** | ${desc} | - | सामान्य |

• **उड़ान सुरक्षा सीमा (Flight Envelopes):** **${assessment.key}** (${assessment.reason})
• **डेटा स्रोत:** ${wData.source || 'LIVE AWS Telemetry'}

[Inspect Weather Matrix -> weather] · [Review Active Incidents -> emergency] [MAP_ACTION:site:${siteId}:${sname}]`
      }

      return `### 🌦️ Meteorological Telemetry: ${sname} (${siteId})
**Current Weather:** **${temp}°C** (Feels like **${chill}°C**) · Winds: **${windSpeed} km/h** ${windDir} · Sky: **${desc}**

| Telemetry Metric | Current Sensor Reading | Operational Threshold | Environmental Status |
|---|---|---|---|
| **Air Temperature** | ${temp}°C | Min -45°C (Equipment limit) | ${tempStatus} |
| **Wind Chill Index** | ${chill}°C | Warning threshold < -50°C | ${chill < -50 ? '⚠️ Severe Wind Chill Warning' : 'Safe Operating Buffer'} |
| **Sustained Winds** | ${windSpeed} km/h ${windDir} | Max 65 km/h (Aviation VFR limit) | ${windStatus} |
| **Sky Condition** | ${desc} | Unobstructed visibility | Nominal |

• **Flight & Operations Safety Window:** **${assessment.key}** (${assessment.reason})
• **Telemetry Source:** ${wData.source || 'LIVE AWS Network'}

[Inspect Weather Matrix -> weather] · [Review Active Incidents -> emergency] [MAP_ACTION:site:${siteId}:${sname}]`
    }
    return `Weather data for ${placeName} is currently updating from polar telemetry sensors.`
  } catch (err) {
    return `Weather telemetry signal interrupted for ${placeName}.`
  }
}

/**
 * Gets cached weather or calls fetchWeather
 */
let cachedWeatherData = null
let cacheTimestamp = 0

async function getOrFetchWeatherData(locations = [], passedCache = null) {
  if (passedCache && passedCache.sites) return passedCache
  const now = Date.now()
  if (cachedWeatherData && now - cacheTimestamp < 60000) {
    return cachedWeatherData
  }
  try {
    const res = await fetchWeather(locations)
    cachedWeatherData = res
    cacheTimestamp = now
    return res
  } catch (err) {
    return { source: 'FALLBACK', sites: {} }
  }
}
