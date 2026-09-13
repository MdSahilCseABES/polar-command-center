import { Activity, AlertTriangle, Compass } from 'lucide-react'

const SUGGESTED_QUERIES = [
  { text: 'Show active expeditions', icon: Compass },
  { text: 'Summarize operational status', icon: Activity },
  { text: 'Flight safety limits', icon: AlertTriangle },
]

export default function QuickActions({ onSelect, disabled }) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-[var(--line-soft)] bg-[var(--navy-950)]/60">
      <div className="w-full text-[10px] font-mono uppercase tracking-wider text-[var(--ink-low)] mb-0.5 flex items-center justify-between">
        <span>Quick Directives</span>
        <span className="text-[9px] text-[var(--ice-dim)]">Polar Intel</span>
      </div>
      {SUGGESTED_QUERIES.map(({ text, icon: Icon }) => (
        <button
          key={text}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(text)}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-[11.5px] rounded-md bg-[var(--navy-850)] hover:bg-[var(--navy-800)] text-[var(--ink-high)] hover:text-[var(--ice)] border border-[var(--line)] hover:border-[var(--ice-dim)] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-left shadow-sm"
        >
          <Icon size={12} className="shrink-0 text-[var(--ice)]" />
          <span>{text}</span>
        </button>
      ))}
    </div>
  )
}
