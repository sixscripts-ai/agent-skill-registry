import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { TerminalSquare, Play, Trash2, Zap } from 'lucide-react'
import { api, type CliResult } from '~/lib/api'
import { useApi } from '~/lib/useApi'
import { cn, relTime, CHECK_TONE } from '~/lib/meta'
import {
  PageHeader,
  Card,
  Button,
  Tabs,
  Badge,
  TerminalPanel,
  EmptyState,
  CopyButton,
  useToast,
} from '~/components/ui'

export const Route = createFileRoute('/console')({
  component: ConsolePage,
})

const PRESETS = [
  'aiskill doctor',
  'aiskill list',
  'aiskill sync all',
  'aiskill eval',
  'aiskill run "Run a safe system audit."',
  'aiskill gate "ls -la"',
  'aiskill gate "sudo rm -rf /"',
]

function ConsolePage() {
  const toast = useToast()
  const [tab, setTab] = useState('cli')
  const [input, setInput] = useState('aiskill doctor')
  const [output, setOutput] = useState('')
  const [last, setLast] = useState<CliResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<CliResult[]>([])
  const logs = useApi(api.logs)

  const exec = async (command: string) => {
    if (busy || !command.trim()) return
    setBusy(true)
    try {
      const res = await api.runCli(command)
      setLast(res)
      setResults((r) => [res, ...r].slice(0, 20))
      setOutput((prev) =>
        `${prev ? prev + '\n\n' : ''}$ ${res.command}\n${res.stdout || res.stderr}\n[exit ${res.exitCode} · ${res.durationMs}ms]`,
      )
      if (res.gate) {
        toast(`Gate verdict: ${(res.gate as any).verdict}`, (res.gate as any).verdict === 'BLOCKED' ? 'rose' : (res.gate as any).verdict === 'PASS' ? 'emerald' : 'amber')
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Command failed', 'rose')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 gp-fade-in">
      <PageHeader
        icon={TerminalSquare}
        eyebrow="Operations"
        title="Console"
        description="Run aiskill workflows in simulated runtime mode. Approved commands return realistic structured output — no shell is ever executed."
        actions={<Badge tone="amber" dot>simulated runtime mode</Badge>}
      />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'cli', label: 'CLI', icon: TerminalSquare },
          { id: 'logs', label: 'Logs' },
          { id: 'recent', label: 'Recent Output' },
          { id: 'presets', label: 'Presets' },
        ]}
      />

      {tab === 'cli' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <Card className="p-4">
            <form
              className="flex flex-col gap-2.5 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault()
                void exec(input)
              }}
            >
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-[#07090d] px-3">
                <span className="font-mono text-sm text-emerald-400">$</span>
                <input
                  data-testid="console-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="aiskill <command>"
                  className="h-10 w-full bg-transparent font-mono text-sm text-sky-100 outline-none placeholder:text-slate-600"
                />
              </div>
              <Button type="submit" variant="primary" icon={Play} disabled={busy} testid="console-run">
                Run
              </Button>
            </form>

            <div className="mt-4">
              <TerminalPanel text={output} empty="Run a command to see output here." />
            </div>

            {last ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="exit code" value={String(last.exitCode)} tone={last.exitCode === 0 ? 'emerald' : 'rose'} />
                <Stat label="duration" value={`${last.durationMs}ms`} />
                <Stat label="status" value={last.status ?? (last.ok ? 'ok' : 'failed')} tone={last.ok ? 'emerald' : 'rose'} />
                <div className="flex items-center justify-center gap-2">
                  <CopyButton value={last.stdout || last.stderr} label="Copy" />
                  <button
                    onClick={() => { setOutput(''); setLast(null) }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-slate-400 hover:text-rose-300"
                  >
                    <Trash2 size={12} /> Clear
                  </button>
                </div>
              </div>
            ) : null}

            {last?.gate ? <GateResult gate={last.gate as any} /> : null}
          </Card>

          <Card className="p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Zap size={13} className="text-sky-300" /> Presets
            </p>
            <div className="flex flex-col gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  data-testid={`preset-${p}`}
                  onClick={() => { setInput(p); void exec(p) }}
                  className="truncate rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left font-mono text-[12px] text-slate-300 transition-colors hover:border-sky-500/30 hover:text-white"
                >
                  {p}
                </button>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {tab === 'logs' ? (
        <Card className="p-4">
          {(logs.data?.entries ?? []).length === 0 ? (
            <EmptyState title="No logs yet" body="System activity will populate here." />
          ) : (
            <div className="space-y-1.5 font-mono text-[12px]">
              {(logs.data?.entries ?? []).map((l: any) => (
                <div key={l.id} className="flex items-start gap-3 rounded-lg border border-white/[0.05] bg-[#07090d] px-3 py-2">
                  <Badge tone={l.level === 'error' ? 'rose' : l.level === 'warn' ? 'amber' : 'slate'}>{l.level}</Badge>
                  <span className="flex-1 text-slate-300">{l.message}</span>
                  <span className="shrink-0 text-slate-600">{relTime(l.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'recent' ? (
        <Card className="p-4">
          {results.length === 0 ? (
            <EmptyState title="No recent output" body="Commands you run this session appear here." />
          ) : (
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="gp-panel-2 overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
                    <span className="truncate font-mono text-[12px] text-sky-200">{r.command}</span>
                    <Badge tone={r.ok ? 'emerald' : 'rose'}>exit {r.exitCode}</Badge>
                  </div>
                  <pre className="max-h-44 overflow-auto p-3 font-mono text-[11.5px] text-slate-400">{r.stdout || r.stderr}</pre>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'presets' ? (
        <Card className="p-4">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {PRESETS.map((p) => (
              <div key={p} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <span className="truncate font-mono text-[12px] text-slate-300">{p}</span>
                <div className="flex items-center gap-1.5">
                  <CopyButton value={p} label="" />
                  <Button size="sm" variant="secondary" icon={Play} onClick={() => { setTab('cli'); setInput(p); void exec(p) }}>Run</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}

function Stat({ label, value, tone = 'slate' }: { label: string; value: string; tone?: any }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={cn('mt-0.5 font-mono text-sm', tone === 'emerald' ? 'text-emerald-300' : tone === 'rose' ? 'text-rose-300' : 'text-slate-200')}>{value}</p>
    </div>
  )
}

function GateResult({ gate }: { gate: { verdict: string; gates: { id: string; name: string; status: string; detail: string }[] } }) {
  return (
    <div className="mt-4 gp-panel-2 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gate checks</span>
        <Badge tone={gate.verdict === 'BLOCKED' ? 'rose' : gate.verdict === 'PASS' ? 'emerald' : 'amber'}>{gate.verdict}</Badge>
      </div>
      <div className="space-y-1.5">
        {gate.gates.map((g) => (
          <div key={g.id} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="font-mono text-slate-400">{g.id} · {g.name}</span>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-slate-500 sm:inline">{g.detail}</span>
              <Badge tone={CHECK_TONE[g.status] ?? 'slate'}>{g.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
