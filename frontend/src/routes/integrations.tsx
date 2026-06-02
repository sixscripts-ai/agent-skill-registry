import { createFileRoute } from '@tanstack/react-router'
import { Plug, RotateCcw } from 'lucide-react'
import { api } from '~/lib/api'
import { useApi } from '~/lib/useApi'
import {
  PageHeader,
  Card,
  Button,
  Badge,
  EmptyState,
  useToast,
} from '~/components/ui'

export const Route = createFileRoute('/integrations')({
  component: IntegrationsPage,
})

function IntegrationsPage() {
  const toast = useToast()
  const registryQuery = useApi(api.registry)
  const runtimeQuery = useApi(api.runtime)
  const adaptersQuery = useApi(api.adapters)

  const resetAdapters = async () => {
    try {
      await api.resetAdapters()
      adaptersQuery.refetch()
      toast.success('Adapters reset successfully')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Integrations & Adapters"
          description="Manage connected adapters, registry configurations, and runtime settings."
          icon={Plug}
        />
        <Button variant="danger" onClick={resetAdapters}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Adapters
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4 space-y-4">
          <h3 className="text-lg font-medium text-slate-200 border-b border-slate-700 pb-2">Registry Configuration</h3>
          {registryQuery.loading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : (
            <pre className="text-xs text-slate-400 bg-slate-900 p-3 rounded overflow-auto max-h-60">
              {JSON.stringify(registryQuery.data, null, 2)}
            </pre>
          )}
        </Card>

        <Card className="p-4 space-y-4">
          <h3 className="text-lg font-medium text-slate-200 border-b border-slate-700 pb-2">Runtime Configuration</h3>
          {runtimeQuery.loading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : (
            <pre className="text-xs text-slate-400 bg-slate-900 p-3 rounded overflow-auto max-h-60">
              {JSON.stringify(runtimeQuery.data, null, 2)}
            </pre>
          )}
        </Card>

        <Card className="p-4 space-y-4 md:col-span-2">
          <h3 className="text-lg font-medium text-slate-200 border-b border-slate-700 pb-2">Active Adapters</h3>
          {adaptersQuery.loading ? (
            <p className="text-slate-500 text-sm">Loading adapters...</p>
          ) : (adaptersQuery.data?.adapters ?? []).length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {adaptersQuery.data!.adapters.map((adapter: any, i: number) => (
                <Card key={i} className="p-3 border-slate-700 bg-slate-800">
                   <div className="flex justify-between items-center mb-2">
                     <span className="font-medium text-slate-300">{adapter.name}</span>
                     <Badge tone={adapter.active ? 'emerald' : 'slate'}>
                       {adapter.active ? 'Active' : 'Inactive'}
                     </Badge>
                   </div>
                  <p className="text-xs text-slate-400">{adapter.description || 'No description available.'}</p>
                </Card>
              ))}
            </div>
           ) : (
             <EmptyState title="No Adapters" body="No adapters are currently configured." icon={Plug} />
           )}
        </Card>
      </div>
    </div>
  )
}
