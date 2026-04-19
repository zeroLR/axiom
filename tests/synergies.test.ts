import { describe, expect, it } from "vitest";
import { spawnAvatar, spawnEnemy } from "../src/game/entities";
import { createRng } from "../src/game/rng";
import {
  SYNERGY_CONFIG,
  computeSynergyBonuses,
  explodeAt,
} from "../src/game/synergies";
import { World, type Avatar, type SynergyRuntime } from "../src/game/world";

const makeAvatar = (hp = 4): Avatar => ({
  hp,
  maxHp: 4,
  speedMul: 1,
  iframes: 0,
  targetX: 0,
  targetY: 0,
});

describe("computeSynergyBonuses", () => {
  it("returns neutral bonuses when no synergies", () => {
    const b = computeSynergyBonuses(undefined, makeAvatar(), 0);
    expect(b).toEqual({ damageMul: 1, periodMul: 1, critAdd: 0 });
  });

  it("desperate doubles damage only when hp <= threshold", () => {
    const s: SynergyRuntime[] = [{ id: "desperate" }];
    const t = SYNERGY_CONFIG.desperate.hpThreshold;
    expect(computeSynergyBonuses(s, makeAvatar(t), 0).damageMul).toBe(2);
    expect(computeSynergyBonuses(s, makeAvatar(t - 1), 0).damageMul).toBe(2);
    expect(computeSynergyBonuses(s, makeAvatar(t + 1), 0).damageMul).toBe(1);
  });

  it("kinetic adds crit only while moving", () => {
    const s: SynergyRuntime[] = [{ id: "kinetic" }];
    expect(computeSynergyBonuses(s, makeAvatar(), 10).critAdd).toBe(
      SYNERGY_CONFIG.kinetic.critAdd,
    );
    expect(computeSynergyBonuses(s, makeAvatar(), 0).critAdd).toBe(0);
  });

  it("stillness cuts period only while stationary", () => {
    const s: SynergyRuntime[] = [{ id: "stillness" }];
    expect(computeSynergyBonuses(s, makeAvatar(), 0).periodMul).toBe(
      SYNERGY_CONFIG.stillness.periodMul,
    );
    expect(computeSynergyBonuses(s, makeAvatar(), 10).periodMul).toBe(1);
  });

  it("kinetic + stillness are mutually exclusive by movement", () => {
    const s: SynergyRuntime[] = [{ id: "kinetic" }, { id: "stillness" }];
    const moving = computeSynergyBonuses(s, makeAvatar(), 10);
    expect(moving.critAdd).toBeGreaterThan(0);
    expect(moving.periodMul).toBe(1);
    const still = computeSynergyBonuses(s, makeAvatar(), 0);
    expect(still.critAdd).toBe(0);
    expect(still.periodMul).toBeLessThan(1);
  });

  it("combustion contributes nothing to multipliers", () => {
    const s: SynergyRuntime[] = [{ id: "combustion", killCounter: 5 }];
    expect(computeSynergyBonuses(s, makeAvatar(), 10)).toEqual({
      damageMul: 1,
      periodMul: 1,
      critAdd: 0,
    });
  });
});

describe("explodeAt", () => {
  it("damages enemies inside the radius and skips those outside", () => {
    const world = new World();
    const rng = createRng(1);
    // Spawn three circles; we'll teleport them manually into known positions.
    const a = spawnEnemy(world, "circle", rng);
    const b = spawnEnemy(world, "circle", rng);
    const c = spawnEnemy(world, "circle", rng);
    world.get(a)!.pos = { x: 100, y: 100 };
    world.get(b)!.pos = { x: 140, y: 100 }; // 40 away, inside radius 60
    world.get(c)!.pos = { x: 300, y: 300 }; // far outside

    const hpBefore = {
      a: world.get(a)!.hp!.value,
      b: world.get(b)!.hp!.value,
      c: world.get(c)!.hp!.value,
    };
    explodeAt(world, 100, 100, 60, 2);
    expect(world.get(a)!.hp!.value).toBe(hpBefore.a - 2);
    expect(world.get(b)!.hp!.value).toBe(hpBefore.b - 2);
    expect(world.get(c)!.hp!.value).toBe(hpBefore.c);
  });

  it("absorbs the first hit on a shielded target instead of damaging hp", () => {
    const world = new World();
    const rng = createRng(2);
    const h = spawnEnemy(world, "hexagon", rng);
    world.get(h)!.pos = { x: 0, y: 0 };
    const hpBefore = world.get(h)!.hp!.value;
    explodeAt(world, 0, 0, 60, 99);
    expect(world.get(h)!.hp!.value).toBe(hpBefore); // shield ate it
    expect(world.get(h)!.enemy!.shield).toBe(0);
  });

  it("emits onEnemyKilled for each killed target", () => {
    const world = new World();
    const rng = createRng(3);
    const id = spawnEnemy(world, "circle", rng);
    world.get(id)!.pos = { x: 50, y: 50 };
    const killed: number[] = [];
    explodeAt(world, 50, 50, 20, 999, {
      onEnemyKilled: (eid) => killed.push(eid),
    });
    expect(killed).toEqual([id]);
  });
});

describe("Combustion drafting", () => {
  it("spawnAvatar has no synergies until a card is applied", () => {
    const world = new World();
    const id = spawnAvatar(world);
    expect(world.get(id)!.avatar!.synergies).toBeUndefined();
  });
});
