/**
 * POLAR AI ASSISTANT — MULTILINGUAL LANGUAGE & LOCALIZATION SERVICE
 * =================================================================
 * Provides complete trilingual intelligence across English, Hindi (Devanagari),
 * and natural Hinglish (Romanized Hindi):
 *
 * 1. Language & Script Detection (Devanagari, Hinglish, English)
 * 2. Devanagari-to-Hinglish semantic normalization for seamless query understanding
 * 3. High-quality natural language formatting across all three languages
 * 4. Rich trilingual knowledge base for Polar Command Center SOPs, flight limits,
 *    station profiles, GIS continuous tile mapping, 3D WebGL globe, and architecture.
 */

// Devanagari Unicode block: \u0900-\u097F
import { POLAR_DOMAIN_KNOWLEDGE } from './projectKnowledge.js'
import { normalizeHinglish } from './inventoryActions.js'

// Devanagari Unicode block: \u0900-\u097F
export const DEVANAGARI_REGEX = /[\u0900-\u097F]/

/**
 * Detects the language/script of the user prompt:
 * - 'hi'       : Pure/mixed Hindi in Devanagari script (e.g. "मैत्री स्टेशन पर कौन है?")
 * - 'hinglish' : Romanized Hindi / colloquial Hinglish (e.g. "maitri station par kaun hai?")
 * - 'en'       : Standard English (e.g. "Who is stationed at Maitri?")
 */
export function detectLanguage(text = '') {
  if (!text) return 'en'
  if (DEVANAGARI_REGEX.test(text)) {
    return 'hi'
  }
  const lower = text.toLowerCase().trim()

  // Strong English interrogative and grammatical markers
  const englishStarters = /^(what|how|who|where|when|which|is|are|can|could|should|would|tell|show|explain|describe|list|give)\b/i
  const strongEnglishPhrases = /\b(what is|what are|how to|how do|is it safe|are there|tell me|show me|which of|in the|of the|for the|with the|to the|at the|from the)\b/i

  if (englishStarters.test(lower) || strongEnglishPhrases.test(lower)) {
    // Only treat as Hinglish if it contains distinct Hindi question words or verbal markers
    if (!/\b(kya|kaun|kahan|kidhar|kab|kitna|kitne|batao|dikhao|karo|hai|hain|hoga|hogi)\b/i.test(lower)) {
      return 'en'
    }
  }

  if (isHinglishText(text)) {
    return 'hinglish'
  }
  return 'en'
}

/**
 * Robust detection of Romanized Hindi / Hinglish tokens
 */
export function isHinglishText(text = '') {
  if (!text) return false
  const lower = text.toLowerCase()
  const patterns = [
    /\b(kaun|kaunsa|kaunsi|kaunse|konsa|konsi|konse|kon\s+sa|kon\s+si|kon\s+se|kya|kyu|kyun|kahan|kidhar|kab|kitna|kitne|kitni|kis|kise|kisko)\b/i,
    /\b(hai|hain|hoon|hoga|hogi|honge|tha|thi)\b/i,
    /(?:\b(?:wo|woh|sab|log)\s+the\b|\bthe\s+kya\b|\bthe\s+wahan\b)/i,
    /\b(sabse|aage|chal\s*raha|raha\s*hai|rahi\s*hai|rahe\s*hain|khatam|jaldi|pehle|pahle|baad|poora|pura|peeche)\b/i,
    /\b(batao|bataiye|dikhao|dikhaye|bolo|karo|kar\s*do|kijiye|dega|denge|chahiye|rakha|bhejo)\b/i,
    /\b(badha|badhao|hata|hatao|kam\s*kar|zyada|par|iske|iski|iska|unka|unki|inme|isme|wahan|yahan|idhar|udhar|ye|wo|woh|bacha|paas|pass|saath)\b/i,
    /\b(ka|ke|ki|ko|se)\s+(?:saath|related|liye|baare|andar|bahar|beech|details?|summary|records?|status|progress|info|information)\b/i,
    /\b(kitne\s+log|sab\s+log|log\s+hain|logon|mausam|saman|cheez|kuch)\b/i,
    /\b(haan|nahi|theek|bilkul|shukriya|dhanyawad|namaste|pranam)\b/i,
  ]
  return patterns.some((p) => p.test(lower))
}

/**
 * Comprehensive mapping of Devanagari terms to normalized phonetic/operational tokens.
 * Ordered strictly from specific compound terms to general words to prevent sub-token collisions.
 */
const DEVANAGARI_DICTIONARY = [
  // 1. Technical & Architecture Topics
  { hi: /कंटीन्यूअस\s*टाइल\s*लेयर|टाइल\s*लेयर|कंटीन्यूअस\s*मैप/gi, en: 'continuous tile layer' },
  { hi: /3डी\s*ग्लोब|3d\s*ग्लोब|वेबजीएल\s*ग्लोब|3डी\s*अर्थ/gi, en: '3d webgl globe' },
  { hi: /तकनीकी\s*संरचना|टेक\s*स्टैक|तकनीक|सॉफ्टवेयर\s*आर्किटेक्चर/gi, en: 'tech stack' },
  { hi: /ऑफ़लाइन\s*सिंक|ऑफलाइन\s*सिंक|ऑफ़लाइन\s*डेटा/gi, en: 'offline sync' },
  { hi: /उड़ान\s*सुरक्षा\s*सीमाएं|उड़ान\s*सीमाएं|उड़ान\s*सीमा|विमान\s*सुरक्षा/gi, en: 'flight safety limits' },
  { hi: /बर्फानी\s*तूफान\s*प्रोटोकॉल|व्हाइटआउट\s*प्रोटोकॉल|बर्फानी\s*तूफान/gi, en: 'blizzard condition 1 protocol' },
  { hi: /क्रेवास\s*बचाव\s*नियम|क्रेवास\s*बचाव|दरार\s*बचाव|हिमदरार/gi, en: 'crevasse rescue protocol' },
  { hi: /शीतदंश\s*उपचार|हाइपोथर्मिया\s*उपचार|शीतदंश/gi, en: 'frostbite hypothermia treatment' },
  { hi: /जनरेटर\s*विफलता|जेनसेट\s*विफलता|बिजली\s*गुल/gi, en: 'generator failure emergency sop' },
  { hi: /अग्नि\s*शमन\s*प्रोटोकॉल|आग\s*लगने\s*पर/gi, en: 'fire suppression protocol' },
  { hi: /ईंधन\s*जमने\s*से|ईंधन\s*जमना|डीजल\s*जमना/gi, en: 'fuel freezing protocol' },
  { hi: /काफिला\s*सुरक्षा\s*नियम|काफिला\s*नियम|ओवरलैंड\s*काफिला/gi, en: 'overland traverse convoy protocol' },
  { hi: /दक्षिण\s*गंगोत्री(\s*डिपो)?/gi, en: 'dakshin gangotri depot' },
  { hi: /अंटार्कटिक\s*संधि|मैड्रिड\s*प्रोटोकॉल/gi, en: 'antarctic treaty' },
  { hi: /एनसीपीओआर|पृथ्वी\s*विज्ञान\s*मंत्रालय/gi, en: 'ncpor moes' },

  // 2. Stations & Strategic Sites
  { hi: /मैत्री(\s*स्टेशन)?/gi, en: 'maitri station' },
  { hi: /भारती(\s*स्टेशन)?/gi, en: 'bharati station' },
  { hi: /हिमाद्रि(\s*स्टेशन)?/gi, en: 'himadri station' },
  { hi: /शिरमाकर(\s*फील्ड\s*कैंप)?|शिर्माकेर/gi, en: 'schirmacher field camp' },
  { hi: /लार्समैन(\s*फील्ड\s*कैंप)?/gi, en: 'larsemann field camp' },
  { hi: /नोवो(\s*रनवे)?/gi, en: 'novo runway' },
  { hi: /बोरियालिस(\s*फील्ड\s*कैंप)?/gi, en: 'borealis field camp' },
  { hi: /ऑरोरा(\s*रिसर्च\s*स्टेशन)?/gi, en: 'aurora research station' },
  { hi: /नॉर्डिक(\s*लॉजिस्टिक्स\s*डिपो)?/gi, en: 'nordic logistics depot' },
  { hi: /सागर\s*निधि/gi, en: 'sagar nidhi' },
  { hi: /पोलर\s*पायनियर/gi, en: 'polar pioneer' },
  { hi: /केप\s*टाउन/gi, en: 'cape town' },
  { hi: /अंटार्कटिका|अंटार्कटिक/gi, en: 'antarctica' },
  { hi: /आर्कटिक/gi, en: 'arctic' },
  { hi: /गोवा/gi, en: 'goa' },

  // 3. Personnel Names (Doctor / Military Prefixes captured)
  { hi: /(?:डॉ(?:\.|\s*)?)?सारा\s*लिंडक्विस्ट/gi, en: 'Dr. Sarah Lindqvist' },
  { hi: /(?:कैप्टन\s*)?एरिक\s*थोर्न/gi, en: 'Capt. Erik Thorne' },
  { hi: /(?:डॉ(?:\.|\s*)?)?राजेश\s*शर्मा/gi, en: 'Dr. Rajesh Sharma' },
  { hi: /(?:डॉ(?:\.|\s*)?)?मीरा\s*अय्यर/gi, en: 'Dr. Meera Iyer' },
  { hi: /(?:हवलदार\s*)?मनप्रीत\s*वर्मा/gi, en: 'Havildar Manpreet Verma' },
  { hi: /(?:कमांडर\s*)?विक्रम\s*सेन/gi, en: 'Commander Vikram Sen' },
  { hi: /(?:डॉ(?:\.|\s*)?)?युकी\s*तानाका/gi, en: 'Dr. Yuki Tanaka' },
  { hi: /(?:डॉ(?:\.|\s*)?)?अलेक्जेंडर\s*नोवाक/gi, en: 'Dr. Alexander Novak' },
  { hi: /(?:डॉ(?:\.|\s*)?)?एलेना\s*रोस्तोवा/gi, en: 'Dr. Elena Rostova' },
  { hi: /(?:डॉ(?:\.|\s*)?)?चेन\s*वेई/gi, en: 'Dr. Chen Wei' },
  { hi: /(?:डॉ(?:\.|\s*)?)?अन्वेषा\s*घोष/gi, en: 'Dr. Anwesha Ghosh' },
  { hi: /(?:डॉ(?:\.|\s*)?)?संजय\s*रावत/gi, en: 'Dr. Sanjay Rawat' },
  { hi: /(?:सार्जेंट\s*)?अमित\s*पटेल/gi, en: 'Sgt. Amit Patel' },
  { hi: /(?:डॉ(?:\.|\s*)?)?प्रिया\s*जोशी/gi, en: 'Dr. Priya Joshi' },
  { hi: /(?:डॉ(?:\.|\s*)?)?रोहन\s*कामत/gi, en: 'Dr. Rohan Kamat' },
  { hi: /अर्जुन\s*शर्मा/gi, en: 'Arjun Sharma' },

  // 4. Operational Concepts & Attributes
  { hi: /के\s*बारे\s*में/gi, en: 'ke baare mein' },
  { hi: /सबसे\s*आगे|पूर्णता\s*के\s*करीब|जल्दी\s*खत्म/gi, en: 'sabse aage' },
  { hi: /कम\s*स्टॉक|कमी\s*है/gi, en: 'low stock' },
  { hi: /स्टॉक|भंडार/gi, en: 'stock' },
  { hi: /सामान|खेप/gi, en: 'saman' },
  { hi: /कार्गो|कंसाइनमेंट/gi, en: 'cargo' },
  { hi: /मिशन|अभियान/gi, en: 'mission' },
  { hi: /तैनात|मौजूद|स्थित/gi, en: 'stationed' },
  { hi: /रक्त\s*समूह|ब्लड\s*ग्रुप/gi, en: 'blood group' },
  { hi: /सैटफोन|फोन\s*नंबर|मोबाइल/gi, en: 'satphone' },
  { hi: /वजन|भार/gi, en: 'weight' },
  { hi: /स्थिति|हालत|दर्जा/gi, en: 'status' },
  { hi: /देरी|विलंबित|लेट/gi, en: 'delayed' },
  { hi: /आपातकालीन\s*स्थिति|आपातकाल|दुर्घटना|संकट/gi, en: 'emergency' },
  { hi: /घटना/gi, en: 'incident' },
  { hi: /अलर्ट|चेतावनी/gi, en: 'alert' },
  { hi: /मौसम|वातावरण/gi, en: 'weather' },
  { hi: /तापमान/gi, en: 'temperature' },
  { hi: /हवा|पवन|वायु/gi, en: 'wind' },
  { hi: /नक्शा|मानचित्र/gi, en: 'map' },
  { hi: /ग्लोब/gi, en: 'globe' },
  { hi: /डीजल/gi, en: 'diesel' },
  { hi: /ईंधन|फ्यूल/gi, en: 'fuel' },
  { hi: /पानी|जल/gi, en: 'water' },
  { hi: /ऑक्सीजन/gi, en: 'oxygen' },
  { hi: /दवाइयां|दवा/gi, en: 'medicine' },
  { hi: /तंबू|टेंट/gi, en: 'tents' },
  { hi: /राशन|भोजन|खाना/gi, en: 'rations' },
  { hi: /जनरेटर|जेनसेट/gi, en: 'generator' },

  // 5. Interrogatives & Pronouns
  { hi: /कौन\s+है/gi, en: 'kaun hai' },
  { hi: /कौन\s*(सा|सी|से)?/gi, en: 'kaun sa' },
  { hi: /किसका|किसकी|किसके|किसने|कौन/gi, en: 'kaun' },
  { hi: /कहाँ|किधर|किस\s*स्थान|किस\s*जगह/gi, en: 'kahan' },
  { hi: /कितना|कितने|कितनी/gi, en: 'kitna' },
  { hi: /कैसा|कैसी|कैसे/gi, en: 'kaisa' },
  { hi: /क्या/gi, en: 'kya' },
  { hi: /कब/gi, en: 'kab' },
  { hi: /क्यों|किसलिए/gi, en: 'kyun' },
  { hi: /कोई/gi, en: 'koi' },
  { hi: /कुछ/gi, en: 'kuch' },
  { hi: /इसमें/gi, en: 'isme' },
  { hi: /इसका/gi, en: 'iska' },
  { hi: /इसके/gi, en: 'iske' },
  { hi: /इसकी/gi, en: 'iski' },
  { hi: /वहाँ|वहां/gi, en: 'wahan' },
  { hi: /यहाँ|यहां/gi, en: 'yahan' },
  { hi: /कम/gi, en: 'kam' },
  { hi: /लीडर|प्रमुख|कमांडर/gi, en: 'leader' },
  { hi: /प्रगति|प्रोग्रेस/gi, en: 'progress' },
  { hi: /तारीख|दिनांक|डेट/gi, en: 'date' },
  { hi: /समाप्त|खत्म|पूर्ण/gi, en: 'khatam' },
  { hi: /दल|टीम|सदस्य|लोग|कार्मिक|वैज्ञानिक/gi, en: 'log' },
  { hi: /बताओ|बताइए|दिखाओ|दिखाइए|दीजिए/gi, en: 'batao' },
  { hi: /करें|करो|कीजिए/gi, en: 'karein' },
  { hi: /रोकें|रोके/gi, en: 'rokein' },
  { hi: /हैं|है/gi, en: 'hai' },
  { hi: /था|थी|थे/gi, en: 'tha' },
  { hi: /होगा|होगी|होंगे/gi, en: 'hoga' },
  { hi: /पर/gi, en: 'par' },
  { hi: /में/gi, en: 'mein' },
  { hi: /का|के|की/gi, en: 'ka' },
  { hi: /को/gi, en: 'ko' },
  { hi: /से/gi, en: 'se' },
  { hi: /और/gi, en: 'aur' },
  { hi: /या/gi, en: 'ya' },
  { hi: /हाँ|हां/gi, en: 'haan' },
  { hi: /नहीं|नही/gi, en: 'nahi' },
]

/**
 * Converts a Devanagari Hindi text to normalized Hinglish tokens
 * so the underlying reasoning engine processes it natively.
 */
export function devanagariToHinglish(text = '') {
  if (!text) return ''
  let result = text
  for (const item of DEVANAGARI_DICTIONARY) {
    result = result.replace(item.hi, ` ${item.en} `)
  }
  return result.replace(/\s+/g, ' ').trim()
}

/**
 * High-precision domain knowledge dispatcher.
 * Matches architecture, SOPs, aviation limits, treaties, and base profiles across all three languages.
 */
export function matchDomainKnowledge(rawQuery = '', lang = 'en') {
  if (!rawQuery) return null
  const q = rawQuery.toLowerCase().trim()
  const norm = devanagariToHinglish(rawQuery).toLowerCase()
  const combined = `${q} ${norm}`
  const l = lang === 'hi' || lang === 'hinglish' ? lang : 'en'

  // Helper: ensure we do not hijack operational questions about stations (roster, weather, inventory, live flight safety)
  const isStationOpsQuery =
    combined.includes('kaun') ||
    combined.includes('who') ||
    combined.includes('weather') ||
    combined.includes('mausam') ||
    combined.includes('saman') ||
    combined.includes('stock') ||
    combined.includes('inventory') ||
    combined.includes('cargo') ||
    combined.includes('incident') ||
    combined.includes('emergency') ||
    combined.includes('alert') ||
    combined.includes('log') ||
    combined.includes('personnel') ||
    combined.includes('fly') ||
    combined.includes('flying') ||
    combined.includes('flight') ||
    combined.includes('udana') ||
    combined.includes('safe to fly')

  const hasStationMention =
    combined.includes('maitri') ||
    combined.includes('bharati') ||
    combined.includes('himadri') ||
    combined.includes('novo') ||
    combined.includes('larsemann') ||
    combined.includes('schirmacher') ||
    combined.includes('gangotri')

  // 1. ContinuousTileLayer / 360 Map
  if (
    combined.includes('continuoustilelayer') ||
    combined.includes('continuous tile') ||
    combined.includes('tile layer') ||
    combined.includes('360 map') ||
    combined.includes('360 degree') ||
    combined.includes('continuous scroll') ||
    combined.includes('infinite scroll') ||
    combined.includes('blue void') ||
    combined.includes('dual-axis') ||
    combined.includes('dual axis') ||
    combined.includes('d-pad') ||
    combined.includes('pan controls') ||
    combined.includes('कंटीन्यूअस') ||
    combined.includes('360°')
  ) {
    return POLAR_DOMAIN_KNOWLEDGE.continuousTileLayer[l] || POLAR_DOMAIN_KNOWLEDGE.continuousTileLayer.en
  }

  // 2. 3D WebGL Globe
  if (
    combined.includes('globeview') ||
    combined.includes('3d globe') ||
    combined.includes('webgl globe') ||
    combined.includes('three.js globe') ||
    combined.includes('threejs globe') ||
    combined.includes('3d sphere') ||
    combined.includes('3d earth') ||
    combined.includes('spherical geometry') ||
    combined.includes('globe view') ||
    combined.includes('ग्लोब')
  ) {
    return POLAR_DOMAIN_KNOWLEDGE.globeView[l] || POLAR_DOMAIN_KNOWLEDGE.globeView.en
  }

  // 3. Tech Stack & Architecture
  if (
    combined.includes('tech stack') ||
    combined.includes('technology stack') ||
    combined.includes('technologies used') ||
    combined.includes('architecture') ||
    combined.includes('frontend backend') ||
    combined.includes('built with') ||
    combined.includes('तकनीकी संरचना') ||
    combined.includes('टेक स्टैक') ||
    (combined.includes('tech') && (combined.includes('stack') || combined.includes('architecture') || combined.includes('technologies')))
  ) {
    return POLAR_DOMAIN_KNOWLEDGE.techStack[l] || POLAR_DOMAIN_KNOWLEDGE.techStack.en
  }

  // 4. Offline Sync & Resiliency
  if (
    combined.includes('offline sync') ||
    combined.includes('offline storage') ||
    combined.includes('offline mode') ||
    combined.includes('offline resiliency') ||
    combined.includes('safestorage') ||
    combined.includes('emergency storage') ||
    combined.includes('offline queue') ||
    combined.includes('satellite link down') ||
    combined.includes('ऑफ़लाइन सिंक') ||
    combined.includes('ऑफलाइन सिंक')
  ) {
    return POLAR_DOMAIN_KNOWLEDGE.offlineSync[l] || POLAR_DOMAIN_KNOWLEDGE.offlineSync.en
  }

  // 5. Flight Limits & Aviation Safety (Static Envelopes when not querying live station weather)
  if (
    !hasStationMention &&
    (combined.includes('flight limit') ||
      combined.includes('flight safety') ||
      combined.includes('aviation limit') ||
      combined.includes('twin otter limit') ||
      combined.includes('twin otter flight') ||
      combined.includes('flying limit') ||
      combined.includes('flying weather') ||
      combined.includes('vfr minimum') ||
      combined.includes('vfr limit') ||
      combined.includes('ifr limit') ||
      combined.includes('helicopter limit') ||
      combined.includes('aircraft limit') ||
      combined.includes('flat light') ||
      combined.includes('comnap') ||
      combined.includes('उड़ान सीमा') ||
      combined.includes('विमान सुरक्षा') ||
      combined.includes('उड़ान सुरक्षा'))
  ) {
    return POLAR_DOMAIN_KNOWLEDGE.flightLimits[l] || POLAR_DOMAIN_KNOWLEDGE.flightLimits.en
  }

  // 6. Blizzard / Whiteout Condition 1 SOP
  if (
    combined.includes('blizzard') ||
    combined.includes('whiteout') ||
    combined.includes('condition 1') ||
    combined.includes('sop-blz-01') ||
    combined.includes('storm protocol') ||
    combined.includes('barfani tufan') ||
    combined.includes('barfani toofan') ||
    combined.includes('तूफान प्रोटोकॉल') ||
    combined.includes('बर्फानी तूफान') ||
    combined.includes('व्हाइटआउट')
  ) {
    return POLAR_DOMAIN_KNOWLEDGE.blizzardSOP[l] || POLAR_DOMAIN_KNOWLEDGE.blizzardSOP.en
  }

  // 7. Crevasse Fall & Technical Rescue SOP
  if (
    combined.includes('crevasse') ||
    combined.includes('sop-crv-02') ||
    combined.includes('z-rig') ||
    combined.includes('snow picket') ||
    combined.includes('darar') ||
    combined.includes('fallen into crevasse') ||
    combined.includes('fell in crevasse') ||
    combined.includes('दरार में गिरना') ||
    combined.includes('हिमदरार') ||
    combined.includes('क्रेवास')
  ) {
    return POLAR_DOMAIN_KNOWLEDGE.crevasseSOP[l] || POLAR_DOMAIN_KNOWLEDGE.crevasseSOP.en
  }

  // 8. Severe Frostbite & Hypothermia Stages
  if (
    combined.includes('frostbite') ||
    combined.includes('hypothermia') ||
    combined.includes('sop-med-03') ||
    combined.includes('cold injury') ||
    combined.includes('rewarming') ||
    combined.includes('frost bite') ||
    combined.includes('शीतदंश') ||
    combined.includes('हाइपोथर्मिया')
  ) {
    return POLAR_DOMAIN_KNOWLEDGE.frostbiteSOP[l] || POLAR_DOMAIN_KNOWLEDGE.frostbiteSOP.en
  }

  // 9. Station Generator Failure SOP
  if (
    combined.includes('generator failure') ||
    combined.includes('generator sop') ||
    combined.includes('genset failure') ||
    combined.includes('power outage') ||
    combined.includes('blackout') ||
    combined.includes('power failure') ||
    combined.includes('sop-pwr-04') ||
    combined.includes('sop-eng-04') ||
    combined.includes('secondary genset') ||
    combined.includes('load shedding') ||
    combined.includes('जनरेटर विफलता') ||
    combined.includes('बिजली गुल') ||
    ((combined.includes('generator') || combined.includes('generators') || combined.includes('genset')) &&
      (combined.includes('fail') || combined.includes('fails') || combined.includes('failure') || combined.includes('outage') || combined.includes('blackout') || combined.includes('emergency') || combined.includes('sop') || combined.includes('protocol') || combined.includes('problem')))
  ) {
    return POLAR_DOMAIN_KNOWLEDGE.generatorSOP[l] || POLAR_DOMAIN_KNOWLEDGE.generatorSOP.en
  }

  // 10. Habitat Fire Suppression SOP
  if (
    (combined.includes('fire') && (combined.includes('sop') || combined.includes('suppression') || combined.includes('protocol') || combined.includes('extinguisher') || combined.includes('habitat') || combined.includes('aag'))) ||
    combined.includes('sop-fir-05') ||
    combined.includes('inergen') ||
    combined.includes('aag lagne') ||
    combined.includes('अग्नि शमन') ||
    combined.includes('आग लगना')
  ) {
    return POLAR_DOMAIN_KNOWLEDGE.fireSOP[l] || POLAR_DOMAIN_KNOWLEDGE.fireSOP.en
  }

  // 11. Fuel Freezing & Paraffin Management SOP
  if (
    (combined.includes('fuel') && (combined.includes('freeze') || combined.includes('freezing') || combined.includes('paraffin') || combined.includes('contamination') || combined.includes('sop') || combined.includes('wax') || combined.includes('jamna') || combined.includes('jamne') || combined.includes('filter'))) ||
    (combined.includes('diesel') && (combined.includes('freeze') || combined.includes('freezing') || combined.includes('jamna') || combined.includes('wax') || combined.includes('jamne'))) ||
    combined.includes('sop-ful-06') ||
    combined.includes('polar diesel') ||
    combined.includes('ईंधन जमना') ||
    combined.includes('डीजल जमना')
  ) {
    return POLAR_DOMAIN_KNOWLEDGE.fuelSOP[l] || POLAR_DOMAIN_KNOWLEDGE.fuelSOP.en
  }

  // 12. Overland Traverse Safety Protocol
  if (
    combined.includes('traverse sop') ||
    combined.includes('overland traverse') ||
    combined.includes('convoy rule') ||
    combined.includes('pistenbully convoy') ||
    combined.includes('gpr radar') ||
    combined.includes('sop-trv-07') ||
    combined.includes('काफिला सुरक्षा') ||
    combined.includes('ओवरलैंड काफिला')
  ) {
    return POLAR_DOMAIN_KNOWLEDGE.traverseSOP[l] || POLAR_DOMAIN_KNOWLEDGE.traverseSOP.en
  }

  // 13. Historical Station Profiles (when not querying live telemetry/personnel)
  if (!isStationOpsQuery) {
    // Maitri
    if (
      (combined.includes('maitri') && (combined.includes('about') || combined.includes('history') || combined.includes('profile') || combined.includes('kya hai') || combined.includes('overview') || combined.includes('information') || combined.includes('details') || combined.includes('baare mein') || combined.includes('विवरण') || combined.includes('इतिहास') || combined.includes('specs'))) ||
      combined.includes('lake priyadarshini')
    ) {
      return POLAR_DOMAIN_KNOWLEDGE.maitriStation[l] || POLAR_DOMAIN_KNOWLEDGE.maitriStation.en
    }

    // Bharati
    if (
      (combined.includes('bharati') && (combined.includes('about') || combined.includes('history') || combined.includes('profile') || combined.includes('kya hai') || combined.includes('overview') || combined.includes('information') || combined.includes('details') || combined.includes('baare mein') || combined.includes('विवरण') || combined.includes('इतिहास') || combined.includes('specs'))) ||
      combined.includes('isro ground station')
    ) {
      return POLAR_DOMAIN_KNOWLEDGE.bharatiStation[l] || POLAR_DOMAIN_KNOWLEDGE.bharatiStation.en
    }

    // Himadri
    if (
      combined.includes('himadri') && (combined.includes('about') || combined.includes('history') || combined.includes('profile') || combined.includes('kya hai') || combined.includes('overview') || combined.includes('information') || combined.includes('details') || combined.includes('baare mein') || combined.includes('विवरण') || combined.includes('इतिहास') || combined.includes('specs'))
    ) {
      return POLAR_DOMAIN_KNOWLEDGE.himadriStation[l] || POLAR_DOMAIN_KNOWLEDGE.himadriStation.en
    }
  }

  // 14. Dakshin Gangotri
  if (
    combined.includes('dakshin gangotri') ||
    combined.includes('gangotri depot') ||
    combined.includes('first indian station') ||
    combined.includes('1st indian station') ||
    combined.includes('historic station') ||
    combined.includes('buried station') ||
    combined.includes('दक्षिण गंगोत्री')
  ) {
    return POLAR_DOMAIN_KNOWLEDGE.dakshinGangotri[l] || POLAR_DOMAIN_KNOWLEDGE.dakshinGangotri.en
  }

  // 15. IndARC Observatory
  if (
    combined.includes('indarc') ||
    combined.includes('ind-arc') ||
    combined.includes('underwater observatory') ||
    combined.includes('moored observatory') ||
    combined.includes('इंड-आर्क') ||
    combined.includes('इंडआर्क')
  ) {
    return POLAR_DOMAIN_KNOWLEDGE.indarc[l] || POLAR_DOMAIN_KNOWLEDGE.indarc.en
  }

  // 16. Antarctic Treaty System
  if (
    combined.includes('antarctic treaty') ||
    combined.includes('madrid protocol') ||
    combined.includes('treaty system') ||
    combined.includes('ats') ||
    combined.includes('अंटार्कटिक संधि') ||
    combined.includes('मैड्रिड प्रोटोकॉल')
  ) {
    return POLAR_DOMAIN_KNOWLEDGE.antarcticTreaty[l] || POLAR_DOMAIN_KNOWLEDGE.antarcticTreaty.en
  }

  // 17. NCPOR & MoES
  if (
    combined.includes('ncpor') ||
    combined.includes('moes') ||
    combined.includes('national centre for polar') ||
    combined.includes('ministry of earth sciences') ||
    combined.includes('एनसीपीओआर') ||
    combined.includes('पृथ्वी विज्ञान मंत्रालय')
  ) {
    return POLAR_DOMAIN_KNOWLEDGE.ncpor[l] || POLAR_DOMAIN_KNOWLEDGE.ncpor.en
  }

  return null
}

/**
 * Translates common English/Hinglish status strings to Hindi
 */
const HINDI_TERM_TRANSLATIONS = [
  { en: /\bACTIVE\b/g, hi: 'सक्रिय (ACTIVE)' },
  { en: /\bIN_TRANSIT\b/g, hi: 'पारगमन में (IN TRANSIT)' },
  { en: /\bRESTING\b/g, hi: 'विश्राम (RESTING)' },
  { en: /\bOFF_DUTY\b/g, hi: 'ड्यूटी पर नहीं (OFF DUTY)' },
  { en: /\bEMERGENCY\b/g, hi: 'आपातकाल (EMERGENCY)' },
  { en: /\bCRITICAL\b/g, hi: 'अति गंभीर (CRITICAL)' },
  { en: /\bHIGH\b/g, hi: 'उच्च (HIGH)' },
  { en: /\bMEDIUM\b/g, hi: 'मध्यम (MEDIUM)' },
  { en: /\bLOW\b/g, hi: 'सामान्य (LOW)' },
  { en: /\bDELAYED\b/g, hi: 'विलंबित (DELAYED)' },
  { en: /\bARRIVED\b/g, hi: 'पहुंच चुका (ARRIVED)' },
  { en: /\bPLANNED\b/g, hi: 'नियोजित (PLANNED)' },
  { en: /\bCOMPLETED\b/g, hi: 'पूर्ण (COMPLETED)' },
  { en: /\bPLANNING\b/g, hi: 'योजना में (PLANNING)' },
  { en: /\bRESPONDING\b/g, hi: 'कार्रवाई जारी (RESPONDING)' },
  { en: /\bRESOLVED\b/g, hi: 'हल किया गया (RESOLVED)' },
  { en: /\bMaitri Station\b/g, hi: 'मैत्री स्टेशन (Maitri Station)' },
  { en: /\bBharati Station\b/g, hi: 'भारती स्टेशन (Bharati Station)' },
  { en: /\bHimadri Station\b/g, hi: 'हिमाद्रि स्टेशन (Himadri Station)' },
  { en: /\bDakshin Gangotri Depot\b/g, hi: 'दक्षिण गंगोत्री डिपो (Dakshin Gangotri)' },
  { en: /\bSchirmacher Field Camp\b/g, hi: 'शिरमाकर फील्ड कैंप (Schirmacher Camp)' },
  { en: /\bLarsemann Field Camp\b/g, hi: 'लार्समैन फील्ड कैंप (Larsemann Camp)' },
  { en: /\bNovo Runway\b/g, hi: 'नोवो रनवे (Novo Runway)' },
  { en: /\bORV Sagar Nidhi\b/g, hi: 'ओआरवी सागर निधि (ORV Sagar Nidhi)' },
  { en: /\bMV Polar Pioneer\b/g, hi: 'एमवी पोलर पायनियर (MV Polar Pioneer)' },
]

/**
 * Translates status labels and entity references in responses to Hindi Devanagari
 */
export function formatHindiEntities(text = '') {
  if (!text) return ''
  let result = text
  for (const item of HINDI_TERM_TRANSLATIONS) {
    result = result.replace(item.en, (match, offset, str) => {
      const before = str.slice(Math.max(0, offset - 20), offset)
      if (/[\u0900-\u097F]+\s*\(?$/.test(before)) return match
      return item.hi
    })
  }
  return result
}

/**
 * Matches casual greetings, polite conversation, and capability inquiries
 */
export function matchGreetingOrHelp(rawQuery, data = {}, lang = 'en') {
  const q = String(rawQuery || '').trim()
  const lower = q.toLowerCase().replace(/[?!.,]/g, '')

  // 1. Casual Greetings: "hi", "hello", "hey", "namaste", "pranam", "kya haal hai", etc.
  const isGreeting =
    /^(hi|hello|hey|hiya|greetings|howdy|namaste|pranam|namaskar|ram\s*ram|salaam|kem\s*cho|kya\s*haal\s*hai|kaise\s*ho|how\s*are\s*you|good\s*(?:morning|afternoon|evening|day))$/i.test(
      lower
    ) ||
    /^(hi|hello|hey)\s+(?:polar|ai|assistant|copilot|sir|team|there|aurora|commander|operator)$/i.test(lower) ||
    /^(नमस्ते|प्रणाम|नमस्कार|राम\s*राम|सुप्रभात|कैसे\s*हो|क्या\s*हाल\s*है)$/u.test(q)

  if (isGreeting) {
    if (lang === 'hi') {
      return (
        `नमस्ते ऑपरेटर! 🌟 मैं **पोलर मिशन इंटेलिजेंस असिस्टेंट (POLAR AI)** हूँ — एनसीपीओआर ध्रुवीय अभियानों के लिए आपका स्वायत्त मिशन कॉपायलट।\n\n` +
        `मैं आपकी इन प्रमुख परिचालन क्षेत्रों में सहायता कर सकता हूँ:\n` +
        `• **सक्रिय अभियान**: वर्तमान में संचालित फील्ड मिशन, उनकी प्रगति, टीम और प्रमुख (\`सक्रिय अभियान दिखाओ\`)।\n` +
        `• **कार्मिक और जीपीएस**: ऑन-ड्यूटी वैज्ञानिक, स्टेशन तैनाती और उपग्रह संपर्क (\`मैत्री स्टेशन पर कौन है?\`)।\n` +
        `• **अनुसंधान केंद्र और मौसम**: मैत्री, भारती, हिमाद्रि के लाइव मौसम और उड़ान सुरक्षा सीमाएं (\`उड़ान सुरक्षा सीमाएं\`)।\n` +
        `• **लॉजिस्टिक्स और रसद**: कम स्टॉक आपूर्ति, कार्गो खेप और ईंधन स्तर (\`कम स्टॉक सामान कौन सा है?\`)।\n` +
        `• **आपातकालीन एसओपी**: बर्फानी तूफ़ान, हिमदरार बचाव और जनरेटर विफलता प्रक्रियाएं।\n\n` +
        `कमांड सेंटर के किस परिचालन डेटा में आपकी सहायता करूँ?`
      )
    }
    if (lang === 'hinglish') {
      return (
        `Namaste Operator! 🌟 Main **POLAR Mission Intelligence Assistant** hoon — NCPOR polar command aur expeditions ka autonomous copilot.\n\n` +
        `Main aapko in sabhi operational areas mein real-time data provide kar sakta hoon:\n` +
        `• **Active Expeditions**: Kaunse missions chal rahe hain, unka progress %, aur leaders (\`expeditions batao\` ya \`konsa mission sabse aage hai?\`)।\n` +
        `• **Personnel & Telemetry**: Field staff ka duty status, GPS coordinates, aur satphone contacts (\`Maitri par kaun hai?\`)।\n` +
        `• **Stations & Weather**: Maitri, Bharati, Himadri ke live telemetry aur flight safety windows (\`flight safety limits\`)\n` +
        `• **Cargo & Inventory**: Critical low-stock supplies aur delayed cargo shipments (\`low stock items dikhao\`)\n` +
        `• **Emergency Protocols**: Blizzard Condition 1, crevasse rescue, frostbite, aur generator failure SOPs.\n\n` +
        `Aap command console ke baare mein kya janna chahte hain?`
      )
    }
    return (
      `Greetings, Operator! 🌟 I am the **POLAR Mission Intelligence Assistant**, your autonomous copilot for NCPOR Arctic and Antarctic command operations.\n\n` +
      `I provide instant, grounded operational intelligence across:\n` +
      `• **Active Expeditions & Missions**: Field progress, team sizes, leaders, and objectives (\`Show active expeditions\`).\n` +
      `• **Personnel & GPS Telemetry**: Duty status, coordinates, satphone comms, and medical profiles (\`Who is at Maitri?\`).\n` +
      `• **Stations & Environmental Conditions**: Live telemetry, wind thresholds, and weather safety windows (\`Flight safety limits\`).\n` +
      `• **Supply Chain & Inventory**: Buffer health, critical stock alerts, and consignment tracking (\`Summarize operational status\`).\n` +
      `• **Emergency SOP Protocols**: Whiteout Condition 1, crevasse extraction, frostbite, and fire suppression.\n\n` +
      `How may I assist command operations today?`
    )
  }

  // 2. Capabilities / Identity / Help
  const isHelpOrIdentity =
    /^(who\s+are\s+you|what\s+are\s+you|what\s+can\s+you\s+do|help|capabilities|what\s+is\s+this|how\s+to\s+use|features|tum\s+kaun\s+ho|aap\s+kaun\s+ho|kya\s+kar\s+sakte\s+ho|madad|kya\s+hai\s+ye|kya\s+kaam\s+hai)$/i.test(
      lower
    ) ||
    /^(तुम\s*कौन\s*हो|आप\s*कौन\s*हैं|क्या\s*कर\s*सकते\s*हो|मदद|सहायता)$/u.test(q)

  if (isHelpOrIdentity) {
    if (lang === 'hi') {
      return (
        `**पोलर मिशन इंटेलिजेंस कॉपायलट (POLAR AI Assistant)**\n\n` +
        `यह सिस्टम एनसीपीओआर और पोलर कमांड सेंटर के 8 कोर मॉड्यूल्स का वास्तविक समय में विश्लेषण करता है:\n` +
        `1. **अभियान प्रबंधन (Expeditions)**: मिशन प्रगति, गंतव्य, दल आकार और नेतृत्व।\n` +
        `2. **कार्मिक ट्रैकिंग (Personnel & GPS)**: 16 वैज्ञानिकों/ऑपरेटर्स के जीपीएस ट्रांसपोंडर, ड्यूटी स्थिति और रक्त समूह।\n` +
        `3. **अनुसंधान केंद्र (Stations)**: मैत्री (अंटार्कटिका), भारती (लार्समैन हिल्स), हिमाद्रि (आर्कटिक) और डिपो।\n` +
        `4. **मौसम एवं विमान सुरक्षा (Weather & Aviation)**: वास्तविक समय पवन गति, विजिबिलिटी और ट्विन ओटर/हेलीकॉप्टर उड़ान सीमाएं।\n` +
        `5. **इन्वेंटरी एवं रसद (Inventory)**: बफर स्टॉक, न्यूनतम थ्रेशोल्ड और कम स्टॉक चेतावनी।\n` +
        `6. **कार्गो पाइपलाइन (Cargo)**: इन-ट्रांजिट और विलंबित खेप की स्थिति।\n` +
        `7. **आपातकालीन एसओपी (Emergency SOPs)**: ब्लिजार्ड, हिमदरार, शीतदंश और आग से निपटने के प्रमाणित प्रोटोकॉल।\n` +
        `8. **जीआईएस एवं 360° सतत मानचित्र (Continuous Mapping)**: असीमित नेविगेशन और 3D ग्लोब दृश्य।`
      )
    }
    if (lang === 'hinglish') {
      return (
        `**POLAR Mission Intelligence Copilot (POLAR AI Assistant)**\n\n` +
        `Ye system POLAR Command Center ke 8 modules ko real-time analyze karta hai:\n` +
        `1. **Expeditions**: Active missions, progress percentage, aur team leaders (\`expeditions batao\`).\n` +
        `2. **Personnel**: Deployed staff, GPS coordinates, duty status, aur satphone contacts (\`logon ki list dikhao\`).\n` +
        `3. **Stations**: Maitri, Bharati, Himadri, Dakshin Gangotri ke profile aur capacity.\n` +
        `4. **Weather & Flight Ops**: Live conditions, wind chill, aur Twin Otter flight safety windows (\`flight safety limits\`).\n` +
        `5. **Inventory**: Stock counts, low-stock warnings, aur buffer days (\`low stock items\`).\n` +
        `6. **Cargo Logistics**: In-transit consignments, weight, aur delayed shipments (\`kya koi cargo late hai?\`).\n` +
        `7. **Emergency SOPs**: Blizzard Whiteout Condition 1, crevasse rescue, frostbite treatment, aur generator loss protocols.\n` +
        `8. **Continuous 360° Map**: Omnidirectional tile wrapping aur 3D WebGL globe navigation.`
      )
    }
    return (
      `**POLAR Mission Intelligence Copilot (POLAR AI Assistant)**\n\n` +
      `Built as the autonomous operations intelligence engine for the Polar Command Center, synthesizing live data across all 8 modules:\n` +
      `1. **Expeditions & Science Programs**: Live telemetry, progress tracking, leader profiles, and team rosters.\n` +
      `2. **Personnel & Telemetry**: Operative transponders, duty readiness, blood groups, and satphone channels.\n` +
      `3. **Strategic Stations**: Geodetic baselines, personnel capacity, and facility operational states.\n` +
      `4. **Aviation & Weather**: Live NWP meteorological observations, wind-chill calculation, and Twin Otter/Rotary VFR envelopes.\n` +
      `5. **Inventory & Consumables**: Supply buffer forecasting, threshold enforcement, and automated replenishment alerts.\n` +
      `6. **Cargo Pipeline**: Strategic air/sea resupply routes, consignment weights, and delay triage.\n` +
      `7. **Emergency SOPs**: Standard Operating Procedures for Blizzard Condition 1, crevasse fall, hypothermia, and generator failure.\n` +
      `8. **Cartography**: ContinuousTileLayer 360° seamless planar wrapping and 3D WebGL globe visualization.`
    )
  }

  // 3. Thanks & Gratitude
  const isThanks =
    /^(thanks|thank\s*you|many\s*thanks|thx|shukriya|dhanyawad|dhanyavaad|bahut\s*shukriya)$/i.test(lower) ||
    /^(धन्यवाद|शुक्रिया|थैंक\s*यू)$/u.test(q)
  if (isThanks) {
    if (lang === 'hi') return 'स्वागत है ऑपरेटर! ध्रुवीय कमांड सेंटर टेलीमेट्री पर सक्रिय निगरानी बनाए हुए है। किसी अन्य जानकारी के लिए बताएं।'
    if (lang === 'hinglish') return "You're welcome, Operator! Polar Command Center telemetry par active monitoring jari hai. Kisi aur data ke liye batayein."
    return "You're welcome, Operator! Standing by for further mission directives. Systems nominal."
  }

  return null
}

/**
 * Matches general system list queries (Expeditions, Personnel, Stations, Cargo, Emergencies)
 * with robust tolerance for typos ("kosne", "chal rhe"), colloquial phrasing, and multilingual syntax.
 */
export function matchSystemListQuery(rawQuery, data = {}, session = {}, lang = 'en') {
  const q = String(rawQuery || '').trim()
  const lower = q.toLowerCase().replace(/[?!.,]/g, '')
  const norm = normalizeHinglish(lower)

  const expeditions = data.expeditions || []
  const personnel = data.personnel || []
  const cargo = data.cargo || []
  const inventory = data.inventory || []
  const locations = data.locations || []
  const emergencies = data.emergencies || []

  // Guard: Do not intercept superlative ranking or specific attribute questions
  const isSuperlativeRanking =
    /\b(closest\s+to\s+completion|sabse\s+aage|highest\s+progress|lowest\s+progress|most\s+personnel|sabse\s+bada|sabse\s+chota|fastest|slowest|highest\s+risk|sabse\s+zyada\s+risk|attention)\b/i.test(
      norm
    )
  if (isSuperlativeRanking) return null

  const isSpecificIdOrAttribute =
    /\b(EXP-\d{3}|P-\d{2,3}|C-\d{3}|CRG-\d{3}|I-\d{3,4}|INC-\d{3}|blood|satphone|weight|fuel|litres|liter|threshold)\b/i.test(
      rawQuery
    )
  if (isSpecificIdOrAttribute) return null

  // 1. EXPEDITIONS / MISSIONS LIST
  // Matches "expeditions batao kosne chal rhe hai abhi", "kaunse mission chal rahe hain", "active expeditions", etc.
  const isExpeditionListQuery =
    (
      /\b(expeditions?|missions?|abhiyan)\b/i.test(norm) ||
      /(अभियान|मिशन)/u.test(q)
    ) &&
    (
      /\b(batao|bataiye|dikhao|dikhaye|list|show|all|kaun|kaunse|kaunsa|kaunsi|konsa|konse|konsi|kosne|chal\s*rh|chal\s*rah|active|running|ongoing|current|abhi|status|kya\s*hai|kya\s*chal)\b/i.test(
        norm
      ) ||
      /\b(active|running|ongoing|current)\s+(?:expeditions?|missions?)\b/i.test(lower) ||
      /\b(?:expeditions?|missions?)\s+(?:list|status|batao|dikhao)\b/i.test(lower) ||
      /\b(?:kosne|konse|kaunse|konsa|kaunsa|which)\s+(?:expeditions?|missions?)\b/i.test(norm) ||
      lower.includes('show active expeditions')
    )

  if (isExpeditionListQuery) {
    const active = expeditions.filter((e) => e.status === 'ACTIVE' || e.status === 'IN_PROGRESS')
    const displayList = active.length > 0 ? active : expeditions
    const total = expeditions.length

    if (displayList.length > 0) {
      session.lastEntity = { type: 'expedition', ...displayList[0] }
      session.lastTopic = 'expeditions'
    }

    if (lang === 'hi') {
      const lines = displayList.map(
        (e) =>
          `• **${e.id}: ${e.name}** — गंतव्य: **${e.destination}** | प्रगति: **${e.progress}%** | प्रमुख: ${e.leader} (दल: ${e.team_size || 0} सदस्य, स्थिति: ${e.status})`
      )
      return {
        handled: true,
        reply:
          `वर्तमान में सिस्टम में **${active.length} सक्रिय अभियान** संचालित हैं (कुल ${total} पंजीकृत मिशन):\n\n` +
          `${lines.join('\n')}\n\n` +
          `💡 *किसी विशिष्ट मिशन के विस्तृत विवरण या दल को देखने के लिए उसका नाम या आईडी पूछें (उदा. \`${displayList[0]?.id || 'EXP-001'} विवरण\`)।*`,
        sessionContext: session,
      }
    }

    if (lang === 'hinglish') {
      const lines = displayList.map(
        (e) =>
          `• **${e.id}: ${e.name}** — Destination: **${e.destination}** | Progress: **${e.progress}%** | Leader: ${e.leader} (Team size: ${e.team_size || 0} members, Status: ${e.status})`
      )
      return {
        handled: true,
        reply:
          `Abhi system mein **${active.length} active expeditions** chal rahe hain (total ${total} registered missions):\n\n` +
          `${lines.join('\n')}\n\n` +
          `💡 *Kisi mission ke deep details ya telemetry dekhne ke liye batayein (jaise \`${displayList[0]?.id || 'EXP-001'} details\`).*`,
        sessionContext: session,
      }
    }

    // English
    const lines = displayList.map(
      (e) =>
        `• **${e.id}: ${e.name}** — Base: **${e.destination}** | Progress: **${e.progress}%** | Mission Leader: ${e.leader} (Team: ${e.team_size || 0} personnel, Status: ${e.status})`
    )
    return {
      handled: true,
      reply:
        `There are currently **${active.length} active expeditions** running (${total} total registered missions):\n\n` +
        `${lines.join('\n')}\n\n` +
        `💡 *To view detailed logs, telemetry, or team assignments for any mission, ask for its ID (e.g. \`${displayList[0]?.id || 'EXP-001'} details\`).*`,
      sessionContext: session,
    }
  }

  // 2. PERSONNEL & FIELD ROSTER LIST
  const isPersonnelListQuery =
    (
      /\b(personnel|staff|scientists|crew|members|logon)\b/i.test(norm) ||
      /(वैज्ञानिक|कार्मिक)/u.test(q)
    ) &&
    (
      /\b(batao|dikhao|list|show|all|kaun|who|active|deployed|kitne|sab|kaunse|konse|kosne)\b/i.test(norm) ||
      /\b(who\s+(?:is|are)\s+deployed|kaun\s+kaun\s+(?:hai|deployed)|logon\s+ki\s+list)\b/i.test(norm) ||
      /\b(all\s+personnel|show\s+personnel|personnel\s+list)\b/i.test(lower)
    ) &&
    !norm.includes('station') &&
    !norm.includes('maitri') &&
    !norm.includes('bharati') &&
    !norm.includes('himadri')

  if (isPersonnelListQuery) {
    const activeStaff = personnel.filter((p) => p.status === 'ACTIVE')
    const displayList = activeStaff.length > 0 ? activeStaff.slice(0, 8) : personnel.slice(0, 8)
    const extra = activeStaff.length > 8 ? `\n...aur ${activeStaff.length - 8} annya operatives duty par hain.` : ''

    if (lang === 'hi') {
      const lines = displayList.map(
        (p) =>
          `• **${p.id}: ${p.name}** — ${p.role} | स्थिति: ${p.status} | रक्त समूह: ${p.blood_group || 'N/A'}`
      )
      return {
        handled: true,
        reply:
          `ध्रुवीय कमांड सेंटर वर्तमान में **${activeStaff.length} सक्रिय कार्मिकों** को ट्रैक कर रहा है (कुल ${personnel.length} पंजीकृत):\n\n` +
          `${lines.join('\n')}${extra}\n\n` +
          `💡 *किसी वैज्ञानिक के जीपीएस या उपग्रह संपर्क देखने के लिए उनका नाम पूछें।*`,
        sessionContext: session,
      }
    }

    if (lang === 'hinglish') {
      const lines = displayList.map(
        (p) =>
          `• **${p.id}: ${p.name}** — ${p.role} | Status: ${p.status} | Blood: ${p.blood_group || 'N/A'}`
      )
      return {
        handled: true,
        reply:
          `POLAR Command Center abhi **${activeStaff.length} active field personnel** track kar raha hai (total ${personnel.length} registered):\n\n` +
          `${lines.join('\n')}${extra}\n\n` +
          `💡 *Kisi specific operative ke GPS coords ya satphone number ke liye unka naam batayein.*`,
        sessionContext: session,
      }
    }

    const lines = displayList.map(
      (p) =>
        `• **${p.id}: ${p.name}** — ${p.role} | Status: ${p.status} | Blood: ${p.blood_group || 'N/A'}`
    )
    const extraEn = activeStaff.length > 8 ? `\n...and ${activeStaff.length - 8} more field operatives on active duty.` : ''
    return {
      handled: true,
      reply:
        `The Polar Command Center currently monitors **${activeStaff.length} active field personnel** (${personnel.length} registered):\n\n` +
        `${lines.join('\n')}${extraEn}\n\n` +
        `💡 *To view live GPS transponder coordinates, telemetry, or satphone for any operative, ask by name or ID.*`,
      sessionContext: session,
    }
  }

  // 3. STATIONS & FACILITIES LIST
  const isStationListQuery =
    (
      /\b(stations?|facilities|bases|locations)\s+(?:batao|dikhao|list|show|all|kaunse|konse|kosne|kya\s+hai|details)\b/i.test(
        norm
      ) ||
      /\b(kaunse|konse|kosne|which)\s+(?:stations?|bases|facilities)\b/i.test(norm) ||
      /\b(show\s+all\s+stations|list\s+of\s+stations|all\s+bases)\b/i.test(lower) ||
      /(अनुसंधान केंद्र|स्टेशन कौन से हैं)/u.test(q)
    )

  if (isStationListQuery) {
    if (lang === 'hi') {
      const lines = locations.slice(0, 6).map(
        (l) => `• **${l.name}** (${l.id}) — ${l.type} in ${l.region} (${l.latitude}°, ${l.longitude}°)`
      )
      return {
        handled: true,
        reply:
          `सिस्टम वर्तमान में **${locations.length} अनुसंधान केंद्रों और फील्ड साइट्स** की निगरानी कर रहा है:\n\n` +
          `${lines.join('\n')}\n\n` +
          `💡 *किसी स्टेशन के लाइव मौसम या दल को देखने के लिए उसका नाम पूछें (उदा. \`मैत्री स्टेशन का विवरण\`)।*`,
        sessionContext: session,
      }
    }

    if (lang === 'hinglish') {
      const lines = locations.slice(0, 6).map(
        (l) => `• **${l.name}** (${l.id}) — ${l.type} in ${l.region} (${l.latitude}°, ${l.longitude}°)`
      )
      return {
        handled: true,
        reply:
          `POLAR Command Center **${locations.length} research facilities aur field camps** track karta hai:\n\n` +
          `${lines.join('\n')}\n\n` +
          `💡 *Kisi specific station ka live weather ya on-site staff janne ke liye uska naam batayein (jaise \`Maitri Station\`).*`,
        sessionContext: session,
      }
    }

    const lines = locations.slice(0, 6).map(
      (l) => `• **${l.name}** (${l.id}) — ${l.type} facility in ${l.region} (${l.latitude}°, ${l.longitude}°)`
    )
    return {
      handled: true,
      reply:
        `The Polar Command Center actively monitors **${locations.length} research facilities and logistics hubs**:\n\n` +
        `${lines.join('\n')}\n\n` +
        `💡 *To view meteorological telemetry or roster for any base, ask: \`Weather at Maitri Station\` or \`Who is at Bharati?\`.*`,
      sessionContext: session,
    }
  }

  // 4. CARGO CONSIGNMENTS LIST
  const isCargoListQuery =
    (
      /\b(cargo|shipments?|consignments?)\s+(?:batao|dikhao|list|show|all|status|kya\s+hai)\b/i.test(norm) ||
      /\b(kya\s+saman\s+(?:aa\s*raha|bheja|hai|chal\s*raha))\b/i.test(norm) ||
      /\b(show\s+all\s+cargo|cargo\s+list|all\s+shipments)\b/i.test(lower)
    ) &&
    !norm.includes('late') &&
    !norm.includes('delay')

  if (isCargoListQuery) {
    const lines = cargo.slice(0, 6).map(
      (c) =>
        `• **${c.id}: ${c.item_name}** — Status: **${c.status}** | Dest: ${c.destination} | Weight: ${c.weight_kg || c.weight || 'N/A'} kg (Priority: ${c.priority})`
    )
    if (lang === 'hi') {
      return {
        handled: true,
        reply: `वर्तमान कार्गो एवं रसद पाइपलाइन (${cargo.length} खेप):\n\n${lines.join('\n')}`,
        sessionContext: session,
      }
    }
    if (lang === 'hinglish') {
      return {
        handled: true,
        reply: `Current supply chain cargo pipeline (${cargo.length} shipments):\n\n${lines.join('\n')}`,
        sessionContext: session,
      }
    }
    return {
      handled: true,
      reply: `Current polar logistics cargo pipeline (${cargo.length} consignments):\n\n${lines.join('\n')}`,
      sessionContext: session,
    }
  }

  // 5. EMERGENCIES / ACTIVE ALERTS LIST
  const isEmergencyListQuery =
    /\b(emergencies|incidents|alerts|sos)\s+(?:batao|dikhao|list|show|all|status|kya\s+hai|chal\s*rahe)\b/i.test(norm) ||
    /\b(kya\s+(?:issue|problem|alert|emergency|incident)\s+(?:hai|chal\s*raha))\b/i.test(norm) ||
    /\b(show\s+all\s+incidents|active\s+incidents|all\s+alerts)\b/i.test(lower)

  if (isEmergencyListQuery) {
    const openInc = emergencies.filter((e) => e.status !== 'RESOLVED')
    if (openInc.length === 0) {
      const reply =
        lang === 'hi'
          ? 'वर्तमान में कोई सक्रिय आपातकालीन अलर्ट नहीं है। सभी ध्रुवीय क्षेत्रों में परिचालन स्थिति सामान्य (Nominal) है।'
          : lang === 'hinglish'
            ? 'Abhi system mein koi active emergency incident nahi hai. Sabhi monitored polar stations par conditions nominal hain.'
            : 'Zero active emergency incidents reported. All polar monitored sectors and stations are currently operating in nominal state.'
      return { handled: true, reply, sessionContext: session }
    }
    const lines = openInc.map(
      (e) =>
        `• **${e.id} [${e.severity} ${e.type}]**: ${e.location} — ${e.description} (${e.status}, Assigned Team: ${e.assigned_team || 'Unassigned'})`
    )
    const reply =
      lang === 'hi'
        ? `सक्रिय आपातकालीन अलर्ट (${openInc.length}):\n\n${lines.join('\n')}`
        : lang === 'hinglish'
          ? `Active incidents aur emergency alerts (${openInc.length}):\n\n${lines.join('\n')}`
          : `Active emergency incidents (${openInc.length}):\n\n${lines.join('\n')}`
    return { handled: true, reply, sessionContext: session }
  }

  return null
}


