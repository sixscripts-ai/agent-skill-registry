import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Search, LayoutGrid, List, Wand2, ChevronRight, Library } from 'lucide-react'
import { api } from '~/lib/api'
import { useApi } from '~/lib/useApi'
import { cn, TIERS, TRUST_TIERS, STATUSES, PROVIDER_ROLES, MCP_OPTIONS } from '~/lib/meta'
import {
  PageHeader,
  Button,
  Badge,
  TierBadge,
  TrustTierBadge,
  StatusBadge,
  McpBadge,
  EmptyState,
  LoadingState,
  ErrorState,
  Drawer,
  MonoPath,
} from '~/components/ui'
import { SkillDetailView } from '~/components/SkillDetail'

export const Route = createFileRoute('/skills/')({
  component: RegistryPage,
})

function RegistryPage() {
  const registry = useApi(api.registry)
  const [q, setQ] = useState('')
  const [tier, setTier] = useState('all')
  const [trust, setTrust] = useState('all')
  const [status, setStatus] = useState('all')
  const [role, setRole] = useState('all')
  const [mcp, setMcp] = useState('all')
  const [sort, setSort] = useState('tier')
  const [view, setView] = useState<'grid' | 'list'>('list')
  const [selected, setSelected] = useState<any | null>(null)
  const [drawer, setDrawer] = useState(false)

  const skills = registry.data?.skills ?? []

  const filtered = useMemo(() => {
    let out = skills.filter((s: any) => {
      if (q && !(`${s.name} ${s.description}`.toLowerCase().includes(q.toLowerCase()))) return false
      if (tier !== 'all' && s.tier !== tier) return false
      if (trust !== 'all' && s.trustTier !== trust) return false
      if (status !== 'all' && s.status !== status) return false
      if (role !== 'all' && s.requiredProviderRole !== role) return false
      if (mcp !== 'all' && !(s.requiredMcps ?? []).includes(mcp)) return false
      return true
    })
    out = [...out].sort((a: any, b: any) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'trust') return a.trustTier.localeCompare(b.trustTier)
      if (sort === 'status') return a.status.localeCompare(b.status)
      return a.tier.localeCompare(b.tier)
    })
    return out
  }, [skills, q, tier, trust, status, role, mcp, sort])

  const openSkill = (s: any) => {
    setSelected(s)
    if (window.innerWidth < 1024) setDrawer(true)
  }

  return (
    <div className="space-y-6 gp-fade-in">
      <PageHeader
        icon={Library}
        eyebrow="Inbox"
        title="Skill Registry"
        description="Your universal skill registry — the source of truth. Review, run, evaluate and sync portable skill packages."
        actions={
          <Link to="/builder">
            <Button variant="primary" icon={Wand2} testid="registry-create-btn">
              Create Skill
            </Button>
          </Link>
        }
      />

      {/* Filter bar */}
      <div className="gp-panel p-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              data-testid="registry-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search skills…"
              className="gp-input w-full py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect value={tier} onChange={setTier} label="Tier" options={TIERS} testid="filter-tier" />
            <FilterSelect value={trust} onChange={setTrust} label="Trust" options={TRUST_TIERS} testid="filter-trust" />
            <FilterSelect value={status} onChange={setStatus} label="Status" options={STATUSES} testid="filter-status" />
            <FilterSelect value={role} onChange={setRole} label="Role" options={PROVIDER_ROLES} testid="filter-role" />
            <FilterSelect value={mcp} onChange={setMcp} label="MCP" options={MCP_OPTIONS} testid="filter-mcp" />
            <FilterSelect value={sort} onChange={setSort} label="Sort" options={['tier', 'name', 'trust', 'status']} testid="filter-sort" allLabel={false} />
            <div className="flex overflow-hidden rounded-lg border border-white/10">
              <button
                data-testid="view-list"
                onClick={() => setView('list')}
                className={cn('p-2', view === 'list' ? 'bg-white/[0.08] text-white' : 'text-slate-500')}
              >
                <List size={15} />
              </button>
              <button
                data-testid="view-grid"
                onClick={() => setView('grid')}
                className={cn('p-2', view === 'grid' ? 'bg-white/[0.08] text-white' : 'text-slate-500')}
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {registry.loading ? (
        <LoadingState label="Loading registry…" />
      ) : registry.error ? (
        <ErrorState label="Local backend unavailable" detail="The UI is running in demo mode until the registry API is connected." onRetry={registry.refetch} />
      ) : skills.length === 0 ? (
        <EmptyState
          title="No skills loaded yet"
          body="Create your first skill or check the registry connection."
          actions={
            <>
              <Link to="/builder"><Button variant="primary" icon={Wand2}>Open Skill Builder</Button></Link>
              <Button onClick={() => api.doctor()}>Run Diagnostics</Button>
            </>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* List */}
          <div>
            {filtered.length === 0 ? (
              <EmptyState title="No matching skills" body="Adjust your filters or search query." />
            ) : (
              <div className={cn(view === 'grid' ? 'grid gap-3 sm:grid-cols-2' : 'space-y-2.5')}>
                {filtered.map((s: any) => (
                  <SkillRow
                    key={s.id}
                    skill={s}
                    active={selected?.id === s.id}
                    onClick={() => openSkill(s)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Detail panel (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              {selected ? (
                <div className="gp-panel p-5">
                  <SkillDetailView skill={selected} />
                  <Link to="/skills/$skillId" params={{ skillId: selected.name }} className="mt-4 inline-block">
                    <Button size="sm" variant="ghost">Open full page →</Button>
                  </Link>
                </div>
              ) : (
                <div className="gp-panel flex flex-col items-center justify-center px-6 py-16 text-center">
                  <ChevronRight size={22} className="mb-3 text-slate-600" />
                  <p className="text-sm font-medium text-slate-300">Select a skill</p>
                  <p className="mt-1 text-xs text-slate-500">Open a package to review it like a pull request.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Mobile detail drawer */}
      <Drawer open={drawer} onClose={() => setDrawer(false)} title={selected ? <span className="font-mono text-sm text-white">{selected.name}</span> : null}>
        {selected ? <SkillDetailView skill={selected} /> : null}
      </Drawer>
    </div>
  )
}

function SkillRow({ skill, active, onClick }: { skill: any; active: boolean; onClick: () => void }) {
  return (
    <button
      data-testid={`skill-card-${skill.name}`}
      onClick={onClick}
      className={cn(
        'group w-full rounded-xl border p-4 text-left transition-all',
        active
          ? 'border-cyan-500/30 bg-cyan-500/[0.06]'
          : 'border-white/[0.06] bg-white/[0.015] hover:border-cyan-500/25 hover:bg-white/[0.03]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-white">{skill.name}</h3>
          <MonoPath value={skill.path} className="mt-0.5 block max-w-full" />
        </div>
        <StatusBadge status={skill.status} />
      </div>
      <p className="mt-2.5 gp-clamp-2 text-[13px] leading-relaxed text-slate-400">{skill.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <TierBadge tier={skill.tier} />
        <TrustTierBadge trust={skill.trustTier} />
        <Badge tone="violet">{skill.requiredProviderRole}</Badge>
        {(skill.requiredMcps ?? []).slice(0, 2).map((m: string) => (
          <McpBadge key={m} name={m} />
        ))}
      </div>
    </button>
  )
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
  testid,
  allLabel = true,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  options: string[]
  testid?: string
  allLabel?: boolean
}) {
  return (
    <select
      data-testid={testid}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="gp-input appearance-none px-2.5 py-2 text-[13px] text-slate-300"
    >
      {allLabel ? <option value="all" className="bg-ink-800">{label}: all</option> : null}
      {options.map((o) => (
        <option key={o} value={o} className="bg-ink-800">
          {allLabel ? o : `${label}: ${o}`}
        </option>
      ))}
    </select>
  )
}
