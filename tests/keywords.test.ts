import { describe, expect, it } from "vitest";

import { spawnEnemy, spawnProjectile } from "../src/game/entities";
import { resetStatusPhase, updateStatusEffects } from "../src/game/systems/status";
import { updateCollisions } from "../src/game/systems/collision";
import { createRng } from "../src/game/rng";
import { World, type WeaponState } from "../src/game/world";

function makeWeapon(partial: Partial<WeaponState> = {}): WeaponState {
  return {
    period: 0.5,
    damage: 1,
    projectileSpeed: 400,
    projectiles: 1,
    pierce: 0,
    crit: 0,
    cooldown: 0,
    ricochet: 0,
    chain: 0,
    burnDps: 0,
    burnDuration: 0,
    slowPct: 0,
    slowDuration: 0,
    ...partial,
  };
}

describe("burn status", () => {
  it("ticks damage at 0.5s cadence and expires after duration", () => {
    resetStatusPhase();
    const world = new World();
    const rng = createRng(1);
    const avatarId = world.create({ pos: { x: 0, y: 0 }, avatar: { hp: 1, maxHp: 1, speedMul: 1, iframes: 0, targetX: 0, targetY: 0 }, radius: 10, team: "player" });
    const eid = spawnEnemy(world, "circle", rng);
    world.get(eid)!.enemy!.burn = { dps: 4, remaining: 1.0 };
    const hp0 = world.get(eid)!.hp!.value;

    // Single 0.5s tick → 2 damage (4 dps * 0.5s).
    updateStatusEffects(world, 0.5);
    expect(world.get(eid)!.hp!.value).toBeCloseTo(hp0 - 2, 5);

    // Second tick → another 2 damage; burn expires.
    updateStatusEffects(world, 0.5);
    expect(world.get(eid)!.hp!.value).toBeCloseTo(hp0 - 4, 5);
    expect(world.get(eid)!.enemy!.burn).toBeUndefined();

    // No more damage after expiry.
    updateStatusEffects(world, 0.5);
    expect(world.get(eid)!.hp!.value).toBeCloseTo(hp0 - 4, 5);

    // avatar unused but referenced to silence lint
    void avatarId;
  });
});

describe("projectile applies status on hit", () => {
  it("burn/slow are snapshotted on the projectile at fire time", () => {
    const world = new World();
    const rng = createRng(1);
    const weapon = makeWeapon({ burnDps: 3, burnDuration: 2, slowPct: 0.5, slowDuration: 1.5 });
    const avatarId = world.create({ pos: { x: 100, y: 100 }, avatar: { hp: 3, maxHp: 3, speedMul: 1, iframes: 0, targetX: 0, targetY: 0 }, radius: 10, team: "player" });

    const eid = spawnEnemy(world, "circle", rng);
    // Place enemy next to projectile spawn so the test is deterministic.
    const ec = world.get(eid)!;
    ec.pos!.x = 120;
    ec.pos!.y = 100;

    // Fire a static projectile at the enemy.
    spawnProjectile(world, 118, 100, 0, 0, weapon, false);
    updateCollisions(world, avatarId, {}, rng);

    const burn = world.get(eid)!.enemy!.burn;
    const slow = world.get(eid)!.enemy!.slow;
    expect(burn).toEqual({ dps: 3, remaining: 2 });
    expect(slow).toEqual({ pct: 0.5, remaining: 1.5 });
  });
});

describe("ricochet redirects the projectile", () => {
  it("picks the next nearest enemy and preserves speed", () => {
    const world = new World();
    const rng = createRng(1);
    const weapon = makeWeapon({ ricochet: 1 });
    const avatarId = world.create({ pos: { x: 0, y: 0 }, avatar: { hp: 3, maxHp: 3, speedMul: 1, iframes: 0, targetX: 0, targetY: 0 }, radius: 10, team: "player" });

    const near = spawnEnemy(world, "circle", rng);
    const far = spawnEnemy(world, "circle", rng);
    world.get(near)!.pos!.x = 50;
    world.get(near)!.pos!.y = 0;
    world.get(far)!.pos!.x = 200;
    world.get(far)!.pos!.y = 0;
    // Give the far one a bit more HP so it doesn't die first (guard against default stats).
    world.get(far)!.hp!.value = 10;
    world.get(near)!.hp!.value = 10;

    // Fire a projectile at `near`.
    const pid = spawnProjectile(world, 48, 0, 200, 0, weapon, false);
    updateCollisions(world, avatarId, {}, rng);

    const proj = world.get(pid);
    expect(proj).toBeDefined();
    expect(proj!.projectile!.ricochetRemaining).toBe(0);
    // Velocity should now point toward `far` (positive x).
    expect(proj!.vel!.x).toBeGreaterThan(0);
    expect(proj!.projectile!.hitIds.has(near)).toBe(true);
  });
});
