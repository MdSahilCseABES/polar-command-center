/**
 * POLAR COMMAND CENTER — AI ASSISTANT API ROUTE
 * ============================================
 * Serverless API endpoint for Vercel and dev middleware.
 *
 * SECURITY GUARANTEES:
 * - Secret AI keys (AI_API_KEY, OPENAI_API_KEY, GROQ_API_KEY, GEMINI_API_KEY)
 *   are NEVER exposed to the frontend / client bundle.
 * - Input validation guards against oversized payloads and malformed bodies.
 * - Errors are sanitized — raw stack traces or internal API credentials
 *   are never returned to the client.
 *
 * SUPPORTS:
 * - Standard OpenAI-compatible endpoints (OpenAI, Groq, Google Gemini OpenAI-proxy,
 *   OpenRouter, Mistral, Ollama, DeepSeek, etc.)
 * - Configured via environment variables:
 *     AI_API_KEY (or OPENAI_API_KEY / GROQ_API_KEY / GEMINI_API_KEY)
 *     AI_MODEL (e.g. gpt-4o-mini, gemini-2.0-flash, llama-3.3-70b-versatile)
 *     AI_BASE_URL (optional custom endpoint, defaults to provider standard)
 */

export const SYSTEM_PROMPT_TEMPLATE = `You are the AI Operations Assistant for the Polar Command Center (NCPOR / Indian Polar Expedition Management System).
Your mission is to provide accurate, concise, and mission-critical operational intelligence to expedition commanders and logistics operators.

OPERATIONAL BOUNDARIES & STRICT TRUTHFULNESS:
1. USE ONLY CURRENT PROJECT DATA: All answers regarding devices, personnel, coordinates, expeditions, cargo, inventory, and emergencies MUST be based strictly on the provided real-time application context.
2. NEVER FABRICATE COORDINATES OR STATUSES: Never invent GPS coordinates, last update timestamps, or device statuses. If data is not present in the context, clearly state: "That information is not reported in current expedition records."
3. DISTINGUISH SIMULATED VS LIVE DATA:
   - Field personnel & mobile asset positions (P-001 to P-016) are SIMULATED for this mission prototype.
   - Station positions (Maitri: -70.7667°, 11.7333°; Bharati: -69.4067°, 76.1867°; Himadri: 78.9167°, 11.9333°) are REAL published geographic coordinates.
   - Always clearly identify personnel coordinates as simulated positions when providing location details.
4. OUT-OF-THEATRE QUERIES: If asked about locations outside polar expedition theaters (e.g., "Which devices are in Delhi?", "Which devices are in Noida?"), explicitly state that no field personnel or expedition assets are deployed in those locations, and list the active operational theaters (Antarctica, Arctic, Southern Ocean, Cape Town, and NCPOR Goa).
5. CRITICAL DEVICE COMMANDS: You must NEVER pretend to unilaterally execute destructive or critical actions (such as disabling a device, canceling an expedition, or wiping records). If the user asks to disable or alter an asset (e.g. "Disable P-001"), warn:
   "⚠️ Modifying or disabling [Asset/Device ID] is a critical operational action. Please confirm that you want to proceed."
6. MAP ACTIONS: When you discuss a specific trackable asset, personnel, station, or incident, append an action tag in your response using this exact syntax:
   [MAP_ACTION:person:P-001:Dr. Arjun Sharma]
   [MAP_ACTION:site:LOC-MAITRI:Maitri Station]
   [MAP_ACTION:incident:INC-001:Maitri Sector B]
   The command center interface will automatically convert these tags into interactive "View on Map" buttons.
7. TONE & FORMAT: Professional, alert, and succinct. Use bullet points or markdown tables when comparing multiple assets. Highlight any emergency or high-priority warnings immediately.
8. DIRECT FACTUAL QUESTIONS (CRITICAL REQUIREMENT):
   When the user asks a direct factual or operational question for a single metric, stock quantity, or status (e.g. 'current available diesel quantity', 'how much diesel is available?', 'how much fuel is available?', 'how many oxygen cylinders are available?', 'what is the current cargo status?'):
   - Provide a SHORT, DIRECT answer containing ONLY the exact value requested.
   - Format for inventory/supplies: "Current available [ITEM] quantity is X [UNIT]." (e.g., "Current available diesel quantity is 14,200 litres.", "Current available oxygen cylinders are 11.")
   - Format for cargo: "Current cargo status: [summary]."
   - Do NOT output long operational summaries, bullet-point reports, unrelated information, station coordinates, or filler like "According to...".
   - Only provide a detailed report, summary, breakdown, or multiple items if the user explicitly asks for a report, summary, list, explanation, or comparison.`;

/**
 * Parses and extracts [MAP_ACTION:kind:id:name] tags from response text
 */
export function extractMapActions(text) {
  const actions = []
  const actionRegex = /\[MAP_ACTION:(person|site|incident):([A-Za-z0-9-_]+)(?::([^\]]+))?\]/g
  let match
  while ((match = actionRegex.exec(text)) !== null) {
    actions.push({
      kind: match[1],
      id: match[2],
      label: match[3] || match[2],
    })
  }

  // Also clean the text so action tags don't clutter the visible message
  const cleanedText = text.replace(actionRegex, '').trim()
  return { cleanedText, actions }
}

/**
 * Resolves the appropriate base URL and model for the given key/env
 */
export function resolveProviderConfig(env = process.env) {
  const apiKey =
    env.AI_API_KEY ||
    env.OPENAI_API_KEY ||
    env.GROQ_API_KEY ||
    env.GEMINI_API_KEY ||
    ''

  let baseUrl = env.AI_BASE_URL || ''
  let defaultModel = 'gpt-4o-mini'

  if (env.GROQ_API_KEY || apiKey.startsWith('gsk_')) {
    baseUrl = baseUrl || 'https://api.groq.com/openai/v1'
    defaultModel = 'llama-3.3-70b-versatile'
  } else if (env.GEMINI_API_KEY || apiKey.startsWith('AIza')) {
    baseUrl = baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai'
    defaultModel = 'gemini-2.0-flash'
  } else {
    baseUrl = baseUrl || 'https://api.openai.com/v1'
    defaultModel = 'gpt-4o-mini'
  }

  const model = env.AI_MODEL || defaultModel
  return { apiKey, baseUrl, model }
}

/**
 * Core handler processing chat messages with LLM
 */
export async function handleChatRequest(body, env = process.env) {
  if (!body || typeof body !== 'object') {
    return { status: 400, error: 'Invalid request body' }
  }

  const { message, history = [], context = {} } = body

  if (!message || typeof message !== 'string' || !message.trim()) {
    return { status: 400, error: 'Message cannot be empty' }
  }

  if (message.length > 2000) {
    return { status: 400, error: 'Message exceeds maximum length of 2000 characters' }
  }

  const { apiKey, baseUrl, model } = resolveProviderConfig(env)

  if (!apiKey) {
    try {
      const { generateLocalOperationsReply } = await import('../core/operationsAI.js')
      if (generateLocalOperationsReply) {
        const raw = generateLocalOperationsReply(message, context)
        const { cleanedText, actions } = extractMapActions(raw)
        return {
          status: 200,
          reply: cleanedText,
          actions,
          model: 'polar-operations-engine',
        }
      }
    } catch (fallbackErr) {
      // ignore and return 503
    }

    return {
      status: 503,
      error:
        'AI API Key is not configured. Please set AI_API_KEY (or OPENAI_API_KEY / GROQ_API_KEY / GEMINI_API_KEY) in your .env file or Vercel Environment Variables to enable live AI responses.',
      isKeyMissing: true,
    }
  }

  // Prepare system context
  const contextString = typeof context === 'string' ? context : JSON.stringify(context, null, 2)
  const fullSystemMessage = `${SYSTEM_PROMPT_TEMPLATE}\n\nCURRENT POLAR EXPEDITION APPLICATION DATA CONTEXT:\n${contextString}`

  // Build messages array (limit history to last 8 messages for token efficiency)
  const safeHistory = Array.isArray(history)
    ? history.slice(-8).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || '').slice(0, 1500),
      }))
    : []

  const messages = [
    { role: 'system', content: fullSystemMessage },
    ...safeHistory,
    { role: 'user', content: message.trim() },
  ]

  // Setup abort timeout (30 seconds)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.25,
        max_tokens: 1000,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      let errorJson = null
      try {
        errorJson = JSON.parse(errorText)
      } catch {
        // ignore parse error
      }

      if (response.status === 401) {
        return {
          status: 401,
          error: 'Authentication failed. Please verify that your AI_API_KEY is valid and active.',
        }
      }
      if (response.status === 429) {
        return {
          status: 429,
          error: 'AI provider rate limit reached. Please wait a moment before sending another request.',
        }
      }
      if (response.status >= 500) {
        return {
          status: 502,
          error: 'The AI model provider is currently experiencing issues. Please retry in a moment.',
        }
      }

      const msg = errorJson?.error?.message || `AI API returned status ${response.status}`
      return {
        status: response.status,
        error: `AI provider error: ${msg}`,
      }
    }

    const data = await response.json()
    const rawReply = data?.choices?.[0]?.message?.content || 'No response generated.'

    const { cleanedText, actions } = extractMapActions(rawReply)

    return {
      status: 200,
      reply: cleanedText,
      actions,
      model,
    }
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      return {
        status: 504,
        error: 'The AI service request timed out after 30 seconds. Please try again.',
      }
    }
    return {
      status: 500,
      error: 'Network failure connecting to AI service. Please check connection and settings.',
    }
  }
}

/**
 * Standard Vercel Serverless Function Handler
 */
async function parseBody(req) {
  if (req.body) {
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body) } catch { return null }
    }
    return req.body
  }
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(data)) } catch { resolve(null) }
    })
    req.on('error', () => resolve(null))
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    if (res.setHeader) res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    const body = await parseBody(req)
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid or missing JSON payload' })
    }

    const result = await handleChatRequest(body, process.env)
    const status = result.status || 200
    delete result.status
    return res.status(status).json(result)
  } catch (err) {
    console.error('Chat API Error:', err)
    return res.status(500).json({
      error: 'An internal server error occurred while processing the AI request: ' + (err?.message || String(err)),
    })
  }
}
