import { describe, expect, it } from "vitest";
import { createRng } from "../../src/game/rng";
import { updateLatticePattern } from "../../src/game/bosses/runtime/lattice";
import { World, type Components, type WeaponState } from "../../src/game/world";

function weapon(): WeaponState {
  return {
    period: 1.6,
    damage: 1,
    projectileSpeed: 200,
    projectiles: 2,
    pierce: 0,
    crit: 0,
    cooldown: 1.2,
    ricochet: 0,
    chain: 0,
    burnDps: 0,
    burnDuration: 0,
    slowPct: 0,
    slowDuration: 0,
  };
}

function spawnLattice(world: World, hp = 320): Components {
  const id = world.create({
    pos: { x: 180, y: 60 },
    vel: { x: 0, y: 0 },
    radius: 24,
    team: "enemy",
    enemy: {
      kind: "boss",
      contactDamage: 1,
      maxSpeed: 38,
      wobblePhase: 0,
      bossPattern: "lattice",
      bossPhase: 0,
      bossTimer: 0,
      bossEnraged: false,
    },
    hp: { value: hp },
    weapon: weapon(),
  });
  return world.get(id)!;
}

function countShots(world: World): number {
  let n = 0;
  for (const [, c] of world.with("projectile")) {
    if (c.team === "enemy-shot") n += 1;
  }
  return n;
}

describe("lattice runtime (DSL)", () => {
  it("telegraphs 4 cardinal axes then fires 4 shots per axis = 16 shots", () => {
    const world = new World();
    const rng = createRng(1);
    const boss = spawnLattice(world);
    const noopFan = () => {};

    updateLatticePattern(world, boss, 180, 500, rng, 0.01, noopFan);
    expect(boss.enemy!.bossTelegraphLines?.length).toBe(4);

    updateLatticePattern(world, boss, 180, 500, rng, 0.75, noopFan);
    expect(countShots(world)).toBe(16);
    expect(boss.enemy!.bossTelegraphLines).toBeUndefined();
  });

  it("expands to 8 axes when enraged", () => {
    const world = new World();
    const rng = createRng(1);
    const boss = spawnLattice(world, 100); // ≤50% of 320
    const noopFan = () => {};

    updateLatticePattern(world, boss, 180, 500, rng, 0.01, noopFan);
    expect(boss.enemy!.bossEnraged).toBe(true);
    expect(boss.enemy!.bossTelegraphLines?.length).toBe(8);
  });
});
