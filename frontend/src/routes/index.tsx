import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Activity,
  Library,
  Server,
  FlaskConical,
  Wand2,
  ArrowRight,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react'
import { api } from '~/lib/api'
import { useApi } from '~/lib/useApi'
import { cn, relTime } from '~/lib/meta'
import {
  MetricCard,
  SectionCard,
  Card,
  Button,
  Badge,
  EmptyState,
  AdapterBadge,
} from '~/components/ui'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

const LIFECYCLE = [
  { key: 'draft', label: 'Drafts', tone: 'slate' as const },
  { key: 'quarantined', label: 'Quarantined', tone: 'amber' as const },
  { key: 'sandbox-tested', label: 'Validated', tone: 'cyan' as const },
  { key: 'active', label: 'Active', tone: 'emerald' as const },
  { key: 'deprecated', label: 'Deprecated', tone: 'slate' as const },
]

function Dashboard() {
  const registry = useApi(api.registry)
  const health = useApi(api.health)
  const runtime = useApi(api.runtime)
  const report = useApi(api.latestReport)
  const history = useApi(api.history)
  const adapters = useApi(api.adapters)

  const skills = registry.data?.skills ?? []
  const counts: Record<string, number> = {}
  for (const s of skills) counts[s.status] = (counts[s.status] ?? 0) + 1

  const activeAdapters = (adapters.data?.adapters ?? []).filter((a: any) => a.enabled)
  const t4Active = skills.filter((s: any) => s.trustTier === 'T4' && s.status === 'active')
  const runs = history.data?.entries ?? []



  return (
    <div className="space-y-7 gp-fade-in">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400/80">
          Control tower
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Universal cockpit for your AI skill registry.
        </p>
      </div>

      {/* Metric row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Registry Health"
          value={health.data?.ok ? 'Healthy' : 'Degraded'}
          tone={health.data?.ok ? 'emerald' : 'rose'}
          sub={health.data?.ok ? 'all systems nominal' : 'backend unreachable'}
          icon={Activity}
        />
        <MetricCard
          label="Total Skills"
          value={skills.length}
          tone="sky"
          sub={`${counts.active ?? 0} active`}
          icon={Library}
        />
        <MetricCard
          label="Active Runtime"
          value={runtime.data?.activeHost ?? '—'}
          tone="violet"
          sub={`${activeAdapters.length} adapter(s) enabled`}
          icon={Server}
        />
        <MetricCard
          label="Last Eval"
          value={report.data?.ok ? 'Passed' : report.data?.summary ? 'Review' : 'Pending'}
          tone={report.data?.ok ? 'emerald' : 'amber'}
          sub={report.data?.timestamp ? relTime(report.data.timestamp) : 'no report yet'}
          icon={FlaskConical}
        />
      </div>

      {/* Lifecycle pipeline — visual stepper */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Skill lifecycle</h3>
          <Link to="/skills" className="text-xs font-medium text-cyan-300 hover:text-cyan-200">
            View registry →
          </Link>
        </div>
        <div className="flex items-center gap-0">
          {LIFECYCLE.map((stage, i) => {
            const count = counts[stage.key] ?? 0
            const isLast = i === LIFECYCLE.length - 1
            const toneMap: Record<string, string> = {
              slate: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
              amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
              cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
              emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
            }
            const dotMap: Record<string, string> = {
              slate: 'bg-slate-500',
              amber: 'bg-amber-400',
              cyan: 'bg-cyan-400',
              emerald: 'bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/50',
            }
            return (
              <div key={stage.key} className="flex flex-1 items-center">
                <div className={cn('flex-1 rounded-xl border px-3 py-3 text-center', toneMap[stage.tone])}>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className={cn('h-1.5 w-1.5 rounded-full', dotMap[stage.tone])} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{stage.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{count}</p>
                </div>
                {!isLast && (
                  <ArrowRight size={13} className="mx-1 shrink-0 text-slate-700" />
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Build CTA — full width, Quick Actions live in the topbar dropdown */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.08] via-ink-900 to-cyan-400/[0.06] p-6 gp-grid-bg">
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-400">
              <Wand2 size={12} /> Builder-first
            </span>
            <h3 className="mt-3 text-xl font-bold text-white">Build a New Skill</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
              Create, validate, and activate a portable SKILL.md package for your universal
              registry — provider-neutral by design.
            </p>
          </div>
          <Link to="/builder">
            <Button className="text-nowrap whitespace-nowrap" variant="primary" size="lg" icon={Wand2} testid="dashboard-open-builder">
              Open Skill Builder
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent runs */}
        <SectionCard
          title="Recent Runs"
          subtitle="Latest simulated executions"
          className="lg:col-span-2"
          actions={
            <Link to="/history" className="text-xs font-medium text-cyan-300 hover:text-cyan-200">
              All history →
            </Link>
          }
        >
          {runs.length === 0 ? (
            <EmptyState
              title="No runs yet"
              body="Console commands, syncs and evals will appear here."
              actions={<Link to="/console" search={{ stage: undefined } as any}><Button size="sm">Open Console</Button></Link>}
            />
          ) : (
            <div className="space-y-2">
              {runs.slice(0, 6).map((r: any) => (
                <div key={r.id} className="gp-row flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[12.5px] text-cyan-200">{r.command}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{relTime(r.timestamp)} · {r.durationMs}ms</p>
                  </div>
                  <Badge tone={r.status === 'ok' ? 'emerald' : r.status === 'blocked' ? 'rose' : 'amber'}>
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* System alerts */}
        <SectionCard title="System Alerts" subtitle="Things that may need attention">
          <div className="space-y-2.5">
            {!health.data?.ok ? (
              <Alert tone="rose" icon={AlertTriangle} text="Local backend unavailable — running in demo mode." />
            ) : null}
            {t4Active.length > 0 ? (
              <Alert
                tone="amber"
                icon={ShieldCheck}
                text={`${t4Active.length} T4 skill(s) active — human approval policy enforced.`}
              />
            ) : null}
            {activeAdapters.length <= 1 ? (
              <Alert tone="amber" icon={Server} text="Only one adapter enabled — sync more hosts for portability." />
            ) : null}
            {health.data?.ok && t4Active.length === 0 ? (
              <Alert tone="emerald" icon={ShieldCheck} text="No outstanding governance alerts." />
            ) : null}
          </div>
        </SectionCard>
      </div>

      {/* Adapter status */}
      <SectionCard
        title="Adapter Status"
        subtitle="Universal skills compiled into host adapters"
                  actions={<Link to="/sync" className="text-xs font-medium text-cyan-300 hover:text-cyan-200">Manage →</Link>}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(adapters.data?.adapters ?? []).map((a: any) => (
            <div key={a.id} className="gp-panel-2 p-3.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[12.5px] text-slate-200">{a.name}</span>
                <span className={cn('h-2 w-2 rounded-full', a.enabled ? 'bg-emerald-400' : 'bg-slate-600')} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <AdapterBadge enabled={a.enabled} />
                <span className="text-[11px] text-slate-500">{a.generatedFiles} files</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

function Alert({ tone, icon: Icon, text }: { tone: 'rose' | 'amber' | 'emerald'; icon: any; text: string }) {
  const map = {
    rose: 'border-rose-500/25 bg-rose-500/[0.07] text-rose-200',
    amber: 'border-amber-500/25 bg-amber-500/[0.07] text-amber-200',
    emerald: 'border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-200',
  }
  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl border p-3 text-[13px] leading-relaxed', map[tone])}>
      <Icon size={15} className="mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  )
}
