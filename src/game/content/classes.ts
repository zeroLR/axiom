import type { ClassLineageId, PrimalSkillId, StartingShapeId } from "../data/types";
import type { FragmentId } from "../fragments";

// ── Class node identifier ─────────────────────────────────────────────────────

export type ClassNodeId =
  // AXIS
  | "axis-t0" | "axis-t1" | "axis-t2a" | "axis-t2b"
  | "axis-t3aa" | "axis-t3ab" | "axis-t3ba" | "axis-t3bb"
  // WING
  | "wing-t0" | "wing-t1" | "wing-t2a" | "wing-t2b"
  | "wing-t3aa" | "wing-t3ab" | "wing-t3ba" | "wing-t3bb"
  // MIRROR
  | "mirror-t0" | "mirror-t1" | "mirror-t2a" | "mirror-t2b"
  | "mirror-t3aa" | "mirror-t3ab" | "mirror-t3ba" | "mirror-t3bb";

/** Highest implemented tier (T4 is reserved for future content). */
export const MAX_CLASS_TIER = 3;

// ── Passive effect types ──────────────────────────────────────────────────────

export type ClassPassiveKind =
  | "damageAdd"
  | "critAdd"
  | "maxHpAdd"
  | "iframeAdd"
  | "projectilesAdd"
  | "periodMul"       // < 1 = faster fire rate (multiplicative)
  | "speedMul"        // > 1 = faster movement (multiplicative)
  | "pointRewardMul"  // additive bonus fraction (handled at settlement)
  | "fragmentRewardMul"; // additive bonus fraction (handled at settlement)

export interface ClassPassive {
  kind: ClassPassiveKind;
  value: number;
}

// ── Promotion requirements ────────────────────────────────────────────────────

export interface ClassPromotionReq {
  pointCost: number;
  fragmentId: FragmentId;
  fragmentCost: number;
  /** profile.stats.normalCleared index that must be true before promotion. */
  stageClear: number;
}

// ── Class node definition ─────────────────────────────────────────────────────

export interface ClassNodeDef {
  id: ClassNodeId;
  lineage: ClassLineageId;
  /** 0 = base class, 1..3 = promotion tiers. */
  tier: number;
  /** 0 = branch A, 1 = branch B. T0/T1 always use branch 0. */
  branch: number;
  /** For T3 nodes: the T2 branch this node extends (0 or 1). */
  parentBranch?: number;
  name: string;
  description: string;
  /** Incremental passives granted by this node. */
  passives: ClassPassive[];
  /** Primal skill unlocked when this node is activated (T1 and select T2 nodes only). */
  unlocksSkill?: PrimalSkillId;
  /** Null for T0 (always available once lineage is chosen). */
  promotionReq: ClassPromotionReq | null;
}

// ── Lineage metadata ──────────────────────────────────────────────────────────

export interface ClassLineageDef {
  id: ClassLineageId;
  name: string;
  startingShape: StartingShapeId;
  flavorLine: string;
}

export const CLASS_LINEAGES: readonly ClassLineageDef[] = [
  {
    id: "axis",
    name: "AXIS",
    startingShape: "triangle",
    flavorLine: "Lines converge. Precision rules.",
  },
  {
    id: "wing",
    name: "WING",
    startingShape: "square",
    flavorLine: "Edges strike first. Speed is law.",
  },
  {
    id: "mirror",
    name: "MIRROR",
    startingShape: "diamond",
    flavorLine: "Every inference reflects. Endurance prevails.",
  },
] as const;

export const CLASS_LINEAGE_BY_ID: Record<ClassLineageId, ClassLineageDef> = {
  axis:   CLASS_LINEAGES[0]!,
  wing:   CLASS_LINEAGES[1]!,
  mirror: CLASS_LINEAGES[2]!,
};

// ── Character slot creation costs ─────────────────────────────────────────────

/** Points cost to open each additional character slot.
 *  Index = current number of slots before creating the new one.
 *  Slot 0 (first character) is always free. */
export const CHARACTER_SLOT_COSTS = [0, 300, 700, 1500, 3000, 5500] as const;

/** Maximum number of character slots a player can own. */
export const MAX_CHARACTER_SLOTS = CHARACTER_SLOT_COSTS.length; // 6

// ── Class node registry ───────────────────────────────────────────────────────

export const CLASS_NODES: Record<ClassNodeId, ClassNodeDef> = {

  // ── AXIS lineage — precision & raw damage ───────────────────────────────────

  "axis-t0": {
    id: "axis-t0", lineage: "axis", tier: 0, branch: 0,
    name: "Initial Vector",
    description: "Sharpen base weapon damage.",
    passives: [{ kind: "damageAdd", value: 1 }],
    promotionReq: null,
  },
  "axis-t1": {
    id: "axis-t1", lineage: "axis", tier: 1, branch: 0,
    name: "Acute Focus",
    description: "Gain baseline critical rate.",
    passives: [{ kind: "critAdd", value: 0.05 }],
    unlocksSkill: "barrage",
    promotionReq: { pointCost: 200, fragmentId: "boss-orthogon", fragmentCost: 3, stageClear: 0 },
  },
  "axis-t2a": {
    id: "axis-t2a", lineage: "axis", tier: 2, branch: 0,
    name: "Precision Protocol",
    description: "Significantly enhance critical rate.",
    passives: [{ kind: "critAdd", value: 0.08 }],
    promotionReq: { pointCost: 500, fragmentId: "boss-jets", fragmentCost: 5, stageClear: 1 },
  },
  "axis-t2b": {
    id: "axis-t2b", lineage: "axis", tier: 2, branch: 1,
    name: "Force Amplifier",
    description: "Raw weapon damage increase.",
    passives: [{ kind: "damageAdd", value: 2 }],
    promotionReq: { pointCost: 500, fragmentId: "boss-jets", fragmentCost: 5, stageClear: 1 },
  },
  "axis-t3aa": {
    id: "axis-t3aa", lineage: "axis", tier: 3, branch: 0, parentBranch: 0,
    name: "Omega Edge",
    description: "Maximum critical specialisation.",
    passives: [{ kind: "critAdd", value: 0.10 }, { kind: "damageAdd", value: 1 }],
    promotionReq: { pointCost: 1000, fragmentId: "boss-mirror", fragmentCost: 8, stageClear: 2 },
  },
  "axis-t3ab": {
    id: "axis-t3ab", lineage: "axis", tier: 3, branch: 1, parentBranch: 0,
    name: "Scatter Lens",
    description: "More projectiles with crit overlay.",
    passives: [{ kind: "projectilesAdd", value: 1 }, { kind: "critAdd", value: 0.05 }],
    promotionReq: { pointCost: 1000, fragmentId: "boss-mirror", fragmentCost: 8, stageClear: 2 },
  },
  "axis-t3ba": {
    id: "axis-t3ba", lineage: "axis", tier: 3, branch: 0, parentBranch: 1,
    name: "Overcharge Core",
    description: "Extreme raw damage output.",
    passives: [{ kind: "damageAdd", value: 3 }],
    promotionReq: { pointCost: 1000, fragmentId: "boss-mirror", fragmentCost: 8, stageClear: 2 },
  },
  "axis-t3bb": {
    id: "axis-t3bb", lineage: "axis", tier: 3, branch: 1, parentBranch: 1,
    name: "Breach Protocol",
    description: "Damage plus a critical buffer.",
    passives: [{ kind: "damageAdd", value: 2 }, { kind: "critAdd", value: 0.05 }],
    promotionReq: { pointCost: 1000, fragmentId: "boss-mirror", fragmentCost: 8, stageClear: 2 },
  },

  // ── WING lineage — fire rate & movement ─────────────────────────────────────

  "wing-t0": {
    id: "wing-t0", lineage: "wing", tier: 0, branch: 0,
    name: "Rapid Cadence",
    description: "Slightly faster fire rate.",
    passives: [{ kind: "periodMul", value: 0.95 }],
    promotionReq: null,
  },
  "wing-t1": {
    id: "wing-t1", lineage: "wing", tier: 1, branch: 0,
    name: "Parallel Strike",
    description: "One additional projectile per shot.",
    passives: [{ kind: "projectilesAdd", value: 1 }],
    unlocksSkill: "axisFreeze",
    promotionReq: { pointCost: 200, fragmentId: "boss-orthogon", fragmentCost: 3, stageClear: 0 },
  },
  "wing-t2a": {
    id: "wing-t2a", lineage: "wing", tier: 2, branch: 0,
    name: "Cascade Fire",
    description: "Further increase fire rate.",
    passives: [{ kind: "periodMul", value: 0.92 }],
    promotionReq: { pointCost: 500, fragmentId: "boss-jets", fragmentCost: 5, stageClear: 1 },
  },
  "wing-t2b": {
    id: "wing-t2b", lineage: "wing", tier: 2, branch: 1,
    name: "Gust Drive",
    description: "Boost movement speed.",
    passives: [{ kind: "speedMul", value: 1.12 }],
    promotionReq: { pointCost: 500, fragmentId: "boss-jets", fragmentCost: 5, stageClear: 1 },
  },
  "wing-t3aa": {
    id: "wing-t3aa", lineage: "wing", tier: 3, branch: 0, parentBranch: 0,
    name: "Stormwall",
    description: "Peak fire rate with bonus damage.",
    passives: [{ kind: "periodMul", value: 0.90 }, { kind: "damageAdd", value: 1 }],
    promotionReq: { pointCost: 1000, fragmentId: "boss-mirror", fragmentCost: 8, stageClear: 2 },
  },
  "wing-t3ab": {
    id: "wing-t3ab", lineage: "wing", tier: 3, branch: 1, parentBranch: 0,
    name: "Burst Array",
    description: "More projectiles at high fire rate.",
    passives: [{ kind: "projectilesAdd", value: 1 }],
    promotionReq: { pointCost: 1000, fragmentId: "boss-mirror", fragmentCost: 8, stageClear: 2 },
  },
  "wing-t3ba": {
    id: "wing-t3ba", lineage: "wing", tier: 3, branch: 0, parentBranch: 1,
    name: "Wind Striker",
    description: "Maximum speed with damage bonus.",
    passives: [{ kind: "speedMul", value: 1.18 }, { kind: "damageAdd", value: 1 }],
    promotionReq: { pointCost: 1000, fragmentId: "boss-mirror", fragmentCost: 8, stageClear: 2 },
  },
  "wing-t3bb": {
    id: "wing-t3bb", lineage: "wing", tier: 3, branch: 1, parentBranch: 1,
    name: "Cyclone Edge",
    description: "Speed combined with critical pressure.",
    passives: [{ kind: "speedMul", value: 1.15 }, { kind: "critAdd", value: 0.05 }],
    promotionReq: { pointCost: 1000, fragmentId: "boss-mirror", fragmentCost: 8, stageClear: 2 },
  },

  // ── MIRROR lineage — survival & economy ─────────────────────────────────────

  "mirror-t0": {
    id: "mirror-t0", lineage: "mirror", tier: 0, branch: 0,
    name: "Resonant Shell",
    description: "Increase starting max HP.",
    passives: [{ kind: "maxHpAdd", value: 2 }],
    promotionReq: null,
  },
  "mirror-t1": {
    id: "mirror-t1", lineage: "mirror", tier: 1, branch: 0,
    name: "Phase Buffer",
    description: "Extended hit invulnerability.",
    passives: [{ kind: "iframeAdd", value: 0.04 }],
    unlocksSkill: "reflectShield",
    promotionReq: { pointCost: 200, fragmentId: "boss-orthogon", fragmentCost: 3, stageClear: 0 },
  },
  "mirror-t2a": {
    id: "mirror-t2a", lineage: "mirror", tier: 2, branch: 0,
    name: "Fortified Core",
    description: "Further increase max HP.",
    passives: [{ kind: "maxHpAdd", value: 3 }],
    promotionReq: { pointCost: 500, fragmentId: "boss-jets", fragmentCost: 5, stageClear: 1 },
  },
  "mirror-t2b": {
    id: "mirror-t2b", lineage: "mirror", tier: 2, branch: 1,
    name: "Salvage Engine",
    description: "Earn more points per run.",
    passives: [{ kind: "pointRewardMul", value: 0.08 }],
    promotionReq: { pointCost: 500, fragmentId: "boss-jets", fragmentCost: 5, stageClear: 1 },
  },
  "mirror-t3aa": {
    id: "mirror-t3aa", lineage: "mirror", tier: 3, branch: 0, parentBranch: 0,
    name: "Monolith",
    description: "Maximum HP and extended iframes.",
    passives: [{ kind: "maxHpAdd", value: 4 }, { kind: "iframeAdd", value: 0.04 }],
    promotionReq: { pointCost: 1000, fragmentId: "boss-mirror", fragmentCost: 8, stageClear: 2 },
  },
  "mirror-t3ab": {
    id: "mirror-t3ab", lineage: "mirror", tier: 3, branch: 1, parentBranch: 0,
    name: "Reflex Matrix",
    description: "HP bonus with critical precision.",
    passives: [{ kind: "maxHpAdd", value: 2 }, { kind: "critAdd", value: 0.05 }],
    promotionReq: { pointCost: 1000, fragmentId: "boss-mirror", fragmentCost: 8, stageClear: 2 },
  },
  "mirror-t3ba": {
    id: "mirror-t3ba", lineage: "mirror", tier: 3, branch: 0, parentBranch: 1,
    name: "Harvester",
    description: "Amplify all run rewards.",
    passives: [
      { kind: "pointRewardMul", value: 0.10 },
      { kind: "fragmentRewardMul", value: 0.06 },
    ],
    promotionReq: { pointCost: 1000, fragmentId: "boss-mirror", fragmentCost: 8, stageClear: 2 },
  },
  "mirror-t3bb": {
    id: "mirror-t3bb", lineage: "mirror", tier: 3, branch: 1, parentBranch: 1,
    name: "Recursion Loop",
    description: "Fragment gain and weapon damage.",
    passives: [{ kind: "fragmentRewardMul", value: 0.10 }, { kind: "damageAdd", value: 2 }],
    promotionReq: { pointCost: 1000, fragmentId: "boss-mirror", fragmentCost: 8, stageClear: 2 },
  },
};

export const CLASS_NODE_IDS = Object.keys(CLASS_NODES) as ClassNodeId[];
