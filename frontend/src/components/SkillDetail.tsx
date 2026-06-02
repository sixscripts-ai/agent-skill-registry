import { Play, FlaskConical, RefreshCw, FileCode2 } from 'lucide-react'
import { api } from '~/lib/api'
import { useApi } from '~/lib/useApi'
import {
  TierBadge,
  TrustTierBadge,
  StatusBadge,
  McpBadge,
  Badge,
  Button,
  CopyButton,
  LoadingState,
  useToast,
} from '~/components/ui'
import { TRUST_LABEL } from '~/lib/meta'

export function SkillDetailView({ skill }: { skill: any }) {
  const toast = useToast()
  const detail = useApi(() => api.skill(skill.name), [skill.name])
  const md = detail.data?.skillMd ?? ''

  const act = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn()
      toast(label)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Action failed', 'rose')
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={skill.status} />
          <TierBadge tier={skill.tier} />
          <TrustTierBadge trust={skill.trustTier} />
          <Badge tone="violet">{skill.requiredProviderRole}</Badge>
        </div>
        <h2 className="mt-3 text-xl font-bold tracking-tight text-white">{skill.name}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{skill.description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="primary" icon={Play} onClick={() => act('Run queued', () => api.runPrompt(`Run skill ${skill.name}`))} testid="detail-run">
          Run
        </Button>
        <Button size="sm" icon={FlaskConical} onClick={() => act('Eval started', () => api.eval())} testid="detail-eval">
          Eval
        </Button>
        <Button size="sm" icon={RefreshCw} onClick={() => act('Sync started', () => api.sync('all'))} testid="detail-sync">
          Sync
        </Button>
      </div>

      <div className="gp-panel-2 divide-y divide-white/[0.05] px-4">
        <Row label="Path">
          <div className="flex items-center gap-2">
            <span className="truncate font-mono text-xs text-slate-300" title={skill.path}>{skill.path}</span>
            <CopyButton value={skill.path} label="" />
          </div>
        </Row>
        <Row label="Trust">
          <span className="text-xs text-slate-400">{skill.trustTier} · {TRUST_LABEL[skill.trustTier]}</span>
        </Row>
        <Row label="Provider role">
          <span className="font-mono text-xs text-slate-300">{skill.requiredProviderRole}</span>
        </Row>
        <Row label="Last eval">
          <Badge tone={skill.lastEval === 'passed' ? 'emerald' : 'slate'}>{skill.lastEval}</Badge>
        </Row>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Required MCP servers</p>
        <div className="flex flex-wrap gap-1.5">
          {(skill.requiredMcps ?? []).length ? (
            skill.requiredMcps.map((m: string) => <McpBadge key={m} name={m} />)
          ) : (
            <span className="text-xs text-slate-600">none</span>
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <FileCode2 size={13} /> SKILL.md
          </p>
          {md ? <CopyButton value={md} /> : null}
        </div>
        {detail.loading ? (
          <LoadingState label="Loading SKILL.md…" />
        ) : (
          <pre className="gp-inset max-h-[340px] overflow-auto p-4 font-mono text-[12px] leading-relaxed text-slate-300">
            {md}
          </pre>
        )}
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
