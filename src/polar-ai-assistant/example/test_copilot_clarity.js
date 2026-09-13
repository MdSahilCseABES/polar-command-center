// src/polar-ai-assistant/example/test_copilot_clarity.js
import { askCopilot } from '../../services/aiCopilotService.js'
import * as demoData from '../../data/demoData.js'

async function runClarityTests() {
  console.log('================================================================')
  console.log('AI COPILOT ACCURACY & ANSWER CLARITY VERIFICATION')
  console.log('================================================================\n')

  const testData = {
    locations: demoData.locations,
    expeditions: demoData.expeditions,
    personnel: demoData.personnel,
    cargo: demoData.cargo,
    inventory: demoData.inventory,
    emergencies: demoData.emergencies,
    stats: {
      totalPersonnel: demoData.personnel.length,
      activePersonnel: demoData.personnel.filter(p => p.status === 'ACTIVE').length,
      totalExpeditions: demoData.expeditions.length,
      activeExpeditions: demoData.expeditions.filter(e => e.status === 'ACTIVE').length,
      totalCargo: demoData.cargo.length,
      inTransitCargo: demoData.cargo.filter(c => c.status === 'IN_TRANSIT').length,
      lowStockCount: demoData.inventory.filter(i => i.quantity <= (i.min_threshold || 10)).length,
      openEmergencies: demoData.emergencies.filter(e => e.status !== 'RESOLVED').length
    }
  }

  let passedCount = 0
  let totalTests = 0

  async function assertQuery(name, query, expectedPatterns) {
    totalTests++
    console.log(`[TEST ${totalTests}] ${name}`)
    console.log(`Query: "${query}"`)
    const result = await askCopilot(query, testData)
    const reply = result.response || ''

    console.log(`Source: ${result.source}`)
    console.log(`Preview: \n${reply.split('\n').slice(0, 8).join('\n')}\n...\n`)

    let allMatched = true
    for (const pattern of expectedPatterns) {
      const matches = typeof pattern === 'string'
        ? reply.toLowerCase().includes(pattern.toLowerCase())
        : pattern.test(reply)
      if (!matches) {
        console.error(`❌ FAILED pattern: ${pattern}`)
        allMatched = false
      }
    }

    if (allMatched) {
      console.log(`Result: >>> PASSED <<<\n`)
      passedCount++
    } else {
      console.error(`Result: >>> FAILED <<<\n`)
    }
  }

  // 1. Whiteout Protocol (Clinical depth & numbered steps)
  await assertQuery(
    'Whiteout Condition 1 SOP',
    'What is the whiteout protocol?',
    ['SOP-BLZ-01', 'Condition 1', 'Muster', 'dual-carabiner', 'Channel 16']
  )

  // 2. Flight safety at specific station (Station weather + Twin Otter VFR limit comparison)
  await assertQuery(
    'Station Flight Safety Assessment (Bharati)',
    'Is it safe to fly Twin Otter at Bharati right now under current weather conditions?',
    ['Flight Safety', 'Bharati', 'Twin Otter', 'Wind', 'VFR']
  )

  // 3. Hypothermia & Frostbite Treatment Stages (Clinical table & water bath)
  await assertQuery(
    'Frostbite & Hypothermia Stages',
    'What are the treatment stages for severe frostbite and hypothermia?',
    ['SOP-MED-03', 'Stage I', 'Stage II', 'Stage III', '37°C – 39°C', 'VFib']
  )

  // 4. Station Generator Failure (Recovery steps, lake line drain)
  await assertQuery(
    'Generator Failure SOP',
    'What is the emergency protocol if station generators fail?',
    ['SOP-ENG-04', '250 kVA', 'Load Shedding', 'Priyadarshini']
  )

  // 5. Low Stock Inventory Query
  await assertQuery(
    'Low Stock Items Query',
    'Which inventory items are critically low across all polar stations?',
    ['Low stock', 'Current Stock', 'Buffer', 'Maitri']
  )

  // 6. Station Profiles (Maitri & Bharati)
  await assertQuery(
    'Maitri Station Profile & Geodetics',
    'Tell me authoritative specs about Maitri research station.',
    ['Maitri', 'Schirmacher Oasis', '1989', 'Priyadarshini', '250 kVA']
  )

  // 7. Hindi Personnel Query
  await assertQuery(
    'Hindi Personnel Lookup (मैत्री स्टेशन पर कौन है?)',
    'मैत्री स्टेशन पर कौन है?',
    ['Maitri', 'personnel', 'तैनात']
  )

  // 8. Hinglish Flight Query
  await assertQuery(
    'Hinglish Live Flight Safety (kya bharati par twin otter udana safe hai?)',
    'kya bharati par twin otter udana safe hai?',
    ['Flight Safety', 'Bharati', 'Twin Otter', 'Wind']
  )

  // 9. Hindi Whiteout Query
  await assertQuery(
    'Hindi Whiteout Protocol (व्हाइटआउट प्रोटोकॉल क्या है?)',
    'व्हाइटआउट प्रोटोकॉल क्या है?',
    ['कंडीशन 1', 'SOP-BLZ-01', 'लॉकडाउन', 'लाइफलाइन']
  )

  // 10. Crevasse Technical Rescue SOP
  await assertQuery(
    'Crevasse Technical Rescue Protocol',
    'How to rescue someone who fell into a crevasse?',
    ['SOP-CRV-02', '3:1 Z-Rig', 'snow pickets', 'suspension trauma']
  )

  console.log('================================================================')
  console.log(`VERIFICATION SUMMARY: ${passedCount} / ${totalTests} PASSED (${((passedCount / totalTests) * 100).toFixed(1)}%)`)
  console.log('================================================================')

  if (passedCount !== totalTests) {
    process.exit(1)
  }
}

runClarityTests().catch(err => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
