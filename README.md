# Universal AI Skill Registry + Lab

A local-first, provider-neutral "Universal AI Skill Lab" — a registry, builder, console, and runtime for portable, versioned, auditable AI skills packaged as `SKILL.md`.

Inspired by omo.dev aesthetics and workflows. Includes a built-in **Librarian** AI archivist/explainer agent (registry-backed) that answers questions about the UI, skills, governance, providers, etc., and can stage safe commands directly into the Console.

Live demo: https://agent-skill-registry.vercel.app

## Features
- **Registry**: Browse, search, detail views for skills (with full SKILL.md rendering).
- **Builder**: Author new skills with validation, dedupe, governance gates.
- **Console**: Native `aiskill` commands + natural language; talk to Librarian inline.
- **Librarian**: Floating panel + in-console explainer. Combines contextual help, console-native, and live registry skills (especially `librarian:*` seeds). Uses real LLM (or rich mock). Always cites sources. Extracts stageable ```console blocks for one-click execution.
- **Providers**: Multi-provider config (OpenAI, Gemini, local, etc.) with role routing.
- **Governance**: T1–T4 trust tiers + G1–G4 gates (human approval for T4).
- **Evals / Sync / Doctor**: Simulated but realistic workflows.
- **Design**: Matches omo.dev (cyan accents, #0a0a0a ink, zinc panels, rounded-xl, backdrop-blur, "boulder of institutional knowledge").

## Quick Start

```bash
# 1. Install
npm install

# 2. Backend env (copy + edit)
cp backend/.env.example backend/.env.local
# Edit: DATABASE_URL (for Prisma), and for real LLM:
# AI_API_KEY=your_tetrate_or_openai_key
# AI_BASE_URL=https://api.router.tetrate.ai/v1   # or https://api.openai.com/v1
# AI_MODEL=gpt-4o-mini

# 3. Seed the DB (optional but recommended for full data + librarian:*)
cd backend
npx prisma migrate dev --name init   # or use existing
npx tsx seed.ts
cd ..

# 4. Run both (in two terminals or use concurrently)
npm run dev:backend   # http://localhost:8787
npm run dev           # http://localhost:5173
```

Open http://localhost:5173 — the app is fully usable in demo mode (yaml fallback + mock LLM) even without DB/key.

## Environment Variables

See `backend/.env.example` and `frontend/.env.example`.

Key ones for Librarian (real LLM):
- `AI_API_KEY` — Tetrate router JWT or OpenAI key (preferred)
- `AI_BASE_URL=https://api.router.tetrate.ai/v1`
- `AI_MODEL=gpt-4o-mini`
- Fallbacks: `OPENAI_API_KEY` + default model.

Without keys: rich mock responses using yaml + omo flavor + stageable commands.

## Seeding & Registry Source of Truth

- `registry.yaml` is the source of truth for skills (including the 5 `librarian:*` explainer seeds).
- `backend/seed.ts` loads via `loadRegistryFromYaml()` and upserts into Prisma (run it after DB migrations).
- Full `SKILL.md` bodies live as sidecar files (e.g. `shared/documentation/librarian-dashboard/SKILL.md`). The backend loads them on demand for Librarian context and SkillDetail views.
- To add more librarian knowledge: add entry to `registry.yaml` + create the `SKILL.md` under the path, then re-seed.

## Librarian Usage

- Click the floating **Librarian** button (bottom-right, cyan book icon) on any page.
- Or in Console, type natural language like:
  - `explain the dashboard`
  - `librarian how do I use governance?`
  - `what is a skill?`
- Answers are evidence-based, cite `librarian:*` + other registry skills, use calm archivist tone.
- Look for ```console blocks — click **Stage** to inject the command into the Console input for safe execution.
- "Save as skill" from the panel creates a draft `librarian:xxx` you can promote.

The system prompt for Librarian lives in `frontend/src/lib/librarian.ts` and backend `runLibrarianExplain`.

## Project Structure

- `frontend/` — Vite + React + TanStack Router + Tailwind v4 + shadcn-like ui
- `backend/` — Express + Prisma + yaml loaders + simulated runtime + real LLM proxy for Librarian
- `registry.yaml` — canonical skill list
- `shared/documentation/` — SKILL.md bodies for built-in explainer skills
- `providers.yaml` — provider/role config (used for seeding)

## Development Notes

- No Convex (despite CLAUDE.md template — this is a TanStack/Express app).
- API base: see `frontend/src/lib/api.ts` (proxies to backend or mocks).
- To test Librarian with real key: set AI_* in backend/.env.local, restart backend, ask in UI.
- Full bodies for all skills (not just librarian) are loaded via `loadSkillBody` for detail views and Librarian context.
- Staging commands: parsed in `extractStageableCommands`, injected via search param to `/console`.

## Polish / Roadmap Items (as of last session)

- [x] Seed librarian:* from yaml + full SKILL.md bodies loaded at runtime
- [x] Mock always blends yaml + flavor + stageables + bodies
- [x] LLM instructed for parseable console blocks
- [x] /api/skills + /:name now return real registry + skillMd bodies
- [ ] Run seed with real DB + test with real AI_API_KEY end-to-end
- [ ] More SKILL.md bodies for other skills in registry
- [ ] Persist Librarian chat history server-side (optional)
- [ ] Expose "teach Librarian" flow from Builder

## License / Notes

Demo/prototype only. Not for production. Provider keys and DB are your responsibility.

Contributions welcome — especially more portable skills and real runtime adapters.
