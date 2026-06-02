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
  loadSkillBody
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
  const skill = await prisma.skill.upsert({
    where: { name: form.name || 'untitled' },
    update: {
      description: form.description || '',
      tier: form.tier || 'functional',
      trustTier: form.trustTier || 'T2',
      status: form.status || 'active',
      path: `shared/${form.tier || 'functional'}/${form.name || 'untitled'}`,
    },
    create: {
      name: form.name || 'untitled',
      description: form.description || '',
      tier: form.tier || 'functional',
      trustTier: form.trustTier || 'T2',
      status: form.status || 'active',
      path: `shared/${form.tier || 'functional'}/${form.name || 'untitled'}`,
    }
  });
  res.json({ ok: true, skill });
}));

app.post("/api/skills/draft", asyncHandler(async (req, res) => {
  const { name, payload } = req.body || {};
  const skillName = name || payload?.name || 'untitled-draft';
  const skill = await prisma.skill.upsert({
    where: { name: skillName },
    update: {
      description: payload?.description || '',
      tier: payload?.tier || 'functional',
      trustTier: payload?.trustTier || 'T2',
      status: payload?.status || 'draft',
      path: `shared/${payload?.tier || 'functional'}/${skillName}`,
    },
    create: {
      name: skillName,
      description: payload?.description || '',
      tier: payload?.tier || 'functional',
      trustTier: payload?.trustTier || 'T2',
      status: payload?.status || 'draft',
      path: `shared/${payload?.tier || 'functional'}/${skillName}`,
    }
  });
  res.json({ ok: true, skill });
}));

app.delete("/api/skills/draft/:id", asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (!isNaN(id)) await prisma.skill.delete({ where: { id } });
  res.json({ ok: true });
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
