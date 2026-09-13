/**
 * ARMED SOS DISTRESS MODAL
 * ========================
 * A military/polar-grade emergency broadcast modal with a 2-stage arming
 * mechanism to prevent accidental distress signaling.
 * Includes GPS coordinates fix, emergency category selection, and priority tagging.
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  AlertOctagon,
  AlertTriangle,
  Compass,
  Flame,
  LifeBuoy,
  Loader2,
  MapPin,
  Radio,
  Send,
  ShieldAlert,
  X,
} from 'lucide-react'
import { playEmergencyAlertSound } from '../services/audioAlert'

const EMERGENCY_TYPES = [
  { key: 'CREVASSE', label: 'Crevasse Incident', icon: Compass },
  { key: 'BLIZZARD', label: 'Severe Blizzard / Whiteout', icon: AlertTriangle },
  { key: 'MEDICAL', label: 'Medical Emergency', icon: LifeBuoy },
  { key: 'EQUIPMENT', label: 'Critical Equipment / Generator Failure', icon: Flame },
  { key: 'LOST', label: 'Lost in Field / Beacon Lost', icon: MapPin },
  { key: 'SOS', label: 'General Polar Mayday (SOS)', icon: ShieldAlert },
]

const POLAR_LOCATIONS = [
  { name: 'Maitri Outpost Ridge (Traverse WP-4)', lat: -70.7621, lng: 11.7412 },
  { name: 'Schirmacher Oasis Glacier Camp', lat: -70.7512, lng: 11.6891 },
  { name: 'Larsemann Hills Field Camp East', lat: -69.4124, lng: 76.1843 },
  { name: 'Bharati Station Inland Sector', lat: -69.4053, lng: 76.1872 },
  { name: 'Kongsvegen Glacier Traverse Line', lat: 78.9236, lng: 11.9222 },
  { name: 'Dakshin Gangotri Ice Shelf Depot', lat: -70.0983, lng: 12.0089 },
]

export default function EmergencyModal({
  isOpen,
  onClose,
  onSubmitSos,
  operatorName = 'Field Operator',
  operatorRole = 'Field Scientist',
}) {
  const [selectedType, setSelectedType] = useState('CREVASSE')
  const [priority, setPriority] = useState('CRITICAL')
  const [locationIndex, setLocationIndex] = useState(0)
  const [message, setMessage] = useState('')
  const [isArming, setIsArming] = useState(false)
  const [armProgress, setArmProgress] = useState(0)

  const chosenLocation = POLAR_LOCATIONS[locationIndex]
  const chosenTypeObj = EMERGENCY_TYPES.find((t) => t.key === selectedType)

  const handleFinalDispatch = useCallback(() => {
    playEmergencyAlertSound()

    const sosPayload = {
      type: chosenTypeObj?.label || 'General SOS',
      severity: priority,
      detail: chosenLocation.name,
      description:
        message.trim() ||
        `POLAR MAYDAY: ${chosenTypeObj?.label} declared by ${operatorName} at ${chosenLocation.name}.`,
      lat: chosenLocation.lat,
      lng: chosenLocation.lng,
      operatorName,
      operatorRole,
    }

    if (onSubmitSos) {
      onSubmitSos(sosPayload)
    }

    setIsArming(false)
    setArmProgress(0)
    onClose()
  }, [chosenTypeObj, priority, chosenLocation, message, operatorName, operatorRole, onSubmitSos, onClose])

  // Hold-to-arm simulation progress
  useEffect(() => {
    let interval
    if (isArming) {
      interval = window.setInterval(() => {
        setArmProgress((prev) => {
          if (prev >= 100) return 100
          return Math.min(100, prev + 25)
        })
      }, 150)
    } else {
      setArmProgress(0)
    }
    return () => clearInterval(interval)
  }, [isArming])

  // Trigger dispatch when armed to 100%
  useEffect(() => {
    if (armProgress >= 100 && isArming) {
      handleFinalDispatch()
    }
  }, [armProgress, isArming, handleFinalDispatch])

  if (!isOpen) return null

  return (
    <div
      id="emergency-sos-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md select-none"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
    >
      <div
        className="fade-up relative w-full max-w-lg overflow-hidden rounded-xl border-2 shadow-2xl"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--red)',
        }}
      >
        {/* Top Danger Stripe */}
        <div
          className="flex items-center justify-between px-5 py-3.5 text-white"
          style={{ backgroundColor: 'var(--red)' }}
        >
          <div className="flex items-center gap-2">
            <AlertOctagon size={20} className="animate-pulse" />
            <span className="font-display text-sm font-bold uppercase tracking-wider">
              Emergency Distress Broadcast Protocol (SOS)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/80 hover:bg-black/20 hover:text-white"
            aria-label="Close emergency modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Warning Notice */}
          <div
            className="rounded border p-3"
            style={{
              borderColor: 'rgba(239, 68, 68, 0.3)',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              color: 'var(--ink-hi)',
            }}
          >
            <div className="flex items-center gap-2 font-semibold" style={{ color: 'var(--red)' }}>
              <Radio size={14} className="animate-pulse" />
              <span>FAIL-SAFE ARMED DISPATCH PROTOCOL</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-mid">
              Activating distress immediately broadcasts alerts across all polar command consoles,
              triggers sirens, and switches field personnel status to <strong>EMERGENCY</strong>.
            </p>
          </div>

          {/* Emergency Category */}
          <div>
            <label className="field-label mb-1.5 block">1. Emergency Classification</label>
            <div className="grid grid-cols-2 gap-2">
              {EMERGENCY_TYPES.map((t) => {
                const Icon = t.icon
                const active = selectedType === t.key
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSelectedType(t.key)}
                    className={`flex items-center gap-2 rounded border p-2.5 text-left transition ${
                      active
                        ? 'border-[var(--red)] bg-[var(--surface-raised)] font-bold text-hi shadow-sm'
                        : 'border-[var(--line)] bg-[var(--surface-card)] text-mid hover:border-[var(--ice-dim)]'
                    }`}
                  >
                    <Icon size={16} className={active ? 'text-[var(--red)]' : 'text-low'} />
                    <span className="truncate text-[11.5px]">{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Priority & Location */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label mb-1 block">2. Severity Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="input text-xs"
              >
                <option value="CRITICAL">CRITICAL (Immediate Threat)</option>
                <option value="HIGH">HIGH (Urgent Rescue Required)</option>
                <option value="MEDIUM">MEDIUM (Assistance Required)</option>
                <option value="LOW">LOW (Advisory Concern)</option>
              </select>
            </div>

            <div>
              <label className="field-label mb-1 block">3. Location GPS Fix</label>
              <select
                value={locationIndex}
                onChange={(e) => setLocationIndex(Number(e.target.value))}
                className="input text-xs"
              >
                {POLAR_LOCATIONS.map((loc, idx) => (
                  <option key={loc.name} value={idx}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* GPS Coordinates readout */}
          <div
            className="flex items-center justify-between rounded border px-3 py-2 text-[11px] mono"
            style={{
              borderColor: 'var(--line)',
              backgroundColor: 'var(--surface-raised)',
              color: 'var(--ink-mid)',
            }}
          >
            <span className="flex items-center gap-1.5 text-hi font-semibold">
              <MapPin size={13} className="text-[var(--ice)]" />
              <span>COORDINATES:</span>
            </span>
            <span>
              {chosenLocation.lat.toFixed(4)}°, {chosenLocation.lng.toFixed(4)}°
            </span>
          </div>

          {/* Distress Message */}
          <div>
            <label className="field-label mb-1 block" htmlFor="sos-msg">
              4. Immediate Distress Transmission
            </label>
            <textarea
              id="sos-msg"
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="State status, injuries, equipment damage, or weather hazards..."
              className="input resize-none text-xs"
              maxLength={200}
            />
          </div>

          {/* 2-Stage Armed Dispatch Button */}
          <div className="pt-2 border-t" style={{ borderColor: 'var(--line)' }}>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                id="dispatch-sos-btn"
                onMouseDown={() => setIsArming(true)}
                onMouseUp={() => setIsArming(false)}
                onMouseLeave={() => setIsArming(false)}
                onTouchStart={() => setIsArming(true)}
                onTouchEnd={() => setIsArming(false)}
                onClick={handleFinalDispatch}
                className="relative overflow-hidden rounded-lg px-4 py-3 font-display text-sm font-bold uppercase tracking-wider text-white shadow-lg transition active:scale-[0.98]"
                style={{ backgroundColor: 'var(--red)' }}
              >
                {/* Hold progress overlay */}
                {isArming && (
                  <div
                    className="absolute inset-0 bg-black/35 transition-all duration-150"
                    style={{ width: `${armProgress}%` }}
                  />
                )}
                <div className="relative z-10 flex items-center justify-center gap-2">
                  <ShieldAlert size={18} className="animate-pulse" />
                  <span>
                    {isArming ? `ARMING DISTRESS (${armProgress}%)…` : 'CONFIRM & BROADCAST SOS DISTRESS'}
                  </span>
                </div>
              </button>
              <p className="text-center text-[10px] text-low">
                Click or hold to broadcast instant SOS signal to all polar station consoles.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
