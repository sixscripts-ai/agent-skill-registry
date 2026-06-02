import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Eye,
  Save,
  ShieldAlert,
  Sparkles,
  CopyCheck,
  Target,
  Tag,
  Wrench,
  FileText,
  ShieldCheck,
  Rocket,
  PanelRightOpen,
} from 'lucide-react'
import { api } from '~/lib/api'
import {
  TIERS,
  TRUST_TIERS,
  STATUSES,
  PROVIDER_ROLES,
  MCP_OPTIONS,
  TRUST_LABEL,
  cn,
} from '~/lib/meta'
import {
  Button,
  Card,
  CheckRow,
  CopyButton,
  Drawer,
  TierBadge,
  TrustTierBadge,
  useToast,
} from '~/components/ui'

type Form = {
  name: string
  description: string
  tier: string
  trustTier: string
  status: string
  requiredProviderRole: string
  requiredMcps: string[]
  allowedTools: string[]
  sideEffects: string[]
  triggerPhrases: string[]
  instructions: string
  references: string[]
}

const EMPTY: Form = {
  name: '',
  description: '',
  tier: 'functional',
  trustTier: 'T2',
  status: 'draft',
  requiredProviderRole: 'executor',
  requiredMcps: ['filesystem'],
  allowedTools: ['read_file'],
  sideEffects: [],
  triggerPhrases: [],
  instructions: '',
  references: [],
}

const STORAGE_KEY = 'uaisl.builder.draft'

const STEPS = [
  { id: 'purpose', label: 'Purpose', icon: Target },
  { id: 'metadata', label: 'Metadata', icon: Tag },
  { id: 'tools', label: 'Tools & Runtime', icon: Wrench },
  { id: 'instructions', label: 'Instructions', icon: FileText },
  { id: 'governance', label: 'Governance', icon: ShieldCheck },
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'save', label: 'Validate & Save', icon: Rocket },
]

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function buildSkillMd(f: Form): string {
  const name = f.name || 'untitled-skill'
  const path = `shared/${f.tier}/${slugify(name) || 'untitled-skill'}`
  const list = (items: string[]) => {
    const xs = items.filter((i) => i.trim())
    return xs.length ? '[' + xs.map((i) => JSON.stringify(i)).join(', ') + ']' : '[]'
  }
  const fm = [
    '---',
    `name: ${slugify(name) || name}`,
    `description: ${JSON.stringify(f.description)}`,
    `tier: ${f.tier}`,
    `trust_tier: ${f.trustTier}`,
    `status: ${f.status}`,
    `path: ${path}`,
    `required_provider_role: ${f.requiredProviderRole}`,
    `required_mcps: ${list(f.requiredMcps)}`,
    `allowed_tools: ${list(f.allowedTools)}`,
    `side_effects: ${list(f.sideEffects)}`,
    `trigger_phrases: ${list(f.triggerPhrases)}`,
    '---',
    '',
    `# ${slugify(name) || name}`,
    '',
    f.instructions || f.description || '_No instructions provided yet._',
  ]
  const refs = f.references.filter((r) => r.trim())
  if (refs.length) fm.push('', '## References & Assets', ...refs.map((r) => `- \`${r}\``))
  return fm.join('\n')
}

/* ------------------------------------------------------------- TagInput */
function TagInput({
  value,
  onChange,
  placeholder,
  testid,
}: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  testid?: string
}) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const v = draft.trim()
    if (v && !value.includes(v)) onChange([...value, v])
    setDraft('')
  }
  return (
    <div className="gp-input flex flex-wrap items-center gap-1.5 px-2.5 py-2">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-xs text-slate-200"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="text-slate-500 hover:text-rose-300"
          >
            ×
          </button>
        </span>
      ))}
      <input
        data-testid={testid}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add()
          }
        }}
        onBlur={add}
        placeholder={value.length ? '' : placeholder}
        className="min-w-[120px] flex-1 bg-transparent py-0.5 text-sm text-slate-200 outline-none placeholder:text-slate-600"
      />
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-slate-600">{hint}</p> : null}
    </div>
  )
}

function ChipSelect({
  options,
  value,
  onChange,
  tone = 'sky',
}: {
  options: string[]
  value: string[]
  onChange: (v: string[]) => void
  tone?: string
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = value.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            data-testid={`chip-${opt}`}
            onClick={() => onChange(on ? value.filter((v) => v !== opt) : [...value, opt])}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors',
              on
                ? `border-${tone}-500/40 bg-${tone}-500/15 text-${tone}-200`
                : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-slate-200',
            )}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function Selectish({
  value,
  onChange,
  options,
  testid,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  testid?: string
}) {
  return (
    <select
      data-testid={testid}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="gp-input w-full appearance-none px-3 py-2.5 text-sm"
    >
      {options.map((o) => (
        <option key={o} value={o} className="bg-ink-800">
          {o}
        </option>
      ))}
    </select>
  )
}

/* ----------------------------------------------------------- ChecksPanel */
function ChecksPanel({
  checks,
  overall,
}: {
  checks: { id: string; label: string; status: string; detail?: string }[]
  overall?: string
}) {
  if (!checks.length)
    return (
      <p className="text-xs text-slate-500">
        Run a validation or governance check to see PR-style results here.
      </p>
    )
  return (
    <div className="divide-y divide-white/[0.05]">
      {overall ? (
        <div className="flex items-center justify-between pb-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Overall
          </span>
          <span
            className={cn(
              'rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase',
              overall === 'pass'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : overall === 'blocked'
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300',
            )}
          >
            {overall}
          </span>
        </div>
      ) : null}
      {checks.map((c) => (
        <CheckRow key={c.id} label={c.label} detail={c.detail} status={c.status} />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------ SkillBuilder */
export function SkillBuilder() {
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Form>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY)
      if (cached) return { ...EMPTY, ...JSON.parse(cached) }
    } catch {
      /* noop */
    }
    return EMPTY
  })
  const [checks, setChecks] = useState<{ overall?: string; checks: any[] }>({ checks: [] })
  const [busy, setBusy] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [dedupe, setDedupe] = useState<any[] | null>(null)

  const set = <K extends keyof Form>(key: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [key]: v }))

  // autosave
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
      } catch {
        /* noop */
      }
    }, 400)
    return () => clearTimeout(t)
  }, [form])

  // T4 guard: never allow active
  useEffect(() => {
    if (form.trustTier === 'T4' && form.status === 'active') set('status', 'quarantined')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.trustTier])

  const skillMd = useMemo(() => buildSkillMd(form), [form])
  const isT4 = form.trustTier === 'T4'

  const action = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    try {
      await fn()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Action failed', 'rose')
    } finally {
      setBusy(null)
    }
  }

  const runValidate = () =>
    action('validate', async () => {
      const res = await api.validateSkill(form)
      setChecks({ overall: res.overall, checks: res.checks })
      toast(`Validation: ${res.overall}`, res.overall === 'blocked' ? 'rose' : res.overall === 'pass' ? 'emerald' : 'amber')
    })

  const runDedupe = () =>
    action('dedupe', async () => {
      const res = await api.dedupe(form.name || 'new-skill', form.description)
      const matches = (res as any).matches ?? []
      setDedupe(matches)
      toast(matches.length ? `${matches.length} similar skill(s) found` : 'No duplicates found', matches.length ? 'amber' : 'emerald')
    })

  const runGovernance = () =>
    action('gov', async () => {
      const res = await api.validateSkill(form)
      const gov = res.checks.filter((c: any) => ['governance_tier', 'save_target'].includes(c.id))
      setChecks({ overall: res.overall, checks: res.checks })
      toast(gov[0]?.detail ?? 'Governance reviewed', isT4 ? 'amber' : 'emerald')
    })

  const saveDraft = (quarantine?: boolean) =>
    action(quarantine ? 'quarantine' : 'draft', async () => {
      await api.saveDraft({ name: form.name || 'untitled-skill', payload: { ...form, status: quarantine ? 'quarantined' : 'draft' } })
      toast(quarantine ? 'Saved to quarantine queue' : 'Draft saved')
    })

  const create = () =>
    action('create', async () => {
      const res = await api.createSkill(form)
      localStorage.removeItem(STORAGE_KEY)
      toast(`Skill "${res.skill.name}" created`, 'emerald')
      navigate({ to: '/skills' })
    })

  const reset = () => {
    setForm(EMPTY)
    setChecks({ checks: [] })
    setDedupe(null)
    setStep(0)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* noop */
    }
  }

  const canNext = step < STEPS.length - 1
  const canPrev = step > 0

  /* ------------------------------------------------------ step content */
  const StepBody = () => {
    switch (STEPS[step].id) {
      case 'purpose':
        return (
          <div className="space-y-5">
            <Field label="Skill name" hint="Lowercase, hyphenated — becomes the package id and path.">
              <input
                data-testid="builder-name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. project-diagnostic"
                className="gp-input w-full px-3 py-2.5 text-sm"
              />
              {form.name ? (
                <p className="mt-1.5 font-mono text-xs text-cyan-300/80">
                  shared/{form.tier}/{slugify(form.name) || '…'}
                </p>
              ) : null}
            </Field>
            <Field label="Description" hint="One sentence: what capability does this skill add to the registry?">
              <textarea
                data-testid="builder-description"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={4}
                placeholder="Audits project structure and produces standardized AI context."
                className="gp-input w-full resize-none px-3 py-2.5 text-sm"
              />
            </Field>
            <Field label="Trigger phrases" hint="Natural-language prompts that should activate this skill.">
              <TagInput
                value={form.triggerPhrases}
                onChange={(v) => set('triggerPhrases', v)}
                placeholder="Type a phrase, press Enter"
                testid="builder-triggers"
              />
            </Field>
          </div>
        )
      case 'metadata':
        return (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tier">
                <Selectish value={form.tier} onChange={(v) => set('tier', v)} options={TIERS} testid="builder-tier" />
              </Field>
              <Field label="Status">
                <Selectish
                  value={form.status}
                  onChange={(v) => set('status', v)}
                  options={isT4 ? STATUSES.filter((s) => s !== 'active') : STATUSES}
                  testid="builder-status"
                />
              </Field>
            </div>
            <Field label="Trust tier" hint={TRUST_LABEL[form.trustTier]}>
              <div className="grid grid-cols-4 gap-2">
                {TRUST_TIERS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    data-testid={`builder-trust-${t}`}
                    onClick={() => set('trustTier', t)}
                    className={cn(
                      'rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors',
                      form.trustTier === t
                        ? t === 'T4'
                          ? 'border-rose-500/50 bg-rose-500/15 text-rose-200'
                           : 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200'
                        : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-slate-200',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>
            {isT4 ? (
              <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/[0.07] p-3.5">
                <ShieldAlert size={18} className="mt-0.5 shrink-0 text-rose-300" />
                <p className="text-xs leading-relaxed text-rose-200/90">
                  <strong>T4 privileged / high-risk skill.</strong> It cannot be activated
                  directly — it will default to <em>draft</em> or <em>quarantined</em> and requires
                  human approval before activation.
                </p>
              </div>
            ) : null}
          </div>
        )
      case 'tools':
        return (
          <div className="space-y-5">
            <Field label="Required provider role" hint="Which routed model role this skill needs.">
              <Selectish
                value={form.requiredProviderRole}
                onChange={(v) => set('requiredProviderRole', v)}
                options={PROVIDER_ROLES}
                testid="builder-role"
              />
            </Field>
            <Field label="Required MCP servers">
              <ChipSelect
                options={MCP_OPTIONS}
                value={form.requiredMcps}
                onChange={(v) => set('requiredMcps', v)}
                tone="cyan"
              />
            </Field>
            <Field label="Allowed tools" hint="Concrete tool calls this skill is permitted to use.">
              <TagInput
                value={form.allowedTools}
                onChange={(v) => set('allowedTools', v)}
                placeholder="read_file, write_file, run_eval…"
                testid="builder-tools"
              />
            </Field>
            <Field label="Side effects" hint="Declare any writes / network / mutations for governance.">
              <TagInput
                value={form.sideEffects}
                onChange={(v) => set('sideEffects', v)}
                placeholder="writes_files, network_egress…"
                testid="builder-sideeffects"
              />
            </Field>
          </div>
        )
      case 'instructions':
        return (
          <div className="space-y-5">
            <Field label="Instructions (SKILL.md body)" hint="The operating guide the runtime injects when this skill activates.">
              <textarea
                data-testid="builder-instructions"
                value={form.instructions}
                onChange={(e) => set('instructions', e.target.value)}
                rows={12}
                placeholder={'## Goal\nDescribe the deterministic steps the agent should follow…\n\n## Safety\nHonor the configured trust tier and execution policy.'}
                className="gp-input w-full resize-none px-3 py-3 font-mono text-[13px] leading-relaxed"
              />
            </Field>
            <Field label="References / assets / scripts" hint="Files bundled with the package.">
              <TagInput
                value={form.references}
                onChange={(v) => set('references', v)}
                placeholder="scripts/audit.py, assets/template.md…"
                testid="builder-references"
              />
            </Field>
          </div>
        )
      case 'governance':
        return (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2.5">
              <Button onClick={runDedupe} disabled={busy === 'dedupe'} icon={CopyCheck} testid="builder-dedupe-btn">
                Run Deduplication Check
              </Button>
              <Button onClick={runGovernance} disabled={busy === 'gov'} icon={ShieldCheck} testid="builder-governance-btn">
                Run Governance Check
              </Button>
            </div>
            {dedupe !== null ? (
              <Card className="p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Deduplication
                </p>
                {dedupe.length === 0 ? (
                  <p className="text-sm text-emerald-300">No near-duplicates — safe to create.</p>
                ) : (
                  <div className="space-y-1.5">
                    {dedupe.map((m) => (
                      <div key={m.name} className="flex items-center justify-between text-sm">
                        <span className="font-mono text-slate-300">{m.name}</span>
                        <span className="text-amber-300">{Math.round(m.score * 100)}% similar</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ) : null}
            <Card className="p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Trust policy
              </p>
              <p className="text-sm text-slate-300">
                {form.trustTier} — {TRUST_LABEL[form.trustTier]}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {isT4
                  ? 'Requires human approval. Will be saved as quarantined.'
                  : 'Within auto-review policy for this registry.'}
              </p>
            </Card>
          </div>
        )
      case 'preview':
        return (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
              <span className="font-mono text-xs text-slate-400">SKILL.md</span>
              <CopyButton value={skillMd} />
            </div>
            <pre className="max-h-[460px] overflow-auto p-4 font-mono text-[12.5px] leading-relaxed text-slate-300">
              {skillMd}
            </pre>
          </Card>
        )
      case 'save':
        return (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2.5">
              <Button onClick={runValidate} disabled={busy === 'validate'} icon={Check} testid="builder-validate-btn">
                Validate
              </Button>
              <Button variant="ghost" onClick={() => saveDraft(false)} disabled={busy === 'draft'} icon={Save} testid="builder-savedraft-btn">
                Save Draft
              </Button>
              <Button variant="ghost" onClick={() => saveDraft(true)} disabled={busy === 'quarantine'} testid="builder-quarantine-btn">
                Save to Quarantine
              </Button>
            </div>
            <ChecksPanel checks={checks.checks} overall={checks.overall} />
            <div className="flex flex-wrap items-center gap-2.5 border-t border-white/[0.06] pt-5">
              <Button
                variant="primary"
                size="lg"
                onClick={create}
                disabled={busy === 'create' || !form.name || !form.description}
                icon={Rocket}
                testid="builder-create-btn"
              >
                Create Skill
              </Button>
              <Button variant="ghost" size="lg" onClick={reset} testid="builder-cancel-btn">
                Cancel
              </Button>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const PreviewPanel = () => (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-cyan-300" />
            <span className="font-mono text-xs text-slate-400">SKILL.md preview</span>
          </div>
          <CopyButton value={skillMd} />
        </div>
        <pre className="max-h-[360px] overflow-auto p-4 font-mono text-[12px] leading-relaxed text-slate-300">
          {skillMd}
        </pre>
      </Card>
      <Card className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-300" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Checks
          </span>
        </div>
        <ChecksPanel checks={checks.checks} overall={checks.overall} />
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {form.name ? <span className="font-mono text-sm text-slate-300">{slugify(form.name)}</span> : <span className="text-sm text-slate-500">new skill</span>}
          <TierBadge tier={form.tier} />
          <TrustTierBadge trust={form.trustTier} />
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={PanelRightOpen}
          onClick={() => setShowPreview(true)}
          className="xl:hidden"
          testid="builder-open-preview"
        >
          Preview
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[210px_minmax(0,1fr)_380px]">
        {/* Stepper */}
        <div className="xl:sticky xl:top-20 xl:self-start">
          <div className="flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible xl:pb-0">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const active = i === step
              const done = i < step
              return (
                <button
                  key={s.id}
                  data-testid={`step-${s.id}`}
                  onClick={() => setStep(i)}
                  className={cn(
                    'flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[13px] font-medium transition-colors xl:w-full',
                    active
                      ? 'border-cyan-500/30 bg-cyan-500/10 text-white'
                      : done
                        ? 'border-white/[0.06] bg-white/[0.02] text-slate-300'
                        : 'border-white/[0.06] bg-transparent text-slate-500 hover:text-slate-300',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-lg text-[11px]',
                      active ? 'bg-cyan-500 text-ink-950' : done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/[0.05] text-slate-500',
                    )}
                  >
                    {done ? <Check size={13} /> : <Icon size={13} />}
                  </span>
                  <span className="whitespace-nowrap">{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Form */}
        <Card className="p-5 sm:p-6">
          <div className="mb-5 border-b border-white/[0.06] pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-400/80">
              Step {step + 1} of {STEPS.length}
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">{STEPS[step].label}</h2>
          </div>
          <StepBody />
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
            <Button variant="ghost" icon={ChevronLeft} onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={!canPrev} testid="builder-prev">
              Back
            </Button>
            {canNext ? (
              <Button variant="primary" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} testid="builder-next">
                Next <ChevronRight size={15} />
              </Button>
            ) : (
              <Button variant="primary" onClick={create} disabled={busy === 'create' || !form.name || !form.description} icon={Rocket} testid="builder-create-footer">
                Create Skill
              </Button>
            )}
          </div>
        </Card>

        {/* Live preview (desktop) */}
        <div className="hidden xl:block">
          <div className="sticky top-20">
            <PreviewPanel />
          </div>
        </div>
      </div>

      {/* Mobile / tablet preview drawer */}
      <Drawer
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title={<span className="text-sm font-semibold text-white">Live preview & checks</span>}
      >
        <PreviewPanel />
      </Drawer>
    </div>
  )
}
