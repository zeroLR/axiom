// ── Run Coordinator types ───────────────────────────────────────────────────
// Shared interfaces for the active-run context used across main.ts / HUD /
// developer controls.  Extracted here so downstream modules can import the
// type without depending on the entire boot closure.

import type { GameMode } from '../scenes/play';

/**
 * Describes the run that is currently in-flight.
 * Populated by `startRun()` and cleared to `null` when the run ends.
 */
export interface RunContext {
  mode: GameMode;
  stageIndex: number;
  developMode: boolean;
}
