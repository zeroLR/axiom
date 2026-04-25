// ── Act / Chapter schema ──────────────────────────────────────────────────────
// Acts group stages into Mega-Man-style chapters. Within an Act the *trial*
// stages are clearable in any order; the *gate* stage (when present) opens
// only after every trial is cleared. Acts unlock linearly via `unlockAfterAct`
// so the overall narrative still advances, but moment-to-moment choice lives
// inside each Act.
//
// Adding a 6th stage = drop its stageId into an Act's trialStageIds (or set
// it as a new Act's gate). No positional arrays to keep in sync.

export type ActId = "form" | "decay";

export interface ActDef {
  id: ActId;
  /** Display name (uppercase by convention). */
  name: string;
  /** Short narrative line shown under the name. */
  motto: string;
  /** Stages clearable in any order within this Act. */
  trialStageIds: readonly string[];
  /**
   * Optional final stage that unlocks only after every trial is cleared.
   * Omit when the Act is open-ended (no boss-gate yet).
   */
  gateStageId?: string;
  /** Acts unlock linearly: this Act requires the listed Act fully cleared. */
  unlockAfterAct?: ActId;
}

/**
 * Canonical Act registry. Order matches narrative progression.
 *
 * FORM groups Stages 1–3 (AXIS/WING/MIRROR) — the original three-domain arc
 * from `docs/main-story.md`. Mirror remains the gate so its player-adaptive
 * mechanic functions as the chapter capstone.
 *
 * DECAY groups Stages 4–5 (GRID/VOID) with no gate yet; it is open-ended
 * pending future stages. When a final Act-II boss ships, set its stageId as
 * `gateStageId`.
 */
export const ACTS: readonly ActDef[] = [
  {
    id: "form",
    name: "FORM",
    motto: "shape the axiom",
    trialStageIds: ["stage1", "stage2"],
    gateStageId: "stage3",
  },
  {
    id: "decay",
    name: "DECAY",
    motto: "the lattice fails",
    trialStageIds: ["stage4", "stage5"],
    gateStageId: "stage6",
    unlockAfterAct: "form",
  },
];

const ACT_BY_ID: Record<ActId, ActDef> = Object.fromEntries(
  ACTS.map((a) => [a.id, a]),
) as Record<ActId, ActDef>;

export function getActDef(id: ActId): ActDef {
  return ACT_BY_ID[id];
}

/**
 * Return the set of every stageId mentioned by an Act (trials + optional gate).
 * Useful for indexing UI rendering and for migration validation.
 */
export function actStageIds(act: ActDef): string[] {
  return act.gateStageId ? [...act.trialStageIds, act.gateStageId] : [...act.trialStageIds];
}

/**
 * Look up which Act a stageId belongs to, or null if the stageId is not
 * registered. Linear in the number of Acts × stages-per-Act, which is fine
 * given current scale.
 */
export function actForStageId(stageId: string): ActDef | null {
  for (const act of ACTS) {
    if (actStageIds(act).includes(stageId)) return act;
  }
  return null;
}
