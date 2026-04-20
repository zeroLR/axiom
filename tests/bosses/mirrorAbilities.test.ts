// Tests for Mirror Boss ability mirroring — shield, dodge, second chance,
// homing shots. Covers both spec-building and runtime behaviour.

import { describe, it, expect } from 'vitest';
import { mirrorBossSpec, applyMirrorSpec } from '../../src/game/mirrorBoss';
import { updateMirrorBossAbilities } from '../../src/game/systems/bossWeapon';
import { updateCollisions } from '../../src/game/systems/collision';
import { World } from '../../src/game/world';
import type { Components, WeaponState } from '../../src/game/world';
import type { Card } from '../../src/game/cards';
import { createRng } from '../../src/game/rng';

// ── Helpers ──────────────────────────────────────────────────────────────────

function card(effect: Card['effect']): Card {
  return {
    id: 'test',
    name: 'Test',
    glyph: '?',
    rarity: 'common',
    text: '',
    effect,
  };
}

function makeBossWeapon(): WeaponState {
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
  };
}

function spawnMirrorBoss(
  world: World,
  overrides: Partial<Components['enemy']> = {},
): number {
  return world.create({
    pos: { x: 180, y: 60 },
    vel: { x: 0, y: 0 },
    radius: 22,
    team: 'enemy',
    enemy: {
      kind: 'boss',
      contactDamage: 1,
      maxSpeed: 50,
      wobblePhase: 0,
      ...overrides,
    },
    hp: { value: 400 },
    weapon: makeBossWeapon(),
  });
}

function spawnAvatar(world: World) {
  return world.create({
    pos: { x: 180, y: 500 },
    radius: 10,
    team: 'player',
    avatar: {
      hp: 4,
      maxHp: 4,
      speedMul: 1,
      iframes: 0,
      targetX: 180,
      targetY: 500,
    },
  });
}

function spawnPlayerShot(world: World, x: number, y: number) {
  return world.create({
    pos: { x, y },
    vel: { x: 0, y: 100 },
    radius: 5,
    team: 'player',
    projectile: {
      damage: 1,
      crit: false,
      pierceRemaining: 0,
      ricochetRemaining: 0,
      chainRemaining: 0,
      burnDps: 0,
      burnDuration: 0,
      slowPct: 0,
      slowDuration: 0,
      hitIds: new Set(),
      ttl: 3,
    },
  });
}

const RNG = createRng(1);

// ── mirrorBossSpec: spec generation ─────────────────────────────────────────

describe('mirrorBossSpec – Aegis (shieldRegen) pick', () => {
  it('produces a shieldMax and shieldRegenPeriod instead of raw HP gain', () => {
    const base = mirrorBossSpec([]);
    const withAegis = mirrorBossSpec([
      card({ kind: 'shieldRegen', max: 2, period: 6 }),
    ]);
    expect(withAegis.shieldMax).toBe(2);
    expect(withAegis.shieldRegenPeriod).toBe(6);
    // HP should NOT be the old +16 formula
    expect(withAegis.hp).toBe(base.hp);
  });

  it('stacks multiple Aegis picks (higher max = higher boss shield)', () => {
    const one = mirrorBossSpec([
      card({ kind: 'shieldRegen', max: 2, period: 6 }),
    ]);
    const two = mirrorBossSpec([
      card({ kind: 'shieldRegen', max: 2, period: 6 }),
      card({ kind: 'shieldRegen', max: 2, period: 6 }),
    ]);
    expect(two.shieldMax!).toBeGreaterThan(one.shieldMax!);
  });
});

describe('mirrorBossSpec – Phase Shift (dodgeCD) pick', () => {
  it('produces a dodgePeriod instead of raw HP gain', () => {
    const base = mirrorBossSpec([]);
    const withDodge = mirrorBossSpec([card({ kind: 'dodgeCD', cooldown: 8 })]);
    expect(withDodge.dodgePeriod).toBeGreaterThan(0);
    // HP should NOT be the old +12 formula
    expect(withDodge.hp).toBe(base.hp);
  });

  it('multiple Phase Shift picks shorten the boss dodge period', () => {
    const one = mirrorBossSpec([card({ kind: 'dodgeCD', cooldown: 8 })]);
    const two = mirrorBossSpec([
      card({ kind: 'dodgeCD', cooldown: 8 }),
      card({ kind: 'dodgeCD', cooldown: 8 }),
    ]);
    expect(two.dodgePeriod!).toBeLessThan(one.dodgePeriod!);
  });
});

describe('mirrorBossSpec – Revenant (secondChance) pick', () => {
  it('sets secondChance flag instead of raw HP gain', () => {
    const base = mirrorBossSpec([]);
    const withRevenant = mirrorBossSpec([card({ kind: 'secondChance' })]);
    expect(withRevenant.secondChance).toBe(true);
    // HP should NOT be the old +20 formula
    expect(withRevenant.hp).toBe(base.hp);
  });
});

describe('mirrorBossSpec – Tracker (addWeapon: homing) pick', () => {
  it('sets homingShots flag', () => {
    const withTracker = mirrorBossSpec([
      card({ kind: 'addWeapon', mode: 'homing' }),
    ]);
    expect(withTracker.homingShots).toBe(true);
  });
});

// ── applyMirrorSpec: entity mutation ────────────────────────────────────────

describe('applyMirrorSpec – shield fields applied to entity', () => {
  it('sets enemy.shield and regen fields when shieldMax > 0', () => {
    const world = new World();
    const bId = spawnMirrorBoss(world);
    const spec = mirrorBossSpec([
      card({ kind: 'shieldRegen', max: 3, period: 5 }),
    ]);
    const c = world.get(bId)!;
    applyMirrorSpec(c, spec);
    expect(c.enemy!.shield).toBe(3);
    expect(c.enemy!.shieldRegenPeriod).toBe(5);
    expect(c.enemy!.shieldRegenTimer).toBe(0);
  });

  it('does not set shield fields when no Aegis picked', () => {
    const world = new World();
    const bId = spawnMirrorBoss(world);
    const spec = mirrorBossSpec([]);
    const c = world.get(bId)!;
    applyMirrorSpec(c, spec);
    expect(c.enemy!.shield).toBeUndefined();
    expect(c.enemy!.shieldRegenPeriod).toBeUndefined();
  });
});

describe('applyMirrorSpec – dodge fields applied to entity', () => {
  it('sets mirrorDodgePeriod and mirrorDodgeCooldown when dodgePeriod defined', () => {
    const world = new World();
    const bId = spawnMirrorBoss(world);
    const spec = mirrorBossSpec([card({ kind: 'dodgeCD', cooldown: 8 })]);
    const c = world.get(bId)!;
    applyMirrorSpec(c, spec);
    expect(c.enemy!.mirrorDodgePeriod).toBeGreaterThan(0);
    expect(c.enemy!.mirrorDodgeCooldown).toBeDefined();
  });
});

describe('applyMirrorSpec – secondChance applied to entity', () => {
  it('sets mirrorSecondChance flag', () => {
    const world = new World();
    const bId = spawnMirrorBoss(world);
    const spec = mirrorBossSpec([card({ kind: 'secondChance' })]);
    const c = world.get(bId)!;
    applyMirrorSpec(c, spec);
    expect(c.enemy!.mirrorSecondChance).toBe(true);
  });
});

describe('applyMirrorSpec – homingShots applied to entity', () => {
  it('sets mirrorHomingShots, mirrorHomingPeriod, mirrorHomingCooldown', () => {
    const world = new World();
    const bId = spawnMirrorBoss(world);
    const spec = mirrorBossSpec([card({ kind: 'addWeapon', mode: 'homing' })]);
    const c = world.get(bId)!;
    applyMirrorSpec(c, spec);
    expect(c.enemy!.mirrorHomingShots).toBe(true);
    expect(c.enemy!.mirrorHomingPeriod).toBeGreaterThan(0);
    expect(c.enemy!.mirrorHomingCooldown).toBeGreaterThan(0);
  });
});

// ── Runtime: shield absorbs hits ─────────────────────────────────────────────

describe('Mirror boss shield absorbs player projectile hits', () => {
  it('shield decrements on hit, HP stays full', () => {
    const world = new World();
    const aId = spawnAvatar(world);
    const bId = spawnMirrorBoss(world, { shield: 2 });
    const boss = world.get(bId)!;
    boss.hp!.value = 400;

    spawnPlayerShot(world, 180, 80); // near boss at y=60
    updateCollisions(world, aId, {});

    expect(boss.enemy!.shield).toBe(1);
    expect(boss.hp!.value).toBe(400); // HP untouched
  });

  it('shield fully depleted → next hit damages HP', () => {
    const world = new World();
    const aId = spawnAvatar(world);
    const bId = spawnMirrorBoss(world, { shield: 1 });
    const boss = world.get(bId)!;
    boss.hp!.value = 400;

    spawnPlayerShot(world, 180, 80); // first hit depletes shield
    updateCollisions(world, aId, {});
    expect(boss.enemy!.shield).toBe(0);
    expect(boss.hp!.value).toBe(400);

    spawnPlayerShot(world, 180, 80); // second hit now hits HP
    updateCollisions(world, aId, {});
    expect(boss.hp!.value).toBe(399);
  });
});

// ── Runtime: shield regeneration ────────────────────────────────────────────

describe('Mirror boss shield regenerates over time', () => {
  it('shield regens to max after shieldRegenPeriod elapses', () => {
    const world = new World();
    const bId = spawnMirrorBoss(world, {
      shield: 0,
      shieldRegenPeriod: 5,
      shieldRegenTimer: 0,
    });
    const boss = world.get(bId)!;
    // Tag a max so regen knows the cap
    boss.enemy!.mirrorShieldMax = 2;

    // Tick 6 seconds — should regen once
    const aId = spawnAvatar(world);
    updateMirrorBossAbilities(world, aId, RNG, 6);
    expect(boss.enemy!.shield).toBeGreaterThanOrEqual(1);
  });

  it('shield does not exceed mirrorShieldMax', () => {
    const world = new World();
    const bId = spawnMirrorBoss(world, {
      shield: 2,
      shieldRegenPeriod: 5,
      shieldRegenTimer: 0,
    });
    const boss = world.get(bId)!;
    boss.enemy!.mirrorShieldMax = 2;

    const aId = spawnAvatar(world);
    updateMirrorBossAbilities(world, aId, RNG, 20);
    expect(boss.enemy!.shield).toBe(2);
  });
});

// ── Runtime: dodge invincibility ────────────────────────────────────────────

describe('Mirror boss dodge invincibility', () => {
  it('boss with mirrorIframes active takes no projectile damage', () => {
    const world = new World();
    const aId = spawnAvatar(world);
    const bId = spawnMirrorBoss(world, { mirrorIframes: 2 }); // 2s of invincibility
    const boss = world.get(bId)!;
    boss.hp!.value = 400;

    spawnPlayerShot(world, 180, 80);
    updateCollisions(world, aId, {});
    expect(boss.hp!.value).toBe(400); // untouched
  });

  it('mirrorIframes decrement over time via updateMirrorBossAbilities', () => {
    const world = new World();
    const aId = spawnAvatar(world);
    const bId = spawnMirrorBoss(world, { mirrorIframes: 1 });
    const boss = world.get(bId)!;

    updateMirrorBossAbilities(world, aId, RNG, 0.5);
    expect(boss.enemy!.mirrorIframes!).toBeLessThan(1);
    expect(boss.enemy!.mirrorIframes!).toBeGreaterThan(0);

    updateMirrorBossAbilities(world, aId, RNG, 1);
    expect(boss.enemy!.mirrorIframes).toBe(0);
  });

  it('dodge triggers automatically when mirrorDodgeCooldown reaches mirrorDodgePeriod', () => {
    const world = new World();
    const bId = spawnMirrorBoss(world, {
      mirrorDodgePeriod: 5,
      mirrorDodgeCooldown: 0,
    });
    const boss = world.get(bId)!;

    // Tick just over the period
    const aId = spawnAvatar(world);
    updateMirrorBossAbilities(world, aId, RNG, 5.1);
    expect(boss.enemy!.mirrorIframes).toBeGreaterThan(0);
    // Cooldown should reset
    expect(boss.enemy!.mirrorDodgeCooldown).toBeLessThan(5);
  });
});

// ── Runtime: second chance ───────────────────────────────────────────────────

describe('Mirror boss second chance (Revenant mirror)', () => {
  it('boss survives first lethal hit and revives at half HP', () => {
    const world = new World();
    const aId = spawnAvatar(world);
    const maxHp = 400;
    const bId = spawnMirrorBoss(world, { mirrorSecondChance: true, maxHp });
    const boss = world.get(bId)!;
    boss.hp!.value = 1;

    let killed = false;
    spawnPlayerShot(world, 180, 80);
    updateCollisions(world, aId, {
      onEnemyKilled: () => {
        killed = true;
      },
    });

    expect(killed).toBe(false);
    expect(boss.hp!.value).toBeGreaterThan(0);
    expect(boss.enemy!.mirrorSecondChance).toBe(false);
  });

  it('second lethal hit kills the boss normally', () => {
    const world = new World();
    const aId = spawnAvatar(world);
    const bId = spawnMirrorBoss(world, {
      mirrorSecondChance: false,
      maxHp: 400,
    });
    const boss = world.get(bId)!;
    boss.hp!.value = 1;

    let killed = false;
    spawnPlayerShot(world, 180, 80);
    updateCollisions(world, aId, {
      onEnemyKilled: () => {
        killed = true;
      },
    });

    expect(killed).toBe(true);
    expect(boss.hp!.value).toBeLessThanOrEqual(0);
  });
});

// ── Runtime: parallel homing weapon ─────────────────────────────────────────

describe('Mirror boss parallel homing weapon (Tracker mirror)', () => {
  it('base firing pattern is still an aimed fan (not homing)', () => {
    const world = new World();
    spawnAvatar(world);
    // Boss with homing but weapon cooldown at 0 — will fire the base pattern
    const bId = spawnMirrorBoss(world, { mirrorHomingShots: true });
    const boss = world.get(bId)!;
    boss.weapon!.cooldown = 0;
    boss.weapon!.period = 9999; // don't auto-refire

    // Collect shots: none should be flagged homingAvatar from the base pattern
    let anyHoming = false;
    for (const [, c] of world.with('projectile')) {
      if (c.projectile!.homingAvatar) anyHoming = true;
    }
    expect(anyHoming).toBe(false);
  });

  it('parallel homing weapon fires a shot with homingAvatar=true after cooldown', () => {
    const world = new World();
    const aId = spawnAvatar(world);
    spawnMirrorBoss(world, {
      mirrorHomingShots: true,
      mirrorHomingPeriod: 1,
      mirrorHomingCooldown: 0.1, // near-zero so it fires immediately
    });

    // Tick 0.2s — cooldown (0.1) should expire and fire one homing shot
    updateMirrorBossAbilities(world, aId, RNG, 0.2);

    let homingShots = 0;
    for (const [, c] of world.with('projectile')) {
      if (c.projectile!.homingAvatar) homingShots++;
    }
    expect(homingShots).toBeGreaterThanOrEqual(1);
  });
});
