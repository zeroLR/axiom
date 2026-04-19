import { describe, it, expect } from "vitest";

import { updateBossWeapon } from "../../src/game/systems/bossWeapon";
import { createRng } from "../../src/game/rng";
import { World, type WeaponState } from "../../src/game/world";

function makeBossWeapon(partial: Partial<WeaponState> = {}): WeaponState {
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

function spawnAvatarAt(world: World, x: number, y: number) {
  return world.create({
    pos: { x, y },
    radius: 10,
    team: "player",
    avatar: { hp: 3, maxHp: 3, speedMul: 1, iframes: 0, targetX: x, targetY: y },
  });
}

function countEnemyShots(world: World): number {
  let count = 0;
  for (const [, c] of world.with("projectile")) {
    if (c.team === "enemy-shot") count += 1;
  }
  return count;
}

// ── Orthogon tests ──────────────────────────────────────────────────────────

describe("Orthogon boss AI", () => {
  function spawnOrthogonBoss(world: World) {
    return world.create({
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
      hp: { value: 45 },
      weapon: makeBossWeapon(),
    });
  }

  it("starts with telegraph lines on first tick", () => {
    const world = new World();
    const rng = createRng(1);
    const aId = spawnAvatarAt(world, 180, 500);
    const bId = spawnOrthogonBoss(world);

    // First tick: timer ≤ 0 → enters phase 0 → sets telegraph lines
    updateBossWeapon(world, aId, rng, 0.01);
    const boss = world.get(bId)!;
    expect(boss.enemy!.bossTelegraphLines).toBeDefined();
    expect(boss.enemy!.bossTelegraphLines!.length).toBe(4); // 4 cardinal axes
    expect(boss.enemy!.bossPhase).toBe(1);
  });

  it("fires axis shots after telegraph period", () => {
    const world = new World();
    const rng = createRng(1);
    const aId = spawnAvatarAt(world, 180, 500);
    spawnOrthogonBoss(world);

    // Tick into telegraph
    updateBossWeapon(world, aId, rng, 0.01);
    expect(countEnemyShots(world)).toBe(0);

    // Tick past telegraph (0.8s)
    updateBossWeapon(world, aId, rng, 0.85);

    // Should have fired 4 axes × 3 shots per axis = 12 shots
    expect(countEnemyShots(world)).toBe(12);
  });

  it("fires 8-axis shots when enraged (≤50% HP)", () => {
    const world = new World();
    const rng = createRng(1);
    const aId = spawnAvatarAt(world, 180, 500);
    const bId = spawnOrthogonBoss(world);

    // Set HP below 50%
    world.get(bId)!.hp!.value = 20;

    // Tick into telegraph
    updateBossWeapon(world, aId, rng, 0.01);
    const boss = world.get(bId)!;
    expect(boss.enemy!.bossEnraged).toBe(true);
    expect(boss.enemy!.bossTelegraphLines!.length).toBe(8); // 4 cardinal + 4 diagonal

    // Tick past telegraph
    updateBossWeapon(world, aId, rng, 0.85);

    // Should have fired 8 axes × 3 shots per axis = 24 shots
    expect(countEnemyShots(world)).toBe(24);
  });

  it("does not fire when dead", () => {
    const world = new World();
    const rng = createRng(1);
    const aId = spawnAvatarAt(world, 180, 500);
    const bId = spawnOrthogonBoss(world);
    world.get(bId)!.hp!.value = 0;

    updateBossWeapon(world, aId, rng, 5);
    expect(countEnemyShots(world)).toBe(0);
  });
});

// ── Jets tests ──────────────────────────────────────────────────────────────

describe("Jets boss AI", () => {
  function spawnJetsBoss(world: World) {
    return world.create({
      pos: { x: 180, y: 60 },
      vel: { x: 0, y: 0 },
      radius: 22,
      team: "enemy",
      enemy: {
        kind: "boss",
        contactDamage: 1,
        maxSpeed: 60,
        wobblePhase: 0,
        bossPattern: "jets",
        bossPhase: 0,
        bossTimer: 0, // start immediately
        bossEnraged: false,
      },
      hp: { value: 55 },
      weapon: makeBossWeapon({ period: 1.2, projectileSpeed: 200 }),
    });
  }

  it("starts side-wall dash on first tick", () => {
    const world = new World();
    const rng = createRng(1);
    const aId = spawnAvatarAt(world, 180, 500);
    const bId = spawnJetsBoss(world);

    updateBossWeapon(world, aId, rng, 0.01);
    const boss = world.get(bId)!;
    // Should have moved to a side wall and set dash target
    expect(boss.enemy!.bossPhase).toBe(1); // dashing phase
    expect(boss.enemy!.bossDashTarget).toBeDefined();
    // Telegraph active
    expect(boss.enemy!.telegraphAngle).toBeDefined();
  });

  it("completes dash and moves to Z-sweep", () => {
    const world = new World();
    const rng = createRng(1);
    const aId = spawnAvatarAt(world, 180, 500);
    const bId = spawnJetsBoss(world);

    // Enter dash telegraph
    updateBossWeapon(world, aId, rng, 0.01);
    expect(world.get(bId)!.enemy!.bossPhase).toBe(1);

    // Complete dash (tick past telegraph)
    updateBossWeapon(world, aId, rng, 0.85);
    expect(world.get(bId)!.enemy!.bossPhase).toBe(2);
    // Telegraph cleared
    expect(world.get(bId)!.enemy!.telegraphAngle).toBeUndefined();
  });

  it("Z-sweep fires shots from waypoints", () => {
    const world = new World();
    const rng = createRng(1);
    const aId = spawnAvatarAt(world, 180, 500);
    spawnJetsBoss(world);

    // Advance to Z-sweep (phase 2)
    updateBossWeapon(world, aId, rng, 0.01); // → phase 1
    updateBossWeapon(world, aId, rng, 0.85); // → phase 2

    const shotsBeforeZsweep = countEnemyShots(world);

    // Complete the pause and trigger Z-sweep
    updateBossWeapon(world, aId, rng, 1.3);
    const shotsAfterZsweep = countEnemyShots(world);

    // Z-sweep fires 4 waypoint shots
    expect(shotsAfterZsweep - shotsBeforeZsweep).toBe(4);
  });

  it("fires scatter burst when enraged after completing dash", () => {
    const world = new World();
    const rng = createRng(1);
    const aId = spawnAvatarAt(world, 180, 500);
    const bId = spawnJetsBoss(world);

    // Set HP below 50% before first action
    world.get(bId)!.hp!.value = 25;

    // Enter dash telegraph
    updateBossWeapon(world, aId, rng, 0.01);
    expect(world.get(bId)!.enemy!.bossEnraged).toBe(true);

    // Complete dash (tick past telegraph)
    updateBossWeapon(world, aId, rng, 0.85);

    // Enraged dash should fire scatter burst (8 shots) in addition to normal behavior
    expect(countEnemyShots(world)).toBe(8); // scatter burst
  });

  it("does not fire when dead", () => {
    const world = new World();
    const rng = createRng(1);
    const aId = spawnAvatarAt(world, 180, 500);
    const bId = spawnJetsBoss(world);
    world.get(bId)!.hp!.value = 0;

    updateBossWeapon(world, aId, rng, 5);
    expect(countEnemyShots(world)).toBe(0);
  });
});
