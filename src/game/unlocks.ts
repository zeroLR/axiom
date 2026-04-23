// ── Unlock gate utilities ────────────────────────────────────────────────────
// Phase 3 of the main-story redesign: cards can be gated behind boss defeats.
// Skills are now gated via class promotion (tier + stageClear requirements),
// not directly by boss-defeat flags.

import type { BossId } from "./bosses/types";
import type { PlayerStats } from "./data/types";
import type { Card } from "./cards";

// ── Mapping ─────────────────────────────────────────────────────────────────

const BOSS_STAGE_INDEX: Record<BossId, number> = {
  orthogon: 0,
  jets: 1,
  mirror: 2,
  lattice: 3,
  rift: 4,
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

// ── Diff unlocks (for endgame banner) ───────────────────────────────────────

export interface UnlockDiff {
  /** Card IDs that became available because the boss was just defeated. */
  newCards: string[];
  /** Skill IDs that became available — now always empty (skills come from class promotions). */
  newSkills: string[];
}

/**
 * Compute what the player just unlocked by comparing stats before and after a
 * run.  `allCards` is the full pool to scan.
 */
export function diffUnlocks(
  statsBefore: PlayerStats,
  statsAfter: PlayerStats,
  allCards: readonly Card[],
): UnlockDiff {
  const newCards: string[] = [];

  for (const card of allCards) {
    if (!card.unlockAfterBoss) continue;
    const wasBefore = isCardUnlocked(card, statsBefore);
    const isNow = isCardUnlocked(card, statsAfter);
    if (!wasBefore && isNow) newCards.push(card.id);
  }

  return { newCards, newSkills: [] };
}
