import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bot, Radio, Sparkles, X } from 'lucide-react'
import ChatWindow from './ChatWindow.jsx'
import { buildAIContext } from '../../core/contextBuilder.js'
import { processOperationsQuery } from '../../core/operationsIntelligence.js'
import { executeOperationsAI } from '../../core/operationsAI.js'
import { createProjectDataAdapter, ProjectDataAdapter } from '../../adapters/projectDataAdapter.js'
import './chatbot.css'

function loadSavedChat(key) {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveChat(key, history) {
  try {
    sessionStorage.setItem(key, JSON.stringify(history))
  } catch {
    // Storage unavailable, ignore
  }
}

export default function AIChatbot({
  dataAdapter,
  data: directData,
  projectName = 'POLAR',
  title = 'Polar AI Assistant',
  subtitle = 'NCPOR Mission Intelligence',
  apiEndpoint = '/api/chat',
  onFocusMap,
  goTo,
  storageKey = 'polar.ai_chat_history',
  defaultOpen = false,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [messages, setMessages] = useState(() => loadSavedChat(storageKey))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastQuery, setLastQuery] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [sessionContext, setSessionContext] = useState({})

  const adapter = useMemo(() => {
    if (dataAdapter instanceof ProjectDataAdapter) {
      return dataAdapter
    }
    const source = dataAdapter || directData || {}
    return createProjectDataAdapter(source, { projectName })
  }, [dataAdapter, directData, projectName])

  const projectData = useMemo(() => {
    return adapter.getProjectData()
  }, [adapter, dataAdapter, directData])

  useEffect(() => {
    saveChat(storageKey, messages)
  }, [messages, storageKey])

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleSendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      setError(null)
      setLastQuery(trimmed)

      const userMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      try {
        const opResult = await processOperationsQuery(trimmed, projectData, sessionContext)
        if (opResult && opResult.handled) {
          if (opResult.sessionContext) {
            setSessionContext(opResult.sessionContext)
          }
          const assistantMessage = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: opResult.reply,
            actions: opResult.actions || [],
            timestamp: new Date().toISOString(),
          }
          setMessages((prev) => [...prev, assistantMessage])
          setIsLoading(false)
          if (!isOpen) {
            setUnreadCount((c) => c + 1)
          }
          return
        }

        const context = buildAIContext(trimmed, projectData)
        const historyForApi = messages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        }))

        let result = null

        try {
          const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: trimmed,
              history: historyForApi,
              context,
            }),
          })

          if (response.ok) {
            result = await response.json()
          } else if (response.status === 404) {
            result = await executeOperationsAI(trimmed, historyForApi, context, projectData, sessionContext)
          } else {
            const errResult = await response.json().catch(() => null)
            if (errResult?.isKeyMissing) {
              result = await executeOperationsAI(trimmed, historyForApi, context, projectData, sessionContext)
            } else {
              const errMsg =
                errResult?.error ||
                `AI service error (HTTP ${response.status}). Please check network or API keys.`
              setError(errMsg)
              setIsLoading(false)
              return
            }
          }
        } catch (fetchErr) {
          result = await executeOperationsAI(trimmed, historyForApi, context, projectData, sessionContext)
        }

        if (!result || (!result.reply && !result.error)) {
          setError('No response generated by the AI operational engine.')
          setIsLoading(false)
          return
        }

        if (result.sessionContext) {
          setSessionContext(result.sessionContext)
        }

        const assistantMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: result.reply || 'Operational telemetry processed.',
          actions: result.actions || [],
          timestamp: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, assistantMessage])

        if (!isOpen) {
          setUnreadCount((c) => c + 1)
        }
      } catch (err) {
        setError(
          'Operational intelligence error processing request. Please retry.'
        )
      } finally {
        setIsLoading(false)
      }
    },
    [apiEndpoint, isLoading, isOpen, messages, projectData, sessionContext]
  )

  const handleFocusOnMap = useCallback(
    (action) => {
      if (onFocusMap) {
        onFocusMap(action)
      } else if (goTo) {
        goTo('map')
      }
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setIsOpen(false)
      }
    },
    [goTo, onFocusMap]
  )

  const handleClearChat = useCallback(() => {
    setMessages([])
    setError(null)
    setSessionContext({})
    sessionStorage.removeItem(storageKey)
  }, [storageKey])

  const handleRetry = useCallback(() => {
    if (lastQuery) {
      handleSendMessage(lastQuery)
    }
  }, [handleSendMessage, lastQuery])

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40 polar-ai-assistant">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          title={isOpen ? `Close ${title}` : `Open ${title}`}
          aria-label={`Toggle ${title}`}
          className={`relative group flex items-center justify-center w-12 h-12 rounded-full border transition-all duration-200 shadow-xl ${
            isOpen
              ? 'bg-[var(--navy-850)] border-[var(--ice)] text-[var(--ice)] shadow-[0_0_20px_rgba(111,214,214,0.35)]'
              : 'bg-[var(--navy-900)] hover:bg-[var(--navy-850)] border-[var(--ice-dim)] text-[var(--ice)] hover:border-[var(--ice)] shadow-[0_0_15px_rgba(111,214,214,0.25)] hover:shadow-[0_0_25px_rgba(111,214,214,0.45)]'
          }`}
        >
          {isOpen ? (
            <X size={20} className="transition-transform duration-200 rotate-0 group-hover:rotate-90" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Bot size={22} className="transition-transform duration-200 group-hover:scale-110" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--green)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--green)]" />
              </span>
            </div>
          )}

          {!isOpen && unreadCount > 0 && (
            <span className="absolute -top-1.5 -left-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--orange)] text-[var(--navy-950)] text-[10px] font-mono font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-x-2 bottom-20 top-16 sm:inset-auto sm:bottom-20 sm:right-5 z-50 sm:w-[430px] sm:max-w-[calc(100vw-2.5rem)] sm:h-[620px] sm:max-h-[calc(100vh-6.5rem)] polar-animate-fade-in">
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            error={error}
            onSend={handleSendMessage}
            onClear={handleClearChat}
            onClose={() => setIsOpen(false)}
            onFocusMap={handleFocusOnMap}
            onRetry={handleRetry}
            onDismissError={() => setError(null)}
            title={title}
            subtitle={subtitle}
            projectName={projectName}
          />
        </div>
      )}
    </>
  )
}
