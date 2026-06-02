import { useState, useEffect } from 'react'
import { X, BookOpen, Send, Link as LinkIcon } from 'lucide-react'
import { useRouterState, useNavigate } from '@tanstack/react-router'
import { LIBRARIAN, getLibrarianContextForRoute, buildLibrarianResponse, extractStageableCommands } from '~/lib/librarian'
import { cn } from '~/lib/meta'
import { Button, useToast } from '~/components/ui'
import { api } from '~/lib/api'

interface LibrarianPanelProps {
  open: boolean
  onClose: () => void
}

export function LibrarianPanel({ open, onClose }: LibrarianPanelProps) {
  const routerState = useRouterState()
  const currentRoute = routerState.location.pathname

  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'librarian'
    content: string
    sources?: string[]
  }>>([
    {
      role: 'librarian',
      content: `Hello. I am ${LIBRARIAN.name}. I maintain the institutional knowledge of this lab.\n\nLibrarian is consulting the boulder of institutional knowledge...\n\nAsk me about any screen, button, workflow, or skill — "what is governance?", "how do I use it?", "explain the dashboard stats".\n\nI consult the live registry and will always cite my sources.`,
    }
  ])
  const [isThinking, setIsThinking] = useState(false)
  const toast = useToast()
  const navigate = useNavigate();

  // Persist conversation history (Idea)
  useEffect(() => {
    const saved = localStorage.getItem('librarian-chat-history');
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('librarian-chat-history', JSON.stringify(messages));
  }, [messages]);

  const contextKey = getLibrarianContextForRoute(currentRoute)
  const base = (LIBRARIAN.baseKnowledge as any)[contextKey] || (LIBRARIAN.baseKnowledge as any).dashboard

  const handleAsk = async () => {
    const q = question.trim()
    if (!q) return

    setMessages(prev => [...prev, { role: 'user', content: q }])
    setQuestion('')
    setIsThinking(true)

    // Try real backend first (Idea #5 — registry-backed), fall back to rich local knowledge
    let answerText = ''
    let sources: string[] = []

    try {
      const res = await api.librarianExplain({ question: q, route: currentRoute })
      answerText = res.answer || ''
      sources = res.sources || []
    } catch {
      // local smart fallback (still very useful and registry-aware)
      const answer = buildLibrarianResponse(q, currentRoute, base)
      answerText = answer.text
      sources = answer.sources || []
    }

    setMessages(prev => [...prev, {
      role: 'librarian',
      content: answerText,
      sources
    }])
    setIsThinking(false)
  }

  const stageCommand = (cmd: string) => {
    navigate({ to: '/console', search: { stage: cmd } as any });
    onClose();
  };

  const saveAsLibrarianSkill = async (content: string) => {
    const name = prompt('Save as librarian skill (name must start with "librarian:"):', 'librarian:custom-' + Date.now().toString(36));
    if (!name || !name.startsWith('librarian:')) {
      toast('Name must start with librarian:');
      return;
    }
    try {
      await api.saveDraft({
        name,
        payload: {
          tier: 'documentation',
          trustTier: 'T1',
          description: content.slice(0, 300),
        }
      });
      toast('Saved as draft librarian skill. It will be picked up by Librarian after next sync/registry load.');
    } catch (e) {
      toast('Save attempted (may be mocked in demo)');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — omo.dev card aesthetic + cyan accents */}
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-ink-950 shadow-2xl gp-fade-in">
        {/* Header — exactly like omo.dev agent headers */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/50 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {/* Small Librarian avatar - omo.dev character style */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/30 to-cyan-400/10 text-cyan-400 border border-cyan-500/40 font-mono text-sm font-bold shadow-inner" title="Librarian">
              L
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold tracking-tight text-white">{LIBRARIAN.name}</span>
                <span className="inline-flex items-center rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-400">
                  {LIBRARIAN.title}
                </span>
              </div>
              <div className="text-[11px] text-cyan-300/70">{LIBRARIAN.subtitle}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current context */}
        <div className="border-b border-white/10 bg-ink-900/60 px-4 py-2 text-xs">
          <span className="text-slate-500">Current context:</span>{' '}
          <span className="font-mono text-cyan-300">{currentRoute}</span>
          <span className="ml-2 text-slate-500">• consulting registry + {contextKey} knowledge</span>
        </div>

        {/* Conversation */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
          {messages.map((m, i) => (
            <div key={i} className={cn(
              "rounded-xl border p-3",
              m.role === 'librarian'
                ? "border-cyan-500/20 bg-cyan-500/[0.03]"
                : "border-white/10 bg-white/[0.02]"
            )}>
              {m.role === 'librarian' && (
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                  <BookOpen size={12} /> {LIBRARIAN.name}
                </div>
              )}
              <div className="whitespace-pre-wrap leading-relaxed text-slate-200">
                {m.content}
              </div>
              {m.sources && m.sources.length > 0 && (
                <div className="mt-2 border-t border-white/10 pt-2 text-[11px] text-cyan-300/70">
                  Sources: {m.sources.map((s, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 font-mono">
                      {idx > 0 && ' · '}<LinkIcon size={10} />{s}
                    </span>
                  ))}
                </div>
              )}

              {/* Actionable staging + save as skill (new requirements) */}
              {m.role === 'librarian' && (
                <>
                  <StageableCommands text={m.content} onStage={stageCommand} />
                  <button
                    onClick={() => saveAsLibrarianSkill(m.content)}
                    className="mt-2 text-[10px] text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Save this explanation as a new librarian skill
                  </button>
                </>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.03] p-3 text-cyan-300">
              <span className="animate-pulse">Librarian is consulting the boulder of institutional knowledge…</span>
            </div>
          )}
        </div>

        {/* Input — terminal-ish */}
        <div className="border-t border-white/10 p-3">
          <div className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Librarian anything (e.g. 'explain governance' or 'how do I use the builder for T4?')"
              className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/40 focus:outline-none"
            />
            <Button
              onClick={handleAsk}
              disabled={!question.trim() || isThinking}
              variant="primary"
              size="md"
              icon={Send}
            >
              Ask
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-slate-500">
            Librarian draws from live skills in the registry (edit them to teach it new things).
          </p>
        </div>
      </div>
    </div>
  )
}

function StageableCommands({ text, onStage }: { text: string; onStage: (cmd: string) => void }) {
  const commands = extractStageableCommands(text);
  if (commands.length === 0) return null;
  return (
    <div className="mt-2 pt-2 border-t border-cyan-500/10">
      <div className="text-[10px] uppercase tracking-wider text-cyan-400 mb-1 flex items-center gap-1">
        <span>Stage in Console</span>
      </div>
      {commands.map((cmd, i) => (
        <button
          key={i}
          onClick={() => onStage(cmd)}
          className="block w-full text-left text-xs font-mono bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/20 rounded px-2 py-1 mb-1 text-cyan-200 active:scale-[0.99]"
        >
          ▶ {cmd.length > 55 ? cmd.slice(0, 55) + '…' : cmd}
        </button>
      ))}
    </div>
  );
}
