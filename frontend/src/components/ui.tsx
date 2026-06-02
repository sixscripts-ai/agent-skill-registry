import {
  useEffect,
  useState,
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from 'react'
import {
  Check,
  AlertTriangle,
  XCircle,
  Circle,
  Copy,
  CheckCheck,
  Loader2,
  Inbox,
  X,
  MoreHorizontal,
  Info,
  type LucideIcon,
} from 'lucide-react'
import {
  cn,
  TONE,
  TIER_TONE,
  TRUST_TONE,
  STATUS_TONE,
  CHECK_TONE,
  copyText,
  type Tone,
} from '~/lib/meta'

/* ----------------------------------------------------------------- Button */
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
export function Button({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  disabled,
  type = 'button',
  className = '',
  icon: Icon,
  testid,
}: {
  children?: ReactNode
  onClick?: () => void
  variant?: BtnVariant
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
  icon?: LucideIcon
  testid?: string
}) {
  const variants: Record<BtnVariant, string> = {
    primary:
      'bg-cyan-500 text-ink-950 hover:bg-cyan-400 border border-cyan-400 font-semibold shadow-[0_1px_0_rgba(255,255,255,0.15)_inset]',
    secondary:
      'bg-white/[0.04] text-slate-200 border border-white/10 hover:bg-white/[0.08] hover:border-white/20',
    ghost: 'text-slate-300 hover:bg-white/[0.06] border border-transparent',
    danger: 'bg-rose-500/15 text-rose-200 border border-rose-500/40 hover:bg-rose-500/25',
    subtle: 'bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:text-slate-200',
  }
  const sizes = {
    sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
    md: 'h-9 px-3.5 text-[13px] rounded-lg gap-2',
    lg: 'h-11 px-5 text-sm rounded-xl gap-2',
  }
  return (
    <button
      type={type}
      data-testid={testid}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none gp-focus-ring',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {Icon ? <Icon size={size === 'lg' ? 17 : 15} /> : null}
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ Badge */
export function Badge({
  children,
  tone = 'slate',
  className = '',
  dot,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-5',
        TONE[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" /> : null}
      {children}
    </span>
  )
}

export const TierBadge = ({ tier }: { tier: string }) => (
  <Badge tone={TIER_TONE[tier] ?? 'slate'}>{tier}</Badge>
)
export const TrustTierBadge = ({ trust }: { trust: string }) => (
  <Badge tone={TRUST_TONE[trust] ?? 'slate'}>{trust}</Badge>
)
export const StatusBadge = ({ status }: { status: string }) => (
  <Badge tone={STATUS_TONE[status] ?? 'slate'} dot>
    {status}
  </Badge>
)
export const ProviderBadge = ({ name }: { name: string }) => (
  <Badge tone="violet">{name}</Badge>
)
export const McpBadge = ({ name }: { name: string }) => <Badge tone="cyan">{name}</Badge>
export const AdapterBadge = ({ enabled }: { enabled: boolean }) => (
  <Badge tone={enabled ? 'emerald' : 'slate'} dot>
    {enabled ? 'enabled' : 'disabled'}
  </Badge>
)

/* ------------------------------------------------------------- PageHeader */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  icon: Icon,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  icon?: LucideIcon
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3.5">
        {Icon ? (
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-cyan-300 sm:flex">
            <Icon size={20} />
          </div>
        ) : null}
        <div>
          {eyebrow ? (
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ Cards */
export function Card({
  children,
  className = '',
  as = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'article' | 'section'
}) {
  const Comp = as as 'div'
  return <Comp className={cn('gp-panel', className)}>{children}</Comp>
}

export function SectionCard({
  title,
  subtitle,
  actions,
  children,
  className = '',
  icon: Icon,
  accent,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  icon?: LucideIcon
  accent?: Tone
}) {
  return (
    <section className={cn('gp-panel overflow-hidden', className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          {Icon ? (
            <span className={cn('text-slate-400', accent && `text-${accent}-400`)}>
              <Icon size={16} />
            </span>
          ) : null}
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function MetricCard({
  label,
  value,
  sub,
  tone = 'slate',
  icon: Icon,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: Tone
  icon?: LucideIcon
}) {
  return (
    <div className="gp-panel gp-rise p-4 transition-colors hover:border-white/15">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg border',
              TONE[tone],
            )}
          >
            <Icon size={14} />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-white">{value}</p>
      {sub ? <div className="mt-1.5 text-xs text-slate-500">{sub}</div> : null}
    </div>
  )
}

/* ------------------------------------------------------- State components */
export function EmptyState({
  title,
  body,
  actions,
  icon: Icon = Inbox,
}: {
  title: string
  body?: string
  actions?: ReactNode
  icon?: LucideIcon
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-500">
        <Icon size={22} />
      </div>
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      {body ? <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">{body}</p> : null}
      {actions ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-10 text-sm text-slate-400">
      <Loader2 size={16} className="animate-spin text-cyan-400" />
      {label}
    </div>
  )
}

export function ErrorState({
  label = 'Something went wrong',
  detail,
  onRetry,
}: {
  label?: string
  detail?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-6 py-10 text-center">
      <XCircle size={22} className="mb-3 text-rose-400" />
      <p className="text-sm font-semibold text-rose-200">{label}</p>
      {detail ? <p className="mt-1.5 max-w-md text-xs text-rose-300/70">{detail}</p> : null}
      {onRetry ? (
        <Button className="mt-4" onClick={onRetry} testid="error-retry-btn">
          Retry
        </Button>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------- CopyButton */
export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      data-testid="copy-btn"
      onClick={async () => {
        await copyText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1400)
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-slate-400 transition-colors hover:text-slate-100"
    >
      {copied ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {label ?? (copied ? 'Copied' : 'Copy')}
    </button>
  )
}

export function MonoPath({ value, className = '' }: { value: string; className?: string }) {
  return (
    <span
      title={value}
      className={cn(
        'truncate font-mono text-xs text-slate-400',
        className,
      )}
    >
      {value}
    </span>
  )
}

/* -------------------------------------------------------------- CheckRow */
export function CheckRow({
  label,
  detail,
  status,
}: {
  label: string
  detail?: string
  status: string
}) {
  const map: Record<string, { icon: LucideIcon; cls: string }> = {
    pass: { icon: Check, cls: 'text-emerald-400' },
    warn: { icon: AlertTriangle, cls: 'text-amber-400' },
    warning: { icon: AlertTriangle, cls: 'text-amber-400' },
    blocked: { icon: XCircle, cls: 'text-rose-400' },
    fail: { icon: XCircle, cls: 'text-rose-400' },
    pending: { icon: Circle, cls: 'text-slate-500' },
  }
  const { icon: Icon, cls } = map[status] ?? map.pending
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon size={15} className={cn('mt-0.5 shrink-0', cls)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium text-slate-200">{label}</span>
          <Badge tone={CHECK_TONE[status] ?? 'slate'}>{status}</Badge>
        </div>
        {detail ? <p className="mt-0.5 text-xs text-slate-500">{detail}</p> : null}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- TerminalPanel */
export function TerminalPanel({
  text,
  empty = 'Awaiting output…',
  className = '',
}: {
  text: string
  empty?: string
  className?: string
}) {
  const lines = (text || '').split('\n')
  return (
    <div
      className={cn(
        'gp-inset max-h-[420px] overflow-auto p-4 font-mono text-[12.5px] leading-relaxed',
        className,
      )}
    >
      {!text ? (
        <p className="italic text-slate-600">{empty}</p>
      ) : (
        lines.map((line, i) => {
          const isCmd = /^(\$|aiskill |#)/.test(line.trim())
          const isErr = /error|failed|blocked|✗/i.test(line)
          const isOk = /pass|✔|complete|nominal|ok\b/i.test(line)
          return (
            <div
              key={i}
              className={cn(
                'whitespace-pre-wrap break-words',
                isCmd
                  ? 'font-semibold text-cyan-300'
                  : isErr
                    ? 'text-rose-300'
                    : isOk
                      ? 'text-emerald-300/90'
                      : 'text-slate-300/85',
              )}
            >
              {line || '\u00A0'}
            </div>
          )
        })
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ Tabs */
export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string; icon?: LucideIcon }[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
      {tabs.map((t) => {
        const active = t.id === value
        const Icon = t.icon
        return (
          <button
            key={t.id}
            data-testid={`tab-${t.id}`}
            onClick={() => onChange(t.id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors',
              active
                ? 'bg-white/[0.08] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200',
            )}
          >
            {Icon ? <Icon size={14} /> : null}
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------- ActionDropdown */
export function ActionDropdown({
  items,
  label,
}: {
  items: { label: string; onClick: () => void; tone?: 'default' | 'danger' }[]
  label?: string
}) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])
  return (
    <div className="relative">
      <Button
        size="sm"
        variant="secondary"
        testid="action-dropdown-trigger"
        onClick={() => setOpen((o) => !o)}
      >
        {label ?? <MoreHorizontal size={15} />}
      </Button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1.5 w-44 overflow-hidden rounded-xl border border-white/10 bg-ink-800 py-1 shadow-2xl shadow-black/50 gp-fade-in">
          {items.map((it) => (
            <button
              key={it.label}
              onClick={it.onClick}
              className={cn(
                'block w-full px-3.5 py-2 text-left text-[13px] transition-colors hover:bg-white/[0.06]',
                it.tone === 'danger' ? 'text-rose-300' : 'text-slate-200',
              )}
            >
              {it.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/* ----------------------------------------------------------------- Drawer */
export function Drawer({
  open,
  onClose,
  children,
  title,
  width = 'max-w-xl',
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: ReactNode
  width?: string
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm gp-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative flex h-full w-full flex-col border-l border-white/10 bg-ink-925 shadow-2xl',
          width,
        )}
        style={{ animation: 'gpRise 0.25s ease both' }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="min-w-0">{title}</div>
          <button
            data-testid="drawer-close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- ConfirmDialog */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body?: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm gp-fade-in" onClick={onCancel} />
      <div className="relative w-full max-w-md gp-panel gp-rise p-6">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg',
              danger ? 'bg-rose-500/15 text-rose-300' : 'bg-cyan-500/15 text-cyan-300',
            )}
          >
            {danger ? <AlertTriangle size={18} /> : <Info size={18} />}
          </span>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            {body ? <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{body}</p> : null}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} testid="confirm-cancel">
            Cancel
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            testid="confirm-ok"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Toast */
type Toast = { id: number; message: string; tone: Tone }
type ToastFn = {
  (message: string, tone?: Tone): void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const defaultToast: ToastFn = Object.assign(
  (_message: string, _tone?: Tone) => {},
  {
    success: (_message: string) => {},
    error: (_message: string) => {},
    info: (_message: string) => {},
  }
)

const ToastCtx = createContext<ToastFn>(defaultToast)
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((message: string, tone: Tone = 'sky') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])
  
  const result: ToastFn = Object.assign(
    (message: string, tone: Tone = 'sky') => push(message, tone),
    {
      success: (message: string) => push(message, 'emerald'),
      error: (message: string) => push(message, 'rose'),
      info: (message: string) => push(message, 'sky'),
    }
  )
  
  return (
    <ToastCtx.Provider value={result}>
      {children}
      <div className="pointer-events-none fixed bottom-20 right-4 z-[80] flex flex-col gap-2 sm:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            data-testid="toast"
            className={cn(
              'pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-medium shadow-2xl shadow-black/40 backdrop-blur-md gp-rise',
              TONE[t.tone],
            )}
          >
            <Check size={15} />
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
