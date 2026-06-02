import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { FlaskConical, RefreshCw, Play } from 'lucide-react'
import { api } from '~/lib/api'
import { useApi } from '~/lib/useApi'
import { relTime } from '~/lib/meta'
import {
  PageHeader,
  Card,
  MetricCard,
  Button,
  Badge,
  CheckRow,
  CopyButton,
  EmptyState,
  TerminalPanel,
  useToast,
} from '~/components/ui'

export const Route = createFileRoute('/evals')({
  component: EvalsPage,
})

function EvalsPage() {
  const toast = useToast()
  const report = useApi(api.latestReport)
  const [busy, setBusy] = useState(false)

  const r = report.data
  const checks = r?.data?.checks ?? []

  const runEval = async () => {
    setBusy(true)
    try {
      await api.eval()
      toast('Eval harness finished', 'emerald')
      report.refetch()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed', 'rose')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 gp-fade-in">
      <PageHeader
        icon={FlaskConical}
        eyebrow="Quality"
        title="Eval Reports"
        description="Registry health checks rendered like code-review checks. Run the harness to validate every skill contract."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={RefreshCw} onClick={() => report.refetch()} testid="eval-refresh">Refresh</Button>
            <Button variant="primary" icon={Play} onClick={runEval} disabled={busy} testid="eval-run">Run Eval Harness</Button>
          </div>
        }
      />

      {report.loading ? (
        <Card className="p-6"><p className="text-sm text-slate-500">Loading…</p></Card>
      ) : !r || (!r.timestamp && !r.summary) ? (
        <EmptyState
          title="No eval report yet"
          body="Run the eval harness to validate registry health."
          actions={<Button variant="primary" icon={Play} onClick={runEval}>Run Eval</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard label="Status" value={r.ok ? 'Passed' : 'Review'} tone={r.ok ? 'emerald' : 'amber'} sub={relTime(r.timestamp)} />
            <MetricCard label="Total Checks" value={r.total ?? checks.length} tone="sky" />
            <MetricCard label="Passed" value={r.passed ?? 0} tone="emerald" />
            <MetricCard label="Warnings" value={r.warnings ?? 0} tone="amber" sub={`${r.failed ?? 0} failed`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Checks</h3>
                <Badge tone={r.ok ? 'emerald' : 'amber'}>{r.summary}</Badge>
              </div>
              <div className="divide-y divide-white/[0.05]">
                {checks.length === 0 ? (
                  <p className="py-3 text-sm text-slate-500">No checks recorded.</p>
                ) : (
                  checks.map((c: any, i: number) => (
                    <CheckRow key={i} label={c.name} detail={c.detail} status={c.status} />
                  ))
                )}
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                <span className="font-mono text-xs text-slate-400">eval log output</span>
                <CopyButton value={r.logOutput ?? ''} />
              </div>
              <TerminalPanel text={r.logOutput ?? ''} empty="No log output." className="max-h-[300px] rounded-none border-0" />
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
              <span className="font-mono text-xs text-slate-400">raw report JSON</span>
              <CopyButton value={JSON.stringify(r.data ?? {}, null, 2)} />
            </div>
            <pre className="max-h-[360px] overflow-auto p-4 font-mono text-[12px] text-slate-300">
              {JSON.stringify(r.data ?? {}, null, 2)}
            </pre>
          </Card>
        </>
      )}
    </div>
  )
}
