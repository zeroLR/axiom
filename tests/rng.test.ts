import { describe, expect, it } from "vitest";
import { createRng, shuffle } from "../src/game/rng";

describe("createRng", () => {
  it("is deterministic for a given seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const as = [a(), a(), a(), a(), a()];
    const bs = [b(), b(), b(), b(), b()];
    expect(as).toEqual(bs);
  });

  it("produces values in [0, 1)", () => {
    const rng = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("different seeds diverge quickly", () => {
    const a = createRng(1);
    const b = createRng(2);
    const firstTen = Array.from({ length: 10 }, () => [a(), b()]);
    const anyDifferent = firstTen.some(([x, y]) => x !== y);
    expect(anyDifferent).toBe(true);
  });
});

describe("shuffle (Fisher-Yates with seeded rng)", () => {
  it("preserves set membership and length", () => {
    const rng = createRng(7);
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(rng, input);
    expect(out).toHaveLength(input.length);
    expect(out.slice().sort((a, b) => a - b)).toEqual(input);
  });

  it("is deterministic for the same seed", () => {
    const a = shuffle(createRng(123), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const b = shuffle(createRng(123), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(a).toEqual(b);
  });

  it("per-position distribution is roughly uniform over 10k shuffles (smoke)", () => {
    const N = 6;
    const TRIALS = 10_000;
    const rng = createRng(999);
    const counts: number[][] = Array.from({ length: N }, () => Array<number>(N).fill(0));
    const base = Array.from({ length: N }, (_, i) => i);
    for (let t = 0; t < TRIALS; t++) {
      const s = shuffle(rng, base);
      for (let i = 0; i < N; i++) counts[i]![s[i]!]++;
    }
    const expected = TRIALS / N;
    // Fisher-Yates with a decent PRNG should land every cell well within ±15%.
    for (let i = 0; i < N; i++) {
      for (let v = 0; v < N; v++) {
        const c = counts[i]![v]!;
        expect(Math.abs(c - expected) / expected).toBeLessThan(0.15);
      }
    }
  });
});
