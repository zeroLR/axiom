import type { TalentId } from "../data/types";
import type { BossId } from "../bosses/types";

export type TalentBranch = "survival" | "offense" | "efficiency";
export type TalentFragmentKind = "basic" | "elite";
export type TalentEffectKind =
  | "maxHpAdd"
  | "iframeAdd"
  | "speedMul"
  | "pickupRadiusMul"
  | "damageAdd"
  | "critAdd"
  | "periodMul"
  | "projectileSpeedMul"
  | "pierceAdd"
  | "projectilesAdd"
  | "pointRewardMul"
  | "fragmentRewardMul"
  | "skillPointsAdd";

export interface TalentLevelDef {
  pointCost: number;
  fragmentCost: number;
  bonus: number;
}

/** Role of a node within its hex cluster. */
export type TalentNodeRole = "connector" | "vertex" | "core";

/** Identifier of a hex cluster — six clusters total (two per branch). */
export type TalentClusterId =
  | "axisGuard"
  | "wingFlow"
  | "mirrorPress"
  | "gridPulse"
  | "voidYield"
  | "coreSyntax";

export interface TalentNodeDef {
  id: TalentId;
  branch: TalentBranch;
  cluster: TalentClusterId;
  role: TalentNodeRole;
  /** Vertex slot 0..5 (only for role === "vertex"). 0 = nearest origin, increases clockwise. */
  vertexSlot?: number;
  name: string;
  description: string;
  fragmentKind: TalentFragmentKind;
  effectKind: TalentEffectKind;
  levels: TalentLevelDef[];
  requires?: { id: TalentId; level: number };
  isCore?: boolean;
  /**
   * Optional boss-defeat gate. The node's connector/vertex prerequisites still
   * apply; this adds a meta-progression lock on top, used to make boss kills
   * grant tangible capstone unlocks rather than only currency.
   */
  unlockAfterBoss?: BossId;
}

// Hex layout: each cluster has 1 connector → 6 vertices (V0 nearest origin, then clockwise) → 1 core.
// Connector requires nothing. Each vertex requires the connector at L1 (V0) or its preceding vertex.
// Core requires the cluster's V3 (the vertex farthest from origin) at its max.

export const TALENT_NODES: Record<TalentId, TalentNodeDef> = {
  // ── CLUSTER: AXIS · GUARD ────────────────────────────────────────────────
  axisGuardConn: {
    id: "axisGuardConn", branch: "survival", cluster: "axisGuard", role: "connector",
    name: "Vital Link", description: "Increase starting max HP.",
    fragmentKind: "basic", effectKind: "maxHpAdd",
    levels: [
      { pointCost: 100, fragmentCost: 8, bonus: 1 },
      { pointCost: 160, fragmentCost: 14, bonus: 1 },
      { pointCost: 230, fragmentCost: 22, bonus: 1 },
    ],
  },
  axisGuardV0: {
    id: "axisGuardV0", branch: "survival", cluster: "axisGuard", role: "vertex", vertexSlot: 0,
    name: "Cell Density I", description: "Increase starting max HP.",
    fragmentKind: "basic", effectKind: "maxHpAdd",
    requires: { id: "axisGuardConn", level: 1 },
    levels: [
      { pointCost: 130, fragmentCost: 11, bonus: 1 },
      { pointCost: 200, fragmentCost: 17, bonus: 1 },
      { pointCost: 280, fragmentCost: 25, bonus: 1 },
      { pointCost: 370, fragmentCost: 33, bonus: 1 },
    ],
  },
  axisGuardV1: {
    id: "axisGuardV1", branch: "survival", cluster: "axisGuard", role: "vertex", vertexSlot: 1,
    name: "Cell Density II", description: "Increase starting max HP.",
    fragmentKind: "basic", effectKind: "maxHpAdd",
    requires: { id: "axisGuardV0", level: 2 },
    levels: [
      { pointCost: 170, fragmentCost: 14, bonus: 1 },
      { pointCost: 240, fragmentCost: 20, bonus: 1 },
      { pointCost: 320, fragmentCost: 28, bonus: 1 },
      { pointCost: 420, fragmentCost: 36, bonus: 1 },
    ],
  },
  axisGuardV2: {
    id: "axisGuardV2", branch: "survival", cluster: "axisGuard", role: "vertex", vertexSlot: 2,
    name: "Vitality Matrix I", description: "Greatly increase starting max HP.",
    fragmentKind: "basic", effectKind: "maxHpAdd",
    requires: { id: "axisGuardV1", level: 2 },
    levels: [
      { pointCost: 210, fragmentCost: 17, bonus: 2 },
      { pointCost: 290, fragmentCost: 23, bonus: 2 },
      { pointCost: 380, fragmentCost: 31, bonus: 2 },
      { pointCost: 480, fragmentCost: 40, bonus: 2 },
    ],
  },
  axisGuardV3: {
    id: "axisGuardV3", branch: "survival", cluster: "axisGuard", role: "vertex", vertexSlot: 3,
    name: "Vitality Matrix II", description: "Greatly increase starting max HP.",
    fragmentKind: "basic", effectKind: "maxHpAdd",
    requires: { id: "axisGuardV2", level: 2 },
    levels: [
      { pointCost: 260, fragmentCost: 21, bonus: 2 },
      { pointCost: 350, fragmentCost: 28, bonus: 2 },
      { pointCost: 460, fragmentCost: 37, bonus: 2 },
      { pointCost: 580, fragmentCost: 46, bonus: 2 },
    ],
  },
  axisGuardV4: {
    id: "axisGuardV4", branch: "survival", cluster: "axisGuard", role: "vertex", vertexSlot: 4,
    name: "Vitality Matrix III", description: "Greatly increase starting max HP.",
    fragmentKind: "basic", effectKind: "maxHpAdd",
    requires: { id: "axisGuardV3", level: 2 },
    levels: [
      { pointCost: 310, fragmentCost: 25, bonus: 2 },
      { pointCost: 410, fragmentCost: 32, bonus: 2 },
      { pointCost: 530, fragmentCost: 41, bonus: 2 },
    ],
  },
  axisGuardV5: {
    id: "axisGuardV5", branch: "survival", cluster: "axisGuard", role: "vertex", vertexSlot: 5,
    name: "Cell Density III", description: "Increase starting max HP.",
    fragmentKind: "basic", effectKind: "maxHpAdd",
    requires: { id: "axisGuardV4", level: 2 },
    levels: [
      { pointCost: 360, fragmentCost: 28, bonus: 1 },
      { pointCost: 470, fragmentCost: 36, bonus: 1 },
      { pointCost: 600, fragmentCost: 46, bonus: 1 },
    ],
  },
  axisGuardCore: {
    id: "axisGuardCore", branch: "survival", cluster: "axisGuard", role: "core",
    name: "Bastion Core", description: "Massive increase to starting max HP.",
    fragmentKind: "elite", effectKind: "maxHpAdd",
    requires: { id: "axisGuardV3", level: 4 },
    isCore: true,
    unlockAfterBoss: "orthogon",
    levels: [
      { pointCost: 800, fragmentCost: 6, bonus: 5 },
      { pointCost: 1200, fragmentCost: 9, bonus: 5 },
    ],
  },

  // ── CLUSTER: WING · FLOW ──────────────────────────────────────────
  wingFlowConn: {
    id: "wingFlowConn", branch: "survival", cluster: "wingFlow", role: "connector",
    name: "Kinetic Link", description: "Increase movement speed.",
    fragmentKind: "basic", effectKind: "speedMul",
    levels: [
      { pointCost: 110, fragmentCost: 9, bonus: 0.02 },
      { pointCost: 170, fragmentCost: 15, bonus: 0.02 },
      { pointCost: 240, fragmentCost: 22, bonus: 0.02 },
    ],
  },
  wingFlowV0: {
    id: "wingFlowV0", branch: "survival", cluster: "wingFlow", role: "vertex", vertexSlot: 0,
    name: "Kinetic Drive I", description: "Increase movement speed.",
    fragmentKind: "basic", effectKind: "speedMul",
    requires: { id: "wingFlowConn", level: 1 },
    levels: [
      { pointCost: 140, fragmentCost: 11, bonus: 0.02 },
      { pointCost: 210, fragmentCost: 17, bonus: 0.02 },
      { pointCost: 290, fragmentCost: 25, bonus: 0.02 },
    ],
  },
  wingFlowV1: {
    id: "wingFlowV1", branch: "survival", cluster: "wingFlow", role: "vertex", vertexSlot: 1,
    name: "Kinetic Drive II", description: "Increase movement speed.",
    fragmentKind: "basic", effectKind: "speedMul",
    requires: { id: "wingFlowV0", level: 2 },
    levels: [
      { pointCost: 180, fragmentCost: 14, bonus: 0.02 },
      { pointCost: 260, fragmentCost: 20, bonus: 0.02 },
      { pointCost: 350, fragmentCost: 28, bonus: 0.02 },
    ],
  },
  wingFlowV2: {
    id: "wingFlowV2", branch: "survival", cluster: "wingFlow", role: "vertex", vertexSlot: 2,
    name: "Phase Shell I", description: "Gain extra hit-invulnerability time.",
    fragmentKind: "elite", effectKind: "iframeAdd",
    requires: { id: "wingFlowV1", level: 2 },
    levels: [
      { pointCost: 200, fragmentCost: 3, bonus: 0.04 },
      { pointCost: 290, fragmentCost: 4, bonus: 0.04 },
      { pointCost: 400, fragmentCost: 5, bonus: 0.04 },
    ],
  },
  wingFlowV3: {
    id: "wingFlowV3", branch: "survival", cluster: "wingFlow", role: "vertex", vertexSlot: 3,
    name: "Phase Shell II", description: "Gain extra hit-invulnerability time.",
    fragmentKind: "elite", effectKind: "iframeAdd",
    requires: { id: "wingFlowV2", level: 2 },
    levels: [
      { pointCost: 250, fragmentCost: 4, bonus: 0.03 },
      { pointCost: 340, fragmentCost: 5, bonus: 0.03 },
      { pointCost: 460, fragmentCost: 6, bonus: 0.03 },
    ],
  },
  wingFlowV4: {
    id: "wingFlowV4", branch: "survival", cluster: "wingFlow", role: "vertex", vertexSlot: 4,
    name: "Gravity Lens I", description: "Increase pickup collection radius.",
    fragmentKind: "basic", effectKind: "pickupRadiusMul",
    requires: { id: "wingFlowV3", level: 2 },
    levels: [
      { pointCost: 200, fragmentCost: 16, bonus: 0.05 },
      { pointCost: 280, fragmentCost: 22, bonus: 0.05 },
      { pointCost: 370, fragmentCost: 30, bonus: 0.05 },
    ],
  },
  wingFlowV5: {
    id: "wingFlowV5", branch: "survival", cluster: "wingFlow", role: "vertex", vertexSlot: 5,
    name: "Gravity Lens II", description: "Increase pickup collection radius.",
    fragmentKind: "basic", effectKind: "pickupRadiusMul",
    requires: { id: "wingFlowV4", level: 2 },
    levels: [
      { pointCost: 250, fragmentCost: 20, bonus: 0.05 },
      { pointCost: 340, fragmentCost: 28, bonus: 0.05 },
      { pointCost: 450, fragmentCost: 37, bonus: 0.05 },
    ],
  },
  wingFlowCore: {
    id: "wingFlowCore", branch: "survival", cluster: "wingFlow", role: "core",
    name: "Overdrive Core", description: "Greatly increase movement speed.",
    fragmentKind: "elite", effectKind: "speedMul",
    requires: { id: "wingFlowV3", level: 3 },
    isCore: true,
    unlockAfterBoss: "jets",
    levels: [
      { pointCost: 850, fragmentCost: 6, bonus: 0.1 },
      { pointCost: 1250, fragmentCost: 9, bonus: 0.1 },
    ],
  },

  // ── CLUSTER: MIRROR · PRESS ─────────────────────────────────────────────
  mirrorPressConn: {
    id: "mirrorPressConn", branch: "offense", cluster: "mirrorPress", role: "connector",
    name: "Vector Link", description: "Increase base weapon damage.",
    fragmentKind: "basic", effectKind: "damageAdd",
    levels: [
      { pointCost: 100, fragmentCost: 8, bonus: 1 },
      { pointCost: 160, fragmentCost: 14, bonus: 1 },
      { pointCost: 230, fragmentCost: 22, bonus: 1 },
    ],
  },
  mirrorPressV0: {
    id: "mirrorPressV0", branch: "offense", cluster: "mirrorPress", role: "vertex", vertexSlot: 0,
    name: "Edge Sharpener I", description: "Increase base weapon damage.",
    fragmentKind: "basic", effectKind: "damageAdd",
    requires: { id: "mirrorPressConn", level: 1 },
    levels: [
      { pointCost: 130, fragmentCost: 11, bonus: 1 },
      { pointCost: 200, fragmentCost: 17, bonus: 1 },
      { pointCost: 280, fragmentCost: 25, bonus: 1 },
      { pointCost: 370, fragmentCost: 33, bonus: 1 },
    ],
  },
  mirrorPressV1: {
    id: "mirrorPressV1", branch: "offense", cluster: "mirrorPress", role: "vertex", vertexSlot: 1,
    name: "Edge Sharpener II", description: "Increase base weapon damage.",
    fragmentKind: "basic", effectKind: "damageAdd",
    requires: { id: "mirrorPressV0", level: 2 },
    levels: [
      { pointCost: 170, fragmentCost: 14, bonus: 1 },
      { pointCost: 240, fragmentCost: 20, bonus: 1 },
      { pointCost: 320, fragmentCost: 28, bonus: 1 },
      { pointCost: 420, fragmentCost: 36, bonus: 1 },
    ],
  },
  mirrorPressV2: {
    id: "mirrorPressV2", branch: "offense", cluster: "mirrorPress", role: "vertex", vertexSlot: 2,
    name: "Vector Edge I", description: "Greatly increase base weapon damage.",
    fragmentKind: "basic", effectKind: "damageAdd",
    requires: { id: "mirrorPressV1", level: 2 },
    levels: [
      { pointCost: 210, fragmentCost: 17, bonus: 2 },
      { pointCost: 290, fragmentCost: 23, bonus: 2 },
      { pointCost: 380, fragmentCost: 31, bonus: 2 },
      { pointCost: 480, fragmentCost: 40, bonus: 2 },
    ],
  },
  mirrorPressV3: {
    id: "mirrorPressV3", branch: "offense", cluster: "mirrorPress", role: "vertex", vertexSlot: 3,
    name: "Vector Edge II", description: "Greatly increase base weapon damage.",
    fragmentKind: "basic", effectKind: "damageAdd",
    requires: { id: "mirrorPressV2", level: 2 },
    levels: [
      { pointCost: 260, fragmentCost: 21, bonus: 2 },
      { pointCost: 350, fragmentCost: 28, bonus: 2 },
      { pointCost: 460, fragmentCost: 37, bonus: 2 },
      { pointCost: 580, fragmentCost: 46, bonus: 2 },
    ],
  },
  mirrorPressV4: {
    id: "mirrorPressV4", branch: "offense", cluster: "mirrorPress", role: "vertex", vertexSlot: 4,
    name: "Vector Edge III", description: "Greatly increase base weapon damage.",
    fragmentKind: "basic", effectKind: "damageAdd",
    requires: { id: "mirrorPressV3", level: 2 },
    levels: [
      { pointCost: 310, fragmentCost: 25, bonus: 2 },
      { pointCost: 410, fragmentCost: 32, bonus: 2 },
      { pointCost: 530, fragmentCost: 41, bonus: 2 },
    ],
  },
  mirrorPressV5: {
    id: "mirrorPressV5", branch: "offense", cluster: "mirrorPress", role: "vertex", vertexSlot: 5,
    name: "Edge Sharpener III", description: "Increase base weapon damage.",
    fragmentKind: "basic", effectKind: "damageAdd",
    requires: { id: "mirrorPressV4", level: 2 },
    levels: [
      { pointCost: 360, fragmentCost: 28, bonus: 1 },
      { pointCost: 470, fragmentCost: 36, bonus: 1 },
      { pointCost: 600, fragmentCost: 46, bonus: 1 },
    ],
  },
  mirrorPressCore: {
    id: "mirrorPressCore", branch: "offense", cluster: "mirrorPress", role: "core",
    name: "Overcharge Core", description: "Massive increase to base weapon damage.",
    fragmentKind: "elite", effectKind: "damageAdd",
    requires: { id: "mirrorPressV3", level: 4 },
    isCore: true,
    unlockAfterBoss: "mirror",
    levels: [
      { pointCost: 800, fragmentCost: 6, bonus: 5 },
      { pointCost: 1200, fragmentCost: 9, bonus: 5 },
    ],
  },

  // ── CLUSTER: GRID · PULSE ──────────────────────────────────────────────
  gridPulseConn: {
    id: "gridPulseConn", branch: "offense", cluster: "gridPulse", role: "connector",
    name: "Focal Link", description: "Increase base crit rate.",
    fragmentKind: "elite", effectKind: "critAdd",
    levels: [
      { pointCost: 130, fragmentCost: 2, bonus: 0.02 },
      { pointCost: 200, fragmentCost: 3, bonus: 0.02 },
      { pointCost: 280, fragmentCost: 4, bonus: 0.02 },
    ],
  },
  gridPulseV0: {
    id: "gridPulseV0", branch: "offense", cluster: "gridPulse", role: "vertex", vertexSlot: 0,
    name: "Critical Lens I", description: "Increase base crit rate.",
    fragmentKind: "elite", effectKind: "critAdd",
    requires: { id: "gridPulseConn", level: 1 },
    levels: [
      { pointCost: 160, fragmentCost: 3, bonus: 0.02 },
      { pointCost: 230, fragmentCost: 4, bonus: 0.02 },
      { pointCost: 320, fragmentCost: 5, bonus: 0.02 },
    ],
  },
  gridPulseV1: {
    id: "gridPulseV1", branch: "offense", cluster: "gridPulse", role: "vertex", vertexSlot: 1,
    name: "Critical Lens II", description: "Increase base crit rate.",
    fragmentKind: "elite", effectKind: "critAdd",
    requires: { id: "gridPulseV0", level: 2 },
    levels: [
      { pointCost: 200, fragmentCost: 3, bonus: 0.02 },
      { pointCost: 280, fragmentCost: 4, bonus: 0.02 },
      { pointCost: 380, fragmentCost: 5, bonus: 0.02 },
    ],
  },
  gridPulseV2: {
    id: "gridPulseV2", branch: "offense", cluster: "gridPulse", role: "vertex", vertexSlot: 2,
    name: "Rate Optimizer I", description: "Reduce weapon fire interval.",
    fragmentKind: "basic", effectKind: "periodMul",
    requires: { id: "gridPulseV1", level: 2 },
    levels: [
      { pointCost: 180, fragmentCost: 14, bonus: -0.03 },
      { pointCost: 260, fragmentCost: 20, bonus: -0.03 },
      { pointCost: 350, fragmentCost: 28, bonus: -0.03 },
    ],
  },
  gridPulseV3: {
    id: "gridPulseV3", branch: "offense", cluster: "gridPulse", role: "vertex", vertexSlot: 3,
    name: "Rate Optimizer II", description: "Reduce weapon fire interval.",
    fragmentKind: "basic", effectKind: "periodMul",
    requires: { id: "gridPulseV2", level: 2 },
    levels: [
      { pointCost: 220, fragmentCost: 17, bonus: -0.03 },
      { pointCost: 310, fragmentCost: 24, bonus: -0.03 },
      { pointCost: 410, fragmentCost: 32, bonus: -0.03 },
    ],
  },
  gridPulseV4: {
    id: "gridPulseV4", branch: "offense", cluster: "gridPulse", role: "vertex", vertexSlot: 4,
    name: "Velocity Field", description: "Increase projectile speed.",
    fragmentKind: "basic", effectKind: "projectileSpeedMul",
    requires: { id: "gridPulseV3", level: 2 },
    levels: [
      { pointCost: 200, fragmentCost: 16, bonus: 0.05 },
      { pointCost: 280, fragmentCost: 22, bonus: 0.05 },
      { pointCost: 370, fragmentCost: 30, bonus: 0.05 },
    ],
  },
  gridPulseV5: {
    id: "gridPulseV5", branch: "offense", cluster: "gridPulse", role: "vertex", vertexSlot: 5,
    name: "Penetration Field", description: "Projectiles pierce additional enemies.",
    fragmentKind: "elite", effectKind: "pierceAdd",
    requires: { id: "gridPulseV4", level: 2 },
    levels: [
      { pointCost: 360, fragmentCost: 5, bonus: 1 },
      { pointCost: 520, fragmentCost: 7, bonus: 1 },
    ],
  },
  gridPulseCore: {
    id: "gridPulseCore", branch: "offense", cluster: "gridPulse", role: "core",
    name: "Multi-Barrel Core", description: "Fire additional projectiles per shot.",
    fragmentKind: "elite", effectKind: "projectilesAdd",
    requires: { id: "gridPulseV3", level: 3 },
    isCore: true,
    unlockAfterBoss: "lattice",
    levels: [
      { pointCost: 900, fragmentCost: 7, bonus: 1 },
      { pointCost: 1400, fragmentCost: 10, bonus: 1 },
    ],
  },

  // ── CLUSTER: VOID · YIELD ──────────────────────────────────────────
  voidYieldConn: {
    id: "voidYieldConn", branch: "efficiency", cluster: "voidYield", role: "connector",
    name: "Salvage Link", description: "Increase run points earned.",
    fragmentKind: "basic", effectKind: "pointRewardMul",
    levels: [
      { pointCost: 100, fragmentCost: 12, bonus: 0.03 },
      { pointCost: 160, fragmentCost: 18, bonus: 0.03 },
      { pointCost: 230, fragmentCost: 25, bonus: 0.03 },
    ],
  },
  voidYieldV0: {
    id: "voidYieldV0", branch: "efficiency", cluster: "voidYield", role: "vertex", vertexSlot: 0,
    name: "Salvage Protocol I", description: "Increase run points earned.",
    fragmentKind: "basic", effectKind: "pointRewardMul",
    requires: { id: "voidYieldConn", level: 1 },
    levels: [
      { pointCost: 130, fragmentCost: 14, bonus: 0.02 },
      { pointCost: 200, fragmentCost: 20, bonus: 0.02 },
      { pointCost: 280, fragmentCost: 28, bonus: 0.02 },
    ],
  },
  voidYieldV1: {
    id: "voidYieldV1", branch: "efficiency", cluster: "voidYield", role: "vertex", vertexSlot: 1,
    name: "Salvage Protocol II", description: "Increase run points earned.",
    fragmentKind: "basic", effectKind: "pointRewardMul",
    requires: { id: "voidYieldV0", level: 2 },
    levels: [
      { pointCost: 170, fragmentCost: 17, bonus: 0.02 },
      { pointCost: 240, fragmentCost: 23, bonus: 0.02 },
      { pointCost: 320, fragmentCost: 31, bonus: 0.02 },
    ],
  },
  voidYieldV2: {
    id: "voidYieldV2", branch: "efficiency", cluster: "voidYield", role: "vertex", vertexSlot: 2,
    name: "Salvage Protocol III", description: "Greatly increase run points earned.",
    fragmentKind: "basic", effectKind: "pointRewardMul",
    requires: { id: "voidYieldV1", level: 2 },
    levels: [
      { pointCost: 210, fragmentCost: 21, bonus: 0.04 },
      { pointCost: 290, fragmentCost: 28, bonus: 0.04 },
      { pointCost: 380, fragmentCost: 36, bonus: 0.04 },
    ],
  },
  voidYieldV3: {
    id: "voidYieldV3", branch: "efficiency", cluster: "voidYield", role: "vertex", vertexSlot: 3,
    name: "Salvage Protocol IV", description: "Greatly increase run points earned.",
    fragmentKind: "basic", effectKind: "pointRewardMul",
    requires: { id: "voidYieldV2", level: 2 },
    levels: [
      { pointCost: 260, fragmentCost: 25, bonus: 0.04 },
      { pointCost: 350, fragmentCost: 33, bonus: 0.04 },
      { pointCost: 460, fragmentCost: 42, bonus: 0.04 },
    ],
  },
  voidYieldV4: {
    id: "voidYieldV4", branch: "efficiency", cluster: "voidYield", role: "vertex", vertexSlot: 4,
    name: "Salvage Protocol V", description: "Greatly increase run points earned.",
    fragmentKind: "basic", effectKind: "pointRewardMul",
    requires: { id: "voidYieldV3", level: 2 },
    levels: [
      { pointCost: 310, fragmentCost: 29, bonus: 0.04 },
      { pointCost: 410, fragmentCost: 37, bonus: 0.04 },
      { pointCost: 530, fragmentCost: 47, bonus: 0.04 },
    ],
  },
  voidYieldV5: {
    id: "voidYieldV5", branch: "efficiency", cluster: "voidYield", role: "vertex", vertexSlot: 5,
    name: "Salvage Protocol VI", description: "Increase run points earned.",
    fragmentKind: "basic", effectKind: "pointRewardMul",
    requires: { id: "voidYieldV4", level: 2 },
    levels: [
      { pointCost: 360, fragmentCost: 32, bonus: 0.02 },
      { pointCost: 470, fragmentCost: 41, bonus: 0.02 },
      { pointCost: 600, fragmentCost: 52, bonus: 0.02 },
    ],
  },
  voidYieldCore: {
    id: "voidYieldCore", branch: "efficiency", cluster: "voidYield", role: "core",
    name: "Salvage Core", description: "Massive increase to run points earned.",
    fragmentKind: "elite", effectKind: "pointRewardMul",
    requires: { id: "voidYieldV3", level: 3 },
    isCore: true,
    unlockAfterBoss: "rift",
    levels: [
      { pointCost: 800, fragmentCost: 6, bonus: 0.1 },
      { pointCost: 1200, fragmentCost: 9, bonus: 0.1 },
    ],
  },

  // ── CLUSTER: CORE · SYNTAX ───────────────────────────────────────
  coreSyntaxConn: {
    id: "coreSyntaxConn", branch: "efficiency", cluster: "coreSyntax", role: "connector",
    name: "Recycler Link", description: "Increase fragment gain.",
    fragmentKind: "elite", effectKind: "fragmentRewardMul",
    levels: [
      { pointCost: 130, fragmentCost: 2, bonus: 0.03 },
      { pointCost: 200, fragmentCost: 3, bonus: 0.03 },
      { pointCost: 280, fragmentCost: 4, bonus: 0.03 },
    ],
  },
  coreSyntaxV0: {
    id: "coreSyntaxV0", branch: "efficiency", cluster: "coreSyntax", role: "vertex", vertexSlot: 0,
    name: "Fragment Recycler I", description: "Increase fragment gain.",
    fragmentKind: "elite", effectKind: "fragmentRewardMul",
    requires: { id: "coreSyntaxConn", level: 1 },
    levels: [
      { pointCost: 160, fragmentCost: 3, bonus: 0.03 },
      { pointCost: 230, fragmentCost: 4, bonus: 0.03 },
      { pointCost: 320, fragmentCost: 5, bonus: 0.03 },
    ],
  },
  coreSyntaxV1: {
    id: "coreSyntaxV1", branch: "efficiency", cluster: "coreSyntax", role: "vertex", vertexSlot: 1,
    name: "Fragment Recycler II", description: "Increase fragment gain.",
    fragmentKind: "elite", effectKind: "fragmentRewardMul",
    requires: { id: "coreSyntaxV0", level: 2 },
    levels: [
      { pointCost: 200, fragmentCost: 3, bonus: 0.03 },
      { pointCost: 280, fragmentCost: 4, bonus: 0.03 },
      { pointCost: 380, fragmentCost: 5, bonus: 0.03 },
    ],
  },
  coreSyntaxV2: {
    id: "coreSyntaxV2", branch: "efficiency", cluster: "coreSyntax", role: "vertex", vertexSlot: 2,
    name: "Fragment Recycler III", description: "Greatly increase fragment gain.",
    fragmentKind: "elite", effectKind: "fragmentRewardMul",
    requires: { id: "coreSyntaxV1", level: 2 },
    levels: [
      { pointCost: 240, fragmentCost: 4, bonus: 0.04 },
      { pointCost: 330, fragmentCost: 5, bonus: 0.04 },
      { pointCost: 440, fragmentCost: 6, bonus: 0.04 },
    ],
  },
  coreSyntaxV3: {
    id: "coreSyntaxV3", branch: "efficiency", cluster: "coreSyntax", role: "vertex", vertexSlot: 3,
    name: "Neural Reservoir I", description: "Permanently grant skill upgrade points.",
    fragmentKind: "elite", effectKind: "skillPointsAdd",
    requires: { id: "coreSyntaxV2", level: 2 },
    levels: [
      { pointCost: 600, fragmentCost: 4, bonus: 20 },
    ],
  },
  coreSyntaxV4: {
    id: "coreSyntaxV4", branch: "efficiency", cluster: "coreSyntax", role: "vertex", vertexSlot: 4,
    name: "Neural Reservoir II", description: "Permanently grant skill upgrade points.",
    fragmentKind: "elite", effectKind: "skillPointsAdd",
    requires: { id: "coreSyntaxV3", level: 1 },
    levels: [
      { pointCost: 700, fragmentCost: 5, bonus: 20 },
    ],
  },
  coreSyntaxV5: {
    id: "coreSyntaxV5", branch: "efficiency", cluster: "coreSyntax", role: "vertex", vertexSlot: 5,
    name: "Neural Reservoir III", description: "Permanently grant skill upgrade points.",
    fragmentKind: "elite", effectKind: "skillPointsAdd",
    requires: { id: "coreSyntaxV4", level: 1 },
    levels: [
      { pointCost: 800, fragmentCost: 6, bonus: 20 },
    ],
  },
  coreSyntaxCore: {
    id: "coreSyntaxCore", branch: "efficiency", cluster: "coreSyntax", role: "core",
    name: "Reservoir Core", description: "Permanently grant a large pool of skill upgrade points.",
    fragmentKind: "elite", effectKind: "skillPointsAdd",
    requires: { id: "coreSyntaxV5", level: 1 },
    isCore: true,
    levels: [
      { pointCost: 1100, fragmentCost: 7, bonus: 30 },
      { pointCost: 1500, fragmentCost: 10, bonus: 30 },
    ],
  },
};

export const TALENT_BRANCH_ORDER: TalentBranch[] = [
  "survival",
  "offense",
  "efficiency",
];

/** Cluster direction map for hex layout (degrees, 0° = right, going clockwise). */
export const TALENT_CLUSTER_ORDER: { id: TalentClusterId; angleDeg: number }[] = [
  { id: "mirrorPress",       angleDeg: -90 },
  { id: "axisGuard",          angleDeg: -30 },
  { id: "wingFlow",    angleDeg: 30 },
  { id: "coreSyntax", angleDeg: 90 },
  { id: "voidYield",    angleDeg: 150 },
  { id: "gridPulse",        angleDeg: 210 },
];
