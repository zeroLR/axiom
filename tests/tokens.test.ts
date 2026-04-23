import { describe, expect, it } from "vitest";

import { REROLL_TOKEN_BASE_COST, STARTING_DRAFT_TOKENS, rerollTokenCostForUse } from "../src/game/config";
import { isEliteKind, spawnEnemy } from "../src/game/entities";
import { createRng } from "../src/game/rng";
import { World, type EnemyKind } from "../src/game/world";

describe("draft token constants", () => {
  it("starting tokens and reroll cost match the concept", () => {
    expect(STARTING_DRAFT_TOKENS).toBe(2);
    expect(REROLL_TOKEN_BASE_COST).toBe(1);
  });

  it("reroll cost scales by +1 per reroll use", () => {
    expect(rerollTokenCostForUse(0)).toBe(1);
    expect(rerollTokenCostForUse(1)).toBe(2);
    expect(rerollTokenCostForUse(2)).toBe(3);
  });
});

describe("elite kind classification", () => {
  it("flags tier-2+ kinds as elite", () => {
    const elites: EnemyKind[] = ["star", "pentagon", "hexagon", "cross", "prism", "octo", "shade"];
    for (const k of elites) expect(isEliteKind(k)).toBe(true);
  });

  it("leaves tier-1 / trivial kinds un-elite", () => {
    const mundane: EnemyKind[] = ["circle", "square", "diamond", "crescent", "spiral", "lance", "boss"];
    for (const k of mundane) expect(isEliteKind(k)).toBe(false);
  });
});

describe("spawnEnemy elite HP multiplier", () => {
  it("applies 1.5× HP (ceiled) to elite-marked kinds", () => {
    const world = new World();
    const rng = createRng(1);
    const id = spawnEnemy(world, "star", rng);
    const e = world.get(id)!;
    expect(e.enemy!.isElite).toBe(true);
    // star base hp = 8 → ceil(8 * 1.5) = 12
    expect(e.hp!.value).toBe(12);
  });

  it("leaves non-elite kinds untouched", () => {
    const world = new World();
    const rng = createRng(1);
    const id = spawnEnemy(world, "circle", rng);
    const e = world.get(id)!;
    expect(e.enemy!.isElite).toBeUndefined();
    expect(e.hp!.value).toBe(3);
  });
});
