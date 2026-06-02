import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { History, Trash2, RotateCw, ChevronDown } from 'lucide-react'
import { api } from '~/lib/api'
import { useApi } from '~/lib/useApi'
import { relTime, cn } from '~/lib/meta'
import {
  PageHeader,
  Card,
  Button,
  Badge,
  CopyButton,
  EmptyState,
  LoadingState,
  useToast,
} from '~/components/ui'

export const Route = createFileRoute('/history')({
  component: HistoryPage,
})

function HistoryPage() {
  const toast = useToast()
  const history = useApi(api.history)
  const [open, setOpen] = useState<string | null>(null)
  const runs = history.data?.entries ?? []

  const rerun = async (cmd: string) => {
    try {
      await api.runCli(cmd)
      toast('Re-run complete')
      history.refetch()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed', 'rose')
    }
  }

  const del = async (id: string) => {
    await api.deleteRun(id)
    toast('Log deleted')
    history.refetch()
  }

  return (
    <div className="space-y-6 gp-fade-in">
      <PageHeader
        icon={History}
        eyebrow="Operations"
        title="Run History"
        description="Every simulated execution, with exit code, duration and output. Tables collapse into cards on mobile."
        actions={<Button variant="secondary" icon={RotateCw} onClick={() => history.refetch()}>Refresh</Button>}
      />

      {history.loading ? (
        <LoadingState label="Loading run history…" />
      ) : runs.length === 0 ? (
        <EmptyState title="No runs recorded" body="Run commands from the Console to populate history." />
      ) : (
        <div className="space-y-2.5">
          {runs.map((r: any) => {
            const expanded = open === r.id
            return (
              <Card key={r.id} className="overflow-hidden">
                <button
                  data-testid={`history-row-${r.id}`}
                  onClick={() => setOpen(expanded ? null : r.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <ChevronDown size={15} className={cn('shrink-0 text-slate-500 transition-transform', expanded && 'rotate-180')} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[13px] text-sky-200">{r.command}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {relTime(r.timestamp)} · {r.durationMs}ms{r.skill ? ` · ${r.skill}` : ''} · {r.kind}
                    </p>
                  </div>
                  <Badge tone={r.status === 'ok' ? 'emerald' : r.status === 'blocked' ? 'rose' : 'amber'}>
                    exit {r.exitCode}
                  </Badge>
                </button>
                {expanded ? (
                  <div className="border-t border-white/[0.06] p-4">
                    <pre className="gp-inset max-h-60 overflow-auto p-3 font-mono text-[11.5px] text-slate-300">
                      {r.stdout || r.stderr || '(no output)'}
                    </pre>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <CopyButton value={r.stdout || r.stderr || ''} label="Copy output" />
                      <Button size="sm" variant="secondary" icon={RotateCw} onClick={() => rerun(r.command)}>Re-run</Button>
                      <Button size="sm" variant="danger" icon={Trash2} onClick={() => del(r.id)} testid={`history-delete-${r.id}`}>Delete local log</Button>
                    </div>
                  </div>
                ) : null}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
