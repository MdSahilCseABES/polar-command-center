/**
 * POLAR COMMAND CENTER — OFFICIAL BRAND LOGO
 * ===========================================
 * Vector brand emblem featuring a crystalline Arctic glacial peak
 * nested within a precision navigation compass reticle with dual
 * orbital arcs and glowing cyan/ice accents.
 */

import React from 'react'

export default function PolarLogo({
  size = 36,
  className = '',
  withGlow = true,
  withText = false,
}) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
      >
        <defs>
          {/* Neon Ice Glow */}
          {withGlow && (
            <filter id="polar-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}

          {/* Ice Peak Gradients */}
          <linearGradient id="ice-main" x1="50" y1="20" x2="35" y2="75" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="45%" stopColor="#7DD3FC" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          <linearGradient id="ice-facet" x1="50" y1="20" x2="70" y2="75" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E0F2FE" />
            <stop offset="60%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#0369A1" />
          </linearGradient>

          <linearGradient id="ring-glow" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#0369A1" />
          </linearGradient>
        </defs>

        {/* Outer Precision Compass Orbit */}
        <circle
          cx="50"
          cy="50"
          r="44"
          stroke="url(#ring-glow)"
          strokeWidth="2.5"
          strokeDasharray="4 2"
          opacity="0.65"
          filter={withGlow ? 'url(#polar-glow)' : undefined}
        />

        {/* Outer Smooth Border Ring */}
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke="#38BDF8"
          strokeWidth="1.5"
          opacity="0.8"
        />

        {/* Cardinal Navigation Reticle Ticks */}
        <line x1="50" y1="3" x2="50" y2="9" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="50" y1="91" x2="50" y2="97" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="3" y1="50" x2="9" y2="50" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="91" y1="50" x2="97" y2="50" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />

        {/* Sub-cardinal Tick Marks */}
        <circle cx="19" cy="19" r="1.5" fill="#38BDF8" opacity="0.6" />
        <circle cx="81" cy="19" r="1.5" fill="#38BDF8" opacity="0.6" />
        <circle cx="19" cy="81" r="1.5" fill="#38BDF8" opacity="0.6" />
        <circle cx="81" cy="81" r="1.5" fill="#38BDF8" opacity="0.6" />

        {/* Tactical Horizon / Sea Ice Base Line */}
        <line
          x1="22"
          y1="72"
          x2="78"
          y2="72"
          stroke="#38BDF8"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.75"
        />

        {/* Central Glacial Mountain / Ice Peak (Left Facet) */}
        <polygon
          points="50,22 25,70 50,68"
          fill="url(#ice-main)"
          opacity="0.95"
        />

        {/* Central Glacial Mountain / Ice Peak (Right Facet - Shadow) */}
        <polygon
          points="50,22 50,68 75,70"
          fill="url(#ice-facet)"
          opacity="0.85"
        />

        {/* Internal Crystalline Fracture Line */}
        <polyline
          points="50,22 46,48 50,68"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Secondary Low Foothill / Crevasse Ridge */}
        <polygon
          points="35,70 48,52 56,70"
          fill="#38BDF8"
          opacity="0.35"
        />

        {/* Celestial Beacon / Star Over Apex */}
        <circle
          cx="50"
          cy="14"
          r="2.5"
          fill="#FFFFFF"
          filter={withGlow ? 'url(#polar-glow)' : undefined}
        />
      </svg>

      {withText && (
        <div className="flex flex-col">
          <span className="font-display text-[15px] font-bold uppercase tracking-[0.1em] text-hi leading-none">
            Polar Command Center
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ice)] mt-1 leading-none">
            NCPOR · MoES
          </span>
        </div>
      )}
    </div>
  )
}
