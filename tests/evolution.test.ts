import { describe, expect, it } from 'vitest';

import { applyCard, POOL, type Card } from '../src/game/cards';
import { AVATAR_RADIUS } from '../src/game/config';
import { spawnAvatar, spawnEnemy } from '../src/game/entities';
import { mirrorBossSpec } from '../src/game/mirrorBoss';
import { createRng } from '../src/game/rng';
import { updateCollisions } from '../src/game/systems/collision';
import { updateAvatarMotion } from '../src/game/systems/motion';
import { World } from '../src/game/world';

const cardById = (id: string): Card => {
  const found = POOL.find((c) => c.id === id);
  if (!found) throw new Error(`no card '${id}'`);
  return found;
};

function placeContactEnemy(
  world: World,
  ax: number,
  ay: number,
  dmg = 1,
): number {
  const eid = spawnEnemy(world, 'circle', createRng(1));
  const ec = world.get(eid)!;
  ec.pos!.x = ax;
  ec.pos!.y = ay;
  ec.enemy!.contactDamage = dmg;
  ec.hp!.value = 99; // make sure the enemy survives the touch
  return eid;
}

describe('Evolution: Aegis (shield regen)', () => {
  it('stamps shield + max + regen window onto the avatar', () => {
    const world = new World();
    const id = spawnAvatar(world);
    applyCard(world, id, cardById('aegis'));
    const a = world.get(id)!.avatar!;
    expect(a.shield).toBe(2);
    expect(a.shieldMax).toBe(2);
    expect(a.shieldRegenPeriod).toBe(6);
  });

  it('shield absorbs a contact hit; HP unchanged', () => {
    const world = new World();
    const id = spawnAvatar(world);
    applyCard(world, id, cardById('aegis'));
    const av = world.get(id)!;
    placeContactEnemy(world, av.pos!.x, av.pos!.y, 2);
    const hp0 = av.avatar!.hp;
    updateCollisions(world, id, {});
    expect(av.avatar!.hp).toBe(hp0);
    expect(av.avatar!.shield).toBe(1);
  });

  it('regens 1 shield after the configured period of safe time', () => {
    const world = new World();
    const id = spawnAvatar(world);
    applyCard(world, id, cardById('aegis'));
    const a = world.get(id)!.avatar!;
    a.shield = 0;
    a.shieldRegenTimer = 0;
    updateAvatarMotion(world, 5.9);
    expect(a.shield).toBe(0);
    updateAvatarMotion(world, 0.2);
    expect(a.shield).toBe(1);
    expect(a.shieldRegenTimer).toBeCloseTo(0, 5);
  });
});

describe('Evolution: Revenant (second chance)', () => {
  it('flag flips true on first pick and is non-stacking', () => {
    const world = new World();
    const id = spawnAvatar(world);
    applyCard(world, id, cardById('revenant'));
    expect(world.get(id)!.avatar!.secondChance).toBe(true);
    // Second copy doesn't reset a consumed revive.
    world.get(id)!.avatar!.secondChance = false;
    applyCard(world, id, cardById('revenant'));
    expect(world.get(id)!.avatar!.secondChance).toBe(false);
  });

  it('revives at floor(maxHp/2) and consumes the charge on lethal damage', () => {
    const world = new World();
    const id = spawnAvatar(world);
    applyCard(world, id, cardById('revenant'));
    const av = world.get(id)!;
    av.avatar!.hp = 1;
    placeContactEnemy(world, av.pos!.x, av.pos!.y, 99);
    updateCollisions(world, id, {});
    expect(av.avatar!.hp).toBe(Math.floor(av.avatar!.maxHp / 2));
    expect(av.avatar!.secondChance).toBe(false);
  });
});

describe('Evolution: Compact (hitbox)', () => {
  it('multiplies avatar radius by 0.75', () => {
    const world = new World();
    const id = spawnAvatar(world);
    applyCard(world, id, cardById('compact'));
    expect(world.get(id)!.radius).toBeCloseTo(AVATAR_RADIUS * 0.75, 6);
  });
});

describe('Evolution: Phase Shift (auto-dodge)', () => {
  it('seeds 1 charge with the configured period', () => {
    const world = new World();
    const id = spawnAvatar(world);
    applyCard(world, id, cardById('phaseShift'));
    const a = world.get(id)!.avatar!;
    expect(a.dodgeMax).toBe(1);
    expect(a.dodgeCharges).toBe(1);
    expect(a.dodgePeriod).toBe(8);
  });

  it('consumes a charge instead of HP, then regens after cooldown', () => {
    const world = new World();
    const id = spawnAvatar(world);
    applyCard(world, id, cardById('phaseShift'));
    const av = world.get(id)!;
    placeContactEnemy(world, av.pos!.x, av.pos!.y, 2);
    const hp0 = av.avatar!.hp;
    updateCollisions(world, id, {});
    expect(av.avatar!.hp).toBe(hp0);
    expect(av.avatar!.dodgeCharges).toBe(0);
    // Tick out the cooldown so the charge refills.
    updateAvatarMotion(world, 8.1);
    expect(av.avatar!.dodgeCharges).toBe(1);
  });
});

describe('Mirror Boss reflects evolution picks', () => {
  it('each evolution card strengthens the boss via stats or abilities', () => {
    const baseline = mirrorBossSpec([]);
    for (const cid of ['aegis', 'revenant', 'compact', 'phaseShift']) {
      const spec = mirrorBossSpec([cardById(cid)]);
      const stronger =
        spec.hp > baseline.hp ||
        spec.maxSpeed > baseline.maxSpeed ||
        (spec.shieldMax ?? 0) > 0 ||
        spec.secondChance === true ||
        spec.dodgePeriod !== undefined;
      expect(stronger).toBe(true);
    }
  });
});
