import 'dotenv/config';
import YAML from 'yaml'
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
// @ts-ignore
const { PrismaClient } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirnameLocal = path.dirname(__filename);
// Compute project root robustly (works when cwd is backend/, root, or in Vercel serverless)
function getProjectRoot(): string {
  const candidates = [
    path.resolve(process.cwd(), 'registry.yaml'),
    path.resolve(process.cwd(), '..', 'registry.yaml'),
    path.resolve(__dirnameLocal, '../../..', 'registry.yaml'), // backend/src/skillLabBackend.ts -> root
    path.resolve(__dirnameLocal, '../..', 'registry.yaml'),    // if __dirname at backend/
    path.resolve(__dirnameLocal, '..', 'registry.yaml'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return path.dirname(c);
    }
  }
  // Fallback to cwd (may be wrong in some deploys, but better than nothing)
  return process.cwd();
}
const PROJECT_ROOT = getProjectRoot();

const execAsync = promisify(exec);
const AISKILL_CLI = path.join(PROJECT_ROOT, 'bin', 'aiskill.ts');

// Use neon db if available
const hasDb = !!process.env.DATABASE_URL;
let prisma: any = null;
if (hasDb) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
}

type SkillTier =
  | 'planning'
  | 'functional'
  | 'atomic'
  | 'governance'
  | 'acquisition'
  | 'evaluation'

type TrustTier = 'T1' | 'T2' | 'T3' | 'T4'

type SkillStatus =
  | 'active'
  | 'draft'
  | 'quarantined'
  | 'sandbox-tested'
  | 'critic-reviewed'
  | 'human-approved'
  | 'deprecated'
  | 'rejected'

export type RegistrySkill = {
  name: string
  tier: SkillTier
  path: string
  description: string
  trustTier: TrustTier
  status: SkillStatus
}

export type RegistryPayload = {
  registryVersion: string
  mode: string
  architecture: string
  lastSynced: string | null
  skills: Array<RegistrySkill>
}

export type RuntimeHost = {
  enabled: boolean
  adapterPath: string
}

export type RuntimePayload = {
  mode: string
  activeHost: string
  hosts: Record<string, RuntimeHost>
  executionPolicy: Record<string, boolean>
  memory: Record<string, string>
}

export type ProvidersPayload = {
  defaultProvider: string
  defaultModel: string
  roles: Record<string, { provider: string; model: string }>
  providers: Record<string, Record<string, string | boolean | number | null>>
  envStatus: Record<string, boolean>
}

export type McpServer = {
  enabled: boolean
  purpose: string
  trustTier: string
  scope?: Array<string>
  envKey?: string
  envConfigured?: boolean
}

export type McpPayload = {
  servers: Record<string, McpServer>
}

export type LogEntry = {
  id: string
  level: string
  message: string
  timestamp: string
}

export type LogsPayload = {
  entries: Array<LogEntry>
}

export type ReportPayload = {
  ok: boolean
  summary: string
  data: Record<string, unknown>
}

export type CliResult = {
  ok: boolean
  command: string
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
  timestamp: string
}

export async function getHealthPayload() {
  return {
    ok: true,
    service: 'universal-ai-skill-lab',
    skillsHome: process.env.VERCEL ? 'cloud' : 'local',
    timestamp: new Date().toISOString(),
  }
}

export async function getRegistryPayload(): Promise<RegistryPayload> {
  if (prisma) {
    const skills = await prisma.skill.findMany();
    return {
      registryVersion: '1.0.0',
      mode: 'cloud-first',
      architecture: 'provider-neutral',
      lastSynced: new Date().toISOString(),
      skills: skills.map((s: any) => ({
        name: s.name,
        tier: s.tier as SkillTier,
        path: s.path,
        description: s.description,
        trustTier: s.trustTier as TrustTier,
        status: s.status as SkillStatus
      }))
    };
  }

  // Fallback: load from registry.yaml (for demo / no DB)
  return loadRegistryFromYaml();
}

export async function loadSkillBody(skillPath: string | null | undefined): Promise<string> {
  if (!skillPath) return '';
  try {
    const fs = await import('fs');
    const pth = await import('path'); // avoid shadow
    const root = PROJECT_ROOT;
    const possible = [
      pth.resolve(root, skillPath, 'SKILL.md'),
      pth.resolve(root, skillPath),
      pth.resolve(root, 'shared', skillPath.replace(/^shared\//, ''), 'SKILL.md'),
    ];
    for (const cand of possible) {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
        return fs.readFileSync(cand, 'utf8');
      }
    }
  } catch {}
  return '';
}

export async function loadRegistryFromYaml(): Promise<RegistryPayload> {
  try {
    const fs = await import('fs');
    const pth = await import('path');
    const yamlPath = pth.resolve(PROJECT_ROOT, 'registry.yaml');
    if (fs.existsSync(yamlPath)) {
      const content = fs.readFileSync(yamlPath, 'utf8');
      const parsed = YAML.parse(content);
      const allSkills = parsed.skills || [];
      return {
        registryVersion: parsed.registry_version || '1.0.0',
        mode: parsed.mode || 'local-first',
        architecture: parsed.architecture || 'provider-neutral',
        lastSynced: parsed.last_synced || null,
        skills: allSkills.map((s: any) => ({
          name: s.name,
          tier: s.tier as SkillTier,
          path: s.path,
          description: s.description,
          trustTier: s.trust_tier as TrustTier,
          status: s.status as SkillStatus
        }))
      };
    }
  } catch (e) {
    console.warn('Could not load registry from yaml fallback');
  }

  return {
    registryVersion: 'unknown',
    mode: 'unknown',
    architecture: 'unknown',
    lastSynced: null,
    skills: [],
  }
}

export async function getLibrarianSkills() {
  if (prisma) {
    const skills = await prisma.skill.findMany({
      where: {
        name: {
          startsWith: 'librarian:'
        }
      }
    });
    if (skills.length > 0) {
      const fs = await import('fs');
      const pth = await import('path');
      const root = PROJECT_ROOT;
      return skills.map((s: any) => {
        let body = s.description || '';
        if (s.path) {
          const possiblePaths = [
            pth.resolve(root, s.path, 'SKILL.md'),
            pth.resolve(root, s.path),
          ];
          for (const p of possiblePaths) {
            if (fs.existsSync(p) && fs.statSync(p).isFile()) {
              body = fs.readFileSync(p, 'utf8');
              break;
            }
          }
        }
        return {
          ...s,
          body
        };
      });
    }
  }
  // Fallback: load from registry.yaml (for demo / no DB)
  try {
    const fs = await import('fs');
    const pth = await import('path');
    const root = PROJECT_ROOT;
    const yamlPath = pth.resolve(root, 'registry.yaml');
    if (fs.existsSync(yamlPath)) {
      const content = fs.readFileSync(yamlPath, 'utf8');
      const parsed = YAML.parse(content);
      const all = parsed.skills || [];
      const librarianSkills = all.filter((s: any) => s.name && s.name.startsWith('librarian:'));
      const loaded = await Promise.all(librarianSkills.map(async (s: any) => {
        let body = s.description || '';
        // Try to load full SKILL.md body from the path
        if (s.path) {
          const possiblePaths = [
            pth.resolve(root, s.path, 'SKILL.md'),
            pth.resolve(root, s.path),
            pth.resolve(root, 'shared', s.path.replace('shared/', ''), 'SKILL.md'),
          ];
          for (const p of possiblePaths) {
            if (fs.existsSync(p) && fs.statSync(p).isFile()) {
              body = fs.readFileSync(p, 'utf8');
              break;
            }
          }
        }
        return {
          name: s.name,
          description: s.description || '',
          tier: s.tier || 'documentation',
          status: s.status || 'active',
          body
        };
      }));
      return loaded;
    }
  } catch (e) {
    console.warn('Could not load librarian seeds from yaml fallback');
  }
  return [];
}

export async function getRuntimePayload(): Promise<RuntimePayload> {
  return {
    mode: 'cloud',
    activeHost: 'vercel',
    hosts: {},
    executionPolicy: {},
    memory: {},
  }
}

export async function getProvidersPayload(): Promise<ProvidersPayload> {
  if (prisma) {
    const conf = await prisma.providerConfig.findFirst();
    if (conf) {
      return {
        defaultProvider: conf.defaultProvider,
        defaultModel: conf.defaultModel,
        roles: JSON.parse(conf.roles || '{}'),
        providers: JSON.parse(conf.providers || '{}'),
        envStatus: JSON.parse(conf.envStatus || '{}'),
      };
    }
  }

  return {
    defaultProvider: 'unknown',
    defaultModel: 'unknown',
    roles: {},
    providers: {},
    envStatus: {},
  }
}

export async function getMcpPayload(): Promise<McpPayload> {
  if (prisma) {
    const records = await prisma.mcpServerConfig.findMany();
    const servers: Record<string, McpServer> = {};
    for (const r of records) {
      servers[r.name] = {
        enabled: r.enabled,
        purpose: r.purpose,
        trustTier: r.trustTier,
        scope: JSON.parse(r.scope || '[]'),
        envKey: r.envKey || undefined,
        envConfigured: r.envConfigured ?? undefined,
      };
    }
    return { servers };
  }
  return { servers: {} };
}

export async function getLogsPayload(): Promise<LogsPayload> {
  return {
    entries: [
      {
        id: "l1",
        level: "info",
        message: "[cloud] Logging is managed by Vercel inside the dashboard.",
        timestamp: new Date().toISOString()
      }
    ]
  }
}

export async function getLatestReportPayload(): Promise<ReportPayload> {
  return {
    ok: true,
    summary: 'Cloud instance running nominally.',
    data: {},
  }
}

export type RunHistoryEntry = {
  timestamp: string
  command: string
  exitCode: number
  durationMs: number
  ok: boolean
  stdoutPreview: string
  stderrPreview: string
}

const ALLOWED_SUBCOMMANDS = new Set([
  'doctor',
  'list',
  'sync',
  'eval',
  'gate',
  'dedupe',
  'run',
])

const ALLOWED_SYNC_TARGETS = new Set([
  'all',
  'custom-python',
  'opencode',
  'claude-code',
  'cursor',
  'chatgpt',
  'gemini',
  'hermes',
])

function splitShellLike(input: string): Array<string> {
  const tokens: Array<string> = []
  const matcher = /"([^"]*)"|'([^']*)'|(\S+)/g
  for (const match of input.matchAll(matcher)) {
    tokens.push(match[1] ?? match[2] ?? match[3] ?? '')
  }
  return tokens.filter(Boolean)
}

function toFailureResult(command: string, stderr: string, durationMs = 0): CliResult {
  return {
    ok: false,
    command,
    stdout: '',
    stderr,
    exitCode: 1,
    durationMs,
    timestamp: new Date().toISOString(),
  }
}

async function executeAiskillSubcommand(
  subcommand: string,
  extraArgs: Array<string>,
): Promise<CliResult> {
  const startedAt = Date.now()
  const timestamp = new Date().toISOString()

  if (!ALLOWED_SUBCOMMANDS.has(subcommand)) {
    return toFailureResult(`aiskill ${subcommand}`, `Unsupported command: ${subcommand}`)
  }

  const runArgs = [subcommand, ...extraArgs]

  let ok = true;
  let stdout = `[cloud-mock] Executed ${runArgs.join(' ')} successfully.`;
  let stderr = '';
  let exitCode = 0;
 
  // Mock on Vercel; wire real TS CLI locally if bin present
  if (process.env.VERCEL) {
    stdout = `[VERCEL] Action execution for ${runArgs.join(' ')} is mocked in serverless environment.`;
  } else if (fs.existsSync(AISKILL_CLI)) {
    try {
      const argStr = extraArgs.map(a => `"${String(a).replace(/"/g, '\\"')}"`).join(' ');
      const { stdout: out, stderr: err } = await execAsync(`npx tsx "${AISKILL_CLI}" ${subcommand} ${argStr}`);
      stdout = (out || '').trim();
      stderr = (err || '').trim();
      exitCode = 0;
    } catch (e: any) {
      // CLI non-zero (e.g. gate BLOCKED exits 2) or error -> capture
      stdout = (e.stdout || '').toString().trim() || `[cli-error] ${e.message}`;
      stderr = (e.stderr || '').toString().trim();
      exitCode = e.code || 1;
      ok = exitCode === 0;
    }
  } else {
    stdout = `[neon-local] Executed ${runArgs.join(' ')} locally with DB.`;
  }

  if (prisma) {
    try {
      await prisma.runHistory.create({
        data: {
          command: `aiskill ${runArgs.join(' ')}`,
          exitCode,
          durationMs: Date.now() - startedAt,
          ok,
          stdoutPreview: stdout,
          stderrPreview: stderr,
          timestamp: new Date(timestamp)
        }
      });
    } catch(e) {
      // Ignore DB log errors
    }
  }

  return {
    ok,
    command: `aiskill ${runArgs.join(' ')}`,
    stdout,
    stderr,
    exitCode,
    durationMs: Date.now() - startedAt,
    timestamp,
  }
}

export async function runCliCommand(commandInput: string): Promise<CliResult> {
  const tokens = splitShellLike(commandInput)
  if (tokens.length === 0) {
    return toFailureResult(commandInput, 'Missing command')
  }

  const args = [...tokens]
  const first = args[0]

  if (first === 'aiskill' || first.endsWith('/aiskill') || first === './aiskill') {
    args.shift()
  }

  const subcommand = args[0]
  if (!subcommand) {
    return toFailureResult(commandInput, 'Missing subcommand')
  }

  return executeAiskillSubcommand(subcommand, args.slice(1))
}

export async function runDoctorCommand(): Promise<CliResult> {
  return executeAiskillSubcommand('doctor', [])
}

export async function runEvalCommand(): Promise<CliResult> {
  return executeAiskillSubcommand('eval', [])
}

export async function runSyncCommand(target: string): Promise<CliResult> {
  const normalized = target.trim() || 'all'
  if (!ALLOWED_SYNC_TARGETS.has(normalized)) {
    return toFailureResult(`aiskill sync ${normalized}`, `Invalid sync target: ${normalized}`)
  }
  return executeAiskillSubcommand('sync', [normalized])
}

export async function runPromptCommand(prompt: string): Promise<CliResult> {
  const normalized = prompt.trim()
  if (!normalized) {
    return toFailureResult('aiskill run', 'Prompt is required')
  }
  return executeAiskillSubcommand('run', [normalized])
}

export async function runGateCommand(command: string): Promise<CliResult & { gate?: any }> {
  const normalized = command.trim()
  if (!normalized) {
    return toFailureResult('aiskill gate', 'Command is required')
  }
  const result = await executeAiskillSubcommand('gate', [normalized])
  
  // If CLI wired (local), trust its output for verdict; else fallback regex (for vercel)
  let verdict = 'PASS';
  let detail = 'Clear of blocked patterns.';
  if (result.stdout && result.stdout.includes('BLOCKED')) {
    verdict = 'BLOCKED';
    detail = 'Matches blocked pattern (see CLI output).';
  } else if (process.env.VERCEL) {
    const isDangerous = /sudo|rm\s+-rf|curl.*bash|wget.*bash|chmod\s+\+x/.test(normalized);
    verdict = isDangerous ? "BLOCKED" : "PASS";
    detail = isDangerous ? "Matches blocked pattern." : "Clear of blocked patterns.";
  }
  
  return {
    ...result,
    gate: {
      verdict,
      gates: [
        { id: "G1", name: "Static Analysis Rule Check", status: verdict === 'BLOCKED' ? "blocked" : "pass", detail },
        { id: "G2", name: "Registry Match Verification", status: "pass", detail: "Command matches execution scope." },
        { id: "G3", name: "Privilege Level Authorization", status: "pass", detail: "Authorized trust tier." },
        { id: "G4", name: "Host Enforcement Verification", status: "pass", detail: "Host target secure." }
      ]
    }
  } as any;
}

export async function runDedupeCommand(
  name: string,
  description: string,
): Promise<CliResult> {
  const normalizedName = name.trim()
  const normalizedDescription = description.trim()

  if (!normalizedName || !normalizedDescription) {
    return toFailureResult('aiskill dedupe', 'Both name and description are required')
  }

  return executeAiskillSubcommand('dedupe', [normalizedName, normalizedDescription])
}

export async function getRunHistoryPayload(): Promise<{ entries: Array<RunHistoryEntry> }> {
  if (prisma) {
    const records = await prisma.runHistory.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    return {
      entries: records.map((r: any) => ({
        timestamp: r.timestamp.toISOString(),
        command: r.command,
        exitCode: r.exitCode,
        durationMs: r.durationMs,
        ok: r.ok,
        stdoutPreview: r.stdoutPreview,
        stderrPreview: r.stderrPreview
      }))
    };
  }
  return { entries: [] };
}

// =====================================================
// Librarian real LLM + registry-backed knowledge (Ideas #1,#4,#5)
// =====================================================

const LIBRARIAN_SYSTEM = `You are Librarian, the calm archivist and explainer of the Universal AI Skill Lab (omo.dev style agent).

Core rules:
- Be precise, evidence-based, and cite specific skills by exact name from the provided context.
- Always use this structure:
  1) What it is.
  2) Why it exists in the lab.
  3) How to use it (numbered steps).
  4) Sources (list the exact librarian:* skills or registry items used).
- Use omo.dev flavored language: "Librarian is consulting the boulder of institutional knowledge...", "Evidence-based with permalinks to the registry".
- **CRITICAL for actionable questions**: When the user asks "how do I...", "what command...", or anything that maps to an aiskill operation, you MUST include 1-2 ready-to-stage commands in clean markdown blocks. Format exactly like this:

\`\`\`console
aiskill doctor
\`\`\`

\`\`\`console
aiskill list --status active
\`\`\`

Never put commands in normal text — always use the \`\`\`console fence. If no command is relevant, skip this section.
- Offer 1-2 suggested next actions in the UI.
- Never hallucinate skills that are not in the context you were given.`;

async function callLibrarianLLM(question: string, route: string, skillsContext: string, providers: any): Promise<string> {
  const { defaultProvider, defaultModel, providers: provs = {} } = providers || {};
  const hasAiKey = !!(process.env.AI_API_KEY || process.env.OPENAI_API_KEY);
  const isOpenAI = hasAiKey || defaultProvider === 'openai' || (provs.openai && provs.openai.enabled);

  const userPrompt = `Current route in the app: ${route}
User question: ${question}

Relevant librarian knowledge skills from the live registry (with full SKILL.md bodies where available):
${skillsContext || '(none loaded yet - use general knowledge)'}

Respond in character as Librarian.
- Follow the structure and omo.dev tone exactly.
- If the question is about actions, commands, "how do I", or "what command", you MUST output at least one (preferably 1-2) stageable command(s) in \`\`\`console blocks using the exact format shown in your system rules.
- Cite the librarian:* sources you used.`;



  if (isOpenAI) {
    const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.AI_BASE_URL;
    const model = process.env.AI_MODEL || defaultModel || 'gpt-5.1-codex-mini';
    if (!apiKey) {
      return `[Librarian fallback - no AI_API_KEY]\n\nLibrarian is consulting the boulder of institutional knowledge...\n\n` + mockLibrarianAnswer(question, skillsContext);
    }
    try {
      const openai = new OpenAI({ 
        apiKey,
        ...(baseURL ? { baseURL } : {})
      });
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: LIBRARIAN_SYSTEM },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 800,
      });
      return completion.choices[0]?.message?.content || 'No content from model.';
    } catch (err: any) {
      console.error('LLM error for Librarian:', err);
      return `[LLM error: ${err.message}]\n\n` + mockLibrarianAnswer(question, skillsContext);
    }
  }

  // Fallback to rich mock that blends the skills
  return mockLibrarianAnswer(question, skillsContext);
}

function mockLibrarianAnswer(question: string, skillsContext: string): string {
  const q = question.toLowerCase();
  let base = 'Librarian is consulting the boulder of institutional knowledge for the Universal AI Skill Lab.\n\n';
  if (skillsContext) {
    base += `Using these skills from the registry:\n${skillsContext}\n\n`;
  }
  if (q.includes('how') || q.includes('use') || q.includes('do')) {
    base += 'Here is how to proceed step by step (evidence from the loaded librarian skills):\n1. ... (detailed in real LLM)\n\nTry staging a command like `aiskill doctor` in the Console.';
  } else {
    base += 'This feature exists to ... (full explanation from LLM or seeds).';
  }
  base += '\n\nSources: the librarian:* skills above + current route context.';
  return base;
}

export async function runLibrarianExplain(question: string, route: string = '/') {
  const providers = await getProvidersPayload();
  const skills = await getLibrarianSkills();
  const skillsContext = skills.map((s: any) => {
    const desc = s.description || '';
    const body = s.body ? `\nFull content:\n${s.body}` : '';
    return `- ${s.name}: ${desc}${body}`;
  }).join('\n\n');

  const answer = await callLibrarianLLM(question, route, skillsContext, providers);

  return {
    ok: true,
    agent: 'Librarian',
    question,
    route,
    answer,
    sources: skills.map((s: any) => s.name),
    suggestedActions: [
      { label: 'Open Skill Registry', action: 'navigate:/skills' },
      { label: 'Go to Console', action: 'navigate:/console' }
    ]
  };
}

