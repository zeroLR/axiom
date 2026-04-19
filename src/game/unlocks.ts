// ── Unlock gate utilities ────────────────────────────────────────────────────
// Phase 3 of the main-story redesign: cards and skills can be gated behind
// boss defeats. This module provides pure helpers that read `PlayerStats` to
// determine what is available.

import type { BossId } from "./bosses/types";
import type { PlayerStats } from "./data/types";
import type { Card } from "./cards";
import type { PrimalSkillDef } from "./skills";

// ── Mapping ─────────────────────────────────────────────────────────────────

const BOSS_STAGE_INDEX: Record<BossId, number> = {
  orthogon: 0,
  jets: 1,
  mirror: 2,
};

/** Return the 0-based stage index associated with a boss. */
export function bossToStageIndex(id: BossId): number {
  return BOSS_STAGE_INDEX[id];
}

/** Has the player defeated the given boss at least once? */
export function isBossDefeated(id: BossId, stats: PlayerStats): boolean {
  const idx = bossToStageIndex(id);
  return stats.normalCleared?.[idx] === true;
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

// ── Skill gating ────────────────────────────────────────────────────────────

/** A skill is unlocked if it has no gate, or the gate boss has been defeated. */
export function isSkillUnlocked(def: PrimalSkillDef, stats: PlayerStats): boolean {
  if (!def.unlockAfterBoss) return true;
  return isBossDefeated(def.unlockAfterBoss, stats);
}

// ── Diff unlocks (for endgame banner) ───────────────────────────────────────

export interface UnlockDiff {
  /** Card IDs that became available because the boss was just defeated. */
  newCards: string[];
  /** Skill IDs that became available because the boss was just defeated. */
  newSkills: string[];
}

/**
 * Compute what the player just unlocked by comparing stats before and after a
 * run.  `allCards` / `allSkills` are the full pools to scan.
 */
export function diffUnlocks(
  statsBefore: PlayerStats,
  statsAfter: PlayerStats,
  allCards: readonly Card[],
  allSkills: readonly PrimalSkillDef[],
): UnlockDiff {
  const newCards: string[] = [];
  const newSkills: string[] = [];

  for (const card of allCards) {
    if (!card.unlockAfterBoss) continue;
    const wasBefore = isCardUnlocked(card, statsBefore);
    const isNow = isCardUnlocked(card, statsAfter);
    if (!wasBefore && isNow) newCards.push(card.id);
  }

  for (const skill of allSkills) {
    if (!skill.unlockAfterBoss) continue;
    const wasBefore = isSkillUnlocked(skill, statsBefore);
    const isNow = isSkillUnlocked(skill, statsAfter);
    if (!wasBefore && isNow) newSkills.push(skill.id);
  }

  return { newCards, newSkills };
}
