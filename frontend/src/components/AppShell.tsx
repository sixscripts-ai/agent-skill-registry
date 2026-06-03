import { useEffect, useState, type ReactNode } from 'react'
import { Link, useRouterState, useNavigate } from '@tanstack/react-router'
import {
  Menu,
  X,
  Hexagon,
  Stethoscope,
  RefreshCw,
  FlaskConical,
  ShieldCheck,
  TerminalSquare,
  RotateCw,
  Zap,
  ChevronDown,
  BookOpen,
} from 'lucide-react'
import { NAV, BOTTOM_NAV, cn } from '~/lib/meta'
import { api } from '~/lib/api'
import { useToast } from '~/components/ui'
import { LibrarianPanel } from '~/components/LibrarianPanel'

function useActivePath() {
  const s = useRouterState()
  return s.location.pathname
}

function isActive(pathname: string, to: string) {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(to + '/')
}

/* ------------------------------------------------------------ QuickActions */
function useQuickActions() {
  const toast = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)

  const wrap = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    try {
      await fn()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Action failed', 'rose')
    } finally {
      setBusy(null)
    }
  }

  const actions = [
    {
      key: 'doctor',
      label: 'Run Diagnostics',
      icon: Stethoscope,
      run: () =>
        wrap('doctor', async () => {
          await api.doctor()
          toast('Diagnostics complete — systems nominal')
        }),
    },
    {
      key: 'sync',
      label: 'Sync All',
      icon: RefreshCw,
      run: () =>
        wrap('sync', async () => {
          await api.sync('all')
          toast('All adapters synced')
        }),
    },
    {
      key: 'eval',
      label: 'Run Eval',
      icon: FlaskConical,
      run: () =>
        wrap('eval', async () => {
          await api.eval()
          toast('Eval harness finished')
          navigate({ to: '/evals' })
        }),
    },
    {
      key: 'audit',
      label: 'Safe Audit',
      icon: ShieldCheck,
      run: () =>
        wrap('audit', async () => {
          await api.runPrompt('Run a safe system audit.')
          toast('Safe audit complete')
          navigate({ to: '/history' })
        }),
    },
    {
      key: 'console',
      label: 'Open Console',
      icon: TerminalSquare,
      run: () =>             navigate({ to: '/console', search: { stage: undefined } as any }),
    },
    {
      key: 'refresh',
      label: 'Refresh Registry',
      icon: RotateCw,
      run: () => window.location.reload(),
    },
  ]

  return { actions, busy }
}

// QuickActionsBar removed — actions live in the dropdown only to reduce topbar clutter

function QuickActionsMenu() {
  const { actions, busy } = useQuickActions()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])
  return (
    <div className="relative">
      <button
        data-testid="quick-actions-menu"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[13px] font-medium text-slate-200"
      >
        <Zap size={15} className="text-cyan-300" />
        <span className="hidden sm:inline">Actions</span>
        <ChevronDown size={14} className="text-slate-500" />
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-white/10 bg-ink-800 py-1 shadow-2xl shadow-black/50 gp-fade-in">
          {actions.map((a) => (
            <button
              key={a.key}
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                a.run()
              }}
              disabled={busy === a.key}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-slate-200 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
            >
              <a.icon size={15} className="text-slate-400" />
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------- Brand */
function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/20">
        <Hexagon size={17} fill="currentColor" className="opacity-90" />
      </span>
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span className="text-[13px] font-bold tracking-tight text-white">
            Universal AI Skill Lab
          </span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
            v2 · prod
          </span>
        </span>
      ) : null}
    </Link>
  )
}

/* ----------------------------------------------------------- NavSections */
function NavSections({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useActivePath()
  return (
    <nav className="flex flex-col gap-5">
      {NAV.map((group) => (
        <div key={group.group}>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            {group.group}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.to)
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  data-testid={`nav-${item.short.toLowerCase()}`}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                     active
                      ? 'bg-white/[0.07] text-white'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200',
                   )}
                >
                  {active ? (
                    <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-cyan-400" />
                  ) : null}
                  <Icon
                    size={16}
                    className={active ? 'text-cyan-300' : 'text-slate-500 group-hover:text-slate-300'}
                  />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

function HealthFooter() {
  const [online, setOnline] = useState<boolean | null>(null)
  const [mode, setMode] = useState<string>('deployed-demo')
  useEffect(() => {
    api
      .health()
      .then((h) => {
        setOnline(Boolean(h?.ok))
        setMode(h?.runtimeMode ?? 'deployed-demo')
      })
      .catch(() => setOnline(false))
  }, [])
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            online === null
              ? 'bg-slate-500'
              : online
                ? 'bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/60'
                : 'bg-rose-400',
          )}
        />
        <span className="text-xs font-medium text-slate-300">
          {online === null ? 'Connecting…' : online ? 'Registry connected' : 'Backend offline'}
        </span>
      </div>
      <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-600">
        {mode === 'deployed-demo' ? 'Demo Mode · simulated runtime' : mode}
      </p>
    </div>
  )
}

/* -------------------------------------------------------- DynamicBreadcrumb */
const ROUTE_LABELS: Record<string, string> = {
  '/': 'dashboard',
  '/skills': 'skills',
  '/builder': 'builder',
  '/console': 'console',
  '/sync': 'sync',
  '/history': 'history',
  '/providers': 'providers',
  '/mcp': 'mcp',
  '/governance': 'governance',
  '/evals': 'evals',
  '/logs': 'logs',
  '/settings': 'settings',
}

function DynamicBreadcrumb({ pathname }: { pathname: string }) {
  const segment = Object.entries(ROUTE_LABELS).find(
    ([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/')
  )
  const label = (segment?.[1] ?? pathname.replace('/', '')) || 'dashboard'
  return (
    <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600">
      <span>~/ai-skills</span>
      {label !== 'dashboard' && (
        <>
          <span className="text-slate-700">/</span>
          <span className="text-slate-400">{label}</span>
        </>
      )}
    </div>
  )
}

/* --------------------------------------------------------------- AppShell */
export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [librarianOpen, setLibrarianOpen] = useState(false)
  const pathname = useActivePath()

  // close mobile drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Global '?' shortcut to toggle Librarian
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
      if (e.key === '?') {
        e.preventDefault()
        setLibrarianOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="min-h-screen bg-ink-950 text-slate-200">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-ink-925 lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-5">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <NavSections />
        </div>
        <div className="shrink-0 p-3">
          <HealthFooter />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-black/50 px-3 backdrop-blur-xl lg:hidden">
        <button
          data-testid="mobile-menu-btn"
          onClick={() => setDrawerOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-200"
        >
          <Menu size={18} />
        </button>
        <Brand compact />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLibrarianOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
            data-testid="summon-librarian-mobile"
            title="Librarian"
          >
            <BookOpen size={16} />
          </button>
          <QuickActionsMenu />
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm gp-fade-in"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col border-r border-white/10 bg-ink-925"
            style={{ animation: 'gpRise 0.25s ease both' }}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
              <Brand compact />
              <button
                data-testid="drawer-close-mobile"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <NavSections onNavigate={() => setDrawerOpen(false)} />
            </div>
            <div className="shrink-0 p-3">
              <HealthFooter />
            </div>
          </div>
        </div>
      ) : null}

      {/* Main */}
      <div className="lg:pl-64">
        {/* Desktop topbar — breadcrumb left, actions + Librarian right */}
        <div className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-white/10 bg-black/50 px-6 backdrop-blur-xl lg:flex">
          <DynamicBreadcrumb pathname={pathname} />
          <div className="flex items-center gap-2">
            <QuickActionsMenu />

            {/* Summon Librarian */}
            <button
              onClick={() => setLibrarianOpen((o) => !o)}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 text-[13px] font-medium text-cyan-300 transition-colors hover:bg-cyan-500/20 hover:text-cyan-200"
              data-testid="summon-librarian"
              title="Summon Librarian (press ? anywhere)"
            >
              <BookOpen size={15} />
              <span className="hidden sm:inline">Librarian</span>
              <kbd className="ml-0.5 hidden rounded border border-cyan-500/30 bg-cyan-500/10 px-1 py-0.5 text-[9px] font-mono text-cyan-500 sm:inline">?</kbd>
            </button>
          </div>
        </div>

        <main className="mx-auto max-w-[1500px] px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-white/[0.08] bg-ink-925/95 backdrop-blur-md lg:hidden">
        {BOTTOM_NAV.map((item) => {
          const active = isActive(pathname, item.to)
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              data-testid={`bottomnav-${item.short.toLowerCase()}`}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                active ? 'text-cyan-300' : 'text-slate-500',
              )}
            >
              <Icon size={19} />
              {item.short}
            </Link>
          )
        })}
      </nav>

      {/* Librarian Panel — Ideas #1 + #5 (contextual + registry-backed) */}
      <LibrarianPanel open={librarianOpen} onClose={() => setLibrarianOpen(false)} />
    </div>
  )
}
