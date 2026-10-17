# Visual.md: DioramaTable

> **Status:** Draft for review (Phase 0).
> **Date:** 2026-10-17
> **Companion documents:** `Prompt.md` (the brief), `Engineering.md` (how each visual is built and its Low-quality path).
> All visual references are described in words. No assets, logos or UI are copied from Owlbear Rodeo, Roll20 or Octopath Traveler (Prompt §0.8).

---

## Contents

1. [Design principles](#1-design-principles)
2. [Art direction: HD-2D diorama](#2-art-direction-hd-2d-diorama)
3. [Tokens](#3-tokens)
4. [Lighting moods and quality presets](#4-lighting-moods-and-quality-presets)
5. [Multi-level visuals](#5-multi-level-visuals)
6. [Interface design system](#6-interface-design-system)
7. [Layouts and wireframes](#7-layouts-and-wireframes)
8. [Motion](#8-motion)
9. [Accessibility](#9-accessibility)
10. [Words](#10-words)
11. [Open visual questions](#11-open-visual-questions)
12. [Appendix: skills and standards used](#12-appendix-skills-and-standards-used)

---

## 1. Design principles

1. **The diorama is the hero.** The interface is a quiet frame around a lit miniature world. Chrome is dark, compact and pushed to the edges. On a phone, no more than one panel covers the scene at once.
2. **Light tells the story.** Warm pools of torchlight against cool shadow are what make a scene read as HD-2D. The interface borrows this: the active tool, the active level and focus are "lit" with the same lantern colour the world uses for firelight.
3. **The tray is the signature.** The Tool Rail looks like the felt-lined tray a group keeps its dice and minis in: a soft, dark, slightly textured strip where tools sit like pieces. This is the one place the interface spends boldness. Everything else stays plain.
4. **Every visual has a Low path.** Each effect in this document has a stated look at Low quality (§4.3). A feature without one is not done.
5. **Never by colour alone.** Factions, HP states and levels are coded by colour *and* shape, pattern or text.

---

## 2. Art direction: HD-2D diorama

### 2.1 The look, in words

A tabletop miniature photographed with a macro lens:

- **Camera:** a low field of view (30°) looking down at about 55°, so the scene feels like a model on a table rather than a game world.
- **Depth:** the top and bottom of the screen fall softly out of focus (tilt-shift). Only a horizontal band through the middle is sharp, which makes everything look small and handmade.
- **Characters** are flat pixel-art figures standing upright in a smooth 3D world. They catch the light of nearby torches: a figure walking toward a campfire warms up and brightens on the side facing it.
- **Light:** warm, saturated pools (fire, lanterns, magic) against cooler, desaturated shadows. Bloom only on flames, magic and bright sky, never on ordinary surfaces.
- **Air:** dust motes in light shafts, slow clouds whose shadows drift across the ground, grass that sways, a soft vignette, a little haze in the distance.
- **World materials:** chunky low-poly props with flat, hand-painted palette colours; terrain tiles with crisp pixel texture; stone, timber, thatch, moss.

### 2.2 Pixel and texel density

| Element | Source resolution | Notes |
|---|---|---|
| Pixel-art token (sample set) | 64 × 64 px, upscaled ×8 nearest-neighbour to 512 × 512 | Keeps hard pixel edges after GPU mipmapping |
| User-uploaded token | Any, cropped and resized to ≤ 512 × 512 WebP | Painted art is fine too; the lighting treats both the same |
| Terrain tile | 32 × 32 px per cell | `NearestFilter` magnification |
| Prop textures | Shared palette atlas (Kenney/Quaternius style), 256–1 024 px | Flat colours, no fine detail to shimmer |
| Parallax backdrops | 2 048 × 512 px per layer, alpha | Mountains, forest, castle silhouettes |

Pixel scale rule: at the default zoom on a phone, one token pixel should cover 2–4 screen pixels. Fewer looks blurry; more looks blocky.

### 2.3 Composition defaults

| Setting | Default | Range |
|---|---|---|
| Field of view | 30° | 25–35° |
| Camera polar angle | 55° from vertical | 25–75° |
| Tilt-shift sharp band | 45 % of screen height, centred 5 % below middle | Follows the camera focus |
| Vignette | darkness 0.35 | per mood (§4.1) |

### 2.4 World palette

Shared across moods; the LUT (§4.1) shifts them.

| Name | Hex | Use |
|---|---|---|
| Hearth | `#FF9A3C` | Torch, campfire and lantern light |
| Arcane | `#8F7CFF` | Magic lights, teleport circles |
| Moss stone | `#6E7F5E` | Dungeon walls, ruins |
| Oak | `#8A5A36` | Timber floors, tavern furniture |
| River | `#3C8FA6` | Water base |
| Thatch | `#C9A55B` | Roofs, dry grass, sand |
| Shade | `#1E2A3A` | Shadow tint (cool), fog at night |

---

## 3. Tokens

### 3.1 Sizes

Diameter is 90 % of the occupied cells, leaving a gap so neighbouring rings never merge.

| Category | Cells | Diameter (cells) | Standee height (cells) | Pop-out character height (cells) |
|---|---|---|---|---|
| Tiny | 0.5 | 0.45 | 0.55 | 0.6 |
| Small / Medium | 1 | 0.9 | 1.1 | 1.2 |
| Large | 2 | 1.8 | 2.2 | 2.4 |
| Huge | 3 | 2.7 | 3.2 | 3.6 |
| Gargantuan | 4 | 3.6 | 4.2 | 4.8 |

### 3.2 Display modes

```
 FLAT (lies on the floor)      STANDEE (upright disc)        POP-OUT (art breaks the frame)

                                    .-----.                         /\_/\
     _________                     /       \                      ( o.o )   <- character overflows
    /  ( o )  \  <- image         |  ( o )  |                    .-( > )-.     the top half only
   |   /|\    |    top points     |  /|\    |                   /   /|\   \
    \___/_\___/    away from       \  / \  /                   |    / \    |  <- frame: lower half
        ring       the camera       '-----'                     \         /     masks the character
                                   ===[===]===  <- ring base     '-------'
                                     (flat)                     ===[=====]===
```

- **Flat:** circular image in a ring, lying on the ground. It turns around the vertical axis so its top always points away from the camera. Best for the top-down tactical view and for crowds.
- **Standee:** the same disc standing upright on a flat ring base, always turned toward the camera (no tilt). The base ring stays flat on the floor and shows the faction style (§3.3).
- **Pop-out:** a frame disc behind the character. The character art is clipped by the circle only in its lower half, so heads, weapons, wings and ears rise out of the frame. Needs a transparent PNG.
- **Directional sprite (optional):** a 4- or 8-direction sheet. The frame shown depends on the token's facing relative to the camera.

**Artwork safe area:** keep faces and key details inside the inner 80 % of the circle. The ring covers the outer 6 %.

### 3.3 Faction rings

Colours are from the Okabe & Ito colour-blind-safe palette. Each faction also has its own ring **pattern**, so the colour is never the only cue. Every ring has a 1-pixel `#0B1216` outline on both edges. The outline keeps the ring at 3 : 1 or better against light floors (4.9 : 1 vs vermillion, 8.2 : 1 vs sky), and the colour carries it against dark floors.

| Faction | Colour | Pattern | Base ring (standee) |
|---|---|---|---|
| Player character | Sky `#56B4E9` | Solid band | Solid |
| Enemy | Vermillion `#D55E00` | 12 notches cut into the band | Notched |
| Ally NPC | Bluish green `#009E73` | 16 dashes | Dashed |
| Neutral NPC | Yellow `#F0E442` | Double thin line | Double |
| Hidden (GM view only) | Reddish purple `#CC79A7` | Dotted, token at 50 % dither, eye-slash badge | Dotted |

The GM can pick a custom ring colour per token. The pattern still follows the faction.

```
  solid        notched        dashed        double        dotted
  ( O )        (^O^)         ( O )         (( O ))       ( O )
  =====        =v=v=         = = =         =====         . . .
                                           =====
```

### 3.4 Selection, targeting, facing

| State | Look | Reduced Motion |
|---|---|---|
| Hover (desktop) | Ring brightens 15 % | Same |
| Selected | 2 px Bone `#EEE8DC` outline outside the ring, slow breathing glow (2 s cycle) | Static 3 px outline |
| Targeted | Four Lantern `#F4B23E` corner brackets around the token | Same, static |
| Facing | Small chevron on the base ring at the facing angle | Same |
| Remote drag (another player is moving it) | Token follows smoothly, with that player's presence colour as a thin second ring | Same |

### 3.5 Name labels, HP bars and level badges

Rendered in WebGL with constant screen size (`Engineering.md` §7.3).

```
      [F2] Mira the Bold        <- level badge (only when several levels are on screen) + name
      |||||||||||||||-----|##   <- HP bar: fill, ticks every 25 %, temp HP band at the right
          (o) (z) +1            <- up to 3 condition icons, then "+N"
             ( O )              <- token
```

| Part | Spec |
|---|---|
| Name | IBM Plex Sans Thai 600, 12 px, Bone on a Night felt pill at 80 % opacity. 16 characters, then "…". Full name in the Stats panel |
| Level badge | Short level code ("B1", "G", "F2", "R") in Chakra Petch 600, 11 px, Night felt text on a Lantern pill. Shown only when tokens from more than one level are on screen |
| HP bar | 6 px tall, width = 80 % of token diameter, clamped to 40–96 px. Dark track `#0B1216` at 80 %. Tick marks every 25 % |
| HP fill | Above 50 %: Moss `#4FC08D` solid. 50 % or less ("Bloodied"): Yellow `#F0E442` with diagonal stripes. 25 % or less: Vermillion `#D55E00` with dense stripes. Stripes keep the states distinct for colour-blind players |
| Temp HP | Sky `#56B4E9` band with cross-hatching, after the fill |
| Room setting: numbers | "22 / 30 (+5)" under the bar, tabular figures |
| Room setting: bar only | Bar, no numbers |
| Room setting: word | "Healthy", "Bloodied", "Down" instead of the bar (Thai in §10.2) |
| Room setting: hidden | Nothing for other players' or GM tokens; owners always see their own |

### 3.6 Down, damage and healing

| Event | Look | Reduced Motion |
|---|---|---|
| Damage taken | Number rises 0.8 cells and fades over 900 ms. One red tint pulse on the token (150 ms, ≤ 30 % strength). Small shake: 3 cycles over 120 ms, 0.05 cells | Number appears and fades; no shake, no tint pulse |
| Critical hit | Larger number in Lantern with the word "Critical" | Same, no motion |
| Miss | "Miss" in Pewter, no shake | Same |
| Healing | "+N" in Moss, soft upward sparkle | "+N" fades in and out |
| Down (0 HP) | Standee tips backward and lies flat over 400 ms; art desaturates 80 %; a "Down" condition icon appears | Instant swap to the flat, desaturated look |
| Hidden (GM only) | 50 % dither, eye-slash badge | Same |

The tint pulse never repeats more than once per second, well under the WCAG 2.3.1 limit of three flashes per second.

---

## 4. Lighting moods and quality presets

### 4.1 Mood presets

Starting values. They are tuned on device in Phase 4. Intensities are relative to the custom light model in `Engineering.md` §7.2.

| Mood | Key light colour / intensity / elevation | Hemisphere sky / ground / intensity | Fog colour / density | Grade (LUT) | Bloom | Vignette |
|---|---|---|---|---|---|---|
| **Warm Day** | `#FFE2B0` / 3.0 / 50° | `#9CC7E8` / `#6B5A3E` / 0.6 | `#CFE0E8` / 0.010 | Warm +8, saturation 1.10, contrast 1.05, shadows tinted `#1E3A4A` | 0.4 | 0.25 |
| **Dusk** | `#FF9A5A` / 2.2 / 12° | `#6E6FA8` / `#3B2A2E` / 0.45 | `#B07A86` / 0.018 | Warm +15, saturation 1.15, contrast 1.10, shadows `#2B2147` | 0.7 | 0.35 |
| **Night** | `#8FA8FF` (moon) / 0.6 / 40° | `#1B2A4A` / `#0E0F14` / 0.25 | `#121A2E` / 0.025 | Cool −12, saturation 0.85, contrast 1.15, split-tone: warm highlights keep torches orange | 1.0 | 0.45 |
| **Dungeon** | none | `#2A2622` / `#0A0908` / 0.15 | `#0E0B09` / 0.040 | Warm +5, saturation 0.90, contrast 1.20 | 0.9 | 0.50 |
| **Cold** | `#DDEBFF` / 2.4 / 30° | `#BFD6EA` / `#8C9AA8` / 0.7 | `#DCE6EE` / 0.020 | Cool −10, saturation 0.80, contrast 0.95, lifted blacks `#1C2A38` | 0.3 | 0.20 |

**Time of day** (the Day/Night slider) blends moods: 05–08 Dusk → Warm Day, 08–17 Warm Day, 17–20 Warm Day → Dusk, 20–05 Night. An indoor level can override its mood (cellars default to Dungeon).

**Point light presets**

| Preset | Colour | Radius (cells) | Intensity | Flicker |
|---|---|---|---|---|
| Torch | `#FF9A3C` | 6 | 1.0 | 0.12 at 7 Hz |
| Campfire | `#FF7A2E` | 8 | 1.4 | 0.15 at 5 Hz |
| Lantern | `#FFC56E` | 5 | 0.8 | 0.04 at 3 Hz |
| Magic light | `#8F7CFF` | 6 | 1.0 | none, slow 0.08 pulse |

### 4.2 What makes it read as HD-2D

In priority order. If a preset must drop something, it drops from the bottom of this list first.

1. Warm point lights tinting the sprites (all presets).
2. Cool-to-warm contrast between shadow and light (all presets, through fog and hemisphere colours).
3. Token shadows: proxy silhouettes on Medium/High, soft blobs on Low.
4. Tilt-shift band (Medium/High).
5. Bloom on flames and magic (Medium/High).
6. LUT grade and vignette (Medium/High).
7. Particles, god rays, cloud shadows (scaled by preset).

### 4.3 Low, Medium, High at a glance

| Feature | Low | Medium | High |
|---|---|---|---|
| Real point lights | 2 nearest; the rest become glow sprites with a warm floor decal | 4 | 8 |
| Light on tokens | One colour per token (lit at its centre) | Lit per pixel, brighter on the torch side | Same as Medium |
| Token shadows | Soft dark ellipse, stretched away from the key light | Character silhouette shadow from the key light | Sharper silhouette (2 048 map) |
| Scene shadows | None (sun is still blocked by floors above) | Key light, 1 024 | Key light, 2 048 |
| Tilt-shift, bloom, LUT, vignette | Off (mood carried by fog and light colours) | On, half resolution | On |
| Particles / weather | Sparse (100 / 300) | 400 / 1 000 | 1 000 / 2 000 |
| God rays, water foam | Off | On | On |
| Light through floor openings | Off (light stays on its level) | Through 1 floor | Through 2 floors |
| Ambient animation rate | 20 fps | 30 fps | 30 fps |

At Low the scene should still look intentional: a crisp, slightly flat storybook diorama with warm light pools and soft shadows. It should never look broken.

---

## 5. Multi-level visuals

### 5.1 View modes

| Mode | What you see |
|---|---|
| **All levels** | The whole building, roofs included. Good for admiring the map |
| **Cutaway** (default) | Everything above the active level dissolves away with a fine checker-dither over 250 ms. Roofs above the active level hide the same way. You look into the active floor like a dollhouse with the top lifted off |
| **Focus** | Only the active level. Other levels are hidden entirely |

**Ghost option** (setting): in Cutaway, keep the levels above at 25 % dither instead of hiding them, so the building's shape stays readable.

```
   ALL LEVELS                 CUTAWAY (active = G)          FOCUS (active = G)

     /\  roof                                                   
    /__\                                                        
   |F2  |  <- visible          (F2 and roof dissolved)          
   |____|                                                       
   |G   |                      |G   |  <- lit, sharp            |G   |
   |____|                      |____|                           |____|
   |B1  |                      |B1  |  <- seen through gaps     
   |____|                      |____|                           
```

### 5.2 Reading levels at a glance

- **Level badges** on token labels appear only when tokens from different levels are on screen (§3.5).
- **Tokens on other levels** are drawn 20 % darker, so the active level's tokens stand out without hiding anyone.
- **Openings** (balconies, pits, atriums) get a thin Lantern edge line on the active level in Build mode, so the GM can see where light and line of sight pass.
- **Light through openings:** a torch upstairs throws a soft patch of light through a balcony gap onto the floor below, shaped like the gap. This is the visual proof that floors block light (Phase 6 acceptance).
- **Connectors:** stairs and ladders show a small up/down arrow glyph on their end cells. Hovering or selecting one highlights both ends.

### 5.3 Level switcher

Always visible at the bottom of the Tool Rail. Levels are stacked in the same order as the building, highest at the top.

```
   +------+
   |  R   |
   | F2 * |  <- active: Lantern fill, dark text, small lamp glow
   |  G • |  <- "•" = has tokens; GM sees the count on hover
   |  B1  |
   +------+
     ^ v      <- step up / down (PageUp / PageDown on desktop)
```

- Tap a chip to make that level active. The camera glides to its height over 400 ms (instant under Reduced Motion).
- Long-press or right-click a chip for "Rename", "View mode" and (GM) "Level settings".
- On mobile the switcher collapses to a single chip showing the active level ("F2 ▴▾"); tapping it opens the stack.

---

## 6. Interface design system

### 6.1 Design review (frontend-design process)

The first instinct for a fantasy VTT is parchment textures, a gold-on-black palette, ornamental borders and a medieval serif. Those are the defaults of the genre and would make this look like every other VTT. This design was revised to:

- Take its materials from the **table**, not the fantasy world: dice-tray felt, pewter miniatures, bone dice. The world inside the scene is fantasy; the frame around it is the table it sits on.
- Use **lantern amber** only where the interface is "lit" (active, focused, current). It is the same colour family as firelight in the scene, so the interface and the world share one light language.
- Pair a squared, slightly angular display face (**Chakra Petch**), whose cut corners echo pixel art, with a calm workhorse UI face (**IBM Plex Sans Thai / IBM Plex Sans**). Both cover Thai and Latin.
- Spend the boldness on one element only: the felt Tool Rail. Panels, sheets and dialogs are plain.

### 6.2 Colour tokens (UI)

Dark theme only in v1 (V1 in §11). `color-scheme: dark`; `<meta name="theme-color" content="#15222A">`.

| Token | Name | Hex | Role |
|---|---|---|---|
| `--felt-900` | Night felt | `#15222A` | Rail, panels, sheets |
| `--felt-800` | Raised felt | `#1F313B` | Hover, raised controls, input fields |
| `--felt-700` | Felt edge | `#2C4350` | Dividers, pressed state |
| `--line` | Pewter line | `#5B6E79` | Borders that identify a control (3.05 : 1 on Night felt) |
| `--pewter` | Pewter | `#9FB0B9` | Secondary text, inactive icons |
| `--bone` | Bone | `#EEE8DC` | Primary text and icons |
| `--lantern` | Lantern | `#F4B23E` | Active tool, focus ring, active level, primary button |
| `--ember` | Ember | `#F2775A` | Destructive actions (always with icon and label), errors |
| `--moss` | Moss | `#4FC08D` | Success, healing |
| `--ink` | Ink | `#0B1216` | Outlines on world elements, text on Lantern |

**Faction colours** (§3.3) are for rings, swatches and fills. They are not used for text: vermillion is only 3.48 : 1 on Raised felt. Faction labels use Bone text next to a colour swatch.

**Felt texture:** the rail and sheets get a subtle noise texture (SVG turbulence, 4 % opacity) so they read as fabric up close and flat from a distance. It is a static image, costs nothing per frame, and is removed under `prefers-contrast: more` and forced colours.

### 6.3 Typography

| Role | Typeface | Weights | Use |
|---|---|---|---|
| UI and body | IBM Plex Sans Thai + IBM Plex Sans | 400, 500, 600 | Labels, panels, roll log, token names |
| Display | Chakra Petch | 600, 700 | Room name, home page, dice totals, damage numbers, level codes |

- Both families are SIL OFL 1.1, self-hosted with `@fontsource` (Thai and Latin subsets only, `font-display: swap`). No requests to Google Fonts at runtime.
- Fallback stack: `"IBM Plex Sans Thai", "IBM Plex Sans", "Noto Sans Thai", system-ui, sans-serif`.
- Numbers use tabular figures (`font-variant-numeric: tabular-nums`) wherever they line up or change: HP, initiative, dice totals.

**Scale** (1.2 ratio, rem-based so it follows the user's browser text size):

| Step | Size | Line height (Latin / Thai) | Use |
|---|---|---|---|
| xs | 12 px | 1.4 / 1.6 | Rail labels, badges |
| sm | 14 px | 1.4 / 1.6 | Secondary text, tooltips |
| base | 16 px | 1.5 / 1.7 | Body, inputs |
| lg | 19 px | 1.35 / 1.6 | Panel titles |
| xl | 23 px | 1.25 / 1.5 | Sheet titles |
| 2xl | 28 px | 1.2 / 1.45 | Dice total |
| 3xl | 33 px | 1.15 / 1.4 | Home page heading |

**Thai rules:**
- Thai needs more leading than Latin for stacked vowels and tone marks. Line heights switch with `:lang(th)`.
- No letter-spacing on Thai and no all-caps anywhere (Thai has no case, and all-caps Latin reads as template chrome).
- Line breaking relies on the browser's Thai dictionary: `lang="th"` on the document, `word-break: normal`, `overflow-wrap: anywhere` only for long user-entered names.
- Arabic numerals (0–9) in both languages.

### 6.4 Spacing, shape, elevation

- **Spacing:** 4 px base. Scale 4, 8, 12, 16, 24, 32, 48.
- **Radii by hierarchy, not one radius for everything:** rail 16 px, flyouts and sheets 12 px, buttons 10 px, chips and badges fully rounded, inputs 8 px.
- **Elevation:** no generic drop shadow on every element. The rail is *inset* (a soft inner shadow, like a tray). Flyouts and sheets float with one overlay shadow (`0 12px 32px rgb(0 0 0 / 0.45)`). Everything else is flat and separated by `--felt-700` dividers.

### 6.5 Iconography

| Set | Licence | Use | Style rules |
|---|---|---|---|
| Lucide | ISC (notice in `CREDITS.md`) | All UI tools and actions | 24 px grid, drawn at 22 px on the rail and 20 px elsewhere, 1.75 px stroke, round caps |
| game-icons.net | CC BY 3.0 (credit each author) | Conditions, creature types, dice faces in the log | Solid silhouettes recoloured to Bone, 16 px in labels and 20 px in panels |
| Custom | Project | Level codes, connector arrows, faction ring patterns | Drawn on the same 24 px grid |

- Rail tools always show **icon + short label**. Tooltips add the shortcut on devices with a fine pointer.
- Decorative icons get `aria-hidden="true"`. Icon-only buttons (zoom, rotate) get an `aria-label`.

### 6.6 Components (summary)

| Component | Rest | Hover | Active / selected | Focus | Disabled |
|---|---|---|---|---|---|
| Rail tool | Pewter icon + label on felt | Bone icon, Raised felt cell | Lantern icon + label, warm inner glow ("lit piece") | 2 px Lantern ring, 2 px offset | 40 % opacity, `aria-disabled` |
| Primary button | Lantern fill, Ink text | +8 % lightness | −8 % lightness | Bone ring | Raised felt, Pewter text |
| Secondary button | Raised felt, Bone text | Felt edge | Felt edge, inset | Lantern ring | 40 % |
| Destructive button | Raised felt, Ember text + icon | Ember 12 % tint | — | Lantern ring | 40 % |
| Input | Raised felt, Pewter line border | Bone border | — | Lantern ring | 40 % |
| Chip (level, filter) | Felt edge | Raised felt | Lantern fill, Ink text | Lantern ring | 40 % |

---

## 7. Layouts and wireframes

### 7.1 Tool Rail anatomy

The rail holds about 32 tools across 8 groups, more than fit on one screen at a comfortable size. It uses progressive disclosure:

1. **Pinned tools** at the top: one tap or click. Default pins: Select, Move, Measure, Dice tray (players); Select, Move, Props, Lights (GM). Drag to reorder (or Alt+↑/↓).
2. **Group buttons** below: tapping a group expands it in place as an accordion, one group open at a time. Every tool is at most two taps away.
3. **Level switcher** pinned at the bottom: always visible.
4. **Command palette** (Ctrl/Cmd+K) to search every tool by name, in either language.

Groups (Prompt §14.1): Play, Tokens, Dice, Combat, Build (GM), Levels, Scene, Room. Players do not see Build or Room's GM-only tools.

```
  RAIL (desktop, 76 px wide)

  +--------+
  |  [*]   |  <- pin indicator row
  | Select |  <- pinned tool: icon over label
  |  Move  |
  |Measure |
  |  Dice  |
  |--------|  <- divider
  |  Play >|  <- group (collapsed)
  |Tokens v|  <- group (expanded)
  | Library|
  | Import |
  | Stats  |
  | Conds  |  <- short for "Conditions" in this sketch only
  |  Dice >|
  |Combat >|
  | Build >|
  | Scene >|
  |  Room >|
  |--------|
  |   R    |
  |  F2 *  |  <- level switcher, active level lit
  |   G    |
  |   B1   |
  +--------+
```

### 7.2 Desktop, rail on the right (default)

1440 × 900. The scene is full-bleed; the room chip and camera controls float over it.

```
+--------------------------------------------------------------------------------------+
| (Tavern night v) (4 online) (Local demo)                                   (?) (Set) |
|                                                               +---------------+----+ |
|                                                               | Props         |Sel | |
|                                                               | [Search...  ] |Move| |
|                                                               | +--+ +--+ +--+|Meas| |
|                              3D SCENE                         | |  | |  | |  ||Dice| |
|                         (full bleed, tilt-shift)              | +--+ +--+ +--+|----| |
|                                                               | +--+ +--+ +--+|Play| |
|                                                               | |  | |  | |  ||Tokn| |
|                                                               | +--+ +--+ +--+|Buil| |
|                                                               | Scatter  [==o]|... | |
|                                                               | Rotate   90deg|----| |
|                                                               +---------------+ R  | |
| +----------------------+                                                      |F2 *| |
| | Roll log (latest 3)  | (<45) (45>) (Reset) (Top-down) (-)(+)                | G  | |
| +----------------------+                                                      | B1 | |
+--------------------------------------------------------------------------------------+
```

- **Flyout** opens beside the rail (320 px), on the scene side. One flyout at a time. Esc closes it.
- **Camera controls** cluster bottom-centre, on the side away from the rail. They are the button alternatives to every gesture.
- **Roll log toasts** stack bottom-left, opposite the rail, and fade after 6 s (pinned open from the Dice group).

### 7.3 Desktop, rail on the left (left-handed setting)

The whole layout mirrors: rail and flyouts on the left; roll log bottom-right; room chip top-right.

```
+--------------------------------------------------------------------------------------+
| (Set) (?)                                        (Local demo) (4 online) (Tavern v)  |
| +----+---------------+                                                               |
| |Sel | Lights        |                                                               |
| |Move| Torch Campfire|                                                               |
| |Meas| Lantern  Magic|                                                               |
| |Dice| Colour  [####]|                           3D SCENE                            |
| |----| Radius  [==o ]|                                                               |
| |Play| Flicker [=o  ]|                                                               |
| |... +---------------+                                                               |
| | R  |                                                       +----------------------+|
| |F2 *|  (-)(+) (Top-down) (Reset) (<45) (45>)                | Roll log (latest 3)  ||
| | G  |                                                       +----------------------+|
+--------------------------------------------------------------------------------------+
```

### 7.4 Phone, portrait (390 × 844), rail on the right

```
+-----------------------------+
| (Tavern v) (4)        (Set) |
|                             |
|                        +---+|
|                        | * ||  <- pinned: Select
|                        | M ||  <- Move
|       3D SCENE         | D ||  <- Dice
|                        |===||  <- "All tools" (opens the tool sheet)
|                        |F2^||  <- active level chip
|                        +---+|
|                             |  <- rail sits in the lower two-thirds, in thumb reach
|      (<45)(45>)(Top)        |
+-----------------------------+
```

Rail: 56 px wide, 48 × 48 px targets with 4 px gaps, safe-area aware (`env(safe-area-inset-right)`).

**Tool open = bottom sheet**, half height, drag the grabber up to 90 %. The rail stays visible; nothing else covers the scene.

```
+-----------------------------+
| (Tavern v) (4)        (Set) |
|                        +---+|
|       3D SCENE         | * ||
|    (top half stays     | M ||
|        visible)        | D ||
|                        |===||
|                        |F2^||
|=============================|
|            ----             |  <- grabber
| Dice tray                   |
| [d4] [d6] [d8] [d10]        |
| [d12] [d20] [d100]          |
| [-] Modifier +3 [+]         |
| [Advantage] [Disadvantage]  |
| [ 2d6+3            ] [Roll] |
+-----------------------------+
```

**All tools sheet:** a grid of groups with every tool as an icon + label tile (3 per row), plus a search field at the top.

**Collapsed rail:** the rail slides away to a 12 × 64 px handle on the edge. Tap or swipe the handle to bring it back.

```
+-----------------------------+
|                             |
|                            ||  <- handle
|       3D SCENE              |
|                             |
+-----------------------------+
```

### 7.5 Phone, landscape (844 × 390)

Sheets become a **side sheet** (40 % width) next to the rail instead of a bottom sheet, so the scene keeps its full height.

```
+--------------------------------------------------------------------+
| (Tavern v) (4)                          +----------------+  +---+  |
|                                         | Stats: Mira    |  | * |  |
|              3D SCENE                   | HP 22/30 (+5)  |  | M |  |
|                                         | AC 15          |  | D |  |
|                                         | Conditions ... |  |===|  |
|  (<45)(45>)(Top)                        +----------------+  |F2^|  |
+--------------------------------------------------------------------+
```

### 7.6 Command palette

```
+-------------------------------------------+
| [ Search tools and actions...           ] |
|-------------------------------------------|
| > Measure                          M      |
|   Area templates                   A      |
|   Lights (Build)                   L      |
|   Floors & stairs (Build)          F      |
|   วัดระยะ (Measure)                         |
+-------------------------------------------+
```

Matches tool names in both languages. Arrow keys move, Enter picks, Esc closes.

### 7.7 Home page

The hero is the product itself: a small live diorama (the tavern template) turning slowly behind three clear actions. Under Reduced Motion, or when WebGL is unavailable, it is a still render.

```
+--------------------------------------------------+
|  DioramaTable                         [EN | TH]  |
|                                                  |
|        (slowly turning tavern diorama)           |
|                                                  |
|   Play tabletop RPGs on a lit miniature table.   |
|                                                  |
|   [ Create a room ]  [ Join with a link ]        |
|   [ Try the demo table ]                         |
+--------------------------------------------------+
```

---

## 8. Motion

### 8.1 Principles

- Motion answers an action or shows a change of state. Ambient world motion (clouds, wind, flicker) lives inside the scene, not in the interface.
- Interface motion animates `transform` and `opacity` only, with explicit transition properties (never `transition: all`).
- Everything is interruptible: a new input cancels or redirects the current animation.

### 8.2 Timing

| Element | Duration | Easing | Reduced Motion |
|---|---|---|---|
| Flyout open / close | 160 / 120 ms | `cubic-bezier(0.2, 0, 0, 1)` | 80 ms fade |
| Sheet open | 240 ms | same | 80 ms fade |
| Rail group expand | 160 ms | same | instant |
| Token move | distance ÷ 6 cells/s, 200–1 200 ms | ease-in-out cubic | instant jump with 150 ms fade |
| Token on stairs / ladder | along the connector path, same speed | linear along the path | instant |
| Cutaway fade | 250 ms | linear dither | instant |
| Camera 45° snap | camera-controls `smoothTime` 0.25 s | damped | instant |
| Level change (camera height) | 400 ms | damped | instant |
| Dice (3D) | physics playback, ≤ 2.5 s | recorded | 2D icon cross-fades to the result in 400 ms |
| Damage number | 900 ms rise, fade in the last 300 ms | ease-out quad | 600 ms static, then fade |
| Hit shake | 120 ms, 3 cycles, 0.05 cells | sine | none |
| Down (tip over) | 400 ms | ease-in | instant |
| Ping | ripple 800 ms, twice | ease-out | static marker for 2 s |
| Light swap (budget) | 300 ms | linear | instant |

### 8.3 Dice

- Dice tumble across the tray with real physics, settle, and the total appears above them in Chakra Petch 700 (2xl), with each die's value in a row underneath.
- Advantage and disadvantage: both d20s roll; the discarded die dims to 40 % and gets a strike line.
- Critical (natural 20 on an attack): the total glows Lantern for one beat. Natural 1: the total turns Pewter.
- Dice themes: Bone (white with Ink numbers), Ink (dark with Bone numbers), Lantern (amber resin), Arcane (purple glass look). Numbers keep at least 4.5 : 1 against the die body.

### 8.4 Reduced Motion and ambient motion

Two settings, both following WCAG:

1. **Reduced Motion** follows `prefers-reduced-motion` by default and can be toggled in Settings. It switches every row in §8.2 to its reduced column and turns ambient motion off (WCAG 2.3.3).
2. **Ambient motion** (clouds, wind sway, water, particles, light flicker, parallax drift, animated maps) runs for more than 5 seconds alongside content, so it needs a pause control (WCAG 2.2.2 Pause, Stop, Hide). The control is a toggle in the Environment panel and in Settings. Turning it off also saves battery, because the scene then renders only on change.

---

## 9. Accessibility

Target: WCAG 2.2 AA for the interface, with AAA where it is cheap (target size, animation from interactions).

### 9.1 Contrast (measured)

| Pair | Ratio | Requirement | Result |
|---|---|---|---|
| Bone on Night felt | 13.30 : 1 | 4.5 : 1 text | Pass |
| Bone on Raised felt | 11.03 : 1 | 4.5 : 1 | Pass |
| Pewter on Night felt | 7.25 : 1 | 4.5 : 1 | Pass |
| Pewter on Felt edge | 4.63 : 1 | 4.5 : 1 | Pass |
| Lantern on Night felt | 8.72 : 1 | 4.5 : 1 / 3 : 1 focus ring | Pass |
| Ink on Lantern (primary button) | 8.72 : 1 | 4.5 : 1 | Pass |
| Ember on Night felt | 5.84 : 1 | 4.5 : 1 | Pass |
| Moss on Night felt | 7.15 : 1 | 4.5 : 1 | Pass |
| Pewter line (input border) on Night felt | 3.05 : 1 | 3 : 1 non-text | Pass |
| Vermillion ring on Night felt | 4.20 : 1 | 3 : 1 graphics | Pass |
| Vermillion on Raised felt (as text) | 3.48 : 1 | 4.5 : 1 | **Fail, so faction colours are never used as text** |
| Ink outline vs Vermillion ring | 4.88 : 1 | 3 : 1 | Pass |
| Ink outline vs Sky ring | 8.18 : 1 | 3 : 1 | Pass |

Ratios were computed with the WCAG relative-luminance formula.

### 9.2 Targets and input

- Touch targets: **48 × 48 px** on touch devices (above the brief's 44 px, WCAG 2.5.5 AAA, Apple HIG and Material), with 4 px or more between targets. Desktop targets are at least 32 × 32 px.
- Every multi-finger or path gesture has a single-tap or button alternative (WCAG 2.5.1). Every drag has a tap-then-tap alternative (WCAG 2.5.7). See `Engineering.md` §8.2.
- **Keyboard:** everything works without a mouse. Tab reaches the rail (one tab stop, arrow keys inside it), the flyout, the camera controls and the token list. Tokens can be selected with `[` and `]`, moved one cell with the arrow keys, and confirmed with Enter.
- **Single-key shortcuts** (Q, E, M, and so on) can be turned off or remapped in Settings, and never fire while typing in a field (WCAG 2.1.4).
- Focus is always visible: 2 px Lantern ring with a 2 px offset. Sheets and flyouts never cover the focused element.

### 9.3 Colour-blind-safe factions

- Okabe & Ito hues (sky, vermillion, bluish green, yellow, reddish purple) stay distinguishable across protanopia, deuteranopia and tritanopia.
- Each faction also has a ring **pattern** (§3.3), and HP states use stripes and words (§3.5). No state depends on colour alone (WCAG 1.4.1).
- Verification: Phase 3 screenshots are checked with a colour-vision-deficiency simulator (Chrome DevTools "Emulate vision deficiencies") for all three types.

### 9.4 Screen readers

- The canvas has `role="img"` and a live text summary of the active level ("Ground floor. 6 tokens. Mira is selected at C4."). It updates on meaningful changes, not every frame.
- The **token list panel** is the accessible way into the scene: every visible token with name, faction, HP status and position, selectable and movable from there.
- Roll results, hits, misses and damage are announced through an `aria-live="polite"` region.
- `lang` is set on `<html>` and on any mixed-language fragment, so Thai and English are pronounced correctly.

### 9.5 Other

- **Text size:** rem units throughout; the interface works at 200 % browser zoom. Page zoom is never disabled (`user-scalable` stays on).
- **Forced colours / high contrast:** the interface falls back to system colours under `forced-colors: active`; the felt texture is removed under `prefers-contrast: more`.
- **Flashing:** nothing flashes more than once per second (WCAG 2.3.1).

---

## 10. Words

### 10.1 Voice

- Sentence case for every label, button and heading ("Apply damage", not "Apply Damage"). Thai has no case, so sentence case keeps both languages consistent. This follows `frontend-design` and Material/Fluent practice. The `web-design-guidelines` rule asking for Title Case was set aside on purpose.
- Buttons say exactly what happens: "Roll", "Apply damage", "Share link". An action keeps the same word through the flow: "Roll" makes a toast that says "Rolled 14".
- Errors say what happened and what to do: "Couldn't upload this image. Use a PNG or WebP under 2 MB."
- Empty states invite the next step: "No tokens yet. Drop an image here or pick a sample token."
- Loading text ends with "…": "Loading the table…".

### 10.2 Core terms, English and Thai

Draft Thai terms, to be reviewed by a native speaker before Phase 10 (V5).

| English | Thai |
|---|---|
| Select | เลือก |
| Move | ย้าย |
| Measure | วัดระยะ |
| Area templates | แม่แบบพื้นที่ |
| Ping | ชี้ตำแหน่ง |
| Draw | วาด |
| Target | เลือกเป้าหมาย |
| Token library | คลังโทเคน |
| Import token | นำเข้าโทเคน |
| Stats | ค่าสถานะ |
| Conditions | สภาวะ |
| Dice tray | ถาดลูกเต๋า |
| Quick d20 | ทอย d20 ด่วน |
| Roll log | ประวัติการทอย |
| Initiative | ลำดับการเล่น |
| Apply damage / Heal | ลดพลังชีวิต / ฟื้นฟู |
| Combat log | บันทึกการต่อสู้ |
| Terrain | ภูมิประเทศ |
| Height | ความสูง |
| Props | ของประกอบฉาก |
| Walls | กำแพง |
| Floors & stairs | พื้นและบันได |
| Lights | แสง |
| Erase | ลบ |
| Levels | ชั้น |
| All levels / Cutaway / Focus | ทุกชั้น / ตัดชั้นบน / เฉพาะชั้นนี้ |
| Environment | บรรยากาศ |
| Quality | คุณภาพกราฟิก |
| Players | ผู้เล่น |
| Share link | แชร์ลิงก์ |
| Settings | ตั้งค่า |
| Hit / Miss / Critical | โดน / พลาด / คริติคอล |
| Healthy / Bloodied / Down | ปกติ / บาดเจ็บหนัก / หมดสติ |

---

## 11. Open visual questions

Each has a recommended default.

| # | Question | Recommended default |
|---|---|---|
| V1 | Dark interface only in v1, or also a light theme? | Dark only (the scene reads best inside a dark frame); light theme later |
| V2 | Display typeface: Chakra Petch (squared, echoes pixel art) or a softer rounded face such as Mitr? | Chakra Petch |
| V3 | Art style of the 8 sample tokens: pixel art (matches HD-2D) or painted? | Pixel art, 64 px source upscaled ×8 |
| V4 | Faction ring patterns (solid / notched / dashed / double / dotted): acceptable, or do you prefer icon badges? | Patterns |
| V5 | Who reviews the Thai terms in §10.2? | You or a Thai-speaking player, before Phase 10 |
| V6 | Default rail side | Right (as in the brief), with the left-handed setting on first launch |

---

## 12. Appendix: skills and standards used

| Skill / standard | How it shaped this document |
|---|---|
| `frontend-design` | Token system (named colours, type roles, layout concept, principles); the design review in §6.1 that replaced genre defaults; one bold element (the rail); sentence case; copy guidance in §10 |
| `web-design-guidelines` (Vercel Web Interface Guidelines, fetched 2026-10-17) | Reduced-motion variants, `transform`/`opacity`-only animation, no `transition: all`, pause control for autoplaying motion, gesture alternatives, `aria-live`, `aria-label` on icon buttons, tabular numbers, "…" in loading text, `color-scheme` and `theme-color`, safe-area insets, zoom never disabled |
| `r3f-postprocessing`, `r3f-lighting`, `threejs-textures` | Which effects exist per preset, NearestFilter pixel art, what Low can and cannot show (§4) |
| `playwright-best-practices` | Reduced Motion emulation and colour-blind checks in the test plan (§9.3) |
| WCAG 2.2 | 1.4.1, 1.4.3, 1.4.11, 2.1.1, 2.1.4, 2.2.2, 2.3.1, 2.3.3, 2.5.1, 2.5.5, 2.5.7, 2.5.8 |
| Okabe & Ito (2008) | Faction colours |
| Font licences | IBM Plex Sans Thai, IBM Plex Sans, Chakra Petch: SIL OFL 1.1 (checked on npm 2026-10-17) |
