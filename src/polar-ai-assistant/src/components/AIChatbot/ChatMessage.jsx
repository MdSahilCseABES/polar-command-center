import { Bot, MapPin, User } from 'lucide-react'

/**
 * Lightweight markdown-like formatter for polar terminal responses.
 * Formats bold text, bullet points, numbered lists, tables, and device tags.
 */
function FormattedContent({ text }) {
  if (!text) return null

  const lines = text.split('\n')
  const elements = []
  let tableRows = []
  let inTable = false

  const flushTable = (key) => {
    if (tableRows.length > 0) {
      const headers = tableRows[0]
      const bodyRows = tableRows.slice(1).filter((r) => !r.isDivider)

      elements.push(
        <div key={`table-${key}`} className="my-2 overflow-x-auto">
          <table className="min-w-full text-xs border border-[var(--line)] rounded">
            <thead>
              <tr className="bg-[var(--navy-950)] text-[var(--ink-low)] uppercase tracking-wider font-mono">
                {headers.cells.map((h, i) => (
                  <th key={i} className="px-2.5 py-1.5 text-left border-b border-[var(--line)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line-soft)]">
              {bodyRows.map((row, ri) => (
                <tr key={ri} className="hover:bg-[var(--navy-850)]/50">
                  {row.cells.map((c, ci) => (
                    <td key={ci} className="px-2.5 py-1.5 font-mono text-[var(--ink-mid)]">
                      {renderInlineFormatting(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      tableRows = []
      inTable = false
    }
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim()

    // Detect Markdown tables
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim())
      const isDivider = cells.every((c) => /^:?-+:?$/.test(c))
      tableRows.push({ cells, isDivider })
      return
    } else if (inTable) {
      flushTable(idx)
    }

    if (!trimmed) {
      elements.push(<div key={idx} className="h-1.5" />)
      return
    }

    // Bullet points
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      elements.push(
        <div key={idx} className="flex items-start gap-2 my-0.5 pl-1">
          <span className="text-[var(--ice)] text-xs mt-1 leading-none">•</span>
          <span className="flex-1 text-[13px] text-[var(--ink-hi)]">
            {renderInlineFormatting(trimmed.slice(2))}
          </span>
        </div>
      )
      return
    }

    // Numbered lists
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/)
    if (numMatch) {
      elements.push(
        <div key={idx} className="flex items-start gap-2 my-0.5 pl-1">
          <span className="font-mono text-[11px] text-[var(--ice-dim)] mt-0.5">
            {numMatch[1]}.
          </span>
          <span className="flex-1 text-[13px] text-[var(--ink-hi)]">
            {renderInlineFormatting(numMatch[2])}
          </span>
        </div>
      )
      return
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={idx} className="font-display font-semibold text-[13.5px] text-[var(--ice)] uppercase tracking-wider mt-2 mb-1">
          {renderInlineFormatting(trimmed.slice(4))}
        </h4>
      )
      return
    }
    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      elements.push(
        <h3 key={idx} className="font-display font-bold text-[14px] text-[var(--ink-hi)] uppercase tracking-wider mt-2 mb-1">
          {renderInlineFormatting(trimmed.replace(/^#+\s*/, ''))}
        </h3>
      )
      return
    }

    // Regular line
    elements.push(
      <p key={idx} className="my-1 text-[13px] leading-relaxed text-[var(--ink-hi)]">
        {renderInlineFormatting(trimmed)}
      </p>
    )
  })

  if (inTable) {
    flushTable('end')
  }

  return <div>{elements}</div>
}

/**
 * Formats inline styles: **bold**, `code`, and highlighting device IDs
 */
function renderInlineFormatting(str) {
  if (!str) return ''
  // Split on **bold** and `code`
  const parts = []
  let remaining = str
  let key = 0

  while (remaining.length > 0) {
    // Bold match
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/)
    const codeMatch = remaining.match(/`(.*?)`/)

    const boldIndex = boldMatch ? remaining.indexOf(boldMatch[0]) : -1
    const codeIndex = codeMatch ? remaining.indexOf(codeMatch[0]) : -1

    if (boldIndex === -1 && codeIndex === -1) {
      parts.push(highlightEntities(remaining, key++))
      break
    }

    if (boldIndex !== -1 && (codeIndex === -1 || boldIndex < codeIndex)) {
      if (boldIndex > 0) {
        parts.push(highlightEntities(remaining.slice(0, boldIndex), key++))
      }
      parts.push(
        <strong key={key++} className="font-semibold text-[var(--ink-hi)]">
          {boldMatch[1]}
        </strong>
      )
      remaining = remaining.slice(boldIndex + boldMatch[0].length)
    } else {
      if (codeIndex > 0) {
        parts.push(highlightEntities(remaining.slice(0, codeIndex), key++))
      }
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded bg-[var(--navy-950)] text-[var(--ice)] font-mono text-[11.5px] border border-[var(--line-soft)]"
        >
          {codeMatch[1]}
        </code>
      )
      remaining = remaining.slice(codeIndex + codeMatch[0].length)
    }
  }

  return parts
}

/**
 * Highlights recognizable polar identifiers (e.g. P-001, Maitri, Bharati, INC-001)
 */
function highlightEntities(text, baseKey) {
  // Regex for device IDs and station names
  const regex = /\b(P-\d{3}|INC-\d{3}|EXP-\d{3}|C-\d{3}|I-\d{3}|LOC-[A-Z0-9-]+)\b/g
  const parts = []
  let lastIdx = 0
  let match
  let i = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index))
    }
    const token = match[1]
    let badgeClass = 'text-[var(--ice)]'
    if (token.startsWith('INC-')) badgeClass = 'text-[var(--orange)]'
    if (token.startsWith('EXP-')) badgeClass = 'text-[var(--blue)]'

    parts.push(
      <span
        key={`${baseKey}-${i++}`}
        className={`font-mono font-medium ${badgeClass} bg-[var(--navy-950)]/60 px-1 py-0.5 rounded text-[12px] border border-[var(--line-soft)]`}
      >
        {token}
      </span>
    )
    lastIdx = regex.lastIndex
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx))
  }

  return parts.length > 0 ? parts : text
}

export default function ChatMessage({ message, onFocusMap }) {
  const isUser = message.role === 'user'
  const timeString = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  // Collect any map actions from message metadata or discoverable device IDs in text
  const mapActions = message.actions || []

  return (
    <div
      className={`flex flex-col mb-3.5 transition-opacity duration-200 ${
        isUser ? 'items-end' : 'items-start'
      }`}
    >
      {/* Role Header & Timestamp */}
      <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] font-mono text-[var(--ink-low)]">
        {isUser ? (
          <>
            <span>{timeString}</span>
            <span className="text-[var(--ink-mid)] font-medium">OPERATOR</span>
            <User size={12} className="text-[var(--ice)]" />
          </>
        ) : (
          <>
            <Bot size={12} className="text-[var(--ice)]" />
            <span className="text-[var(--ice)] font-medium">POLAR AI ASSISTANT</span>
            <span>·</span>
            <span>{timeString}</span>
          </>
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={`relative max-w-[92%] sm:max-w-[88%] rounded-sm px-3.5 py-2.5 text-sm ${
          isUser
            ? 'bg-[var(--navy-800)] border border-[var(--ice-dim)]/40 text-[var(--ink-hi)] shadow-sm'
            : 'bg-[var(--navy-900)] border border-[var(--line)] text-[var(--ink-hi)] shadow-md'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed font-body">
            {message.content}
          </p>
        ) : (
          <FormattedContent text={message.content} />
        )}

        {/* Map Action Buttons */}
        {!isUser && mapActions.length > 0 && onFocusMap && (
          <div className="mt-3 pt-2.5 border-t border-[var(--line-soft)] flex flex-wrap gap-2">
            {mapActions.map((action, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onFocusMap(action)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-medium rounded bg-[var(--ice)]/10 hover:bg-[var(--ice)]/20 text-[var(--ice)] border border-[var(--ice-dim)]/60 hover:border-[var(--ice)] transition-all duration-150 shadow-sm"
              >
                <MapPin size={11} className="text-[var(--ice)] shrink-0" />
                <span>View {action.label || action.id} on Map</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
