import { createFileRoute } from '@tanstack/react-router'
import { Cpu, KeyRound } from 'lucide-react'
import { api } from '~/lib/api'
import { useApi } from '~/lib/useApi'
import {
  PageHeader,
  Card,
  Badge,
  AdapterBadge,
  LoadingState,
  EmptyState,
} from '~/components/ui'

export const Route = createFileRoute('/providers')({
  component: ProvidersPage,
})

const ROLES = ['planner', 'executor', 'critic', 'researcher']

function ProvidersPage() {
  const providers = useApi(api.providers)
  const providersData = providers.data?.providers ?? {}
  const envStatus = providers.data?.envStatus ?? {}
  const rows = Object.entries(providersData).map(([id, p]: [string, any]) => ({
    id,
    name: id,
    enabled: p.enabled,
    models: p.models ?? {},
    envKey: p.env_key,
    baseUrl: p.base_url,
    apiKeyStatus: (id === 'local' || id === 'ollama') ? 'configured' : (envStatus[id] ? 'configured' : 'missing')
  }))
  const roles = providers.data?.roles ?? {}

  return (
    <div className="space-y-6 gp-fade-in">
      <PageHeader
        icon={Cpu}
        eyebrow="Infrastructure"
        title="Providers"
        description="Provider-neutral model routing. Map planner / executor / critic / researcher roles to any provider. Secrets are never displayed."
      />

      <Card className="p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Role routing</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ROLES.map((role) => (
            <div key={role} className="rounded-xl border border-violet-500/20 bg-violet-500/[0.05] p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-300/80">{role}</p>
              <p className="mt-1.5 font-mono text-sm text-white">{roles[role]?.provider ?? 'local'}</p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-500">{roles[role]?.model ?? 'none'}</p>
            </div>
          ))}
        </div>
      </Card>

      {providers.loading ? (
        <LoadingState label="Loading providers…" />
      ) : rows.length === 0 ? (
        <EmptyState title="No providers configured" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p: any) => (
            <Card key={p.id} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold capitalize text-white">{p.name}</span>
                <AdapterBadge enabled={p.enabled} />
              </div>

              <div className="mt-4 space-y-1.5">
                {ROLES.map((role) => (
                  <div key={role} className="flex items-center justify-between text-[13px]">
                    <span className="text-slate-500">{role}</span>
                    <span className="font-mono text-violet-200/90">{p.models?.[role] ?? '—'}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                  <KeyRound size={12} />
                  {p.envKey ?? (p.baseUrl ? p.baseUrl : 'no key required')}
                </span>
                <Badge tone={p.apiKeyStatus === 'configured' ? 'emerald' : 'rose'} dot>
                  {p.apiKeyStatus}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
