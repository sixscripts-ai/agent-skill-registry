import {
  LayoutDashboard,
  Library,
  Wand2,
  TerminalSquare,
  RefreshCw,
  History,
  Cpu,
  Boxes,
  ShieldCheck,
  FlaskConical,
  ScrollText,
  Settings,
  Workflow,
  Store,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = { to: string; label: string; icon: LucideIcon; short: string }
export type NavGroup = { group: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  {
    group: 'Main',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, short: 'Dashboard' },
      { to: '/skills', label: 'Skill Registry', icon: Library, short: 'Registry' },
      { to: '/marketplace', label: 'Marketplace', icon: Store, short: 'Marketplace' },
      { to: '/builder', label: 'Skill Builder', icon: Wand2, short: 'Builder' },
      { to: '/orchestrator', label: 'Orchestrator', icon: Workflow, short: 'Orchestrator' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { to: '/console', label: 'Console', icon: TerminalSquare, short: 'Console' },
      { to: '/sync', label: 'Sync & Adapters', icon: RefreshCw, short: 'Sync' },
      { to: '/history', label: 'Run History', icon: History, short: 'History' },
    ],
  },
  {
    group: 'Infrastructure',
    items: [
      { to: '/providers', label: 'Providers', icon: Cpu, short: 'Providers' },
      { to: '/mcp', label: 'MCP Servers', icon: Boxes, short: 'MCP' },
      { to: '/governance', label: 'Governance', icon: ShieldCheck, short: 'Governance' },
    ],
  },
  {
    group: 'Quality',
    items: [
      { to: '/evals', label: 'Eval Reports', icon: FlaskConical, short: 'Evals' },
      { to: '/logs', label: 'Logs', icon: ScrollText, short: 'Logs' },
    ],
  },
  {
    group: 'System',
    items: [{ to: '/settings', label: 'Settings', icon: Settings, short: 'Settings' }],
  },
]

export const BOTTOM_NAV: NavItem[] = [
  NAV[0].items[0],
  NAV[0].items[1],
  NAV[0].items[2],
  NAV[1].items[0],
]

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export type Tone =
  | 'slate'
  | 'sky'
  | 'blue'
  | 'cyan'
  | 'violet'
  | 'emerald'
  | 'amber'
  | 'rose'

export const TONE: Record<Tone, string> = {
  slate: 'border-slate-500/25 bg-slate-500/10 text-slate-300',
  sky: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400',
  blue: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  violet: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  rose: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
}

export const TIER_TONE: Record<string, Tone> = {
  planning: 'sky',
  functional: 'blue',
  atomic: 'cyan',
  governance: 'violet',
  acquisition: 'amber',
  evaluation: 'emerald',
}

export const TRUST_TONE: Record<string, Tone> = {
  T1: 'emerald',
  T2: 'sky',
  T3: 'amber',
  T4: 'rose',
}

export const TRUST_LABEL: Record<string, string> = {
  T1: 'safe / read-only',
  T2: 'normal write / config',
  T3: 'network / acquisition',
  T4: 'privileged / high-risk',
}

export const STATUS_TONE: Record<string, Tone> = {
  active: 'emerald',
  draft: 'slate',
  quarantined: 'amber',
  'sandbox-tested': 'cyan',
  'critic-reviewed': 'violet',
  'human-approved': 'emerald',
  deprecated: 'slate',
  rejected: 'rose',
}

export const CHECK_TONE: Record<string, Tone> = {
  pass: 'emerald',
  warn: 'amber',
  warning: 'amber',
  blocked: 'rose',
  pending: 'slate',
  fail: 'rose',
}

export const TIERS = [
  'planning',
  'functional',
  'atomic',
  'governance',
  'acquisition',
  'evaluation',
]
export const TRUST_TIERS = ['T1', 'T2', 'T3', 'T4']
export const STATUSES = [
  'active',
  'draft',
  'quarantined',
  'sandbox-tested',
  'critic-reviewed',
  'human-approved',
  'deprecated',
  'rejected',
]
export const PROVIDER_ROLES = ['planner', 'executor', 'critic', 'researcher']
export const MCP_OPTIONS = ['filesystem', 'git', 'github', 'search', 'sqlite', 'browser']

export function relTime(iso?: string | null): string {
  if (!iso) return 'never'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'unknown'
  const diff = Date.now() - then
  const s = Math.round(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* clipboard unavailable */
  }
}
