# CLAUDE.md: DioramaTable

2.5D HD-2D virtual tabletop (React + React Three Fiber). Read `Prompt.md` (brief), `Engineering.md` (architecture, decisions D1–D16) and `Visual.md` (art and UX) before changing anything structural. Update this file at the end of every phase.

## Current phase

| Phase | Status |
|---|---|
| 0: Skills and design documents | Done. Approved 2026-10-17 with all recommended defaults (below) |
| 1: Scaffold | Done. Live on Vercel from https://github.com/phuree2112/2.5D_TTRPG (user confirmed 2026-10-18) |
| 2: Scene, camera, grid, UI shell | Done in code and CI. The user's phone check is still open |
| 3: Tokens | Done in code and tests (2026-10-18). Includes the user's HD-2D fix: tokens and nature are 2D pixel sprites that turn to face the camera |
| 4: HD-2D lighting and moving background | Done in code and tests (2026-10-18). Looks reviewed on a real GPU at day, dusk and night, Low/Medium/High |
| 5: Map builder and assets | Next |

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

- `src/app/`: shell (`App.tsx`), `state/` (zustand: `settings.ts` persisted, `session.ts` per visit, `useRole`, `useReducedMotion`).
- `src/scene/`: R3F canvas (lazy chunk). `core/` is pure math (grid, camera steps, gestures, quality presets and governor). `camera/` (CameraRig, touch gestures), `environment/` (demo table, atmosphere, sky, water, particles), `lighting/` (light pool), `sprites/` (billboards), `postfx/` (lazy composer), `quality/` (governor component). `overlay-scene.ts` + `overlay.tsx` draw table UI after post-processing. `camera-actions.ts` is the three-free bridge the DOM UI uses to drive the camera. `diagnostics.ts` publishes `window.__DIORAMA_DIAGNOSTICS__` (counters, preset, camera) for tests and `?debug=1`.
- `src/levels/`, `src/tokens/`, `src/editor/`, `src/dice/`, `src/combat/`: features. Pure logic lives in `core/`, `commands/`, `rules/` and must not import React, three.js, UI or storage.
- `src/data/`: `DataAdapter`, zod schemas, `local/` (Dexie), `supabase/` (the only place Supabase may be imported), `policy/`. `backend-config.ts` picks Local Demo vs Supabase.
- `src/ui/`: DOM UI, no direct three.js imports. `tool-rail/registry.ts` is the single tool list (rail, palette, help sheet and shortcuts all read it); `tool-rail/core/` is pure; the rail is compound components over the `rail-context.ts` contract. `panels/PanelHost.tsx` shows a flyout (desktop) or sheet (phone); only one panel is open at a time (`session.openPanel`).
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

Phase 2:

- **Auto quality uses our own governor, not drei `PerformanceMonitor`** [Δ Prompt §13]. PerformanceMonitor divides frames by wall-clock time, so an idle demand-rendered scene reads as ~1 FPS and would drop quality. `scene/core/quality.ts` only measures continuous rendering streaks (frames < 100 ms apart), steps down under 48 FPS, up at 57+, and locks after flip-flopping.
- **Every imperative camera move calls `invalidate()`.** camera-controls fires no event for an instant (no-transition) move, so with Reduced Motion or touch gestures drei never redrew. Found by the Q/E e2e test.
- Mouse uses camera-controls' own mappings (right = rotate, middle = ground-plane pan `SCREEN_PAN`, wheel = dolly); Space toggles left-drag to pan. camera-controls 3 removed `verticalDragToForward`. Touch is fully custom (`useTouchGestures`), because camera-controls has no two-finger twist.
- Camera focus is clamped to the map with `setBoundary` (Y fixed at 0 until levels arrive).
- Shadow map renders only on change (`shadowMap.autoUpdate = false`, `needsUpdate` from DemoTable). Antialiasing is fixed by the starting preset (context flag).
- Shortcuts: tool keys in `registry.ts` (unique, tested); Q/E camera; `?` help; `,` settings; Ctrl/Cmd+K palette; all single-character keys can be turned off (WCAG 2.1.4).
- Playwright runs 2 workers: SwiftShader is CPU-heavy and more workers timed out.
- **Local screenshot reviews: launch Chromium with `--use-angle=d3d11`.** SwiftShader draws a false opaque block over the canvas next to the scrolling phone sheet; the real GPU does not.
- The browser pane does not paint while the app window is hidden (no `requestAnimationFrame`), so use Playwright for visual checks.
- Camera tilt range is a setting (default 25°–75°; sliders 10–45° and 50–85°), applied live by CameraRig.

Phase 3:

- **User direction (2026-10-18): "2.5D like Octopath Traveler — 2D sprites that turn around the camera view."** Characters, trees, bushes and the campfire are pixel sprites (cylindrical billboards, `scene/sprites`, `tokens/render`); ground, pillars and crates stay 3D with pixel textures.
- All art is drawn in code (`scene/core/sprite-art.ts`, `tokens/core/sample-art.ts`), seeded so it is identical every load. The 8 sample tokens of Prompt §12 are pixel sprites.
- Sprite and upright-token lighting normal is tilted ~72° up (not 25° as in Engineering.md §7.3), so sprites take nearly the same light as the ground and are not dark when the sun is behind them.
- One instanced mesh draws all token faces and ring bases (`token-material.ts`: aMode 0 flat, 1 standee, 2 pop-out, 3 base). Token images live in a texture array (`LayeredTexture`, 256 px layers, grows by doubling).
- Labels: Canvas 2D into a texture array, constant screen size, capped at ~2.4 cells wide when zoomed out. Exact HP numbers show only on the selected token so a full table stays readable.
- Tokens claim pointers in the capture phase (`scene/pointer-ownership.ts`), so dragging a token never pans the camera.
- Tokens live in memory (`app/state/tokens.ts`) and uploads in `tokens/images.ts` until the data layer (Phase 9).
- Measure and Area templates moved to Phase 6 (they need cross-level measuring).
- e2e helpers wait for `__DIORAMA_DIAGNOSTICS__.tokens`; `projectToken(id)` gives a token's screen point.

Phase 4:

- **Light pool** (`scene/lighting/`): fixed-size uniform arrays patched into Lambert after `lights_fragment_end` (`DT_POOL` define = 2/4/8 per preset), view-space positions written per frame. Lights over the budget become fake lights: additive glow plus floor decal. Pool colour = preset colour × intensity × 14 × flicker.
- **Shadows**: invisible proxies on layer 1 turn toward the key light (`customDepthMaterial`), so sprite and token shadows keep their silhouette from any camera angle. Low uses blob decals. Cloud shadows multiply the key light's direct diffuse only.
- **Post-processing** (`scene/postfx/`, lazy chunk, Medium/High): Bloom (HDR threshold 1.6, so only flames and magic bloom) → tilt-shift → AgX → mood LUT → vignette. `LookupTexture` uploads FLOAT, so LUT data is a `Float32Array` (a `Uint8Array` gave a black screen).
- **TiltShift fix** [Δ postprocessing 6.39]: `LinearTiltShiftEffect` keeps the blur target linear with HalfFloat buffers (the library tags it sRGB and washes the image out by about +35 per channel) and replaces the hard band edge with a short ramp (the half-res seam showed across pixel art). `focusArea` is a half-width in units where 2 = screen height: 0.75 with feather 0.3 gives the 45 % sharp band of Visual.md.
- **Labels and HP bars draw after post-processing** (`scene/overlay-scene.ts`, `overlay.tsx`): they are portalled into an overlay scene, so blur, AgX and the grade never touch them, and they sit on top of scenery. `FinalRender` (priority 2) owns the end of the frame and draws the main scene itself when no composer is mounted.
- **Grade**: white balance is a channel gain and contrast is a power S-curve around 0.5, so night shadows keep detail instead of clipping to black. Tokens get a small light floor (5 % of albedo) so they stay readable far from lights.
- Moods were tuned from the Visual.md starting values (§4.1 now lists both). Unlit grid lines scale with the mood's light so they do not glow at night. Fireflies are 12 % of the dust count.
- **Ambient motion** (`AmbientTicker`, 20/30 Hz) runs only when the `ambientMotion` setting is on and Reduced Motion is off (WCAG 2.2.2). The quality governor measures only during activity (`scene/activity.ts`), so ambient ticks do not drop quality.
- `react-hooks/immutability` is off for `src/scene/**` and `src/tokens/render/**`: three.js objects are mutable by design.
- Diagnostics add `lights`, `postfx`, `ambientTicks` and `atmosphere` (key intensity, fog density, particles, weather), published per frame.

Open items carried from Phase 2:

- Pinned tools reorder with Alt+↑/↓ only; drag-to-reorder (Prompt §14.1) is not built yet.
- PageUp/PageDown, the level switcher and camera height per level wait for Phase 6 (the rail shows a placeholder "G" chip).
- One-finger pan and two-finger tilt are covered by unit tests of the gesture math, not by e2e tests.
- Thai UI text arrives with i18n in Phase 10; labels are English for now.

## Measurements

| Date | What | Result |
|---|---|---|
| 2026-10-17 | Main bundle (gzip) | 69 kB (budget 300 kB) |
| 2026-10-17 | Scene chunk: three.js + R3F (gzip) | 239 kB (budget 300 kB) |
| 2026-10-18 | Main bundle after Phase 2 (gzip) | 87 kB |
| 2026-10-18 | Scene chunk after Phase 2: + drei CameraControls (gzip) | 254 kB |
| 2026-10-18 | Demo table, headless Chromium | 16–21 draw calls, ~200–260 triangles; idle = 0 frames |
| 2026-10-18 | Main bundle after Phase 4 (gzip) | 97 kB |
| 2026-10-18 | Scene chunk after Phase 4 (gzip) | 273 kB |
| 2026-10-18 | PostFX chunk, lazy (gzip) | 30 kB (budget 60 kB) |
| 2026-10-18 | Phase 4 demo table, real GPU (D3D11) | Low 18–20 calls, Medium 39, High 40; ~2 100 triangles; lights real/fake 2/5, 4/3, 7/0 |

## Working agreements

- Use the installed skills (`skill/`) only where they improve the work; base decisions on established standards and primary sources.
- TDD for pure modules (`test-driven-development` skill): watch each test fail before writing the code.
- Every visual feature ships with its Low-quality path (Prompt §0.7).
- Commit at the end of each phase: `phase-N: <summary>`.
