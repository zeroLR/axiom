// ── Boss Trophy content ───────────────────────────────────────────────────────
// One signature passive per boss; auto-unlocked on first defeat. The player
// equips a single trophy at a time. Active components are intentionally
// deferred to a follow-up pass — v1 ships passives only so the entire pipeline
// (unlock → endgame banner → equip → run-start bonus) lands in one slice.

import type { BossId } from "../bosses/types";
import type { TrophyId } from "../data/types";

/**
 * The passive bonus contributed by an equipped trophy. Field names match the
 * existing `ClassPassiveBonuses` shape so a single `applyEffectToWorld` site
 * can stack class + trophy contributions without translation.
 */
export interface TrophyPassive {
  damageAdd?: number;
  critAdd?: number;
  projectilesAdd?: number;
  iframeAdd?: number;
  speedMul?: number;
}

export interface TrophyDef {
  id: TrophyId;
  fromBoss: BossId;
  name: string;
  description: string;
  passive: TrophyPassive;
}

/**
 * Trophy registry. Order is the canonical display order in the equip UI and
 * mirrors stage progression (Stage 1 → 5).
 */
export const TROPHIES: readonly TrophyDef[] = [
  {
    id: "axis-lock",
    fromBoss: "orthogon",
    name: "Axis Lock",
    description: "+1 projectile per shot.",
    passive: { projectilesAdd: 1 },
  },
  {
    id: "wing-dash",
    fromBoss: "jets",
    name: "Wing Dash",
    description: "+8% movement speed.",
    passive: { speedMul: 0.08 },
  },
  {
    id: "mirror-echo",
    fromBoss: "mirror",
    name: "Mirror Echo",
    description: "+1 weapon damage.",
    passive: { damageAdd: 1 },
  },
  {
    id: "grid-overlay",
    fromBoss: "lattice",
    name: "Grid Overlay",
    description: "+5% crit chance.",
    passive: { critAdd: 0.05 },
  },
  {
    id: "void-blink",
    fromBoss: "rift",
    name: "Void Blink",
    description: "+0.04s hit-invulnerability.",
    passive: { iframeAdd: 0.04 },
  },
];

const TROPHY_BY_ID: Record<TrophyId, TrophyDef> = Object.fromEntries(
  TROPHIES.map((t) => [t.id, t]),
) as Record<TrophyId, TrophyDef>;

const TROPHY_BY_BOSS: Partial<Record<BossId, TrophyDef>> = Object.fromEntries(
  TROPHIES.map((t) => [t.fromBoss, t]),
);

/** Look up a trophy definition by ID. */
export function getTrophyDef(id: TrophyId): TrophyDef {
  return TROPHY_BY_ID[id];
}

/** Trophy granted by defeating `bossId`, if any. */
export function trophyForBoss(bossId: BossId): TrophyDef | null {
  return TROPHY_BY_BOSS[bossId] ?? null;
}
