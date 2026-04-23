// ── Stage template compiler ───────────────────────────────────────────────────
// Converts `StageConfig` templates from `content/stages.ts` into `WaveSpec[]`
// that the existing `updateWave` runtime can consume.
//
// The separation keeps game-design data (stages.ts) independent from runtime
// types (waves.ts), so adding a new stage only requires editing stages.ts.

import type { Rng } from './rng';
import type { EnemyKind } from './world';
import { STAGE_CONFIGS, type StageConfig, type SpawnTemplate, type WaveTemplate } from './content/stages';
import type { WaveSpec, SpawnGroup } from './waves';
import { weightedPick } from './weightedSampler';

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Resolve the enemy kind for a spawn template.
 * - `kind` → fixed kind, returned directly.
 * - `enemies` → randomly sampled proportional to weight (requires `rng`).
 */
function resolveKind(spawn: SpawnTemplate, rng?: Rng): EnemyKind {
  if (spawn.kind) return spawn.kind;
  if (spawn.enemies && spawn.enemies.length > 0) {
    if (!rng) {
      throw new Error(
        'stageCompiler: a SpawnTemplate uses weighted `enemies` but no Rng was supplied to compileStageWaves()',
      );
    }
    return weightedPick(
      spawn.enemies.map(e => ({ item: e.kind, weight: e.weight })),
      rng,
    );
  }
  throw new Error('stageCompiler: SpawnTemplate must have `kind` or `enemies`');
}

/** Compile one WaveTemplate into a runtime WaveSpec. */
function compileWave(wave: WaveTemplate, rng?: Rng): WaveSpec {
  if (wave.isBossWave) {
    return {
      index: wave.index,
      durationHint: wave.durationHint,
      groups: [{ t: 0.5, kind: 'boss', count: 1 }],
    };
  }

  const groups: SpawnGroup[] = [];
  for (const spawn of wave.spawns) {
    const batches = spawn.batches ?? 1;
    const interval = spawn.interval ?? 0;
    const kind = resolveKind(spawn, rng);
    for (let b = 0; b < batches; b++) {
      groups.push({ t: spawn.t + b * interval, kind, count: spawn.count });
    }
  }

  return { index: wave.index, durationHint: wave.durationHint, groups };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compile a `StageConfig` into an array of `WaveSpec`s ready for the
 * `updateWave` runtime.
 *
 * Pass `rng` only when the config contains waves with weighted enemy tables
 * (`enemies` field).  For deterministic configs (all `kind` fields fixed)
 * `rng` can be omitted.
 */
export function compileStageWaves(config: StageConfig, rng?: Rng): readonly WaveSpec[] {
  return config.waves.map(wave => compileWave(wave, rng));
}

/**
 * Enemy strength multiplier for the given 0-based stage index.
 * Reads from `STAGE_CONFIGS` — single source of truth.
 */
export function stageStrengthMul(stageIndex: number): number {
  return STAGE_CONFIGS[stageIndex]?.enemyStrengthMul ?? 1;
}

/**
 * Kill-point multiplier for the given 0-based stage index in normal mode.
 * Reads from `STAGE_CONFIGS` — single source of truth.
 */
export function stagePointMul(stageIndex: number): number {
  return STAGE_CONFIGS[stageIndex]?.pointMul ?? 1;
}

/**
 * Derive the full ordered array of normal-stage point multipliers from
 * `STAGE_CONFIGS`.  Kept for backward compatibility with callers that need
 * the whole array (e.g. `rewards.ts`).
 */
export function buildStagePointMulArray(): readonly number[] {
  return STAGE_CONFIGS.map(c => c.pointMul);
}
