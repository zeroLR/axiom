// ── Boss registry ────────────────────────────────────────────────────────────
// Central lookup for boss definitions. Maps each stage to its boss and provides
// a typed registry keyed by BossId.
//
// The stage → boss mapping is derived from `content/stages.ts` (STAGE_CONFIGS),
// which is the single source of truth for stage gameplay data.

import type { BossId, BossDef } from "./types";
import { orthogonBossDef } from "./orthogon";
import { jetsBossDef } from "./jets";
import { mirrorBossDef } from "./mirror";
import { latticeBossDef } from "./lattice";
import { riftBossDef } from "./rift";
import { STAGE_CONFIGS } from "../content/stages";

export const BOSS_REGISTRY: Record<BossId, BossDef> = {
  orthogon: orthogonBossDef,
  jets: jetsBossDef,
  mirror: mirrorBossDef,
  lattice: latticeBossDef,
  rift: riftBossDef,
};

/** Stage-index (0-based) → boss definition for that stage's final wave. */
export function bossForStage(stageIndex: number): BossDef {
  const id = STAGE_CONFIGS[stageIndex]?.bossId;
  if (!id) return BOSS_REGISTRY.mirror; // fallback
  return BOSS_REGISTRY[id];
}
