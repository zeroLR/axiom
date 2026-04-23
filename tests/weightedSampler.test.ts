import { describe, it, expect } from 'vitest';
import { weightedPick, weightedPickN } from '../src/game/weightedSampler';
import { createRng } from '../src/game/rng';

describe('weightedPick', () => {
  it('returns the only item when there is one', () => {
    const rng = createRng(1);
    const result = weightedPick([{ item: 'a', weight: 10 }], rng);
    expect(result).toBe('a');
  });

  it('always returns the item with the only positive weight', () => {
    const rng = createRng(42);
    for (let i = 0; i < 20; i++) {
      const result = weightedPick([{ item: 'x', weight: 0 }, { item: 'y', weight: 5 }], rng);
      expect(result).toBe('y');
    }
  });

  it('throws when total weight is zero', () => {
    const rng = createRng(1);
    expect(() => weightedPick([{ item: 'a', weight: 0 }], rng)).toThrow();
  });

  it('respects relative weights (high-weight item should dominate)', () => {
    const rng = createRng(7);
    const counts: Record<string, number> = { common: 0, rare: 0 };
    for (let i = 0; i < 1000; i++) {
      const pick = weightedPick(
        [{ item: 'common', weight: 90 }, { item: 'rare', weight: 10 }],
        rng,
      );
      counts[pick]!++;
    }
    // "common" should appear roughly 9× more than "rare"
    expect(counts.common).toBeGreaterThan(counts.rare * 5);
  });

  it('is deterministic for the same seed', () => {
    const a = weightedPick([{ item: 1, weight: 1 }, { item: 2, weight: 1 }], createRng(99));
    const b = weightedPick([{ item: 1, weight: 1 }, { item: 2, weight: 1 }], createRng(99));
    expect(a).toBe(b);
  });
});

describe('weightedPickN', () => {
  it('returns requested count of distinct items', () => {
    const rng = createRng(5);
    const items = [
      { item: 'a', weight: 1 },
      { item: 'b', weight: 1 },
      { item: 'c', weight: 1 },
      { item: 'd', weight: 1 },
    ];
    const picks = weightedPickN(items, 3, rng);
    expect(picks).toHaveLength(3);
    expect(new Set(picks).size).toBe(3);
  });

  it('returns empty array when count is 0', () => {
    const rng = createRng(1);
    expect(weightedPickN([{ item: 'a', weight: 1 }], 0, rng)).toEqual([]);
  });

  it('returns all items when count exceeds pool', () => {
    const rng = createRng(1);
    const items = [{ item: 'x', weight: 1 }, { item: 'y', weight: 2 }];
    const picks = weightedPickN(items, 10, rng);
    expect(picks).toHaveLength(2);
    expect(picks.sort()).toEqual(['x', 'y']);
  });

  it('is deterministic for the same seed', () => {
    const items = [1, 2, 3, 4, 5].map(i => ({ item: i, weight: i }));
    const a = weightedPickN(items, 3, createRng(22));
    const b = weightedPickN(items, 3, createRng(22));
    expect(a).toEqual(b);
  });

  it('skips zero-weight items', () => {
    const rng = createRng(1);
    const items = [
      { item: 'zero', weight: 0 },
      { item: 'nonzero', weight: 5 },
    ];
    const picks = weightedPickN(items, 2, rng);
    expect(picks).not.toContain('zero');
    expect(picks).toContain('nonzero');
  });
});
