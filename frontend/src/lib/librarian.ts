/**
 * Librarian — the explainer agent for the Universal AI Skill Lab.
 * Styled after the agents in https://omo.dev/ (Sisyphus, Prometheus, Librarian, etc.)
 *
 * Personality:
 * - Calm, precise, evidence-based archivist.
 * - Always cites sources from the live skill registry, run history, and config.
 * - Offers actionable "how to" steps.
 * - Never guesses; says "based on current registry..." or "the 'xxx' skill defines this as...".
 * - Friendly but formal, like a wise librarian who knows every book in the lab.
 */

export const LIBRARIAN = {
  name: "Librarian",
  title: "Docs & Institutional Knowledge",
  subtitle: "Keeper of the Lab • Evidence-based answers",
  icon: "📜", // or use a lucide Book or Scroll later
  accent: "cyan" as const,

  bio: `The calm archivist of the Universal AI Skill Lab. When you ask "what is this?" or "how do I…", Librarian consults the live registry, active skills, run history, provider configs, and governance rules to give precise, evidence-based answers. Always cites its sources with direct links to skills and runs. Never guesses.`,

  // System prompt for LLM calls (when we wire real models)
  systemPrompt: `You are Librarian, the official archivist and explainer for the Universal AI Skill Lab (the app at agent-skill-registry).

Core rules:
- Be precise and evidence-based. Cite specific skill names, tiers, statuses, or run history entries when possible.
- Structure answers clearly: 1) What it is. 2) Why it exists (purpose in the lab). 3) How to use it (step-by-step). 4) Sources (name the exact skills or configs you consulted).
- Use a calm, wise, slightly formal tone — like a master librarian who has read every SKILL.md in the registry.
- If the user is on a specific screen (Dashboard, Builder, Console, etc.), tailor the answer to that context.
- Offer 1-2 suggested next actions the user can take in the UI.
- When referencing skills, use the exact name from the registry (e.g. "security-gatekeeper", "provider-router").
- If data is missing, say "Based on the current registry snapshot..." and note what would make the answer better.

Current app sections (for context):
- Dashboard: Overview, health, quick actions, recent runs, skill lifecycle stats.
- Skill Registry: Browse, filter, inspect SKILL.md of all registered skills.
- Skill Builder: Create, validate (T1-T4), dedupe, governance gate, save as draft or active.
- Console: Run aiskill commands and natural language prompts against the simulated runtime.
- Sync & Adapters: Compile universal skills into host-specific adapters.
- Run History: Past executions with exit codes and previews.
- Providers: Configured model providers and role-based routing.
- MCP Servers: Tool access via Model Context Protocol.
- Governance: Security gates and policy enforcement (T4 skills require human approval).
- Eval Reports & Logs: Quality and observability.
- Settings: Registry root, interaction policies.

Always end with a short "Related in the registry" if you can name 1-2 relevant skills.`,

  // Base knowledge that can be overridden/enhanced by actual skills in the registry
  baseKnowledge: {
    dashboard: {
      what: "The control tower and landing page for the entire Universal AI Skill Lab.",
      why: "Gives you instant visibility into registry health, skill lifecycle distribution, recent activity, and one-click access to the most common operations.",
      how: [
        "Check the four stat cards (Registry Health, Total Skills, Active Runtime, Last Eval).",
        "Use the Quick Actions bar or the Actions menu for doctor/sync/eval/audit.",
        "Review Recent Runs for the last simulated executions.",
        "Click through to deeper sections (Registry, Builder, History, etc.)."
      ],
      sources: ["Dashboard view in AppShell + index route"]
    },
    "skill-registry": {
      what: "The central catalog of all portable AI skills in your lab.",
      why: "Skills are the atomic units that agents (Sisyphus, Atlas, etc.) use. The registry makes them discoverable, versioned, and portable across hosts.",
      how: [
        "Browse the list, use filters for tier/trust/status.",
        "Click a skill to open the detail panel showing its full SKILL.md.",
        "Use the search or category chips to narrow down."
      ],
      sources: ["skills route + SkillDetailView + registry.yaml seed"]
    },
    builder: {
      what: "The place where you author new portable skills as SKILL.md packages.",
      why: "The lab is only as powerful as the skills you feed it. The Builder enforces structure, runs validation, deduplication, and governance before a skill can become active.",
      how: [
        "Fill name, tier (planning/functional/atomic/governance/acquisition/evaluation), trust tier (T1-T4), description.",
        "Write the actual instructions in the SKILL.md body editor.",
        "Run Validate → Dedupe → Governance (especially important for T4).",
        "Save as Draft or promote to Active (which registers it)."
      ],
      sources: ["SkillBuilder component + /skills/validate, /dedupe, /create endpoints"]
    },
    console: {
      what: "The direct interface to the simulated (or real) agent runtime.",
      why: "Lets you speak the native language of the lab ('aiskill ...' commands) and run arbitrary prompts. Perfect for testing skills, debugging, and quick operations.",
      how: [
        "Type commands like 'aiskill doctor', 'aiskill list', or free-form prompts.",
        "Use the Presets for common safe operations.",
        "View structured output, exit codes, and gate results for dangerous commands.",
        "History of this session appears below."
      ],
      sources: ["console route + runCli / runPrompt"]
    }
    // More can be added; Librarian will also pull live from registry skills named "librarian:*"
  }
} as const;

export type LibrarianKnowledge = typeof LIBRARIAN.baseKnowledge;

export function getLibrarianContextForRoute(route: string, _extra?: Record<string, unknown>) {
  // Simple router → knowledge key mapping. Can be made much smarter.
  if (route === '/' || route === '/dashboard') return 'dashboard';
  if (route.startsWith('/skills')) return 'skill-registry';
  if (route.startsWith('/builder')) return 'builder';
  if (route.startsWith('/console') || route.startsWith('/cli')) return 'console';
  return 'dashboard';
}

export function extractStageableCommands(text: string): string[] {
  const cmds: string[] = [];
  // markdown code blocks
  const blockRe = /```(?:console|bash|sh)?\s*([\s\S]*?)```/gi;
  let m;
  while ((m = blockRe.exec(text)) !== null) {
    const block = m[1].trim();
    if (block) {
      // take first non-empty line or the whole if short
      const first = block.split('\n').find(l => l.trim())?.trim() || block;
      if (first.length < 300) cmds.push(first);
    }
  }
  // plain aiskill lines
  const lineRe = /^\s*(aiskill\s+\S.*)$/gm;
  while ((m = lineRe.exec(text)) !== null) {
    cmds.push(m[1].trim());
  }
  return Array.from(new Set(cmds)).slice(0, 4);
}

export function buildLibrarianResponse(question: string, route: string, base: any) {
  const q = question.toLowerCase()

  let text = base.what + "\n\n" + base.why + "\n\nHow to use it:\n" + base.how.map((h: string, i: number) => `${i+1}. ${h}`).join('\n')

  const sources = [...(base.sources || [])]

  if (q.includes('how') || q.includes('use') || q.includes('do')) {
    text = `**How to use this part of the lab**\n\n${base.how.map((h: string, i: number) => `${i+1}. ${h}`).join('\n')}\n\n${base.why}`
  }

  if (q.includes('what') || q.includes('is')) {
    text = `**What it is**\n\n${base.what}\n\n**Why it exists**\n\n${base.why}`
  }

  // Very basic registry-aware flavor (will be replaced by real /librarian/explain + skill loading)
  if (q.includes('skill') || route.includes('skill')) {
    text += "\n\nYou can find the authoritative definition in the Skill Registry. Many behaviors are actually defined in individual SKILL.md files that agents load at runtime."
    sources.push("registry.yaml + active skills")
  }

  return { text, sources }
}
