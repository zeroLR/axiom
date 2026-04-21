import { describe, expect, it } from "vitest";
import { ENEMY_REGISTRY, getEnemyDef, getEnemyStats, isEliteKind } from "../../src/game/enemies/registry";

describe("enemy registry", () => {
  it("provides canonical stats for base enemy kinds", () => {
    expect(getEnemyStats("circle")).toEqual({ hp: 3, maxSpeed: 72, contactDamage: 1, radius: 8 });
    expect(getEnemyStats("orthogon")).toEqual({ hp: 135, maxSpeed: 45, contactDamage: 1, radius: 22 });
  });

  it("tracks elite kind metadata in registry", () => {
    expect(isEliteKind("star")).toBe(true);
    expect(isEliteKind("square")).toBe(false);
  });

  it("stores spawn behavior metadata for behavior-driven kinds", () => {
    expect(getEnemyDef("hexagon").spawnBehavior).toBe("shielded");
    expect(getEnemyDef("diamond").spawnBehavior).toBe("dash");
    expect(getEnemyDef("cross").spawnBehavior).toBe("shoot");
    expect(getEnemyDef("crescent").spawnBehavior).toBe("orbit");
    expect(ENEMY_REGISTRY.boss.spawnBehavior).toBeUndefined();
  });
});
