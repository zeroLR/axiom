// ── Stage template compiler ───────────────────────────────────────────────────
// Converts `StageConfig` templates from `content/stages.ts` into `WaveSpec[]`
// that the existing `updateWave` runtime can consume.
//
// The separation keeps game-design data (stages.ts) independent from runtime
// types (waves.ts), so adding a new stage only requires editing stages.ts.

import type { Rng } from './rng';
import type { EnemyKind } from './world';
import {
  STAGE_CONFIGS,
  type StageBeat,
  type StageConfig,
  type SpawnTemplate,
  type WaveTemplate,
} from './content/stages';
import { enemiesForArchetype } from './content/enemies';
import type { WaveSpec, SpawnGroup } from './waves';
import { weightedPick } from './weightedSampler';

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Resolve the enemy kind for a spawn template.
 * - `kind` → fixed kind, returned directly.
 * - `enemies` → randomly sampled proportional to weight (requires `rng`).
 * - `archetype` → uniformly sampled from all enemies tagged with the
 *   archetype that are eligible for `stageIndex` (requires `rng`).
 */
function resolveKind(spawn: SpawnTemplate, stageIndex: number, rng?: Rng): EnemyKind {
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
  if (spawn.archetype) {
    if (!rng) {
      throw new Error(
        'stageCompiler: a SpawnTemplate uses `archetype` but no Rng was supplied to compileStageWaves()',
      );
    }
    const pool = enemiesForArchetype(spawn.archetype, stageIndex);
    if (pool.length === 0) {
      throw new Error(
        `stageCompiler: archetype "${spawn.archetype}" has no eligible enemies at stageIndex ${stageIndex}`,
      );
    }
    return weightedPick(
      pool.map(kind => ({ item: kind, weight: 1 })),
      rng,
    );
  }
  throw new Error('stageCompiler: SpawnTemplate must have `kind`, `enemies`, or `archetype`');
}

/** Compile one WaveTemplate into a runtime WaveSpec. */
function compileWave(wave: WaveTemplate, stageIndex: number, rng?: Rng): WaveSpec {
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
    for (let b = 0; b < batches; b++) {
      const kind = resolveKind(spawn, stageIndex, rng);
      groups.push({ t: spawn.t + b * interval, kind, count: spawn.count });
    }
  }

  return { index: wave.index, durationHint: wave.durationHint, groups };
}

/**
 * Compile a `StageBeat` into a synthetic WaveSpec. The `index` field is set
 * to a placeholder by the caller (`compileStageWaves`) since beat order is
 * resolved relative to the parent wave.
 *
 * v1 supports `miniBoss` only. Other kinds (`hazardWave`, `puzzle`,
 * `eliteAmbush`) are reserved schema and throw with a clear message until
 * their handlers ship — this catches typos in stage authoring early rather
 * than producing silently empty waves.
 */
function compileBeat(beat: StageBeat, indexHint: number): WaveSpec {
  if (beat.kind === 'miniBoss') {
    if (!beat.enemyKind) {
      throw new Error(
        `stageCompiler: miniBoss beat after wave ${beat.afterWave} requires \`enemyKind\``,
      );
    }
    return {
      index: indexHint,
      durationHint: 18,
      groups: [{ t: 0.5, kind: beat.enemyKind, count: 1 }],
      beatMeta: { kind: 'miniBoss', afterWave: beat.afterWave },
    };
  }
  throw new Error(
    `stageCompiler: StageBeat kind "${beat.kind}" is reserved schema; handler not implemented yet`,
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compile a `StageConfig` into an array of `WaveSpec`s ready for the
 * `updateWave` runtime.
 *
 * `stageIndex` is the 0-based index into `STAGE_CONFIGS`; it gates the
 * archetype-resolution path so that early stages do not draw from
 * higher-stage enemy pools.
 *
 * Pass `rng` when the config contains weighted (`enemies`) or archetype-
 * pooled (`archetype`) spawn groups. For deterministic configs (only fixed
 * `kind` fields) `rng` may be omitted.
 */
export function compileStageWaves(
  config: StageConfig,
  stageIndex: number,
  rng?: Rng,
): readonly WaveSpec[] {
  // Bucket beats by their parent wave for O(1) lookup. `afterWave` is 1-based
  // to match `WaveTemplate.index`. Validate that every beat references an
  // existing wave so authoring typos surface here rather than at runtime.
  const beatsByParent = new Map<number, StageBeat[]>();
  if (config.beats && config.beats.length > 0) {
    const validIndices = new Set(config.waves.map(w => w.index));
    for (const beat of config.beats) {
      if (!validIndices.has(beat.afterWave)) {
        throw new Error(
          `stageCompiler: StageBeat references unknown wave index ${beat.afterWave}`,
        );
      }
      const list = beatsByParent.get(beat.afterWave) ?? [];
      list.push(beat);
      beatsByParent.set(beat.afterWave, list);
    }
  }

  const out: WaveSpec[] = [];
  let nextIndex = 1;
  for (const wave of config.waves) {
    const compiled = compileWave(wave, stageIndex, rng);
    out.push({ ...compiled, index: nextIndex++ });
    const beats = beatsByParent.get(wave.index);
    if (!beats) continue;
    for (const beat of beats) {
      out.push(compileBeat(beat, nextIndex++));
    }
  }
  return out;
}

/**
 * Enemy strength multiplier for the given 0-based stage index.
 * Reads from `STAGE_CONFIGS` — single source of truth.
 * Returns 1 for out-of-range (negative or beyond last stage) indices.
 */
export function stageStrengthMul(stageIndex: number): number {
  return STAGE_CONFIGS[stageIndex]?.enemyStrengthMul ?? 1;
}

/**
 * Kill-point multiplier for the given 0-based stage index in normal mode.
 * Reads from `STAGE_CONFIGS` — single source of truth.
 * Returns 1 for out-of-range (negative or beyond last stage) indices.
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
