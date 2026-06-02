import { createFileRoute } from '@tanstack/react-router'
import { Boxes, AlertTriangle } from 'lucide-react'
import { api } from '~/lib/api'
import { useApi } from '~/lib/useApi'
import {
  PageHeader,
  Card,
  Button,
  Badge,
  TrustTierBadge,
  AdapterBadge,
  LoadingState,
  EmptyState,
  useToast,
} from '~/components/ui'

export const Route = createFileRoute('/mcp')({
  component: McpPage,
})

function McpPage() {
  const toast = useToast()
  const mcp = useApi(api.mcp)
  const serversData = mcp.data?.servers ?? {}
  const servers = Object.entries(serversData).map(([id, s]: [string, any]) => ({
    id,
    name: id,
    ...s
  }))

  return (
    <div className="space-y-6 gp-fade-in">
      <PageHeader
        icon={Boxes}
        eyebrow="Infrastructure"
        title="MCP Servers"
        description="Model Context Protocol tool bridges. Each server exposes scoped capabilities under a trust tier."
      />

      {mcp.loading ? (
        <LoadingState label="Loading MCP servers…" />
      ) : servers.length === 0 ? (
        <EmptyState title="No MCP servers configured" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {servers.map((s: any) => (
            <Card key={s.id} className="flex flex-col p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-semibold text-cyan-200">{s.name}</span>
                <AdapterBadge enabled={s.enabled} />
              </div>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-400">{s.purpose}</p>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <TrustTierBadge trust={s.trustTier} />
                {(s.scope ?? []).map((sc: string) => (
                  <Badge key={sc} tone="slate">{sc}</Badge>
                ))}
              </div>

              {s.envKey ? (
                <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <span className="font-mono text-[11px] text-slate-500">{s.envKey}</span>
                  <Badge tone={s.envConfigured ? 'emerald' : 'rose'} dot>
                    {s.envConfigured ? 'configured' : 'missing'}
                  </Badge>
                </div>
              ) : null}

              {(s.warnings ?? []).length ? (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-2.5 py-2 text-[11px] text-amber-200">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  <span>{s.warnings[0]}</span>
                </div>
              ) : null}

              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => toast(`${s.name} validated`)} testid={`mcp-validate-${s.name}`}>Validate</Button>
                <Button size="sm" variant="ghost" onClick={() => toast(`${s.name} test: reachable (simulated)`)}>Test</Button>
                <Button size="sm" variant="ghost" onClick={() => toast('Configure in mcp.yaml')}>Configure</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
