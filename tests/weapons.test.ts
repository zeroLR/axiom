import { describe, expect, it } from 'vitest';

import {
  applyCard,
  MAX_EXTRA_WEAPONS,
  POOL,
  type Card,
} from '../src/game/cards';
import { spawnAvatar, spawnEnemy, spawnProjectile } from '../src/game/entities';
import { mirrorBossSpec } from '../src/game/mirrorBoss';
import { createRng } from '../src/game/rng';
import { updateCollisions } from '../src/game/systems/collision';
import { updateProjectileMotion } from '../src/game/systems/motion';
import { updateWeapon } from '../src/game/systems/weapon';
import { type WeaponMode, type WeaponState, World } from '../src/game/world';

const cardById = (id: string): Card => {
  const found = POOL.find((c) => c.id === id);
  if (!found) throw new Error(`no card '${id}'`);
  return found;
};

function placeEnemyAt(world: World, x: number, y: number, hp = 99): number {
  const eid = spawnEnemy(world, 'circle', createRng(1));
  const ec = world.get(eid)!;
  ec.pos!.x = x;
  ec.pos!.y = y;
  ec.hp!.value = hp;
  return eid;
}

const WEAPON_CARDS: { id: string; mode: WeaponMode }[] = [
  { id: 'wpnFaceBeam', mode: 'faceBeam' },
  { id: 'wpnOrbitShard', mode: 'orbitShard' },
  { id: 'wpnHoming', mode: 'homing' },
  { id: 'wpnBurst', mode: 'burst' },
  { id: 'wpnFan', mode: 'fan' },
  { id: 'wpnCharge', mode: 'charge' },
];

describe('Weapon cards: applyCard adds to extraWeapons', () => {
  for (const { id, mode } of WEAPON_CARDS) {
    it(`'${id}' appends a weapon with mode='${mode}'`, () => {
      const world = new World();
      const aid = spawnAvatar(world);
      const before = world.get(aid)!.weapon!;
      const beforeStats: WeaponState = { ...before };
      applyCard(world, aid, cardById(id));
      const av = world.get(aid)!;
      // Primary weapon unchanged.
      expect(av.weapon!.mode).toBe(beforeStats.mode);
      expect(av.weapon!.damage).toBe(beforeStats.damage);
      expect(av.weapon!.period).toBe(beforeStats.period);
      // Extra weapon appended with the right mode.
      expect(av.avatar!.extraWeapons).toBeDefined();
      expect(av.avatar!.extraWeapons!).toHaveLength(1);
      expect(av.avatar!.extraWeapons![0]!.mode).toBe(mode);
    });
  }

  it('respects MAX_EXTRA_WEAPONS soft cap', () => {
    const world = new World();
    const aid = spawnAvatar(world);
    for (let i = 0; i < MAX_EXTRA_WEAPONS + 2; i++) {
      applyCard(world, aid, cardById('wpnHoming'));
    }
    expect(world.get(aid)!.avatar!.extraWeapons!).toHaveLength(
      MAX_EXTRA_WEAPONS,
    );
  });
});

describe('updateWeapon iterates primary + extras', () => {
  it('primary fires one shot and the extra adds its own', () => {
    const world = new World();
    const aid = spawnAvatar(world);
    placeEnemyAt(world, 200, 120);
    applyCard(world, aid, cardById('wpnHoming'));
    const av = world.get(aid)!;
    av.weapon!.cooldown = 0;
    av.avatar!.extraWeapons![0]!.cooldown = 0;
    updateWeapon(world, aid, () => 0, 0.016);
    const shots = Array.from(world.with('projectile'));
    // Primary (vertex, 1 projectile) + homing extra (1 projectile) = 2 total.
    expect(shots).toHaveLength(2);
    // At least one of the shots should be flagged homing.
    const homingCount = shots.filter(([, c]) => c.projectile?.homing).length;
    expect(homingCount).toBe(1);
  });
});

describe('Weapon mode behaviours', () => {
  it('homing mode marks its projectile and steers velocity toward target', () => {
    const world = new World();
    const aid = spawnAvatar(world);
    // Place enemy directly above the avatar so the missile must turn upward.
    const av = world.get(aid)!;
    placeEnemyAt(world, av.pos!.x, av.pos!.y - 100);
    applyCard(world, aid, cardById('wpnHoming'));
    av.weapon!.cooldown = Infinity; // skip primary
    av.avatar!.extraWeapons![0]!.cooldown = 0;
    updateWeapon(world, aid, () => 0, 0.016);
    const [, projC] = Array.from(world.with('projectile'))[0]!;
    expect(projC.projectile?.homing).toBe(true);
    // Force initial velocity to be perpendicular to target so the steer must
    // bend it. Then run motion and verify vy turned negative (toward enemy).
    projC.vel!.x = 200;
    projC.vel!.y = 0;
    updateProjectileMotion(world, 0.05);
    expect(projC.vel!.y).toBeLessThan(0);
  });

  it("burst mode's projectile fragments when consumed", () => {
    const world = new World();
    const aid = spawnAvatar(world);
    const av = world.get(aid)!;
    // Enemy with hp=1 so the burst projectile one-shots it; the dead enemy is
    // skipped by the inner loop, so fragments born in the same updateCollisions
    // iteration don't immediately re-collide and consume themselves.
    placeEnemyAt(world, av.pos!.x + 8, av.pos!.y, 1);
    applyCard(world, aid, cardById('wpnBurst'));
    av.weapon!.cooldown = Infinity; // skip primary
    av.avatar!.extraWeapons![0]!.cooldown = 0;
    updateWeapon(world, aid, () => 0, 0.016);
    const before = Array.from(world.with('projectile'));
    expect(before).toHaveLength(1);
    expect(before[0]?.[1].projectile?.burstFragments).toBe(6);
    // Tick collision so the projectile lands and is consumed.
    updateCollisions(world, aid, {});
    const after = Array.from(world.with('projectile'));
    // Original gone; 6 fragments spawned.
    expect(after).toHaveLength(6);
    for (const [, c] of after) {
      expect(c.projectile?.burstFragments).toBeUndefined();
    }
  });

  it('burst fragments also spawn on ttl expiry', () => {
    const world = new World();
    // Spawn a burst projectile manually with a tiny ttl so motion expires it.
    // dt must be < fragment ttl (0.45) so fragments born during the same loop
    // iteration aren't themselves expired and removed on the same call.
    const w: WeaponState = {
      mode: 'burst',
      period: 1,
      damage: 4,
      projectileSpeed: 200,
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
    };
    const pid = spawnProjectile(world, 100, 100, 50, 0, w, false, 0.01);
    world.get(pid)!.projectile!.burstFragments = 6;
    updateProjectileMotion(world, 0.05); // > original ttl, < fragment ttl
    const after = Array.from(world.with('projectile'));
    expect(after).toHaveLength(6);
  });

  it('fan mode forces a 5-shot spread', () => {
    const world = new World();
    const aid = spawnAvatar(world);
    placeEnemyAt(world, 200, 120);
    applyCard(world, aid, cardById('wpnFan'));
    const av = world.get(aid)!;
    av.weapon!.cooldown = Infinity; // skip primary
    av.avatar!.extraWeapons![0]!.cooldown = 0;
    updateWeapon(world, aid, () => 0, 0.016);
    const shots = Array.from(world.with('projectile'));
    expect(shots).toHaveLength(5);
  });

  it("charge mode sets high pierce so it doesn't despawn on first hit", () => {
    const world = new World();
    const aid = spawnAvatar(world);
    placeEnemyAt(world, 200, 120);
    applyCard(world, aid, cardById('wpnCharge'));
    const av = world.get(aid)!;
    av.weapon!.cooldown = Infinity;
    av.avatar!.extraWeapons![0]!.cooldown = 0;
    updateWeapon(world, aid, () => 0, 0.016);
    const [, c] = Array.from(world.with('projectile'))[0]!;
    expect(c.projectile?.pierceRemaining ?? 0).toBeGreaterThanOrEqual(10);
  });

  it('orbitShard extra spawns N orbiting shards', () => {
    const world = new World();
    const aid = spawnAvatar(world);
    placeEnemyAt(world, 200, 120);
    applyCard(world, aid, cardById('wpnOrbitShard'));
    const av = world.get(aid)!;
    av.weapon!.cooldown = Infinity;
    av.avatar!.extraWeapons![0]!.cooldown = 0;
    updateWeapon(world, aid, () => 0, 0.016);
    const shots = Array.from(world.with('projectile'));
    expect(shots.length).toBeGreaterThanOrEqual(3);
    for (const [, c] of shots) {
      expect(c.projectile?.orbit?.ownerId).toBe(aid);
    }
  });

  it('faceBeam extra fires four short beams', () => {
    const world = new World();
    const aid = spawnAvatar(world);
    placeEnemyAt(world, 200, 120);
    applyCard(world, aid, cardById('wpnFaceBeam'));
    const av = world.get(aid)!;
    av.weapon!.cooldown = Infinity;
    av.avatar!.extraWeapons![0]!.cooldown = 0;
    updateWeapon(world, aid, () => 0, 0.016);
    const shots = Array.from(world.with('projectile'));
    expect(shots).toHaveLength(4);
  });
});

describe('Mirror Boss reflects weapon picks', () => {
  it('each weapon card lifts boss damage / projectiles / hp / fire-rate or sets ability flags', () => {
    const baseline = mirrorBossSpec([]);
    for (const { id } of WEAPON_CARDS) {
      const spec = mirrorBossSpec([cardById(id)]);
      const stronger =
        spec.weapon.damage > baseline.weapon.damage ||
        spec.weapon.projectiles > baseline.weapon.projectiles ||
        spec.weapon.projectileSpeed > baseline.weapon.projectileSpeed ||
        spec.weapon.period < baseline.weapon.period ||
        spec.hp > baseline.hp ||
        spec.homingShots === true;
      expect(stronger, `card '${id}' did not strengthen boss`).toBe(true);
    }
  });
});
