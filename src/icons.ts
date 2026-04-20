// ── Inline SVG icon library ──────────────────────────────────────────────────
// Every visible icon in Axiom is a pure-geometric SVG. No emoji, no bitmap.
// Each function returns an SVG string sized to 1em so it scales with font-size.
// Use `innerHTML` (or the helper `iconEl`) to inject them into the DOM.

/** Shared SVG wrapper: 1em × 1em viewBox 0 0 24 24, inline style for vertical alignment. */
function wrap(inner: string, vb = "0 0 24 24"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.125em">${inner}</svg>`;
}

/** Filled variant (no stroke, uses fill=currentColor). */
function wrapFill(inner: string, vb = "0 0 24 24"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="1em" height="1em" fill="currentColor" stroke="none" style="vertical-align:-0.125em">${inner}</svg>`;
}

// ── GUI / navigation icons ──────────────────────────────────────────────────

/** ☰  Three horizontal lines (hamburger menu). */
export const iconMenu = wrap(
  `<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>`,
);

/** ▶  Right-pointing triangle (play / normal mode). */
export const iconPlay = wrapFill(
  `<polygon points="6,3 20,12 6,21"/>`,
);

/** ∞  Infinity / figure-eight (survival mode). */
export const iconInfinity = wrap(
  `<path d="M6 12c0-2.5 2-4.5 4.5-4.5S15 9.5 15 12s-2 4.5-4.5 4.5S6 14.5 6 12zm12 0c0-2.5-2-4.5-4.5-4.5S9 9.5 9 12s2 4.5 4.5 4.5S18 14.5 18 12z"/>`,
);

/** ← Left-pointing arrow (back). */
export const iconBack = wrap(
  `<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,5 5,12 12,19"/>`,
);

/** Shop: diamond shape (gem). */
export const iconShop = wrap(
  `<polygon points="12,2 22,10 12,22 2,10"/>`,
);

/** Equipment: hexagonal nut outline. */
export const iconEquipment = wrap(
  `<polygon points="12,2 20,7 20,17 12,22 4,17 4,7"/>`,
);

/** Skills: concentric circles (target / aura). */
export const iconSkills = wrap(
  `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="5"/>`,
);

/** Achievements: pentagon (badge). */
export const iconAchievements = wrap(
  `<polygon points="12,2 22.5,9.5 18.5,22 5.5,22 1.5,9.5"/>`,
);

/** Export: upward arrow through a line. */
export const iconExport = wrap(
  `<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/><line x1="4" y1="22" x2="20" y2="22"/>`,
);

/** Import: downward arrow through a line. */
export const iconImport = wrap(
  `<line x1="12" y1="5" x2="12" y2="19"/><polyline points="5,12 12,19 19,12"/><line x1="4" y1="2" x2="20" y2="2"/>`,
);

/** Skins tab: overlapping shapes (circle + square). */
export const iconSkins = wrap(
  `<circle cx="10" cy="10" r="6"/><rect x="11" y="11" width="10" height="10" rx="1"/>`,
);

/** Enhance tab: upward chevron stack. */
export const iconEnhance = wrap(
  `<polyline points="6,18 12,12 18,18"/><polyline points="6,13 12,7 18,13"/>`,
);

// ── Skill button icons ──────────────────────────────────────────────────────

/** Time Stop: octagon (stop-sign shape). */
export const iconTimeStop = wrap(
  `<polygon points="8,2 16,2 22,8 22,16 16,22 8,22 2,16 2,8"/>`,
);

/** Shadow Clone: overlapping squares. */
export const iconClone = wrap(
  `<rect x="2" y="6" width="12" height="12" rx="1"/><rect x="10" y="2" width="12" height="12" rx="1"/>`,
);

/** Reflect Shield: curved shield with arrow. */
export const iconReflect = wrap(
  `<path d="M12,2 C6,2 2,6 2,12 C2,18 12,22 12,22 C12,22 22,18 22,12 C22,6 18,2 12,2Z"/><polyline points="8,12 12,8 16,12"/>`,
);

/** Barrage: radiating lines from center. */
export const iconBarrage = wrap(
  `<circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="7.8" y2="7.8"/><line x1="16.2" y1="16.2" x2="19.1" y2="19.1"/><line x1="4.9" y1="19.1" x2="7.8" y2="16.2"/><line x1="16.2" y1="7.8" x2="19.1" y2="4.9"/>`,
);

/** Lifesteal Pulse: heart with rings. */
export const iconLifesteal = wrap(
  `<path d="M12,21 L4,13 C2,10 2,6 5,4 C8,2 10,4 12,7 C14,4 16,2 19,4 C22,6 22,10 20,13Z"/><circle cx="12" cy="12" r="9" stroke-dasharray="3,3"/>`,
);

/** Axis Freeze: snowflake / cross with ticks. */
export const iconAxisFreeze = wrap(
  `<line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="9" y1="4" x2="12" y2="7"/><line x1="15" y1="4" x2="12" y2="7"/><line x1="9" y1="20" x2="12" y2="17"/><line x1="15" y1="20" x2="12" y2="17"/>`,
);

/** Overload: lightning bolt. */
export const iconOverload = wrap(
  `<polyline points="13,2 5,14 12,14 11,22 19,10 12,10"/>`,
);

// ── Card / item glyph icons ──────────────────────────────────────────────────
// These map to the `glyph` field in data structures. Rendered in `.card-glyph`.

/** Glyph wrapper sized from the parent container so card layouts stay balanced. */
function glyphWrap(inner: string, vb = "0 0 24 24"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

function glyphFill(inner: string, vb = "0 0 24 24"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="1em" height="1em" fill="currentColor" stroke="none">${inner}</svg>`;
}

// ── Card glyphs ─────────────────────────────────────────────────────────────

/** △  Sharp Edge: upward triangle outline. */
export const glyphSharp = glyphWrap(
  `<polygon points="12,3 22,21 2,21"/>`,
);

/** ⟫  Rapid Fire: double chevrons right. */
export const glyphRapid = glyphWrap(
  `<polyline points="5,6 12,12 5,18"/><polyline points="13,6 20,12 13,18"/>`,
);

/** →  Velocity: right arrow. */
export const glyphVelocity = glyphWrap(
  `<line x1="4" y1="12" x2="20" y2="12"/><polyline points="14,6 20,12 14,18"/>`,
);

/** ⋔  Fork: branching lines. */
export const glyphFork = glyphWrap(
  `<line x1="12" y1="20" x2="12" y2="10"/><line x1="12" y1="10" x2="6" y2="4"/><line x1="12" y1="10" x2="18" y2="4"/>`,
);

/** ◇  Pierce: diamond outline. */
export const glyphPierce = glyphWrap(
  `<polygon points="12,2 22,12 12,22 2,12"/>`,
);

/** ✦  Crit: four-pointed star. */
export const glyphCrit = glyphFill(
  `<polygon points="12,1 14,9 22,9 15.5,14 18,22 12,17 6,22 8.5,14 2,9 10,9"/>`,
);

/** ▢  Plating: square outline. */
export const glyphPlating = glyphWrap(
  `<rect x="3" y="3" width="18" height="18" rx="2"/>`,
);

/** ≫  Dash: double right arrows. */
export const glyphDash = glyphWrap(
  `<polyline points="4,6 10,12 4,18"/><polyline points="14,6 20,12 14,18"/>`,
);

/** ◎  Overclock: concentric circles. */
export const glyphOverclock = glyphWrap(
  `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>`,
);

/** ■  Heavy Rounds: filled square. */
export const glyphHeavy = glyphFill(
  `<rect x="3" y="3" width="18" height="18" rx="2"/>`,
);

/** ⇌  Rebound: double-headed arrow. */
export const glyphRebound = glyphWrap(
  `<line x1="4" y1="12" x2="20" y2="12"/><polyline points="8,6 4,12 8,18"/><polyline points="16,6 20,12 16,18"/>`,
);

/** ※  Ignite: radiating lines (burst). */
export const glyphIgnite = glyphWrap(
  `<line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="4.9" y2="19.1"/>`,
);

/** Freeze: hexagonal snowflake (6 lines from center). */
export const glyphFreeze = glyphWrap(
  `<line x1="12" y1="2" x2="12" y2="22"/><line x1="3.3" y1="7" x2="20.7" y2="17"/><line x1="3.3" y1="17" x2="20.7" y2="7"/><line x1="9" y1="3.5" x2="12" y2="6"/><line x1="15" y1="3.5" x2="12" y2="6"/><line x1="9" y1="20.5" x2="12" y2="18"/><line x1="15" y1="20.5" x2="12" y2="18"/>`,
);

/** ⌇  Arc: curved line with endpoints. */
export const glyphArc = glyphWrap(
  `<path d="M4 18 Q12 2 20 18"/>`,
);

// ── Synergy card glyphs ─────────────────────────────────────────────────────

/** ❂  Combustion: radial burst (6 lines from center). */
export const glyphCombustion = glyphWrap(
  `<circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="5.1" y1="5.1" x2="8" y2="8"/><line x1="16" y1="16" x2="18.9" y2="18.9"/>`,
);

/** ✖  Desperate: X cross with downward arrow (danger). */
export const glyphDesperate = glyphWrap(
  `<line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/><polyline points="9,18 12,22 15,18"/>`,
);

/** ↯  Kinetic: angled arrow with motion lines. */
export const glyphKinetic = glyphWrap(
  `<polyline points="6,18 12,6 18,18"/><line x1="4" y1="10" x2="8" y2="10"/><line x1="4" y1="14" x2="7" y2="14"/><line x1="4" y1="18" x2="6" y2="18"/>`,
);

/** ◦  Stillness: concentric circles with horizontal line. */
export const glyphStillness = glyphWrap(
  `<circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/>`,
);

// ── Evolution card glyphs ───────────────────────────────────────────────────

/** ❖  Aegis: shield shape with inner cross. */
export const glyphAegis = glyphWrap(
  `<path d="M12,2 L20,6 L20,13 C20,18 12,22 12,22 C12,22 4,18 4,13 L4,6 Z"/><line x1="12" y1="9" x2="12" y2="17"/><line x1="8" y1="13" x2="16" y2="13"/>`,
);

/** ↻  Revenant: circular arrow (revival cycle). */
export const glyphRevenant = glyphWrap(
  `<path d="M12,4 A8,8 0 1,1 4,12"/><polyline points="12,2 12,6 16,4"/>`,
);

/** ▽  Compact: inward-pointing triangle (shrink). */
export const glyphCompact = glyphWrap(
  `<polygon points="12,18 4,6 20,6"/><polyline points="8,10 12,14 16,10"/>`,
);

/** ⇶  Phase Shift: dashed circle with offset copy. */
export const glyphPhaseShift = glyphWrap(
  `<circle cx="10" cy="12" r="7" stroke-dasharray="3,3"/><circle cx="14" cy="12" r="7" stroke-dasharray="3,3" opacity="0.5"/>`,
);

// ── Weapon card glyphs ──────────────────────────────────────────────────────

/** ✚  Face Beam: cross with extended rays to all four sides. */
export const glyphWpnFaceBeam = glyphWrap(
  `<line x1="12" y1="2" x2="12" y2="22" stroke-width="3"/><line x1="2" y1="12" x2="22" y2="12" stroke-width="3"/>`,
);

/** ◌  Orbit Shard: three small squares orbiting a center dot. */
export const glyphWpnOrbitShard = glyphWrap(
  `<circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="8"/><rect x="10" y="2" width="4" height="4" fill="currentColor"/><rect x="18" y="14" width="4" height="4" fill="currentColor"/><rect x="2" y="14" width="4" height="4" fill="currentColor"/>`,
);

/** ⊙  Homing: arrow with curved tracking path. */
export const glyphWpnHoming = glyphWrap(
  `<path d="M4,18 Q4,4 12,8 Q20,12 20,4"/><polyline points="17,4 20,4 20,7"/>`,
);

/** ✺  Burst: center dot with radiating fragment lines. */
export const glyphWpnBurst = glyphWrap(
  `<circle cx="12" cy="12" r="2" fill="currentColor"/><line x1="12" y1="2" x2="12" y2="7"/><line x1="12" y1="17" x2="12" y2="22"/><line x1="2" y1="12" x2="7" y2="12"/><line x1="17" y1="12" x2="22" y2="12"/><line x1="5" y1="5" x2="8.5" y2="8.5"/><line x1="15.5" y1="15.5" x2="19" y2="19"/><line x1="19" y1="5" x2="15.5" y2="8.5"/><line x1="8.5" y1="15.5" x2="5" y2="19"/>`,
);

/** ≋  Fan / Sweep: five lines fanning out from base. */
export const glyphWpnFan = glyphWrap(
  `<line x1="12" y1="20" x2="4" y2="4"/><line x1="12" y1="20" x2="8" y2="4"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="12" y1="20" x2="16" y2="4"/><line x1="12" y1="20" x2="20" y2="4"/>`,
);

/** ⏶  Charge / Cannon: thick arrow with charge arc. */
export const glyphWpnCharge = glyphWrap(
  `<polygon points="12,3 6,14 10,14 10,21 14,21 14,14 18,14" fill="none"/><path d="M6,18 Q12,22 18,18" stroke-dasharray="2,2"/>`,
);

// ── Skin glyphs ─────────────────────────────────────────────────────────────

/** □  Square form. */
export const glyphSquareForm = glyphWrap(
  `<rect x="4" y="4" width="16" height="16"/>`,
);

/** ◇  Diamond form. */
export const glyphDiamondForm = glyphWrap(
  `<polygon points="12,2 22,12 12,22 2,12"/>`,
);

/** Hexagon form. */
export const glyphHexagonForm = glyphWrap(
  `<polygon points="12,2 21,7 21,17 12,22 3,17 3,7"/>`,
);

/** ★  Star form. */
export const glyphStarForm = glyphFill(
  `<polygon points="12,1 15,9 23,9 17,14.5 19,22 12,17.5 5,22 7,14.5 1,9 9,9"/>`,
);

/** Boss form (filled hexagon). */
export const glyphBossForm = glyphFill(
  `<polygon points="12,2 21,7 21,17 12,22 3,17 3,7"/>`,
);

// ── Equipment card glyphs ───────────────────────────────────────────────────

/** ▣  Toughness: square with inner cross. */
export const glyphToughness = glyphWrap(
  `<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>`,
);

/** »  Swiftness: angle-double-right. */
export const glyphSwiftness = glyphWrap(
  `<polyline points="5,6 11,12 5,18"/><polyline points="13,6 19,12 13,18"/>`,
);

/** ▲  Sharp Shot: filled triangle. */
export const glyphSharpShot = glyphFill(
  `<polygon points="12,3 22,21 2,21"/>`,
);

/** Quick Draw: nested chevrons (fast forward). */
export const glyphQuickDraw = glyphWrap(
  `<polyline points="4,6 10,12 4,18"/><polyline points="14,6 20,12 14,18"/><line x1="20" y1="6" x2="20" y2="18"/>`,
);

/** ↗  Long Range: diagonal arrow. */
export const glyphLongRange = glyphWrap(
  `<line x1="5" y1="19" x2="19" y2="5"/><polyline points="10,5 19,5 19,14"/>`,
);

/** ♦  Lucky Strike: diamond. */
export const glyphLucky = glyphFill(
  `<polygon points="12,2 20,12 12,22 4,12"/>`,
);

/** ✚  Resilience: plus/cross (hit recovery). */
export const glyphResilience = glyphWrap(
  `<line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/>`,
);

/** ⊕  Magnet: circle with cross (pickup radius). */
export const glyphMagnet = glyphWrap(
  `<circle cx="12" cy="12" r="10"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/>`,
);

/** ⟐  Piercing Shot: arrow through. */
export const glyphPiercingShot = glyphWrap(
  `<line x1="5" y1="12" x2="19" y2="12"/><polyline points="14,7 19,12 14,17"/><line x1="9" y1="7" x2="9" y2="17"/>`,
);

/** ⋮  Multi Shot: three dots vertical. */
export const glyphMultiShot = glyphWrap(
  `<circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/>`,
);

// ── Slot expansion glyphs ───────────────────────────────────────────────────

/** ④  4th Slot: number 4 inside a circle. */
export const glyphSlot4 = glyphWrap(
  `<circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" font-size="12" font-family="monospace" fill="currentColor" stroke="none">4</text>`,
);

/** ⑤  5th Slot: number 5 inside a circle. */
export const glyphSlot5 = glyphWrap(
  `<circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" font-size="12" font-family="monospace" fill="currentColor" stroke="none">5</text>`,
);

/** ⑥  6th Slot: number 6 inside a circle. */
export const glyphSlot6 = glyphWrap(
  `<circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" font-size="12" font-family="monospace" fill="currentColor" stroke="none">6</text>`,
);

// ── Achievement glyphs ──────────────────────────────────────────────────────

/** ⚔  Shape Slayer: crossed lines. */
export const glyphCrossedSwords = glyphWrap(
  `<line x1="4" y1="4" x2="20" y2="20"/><line x1="20" y1="4" x2="4" y2="20"/><line x1="4" y1="4" x2="8" y2="4"/><line x1="4" y1="4" x2="4" y2="8"/><line x1="20" y1="4" x2="16" y2="4"/><line x1="20" y1="4" x2="20" y2="8"/>`,
);

/** ✧  Four-pointed star outline (Awakened / draw skill). */
export const glyphStar4 = glyphWrap(
  `<polygon points="12,2 14,10 22,12 14,14 12,22 10,14 2,12 10,10"/>`,
);

/** ○  Circle outline (Minimalist). */
export const glyphCircleOutline = glyphWrap(
  `<circle cx="12" cy="12" r="10"/>`,
);

/** ◉  Circle with dot (Purist). */
export const glyphCircleDot = glyphWrap(
  `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/>`,
);

/** C  Centurion: "C" in circle. */
export const glyphCenturion = glyphWrap(
  `<circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" font-size="12" font-family="monospace" fill="currentColor" stroke="none">C</text>`,
);

/** M  Annihilator: "M" in circle. */
export const glyphAnnihilator = glyphWrap(
  `<circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" font-size="12" font-family="monospace" fill="currentColor" stroke="none">M</text>`,
);

/** ★  Trailblazer: filled star. */
export const glyphFilledStar = glyphFill(
  `<polygon points="12,2 15,9 22,9 16,14 18,22 12,17 6,22 8,14 2,9 9,9"/>`,
);

/** ∞  Endurance: figure-eight / infinity. */
export const glyphInfinity = glyphWrap(
  `<path d="M8,12 C8,8 2,8 2,12 C2,16 8,16 12,12 C16,8 22,8 22,12 C22,16 16,16 12,12"/>`,
);

/** ▲  Stage 3 Victor: filled triangle up. */
export const glyphTriangleUp = glyphFill(
  `<polygon points="12,4 22,20 2,20"/>`,
);

/** ⚙  Arsenal: gear. */
export const glyphGear = glyphWrap(
  `<circle cx="12" cy="12" r="4"/><path d="M12,2 L13,6 L11,6Z M12,22 L13,18 L11,18Z M2,12 L6,13 L6,11Z M22,12 L18,13 L18,11Z M4.9,4.9 L7.5,7 L7,7.5Z M19.1,4.9 L17,7.5 L16.5,7Z M4.9,19.1 L7,16.5 L7.5,17Z M19.1,19.1 L16.5,17 L17,16.5Z"/>`,
);

/** ⬡  Fully Loaded: hexagon outline. */
export const glyphHexOutline = glyphWrap(
  `<polygon points="12,2 22,7 22,17 12,22 2,17 2,7"/>`,
);

/** ⬢  Mastery: filled hexagon. */
export const glyphHexFilled = glyphFill(
  `<polygon points="12,2 22,7 22,17 12,22 2,17 2,7"/>`,
);

/** ◆  Collector: filled diamond. */
export const glyphDiamondFilled = glyphFill(
  `<polygon points="12,2 22,12 12,22 2,12"/>`,
);

/** ⚡  Blitz: lightning bolt. */
export const glyphLightning = glyphFill(
  `<polygon points="13,2 6,14 11,14 10,22 18,10 13,10"/>`,
);

/** »  Quick Start: double chevron. */
export const glyphDoubleChevron = glyphWrap(
  `<polyline points="5,6 11,12 5,18"/><polyline points="13,6 19,12 13,18"/>`,
);

/** ☆  Boss Breaker: star outline. */
export const glyphStarOutline = glyphWrap(
  `<polygon points="12,2 15,9 22,9 16,14 18,22 12,17 6,22 8,14 2,9 9,9"/>`,
);

// ── Misc glyphs ─────────────────────────────────────────────────────────────

/** △  Default triangle skin glyph. */
export const glyphTriangle = glyphWrap(
  `<polygon points="12,3 22,21 2,21"/>`,
);

/** Primal core label glyph (✧). */
export const glyphCore = glyphWrap(
  `<polygon points="12,2 14,10 22,12 14,14 12,22 10,14 2,12 10,10"/>`,
);

// ── Boss-gated card glyphs ───────────────────────────────────────────────────

/** ╋  Axis Lock: thick cross / plus. */
export const glyphAxisLock = glyphWrap(
  `<line x1="12" y1="3" x2="12" y2="21" stroke-width="3"/><line x1="3" y1="12" x2="21" y2="12" stroke-width="3"/>`,
);

/** ⊞  Grid Snap: grid with center dot. */
export const glyphGridSnap = glyphWrap(
  `<rect x="4" y="4" width="16" height="16"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="12" cy="12" r="2" fill="currentColor"/>`,
);

/** ⁓  Contrail: wavy trail line. */
export const glyphContrail = glyphWrap(
  `<path d="M3,12 C5,8 9,8 12,12 C15,16 19,16 21,12"/>`,
);

/** ⤨  Rebound+: angled bounce arrows. */
export const glyphReboundPlus = glyphWrap(
  `<polyline points="4,18 12,6 20,18"/><polyline points="7,14 12,10 17,14"/>`,
);

/** ∞  Recursion: infinity symbol. */
export const glyphRecursion = glyphWrap(
  `<path d="M8,12 C8,8 2,8 2,12 C2,16 8,16 12,12 C16,8 22,8 22,12 C22,16 16,16 12,12"/>`,
);

// ── Glyph lookup maps ───────────────────────────────────────────────────────
// Maps card / shop-item / achievement IDs to their SVG glyph string.

export const CARD_GLYPHS: Record<string, string> = {
  sharp: glyphSharp,
  rapid: glyphRapid,
  velocity: glyphVelocity,
  fork: glyphFork,
  pierce: glyphPierce,
  crit: glyphCrit,
  plating: glyphPlating,
  dash: glyphDash,
  overclock: glyphOverclock,
  heavy: glyphHeavy,
  rebound: glyphRebound,
  ignite: glyphIgnite,
  freeze: glyphFreeze,
  arc: glyphArc,
  axisLock: glyphAxisLock,
  gridSnap: glyphGridSnap,
  contrail: glyphContrail,
  reboundPlus: glyphReboundPlus,
  recursion: glyphRecursion,
  // Synergy
  combustion: glyphCombustion,
  desperate: glyphDesperate,
  kinetic: glyphKinetic,
  stillness: glyphStillness,
  // Evolution
  aegis: glyphAegis,
  revenant: glyphRevenant,
  compact: glyphCompact,
  phaseShift: glyphPhaseShift,
  // Weapon
  wpnFaceBeam: glyphWpnFaceBeam,
  wpnOrbitShard: glyphWpnOrbitShard,
  wpnHoming: glyphWpnHoming,
  wpnBurst: glyphWpnBurst,
  wpnFan: glyphWpnFan,
  wpnCharge: glyphWpnCharge,
};

export const SHOP_GLYPHS: Record<string, string> = {
  "skin-square": glyphSquareForm,
  "skin-diamond": glyphDiamondForm,
  "skin-hexagon": glyphHexagonForm,
  "skin-star": glyphStarForm,
  "skin-boss": glyphBossForm,
  "eq-toughness": glyphToughness,
  "eq-swiftness": glyphSwiftness,
  "eq-sharpshot": glyphSharpShot,
  "eq-quickdraw": glyphQuickDraw,
  "eq-longrange": glyphLongRange,
  "eq-lucky": glyphLucky,
  "eq-resilience": glyphResilience,
  "eq-magnet": glyphMagnet,
  "eq-piercing": glyphPiercingShot,
  "eq-multishot": glyphMultiShot,
  "slot-4": glyphSlot4,
  "slot-5": glyphSlot5,
  "slot-6": glyphSlot6,
};

export const ACHIEVEMENT_GLYPHS: Record<string, string> = {
  // Progress
  firstBossKill: glyphCrossedSwords,
  firstPrimalSkill: glyphStar4,
  kill100: glyphCenturion,
  kill1000: glyphAnnihilator,
  clear3Stages: glyphFilledStar,
  // Difficulty
  noPowerNormalClear: glyphCircleOutline,
  noPowerSurvival16: glyphCircleDot,
  survival32: glyphInfinity,
  clearStage3: glyphTriangleUp,
  // Style
  allWeapons: glyphGear,
  fullEquipment: glyphHexOutline,
  maxSkillLevel: glyphHexFilled,
  own5Skins: glyphDiamondFilled,
  // Speed
  speedStage1: glyphLightning,
  speed5Waves: glyphDoubleChevron,
  bossRush3: glyphStarOutline,
};

export const SKILL_GLYPHS: Record<string, string> = {
  timeStop: iconTimeStop,
  shadowClone: iconClone,
  reflectShield: iconReflect,
  barrage: iconBarrage,
  lifestealPulse: iconLifesteal,
  axisFreeze: iconAxisFreeze,
  overload: iconOverload,
};

// ── Helper to create a DOM element from SVG string ──────────────────────────

/**
 * Sets `el.innerHTML` to the SVG string. Use for elements that previously
 * held a single emoji glyph (e.g. `.card-glyph`, `.skill-btn`).
 */
export function setIconHtml(el: HTMLElement, svgHtml: string): void {
  el.innerHTML = svgHtml;
}

// ── Boss glyph icons ────────────────────────────────────────────────────────

/** ✛  Cross / plus (Orthogon boss glyph). */
export const iconOrthogon = wrap(
  `<line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/>`,
);

/** ▷  Paper-plane / dart (Jets boss glyph). */
export const iconJets = wrapFill(
  `<polygon points="12,21 4,7 12,11 20,7"/>`,
);

/** ⬡  Hexagon outline (Mirror boss glyph). */
export const iconMirror = wrap(
  `<polygon points="12,2 20,7 20,17 12,22 4,17 4,7"/>`,
);

/**
 * Create a `<span>` element containing an inline SVG icon.
 * Useful when building buttons: `btn.prepend(iconSpan(iconPlay))`.
 */
export function iconSpan(svgHtml: string): HTMLSpanElement {
  const s = document.createElement("span");
  s.className = "svg-icon";
  s.innerHTML = svgHtml;
  s.setAttribute("aria-hidden", "true");
  return s;
}
