// ── Boss Trophy content ───────────────────────────────────────────────────────
// One signature passive per boss; auto-unlocked on first defeat. The player
// equips a single trophy at a time. Active components are intentionally
// deferred to a follow-up pass — v1 ships passives only so the entire pipeline
// (unlock → endgame banner → equip → run-start bonus) lands in one slice.

import type { BossId } from "../bosses/types";
import type { PrimalSkillId, TrophyId } from "../data/types";

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
  /**
   * Primal skill granted while this trophy is unlocked (no equip required).
   * Layered with class T0/T1 skill unlocks at run start. Trophies without a
   * skill are passive-only.
   */
  grantsSkill?: PrimalSkillId;
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
    description: "+8% movement speed. Unlocks Overload skill.",
    passive: { speedMul: 0.08 },
    grantsSkill: "overload",
  },
  {
    id: "mirror-echo",
    fromBoss: "mirror",
    name: "Mirror Echo",
    description: "+1 weapon damage. Unlocks Shadow Clone skill.",
    passive: { damageAdd: 1 },
    grantsSkill: "shadowClone",
  },
  {
    id: "grid-overlay",
    fromBoss: "lattice",
    name: "Grid Overlay",
    description: "+5% crit chance. Unlocks Time Stop skill.",
    passive: { critAdd: 0.05 },
    grantsSkill: "timeStop",
  },
  {
    id: "void-blink",
    fromBoss: "rift",
    name: "Void Blink",
    description: "+0.04s hit-invulnerability. Unlocks Lifesteal Pulse skill.",
    passive: { iframeAdd: 0.04 },
    grantsSkill: "lifestealPulse",
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

/**
 * Collect every primal skill currently granted by unlocked trophies.
 * Order matches `TROPHIES` declaration so the resulting list is stable.
 * Returns an empty array if no trophy with `grantsSkill` is unlocked.
 */
export function trophyGrantedSkills(
  unlocked: Record<TrophyId, boolean>,
): PrimalSkillId[] {
  const out: PrimalSkillId[] = [];
  for (const def of TROPHIES) {
    if (!def.grantsSkill) continue;
    if (unlocked[def.id]) out.push(def.grantsSkill);
  }
  return out;
}
