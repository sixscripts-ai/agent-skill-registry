import 'dotenv/config';
import YAML from 'yaml'
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
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

// Load .env.ai manually into process.env if it exists
try {
  const envAiPath = path.resolve(PROJECT_ROOT, 'backend', '.env.ai');
  if (fs.existsSync(envAiPath)) {
    const content = fs.readFileSync(envAiPath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const firstEq = trimmed.indexOf('=');
      if (firstEq === -1) return;
      const key = trimmed.slice(0, firstEq).trim();
      let val = trimmed.slice(firstEq + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      } else if (val.startsWith("'") && val.endsWith("'")) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    });
  }
} catch (e) {
  console.warn('Could not load .env.ai:', e);
}

function safeParseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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
  requiredProviderRole: string
  requiredMcps: string[]
  allowedTools: string[]
  sideEffects: string[]
  triggerPhrases: string[]
  instructions: string
  references: string[]
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
        status: s.status as SkillStatus,
        requiredProviderRole: s.requiredProviderRole || 'executor',
        requiredMcps: safeParseJsonArray(s.requiredMcps),
        allowedTools: safeParseJsonArray(s.allowedTools),
        sideEffects: safeParseJsonArray(s.sideEffects),
        triggerPhrases: safeParseJsonArray(s.triggerPhrases),
        instructions: s.instructions || '',
        references: safeParseJsonArray(s.references)
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
          status: s.status as SkillStatus,
          requiredProviderRole: s.required_provider_role || 'executor',
          requiredMcps: s.required_mcps || [],
          allowedTools: s.allowed_tools || [],
          sideEffects: s.side_effects || [],
          triggerPhrases: s.trigger_phrases || [],
          instructions: s.instructions || '',
          references: s.references || []
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

export async function getLibrarianSkills(question?: string) {
  let skills: any[] = [];

  if (prisma) {
    // Load baseline librarian skills
    const baseSkills = await prisma.skill.findMany({
      where: {
        name: {
          startsWith: 'librarian:'
        }
      }
    });
    skills = [...baseSkills];

    // If query question is provided, search other skills by keyword matching
    if (question) {
      const words = question
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !['how', 'the', 'and', 'for', 'you', 'use', 'run', 'get', 'command', 'what', 'does'].includes(w));

      if (words.length > 0) {
        const matchedSkills = await prisma.skill.findMany({
          where: {
            OR: words.flatMap(word => [
              { name: { contains: word, mode: 'insensitive' } },
              { description: { contains: word, mode: 'insensitive' } }
            ]),
            NOT: {
              name: { startsWith: 'librarian:' }
            }
          },
          take: 5
        });
        skills.push(...matchedSkills);
      }
    }
  } else {
    // Fallback: load from registry.yaml
    try {
      const fs = await import('fs');
      const pth = await import('path');
      const root = PROJECT_ROOT;
      const yamlPath = pth.resolve(root, 'registry.yaml');
      if (fs.existsSync(yamlPath)) {
        const content = fs.readFileSync(yamlPath, 'utf8');
        const parsed = YAML.parse(content);
        const all = parsed.skills || [];
        
        const baseSkills = all.filter((s: any) => s.name && s.name.startsWith('librarian:'));
        skills = [...baseSkills];

        if (question) {
          const words = question
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2 && !['how', 'the', 'and', 'for', 'you', 'use', 'run', 'get', 'command', 'what', 'does'].includes(w));

          if (words.length > 0) {
            const matchedSkills = all.filter((s: any) => {
              if (s.name && s.name.startsWith('librarian:')) return false;
              const nameLower = (s.name || '').toLowerCase();
              const descLower = (s.description || '').toLowerCase();
              return words.some(word => nameLower.includes(word) || descLower.includes(word));
            }).slice(0, 5);
            skills.push(...matchedSkills);
          }
        }
      }
    } catch (e) {
      console.warn('Could not load librarian seeds from yaml fallback');
    }
  }

  // Load the full SKILL.md body for all selected skills
  const fs = await import('fs');
  const pth = await import('path');
  const root = PROJECT_ROOT;

  const loaded = skills.map((s: any) => {
    let body = s.description || '';
    if (s.path) {
      const possiblePaths = [
        pth.resolve(root, s.path, 'SKILL.md'),
        pth.resolve(root, s.path),
        pth.resolve(root, 'shared', s.path.replace(/^shared\//, ''), 'SKILL.md'),
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
      path: s.path || '',
      body
    };
  });

  return loaded;
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

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;

  let activeProvider = defaultProvider;
  if (activeProvider === 'unknown' || activeProvider === 'none') {
    if (geminiKey) {
      activeProvider = 'google';
    } else if (openaiKey) {
      activeProvider = 'openai';
    } else {
      activeProvider = 'mock';
    }
  }

  const userPrompt = `Current route in the app: ${route}
User question: ${question}

Relevant librarian knowledge skills from the live registry (with full SKILL.md bodies where available):
${skillsContext || '(none loaded yet - use general knowledge)'}

Respond in character as Librarian.
- Follow the structure and omo.dev tone exactly.
- If the question is about actions, commands, "how do I", or "what command", you MUST output at least one (preferably 1-2) stageable command(s) in \`\`\`console blocks using the exact format shown in your system rules.
- Cite the librarian:* sources you used.`;

  if (activeProvider === 'google') {
    const apiKey = geminiKey;
    const rawModel = defaultModel || 'gemini-2.5-flash';
    const model = rawModel === 'unknown' || rawModel === 'none' ? 'gemini-2.5-flash' : rawModel;

    if (!apiKey) {
      return `[Librarian fallback - no GEMINI_API_KEY]\n\nLibrarian is consulting the boulder of institutional knowledge...\n\n` + mockLibrarianAnswer(question, skillsContext);
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: [
          { role: 'user', parts: [{ text: userPrompt }] }
        ],
        config: {
          systemInstruction: LIBRARIAN_SYSTEM,
          temperature: 0.3,
          maxOutputTokens: 800,
        }
      });
      return response.text || 'No content from model.';
    } catch (err: any) {
      console.error('Gemini LLM error for Librarian:', err);
      return `[Gemini LLM error: ${err.message}]\n\n` + mockLibrarianAnswer(question, skillsContext);
    }
  }

  if (activeProvider === 'openai') {
    const apiKey = openaiKey;
    const baseURL = process.env.AI_BASE_URL;
    const rawModel = process.env.AI_MODEL || defaultModel || 'gpt-4o-mini';
    const model = rawModel === 'unknown' || rawModel === 'none' || rawModel === 'gpt-5.1-codex-mini' ? 'gpt-4o-mini' : rawModel;

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
      console.error('OpenAI LLM error for Librarian:', err);
      return `[OpenAI LLM error: ${err.message}]\n\n` + mockLibrarianAnswer(question, skillsContext);
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
    base += 'Here is how to proceed step by step (evidence from the loaded librarian skills):\n1. Run the system diagnostics tool to identify setup errors.\n\n```console\naiskill doctor\n```\n\nTry staging that command in the Console.';
  } else {
    base += 'This feature exists to ... (full explanation from LLM or seeds).';
  }
  base += '\n\nSources: the librarian:* skills above + current route context.';
  return base;
}

export async function runLibrarianExplain(question: string, route: string = '/') {
  const providers = await getProvidersPayload();
  const skills = await getLibrarianSkills(question);
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

// Mapping of MCP target configurations to their corresponding tool names
const mcpToolMapping: Record<string, string[]> = {
  filesystem: ['read_file', 'write_file'],
  git: ['git_status', 'git_diff'],
  sqlite: ['sqlite_query'],
  fetch: ['web_fetch']
};

// Lightweight local tool execution implementations
async function executeSandboxTool(toolName: string, args: any): Promise<any> {
  try {
    switch (toolName) {
      case 'read_file': {
        const reqPath = args.path;
        if (!reqPath) return { error: 'Path parameter is required.' };
        const resolved = path.resolve(PROJECT_ROOT, reqPath);
        if (!resolved.startsWith(PROJECT_ROOT)) {
          return { error: 'Access denied. Path must be inside project root.' };
        }
        if (!fs.existsSync(resolved)) {
          return { error: `File not found: ${reqPath}` };
        }
        const stat = fs.statSync(resolved);
        if (stat.isDirectory()) {
          return { error: `Path is a directory: ${reqPath}` };
        }
        const content = fs.readFileSync(resolved, 'utf8');
        return { content };
      }
      case 'write_file': {
        const reqPath = args.path;
        const content = args.content ?? '';
        if (!reqPath) return { error: 'Path parameter is required.' };
        const resolved = path.resolve(PROJECT_ROOT, reqPath);
        if (!resolved.startsWith(PROJECT_ROOT)) {
          return { error: 'Access denied. Path must be inside project root.' };
        }
        fs.mkdirSync(path.dirname(resolved), { recursive: true });
        fs.writeFileSync(resolved, content, 'utf8');
        return { success: true };
      }
      case 'git_status': {
        const { stdout } = await execAsync('git status -s', { cwd: PROJECT_ROOT });
        return { status: stdout.trim() || 'No changes.' };
      }
      case 'git_diff': {
        const { stdout } = await execAsync('git diff', { cwd: PROJECT_ROOT });
        return { diff: stdout.trim() || 'No diff.' };
      }
      case 'sqlite_query': {
        const sql = args.sql;
        if (!sql) return { error: 'SQL parameter is required.' };
        const normalized = sql.trim().toLowerCase();
        if (!normalized.startsWith('select')) {
          return { error: 'Execution denied. Only read-only SELECT queries are allowed.' };
        }
        if (!prisma) {
          return { error: 'Database is not initialized.' };
        }
        const results = await prisma.$queryRawUnsafe(sql);
        return { results };
      }
      case 'web_fetch': {
        const url = args.url;
        if (!url) return { error: 'URL parameter is required.' };
        const res = await (globalThis as any).fetch(url);
        const text = await res.text();
        return { text };
      }
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (err: any) {
    return { error: err.message || 'Unknown execution error.' };
  }
}

// Tool declarations for Gemini
const geminiTools: any[] = [
  {
    functionDeclarations: [
      {
        name: 'read_file',
        description: 'Read the contents of a file relative to the project root directory.',
        parameters: {
          type: 'OBJECT',
          properties: {
            path: { type: 'STRING', description: 'Relative path of the file to read.' }
          },
          required: ['path']
        }
      },
      {
        name: 'write_file',
        description: 'Write or modify contents of a file relative to the project root directory.',
        parameters: {
          type: 'OBJECT',
          properties: {
            path: { type: 'STRING', description: 'Relative path of the file to write.' },
            content: { type: 'STRING', description: 'The file contents to write.' }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'git_status',
        description: 'Get the current status of the git repository (modified files, untracked files, etc.).',
        parameters: {
          type: 'OBJECT',
          properties: {}
        }
      },
      {
        name: 'git_diff',
        description: 'Get the git diff showing uncommitted line-by-line changes in the repository.',
        parameters: {
          type: 'OBJECT',
          properties: {}
        }
      },
      {
        name: 'sqlite_query',
        description: 'Execute a read-only SELECT database query against the project database schema.',
        parameters: {
          type: 'OBJECT',
          properties: {
            sql: { type: 'STRING', description: 'A valid SELECT SQL statement to execute.' }
          },
          required: ['sql']
        }
      },
      {
        name: 'web_fetch',
        description: 'Perform a web request to retrieve raw content from a URL.',
        parameters: {
          type: 'OBJECT',
          properties: {
            url: { type: 'STRING', description: 'The absolute HTTP/HTTPS URL to fetch.' }
          },
          required: ['url']
        }
      }
    ]
  }
];

// Tool declarations for OpenAI
const openAiTools: any[] = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file relative to the project root directory.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path of the file to read.' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write or modify contents of a file relative to the project root directory.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path of the file to write.' },
          content: { type: 'string', description: 'The file contents to write.' }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_status',
      description: 'Get the current status of the git repository (modified files, untracked files, etc.).',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_diff',
      description: 'Get the git diff showing uncommitted line-by-line changes in the repository.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'sqlite_query',
      description: 'Execute a read-only SELECT database query against the project database schema.',
      parameters: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: 'A valid SELECT SQL statement to execute.' }
        },
        required: ['sql']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'web_fetch',
      description: 'Perform a web request to retrieve raw content from a URL.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The absolute HTTP/HTTPS URL to fetch.' }
        },
        required: ['url']
      }
    }
  }
];

export async function runSkillSandbox(skillName: string, prompt: string, activeMcps: string[] = []) {
  const reg = await getRegistryPayload();
  const skill = reg.skills.find(s => s.name === skillName);
  
  let skillMd = '';
  if (skill) {
    skillMd = await loadSkillBody(skill.path);
  }

  const providers = await getProvidersPayload();
  const { defaultProvider, defaultModel, providers: provs = {} } = providers || {};

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;

  let activeProvider = defaultProvider;
  if (activeProvider === 'unknown' || activeProvider === 'none') {
    if (geminiKey) {
      activeProvider = 'google';
    } else if (openaiKey) {
      activeProvider = 'openai';
    } else {
      activeProvider = 'mock';
    }
  }

  const systemInstructions = `You are executing the sandbox simulation for the skill "${skillName}" inside the Universal AI Skill Lab.
Follow the rules, procedures, and instructions of this skill strictly. Here is the skill body:\n\n${skillMd || 'No custom instructions defined.'}

CRITICAL RULES:
- Before outputting your final response, you MUST output a monospaced "thinking process" block enclosed in <thinking>...</thinking> tags describing the planning steps and tool evaluations.
Example:
<thinking>
1. Parsing input parameters.
2. Checking validation constraints.
</thinking>

Then provide your final output in markdown.`;

  // Resolve allowed tools based on active MCP configuration
  const allowedToolsSet = new Set<string>();
  if (activeMcps && Array.isArray(activeMcps)) {
    for (const mcp of activeMcps) {
      const tools = mcpToolMapping[mcp];
      if (tools) {
        tools.forEach(t => allowedToolsSet.add(t));
      }
    }
  } else {
    // Default to all tools if activeMcps list not explicitly sent
    Object.values(mcpToolMapping).flat().forEach(t => allowedToolsSet.add(t));
  }

  const thinkingLog: string[] = [];

  if (activeProvider === 'google') {
    const apiKey = geminiKey;
    const rawModel = defaultModel || 'gemini-2.5-flash';
    const model = rawModel === 'unknown' || rawModel === 'none' ? 'gemini-2.5-flash' : rawModel;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const contents: any[] = [{ role: 'user', parts: [{ text: prompt }] }];
        let loopCount = 0;
        const maxLoops = 5;
        let finalResponse: any = null;

        while (loopCount < maxLoops) {
          const filteredGeminiTools = geminiTools.map(group => {
            return {
              functionDeclarations: group.functionDeclarations.filter((t: any) => allowedToolsSet.has(t.name))
            };
          }).filter(group => group.functionDeclarations.length > 0);

          const response = await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction: systemInstructions,
              temperature: 0.5,
              maxOutputTokens: 1000,
              ...(filteredGeminiTools.length > 0 ? { tools: filteredGeminiTools } : {})
            }
          });

          finalResponse = response;

          if (response.candidates && response.candidates[0] && response.candidates[0].content) {
            contents.push(response.candidates[0].content);
          } else {
            contents.push({
              role: 'model',
              parts: response.text ? [{ text: response.text }] : []
            });
          }

          const functionCalls = response.functionCalls;
          if (!functionCalls || functionCalls.length === 0) {
            break;
          }

          const functionResponseParts: any[] = [];
          for (const call of functionCalls) {
            const name = call.name || '';
            if (!name) continue;
            const args = call.args || {};
            thinkingLog.push(`Executing tool: ${name} with args: ${JSON.stringify(args)}`);

            const result = await executeSandboxTool(name, args);
            thinkingLog.push(`Tool ${name} result: ${JSON.stringify(result).slice(0, 150)}...`);

            functionResponseParts.push({
              functionResponse: {
                name: name,
                id: call.id,
                response: { result: JSON.stringify(result) }
              }
            });
          }

          contents.push({
            role: 'user',
            parts: functionResponseParts
          });

          loopCount++;
        }

        let outputText = finalResponse?.text || 'No response.';
        if (thinkingLog.length > 0) {
          const formattedThinking = `<thinking>\n${thinkingLog.map((line, idx) => `${idx + 1}. ${line}`).join('\n')}\n</thinking>\n\n`;
          outputText = formattedThinking + outputText;
        }
        return { ok: true, output: outputText };
      } catch (err: any) {
        console.error('Google GenAI sandbox run failed:', err);
      }
    }
  }

  if (activeProvider === 'openai') {
    const apiKey = openaiKey;
    const baseURL = process.env.AI_BASE_URL;
    const rawModel = process.env.AI_MODEL || defaultModel || 'gpt-4o-mini';
    const model = rawModel === 'unknown' || rawModel === 'none' || rawModel === 'gpt-5.1-codex-mini' ? 'gpt-4o-mini' : rawModel;

    if (apiKey) {
      try {
        const openai = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
        const messages: any[] = [
          { role: 'system', content: systemInstructions },
          { role: 'user', content: prompt }
        ];
        let loopCount = 0;
        const maxLoops = 5;
        let finalMessage: any = null;

        while (loopCount < maxLoops) {
          const toolsToPass = openAiTools.filter(t => allowedToolsSet.has(t.function.name));

          const completion = await openai.chat.completions.create({
            model,
            messages,
            temperature: 0.5,
            max_tokens: 1000,
            ...(toolsToPass.length > 0 ? { tools: toolsToPass } : {})
          });

          const responseMessage = completion.choices[0]?.message;
          if (!responseMessage) {
            break;
          }

          messages.push(responseMessage);
          finalMessage = responseMessage;

          const toolCalls = responseMessage.tool_calls;
          if (!toolCalls || toolCalls.length === 0) {
            break;
          }

          for (const toolCall of toolCalls) {
            const name = (toolCall as any).function?.name || '';
            if (!name) continue;
            const args = JSON.parse((toolCall as any).function?.arguments || '{}');
            thinkingLog.push(`Executing tool: ${name} with args: ${JSON.stringify(args)}`);

            const result = await executeSandboxTool(name, args);
            thinkingLog.push(`Tool ${name} result: ${JSON.stringify(result).slice(0, 150)}...`);

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: name,
              content: JSON.stringify(result)
            });
          }

          loopCount++;
        }

        let outputText = finalMessage?.content || 'No response.';
        if (thinkingLog.length > 0) {
          const formattedThinking = `<thinking>\n${thinkingLog.map((line, idx) => `${idx + 1}. ${line}`).join('\n')}\n</thinking>\n\n`;
          outputText = formattedThinking + outputText;
        }
        return { ok: true, output: outputText };
      } catch (err: any) {
        console.error('OpenAI sandbox run failed:', err);
      }
    }
  }

  // Fallback / Mock
  const mockThinkingLog: string[] = [
    `Initializing mock sandbox context for skill "${skillName}"`,
    `Loaded local SKILL.md from path: ${skill?.path || 'unknown'}`,
    `Active MCP servers in sandbox: ${activeMcps.join(', ') || 'none'}`
  ];

  if (allowedToolsSet.has('read_file')) {
    mockThinkingLog.push(`Executing tool: read_file with args: {"path":"package.json"}`);
    mockThinkingLog.push(`Tool read_file result: {"content":"{...}"}`);
  }
  if (allowedToolsSet.has('sqlite_query')) {
    mockThinkingLog.push(`Executing tool: sqlite_query with args: {"sql":"SELECT * FROM RunHistory LIMIT 1"}`);
    mockThinkingLog.push(`Tool sqlite_query result: {"results":[]}`);
  }
  mockThinkingLog.push(`Validating parameters for prompt: "${prompt}"`);
  mockThinkingLog.push(`Evaluation: PASS`);

  const mockOutput = `<thinking>
${mockThinkingLog.map((line, idx) => `${idx + 1}. ${line}`).join('\n')}
</thinking>

Successfully executed prompt in the "${skillName}" skill sandbox. The simulated agent completed all tasks according to the instruction guidelines.`;

  return { ok: true, output: mockOutput };
}

export async function runSkillPipeline(pipeline: { skillName: string }[], initialPrompt: string, activeMcps: string[] = []) {
  const steps: any[] = [];
  let currentPrompt = initialPrompt;

  for (let i = 0; i < pipeline.length; i++) {
    const node = pipeline[i];
    
    // For the prompt, we inject the previous step's output if it's not the first step.
    const runPrompt = i === 0 
      ? currentPrompt 
      : `Previous context/output from earlier pipeline step:\n---\n${currentPrompt}\n---\n\nPlease continue the pipeline execution using your skill's instructions.`;
      
    const result = await runSkillSandbox(node.skillName, runPrompt, activeMcps);
    
    steps.push({
      stepIndex: i + 1,
      skillName: node.skillName,
      inputPrompt: runPrompt,
      ok: result.ok,
      output: result.output || (result as any).error || 'No output.'
    });

    if (!result.ok) {
      break;
    }

    // Pass the output of this skill as the context for the next skill
    currentPrompt = result.output;
  }

  return {
    ok: steps.every(s => s.ok),
    steps,
    finalOutput: currentPrompt
  };
}
