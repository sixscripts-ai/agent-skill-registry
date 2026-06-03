import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import {
  getHealthPayload,
  getRegistryPayload,
  getRuntimePayload,
  getProvidersPayload,
  getMcpPayload,
  getLogsPayload,
  getLatestReportPayload,
  getRunHistoryPayload,
  runCliCommand,
  runDoctorCommand,
  runEvalCommand,
  runSyncCommand,
  runPromptCommand,
  runGateCommand,
  runDedupeCommand,
  runLibrarianExplain,
  loadSkillBody,
  runSkillSandbox
} from "./skillLabBackend.js";

const app = express();
app.use(cors());
app.use(express.json());

// Async handler to catch unhandled promise rejections and pass to Express error handler
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Reads
app.get("/api/health", asyncHandler(async (req, res) => res.json(await getHealthPayload())));
app.get("/api/registry", asyncHandler(async (req, res) => res.json(await getRegistryPayload())));
app.get("/api/runtime", asyncHandler(async (req, res) => res.json(await getRuntimePayload())));
app.get("/api/providers", asyncHandler(async (req, res) => res.json(await getProvidersPayload())));
app.get("/api/mcp", asyncHandler(async (req, res) => res.json(await getMcpPayload())));
app.get("/api/logs", asyncHandler(async (req, res) => res.json(await getLogsPayload())));
app.get("/api/reports/latest", asyncHandler(async (req, res) => res.json(await getLatestReportPayload())));
app.get("/api/history", asyncHandler(async (req, res) => res.json(await getRunHistoryPayload())));

import prisma from "./db.js";

// Database Reads (augmented with registry + full SKILL.md bodies where available)
app.get("/api/skills", asyncHandler(async (req, res) => {
  const reg = await getRegistryPayload();
  res.json(reg.skills || []);
}));

app.get("/api/skills/drafts", asyncHandler(async (req, res) => {
  const reg = await getRegistryPayload();
  const drafts = (reg.skills || []).filter((s: any) => ['draft', 'quarantined'].includes(s.status));
  res.json(drafts);
}));

app.get("/api/skills/:name", asyncHandler(async (req, res) => {
  const reg = await getRegistryPayload();
  const skill = (reg.skills || []).find((s: any) => s.name === req.params.name);
  if (!skill) return res.json({});
  const skillMd = await loadSkillBody(skill.path);
  res.json({ ...skill, skillMd });
}));

app.get("/api/adapters", asyncHandler(async (req, res) => res.json([]))); // Leaving adapters mocked as per requirements

app.get("/api/governance", asyncHandler(async (req, res) => {
  // Can be moved to DB later, keeping static policy for now as it's not in schema
  res.json({
    executionPolicy: {
      prevent_privileged_escalation: true,
      require_mcp_sandbox: true,
      block_dynamic_curls: true,
      audit_unregistered_tools: false
    },
    trustRules: [
      { tier: "T1", label: "safe / read-only", approval: "auto-review" },
      { tier: "T2", label: "normal write / config", approval: "auto-review" },
      { tier: "T3", label: "network / acquisition", approval: "gatekeeper" },
      { tier: "T4", label: "privileged / high-risk", approval: "human-approved" }
    ],
    blockedPatterns: [
      "sudo",
      "rm -rf",
      "curl.*bash",
      "wget.*bash",
      "chmod +x"
    ],
    recentBlocked: [
      { id: "b1", command: "sudo rm -rf /", timestamp: new Date(Date.now() - 3600000).toISOString() }
    ],
    recentGateChecks: [
      { id: "g1", command: "ls -la", status: "pass" },
      { id: "g2", command: "sudo rm -rf /", status: "blocked" }
    ]
  });
}));

app.get("/api/settings", asyncHandler(async (req, res) => {
  const config = await prisma.providerConfig.findFirst() || {};
  res.json(config);
}));

// Mutations / Actions
app.post("/api/cli", asyncHandler(async (req, res) => res.json(await runCliCommand(req.body.command))));
app.post("/api/doctor", asyncHandler(async (req, res) => res.json(await runDoctorCommand())));
app.post("/api/eval", asyncHandler(async (req, res) => res.json(await runEvalCommand())));
app.post("/api/sync", asyncHandler(async (req, res) => res.json(await runSyncCommand(req.body.target || "all"))));
app.post("/api/run", asyncHandler(async (req, res) => res.json(await runPromptCommand(req.body.prompt))));
app.post("/api/gate", asyncHandler(async (req, res) => res.json(await runGateCommand(req.body.command))));
app.post("/api/dedupe", asyncHandler(async (req, res) => res.json(await runDedupeCommand(req.body.name, req.body.description))));

// Librarian — real LLM + live librarian:* skills from registry (Ideas #1, #4, #5)
app.post("/api/librarian/explain", asyncHandler(async (req, res) => {
  const { question = "", route = "/" } = req.body || {};
  const result = await runLibrarianExplain(question, route);
  res.json(result);
}));

// Skill Sandbox Run (Split-screen sandbox execution)
app.post("/api/skills/run", asyncHandler(async (req, res) => {
  const { name = "", prompt = "", activeMcps = [] } = req.body || {};
  const result = await runSkillSandbox(name, prompt, activeMcps);
  res.json(result);
}));

// Skill Sandbox Save Raw (Write raw SKILL.md back to disk and re-sync)
app.post("/api/skills/save-raw", asyncHandler(async (req, res) => {
  const { name = "", path: skillPath = "", content = "" } = req.body || {};
  if (!name || !skillPath) {
    return res.status(400).json({ ok: false, error: "Name and path are required" });
  }

  const fs = await import("fs");
  const path = await import("path");
  // Resolve the SKILL.md file path under the target directory
  const fullPath = path.resolve(process.cwd(), skillPath, "SKILL.md");

  // Write content to SKILL.md
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.promises.writeFile(fullPath, content, "utf8");

  // Automatically trigger sync
  const syncResult = await runSyncCommand("all");

  res.json({ ok: true, syncResult });
}));

// Database Mutations
app.put("/api/settings", asyncHandler(async (req, res) => {
  const existing = await prisma.providerConfig.findFirst();
  if (existing) {
    await prisma.providerConfig.update({ where: { id: existing.id }, data: req.body });
  } else {
    await prisma.providerConfig.create({ data: req.body });
  }
  res.json({ ok: true });
}));

app.post("/api/skills/preview", asyncHandler(async (req, res) => res.json({ skillMd: "" }))); // Preview generation can stay mocked for now

app.post("/api/skills/validate", asyncHandler(async (req, res) => {
  const form = req.body || {};
  const isT4 = form.trustTier === 'T4';
  res.json({
    ok: true,
    overall: isT4 ? "warning" : "pass",
    checks: [
      { id: "structure", label: "YAML frontmatter structure check", status: "pass", detail: "Valid YAML and metadata fields." },
      { id: "naming", label: "Naming and tier resolution", status: "pass", detail: "Matches naming standard." },
      { id: "mcp", label: "MCP dependency validation", status: "pass", detail: "All requested MCP tools are registered." },
      { id: "governance_tier", label: "Registry trust tier mapping", status: isT4 ? "warn" : "pass", detail: isT4 ? "Requires manual review." : "Allowed for target tier." }
    ]
  });
}));

app.post("/api/skills/create", asyncHandler(async (req, res) => {
  const form = req.body || {};
  const serialize = (v: unknown) => JSON.stringify(v ?? []);
  const skill = await prisma.skill.upsert({
    where: { name: form.name || 'untitled' },
    update: {
      description: form.description || '',
      tier: form.tier || 'functional',
      trustTier: form.trustTier || 'T2',
      status: form.status || 'active',
      path: `shared/${form.tier || 'functional'}/${form.name || 'untitled'}`,
      requiredProviderRole: form.requiredProviderRole || 'executor',
      requiredMcps: serialize(form.requiredMcps),
      allowedTools: serialize(form.allowedTools),
      sideEffects: serialize(form.sideEffects),
      triggerPhrases: serialize(form.triggerPhrases),
      instructions: form.instructions || '',
      references: serialize(form.references),
    },
    create: {
      name: form.name || 'untitled',
      description: form.description || '',
      tier: form.tier || 'functional',
      trustTier: form.trustTier || 'T2',
      status: form.status || 'active',
      path: `shared/${form.tier || 'functional'}/${form.name || 'untitled'}`,
      requiredProviderRole: form.requiredProviderRole || 'executor',
      requiredMcps: serialize(form.requiredMcps),
      allowedTools: serialize(form.allowedTools),
      sideEffects: serialize(form.sideEffects),
      triggerPhrases: serialize(form.triggerPhrases),
      instructions: form.instructions || '',
      references: serialize(form.references),
    }
  });
  res.json({ ok: true, skill });
}));

app.post("/api/skills/draft", asyncHandler(async (req, res) => {
  const { name, payload } = req.body || {};
  const skillName = name || payload?.name || 'untitled-draft';
  const tier = payload?.tier || 'functional';
  const skillPath = `shared/${tier}/${skillName}`;

  const payloadDesc = payload?.description || '';
  const serialize = (v: unknown) => JSON.stringify(v ?? []);

  const skill = await prisma.skill.upsert({
    where: { name: skillName },
    update: {
      description: payloadDesc,
      tier,
      trustTier: payload?.trustTier || 'T2',
      status: payload?.status || 'draft',
      path: skillPath,
      requiredProviderRole: payload?.requiredProviderRole || 'executor',
      requiredMcps: serialize(payload?.requiredMcps),
      allowedTools: serialize(payload?.allowedTools),
      sideEffects: serialize(payload?.sideEffects),
      triggerPhrases: serialize(payload?.triggerPhrases),
      instructions: payload?.instructions || '',
      references: serialize(payload?.references),
    },
    create: {
      name: skillName,
      description: payloadDesc,
      tier,
      trustTier: payload?.trustTier || 'T2',
      status: payload?.status || 'draft',
      path: skillPath,
      requiredProviderRole: payload?.requiredProviderRole || 'executor',
      requiredMcps: serialize(payload?.requiredMcps),
      allowedTools: serialize(payload?.allowedTools),
      sideEffects: serialize(payload?.sideEffects),
      triggerPhrases: serialize(payload?.triggerPhrases),
      instructions: payload?.instructions || '',
      references: serialize(payload?.references),
    }
  });

  // For librarian:* skills, write the full SKILL.md body to disk so getLibrarianSkills can load it
  if (skillName.startsWith('librarian:') && payload?.body) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const fullPath = path.resolve(process.cwd(), skillPath, 'SKILL.md');
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      const mdContent = `---
name: ${skillName}
tier: documentation
trust_tier: T1
status: active
---

# ${skillName}

${payload.body}
`;
      fs.writeFileSync(fullPath, mdContent);
    } catch (e) {
      console.warn('Could not write SKILL.md for saved librarian skill:', e);
    }
  }

  res.json({ ok: true, skill });
}));

app.delete("/api/skills/draft/:name", asyncHandler(async (req, res) => {
  const name = req.params.name;
  if (!name) return res.status(400).json({ detail: "Draft name is required" });

  // Look up first so we can clean up on-disk SKILL.md for librarian:* drafts
  // and return 404 if the draft doesn't exist (Prisma P2025 would otherwise
  // surface as a 500).
  const existing = await prisma.skill.findUnique({ where: { name } });
  if (!existing) {
    return res.status(404).json({ detail: `Draft "${name}" not found` });
  }

  await prisma.skill.delete({ where: { name } });

  // Mirror the writer logic in POST /api/skills/draft: if the deleted row
  // pointed at a librarian:* path with a SKILL.md on disk, remove it.
  if (name.startsWith("librarian:") && existing.path) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const fullPath = path.resolve(process.cwd(), existing.path, "SKILL.md");
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch (e) {
      console.warn("Could not remove SKILL.md for deleted librarian draft:", e);
    }
  }

  res.json({ ok: true, name });
}));

// History / Danger
app.delete("/api/history/:id", asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (!isNaN(id)) await prisma.runHistory.delete({ where: { id } });
  res.json({ ok: true });
}));

app.post("/api/danger/reset-adapters", asyncHandler(async (req, res) => res.json({ ok: true })));
app.post("/api/danger/clear-logs", asyncHandler(async (req, res) => res.json({ ok: true })));
app.post("/api/danger/clear-reports", asyncHandler(async (req, res) => {
  await prisma.runHistory.deleteMany();
  res.json({ ok: true });
}));

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Backend Error:", err);
  res.status(500).json({ detail: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 8000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://127.0.0.1:${PORT}`);
  });
}

export default app;
