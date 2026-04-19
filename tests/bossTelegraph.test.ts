import { describe, expect, it } from "vitest";

import { BOSS_TELEGRAPH_LEAD, updateBossWeapon } from "../src/game/systems/bossWeapon";
import { createRng } from "../src/game/rng";
import { World, type WeaponState } from "../src/game/world";

function makeBossWeapon(partial: Partial<WeaponState> = {}): WeaponState {
  return {
    period: 1.1,
    damage: 1,
    projectileSpeed: 200,
    projectiles: 1,
    pierce: 0,
    crit: 0,
    cooldown: 1.0,
    ricochet: 0,
    chain: 0,
    burnDps: 0,
    burnDuration: 0,
    slowPct: 0,
    slowDuration: 0,
    ...partial,
  };
}

function spawnAvatarAt(world: World, x: number, y: number) {
  return world.create({
    pos: { x, y },
    radius: 10,
    team: "player",
    avatar: { hp: 3, maxHp: 3, speedMul: 1, iframes: 0, targetX: x, targetY: y },
  });
}

function spawnBossAt(world: World, x: number, y: number, weapon: WeaponState) {
  return world.create({
    pos: { x, y },
    vel: { x: 0, y: 0 },
    radius: 22,
    team: "enemy",
    enemy: { kind: "boss", contactDamage: 1, maxSpeed: 52, wobblePhase: 0 },
    hp: { value: 60 },
    weapon,
  });
}

describe("boss telegraph", () => {
  it("snapshots aim once cooldown enters the lead window", () => {
    const world = new World();
    const rng = createRng(1);
    const aId = spawnAvatarAt(world, 100, 100);
    const bId = spawnBossAt(world, 100, 0, makeBossWeapon({ cooldown: 1.0 }));

    // Cooldown 1.0 → 0.95: still above the 0.8s lead, no telegraph yet.
    updateBossWeapon(world, aId, rng, 0.05);
    expect(world.get(bId)!.enemy!.telegraphAngle).toBeUndefined();

    // Crossing into the lead window locks in the aim.
    updateBossWeapon(world, aId, rng, 0.2);
    const snapped = world.get(bId)!.enemy!.telegraphAngle;
    expect(snapped).toBeDefined();
    // Avatar is directly below boss (dy = 100, dx = 0) → angle = π/2.
    expect(snapped!).toBeCloseTo(Math.PI / 2, 5);
  });

  it("does not re-aim mid-telegraph when the avatar moves", () => {
    const world = new World();
    const rng = createRng(1);
    const aId = spawnAvatarAt(world, 100, 100);
    const bId = spawnBossAt(world, 100, 0, makeBossWeapon({ cooldown: 0.5 }));

    updateBossWeapon(world, aId, rng, 0.01);
    const snapped = world.get(bId)!.enemy!.telegraphAngle;
    expect(snapped).toBeCloseTo(Math.PI / 2, 5);

    // Teleport avatar hard left while the boss is still winding up.
    world.get(aId)!.pos!.x = -200;
    world.get(aId)!.pos!.y = 0;

    updateBossWeapon(world, aId, rng, 0.1);
    // Stored aim must stay glued to where the warning was drawn.
    expect(world.get(bId)!.enemy!.telegraphAngle).toBeCloseTo(snapped!, 5);
  });

  it("fires toward the snapshotted aim, not the avatar's current pos", () => {
    const world = new World();
    const rng = createRng(1);
    const aId = spawnAvatarAt(world, 100, 100);
    const bId = spawnBossAt(world, 100, 0, makeBossWeapon({ cooldown: 0.5 }));

    updateBossWeapon(world, aId, rng, 0.01);
    expect(world.get(bId)!.enemy!.telegraphAngle).toBeCloseTo(Math.PI / 2, 5);

    // Fake the player dodging during the warning.
    world.get(aId)!.pos!.x = 999;
    world.get(aId)!.pos!.y = -999;

    // Tick past cooldown so the shot fires.
    updateBossWeapon(world, aId, rng, 0.6);

    // Cooldown reset and telegraph cleared.
    expect(world.get(bId)!.weapon!.cooldown).toBeCloseTo(1.1, 5);
    expect(world.get(bId)!.enemy!.telegraphAngle).toBeUndefined();

    // Exactly one enemy-shot fired, aimed downward (along the snapshot).
    let count = 0;
    let vx = 0;
    let vy = 0;
    for (const [, c] of world.with("projectile", "vel")) {
      if (c.team !== "enemy-shot") continue;
      count += 1;
      vx = c.vel!.x;
      vy = c.vel!.y;
    }
    expect(count).toBe(1);
    expect(vx).toBeCloseTo(0, 4);
    expect(vy).toBeCloseTo(200, 4);
  });

  it("exposes a lead time within concept.md's ~0.8s window", () => {
    // Sanity check: tying the constant to tests guards the concept spec.
    expect(BOSS_TELEGRAPH_LEAD).toBeGreaterThan(0.5);
    expect(BOSS_TELEGRAPH_LEAD).toBeLessThan(1.2);
  });
});
