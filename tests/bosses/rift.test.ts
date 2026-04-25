import { describe, expect, it } from "vitest";
import { createRng } from "../../src/game/rng";
import { updateRiftPattern } from "../../src/game/bosses/runtime/rift";
import { World, type Components, type WeaponState } from "../../src/game/world";
import { PLAY_H, PLAY_W } from "../../src/game/config";

function weapon(): WeaponState {
  return {
    period: 1.4,
    damage: 1,
    projectileSpeed: 180,
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

function spawnRift(world: World, hp = 460): Components {
  const id = world.create({
    pos: { x: 180, y: 60 },
    vel: { x: 0, y: 0 },
    radius: 24,
    team: "enemy",
    enemy: {
      kind: "boss",
      contactDamage: 1,
      maxSpeed: 42,
      wobblePhase: 0,
      bossPattern: "rift",
      bossPhase: 0,
      bossTimer: 0,
      bossEnraged: false,
    },
    hp: { value: hp },
    weapon: weapon(),
  });
  return world.get(id)!;
}

function shotsWithHoming(world: World): { total: number; homing: number } {
  let total = 0, homing = 0;
  for (const [, c] of world.with("projectile")) {
    if (c.team !== "enemy-shot") continue;
    total += 1;
    if (c.projectile?.homingAvatar) homing += 1;
  }
  return { total, homing };
}

describe("rift runtime (DSL)", () => {
  it("phase 0 fires 2 homing shots normally, 3 when enraged", () => {
    const world = new World();
    const rng = createRng(7);
    const boss = spawnRift(world);
    const noopFan = () => {};

    updateRiftPattern(world, boss, 180, 500, rng, 0.01, noopFan);
    const a = shotsWithHoming(world);
    expect(a.total).toBe(2);
    expect(a.homing).toBe(2);

    const world2 = new World();
    const enraged = spawnRift(world2, 100);
    updateRiftPattern(world2, enraged, 180, 500, rng, 0.01, noopFan);
    expect(enraged.enemy!.bossEnraged).toBe(true);
    const b = shotsWithHoming(world2);
    expect(b.total).toBe(3);
    expect(b.homing).toBe(3);
  });

  it("phase 1 fires a 6-shot radial burst, advancing waypoint index", () => {
    const world = new World();
    const rng = createRng(7);
    const boss = spawnRift(world);
    const noopFan = () => {};

    // Skip phase 0 by setting bossPhase = 1 and timer = 0.
    boss.enemy!.bossPhase = 1;
    boss.enemy!.bossTimer = 0;
    updateRiftPattern(world, boss, 180, 500, rng, 0.01, noopFan);
    const after = shotsWithHoming(world);
    expect(after.total).toBe(6);
    expect(after.homing).toBe(0);
    expect(boss.enemy!.bossWaypointIdx).toBe(1);
  });

  it("phase 2 blinks the boss inside the configured upper bounds", () => {
    const world = new World();
    const rng = createRng(7);
    const boss = spawnRift(world);
    const noopFan = () => {};

    boss.enemy!.bossPhase = 2;
    boss.enemy!.bossTimer = 0;
    boss.pos!.x = -1; boss.pos!.y = -1;
    updateRiftPattern(world, boss, 180, 500, rng, 0.01, noopFan);
    expect(boss.pos!.x).toBeGreaterThanOrEqual(PLAY_W * 0.2);
    expect(boss.pos!.x).toBeLessThanOrEqual(PLAY_W * 0.8);
    expect(boss.pos!.y).toBeGreaterThanOrEqual(PLAY_H * 0.08);
    expect(boss.pos!.y).toBeLessThanOrEqual(PLAY_H * 0.43);
  });
});
