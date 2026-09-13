/**
 * AUDIO ALERT SERVICE — Web Audio API Synthesizer
 * ===============================================
 * Generates browser-synthesized emergency sound effects without requiring
 * external mp3/wav files.
 *
 * 1. Emergency Siren: Multi-tone crescendo siren (880Hz -> 660Hz -> 988Hz -> 1175Hz)
 * 2. Acknowledge Chirp: Tactical two-tone high confirmation (C5 -> E5)
 */

let audioCtx = null
let isSoundEnabled = true

// Memory fallback if localStorage is blocked
const memoryStore = new Map()

function safeStorageGet(key) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key)
    }
  } catch {
    // Fall back to in-memory store
  }
  return memoryStore.get(key) ?? null
}

function safeStorageSet(key, value) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value)
      return
    }
  } catch {
    // Fall back to in-memory store
  }
  memoryStore.set(key, value)
}

// User-gesture priming to unlock AudioContext seamlessly on modern browsers
if (typeof window !== 'undefined') {
  const primeAudioContext = () => {
    try {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {})
      }
    } catch {
      // Ignore
    }
  }
  window.addEventListener('pointerdown', primeAudioContext, { once: true, passive: true })
  window.addEventListener('keydown', primeAudioContext, { once: true, passive: true })
}

export function setAudioEnabled(enabled) {
  isSoundEnabled = enabled
  if (typeof window !== 'undefined') {
    safeStorageSet('polar_audio_enabled', enabled ? 'true' : 'false')
    window.dispatchEvent(new CustomEvent('polar:audio-toggle', { detail: enabled }))
  }
}

export function getAudioEnabled() {
  if (typeof window !== 'undefined') {
    const saved = safeStorageGet('polar_audio_enabled')
    if (saved !== null) return saved === 'true'
  }
  return isSoundEnabled
}

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext
    if (AudioContextClass) {
      try {
        audioCtx = new AudioContextClass()
      } catch {
        audioCtx = null
      }
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}


/**
 * Plays an emergency two-tone polar radio distress signal
 */
export function playEmergencyAlertSound() {
  if (!getAudioEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // Pulse 1: 880 Hz (A5) high urgency
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sawtooth'
    osc1.frequency.setValueAtTime(880, now)
    osc1.frequency.exponentialRampToValueAtTime(660, now + 0.18)

    gain1.gain.setValueAtTime(0.25, now)
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.18)

    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.2)

    // Pulse 2: 988 Hz (B5)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sawtooth'
    osc2.frequency.setValueAtTime(988, now + 0.22)
    osc2.frequency.exponentialRampToValueAtTime(740, now + 0.42)

    gain2.gain.setValueAtTime(0.3, now + 0.22)
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.42)

    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.22)
    osc2.stop(now + 0.45)

    // Pulse 3: 1175 Hz (D6) crescendo
    const osc3 = ctx.createOscillator()
    const gain3 = ctx.createGain()
    osc3.type = 'sine'
    osc3.frequency.setValueAtTime(1175, now + 0.48)
    osc3.frequency.exponentialRampToValueAtTime(880, now + 0.75)

    gain3.gain.setValueAtTime(0.35, now + 0.48)
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.78)

    osc3.connect(gain3)
    gain3.connect(ctx.destination)
    osc3.start(now + 0.48)
    osc3.stop(now + 0.8)
  } catch {
    // Autoplay blocked before user interaction; ignore silently
  }
}

/**
 * Plays a tactical acknowledge chirp (C5 to E5)
 */
export function playAcknowledgeChirp() {
  if (!getAudioEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(523.25, now) // C5
    osc.frequency.setValueAtTime(659.25, now + 0.08) // E5
    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.2)
  } catch {
    // Ignore
  }
}
