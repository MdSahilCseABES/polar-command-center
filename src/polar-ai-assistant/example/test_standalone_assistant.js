/**
 * STANDALONE AUTOMATED TEST SUITE FOR PORTABLE POLAR AI ASSISTANT
 * ===============================================================
 * Verifies that the extracted AI Assistant engine operates completely
 * independently on a novel project dataset (sampleData.js) without any
 * hardcoded dependence on original POLAR data.
 */

import { sampleProjectData } from './sampleData.js'
import { createProjectDataAdapter } from '../src/adapters/projectDataAdapter.js'
import { processOperationsQuery } from '../src/core/operationsIntelligence.js'

async function runTestSuite() {
  console.log('================================================================');
  console.log('PORTABLE POLAR AI ASSISTANT: INDEPENDENT STANDALONE VALIDATION');
  console.log('Testing against novel dataset: "ARCTIC POLAR II"');
  console.log('================================================================\n');

  const adapter = createProjectDataAdapter(sampleProjectData, {
    projectName: 'ARCTIC POLAR II',
  })
  const normalizedData = adapter.getProjectData()

  console.log('[ADAPTER VERIFICATION]');
  console.log(`- Project Name: ${normalizedData.projectName}`);
  console.log(`- Expeditions: ${normalizedData.expeditions.length} loaded`);
  console.log(`- Personnel: ${normalizedData.personnel.length} loaded`);
  console.log(`- Stations / Locations: ${normalizedData.locations.length} loaded`);
  console.log(`- Inventory Items: ${normalizedData.inventory.length} loaded`);
  console.log(`- Cargo Consignments: ${normalizedData.cargo.length} loaded`);
  console.log(`- Emergencies: ${normalizedData.emergencies.length} loaded`);
  console.log(`- Auto-computed stats:`, normalizedData.stats);
  console.log('Adapter initialization: >>> PASSED <<<\n');

  const testCases = [
    {
      id: 1,
      category: 'General Project Query (Mission Completion)',
      q: 'Which mission is closest to completion?',
      expected: ['EXP-801', '84%'],
      forbidden: ['EXP-004', 'EXP-003', 'Maitri'],
    },
    {
      id: 2,
      category: 'Hinglish Query (Mission Progress)',
      q: 'konsa mission sabse aage hai?',
      expected: ['EXP-801', '84%'],
      forbidden: ['EXP-003', 'EXP-004'],
    },
    {
      id: 3,
      category: 'Generic Multi-Attribute Extraction (Personnel: Blood + Satphone)',
      q: 'Dr. Sarah Lindqvist ka blood group aur satphone number kya hai?',
      expected: ['O+', '+881-690-112-901'],
      forbidden: ['Meera Iyer', 'A+'],
    },
    {
      id: 4,
      category: 'Generic Multi-Attribute Extraction (Cargo: Weight + Status + Location)',
      q: 'CRG-901 ka weight, status aur location kya hai?',
      expected: ['420', 'DELAYED', 'Nordic Logistics Depot'],
      forbidden: ['C-105', 'Novo Runway'],
    },
    {
      id: 5,
      category: 'Dynamic Inventory Reasoning (Low Stock Detection)',
      q: 'Kaunsa saman low stock mein hai?',
      expected: ['High-Altitude Arctic Tents', 'Borealis Field Camp'],
      forbidden: ['Trauma Kits', 'Maitri'],
    },
    {
      id: 6,
      category: 'Inventory Specific Stock & Threshold Query',
      q: 'Aurora Research Station par Jet-A1 Polar Fuel kitna available hai?',
      expected: ['28,500', 'litres'],
      forbidden: ['14,200', 'Diesel'],
    },
    {
      id: 7,
      category: 'Delayed Cargo Query',
      q: 'kya koi cargo late hai?',
      expected: ['CRG-901', 'DELAYED', 'Drill Bit'],
      forbidden: ['C-105'],
    },
    {
      id: 8,
      category: 'Station Profile & Attention Reasoning',
      q: 'kaunsi station ko attention chahiye?',
      expected: ['Borealis Field Camp'],
      forbidden: ['Maitri Station'],
    },
    {
      id: 9,
      category: 'Emergency / Incident Triage',
      q: 'Borealis Field Camp par kaunsa incident chal raha hai?',
      expected: ['INC-801', 'CRITICAL', 'generator'],
      forbidden: ['INC-001', 'Medical'],
    },
    {
      id: 10,
      category: 'Personnel Deployed Count & Roster',
      q: 'Aurora Research Station par kitne log hain?',
      expected: ['Dr. Sarah Lindqvist'],
      forbidden: ['Arjun Sharma', 'Maitri'],
    },
  ]

  let passed = 0
  for (const tc of testCases) {
    console.log(`[TEST ${tc.id}/14] ${tc.category}`);
    console.log(`Query: "${tc.q}"`);

    const res = await processOperationsQuery(tc.q, normalizedData, {})
    const reply = res?.reply || ''
    console.log(`Reply:\n${reply}\n`);

    const hasExpected = tc.expected.every((tok) => reply.toLowerCase().includes(tok.toLowerCase()))
    const hasForbidden = tc.forbidden.some((tok) => reply.toLowerCase().includes(tok.toLowerCase()))

    if (res?.handled && hasExpected && !hasForbidden) {
      console.log(`Result: >>> PASSED <<<\n`);
      passed++
    } else {
      console.error(`Result: >>> FAILED <<<`);
      if (!res?.handled) console.error('  - Query was not handled by engine');
      if (!hasExpected) console.error('  - Missing expected tokens:', tc.expected);
      if (hasForbidden) console.error('  - Contained forbidden leaked tokens:', tc.forbidden);
      console.error('');
    }
  }

  console.log('[TEST 11/14] Multi-turn Conversation Context — Turn 1 (Establish Entity)');
  const turn1Query = 'EXP-802 ka target end date kab hai?'
  console.log(`Query: "${turn1Query}"`);
  const turn1Res = await processOperationsQuery(turn1Query, normalizedData, {})
  console.log(`Reply:\n${turn1Res?.reply}\n`);
  const sessionCtx = turn1Res?.sessionContext || {}

  if (turn1Res?.handled && turn1Res.reply.includes('2027-11-30')) {
    console.log(`Result: >>> PASSED <<<\n`);
    passed++
  } else {
    console.error(`Result: >>> FAILED <<<\n`);
  }

  console.log('[TEST 12/14] Multi-turn Conversation Context — Turn 2 ("isme kitne log hain?")');
  const turn2Query = 'isme kitne log hain?'
  console.log(`Query: "${turn2Query}" (using sessionContext from Turn 1)`);
  const turn2Res = await processOperationsQuery(turn2Query, normalizedData, sessionCtx)
  console.log(`Reply:\n${turn2Res?.reply}\n`);

  if (turn2Res?.handled && turn2Res.reply.includes('24')) {
    console.log(`Result: >>> PASSED <<< (Successfully resolved "isme" -> EXP-802)\n`);
    passed++
  } else {
    console.error(`Result: >>> FAILED <<< (Failed to resolve pronoun "isme")\n`);
  }

  console.log('[TEST 13/14] Multi-turn Conversation Context — Turn 3 ("iska leader kaun hai?")');
  const turn3Query = 'iska leader kaun hai?'
  console.log(`Query: "${turn3Query}" (using sessionContext from Turn 2)`);
  const turn3Res = await processOperationsQuery(turn3Query, normalizedData, sessionCtx)
  console.log(`Reply:\n${turn3Res?.reply}\n`);

  if (turn3Res?.handled && turn3Res.reply.includes('Erik Thorne')) {
    console.log(`Result: >>> PASSED <<< (Successfully resolved "iska" -> Capt. Erik Thorne)\n`);
    passed++
  } else {
    console.error(`Result: >>> FAILED <<< (Failed to resolve pronoun "iska")\n`);
  }

  console.log('[TEST 14/14] Strict Zero Data Leakage Verification');
  const leakageQuery = 'Describe all active stations and missions.'
  const leakRes = await processOperationsQuery(leakageQuery, normalizedData, {})
  const leakText = leakRes?.reply || ''

  const oldDataTokens = ['Maitri', 'Bharati', 'Himadri', 'Arjun Sharma', 'Meera Iyer', 'EXP-001', 'EXP-002', 'C-101']
  const foundLeaks = oldDataTokens.filter((tok) => leakText.includes(tok))

  if (foundLeaks.length === 0) {
    console.log(`Result: >>> PASSED <<< (Verified ZERO hardcoded demo data leakage)\n`);
    passed++
  } else {
    console.error(`Result: >>> FAILED <<< (Found leaked old tokens: ${foundLeaks.join(', ')})\n`);
  }

  console.log('================================================================');
  console.log(`STANDALONE TEST RESULTS: ${passed} / 14 PASSED (${((passed / 14) * 100).toFixed(1)}%)`);
  console.log('================================================================');

  if (passed === 14) {
    console.log('\n>>> ALL 14 STANDALONE VERIFICATION CRITERIA MET SUCCESSFULLY! <<<');
    process.exit(0)
  } else {
    console.error(`\n>>> FAILED ${14 - passed} TESTS <<<`);
    process.exit(1)
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error during test run:', err)
  process.exit(1)
})
