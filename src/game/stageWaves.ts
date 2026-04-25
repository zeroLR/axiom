// ── Multi-stage wave definitions (compiled from content/stages.ts) ──────────
// Wave data is now authored in `src/game/content/stages.ts` as StageConfig
// templates and compiled to WaveSpec[] by `stageCompiler.ts`.
//
// This file keeps the `STAGE_WAVES` / `STAGE_COUNT` exports for backward
// compatibility with tests and any existing imports.
//
// To add or edit a stage, modify `src/game/content/stages.ts` — do NOT add
// raw WaveSpec arrays here.

import type { WaveSpec } from "./waves";
import { STAGE_CONFIGS } from "./content/stages";
import { compileStageWaves } from "./stageCompiler";

export type { WaveSpec };

// Compile all stage configs deterministically (no RNG needed — all current
// stages use fixed enemy kinds, not weighted/archetype tables). Stages that
// adopt `archetype` or `enemies` should compile per-run via
// `compileStageWaves(cfg, idx, runRng)` instead of using this static cache.
export const STAGE_WAVES: readonly (readonly WaveSpec[])[] =
  STAGE_CONFIGS.map((cfg, idx) => compileStageWaves(cfg, idx));

/** Number of stages available in normal mode. Derived from STAGE_CONFIGS. */
export const STAGE_COUNT = STAGE_WAVES.length;
