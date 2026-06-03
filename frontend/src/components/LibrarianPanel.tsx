import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  BookOpen,
  Send,
  Link as LinkIcon,
  Trash2,
  MoreHorizontal,
  Sparkles,
  Save,
  ChevronRight,
} from 'lucide-react'
import { useRouterState, useNavigate } from '@tanstack/react-router'
import {
  LIBRARIAN,
  getLibrarianContextForRoute,
  buildLibrarianResponse,
  extractStageableCommands,
} from '~/lib/librarian'
import { cn } from '~/lib/meta'
import { Button, useToast } from '~/components/ui'
import { api } from '~/lib/api'

/* ---------------------------------------------------------------- constants */
const CHAT_STORAGE_KEY = 'librarian-chat-history'
const CHAT_STORAGE_VERSION = 2

const PAGE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/skills': 'Skill Registry',
  '/builder': 'Skill Builder',
  '/console': 'Console',
  '/sync': 'Sync & Adapters',
  '/history': 'Run History',
  '/providers': 'Providers',
  '/mcp': 'MCP Servers',
  '/governance': 'Governance',
  '/evals': 'Eval Reports',
  '/logs': 'Logs',
  '/settings': 'Settings',
}

const SUGGESTED_PROMPTS = [
  'What is Governance?',
  'How do I use the Skill Builder?',
  'Explain trust tiers T1–T4',
  'What does Sync & Adapters do?',
]

/* --------------------------------------------------------- types */
interface Message {
  role: 'user' | 'librarian'
  content: string
  sources?: string[]
  ts: number
}

interface StoredChat {
  version: number
  messages: Message[]
}

/* --------------------------------------------------------- inline markdown */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let listItems: string[] = []
  let key = 0

  const flushList = () => {
    if (listItems.length === 0) return
    nodes.push(
      <ul key={key++} className="mb-2 ml-3 space-y-0.5 list-none">
        {listItems.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-400/60" />
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ul>
    )
    listItems = []
  }

  for (const line of lines) {
    const numMatch = line.match(/^(\d+)\.\s+(.+)/)
    const bulletMatch = line.match(/^[-*]\s+(.+)/)
    const hrMatch = line.match(/^---+$/)
    const h3Match = line.match(/^###\s+(.+)/)
    const h2Match = line.match(/^##\s+(.+)/)
    const h1Match = line.match(/^#\s+(.+)/)

    if (bulletMatch) {
      listItems.push(bulletMatch[1])
      continue
    }
    if (numMatch) {
      flushList()
      nodes.push(
        <div key={key++} className="flex items-start gap-1.5 mb-0.5">
          <span className="shrink-0 text-cyan-400 font-mono text-[10px] mt-0.5 w-4">{numMatch[1]}.</span>
          <span>{renderInline(numMatch[2])}</span>
        </div>
      )
      continue
    }
    flushList()

    if (hrMatch) {
      nodes.push(<hr key={key++} className="my-2 border-white/10" />)
    } else if (h1Match) {
      nodes.push(<p key={key++} className="text-sm font-bold text-white mb-1">{renderInline(h1Match[1])}</p>)
    } else if (h2Match) {
      nodes.push(<p key={key++} className="text-sm font-semibold text-white mb-1">{renderInline(h2Match[1])}</p>)
    } else if (h3Match) {
      nodes.push(<p key={key++} className="text-[13px] font-semibold text-slate-200 mb-0.5">{renderInline(h3Match[1])}</p>)
    } else if (line.trim() === '') {
      nodes.push(<div key={key++} className="h-1.5" />)
    } else {
      nodes.push(<p key={key++} className="mb-0.5 leading-relaxed">{renderInline(line)}</p>)
    }
  }
  flushList()
  return nodes
}

function renderInline(text: string): React.ReactNode {
  // Process bold, code, then plain text
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[11px] text-cyan-300">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

/* --------------------------------------------------------- typing indicator */
function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-cyan-400/70"
          style={{
            animation: `libDot 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes libDot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </div>
  )
}

/* --------------------------------------------------------- save name modal */
function SaveSkillModal({
  onSave,
  onCancel,
}: {
  onSave: (name: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('librarian:custom-')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.setSelectionRange(name.length, name.length)
  }, [])

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-ink-900 p-5 shadow-2xl">
        <h3 className="mb-1 text-sm font-semibold text-white">Save as Librarian Skill</h3>
        <p className="mb-3 text-xs text-slate-500">Name must start with <code className="text-cyan-400">librarian:</code></p>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.startsWith('librarian:')) onSave(name)
            if (e.key === 'Escape') onCancel()
          }}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white focus:border-cyan-500/40 focus:outline-none"
          placeholder="librarian:my-knowledge"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={() => name.startsWith('librarian:') && onSave(name)}
            disabled={!name.startsWith('librarian:')}
            className="rounded-lg bg-cyan-500/20 border border-cyan-500/30 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-40 disabled:pointer-events-none"
          >
            Save Skill
          </button>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------- message overflow */
function MessageOverflow({
  onSave,
  onCopy,
}: {
  onSave: () => void
  onCopy: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative ml-auto shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-md p-1 text-slate-600 opacity-0 transition-opacity group-hover/msg:opacity-100 hover:bg-white/10 hover:text-slate-300"
        title="More options"
      >
        <MoreHorizontal size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-50 w-44 overflow-hidden rounded-xl border border-white/10 bg-ink-800 py-1 shadow-2xl shadow-black/50 gp-fade-in">
          <button
            onClick={() => { onCopy(); setOpen(false) }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/[0.06]"
          >
            <LinkIcon size={12} className="text-slate-500" /> Copy text
          </button>
          <button
            onClick={() => { onSave(); setOpen(false) }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/[0.06]"
          >
            <Save size={12} className="text-cyan-500" /> Save as skill
          </button>
        </div>
      )}
    </div>
  )
}

/* ========================================================= LibrarianPanel */
interface LibrarianPanelProps {
  open: boolean
  onClose: () => void
}

export function LibrarianPanel({ open, onClose }: LibrarianPanelProps) {
  const routerState = useRouterState()
  const currentRoute = routerState.location.pathname
  const navigate = useNavigate()
  const toast = useToast()

  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [saveTarget, setSaveTarget] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  /* ---------- load/save localStorage with versioning ---------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY)
      if (!raw) return
      const stored: StoredChat = JSON.parse(raw)
      if (stored.version === CHAT_STORAGE_VERSION && Array.isArray(stored.messages)) {
        setMessages(stored.messages)
      }
      // Mismatched version → silently ignore (fresh start)
    } catch { /* corrupted — ignore */ }
  }, [])

  useEffect(() => {
    const stored: StoredChat = { version: CHAT_STORAGE_VERSION, messages }
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(stored))
  }, [messages])

  /* ---------- auto-scroll ---------- */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isThinking])

  /* ---------- auto-focus on open ---------- */
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [open])

  /* ---------- Escape to close ---------- */
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  /* ---------- helpers ---------- */
  const contextKey = getLibrarianContextForRoute(currentRoute)
  const base = (LIBRARIAN.baseKnowledge as any)[contextKey] || (LIBRARIAN.baseKnowledge as any).dashboard

  // Human-readable page name for context pill
  const pageName = Object.entries(PAGE_LABELS).find(([prefix]) =>
    currentRoute === prefix || currentRoute.startsWith(prefix + '/')
  )?.[1] ?? 'Unknown'

  const hasUserMessages = messages.some((m) => m.role === 'user')

  const handleAsk = useCallback(async (q?: string) => {
    const text = (q ?? question).trim()
    if (!text) return

    setMessages((prev) => [...prev, { role: 'user', content: text, ts: Date.now() }])
    setQuestion('')
    setIsThinking(true)

    let answerText = ''
    let sources: string[] = []

    try {
      const res = await api.librarianExplain({ question: text, route: currentRoute })
      answerText = res.answer || ''
      sources = res.sources || []
    } catch {
      const answer = buildLibrarianResponse(text, currentRoute, base)
      answerText = answer.text
      sources = answer.sources || []
    }

    setMessages((prev) => [
      ...prev,
      { role: 'librarian', content: answerText, sources, ts: Date.now() },
    ])
    setIsThinking(false)
  }, [question, currentRoute, base])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
  }

  const clearChat = () => {
    setMessages([])
    localStorage.removeItem(CHAT_STORAGE_KEY)
  }

  const stageCommand = (cmd: string) => {
    navigate({ to: '/console', search: { stage: cmd } as any })
    onClose()
  }

  const saveAsSkill = async (name: string, content: string) => {
    setSaveTarget(null)
    try {
      await api.saveDraft({
        name,
        payload: {
          tier: 'documentation',
          trustTier: 'T1',
          description: content.slice(0, 200),
          body: content,
        },
      })
      toast('Saved as draft librarian skill — it will sync on next registry refresh.')
    } catch {
      toast('Save attempted (demo mode — check registry manually).')
    }
  }

  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    toast('Copied to clipboard')
  }

  if (!open) return null

  return (
    <>
      {/* Save skill modal */}
      {saveTarget !== null && (
        <SaveSkillModal
          onSave={(name) => saveAsSkill(name, saveTarget)}
          onCancel={() => setSaveTarget(null)}
        />
      )}

      <div className="fixed inset-0 z-[70] flex justify-end">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm gp-fade-in"
          onClick={onClose}
        />

        {/* Panel */}
        <div
          className="relative flex h-full w-full flex-col border-l border-white/10 bg-ink-950 shadow-2xl"
          style={{ 
            maxWidth: '512px',
            animation: 'libSlide 0.3s cubic-bezier(0.32,0.72,0,1) both' 
          }}
        >
          <style>{`
            @keyframes libSlide {
              from { transform: translateX(100%); }
              to   { transform: translateX(0); }
            }
          `}</style>

          {/* ---- Header ---- */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black/40 px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              {/* Avatar with ambient glow */}
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-cyan-500/40 bg-gradient-to-br from-cyan-500/25 to-cyan-400/5 font-mono text-sm font-bold text-cyan-400 shadow-inner">
                <BookOpen size={16} />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-950 bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/60" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold tracking-tight text-white">
                    {LIBRARIAN.name}
                  </span>
                  <span className="inline-flex items-center rounded border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-400">
                    {LIBRARIAN.title}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">Ask anything about this app</div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Clear chat */}
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  title="Clear conversation"
                  className="rounded-lg p-1.5 text-slate-600 hover:bg-white/10 hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ---- Context pill ---- */}
          <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] bg-black/20 px-4 py-1.5">
            <span className="text-[10px] text-slate-600">Viewing</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-slate-400">
              <span className="h-1 w-1 rounded-full bg-cyan-400" />
              {pageName}
            </span>
            <ChevronRight size={10} className="text-slate-700" />
            <span className="text-[10px] text-slate-600">answers scoped to this context</span>
          </div>

          {/* ---- Messages ---- */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm"
          >
            {/* Empty / blank state */}
            {!hasUserMessages && messages.length === 0 && (
              <div className="mb-4">
                {/* Welcome bubble */}
                <div className="rounded-2xl rounded-tl-sm border border-cyan-500/15 bg-cyan-500/[0.04] p-4">
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                    <Sparkles size={11} />
                    {LIBRARIAN.name}
                  </div>
                  <p className="leading-relaxed text-slate-300">
                    Hello — I maintain the institutional knowledge of this lab. Ask me about any screen, workflow, skill tier, or button.
                  </p>
                  <p className="mt-2 text-[11px] text-slate-500">
                    I consult the live registry and always cite my sources.
                  </p>
                </div>

                {/* Suggested prompts */}
                <div className="mt-4">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-600">
                    Try asking…
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleAsk(prompt)}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5 text-left text-[12px] text-slate-400 transition-all hover:border-cyan-500/30 hover:bg-cyan-500/[0.05] hover:text-cyan-300 active:scale-[0.98]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Message list */}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'group/msg flex',
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {m.role === 'user' ? (
                  /* User bubble — right aligned */
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-to-br from-cyan-500/20 to-cyan-400/10 border border-cyan-500/25 px-3.5 py-2.5 text-slate-200">
                    <p className="leading-relaxed">{m.content}</p>
                    <p className="mt-1 text-right text-[9px] text-slate-600">
                      {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ) : (
                  /* Librarian bubble — left aligned */
                  <div className="max-w-[95%] w-full">
                    <div className="relative rounded-2xl rounded-tl-sm border border-white/[0.07] bg-white/[0.025] px-4 py-3">
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-400">
                          {LIBRARIAN.name}
                        </span>
                        <span className="text-[9px] text-slate-700">
                          {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {/* Only show overflow after user has interacted (not on welcome) */}
                        {hasUserMessages && (
                          <MessageOverflow
                            onCopy={() => copyMessage(m.content)}
                            onSave={() => setSaveTarget(m.content)}
                          />
                        )}
                      </div>

                      {/* Markdown-rendered content */}
                      <div className="text-[13px] text-slate-300">
                        {renderMarkdown(m.content)}
                      </div>

                      {/* Sources */}
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-white/[0.06] pt-2">
                          {m.sources.map((s, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-slate-500"
                            >
                              <LinkIcon size={9} />
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Stageable commands */}
                      <StageableCommands text={m.content} onStage={stageCommand} />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Thinking state */}
            {isThinking && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-sm border border-white/[0.07] bg-white/[0.025] px-4 py-3">
                  <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-400">
                    {LIBRARIAN.name}
                  </div>
                  <TypingDots />
                </div>
              </div>
            )}
          </div>

          {/* ---- Input ---- */}
          <div className="shrink-0 border-t border-white/10 bg-black/20 p-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about the lab…"
                aria-label="Ask Librarian"
                className="flex-1 rounded-xl border border-white/[0.08] bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all"
              />
              <Button
                onClick={() => handleAsk()}
                disabled={!question.trim() || isThinking}
                variant="primary"
                size="md"
                icon={Send}
              >
                Send
              </Button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-slate-700">
              Press <kbd className="rounded border border-white/10 bg-white/[0.04] px-1 py-0.5 text-[9px] font-mono">?</kbd> anywhere to open · <kbd className="rounded border border-white/10 bg-white/[0.04] px-1 py-0.5 text-[9px] font-mono">Esc</kbd> to close
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

/* -------------------------------------------------- StageableCommands */
function StageableCommands({
  text,
  onStage,
}: {
  text: string
  onStage: (cmd: string) => void
}) {
  const commands = extractStageableCommands(text)
  if (commands.length === 0) return null
  return (
    <div className="mt-2.5 border-t border-cyan-500/10 pt-2">
      <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-500/70">
        Run in Console
      </div>
      {commands.map((cmd, i) => (
        <button
          key={i}
          onClick={() => onStage(cmd)}
          className="mb-1 flex w-full items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] px-2.5 py-1.5 text-left text-[11px] font-mono text-cyan-300 transition-colors hover:bg-cyan-500/[0.08] active:scale-[0.99]"
        >
          <ChevronRight size={10} className="shrink-0 text-cyan-500" />
          <span className="truncate">
            {cmd.length > 60 ? cmd.slice(0, 60) + '…' : cmd}
          </span>
        </button>
      ))}
    </div>
  )
}
