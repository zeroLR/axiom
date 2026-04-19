// ── Card level / upgrade system ──────────────────────────────────────────────
// Tracks card levels within a single run. Duplicate draft picks merge into the
// existing card, levelling it up with diminishing returns. Resets between runs.
//
// Design decisions:
//   1. Levels persist within a run (reset between runs).
//   2. Duplicate picks → merge (level up).
//   3. Diminishing returns per level; multiplicative effects use additive scaling.
//   4. Unified max level for all cards.
//   5. Starting weapon/equipment also counts as a level-1 entry.
//   6. Special-effect cards (synergy, evolution, weapon-class) don't level — deferred.

import type { Card, CardEffect } from "./cards";

/** Unified max card level for every card. */
export const MAX_CARD_LEVEL = 5;

/**
 * Per-level bonus fraction (index 0 = level 1, the first pick).
 * Each subsequent level gives a smaller fraction of the base effect.
 */
const LEVEL_BONUS: readonly number[] = [1.0, 0.7, 0.5, 0.35, 0.25];

/** Returns the bonus fraction for a given level (1-indexed). */
export function levelBonusFraction(level: number): number {
  if (level < 1) return 0;
  if (level > LEVEL_BONUS.length) return LEVEL_BONUS[LEVEL_BONUS.length - 1]!;
  return LEVEL_BONUS[level - 1]!;
}

/** Card effects that support levelling. Synergy / evolution / weapon are excluded. */
export function isLevelableEffect(effect: CardEffect): boolean {
  switch (effect.kind) {
    case "damageAdd":
    case "periodMul":
    case "projectileSpeedMul":
    case "projectilesAdd":
    case "pierceAdd":
    case "critAdd":
    case "maxHpAdd":
    case "speedMul":
    case "ricochetAdd":
    case "chainAdd":
    case "burnAdd":
    case "slowAdd":
      return true;
    default:
      // synergy, shieldRegen, secondChance, hitboxMul, dodgeCD, addWeapon
      return false;
  }
}

/** A single entry in the run inventory. */
export interface CardEntry {
  card: Card;
  level: number;
}

/** Run-scoped card inventory. */
export class CardInventory {
  private readonly entries = new Map<string, CardEntry>();

  /** All current entries (read-only iteration). */
  all(): ReadonlyMap<string, CardEntry> {
    return this.entries;
  }

  /** Get entry by card id, or undefined. */
  get(cardId: string): CardEntry | undefined {
    return this.entries.get(cardId);
  }

  /** Register a new card at level 1. Returns the entry. */
  add(card: Card): CardEntry {
    const entry: CardEntry = { card, level: 1 };
    this.entries.set(card.id, entry);
    return entry;
  }

  /** Check whether a card is already held. */
  has(cardId: string): boolean {
    return this.entries.has(cardId);
  }

  /**
   * Attempt to level up a held card.
   * Returns the new level, or 0 if the card is not held or is already at max.
   */
  levelUp(cardId: string): number {
    const entry = this.entries.get(cardId);
    if (!entry) return 0;
    if (entry.level >= MAX_CARD_LEVEL) return 0;
    entry.level += 1;
    return entry.level;
  }

  /** True if the card can still gain a level. */
  canLevelUp(cardId: string): boolean {
    const entry = this.entries.get(cardId);
    if (!entry) return false;
    return entry.level < MAX_CARD_LEVEL;
  }

  /** Number of distinct cards held. */
  get size(): number {
    return this.entries.size;
  }

  /** Reset for a new run. */
  clear(): void {
    this.entries.clear();
  }
}
