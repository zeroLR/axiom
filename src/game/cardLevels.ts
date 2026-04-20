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

import type { Card, CardEffect, Rarity } from "./cards";

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

const RARITY_RANK: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
};

/** For merged abilities, keep the lower rarity as the primary display rarity. */
export function lowerRarity(a: Rarity, b: Rarity): Rarity {
  return RARITY_RANK[a] <= RARITY_RANK[b] ? a : b;
}

function effectStackKey(effect: CardEffect): string {
  switch (effect.kind) {
    case "damageAdd": return `damageAdd:${effect.value}`;
    case "periodMul": return `periodMul:${effect.value}`;
    case "projectileSpeedMul": return `projectileSpeedMul:${effect.value}`;
    case "projectilesAdd": return `projectilesAdd:${effect.value}`;
    case "pierceAdd": return `pierceAdd:${effect.value}`;
    case "critAdd": return `critAdd:${effect.value}`;
    case "maxHpAdd": return `maxHpAdd:${effect.value}`;
    case "speedMul": return `speedMul:${effect.value}`;
    case "ricochetAdd": return `ricochetAdd:${effect.value}`;
    case "chainAdd": return `chainAdd:${effect.value}`;
    case "burnAdd": return `burnAdd:${effect.dps}:${effect.duration}`;
    case "slowAdd": return `slowAdd:${effect.pct}:${effect.duration}`;
    default: return "";
  }
}

/**
 * Cards with identical levelable effects share one run entry (merged ability).
 * Non-levelable cards are keyed by id.
 */
export function cardStackKey(card: Card): string {
  if (!isLevelableEffect(card.effect)) return `id:${card.id}`;
  return `fx:${effectStackKey(card.effect)}`;
}

/** A single entry in the run inventory. */
export interface CardEntry {
  stackKey: string;
  card: Card;
  rarity: Rarity;
  level: number;
  /** Card ids merged into this same ability stack. */
  sourceCardIds: string[];
}

/** Run-scoped card inventory. */
export class CardInventory {
  private readonly entries = new Map<string, CardEntry>();
  private readonly cardIdToKey = new Map<string, string>();

  /** All current entries (read-only iteration). */
  all(): ReadonlyMap<string, CardEntry> {
    return this.entries;
  }

  /** Get entry by card id, or undefined. */
  get(cardId: string): CardEntry | undefined {
    const key = this.cardIdToKey.get(cardId);
    if (!key) return undefined;
    return this.entries.get(key);
  }

  /** Get entry by card effect-stack identity. */
  getForCard(card: Card): CardEntry | undefined {
    return this.entries.get(cardStackKey(card));
  }

  /** Register a new card at level 1. Returns the entry. */
  add(card: Card): CardEntry {
    const key = cardStackKey(card);
    const existing = this.entries.get(key);
    if (existing) {
      existing.rarity = lowerRarity(existing.rarity, card.rarity);
      if (!existing.sourceCardIds.includes(card.id)) existing.sourceCardIds.push(card.id);
      this.cardIdToKey.set(card.id, key);
      return existing;
    }

    const entry: CardEntry = {
      stackKey: key,
      card,
      rarity: card.rarity,
      level: 1,
      sourceCardIds: [card.id],
    };
    this.entries.set(key, entry);
    this.cardIdToKey.set(card.id, key);
    return entry;
  }

  /** Check whether a card is already held. */
  has(cardId: string): boolean {
    return this.get(cardId) !== undefined;
  }

  /** Check if a card (or duplicate effect) is already held. */
  hasForCard(card: Card): boolean {
    return this.getForCard(card) !== undefined;
  }

  /**
   * Attempt to level up a held card.
   * Returns the new level, or 0 if the card is not held or is already at max.
   */
  levelUp(cardId: string): number {
    const entry = this.get(cardId);
    if (!entry) return 0;
    if (entry.level >= MAX_CARD_LEVEL) return 0;
    entry.level += 1;
    return entry.level;
  }

  /** Level up by card effect-stack identity and merge rarity/source metadata. */
  levelUpForCard(card: Card): number {
    const entry = this.getForCard(card);
    if (!entry) return 0;
    entry.rarity = lowerRarity(entry.rarity, card.rarity);
    if (!entry.sourceCardIds.includes(card.id)) entry.sourceCardIds.push(card.id);
    this.cardIdToKey.set(card.id, entry.stackKey);
    if (entry.level >= MAX_CARD_LEVEL) return 0;
    entry.level += 1;
    return entry.level;
  }

  /** True if the card can still gain a level. */
  canLevelUp(cardId: string): boolean {
    const entry = this.get(cardId);
    if (!entry) return false;
    return entry.level < MAX_CARD_LEVEL;
  }

  /** True if the card/effect stack can still gain a level. */
  canLevelUpForCard(card: Card): boolean {
    const entry = this.getForCard(card);
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
    this.cardIdToKey.clear();
  }
}
