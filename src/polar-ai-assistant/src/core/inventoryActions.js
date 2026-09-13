/**
 * INVENTORY ACTIONS & NATURAL LANGUAGE ENGINE
 * ============================================
 * Production-ready natural language inventory manager for Polar Command Center.
 * Handles inventory queries, mutations (add, increase, decrease, delete with confirmation,
 * update attributes/locations), low-stock detection, and station searches directly
 * against DataContext in real time.
 */

import { isLowStock } from '../utils/statuses.js'

const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
  // Hindi number words:
  ek: 1, do: 2, teen: 3, chaar: 4, char: 4, paanch: 5, panch: 5, chhe: 6, saat: 7, aath: 8, nau: 9,
  das: 10, dus: 10, gyarah: 11, barah: 12, terah: 13, chaudah: 14, pandrah: 15, solah: 16,
  satrah: 17, atharah: 18, unnees: 19, bees: 20, tees: 30, chaalis: 40, pachaas: 50,
  sau: 100, hazaar: 1000, hazar: 1000
}

/**
 * Normalizes common Hinglish spelling, grammar, and phonetic variations
 */
export function normalizeHinglish(text) {
  if (!text) return ''
  let t = text.toLowerCase().trim()
  t = t.replace(/[?.,!]/g, ' ')
    .replace(/\bkon\s+sa\b/g, 'kaunsa')
    .replace(/\bkonsa\b/g, 'kaunsa')
    .replace(/\bkon\s+si\b/g, 'kaunsi')
    .replace(/\bkonsi\b/g, 'kaunsi')
    .replace(/\bkon\s+se\b/g, 'kaunse')
    .replace(/\bkonse\b/g, 'kaunse')
    .replace(/\bpura\b/g, 'poora')
    .replace(/\bwaala\b/g, 'wala')
    .replace(/\bwaali\b/g, 'wali')
    .replace(/\bme\b/g, 'mein')
    .replace(/\bkaha\b/g, 'kahan')
    .replace(/\bkidar\b/g, 'kidhar')
    .replace(/\bwaha\b/g, 'wahan')
    .replace(/\byaha\b/g, 'yahan')
    .replace(/\biss\s+me\b/g, 'isme')
    .replace(/\bis\s+me\b/g, 'isme')
    .replace(/\biss\s+mein\b/g, 'isme')
    .replace(/\bis\s+mein\b/g, 'isme')
    .replace(/\biss\s+ke\b/g, 'iske')
    .replace(/\bis\s+ke\b/g, 'iske')
    .replace(/\biss\s+ka\b/g, 'iska')
    .replace(/\bis\s+ka\b/g, 'iska')
    .replace(/\biss\s+ki\b/g, 'iski')
    .replace(/\bis\s+ki\b/g, 'iski')
    .replace(/\bpaas\b/g, 'pass')
    .replace(/\bchiz\b/g, 'cheez')
    .replace(/\bsabkuch\b/g, 'sab kuch')
    .replace(/\bexpeditions?\b/g, 'mission')
    .replace(/\bmissions\b/g, 'mission')
    .replace(/\bpehle\b/g, 'pahle')
    .replace(/\s+/g, ' ')
    .trim()
  return t
}

/**
 * Detects whether the text is Hindi or Hinglish
 */
export function isHinglish(text) {
  if (!text) return false
  const lower = text.toLowerCase()
  const hinglishTokens = [
    /\b(kaun|kaunsa|kaunsi|kaunse|konsa|konsi|konse|kon\s+sa|kon\s+si|kon\s+se|kya|kyu|kyun|kahan|kidhar|kab|kitna|kitne|kitni|kis|kise|kisko)\b/i,
    /\b(hai|hain|hoon|hoga|hogi|honge|tha|thi)\b/i,
    /(?:\b(?:wo|woh|sab|log)\s+the\b|\bthe\s+kya\b)/i,
    /\b(sabse|aage|chal\s*raha|raha\s*hai|rahi\s*hai|rahe\s*hain|khatam|jaldi|pehle|pahle|baad|poora|pura|peeche)\b/i,
    /\b(batao|bataiye|dikhao|dikhaye|bolo|karo|kar\s*do|kijiye|dega|denge)\b/i,
    /\b(?:kar\s+do|hata\s+do|badha\s+do|de\s+do|bhejo|rakha|chahiye|mein)\b/i,
    /\b(?:kitne\s+log|sab\s+log|log\s+hain|logon)\b/i,
    /\b(badha|badhao|hata|hatao|kam\s*kar|zyada|par|iske|iski|iska|unka|unki|inme|isme|wahan|yahan|idhar|udhar|ye|wo|woh|bacha|paas|pass|saath)\b/i,
    /\b(ka|ke|ki|ko|se)\s+(?:saath|related|liye|baare|andar|bahar|beech|details?|summary|records?|status|progress|info|information)\b/i,
    /\b(haan|nahi|theek|bilkul|shukriya|dhanyawad)\b/i
  ]
  return hinglishTokens.some((p) => p.test(lower))
}

/**
 * Extracts a numeric quantity from text, supporting digits and number words
 */
export function extractQuantity(text) {
  if (!text) return null
  if (/\b(negative|minus)\b/i.test(text) || /-\d/.test(text)) {
    return -1
  }
  const cleaned = text.replace(/,/g, '')

  // Match standard numbers: 500, 14200, 2.5
  const digitMatch = cleaned.match(/\b(\d+(?:\.\d+)?)\b/)
  if (digitMatch) {
    const val = parseFloat(digitMatch[1])
    if (!isNaN(val)) return val
  }

  // Match written numbers (e.g. "one", "twenty", "five hundred")
  const tokens = text.toLowerCase().replace(/[^a-z -]/g, ' ').split(/[ -]+/)
  let total = 0
  let current = 0
  let found = false

  for (const token of tokens) {
    if (NUMBER_WORDS[token] !== undefined) {
      found = true
      const num = NUMBER_WORDS[token]
      if (num === 100) {
        current = (current || 1) * 100
      } else if (num === 1000) {
        total += (current || 1) * 1000
        current = 0
      } else {
        current += num
      }
    }
  }

  if (found) {
    return total + current
  }

  return null
}

/**
 * Normalize word for plural/singular tolerance
 */
export function stemWord(word) {
  let w = String(word || '').toLowerCase().trim()
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y' // batteries -> battery
  if (w.endsWith('es') && (w.endsWith('shes') || w.endsWith('ches') || w.endsWith('sses') || w.endsWith('xes'))) {
    return w.slice(0, -2)
  }
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('is')) return w.slice(0, -1)
  return w
}

/**
 * Known item aliases mapped to keywords
 */
const CANONICAL_ALIASES = [
  { keywords: ['diesel', 'polar diesel', 'diesel fuel'], target: 'diesel' },
  { keywords: ['medical kit', 'med kit', 'first aid', 'medical kits'], target: 'medical kit' },
  { keywords: ['trauma', 'frostbite', 'frostbite kit', 'trauma kit', 'trauma kits', 'frostbite kits'], target: 'trauma' },
  { keywords: ['oxygen', 'oxygen cylinder', 'oxygen cylinders'], target: 'oxygen' },
  { keywords: ['lpg', 'lpg cylinder', 'lpg cylinders', 'gas cylinder'], target: 'lpg' },
  { keywords: ['avalanche beacon', 'avalanche beacons', 'beacon', 'beacons'], target: 'avalanche' },
  { keywords: ['sleeping bag', 'sleeping bags'], target: 'sleeping bag' },
  { keywords: ['potable water', 'water reserve', 'drinking water', 'water'], target: 'water' },
  { keywords: ['dry ration', 'dry rations', 'food supplies', 'food supply'], target: 'food supplies' },
  { keywords: ['ration pack', 'ration packs', '14-day pack'], target: 'ration pack' },
  { keywords: ['satphone battery', 'satphone batteries', 'satellite phone battery', 'satellite batteries', 'phone battery'], target: 'battery' },
  { keywords: ['engine oil', 'generator oil', 'generator engine oil'], target: 'engine oil' },
  { keywords: ['cryo vial', 'cryo vials', 'cryovial', 'cryovials', 'storage vial'], target: 'cryo' },
  { keywords: ['snowmobile track', 'snowmobile tracks', 'spare track', 'spare tracks'], target: 'spare track' }
]

/**
 * Finds an inventory item from a natural language text query
 */
export function findInventoryItem(text, inventory = []) {
  if (!text || !inventory.length) return { item: null, error: null }
  const raw = text.trim()
  const lower = raw.toLowerCase()

  // 1. Direct ID match (e.g. "I-001", "I-002", "item I-003")
  const idMatch = raw.match(/\b(I-\d{3,4})\b/i)
  if (idMatch) {
    const id = idMatch[1].toUpperCase()
    const found = inventory.find((i) => i.id.toUpperCase() === id)
    if (found) return { item: found }
    return { item: null, error: `I couldn't find an inventory item named '${id}'.` }
  }

  // 2. Direct exact name match
  const exact = inventory.find((i) => i.item_name.toLowerCase() === lower)
  if (exact) return { item: exact }

  // 3. Match via canonical aliases
  for (const alias of CANONICAL_ALIASES) {
    if (alias.keywords.some((k) => lower.includes(k))) {
      const matched = inventory.filter((item) => {
        const name = item.item_name.toLowerCase()
        if (alias.target === 'diesel') return name.includes('diesel')
        if (alias.target === 'medical kit') return name.includes('medical kit')
        if (alias.target === 'trauma') return name.includes('trauma') || name.includes('frostbite')
        if (alias.target === 'oxygen') return name.includes('oxygen')
        if (alias.target === 'lpg') return name.includes('lpg')
        if (alias.target === 'avalanche') return name.includes('avalanche') || name.includes('beacon')
        if (alias.target === 'sleeping bag') return name.includes('sleeping bag')
        if (alias.target === 'water') return name.includes('water')
        if (alias.target === 'food supplies') return name.includes('dry ration') || (name.includes('food') && !name.includes('14-day'))
        if (alias.target === 'ration pack') return name.includes('14-day') || name.includes('ration pack')
        if (alias.target === 'battery') return name.includes('batter')
        if (alias.target === 'engine oil') return name.includes('engine oil') || name.includes('generator')
        if (alias.target === 'cryo') return name.includes('cryo')
        if (alias.target === 'spare track') return name.includes('spare track') || name.includes('snowmobile')
        return false
      })

      if (matched.length === 1) return { item: matched[0] }
      if (matched.length > 1) {
        return {
          ambiguous: true,
          items: matched,
          error: `I found multiple items matching '${alias.target}': ${matched.map((m) => m.item_name).join(', ')}. Please specify which item you would like to update.`
        }
      }
    }
  }

  // 4. Substring & word overlap match
  const words = lower
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['add', 'remove', 'delete', 'increase', 'decrease', 'update', 'item', 'inventory', 'quantity', 'stock', 'please', 'the', 'unit', 'units', 'mein', 'par', 'kar', 'karo', 'badha', 'hata', 'kam', 'daal', 'batao', 'dikhaye', 'hain', 'hai', 'kitna', 'kitne', 'kitni', 'available'].includes(w))
    .map(stemWord)

  if (words.length > 0) {
    const scored = inventory.map((item) => {
      const itemWords = item.item_name.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).map(stemWord).filter((w) => w.length > 1)
      let score = 0
      for (const w of words) {
        if (itemWords.includes(w)) {
          score += 3
        } else if (itemWords.some((iw) => (iw.length >= 4 && w.includes(iw)) || (w.length >= 4 && iw.includes(w)))) {
          score += 1
        }
      }
      return { item, score }
    }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score)

    if (scored.length > 0) {
      if (scored.length === 1 || scored[0].score > scored[1].score) {
        return { item: scored[0].item }
      }
      // Top two have equal scores -> ambiguous
      const topItems = scored.filter((s) => s.score === scored[0].score).map((s) => s.item)
      return {
        ambiguous: true,
        items: topItems,
        error: `I found multiple items matching that name: ${topItems.map((m) => m.item_name).join(', ')}. Please specify which item you would like to update.`
      }
    }
  }

  return { item: null, error: null }
}

/**
 * Format quantity and unit nicely
 */
export function formatQtyUnit(qty, unit) {
  const num = Number(qty) || 0
  const formattedNum = num.toLocaleString('en-US')
  const u = String(unit || '').trim()
  return `${formattedNum} ${u}`.trim()
}

/**
 * Pluralize or singularize label based on amount
 */
export function formatActionLabel(item, amount) {
  const lowerName = String(item.item_name || '').toLowerCase()
  const unit = String(item.unit || '').toLowerCase()

  if (unit === 'litres' || unit === 'liters') {
    const shortName = lowerName.includes('diesel') ? 'diesel' : lowerName.includes('water') ? 'potable water' : lowerName.includes('oil') ? 'engine oil' : lowerName
    return `${amount.toLocaleString('en-US')} litres of ${shortName}`
  }

  let label = lowerName
  if (lowerName.includes('oxygen cylinder')) label = 'oxygen cylinders'
  else if (lowerName.includes('lpg cylinder')) label = 'LPG cylinders'
  else if (lowerName.includes('medical kit') && !lowerName.includes('frostbite')) label = 'medical kits'
  else if (lowerName.includes('frostbite') || lowerName.includes('trauma')) label = 'trauma / frostbite kits'
  else if (lowerName.includes('avalanche beacon')) label = 'avalanche beacons'
  else if (lowerName.includes('sleeping bag')) label = 'sleeping bags'
  else if (lowerName.includes('spare track')) label = 'spare tracks'
  else if (lowerName.includes('satphone batter')) label = 'satellite phone batteries'
  else if (lowerName.includes('cryo')) label = 'cryo-vials'
  else if (lowerName.includes('dry ration')) label = 'dry ration packs'
  else if (lowerName.includes('14-day')) label = '14-day ration packs'

  if (amount === 1) {
    if (label.endsWith('ies')) label = label.slice(0, -3) + 'y'
    else if (label.endsWith('s') && !label.endsWith('ss')) label = label.slice(0, -1)
  }

  return `${amount.toLocaleString('en-US')} ${label}`
}

/**
 * Main processor for natural language inventory commands & queries
 */
export async function processInventoryCommand(input, data = {}, session = {}) {
  const text = String(input || '').trim()
  if (!text) return null

  const q = text.toLowerCase()
  const inventory = (data && data.inventory) || []

  // =========================================================================
  // 0. HANDLE PENDING ACTIONS (CONFIRMATION / MULTI-STEP WIZARD)
  // =========================================================================
  if (session.pendingAction) {
    const { type, item, fields = {} } = session.pendingAction

    // A. Pending Deletion Confirmation
    if (type === 'DELETE_ITEM') {
      const isYes = /\b(yes|yeah|yep|sure|confirm|proceed|ok|do it|delete it|yes delete|haan|ha|sahi|kar do|delete karo)\b/i.test(q)
      const isNo = /\b(no|nope|cancel|stop|abort|don't|dont|nahi|na|mat karo)\b/i.test(q)

      if (isYes) {
        if (data.deleteInventoryItem && item) {
          data.deleteInventoryItem(item.id)
          const reply = isHinglish(q) || session.pendingAction.lang === 'hi'
            ? `${item.item_name} (${item.id}) delete ho gaya hai.`
            : `${item.item_name} (${item.id}) has been deleted.`
          return {
            handled: true,
            reply,
            clearPending: true,
          }
        }
      } else if (isNo) {
        const reply = isHinglish(q) || session.pendingAction.lang === 'hi'
          ? 'Deletion cancel kar diya gaya hai.'
          : 'Deletion cancelled.'
        return {
          handled: true,
          reply,
          clearPending: true,
        }
      } else {
        const reply = isHinglish(q) || session.pendingAction.lang === 'hi'
          ? `Please confirm: Kya aap sach mein ${item.item_name} (${item.id}) ko permanently delete karna chahte hain? (Reply 'Haan, delete karo' ya 'Cancel')`
          : `Please confirm: Are you sure you want to permanently delete ${item.item_name} (${item.id})? (Reply 'Yes, delete it' or 'Cancel')`
        return {
          handled: true,
          reply,
          keepPending: true,
        }
      }
    }

    // B. Pending Add New Item Multi-step
    if (type === 'ADD_NEW_ITEM') {
      const qty = extractQuantity(text)
      let nextFields = { ...fields }

      if (qty !== null && !nextFields.quantity) {
        nextFields.quantity = qty
      }

      if (!nextFields.item_name) {
        const parts = text.split(/[,\d]/)
        const possibleName = parts[0].replace(/^(add|item|create|a|an)\s+/i, '').trim()
        if (possibleName) {
          nextFields.item_name = possibleName
        }
      }

      // Location match
      const locMatch = text.match(/\b(maitri|bharati|himadri|schirmacher)(?:\s+station|\s+field\s+camp)?\b/i)
      if (locMatch) {
        const l = locMatch[1].toLowerCase()
        if (l === 'maitri') nextFields.location = 'Maitri Station'
        else if (l === 'bharati') nextFields.location = 'Bharati Station'
        else if (l === 'himadri') nextFields.location = 'Himadri Station'
        else if (l === 'schirmacher') nextFields.location = 'Schirmacher Field Camp'
      }

      // Unit match
      const unitMatch = text.match(/\b(litres|liters|kits|cylinders|units|packs|sets|boxes|vials|kg|meters)\b/i)
      if (unitMatch) {
        nextFields.unit = unitMatch[1].toLowerCase()
      }

      // Category match
      const catMatch = text.match(/\b(fuel|medical|safety|food|utility|spares|scientific|communications)\b/i)
      if (catMatch) {
        const c = catMatch[1].toLowerCase()
        nextFields.category = c.charAt(0).toUpperCase() + c.slice(1)
      }

      if (nextFields.item_name && nextFields.quantity !== undefined) {
        const newItem = {
          item_name: nextFields.item_name,
          quantity: nextFields.quantity,
          category: nextFields.category || 'General',
          unit: nextFields.unit || 'units',
          location: nextFields.location || 'Maitri Station',
          minimum_quantity: nextFields.minimum_quantity || Math.round(nextFields.quantity * 0.25) || 5,
        }

        if (data.addInventoryItem) {
          const created = data.addInventoryItem(newItem)
          return {
            handled: true,
            reply: `Added ${created.quantity} ${created.unit} of ${created.item_name} at ${created.location} (ID: ${created.id}).`,
            clearPending: true,
          }
        }
      } else if (!nextFields.item_name) {
        return {
          handled: true,
          reply: 'What item would you like to add, and what quantity?',
          updatePending: { type: 'ADD_NEW_ITEM', fields: nextFields },
        }
      } else if (nextFields.quantity === undefined) {
        return {
          handled: true,
          reply: `What quantity of ${nextFields.item_name} would you like to add?`,
          updatePending: { type: 'ADD_NEW_ITEM', fields: nextFields },
        }
      }
    }
  }

  // =========================================================================
  // 1. DELETE INVENTORY ITEM (Section 5)
  // =========================================================================
  const isDeleteCmd =
    /\b(delete|erase|permanently\s+delete)\b/i.test(q) ||
    (/\bremove\b/i.test(q) && /\b(item|record|from inventory)\b/i.test(q)) ||
    /\b(delete\s*kar\s*do|delete\s*karo|hata\s*do\s*inventory\s*se)\b/i.test(q)

  if (isDeleteCmd) {
    const { item, ambiguous, error } = findInventoryItem(text, inventory)
    if (ambiguous) {
      return { handled: true, reply: error }
    }
    if (!item) {
      const targetName = text.replace(/^(delete|erase|remove\s+the|remove)\s+/i, '').replace(/\s+(item|from inventory|kar do|karo).*$/i, '').trim()
      return { handled: true, reply: `I couldn't find an inventory item named '${targetName || 'specified'}'.` }
    }

    const isHi = isHinglish(text)
    const reply = isHi
      ? `Kya aap sach mein ${item.item_name} (${item.id}) ko permanently delete karna chahte hain? (Reply 'Haan' ya 'Cancel')`
      : `Are you sure you want to permanently delete ${item.item_name} (${item.id})?`

    return {
      handled: true,
      reply,
      setPending: { type: 'DELETE_ITEM', item, lang: isHi ? 'hi' : 'en' },
    }
  }

  // =========================================================================
  // 2. ADD A NEW INVENTORY ITEM (Section 2)
  // =========================================================================
  if (
    q === 'add a new inventory item' ||
    q === 'add new inventory item' ||
    q === 'add new item' ||
    q === 'create new inventory item' ||
    q === 'add an inventory item'
  ) {
    return {
      handled: true,
      reply: 'What item would you like to add, and what quantity?',
      setPending: { type: 'ADD_NEW_ITEM', fields: {} },
    }
  }

  // =========================================================================
  // 3. INCREASE EXISTING STOCK (Section 3)
  // =========================================================================
  const isIncreaseCmd =
    (/\b(add|put|increase|stock up|restock|top up)\b/i.test(q) ||
      /\b(badha\s*do|badhao|daal\s*do|bhej\s*do|add\s*kar\s*do|aur\s*add\s*karo)\b/i.test(q)) &&
    !/\b(new item|show|where|how|current|kitna|kitne)\b/i.test(q)

  if (isIncreaseCmd) {
    const qty = extractQuantity(text)
    if (qty !== null && qty <= 0) {
      return { handled: true, reply: 'Please provide a valid quantity.' }
    }

    const { item, ambiguous, error } = findInventoryItem(text, inventory)
    if (ambiguous) return { handled: true, reply: error }

    if (qty === null) {
      if (!item) {
        const candidateName = text
          .replace(/^(add|put|increase|stock up|restock)\s+/i, '')
          .replace(/\b(litres|liters|kits|units|cylinders|packs|sets|to|by|in|stock)\b/gi, '')
          .trim()
        return { handled: true, reply: `I couldn't find an inventory item named '${candidateName || 'specified'}'.` }
      }
      return { handled: true, reply: 'Please provide a valid quantity.' }
    }
    if (ambiguous) return { handled: true, reply: error }

    if (item) {
      const currentQty = Number(item.quantity) || 0
      const newQty = currentQty + qty
      if (data.updateInventoryItem) {
        data.updateInventoryItem(item.id, { quantity: newQty })
      }
      const actionLabel = formatActionLabel(item, qty)
      const isHi = isHinglish(text)
      const reply = isHi
        ? `${actionLabel} add kar diye gaye hain. New quantity: ${newQty.toLocaleString('en-US')} ${item.unit}.`
        : `Added ${actionLabel}. New quantity: ${newQty.toLocaleString('en-US')} ${item.unit}.`
      return {
        handled: true,
        reply,
      }
    } else {
      const candidateName = text
        .replace(/^(add|put|increase|stock up|restock)\s+/i, '')
        .replace(/\b\d+(?:\.\d+)?\b/g, '')
        .replace(/\b(litres|liters|kits|units|cylinders|packs|sets|to|by|in|stock|kar do|karo|badha do)\b/gi, '')
        .trim()

      if (candidateName.length > 2) {
        return {
          handled: true,
          reply: `I couldn't find an existing item named '${candidateName}'. Would you like to add it as a new inventory item? Please specify its category, location, and unit.`,
          setPending: { type: 'ADD_NEW_ITEM', fields: { item_name: candidateName, quantity: qty } },
        }
      }
      return { handled: true, reply: `I couldn't find an inventory item named in your request.` }
    }
  }

  // =========================================================================
  // 4. DECREASE / REMOVE STOCK (Section 4)
  // =========================================================================
  const isDecreaseCmd =
    (/\b(remove|use|decrease|deduct|consume|take out)\b/i.test(q) ||
      /\b(hata\s*do|kam\s*kar\s*do|nikal\s*do|ghata\s*do|kam\s*karo|hatao|ghatao)\b/i.test(q)) &&
    !/\b(item|record|from inventory)\b/i.test(q)

  if (isDecreaseCmd) {
    const qty = extractQuantity(text)
    if (qty !== null && qty <= 0) {
      return { handled: true, reply: 'Please provide a valid quantity.' }
    }

    const { item, ambiguous, error } = findInventoryItem(text, inventory)
    if (ambiguous) return { handled: true, reply: error }

    if (qty === null) {
      if (!item) {
        const candidateName = text
          .replace(/^(remove|use|decrease|deduct|consume)\s+/i, '')
          .replace(/\b(litres|liters|kits|units|cylinders|packs|sets|from|by)\b/gi, '')
          .trim()
        return { handled: true, reply: `I couldn't find an inventory item named '${candidateName || 'specified'}'.` }
      }
      return { handled: true, reply: 'Please provide a valid quantity.' }
    }
    if (ambiguous) return { handled: true, reply: error }

    if (!item) {
      const candidateName = text
        .replace(/^(remove|use|decrease|deduct|consume)\s+/i, '')
        .replace(/\b\d+(?:\.\d+)?\b/g, '')
        .replace(/\b(litres|liters|kits|units|cylinders|packs|sets|from|by|hata do|kam kar do)\b/gi, '')
        .trim()
      return { handled: true, reply: `I couldn't find an inventory item named '${candidateName || 'specified'}'.` }
    }

    const currentQty = Number(item.quantity) || 0
    const actionLabel = formatActionLabel(item, qty)

    if (qty > currentQty) {
      const isHi = isHinglish(text)
      const reply = isHi
        ? `${actionLabel} remove nahi ho sakta. Abhi sirf ${currentQty.toLocaleString('en-US')} ${item.unit} available hain.`
        : `Cannot remove ${actionLabel}. Only ${currentQty.toLocaleString('en-US')} ${item.unit} are currently available.`
      return {
        handled: true,
        reply,
      }
    }

    const newQty = currentQty - qty
    if (data.updateInventoryItem) {
      data.updateInventoryItem(item.id, { quantity: newQty })
    }

    const isHi = isHinglish(text)
    const reply = isHi
      ? `${actionLabel} remove kar diye gaye hain. New quantity: ${newQty.toLocaleString('en-US')} ${item.unit}.`
      : `Removed ${actionLabel}. New quantity: ${newQty.toLocaleString('en-US')} ${item.unit}.`
    return {
      handled: true,
      reply,
    }
  }

  // =========================================================================
  // 5. UPDATE INVENTORY ITEM (Section 6)
  // =========================================================================
  // A. Minimum stock update
  if (/\b(minimum\s+stock|minimum\s+quantity|min\s+stock)\b/i.test(q) && /\b(change|set|update|to)\b/i.test(q)) {
    const newMin = extractQuantity(text)
    if (newMin === null) {
      return { handled: true, reply: 'Please provide a valid quantity for minimum stock.' }
    }
    const { item, ambiguous, error } = findInventoryItem(text, inventory)
    if (ambiguous) return { handled: true, reply: error }
    if (!item) return { handled: true, reply: "I couldn't find the specified inventory item." }

    if (data.updateInventoryItem) {
      data.updateInventoryItem(item.id, { minimum_quantity: newMin })
    }
    return {
      handled: true,
      reply: `${item.item_name} minimum stock updated to ${newMin} ${item.unit}.`,
    }
  }

  // B. Location / Move update
  if (/\b(move|relocate|transfer|change\s+location)\b/i.test(q)) {
    const locMatch = text.match(/\b(?:to\s+)?(maitri|bharati|himadri|schirmacher)(?:\s+station|\s+field\s+camp)?\b/i)
    if (!locMatch) {
      return { handled: true, reply: 'Please specify a valid station destination (Maitri, Bharati, or Himadri).' }
    }

    let targetLoc = 'Maitri Station'
    const l = locMatch[1].toLowerCase()
    if (l === 'maitri') targetLoc = 'Maitri Station'
    else if (l === 'bharati') targetLoc = 'Bharati Station'
    else if (l === 'himadri') targetLoc = 'Himadri Station'
    else if (l === 'schirmacher') targetLoc = 'Schirmacher Field Camp'

    const { item, ambiguous, error } = findInventoryItem(text, inventory)
    if (ambiguous) return { handled: true, reply: error }
    if (!item) return { handled: true, reply: "I couldn't find the specified inventory item to move." }

    if (data.updateInventoryItem) {
      data.updateInventoryItem(item.id, { location: targetLoc })
    }
    return {
      handled: true,
      reply: `${item.item_name} moved to ${targetLoc}.`,
    }
  }

  // C. Rename item
  if (/\brename\b/i.test(q) || (/\bchange\s+name\b/i.test(q) && /\bto\b/i.test(q))) {
    const toMatch = text.match(/\bto\s+(.+)$/i)
    if (!toMatch) {
      return { handled: true, reply: 'Please specify the new name for the item.' }
    }
    const newName = toMatch[1].trim()
    const { item, ambiguous, error } = findInventoryItem(text, inventory)
    if (ambiguous) return { handled: true, reply: error }
    if (!item) return { handled: true, reply: "I couldn't find the specified inventory item to rename." }

    if (data.updateInventoryItem) {
      data.updateInventoryItem(item.id, { item_name: newName })
    }
    return {
      handled: true,
      reply: `Item ${item.id} renamed to ${newName}.`,
    }
  }

  // D. Set exact quantity
  if (/\bset\b/i.test(q) && /\bquantity\b/i.test(q)) {
    const qty = extractQuantity(text)
    if (qty === null || qty < 0) {
      return { handled: true, reply: 'Please provide a valid quantity.' }
    }
    const { item, ambiguous, error } = findInventoryItem(text, inventory)
    if (ambiguous) return { handled: true, reply: error }
    if (!item) return { handled: true, reply: "I couldn't find the specified inventory item." }

    if (data.updateInventoryItem) {
      data.updateInventoryItem(item.id, { quantity: qty })
    }
    return {
      handled: true,
      reply: `${item.item_name} quantity updated to ${qty.toLocaleString('en-US')} ${item.unit}.`,
    }
  }

  // =========================================================================
  // 6. LOW STOCK DETECTION (Section 8)
  // =========================================================================
  const normQ = normalizeHinglish(text)
  const isLowStockCmd =
    /\b(low\s+stock|low\s+on\s+stock|running\s+out|out\s+of\s+stock)\b/i.test(q) ||
    /\b(kaunse|kaunsa|kis)\s+(?:items?|stock|samagri)\s+.*?\b(kam|low)\b/i.test(normQ) ||
    /\b(?:items?|stock|quantity)\s+kam\s+hai\b/i.test(normQ) ||
    /\blow\s+stock\s+mein\s+kya\b/i.test(normQ) ||
    /\bkaunsa\s+stock\s+low\b/i.test(normQ) ||
    /\b(kaunse|konsa|kon\s+se)\s+items?\s+(?:kam|low)\b/i.test(normQ) ||
    q.includes('show all low stock items') ||
    q.includes('which items are low on stock') ||
    q.includes('list low stock items') ||
    q === 'low stock'

  if (isLowStockCmd) {
    const locMatch = text.match(/\b(maitri|bharati|himadri|schirmacher)(?:\s+station|\s+field\s+camp)?\b/i)
    let filtered = inventory
    let locName = ''
    if (locMatch) {
      const l = locMatch[1].toLowerCase()
      filtered = filtered.filter((i) => i.location.toLowerCase().includes(l))
      locName = ` at ${locMatch[0]}`
    }
    const lowItems = filtered.filter((i) => Number(i.quantity) <= Number(i.minimum_quantity))
    if (!lowItems.length) {
      return {
        handled: true,
        reply: `All inventory items${locName} are currently above minimum stock thresholds.`,
      }
    }

    const lines = lowItems.map((item) => `- ${item.item_name}: ${Number(item.quantity).toLocaleString('en-US')} ${item.unit} (${item.location})`)
    return {
      handled: true,
      reply: `Low stock items${locName}:\n${lines.join('\n')}`,
    }
  }

  // =========================================================================
  // 7. INVENTORY SEARCH & STATION QUERIES (Section 7)
  // =========================================================================
  // A. "Where is the [item] stored?" / "Which station has [item]?"
  const isNonInventoryStationQuery = /\b(weather|personnel|people|staff|incident|emergency|alert|most|least|highest|lowest)\b/i.test(q)
  if (
    !isNonInventoryStationQuery &&
    ((/\bwhere\s+(?:is|are)\b/i.test(q) && /\b(stored|located|kept)\b/i.test(q)) ||
      /\bwhich\s+station\s+has\b/i.test(q))
  ) {
    const { item, ambiguous, error } = findInventoryItem(text, inventory)
    if (ambiguous) return { handled: true, reply: error }
    if (item) {
      const verb = item.item_name.endsWith('s') ? 'are' : 'is'
      return {
        handled: true,
        reply: `${item.item_name} ${verb} stored at ${item.location}.`,
      }
    }
  }

  // B. "Show item I-003" / "Show item [name]"
  const showItemMatch = text.match(/\bshow\s+(?:item\s+)?(I-\d{3,4}|[a-z0-9 -]+)$/i)
  if (showItemMatch && !q.includes('inventory') && !q.includes('stock') && !q.includes('all')) {
    const { item } = findInventoryItem(showItemMatch[1], inventory)
    if (item) {
      return {
        handled: true,
        reply: `${item.id}: ${item.item_name} (${item.category}) — Quantity: ${Number(item.quantity).toLocaleString('en-US')} ${item.unit} (minimum: ${Number(item.minimum_quantity).toLocaleString('en-US')} ${item.unit}) at ${item.location}. Condition: ${item.condition || 'GOOD'}.`,
      }
    }
  }

  // C. Category search: "Find all fuel items" / "Show medical inventory"
  const catSearch = text.match(/\b(?:find|show|list)\s+(?:all\s+)?(fuel|medical|safety|food|utility|spares|scientific|communications)\s+(?:items|inventory|stock)?\b/i)
  if (catSearch) {
    const cat = catSearch[1].toLowerCase()
    const matches = inventory.filter((i) => i.category.toLowerCase().includes(cat))
    if (matches.length > 0) {
      const capCat = cat.charAt(0).toUpperCase() + cat.slice(1)
      const lines = matches.map((i) => `- ${i.item_name}: ${Number(i.quantity).toLocaleString('en-US')} ${i.unit} at ${i.location}`)
      return {
        handled: true,
        reply: `${capCat} inventory:\n${lines.join('\n')}`,
      }
    }
  }

  // D. Station storage search: "What's stored at Maitri Station?"
  const stationSearch = text.match(/\b(?:what(?:'s|\s+is)?\s+stored\s+at|show\s+inventory\s+at|items\s+at)\s+(maitri|bharati|himadri|schirmacher)(?:\s+station|\s+field\s+camp)?\b/i)
  if (stationSearch) {
    const s = stationSearch[1].toLowerCase()
    let stationName = 'Maitri Station'
    if (s === 'maitri') stationName = 'Maitri Station'
    else if (s === 'bharati') stationName = 'Bharati Station'
    else if (s === 'himadri') stationName = 'Himadri Station'
    else if (s === 'schirmacher') stationName = 'Schirmacher Field Camp'

    const matches = inventory.filter((i) => i.location.toLowerCase().includes(s))
    if (matches.length > 0) {
      const lines = matches.map((i) => `- ${i.item_name}: ${Number(i.quantity).toLocaleString('en-US')} ${i.unit}`)
      return {
        handled: true,
        reply: `Stored at ${stationName}:\n${lines.join('\n')}`,
      }
    } else {
      return {
        handled: true,
        reply: `No inventory items currently registered at ${stationName}.`,
      }
    }
  }

  // =========================================================================
  // 8. DIRECT REAL-TIME INVENTORY QUANTITY QUERIES (Section 1 & 21)
  // =========================================================================
  // Skip direct qty interceptor if this is a multi-attribute or threshold/condition/metadata query
  const isMultiOrComplexAttrQuery =
    /\b(threshold|minimum|min|buffer|reorder|expiry|expire|condition|category|specs|specifications)\b/i.test(normQ) ||
    /\b(aur|and|both|dono|tathaa|sath|along\s+with)\b/i.test(normQ);
  if (isMultiOrComplexAttrQuery) return null;
  const isHinglishQtyQuery =
    /\b(diesel\s+kitna|kitna\s+diesel)\b/i.test(normQ) ||
    /\b(diesel)\s+.*?\b(bacha|kitna|available|pass)\b/i.test(normQ) ||
    /\b(kitne|kitna|kitni)\s+([a-z0-9 -]+?)\s+(?:hai|hain|available|bacha|pade|rakhe)\b/i.test(normQ) ||
    /\b([a-z0-9 -]+?)\s+kitne\s+(?:hai|hain|bacha|bache)\b/i.test(normQ) ||
    /\b([a-z0-9 -]+?)\s+kitna\s+(?:hai|hain|available|bacha)\b/i.test(normQ) ||
    /\b(pass|paas)\s+(?:kitna|kitni|kitne)\s+([a-z0-9 -]+)\b/i.test(normQ) ||
    /\b(diesel\s+kitna\s+hai|diesel\s+kitna\s+available\s+hai|kitna\s+diesel\s+hai|kitna\s+diesel\s+available\s+hai|kitna\s+diesel)\b/i.test(q) ||
    /\b(kitne|kitna|kitni)\s+([a-z0-9 -]+?)\s+(?:hai|hain|available\s+hai|available\s+hain)\b/i.test(q) ||
    /\b([a-z0-9 -]+?)\s+kitne\s+(?:hai|hain)\b/i.test(q) ||
    /\b([a-z0-9 -]+?)\s+kitna\s+(?:hai|hain|available\s+hai|available\s+hain)\b/i.test(q)

  if (isHinglishQtyQuery) {
    // Diesel special case
    if (q.includes('diesel')) {
      const diesel = inventory.find((i) => i.item_name.toLowerCase().includes('diesel'))
      if (diesel) {
        return {
          handled: true,
          reply: `${Number(diesel.quantity).toLocaleString('en-US')} litres available hain.`,
        }
      }
    }

    // Generic item query
    const { item } = findInventoryItem(text, inventory)
    if (item) {
      return {
        handled: true,
        reply: `${Number(item.quantity).toLocaleString('en-US')} ${item.unit} available hain.`,
      }
    }
  }

  const isDirectQtyQuery =
    /\b(current\s+diesel\s+quantity|how\s+much\s+diesel|how\s+much\s+fuel|available\s+diesel|current\s+diesel\s+stock|diesel\s+quantity)\b/i.test(q) ||
    /\bhow\s+many\s+([a-z0-9 -]+?)\s+(?:are\s+)?(?:available|in stock)\b/i.test(q) ||
    /\bcurrent\s+available\s+([a-z0-9 -]+?)\s+quantity\b/i.test(q) ||
    /\bcurrent\s+([a-z0-9 -]+?)\s+quantity\b/i.test(q)

  if (isDirectQtyQuery) {
    // Diesel special case
    if (q.includes('diesel')) {
      const diesel = inventory.find((i) => i.item_name.toLowerCase().includes('diesel'))
      if (diesel) {
        return {
          handled: true,
          reply: `Current available diesel quantity is ${Number(diesel.quantity).toLocaleString('en-US')} ${diesel.unit}.`,
        }
      }
    }

    // Generic item query
    const { item } = findInventoryItem(text, inventory)
    if (item) {
      return {
        handled: true,
        reply: `Current available ${item.item_name.toLowerCase()} quantity is ${Number(item.quantity).toLocaleString('en-US')} ${item.unit}.`,
      }
    }
  }

  return null
}
