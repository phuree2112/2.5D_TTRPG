# DioramaTable

A web virtual tabletop rendered as a lit 2.5D miniature diorama: a 360° camera, HD-2D lighting that runs on phones, multi-level scenes, and a side Tool Rail.

Status: early development (Phase 1 of 11). See `Prompt.md` for the brief, `Engineering.md` and `Visual.md` for the design.

## Run locally

Requirements: Node.js 22.18 or newer.

```bash
npm install
```

```bash
npm run dev
```

Without Supabase settings the app runs in **Local Demo mode**: everything is stored in your browser and a "Local demo" badge is shown.

### Checks

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

```bash
npx playwright install chromium webkit
```

```bash
npm run test:e2e
```

## Supabase (multiplayer)

Arrives in Phase 9. To prepare, copy `.env.example` to `.env.local` and set:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your project URL, `https://<ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your publishable key (`sb_publishable_…`). The legacy `VITE_SUPABASE_ANON_KEY` also works |

Creating the project and running the migrations in `supabase/migrations/` will be documented here in Phase 9.

## Deploy (GitHub + Vercel)

1. Push this repository to GitHub.
2. In Vercel, import the repository. The framework preset is Vite; `vercel.json` adds the SPA rewrite and security headers.
3. Optionally add the two Supabase variables above under Project Settings → Environment Variables. Without them the deploy runs in Local Demo mode.

GitHub Actions (`.github/workflows/ci.yml`) runs typecheck, lint, format check, unit tests, build, bundle budgets and Playwright on every pull request.

## Agent skills

Claude Code skills are stored in `skill/`. Claude Code reads them from `.claude/skills`, which is a local link and is not committed. On Windows, recreate it from the repository root with:

```bash
powershell -Command "New-Item -ItemType Junction -Path .claude\skills -Target skill"
```

## Known limitations

- Phase 1 shows an empty table only.
- Free Supabase projects pause after a week without activity and allow 100 realtime messages per second; see `Engineering.md` §12.4.

## Credits

Asset and font credits will be generated into `CREDITS.md` from `public/assets/manifest.json`.
