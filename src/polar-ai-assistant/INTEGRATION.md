# Integration Guide: Adding POLAR AI Assistant to Another POLAR Version

This guide explains how to integrate the portable **POLAR AI Assistant** system into any other POLAR version or command-center project in under 5 minutes.

---

## 1. Copy or Install the Package

Copy the `polar-ai-assistant` directory into your project, or install it as a local dependency:

```bash
npm install ./polar-ai-assistant
```

Ensure you have the required peer dependencies installed in your project:
```bash
npm install react react-dom lucide-react
```

---

## 2. Supply Your Project's Data via DataAdapter

Create a data adapter instance that maps your application's state/data into the AI assistant:

```javascript
import { createProjectDataAdapter } from 'polar-ai-assistant'

// Your project's live data state (from React Context, Redux, Zustand, API, or state hook):
const myProjectData = {
  expeditions: state.expeditions,   // Array of { id, name, destination, team_size, status, progress, leader, ... }
  personnel: state.personnel,       // Array of { id, name, role, status, location_id, latitude, longitude, ... }
  locations: state.locations,       // Array of { id, name, type, region, latitude, longitude, capacity, ... }
  cargo: state.cargo,               // Array of { id, item_name, quantity, weight_kg, priority, status, ... }
  inventory: state.inventory,       // Array of { id, item_name, quantity, minimum_quantity, location, ... }
  emergencies: state.emergencies,   // Array of { id, type, location, severity, description, status, ... }
}

export const projectDataAdapter = createProjectDataAdapter(myProjectData, {
  projectName: 'POLAR V3', // Your model/project name
})
```

---

## 3. Mount the Assistant Component

In your root `App.jsx` or layout component:

```jsx
import React from 'react'
import { AIChatbot } from 'polar-ai-assistant'
import 'polar-ai-assistant/styles'
import { projectDataAdapter } from './projectDataAdapter'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Your existing application navigation, dashboard, and pages */}
      <YourAppLayout />

      {/* Mount the AI Assistant */}
      <AIChatbot
        dataAdapter={projectDataAdapter}
        projectName="POLAR V3"
        title="Polar AI Assistant"
        subtitle="Command Intelligence"
        onFocusMap={(mapAction) => {
          // Optional: handle "View on Map" button clicks
          console.log('Focus map on:', mapAction)
        }}
      />
    </div>
  )
}
```

---

## 4. (Optional) Set up Serverless LLM Route

If you wish to route conversational requests through an external LLM (OpenAI, Groq, or Gemini):

1. Copy `polar-ai-assistant/src/api/chat.js` to your `api/chat.js` serverless directory.
2. Configure your environment variable in `.env.local`:
   ```env
   AI_API_KEY=your_openai_or_groq_or_gemini_key
   ```

If no API key is provided, the AI Assistant will automatically and seamlessly run in **100% local operational engine mode**, answering all queries directly from project telemetry!
