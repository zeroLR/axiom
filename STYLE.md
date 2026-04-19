# Axiom — Style Guide

This document defines the visual language, colour palette, typography, and
iconography rules for **Axiom**. Every UI, HUD, scene overlay, and in-game
element should follow these guidelines. When in doubt, choose the option that
feels *colder, cleaner, and more geometric*.

---

## 1. Design Philosophy

| Principle | Meaning |
|---|---|
| **Geometric minimalism** | Every visual element — avatars, enemies, icons, cards — is built from basic geometric primitives (circles, triangles, polygons, lines). No figurative illustration, no bitmaps, no emoji. |
| **Mechanical coldness** | The tone is calm, precise, almost clinical. No colour bursts or emotional flourishes. Wins and losses are stated, not celebrated. |
| **High-contrast readability** | UI must remain legible on both light and dark stage themes. Two strokes of ink on paper — that's the target density. |
| **Monospace discipline** | All text uses monospace / system-ui-monospace. No serif or display fonts. |

---

## 2. Colour Palette

### 2.1 Base Tokens (CSS custom properties)

```css
:root {
  --bg:     #ffffff;   /* page / canvas default background */
  --fg:     #111111;   /* primary text, borders, filled icons */
  --accent: #d81b60;   /* magenta — player projectiles, interactive highlights */
  --muted:  #8a8a99;   /* secondary text, descriptions, timestamps */
  --chrome: #f4f4f6;   /* subtle surface fills — chips, hover states */
}
```

Use `--fg` for all primary strokes and text. Use `--accent` sparingly — only
for interactive call-to-action highlights and player projectile colour. Never
pair `--muted` on `--chrome` for text (insufficient contrast).

### 2.2 Stage Theme Palettes

Each normal-mode stage overrides the canvas background and grid colour.

| Stage | Name | Background | Grid Lines | Dark? | Player Colour | Enemy Stroke |
|---|---|---|---|---|---|---|
| 1 | White Grid | `#ffffff` | `#f0f0f0` | No | `#111111` | `#111111` |
| 2 | Deep Blue | `#0a0e2a` | `#1a2555` | Yes | `#00e5ff` (cyan) | `#aaccff` |
| 3 | Dark Core | `#1a0808` | `#3a1a0a` | Yes | `#ff6e40` (orange) | `#ffccaa` |

**Rules for dark themes:**
- Enemies use a brighter, more saturated fill palette to maintain visibility.
- Player body colour flips to a light accent (see table above).
- Overlay backdrop uses a semi-transparent version of the stage background
  with `backdrop-filter: blur(8px)`.

### 2.3 Gameplay Colours

| Element | Light Theme | Dark Theme | Notes |
|---|---|---|---|
| Player projectile | `#d81b60` (accent) | same | Crit → `#ff3030` |
| Enemy projectile | `#ff7043` | same | Crit → `#ff2020` |
| Shield indicator | `#00e5ff` | same | Thin ring around shielded enemies |
| Invincibility ring | `#00bcd4` | same | Player i-frame feedback |
| Burn / ignite | – | – | Uses existing projectile colour |
| Slow / freeze | – | – | Blue-tinted stroke (TBD) |

### 2.4 Enemy Fills (Light Theme)

| Kind | Hex | Appearance |
|---|---|---|
| circle | `#fafafa` | Near-white |
| square | `#ffe6a0` | Pale gold |
| star | `#c9e7ff` | Pale blue |
| pentagon | `#d4f5d4` | Pale green |
| hexagon | `#d0f0ff` | Pale cyan |
| diamond | `#ffe0cc` | Pale orange |
| cross | `#f5d0f5` | Pale magenta |
| crescent | `#fff4cc` | Pale yellow |
| boss | `#ffd1e1` | Pale pink |

On dark themes, fills shift to fully saturated versions (white, gold, sky-blue,
neon-green, neon-cyan, etc.) for contrast.

---

## 3. Typography

| Role | Stack | Size | Weight |
|---|---|---|---|
| Body / buttons | `ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace` | 12–14px | 400 |
| Button labels | same | 13px | 400 (menu-btn), 700 (big-btn) |
| Overlay title | same | 16px | 400, `letter-spacing: 0.05em`, uppercase |
| Card name | same | 14px | 700 |
| Card description | same | 12px | 400, `color: var(--muted)` |
| Card rarity | same | 10px | 400, uppercase, `letter-spacing: 0.1em` |
| HUD chips | same | 12px | 400, `font-variant-numeric: tabular-nums` |

**Never** add decorative or display fonts. Monospace uniformity is a core part
of the Bauhaus / Sol LeWitt aesthetic.

---

## 4. Iconography

### 4.1 No Emoji

Axiom uses **zero emoji characters** as visible UI icons. All icons are
**inline SVG geometric shapes** defined in `src/icons.ts`. This ensures:

- Consistent appearance across platforms (no OS emoji font variation).
- Adherence to the geometric-minimalist worldview.
- Colour inherits from `currentColor` so icons automatically adapt to theme.

### 4.2 Icon Construction Rules

1. ViewBox is always `0 0 24 24`.
2. Size is `1em × 1em` (scales with surrounding font-size).
3. Stroke-based icons use `stroke="currentColor"`, `stroke-width="2"`,
   `stroke-linecap="round"`, `stroke-linejoin="round"`, `fill="none"`.
4. Filled icons use `fill="currentColor"`, `stroke="none"`.
5. Glyph-size icons (card art) use `1.4em × 1.4em` for emphasis.
6. Icons are injected via `innerHTML`; the helper functions `iconSpan()` and
   `setIconHtml()` in `src/icons.ts` handle DOM insertion.

### 4.3 Icon–Label Mapping

| Context | Icon Shape | Label |
|---|---|---|
| Normal Mode | Filled right-pointing triangle | "Normal Mode" |
| Survival Mode | Figure-eight / infinity loop | "Survival Mode" |
| Shop | Diamond (gem) | "Shop" |
| Equipment | Hexagon nut | "Equipment" |
| Skills | Concentric circles | "Skills" |
| Achievements | Pentagon (badge) | "Achievements" |
| Export | Upward arrow + baseline | "Export" |
| Import | Downward arrow + baseline | "Import" |
| Skins tab | Circle + square overlap | "Skins" |
| Enhance tab | Stacked chevrons up | "Enhance" |
| Back | Left arrow | "back" |
| Menu (topbar) | Three horizontal lines | (hamburger) |
| Time Stop skill | Octagon (stop-sign) | "Time Stop" |
| Shadow Clone skill | Overlapping squares | "Clone" |

### 4.4 Card Glyph Design

Each card has a unique SVG glyph rendered in the `.card-glyph` container.
Glyphs must be:

- Pure geometry — lines, polygons, arcs. No letter-forms except slot numbers.
- Visually distinct at 28–36px rendered size.
- Stroke-based for outline variants, filled for "heavy" / rare variants.

Glyph lookup lives in `CARD_GLYPHS`, `SHOP_GLYPHS`, `ACHIEVEMENT_GLYPHS`, and
`SKILL_GLYPHS` maps inside `src/icons.ts`.

---

## 5. Layout & Spacing

| Token | Value | Usage |
|---|---|---|
| Safe area top | `env(safe-area-inset-top)` | Topbar padding |
| Safe area bottom | `env(safe-area-inset-bottom)` | Footer padding |
| Minimum touch target | 44px (height) | All interactive buttons |
| Button border-radius | 6–10px | Chips = 6px, cards/buttons = 10px |
| Card min-height | 60px | Ensures comfortable tap target |
| Overlay max-width | 340px | Centred content column |
| Overlay backdrop | `rgba(bg, 0.82)` + `blur(8px)` | Frosted-glass effect |
| Grid step | 40px (play-field units) | Background grid |

Play-field is fixed at **360 × 640** internal pixels (9:16 aspect). CSS scales
the canvas proportionally to fit the viewport. The bottom 25% of the screen is
the drag / control hot-zone.

---

## 6. Motion & Animation

- **No gratuitous animation.** Transitions exist only where they serve
  gameplay feedback.
- Hover / active states use instant colour swaps (`background: var(--chrome)`).
- Tab switching uses `transition: background 0.15s, color 0.15s`.
- In-game hit flashes last **0.1s** (single frame at 60fps).
- Invincibility frames last **0.6s** with a cyan ring indicator.

---

## 7. Sound Palette (for reference)

| Event | Sound Character |
|---|---|
| Enemy destroyed | Short glass "ding" |
| Card drafted | Low-frequency pulse |
| Player hit | Dry thud |
| Player death | Muted impact, no fanfare |
| Boss spawn | Deep drone swell |

Audio follows the same principle as visuals: **minimal, clean, no excess**.

---

## 8. Do's & Don'ts

| ✓ Do | ✗ Don't |
|---|---|
| Use CSS custom properties for all colours | Hard-code hex values in components |
| Derive icon colour from `currentColor` | Use multi-colour SVG icons |
| Keep text monospace everywhere | Introduce serif or display fonts |
| Prefer stroke-based outlines | Use thick filled shapes unless marking "heavy" rarity |
| Test legibility on both White Grid and Dark Core | Assume light background only |
| Use the `iconSpan()` / `setIconHtml()` helpers | Insert raw SVG strings with `textContent` |
| Keep glyph SVGs in `src/icons.ts` | Scatter SVG definitions across scene files |
