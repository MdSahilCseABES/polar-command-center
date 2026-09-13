import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Settings,
  Eye,
  EyeOff,
  X,
  ChevronRight,
  Activity,
  Users,
  Compass,
  AlertTriangle,
  Package,
  Boxes,
  Sparkles,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { useData } from '../store/DataContext';
import Panel from '../components/Panel';
import StatCard from '../components/StatCard';
import { askCopilot, SUGGESTED_PROMPTS } from '../services/aiCopilotService';

/**
 * Robust markdown parser for AURORA responses
 * Handles headings, tables, blockquotes, lists, bold, inline code, and interactive action buttons.
 */
function parseMarkdown(text, goTo) {
  if (!text) return null;
  const rawStr = typeof text === 'string' ? text : (text?.response ? String(text.response) : JSON.stringify(text));

  // Split into block sections by double newline
  const blocks = rawStr.split(/\n\n+/);

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Headings
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={blockIdx} className="text-sm font-bold text-hi mt-3 mb-1 flex items-center gap-1.5 border-b border-[var(--line-soft)] pb-1">
              {parseInline(trimmed.replace(/^###\s+/, ''), goTo)}
            </h3>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={blockIdx} className="text-base font-bold text-hi mt-3 mb-1 flex items-center gap-1.5">
              {parseInline(trimmed.replace(/^##\s+/, ''), goTo)}
            </h2>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={blockIdx} className="text-lg font-bold text-hi mt-2 mb-1">
              {parseInline(trimmed.replace(/^#\s+/, ''), goTo)}
            </h1>
          );
        }

        // Blockquote
        if (trimmed.startsWith('> ')) {
          const quoteLines = trimmed.split('\n').map((l) => l.replace(/^>\s*/, '')).join(' ');
          return (
            <div key={blockIdx} className="rounded-md border-l-2 border-[var(--ice)] bg-[var(--surface-raised)]/60 px-3 py-2 text-[12.5px] text-mid italic my-2">
              {parseInline(quoteLines, goTo)}
            </div>
          );
        }

        // Table detection
        if (trimmed.startsWith('|') && trimmed.includes('\n|')) {
          const rows = trimmed.split('\n').filter((r) => r.trim().startsWith('|'));
          if (rows.length >= 2) {
            const headerCols = rows[0].split('|').filter(Boolean);
            const dataRows = rows.slice(rows[1].includes('---') ? 2 : 1);

            return (
              <div key={blockIdx} className="overflow-x-auto my-2 rounded-lg border border-[var(--line)] bg-[var(--surface-raised)]/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--surface-raised)] border-b border-[var(--line)] text-hi font-semibold">
                    <tr>
                      {headerCols.map((h, i) => (
                        <th key={i} className="px-3 py-2">
                          {parseInline(h.trim(), goTo)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line-soft)]">
                    {dataRows.map((row, rIdx) => {
                      const cells = row.split('|').filter(Boolean);
                      return (
                        <tr key={rIdx} className="hover:bg-[var(--surface-card)] transition-colors">
                          {cells.map((cell, cIdx) => (
                            <td key={cIdx} className="px-3 py-1.5 text-mid font-mono text-[11.5px]">
                              {parseInline(cell.trim(), goTo)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          }
        }

        // Bullet list detection
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const items = trimmed.split('\n').filter((i) => i.trim().startsWith('- ') || i.trim().startsWith('* '));
          return (
            <ul key={blockIdx} className="list-disc pl-5 space-y-1 my-1.5 text-[13px] leading-relaxed text-hi">
              {items.map((item, i) => (
                <li key={i}>{parseInline(item.replace(/^[-*]\s+/, ''), goTo)}</li>
              ))}
            </ul>
          );
        }

        // Numbered list detection
        if (/^\d+\.\s/.test(trimmed)) {
          const items = trimmed.split('\n').filter((i) => /^\d+\.\s/.test(i.trim()));
          return (
            <ol key={blockIdx} className="list-decimal pl-5 space-y-1 my-1.5 text-[13px] leading-relaxed text-hi">
              {items.map((item, i) => (
                <li key={i}>{parseInline(item.replace(/^\d+\.\s+/, ''), goTo)}</li>
              ))}
            </ol>
          );
        }

        // Normal paragraph
        return (
          <p key={blockIdx} className="text-[13px] leading-relaxed m-0 text-hi">
            {parseInline(trimmed, goTo)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Parses inline formatting: **bold**, `code`, [Label -> dest], [Label](url)
 */
function parseInline(text, goTo) {
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
        <code key={`code-${match.index}`} className="mono text-[11.5px] bg-[var(--surface-sunken)] px-1 py-0.5 rounded text-[var(--ice)]">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[') && token.endsWith(']')) {
      const inner = token.slice(1, -1);
      if (inner.includes('->')) {
        const [label, dest] = inner.split('->').map((s) => s.trim());
        const routeKey = dest.toLowerCase();
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
        const target = ROUTE_MAP[routeKey];
        if (target) {
          parts.push(
            <button
              key={`link-${match.index}`}
              type="button"
              onClick={() => goTo && goTo(target)}
              className="inline-flex items-center gap-1 rounded bg-[var(--surface-sunken)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--ice)] hover:underline border border-[var(--line)] hover:border-[var(--ice)] transition active:scale-95"
              title={`Navigate to ${label}`}
            >
              <span>{label}</span>
              <ChevronRight size={12} />
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
            {label} <ExternalLink size={11} />
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

export default function AiCopilot({ goTo }) {
  const dataContextValue = useData();
  const stats = dataContextValue?.stats || {};

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'aurora',
      content:
        'System online. I am **AURORA**, your Polar Command Center Autonomous Intelligence Copilot.\n\nI have continuous telemetry access to all deployed personnel, station weather observations, critical inventory buffers, and active traverse missions. How may I assist your command operations today?',
      timestamp: new Date().toISOString(),
      source: 'Local Engine',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('polar-copilot-gemini-key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSaveKey = (val) => {
    setApiKey(val);
    localStorage.setItem('polar-copilot-gemini-key', val);
  };

  const handleClear = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'aurora',
        content: 'Chat transcript cleared. Telemetry feeds active. How can I assist you?',
        timestamp: new Date().toISOString(),
        source: 'Local Engine',
      },
    ]);
  };

  const submitPrompt = async (text) => {
    const query = typeof text === 'string' ? text.trim() : '';
    if (!query || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const result = await askCopilot(query, dataContextValue, apiKey);
      const safeContent = typeof result === 'string' ? result : (result?.response || 'No response generated.');
      const safeSource = result?.source === 'gemini' ? 'Gemini 2.5 Flash' : 'Autonomous Engine';

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'aurora',
          content: safeContent,
          timestamp: result?.timestamp || new Date().toISOString(),
          source: safeSource,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'aurora',
          content: `**Command Error:** ${err.message || 'Could not process query.'}`,
          timestamp: new Date().toISOString(),
          source: 'System Error',
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

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] space-y-4">
      {/* HEADER */}
      <header className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--surface-raised)] border border-[var(--ice-dim)]/40 shadow-sm">
            <Bot className="text-[var(--ice)]" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title text-xl font-bold text-hi">AURORA — Polar Intelligence Copilot</h1>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                ACTIVE
              </span>
            </div>
            <p className="page-blurb text-xs text-mid">
              Autonomous telemetry reasoning, flight/traverse safety validation &amp; polar SOP advisory
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={`btn btn--sm flex items-center gap-1.5 ${settingsOpen ? '' : 'btn--ghost'}`}
            title="Copilot Settings"
          >
            <Settings size={15} />
            <span>AI Settings</span>
          </button>
        </div>
      </header>

      {/* SETTINGS DRAWER */}
      {settingsOpen && (
        <div className="card-tight flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-[var(--surface-card)] border border-[var(--line)] shadow-sm shrink-0">
          <div className="flex-1 max-w-md">
            <label className="field-label text-xs font-semibold text-hi">Google Gemini API Key (Optional)</label>
            <div className="flex relative mt-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => handleSaveKey(e.target.value)}
                placeholder="AIzaSy... (leave blank to use Local Intelligence Engine)"
                className="input pr-10 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-mid hover:text-hi"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-[11px] text-mid mt-1">
              {apiKey ? 'Connected to Gemini 2.5 Flash Cloud' : 'Running on Autonomous Local Engine (offline ready, 100% reliable)'}
            </p>
          </div>

          <div className="flex items-center gap-3 mt-3 sm:mt-0">
            <div className="text-[11px] px-3 py-1.5 rounded bg-[var(--surface-raised)] border border-[var(--line)] text-mid flex items-center gap-1.5">
              <Activity size={13} className={apiKey ? 'text-[var(--green)]' : 'text-[var(--ice)]'} />
              <span>Engine: <strong className="text-hi">{apiKey ? 'Gemini 2.5 Flash' : 'Local Autonomous'}</strong></span>
            </div>
            <button type="button" onClick={handleClear} className="btn btn--sm btn--ghost text-xs flex items-center gap-1 text-[var(--red)]">
              <Trash2 size={13} />
              <span>Clear Chat</span>
            </button>
          </div>
        </div>
      )}

      {/* TELEMETRY HUD */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 shrink-0">
        <StatCard
          label="Active Personnel"
          value={stats?.personnelDeployed ?? 16}
          icon={Users}
          hint={`${stats?.personnelTotal ?? 16} total in roster`}
          onClick={() => goTo && goTo('personnel')}
        />
        <StatCard
          label="Active Expeditions"
          value={stats?.expeditionsActive ?? 3}
          icon={Compass}
          hint={`${stats?.expeditionsTotal ?? 4} total registered`}
          onClick={() => goTo && goTo('expeditions')}
        />
        <StatCard
          label="Open Incidents"
          value={stats?.emergenciesOpen ?? 0}
          icon={AlertTriangle}
          tone={stats?.emergenciesOpen > 0 ? 'alert' : 'ok'}
          pulse={stats?.emergenciesOpen > 0}
          hint={stats?.emergenciesOpen > 0 ? 'Requires attention' : 'All sectors clear'}
          onClick={() => goTo && goTo('emergency')}
        />
        <StatCard
          label="Cargo Shipments"
          value={stats?.cargoTotal ?? 8}
          icon={Package}
          hint={`${stats?.cargoInTransit ?? 4} in transit`}
          onClick={() => goTo && goTo('cargo')}
        />
        <StatCard
          label="Inventory Alerts"
          value={stats?.lowStockCount ?? 0}
          icon={Boxes}
          tone={stats?.lowStockCount > 0 ? 'warn' : 'ok'}
          hint={stats?.lowStockCount > 0 ? 'Below buffer limit' : 'Nominal reserves'}
          onClick={() => goTo && goTo('inventory')}
        />
      </div>

      {/* QUICK PROMPT CAROUSEL */}
      <div className="flex overflow-x-auto pb-1 gap-2 custom-scrollbar shrink-0">
        {SUGGESTED_PROMPTS?.map((prompt, idx) => {
          const emoji = typeof prompt === 'object' ? prompt.emoji : prompt.slice(0, 2);
          const label = typeof prompt === 'object' ? prompt.text : prompt;
          const query = typeof prompt === 'object' ? (prompt.query || prompt.text) : prompt;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => submitPrompt(query)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-raised)] border border-[var(--line)] text-xs whitespace-nowrap text-mid hover:text-hi hover:border-[var(--ice)] hover:bg-[var(--surface-card)] transition shadow-sm active:scale-95"
            >
              <span>{emoji}</span>
              <span className="font-medium">{label}</span>
            </button>
          );
        })}
      </div>

      {/* MAIN CHAT CONSOLE */}
      <Panel className="flex-1 flex flex-col overflow-hidden min-h-[320px]" noPad>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[88%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                      isUser
                        ? 'bg-[var(--ice)] text-white'
                        : 'bg-[var(--surface-raised)] border border-[var(--line)] text-[var(--ice)]'
                    }`}
                  >
                    {isUser ? <Users size={15} /> : <Bot size={16} />}
                  </div>

                  {/* Message Bubble */}
                  <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`px-4 py-3 rounded-2xl shadow-sm ${
                        isUser
                          ? 'bg-[var(--ice)] text-white rounded-tr-xs'
                          : 'bg-[var(--surface-card)] border border-[var(--line)] text-hi rounded-tl-xs'
                      }`}
                    >
                      {isUser ? (
                        <p className="text-[13px] m-0 whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        parseMarkdown(msg.content, goTo)
                      )}
                    </div>

                    {/* Metadata Footer */}
                    <div className="flex items-center gap-2 mt-1 px-1 text-[10.5px] text-mid font-mono">
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.source && <span className="text-[var(--ice)]">· {msg.source}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[85%] flex-row items-center">
                <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--surface-raised)] border border-[var(--line)] text-[var(--ice)]">
                  <Bot size={16} />
                </div>
                <div className="px-4 py-2.5 rounded-2xl bg-[var(--surface-card)] border border-[var(--line)] rounded-tl-xs flex items-center gap-1.5 shadow-sm">
                  <div className="w-1.5 h-1.5 bg-[var(--ice)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-[var(--ice)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-[var(--ice)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-xs text-mid ml-1">Analyzing telemetry...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT STRIP */}
        <div className="shrink-0 border-t border-[var(--line)] bg-[var(--surface-card)] p-3">
          <div className="relative flex items-end gap-2 max-w-4xl mx-auto">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AURORA anything about weather, personnel, flight safety, inventory, or emergency SOPs..."
              className="input pr-12 resize-none text-xs leading-relaxed"
              style={{ minHeight: '44px', height: '44px', padding: '12px 48px 12px 14px' }}
              rows={1}
            />
            <button
              type="button"
              onClick={() => submitPrompt(input)}
              disabled={!input.trim() || loading}
              className="absolute right-2 bottom-2 p-2 rounded-md bg-[var(--ice)] text-white hover:opacity-90 disabled:opacity-30 transition shadow-sm active:scale-95"
              title="Transmit query to AURORA"
            >
              <Send size={15} />
            </button>
          </div>
          <div className="text-center mt-1.5 text-[10px] text-mid tracking-wider font-mono">
            PRESS ENTER TO TRANSMIT · SHIFT+ENTER FOR NEWLINE · AUTONOMOUS COGNITIVE ENGINE ACTIVE
          </div>
        </div>
      </Panel>
    </div>
  );
}
