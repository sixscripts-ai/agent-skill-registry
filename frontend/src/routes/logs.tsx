import { createFileRoute } from '@tanstack/react-router'
import { ScrollText, RotateCw } from 'lucide-react'
import { api } from '~/lib/api'
import { useApi } from '~/lib/useApi'
import { relTime } from '~/lib/meta'
import { PageHeader, Card, Button, Badge, EmptyState, LoadingState } from '~/components/ui'

export const Route = createFileRoute('/logs')({
  component: LogsPage,
})

function LogsPage() {
  const logs = useApi(api.logs)
  const entries = logs.data?.entries ?? []

  return (
    <div className="space-y-6 gp-fade-in">
      <PageHeader
        icon={ScrollText}
        eyebrow="Quality"
        title="Logs"
        description="Structured activity log from the simulated runtime."
        actions={<Button variant="secondary" icon={RotateCw} onClick={() => logs.refetch()}>Refresh</Button>}
      />

      {logs.loading ? (
        <LoadingState label="Loading logs…" />
      ) : entries.length === 0 ? (
        <EmptyState title="No logs yet" body="System activity will populate here." />
      ) : (
        <Card className="p-4">
          <div className="space-y-1.5 font-mono text-[12px]">
            {entries.map((l: any) => (
              <div key={l.id} className="flex items-start gap-3 rounded-lg border border-white/[0.05] bg-[#07090d] px-3 py-2">
                <Badge tone={l.level === 'error' ? 'rose' : l.level === 'warn' ? 'amber' : 'slate'}>{l.level}</Badge>
                <span className="flex-1 text-slate-300">{l.message}</span>
                <span className="shrink-0 text-slate-600">{relTime(l.timestamp)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
