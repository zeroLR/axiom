// ── Unlock gate utilities ────────────────────────────────────────────────────
// Phase 3 of the main-story redesign: cards and skills can be gated behind
// boss defeats. This module provides pure helpers that read `PlayerStats` to
// determine what is available.

import type { BossId } from "./bosses/types";
import type { PlayerStats, TrophyId } from "./data/types";
import type { Card } from "./cards";
import type { PrimalSkillDef } from "./skills";
import type { TalentNodeDef } from "./content/talents";
import { TROPHIES } from "./content/trophies";
import { STAGE_CONFIGS } from "./content/stages";
import { ACTS, actStageIds, type ActDef, type ActId } from "./content/acts";

// ── Mapping ─────────────────────────────────────────────────────────────────

const BOSS_STAGE_INDEX: Record<BossId, number> = {
  orthogon: 0,
  jets: 1,
  mirror: 2,
  lattice: 3,
  rift: 4,
  nexus: 5,
};

/** Return the 0-based stage index associated with a boss. */
export function bossToStageIndex(id: BossId): number {
  return BOSS_STAGE_INDEX[id];
}

/** Return the stageId of the stage where `id` is the final boss. */
export function bossToStageId(id: BossId): string | null {
  const cfg = STAGE_CONFIGS.find((c) => c.bossId === id);
  return cfg?.stageId ?? null;
}

/**
 * Has `stageId` been cleared? Reads the stageId-keyed map first; falls back
 * to the legacy positional `normalCleared[]` so saves predating SCHEMA_VERSION
 * 6 still answer correctly even before storage has rewritten them.
 */
export function isStageCleared(stageId: string, stats: PlayerStats): boolean {
  if (stats.clearedStages?.[stageId] === true) return true;
  const idx = STAGE_CONFIGS.findIndex((c) => c.stageId === stageId);
  if (idx >= 0 && stats.normalCleared?.[idx] === true) return true;
  return false;
}

/** Has the player defeated the given boss at least once? */
export function isBossDefeated(id: BossId, stats: PlayerStats): boolean {
  const stageId = bossToStageId(id);
  if (stageId && isStageCleared(stageId, stats)) return true;
  // Defensive fallback: bosses outside STAGE_CONFIGS still resolve via legacy
  // index map (kept so test fixtures using makeStats([...]) keep working).
  const idx = bossToStageIndex(id);
  return stats.normalCleared?.[idx] === true;
}

// ── Act gating ──────────────────────────────────────────────────────────────

/** Every trial in `act` cleared, regardless of whether a gate exists. */
export function isActTrialsCleared(act: ActDef, stats: PlayerStats): boolean {
  return act.trialStageIds.every((id) => isStageCleared(id, stats));
}

/** Every trial AND the gate (if any) cleared. */
export function isActFullyCleared(act: ActDef, stats: PlayerStats): boolean {
  if (!isActTrialsCleared(act, stats)) return false;
  if (act.gateStageId) return isStageCleared(act.gateStageId, stats);
  return true;
}

/**
 * Is the Act itself accessible to the player? An Act unlocks when its
 * `unlockAfterAct` (if set) is fully cleared.
 */
export function isActUnlocked(actId: ActId, stats: PlayerStats): boolean {
  const act = ACTS.find((a) => a.id === actId);
  if (!act) return false;
  if (!act.unlockAfterAct) return true;
  const prereq = ACTS.find((a) => a.id === act.unlockAfterAct);
  return prereq ? isActFullyCleared(prereq, stats) : true;
}

/**
 * Is `stageId` selectable by the player right now?
 *  - The Act it belongs to must be unlocked.
 *  - Trials are always selectable within an unlocked Act (any order).
 *  - The gate stage requires every trial cleared.
 *  - Stages without an `actId` fall back to the legacy linear gate.
 */
export function isStageUnlocked(stageId: string, stats: PlayerStats): boolean {
  const idx = STAGE_CONFIGS.findIndex((c) => c.stageId === stageId);
  if (idx < 0) return false;
  const cfg = STAGE_CONFIGS[idx]!;
  if (!cfg.actId) {
    // Legacy linear unlock: stage N requires stage N-1 cleared.
    if (idx === 0) return true;
    const prev = STAGE_CONFIGS[idx - 1]!;
    return isStageCleared(prev.stageId, stats);
  }
  if (!isActUnlocked(cfg.actId, stats)) return false;
  const act = ACTS.find((a) => a.id === cfg.actId)!;
  if (act.gateStageId === stageId) return isActTrialsCleared(act, stats);
  // Trial: confirm the stageId is in the act's trial list.
  return actStageIds(act).includes(stageId);
}

// ── Card gating ─────────────────────────────────────────────────────────────

/** A card is unlocked if it has no gate, or the gate boss has been defeated. */
export function isCardUnlocked(card: Card, stats: PlayerStats): boolean {
  if (!card.unlockAfterBoss) return true;
  return isBossDefeated(card.unlockAfterBoss, stats);
}

/** Return only the unlocked cards from a pool. */
export function filterUnlockedCards(pool: readonly Card[], stats: PlayerStats): Card[] {
  return pool.filter((c) => isCardUnlocked(c, stats));
}

// ── Talent gating ───────────────────────────────────────────────────────────

/** A talent node is unlocked if it has no boss gate, or the gate boss is dead. */
export function isTalentUnlocked(node: TalentNodeDef, stats: PlayerStats): boolean {
  if (!node.unlockAfterBoss) return true;
  return isBossDefeated(node.unlockAfterBoss, stats);
}

// ── Diff unlocks (for endgame banner) ───────────────────────────────────────

export interface UnlockDiff {
  /** Card IDs that became available because the boss was just defeated. */
  newCards: string[];
  /** Skill IDs that became available because the boss was just defeated. */
  newSkills: string[];
  /** Trophy IDs that became available because the boss was just defeated. */
  newTrophies: TrophyId[];
}

/**
 * Compute what the player just unlocked by comparing stats before and after a
 * run.  Skills are now unlocked via class promotion, so newSkills is always [].
 */
export function diffUnlocks(
  statsBefore: PlayerStats,
  statsAfter: PlayerStats,
  allCards: readonly Card[],
  _allSkills: readonly PrimalSkillDef[],
): UnlockDiff {
  const newCards: string[] = [];

  for (const card of allCards) {
    if (!card.unlockAfterBoss) continue;
    const wasBefore = isCardUnlocked(card, statsBefore);
    const isNow = isCardUnlocked(card, statsAfter);
    if (!wasBefore && isNow) newCards.push(card.id);
  }

  const newTrophies: TrophyId[] = [];
  for (const trophy of TROPHIES) {
    const wasBefore = isBossDefeated(trophy.fromBoss, statsBefore);
    const isNow = isBossDefeated(trophy.fromBoss, statsAfter);
    if (!wasBefore && isNow) newTrophies.push(trophy.id);
  }

  return { newCards, newSkills: [], newTrophies };
}
