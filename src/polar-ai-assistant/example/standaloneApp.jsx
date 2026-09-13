import React, { useMemo } from 'react'
import { AIChatbot, createProjectDataAdapter } from '../src/index.js'
import { sampleProjectData } from './sampleData.js'

export default function StandaloneApp() {
  const dataAdapter = useMemo(() => {
    return createProjectDataAdapter(sampleProjectData, {
      projectName: 'ARCTIC POLAR II',
    })
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#08111a', color: '#eaf3f5', padding: '2rem' }}>
      <header style={{ borderBottom: '1px solid #223d4c', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Arctic Polar II — Command & Operations Console
        </h1>
        <p style={{ color: '#a5bdc7', fontSize: '0.875rem' }}>
          Example host application demonstrating seamless integration with the portable Polar AI Assistant.
        </p>
      </header>

      <main style={{ maxWidth: '800px' }}>
        <div style={{ background: '#0c1a26', border: '1px solid #223d4c', padding: '1.5rem', borderRadius: '4px' }}>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: '#6fd6d6' }}>
            Active Host Telemetry Status
          </h2>
          <ul style={{ lineHeight: '1.8', color: '#a5bdc7' }}>
            <li><strong>Stations:</strong> Aurora Research Station, Borealis Field Camp, Nordic Logistics Depot</li>
            <li><strong>Missions:</strong> EXP-801 (Methane Coring), EXP-802 (Ice Velocity), EXP-803 (Aerosol Sampling)</li>
            <li><strong>Key Assets:</strong> Jet-A1 Polar Fuel, High-Altitude Tents (Low stock alert)</li>
          </ul>
        </div>
      </main>

      <AIChatbot
        dataAdapter={dataAdapter}
        projectName="ARCTIC POLAR II"
        title="Arctic AI Assistant"
        subtitle="Greenland Sector Command"
        defaultOpen={true}
      />
    </div>
  )
}
