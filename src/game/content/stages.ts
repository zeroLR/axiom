// ── Stage configuration schema & data ────────────────────────────────────────
// Single source of truth for all normal-mode stage data. The stage compiler
// (`stageCompiler.ts`) converts these configs to `WaveSpec[]` at run start.
//
// To add a new stage:
//   1. Define its `StageConfig` entry in STAGE_CONFIGS below.
//   2. Add the matching `StageTheme` in `content/stageThemes.ts`.
//   3. Add the matching `BossDef` in `bosses/` and register it.
//   4. Run `npm test` and `npm run build`.

import type { EnemyKind } from '../world';
import type { EnemyArchetype } from './enemies';
import type { BossId } from '../bosses/types';
import type { ActId } from './acts';

// ── Schema ───────────────────────────────────────────────────────────────────

/** Weight entry for an enemy kind within a wave's enemy pool. */
export interface EnemyWeight {
  kind: EnemyKind;
  /** Relative probability weight (must be > 0). */
  weight: number;
}

/**
 * A single spawn group within a wave template.
 *
 * Exactly one of `kind`, `enemies`, or `archetype` must be set.
 *  - `kind`: fixed enemy.
 *  - `enemies`: weighted random selection from an explicit table.
 *  - `archetype`: weighted random selection over all enemies tagged with
 *    `archetype` whose `minStageIndex` is reached by the current stage.
 *
 * Optional `batches` + `interval` repeat the group N times with
 * `interval` seconds between each batch, starting at `t`.
 */
export interface SpawnTemplate {
  /** Seconds since wave start when this group fires (first batch). */
  t: number;
  /** Number of enemies to spawn per batch. */
  count: number;
  /** Fixed enemy kind. Mutually exclusive with `enemies`/`archetype`. */
  kind?: EnemyKind;
  /** Weighted enemy table. Mutually exclusive with `kind`/`archetype`. */
  enemies?: EnemyWeight[];
  /**
   * Sample uniformly from all enemies whose `archetypes` include this tag
   * and whose `minStageIndex <= stageIndex`. Mutually exclusive with the
   * explicit forms.
   */
  archetype?: EnemyArchetype;
  /** Repeat this spawn group N times (default: 1). */
  batches?: number;
  /** Seconds between each batch when `batches` > 1. */
  interval?: number;
}

/** Template for one wave within a stage. */
export interface WaveTemplate {
  /** 1-based wave index (used for display and wave.state). */
  index: number;
  /** Approximate wave duration in seconds (informational). */
  durationHint: number;
  /**
   * If true, the wave spawns only the stage boss (no `spawns` needed).
   * The compiler inserts `{ t: 0.5, kind: 'boss', count: 1 }`.
   */
  isBossWave?: boolean;
  /**
   * Per-wave enemy strength multiplier (overrides the stage default for
   * this wave only). Leave unset to use `StageConfig.enemyStrengthMul`.
   */
  strengthOverride?: number;
  /** Spawn groups for this wave (ignored when `isBossWave` is true). */
  spawns: SpawnTemplate[];
}

/** Weight entry for a card in a stage-specific enhance pool. */
export interface CardWeight {
  /** Card ID matching a `Card.id` in `content/cards.ts`. */
  cardId: string;
  /** Relative probability weight (must be > 0). */
  weight: number;
}

/**
 * Full gameplay configuration for one normal-mode stage.
 *
 * Visual / thematic data lives in `content/stageThemes.ts`; this config
 * covers gameplay rules only.
 */
export interface StageConfig {
  /** Stable identifier (matches `StageTheme` at the same array index). */
  stageId: string;
  /** Boss fought in this stage's final wave. */
  bossId: BossId;
  /**
   * Optional Act/Chapter membership. When set, the stage participates in the
   * Act-based unlock graph defined in `content/acts.ts`. Stages without an
   * `actId` fall back to the legacy linear gate.
   */
  actId?: ActId;
  /**
   * Multiplier applied to enemy HP, speed, and contact/weapon damage for
   * all regular enemies in this stage (bosses are scaled by `BossDef`).
   */
  enemyStrengthMul: number;
  /** Multiplier applied to kill-point awards in normal mode. */
  pointMul: number;
  /**
   * Stage-specific weighted card pool for post-wave draft offers.
   * When absent the full unlocked pool is used with equal weights.
   * When present only cards whose `cardId` appears here are offered,
   * proportional to their weights.
   */
  enhancePool?: CardWeight[];
  /** Wave templates for this stage (last entry must have `isBossWave: true`). */
  waves: WaveTemplate[];
}

// ── Stage data ───────────────────────────────────────────────────────────────

/** Stage 1 — "White Grid" · AXIS · Boss: Orthogon */
const STAGE_1: StageConfig = {
  stageId: 'stage1',
  bossId: 'orthogon',
  actId: 'form',
  enemyStrengthMul: 1,
  pointMul: 1,
  waves: [
    { index: 1, durationHint: 20, spawns: [
      { t: 0.5, kind: 'circle', count: 3 },
      { t: 6,   kind: 'circle', count: 4 },
      { t: 12,  kind: 'circle', count: 5 },
    ] },
    { index: 2, durationHint: 22, spawns: [
      { t: 0.5, kind: 'circle', count: 5 },
      { t: 7,   kind: 'circle', count: 6 },
      { t: 14,  kind: 'square', count: 2 },
    ] },
    { index: 3, durationHint: 24, spawns: [
      { t: 0.5, kind: 'circle', count: 4 },
      { t: 5,   kind: 'square', count: 3 },
      { t: 12,  kind: 'circle', count: 6 },
      { t: 18,  kind: 'square', count: 3 },
    ] },
    { index: 4, durationHint: 26, spawns: [
      { t: 0.5, kind: 'square',  count: 3 },
      { t: 0.5, kind: 'circle',  count: 3 },
      { t: 7,   kind: 'circle',  count: 4 },
      { t: 7,   kind: 'square',  count: 2 },
      { t: 14,  kind: 'square',  count: 4 },
      { t: 20,  kind: 'circle',  count: 5 },
    ] },
    { index: 5, durationHint: 28, spawns: [
      { t: 0.5, kind: 'circle', count: 4 },
      { t: 0.5, kind: 'square', count: 2 },
      { t: 6,   kind: 'star',   count: 1 },
      { t: 14,  kind: 'square', count: 3 },
      { t: 14,  kind: 'circle', count: 3 },
      { t: 22,  kind: 'star',   count: 2 },
    ] },
    { index: 6, durationHint: 60, isBossWave: true, spawns: [] },
  ],
};

/** Stage 2 — "Deep Blue" · WING · Boss: Jets */
const STAGE_2: StageConfig = {
  stageId: 'stage2',
  bossId: 'jets',
  actId: 'form',
  enemyStrengthMul: 1.5,
  pointMul: 2,
  waves: [
    { index: 1, durationHint: 20, spawns: [
      { t: 0.5, kind: 'circle',  count: 4 },
      { t: 6,   kind: 'square',  count: 3 },
      { t: 12,  kind: 'circle',  count: 5 },
    ] },
    { index: 2, durationHint: 22, spawns: [
      { t: 0.5, kind: 'square',   count: 4 },
      { t: 7,   kind: 'pentagon', count: 2 },
      { t: 14,  kind: 'circle',   count: 6 },
    ] },
    { index: 3, durationHint: 24, spawns: [
      { t: 0.5, kind: 'pentagon', count: 2 },
      { t: 5,   kind: 'diamond',  count: 2 },
      { t: 12,  kind: 'square',   count: 5 },
      { t: 18,  kind: 'circle',   count: 6 },
    ] },
    { index: 4, durationHint: 26, spawns: [
      { t: 0.5, kind: 'diamond',  count: 2 },
      { t: 0.5, kind: 'pentagon', count: 2 },
      { t: 7,   kind: 'star',     count: 2 },
      { t: 7,   kind: 'circle',   count: 3 },
      { t: 14,  kind: 'pentagon', count: 3 },
      { t: 20,  kind: 'square',   count: 3 },
      { t: 20,  kind: 'diamond',  count: 2 },
    ] },
    { index: 5, durationHint: 28, spawns: [
      { t: 0.5, kind: 'star',     count: 2 },
      { t: 6,   kind: 'hexagon',  count: 1 },
      { t: 6,   kind: 'pentagon', count: 2 },
      { t: 14,  kind: 'diamond',  count: 2 },
      { t: 14,  kind: 'circle',   count: 3 },
      { t: 22,  kind: 'pentagon', count: 3 },
    ] },
    { index: 6, durationHint: 32, spawns: [
      { t: 0.5, kind: 'hexagon',  count: 2 },
      { t: 0.5, kind: 'diamond',  count: 2 },
      { t: 6,   kind: 'star',     count: 2 },
      { t: 6,   kind: 'pentagon', count: 2 },
      { t: 14,  kind: 'diamond',  count: 3 },
      { t: 14,  kind: 'circle',   count: 3 },
      { t: 22,  kind: 'pentagon', count: 3 },
    ] },
    { index: 7, durationHint: 60, isBossWave: true, spawns: [] },
  ],
};

/** Stage 3 — "Dark Core" · MIRROR · Boss: Mirror (strength ×2.0) */
const STAGE_3: StageConfig = {
  stageId: 'stage3',
  bossId: 'mirror',
  actId: 'form',
  enemyStrengthMul: 2.0,
  pointMul: 3,
  waves: [
    { index: 1, durationHint: 20, spawns: [
      { t: 0.5, kind: 'square',   count: 4 },
      { t: 6,   kind: 'diamond',  count: 3 },
      { t: 12,  kind: 'circle',   count: 6 },
    ] },
    { index: 2, durationHint: 22, spawns: [
      { t: 0.5, kind: 'pentagon', count: 3 },
      { t: 7,   kind: 'cross',    count: 1 },
      { t: 14,  kind: 'diamond',  count: 3 },
    ] },
    { index: 3, durationHint: 24, spawns: [
      { t: 0.5, kind: 'cross',    count: 2 },
      { t: 5,   kind: 'crescent', count: 2 },
      { t: 12,  kind: 'hexagon',  count: 2 },
      { t: 18,  kind: 'star',     count: 3 },
    ] },
    { index: 4, durationHint: 26, spawns: [
      { t: 0.5, kind: 'crescent', count: 2 },
      { t: 0.5, kind: 'cross',    count: 2 },
      { t: 7,   kind: 'diamond',  count: 2 },
      { t: 7,   kind: 'pentagon', count: 2 },
      { t: 14,  kind: 'hexagon',  count: 2 },
      { t: 20,  kind: 'star',     count: 2 },
      { t: 20,  kind: 'crescent', count: 2 },
    ] },
    { index: 5, durationHint: 28, spawns: [
      { t: 0.5, kind: 'hexagon',  count: 2 },
      { t: 0.5, kind: 'cross',    count: 2 },
      { t: 6,   kind: 'crescent', count: 2 },
      { t: 6,   kind: 'diamond',  count: 2 },
      { t: 14,  kind: 'cross',    count: 2 },
      { t: 14,  kind: 'pentagon', count: 2 },
      { t: 22,  kind: 'star',     count: 3 },
    ] },
    { index: 6, durationHint: 32, spawns: [
      { t: 0.5, kind: 'cross',    count: 2 },
      { t: 0.5, kind: 'crescent', count: 2 },
      { t: 6,   kind: 'pentagon', count: 3 },
      { t: 6,   kind: 'diamond',  count: 2 },
      { t: 14,  kind: 'crescent', count: 3 },
      { t: 14,  kind: 'hexagon',  count: 2 },
      { t: 22,  kind: 'diamond',  count: 3 },
      { t: 22,  kind: 'star',     count: 2 },
    ] },
    { index: 7, durationHint: 36, spawns: [
      { t: 0.5, kind: 'crescent', count: 2 },
      { t: 0.5, kind: 'cross',    count: 2 },
      { t: 5,   kind: 'hexagon',  count: 2 },
      { t: 5,   kind: 'diamond',  count: 2 },
      { t: 12,  kind: 'star',     count: 3 },
      { t: 12,  kind: 'pentagon', count: 3 },
      { t: 20,  kind: 'crescent', count: 3 },
      { t: 20,  kind: 'cross',    count: 2 },
      { t: 28,  kind: 'diamond',  count: 4 },
    ] },
    { index: 8, durationHint: 60, isBossWave: true, spawns: [] },
  ],
};

/** Stage 4 — "Grid Lock" · GRID · Boss: Lattice (strength ×3.0) */
const STAGE_4: StageConfig = {
  stageId: 'stage4',
  bossId: 'lattice',
  actId: 'decay',
  enemyStrengthMul: 3.0,
  pointMul: 4,
  waves: [
    { index: 1, durationHint: 20, spawns: [
      { t: 0.5, kind: 'spiral', count: 3 },
      { t: 6,   kind: 'circle', count: 3 },
      { t: 12,  kind: 'spiral', count: 2 },
    ] },
    { index: 2, durationHint: 22, spawns: [
      { t: 0.5, kind: 'spiral', count: 3 },
      { t: 7,   kind: 'lance',  count: 2 },
      { t: 14,  kind: 'circle', count: 4 },
    ] },
    { index: 3, durationHint: 24, spawns: [
      { t: 0.5, kind: 'lance',    count: 3 },
      { t: 5,   kind: 'pentagon', count: 2 },
      { t: 12,  kind: 'spiral',   count: 2 },
      { t: 18,  kind: 'square',   count: 4 },
    ] },
    { index: 4, durationHint: 26, spawns: [
      { t: 0.5, kind: 'prism',    count: 1 },
      { t: 0.5, kind: 'lance',    count: 2 },
      { t: 7,   kind: 'spiral',   count: 3 },
      { t: 7,   kind: 'pentagon', count: 2 },
      { t: 14,  kind: 'lance',    count: 2 },
      { t: 20,  kind: 'circle',   count: 4 },
    ] },
    { index: 5, durationHint: 28, spawns: [
      { t: 0.5, kind: 'prism',    count: 2 },
      { t: 6,   kind: 'hexagon',  count: 2 },
      { t: 6,   kind: 'lance',    count: 2 },
      { t: 14,  kind: 'spiral',   count: 3 },
      { t: 14,  kind: 'pentagon', count: 2 },
      { t: 22,  kind: 'prism',    count: 1 },
    ] },
    { index: 6, durationHint: 32, spawns: [
      { t: 0.5, kind: 'spiral',   count: 3 },
      { t: 0.5, kind: 'lance',    count: 3 },
      { t: 6,   kind: 'prism',    count: 2 },
      { t: 6,   kind: 'pentagon', count: 2 },
      { t: 14,  kind: 'hexagon',  count: 2 },
      { t: 14,  kind: 'spiral',   count: 2 },
      { t: 22,  kind: 'lance',    count: 3 },
    ] },
    { index: 7, durationHint: 36, spawns: [
      { t: 0.5, kind: 'prism',    count: 3 },
      { t: 5,   kind: 'hexagon',  count: 2 },
      { t: 5,   kind: 'lance',    count: 2 },
      { t: 12,  kind: 'spiral',   count: 3 },
      { t: 12,  kind: 'pentagon', count: 3 },
      { t: 20,  kind: 'prism',    count: 2 },
      { t: 20,  kind: 'lance',    count: 2 },
      { t: 28,  kind: 'spiral',   count: 3 },
    ] },
    { index: 8, durationHint: 38, spawns: [
      { t: 0.5, kind: 'prism',    count: 3 },
      { t: 0.5, kind: 'spiral',   count: 4 },
      { t: 6,   kind: 'hexagon',  count: 2 },
      { t: 6,   kind: 'lance',    count: 3 },
      { t: 14,  kind: 'prism',    count: 2 },
      { t: 14,  kind: 'pentagon', count: 3 },
      { t: 22,  kind: 'spiral',   count: 3 },
      { t: 28,  kind: 'lance',    count: 3 },
    ] },
    { index: 9, durationHint: 42, spawns: [
      { t: 0.5, kind: 'prism',    count: 3 },
      { t: 0.5, kind: 'spiral',   count: 4 },
      { t: 6,   kind: 'hexagon',  count: 3 },
      { t: 6,   kind: 'lance',    count: 3 },
      { t: 14,  kind: 'prism',    count: 3 },
      { t: 14,  kind: 'pentagon', count: 3 },
      { t: 22,  kind: 'spiral',   count: 4 },
      { t: 22,  kind: 'lance',    count: 2 },
      { t: 30,  kind: 'hexagon',  count: 2 },
    ] },
    { index: 10, durationHint: 60, isBossWave: true, spawns: [] },
  ],
};

/** Stage 5 — "Void Core" · VOID · Boss: Rift (strength ×4.0) */
const STAGE_5: StageConfig = {
  stageId: 'stage5',
  bossId: 'rift',
  actId: 'decay',
  enemyStrengthMul: 4.0,
  pointMul: 5,
  waves: [
    { index: 1, durationHint: 20, spawns: [
      { t: 0.5, kind: 'octo',   count: 1 },
      { t: 6,   kind: 'spiral', count: 2 },
      { t: 12,  kind: 'prism',  count: 2 },
    ] },
    { index: 2, durationHint: 22, spawns: [
      { t: 0.5, kind: 'shade',    count: 2 },
      { t: 7,   kind: 'cross',    count: 2 },
      { t: 14,  kind: 'crescent', count: 2 },
    ] },
    { index: 3, durationHint: 24, spawns: [
      { t: 0.5, kind: 'octo',   count: 2 },
      { t: 5,   kind: 'shade',  count: 2 },
      { t: 12,  kind: 'prism',  count: 3 },
      { t: 18,  kind: 'spiral', count: 2 },
    ] },
    { index: 4, durationHint: 26, spawns: [
      { t: 0.5, kind: 'octo',     count: 2 },
      { t: 0.5, kind: 'cross',    count: 2 },
      { t: 7,   kind: 'shade',    count: 2 },
      { t: 7,   kind: 'crescent', count: 3 },
      { t: 14,  kind: 'prism',    count: 2 },
      { t: 20,  kind: 'octo',     count: 1 },
    ] },
    { index: 5, durationHint: 28, spawns: [
      { t: 0.5, kind: 'prism',    count: 3 },
      { t: 6,   kind: 'shade',    count: 3 },
      { t: 6,   kind: 'octo',     count: 2 },
      { t: 14,  kind: 'cross',    count: 2 },
      { t: 14,  kind: 'crescent', count: 2 },
      { t: 22,  kind: 'shade',    count: 2 },
    ] },
    { index: 6, durationHint: 32, spawns: [
      { t: 0.5, kind: 'octo',     count: 3 },
      { t: 0.5, kind: 'shade',    count: 3 },
      { t: 6,   kind: 'cross',    count: 3 },
      { t: 6,   kind: 'crescent', count: 3 },
      { t: 14,  kind: 'prism',    count: 2 },
      { t: 14,  kind: 'octo',     count: 2 },
      { t: 22,  kind: 'shade',    count: 3 },
    ] },
    { index: 7, durationHint: 36, spawns: [
      { t: 0.5, kind: 'shade',    count: 3 },
      { t: 0.5, kind: 'cross',    count: 3 },
      { t: 5,   kind: 'octo',     count: 2 },
      { t: 5,   kind: 'prism',    count: 3 },
      { t: 12,  kind: 'crescent', count: 2 },
      { t: 12,  kind: 'shade',    count: 3 },
      { t: 20,  kind: 'octo',     count: 2 },
      { t: 20,  kind: 'cross',    count: 2 },
      { t: 28,  kind: 'prism',    count: 3 },
    ] },
    { index: 8, durationHint: 38, spawns: [
      { t: 0.5, kind: 'octo',     count: 3 },
      { t: 0.5, kind: 'shade',    count: 4 },
      { t: 6,   kind: 'cross',    count: 3 },
      { t: 6,   kind: 'prism',    count: 3 },
      { t: 14,  kind: 'crescent', count: 3 },
      { t: 14,  kind: 'octo',     count: 2 },
      { t: 22,  kind: 'shade',    count: 3 },
      { t: 22,  kind: 'cross',    count: 3 },
      { t: 30,  kind: 'prism',    count: 2 },
    ] },
    { index: 9, durationHint: 40, spawns: [
      { t: 0.5, kind: 'shade',    count: 4 },
      { t: 0.5, kind: 'cross',    count: 4 },
      { t: 6,   kind: 'octo',     count: 3 },
      { t: 6,   kind: 'prism',    count: 3 },
      { t: 14,  kind: 'crescent', count: 3 },
      { t: 14,  kind: 'spiral',   count: 2 },
      { t: 22,  kind: 'shade',    count: 3 },
      { t: 22,  kind: 'octo',     count: 2 },
      { t: 30,  kind: 'cross',    count: 3 },
    ] },
    { index: 10, durationHint: 42, spawns: [
      { t: 0.5, kind: 'octo',     count: 4 },
      { t: 0.5, kind: 'shade',    count: 4 },
      { t: 6,   kind: 'cross',    count: 3 },
      { t: 6,   kind: 'crescent', count: 4 },
      { t: 14,  kind: 'prism',    count: 3 },
      { t: 14,  kind: 'shade',    count: 3 },
      { t: 22,  kind: 'octo',     count: 3 },
      { t: 22,  kind: 'cross',    count: 3 },
      { t: 30,  kind: 'prism',    count: 3 },
    ] },
    { index: 11, durationHint: 44, spawns: [
      { t: 0.5, kind: 'shade',    count: 5 },
      { t: 0.5, kind: 'cross',    count: 4 },
      { t: 6,   kind: 'octo',     count: 4 },
      { t: 6,   kind: 'prism',    count: 4 },
      { t: 14,  kind: 'crescent', count: 4 },
      { t: 14,  kind: 'shade',    count: 4 },
      { t: 22,  kind: 'octo',     count: 3 },
      { t: 22,  kind: 'cross',    count: 3 },
      { t: 30,  kind: 'prism',    count: 4 },
    ] },
    { index: 12, durationHint: 60, isBossWave: true, spawns: [] },
  ],
};

// ── Registry ─────────────────────────────────────────────────────────────────

/**
 * All normal-mode stage configurations in play order.
 * Index 0 = Stage 1, index 4 = Stage 5.
 *
 * Invariant: `STAGE_CONFIGS.length === STAGE_THEMES.length` (content/stageThemes.ts).
 */
export const STAGE_CONFIGS: readonly StageConfig[] = [
  STAGE_1,
  STAGE_2,
  STAGE_3,
  STAGE_4,
  STAGE_5,
];
