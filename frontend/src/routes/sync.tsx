import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { RefreshCw, FolderSync, FileCheck2, Trash2, CheckCircle2 } from 'lucide-react'
import { api } from '~/lib/api'
import { useApi } from '~/lib/useApi'
import { relTime } from '~/lib/meta'
import {
  PageHeader,
  Card,
  Button,
  Badge,
  AdapterBadge,
  MonoPath,
  LoadingState,
  EmptyState,
  useToast,
} from '~/components/ui'

export const Route = createFileRoute('/sync')({
  component: SyncPage,
})

function SyncPage() {
  const toast = useToast()
  const adapters = useApi(api.adapters)
  const [busy, setBusy] = useState<string | null>(null)

  const rows = adapters.data?.adapters ?? []

  const run = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setBusy(key)
    try {
      await fn()
      toast(msg)
      adapters.refetch()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed', 'rose')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6 gp-fade-in">
      <PageHeader
        icon={FolderSync}
        eyebrow="Operations"
        title="Sync & Adapters"
        description="Compile universal skills into host-specific adapters. Each adapter is a stack operation in the compatibility queue."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button icon={RefreshCw} onClick={() => run('all', () => api.sync('all'), 'All adapters synced')} disabled={busy === 'all'} testid="sync-all">Sync All</Button>
            <Button variant="secondary" icon={FileCheck2} onClick={() => run('validate', async () => { await api.doctor() }, 'Validation complete')} disabled={busy === 'validate'} testid="validate-all">Validate All</Button>
            <Button variant="danger" icon={Trash2} onClick={() => run('clean', () => api.resetAdapters(), 'Generated adapters cleaned')} disabled={busy === 'clean'} testid="clean-adapters">Clean Generated</Button>
          </div>
        }
      />

      {adapters.loading ? (
        <LoadingState label="Loading adapters…" />
      ) : rows.length === 0 ? (
        <EmptyState title="No adapters configured" />
      ) : (
        <div className="space-y-2.5">
          {rows.map((a: any) => (
            <Card key={a.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[15px] font-semibold text-white">{a.name}</span>
                    <AdapterBadge enabled={a.enabled} />
                    {a.lastSyncStatus === 'ok' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                        <CheckCircle2 size={13} /> synced
                      </span>
                    ) : null}
                  </div>
                  <MonoPath value={a.adapterPath} className="mt-1 block" />
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>{a.generatedFiles} generated files</span>
                    <span>last sync: {relTime(a.lastSyncTime)}</span>
                    <span>status: {a.lastSyncStatus}</span>
                  </div>
                  {(a.warnings ?? []).length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {a.warnings.map((w: string) => (
                        <Badge key={w} tone="amber">{w}</Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="primary" icon={RefreshCw} disabled={busy === a.name} onClick={() => run(a.name, () => api.sync(a.name), `${a.name} synced`)} testid={`sync-${a.name}`}>Sync</Button>
                  <Button size="sm" variant="secondary" disabled={busy === a.name + '-v'} onClick={() => run(a.name + '-v', async () => { await api.doctor() }, `${a.name} validated`)}>Validate</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
