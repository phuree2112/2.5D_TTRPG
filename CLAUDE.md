# CLAUDE.md: DioramaTable

2.5D HD-2D virtual tabletop (React + React Three Fiber). Read `Prompt.md` (brief), `Engineering.md` (architecture, decisions D1–D16) and `Visual.md` (art and UX) before changing anything structural. Update this file at the end of every phase.

## Current phase

| Phase | Status |
|---|---|
| 0: Skills and design documents | Done. Approved 2026-10-17 with all recommended defaults (below) |
| 1: Scaffold | Code done and verified locally. Vercel deploy pending (needs the user's GitHub/Vercel accounts) |
| 2: Scene, camera, grid, UI shell | Next |

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b` then production build to `dist/` |
| `npm run preview` | Serve `dist/` with the same security headers as `vercel.json` |
| `npm run typecheck` | TypeScript, all projects |
| `npm run lint` | ESLint (type-aware, module boundaries enforced) |
| `npm run format` / `format:check` | Prettier (Markdown is excluded on purpose) |
| `npm test` | Vitest unit tests (`src/**/*.test.ts`) |
| `npm run test:e2e` | Playwright against the production preview (builds first) |
| `npm run size` | Bundle budgets from `.size-limit.json` |

Do not start the next phase while `build`, `typecheck` or `test` fails (Prompt §0.4).

## Architecture in one screen

- `src/app/`: shell, routing, providers, `state/` (zustand, from Phase 2).
- `src/scene/`: R3F canvas (lazy chunk), camera, grid, terrain, environment, post-processing, quality, light pool. `diagnostics.ts` publishes `window.__DIORAMA_DIAGNOSTICS__` for tests.
- `src/levels/`, `src/tokens/`, `src/editor/`, `src/dice/`, `src/combat/`: features. Pure logic lives in `core/`, `commands/`, `rules/` and must not import React, three.js, UI or storage.
- `src/data/`: `DataAdapter`, zod schemas, `local/` (Dexie), `supabase/` (the only place Supabase may be imported), `policy/`. `backend-config.ts` picks Local Demo vs Supabase.
- `src/ui/`: DOM UI, Tool Rail, panels. No direct three.js imports.
- Boundaries are enforced by `no-restricted-imports` in `eslint.config.js`.

## Decisions in force

From `Engineering.md` §1 plus the approved defaults:

- WebGL2 + pmndrs `postprocessing`; demand rendering (`frameloop="demand"`).
- TypeScript pinned to 6.0.x (typescript-eslint supports `<6.1`). Do not upgrade to 7.x until it does.
- Env vars: `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`; legacy `VITE_SUPABASE_ANON_KEY` still accepted (Q2). Missing values = Local Demo mode with a badge.
- Q1: the GM's client resolves attacks in v1; Edge Function later.
- Q3: test devices iPhone 11 + one mid-range Android.
- Q4: enable Cloudflare Turnstile CAPTCHA for anonymous sign-ins on the public deploy.
- Q5: system names "5E (SRD 5.2)", "PF2E-compatible", "Generic", with attributions.
- Q6: private storage bucket + signed URLs, batched per room load.
- Q7: players see only the room's active map; edits to it stream live.
- V1–V6: dark UI only; Chakra Petch display + IBM Plex Sans Thai UI; pixel-art sample tokens; ring patterns; Thai terms reviewed by a native speaker before Phase 10; rail on the right by default.

## Small decisions made during the build

- `size-limit` and `@size-limit/file` pinned to 13.1.1: `@size-limit/file` has no 14.x release yet.
- Node `>=22.18` (size-limit's engine range). Node 22.15 runs everything with a warning.
- `window.__DIORAMA_DIAGNOSTICS__` types live in `src/scene/diagnostics-global.d.ts`, included by both tsconfigs, so Playwright tests type-check.
- `vite preview` reads its headers from `vercel.json`, so CSP problems show up in local e2e runs.
- Prettier ignores `*.md`: the design documents have wide tables and ASCII wireframes.
- `.claude/skills` is a local junction to `skill/` and is git-ignored. Recreate it with the command in `README.md`.

## Measurements

| Date | What | Result |
|---|---|---|
| 2026-10-17 | Main bundle (gzip) | 69 kB (budget 300 kB) |
| 2026-10-17 | Scene chunk: three.js + R3F (gzip) | 239 kB (budget 300 kB) |

## Working agreements

- Use the installed skills (`skill/`) only where they improve the work; base decisions on established standards and primary sources.
- TDD for pure modules (`test-driven-development` skill): watch each test fail before writing the code.
- Every visual feature ships with its Low-quality path (Prompt §0.7).
- Commit at the end of each phase: `phase-N: <summary>`.
