/**
 * SOURCE BADGE COMPONENT
 * ======================
 * Renders an explicit, transparent data provenance tag.
 *
 * Distinguishes clearly between:
 * - OFFICIAL REFERENCE (NCPOR, MoES, COMNAP official publications)
 * - LIVE (Direct confirmed real-time connection)
 * - HISTORICAL REANALYSIS (Model-derived reanalysis such as ERA5-Land via Open-Meteo)
 * - REANALYSIS (Numerical weather prediction model data)
 * - NCPOR OBSERVATION (Direct station AWS observational record)
 * - DEMO PERSONNEL (Simulated 16-member crew roster based on AFMC/NCPOR guidelines)
 * - SIMULATED LOGISTICS DATA (Representative resupply manifests)
 * - SIMULATED INVENTORY (Research-informed consumable buffer thresholds)
 * - SIMULATED INCIDENT (Representative emergency operational workflow)
 * - SIMULATED (Operational simulation)
 * - FALLBACK (Cached/indicative figures during network interruption)
 */

import {
  AlertCircle,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  CloudRain,
  ExternalLink,
  Layers,
  Radio,
  ShieldCheck,
  Tag,
  UserCheck,
} from 'lucide-react'

export const STATUS_CONFIG = {
  'OFFICIAL REFERENCE': {
    label: 'OFFICIAL REFERENCE',
    icon: ShieldCheck,
    bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-500',
    tooltip: 'Grounded directly in published official records of NCPOR, MoES, or COMNAP.',
  },
  'OFFICIAL': {
    label: 'OFFICIAL REFERENCE',
    icon: ShieldCheck,
    bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-500',
    tooltip: 'Grounded directly in published official records of NCPOR, MoES, or COMNAP.',
  },
  'NCPOR OBSERVATION': {
    label: 'NCPOR OBSERVATION',
    icon: CheckCircle2,
    bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
    dot: 'bg-teal-500',
    tooltip: 'Direct meteorological AWS observational record from NCPOR / IMD stations.',
  },
  'LIVE': {
    label: 'LIVE STREAM',
    icon: Radio,
    bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40',
    dot: 'bg-emerald-500 animate-pulse',
    tooltip: 'Active network connection streaming real-time sensor telematics.',
  },
  'HISTORICAL REANALYSIS': {
    label: 'HISTORICAL REANALYSIS',
    icon: CloudRain,
    bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    dot: 'bg-blue-500',
    tooltip: 'Model-derived historical reanalysis from Open-Meteo / ECMWF ERA5-Land. Not direct station sensor observation.',
  },
  'REANALYSIS': {
    label: 'REANALYSIS / NWP MODEL',
    icon: CloudRain,
    bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
    dot: 'bg-sky-500',
    tooltip: 'Numerical Weather Prediction (NWP) model-derived forecast from Open-Meteo. Not direct station sensor observation.',
  },
  'DEMO PERSONNEL': {
    label: 'DEMO PERSONNEL',
    icon: UserCheck,
    bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    dot: 'bg-amber-500',
    tooltip: 'Simulated 16-member polar crew roster based on published NCPOR/AFMC staffing guidelines. Fictional names protect personal privacy.',
  },
  'DEMO': {
    label: 'DEMO DATA',
    icon: Tag,
    bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
    dot: 'bg-slate-400',
    tooltip: 'Demonstration record designed for operational workflow testing.',
  },
  'SIMULATED LOGISTICS DATA': {
    label: 'SIMULATED LOGISTICS DATA',
    icon: Layers,
    bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    dot: 'bg-purple-500',
    tooltip: 'Simulated resupply manifest modeled on official NCPOR/DROMLAN cargo categories and shipping advisories.',
  },
  'SIMULATED INVENTORY': {
    label: 'SIMULATED INVENTORY',
    icon: Boxes,
    bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
    dot: 'bg-orange-500',
    tooltip: 'Simulated consumable buffer thresholds modeled on standard Antarctic wintering requirements.',
  },
  'SIMULATED INCIDENT': {
    label: 'SIMULATED INCIDENT',
    icon: AlertTriangle,
    bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
    dot: 'bg-rose-500',
    tooltip: 'Simulated operational emergency scenario to demonstrate COMNAP/NCPOR triage protocols.',
  },
  'SIMULATED': {
    label: 'SIMULATED',
    icon: Layers,
    bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    dot: 'bg-purple-500',
    tooltip: 'Simulated telematic/operational record for demonstration purposes.',
  },
  'FALLBACK': {
    label: 'FALLBACK DATA ACTIVE',
    icon: AlertCircle,
    bg: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
    dot: 'bg-zinc-400',
    tooltip: 'Cached offline baseline active because live data source is currently unreachable.',
  },
}

export default function SourceBadge({
  status = 'OFFICIAL REFERENCE',
  text,
  sourceUrl,
  showLinkIcon = false,
  size = 'md',
  className = '',
}) {
  const normKey = String(status).toUpperCase().trim()
  const cfg = STATUS_CONFIG[normKey] || {
    label: text || status,
    icon: Tag,
    bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
    dot: 'bg-slate-400',
    tooltip: 'Operational data status',
  }

  const displayText = text || cfg.label
  const Icon = cfg.icon

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  }[size] || 'px-2.5 py-1 text-xs gap-1.5'

  const iconSizes = {
    xs: 10,
    sm: 11,
    md: 12,
    lg: 14,
  }[size] || 12

  const badgeContent = (
    <span
      className={`inline-flex items-center font-medium rounded-full border tracking-wide transition-colors ${cfg.bg} ${sizeClasses} ${className}`}
      title={cfg.tooltip}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
      <Icon size={iconSizes} strokeWidth={2.2} className="shrink-0" />
      <span className="font-semibold uppercase tracking-wider">{displayText}</span>
      {sourceUrl && showLinkIcon && (
        <ExternalLink size={10} className="ml-0.5 opacity-70 hover:opacity-100 shrink-0" />
      )}
    </span>
  )

  if (sourceUrl) {
    return (
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center hover:opacity-90 no-underline"
        title={`${cfg.tooltip} Click to view official source documentation.`}
      >
        {badgeContent}
      </a>
    )
  }

  return badgeContent
}
