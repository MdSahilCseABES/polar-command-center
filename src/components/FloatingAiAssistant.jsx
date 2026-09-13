import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, ChevronRight, Users, Sparkles, ExternalLink } from 'lucide-react';
import { askCopilot, SUGGESTED_PROMPTS } from '../services/aiCopilotService';
import { useData } from '../store/DataContext';

function parseInline(text, goTo, onClose) {
  if (!text) return '';
  const parts = [];
  const regex = /(\*\*.*?\*\*|`.*?`|\[.*?->.*?\]|\[.*?\]\(.*?\))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <React.Fragment key={`text-${lastIndex}`}>
          {text.substring(lastIndex, match.index)}
        </React.Fragment>
      );
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`bold-${match.index}`} className="font-bold text-hi">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={`code-${match.index}`} className="mono text-[11px] bg-[var(--surface-sunken)] px-1 py-0.5 rounded text-[var(--ice)]">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[') && token.endsWith(']')) {
      const inner = token.slice(1, -1);
      if (inner.includes('->')) {
        const [label, dest] = inner.split('->').map((s) => s.trim());
        const ROUTE_MAP = {
          dashboard: 'dashboard',
          overview: 'dashboard',
          home: 'dashboard',
          expedition: 'expeditions',
          expeditions: 'expeditions',
          personnel: 'personnel',
          team: 'personnel',
          crew: 'personnel',
          roster: 'personnel',
          cargo: 'cargo',
          logistics: 'cargo',
          inventory: 'inventory',
          stock: 'inventory',
          stores: 'inventory',
          map: 'map',
          globe: 'map',
          radar: 'weather',
          weather: 'weather',
          telemetry: 'weather',
          emergency: 'emergency',
          sos: 'emergency',
          incidents: 'emergency',
          copilot: 'copilot',
          ai: 'copilot',
          aurora: 'copilot',
          sources: 'sources',
          research: 'sources',
          provenance: 'sources',
        };
        const target = ROUTE_MAP[dest.toLowerCase()];
        if (target) {
          parts.push(
            <button
              key={`link-${match.index}`}
              type="button"
              onClick={() => {
                if (goTo) {
                  goTo(target);
                  if (onClose) onClose();
                }
              }}
              className="inline-flex items-center gap-1 rounded bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ice)] hover:underline border border-[var(--line)] transition"
              title={`Go to ${label}`}
            >
              <span>{label}</span>
              <ChevronRight size={11} />
            </button>
          );
        } else {
          parts.push(<span key={`bracket-${match.index}`} className="font-medium text-hi">[{inner}]</span>);
        }
      } else {
        parts.push(<span key={`bracket-${match.index}`} className="font-medium text-hi">[{inner}]</span>);
      }
    } else if (token.startsWith('[') && token.includes('](')) {
      const linkMatch = token.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        const [, label, url] = linkMatch;
        parts.push(
          <a
            key={`url-${match.index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[var(--ice)] hover:underline font-medium"
          >
            {label} <ExternalLink size={10} />
          </a>
        );
      }
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(
      <React.Fragment key={`text-${lastIndex}`}>
        {text.substring(lastIndex)}
      </React.Fragment>
    );
  }

  return parts;
}

function CompactMarkdown({ text, goTo, onClose }) {
  if (!text) return null;
  const rawStr = typeof text === 'string' ? text : (text?.response ? String(text.response) : JSON.stringify(text));
  const blocks = rawStr.split(/\n\n+/);

  return (
    <div className="space-y-2">
      {blocks.map((block, blockIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Heading
        if (trimmed.startsWith('#')) {
          return (
            <h4 key={blockIdx} className="font-bold text-xs text-hi mt-2 mb-0.5 border-b border-[var(--line-soft)] pb-0.5">
              {parseInline(trimmed.replace(/^#+\s*/, ''), goTo, onClose)}
            </h4>
          );
        }

        // List
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const items = trimmed.split('\n').filter((i) => i.trim().startsWith('- ') || i.trim().startsWith('* '));
          return (
            <ul key={blockIdx} className="list-disc pl-4 space-y-0.5 my-1 text-[12px] leading-relaxed text-hi">
              {items.map((item, i) => (
                <li key={i}>{parseInline(item.replace(/^[-*]\s+/, ''), goTo, onClose)}</li>
              ))}
            </ul>
          );
        }

        // Numbered list
        if (/^\d+\.\s/.test(trimmed)) {
          const items = trimmed.split('\n').filter((i) => /^\d+\.\s/.test(i.trim()));
          return (
            <ol key={blockIdx} className="list-decimal pl-4 space-y-0.5 my-1 text-[12px] leading-relaxed text-hi">
              {items.map((item, i) => (
                <li key={i}>{parseInline(item.replace(/^\d+\.\s+/, ''), goTo, onClose)}</li>
              ))}
            </ol>
          );
        }

        // Table (compact render)
        if (trimmed.startsWith('|') && trimmed.includes('\n|')) {
          const rows = trimmed.split('\n').filter((r) => r.trim().startsWith('|'));
          if (rows.length >= 2) {
            const headerCols = rows[0].split('|').filter(Boolean);
            const dataRows = rows.slice(rows[1].includes('---') ? 2 : 1);
            return (
              <div key={blockIdx} className="overflow-x-auto my-1 rounded border border-[var(--line)] bg-[var(--surface-sunken)]/40 text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-[var(--surface-raised)] text-hi font-semibold">
                    <tr>
                      {headerCols.map((h, i) => (
                        <th key={i} className="px-2 py-1">{parseInline(h.trim(), goTo, onClose)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataRows.map((row, rIdx) => (
                      <tr key={rIdx} className="border-t border-[var(--line-soft)]">
                        {row.split('|').filter(Boolean).map((cell, cIdx) => (
                          <td key={cIdx} className="px-2 py-1 text-mid font-mono text-[10.5px]">
                            {parseInline(cell.trim(), goTo, onClose)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
        }

        return (
          <p key={blockIdx} className="text-[12px] leading-relaxed m-0 text-hi">
            {parseInline(trimmed, goTo, onClose)}
          </p>
        );
      })}
    </div>
  );
}

export default function FloatingAiAssistant({ goTo }) {
  const dataContextValue = useData();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'aurora',
      content: 'AURORA Tactical Assistant online. How can I assist you on this station sector?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom();
    }
  }, [messages, loading, open]);

  const submitPrompt = async (text) => {
    const query = typeof text === 'string' ? text.trim() : '';
    if (!query || loading) return;

    const userMsg = { id: Date.now().toString(), role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const apiKey = localStorage.getItem('polar-copilot-gemini-key') || '';

    try {
      const result = await askCopilot(query, dataContextValue, apiKey);
      const safeContent = typeof result === 'string' ? result : (result?.response || 'No response generated.');

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'aurora',
          content: safeContent,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'aurora',
          content: `**Error:** ${err.message || 'Could not process query.'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitPrompt(input);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center justify-center w-13 h-13 rounded-full bg-[var(--ice)] text-white shadow-xl hover:scale-105 transition-all group active:scale-95"
        style={{ width: '52px', height: '52px' }}
        title="Summon AURORA AI Copilot"
        aria-label="Open AURORA AI Copilot"
      >
        <span className="absolute inset-0 rounded-full bg-[var(--ice)] animate-ping opacity-25 pointer-events-none" />
        <Bot size={26} className="text-white" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-40 flex flex-col w-[92vw] max-w-[420px] h-[520px] max-h-[85vh] bg-[var(--surface-card)] border border-[var(--line)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
      style={{ boxShadow: '0 12px 36px rgba(0,0,0,0.25)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--line)] bg-[var(--surface-raised)]">
        <div className="flex items-center gap-2 text-hi font-bold text-xs">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-[var(--surface-card)] border border-[var(--line)] text-[var(--ice)]">
            <Bot size={14} />
          </div>
          <span>AURORA Tactical Copilot</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="p-1 rounded-md text-mid hover:bg-[var(--surface-sunken)] hover:text-hi transition"
          title="Minimize Assistant"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[var(--surface-base)] custom-scrollbar">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-2 max-w-[90%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <div
                  className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-sm ${
                    isUser
                      ? 'bg-[var(--ice)] text-white'
                      : 'bg-[var(--surface-card)] border border-[var(--line)] text-[var(--ice)]'
                  }`}
                >
                  {isUser ? <Users size={12} /> : <Bot size={12} />}
                </div>

                <div
                  className={`px-3 py-2 rounded-xl text-xs shadow-sm ${
                    isUser
                      ? 'bg-[var(--ice)] text-white rounded-tr-xs'
                      : 'bg-[var(--surface-card)] border border-[var(--line)] text-hi rounded-tl-xs'
                  }`}
                >
                  {isUser ? (
                    <p className="m-0 whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <CompactMarkdown text={msg.content} goTo={goTo} onClose={() => setOpen(false)} />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-2 max-w-[90%] flex-row items-center">
              <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-[var(--surface-card)] border border-[var(--line)] text-[var(--ice)]">
                <Bot size={12} />
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-[var(--surface-card)] border border-[var(--line)] rounded-tl-xs flex items-center gap-1 shadow-sm">
                <div className="w-1 h-1 bg-[var(--ice)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 bg-[var(--ice)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 bg-[var(--ice)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-[11px] text-mid ml-1">Analyzing...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Chips */}
      <div className="px-2.5 pt-2 pb-1 bg-[var(--surface-card)] border-t border-[var(--line)] shrink-0">
        <div className="flex overflow-x-auto gap-1.5 custom-scrollbar pb-1">
          {SUGGESTED_PROMPTS?.slice(0, 5).map((prompt, idx) => {
            const emoji = typeof prompt === 'object' ? prompt.emoji : prompt.slice(0, 2);
            const label = typeof prompt === 'object' ? prompt.text : prompt;
            const query = typeof prompt === 'object' ? (prompt.query || prompt.text) : prompt;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => submitPrompt(query)}
                className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-raised)] border border-[var(--line)] text-[11px] text-mid hover:text-hi hover:border-[var(--ice)] transition"
              >
                <span>{emoji}</span>
                <span className="truncate max-w-[130px]">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Strip */}
      <div className="p-2.5 bg-[var(--surface-card)] shrink-0">
        <div className="relative flex items-center">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AURORA anything..."
            className="input pr-9 text-xs py-2 resize-none"
            style={{ height: '38px', minHeight: '38px' }}
            rows={1}
          />
          <button
            type="button"
            onClick={() => submitPrompt(input)}
            disabled={!input.trim() || loading}
            className="absolute right-1.5 p-1.5 rounded-md bg-[var(--ice)] text-white hover:opacity-90 disabled:opacity-30 transition"
            title="Send"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
