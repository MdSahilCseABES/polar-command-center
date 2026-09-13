import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'

export default function ChatInput({ onSend, disabled, placeholder }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  // Auto-resize textarea height as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [text])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = (e) => {
    if (e) e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 border-t border-[var(--line)] bg-[var(--navy-900)] flex items-end gap-2"
    >
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Ask about devices, GPS positions, alerts, cargo...'}
          className="w-full resize-none max-h-[120px] min-h-[38px] px-3 py-2 text-[13px] bg-[var(--navy-800)] text-[var(--ink-hi)] placeholder-[var(--ink-low)] border border-[var(--line)] rounded-sm focus:border-[var(--ice-dim)] focus:outline-none transition-colors font-body leading-snug"
        />
      </div>

      <button
        type="submit"
        disabled={disabled || !text.trim()}
        title="Send query (Enter)"
        className="h-[38px] w-[38px] shrink-0 inline-flex items-center justify-center rounded-sm bg-[var(--ice)] text-[var(--navy-950)] hover:bg-[#85e4e4] active:bg-[#5bc2c2] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-sm"
      >
        <Send size={15} strokeWidth={2.2} />
      </button>
    </form>
  )
}
