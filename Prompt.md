# Prompt: Build a 2.5D HD-2D Virtual Tabletop (VTT)

> Working project name: **DioramaTable** (rename freely)
> Read this entire file before doing anything, then follow the phases in order.
> Companion files in the repo root: `List_skill.md` (agent skills to install), and the two design documents you will write in Phase 0: `Engineering.md` and `Visual.md`.

---

## 0. Working Rules for Claude Code

1. Read this prompt and `List_skill.md` in full. Install the skills listed in `List_skill.md` before writing any code (Phase 0).
2. **Before writing any application code, write `Engineering.md` and `Visual.md`** (see Section 15, Phase 0). Then **stop and wait for the user to review and approve them**. Do not scaffold the app until they are approved.
3. Create `CLAUDE.md` summarising architecture, common commands, current phase, and decisions made. Update it at the end of every phase.
4. Work one phase at a time (Section 15). Do not skip phases. Do not start the next phase while `npm run build`, `npm run typecheck` or `npm test` fails.
5. Commit at the end of every phase with the message `phase-N: <summary>`.
6. If a decision is not covered by this prompt and affects architecture (e.g. adding a paid service, replacing a core library), stop and ask. For small decisions, choose a sensible default and record it in `CLAUDE.md`.
7. **Mobile performance is a core requirement, not a polish task.** Every visual feature must ship with a Low-quality path from its first implementation.
8. Do not copy code, UI, logos or assets from Owlbear Rodeo, Roll20 or Octopath Traveler. Use them only as UX and visual-style references.

---

## 1. Product Overview

A web VTT as easy to use as Owlbear Rodeo, with token/stat handling inspired by Roll20, rendered as a **2.5D scene** the camera can orbit a full 360°, with **HD-2D lighting** (the Octopath Traveler principle): 2D sprites/tokens standing in a 3D world, lit by scene lights, casting shadows, with tilt-shift depth of field, bloom and a moving background.

### Signature features (what makes this product different)
1. **Full 360° 2.5D camera** with tokens that re-orient correctly to any view angle.
2. **HD-2D lighting** that runs on mobile.
3. **Multi-level scenes**: several stacked floors simulated in **one scene at the same time** (e.g. one party on floor 2, another group on floor 1), see Section 8.
4. **Side Tool Rail**: a varied, easy-to-pick tool set docked on the left or right edge of the screen, see Section 14.

### Users
- **GM**: creates rooms, builds maps and levels, places tokens, sets lighting and atmosphere, sees everything.
- **Player**: joins via link, moves own tokens, rolls dice, attacks targets with automatic HP reduction.

Must run smoothly on **mid-range phones** and desktop browsers.

---

## 2. Tech Stack

| Area | Choice | Reason |
|---|---|---|
| Build | Vite + React + TypeScript (strict) | Light SPA, deploys to Vercel as-is |
| 3D | three.js + @react-three/fiber + @react-three/drei | Mature ecosystem, easy instancing/billboards |
| Post-processing | `postprocessing` via @react-three/postprocessing | Merges effects into one pass, cheap on mobile |
| State | zustand (transient updates for per-frame values) | No per-frame React re-renders |
| Dice physics | @dimforge/rapier3d-compat (lazy-loaded, in a Web Worker) | Fast WASM, loaded only when rolling |
| Local DB | Dexie (IndexedDB) | Demo mode without a backend |
| Cloud DB / Realtime / Storage / Auth | Supabase (Postgres + Realtime + Storage) | Free tier, flexible Postgres + JSONB |
| Validation | zod | Validate every record entering/leaving the DB |
| UI | Tailwind CSS | Fast mobile-first styling |
| Test | Vitest (logic), Playwright (smoke) | |
| Deploy | GitHub → Vercel | |

---

## 3. Camera and 2.5D View

- Perspective camera with **low FOV (about 25–35°)** for the HD-2D diorama look.
- **Orbit around a focus point**: azimuth free through 360°, polar clamped to about 25°–75° to keep the 2.5D feel (adjustable in Settings).
- Controls:
  - Desktop: right-drag to rotate, middle-drag or Space+drag to pan, scroll to zoom, Q/E to rotate in 45° steps, PageUp/PageDown to change active level.
  - Mobile: one-finger drag on empty space = pan, two-finger twist = rotate, pinch = zoom, two-finger vertical drag = tilt.
- 45° snap button and a "reset view" button.
- Toggle **Top-down Tactical View** (orthographic, straight down) for measuring.
- Rotation is smoothed with damping and must never make tokens jitter.
- When the active level changes (Section 8), the camera focus height animates to that level's elevation.

---

## 4. Token System

### 4.1 Display modes (per token)
1. **Flat**: classic circular D&D token lying on the ground. When the camera rotates, rotate the image around the Y axis so its top always points away from the camera (never upside down).
2. **Standee**: circular token standing upright on a ring base. Use a **cylindrical billboard** (rotate only around Y to face the camera position, no pitch). The ring base always lies flat on the floor.
3. **Pop-out**: like Standee, but the character breaks out of the top of the frame (as in the user's bear reference image). Requires a transparent PNG. Two layers: a circular frame layer behind, and a character layer masked only below the circle's lower half so the upper part may overflow the frame.
4. (Optional) **Directional sprite**: if the user uploads a 4- or 8-direction sprite sheet, choose the frame from the angle between token facing and camera direction.

### 4.2 Token import
- Drag-and-drop, upload, or pick from the asset library.
- Automatic circular crop with adjustable zoom and offset.
- Ring colour and style (to distinguish player / enemy / NPC).
- Size categories: Tiny 0.5, Small/Medium 1, Large 2, Huge 3, Gargantuan 4 cells.
- Resize client-side to max 512 px and convert to WebP before upload.

### 4.3 Stats
- Right after import, the user can set **HP (current/max/temp), AC**, Initiative, Speed, Resistances/Vulnerabilities/Immunities, Conditions and **unlimited custom fields**.
- Stats follow a **Stat Template** per game system (ship D&D 5e, Pathfinder 2e and Generic; the GM can create templates). See Section 10.
- HP bar and name above tokens are WebGL sprites / instanced meshes (no per-token HTML overlay; it is very slow on mobile with many tokens).
- HP visibility is a room setting: full numbers / bar only / word status (Healthy, Bloodied, Down) / hidden.
- Tokens hidden by the GM are invisible to players, and their data must never be sent to player clients.

### 4.4 Movement
- Drag-and-drop with grid snapping (square and hex), live distance while dragging (ft/m configurable).
- Smooth animated movement that follows ground height, and stairs between levels (Section 8).
- Measuring tool and area templates (circle, cone, line, square). Measurement accounts for vertical distance between levels.

---

## 5. HD-2D Lighting and Shadows

Required principles (Octopath Traveler style, per the user's reference image):

1. **Sprites/tokens are lit by scene lights**: approaching a torch brightens and tints them. Light with a camera-facing normal tilted slightly upward, or evaluate lighting at the sprite centre in the vertex shader (cheaper on mobile).
2. **Token shadows must not change shape when the camera rotates**: use a shadow proxy separate from the visible sprite: an invisible plane facing the **light direction** (not the camera) with `customDepthMaterial` + alphaTest from the token image, so the shadow keeps the character's silhouette. Low quality uses a blob shadow (soft ellipse).
3. **Tilt-shift depth of field**: blur top and bottom of the screen cheaply: half-resolution blur blended by a screen-space Y mask (no full bokeh DOF on mobile).
4. **Bloom** at half resolution for fire and magic.
5. **Vignette + colour grading** (LUT presets: Warm Day, Dusk, Night, Dungeon, Cold).
6. **Point lights** with colour, radius, intensity and flicker for torches/campfires.
7. **Fake god rays** using additive cone meshes instead of volumetrics.
8. **Particles**: dust motes, fireflies, embers via instanced points (count by quality preset).
9. Pixel-art assets use `NearestFilter` for crisp HD-2D pixels.
10. **Level-aware lighting**: a light belongs to a level and must not light floors above or below through a solid floor slab (use light layers / per-level masks; light passes through only where the slab has openings). See Section 8.

### Light budget by quality
| Preset | Dynamic point lights | Shadow map | Token shadow |
|---|---|---|---|
| Low | 2 | Off (blob only) | Blob |
| Medium | 4 | 1024, key light only | Proxy shadow |
| High | 8 | 2048 | Proxy shadow |

Lights over budget: only the N lights nearest the camera focus (prioritising the active level) are real lights; the rest render as "fake lights" (glow sprite + additive light decal on the floor).

---

## 6. Moving Background and Atmosphere

- **Skydome** with shader-scrolled clouds and time-of-day gradient.
- **Parallax layers** in the distance (mountains, forest, castle) as several billboard layers that move slower than the scene as the camera rotates.
- **Cloud shadows**: scrolling noise texture multiplied into the key light (very cheap, makes the scene feel alive).
- **Wind sway** for grass/trees in the vertex shader (no physics).
- Simple animated **water shader**.
- **Day/Night slider** and **Weather** (rain, snow, fog) as camera-attached particles, not map-wide.
- **Animated battle maps** like Owlbear: ground as video (WebM/MP4) or sprite sheet, capped at 1080p, paused when the tab is inactive.

---

## 7. Map Builder (must be easy)

- **New Map Wizard**: size (20×20 to 60×60 cells), grid (square/hex), starting template (forest clearing, dungeon, two-storey tavern, village, empty) → a playable map immediately.
- Tools (all exposed through the Tool Rail, Section 14, touch and mouse):
  - **Terrain paint**: grass, dirt, stone, sand, water, wood floor, snow.
  - **Height**: raise/lower/flatten in integer steps (diorama style); cliff sides textured automatically.
  - **Props**: place from library, rotate 90°, scatter brush for trees/grass/rocks (random scale/rotation).
  - **Walls/Buildings**: modular pieces (wall, door, window, roof, railing) snapped to grid.
  - **Floors & Stairs**: see Section 8.
  - **Lights**: torch, campfire, lantern, magic light; colour/radius/intensity/flicker.
  - **Select / Move / Erase** and **Undo/Redo** (command pattern around every action).
- **Import a 2D battle map image** as the ground of any level, then add 3D props and lights on top.
- **Environment panel**: time of day, sky preset, fog, weather, wind, colour grading.
- Terrain is built in 16×16-cell chunks per level, merged per chunk; only dirty chunks rebuild.
- Export/Import map as JSON.

---

## 8. Multi-Level Scenes (signature feature)

Goal: simulate **several stacked floors in one running scene at the same time**. Example: the players are on floor 2 of a tavern while bandits are on floor 1; both groups, their lights and their actions are live in the same scene, and the GM and players can see and interact across levels.

Distinguish two concepts:
- **Height** (Section 7): one continuous ground surface with steps and cliffs (a heightfield).
- **Levels**: separate stacked floors that **overlap in X/Y** (a room above a room), which a heightfield cannot express.

### 8.1 Data and structure
- A map owns an ordered list of **levels**. Each level has: id, name ("Cellar", "Ground Floor", "Floor 2", "Roof"), elevation (world Y), floor-to-ceiling height, its own terrain/floor cells, walls, props, lights and environment overrides.
- Floor slabs are painted per cell, so **openings** are possible (balconies, atriums, collapsed floors, pits). Through an opening, a lower level is visible and line of sight passes.
- **Connectors** link levels: stairs, ladders, ramps, trapdoors, elevators/teleport circles. Each connector stores its two endpoints (level + cell).
- Every token and map object has a `levelId`.

### 8.2 Viewing
- **Active level** selector (Tool Rail level switcher + keyboard PageUp/PageDown + mobile buttons). The camera focus follows it.
- View modes (switchable at any time):
  1. **All levels** – everything visible.
  2. **Cutaway** (default) – levels above the active level fade out with dithered transparency (cheap, no sorting issues) or hide entirely; roofs auto-hide when the active level is below them.
  3. **Focus** – only the active level, other levels hidden.
- Tokens on other levels remain visible (according to the view mode) so a player on floor 2 can see enemies below through a balcony opening.
- A small **level indicator** on each token's label (e.g. "F2") when tokens from different levels are on screen.

### 8.3 Interaction
- Moving a token onto a connector offers "go up/down" and animates it along the connector to the other level.
- The GM can set a token's level directly from the stats panel.
- Measuring, area templates and attack range include vertical distance between levels.
- Area templates can be marked as single-level or multi-level (e.g. a fireball through an opening).
- Picking/raycasting only hits the active level by default; a toggle allows picking on any visible level.

### 8.4 Lighting and performance
- Lights are assigned to their level; floor slabs occlude them except through openings (Section 5, rule 10).
- Faded/hidden levels use cheap materials and are culled from shadow passes.
- Chunk culling and draw-call budget are counted across all visible levels together.
- Template "Two-storey tavern" must demonstrate: ground floor, upper floor with balcony opening, cellar, stairs, and lights on each level.

---

## 9. Dice System

- Support **D4, D6, D8, D10, D12, D20, D100** (D10 is required because D100 = two D10: tens 00–90 + units 0–9; 00+0 = 100).
- **Dice tray**: choose each die type + count + modifier, Advantage/Disadvantage buttons, notation input.
- **Notation parser**: `2d6+3`, `1d20+5`, `4d6kh3` (keep highest), `2d20kl1`, `d%`, combined groups `1d8+2d6+4`. Full unit test coverage.
- **3D animation**:
  - The real result is generated with `crypto.getRandomValues` **before** the animation starts.
  - Simulate physics with Rapier in a Web Worker, play back on the main thread.
  - When the resting face is known, **remap the numbers on the die face texture** so the face showing up equals the pre-generated result. The result is always correct; the animation is cosmetic.
  - Other clients receive only `{notation, results}` and play their own animation (visuals may differ, results are identical).
  - Build die geometry in code (D10 = pentagonal trapezohedron); numbers from a canvas texture atlas; several dice colour themes.
  - Dice roll on a table in the scene or in an overlay tray (setting).
- **2D fallback** animation for Low quality or Reduced Motion.
- **Roll log** for the room, secret GM rolls, results float above the rolling token.

---

## 10. Database (flexible, ready to change)

### 10.1 Architecture
- A central `DataAdapter` interface (rooms, maps, levels, tokens, assets, rolls, events, realtime subscribe) with two implementations:
  - `LocalAdapter` – Dexie/IndexedDB + `BroadcastChannel` (multi-tab testing); used when Supabase env vars are absent.
  - `SupabaseAdapter` – Postgres + Realtime + Storage.
- UI and game logic go through `DataAdapter` only. Never call Supabase from components, so the backend can be swapped later.
- Every record has a zod schema and `schemaVersion` with client-side migrate functions.
- System-specific data is stored as **JSONB** validated by Stat Templates; adding a game system never requires a table change.

### 10.2 Core tables (Postgres)
```
rooms            (id, name, owner_id, settings jsonb, created_at)
room_members     (room_id, user_id, role: 'gm'|'player'|'spectator', display_name)
maps             (id, room_id, name, grid jsonb, environment jsonb, active_level_id,
                  schema_version int, updated_at)
map_levels       (id, map_id, name, sort_order int, elevation real, ceiling_height real,
                  floor_cells jsonb, terrain jsonb, environment_override jsonb, updated_at)
level_connectors (id, map_id, kind: 'stairs'|'ladder'|'ramp'|'trapdoor'|'teleport',
                  from_level_id, from_cell jsonb, to_level_id, to_cell jsonb, data jsonb)
map_objects      (id, map_id, level_id, kind: 'prop'|'light'|'wall', asset_id,
                  transform jsonb, data jsonb, updated_at)
tokens           (id, map_id, level_id, owner_user_id, name, asset_id, display_mode, size,
                  position jsonb, facing real, stat_template_id, stats jsonb,
                  actions jsonb, visibility, updated_at)
stat_templates   (id, room_id nullable, system, name, fields jsonb, schema_version)
assets           (id, room_id nullable, owner_id, type, url, meta jsonb, license jsonb)
dice_rolls       (id, room_id, user_id, notation, results jsonb, total, visibility,
                  target_token_id nullable, created_at)
combat_events    (id, room_id, type, payload jsonb, created_by, undone bool, created_at)
```

Example `stats`:
```json
{
  "hp": { "current": 22, "max": 30, "temp": 0 },
  "ac": 15,
  "initiative": 2,
  "speed": 30,
  "damageMods": { "resist": ["fire"], "vuln": [], "immune": ["poison"] },
  "conditions": ["prone"],
  "custom": { "spellSaveDC": 14 }
}
```

Example `stat_templates.fields`:
```json
[
  { "key": "hp", "type": "resource", "label": "HP", "bar": true, "visibleTo": "room-setting" },
  { "key": "ac", "type": "number", "label": "AC", "visibleTo": "gm" },
  { "key": "spellSaveDC", "type": "number", "label": "Spell Save DC", "path": "custom.spellSaveDC" }
]
```

### 10.3 Supabase
- All migrations in `supabase/migrations/`, plus `supabase/seed.sql` for the demo room.
- **Row Level Security** on every table: players edit only their own tokens, GM edits everything in the room, hidden tokens readable only by the GM.
- Realtime: **Broadcast** for in-progress token drags (throttled ~15/s), persist to DB only on drop (debounced). **Presence** for who is online.
- Conflicts: last-write-wins by `updated_at`.
- Client uses the anon key only.
- Anonymous sign-in + display name (no mandatory account).

---

## 11. Automatic HP Reduction from Players

Flow:
1. Player selects their token and taps a target token (any visible level).
2. Picks an action from the token's `actions` list (name, attack bonus, damage dice, damage type) or rolls manually.
3. Attack roll (d20 + bonus) against target AC → Hit / Miss / Critical (natural 20 doubles damage dice). AC is never revealed to players; they see only Hit/Miss.
4. Damage roll → apply Resist (half, round down), Vuln (double), Immune (0) → subtract Temp HP first, then HP.
5. Record a `combat_events` row, show floating numbers above the target, shake/red-flash animation.
6. HP reaches 0 → Down state (token visual changes).

Room settings:
- **Auto-apply** (immediate) or **GM confirm** (GM gets a prompt to confirm/edit the numbers).
- AC comparison can be disabled for non-d20 systems (leaving generic "Apply damage / Heal" buttons).
- GM can **undo** any event; state is recomputed from the event log.
- Healing and multi-target damage (e.g. Fireball) are supported.

All calculations are pure functions with full unit tests, separate from UI.

---

## 12. Free, Usable Assets

- Use only assets with clear licences, **CC0 first**:
  - Kenney.nl (CC0) – props, tiles, UI, pixel sets
  - Quaternius (CC0) – low-poly models
  - Poly Haven (CC0) – textures, HDRIs
  - game-icons.net (CC BY 3.0 – credit required) – condition icons
- Every asset has an entry in `public/assets/manifest.json` (id, name, category, file, author, licence, source URL); generate `CREDITS.md` from the manifest.
- If an asset cannot be downloaded or its licence is unclear, **do not use it**; generate a procedural replacement (canvas texture, code geometry) and note it in `CLAUDE.md`.
- At least 8 sample tokens (warrior, mage, rogue, cleric, goblin, wolf, skeleton, bear), at least 30 props (including stairs, ladder, railing, floor slab pieces), 3 sample maps (one must be the multi-level tavern).
- Total repo assets ≤ ~40 MB; textures compressed to KTX2/WebP; models as GLB + Meshopt.

---

## 13. Mobile Performance (mandatory)

**Target**: a 30×30 map with 3 levels, 20 tokens, 200 props, 6 lights at Medium preset must reach ≥ 50 FPS on a mid-range phone (iPhone 11 / mid-range Android), and ≥ 30 FPS at Low on older devices.

Required techniques:
- **Render on demand** (`frameloop="demand"`): redraw only on change/animation; when only light ambient effects move, the background may tick at a reduced rate (e.g. 30 FPS) to save battery.
- **Auto quality**: measure FPS at start (drei `PerformanceMonitor`) and step presets down/up; user can override.
- **DPR cap**: mobile max 1.5, Low = 1.
- **InstancedMesh** for repeated props, grass, particles, HP bars, token bases.
- **Merged static geometry** per terrain chunk per level; texture atlases.
- Budgets: draw calls < 150, triangles < 300k (Medium), counted across all visible levels.
- Post-processing merged into one pass, half resolution on mobile, fully disabled at Low.
- Stop rendering when the tab is hidden (`visibilitychange`).
- **Code splitting**: map editor, dice physics, Supabase client load on demand. Main bundle (excluding three) < 300 KB gzip.
- Never `setState` every frame; use refs + zustand transient updates.
- Dispose geometry/material/texture whenever objects are removed. Memory < 300 MB.
- Debug overlay (FPS, draw calls, triangles, real light count, visible levels) via `?debug=1`.

---

## 14. UI/UX and the Side Tool Rail

### 14.1 Tool Rail (signature feature)
A vertical rail docked on the **left or right edge** of the screen (user setting; default right, swap for left-handed use). It must offer a **wide variety of tools that are easy to find and pick**:

- Grouped sections with dividers, icon + short label, tooltip with shortcut on desktop:
  - **Play**: Select, Move, Measure, Area Templates, Ping/Pointer, Draw/Annotate, Target
  - **Tokens**: Token Library, Import Token, Stats Panel, Conditions
  - **Dice**: Dice Tray, Quick d20, Roll Log
  - **Combat**: Initiative Tracker, Apply Damage/Heal, Combat Log (Undo)
  - **Build** (GM): Terrain, Height, Props, Walls, Floors & Stairs, Lights, Erase
  - **Levels**: Level Switcher (current level always visible on the rail), View Mode (All / Cutaway / Focus)
  - **Scene**: Camera presets (snap 45°, reset, top-down), Environment, Quality
  - **Room**: Players, Share Link, Settings
- Clicking a tool opens a **flyout panel** beside the rail with that tool's options (brush size, colour, asset grid with search, etc.).
- **Pinned/favourite tools** at the top of the rail; drag to reorder.
- **Command palette** (Ctrl/Cmd+K) to search any tool by name.
- **Role-aware**: players see Play/Tokens/Dice/Combat/Levels/Scene; the GM sees everything.
- Keyboard shortcuts for every tool, listed in a help sheet.
- Mobile: the rail becomes a slim edge rail within thumb reach; flyouts open as half-height sheets; the rail can collapse to a single handle. Touch targets ≥ 44 px.

### 14.2 General
- Mobile-first layout; the scene is never covered by more than one panel at a time on phones.
- Languages: **Thai and English** (i18n switch).
- Home page: create room / join by link / open demo instantly.
- Initiative tracker with turn order.
- Reduced Motion support.

---

## 15. Development Phases

Every phase must meet its acceptance criteria before the next starts.

**Phase 0 – Skills & Design Documents (no app code)**
1. Install skills from `List_skill.md`; confirm with `npx skills list`.
2. Write **`Engineering.md`** covering at least:
   - System architecture diagram (Mermaid) and module boundaries
   - Rendering pipeline: billboards, proxy shadows, post-processing chain, quality presets
   - Multi-level system design: data model, cutaway/dither approach, level-aware light occlusion, picking rules, connectors
   - Data model, `DataAdapter` interface, migrations, RLS policy list
   - Realtime sync protocol (message types, throttling, conflict handling)
   - Dice algorithm (generation, worker simulation, face remap) and combat pure-function design
   - Performance budget table and how each budget is measured
   - Test plan per module
   - Risks with mitigations, and open questions for the user
3. Write **`Visual.md`** covering at least:
   - Art direction for HD-2D (references by description only, no copied assets), colour palettes, LUT presets
   - Token visual specs for Flat / Standee / Pop-out (sizes, ring styles, faction colours, HP bar, labels, level badge)
   - Lighting moods per preset and what changes between Low / Medium / High
   - Multi-level visuals: cutaway dithering, roof hiding, level badges, level switcher
   - UI layout wireframes (ASCII) for desktop and mobile, including the Tool Rail on both sides, flyouts and sheets
   - Iconography, typography (Thai + Latin), spacing, motion (dice, damage numbers, token movement), Reduced Motion
   - Accessibility: contrast, touch targets, colour-blind-safe faction colours
4. **Stop and wait for the user's approval.**
✅ User has approved both documents.

**Phase 1 – Scaffold**
Vite + React + TS + Tailwind + R3F, ESLint/Prettier, Vitest, Playwright, folder structure, `CLAUDE.md`, empty deploy to Vercel.
✅ Build passes, blank page live on Vercel.

**Phase 2 – Scene, Camera, Grid, UI Shell**
Square/hex grid, orbit camera with all gestures (Section 3), top-down mode, quality presets, debug overlay, and the **Tool Rail shell** (left/right docking, groups, flyouts, command palette, mobile edge rail).
✅ Smooth 360° rotation on a real phone; rail switches sides and works by touch.

**Phase 3 – Tokens**
Import, circular crop, 3 display modes, billboarding, snapping, animated movement, instanced names + HP bars.
✅ 20 tokens all face correctly while rotating, no frame drops.

**Phase 4 – HD-2D Lighting & Moving Background**
Point lights + flicker, proxy shadows, blob shadows, tilt-shift, bloom, LUTs, particles, skydome, parallax, cloud shadows, wind sway, day/night, weather, light budgets.
✅ Sample scene reads as an HD-2D diorama and meets Section 13 targets.

**Phase 5 – Map Builder + Assets**
All tools in Section 7, undo/redo, chunked terrain, asset manifest + credits, sample maps.
✅ A new map from a template can be made playable in under 5 minutes.

**Phase 6 – Multi-Level Scenes**
Everything in Section 8: levels, floor cells with openings, connectors, view modes, cutaway dithering, level-aware lights, cross-level measuring/picking, the two-storey tavern template.
✅ In one scene, a group on floor 2 and a group on floor 1 can act simultaneously; lights do not leak through solid floors; Section 13 targets still met with 3 levels.

**Phase 7 – Dice**
Parser + tests, all 3D dice, worker physics, face remap, 2D fallback, roll log.
✅ Displayed die faces match generated results 100% (tested).

**Phase 8 – Stats & Combat Automation**
Stat templates, stats panel, visibility rules, automatic HP reduction flow, undo, healing, multi-target.
✅ Unit tests cover Resist/Vuln/Immune/Temp HP/Crit.

**Phase 9 – Data Layer & Multiplayer**
`DataAdapter`, LocalAdapter (+BroadcastChannel), SupabaseAdapter, migrations, RLS, realtime sync, demo seed.
✅ Two devices in one room see token moves and dice rolls identically; players cannot see hidden tokens.

**Phase 10 – Mobile Performance Pass & Polish**
Measure and fix everything in Section 13, i18n, PWA (optional), Playwright smoke tests.
✅ FPS and bundle-size measurements recorded in `CLAUDE.md`.

**Phase 11 – Deploy**
See Section 16.
✅ Demo link works both without Supabase (local demo) and with Supabase.

---

## 16. Deploy on GitHub + Vercel

- `vercel.json` with an SPA rewrite of all paths to `index.html`.
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. If missing, the app enters **Local Demo mode** automatically with an on-screen badge.
- `README.md` must cover: running locally, creating the Supabase project and running migrations, connecting GitHub to Vercel and setting env vars, known limitations.
- GitHub Actions: typecheck + test + build on every pull request.

---

## 17. Suggested Folder Structure

```
Engineering.md  Visual.md  List_skill.md  CLAUDE.md  Prompt.md
src/
  app/            # routing, providers, i18n
  scene/          # camera, grid, terrain chunks, environment, postfx, quality
  levels/         # level stack, floor cells, connectors, cutaway, level-aware lights
  tokens/         # display modes, billboard, shadows, import/crop
  editor/         # map builder tools, commands (undo/redo)
  dice/           # parser, geometry, worker, animation, tray UI
  combat/         # damage logic (pure), actions, initiative
  data/           # DataAdapter, local/, supabase/, zod schemas, migrations
  ui/
    tool-rail/    # rail, groups, flyouts, command palette, shortcuts
    panels/       # shared panels and sheets
  assets/         # manifest loader
public/assets/    # free assets + manifest.json
supabase/         # migrations, seed.sql
tests/            # vitest + playwright
```

---

## 18. Out of Scope for v1

Line-of-sight fog of war, voice/video chat, full character sheets, asset marketplace, server-authoritative dice (v1 rolls client-side). Design so none of these are blocked later.
