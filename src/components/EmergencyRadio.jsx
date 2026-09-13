/**
 * EMERGENCY TACTICAL RADIO & COMMUNICATIONS HUB
 * ===============================================
 * Field communications console supporting:
 *   1. Real-time tactical transmissions with priority tags (CRITICAL, HIGH, NORMAL).
 *   2. Predefined polar quick-transmissions for rapid field signaling.
 *   3. Simulated satellite/HF blackout resilience with offline queuing and batch sync.
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  AlertTriangle,
  Clock,
  MapPin,
  Radio,
  RefreshCw,
  Send,
  ShieldAlert,
  Wifi,
  WifiOff,
} from 'lucide-react'
import {
  PREDEFINED_QUICK_MESSAGES,
  enqueueMessage,
  flushOfflineQueue,
  getMessages,
  getQueuedMessages,
  getSimulatedNetworkState,
  saveMessage,
  setSimulatedNetworkState,
} from '../services/emergencyStorage'
import { playAcknowledgeChirp, playEmergencyAlertSound } from '../services/audioAlert'
import { timeAgo } from '../lib/format'

export default function EmergencyRadio({
  activeIncidentId,
  currentOperator = 'Field Operator',
  currentRole = 'Field Scientist',
}) {
  const [messages, setMessages] = useState(getMessages)
  const [queuedCount, setQueuedCount] = useState(() => getQueuedMessages().length)
  const [networkState, setNetworkState] = useState(getSimulatedNetworkState)
  const [inputText, setInputText] = useState('')
  const [priority, setPriority] = useState('NORMAL')
  const [isSyncing, setIsSyncing] = useState(false)

  const messagesEndRef = useRef(null)

  // Sync state with custom events
  useEffect(() => {
    const handleMsgUpdate = (e) => setMessages(e.detail || getMessages())
    const handleQueueUpdate = () => setQueuedCount(getQueuedMessages().length)
    const handleNetUpdate = (e) => setNetworkState(e.detail)

    window.addEventListener('polar:messages-update', handleMsgUpdate)
    window.addEventListener('polar:offline-queue-update', handleQueueUpdate)
    window.addEventListener('polar:network-state-change', handleNetUpdate)

    return () => {
      window.removeEventListener('polar:messages-update', handleMsgUpdate)
      window.removeEventListener('polar:offline-queue-update', handleQueueUpdate)
      window.removeEventListener('polar:network-state-change', handleNetUpdate)
    }
  }, [])

  // Auto-scroll chat to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, queuedCount])

  const handleSendMessage = (customText) => {
    const text = (customText || inputText).trim()
    if (!text) return

    const newMsg = {
      id: `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      incidentId: activeIncidentId || 'INC-GENERAL',
      senderId: 'PERS-CURRENT',
      senderName: currentOperator,
      senderRole: currentRole,
      text,
      priority,
      timestamp: new Date().toISOString(),
      status: networkState === 'OFFLINE' ? 'queued' : 'delivered',
    }

    if (networkState === 'OFFLINE') {
      enqueueMessage(newMsg)
    } else {
      saveMessage(newMsg)
    }

    if (priority === 'CRITICAL') {
      playEmergencyAlertSound()
    } else {
      playAcknowledgeChirp()
    }

    setInputText('')
  }

  const handleBatchSync = () => {
    setIsSyncing(true)
    setTimeout(() => {
      const res = flushOfflineQueue()
      playAcknowledgeChirp()
      setIsSyncing(false)
    }, 600)
  }

  const handleNetworkToggle = (newState) => {
    setSimulatedNetworkState(newState)
    playAcknowledgeChirp()
  }

  return (
    <div className="card flex flex-col h-[560px] overflow-hidden p-0 border">
      {/* Radio Header */}
      <div
        className="flex flex-wrap items-center justify-between border-b px-4 py-3 gap-2"
        style={{
          borderColor: 'var(--line)',
          backgroundColor: 'var(--surface-raised)',
        }}
      >
        <div className="flex items-center gap-2">
          <Radio size={16} className="text-[var(--ice)] animate-pulse" />
          <span className="font-display text-xs font-bold uppercase tracking-wider text-hi">
            Tactical Emergency Radio (HF / Iridium)
          </span>
        </div>

        {/* Network Resilience Simulation Switch */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-low uppercase font-semibold">Comms Link:</span>
          <div className="inline-flex rounded border p-0.5 bg-[var(--surface-card)]" style={{ borderColor: 'var(--line)' }}>
            {['ONLINE', 'INTERMITTENT', 'OFFLINE'].map((state) => {
              const active = networkState === state
              return (
                <button
                  key={state}
                  type="button"
                  onClick={() => handleNetworkToggle(state)}
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase transition ${
                    active
                      ? state === 'ONLINE'
                        ? 'bg-[var(--green)] text-white shadow-sm'
                        : state === 'INTERMITTENT'
                        ? 'bg-[var(--amber)] text-white shadow-sm'
                        : 'bg-[var(--red)] text-white shadow-sm'
                      : 'text-mid hover:text-hi'
                  }`}
                >
                  {state}
                </button>
              )
            })}
          </div>

          {queuedCount > 0 && (
            <button
              type="button"
              onClick={handleBatchSync}
              disabled={isSyncing || networkState === 'OFFLINE'}
              className="flex items-center gap-1 rounded bg-[var(--amber)] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm disabled:opacity-50"
              title="Synchronize offline messages"
            >
              <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
              <span>Sync ({queuedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--surface-card)]">
        {messages.map((m) => {
          const isCritical = m.priority === 'CRITICAL'
          const isHigh = m.priority === 'HIGH'
          const isMe = m.senderName === currentOperator

          return (
            <div
              key={m.id}
              className={`flex flex-col rounded-lg border p-2.5 text-xs transition ${
                isCritical
                  ? 'border-[var(--red)] bg-[var(--surface-raised)] shadow-sm'
                  : isHigh
                  ? 'border-[var(--orange)] bg-[var(--surface-raised)]'
                  : 'border-[var(--line)] bg-[var(--surface-card)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-hi">{m.senderName}</span>
                  <span className="text-[10px] text-low">({m.senderRole})</span>
                  <span
                    className={`rounded px-1.5 py-[2px] text-[9px] font-bold uppercase ${
                      isCritical
                        ? 'bg-[var(--red)] text-white'
                        : isHigh
                        ? 'bg-[var(--orange)] text-white'
                        : 'bg-[var(--line)] text-mid'
                    }`}
                  >
                    {m.priority}
                  </span>
                  {m.status === 'queued' && (
                    <span className="rounded bg-[var(--amber)] px-1 py-[2px] text-[9px] font-bold text-white">
                      OFFLINE QUEUED
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-low mono">{timeAgo(m.timestamp)}</span>
              </div>

              <p className="text-mid leading-relaxed select-text">{m.text}</p>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Predefined Quick-Transmissions */}
      <div
        className="border-t px-3 py-2 overflow-x-auto whitespace-nowrap scrollbar-thin"
        style={{
          borderColor: 'var(--line)',
          backgroundColor: 'var(--surface-raised)',
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase text-low mr-1">Quick Transmit:</span>
          {PREDEFINED_QUICK_MESSAGES.map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() => handleSendMessage(quick)}
              className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition hover:border-[var(--ice-dim)] hover:bg-[var(--surface-card)] hover:text-hi"
              style={{
                borderColor: 'var(--line)',
                backgroundColor: 'var(--surface-card)',
                color: 'var(--ink-mid)',
              }}
            >
              {quick}
            </button>
          ))}
        </div>
      </div>

      {/* Transmission Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSendMessage()
        }}
        className="flex items-center gap-2 border-t p-3"
        style={{
          borderColor: 'var(--line)',
          backgroundColor: 'var(--surface-card)',
        }}
      >
        {/* Priority Selector */}
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded border px-2 py-1.5 text-xs font-bold bg-[var(--surface-raised)]"
          style={{
            borderColor: 'var(--line)',
            color:
              priority === 'CRITICAL'
                ? 'var(--red)'
                : priority === 'HIGH'
                ? 'var(--orange)'
                : 'var(--ink-hi)',
          }}
        >
          <option value="NORMAL">NORMAL</option>
          <option value="HIGH">HIGH</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>

        {/* Input */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Transmit tactical emergency broadcast..."
          className="input flex-1 text-xs"
        />

        {/* Send Button */}
        <button
          type="submit"
          className="btn flex items-center gap-1.5 px-4 py-1.5 text-xs"
          style={{
            backgroundColor: priority === 'CRITICAL' ? 'var(--red)' : undefined,
            borderColor: priority === 'CRITICAL' ? 'var(--red)' : undefined,
          }}
        >
          <Send size={13} />
          <span>Transmit</span>
        </button>
      </form>
    </div>
  )
}
