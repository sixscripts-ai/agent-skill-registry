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
  runDedupeCommand
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

// Missing Reads (Mocked for now)
app.get("/api/skills", asyncHandler(async (req, res) => res.json([])));
app.get("/api/skills/drafts", asyncHandler(async (req, res) => res.json([])));
app.get("/api/skills/:name", asyncHandler(async (req, res) => res.json({})));
app.get("/api/adapters", asyncHandler(async (req, res) => res.json([])));
app.get("/api/governance", asyncHandler(async (req, res) => res.json({})));
app.get("/api/settings", asyncHandler(async (req, res) => res.json({})));

// Mutations / Actions
app.post("/api/cli", asyncHandler(async (req, res) => res.json(await runCliCommand(req.body.command))));
app.post("/api/doctor", asyncHandler(async (req, res) => res.json(await runDoctorCommand())));
app.post("/api/eval", asyncHandler(async (req, res) => res.json(await runEvalCommand())));
app.post("/api/sync", asyncHandler(async (req, res) => res.json(await runSyncCommand(req.body.target || "all"))));
app.post("/api/run", asyncHandler(async (req, res) => res.json(await runPromptCommand(req.body.prompt))));
app.post("/api/gate", asyncHandler(async (req, res) => res.json(await runGateCommand(req.body.command))));
app.post("/api/dedupe", asyncHandler(async (req, res) => res.json(await runDedupeCommand(req.body.name, req.body.description))));

// Missing Mutations (Mocked for now)
app.put("/api/settings", asyncHandler(async (req, res) => res.json({ ok: true })));
app.post("/api/skills/preview", asyncHandler(async (req, res) => res.json({ skillMd: "" })));
app.post("/api/skills/validate", asyncHandler(async (req, res) => res.json({ ok: true })));
app.post("/api/skills/create", asyncHandler(async (req, res) => res.json({ ok: true })));
app.post("/api/skills/draft", asyncHandler(async (req, res) => res.json({ ok: true })));
app.delete("/api/skills/draft/:id", asyncHandler(async (req, res) => res.json({ ok: true })));

// History / Danger (Mocked for now)
app.delete("/api/history/:id", asyncHandler(async (req, res) => res.json({ ok: true })));
app.post("/api/danger/reset-adapters", asyncHandler(async (req, res) => res.json({ ok: true })));
app.post("/api/danger/clear-logs", asyncHandler(async (req, res) => res.json({ ok: true })));
app.post("/api/danger/clear-reports", asyncHandler(async (req, res) => res.json({ ok: true })));

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Backend Error:", err);
  res.status(500).json({ detail: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 8e3;
app.listen(PORT, () => {
  console.log(`Backend server running on http://127.0.0.1:${PORT}`);
});
