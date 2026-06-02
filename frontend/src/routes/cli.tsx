import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { TerminalSquare, Play, Trash2, History as HistoryIcon } from 'lucide-react'
import { api } from '~/lib/api'
import { useApi } from '~/lib/useApi'
import { relTime } from '~/lib/meta'
import {
  PageHeader,
  Card,
  Button,
  Tabs,
  Badge,
  TerminalPanel,
  EmptyState,
  useToast,
} from '~/components/ui'

export const Route = createFileRoute('/cli')({
  component: CliPage,
})

function CliPage() {
  const toast = useToast()
  const [tab, setTab] = useState('cli')
  const [input, setInput] = useState('aiskill list')
  const [busy, setBusy] = useState(false)

  const historyQuery = useApi(api.history)

  const run = async (mode: 'cli' | 'prompt') => {
    if (!input.trim() || busy) return
    setBusy(true)
    try {
      const res = mode === 'cli' ? await api.runCli(input) : await api.runPrompt(input)
      if (res.ok) {
        toast.success(`Executed ${mode}`)
      } else {
        toast.error(`Execution failed`)
      }
      historyQuery.refetch()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const deleteRun = async (id: string) => {
    try {
      await api.deleteRun(id)
      historyQuery.refetch()
      toast.success('Run deleted')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="CLI Interface"
        description="Run CLI commands and prompts directly against the agent runtime."
        icon={TerminalSquare}
      />
      <Tabs
        tabs={[
          { id: 'cli', label: 'Command Line' },
          { id: 'prompt', label: 'Agent Prompt' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <Card className="p-4 space-y-4">
        <div className="flex gap-2">
          <input
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') run(tab as 'cli' | 'prompt')
            }}
            placeholder={tab === 'cli' ? 'Enter CLI command...' : 'Enter prompt...'}
          />
          <Button onClick={() => run(tab as 'cli' | 'prompt')} disabled={busy || !input}>
            <Play className="w-4 h-4 mr-2" />
            Execute
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-200">Run History</h3>
        {historyQuery.loading ? (
          <p className="text-slate-500 text-sm">Loading history...</p>
        ) : (historyQuery.data?.entries ?? []).length ? (
          <div className="grid gap-4">
            {historyQuery.data!.entries.map((r: any) => (
              <Card key={r.id} className="p-4 flex items-start justify-between">
               <div>
                   <div className="flex items-center gap-2 mb-2">
                     <Badge tone={r.ok ? 'emerald' : 'rose'}>{r.ok ? 'Success' : 'Failed'}</Badge>
                     <span className="text-xs text-slate-500">{relTime(r.timestamp)}</span>
                   </div>
                   <code className="text-sm text-slate-300 block mb-2">{r.command || r.prompt}</code>
                   {r.stdoutPreview && <TerminalPanel text={r.stdoutPreview} className="max-h-40" />}
                   {r.stderrPreview && <TerminalPanel text={r.stderrPreview} className="max-h-40 border-rose-500/30" />}
                </div>
                <Button variant="ghost" onClick={() => deleteRun(r.id)}>
                  <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-400" />
                </Button>
              </Card>
            ))}
          </div>
         ) : (
           <EmptyState title="No history" body="Run a command to see history." icon={HistoryIcon} />
         )}
      </div>
    </div>
  )
}
