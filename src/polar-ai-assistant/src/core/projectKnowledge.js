/**
 * POLAR PROJECT KNOWLEDGE & SCHEMA REPOSITORY
 * ===========================================
 * Complete self-describing architectural model of the POLAR Command Center.
 * Enables the AI Assistant to explain the project, describe schemas, understand
 * available modules, fields, roles, workflows, and operational capabilities.
 */

export const PROJECT_METADATA = {
  name: 'POLAR Command Center',
  fullName: 'Indian Polar Research Expedition Management System',
  organization: 'National Centre for Polar and Ocean Research (NCPOR)',
  ministry: 'Ministry of Earth Sciences (MoES), Government of India',
  purpose:
    'Real-time operational command, multi-station logistics coordination, scientific expedition tracking, field personnel safety, inventory management, live meteorological analysis, and emergency response across Antarctic, Arctic, and Southern Ocean theaters.',
  theaters: [
    'Antarctica (Schirmacher Oasis & Larsemann Hills)',
    'Arctic (Ny-Ålesund, Svalbard)',
    'Southern Ocean & Maritime Corridors',
    'Staging Ports (Cape Town) & NCPOR Headquarters (Goa)',
  ],
  techStack: {
    frontend: 'React 18 + Vite',
    styling: 'Tailwind CSS + Custom Polar Design System',
    state: 'React Context API (DataContext, AuthContext)',
    database: 'Supabase (PostgreSQL with Row Level Security & real-time fallback to demoData)',
    mapping: 'Leaflet / React-Leaflet GIS engine',
    weather: 'Open-Meteo Live Polar Weather API with offline telemetry fallback',
    ai: 'POLAR Operational Intelligence Engine with local multi-module reasoning & LLM API bridge',
  },
}

export const PROJECT_MODULES = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    title: 'Operations Dashboard',
    description:
      'High-level command console providing a unified operational brief (SITREP): active missions, deployed personnel, cargo pipeline, low-stock alerts, active emergencies, and real-time activity log.',
    features: [
      'Summary stat cards for expeditions, personnel, cargo, and alerts',
      'Recent operational activity stream with timestamps',
      'One-click deep links to all sub-modules',
      'System status indicator (Supabase live DB vs demo fallback)',
    ],
  },
  {
    id: 'expeditions',
    label: 'Expeditions',
    title: 'Expedition Management',
    description:
      'Plans, tracks, and updates polar scientific expeditions. Manages progress milestones, timelines, leaders, objectives, and assigned field teams.',
    features: [
      'Expedition creation, status updates (Planning, Active, Completed, Suspended)',
      'Milestone progress tracking (0% to 100%)',
      'Expedition roster and cargo consignment association',
      'Destination station mapping',
    ],
    entityKey: 'expeditions',
  },
  {
    id: 'personnel',
    label: 'Personnel',
    title: 'Personnel Tracking',
    description:
      'Manages polar expedition members, operational roles, duty statuses, field locations, blood groups, satphone contact numbers, and telemetry coordinates.',
    features: [
      'Roster management with duty status (Active, In Transit, Resting, Emergency, Off Duty)',
      'Automated coordinate synchronization with host stations',
      'Medical and emergency metadata (blood groups, emergency flags)',
      'Interactive Map locator tags',
    ],
    entityKey: 'personnel',
  },
  {
    id: 'cargo',
    label: 'Cargo',
    title: 'Cargo Tracking',
    description:
      'Monitors supply consignments across maritime transit, airlinks, and station depots. Tracks weights, priority tiers, and transit statuses.',
    features: [
      'Status pipeline (Planned, Loaded, In Transit, Arrived, Delayed)',
      'Priority classification (Low, Medium, High, Critical)',
      'Station routing and expedition assignment',
      'Delay logging with operational root cause notes',
    ],
    entityKey: 'cargo',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    title: 'Inventory Management',
    description:
      'Controls critical consumables, fuel reserves, medical kits, scientific spares, and emergency equipment across all polar bases with automated threshold safeguards.',
    features: [
      'Stock level monitoring with dynamic low-stock (< minimum threshold) and out-of-stock detection',
      'Categories: Fuel, Medical, Safety, Food, Utility, Spares, Scientific, Communications',
      'Inline stock adjustments (+/- delta), item additions, renaming, location transfer, and threshold updates',
      'Deletion with confirmation guard',
    ],
    entityKey: 'inventory',
  },
  {
    id: 'map',
    label: 'Live Map',
    title: 'Map Integration',
    description:
      'Geographic GIS visualization of research stations, field camps, research vessels, active personnel, and emergency incidents on dual polar projections.',
    features: [
      'Interactive Leaflet GIS map',
      'Station markers with real published geographic coordinates',
      'Simulated beacon telemetry for field operators and mobile assets',
      'Emergency incident markers with color-coded severity badges',
    ],
    entityKey: 'locations',
  },
  {
    id: 'weather',
    label: 'Weather',
    title: 'Weather Integration',
    description:
      'Live polar meteorological reporting and operational viability forecasting. Evaluates temperatures, wind speeds, and blizzard conditions for flight and ground traverses.',
    features: [
      'Live Open-Meteo polar weather feed with fallback telemetry',
      'Flight and traverse operational safety evaluation (Go / Marginal / No-Go)',
      'Extreme weather warnings and station comparisons',
    ],
  },
  {
    id: 'emergency',
    label: 'Emergency',
    title: 'Emergency Response',
    description:
      'Rapid incident declaration, severity triage, responder dispatch, and casualty status tracking. Connects incidents directly to affected personnel.',
    features: [
      'Incident declaration (Medical, Equipment Failure, Weather Hazard, Overdue Check-in, Fire, Vehicle, Other)',
      'Severity tiers (Critical, High, Medium, Low)',
      'Status workflow (Active -> Responding -> Resolved)',
      'Automatic status flip: casualty marked EMERGENCY on roster and map, then restored on resolution',
    ],
    entityKey: 'emergencies',
  },
]

export const ENTITY_SCHEMAS = {
  expeditions: {
    label: 'Expeditions',
    idPrefix: 'EXP-',
    description: 'Scientific research expeditions and field programmes',
    fields: [
      { name: 'id', type: 'string', description: 'Unique expedition identifier (e.g. EXP-001)' },
      { name: 'name', type: 'string', description: 'Full expedition title' },
      { name: 'destination', type: 'string', description: 'Host station or operating region' },
      { name: 'location_id', type: 'string', description: 'Foreign key to locations table' },
      { name: 'start_date', type: 'date', description: 'Expedition deployment start date' },
      { name: 'end_date', type: 'date', description: 'Scheduled completion / extraction date' },
      { name: 'team_size', type: 'number', description: 'Total assigned scientists and field crew' },
      { name: 'status', type: 'enum', description: 'PLANNING, ACTIVE, COMPLETED, SUSPENDED' },
      { name: 'progress', type: 'number', description: 'Completion percentage (0 - 100)' },
      { name: 'leader', type: 'string', description: 'Expedition Commander / Principal Investigator' },
      { name: 'objective', type: 'string', description: 'Scientific mission statement and research scope' },
      { name: 'created_at', type: 'timestamp', description: 'Record creation timestamp' },
    ],
  },
  personnel: {
    label: 'Personnel',
    idPrefix: 'P-',
    description: 'Field operators, scientists, medical personnel, and logistics specialists',
    fields: [
      { name: 'id', type: 'string', description: 'Personnel badge and transceiver ID (e.g. P-001)' },
      { name: 'name', type: 'string', description: 'Full legal name and professional title' },
      { name: 'role', type: 'string', description: 'Duty designation (e.g. Lead Climatologist, Station Medical Officer)' },
      { name: 'expedition_id', type: 'string', description: 'Foreign key to expeditions table' },
      { name: 'status', type: 'enum', description: 'ACTIVE, IN_TRANSIT, RESTING, EMERGENCY, OFF_DUTY' },
      { name: 'location_id', type: 'string', description: 'Foreign key to host station / camp location' },
      { name: 'latitude', type: 'number', description: 'Current latitude (real station or simulated field beacon)' },
      { name: 'longitude', type: 'number', description: 'Current longitude (real station or simulated field beacon)' },
      { name: 'last_updated', type: 'timestamp', description: 'Timestamp of last telemetry report' },
      { name: 'blood_group', type: 'string', description: 'Medical blood type (e.g. O+, A+, B-)' },
      { name: 'satphone', type: 'string', description: 'Iridium satellite telephone dial code' },
    ],
  },
  cargo: {
    label: 'Cargo',
    idPrefix: 'C-',
    description: 'Consignments, equipment containers, fuel drums, and scientific instruments',
    fields: [
      { name: 'id', type: 'string', description: 'Consignment manifest tracking code (e.g. C-101)' },
      { name: 'item_name', type: 'string', description: 'Consignment description' },
      { name: 'category', type: 'string', description: 'Equipment, Supplies, Fuel, Scientific, etc.' },
      { name: 'quantity', type: 'number', description: 'Quantity of packages / drums' },
      { name: 'unit', type: 'string', description: 'Packaging unit (drums, containers, crates, packs)' },
      { name: 'location', type: 'string', description: 'Current physical transit staging base or vessel' },
      { name: 'destination', type: 'string', description: 'Target destination station or field camp' },
      { name: 'status', type: 'enum', description: 'PLANNED, LOADED, IN_TRANSIT, ARRIVED, DELAYED' },
      { name: 'priority', type: 'enum', description: 'LOW, MEDIUM, HIGH, CRITICAL' },
      { name: 'expedition_id', type: 'string', description: 'Assigned expedition code' },
      { name: 'weight_kg', type: 'number', description: 'Total gross payload weight in kilograms' },
      { name: 'created_at', type: 'timestamp', description: 'Manifest creation timestamp' },
    ],
  },
  inventory: {
    label: 'Inventory',
    idPrefix: 'I-',
    description: 'On-station consumables, emergency equipment, and operational reserves',
    fields: [
      { name: 'id', type: 'string', description: 'Stock item inventory code (e.g. I-001)' },
      { name: 'item_name', type: 'string', description: 'Name of the consumable or equipment' },
      { name: 'category', type: 'string', description: 'Fuel, Medical, Safety, Food, Utility, Spares, Scientific, Communications' },
      { name: 'quantity', type: 'number', description: 'Current verified on-site available quantity' },
      { name: 'minimum_quantity', type: 'number', description: 'Mandatory minimum reserve threshold before low-stock alarm' },
      { name: 'unit', type: 'string', description: 'Unit of measurement (litres, kits, cylinders, packs, units)' },
      { name: 'location', type: 'string', description: 'Station warehouse or depot where item is stored' },
      { name: 'condition', type: 'enum', description: 'NEW, GOOD, SERVICEABLE, NEEDS_REPAIR, EXPIRED' },
      { name: 'updated_at', type: 'timestamp', description: 'Timestamp of last physical count or adjustment' },
    ],
  },
  locations: {
    label: 'Locations',
    idPrefix: 'LOC-',
    description: 'Permanent research stations, temporary field camps, vessels, and staging depots',
    fields: [
      { name: 'id', type: 'string', description: 'Location identifier (e.g. LOC-MAITRI, LOC-BHARATI, LOC-HIMADRI)' },
      { name: 'name', type: 'string', description: 'Official station or site title' },
      { name: 'type', type: 'enum', description: 'STATION, CAMP, VESSEL, RUNWAY, PORT, DEPOT, HQ' },
      { name: 'region', type: 'string', description: 'Geographic zone (Antarctica, Arctic, Southern Ocean, Goa)' },
      { name: 'latitude', type: 'number', description: 'True published geographic latitude coordinate' },
      { name: 'longitude', type: 'number', description: 'True published geographic longitude coordinate' },
      { name: 'notes', type: 'string', description: 'Historical operational background and commissioning notes' },
      { name: 'capacity', type: 'number', description: 'Maximum personnel winter/summer bed capacity' },
    ],
  },
  emergencies: {
    label: 'Emergencies',
    idPrefix: 'INC-',
    description: 'Operational incidents, medical alerts, equipment hazards, and search-and-rescue dispatches',
    fields: [
      { name: 'id', type: 'string', description: 'Incident emergency dispatch record (e.g. INC-001)' },
      { name: 'type', type: 'enum', description: 'MEDICAL, EQUIPMENT_FAILURE, WEATHER, OVERDUE_CHECKIN, FIRE, VEHICLE, OTHER' },
      { name: 'location', type: 'string', description: 'Site description or sector' },
      { name: 'location_id', type: 'string', description: 'Foreign key to host station' },
      { name: 'latitude', type: 'number', description: 'Incident site latitude' },
      { name: 'longitude', type: 'number', description: 'Incident site longitude' },
      { name: 'severity', type: 'enum', description: 'LOW, MEDIUM, HIGH, CRITICAL' },
      { name: 'description', type: 'string', description: 'Operational incident details and casualty description' },
      { name: 'status', type: 'enum', description: 'ACTIVE, RESPONDING, RESOLVED' },
      { name: 'reported_at', type: 'timestamp', description: 'Incident declaration timestamp' },
      { name: 'assigned_team', type: 'string', description: 'Dispatched response team (e.g. Maitri Medical Team)' },
      { name: 'personnel_id', type: 'string', description: 'Affected casualty personnel ID' },
      { name: 'expedition_id', type: 'string', description: 'Related expedition if incident occurred during field mission' },
    ],
  },
  activityLog: {
    label: 'Activity Log',
    idPrefix: 'A-',
    description: 'Audit log of recent operational actions, movements, alerts, and adjustments',
    fields: [
      { name: 'id', type: 'string', description: 'Activity event ID' },
      { name: 'at', type: 'timestamp', description: 'Event ISO timestamp' },
      { name: 'kind', type: 'string', description: 'EXPEDITION, PERSONNEL, CARGO, INVENTORY, EMERGENCY' },
      { name: 'message', type: 'string', description: 'Human-readable action description' },
    ],
  },
}

export const PROJECT_ROLES = [
  {
    role: 'ADMIN',
    label: 'System Administrator',
    description: 'Complete operational authorization. Can modify all entities, manage users, and resolve emergencies.',
    canManage: true,
    canRespond: true,
  },
  {
    role: 'COORDINATOR',
    label: 'Operations Coordinator',
    description: 'Coordinates expedition schedules, monitors personnel telemetry, and responds to active incidents.',
    canManage: true,
    canRespond: true,
  },
  {
    role: 'LOGISTICS',
    label: 'Logistics Officer',
    description: 'Manages cargo manifests, inventory thresholds, stock adjustments, and equipment replenishment.',
    canManage: true,
    canRespond: false,
  },
  {
    role: 'SCIENTIST',
    label: 'Field Scientist',
    description: 'Read-only access to operational consoles and telemetry. Has full authority to declare emergency incidents.',
    canManage: false,
    canRespond: false,
  },
]

/**
 * TRILINGUAL POLAR DOMAIN KNOWLEDGE BASE
 * =======================================
 * Detailed operational protocols, technical architecture, flight safety limits,
 * station histories, and treaties available in English, Hinglish, and Hindi.
 */
export const POLAR_DOMAIN_KNOWLEDGE = {
  continuousTileLayer: {
    en: `### 🗺️ ContinuousTileLayer & Omnidirectional 360° Map Architecture
The **ContinuousTileLayer** is a custom Leaflet tile layer extension (\`ContinuousTileLayer = L.TileLayer.extend({...})\`) engineered to resolve Web Mercator polar edge limitations:

1. **Dual-Axis Continuous Wrapping**: Normal Leaflet layers only wrap horizontally ($X$ longitude). ContinuousTileLayer registers \`_wrapX = [0, 2^z]\` and \`_wrapY = [0, 2^z]\` in \`_resetGrid\`, wrapping both horizontal and vertical tile grid indices modulo $2^z$.
2. **Infinite Drag & Zero Blue Voids**: Standard Mercator clamps latitude at $\\pm 85.0511^\\circ$, causing unrendered solid blue blanks when dragging towards polar theaters. ContinuousTileLayer computes bounds directly from the physical container pixel coordinates (\`map.getPixelOrigin().subtract(map._getMapPanePos())\`), rendering tiles seamlessly in every direction.
3. **Cartographic Corridors**: Renders strategic dashed flight and maritime transit corridors (DROMLAN air-bridge, Cape Town maritime resupply, Maitri overland traverse, and Svalbard corridor).
4. **8-Direction Tactical Navigator**: Includes single-click HUD compass panning buttons (N, NE, E, SE, S, SW, W, NW) and a recenter world button (\`⌖\`).`,
    hinglish: `### 🗺️ ContinuousTileLayer aur 360° Omnidirectional Map Architecture
**ContinuousTileLayer** ek custom Leaflet extension hai jo map par infinite continuous scrolling provide karta hai:

1. **Dual-Axis Wrapping**: Standard Leaflet sirf horizontal ($X$) wrap karta hai. ContinuousTileLayer $X$ aur $Y$ dono axes ko modulo $2^z$ wrap karta hai.
2. **Zero Blue Voids**: Jab aap map ko upar ya neeche drag karte hain, to traditional blue void (khali neela area) bilkul nahi aata. Har disha mein tiles continuously load hoti hain.
3. **Operational Corridors**: Strategic supply routes display karta hai—DROMLAN airbridge, Cape Town se Antarctic sea-route, aur Schirmacher overland convoy.
4. **8-Direction D-Pad Controls**: Screen par 8-direction navigation pad diya gaya hai jisse ek click mein kisi bhi disha mein pan kar sakte hain.`,
    hi: `### 🗺️ कंटीन्यूअस टाइल लेयर (ContinuousTileLayer) और 360° सर्वदिशात्मक मानचित्र
**ContinuousTileLayer** एक उन्नत लीफ़लेट (Leaflet) एक्सटेंशन है जिसे ध्रुवीय क्षेत्रों में मानचित्र नेविगेशन को सुगम बनाने के लिए तैयार किया गया है:

1. **दोहरी-अक्ष रैपिंग (Dual-Axis Wrapping)**: सामान्य मानचित्र केवल क्षैतिज रूप से घूमते हैं। यह प्रणाली $X$ और $Y$ दोनों अक्षों पर टाइल्स को मॉड्यूलो $2^z$ घुमाती है।
2. **शून्य नीला रिक्त स्थान (Zero Blue Voids)**: ऊपर या नीचे स्क्रॉल करने पर कोई भी खाली नीला स्थान नहीं आता। मानचित्र सभी दिशाओं में निरंतर लोड होता है।
3. **रणनीतिक गलियारे (Operational Corridors)**: यह वायु और समुद्री आपूर्ति मार्गों (जैसे ड्रोमलन एयरब्रिज, केप टाउन समुद्री मार्ग और मैत्री ओवरलैंड कॉन्वॉय) को प्रदर्शित करता है।
4. **8-दिशात्मक नेविगेटर**: स्क्रीन पर कम्पास डी-पैड है जिससे 8 दिशाओं में एक क्लिक से पैन किया जा सकता है।`
  },

  globeView: {
    en: `### 🌐 Realistic 3D WebGL Globe Console
The **GlobeView** module provides an interactive 3D spherical Earth rendered using **Three.js** and WebGL:

1. **True Spherical Geometry**: Built on a high-precision sphere (\`SphereGeometry\`, radius: 120), correctly foreshortening distant horizons when rotating toward polar theaters.
2. **Realistic Visual Layers**: High-resolution procedural ocean canvas texture with bathymetric color depth, tactical graticule latitude/longitude grid lines, glowing atmospheric rim back-side shader, and procedural 1,200-star space starfield.
3. **Interactive 3D Telemetry Pins**: Projects real-time 3D markers normal to the spherical surface for stations, field camps, deployed personnel, and emergency incidents.
4. **Cinematic Flight Camera**: Features smooth quaternion interpolation for flying to target coordinates (\`flyToCoords\`) when inspecting bases or incidents.`,
    hinglish: `### 🌐 3D WebGL Interactive Globe View
**GlobeView** ek hardware-accelerated 3D WebGL sphere hai jo **Three.js** par chalta hai:

1. **Realistic Earth Geometry**: True 3D sphere par ocean bathymetry, atmospheric glow, aur space starfield render karta hai.
2. **Live 3D Telemetry Pins**: Sabhi research stations, field personnel, aur emergency incidents 3D marker pins ke roop mein globe ki surface par dikhte hain.
3. **Smooth Camera Flight**: Kisi bhi station ya incident par click karne par camera smoothly rotate hokar us theater par zoom kar leta hai.
4. **Atmospheric Shader**: Earth ke kinare par realistic atmospheric scattering aur glowing aura effect diya gaya hai.`,
    hi: `### 🌐 यथार्थवादी 3D वेबजीएल ग्लोब (3D Globe View)
**GlobeView** एक हार्डवेयर-एक्सेलरेटेड 3D वेबजीएल कंसोल है जो **Three.js** द्वारा संचालित है:

1. **यथार्थवादी गोलाकार ज्यामिति**: यह उच्च-सटीक 3D गोले पर महासागरीय गहराई (Bathymetry), वायुमंडलीय चमक और अंतरिक्ष स्टारफील्ड को प्रस्तुत करता है।
2. **सजीव 3D टेलीमेट्री पिन**: सभी अनुसंधान स्टेशन, तैनात कार्मिक और आपातकालीन घटनाएं 3D पिन के रूप में ग्लोब पर दिखाई देते हैं।
3. **सिनेमैटिक कैमरा फ्लाइट**: किसी भी स्टेशन या घटना का चयन करने पर कैमरा सुचारू रूप से घूमकर सीधे उस स्थान पर केंद्रित हो जाता है।`
  },

  techStack: {
    en: `### 💻 Polar Command Center Technology Stack & Architecture
The Polar Command Center is engineered as an enterprise-grade, mission-critical operations console:

• **Frontend Core**: React 18 (Concurrent Mode) + Vite 8 (sub-second HMR & optimized production bundling).
• **Cartography & 3D**: Leaflet 1.9.4 with custom ContinuousTileLayer + Three.js r186 hardware-accelerated WebGL Globe.
• **State Management**: Zero-dependency unified \`DataContext\` & \`AuthContext\` ensuring single-source-of-truth across all 8 modules.
• **Data & Offline Sync**: Supabase (PostgreSQL with RLS) with instant fallback to built-in \`demoData\`, plus offline storage queue in \`emergencyStorage.js\`.
• **Styling**: Tailwind CSS v3.4 + semantic Polar Design Tokens (Oswald, Inter, JetBrains Mono) supporting instant Dark/Light mode switching.
• **Audio Alerts**: Web Audio API algorithmic dual-tone synthesizer (\`audioAlert.js\`) with user-gesture auto-unlock.
• **AI Operations Assistant**: Portable Polar AI Assistant with bilingual/trilingual semantic reasoning, multi-turn context, and local fallback engine.`,
    hinglish: `### 💻 Polar Command Center Tech Stack
Polar Command Center ka technical architecture:

• **Frontend**: React 18 + Vite (super-fast performance aur module bundling).
• **Mapping & 3D**: Leaflet GIS engine (ContinuousTileLayer ke sath) + Three.js 3D WebGL Globe.
• **State Architecture**: React Context API (\`DataContext\` aur \`AuthContext\`) jo sabhi 8 modules ko bina page reload synchronise rakhta hai.
• **Database & Sync**: Supabase PostgreSQL + Offline demo data fallback + local offline message queue.
• **Styling**: Tailwind CSS + Custom Polar Design System (Light aur Dark mode dono supported).
• **Audio Alert System**: Web Audio API two-tone distress radio sound generator.
• **AI Assistant**: Standalone Portable Polar AI Assistant jo English, Hindi aur Hinglish teeno mein operate karta hai.`,
    hi: `### 💻 पोलर कमांड सेंटर तकनीकी संरचना (Tech Stack)
पोलर कमांड सेंटर की तकनीकी संरचना:

• **फ़्रंटएंड**: React 18 + Vite (अत्यंत तीव्र प्रदर्शन और प्रतिक्रिया)।
• **मानचित्रण व 3D**: लीफ़लेट (ContinuousTileLayer सहित) + Three.js 3D वेबजीएल ग्लोब।
• **स्टेट प्रबंधन**: React Context API (\`DataContext\` और \`AuthContext\`) जिससे सभी 8 मॉड्यूल आपस में जुड़े रहते हैं।
• **डेटाबेस व ऑफ़लाइन सिंक**: Supabase PostgreSQL + स्थानीय डेमो डेटा फॉलबैक + ऑफ़लाइन संदेश कतार।
• **डिज़ाइन**: Tailwind CSS + पोलर डिज़ाइन टोकन (डार्क और लाइट मोड दोनों उपलब्ध)।
• **ऑडियो चेतावनी**: Web Audio API द्वारा संचालित आपातकालीन टू-टोन सायरन।
• **एआई सहायक**: स्टैंडअलोन पोर्टेबल पोलर एआई असिस्टेंट (अंग्रेजी, हिंदी और हिंग्लिश में सक्षम)।`
  },

  offlineSync: {
    en: `### 📡 Offline Synchronization & Operational Resiliency
The console is built for extreme polar environments with intermittent satellite links:

1. **Dual-Mode Persistence**: If Supabase is unreachable, the system instantly switches to local demo state without throwing errors or breaking UI.
2. **Offline Emergency Message Queue**: Radio and SOS messages sent while offline are serialized in \`safeStorage\` (with memory fallback). When connection is restored, \`flushOfflineQueue()\` delivers them automatically.
3. **Non-Volatile Chat History**: AI conversation history is preserved in \`sessionStorage\` across tab reloads.
4. **Audio Context Resiliency**: Automatically registers \`pointerdown\` and \`keydown\` listeners to resume suspended Web Audio contexts on user interaction.`,
    hinglish: `### 📡 Offline Synchronization aur Resiliency
Polar environments mein satellite link unstable hota hai, isliye ye system fully offline-resilient banaya gaya hai:

1. **Automatic Demo Fallback**: Agar Supabase cloud database down ho jaye, to system bina ruke local demo data par switch ho jata hai.
2. **Offline SOS Message Queue**: Network na hone par bheje gaye messages \`emergencyStorage\` queue mein save ho jate hain aur network aate hi deliver ho jate hain.
3. **In-Memory Storage Guard**: Private browsing mode mein localStorage block hone par in-memory store use hota hai, taaki app crash na ho.`,
    hi: `### 📡 ऑफ़लाइन सिंक्रोनाइज़ेशन और विश्वसनीयता
ध्रुवीय क्षेत्रों में उपग्रह संचार रुकने पर भी सिस्टम निरंतर काम करता है:

1. **स्वचालित डेमो फॉलबैक**: यदि क्लाउड डेटाबेस अनुपलब्ध हो, तो सिस्टम तुरंत स्थानीय डेमो डेटा पर स्विच हो जाता है और स्क्रीन कभी क्रैश नहीं होती।
2. **ऑफ़लाइन संदेश कतार (Message Queue)**: ऑफ़लाइन स्थिति में भेजे गए आपातकालीन संदेश सुरक्षित रहते हैं और नेटवर्क बहाल होते ही प्रसारित हो जाते हैं।
3. **मेमोरी सुरक्षा**: प्राइवेट ब्राउज़िंग में भी इन-मेमोरी बैकअप सुनिश्चित करता है कि कोई एरर न आए।`
  },

  flightLimits: {
    en: `### ✈️ Polar Flight Operations & Aviation Safety Envelopes (COMNAP / DGCA)
Standard operating minimums and flight envelopes for Antarctic and Arctic air sorties:

| Aircraft Type | Minimum Visibility | Cloud Ceiling | Max Sustained Wind | Max Peak Gusts | Max Crosswind | Min Airframe Temp |
|---|---|---|---|---|---|---|
| **DHC-6 Twin Otter (Ski)** | **≥ 5.0 km** | **≥ 1,000 ft AGL** | **35 kt (65 km/h)** | **45 kt (83 km/h)** | **25 kt (46 km/h)** | **-45°C** |
| **Basler BT-67 (Ski/Wheel)** | **≥ 5.0 km** | **≥ 1,000 ft AGL** | **35 kt (65 km/h)** | **45 kt (83 km/h)** | **25 kt (46 km/h)** | **-45°C** |
| **Kamov Ka-32 / Bell 412 (Helo)** | **≥ 3.0 km** | **≥ 500 ft AGL** | **30 kt (55 km/h)** | **40 kt (74 km/h)** | **20 kt (37 km/h)** | **-35°C** |

**Flight Safety & Operational Directives:**
1. **Flat Light / Whiteout Protocol:** If surface definition degrades to Grade 4/5 (inability to distinguish sastrugi, snow slope, or horizon), sorties must immediately abort and divert to designated alternates (Novo Runway or Cape Town).
2. **Fuel Reserve Requirement:** Mandatory 45-minute IFR holding reserve fuel plus divert burn calculation for all inter-station flights.
3. **Emergency Survival Cache:** Every aircraft must carry 14 days of freeze-dried emergency rations, polar survival bivvy shelters, and twin 406 MHz COSPAS-SARSAT beacons.
4. **Cold-Soak Pre-Heat SOP:** At ambient temperatures < -20°C, Hermann Nelson forced-air engine pre-heaters must run for 45 minutes prior to cranking PT6A-34 turboprops.

[Inspect Weather Matrix -> weather] · [Review Active Incidents -> emergency]`,
    hinglish: `### ✈️ Polar Flight Safety Limits (Twin Otter, Basler aur Helicopter)
Antarctic aur Arctic flight operations ke authoritative safety minimums (COMNAP / DGCA standards):

| Aircraft Type | Minimum Visibility | Cloud Ceiling | Max Sustained Wind | Max Gusts | Max Crosswind |
|---|---|---|---|---|---|
| **DHC-6 Twin Otter (Ski)** | **≥ 5.0 km** | **≥ 1,000 ft** | **35 kt (65 km/h)** | **45 kt (83 km/h)** | **25 kt (46 km/h)** |
| **Basler BT-67 (Ski/Turboprop)** | **≥ 5.0 km** | **≥ 1,000 ft** | **35 kt (65 km/h)** | **45 kt (83 km/h)** | **25 kt (46 km/h)** |
| **Helicopter (Kamov Ka-32 / Bell)** | **≥ 3.0 km** | **≥ 500 ft** | **30 kt (55 km/h)** | **40 kt (74 km/h)** | **20 kt (37 km/h)** |

**Operational Directives:**
• **Flat Light Rule**: Agar sastrugi ya horizon dikhna band ho jaye to flight turant abort karke safe alternate runway (Novo Runway / Cape Town) divert karni hoti hai.
• **Mandatory Survival Kit**: Aircraft mein 14 din ka emergency survival ration aur dual satellite beacons hona anivarya hai.
• **Engine Pre-Heat**: -20°C se neeche turbine engine ko Hermann Nelson hot-air heater se 45 minute pre-heat karna mandatory hai.

[Inspect Weather Matrix -> weather] · [Review Active Incidents -> emergency]`,
    hi: `### ✈️ ध्रुवीय उड़ान सुरक्षा नियम व विमान सीमाएं (COMNAP / DGCA)
अंटार्कटिक और आर्कटिक वायु अभियानों के लिए अनिवार्य सुरक्षा मापदंड:

| विमान का प्रकार | न्यूनतम दृश्यता | बादलों की न्यूनतम ऊंचाई | अधिकतम निरंतर हवा | अधिकतम झोंके (Gusts) | क्रॉसविंड सीमा |
|---|---|---|---|---|---|
| **ट्विन ओटर (Twin Otter DHC-6)** | **≥ 5.0 किमी** | **≥ 1,000 फीट** | **35 नॉट (65 किमी/घंटा)** | **45 नॉट (83 किमी/घंटा)** | **25 नॉट** |
| **बासलर (Basler BT-67)** | **≥ 5.0 किमी** | **≥ 1,000 फीट** | **35 नॉट (65 किमी/घंटा)** | **45 नॉट (83 किमी/घंटा)** | **25 नॉट** |
| **हेलिकॉप्टर (Kamov Ka-32)** | **≥ 3.0 किमी** | **≥ 500 फीट** | **30 नॉट (55 किमी/घंटा)** | **40 नॉट (74 किमी/घंटा)** | **20 नॉट** |

**महत्वपूर्ण उड़ान सुरक्षा निर्देश:**
• **फ्लैट लाइट / व्हाइटआउट नियम**: यदि सतह का कंट्रास्ट समाप्त हो जाए (सास्ट्रूगी या क्षितिज न दिखे), तो उड़ान तत्काल रद्द कर वैकल्पिक रनवे (नोवो / केप टाउन) पर डाइवर्ट करें।
• **आपातकालीन किट**: प्रत्येक विमान में 14 दिनों का आपातकालीन सूखा राशन और उपग्रह आपातकालीन बीकन होना अनिवार्य है।
• **इंजन प्री-हीट**: -20°C से कम तापमान पर इंजन को चालू करने से पूर्व 45 मिनट तक गर्म हवा से प्री-हीट करना आवश्यक है।

[Inspect Weather Matrix -> weather] · [Review Active Incidents -> emergency]`
  },

  blizzardSOP: {
    en: `### 🚨 Whiteout / Blizzard Condition 1 Protocol (SOP-BLZ-01)
**Condition 1 Activation Thresholds:** Visibility < 50m, Sustained winds > 55 kt (102 km/h), or Wind Chill < -60°C.

**Immediate Command Directives:**
1. **Total Station Lock-in:** Halt all exterior movement, science sorties, and equipment checks immediately.
2. **Accountability Muster:** Conduct 100% headcount roll call across all habitat modules within 15 minutes.
3. **Rig Lifelines:** If inter-module transit is strictly necessary for life support, use clipped dual-carabiner tether ropes. Never walk unroped.
4. **SATCOM & Radio Schedules:** Switch handheld VHF/UHF to Emergency Channel 16 / Polar Simplex 1; initiate mandatory hourly check-in with field traverses.
5. **HVAC & Generator Safeguard:** Switch generator intakes to recirculating snow-hood baffles to prevent katabatic spindrift air-filter choking.
6. **Medical Standby:** Prepare rewarming hypothermia triage zone in the station surgical bay.

[Navigate to Emergency Response -> emergency] · [Check Live Weather -> weather]`,
    hinglish: `### 🚨 Whiteout / Blizzard Condition 1 Protocol (SOP-BLZ-01)
**Condition 1 Thresholds:** Visibility < 50m, Wind > 55 knots (102 km/h), ya Wind Chill < -60°C.

**Immediate Command Directives:**
1. **Total Station Lock-in**: Bahar nikalna turant ban. Sabhi field sorties aur equipment checks instantly halt.
2. **Accountability Muster**: 15 minute ke andar sabhi habitat modules mein 100% headcount roll call complete karein.
3. **Safety Lifelines**: Modules ke beech movement strictly clipped dual-carabiner tether ropes ke sath hi hogi. Kabhie unroped na chalein.
4. **Emergency Radio**: VHF/UHF Channel 16 / Polar Simplex 1 par switch karein aur hourly check-in shuru karein.
5. **Generator Protection**: Katabatic barf se air filter jam hone se bachane ke liye snow-hood baffles engage karein.
6. **Medical Standby**: Station medical surgical bay mein hypothermia rewarming triage ready rakhein.

[Navigate to Emergency Response -> emergency] · [Check Live Weather -> weather]`,
    hi: `### 🚨 बर्फानी तूफान कंडीशन 1 प्रोटोकॉल (SOP-BLZ-01)
**कंडीशन 1 मापदंड:** दृश्यता < 50 मीटर, हवा की गति > 55 नॉट (102 किमी/घंटा), या विंड चिल < -60°C।

**तत्काल कमान निर्देश:**
1. **पूर्ण स्टेशन लॉकडाउन**: बाहर निकलना और वैज्ञानिक फील्ड अभियान तत्काल प्रभाव से बंद करें।
2. **कार्मिक गणना (100% Muster)**: 15 मिनट के भीतर सभी आवास मॉड्यूल में कर्मियों की उपस्थिति सत्यापित करें।
3. **लाइफलाइन का उपयोग**: मॉड्यूल के बीच आवागमन केवल दोहरी-कैराबिनर बंधी सुरक्षा रस्सियों (लाइफलाइन) द्वारा ही अनुमत है।
4. **रेडियो चैनल**: आपातकालीन वीएचएफ चैनल 16 / पोलर सिम्प्लेक्स 1 पर संपर्क स्थापित कर प्रति घंटे रिपोर्टिंग सुनिश्चित करें।
5. **जनरेटर सुरक्षा**: इंजन में बर्फ का पाउडर जमने से रोकने के लिए स्नो-हुड बैफल्स सक्रिय करें।
6. **चिकित्सा तैयारी**: स्टेशन मेडिकल बे में हाइपोथर्मिया ट्राइएज क्षेत्र तैयार रखें।

[Navigate to Emergency Response -> emergency] · [Check Live Weather -> weather]`
  },

  crevasseSOP: {
    en: `### 🚨 Crevasse Fall & Technical Rescue Protocol (SOP-CRV-02)
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
    hinglish: `### 🚨 Crevasse Fall & Rescue Protocol (SOP-CRV-02)
**Crevasse (barf ki darar) mein girne par rescue protocol:**
1. **Anchor System**: Vehicle turant brake lagaye; 45° opposing angle par do 90cm aluminum snow pickets drive karke deadman anchor rig karein.
2. **Contact & ABC**: Casualty ko radio aur thermal bivvy bag neeche bhejein; Airway, Breathing, Consciousness check karein.
3. **Mechanical Advantage Haul (3:1 Z-Rig)**:
   - 3:1 Z-Rig ya 6:1 compound pulley system deploy karein progress capture prusiks ke sath.
   - Rassi barf mein na kaate isliye crevasse lip par edge-roller lagayein.
4. **Suspension Trauma Guard**: Casualty agar 30 min se zyada latka tha to use turant flat na litayein (knees bent rakhein). Active chemical heat pads aur vapor barrier mein wrap karein.

[Report Crevasse Incident -> emergency] · [View Expeditions -> expeditions]`,
    hi: `### 🚨 हिमदरार (Crevasse) बचाव प्रोटोकॉल (SOP-CRV-02)
**हिमदरार में गिरने पर तकनीकी बचाव प्रक्रिया:**
1. **एंकर स्थापित करें**: वाहन ऑपरेटर तुरंत ब्रेक लगाएं; 45° के विरोधी कोण पर दो 90 सेमी एल्यूमीनियम स्नो पिकेट्स गाड़कर मुख्य एंकर तैयार करें।
2. **संपर्क स्थापित करें**: घायल व्यक्ति तक वीएचएफ रेडियो और थर्मल बैग पहुंचाएं; श्वसन (ABC) और चोट की स्थिति जांचें।
3. **हॉलिंग सिस्टम (3:1 Z-Rig)**:
   - 3:1 Z-रिग अथवा 6:1 कंपाउंड पुली सिस्टम तैयार करें।
   - रस्सी को बर्फ में धंसने से बचाने के लिए किनारे पर एज-रोलर या स्की पोल लगाएं।
4. **सस्पेंशन ट्रॉमा से बचाव**: यदि व्यक्ति 30 मिनट से अधिक लटका रहा हो तो उसे तुरंत सीधा न लिटाएं। रासायनिक हीट पैड और थर्मल बैग में लपेटकर तुरंत सर्जिकल बे में स्थानांतरित करें।

[Report Crevasse Incident -> emergency] · [View Expeditions -> expeditions]`
  },

  frostbiteSOP: {
    en: `### ❄️ Severe Frostbite & Hypothermia Treatment Stages (SOP-MED-03)
**Clinical Staging & Intervention Protocol:**

| Hypothermia Stage | Core Temp / Clinical Presentation | Emergency Clinical Action Protocol |
|---|---|---|
| **Stage I (Mild)** | 32°C – 35°C (Violent shivering, alert, sluggish speech) | Dry windproof clothing, heated sleeping bag, warm high-calorie sweet glucose drinks. |
| **Stage II (Moderate)** | 28°C – 32°C (Shivering ceases, confusion, apathy, stupor) | Active external trunk rewarming (forced-air blanket, chemical heat packs to axilla/groin). Handle very gently. |
| **Stage III (Severe)** | < 28°C (Unconscious, rigid, severe bradycardia) | **High VFib Risk:** Avoid jostling. Warm humidified O₂, heated IV normal saline (40°C–42°C), urgent tele-consult with AFMC Pune / AIIMS. |

**Frostbite Tissue Management:**
- **NEVER** rub frozen tissue with snow, ice, or dry radiated heat.
- **NEVER** initiate thawing in the field if there is ANY risk of refreezing during transit.
- **Rapid Rewarming Water Bath:** Submerge affected extremities in agitated water maintained at **37°C – 39°C** for 30–45 minutes until skin is flush and pliable.
- Apply sterile aloe vera dressing and loose non-adherent gauze between digits. Administer oral ibuprofen for antiprostaglandin anti-inflammatory action.

[Open Medical Roster -> personnel] · [Emergency Dispatch -> emergency]`,
    hinglish: `### ❄️ Frostbite aur Hypothermia Treatment Stages (SOP-MED-03)
**Clinical Classification aur Medical Protocols:**

| Stage | Core Body Temp / Lakshan | Treatment Protocol |
|---|---|---|
| **Mild (Stage 1)** | 32°C – 35°C (Tez kapkapi, hosh mein) | Dry kapde, warm sweet drinks, sleeping bag mein passive rewarming. |
| **Moderate (Stage 2)** | 28°C – 32°C (Kapkapi band, behoshi jaisa) | Active trunk rewarming (axilla aur groin par chemical heat packs). Gentle handling. |
| **Severe (Stage 3)** | < 28°C (Behosh, heart attack / VFib risk) | Rough movement na karein. Warm humidified oxygen, 40°C-42°C heated IV saline, AFMC Pune tele-consult. |

**Frostbite Wound Care Rules:**
• Barf ya haathon se kabhie rub na karein!
• Refreezing ka risk ho to transit ke dauran thaw na karein.
• **Water Bath**: Affected hisse ko **37°C – 39°C** gungune paani mein 30-45 minute submerge karein.
• Ungliyon ke beech sterile gauze lagayein aur aloe vera dressing dein; inflammation ke liye ibuprofen dein.

[Open Medical Roster -> personnel] · [Emergency Dispatch -> emergency]`,
    hi: `### ❄️ शीतदंश (Frostbite) और हाइपोथर्मिया उपचार चरण (SOP-MED-03)
**नैदानिक वर्गीकरण एवं उपचार प्रोटोकॉल:**

| हाइपोथर्मिया चरण | शरीर का आंतरिक तापमान / लक्षण | आपातकालीन चिकित्सा प्रोटोकॉल |
|---|---|---|
| **स्टेज 1 (हल्का)** | 32°C – 35°C (तीव्र कंपकंपी, सचेत, धीमी बोली) | सूखे कपड़े, गर्म स्लीपिंग बैग, उच्च कैलोरी युक्त गर्म मीठा पेय। |
| **स्टेज 2 (मध्यम)** | 28°C – 32°C (कंपकंपी रुकना, भ्रम, सुस्ती) | धड़ की सक्रिय री-वार्मिंग (बगल और कमर पर केमिकल हीट पैक लगाएं)। सावधानीपूर्वक संभालें। |
| **स्टेज 3 (गंभीर)** | < 28°C (बेहोशी, नाड़ी मंद, कार्डियक अरेस्ट का खतरा) | **सावधानी:** हिलाएं-डुलाएं नहीं। गर्म नम ऑक्सीजन, 40°C-42°C गर्म आईवी सलाइन, एएफएमसी पुणे से टेली-परामर्श। |

**शीतदंश (Frostbite) घाव प्रबंधन:**
• प्रभावित त्वचा को कभी भी बर्फ या हाथों से न रगड़ें।
• मार्ग में पुनः जमने का खतरा हो तो रास्ते में डी-फ्रॉस्ट न करें।
• **री-वार्मिंग बाथ**: प्रभावित अंग को **37°C – 39°C** के गुनगुने पानी में 30–45 मिनट तक रखें जब तक त्वचा कोमल न हो जाए।
• उंगलियों के बीच स्टेराइल गॉज लगाएं और सूजन कम करने हेतु इबुप्रोफेन दें।

[Open Medical Roster -> personnel] · [Emergency Dispatch -> emergency]`
  },

  generatorSOP: {
    en: `### ⚡ Station Generator Failure & Heating Loss Protocol (SOP-ENG-04)
**Critical Countdown:** Indoor thermal envelope drops below 0°C within 3–5 hours without central hydronic heating.

**Emergency Power Recovery Procedures:**
1. **Auto-Failover Verification:** Confirm secondary 250 kVA Caterpillar/Cummins diesel generator took the station bus bar within 30 seconds.
2. **Manual Cold-Start Sequence:** If auto-start failed, dispatch two engineering mechanics with pre-heated ether/glow-plug booster packs.
3. **Life Support Load Shedding Hierarchy:**
   - Immediately cut non-essential circuits: science labs, drill containers, satellite uplinks, and exterior floodlights.
   - Maintain 100% bus capacity strictly dedicated to: **Habitation Module HVAC**, **Priyadarshini Lake trace-heating**, and **Station Surgical Bay**.
4. **Water Pipeline Protection:** If Lake Priyadarshini water pump line drops below +2°C, activate emergency drain valves to prevent ice rupturing 1.2 km of insulated heat-traced pipeline.

[Inspect Engineering Inventory -> inventory] · [View Station Matrix -> weather]`,
    hinglish: `### ⚡ Generator Failure & Power Outage SOP (SOP-ENG-04)
**Thermal Threat:** Central heating band hone par station ka internal temperature 3-5 ghante mein 0°C se neeche gir jata hai.

**Emergency Power Recovery Steps:**
1. **Auto-Transfer**: Verify karein ki secondary 250 kVA diesel generator 30 seconds mein bus bar par aaya ya nahi.
2. **Manual Start**: Auto-start fail hone par engineering mechanics ko glow-plug booster aur pre-heated ether ke sath dispatch karein.
3. **Load Shedding**: Labs, drilling rig, aur exterior lights turant cut karein. Sirf Living Quarters HVAC, Priyadarshini water line heating, aur Medical Bay chalu rakhein.
4. **Lake Line Drain**: Agar Priyadarshini fresh water pipe ka temp +2°C se neeche jaye, to turant drain valve open karein taaki 1.2 km lambi pipeline burst na ho.

[Inspect Engineering Inventory -> inventory] · [View Station Matrix -> weather]`,
    hi: `### ⚡ जनरेटर विफलता और हीटिंग सुरक्षा प्रोटोकॉल (SOP-ENG-04)
**तापीय संकट:** हीटिंग रुकने पर स्टेशन का तापमान 3-5 घंटे के भीतर शून्य से नीचे गिर जाता है।

**आपातकालीन बिजली बहाली प्रक्रिया:**
1. **ऑटो-ट्रांसफर सत्यापन**: जांचें कि द्वितीयक 250 kVA डीजल जनरेटर 30 सेकंड में बस बार पर चालू हुआ या नहीं।
2. **मैनुअल स्टार्ट**: ऑटो-स्टार्ट विफल होने पर इंजीनियर प्री-हीटेड ईथर व ग्लो-प्लग बूस्टर के साथ जनरेटर चालू करें।
3. **लोड शेडिंग**: प्रयोगशालाओं, ड्रिलिंग रिग और बाहरी रोशनी को तुरंत बंद करें। केवल मुख्य आवास हीटिंग, प्रियदर्शिनी पाइपलाइन और मेडिकल बे को बिजली दें।
4. **पाइपलाइन सुरक्षा**: यदि प्रियदर्शिनी ताजे पानी की लाइन का तापमान +2°C से नीचे गिरे, तो तुरंत ड्रेन वाल्व खोलें ताकि 1.2 किमी पाइपलाइन बर्फ से फटने से बच सके।

[Inspect Engineering Inventory -> inventory] · [View Station Matrix -> weather]`
  },

  fireSOP: {
    en: `### 🔥 Habitat Fire & Smoke Suppression Protocol (SOP-SAF-06)
**Extreme Hazard:** Sub-zero external air produces hyper-dry indoor humidity (15–20%), causing near-explosive flame propagation in enclosed modules.

**Emergency Fire Procedures:**
1. **Alarm & Zone Isolation:** Trip master alarm; automatic magnetic fire doors seal the affected module within 15 seconds.
2. **HVAC Air Cutoff:** Immediately trip ventilation fans to starve combustion of fresh oxygen.
3. **Suppression Agents:** Discharge Clean Agent (FM-200 / Inergen / Novec 1230) gas flooding in mechanical spaces; deploy dry chemical ABC powder extinguishers. **NEVER use plain water** near high-voltage heating banks or fuel lines.
4. **Muster & Thermal Protection:** Evacuate to Emergency Survival Shelter / Living Annex within 3 minutes. **Mandatory:** All personnel must don full ECW (Extreme Cold Weather) parkas before exiting into sub-zero exterior.

[Open Emergency Response -> emergency]`,
    hinglish: `### 🔥 Station Fire Suppression Protocol (SOP-SAF-06)
**Hazard**: Polar dry air (15-20% humidity) ki wajah se aag modules mein explosive speed se failti hai.

1. **Alarm & Isolation**: Master fire alarm bajayein; magnetic fire doors 15 seconds mein seal ho jayenge.
2. **Air Cutoff**: HVAC ventilation turant shut karein taaki aag ko oxygen na mile.
3. **Suppression**: Clean Agent (FM-200/Inergen) gas flooding aur dry powder extinguishers use karein. Paani jamne aur high voltage hone ki wajah se water hoses use nahi hote.
4. **Muster with ECW**: Sabhi log 3 minute mein secondary emergency shelter mein evacuate karein. Bahar sub-zero cold mein nikalne se pehle Extreme Cold Weather (ECW) parkas pehanna anivarya hai.

[Open Emergency Response -> emergency]`,
    hi: `### 🔥 आवास अग्नि शमन और निकासी प्रोटोकॉल (SOP-SAF-06)
**जोखिम:** ध्रुवीय शुष्क हवा (15-20% आर्द्रता) के कारण संलग्न कमरों में आग अत्यंत तीव्र गति से फैलती है।

1. **अलार्म और आइसोलेशन**: मुख्य फायर अलार्म चालू करें; स्वचालित फायर दरवाजे 15 सेकंड में प्रभावित कमरे को सील कर देंगे।
2. **वेंटिलेशन बंद**: ऑक्सीजन की आपूर्ति रोकने के लिए एचवीएसी वेंटिलेशन तुरंत बंद करें।
3. **शमन एजेंट**: क्लीन एजेंट (FM-200/Inergen) गैस फ्लडिंग और ड्राई केमिकल पाउडर का उपयोग करें। पानी कभी न डालें।
4. **निकासी व थर्मल सुरक्षा**: 3 मिनट के भीतर द्वितीयक आश्रय में एकत्र हों। बाहर निकलने से पहले पूर्ण ईसीडब्ल्यू (ECW) ध्रुवीय जैकेट पहनना अनिवार्य है।

[Open Emergency Response -> emergency]`
  },

  fuelSOP: {
    en: `### ⛽ Polar Fuel Contamination & Paraffinization SOP (SOP-ENG-05)
**Fuel Specification:** Stations require Polar-Grade Kerosene-Diluted Diesel (D-A / Jet A-1 blend) with pour point < -50°C and FSII anti-icing additives.

**Contamination Symptoms:** Wax crystallization in fuel filters, engine surging, and black exhaust smoke.

**Remediation Steps:**
1. **Day-Tank Failover:** Switch engine fuel supply lines to the indoor heated reserve day-tank reservoir.
2. **Isolate Bulk Storage:** Isolate external storage bladders and run the centrifuge fuel polishing filtration unit.
3. **Filter Replacement:** Replace primary 10-micron water-separator cartridge filters.
4. **Trace-Heating:** Energize electrical trace-heating jackets on external fuel transfer lines.

[Inspect Fuel Stock -> inventory]`,
    hinglish: `### ⛽ Polar Fuel Freezing & Filter Care (SOP-ENG-05)
1. **Fuel Specification**: Antarctica mein special **Low-Wax Polar Diesel (Jet A-1 mix)** use hota hai jo -50°C tak liquid rehta hai FSII anti-icing additive ke sath.
2. **Waxing Symptoms**: Engine ka rpm fluctuate hona, filter mein white wax jamna, aur kala dhuan aana.
3. **Action Steps**:
   - Day-tanks ko indoor heated tank par switch karein.
   - Centrifuge fuel polishing unit run karein.
   - 10-micron water separator filters replace karein aur fuel trace-heating coils activate karein.

[Inspect Fuel Stock -> inventory]`,
    hi: `### ⛽ ईंधन जमने व मोम (Paraffin) से बचाव प्रोटोकॉल (SOP-ENG-05)
1. **ईंधन विनिर्देश**: अंटार्कटिका में विशेष लो-वैक्स पोलर डीजल (Jet A-1 मिश्रण) का उपयोग होता है जो FSII एडिटिव के साथ -50°C तक तरल रहता है।
2. **मोम जमने के लक्षण**: इंजन की गति में उतार-चढ़ाव, फिल्टर जाम होना और काला धुआं निकलना।
3. **उपचारात्मक कदम**:
   - ईंधन आपूर्ति को इनडोर गर्म डे-टैंक पर स्विच करें।
   - सेंट्रीफ्यूज फ्यूल पॉलिशिंग यूनिट चालू करें।
   - 10-माइक्रोन वॉटर-सेपरेटर फिल्टर बदलें और पाइपलाइन हीटिंग सक्रिय करें।

[Inspect Fuel Stock -> inventory]`
  },

  traverseSOP: {
    en: `### 🚛 Overland Traverse Protocols & Convoy Safety (SOP-TRV-07)
**Mandatory Convoy Directives (PistenBully / Kassbohrer):**
- **Convoy Rule:** Minimum 2 tracked vehicles. Solo travel outside the 2 km station perimeter is strictly prohibited.
- **Spacing:** 100m – 150m vehicle separation over glacier ice to distribute bridge loads.
- **Crevasse Radar:** Lead vehicle must operate 400 MHz Ground Penetrating Radar (GPR) boom continuously.
- **Snow Bridge Rule:** Crossing permitted only on verified bridges with snow thickness ≥ 2.5× vehicle track width.
- **Speed Limits:** Max 15 km/h over blue ice / sastrugi fields; 25 km/h on groomed snow highways.
- **Whiteout Halt:** Park vehicles 45° nose-to-tail to form a windbreak shelter and remain inside cabs.

**Pre-Traverse Departure Checklist:**
1. Ground Penetrating Radar (GPR) calibration check.
2. Winch wire integrity and opposing snow picket deadman anchors verified.
3. Auxiliary fuel sled hitched with emergency disconnect release pins.
4. Iridium satellite beacon tested and pinging headquarters every 15 minutes.
5. 30 days of freeze-dried rations and medical trauma kits loaded per vehicle.

[Track Expeditions on Map -> map] · [Expedition Details -> expeditions]`,
    hinglish: `### 🚛 Overland Traverse Safety Protocols (SOP-TRV-07)
**PistenBully Convoy Rules:**
• **Convoy Rule**: Hamesha kam se kam 2 tracked vehicles sath chalenge. Akele nikalna strictly banned hai.
• **Distance**: Gaadiyon ke beech 100m–150m spacing maintain karein taaki ice bridges par load distribute rahe.
• **GPR Radar**: Lead vehicle par 400 MHz Ground Penetrating Radar on rahega jo crevasse detect karta hai.
• **Speed Limit**: Blue ice par max 15 km/h, groomed snow par 25 km/h.
• **Whiteout Action**: Agar visibility khatam ho jaye to dono gaadiyon ko 45° nose-to-tail park karke windbreak shelter banayein aur cab ke andar rahein.

**Checklist**:
1. GPR radar test pass.
2. Aux fuel sled aur winch wire check.
3. Satellite tracker har 15 min ping kar raha ho.
4. 30 din ka emergency food aur medical trauma kit onboard ho.

[Track Expeditions on Map -> map] · [Expedition Details -> expeditions]`,
    hi: `### 🚛 ओवरलैंड काफिला सुरक्षा नियम व चेकलिस्ट (SOP-TRV-07)
**पिस्टन-बुली (PistenBully) काफिला नियम:**
• **काफिला नियम**: कम से कम दो वाहन हमेशा साथ चलेंगे। स्टेशन परिधि से बाहर अकेले यात्रा पूर्णतः वर्जित है।
• **दूरी**: बर्फ के पुलों पर भार बांटने के लिए वाहनों के बीच 100 से 150 मीटर की दूरी रखें।
• **जीपीआर रडार**: अग्रणी वाहन पर 400 मेगाहर्ट्ज ग्राउंड पेनेट्रेटिंग रडार लगातार सक्रिय रहेगा।
• **गति सीमा**: नीली बर्फ और सास्ट्रूगी पर अधिकतम 15 किमी/घंटा; ग्रूम्ड स्नो पर 25 किमी/घंटा।
• **व्हाइटआउट**: तूफान में वाहनों को 45° कोण पर आमने-सामने खड़ा कर विंडब्रेक बनाएं और केबिन के अंदर रहें।

**प्रस्थान पूर्व चेकलिस्ट:**
1. जीपीआर रडार कैलिब्रेशन।
2. विंच तार और स्नो पिकेट एंकर की जांच।
3. उपग्रह बीकन (हर 15 मिनट में सिग्नल) का सत्यापन।
4. प्रति वाहन 30 दिनों का सूखा राशन और मेडिकल ट्रॉमा किट।

[Track Expeditions on Map -> map] · [Expedition Details -> expeditions]`
  },

  maitriStation: {
    en: `### 🏔️ Maitri Research Station — Authoritative Facility Profile
• **Coordinates:** 70°45'58"S, 11°43'56"E (Elevation: 117 m MSL).
• **Geographic Sector:** Schirmacher Oasis, Queen Maud Land, East Antarctica.
• **Commissioning:** 1989 (8th Indian Scientific Expedition to Antarctica). India's oldest active permanent research station, succeeding Dakshin Gangotri.
• **Crew Capacity:** 25 wintering crew (overwintering) / up to 65 summer scientists and engineers.
• **Infrastructure & Life Support:**
  - **Power Generation:** Redundant 250 kVA Caterpillar/Cummins diesel gensets with closed-loop glycol hydronic waste-heat recovery.
  - **Freshwater Supply:** Year-round pumping from Lake Priyadarshini via 1.2 km electrically heat-traced, insulated pipelines.
  - **Environmental Systems:** Biological Membrane Bioreactor (MBR) wastewater treatment plant complying with Madrid Protocol Annex III.
  - **Communications:** Dedicated C-band and Ku-band SATCOM earth station with high-bandwidth Iridium backup.
• **Scientific Domains:** Geomagnetism, atmospheric ozone monitoring, meteorology (WMO 89514), glaciology, solid earth geophysics, and biology.

[Inspect Weather Matrix -> weather] · [View Station Roster -> personnel]`,
    hinglish: `### 🏔️ Maitri Station Profile (70.77°S, 11.73°E)
• **Location**: Schirmacher Oasis, Queen Maud Land, Antarctica (117m MSL).
• **History**: 1989 (8th ISEA) mein shuru hui; Bharat ki sabse purani active year-round research station hai.
• **Capacity**: 25 crew winter mein, 65 scientists summer mein.
• **Power & Water**: 250 kVA Cat/Cummins gensets; Lake Priyadarshini se 1.2 km lambi heat-traced pipeline se fresh water pumping.
• **Comms**: Ku-band SATCOM earth station aur satellite telemetry.
• **Research**: Ozone layer, geomagnetism, atmospheric science, aur glaciology.

[Inspect Weather Matrix -> weather] · [View Station Roster -> personnel]`,
    hi: `### 🏔️ मैत्री अनुसंधान केंद्र (Maitri Research Station)
• **भौगोलिक स्थिति**: 70°45'58"S, 11°43'56"E (ऊंचाई: 117 मीटर MSL), शिरमाकर ओएसिस, पूर्वी अंटार्कटिका।
• **स्थापना**: 1989 (8वां भारतीय अंटार्कटिक अभियान)। दक्षिण गंगोत्री के बाद भारत का सबसे पुराना सक्रिय स्थाई केंद्र।
• **क्षमता**: शीतकाल में 25 सदस्य, ग्रीष्मकाल में 65 वैज्ञानिक।
• **जीवन रक्षक प्रणाली**:
  - 250 kVA कैटरपिलर/कमिंस डीजल जनरेटर संयंत्र।
  - प्रियदर्शिनी झील से 1.2 किमी लंबी विद्युत ताप-युक्त (Heat-traced) पाइपलाइन द्वारा वर्ष भर ताजे पानी की आपूर्ति।
  - मैड्रिड प्रोटोकॉल के अनुरूप जैविक अपशिष्ट जल उपचार संयंत्र (MBR)।
  - सी-बैंड व कू-बैंड उपग्रह संचार सुविधा।
• **प्रमुख शोध**: भू-चुंबकत्व, ओजोन परत निगरानी, मौसम विज्ञान (WMO 89514), और हिमनद विज्ञान।

[Inspect Weather Matrix -> weather] · [View Station Roster -> personnel]`
  },

  bharatiStation: {
    en: `### 🏔️ Bharati Research Station — Authoritative Facility Profile
• **Coordinates:** 69°24'28"S, 76°11'14"E (Elevation: 35 m MSL).
• **Geographic Sector:** Larsemann Hills, East Antarctica (Coastal Promontory).
• **Commissioning:** 2012 (31st Indian Scientific Expedition to Antarctica).
• **Architectural Engineering:** State-of-the-art 3-story aerodynamic structure built from 134 prefabricated ISO containers, elevated on hydraulic steel stilts to prevent snowdrift burial and katabatic turbulence.
• **Crew Capacity:** 47 personnel year-round.
• **Specialized Capabilities:**
  - **ISRO Ground Station:** High-speed direct telemetry reception facility for ISRO / National Remote Sensing Centre (NRSC) Earth observation satellites (CARTOSAT, OCEANSAT, RISAT).
  - **Energy Efficiency:** Combined Heat and Power (CHP) cogeneration plant burning polar-grade fuel at near-zero emissions.
  - **Environmental Compliance:** Complete zero-liquid discharge (ZLD) greywater recycling system.
• **Scientific Domains:** Coastal oceanography, marine biology, satellite geodesy, space weather, and atmospheric sciences (WMO 89512).

[Inspect Weather Matrix -> weather] · [View Station Roster -> personnel]`,
    hinglish: `### 🏔️ Bharati Station Profile (69.41°S, 76.19°E)
• **Location**: Larsemann Hills, East Antarctica (35m MSL).
• **Commissioned**: 2012 (31st ISEA). India ki sabse modern 3-story polar station.
• **Architecture**: 134 ISO containers se banayi gayi elevated stilt building jo barf ke tufan mein nahi dabti.
• **Capacity**: 47 personnel saal bhar reh sakte hain.
• **ISRO Earth Station**: ISRO ke remote sensing satellites (Cartosat, Oceansat) se live data reception center.
• **Research**: Oceanography, marine biology, aur atmospheric weather (WMO 89512).

[Inspect Weather Matrix -> weather] · [View Station Roster -> personnel]`,
    hi: `### 🏔️ भारती अनुसंधान केंद्र (Bharati Research Station)
• **भौगोलिक स्थिति**: 69°24'28"S, 76°11'14"E (ऊंचाई: 35 मीटर MSL), लार्समैन हिल्स, पूर्वी अंटार्कटिका।
• **स्थापना**: 2012 (31वां भारतीय अंटार्कटिक अभियान)।
• **संरचनात्मक इंजीनियरिंग**: 134 प्री-फैब्रिकेटेड आईएसओ कंटेनरों से निर्मित 3-मंजिला एरोडायनामिक इमारत, जो बर्फ के तूफान में दबने से बचाने के लिए हाइड्रोलिक स्टील के खंभों (Stilts) पर स्थित है।
• **क्षमता**: 47 सदस्य वर्ष भर।
• **विशेष क्षमताएं**:
  - **इसरो ग्राउंड स्टेशन**: इसरो / राष्ट्रीय रिमोट सेंसिंग सेंटर (NRSC) के उपग्रहों (कार्टोसैट, ओशनसैट) के लिए हाई-स्पीड डेटा रिसीविंग स्टेशन।
  - पर्यावरण के अनुकूल कंबाइंड हीट एंड पावर (CHP) संयंत्र और जीरो-लिक्विड डिस्चार्ज जल पुनर्चक्रण।
• **प्रमुख शोध**: तटीय समुद्र विज्ञान, समुद्री जीव विज्ञान, उपग्रह जियोडेसी और मौसम विज्ञान (WMO 89512)।

[Inspect Weather Matrix -> weather] · [View Station Roster -> personnel]`
  },

  himadriStation: {
    en: `### 🏔️ Himadri Research Station — Arctic Scientific Base
• **Coordinates:** 78°55'N, 11°56'E.
• **Geographic Sector:** Ny-Ålesund, Spitsbergen, Svalbard, Norway (78.9°N).
• **Inauguration:** 2 July 2008 (India's premier permanent Arctic research station).
• **Scientific Mission:**
  - Arctic climate teleconnections with the Indian Monsoon system.
  - Aerosol characterization, atmospheric trace gas monitoring, and optical depth.
  - Marine microbiology and biogeochemical fjord dynamics in Kongsfjorden.
  - Mass balance and velocity measurements of Kongsvegen Glacier.

[Inspect Weather Matrix -> weather] · [View Station Roster -> personnel]`,
    hinglish: `### 🏔️ Himadri Station Profile (Arctic, 78.9°N)
• **Location**: Ny-Ålesund, Spitsbergen, Svalbard, Norway.
• **Inauguration**: 2 July 2008. Bharat ka pehla Arctic research base.
• **Mission**: Arctic climate changes ka Indian Monsoon par asar, glacier melting, atmospheric aerosol studies, aur marine microbiology.

[Inspect Weather Matrix -> weather] · [View Station Roster -> personnel]`,
    hi: `### 🏔️ हिमाद्रि अनुसंधान केंद्र (Himadri Arctic Station)
• **भौगोलिक स्थिति**: 78°55'N, 11°56'E, नी-ओलेसुंड, स्पिट्सबर्गेन, स्वालबार्ड, नॉर्वे।
• **स्थापना**: 2 जुलाई 2008। भारत का पहला स्थाई आर्कटिक अनुसंधान केंद्र।
• **वैज्ञानिक उद्देश्य**:
  - आर्कटिक जलवायु परिवर्तन का भारतीय मानसून प्रणाली पर प्रभाव।
  - एरोसोल लक्षण वर्णन और वायुमंडलीय गैस निगरानी।
  - कॉंग्सफ्योर्डन (Kongsfjorden) में समुद्री सूक्ष्म जीव विज्ञान और कॉंग्सवेगेन ग्लेशियर का अध्ययन।

[Inspect Weather Matrix -> weather] · [View Station Roster -> personnel]`
  },

  dakshinGangotri: {
    en: `### 🏛️ Dakshin Gangotri — India's Historic 1st Antarctic Station
• **Coordinates:** 70°05'S, 12°00'E.
• **Location:** Princess Astrid Coast, Queen Maud Land, Antarctica.
• **History:** Commissioned on 26 January 1984 during the 3rd Indian Antarctic Expedition.
• **Status:** Decommissioned in 1990 after being submerged under 8+ meters of perpetual ice. Now preserved as a designated Historic Site and Monument (HSM No. 44) under the Antarctic Treaty System and utilized as an unmanned summer transit fuel depot.`,
    hinglish: `### 🏛️ Dakshin Gangotri (Historic 1st Station)
• **History**: 26 January 1984 ko 3rd ISEA ke dauran inaugurate hui thi.
• **Status**: 1990 mein barf ke neeche dab jaane ki wajah se decommission kar di gayi. Ab ye ek protected Historic Site (HSM No. 44) aur emergency summer transit depot hai.`,
    hi: `### 🏛️ दक्षिण गंगोत्री — भारत का ऐतिहासिक पहला अनुसंधान केंद्र
• **स्थापना**: 26 जनवरी 1984 (तीसरे भारतीय अंटार्कटिक अभियान के दौरान)।
• **वर्तमान स्थिति**: 1990 में 8 मीटर से अधिक बर्फ के नीचे दबने के कारण इसे सेवामुक्त किया गया। अब यह अंटार्कटिक संधि प्रणाली के तहत संरक्षित ऐतिहासिक स्मारक (HSM No. 44) और ग्रीष्मकालीन ट्रांजिट ईंधन डिपो है।`
  },

  indarc: {
    en: `### 🌊 IndARC — India's Moored Arctic Ocean Observatory
• **Coordinates:** 78°59'N, 12°01'E.
• **Location:** Kongsfjorden, Svalbard (Arctic Ocean), moored at 192 meters water depth.
• **Deployment:** Deployed in July 2014 as India's first multi-sensor underwater moored observatory in the Arctic.
• **Scientific Focus:** Collects real-time continuous oceanographic telemetry on Arctic seawater temperature, salinity, ocean currents, and Arctic-Monsoon linkages throughout the polar night.`,
    hinglish: `### 🌊 IndARC Arctic Moored Observatory
• **Location**: Kongsfjorden, Svalbard, Arctic (192m depth underwater).
• **Deployment**: July 2014 mein deploy kiya gaya Bharat ka pehla underwater observatory.
• **Research**: Polar night ke dauran ocean temperature, salinity, aur Indian monsoon connections ko continuously record karta hai.`,
    hi: `### 🌊 इंड-आर्क (IndARC) — भारत की आर्कटिक महासागरीय वेधशाला
• **स्थिति**: कॉंग्सफ्योर्डन, स्वालबार्ड (192 मीटर जल गहराई में स्थित)।
• **स्थापना**: जुलाई 2014 में भारत की पहली बहु-सेंसरीय अंतर्जलीय वेधशाला के रूप में स्थापित।
• **उद्देश्य**: ध्रुवीय रात्रि के दौरान आर्कटिक जल तापमान, लवणता, महासागरीय धाराओं और भारतीय मानसून के साथ इसके संबंधों का निरंतर डेटा संकलन।`
  },

  antarcticTreaty: {
    en: `### 📜 Antarctic Treaty System (ATS) & Environmental Governance
• **The Treaty:** Signed in Washington on 1 December 1959 (entered into force 23 June 1961). India acceded in 1983 and gained Consultative Party status.
• **Core Principles:**
  1. Complete freedom of scientific investigation and international scientific data exchange.
  2. Strict peaceful use: complete ban on military fortifications, weapons testing, nuclear explosions, and radioactive waste disposal.
• **Madrid Protocol (1991):** Environmental Protocol designating Antarctica as a "natural reserve devoted to peace and science". Indefinitely bans all mineral extraction and commercial mining.
• **Governance Mandate:** All expedition operations must complete Environmental Impact Assessments (EIA) under COMNAP (Council of Managers of National Antarctic Programs) guidelines.`,
    hinglish: `### 📜 Antarctic Treaty System (ATS) & Madrid Protocol
• **Antarctic Treaty**: 1959 mein sign hua (1961 se active). India 1983 mein Consultative Member bana.
• **Core Rules**: Military activities, weapons testing, aur nuclear waste par 100% ban hai.
• **Madrid Protocol (1991)**: Antarctica mein mining aur mineral extraction par permanent ban lagata hai aur paryavaran ki raksha karta hai.`,
    hi: `### 📜 अंटार्कटिक संधि प्रणाली और मैड्रिड प्रोटोकॉल (ATS)
• **अंटार्कटिक संधि**: 1959 में हस्ताक्षरित। भारत 1983 में शामिल हुआ और परामर्शी सदस्य (Consultative Party) बना।
• **मूल सिद्धांत**:
  1. वैज्ञानिक अनुसंधान की पूर्ण स्वतंत्रता और अंतरराष्ट्रीय सहयोग।
  2. शांतिपूर्ण उपयोग: सैन्य गतिविधियों, हथियारों के परीक्षण और परमाणु कचरे पर पूर्ण प्रतिबंध।
• **मैड्रिड प्रोटोकॉल (1991)**: अंटार्कटिका में खनन और खनिज दोहन पर अनिश्चितकालीन प्रतिबंध लगाता है।`
  },

  ncpor: {
    en: `### 🏛️ NCPOR & MoES — Institutional Polar Custodians
• **NCPOR:** National Centre for Polar and Ocean Research, situated at Vasco da Gama, Goa, India.
• **Parent Ministry:** Ministry of Earth Sciences (MoES), Government of India.
• **National Mandate:** Autonomous R&D institution responsible for overall coordination and implementation of the Indian Antarctic Programme (ISEA), Arctic expeditions, Southern Ocean surveys, and Himalayan glaciological programmes.
• **Logistics Infrastructure:** Manages ice-class charter vessels (*MV Vasiliy Golovnin*), air-bridges from Cape Town Gateway, and maintains permanent year-round infrastructure at Maitri, Bharati, and Himadri.`,
    hinglish: `### 🏛️ NCPOR aur Ministry of Earth Sciences (MoES)
• **NCPOR**: National Centre for Polar and Ocean Research, Vasco da Gama, Goa.
• **Ministry**: Ministry of Earth Sciences (MoES), Government of India.
• **Role**: Bharat ke sabhi Antarctic (ISEA), Arctic (Himadri), Southern Ocean, aur Himalaya expeditions ka nodal management centre hai. Cape Town air-bridge aur icebreaker vessels ko coordinate karta hai.`,
    hi: `### 🏛️ राष्ट्रीय ध्रुवीय एवं महासागर अनुसंधान केंद्र (NCPOR & MoES)
• **एनसीपीओआर (NCPOR)**: नेशनल सेंटर फॉर पोलर एंड ओशन रिसर्च, वास्को-डि-गामा, गोवा।
• **मंत्रालय**: पृथ्वी विज्ञान मंत्रालय (MoES), भारत सरकार।
• **दायित्व**: भारतीय अंटार्कटिक अभियान (ISEA), आर्कटिक (हिमाद्रि), दक्षिणी महासागर और हिमालयी हिमनद कार्यक्रमों का संपूर्ण परिचालन और प्रबंधन।`
  }
}

