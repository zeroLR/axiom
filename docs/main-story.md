# Main Story — Canonical Design Document

> This document describes the world-building and stage design for Axiom's
> **Main Story** mode (formerly "Normal Mode"). It serves as the canonical
> reference for future expansions (new Domains, new Theorems, new Bosses).

---

## World: The Axiom Plane

The pure-white grid is the **Axiom Plane** — an infinite, self-consistent
geometric space. When an over-extended theorem collapses, its remnants
crystallise into hostile shapes that erode the plane's order, forming a
localised **Collapse Domain**. Each domain is ruled by a rogue **Theorem**
whose final expression is a geometric **Counter-Proof** (boss). The player
is a re-definable initial axiom that rewrites itself through card drafts,
destroys the counter-proof, and seals the domain.

No narrative characters. No dialogue. Only shapes and rules.

---

## Stages (3)

| Stage | Domain          | Theorem                       | Boss         | Glyph |
|-------|-----------------|-------------------------------|-------------|-------|
| 1     | **線域 (AXIS)**  | "lines converge"              | **Orthogon** | ✛     |
| 2     | **翼域 (WING)**  | "edges strike first"          | **Jets**     | ▷     |
| 3     | **鏡域 (MIRROR)**| "every inference reflects"    | **Mirror**   | ⬡     |

### Stage 1 — AXIS
- Theme: White Grid (`#ffffff` bg).
- Enemies: circle / square / star. 8 waves.
- Boss **Orthogon**: cross-shaped. Phase 1 uses standard fan; Phase 2 adds
  4-axis sweep + cross-laser.

### Stage 2 — WING
- Theme: Deep Blue (`#1b2340` bg).
- Enemies: pentagon / diamond / star. 12 waves.
- Boss **Jets**: paper-plane shaped. Phase 1 uses standard fan; Phase 2 adds
  side-dash, Z-sweep, 50% enrage scatter.

### Stage 3 — MIRROR
- Theme: Dark Core (`#2b1b22` bg).
- Enemies: cross / crescent / hexagon. 15 waves.
- Boss **Mirror**: existing mirror-boss system. Derives stats from the
  player's drafted cards. No AI changes.

---

## Unlock Progression (Phase 3)

Linear: clear Stage N to unlock Stage N+1.

Each boss clear grants 2–3 new cards + 1 Primal Skill. Details in
`docs/plans/main-story-redesign.md` §4.

---

## Narrative Surface

Two brief title-cards per run (monospace, uppercase, 16px):

1. **Stage entry:** `STAGE II — DOMAIN: WING / THEOREM: "edges strike first"`
2. **Boss spawn:** `BOSS: JETS / THEOREM: "edges strike first"`

No animations, no character dialogue. Cold, mechanical, high-contrast.

---

## Extension Points

- New Domains can be added by creating a `BossDef` in `src/game/bosses/`,
  registering it in `registry.ts`, and adding a `StageTheme` with the
  corresponding `bossId`, `domainName`, and `theoremLine`.
- New Theorems are purely flavour text stored in `StageTheme.theoremLine`.
- New cards/skills gated behind a boss use the `unlockAfterBoss` field
  (Phase 3).
