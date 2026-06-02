import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Settings as SettingsIcon, FolderTree, Server, Cpu, Boxes, SlidersHorizontal, AlertTriangle } from 'lucide-react'
import { api } from '~/lib/api'
import { useApi } from '~/lib/useApi'
import {
  PageHeader,
  SectionCard,
  Button,
  Badge,
  ConfirmDialog,
  useToast,
} from '~/components/ui'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const toast = useToast()
  const settings = useApi(api.settings)
  const runtime = useApi(api.runtime)
  const providers = useApi(api.providers)
  const mcp = useApi(api.mcp)

  const [root, setRoot] = useState('~/ai-skills')
  const [interaction, setInteraction] = useState<any>({})
  const [confirm, setConfirm] = useState<null | { key: string; title: string; body: string; fn: () => Promise<unknown> }>(null)

  useEffect(() => {
    if (settings.data) {
      setRoot(settings.data.registry?.registryRoot ?? '~/ai-skills')
      setInteraction(settings.data.interaction ?? {})
    }
  }, [settings.data])

  const saveRoot = async () => {
    await api.saveSettings({ registry: { registryRoot: root } })
    toast('Registry root saved')
  }
  const toggleInteraction = async (key: string) => {
    const next = { ...interaction, [key]: !interaction[key] }
    setInteraction(next)
    await api.saveSettings({ interaction: { [key]: next[key] } })
    toast('Preference saved')
  }

  const danger = [
    { key: 'adapters', title: 'Reset generated adapters', body: 'This clears all generated adapter files and sync status.', fn: () => api.resetAdapters() },
    { key: 'logs', title: 'Clear logs', body: 'This permanently deletes all logs and run history.', fn: () => api.clearLogs() },
    { key: 'reports', title: 'Clear eval reports', body: 'This permanently deletes all stored eval reports.', fn: () => api.clearReports() },
  ]

  return (
    <div className="space-y-6 gp-fade-in">
      <PageHeader
        icon={SettingsIcon}
        eyebrow="System"
        title="Settings"
        description="Local cockpit configuration. Source of truth is the registry / runtime config; UI preferences are persisted per session."
      />

      <SectionCard title="Registry Root" subtitle="Where the universal registry lives" icon={FolderTree}>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <input
            data-testid="settings-root"
            value={root}
            onChange={(e) => setRoot(e.target.value)}
            className="gp-input flex-1 px-3 py-2.5 font-mono text-sm"
          />
          <Button variant="primary" onClick={saveRoot} testid="settings-save-root">Save</Button>
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Runtime Config" subtitle="runtime.yaml (read-only)" icon={Server}>
          <KV label="Mode" value={runtime.data?.mode} />
          <KV label="Active host" value={runtime.data?.activeHost} />
          <KV label="Hosts enabled" value={String(Object.values(runtime.data?.hosts ?? {}).filter((h: any) => h.enabled).length)} />
        </SectionCard>

        <SectionCard title="Provider Config" subtitle="providers.yaml (read-only)" icon={Cpu}>
          <KV label="Default provider" value={providers.data?.defaultProvider} />
          <KV label="Providers enabled" value={String(Object.values(providers.data?.providers ?? {}).filter((p: any) => p.enabled).length)} />
          <KV label="Roles routed" value={String(Object.keys(providers.data?.roles ?? {}).length)} />
        </SectionCard>

        <SectionCard title="MCP Config" subtitle="mcp.yaml (read-only)" icon={Boxes}>
          <KV label="Servers" value={String(Object.keys(mcp.data?.servers ?? {}).length)} />
          <KV label="Enabled" value={String(Object.values(mcp.data?.servers ?? {}).filter((m: any) => m.enabled).length)} />
        </SectionCard>

        <SectionCard title="Interaction Layer" subtitle="UI preferences" icon={SlidersHorizontal}>
          <Toggle label="Auto-save builder drafts" on={interaction.autoSaveDrafts} onClick={() => toggleInteraction('autoSaveDrafts')} />
          <Toggle label="Telemetry" on={interaction.telemetry} onClick={() => toggleInteraction('telemetry')} />
          <div className="flex items-center justify-between py-2.5">
            <span className="text-[13px] text-slate-300">Runtime mode</span>
            <Badge tone="amber" dot>{interaction.runtimeMode ?? 'deployed-demo'}</Badge>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Danger Zone" subtitle="Destructive actions require confirmation" icon={AlertTriangle}>
        <div className="space-y-2.5">
          {danger.map((d) => (
            <div key={d.key} className="flex flex-col gap-2 rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[13px] font-medium text-rose-100">{d.title}</p>
                <p className="text-xs text-rose-300/60">{d.body}</p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirm(d)}
                testid={`danger-${d.key}`}
              >
                {d.title.split(' ')[0]}
              </Button>
            </div>
          ))}
        </div>
      </SectionCard>

      <ConfirmDialog
        open={!!confirm}
        danger
        title={confirm?.title ?? ''}
        body={confirm?.body}
        confirmLabel="Yes, proceed"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (confirm) {
            await confirm.fn()
            toast(`${confirm.title} — done`)
          }
          setConfirm(null)
        }}
      />
    </div>
  )
}

function KV({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.05] py-2.5 last:border-0">
      <span className="text-[13px] text-slate-500">{label}</span>
      <span className="font-mono text-[13px] text-slate-200">{value ?? '—'}</span>
    </div>
  )
}

function Toggle({ label, on, onClick }: { label: string; on?: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.05] py-2.5 last:border-0">
      <span className="text-[13px] text-slate-300">{label}</span>
      <button
        onClick={onClick}
        className={`relative h-5 w-9 rounded-full transition-colors ${on ? 'bg-sky-500' : 'bg-white/10'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </div>
  )
}
