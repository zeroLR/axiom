import { describe, it, expect } from 'vitest';
import { createRng } from '../src/game/rng';
import { STAGE_CONFIGS } from '../src/game/content/stages';
import { enemiesForArchetype } from '../src/game/content/enemies';
import {
  compileStageWaves,
  stageStrengthMul,
  stagePointMul,
  buildStagePointMulArray,
} from '../src/game/stageCompiler';

// ── STAGE_CONFIGS sanity ─────────────────────────────────────────────────────

describe('STAGE_CONFIGS', () => {
  it('has exactly 5 stages', () => {
    expect(STAGE_CONFIGS).toHaveLength(5);
  });

  it('has unique stageIds', () => {
    const ids = STAGE_CONFIGS.map(c => c.stageId);
    expect(new Set(ids).size).toBe(5);
  });

  it('every stage has at least one wave', () => {
    for (const cfg of STAGE_CONFIGS) {
      expect(cfg.waves.length).toBeGreaterThan(0);
    }
  });

  it('every stage last wave is a boss wave', () => {
    for (const cfg of STAGE_CONFIGS) {
      const last = cfg.waves[cfg.waves.length - 1]!;
      expect(last.isBossWave).toBe(true);
    }
  });

  it('stage wave counts match original data: 6/7/8/10/12', () => {
    expect(STAGE_CONFIGS[0]!.waves).toHaveLength(6);
    expect(STAGE_CONFIGS[1]!.waves).toHaveLength(7);
    expect(STAGE_CONFIGS[2]!.waves).toHaveLength(8);
    expect(STAGE_CONFIGS[3]!.waves).toHaveLength(10);
    expect(STAGE_CONFIGS[4]!.waves).toHaveLength(12);
  });

  it('bossIds match expected order: orthogon/jets/mirror/lattice/rift', () => {
    expect(STAGE_CONFIGS[0]!.bossId).toBe('orthogon');
    expect(STAGE_CONFIGS[1]!.bossId).toBe('jets');
    expect(STAGE_CONFIGS[2]!.bossId).toBe('mirror');
    expect(STAGE_CONFIGS[3]!.bossId).toBe('lattice');
    expect(STAGE_CONFIGS[4]!.bossId).toBe('rift');
  });

  it('enemyStrengthMul values are 1/1.5/2/3/4', () => {
    expect(STAGE_CONFIGS[0]!.enemyStrengthMul).toBe(1);
    expect(STAGE_CONFIGS[1]!.enemyStrengthMul).toBe(1.5);
    expect(STAGE_CONFIGS[2]!.enemyStrengthMul).toBe(2.0);
    expect(STAGE_CONFIGS[3]!.enemyStrengthMul).toBe(3.0);
    expect(STAGE_CONFIGS[4]!.enemyStrengthMul).toBe(4.0);
  });

  it('pointMul values are 1/2/3/4/5', () => {
    expect(STAGE_CONFIGS[0]!.pointMul).toBe(1);
    expect(STAGE_CONFIGS[1]!.pointMul).toBe(2);
    expect(STAGE_CONFIGS[2]!.pointMul).toBe(3);
    expect(STAGE_CONFIGS[3]!.pointMul).toBe(4);
    expect(STAGE_CONFIGS[4]!.pointMul).toBe(5);
  });

  it('all non-boss wave spawns have kind, enemies, or archetype set', () => {
    for (const cfg of STAGE_CONFIGS) {
      for (const wave of cfg.waves) {
        if (wave.isBossWave) continue;
        for (const spawn of wave.spawns) {
          const hasKind = spawn.kind !== undefined;
          const hasEnemies = spawn.enemies !== undefined && spawn.enemies.length > 0;
          const hasArchetype = spawn.archetype !== undefined;
          expect(hasKind || hasEnemies || hasArchetype).toBe(true);
        }
      }
    }
  });
});

// ── compileStageWaves ────────────────────────────────────────────────────────

describe('compileStageWaves', () => {
  it('compiles stage 1 to 7 WaveSpecs (6 authored + 1 miniBoss beat)', () => {
    const waves = compileStageWaves(STAGE_CONFIGS[0]!, 0);
    expect(waves).toHaveLength(7);
  });

  it('compiled wave specs have correct indices', () => {
    const waves = compileStageWaves(STAGE_CONFIGS[0]!, 0);
    waves.forEach((w, i) => {
      expect(w.index).toBe(i + 1);
    });
  });

  it('last wave of each stage is a boss wave (spawns boss)', () => {
    for (let i = 0; i < STAGE_CONFIGS.length; i++) {
      const waves = compileStageWaves(STAGE_CONFIGS[i]!, i);
      const last = waves[waves.length - 1]!;
      expect(last.groups.some(g => g.kind === 'boss')).toBe(true);
    }
  });

  it('non-boss waves spawn enemies unless they are duration-only beat waves', () => {
    for (let i = 0; i < STAGE_CONFIGS.length; i++) {
      const waves = compileStageWaves(STAGE_CONFIGS[i]!, i);
      waves.slice(0, -1).forEach(w => {
        // hazardWave / puzzle beats legitimately ship empty groups; their
        // wave is held open by `minHoldSec` instead.
        const isDurationOnly =
          w.beatMeta?.kind === 'hazardWave' || w.beatMeta?.kind === 'puzzle';
        if (isDurationOnly) {
          expect(w.minHoldSec).toBeGreaterThan(0);
        } else {
          expect(w.groups.length).toBeGreaterThan(0);
        }
      });
    }
  });

  it('compiled stage 1 wave 1 matches original data', () => {
    const waves = compileStageWaves(STAGE_CONFIGS[0]!, 0);
    const w1 = waves[0]!;
    expect(w1.index).toBe(1);
    expect(w1.durationHint).toBe(20);
    expect(w1.groups[0]).toEqual({ t: 0.5, kind: 'circle', count: 3 });
    expect(w1.groups[1]).toEqual({ t: 6, kind: 'circle', count: 4 });
    expect(w1.groups[2]).toEqual({ t: 12, kind: 'circle', count: 5 });
  });

  it('compiled output is identical for deterministic configs (no rng needed)', () => {
    const a = compileStageWaves(STAGE_CONFIGS[2]!, 2);
    const b = compileStageWaves(STAGE_CONFIGS[2]!, 2);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('supports batches: expands a spawn entry with batches=3 interval=5', () => {
    const config = {
      stageId: 'test',
      bossId: 'mirror' as const,
      enemyStrengthMul: 1,
      pointMul: 1,
      waves: [{
        index: 1,
        durationHint: 30,
        spawns: [{ t: 1, kind: 'circle' as const, count: 2, batches: 3, interval: 5 }],
      }],
    };
    const waves = compileStageWaves(config, 0);
    expect(waves[0]!.groups).toHaveLength(3);
    expect(waves[0]!.groups[0]).toEqual({ t: 1, kind: 'circle', count: 2 });
    expect(waves[0]!.groups[1]).toEqual({ t: 6, kind: 'circle', count: 2 });
    expect(waves[0]!.groups[2]).toEqual({ t: 11, kind: 'circle', count: 2 });
  });

  it('supports weighted enemy selection when rng is provided', () => {
    const rng = createRng(99);
    const config = {
      stageId: 'test-weighted',
      bossId: 'mirror' as const,
      enemyStrengthMul: 1,
      pointMul: 1,
      waves: [{
        index: 1,
        durationHint: 20,
        spawns: [{
          t: 1,
          count: 3,
          enemies: [
            { kind: 'circle' as const, weight: 1 },
            { kind: 'square' as const, weight: 1 },
          ],
        }],
      }],
    };
    const waves = compileStageWaves(config, 0, rng);
    expect(waves[0]!.groups).toHaveLength(1);
    const kind = waves[0]!.groups[0]!.kind;
    expect(['circle', 'square']).toContain(kind);
  });

  it('throws when weighted enemies config has no rng', () => {
    const config = {
      stageId: 'err',
      bossId: 'mirror' as const,
      enemyStrengthMul: 1,
      pointMul: 1,
      waves: [{
        index: 1,
        durationHint: 20,
        spawns: [{
          t: 1,
          count: 1,
          enemies: [{ kind: 'circle' as const, weight: 1 }],
        }],
      }],
    };
    expect(() => compileStageWaves(config, 0)).toThrow();
  });

  it('resolves archetype spawns to an eligible enemy when rng is provided', () => {
    const rng = createRng(7);
    const config = {
      stageId: 'arch-test',
      bossId: 'mirror' as const,
      enemyStrengthMul: 1,
      pointMul: 1,
      waves: [{
        index: 1,
        durationHint: 20,
        spawns: [{ t: 1, count: 2, archetype: 'swarmer' as const }],
      }],
    };
    const waves = compileStageWaves(config, 1, rng);
    expect(waves[0]!.groups).toHaveLength(1);
    const kind = waves[0]!.groups[0]!.kind;
    expect(enemiesForArchetype('swarmer', 1)).toContain(kind);
  });

  it('archetype resolution respects minStageIndex (excludes higher-stage enemies at low stageIndex)', () => {
    expect(enemiesForArchetype('swarmer', 0)).toEqual(['circle', 'square']);
    expect(enemiesForArchetype('swarmer', 1)).toContain('pentagon');
    expect(enemiesForArchetype('spiral', 0)).toEqual([]);
    expect(enemiesForArchetype('spiral', 3)).toEqual(['spiral', 'lance']);
  });

  it('throws when archetype spawn has no rng', () => {
    const config = {
      stageId: 'arch-err',
      bossId: 'mirror' as const,
      enemyStrengthMul: 1,
      pointMul: 1,
      waves: [{
        index: 1,
        durationHint: 20,
        spawns: [{ t: 1, count: 1, archetype: 'swarmer' as const }],
      }],
    };
    expect(() => compileStageWaves(config, 1)).toThrow(/archetype/i);
  });

  it('throws when archetype has no eligible enemies for stageIndex', () => {
    const rng = createRng(1);
    const config = {
      stageId: 'arch-empty',
      bossId: 'mirror' as const,
      enemyStrengthMul: 1,
      pointMul: 1,
      waves: [{
        index: 1,
        durationHint: 20,
        spawns: [{ t: 1, count: 1, archetype: 'spiral' as const }],
      }],
    };
    expect(() => compileStageWaves(config, 0, rng)).toThrow(/no eligible enemies/i);
  });
});

// ── Helper functions ──────────────────────────────────────────────────────────

describe('stageStrengthMul', () => {
  it('returns correct multipliers for stages 0–4', () => {
    expect(stageStrengthMul(0)).toBe(1);
    expect(stageStrengthMul(1)).toBe(1.5);
    expect(stageStrengthMul(2)).toBe(2.0);
    expect(stageStrengthMul(3)).toBe(3.0);
    expect(stageStrengthMul(4)).toBe(4.0);
  });

  it('returns 1 for out-of-range index', () => {
    expect(stageStrengthMul(99)).toBe(1);
    expect(stageStrengthMul(-1)).toBe(1);
  });
});

describe('stagePointMul', () => {
  it('returns correct multipliers for stages 0–4', () => {
    expect(stagePointMul(0)).toBe(1);
    expect(stagePointMul(1)).toBe(2);
    expect(stagePointMul(2)).toBe(3);
    expect(stagePointMul(3)).toBe(4);
    expect(stagePointMul(4)).toBe(5);
  });

  it('returns 1 for out-of-range index', () => {
    expect(stagePointMul(99)).toBe(1);
  });
});

describe('buildStagePointMulArray', () => {
  it('produces [1, 2, 3, 4, 5]', () => {
    expect(buildStagePointMulArray()).toEqual([1, 2, 3, 4, 5]);
  });
});

// ── StageBeats ────────────────────────────────────────────────────────────────

describe('StageBeats', () => {
  const makeConfig = (beats?: any[]) => ({
    stageId: 'beat-test',
    bossId: 'mirror' as const,
    enemyStrengthMul: 1,
    pointMul: 1,
    waves: [
      { index: 1, durationHint: 20, spawns: [{ t: 0.5, kind: 'circle' as const, count: 2 }] },
      { index: 2, durationHint: 22, spawns: [{ t: 0.5, kind: 'square' as const, count: 2 }] },
      { index: 3, durationHint: 0, isBossWave: true, spawns: [] },
    ],
    beats,
  });

  it('returns waves unchanged when no beats are configured', () => {
    const out = compileStageWaves(makeConfig(), 0);
    expect(out).toHaveLength(3);
    expect(out.every(w => w.beatMeta === undefined)).toBe(true);
    expect(out.map(w => w.index)).toEqual([1, 2, 3]);
  });

  it('splices a miniBoss beat after its parent wave and renumbers', () => {
    const out = compileStageWaves(
      makeConfig([{ kind: 'miniBoss', afterWave: 1, enemyKind: 'prism' }]),
      3,
    );
    expect(out).toHaveLength(4);
    expect(out.map(w => w.index)).toEqual([1, 2, 3, 4]);

    // Wave 2 in the output is the spliced miniBoss beat.
    const beatWave = out[1]!;
    expect(beatWave.beatMeta).toEqual({ kind: 'miniBoss', afterWave: 1 });
    expect(beatWave.groups).toEqual([{ t: 0.5, kind: 'prism', count: 1 }]);

    // Original waves shifted by 1.
    expect(out[2]!.beatMeta).toBeUndefined();
    expect(out[3]!.groups[0]!.kind).toBe('boss');
  });

  it('preserves order of multiple beats sharing a parent wave', () => {
    const out = compileStageWaves(
      makeConfig([
        { kind: 'miniBoss', afterWave: 1, enemyKind: 'prism' },
        { kind: 'miniBoss', afterWave: 1, enemyKind: 'octo' },
      ]),
      4,
    );
    expect(out).toHaveLength(5);
    expect(out[1]!.groups[0]!.kind).toBe('prism');
    expect(out[2]!.groups[0]!.kind).toBe('octo');
  });

  it('throws when a miniBoss beat omits enemyKind', () => {
    expect(() =>
      compileStageWaves(makeConfig([{ kind: 'miniBoss', afterWave: 1 }]), 0),
    ).toThrow(/enemyKind/);
  });

  it('throws when a beat references an unknown wave index', () => {
    expect(() =>
      compileStageWaves(
        makeConfig([{ kind: 'miniBoss', afterWave: 99, enemyKind: 'prism' }]),
        0,
      ),
    ).toThrow(/unknown wave index 99/);
  });

  it('eliteAmbush splices a multi-spawn synthetic wave with the given count', () => {
    const out = compileStageWaves(
      makeConfig([{ kind: 'eliteAmbush', afterWave: 1, enemyKind: 'octo', count: 4 }]),
      4,
    );
    expect(out).toHaveLength(4);
    const beat = out[1]!;
    expect(beat.beatMeta).toEqual({ kind: 'eliteAmbush', afterWave: 1 });
    expect(beat.groups).toHaveLength(4);
    expect(beat.groups.every(g => g.kind === 'octo' && g.count === 1)).toBe(true);
    expect(beat.groups.map(g => g.t)).toEqual([0.5, 1.0, 1.5, 2.0]);
  });

  it('eliteAmbush defaults count to 3 when unspecified', () => {
    const out = compileStageWaves(
      makeConfig([{ kind: 'eliteAmbush', afterWave: 2, enemyKind: 'prism' }]),
      3,
    );
    expect(out[2]!.groups).toHaveLength(3);
    expect(out[2]!.beatMeta).toEqual({ kind: 'eliteAmbush', afterWave: 2 });
  });

  it('eliteAmbush throws without enemyKind', () => {
    expect(() =>
      compileStageWaves(makeConfig([{ kind: 'eliteAmbush', afterWave: 1 }]), 0),
    ).toThrow(/enemyKind/);
  });

  it('hazardWave compiles to an empty-group wave held open by minHoldSec', () => {
    const out = compileStageWaves(
      makeConfig([{ kind: 'hazardWave', afterWave: 1, duration: 8, hazardId: 'fog' }]),
      0,
    );
    const beat = out[1]!;
    expect(beat.groups).toEqual([]);
    expect(beat.minHoldSec).toBe(8);
    expect(beat.durationHint).toBe(8);
    expect(beat.beatMeta).toEqual({
      kind: 'hazardWave',
      afterWave: 1,
      hazardId: 'fog',
      duration: 8,
    });
  });

  it('hazardWave defaults duration to 6 when unspecified', () => {
    const out = compileStageWaves(
      makeConfig([{ kind: 'hazardWave', afterWave: 1, hazardId: 'axis-lock' }]),
      0,
    );
    expect(out[1]!.minHoldSec).toBe(6);
    expect(out[1]!.beatMeta?.duration).toBe(6);
  });

  it('puzzle compiles to an empty-group wave with minHoldSec = duration', () => {
    const out = compileStageWaves(
      makeConfig([{ kind: 'puzzle', afterWave: 2, duration: 5 }]),
      0,
    );
    const beat = out[2]!;
    expect(beat.groups).toEqual([]);
    expect(beat.minHoldSec).toBe(5);
    expect(beat.beatMeta).toEqual({ kind: 'puzzle', afterWave: 2, duration: 5 });
  });
});
