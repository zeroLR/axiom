// ── Boss registry ────────────────────────────────────────────────────────────
// Central lookup for boss definitions. Maps each stage to its boss and provides
// a typed registry keyed by BossId.

import type { BossId, BossDef } from "./types";
import { orthogonBossDef } from "./orthogon";
import { jetsBossDef } from "./jets";
import { mirrorBossDef } from "./mirror";
import { latticeBossDef } from "./lattice";
import { riftBossDef } from "./rift";

export const BOSS_REGISTRY: Record<BossId, BossDef> = {
  orthogon: orthogonBossDef,
  jets: jetsBossDef,
  mirror: mirrorBossDef,
  lattice: latticeBossDef,
  rift: riftBossDef,
};

/** Stage-index (0-based) → boss definition for that stage's final wave. */
const STAGE_BOSS_ORDER: readonly BossId[] = ["orthogon", "jets", "mirror", "lattice", "rift"];

export function bossForStage(stageIndex: number): BossDef {
  const id = STAGE_BOSS_ORDER[stageIndex];
  if (!id) return BOSS_REGISTRY.mirror; // fallback
  return BOSS_REGISTRY[id];
}
