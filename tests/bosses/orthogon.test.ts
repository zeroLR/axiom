import { describe, expect, it } from "vitest";
import { createRng } from "../../src/game/rng";
import { updateOrthogonPattern } from "../../src/game/bosses/runtime/orthogon";
import { World, type Components, type WeaponState } from "../../src/game/world";

function weapon(partial: Partial<WeaponState> = {}): WeaponState {
  return {
    period: 1.4,
    damage: 1,
    projectileSpeed: 190,
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
    ...partial,
  };
}

function spawnOrthogonBoss(world: World): Components {
  const id = world.create({
    pos: { x: 180, y: 60 },
    vel: { x: 0, y: 0 },
    radius: 22,
    team: "enemy",
    enemy: {
      kind: "boss",
      contactDamage: 1,
      maxSpeed: 45,
      wobblePhase: 0,
      bossPattern: "orthogon",
      bossPhase: 0,
      bossTimer: 0,
      bossEnraged: false,
    },
    hp: { value: 135 },
    weapon: weapon(),
  });
  return world.get(id)!;
}

function countEnemyShots(world: World): number {
  let count = 0;
  for (const [, c] of world.with("projectile")) {
    if (c.team === "enemy-shot") count += 1;
  }
  return count;
}

describe("orthogon runtime", () => {
  it("creates telegraph lines and then fires axis shots", () => {
    const world = new World();
    const rng = createRng(1);
    const boss = spawnOrthogonBoss(world);
    const noopFan = () => {};

    updateOrthogonPattern(world, boss, 180, 500, rng, 0.01, noopFan);
    expect(boss.enemy!.bossTelegraphLines?.length).toBe(4);
    updateOrthogonPattern(world, boss, 180, 500, rng, 0.85, noopFan);
    expect(countEnemyShots(world)).toBe(12);
  });

  it("uses 8-axis lines when enraged", () => {
    const world = new World();
    const rng = createRng(1);
    const boss = spawnOrthogonBoss(world);
    boss.hp!.value = 40;
    const noopFan = () => {};

    updateOrthogonPattern(world, boss, 180, 500, rng, 0.01, noopFan);
    expect(boss.enemy!.bossTelegraphLines?.length).toBe(8);
  });
});
