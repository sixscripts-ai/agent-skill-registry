import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { AppShell } from '~/components/AppShell'
import { ToastProvider } from '~/components/ui'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-lg font-semibold text-white">Page not found</p>
      <p className="mt-2 text-sm text-slate-500">This route isn’t part of the cockpit.</p>
    </div>
  ),
})

function RootComponent() {
  return (
    <ToastProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </ToastProvider>
  )
}
