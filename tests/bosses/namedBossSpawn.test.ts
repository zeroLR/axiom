import { describe, it, expect } from "vitest";
import { World } from "../../src/game/world";
import { createRng } from "../../src/game/rng";
import { spawnEnemy } from "../../src/game/entities";

// Regression: spawning a named boss kind directly (developer mode, etc.) must
// route through the boss-install path so the entity has `kind='boss'` with the
// correct `bossPattern`, otherwise it renders as a generic enemy and never
// runs its phase-DSL AI.
describe("named-boss spawn routes through install", () => {
  for (const [kind, expectedPattern] of [
    ["orthogon", "orthogon"],
    ["jets", "jets"],
    ["lattice", "lattice"],
    ["rift", "rift"],
    ["nexus", "nexus"],
    ["echo", "echo"],
    ["shard", "shard"],
    ["null", "null"],
  ] as const) {
    it(`spawnEnemy('${kind}') sets enemy.kind='boss' and bossPattern='${expectedPattern}'`, () => {
      const world = new World();
      const rng = createRng(1);
      const id = spawnEnemy(world, kind, rng, []);
      const c = world.get(id)!;
      expect(c.enemy?.kind).toBe("boss");
      expect(c.enemy?.bossPattern).toBe(expectedPattern);
    });
  }
});
