/**
 * PANEL — the bordered box that every section of the UI sits inside.
 *
 * Usage:
 *   <Panel title="Active Expeditions" subtitle="3 running" action={<button/>}>
 *     ...content...
 *   </Panel>
 *
 * Having one Panel component means all boxes in the app share the exact
 * same padding, border and heading style. That visual consistency is a
 * large part of why the dashboard looks professional rather than homemade.
 */

export default function Panel({
  title,
  subtitle,
  eyebrow,
  action,
  children,
  className = '',
  tight = false,
  noPad = false,
}) {
  return (
    <section className={`${tight ? 'card-tight' : 'card'} ${className}`}>
      {(title || action || eyebrow) && (
        <header
          className={`flex items-start justify-between gap-4 ${noPad ? 'mb-0' : 'mb-4'}`}
        >
          <div className="min-w-0">
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <h2 className="panel-title">{title}</h2>}
            {subtitle && <p className="panel-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
