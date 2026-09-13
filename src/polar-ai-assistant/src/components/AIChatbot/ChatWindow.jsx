import { useEffect, useRef } from 'react'
import {
  AlertCircle,
  Compass,
  Minus,
  Radio,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react'
import ChatMessage from './ChatMessage.jsx'
import ChatInput from './ChatInput.jsx'
import QuickActions from './QuickActions.jsx'

export default function ChatWindow({
  messages,
  isLoading,
  error,
  onSend,
  onClear,
  onClose,
  onFocusMap,
  onRetry,
  onDismissError,
  title = 'Polar AI Assistant',
  subtitle = 'NCPOR Mission Intelligence',
  projectName = 'POLAR',
}) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  return (
    <div className="flex flex-col h-full bg-[var(--navy-900)] border border-[var(--line)] rounded-sm shadow-2xl overflow-hidden font-body polar-ai-assistant">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[var(--navy-950)] border-b border-[var(--line)] select-none">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-7 h-7 rounded bg-[var(--navy-850)] border border-[var(--line)]">
            <Radio size={15} className="text-[var(--ice)] animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--green)] ring-2 ring-[var(--navy-950)]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-semibold text-[13.5px] uppercase tracking-wider text-[var(--ink-hi)]">
                {title}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono uppercase tracking-widest bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30">
                Active
              </span>
            </div>
            <div className="text-[10.5px] font-mono text-[var(--ink-low)] flex items-center gap-1.5">
              <span>{subtitle}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              title="Clear operational chat history"
              className="p-1.5 text-[var(--ink-low)] hover:text-[var(--ink-hi)] hover:bg-[var(--navy-800)] rounded transition-colors"
            >
              <RotateCcw size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Minimize Assistant"
            className="p-1.5 text-[var(--ink-low)] hover:text-[var(--ice)] hover:bg-[var(--navy-800)] rounded transition-colors"
          >
            <Minus size={15} />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Close Assistant"
            className="p-1.5 text-[var(--ink-low)] hover:text-[var(--red)] hover:bg-[var(--navy-800)] rounded transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3.5 space-y-1 bg-[var(--navy-950)]/70 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="py-6 px-2 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-[var(--navy-800)] border border-[var(--ice-dim)]/40 flex items-center justify-center text-[var(--ice)] shadow-lg shadow-[var(--ice)]/5">
              <Compass size={20} />
            </div>
            <h3 className="font-display font-semibold text-[15px] uppercase tracking-wider text-[var(--ink-hi)]">
              {title}
            </h3>
            <p className="mt-1 text-[12.5px] text-[var(--ink-mid)] max-w-[320px] mx-auto leading-relaxed">
              Operational console connected to current {projectName} assets, personnel GPS telemetry,
              cargo manifests, inventory reserves, and incident logs.
            </p>

            <div className="mt-5 text-left">
              <QuickActions onSelect={onSend} disabled={isLoading} />
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} onFocusMap={onFocusMap} />
            ))}
          </>
        )}

        {isLoading && (
          <div className="flex items-center gap-2.5 py-2 px-3 my-2 rounded bg-[var(--navy-900)] border border-[var(--line)] text-xs text-[var(--ink-mid)] w-fit">
            <Radio size={13} className="text-[var(--ice)] animate-spin" />
            <span className="font-mono text-[11.5px] tracking-wide text-[var(--ice)]">
              Scanning {projectName} telemetry...
            </span>
            <div className="flex items-center gap-1 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ice)] animate-ping" />
            </div>
          </div>
        )}

        {error && (
          <div className="my-2 p-3 rounded bg-[var(--orange)]/10 border border-[var(--orange)]/40 text-[var(--ink-hi)] flex items-start gap-2.5 text-xs">
            <AlertCircle size={15} className="text-[var(--orange)] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-medium text-[var(--orange)] block mb-0.5 font-display tracking-wide uppercase">
                System Advisory
              </span>
              <p className="text-[12px] leading-relaxed text-[var(--ink-mid)]">
                {error}
              </p>
              <div className="mt-2 flex items-center gap-2">
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="px-2 py-0.5 rounded text-[11px] font-mono bg-[var(--orange)]/20 hover:bg-[var(--orange)]/30 text-[var(--orange)] border border-[var(--orange)]/50 transition-colors"
                  >
                    Retry Query
                  </button>
                )}
                {onDismissError && (
                  <button
                    type="button"
                    onClick={onDismissError}
                    className="px-2 py-0.5 rounded text-[11px] font-mono text-[var(--ink-low)] hover:text-[var(--ink-hi)] transition-colors"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <div className="border-t border-[var(--line-soft)]">
          <QuickActions onSelect={onSend} disabled={isLoading} />
        </div>
      )}

      <ChatInput onSend={onSend} disabled={isLoading} />
    </div>
  )
}
