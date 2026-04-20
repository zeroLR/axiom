import { describe, it, expect } from 'vitest';

import { updateBossWeapon } from '../../src/game/systems/bossWeapon';
import { createRng } from '../../src/game/rng';
import { World, type WeaponState } from '../../src/game/world';

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
    team: 'player',
    avatar: {
      hp: 3,
      maxHp: 3,
      speedMul: 1,
      iframes: 0,
      targetX: x,
      targetY: y,
    },
  });
}

function countEnemyShots(world: World): number {
  let count = 0;
  for (const [, c] of world.with('projectile')) {
    if (c.team === 'enemy-shot') count += 1;
  }
  return count;
}

// ── Orthogon tests ──────────────────────────────────────────────────────────

describe('Orthogon boss AI', () => {
  function spawnOrthogonBoss(world: World) {
    return world.create({
      pos: { x: 180, y: 60 },
      vel: { x: 0, y: 0 },
      radius: 22,
      team: 'enemy',
      enemy: {
        kind: 'boss',
        contactDamage: 1,
        maxSpeed: 45,
        wobblePhase: 0,
        bossPattern: 'orthogon',
        bossPhase: 0,
        bossTimer: 0,
        bossEnraged: false,
      },
      hp: { value: 135 },
      weapon: makeBossWeapon(),
    });
  }

  it('starts with telegraph lines on first tick', () => {
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

  it('fires axis shots after telegraph period', () => {
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

  it('fires 8-axis shots when enraged (≤50% HP)', () => {
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

  it('does not fire when dead', () => {
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

describe('Jets boss AI', () => {
  const TICK = 0.016; // simulate at ~60 fps
  const MAX_TICKS = 6000;

  function spawnJetsBoss(world: World) {
    return world.create({
      pos: { x: 180, y: 60 },
      vel: { x: 0, y: 0 },
      radius: 22,
      team: 'enemy',
      enemy: {
        kind: 'boss',
        contactDamage: 1,
        maxSpeed: 60,
        wobblePhase: 0,
        bossPattern: 'jets',
        bossPhase: 0,
        bossTimer: 0, // start immediately
        bossEnraged: false,
      },
      hp: { value: 250 },
      weapon: makeBossWeapon({ period: 1.2, projectileSpeed: 200 }),
    });
  }

  /** Advance until predicate returns true or MAX_TICKS is exhausted. */
  function tickUntil(
    world: World,
    aId: ReturnType<typeof spawnAvatarAt>,
    rng: ReturnType<typeof createRng>,
    pred: () => boolean,
  ): boolean {
    for (let i = 0; i < MAX_TICKS; i++) {
      updateBossWeapon(world, aId, rng, TICK);
      if (pred()) return true;
    }
    return false;
  }

  it('starts gliding toward dash-start wall on first tick', () => {
    const world = new World();
    const rng = createRng(1);
    const aId = spawnAvatarAt(world, 180, 500);
    const bId = spawnJetsBoss(world);

    updateBossWeapon(world, aId, rng, TICK);
    const boss = world.get(bId)!;
    // Phase 0 timer expired immediately → set bossDashTarget, advance to phase 1
    expect(boss.enemy!.bossPhase).toBe(1);
    expect(boss.enemy!.bossDashTarget).toBeDefined();
    // Telegraph not yet shown (boss is still gliding to start position)
    expect(boss.enemy!.bossTelegraphLines).toBeUndefined();
  });

  it('shows telegraph line after arriving at dash-start wall', () => {
    const world = new World();
    const rng = createRng(1);
    const aId = spawnAvatarAt(world, 180, 500);
    const bId = spawnJetsBoss(world);

    // Tick until phase 2 (telegraph hold)
    const reached = tickUntil(
      world,
      aId,
      rng,
      () => world.get(bId)!.enemy!.bossPhase === 2,
    );
    expect(reached).toBe(true);
    const boss = world.get(bId)!;
    expect(boss.enemy!.bossTelegraphLines).toBeDefined();
    expect(boss.enemy!.bossTelegraphLines!.length).toBe(1); // single horizontal dash line
  });

  it('starts fast dash after telegraph expires', () => {
    const world = new World();
    const rng = createRng(1);
    const aId = spawnAvatarAt(world, 180, 500);
    const bId = spawnJetsBoss(world);

    // Tick until phase 3 (fast dash in progress)
    const reached = tickUntil(
      world,
      aId,
      rng,
      () => world.get(bId)!.enemy!.bossPhase === 3,
    );
    expect(reached).toBe(true);
    const boss = world.get(bId)!;
    expect(boss.enemy!.bossTelegraphLines).toBeUndefined(); // telegraph cleared
    expect(boss.enemy!.bossDashTarget).toBeDefined(); // actively dashing
  });

  it('Z-sweep fires one aimed shot per waypoint (4 total)', () => {
    const world = new World();
    const rng = createRng(1);
    const aId = spawnAvatarAt(world, 180, 500);
    const bId = spawnJetsBoss(world);

    // Tick until Z-sweep starts (phase 4)
    tickUntil(world, aId, rng, () => world.get(bId)!.enemy!.bossPhase === 4);
    const shotsBefore = countEnemyShots(world);

    // Tick until Z-sweep ends (phase 5)
    const reached = tickUntil(
      world,
      aId,
      rng,
      () => world.get(bId)!.enemy!.bossPhase === 5,
    );
    expect(reached).toBe(true);
    expect(countEnemyShots(world) - shotsBefore).toBe(4);
  });

  it('fires scatter burst (8 shots) when enraged after completing dash', () => {
    const world = new World();
    const rng = createRng(1);
    const aId = spawnAvatarAt(world, 180, 500);
    const bId = spawnJetsBoss(world);

    // Enrage immediately (below 50% of 250)
    world.get(bId)!.hp!.value = 50;

    // Tick until dash completes and Z-sweep begins (scatter fires at case 3 arrival)
    const reached = tickUntil(
      world,
      aId,
      rng,
      () => world.get(bId)!.enemy!.bossPhase === 4,
    );
    expect(reached).toBe(true);
    expect(world.get(bId)!.enemy!.bossEnraged).toBe(true);
    expect(countEnemyShots(world)).toBe(8); // scatter burst on dash completion
  });

  it('does not fire when dead', () => {
    const world = new World();
    const rng = createRng(1);
    const aId = spawnAvatarAt(world, 180, 500);
    const bId = spawnJetsBoss(world);
    world.get(bId)!.hp!.value = 0;

    for (let i = 0; i < 300; i++) updateBossWeapon(world, aId, rng, TICK);
    expect(countEnemyShots(world)).toBe(0);
  });
});
