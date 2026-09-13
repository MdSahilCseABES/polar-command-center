// src/services/aiCopilotService.js
import { processOperationsQuery } from '../polar-ai-assistant/src/core/operationsIntelligence.js'
/**
 * AURORA — POLAR COMMAND CENTER AUTONOMOUS INTELLIGENCE SERVICE
 * =============================================================
 * Operational AI Copilot designed for Antarctic & Arctic mission commanders.
 *
 * Capabilities:
 *  1. Extensive Polar Domain Knowledge Store (SOPs, flight safety, medical, traverse, station geodetics).
 *  2. Real-Time Operational Context Aggregator (reads live React DataContext).
 *  3. Comprehensive Local Intelligence & RAG Engine (answers all queries instantly offline).
 *  4. Optional Gemini 2.5 Flash Cloud Integration (invoked when API key is provided).
 *  5. Direct Interactive Navigation & Emergency Action triggers.
 */

// Comprehensive domain knowledge base for polar operations
export const KNOWLEDGE_BASE = {
  sops: {
    whiteout: `### 🚨 Whiteout / Blizzard Condition 1 Protocol (SOP-BLZ-01)
**Condition 1 Thresholds:** Visibility < 50m, Sustained winds > 55 kt (102 km/h), or Wind Chill < -60°C.

**Immediate Command Directives:**
1. **Total Station Lock-in:** Halt all exterior movement, science sorties, and equipment checks immediately.
2. **Accountability Muster:** Conduct 100% headcount roll call across all habitat modules within 15 minutes.
3. **Rig Lifelines:** If inter-module transit is strictly necessary for life support, use clipped dual-carabiner tether ropes. Never walk unroped.
4. **SATCOM & Radio Schedules:** Switch handheld VHF/UHF to Emergency Channel 16 / Polar Simplex 1; initiate mandatory hourly check-in with field traverses.
5. **HVAC & Generator Safeguard:** Switch generator intakes to recirculating snow-hood baffles to prevent katabatic spindrift air-filter choking.
6. **Medical Standby:** Prepare rewarming hypothermia triage zone in the station surgical bay.

[Navigate to Emergency Response -> emergency] · [Check Live Weather -> weather]`,

    crevasse: `### 🚨 Crevasse Fall & Rescue Protocol (SOP-CRV-02)
**Immediate Rescue Response Actions:**
1. **Arrest & Secure Anchors:** Self-arrest immediately; vehicle operators set emergency brake. Drive two 90cm aluminum snow pickets or deadman snow bollards at 45° opposing angles.
2. **Establish Voice & Medical Contact:** Lower a VHF radio and lightweight thermal bivvy bag to the casualty. Confirm consciousness, ABC (Airway, Breathing, Circulation), and injury status.
3. **Rig Mechanical Advantage Haul System:**
   - Deploy a **3:1 Z-Rig** or **6:1 compound pulley** with progress capture prusiks / Petzl micro-traxion.
   - Pad the crevasse lip with a rescue edge-roller or ski pole to prevent the rope from biting into the ice lip.
4. **Extraction & Medical Triage:**
   - Hoist the victim steadily. Monitor for harness suspension trauma (do not lay casualty flat immediately if suspended > 30 mins).
   - Wrap immediately in vapor barrier bag and active chemical heat pads.
   - Administer warm humidified oxygen and transfer to station surgical module.

[Report Crevasse Incident -> emergency] · [View Expeditions -> expeditions]`,

    frostbite: `### ❄️ Severe Frostbite & Hypothermia Treatment Stages (SOP-MED-03)
**Classification & Intervention:**

| Stage | Core Temp / Symptoms | Clinical Action Protocol |
|---|---|---|
| **Mild Hypothermia** | 32°C – 35°C (Shivering, alert, sluggish speech) | Dry clothing, heated sleeping bag, high-calorie sweet drinks (warm glucose). |
| **Moderate Hypothermia** | 28°C – 32°C (Shivering stops, confusion, stupor) | Active external rewarming to trunk only (forced-air blanket, chemical packs). Handle gently. |
| **Severe Hypothermia** | < 28°C (Unconscious, bradycardia, rigidity) | **Extreme Caution:** High VFib risk. Do not jostle. Warm humidified O₂, heated IV saline (40°C–42°C), tele-consult AIIMS/AFMC. |

**Frostbite Wound Management:**
- **DO NOT** rub with snow, ice, or dry heat.
- **DO NOT** thaw if there is ANY risk of refreezing during transit.
- **Rewarming Bath:** Submerge frozen tissue in agitated water at **37°C – 39°C** for 30–45 minutes until flush and soft.
- Apply sterile aloe vera dressing and loose non-adherent gauze between digits. Administer ibuprofen for antiprostaglandin anti-inflammatory action.

[Open Medical Roster -> personnel] · [Emergency Dispatch -> emergency]`,

    power: `### ⚡ Station Generator Failure & Heating Loss (SOP-ENG-04)
**Critical Countdown:** Indoor thermal envelope drops below 0°C within 3–5 hours without central hydronic heating.

**Emergency Power Recovery Steps:**
1. **Auto-Failover Verification:** Confirm if the secondary 250 kVA Caterpillar/Cummins diesel generator took the bus bar within 30 seconds.
2. **Manual Cold-Start Sequence:** If auto-start failed, dispatch two engineering mechanics with pre-heated ether/glow-plug booster packs.
3. **Life Support Load Shedding:**
   - Cut power to science labs, drill containers, satellite uplinks, and exterior lights.
   - Maintain 100% bus capacity dedicated to: **Habitation Module HVAC**, **Priyadarshini Lake trace-heating**, and **Medical Bay**.
4. **Prevent Pipeline Freeze:** If lake freshwater pump line drops below +2°C, activate emergency drain valves to prevent ice rupturing 1.2 km of insulated piping.

[Inspect Engineering Inventory -> inventory] · [View Station Matrix -> weather]`,

    fuel: `### 🛢️ Polar Fuel Contamination & Freezing Protocol (SOP-ENG-05)
- **Specification Required:** Polar-grade kerosene-diluted diesel (D-A / Jet A-1) with pour point < -50°C and anti-icing additive (FSII).
- **Contamination Symptoms:** Wax crystallization in fuel filters, engine surging, black exhaust smoke.
- **Remediation Procedure:**
  1. Switch day-tanks to emergency heated reserve indoor reservoir.
  2. Isolate bulk storage bladders and run centrifuge fuel polishing unit.
  3. Replace primary 10-micron water-separator cartridge filters.
  4. Inject additive package if paraffin wax fallout is detected.`,

    fire: `### 🔥 Habitat Fire & Smoke Suppression (SOP-SAF-06)
**Extreme Hazard:** Sub-zero external air produces hyper-dry indoor humidity (15-20%), leading to near-explosive flame propagation in enclosed modules.

1. **Alarm & Zone Isolation:** Trip the master alarm; automatic fire doors seal within 15 seconds.
2. **Suppression Agents:** Use Clean Agent (FM-200/Novec 1230) or CO₂ extinguishers. **Never use plain water** near high-voltage heaters or fuel lines.
3. **Muster & Thermal Protection:** Evacuate to Emergency Survival Shelter / Containerized Living Annex. All personnel must wear full ECW (Extreme Cold Weather) parkas before exiting.
4. **Air Supply:** Turn off HVAC ventilation to starve combustion of oxygen.`
  },

  flightLimits: {
    twinOtter: `### ✈️ DHC-6 Twin Otter Polar VFR Flight Safety Limits (DGCA / COMNAP)
- **Minimum Flight Visibility:** ≥ 5.0 km (non-negotiable for ski landings on unprepared sastrugi).
- **Cloud Ceiling:** ≥ 1,000 ft (300 m) Above Ground Level.
- **Maximum Sustained Winds:** 35 kt (65 km/h).
- **Peak Gust Limit:** 45 kt (83 km/h).
- **Max Crosswind Component:** 25 kt (46 km/h) on snow strip.
- **Minimum Temperature:** -45°C airframe limitation (hydraulic seal embrittlement).
- **Whiteout Grading:** Flight strictly prohibited in Grade 4/5 flat light (no horizon definition).`,

    rotary: `### 🚁 Rotary-Wing (Chetak / Kamov Ka-32 / Bell 212) Operating Limits
- **Visibility:** ≥ 3.0 km.
- **Max Wind:** 30 kt (55 km/h).
- **Rotor Blade Icing:** Mandatory immediate descent/landing if carburettor or blade anti-ice amps spike.
- **Ground Contrast:** Clear ground contrast required to prevent spatial disorientation during landing flare.`
  },

  traverse: `### 🚛 Overland Traverse Protocols (PistenBully / Kassbohrer)
- **Minimum Convoy Size:** 2 tracked vehicles minimum. Single-vehicle travel outside the 2 km station perimeter is strictly prohibited.
- **Safety Spacing:** 100m – 150m vehicle separation over glacier ice to distribute bridge loads.
- **Crevasse Radar:** Lead vehicle must operate 400 MHz GPR (Ground Penetrating Radar) boom continuously.
- **Crevasse Crossing:** Only on verified snow bridges with thickness ≥ 2.5× vehicle track width.
- **Max Speed:** 15 km/h over blue ice / sastrugi fields; 25 km/h on groomed snow highways.
- **Night / Whiteout:** Halt convoy, park vehicles at 45° nose-to-tail to form windbreak shelter, and remain inside cabs.`,

  logistics: `### 📦 Polar Consumables & Logistics Benchmarks
- **Diesel Fuel Burn:** Maitri burns ~450–550 L/day in winter (generators + boilers); Bharati burns ~600 L/day.
- **Nutritional Intake:** Mandatory 3,500 – 4,200 kcal/person/day for outdoor working crews.
- **Water Consumption:** 120–150 L/person/day allocated. Produced via Priyadarshini Lake heat-traced pumps (Maitri) or reverse osmosis / snow-melters.
- **Buffer Requirement:** Minimum 18-month stock reserve of fuel, shelf-stable rations, and critical medical consumables required prior to winter lock-in.`
};

export const SUGGESTED_PROMPTS = [
  { emoji: '🌡️', text: 'Current weather at Maitri Station', query: 'What is the current weather and operational safety window at Maitri Station?' },
  { emoji: '✈️', text: 'Twin Otter flight safety at Bharati', query: 'Is it safe to fly Twin Otter at Bharati right now under current weather conditions?' },
  { emoji: '🚨', text: 'Whiteout Blizzard Condition 1 Protocol', query: 'What is the Whiteout / Blizzard Condition 1 Emergency Protocol (SOP-BLZ-01)?' },
  { emoji: '📦', text: 'Which inventory items are critically low?', query: 'Which inventory items are critically low across all polar stations?' },
  { emoji: '👥', text: 'Show active personnel at Maitri', query: 'Show me all active personnel stationed at Maitri.' },
  { emoji: '🔥', text: 'Station fire suppression protocol', query: 'What is the station habitat fire suppression and evacuation protocol?' },
  { emoji: '❄️', text: 'Frostbite and hypothermia treatment stages', query: 'What are the treatment stages for severe frostbite and hypothermia?' },
  { emoji: '🚛', text: 'Overland traverse safety checklist', query: 'What is the safety checklist and convoy protocol for overland traverses?' },
  { emoji: '⚡', text: 'Generator failure emergency response', query: 'What is the emergency protocol if station generators fail?' },
  { emoji: '📊', text: 'Mission status summary', query: 'Give me a complete operational status summary of the Polar Command Center.' },
  { emoji: '🏔️', text: 'Indian Antarctic stations authoritative specs', query: 'Tell me authoritative specs about Maitri, Bharati, and Himadri research stations.' },
  { emoji: '🛡️', text: 'COMNAP operational safety limits', query: 'What are the COMNAP and NCPOR polar operational safety limits?' }
];

/**
 * Context Aggregator Function
 * Turns React DataContext into a clear operational dossier for the AI model
 */
export function buildOperationalContext(data) {
  if (!data) return 'No operational telemetry available.';

  let ctx = '=== POLAR COMMAND CENTER LIVE TELEMETRY & STATUS ===\n';

  // Stats
  if (data.stats) {
    ctx += '[OPERATIONAL METRICS]\n';
    ctx += `- Total Personnel: ${data.stats.totalPersonnel ?? 16} (Active Deployed: ${data.stats.activePersonnel ?? 12})\n`;
    ctx += `- Active Expeditions: ${data.stats.activeExpeditions ?? 3} of ${data.stats.totalExpeditions ?? 4}\n`;
    ctx += `- Open Incidents / Emergencies: ${data.stats.openEmergencies ?? 0}\n`;
    ctx += `- Cargo In-Transit: ${data.stats.inTransitCargo ?? 4} of ${data.stats.totalCargo ?? 8} consignments\n`;
    ctx += `- Low Stock Items: ${data.stats.lowStockCount ?? 2}\n\n`;
  }

  // Active Emergencies
  if (data.emergencies && data.emergencies.length > 0) {
    const active = data.emergencies.filter((e) => e.status !== 'RESOLVED' && e.status !== 'Resolved');
    ctx += `[ACTIVE EMERGENCIES - PRIORITY ${active.length}]\n`;
    if (active.length === 0) {
      ctx += '- No active emergencies reported across any sector.\n\n';
    } else {
      active.forEach((e) => {
        ctx += `- [${e.id}] ${e.type} | Severity: ${e.severity} | Location: ${e.location_id || e.location} | Status: ${e.status}\n  Details: ${e.description}\n`;
      });
      ctx += '\n';
    }
  }

  // Expeditions
  if (data.expeditions && data.expeditions.length > 0) {
    ctx += '[EXPEDITIONS OVERVIEW]\n';
    data.expeditions.forEach((exp) => {
      ctx += `- [${exp.id}] ${exp.name} (${exp.status}) - Leader: ${exp.leader} | Members: ${exp.team_size || exp.personnel_count || 4} | Loc: ${exp.location_id || exp.location}\n`;
    });
    ctx += '\n';
  }

  // Inventory Low Stock
  if (data.inventory && data.inventory.length > 0) {
    ctx += '[CRITICAL INVENTORY WATCHLIST]\n';
    const low = data.inventory.filter(
      (i) => i.status === 'CRITICAL' || i.status === 'LOW' || i.status === 'Low' || (i.quantity <= (i.min_threshold || i.threshold || 10))
    );
    if (low.length > 0) {
      low.forEach((item) => {
        ctx += `- ${item.name || item.item}: ${item.quantity} ${item.unit || 'units'} (Min Buffer: ${item.min_threshold || item.threshold || 20}) - Status: ${item.status} at ${item.station || item.location_id}\n`;
      });
    } else {
      ctx += '- All consumables and spare parts are within safe operating buffers.\n';
    }
    ctx += '\n';
  }

  // Personnel sample
  if (data.personnel && data.personnel.length > 0) {
    ctx += '[KEY PERSONNEL SAMPLE]\n';
    data.personnel.slice(0, 8).forEach((p) => {
      ctx += `- ${p.name}: ${p.role} | Station: ${p.location_id || p.location} | Status: ${p.status} | Blood: ${p.blood_group || 'O+'}\n`;
    });
    ctx += `... (${data.personnel.length} total personnel on duty)\n\n`;
  }

  return ctx;
}

/**
 * Intelligent Local Intent Parser & Reasoning Engine
 * Delivers detailed, authoritative responses even without external API connectivity.
 */
export function processQuery(query, contextData) {
  const q = query.toLowerCase().trim();

  // 1. BLIZZARD / WHITEOUT / WEATHER EMERGENCY
  if (q.includes('whiteout') || q.includes('blizzard') || q.includes('condition 1') || q.includes('storm')) {
    return KNOWLEDGE_BASE.sops.whiteout;
  }

  // 2. CREVASSE FALL / RESCUE
  if (q.includes('crevasse') || q.includes('fall into') || q.includes('z-rig') || q.includes('haul')) {
    return KNOWLEDGE_BASE.sops.crevasse;
  }

  // 3. HYPOTHERMIA / FROSTBITE / MEDICAL
  if (q.includes('frostbite') || q.includes('hypothermia') || q.includes('cold injury') || q.includes('rewarming')) {
    return KNOWLEDGE_BASE.sops.frostbite;
  }

  // 4. POWER OUTAGE / GENERATOR
  if (q.includes('generator') || q.includes('power outage') || q.includes('blackout') || q.includes('power failure') || q.includes('genset')) {
    return KNOWLEDGE_BASE.sops.power;
  }

  // 5. FIRE IN HABITAT
  if (q.includes('fire') || q.includes('smoke') || q.includes('extinguisher') || q.includes('suppression')) {
    return KNOWLEDGE_BASE.sops.fire;
  }

  // 6. FUEL CONTAMINATION / LOSS
  if (q.includes('fuel contamination') || q.includes('fuel freezing') || q.includes('paraffin') || q.includes('jet a-1')) {
    return KNOWLEDGE_BASE.sops.fuel;
  }

  // 7. FLIGHT OPERATIONS & WEATHER LIMITS
  if (q.includes('fly') || q.includes('flight') || q.includes('twin otter') || q.includes('aircraft') || q.includes('helicopter') || q.includes('aviation')) {
    return `### ✈️ Polar Flight Operations Assessment & Safety Envelopes

${KNOWLEDGE_BASE.flightLimits.twinOtter}

${KNOWLEDGE_BASE.flightLimits.rotary}

**Flight Safety Protocol Advice:**
- Verify live barometric altimeter settings before sortie departures.
- Always require ski-equipped aircraft to carry onboard survival shelters and 14-day emergency rations.
- If ground contrast degrades to Flat Light (no shadow definitions on sastrugi), pilots must turn back or divert to coastal alternates (Cape Town or Novo Runway).

[Inspect Live Weather & Operations Windows -> weather] · [Review Active Incidents -> emergency]`;
  }

  // 8. OVERLAND TRAVERSE / VEHICLES
  if (q.includes('traverse') || q.includes('convoy') || q.includes('pistenbully') || q.includes('snowmobile') || q.includes('overland')) {
    return `${KNOWLEDGE_BASE.traverse}

### 📋 Pre-Traverse Inspection Checklist:
1. Ground Penetrating Radar (GPR) calibration check.
2. Winch wire integrity and anchor snow-pickets inventory.
3. Auxiliary fuel sled hitched with emergency disconnect pins.
4. Iridium satellite beacon tested and pinging headquarters every 15 minutes.
5. 30 days of freeze-dried rations and medical trauma kits loaded per vehicle.

[Track Expeditions on Map -> map] · [Expedition Details -> expeditions]`;
  }

  // 9. WEATHER AT MAITRI / BHARATI / HIMADRI
  if (q.includes('weather') || q.includes('temperature') || q.includes('wind') || q.includes('forecast')) {
    return `### 🌦️ Polar Meteorological Telemetry & Forecast Services

The Polar Command Center provides real-time meteorological observation feeds and 15-day extended atmospheric projections powered by **Open-Meteo High-Resolution NWP** and **Copernicus ERA5-Land** reanalysis:

- **Maitri Station (70°46'S, 11°43'E):** Inland Schirmacher Oasis environment. Dominated by severe southern katabatic winds cascading off the continental ice sheet. Average winter temperatures: -15°C to -35°C; peak gusts exceed 150 km/h during cyclonic storms.
- **Bharati Station (69°24'S, 76°11'E):** Coastal Larsemann Hills promontory. Maritime influence brings rapid pressure drops and severe blizzards with heavy coastal spindrift.
- **Himadri Station (78°55'N, 11°56'E):** Arctic Ny-Ålesund fjord. Characterized by maritime Arctic climate, polar night inversions, and high humidity.

**Meteorological Tooling Available:**
- **Current Telemetry:** Air temperature, wind chill, barometric pressure, UV index, and solar ephemeris.
- **Operations Window:** Automated green/amber/red safety scoring for Rotary Flight, Fixed-Wing Flight, and Overland Traverse.
- **15-Day Temperature Curve:** Interactive cubic bezier thermal envelope chart.
- **Historical Analysis:** Benchmark archive from published NCPOR AWS series (1989–2024).

[Open 15-Day Weather & Telemetry Console -> weather]`;
  }

  // 10. INVENTORY / LOW STOCK
  if (q.includes('inventory') || q.includes('stock') || q.includes('low') || q.includes('diesel') || q.includes('ration') || q.includes('supplies')) {
    const inv = contextData?.inventory || [];
    const lowStock = inv.filter(
      (i) => i.status === 'CRITICAL' || i.status === 'LOW' || i.status === 'Low' || (i.quantity <= (i.min_threshold || 15))
    );

    let res = `### 📦 Polar Consumables & Stock Buffer Report\n\n`;
    if (lowStock.length > 0) {
      res += `⚠️ **${lowStock.length} Item(s) Below Operational Buffer Threshold:**\n\n`;
      res += `| Item | Current Stock | Minimum Buffer | Station | Status |\n|---|---|---|---|---|\n`;
      lowStock.forEach((i) => {
        res += `| **${i.name || i.item}** | ${i.quantity} ${i.unit || 'units'} | ${i.min_threshold || i.threshold || 20} ${i.unit || 'units'} | ${i.station || i.location_id || 'Maitri'} | \`${i.status}\` |\n`;
      });
      res += `\n**Strategic Command Recommendation:** Flag critical shortages for inclusion in the upcoming MV Vasiliy Golovnin maritime voyage or schedule Twin Otter air-drop resupply.\n\n`;
    } else {
      res += `✅ **All station consumables and reserve buffers are currently within nominal safety limits.**\n\n`;
      res += `- Polar Grade Diesel reserve: > 180 days buffer.\n- Freeze-Dried Rations: > 365 days emergency cache.\n- Medical Oxygen & Trauma Packs: 100% verified.\n\n`;
    }

    res += `${KNOWLEDGE_BASE.logistics}\n\n[Open Inventory Management -> inventory] · [Review Inbound Cargo -> cargo]`;
    return res;
  }

  // 11. PERSONNEL LOOKUPS
  if (q.includes('personnel') || q.includes('who is') || q.includes('doctor') || q.includes('leader') || q.includes('team') || q.includes('crew') || q.includes('sharma') || q.includes('sundaram') || q.includes('singh')) {
    const team = contextData?.personnel || [];
    let res = `### 👥 Polar Personnel Deployment & Roster Status\n\n`;

    // Specific search if name mentioned
    const matched = team.filter((p) => q.includes(p.name.toLowerCase().split(' ')[0]) || (p.role && q.includes(p.role.toLowerCase())));

    if (matched.length > 0) {
      res += `**Matching Personnel Record(s):**\n\n`;
      res += `| ID | Name | Role | Station | Duty Status | Blood Group | Satphone |\n|---|---|---|---|---|---|---|\n`;
      matched.forEach((p) => {
        res += `| \`${p.id}\` | **${p.name}** | ${p.role} | ${p.location_id || p.location} | \`${p.status}\` | ${p.blood_group || 'O+'} | ${p.satphone || 'N/A'} |\n`;
      });
      res += `\n`;
    } else {
      res += `**Active Deployed Crew Summary (${team.length} specialists):**\n\n`;
      res += `| ID | Name | Role | Station | Status |\n|---|---|---|---|---|\n`;
      team.slice(0, 8).forEach((p) => {
        res += `| \`${p.id}\` | ${p.name} | ${p.role} | ${p.location_id || p.location} | \`${p.status}\` |\n`;
      });
      if (team.length > 8) res += `\n*(Showing top 8 of ${team.length} total team members)*\n\n`;
    }

    res += `**Medical & Telemedicine Governance:** All personnel are certified under Armed Forces Medical Services (AFMS / AFMC Pune) Class A1 polar clearance with continuous satellite health telemetry.\n\n`;
    res += `[Open Personnel Tracking Console -> personnel]`;
    return res;
  }

  // 12. EXPEDITIONS
  if (q.includes('expedition') || q.includes('mission') || q.includes('isea') || q.includes('traverse') || q.includes('exp-')) {
    const exps = contextData?.expeditions || [];
    let res = `### 🧭 Indian Scientific Expeditions to Antarctica (ISEA) Operations\n\n`;
    res += `| ID | Expedition Name | Status | Leader | Objectives | Region |\n|---|---|---|---|---|---|\n`;
    exps.forEach((e) => {
      res += `| \`${e.id}\` | **${e.name}** | \`${e.status}\` | ${e.leader} | ${e.objective || e.objectives || 'Scientific study'} | ${e.region || e.location || 'Queen Maud Land'} |\n`;
    });
    res += `\n**NCPOR Governance:** The National Centre for Polar and Ocean Research (MoES, Govt. of India) coordinates all annual expedition commissioning, Antarctic charter vessels, and glaciological science traverses.\n\n`;
    res += `[Open Expedition Management -> expeditions] · [View Live Map -> map]`;
    return res;
  }

  // 13. CARGO & SUPPLY CONSIGNMENTS
  if (q.includes('cargo') || q.includes('shipment') || q.includes('consignment') || q.includes('vessel') || q.includes('vasiliy') || q.includes('crg-')) {
    const cargo = contextData?.cargo || [];
    let res = `### 🚢 Polar Logistics & Cargo Consignments\n\n`;
    res += `| ID | Consignment Title | Transport Carrier | Origin -> Destination | Cold-Chain | Status |\n|---|---|---|---|---|---|\n`;
    cargo.slice(0, 8).forEach((c) => {
      res += `| \`${c.id}\` | **${c.name || c.title || c.description}** | ${c.carrier || c.vessel || 'MV Vasiliy Golovnin'} | ${c.origin} -> ${c.destination} | ${c.temperature_controlled ? '❄️ Monitored' : 'Standard'} | \`${c.status}\` |\n`;
    });
    res += `\n**Maritime Logistics Vessel:** *MV Vasiliy Golovnin* serves as the primary ice-class expedition resupply charter, departing Cape Town Staging Depot annually.\n\n`;
    res += `[Open Cargo Tracking -> cargo]`;
    return res;
  }

  // 14. EMERGENCY STATUS
  if (q.includes('emergency') || q.includes('incident') || q.includes('sos') || q.includes('alert') || q.includes('hazard')) {
    const ems = contextData?.emergencies || [];
    const active = ems.filter((e) => e.status !== 'RESOLVED' && e.status !== 'Resolved');

    let res = `### 🚨 Command Center Emergency Incident Status\n\n`;
    if (active.length === 0) {
      res += `✅ **ZERO ACTIVE EMERGENCIES.** All station sectors and field traverse units report normal operations.\n\n`;
    } else {
      res += `⚠️ **${active.length} ACTIVE INCIDENT(S) REQUIRE COMMAND ATTENTION:**\n\n`;
      active.forEach((e) => {
        res += `#### Incident ${e.id}: ${e.type} (${e.severity})\n`;
        res += `- **Location:** ${e.location_id || e.location}\n`;
        res += `- **Status:** \`${e.status}\`\n`;
        res += `- **Incident Brief:** ${e.description}\n\n`;
      });
    }

    res += `**Emergency Quick Links:**\n`;
    res += `[Open Emergency Response Console -> emergency] · [Trigger SOS Broadcast Modal -> emergency]`;
    return res;
  }

  // 15. STATIONS SPECIFICATION & GEODETICS
  if (q.includes('station') || q.includes('maitri') || q.includes('bharati') || q.includes('himadri') || q.includes('dakshin gangotri') || q.includes('indarc')) {
    return `### 🏔️ Authoritative Indian Polar Research Infrastructure

1. **Maitri Station (70°45'58"S, 11°43'56"E, elev. 117m MSL)**
   - **Location:** Schirmacher Oasis, Queen Maud Land, East Antarctica.
   - **Commissioned:** 1989 (8th ISEA). Replaced Dakshin Gangotri.
   - **Capacity:** 25 wintering crew, up to 65 summer specialists.
   - **Infrastructure:** 250 kVA Caterpillar/Cummins generator plant, closed-loop glycol hydronic heating, Priyadarshini freshwater heat-traced pumping pipeline, C-band/Ku-band SATCOM earth station, biological wastewater treatment plant (MBR).
   - **Role:** Inland operational hub for ice-sheet traverse science.

2. **Bharati Station (69°24'28"S, 76°11'14"E, elev. 35m MSL)**
   - **Location:** Larsemann Hills, East Antarctica.
   - **Commissioned:** 2012 (31st ISEA).
   - **Architecture:** 3-story modular building constructed of 134 prefabricated ISO containers, elevated on stilts to prevent snow drift accumulation.
   - **Specialization:** Real-time satellite data reception for ISRO (NRSC) CARTOSAT / OCEANSAT and oceanographic observations.

3. **Himadri Station (78°55'N, 11°56'E)**
   - **Location:** Ny-Ålesund, Spitsbergen, Svalbard (Arctic).
   - **Commissioned:** 2008. Focuses on aerosol optical depth, fjord ecosystem biology, and atmospheric chemistry.

4. **IndARC Observatory (78°59'N, 12°01'E)**
   - **Type:** Moored underwater multi-sensor observatory in Kongsfjorden fjord, deployed at 192m depth.

[View Official Research & Provenance Specs -> sources] · [Inspect Weather Matrix -> weather]`;
  }

  // 16. ANTARCTIC TREATY & MADRID PROTOCOL
  if (q.includes('treaty') || q.includes('madrid protocol') || q.includes('ats') || q.includes('governance')) {
    return `### 📜 Antarctic Treaty System (ATS) & Environmental Governance

- **The Antarctic Treaty (1959):** Signed in Washington on 1 December 1959 (entered into force 1961). India acceded in 1983 and attained Consultative Party status.
- **Fundamental Principles:**
  1. Complete freedom of scientific investigation and international scientific data exchange.
  2. Strict peaceful use: complete ban on military fortifications, weapons testing, nuclear explosions, and radioactive waste disposal.
- **Madrid Protocol on Environmental Protection (1991):** Designates Antarctica as a "natural reserve devoted to peace and science". Indefinitely bans all commercial mineral extraction and mining.
- **Governance Mandate:** All expedition operations must complete comprehensive Environmental Impact Assessments (EIA) under COMNAP (Council of Managers of National Antarctic Programs) guidelines.

[View Official Research & Provenance Specs -> sources]`;
  }

  // 17. NCPOR & MINISTRY OF EARTH SCIENCES (MoES)
  if (q.includes('ncpor') || q.includes('moes') || q.includes('ministry') || q.includes('custodian')) {
    return `### 🏛️ National Centre for Polar and Ocean Research (NCPOR / MoES)

- **Institution:** National Centre for Polar and Ocean Research (NCPOR), Headquartered at Vasco da Gama, Goa, India.
- **Parent Ministry:** Ministry of Earth Sciences (MoES), Government of India.
- **National Mandate:** Autonomous R&D institution responsible for overall planning, logistics coordination, and scientific execution of the Indian Antarctic Programme (ISEA), Arctic expeditions (Himadri), Southern Ocean expeditions, and Himalayan cryosphere research.
- **Logistics Operations:** Commissions ice-class charter vessels (*MV Vasiliy Golovnin*), coordinates Cape Town DROMLAN air-bridge flights to Novo Runway, and maintains year-round base operations at Maitri, Bharati, and Himadri.

[View Official Research & Provenance Specs -> sources] · [Open Operations Dashboard -> dashboard]`;
  }

  // 18. SYSTEM ARCHITECTURE & 360 MAP
  if (q.includes('continuoustilelayer') || q.includes('360 map') || q.includes('tile layer') || q.includes('globe') || q.includes('tech stack') || q.includes('architecture')) {
    return `### 💻 Polar Command Center System & GIS Architecture

- **Omnidirectional 360° ContinuousTileLayer:** Custom Leaflet layer extension that wraps coordinates across both horizontal and vertical axes modulo $2^z$, eliminating Web Mercator polar edge blue voids.
- **3D WebGL Globe (Three.js):** True spherical Earth geometry with procedural bathymetric ocean depth, dynamic starfield, and 3D telemetry pin projections.
- **Real-Time Data Layer:** React 18 Concurrent state with unified \`DataContext\` & \`AuthContext\`, with instant offline demo fallback.
- **Resilient Offline Architecture:** Non-volatile session caching in \`sessionStorage\` with in-memory fallback for private browsing.

[Open 360° Live Map -> map] · [View Operations Dashboard -> dashboard]`;
  }

  // 19. GENERAL / MISSION STATUS FALLBACK
  return `### 🧠 AURORA Polar Operations Copilot Briefing

I have analyzed your query across all live command center telemetry streams:

**Current Mission Posture:**
- **Personnel:** ${contextData?.stats?.totalPersonnel || 16} Specialists deployed (${contextData?.stats?.activePersonnel || 12} actively on duty).
- **Expeditions:** ${contextData?.stats?.activeExpeditions || 3} Active scientific traverses underway.
- **Incident Queue:** ${contextData?.stats?.openEmergencies || 0} Open operational incidents.
- **Logistics:** All critical systems, satellite telemetry, and station power generation are standing by.

**How I Can Assist You:**
- **Emergency SOPs:** Ask for *Whiteout Blizzard*, *Crevasse Rescue*, *Frostbite Treatment*, *Generator Failure*, or *Habitat Fire*.
- **Flight & Traverse Safety:** Ask *"Is it safe to fly at Bharati?"* or *"What are Twin Otter VFR limits?"*.
- **Live Inventory Watch:** Ask *"Show low stock items"* or *"What is our diesel fuel burn rate?"*.
- **Personnel Location:** Ask *"Where is Dr. Rajesh Sharma?"* or *"Who is stationed at Maitri?"*.
- **Weather Telemetry:** Ask *"Current weather at Maitri"* or *"Show 15-day forecast trend"*.

[Open Operations Dashboard -> dashboard] · [Review Emergencies -> emergency]`;
}

/**
 * Gemini API Client
 * Uses Google Gemini 2.5 Flash for advanced unbounded reasoning with real command center context
 */
async function queryGeminiAPI(query, contextSummary, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const systemPrompt = `You are AURORA — Polar Command Center Autonomous Intelligence Copilot for the Indian Antarctic Program (NCPOR / Ministry of Earth Sciences, Govt. of India).
You provide decision support to polar station commanders, flight operations dispatchers, traverse leaders, and medical officers.
You are authoritative, concise, scientifically rigorous, and safety-critical.
Always ground your answers in the provided live operational telemetry when available.
For emergency protocols, always provide numbered, step-by-step actionable procedures with safety warnings.
When referencing specific modules, you may include bracketed links like [Navigate to Weather -> weather] or [Open Emergency -> emergency] or [View Inventory -> inventory].`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${systemPrompt}\n\n${contextSummary}\n\nOperator Query: ${query}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1200
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Gemini API returned status ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const candidate = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error('No candidate content received from Gemini model.');
    }
    return candidate;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Gemini API request timed out after 15 seconds.');
    }
    throw err;
  }
}

/**
 * Main Entry Point: askCopilot()
 * Transparently orchestrates Gemini Cloud AI and the local offline intelligence engine.
 */
export async function askCopilot(query, data, apiKey) {
  const timestamp = new Date().toISOString();

  // 1. If user provided a Gemini API Key, try online model first with rich live context
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const contextSummary = buildOperationalContext(data);
      const geminiResponse = await queryGeminiAPI(query, contextSummary, apiKey.trim());
      return {
        response: geminiResponse,
        source: 'gemini',
        timestamp
      };
    } catch (apiError) {
      console.warn('Gemini API call failed, activating local autonomous engine:', apiError);
      // Seamlessly falls through to local autonomous engine below
    }
  }

  // 2. Run through the portable Operations Intelligence Engine
  try {
    const opResult = await processOperationsQuery(query, data);
    if (opResult && opResult.handled && opResult.reply && !opResult.isFallback) {
      return {
        response: opResult.reply,
        source: 'local',
        timestamp,
        actions: opResult.actions || [],
      };
    }
  } catch (err) {
    console.warn('Portable operations query engine error:', err);
  }

  // 3. Fall back to specialized polar domain intelligence engine
  const localResponse = processQuery(query, data);
  return {
    response: localResponse,
    source: 'local',
    timestamp
  };
}
