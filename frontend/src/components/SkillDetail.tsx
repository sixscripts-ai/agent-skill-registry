import { useState, useEffect } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import {
  FlaskConical,
  RefreshCw,
  FileCode2,
  Terminal,
  Save,
  Send,
  Cpu,
  Loader2,
} from 'lucide-react'
import { api } from '~/lib/api'
import { useApi } from '~/lib/useApi'
import {
  TierBadge,
  TrustTierBadge,
  StatusBadge,
  Badge,
  Button,
  CopyButton,
  LoadingState,
  useToast,
} from '~/components/ui'
import { TRUST_LABEL } from '~/lib/meta'

type Message = {
  id: string
  role: 'user' | 'assistant'
  text: string
  thinking?: string
}

export function SkillDetailView({ skill }: { skill: any }) {
  const toast = useToast()
  const detail = useApi(() => api.skill(skill.name), [skill.name])

  // Left Pane Editor State
  const [editorContent, setEditorContent] = useState('')
  const [saving, setSaving] = useState(false)

  // Right Pane Playground State
  const [promptInput, setPromptInput] = useState('')
  const [running, setRunning] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [activeMcps, setActiveMcps] = useState<Set<string>>(new Set())

  // Initialize editor content and active MCPs when detail is loaded
  useEffect(() => {
    if (detail.data?.skillMd) {
      setEditorContent(detail.data.skillMd)
    }
    if (skill.requiredMcps) {
      setActiveMcps(new Set(skill.requiredMcps))
    }
  }, [detail.data, skill.requiredMcps])

  // Handle Save & Re-sync
  const handleSaveAndResync = async () => {
    setSaving(true)
    try {
      const res = await api.saveRawSkill(skill.name, skill.path, editorContent)
      if (res.ok) {
        toast('Skill saved & registry synced successfully!')
        // Reload detail payload
        await detail.refetch()
      } else {
        throw new Error(res.error || 'Failed to sync')
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save & Re-sync failed', 'rose')
    } finally {
      setSaving(false)
    }
  }

  // Handle Sandbox Execution
  const handleRunSandbox = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!promptInput.trim() || running) return
    const userPrompt = promptInput.trim()
    setPromptInput('')
    setMessages(prev => [
      ...prev,
      { id: Math.random().toString(), role: 'user', text: userPrompt },
    ])
    setRunning(true)

    try {
      const res = await api.runSkillSandbox(skill.name, userPrompt, Array.from(activeMcps))
      if (res.ok && res.output) {
        const { thinking, response } = parseLLMResponse(res.output)
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            role: 'assistant',
            text: response,
            thinking,
          },
        ])
      } else {
        throw new Error(res.error || 'No response from sandbox')
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Sandbox run failed', 'rose')
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          text: `Execution failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
        },
      ])
    } finally {
      setRunning(false)
    }
  }

  // Parse LLM response to separate <thinking> blocks
  const parseLLMResponse = (output: string) => {
    const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/
    const match = output.match(thinkingRegex)
    if (match) {
      const thinking = match[1].trim()
      const response = output.replace(thinkingRegex, '').trim()
      return { thinking, response }
    }
    return { thinking: '', response: output }
  }

  // Toggle MCP Server Active Status
  const handleToggleMcp = (mcp: string) => {
    setActiveMcps(prev => {
      const next = new Set(prev)
      if (next.has(mcp)) {
        next.delete(mcp)
        toast(`${mcp} disabled for sandbox session`, 'slate')
      } else {
        next.add(mcp)
        toast(`${mcp} enabled for sandbox session`, 'emerald')
      }
      return next
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
      {/* LEFT COLUMN: Skill Metadata & Editor */}
      <div className="space-y-6 flex flex-col justify-between">
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={skill.status} />
              <TierBadge tier={skill.tier} />
              <TrustTierBadge trust={skill.trustTier} />
              <Badge tone="violet">{skill.requiredProviderRole}</Badge>
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">{skill.name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{skill.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              icon={FlaskConical}
              onClick={() => {
                toast('Eval started', 'violet')
                api.eval().catch(() => {})
              }}
              testid="detail-eval"
            >
              Run Evals
            </Button>
            <Button
              size="sm"
              icon={RefreshCw}
              onClick={() => {
                toast('Registry sync started', 'emerald')
                api.sync('all').catch(() => {})
              }}
              testid="detail-sync"
            >
              Force Sync
            </Button>
          </div>

          <div className="gp-panel-2 divide-y divide-white/[0.05] px-4">
            <Row label="Path">
              <div className="flex items-center gap-2">
                <span
                  className="truncate font-mono text-xs text-slate-300"
                  title={skill.path}
                >
                  {skill.path}
                </span>
                <CopyButton value={skill.path} label="" />
              </div>
            </Row>
            <Row label="Trust Tier">
              <span className="text-xs text-slate-400">
                {skill.trustTier} · {TRUST_LABEL[skill.trustTier]}
              </span>
            </Row>
            <Row label="Provider Role">
              <span className="font-mono text-xs text-slate-300">
                {skill.requiredProviderRole}
              </span>
            </Row>
            <Row label="Last Eval Verdict">
              <Badge tone={skill.lastEval === 'passed' ? 'emerald' : 'slate'}>
                {skill.lastEval || 'untested'}
              </Badge>
            </Row>
          </div>

          {/* Raw Skill MD Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <FileCode2 size={13} /> Edit SKILL.md (YAML/Markdown)
              </p>
              {detail.data?.skillMd && <CopyButton value={detail.data.skillMd} />}
            </div>
            {detail.loading ? (
              <LoadingState label="Loading SKILL.md..." />
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/[0.06] focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/50 transition-all" data-testid="skill-raw-editor">
                <CodeMirror
                  value={editorContent}
                  height="380px"
                  theme={vscodeDark}
                  extensions={[markdown({ base: markdownLanguage })]}
                  onChange={setEditorContent}
                  className="text-[13px]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Left pane Action Footer */}
        <div className="pt-4 border-t border-white/[0.05]">
          <Button
            variant="primary"
            className="w-full h-10 gap-2 font-semibold shadow-cyan-500/10"
            disabled={saving || detail.loading}
            onClick={handleSaveAndResync}
            icon={saving ? Loader2 : Save}
            testid="detail-save-resync"
          >
            {saving ? 'Saving & Re-syncing...' : 'Save & Re-sync changes'}
          </Button>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Sandbox Chat */}
      <div className="space-y-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/[0.08] pt-6 md:pt-0 md:pl-8">
        <div className="space-y-5 flex-1 flex flex-col justify-between">
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <Terminal size={18} className="text-cyan-400" />
                Interactive Sandbox Sandbox
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Run prompts dynamically using the current skill instructions as system prompt rules.
              </p>
            </div>

            {/* MCP Dependencies Status & Toggles */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Cpu size={12} /> Target MCP Configuration
              </p>
              <div className="flex flex-wrap gap-2">
                {(skill.requiredMcps ?? []).length ? (
                  skill.requiredMcps.map((m: string) => {
                    const active = activeMcps.has(m)
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleToggleMcp(m)}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium leading-5 transition-all ${
                          active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
                            : 'bg-white/[0.02] text-slate-500 border-white/[0.05] line-through'
                        }`}
                        title={active ? 'Click to disable' : 'Click to enable'}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                          }`}
                        />
                        {m}
                      </button>
                    )
                  })
                ) : (
                  <span className="text-xs text-slate-600">No MCP servers required.</span>
                )}
              </div>
            </div>

            {/* Chat Timeline */}
            <div
              className="gp-inset h-[320px] overflow-y-auto p-4 space-y-4 flex flex-col"
              data-testid="sandbox-chat-timeline"
            >
              {messages.length === 0 ? (
                <div className="my-auto text-center space-y-2">
                  <Terminal className="mx-auto text-slate-600" size={32} />
                  <p className="text-xs font-medium text-slate-400">Sandbox Console Ready</p>
                  <p className="text-[11px] text-slate-500 max-w-[280px] mx-auto">
                    Type a prompt below to execute a live simulation run of this skill.
                  </p>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${
                      msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'
                    }`}
                  >
                    <span className="text-[10px] text-slate-500 mb-1 font-mono uppercase tracking-wider">
                      {msg.role === 'user' ? 'Developer' : `${skill.name} Agent`}
                    </span>
                    <div
                      className={`p-3 rounded-2xl border text-sm ${
                        msg.role === 'user'
                          ? 'bg-cyan-500/10 text-cyan-200 border-cyan-500/25 rounded-tr-none'
                          : 'bg-white/[0.02] text-slate-200 border-white/[0.06] rounded-tl-none gp-radial-glow gp-radial-glow-emerald'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      ) : (
                        <AssistantMessage text={msg.text} thinking={msg.thinking} />
                      )}
                    </div>
                  </div>
                ))
              )}

              {running && (
                <div className="self-start flex flex-col items-start max-w-[85%] animate-pulse">
                  <span className="text-[10px] text-slate-500 mb-1 font-mono uppercase tracking-wider">
                    Agent Thinking...
                  </span>
                  <div className="p-3 rounded-2xl border bg-white/[0.01] border-white/[0.04] rounded-tl-none">
                    <Loader2 className="animate-spin text-cyan-400" size={16} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Playground Form Input */}
          <form
            onSubmit={handleRunSandbox}
            className="flex items-center gap-2 mt-4"
            data-testid="sandbox-form"
          >
            <textarea
              value={promptInput}
              onChange={e => setPromptInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleRunSandbox(e as any)
                }
              }}
              placeholder="Ask the agent to execute a task... (Shift+Enter for newline)"
              disabled={running}
              className="flex-1 min-h-[40px] max-h-[120px] py-2.5 px-4 text-xs bg-[#040406] border border-white/[0.08] rounded-xl focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 text-slate-200 disabled:opacity-40 transition-all resize-none gp-custom-scrollbar"
              data-testid="sandbox-input"
              rows={1}
            />
            <button
              type="submit"
              disabled={running || !promptInput.trim()}
              className="h-10 w-10 flex items-center justify-center bg-cyan-500 text-ink-950 hover:bg-cyan-400 disabled:opacity-40 disabled:pointer-events-none rounded-xl transition-all shadow-[0_1px_0_rgba(255,255,255,0.15)_inset] active:scale-[0.98] border border-cyan-400"
              data-testid="sandbox-submit"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function AssistantMessage({ text, thinking }: { text: string; thinking?: string }) {
  const [thinkingExpanded, setThinkingExpanded] = useState(true)

  return (
    <div className="space-y-2.5">
      {thinking && (
        <div className="gp-terminal-block p-3 text-[11px] text-cyan-400 border border-cyan-500/10 rounded-lg w-full">
          <button
            type="button"
            onClick={() => setThinkingExpanded(!thinkingExpanded)}
            className="flex items-center justify-between font-mono font-semibold text-slate-400 hover:text-slate-200 w-full text-left transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Terminal size={12} className="text-cyan-400" />
              TRACE: Planning & Tool Execution
            </span>
            <span className="text-[10px] text-slate-500">
              {thinkingExpanded ? 'Collapse ▲' : 'Expand ▼'}
            </span>
          </button>
          {thinkingExpanded && (
            <pre className="whitespace-pre-wrap leading-relaxed mt-2 text-slate-300 border-t border-white/[0.04] pt-2 font-mono max-h-40 overflow-y-auto">
              {thinking}
            </pre>
          )}
        </div>
      )}
      <div className="text-slate-200">{formatMessageText(text)}</div>
    </div>
  )
}

function formatMessageText(text: string) {
  // Simple regex-based markdown formatter for sandbox chat bubble
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Replace code blocks
  let formatted = escaped.replace(/```(?:[a-zA-Z0-9]+)?\n([\s\S]*?)```/g, (_, code) => {
    return `<pre class="bg-black/50 border border-white/[0.05] p-3 rounded-lg font-mono text-[11px] my-2 overflow-auto text-slate-300 max-h-60">${code.trim()}</pre>`
  })

  // Replace inline code
  formatted = formatted.replace(
    /`([^`\n]+)`/g,
    '<code class="bg-white/10 px-1 py-0.5 rounded font-mono text-xs text-cyan-300">$1</code>',
  )

  // Replace bold
  formatted = formatted.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong class="font-bold text-white">$1</strong>',
  )

  // Replace bullet lists
  formatted = formatted.replace(
    /^\s*-\s+(.+)$/gm,
    '<li class="ml-4 list-disc text-slate-300">$1</li>',
  )

  return (
    <div
      dangerouslySetInnerHTML={{ __html: formatted }}
      className="space-y-1 text-[13px] leading-relaxed"
    />
  )
}
