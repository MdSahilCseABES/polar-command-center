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
    en: `### ✈️ Polar Flight Operations & Aviation Safety Minimums
Standard Operating Flight Envelopes for Antarctic and Arctic air operations:

| Aircraft Type | Minimum Visibility | Cloud Ceiling | Max Sustained Wind | Max Peak Gusts | Max Crosswind |
|---|---|---|---|---|---|
| **DHC-6 Twin Otter (Ski-equipped)** | **5.0 km** | **1,000 ft AGL** | **35 kt (65 km/h)** | **45 kt (83 km/h)** | **25 kt (46 km/h)** |
| **Basler BT-67 (Turboprop DC-3)** | **5.0 km** | **1,000 ft AGL** | **35 kt (65 km/h)** | **45 kt (83 km/h)** | **25 kt (46 km/h)** |
| **Kamov Ka-32 / Bell 412 (Helicopter)** | **1.0 km** | **500 ft AGL** | **40 kt (74 km/h)** | **45 kt (83 km/h)** | **20 kt (37 km/h)** |

**Critical Flight Safety Directives:**
1. **Flat Light / Whiteout**: If surface contrast degrades to Flat Light (inability to distinguish sastrugi or horizon), pilots must immediately turn back or divert to coastal alternates (Novo Runway or Cape Town).
2. **Survival Gear**: Mandatory 14 days of emergency survival rations, polar bivvy shelters, and satellite beacons per aircraft sortie.`,
    hinglish: `### ✈️ Polar Flight Safety Limits (Twin Otter aur Helicopter)
Antarctic aur Arctic flight operations ke strict safety minimums:

• **Twin Otter (DHC-6) & Basler BT-67**:
  - Minimum Visibility: **5.0 km**
  - Minimum Cloud Ceiling: **1,000 feet**
  - Max Sustained Wind: **35 knots (65 km/h)**
  - Max Gusts: **45 knots (83 km/h)**
  - Max Crosswind: **25 knots**

• **Helicopter (Kamov Ka-32 / Bell 412)**:
  - Minimum Visibility: **1.0 km**, Wind Limit: **40 knots**

⚠️ **Flat Light Protocol**: Agar horizon ya sastrugi dikhna band ho jaye, to flight turant abort karke safe runway par divert karni hoti hai.`,
    hi: `### ✈️ ध्रुवीय उड़ान सुरक्षा नियम (Flight Operations Minimums)
अंटार्कटिक और आर्कटिक विमान संचालन के लिए अनिवार्य सुरक्षा सीमाएं:

• **ट्विन ओटर (Twin Otter DHC-6) व बासलर (Basler BT-67)**:
  - न्यूनतम दृश्यता (Visibility): **5.0 किमी**
  - बादलों की न्यूनतम ऊंचाई: **1,000 फीट**
  - अधिकतम हवा की गति: **35 समुद्री मील (65 किमी/घंटा)**
  - अधिकतम झोंके (Gusts): **45 समुद्री मील (83 किमी/घंटा)**
  - क्रॉसविंड सीमा: **25 समुद्री मील**

• **हेलिकॉप्टर (Kamov Ka-32)**:
  - न्यूनतम दृश्यता: **1.0 किमी**, हवा की सीमा: **40 नॉट**

⚠️ **व्हाइटआउट / फ्लैट लाइट नियम**: सतह का कंट्रास्ट समाप्त होते ही उड़ान तत्काल रद्द कर दी जाती है।`
  },

  blizzardSOP: {
    en: `### 🚨 Whiteout / Blizzard Condition 1 Protocol (SOP-BLZ-01)
**Condition 1 Thresholds:** Visibility < 50m, Sustained winds > 55 kt (102 km/h), or Wind Chill < -60°C.

**Immediate Directives:**
1. **Total Station Lock-in**: Halt all exterior science sorties and outdoor equipment inspections immediately.
2. **Accountability Muster**: 100% headcount roll call across all habitat modules within 15 minutes.
3. **Rig Lifelines**: Strict dual-carabiner safety tether ropes for inter-module transit. Never walk unroped.
4. **Radio Schedules**: Switch VHF/UHF to Emergency Channel 16 / Polar Simplex 1; initiate mandatory hourly check-in with field traverses.
5. **HVAC & Power**: Switch generator intakes to recirculating snow-hood baffles to prevent katabatic spindrift air-filter choking.`,
    hinglish: `### 🚨 Blizzard Condition 1 Protocol (SOP-BLZ-01)
**Condition 1 Criteria:** Visibility < 50m, Wind > 55 knots (102 km/h), ya Wind Chill < -60°C.

**Immediate Action Steps:**
1. **Station Lock-in**: Bahar nikalna turant ban. Sabhi field sorties halt.
2. **Headcount Muster**: 15 minute ke andar 100% personnel ki haaziri confirm karein.
3. **Lifelines**: Modules ke beech aana-jana sirf clipped safety rope (lifeline) ke sath allowable hai.
4. **Emergency Radio**: Radio Channel 16 par switch karein aur hourly check-in shuru karein.
5. **Generator Protection**: Genset air filters ko snow accumulation se bachane ke liye baffles engage karein.`,
    hi: `### 🚨 बर्फानी तूफान कंडीशन 1 प्रोटोकॉल (SOP-BLZ-01)
**कंडीशन 1 मापदंड:** दृश्यता < 50 मीटर, हवा की गति > 55 नॉट (102 किमी/घंटा), या विंड चिल < -60°C।

**तत्काल आदेश:**
1. **पूर्ण स्टेशन लॉकडाउन**: बाहर निकलना और वैज्ञानिक अभियान तुरंत रोक दिए जाएं।
2. **कार्मिक गणना (Muster)**: 15 मिनट में सभी 100% कर्मियों की उपस्थिति सत्यापित करें।
3. **लाइफलाइन का उपयोग**: मॉड्यूल्स के बीच केवल बंधी हुई सेफ्टी रस्सियों (लाइफलाइन) के सहारे ही आवागमन करें।
4. **रेडियो चैनल**: आपातकालीन चैनल 16 पर स्विच करें और प्रति घंटे संपर्क सुनिश्चित करें।
5. **जनरेटर सुरक्षा**: स्नो-बैफल्स सक्रिय करें ताकि बर्फ से एयर फिल्टर जाम न हों।`
  },

  crevasseSOP: {
    en: `### 🚨 Crevasse Fall & Technical Rescue Protocol (SOP-CRV-02)
**Immediate Response Actions:**
1. **Arrest & Secure Anchors**: Vehicle stops immediately; drive two 90cm opposing aluminum snow pickets or deadman snow bollards at 45° angles.
2. **Establish Contact**: Lower VHF radio and thermal bivvy to casualty. Confirm ABC (Airway, Breathing, Circulation) and injury severity.
3. **Rig Hauling System**: Deploy a **3:1 Z-Rig** or **6:1 compound pulley** with progress capture prusiks / Petzl micro-traxion. Use an edge-roller on the lip.
4. **Extraction & Triage**: Steady haul. Monitor for suspension trauma (keep knees bent if suspended >30 mins). Wrap in vapor barrier bag with active heat pads.`,
    hinglish: `### 🚨 Crevasse Fall & Rescue Protocol (SOP-CRV-02)
**Crevasse mein girne par rescue SOP:**
1. **Anchors Lagayein**: Gaadi ya team turant brake lagaye; 45° angle par opposing snow pickets drive karein.
2. **Contact Banayein**: Casualty ko radio aur thermal bivvy bag neeche bhejein; medical condition confirm karein.
3. **Pulley System (3:1 Z-Rig)**: Hauling ke liye 3:1 Z-Rig ya 6:1 compound pulley rig karein. Crevasse ke lip par edge roller lagayein taaki rassi barf mein na kaate.
4. **Rewarming**: Casualty ko nikalte hi active chemical heat pads aur vapor barrier bag mein wrap karein.`,
    hi: `### 🚨 हिमदरार (Crevasse) बचाव प्रोटोकॉल (SOP-CRV-02)
**क्रेवास में गिरने पर तत्काल बचाव प्रक्रिया:**
1. **एंकर स्थापित करें**: 45° कोण पर दो स्नो पिकेट्स गाड़कर मुख्य एंकर बनाएं।
2. **संपर्क स्थापित करें**: घायल व्यक्ति तक वीएचएफ रेडियो और थर्मल बैग पहुंचाएं।
3. **हॉलिंग सिस्टम (3:1 Z-Rig)**: 3:1 Z-रिग या 6:1 पुली सिस्टम तैयार करें और किनारे पर एज-रोलर लगाएं।
4. **सुरक्षित निकासी**: व्यक्ति को बाहर निकालते ही केमिकल हीट पैड्स से सुरक्षित करें और मेडिकल बे में ले जाएं।`
  },

  frostbiteSOP: {
    en: `### ❄️ Severe Frostbite & Hypothermia Stages (SOP-MED-03)
• **Stage I (Mild, Core 32°C–35°C)**: Shivering, slurred speech. Action: Warm shelter, dry clothing, high-calorie sweet warm fluids.
• **Stage II (Moderate, Core 28°C–32°C)**: Loss of shivering, confusion. Action: Active trunk rewarming, chemical heat packs on groin/axilla.
• **Stage III (Severe, Core 24°C–28°C)**: Unconscious, rigid. Action: Gentle handling, warm humidified IV fluids, monitor for ventricular fibrillation.
• **Frostbite Protocol**: Rapid rewarming in 37°C–39°C circulating water bath for 15–30 mins. NEVER rub frostbitten skin. Protect blisters with sterile bulky dressings.`,
    hinglish: `### ❄️ Frostbite aur Hypothermia Treatment Stages (SOP-MED-03)
• **Stage 1 (Mild, 32°C-35°C)**: Shivering aur kapkapi. Treatment: Dry kapde, warm sweet drinks, sleeping bag.
• **Stage 2 (Moderate, 28°C-32°C)**: Kapkapi band hona, drowsiness. Treatment: Axilla aur groin par chemical heat packs lagayein.
• **Stage 3 (Severe, 24°C-28°C)**: Behosh hona. Treatment: Warm humidified oxygen aur IV fluids, gentle handling.
⚠️ **Frostbite Rules**: Barf ya haath se kabhie rub na karein! 37°C-39°C gungune paani mein 15-30 minute tak rewarm karein.`,
    hi: `### ❄️ शीतदंश (Frostbite) और हाइपोथर्मिया उपचार (SOP-MED-03)
• **स्टेज 1 (हल्का, 32°C-35°C)**: कंपकंपी होना। उपचार: सूखे कपड़े, गर्म मीठा पेय और स्लीपिंग बैग।
• **स्टेज 2 (मध्यम, 28°C-32°C)**: कंपकंपी रुकना, भ्रम। उपचार: बगल और कमर पर केमिकल हीट पैक लगाएं।
• **स्टेज 3 (गंभीर, 24°C-28°C)**: बेहोशी। उपचार: गर्म ऑक्सीजन और सावधानीपूर्वक हैंडलिंग।
⚠️ **शीतदंश नियम**: प्रभावित त्वचा को कभी न रगड़ें! 37°C-39°C गुनगुने पानी में 15-30 मिनट तक रखें।`
  },

  generatorSOP: {
    en: `### ⚡ Station Generator Power Outage SOP (SOP-PWR-04)
1. **Automatic Transfer**: Confirm secondary diesel genset start within 30 seconds.
2. **Load Shedding**: Immediately cut non-essential circuits (workshops, sauna, drying rooms). Maintain life support, habitat heating, satellite comms, and medical bay.
3. **Fuel Line Inspection**: Check for wax clogging / paraffin precipitation in diesel filters. Engage fuel pre-heaters.
4. **Thermal Containment**: Seal all non-core doors to trap residual heat in central living quarters.`,
    hinglish: `### ⚡ Generator Failure Emergency Response (SOP-PWR-04)
1. **Secondary Genset**: Secondary backup diesel generator ka start 30 seconds mein verify karein.
2. **Load Shedding**: Non-essential light aur equipment turant band karein; life support aur habitat heating preserve karein.
3. **Fuel Lines**: Diesel fuel lines mein wax jamming check karein aur fuel pre-heaters on karein.
4. **Heat Trap**: Sabhi unnecessary kamre band karke main living pod mein heat preserve karein.`,
    hi: `### ⚡ जनरेटर विफलता आपातकालीन प्रक्रिया (SOP-PWR-04)
1. **बैकअप जनरेटर**: 30 सेकंड के भीतर द्वितीयक डीजल जनरेटर चालू करें।
2. **लोड शेडिंग**: गैर-ज़रूरी बिजली तत्काल काटें; केवल हीटिंग, चिकित्सा और संचार चालू रखें।
3. **ईंधन लाइन जांच**: ईंधन फिल्टर में मोम जमने की जांच करें और प्री-हीटर चालू करें।
4. **थर्मल सुरक्षा**: सभी अनावश्यक दरवाजे बंद कर मुख्य क्वार्टर में गर्मी सुरक्षित रखें।`
  },

  fireSOP: {
    en: `### 🔥 Habitat Fire Suppression Protocol (SOP-FIR-05)
1. **Alarm & Isolation**: Sound continuous siren; trip HVAC ventilation to starve fire of airflow.
2. **Personnel Evacuation**: Muster all hands at the secondary emergency module / snow shelter within 3 minutes.
3. **Fire Suppression**: Discharge Inergen / CO2 gas systems in equipment bays; deploy dry chemical ABC extinguishers. Water freezing prohibits conventional hydrants.`,
    hinglish: `### 🔥 Station Fire Suppression Protocol (SOP-FIR-05)
1. **Siren & Air Cut**: Alarm bajayein aur HVAC ventilation turant shut karein taaki aag ko oxygen na mile.
2. **Evacuation**: 3 minute ke andar sabhi personnel secondary survival shelter module mein shift hon.
3. **Extinguishers**: Inergen/CO2 gas flooding aur dry powder extinguishers use karein (paani jamne ki wajah se water hoses use nahi hote).`,
    hi: `### 🔥 आवास अग्नि शमन प्रोटोकॉल (SOP-FIR-05)
1. **सायरन और वायु नियंत्रण**: आपातकालीन अलार्म बजाएं और वेंटिलेशन तुरंत बंद करें ताकि आग को ऑक्सीजन न मिले।
2. **निकासी**: 3 मिनट के भीतर सभी सदस्य द्वितीयक आपातकालीन मॉड्यूल में एकत्रित हों।
3. **अग्नि शमन**: केवल इनरजेन/CO2 और ड्राई केमिकल पाउडर का उपयोग करें (पानी जमने के कारण पानी का उपयोग नहीं होता)।`
  },

  fuelSOP: {
    en: `### ⛽ Fuel Paraffinization & Low Temperature Management (SOP-FUL-06)
1. **Cold-Flow Limits**: Standard automotive diesel freezes at -15°C. Antarctic stations use **Polar Grade Low-Wax Diesel (ATF / Jet-A1 blend)** treated with anti-icing FSII additives (effective to -50°C).
2. **Paraffin Clotting**: If fuel clouds or filters plug, activate tank trace-heating cables and heat trace jackets on suction lines.`,
    hinglish: `### ⛽ Fuel Freezing aur Paraffin Prevention (SOP-FUL-06)
1. **Polar Fuel Grade**: Antarctica mein regular diesel freeze ho jata hai; isliye special **Low-Wax Polar Diesel (Jet-A1 mix)** use hota hai jo -50°C tak liquid rehta hai.
2. **Line Heating**: Filter mein wax jama hone par trace heating coils activate kiye jate hain.`,
    hi: `### ⛽ ईंधन जमने से बचाव प्रोटोकॉल (SOP-FUL-06)
1. **पोलर ग्रेड ईंधन**: अंटार्कटिका में सामान्य डीजल -15°C पर जम जाता है, इसलिए विशेष लो-वैक्स पोलर डीजल (Jet-A1 मिश्रण) का उपयोग होता है जो -50°C तक तरल रहता है।
2. **ट्रेस हीटिंग**: पाइपलाइन और फिल्टर में मोम जमने पर हीटिंग कॉइल चालू किए जाते हैं।`
  },

  traverseSOP: {
    en: `### 🚛 Overland Traverse Safety Protocol (SOP-TRV-07)
1. **Convoy Rule**: Minimum of 2 tracked vehicles (PistenBully / Kassbohrer) per traverse. Solo travel is strictly prohibited.
2. **Crevasse Radar**: Lead vehicle must operate Ground Penetrating Radar (GPR) boom continuously.
3. **Comms & Beacon**: Iridium satcom automated check-in every 15 minutes; mandatory 30-day emergency rations aboard sleds.`,
    hinglish: `### 🚛 Overland Traverse Safety Checklist (SOP-TRV-07)
1. **Convoy Rule**: Kabhie bhi akele gaadi na le jayein. Hamesha kam se kam 2 PistenBully vehicles sath chalenge.
2. **GPR Radar**: Aage chalne wali vehicle par Ground Penetrating Radar on rahega jo crevasse detect karta hai.
3. **Satphone & Tracking**: Har 15 minute mein satellite check-in ping bhejna anivarya hai. 30 din ka emergency food sled par hona chahiye.`,
    hi: `### 🚛 ओवरलैंड काफिला सुरक्षा नियम (SOP-TRV-07)
1. **काफिला नियम**: कम से कम दो पिस्टन-बुली (PistenBully) वाहन हमेशा साथ चलेंगे। अकेले यात्रा सख्त वर्जित है।
2. **रडार सुरक्षा**: आगे चलने वाले वाहन पर ग्राउंड पेनेट्रेटिंग रडार (GPR) चालू रहेगा जो हिमदरार की पहचान करता है।
3. **उपग्रह ट्रैकिंग**: हर 15 मिनट में उपग्रह संपर्क अनिवार्य है और 30 दिन का आपातकालीन राशन साथ होना चाहिए।`
  },

  maitriStation: {
    en: `### 🏢 Maitri Station — Detailed Operational Profile
• **Location**: Schirmacher Oasis, Queen Maud Land, East Antarctica (70°45'57"S, 11°44'09"E).
• **Commissioned**: 1988–1989 (India's 2nd station, oldest active permanent base).
• **Capacity**: 25 wintering crew / 65 summer scientists.
• **Primary Science**: Geomagnetism, atmospheric ozone monitoring, meteorology (WMO 89514), glaciology, solid earth geophysics.
• **Life Support**: Freshwater sourced from Lake Priyadarshini; diesel-generator power plant; sewage treatment plant.`,
    hinglish: `### 🏢 Maitri Station Profile
• **Location**: Schirmacher Oasis, Antarctica (70.77°S, 11.73°E).
• **History**: 1989 mein shuru hui; India ki sabse purani active research station hai.
• **Capacity**: 25 log winter mein, 65 log summer mein.
• **Research**: Geomagnetism, weather telemetry, ozone depletion studies.
• **Water Source**: Priyadarshini freshwater lake.`,
    hi: `### 🏢 मैत्री स्टेशन — विस्तृत जानकारी
• **स्थिति**: शिरमाकर ओएसिस, अंटार्कटिका (70°45'57"S, 11°44'09"E)।
• **स्थापना**: 1988-1989 (भारत का सबसे पुराना सक्रिय स्थाई अनुसंधान केंद्र)।
• **क्षमता**: शीतकाल में 25 सदस्य / ग्रीष्मकाल में 65 वैज्ञानिक।
• **अनुसंधान**: भू-चुंबकत्व, वायुमंडलीय ओजोन निगरानी, मौसम विज्ञान (WMO 89514)।
• **जल आपूर्ति**: प्रियदर्शिनी ताजे पानी की झील से।`
  },

  bharatiStation: {
    en: `### 🏢 Bharati Station — Detailed Operational Profile
• **Location**: Larsemann Hills, East Antarctica (69°24'28"S, 76°11'14"E).
• **Commissioned**: 2012 (India's modern 3rd polar station).
• **Design**: Aerodynamic stilt-mounted ISO container architecture engineered to prevent snowdrift burial.
• **Capacity**: 47 personnel year-round.
• **Key Feature**: High-speed satellite ground station for ISRO Remote Sensing satellites (Cartosat, Resourcesat).
• **Meteorology**: WMO Index 89512.`,
    hinglish: `### 🏢 Bharati Station Profile
• **Location**: Larsemann Hills, East Antarctica (69.41°S, 76.19°E).
• **Commissioned**: 2012 mein banayi gayi modern aerodynamic station.
• **Capacity**: 47 personnel year-round.
• **Key Specialty**: ISRO satellite data reception center jo Cartosat aur Resourcesat se live data download karta hai.`,
    hi: `### 🏢 भारती स्टेशन — विस्तृत जानकारी
• **स्थिति**: लार्समैन हिल्स, पूर्वी अंटार्कटिका (69°24'28"S, 76°11'14"E)।
• **स्थापना**: 2012 (अत्याधुनिक एरोडायनामिक कंटेनर संरचना)।
• **क्षमता**: 47 सदस्य वर्ष भर।
• **विशेषता**: इसरो (ISRO) रिमोट सेंसिंग उपग्रहों (Cartosat आदि) के लिए ग्राउंड डेटा स्टेशन।`
  },

  himadriStation: {
    en: `### 🏢 Himadri Station — Arctic Research Base
• **Location**: Ny-Ålesund, Spitsbergen, Svalbard, Norway (78°55'N, 11°56'E).
• **Inaugurated**: July 2008 (India's premier Arctic station).
• **Focus**: Arctic climate change, aerosol characterization, marine microbiology, Kongsvegen Glacier mass balance.`,
    hinglish: `### 🏢 Himadri Station Profile (Arctic)
• **Location**: Ny-Ålesund, Svalbard, Norway (78.92°N, 11.93°E).
• **Inaugurated**: 2008 mein shuru hui.
• **Focus**: Arctic climate change, glacier melting, aur marine microbiology.`,
    hi: `### 🏢 हिमाद्रि स्टेशन — आर्कटिक अनुसंधान केंद्र
• **स्थिति**: नी-ओलेसुंड, स्वालबार्ड, नॉर्वे (78°55'N, 11°56'E)।
• **स्थापना**: 2008 (भारत का पहला आर्कटिक अनुसंधान केंद्र)।
• **प्रमुख कार्य**: आर्कटिक जलवायु परिवर्तन, ग्लेशियर अध्ययन और समुद्री सूक्ष्म जीव विज्ञान।`
  },

  dakshinGangotri: {
    en: `### 🏛️ Dakshin Gangotri — India's Historic 1st Base
• **Location**: Princess Astrid Coast, Antarctica (70°05'S, 12°00'E).
• **History**: Constructed during the 3rd Indian Antarctic Expedition (1983–1984).
• **Decommissioning**: Buried beneath perpetual ice in 1990; now protected as a historic site and emergency supply depot.`,
    hinglish: `### 🏛️ Dakshin Gangotri (Historical Base)
• **History**: India ka pehla Antarctic base jo 1983-1984 mein bana tha.
• **Status**: 1990 mein barf ke neeche dab jaane ki wajah se band hua. Ab ye ek historic site aur emergency transit depot hai.`,
    hi: `### 🏛️ दक्षिण गंगोत्री — भारत का पहला ऐतिहासिक केंद्र
• **स्थापना**: 1983-1984 (तीसरे भारतीय अंटार्कटिक अभियान के दौरान निर्मित)।
• **वर्तमान स्थिति**: 1990 में बर्फ के नीचे दबने के कारण इसे ऐतिहासिक स्मारक और आपातकालीन ट्रांजिट डिपो घोषित किया गया।`
  },

  antarcticTreaty: {
    en: `### 📜 Antarctic Treaty System (ATS) & Scientific Governance
• **The Treaty**: Signed in Washington on 1 December 1959 (in force 1961). India acceded in 1983 and gained Consultative Status.
• **Key Principles**:
  1. Freedom of scientific investigation and complete scientific cooperation.
  2. Use of Antarctica strictly for peaceful purposes; bans military bases, weapons testing, and nuclear waste disposal.
• **Madrid Protocol (1991)**: Comprehensive environmental protection; strictly prohibits mineral and petroleum extraction.`,
    hinglish: `### 📜 Antarctic Treaty System (ATS)
• **Antarctic Treaty**: 1959 mein sign hua tha. Antarctica ko shanti aur scientific research ke liye dedicate kiya gaya hai.
• **Core Rules**: Military activities aur mining par 100% ban hai.
• **Madrid Protocol**: Antarctica ke fragile paryavaran ki raksha karta hai. India iska active consultative member hai.`,
    hi: `### 📜 अंटार्कटिक संधि प्रणाली (Antarctic Treaty System)
• **अंटार्कटिक संधि**: 1959 में हस्ताक्षरित (1961 में प्रभावी)। भारत 1983 में शामिल हुआ।
• **मुख्य नियम**:
  1. अंटार्कटिका का उपयोग केवल शांति और विज्ञान के लिए होगा।
  2. सैन्य गतिविधियों, परमाणु कचरे और खनन पर पूर्ण प्रतिबंध है।
• **मैड्रिड प्रोटोकॉल**: पर्यावरण संरक्षण के कड़े नियम लागू करता है।`
  },

  ncpor: {
    en: `### 🏛️ NCPOR & MoES — Institutional Custodians
• **NCPOR**: National Centre for Polar and Ocean Research, located at Vasco da Gama, Goa, India.
• **Parent Ministry**: Ministry of Earth Sciences (MoES), Government of India.
• **Mandate**: Nodal agency coordinating Indian Antarctic (ISEA), Arctic, Southern Ocean, and Himalayan cryosphere research programs.`,
    hinglish: `### 🏛️ NCPOR aur MoES
• **NCPOR**: National Centre for Polar and Ocean Research, Goa.
• **Ministry**: Ministry of Earth Sciences (MoES), Bharat Sarkar.
• **Role**: Bharat ke sabhi Antarctic, Arctic, aur Southern Ocean expeditions ko plan aur operate karta hai.`,
    hi: `### 🏛️ एनसीपीओआर और पृथ्वी विज्ञान मंत्रालय (NCPOR & MoES)
• **एनसीपीओआर (NCPOR)**: नेशनल सेंटर फॉर पोलर एंड ओशन रिसर्च, वास्को-डि-गामा, गोवा।
• **मंत्रालय**: पृथ्वी विज्ञान मंत्रालय (MoES), भारत सरकार।
• **दायित्व**: भारत के सभी अंटार्कटिक, आर्कटिक और दक्षिणी महासागर अभियानों का नोडल संचालन।`
  }
}

