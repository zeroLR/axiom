import { describe, it, expect } from 'vitest';
import { createRng } from '../src/game/rng';
import { STAGE_CONFIGS } from '../src/game/content/stages';
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

  it('all non-boss wave spawns have either kind or enemies set', () => {
    for (const cfg of STAGE_CONFIGS) {
      for (const wave of cfg.waves) {
        if (wave.isBossWave) continue;
        for (const spawn of wave.spawns) {
          const hasKind = spawn.kind !== undefined;
          const hasEnemies = spawn.enemies !== undefined && spawn.enemies.length > 0;
          expect(hasKind || hasEnemies).toBe(true);
        }
      }
    }
  });
});

// ── compileStageWaves ────────────────────────────────────────────────────────

describe('compileStageWaves', () => {
  it('compiles stage 1 to exactly 6 WaveSpecs', () => {
    const waves = compileStageWaves(STAGE_CONFIGS[0]!);
    expect(waves).toHaveLength(6);
  });

  it('compiled wave specs have correct indices', () => {
    const waves = compileStageWaves(STAGE_CONFIGS[0]!);
    waves.forEach((w, i) => {
      expect(w.index).toBe(i + 1);
    });
  });

  it('last wave of each stage is a boss wave (spawns boss)', () => {
    for (const cfg of STAGE_CONFIGS) {
      const waves = compileStageWaves(cfg);
      const last = waves[waves.length - 1]!;
      expect(last.groups.some(g => g.kind === 'boss')).toBe(true);
    }
  });

  it('non-boss waves have at least one spawn group', () => {
    for (const cfg of STAGE_CONFIGS) {
      const waves = compileStageWaves(cfg);
      waves.slice(0, -1).forEach(w => {
        expect(w.groups.length).toBeGreaterThan(0);
      });
    }
  });

  it('compiled stage 1 wave 1 matches original data', () => {
    const waves = compileStageWaves(STAGE_CONFIGS[0]!);
    const w1 = waves[0]!;
    expect(w1.index).toBe(1);
    expect(w1.durationHint).toBe(20);
    expect(w1.groups[0]).toEqual({ t: 0.5, kind: 'circle', count: 3 });
    expect(w1.groups[1]).toEqual({ t: 6, kind: 'circle', count: 4 });
    expect(w1.groups[2]).toEqual({ t: 12, kind: 'circle', count: 5 });
  });

  it('compiled output is identical for deterministic configs (no rng needed)', () => {
    const a = compileStageWaves(STAGE_CONFIGS[2]!);
    const b = compileStageWaves(STAGE_CONFIGS[2]!);
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
    const waves = compileStageWaves(config);
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
    const waves = compileStageWaves(config, rng);
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
    expect(() => compileStageWaves(config)).toThrow();
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
