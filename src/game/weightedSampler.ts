// ── Weighted random sampler ─────────────────────────────────────────────────
// Pure utility for weighted random selection. Used by the stage compiler
// (enemy tables) and card draw (stage enhance pools).

import type { Rng } from './rng';

export interface WeightedItem<T> {
  item: T;
  weight: number;
}

/**
 * Pick one item at random proportional to weight.
 * All weights must be ≥ 0; at least one must be > 0.
 */
export function weightedPick<T>(entries: WeightedItem<T>[], rng: Rng): T {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) throw new Error('weightedPick: total weight must be > 0');
  let r = rng() * total;
  for (const e of entries) {
    r -= e.weight;
    if (r <= 0) return e.item;
  }
  // Floating-point edge case: return last positive-weight item.
  const last = [...entries].reverse().find(e => e.weight > 0);
  return last!.item;
}

/**
 * Pick `count` distinct items without replacement, proportional to weight.
 * If `count` ≥ number of items with positive weight, all such items are
 * returned in a randomly weighted order.
 */
export function weightedPickN<T>(entries: WeightedItem<T>[], count: number, rng: Rng): T[] {
  if (count <= 0) return [];
  // Work on a mutable copy so we can zero out picked items.
  const pool = entries.map(e => ({ ...e }));
  const result: T[] = [];
  const n = Math.min(count, pool.filter(e => e.weight > 0).length);
  for (let i = 0; i < n; i++) {
    const active = pool.filter(e => e.weight > 0);
    const pick = weightedPick(active, rng);
    result.push(pick);
    // Zero out so it cannot be picked again.
    const entry = pool.find(e => e.item === pick && e.weight > 0);
    if (entry) entry.weight = 0;
  }
  return result;
}
