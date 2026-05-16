import { describe, expect, it } from 'vitest';
import {
  AFFIX_REGISTRY,
  defaultAffixPolicy,
  type StageAffixPolicy,
} from '../../src/game/content/affixes';
import {
  applyAffixSpawnEffects,
  onVampiricKill,
  pairLinkedAffixEnemies,
  rollAffixes,
  tickAffixes,
} from '../../src/game/affixes';
import { createRng } from '../../src/game/rng';
import { World, type AffixId, type Components } from '../../src/game/world';

function makeEnemyComp(
  kind: Components['enemy'] extends infer T
    ? T extends { kind: infer K } ? K : never : never = 'circle' as any,
  overrides: Partial<NonNullable<Components['enemy']>> = {},
  hp = 5,
): Components {
  return {
    pos: { x: 0, y: 0 },
    enemy: {
      kind,
      maxHp: hp,
      contactDamage: 1,
      maxSpeed: 100,
      wobblePhase: 0,
      ...overrides,
    },
    hp: { value: hp },
  };
}

describe('defaultAffixPolicy', () => {
  it('stage 0 (game stage 1) returns zero chance and zero elite affixes', () => {
    const p = defaultAffixPolicy(0);
    expect(p.normalRollChance).toBe(0);
    expect(p.eliteAffixCount).toBe(0);
  });

  it('stage 1 keeps normal chance at 0 but elites already get 1 affix', () => {
    const p = defaultAffixPolicy(1);
    expect(p.normalRollChance).toBe(0);
    expect(p.eliteAffixCount).toBe(1);
  });

  it('stage 5+ ramps elite affix count to 2', () => {
    expect(defaultAffixPolicy(5).eliteAffixCount).toBe(2);
    expect(defaultAffixPolicy(8).eliteAffixCount).toBe(2);
  });

  it('late stages have meaningful normal-roll chance', () => {
    expect(defaultAffixPolicy(8).normalRollChance).toBeGreaterThan(0.3);
  });

  it('clamps out-of-range stageIndex to nearest table entry', () => {
    const high = defaultAffixPolicy(99);
    expect(high.normalRollChance).toBe(defaultAffixPolicy(11).normalRollChance);
    const low = defaultAffixPolicy(-1);
    expect(low.normalRollChance).toBe(defaultAffixPolicy(0).normalRollChance);
  });
});

describe('rollAffixes', () => {
  it('returns no affixes when policy disables rolls', () => {
    const rng = createRng(1);
    const comp = makeEnemyComp('circle');
    expect(rollAffixes(comp, defaultAffixPolicy(0), 0, rng)).toEqual([]);
  });

  it('returns no affixes for boss-kind enemies regardless of policy', () => {
    const rng = createRng(2);
    const comp = makeEnemyComp('boss');
    const policy: StageAffixPolicy = { normalRollChance: 1, eliteAffixCount: 2 };
    expect(rollAffixes(comp, policy, 9, rng)).toEqual([]);
  });

  it('elite enemies receive exactly eliteAffixCount affixes when pool allows', () => {
    const rng = createRng(42);
    const comp = makeEnemyComp('star', { isElite: true });
    const policy: StageAffixPolicy = { normalRollChance: 0, eliteAffixCount: 2 };
    const out = rollAffixes(comp, policy, 8, rng);
    expect(out.length).toBe(2);
  });

  it('respects excludes constraint: swift and dense never co-roll', () => {
    const policy: StageAffixPolicy = {
      normalRollChance: 0,
      eliteAffixCount: 2,
      pool: ['swift', 'dense'],
    };
    // Many seeds so the constraint is actually exercised.
    for (let seed = 1; seed < 50; seed++) {
      const rng = createRng(seed);
      const comp = makeEnemyComp('star', { isElite: true });
      const out = rollAffixes(comp, policy, 9, rng);
      const set = new Set(out);
      expect(set.has('swift') && set.has('dense')).toBe(false);
    }
  });

  it('same seed + same inputs produces deterministic output', () => {
    const policy = defaultAffixPolicy(7);
    const a = rollAffixes(
      makeEnemyComp('star', { isElite: true }),
      policy,
      7,
      createRng(123),
    );
    const b = rollAffixes(
      makeEnemyComp('star', { isElite: true }),
      policy,
      7,
      createRng(123),
    );
    expect(a).toEqual(b);
  });

  it('archetype gate: linked never rolls on volley-only enemies (e.g. cross)', () => {
    const policy: StageAffixPolicy = {
      normalRollChance: 1,
      eliteAffixCount: 2,
      pool: ['linked'],
    };
    for (let seed = 1; seed < 30; seed++) {
      const rng = createRng(seed);
      // `cross` is `volley` only; linked requires rusher/swarmer/spiral.
      const out = rollAffixes(
        makeEnemyComp('cross', { isElite: true }),
        policy,
        9,
        rng,
      );
      expect(out.includes('linked')).toBe(false);
    }
  });

  it('skips affixes whose minStageIndex exceeds the stage', () => {
    const policy: StageAffixPolicy = {
      normalRollChance: 1,
      eliteAffixCount: 2,
      pool: ['linked'], // minStageIndex 5
    };
    const rng = createRng(7);
    const comp = makeEnemyComp('weave', { isElite: true });
    expect(rollAffixes(comp, policy, 2, rng)).toEqual([]);
  });
});

describe('applyAffixSpawnEffects', () => {
  it('dense multiplies HP by 1.8 and writes it to both hp.value and maxHp', () => {
    const comp = makeEnemyComp('circle', { maxHp: 10 }, 10);
    applyAffixSpawnEffects(comp, ['dense']);
    expect(comp.hp!.value).toBe(Math.ceil(10 * 1.8));
    expect(comp.enemy!.maxHp).toBe(comp.hp!.value);
  });

  it('swift multiplies maxSpeed by 1.4', () => {
    const comp = makeEnemyComp('circle');
    const before = comp.enemy!.maxSpeed;
    applyAffixSpawnEffects(comp, ['swift']);
    expect(comp.enemy!.maxSpeed).toBeCloseTo(before * 1.4, 5);
  });

  it('shielded grants +1 to the shield counter (stacks with native shield)', () => {
    const comp = makeEnemyComp('circle');
    applyAffixSpawnEffects(comp, ['shielded']);
    expect(comp.enemy!.shield).toBe(1);
    const comp2 = makeEnemyComp('hexagon', { shield: 1 });
    applyAffixSpawnEffects(comp2, ['shielded']);
    expect(comp2.enemy!.shield).toBe(2);
  });

  it('records the affix list on the enemy component', () => {
    const comp = makeEnemyComp('circle');
    applyAffixSpawnEffects(comp, ['vampiric']);
    expect(comp.enemy!.affixes).toEqual(['vampiric']);
  });

  it('charged initializes cooldown so the first telegraph can fire', () => {
    const comp = makeEnemyComp('circle');
    applyAffixSpawnEffects(comp, ['charged']);
    expect(comp.enemy!.chargedCooldown).toBeGreaterThan(0);
    expect(comp.enemy!.chargedWindup).toBe(0);
  });
});

describe('onVampiricKill', () => {
  it('heals nearby vampiric peers by 1 HP up to their maxHp', () => {
    const world = new World();
    const killerId = world.create({
      pos: { x: 100, y: 100 },
      enemy: {
        kind: 'circle',
        maxHp: 5,
        contactDamage: 1,
        maxSpeed: 50,
        wobblePhase: 0,
        affixes: ['vampiric'],
      },
      hp: { value: 0 },
    });
    const peerId = world.create({
      pos: { x: 120, y: 110 },
      enemy: {
        kind: 'circle',
        maxHp: 5,
        contactDamage: 1,
        maxSpeed: 50,
        wobblePhase: 0,
        affixes: ['vampiric'],
      },
      hp: { value: 2 },
    });
    onVampiricKill(world, killerId);
    expect(world.get(peerId)!.hp!.value).toBe(3);
  });

  it('does not heal beyond maxHp', () => {
    const world = new World();
    const killerId = world.create({
      pos: { x: 0, y: 0 },
      enemy: {
        kind: 'circle',
        maxHp: 5,
        contactDamage: 1,
        maxSpeed: 50,
        wobblePhase: 0,
        affixes: ['vampiric'],
      },
      hp: { value: 0 },
    });
    const fullId = world.create({
      pos: { x: 50, y: 0 },
      enemy: {
        kind: 'circle',
        maxHp: 5,
        contactDamage: 1,
        maxSpeed: 50,
        wobblePhase: 0,
        affixes: ['vampiric'],
      },
      hp: { value: 5 },
    });
    onVampiricKill(world, killerId);
    expect(world.get(fullId)!.hp!.value).toBe(5);
  });

  it('ignores non-vampiric peers and far peers', () => {
    const world = new World();
    const killerId = world.create({
      pos: { x: 0, y: 0 },
      enemy: {
        kind: 'circle',
        maxHp: 5,
        contactDamage: 1,
        maxSpeed: 50,
        wobblePhase: 0,
        affixes: ['vampiric'],
      },
      hp: { value: 0 },
    });
    const plainId = world.create({
      pos: { x: 30, y: 0 },
      enemy: {
        kind: 'circle',
        maxHp: 5,
        contactDamage: 1,
        maxSpeed: 50,
        wobblePhase: 0,
      },
      hp: { value: 2 },
    });
    const farId = world.create({
      pos: { x: 5000, y: 0 },
      enemy: {
        kind: 'circle',
        maxHp: 5,
        contactDamage: 1,
        maxSpeed: 50,
        wobblePhase: 0,
        affixes: ['vampiric'],
      },
      hp: { value: 2 },
    });
    onVampiricKill(world, killerId);
    expect(world.get(plainId)!.hp!.value).toBe(2);
    expect(world.get(farId)!.hp!.value).toBe(2);
  });

  it('no-op when the killed enemy was not vampiric', () => {
    const world = new World();
    const killerId = world.create({
      pos: { x: 0, y: 0 },
      enemy: {
        kind: 'circle',
        maxHp: 5,
        contactDamage: 1,
        maxSpeed: 50,
        wobblePhase: 0,
      },
      hp: { value: 0 },
    });
    const peerId = world.create({
      pos: { x: 30, y: 0 },
      enemy: {
        kind: 'circle',
        maxHp: 5,
        contactDamage: 1,
        maxSpeed: 50,
        wobblePhase: 0,
        affixes: ['vampiric'],
      },
      hp: { value: 2 },
    });
    onVampiricKill(world, killerId);
    expect(world.get(peerId)!.hp!.value).toBe(2);
  });
});

describe('pairLinkedAffixEnemies', () => {
  it('pairs two linked enemies and assigns partner ids on both sides', () => {
    const world = new World();
    const a = world.create({
      pos: { x: 0, y: 0 },
      enemy: {
        kind: 'circle',
        maxHp: 5,
        contactDamage: 1,
        maxSpeed: 50,
        wobblePhase: 0,
        affixes: ['linked'],
      },
      hp: { value: 5 },
    });
    const b = world.create({
      pos: { x: 30, y: 0 },
      enemy: {
        kind: 'circle',
        maxHp: 5,
        contactDamage: 1,
        maxSpeed: 50,
        wobblePhase: 0,
        affixes: ['linked'],
      },
      hp: { value: 5 },
    });
    pairLinkedAffixEnemies(world);
    expect(world.get(a)!.enemy!.linkedPartnerId).toBe(b);
    expect(world.get(b)!.enemy!.linkedPartnerId).toBe(a);
  });

  it('leaves the odd one out unpaired', () => {
    const world = new World();
    const ids = [0, 1, 2].map((i) =>
      world.create({
        pos: { x: i * 30, y: 0 },
        enemy: {
          kind: 'circle',
          maxHp: 5,
          contactDamage: 1,
          maxSpeed: 50,
          wobblePhase: 0,
          affixes: ['linked'],
        },
        hp: { value: 5 },
      }),
    );
    pairLinkedAffixEnemies(world);
    const partners = ids.map((id) => world.get(id)!.enemy!.linkedPartnerId);
    const paired = partners.filter((p) => p !== undefined).length;
    expect(paired).toBe(2);
  });
});

describe('tickAffixes', () => {
  it('regen heals 1 HP per REGEN_PERIOD_SEC up to maxHp', () => {
    const world = new World();
    const id = world.create({
      pos: { x: 0, y: 0 },
      enemy: {
        kind: 'circle',
        maxHp: 5,
        contactDamage: 1,
        maxSpeed: 50,
        wobblePhase: 0,
        affixes: ['regen'],
        regenAccumulator: 0,
      },
      hp: { value: 2 },
    });
    const noop = () => {};
    const rng = createRng(1);
    tickAffixes(world, id, 1.0, rng, noop);
    expect(world.get(id)!.hp!.value).toBe(3);
    tickAffixes(world, id, 1.0, rng, noop);
    expect(world.get(id)!.hp!.value).toBe(4);
  });

  it('charged advances cooldown → windup → fire pipeline and emits shots', () => {
    const world = new World();
    const enemyId = world.create({
      pos: { x: 100, y: 100 },
      enemy: {
        kind: 'circle',
        maxHp: 5,
        contactDamage: 2,
        maxSpeed: 50,
        wobblePhase: 0,
        affixes: ['charged'],
        chargedCooldown: 0.5,
        chargedWindup: 0,
      },
      hp: { value: 5 },
    });
    const avatarId = world.create({
      pos: { x: 200, y: 100 },
      avatar: {
        hp: 10,
        maxHp: 10,
        speedMul: 1,
        iframes: 0,
        targetX: 200,
        targetY: 100,
      },
    });
    const shots: number[] = [];
    const spawn = (_x: number, _y: number, _vx: number, _vy: number, dmg: number) => {
      shots.push(dmg);
    };
    const rng = createRng(1);
    // Cooldown elapses → windup begins.
    tickAffixes(world, avatarId, 0.6, rng, spawn);
    expect(world.get(enemyId)!.enemy!.chargedWindup).toBeGreaterThan(0);
    // Drain the windup → 4-shot burst fires.
    tickAffixes(world, avatarId, 2.0, rng, spawn);
    expect(shots.length).toBe(4);
    expect(shots.every((d) => d === 2)).toBe(true);
  });
});

describe('AFFIX_REGISTRY metadata sanity', () => {
  it('every affix has a positive weight and a non-negative minStageIndex', () => {
    for (const id of Object.keys(AFFIX_REGISTRY) as AffixId[]) {
      const def = AFFIX_REGISTRY[id];
      expect(def.weight).toBeGreaterThan(0);
      expect(def.minStageIndex).toBeGreaterThanOrEqual(0);
    }
  });
});
