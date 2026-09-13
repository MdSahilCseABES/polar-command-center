/**
 * STATCARD — one big number with a label, used in the dashboard's top row.
 *
 * Usage:
 *   <StatCard label="Active Expeditions" value={3} icon={Compass}
 *             hint="2 planning" tone="ok" onClick={...} />
 *
 * `tone` changes the colour of the number:
 *   default (ice) | ok (green) | warn (amber) | alert (red)
 * We only use a colour when it MEANS something — a red number must always
 * mean "someone needs to look at this".
 */

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  onClick,
  pulse = false,
}) {
  const toneClass = tone ? `stat-value--${tone}` : ''

  /* If an onClick is given, render a real <button> so it is keyboard
     accessible; otherwise a plain <div>. */
  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`card-tight ${onClick ? 'card-interactive' : ''} text-left w-full`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="eyebrow">{label}</span>
        {Icon && (
          <Icon
            size={16}
            strokeWidth={1.75}
            className={pulse ? 'pulse text-[var(--red)]' : 'text-[var(--ice-dim)]'}
          />
        )}
      </div>

      <div className={`stat-value ${toneClass}`}>{value}</div>

      {hint && <div className="text-[11px] text-low mt-1 leading-snug">{hint}</div>}
    </Wrapper>
  )
}
