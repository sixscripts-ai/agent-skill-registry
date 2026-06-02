// Typed API client for the Universal AI Skill Lab backend.
// Uses relative /api paths: in the Emergent preview the ingress routes /api -> :8001,
// and in local dev Vite proxies /api -> 127.0.0.1:8001 (see vite.config.ts).

export type CliResult = {
  ok: boolean
  command: string
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
  timestamp: string
  status?: string
  [key: string]: unknown
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const body = await res.json()
      detail = (body as any).detail || detail
    } catch {
      /* noop */
    }
    throw new Error(detail)
  }
  return (await res.json()) as T
}

const get = <T>(path: string) => req<T>(path)
const post = <T>(path: string, body?: unknown) =>
  req<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
const put = <T>(path: string, body?: unknown) =>
  req<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined })
const del = <T>(path: string) => req<T>(path, { method: 'DELETE' })

export const api = {
  // reads
  health: () => get<any>('/health'),
  registry: () => get<any>('/registry'),
  skills: () => get<any>('/skills'),
  skill: (name: string) => get<any>(`/skills/${encodeURIComponent(name)}`),
  drafts: () => get<any>('/skills/drafts'),
  runtime: () => get<any>('/runtime'),
  providers: () => get<any>('/providers'),
  mcp: () => get<any>('/mcp'),
  adapters: () => get<any>('/adapters'),
  logs: () => get<any>('/logs'),
  latestReport: () => get<any>('/reports/latest'),
  history: () => get<any>('/history'),
  governance: () => get<any>('/governance'),
  settings: () => get<any>('/settings'),

  // mutations / actions (simulated runtime)
  saveSettings: (body: Record<string, unknown>) => put<any>('/settings', body),
  runCli: (command: string) => post<CliResult>('/cli', { command }),
  runPrompt: (prompt: string) => post<CliResult>('/run', { prompt }),
  sync: (target = 'all') => post<CliResult>('/sync', { target }),
  doctor: () => post<CliResult>('/doctor'),
  eval: () => post<CliResult>('/eval'),
  gate: (command: string) => post<CliResult>('/gate', { command }),
  dedupe: (name: string, description: string) =>
    post<CliResult>('/dedupe', { name, description }),

  // builder
  previewSkill: (body: unknown) => post<{ skillMd: string }>('/skills/preview', body),
  validateSkill: (body: unknown) => post<any>('/skills/validate', body),
  createSkill: (body: unknown) => post<any>('/skills/create', body),
  saveDraft: (body: unknown) => post<any>('/skills/draft', body),
  deleteDraft: (id: string) => del<any>(`/skills/draft/${id}`),

  // history / danger
  deleteRun: (id: string) => del<any>(`/history/${id}`),
  resetAdapters: () => post<any>('/danger/reset-adapters'),
  clearLogs: () => post<any>('/danger/clear-logs'),
  clearReports: () => post<any>('/danger/clear-reports'),

  // Librarian explainer (#1 + #4 + #5)
  librarianExplain: (payload: { question: string; route: string; context?: any }) =>
    post<any>('/librarian/explain', payload),
}
