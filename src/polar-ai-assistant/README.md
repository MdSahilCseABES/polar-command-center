# POLAR AI Assistant System (Portable Standalone Module)

The **POLAR AI Assistant System** is a project-aware, natural-language operational intelligence system extracted from the POLAR Command Center.

It provides real-time natural language reasoning over arbitrary expedition data, inventory reserves, cargo logistics, field personnel telemetry, station profiles, and emergency incident dispatch — without relying on hardcoded static intents or question-specific dictionaries.

---

## Architecture Overview

```
HOST POLAR PROJECT / STATE (Any schema or live DB)
              │
              ▼
    ProjectDataAdapter (Universal Data Normalizer)
              │
              ▼
   POLAR AI Operational Intelligence & Query Engine
   ├── Universal Project Query Engine (Semantic matcher & aggregator)
   ├── Hinglish & English Natural Language Processing
   ├── Multi-Turn Conversational Session Context
   └── Map Actions & Inventory Mutation Handlers
              │
              ▼
      Chatbot UI Component (<AIChatbot />)
   (Floating toggle / embedded console, markdown, tables, telemetry actions)
```

---

## 1. Folder Structure

```
polar-ai-assistant/
├── src/
│   ├── index.js                      # Unified package entry point (exports UI, adapter, engines, utils)
│   ├── adapters/
│   │   └── projectDataAdapter.js     # ProjectDataAdapter class & createProjectDataAdapter factory
│   ├── components/
│   │   └── AIChatbot/
│   │       ├── AIChatbot.jsx         # Main chatbot component (floating badge + drawer)
│   │       ├── ChatWindow.jsx        # Chat header, message list, error display, reset
│   │       ├── ChatMessage.jsx       # Formatted Markdown, tabular renderer, interactive map tags
│   │       ├── ChatInput.jsx         # Auto-resizing textarea with submit handling
│   │       ├── QuickActions.jsx      # Suggested quick directive buttons
│   │       └── chatbot.css           # Self-contained Polar design system tokens & styles
│   ├── core/
│   │   ├── operationsIntelligence.js # Top-level operational dispatcher, triage, & cross-module reasoning
│   │   ├── projectQueryEngine.js     # Universal dynamic semantic reasoning & multi-attribute engine
│   │   ├── inventoryActions.js       # Natural language inventory command parser & Hinglish normalizer
│   │   ├── operationsAI.js           # Bridge between local reasoning, fallback engine, and external LLM
│   │   ├── contextBuilder.js         # Serializes real-time application state for LLM prompts
│   │   ├── projectKnowledge.js       # Self-describing schema repository, modules, metadata, and roles
│   │   └── systemPrompt.js           # Operational prompt rules, boundaries, and formatting instructions
│   ├── utils/
│   │   ├── statuses.js               # Status definitions, priority levels, & stock calculations
│   │   ├── format.js                 # Coordinate, timeAgo, date, and number formatters
│   │   └── weatherService.js         # Weather assessment thresholds & WMO weather code decoders
│   └── api/
│       └── chat.js                   # Portable serverless API route for secure LLM proxying
├── example/
│   ├── sampleData.js                 # Independent test dataset ("ARCTIC POLAR II")
│   ├── standaloneApp.jsx             # Minimal demo host application demonstrating integration
│   └── test_standalone_assistant.js  # Automated 14-point standalone validation test suite
├── dist/                             # Pre-bundled library build (ESM + UMD + CSS)
├── package.json                      # Package metadata, exports map, and peer dependencies
├── vite.config.js                    # Vite library build configuration
├── INTEGRATION.md                    # Quick integration cheatsheet
└── README.md                         # Complete documentation (this file)
```

---

## 2. Installation into Another POLAR Project

### Option A: Local Subdirectory / Monorepo (Recommended)
Copy the `polar-ai-assistant/` folder directly into your project:
```bash
# Copy into your project's src directory or packages directory
cp -r polar-ai-assistant /path/to/new-polar-project/src/lib/polar-ai-assistant
```

### Option B: Local npm Package Reference
In your host project's `package.json`:
```json
{
  "dependencies": {
    "polar-ai-assistant": "file:./polar-ai-assistant"
  }
}
```
Then run:
```bash
npm install
```

---

## 3. Required Runtime Dependencies

The package relies only on React and Lucide icons. It has **zero dependencies** on Leaflet, Supabase, Tailwind, or Recharts.

```json
{
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "dependencies": {
    "lucide-react": "^0.468.0 || ^1.0.0"
  }
}
```

Install in the host application if not already present:
```bash
npm install react react-dom lucide-react
```

---

## 4. Connecting New Project Data Through the Adapter

The `ProjectDataAdapter` decouples the AI reasoning engine from host application state schemas. Any data structure or collection naming can be passed in.

```javascript
import { ProjectDataAdapter, createProjectDataAdapter } from 'polar-ai-assistant'

// Example raw data from your new project (e.g. Supabase, REST API, or React state)
const hostAppData = {
  // Expeditions (accepts 'expeditions' or 'missions')
  expeditions: [
    {
      id: 'EXP-901',
      name: 'North Glacier Survey',
      destination: 'Aurora Base',
      status: 'ACTIVE',
      progress: 75,
      team_size: 8,
      leader: 'Dr. John Doe',
      end_date: '2027-04-15'
    }
  ],

  // Personnel (accepts 'personnel', 'devices', 'team', or 'operators')
  personnel: [
    {
      id: 'P-001',
      name: 'Dr. Jane Smith',
      role: 'Chief Glaciologist',
      status: 'ACTIVE',
      stationed_at: 'Aurora Base',
      blood_group: 'O+',
      satphone: '+881-690-111-222'
    }
  ],

  // Stations / Bases (accepts 'locations', 'stations', 'bases', or 'sites')
  locations: [
    {
      id: 'LOC-AURORA',
      name: 'Aurora Base',
      capacity: 30,
      region: 'Arctic'
    }
  ],

  // Inventory (accepts 'inventory', 'supplies', 'stock', or 'items')
  inventory: [
    {
      id: 'INV-001',
      item_name: 'Polar Diesel Fuel',
      quantity: 12500,
      minimum_quantity: 4000,
      unit: 'litres',
      location: 'Aurora Base'
    }
  ],

  // Cargo (accepts 'cargo', 'consignments', or 'shipments')
  cargo: [
    {
      id: 'CRG-101',
      item_name: 'Drill Bits',
      destination: 'Aurora Base',
      status: 'IN_TRANSIT',
      weight_kg: 350
    }
  ],

  // Emergencies (accepts 'emergencies', 'incidents', or 'alerts')
  emergencies: [
    {
      id: 'INC-001',
      type: 'EQUIPMENT',
      severity: 'HIGH',
      location: 'Aurora Base Sector 1',
      description: 'Secondary heater failure',
      status: 'OPEN'
    }
  ]
}

// Create the adapter
const adapter = createProjectDataAdapter(hostAppData, {
  projectName: 'ARCTIC EXPEDITION 2026'
})
```

The adapter can also take a **getter function** that is invoked dynamically on every query to always retrieve the freshest state:
```javascript
const adapter = createProjectDataAdapter(() => getLatestDataFromStore(), {
  projectName: 'POLAR MISSION CONTROL'
})
```

---

## 5. How the Chatbot Receives Current Project Data

The `<AIChatbot />` component accepts the data adapter via the `dataAdapter` prop (or directly via the `data` prop):

```jsx
import React from 'react'
import { AIChatbot, createProjectDataAdapter } from 'polar-ai-assistant'
import 'polar-ai-assistant/styles'

export function MissionControlView({ currentOperationalState }) {
  // Create or memoize the adapter
  const adapter = React.useMemo(() => {
    return createProjectDataAdapter(currentOperationalState, {
      projectName: 'POLAR'
    })
  }, [currentOperationalState])

  return (
    <div className="layout">
      {/* Your application views */}
      <main>...</main>

      {/* Standalone AI Assistant */}
      <AIChatbot
        dataAdapter={adapter}
        projectName="POLAR"
        title="Polar AI Assistant"
        subtitle="Operational Intelligence"
        apiEndpoint="/api/chat" // Optional external LLM proxy
        onFocusMap={({ kind, id, label }) => {
          // Handle map focus in your application GIS
          console.log(`Focus ${kind} with ID ${id} (${label})`)
        }}
        goTo={(path) => {
          // Optional navigation callback
        }}
        defaultOpen={false}
      />
    </div>
  )
}
```

Whenever `currentOperationalState` updates (e.g. new GPS fix, updated stock level, or newly reported emergency), the adapter seamlessly serves the updated data to the engine on the very next query.

---

## 6. How English & Hinglish Queries Work

The query engine features a dual-layer natural language processor:

1. **Phonetic & Colloquial Normalizer**:
   Normalizes transliterated Hindi words, verb forms, and interrogatives:
   - `konsa`, `kaunsa`, `kaunsi` ➔ `which`
   - `kahan`, `kidhar`, `kaha` ➔ `where`
   - `kitna`, `kitne log`, `kitni` ➔ `how much / how many`
   - `sabse aage`, `sabse zyada`, `sabse bada` ➔ `maximum / highest / ranking`
   - `kam`, `khatam`, `kam stock` ➔ `low stock / depleted`
   - Hindi number words (`ek`, `do`, `teen`, `chaar`, `paanch`, `sau`, `hazaar`) ➔ numeric equivalents.

2. **Semantic Extraction**:
   Queries like:
   - *"konsa mission sabse aage hai?"* ➔ Evaluates `progress` across `expeditions`, returning the highest percentage.
   - *"kaunsa saman low stock mein hai?"* ➔ Compares `quantity < minimum_quantity` across `inventory`.
   - *"CRG-901 ka status aur location kya hai?"* ➔ Extracts multiple attributes for cargo entity `CRG-901`.
   - *"Dr. Sarah Lindqvist ka blood group kya hai?"* ➔ Extracts personnel record and returns the requested attribute.

All queries work across both English and Hinglish seamlessly.

---

## 7. How Multi-Turn Conversational Context Works

The engine maintains a lightweight conversational state machine across turns via `sessionContext`:

- When an entity (mission, person, station, cargo consignment, or incident) is referenced in Turn 1, it is recorded in `sessionContext.lastEntity` and `sessionContext.lastTopic`.
- In Turn 2, if the user asks a follow-up query with a demonstrative pronoun (`isme`, `iska`, `iski`, `usme`, `wahan`, `it`, `he`, `she`, `they`):
  - **Turn 1**: *"EXP-802 ka target end date kab hai?"*  
    *AI*: *"Mission EXP-802 concludes on 2027-11-30 (progress: 29%)."*  
    *(Saves EXP-802 as `lastEntity`)*
  - **Turn 2**: *"isme kitne log hain?"*  
    *AI*: *"Mission EXP-802 has 24 personnel assigned (Leader: Capt. Erik Thorne)."*  
    *(Resolves `isme` ➔ `EXP-802`)*
  - **Turn 3**: *"iska leader kaun hai?"*  
    *AI*: *"Mission EXP-802 is led by Capt. Erik Thorne."*  
    *(Resolves `iska` ➔ `EXP-802`)*
- Follow-up questions about location (*"where is it?"* / *"ye kahan hai?"*), team members (*"who is leading it?"*), and status (*"what is its status?"*) are automatically grounded to the active entity.

---

## 8. How Supported Actions Work

### A. Map Locator Actions (`MAP_ACTION`)
When the engine references a geographical entity (a person with field telemetry, a research station, or an emergency incident), it embeds an action tag:
```
[MAP_ACTION:person:P-001:Dr. Arjun Sharma]
[MAP_ACTION:site:LOC-MAITRI:Maitri Station]
[MAP_ACTION:incident:INC-001:Maitri Sector B]
```
The `<ChatMessage />` component automatically parses these tags into interactive buttons with icons (`MapPin`). Clicking the button triggers the `onFocusMap` prop:
```javascript
onFocusMap={({ kind, id, label }) => {
  if (kind === 'person') mapInstance.panTo(personCoordinates[id]);
  if (kind === 'site') mapInstance.panTo(siteCoordinates[id]);
  if (kind === 'incident') mapInstance.panTo(incidentCoordinates[id]);
}}
```

### B. Natural Language Inventory Actions
The engine supports conversational inventory queries and mutations:
- Query: *"How much diesel is available?"* ➔ Direct factual stock answer.
- Mutation: *"Add 500 litres of diesel"* or *"Consume 2 medical kits"* ➔ Generates action payload.
- Deletion guards: *"Delete item I-001"* ➔ Requires explicit user confirmation before executing.

---

## 9. Verification & Testing

The package includes a standalone automated test suite validating 14 test cases on a completely independent dataset ("ARCTIC POLAR II") with 0 data leakage:

```bash
# Run tests directly with Node
node example/test_standalone_assistant.js
```

---

## License

MIT License. Designed for POLAR Command Center & expedition logistics applications.
