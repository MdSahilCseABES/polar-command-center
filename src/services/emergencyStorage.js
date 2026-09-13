/**
 * EMERGENCY STORAGE & OFFLINE QUEUE SERVICE
 * ==========================================
 * Manages tactical chat messages, offline queues, and simulated network states
 * (ONLINE, INTERMITTENT, OFFLINE) demonstrating polar communication resilience
 * under satellite/HF radio blackout conditions.
 */

const STORAGE_MESSAGES_KEY = 'polar_emergency_messages'
const QUEUE_MESSAGES_KEY = 'polar_offline_queued_messages'
const NETWORK_SIM_KEY = 'polar_network_sim_state'

// Fallback memory store when sessionStorage is restricted or in private mode
const memoryStore = new Map()

function safeStorageGet(key) {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(key)
    }
  } catch {
    // Fall back to memory
  }
  return memoryStore.get(key) ?? null
}

function safeStorageSet(key, value) {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(key, value)
      return
    }
  } catch {
    // Fall back to memory
  }
  memoryStore.set(key, value)
}

function safeStorageRemove(key) {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(key)
      return
    }
  } catch {
    // Fall back to memory
  }
  memoryStore.delete(key)
}

if (typeof window !== 'undefined') {
  window.addEventListener('polar:auth-signout', () => {
    safeStorageRemove(STORAGE_MESSAGES_KEY)
    safeStorageRemove(QUEUE_MESSAGES_KEY)
    safeStorageRemove(NETWORK_SIM_KEY)
    memoryStore.clear()
    safeStorageSet(STORAGE_MESSAGES_KEY, JSON.stringify(INITIAL_MESSAGES))
    window.dispatchEvent(new CustomEvent('polar:messages-update', { detail: INITIAL_MESSAGES }))
  })
}

export const PREDEFINED_QUICK_MESSAGES = [
  'I am safe',
  'Need assistance',
  'Medical emergency',
  'Lost location',
  'Equipment failure',
  'Evacuate immediately',
  'Sheltered in emergency tent',
  'Batteries below 20%',
  'Visual contact established with rescue team',
  'Weather deteriorating rapidly — visibility < 50m',
  'Traverse vehicle winch secured',
]

export const INITIAL_MESSAGES = [
  {
    id: 'MSG-001',
    incidentId: 'INC-001',
    senderId: 'PERS-04',
    senderName: 'Dr. Alok Verma',
    senderRole: 'Field Scientist',
    text: 'MAYDAY: Snowmobile track broke on icy crevasse lip. Both safe on anchor lines. Need winch assistance!',
    priority: 'CRITICAL',
    timestamp: new Date(Date.now() - 41 * 60 * 1000).toISOString(),
    location: { lat: -70.7621, lng: 11.7412 },
    status: 'delivered',
  },
  {
    id: 'MSG-002',
    incidentId: 'INC-001',
    senderId: 'PERS-01',
    senderName: 'Cdr. Anjali Kulkarni',
    senderRole: 'Expedition Commander',
    text: 'Maitri Base copies your distress. Rescue Snowcat Unit 2 is rolling with tether harnesses. ETA 25 minutes.',
    priority: 'HIGH',
    timestamp: new Date(Date.now() - 34 * 60 * 1000).toISOString(),
    status: 'delivered',
  },
  {
    id: 'MSG-003',
    incidentId: 'INC-001',
    senderId: 'PERS-06',
    senderName: 'Dr. Sunita Murthy',
    senderRole: 'Station Medic',
    text: 'Verify thermal suit status. Do not detach from belay line until vehicle beacon is in sight.',
    priority: 'HIGH',
    timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    status: 'delivered',
  },
  {
    id: 'MSG-004',
    incidentId: 'INC-001',
    senderId: 'PERS-04',
    senderName: 'Dr. Alok Verma',
    senderRole: 'Field Scientist',
    text: 'Understood Medic. Suits fully charged at 88%. Emergency survival tent anchored.',
    priority: 'NORMAL',
    timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    location: { lat: -70.7621, lng: 11.7412 },
    status: 'delivered',
  },
  {
    id: 'MSG-005',
    incidentId: 'INC-002',
    senderId: 'PERS-09',
    senderName: 'Kavita Rao',
    senderRole: 'Geophysicist',
    text: 'Need assistance - Primary heater circuit breaker tripped in field hut. Wind chill is severe.',
    priority: 'CRITICAL',
    timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    location: { lat: -69.4124, lng: 76.1843 },
    status: 'delivered',
  },
]

export function getSimulatedNetworkState() {
  if (typeof window === 'undefined') return 'ONLINE'
  const saved = safeStorageGet(NETWORK_SIM_KEY)
  return saved || 'ONLINE'
}

export function setSimulatedNetworkState(state) {
  if (typeof window === 'undefined') return
  safeStorageSet(NETWORK_SIM_KEY, state)
  window.dispatchEvent(new CustomEvent('polar:network-state-change', { detail: state }))
}


export function getMessages() {
  if (typeof window === 'undefined') return INITIAL_MESSAGES
  try {
    const raw = safeStorageGet(STORAGE_MESSAGES_KEY)
    if (!raw) {
      safeStorageSet(STORAGE_MESSAGES_KEY, JSON.stringify(INITIAL_MESSAGES))
      return INITIAL_MESSAGES
    }
    return JSON.parse(raw)
  } catch {
    return INITIAL_MESSAGES
  }
}

export function saveMessage(msg) {
  const current = getMessages()
  const updated = [...current, msg]
  try {
    safeStorageSet(STORAGE_MESSAGES_KEY, JSON.stringify(updated))
  } catch {
    // Storage full
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('polar:messages-update', { detail: updated }))
  }
  return updated
}

export function getQueuedMessages() {
  if (typeof window === 'undefined') return []
  try {
    const data = safeStorageGet(QUEUE_MESSAGES_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function enqueueMessage(msg) {
  const current = getQueuedMessages()
  const item = { ...msg, status: 'queued', isLocalOnly: true }
  current.push(item)
  safeStorageSet(QUEUE_MESSAGES_KEY, JSON.stringify(current))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('polar:offline-queue-update'))
  }
  return item
}

export function clearQueuedMessages() {
  safeStorageRemove(QUEUE_MESSAGES_KEY)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('polar:offline-queue-update'))
  }
}

/**
 * Synchronize offline messages into the active message log
 */
export function flushOfflineQueue() {
  const queued = getQueuedMessages()
  if (queued.length === 0) return { count: 0 }

  const current = getMessages()
  const delivered = queued.map((m) => ({
    ...m,
    status: 'delivered',
    isLocalOnly: false,
    syncedAt: new Date().toISOString(),
  }))

  const combined = [...current, ...delivered]
  safeStorageSet(STORAGE_MESSAGES_KEY, JSON.stringify(combined))
  clearQueuedMessages()

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('polar:messages-update', { detail: combined }))
  }
  return { count: delivered.length }
}
