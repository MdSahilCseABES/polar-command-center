/**
 * POLAR AI ASSISTANT SYSTEM — STANDALONE PORTABLE MODULE
 * ========================================================
 * Main entry point exporting the complete AI Assistant UI,
 * Data Adapter, and Query Engine.
 */

// UI Components
export { default as AIChatbot } from './components/AIChatbot/AIChatbot.jsx'
export { default as ChatWindow } from './components/AIChatbot/ChatWindow.jsx'
export { default as ChatMessage } from './components/AIChatbot/ChatMessage.jsx'
export { default as ChatInput } from './components/AIChatbot/ChatInput.jsx'
export { default as QuickActions } from './components/AIChatbot/QuickActions.jsx'

// Data Adapter
export {
  ProjectDataAdapter,
  createProjectDataAdapter,
} from './adapters/projectDataAdapter.js'

// AI & Query Engine Core
export {
  processOperationsQuery,
  extractMapActions,
  isHinglish,
} from './core/operationsIntelligence.js'

export {
  evaluateGeneralProjectQuery,
  resolveGenericMultiAttributeQuery,
  extractProjectEntities,
  ATTRIBUTE_REGISTRY,
} from './core/projectQueryEngine.js'

export {
  executeOperationsAI,
  generateLocalOperationsReply,
} from './core/operationsAI.js'

export {
  processInventoryCommand,
  normalizeHinglish,
  findInventoryItem,
} from './core/inventoryActions.js'

export { buildAIContext } from './core/contextBuilder.js'
export { POLAR_SYSTEM_PROMPT } from './core/systemPrompt.js'

export {
  PROJECT_METADATA,
  PROJECT_MODULES,
  ENTITY_SCHEMAS,
  PROJECT_ROLES,
} from './core/projectKnowledge.js'

// Utilities
export * from './utils/statuses.js'
export * from './utils/format.js'
export * from './utils/weatherService.js'

// Default export
export { default } from './components/AIChatbot/AIChatbot.jsx'
