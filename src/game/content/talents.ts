import type { TalentId } from "../data/types";

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
  | "survivalHp"
  | "survivalMobility"
  | "offenseDamage"
  | "offenseTempo"
  | "efficiencyPoints"
  | "efficiencyFragments";

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
}

// Hex layout: each cluster has 1 connector → 6 vertices (V0 nearest origin, then clockwise) → 1 core.
// Connector requires nothing. Each vertex requires the connector at L1 (V0) or its preceding vertex.
// Core requires the cluster's V3 (the vertex farthest from origin) at its max.

export const TALENT_NODES: Record<TalentId, TalentNodeDef> = {
  // ── CLUSTER: SURVIVAL · HP ────────────────────────────────────────────────
  survivalHpConn: {
    id: "survivalHpConn", branch: "survival", cluster: "survivalHp", role: "connector",
    name: "Vital Link", description: "Increase starting max HP.",
    fragmentKind: "basic", effectKind: "maxHpAdd",
    levels: [
      { pointCost: 100, fragmentCost: 8, bonus: 1 },
      { pointCost: 160, fragmentCost: 14, bonus: 1 },
      { pointCost: 230, fragmentCost: 22, bonus: 1 },
    ],
  },
  survivalHpV0: {
    id: "survivalHpV0", branch: "survival", cluster: "survivalHp", role: "vertex", vertexSlot: 0,
    name: "Cell Density I", description: "Increase starting max HP.",
    fragmentKind: "basic", effectKind: "maxHpAdd",
    requires: { id: "survivalHpConn", level: 1 },
    levels: [
      { pointCost: 130, fragmentCost: 11, bonus: 1 },
      { pointCost: 200, fragmentCost: 17, bonus: 1 },
      { pointCost: 280, fragmentCost: 25, bonus: 1 },
      { pointCost: 370, fragmentCost: 33, bonus: 1 },
    ],
  },
  survivalHpV1: {
    id: "survivalHpV1", branch: "survival", cluster: "survivalHp", role: "vertex", vertexSlot: 1,
    name: "Cell Density II", description: "Increase starting max HP.",
    fragmentKind: "basic", effectKind: "maxHpAdd",
    requires: { id: "survivalHpV0", level: 2 },
    levels: [
      { pointCost: 170, fragmentCost: 14, bonus: 1 },
      { pointCost: 240, fragmentCost: 20, bonus: 1 },
      { pointCost: 320, fragmentCost: 28, bonus: 1 },
      { pointCost: 420, fragmentCost: 36, bonus: 1 },
    ],
  },
  survivalHpV2: {
    id: "survivalHpV2", branch: "survival", cluster: "survivalHp", role: "vertex", vertexSlot: 2,
    name: "Vitality Matrix I", description: "Greatly increase starting max HP.",
    fragmentKind: "basic", effectKind: "maxHpAdd",
    requires: { id: "survivalHpV1", level: 2 },
    levels: [
      { pointCost: 210, fragmentCost: 17, bonus: 2 },
      { pointCost: 290, fragmentCost: 23, bonus: 2 },
      { pointCost: 380, fragmentCost: 31, bonus: 2 },
      { pointCost: 480, fragmentCost: 40, bonus: 2 },
    ],
  },
  survivalHpV3: {
    id: "survivalHpV3", branch: "survival", cluster: "survivalHp", role: "vertex", vertexSlot: 3,
    name: "Vitality Matrix II", description: "Greatly increase starting max HP.",
    fragmentKind: "basic", effectKind: "maxHpAdd",
    requires: { id: "survivalHpV2", level: 2 },
    levels: [
      { pointCost: 260, fragmentCost: 21, bonus: 2 },
      { pointCost: 350, fragmentCost: 28, bonus: 2 },
      { pointCost: 460, fragmentCost: 37, bonus: 2 },
      { pointCost: 580, fragmentCost: 46, bonus: 2 },
    ],
  },
  survivalHpV4: {
    id: "survivalHpV4", branch: "survival", cluster: "survivalHp", role: "vertex", vertexSlot: 4,
    name: "Vitality Matrix III", description: "Greatly increase starting max HP.",
    fragmentKind: "basic", effectKind: "maxHpAdd",
    requires: { id: "survivalHpV3", level: 2 },
    levels: [
      { pointCost: 310, fragmentCost: 25, bonus: 2 },
      { pointCost: 410, fragmentCost: 32, bonus: 2 },
      { pointCost: 530, fragmentCost: 41, bonus: 2 },
    ],
  },
  survivalHpV5: {
    id: "survivalHpV5", branch: "survival", cluster: "survivalHp", role: "vertex", vertexSlot: 5,
    name: "Cell Density III", description: "Increase starting max HP.",
    fragmentKind: "basic", effectKind: "maxHpAdd",
    requires: { id: "survivalHpV4", level: 2 },
    levels: [
      { pointCost: 360, fragmentCost: 28, bonus: 1 },
      { pointCost: 470, fragmentCost: 36, bonus: 1 },
      { pointCost: 600, fragmentCost: 46, bonus: 1 },
    ],
  },
  survivalHpCore: {
    id: "survivalHpCore", branch: "survival", cluster: "survivalHp", role: "core",
    name: "Bastion Core", description: "Massive increase to starting max HP.",
    fragmentKind: "elite", effectKind: "maxHpAdd",
    requires: { id: "survivalHpV3", level: 4 },
    isCore: true,
    levels: [
      { pointCost: 800, fragmentCost: 6, bonus: 5 },
      { pointCost: 1200, fragmentCost: 9, bonus: 5 },
    ],
  },

  // ── CLUSTER: SURVIVAL · MOBILITY ──────────────────────────────────────────
  survivalMobilityConn: {
    id: "survivalMobilityConn", branch: "survival", cluster: "survivalMobility", role: "connector",
    name: "Kinetic Link", description: "Increase movement speed.",
    fragmentKind: "basic", effectKind: "speedMul",
    levels: [
      { pointCost: 110, fragmentCost: 9, bonus: 0.02 },
      { pointCost: 170, fragmentCost: 15, bonus: 0.02 },
      { pointCost: 240, fragmentCost: 22, bonus: 0.02 },
    ],
  },
  survivalMobilityV0: {
    id: "survivalMobilityV0", branch: "survival", cluster: "survivalMobility", role: "vertex", vertexSlot: 0,
    name: "Kinetic Drive I", description: "Increase movement speed.",
    fragmentKind: "basic", effectKind: "speedMul",
    requires: { id: "survivalMobilityConn", level: 1 },
    levels: [
      { pointCost: 140, fragmentCost: 11, bonus: 0.02 },
      { pointCost: 210, fragmentCost: 17, bonus: 0.02 },
      { pointCost: 290, fragmentCost: 25, bonus: 0.02 },
    ],
  },
  survivalMobilityV1: {
    id: "survivalMobilityV1", branch: "survival", cluster: "survivalMobility", role: "vertex", vertexSlot: 1,
    name: "Kinetic Drive II", description: "Increase movement speed.",
    fragmentKind: "basic", effectKind: "speedMul",
    requires: { id: "survivalMobilityV0", level: 2 },
    levels: [
      { pointCost: 180, fragmentCost: 14, bonus: 0.02 },
      { pointCost: 260, fragmentCost: 20, bonus: 0.02 },
      { pointCost: 350, fragmentCost: 28, bonus: 0.02 },
    ],
  },
  survivalMobilityV2: {
    id: "survivalMobilityV2", branch: "survival", cluster: "survivalMobility", role: "vertex", vertexSlot: 2,
    name: "Phase Shell I", description: "Gain extra hit-invulnerability time.",
    fragmentKind: "elite", effectKind: "iframeAdd",
    requires: { id: "survivalMobilityV1", level: 2 },
    levels: [
      { pointCost: 200, fragmentCost: 3, bonus: 0.04 },
      { pointCost: 290, fragmentCost: 4, bonus: 0.04 },
      { pointCost: 400, fragmentCost: 5, bonus: 0.04 },
    ],
  },
  survivalMobilityV3: {
    id: "survivalMobilityV3", branch: "survival", cluster: "survivalMobility", role: "vertex", vertexSlot: 3,
    name: "Phase Shell II", description: "Gain extra hit-invulnerability time.",
    fragmentKind: "elite", effectKind: "iframeAdd",
    requires: { id: "survivalMobilityV2", level: 2 },
    levels: [
      { pointCost: 250, fragmentCost: 4, bonus: 0.03 },
      { pointCost: 340, fragmentCost: 5, bonus: 0.03 },
      { pointCost: 460, fragmentCost: 6, bonus: 0.03 },
    ],
  },
  survivalMobilityV4: {
    id: "survivalMobilityV4", branch: "survival", cluster: "survivalMobility", role: "vertex", vertexSlot: 4,
    name: "Gravity Lens I", description: "Increase pickup collection radius.",
    fragmentKind: "basic", effectKind: "pickupRadiusMul",
    requires: { id: "survivalMobilityV3", level: 2 },
    levels: [
      { pointCost: 200, fragmentCost: 16, bonus: 0.05 },
      { pointCost: 280, fragmentCost: 22, bonus: 0.05 },
      { pointCost: 370, fragmentCost: 30, bonus: 0.05 },
    ],
  },
  survivalMobilityV5: {
    id: "survivalMobilityV5", branch: "survival", cluster: "survivalMobility", role: "vertex", vertexSlot: 5,
    name: "Gravity Lens II", description: "Increase pickup collection radius.",
    fragmentKind: "basic", effectKind: "pickupRadiusMul",
    requires: { id: "survivalMobilityV4", level: 2 },
    levels: [
      { pointCost: 250, fragmentCost: 20, bonus: 0.05 },
      { pointCost: 340, fragmentCost: 28, bonus: 0.05 },
      { pointCost: 450, fragmentCost: 37, bonus: 0.05 },
    ],
  },
  survivalMobilityCore: {
    id: "survivalMobilityCore", branch: "survival", cluster: "survivalMobility", role: "core",
    name: "Overdrive Core", description: "Greatly increase movement speed.",
    fragmentKind: "elite", effectKind: "speedMul",
    requires: { id: "survivalMobilityV3", level: 3 },
    isCore: true,
    levels: [
      { pointCost: 850, fragmentCost: 6, bonus: 0.1 },
      { pointCost: 1250, fragmentCost: 9, bonus: 0.1 },
    ],
  },

  // ── CLUSTER: OFFENSE · DAMAGE ─────────────────────────────────────────────
  offenseDamageConn: {
    id: "offenseDamageConn", branch: "offense", cluster: "offenseDamage", role: "connector",
    name: "Vector Link", description: "Increase base weapon damage.",
    fragmentKind: "basic", effectKind: "damageAdd",
    levels: [
      { pointCost: 100, fragmentCost: 8, bonus: 1 },
      { pointCost: 160, fragmentCost: 14, bonus: 1 },
      { pointCost: 230, fragmentCost: 22, bonus: 1 },
    ],
  },
  offenseDamageV0: {
    id: "offenseDamageV0", branch: "offense", cluster: "offenseDamage", role: "vertex", vertexSlot: 0,
    name: "Edge Sharpener I", description: "Increase base weapon damage.",
    fragmentKind: "basic", effectKind: "damageAdd",
    requires: { id: "offenseDamageConn", level: 1 },
    levels: [
      { pointCost: 130, fragmentCost: 11, bonus: 1 },
      { pointCost: 200, fragmentCost: 17, bonus: 1 },
      { pointCost: 280, fragmentCost: 25, bonus: 1 },
      { pointCost: 370, fragmentCost: 33, bonus: 1 },
    ],
  },
  offenseDamageV1: {
    id: "offenseDamageV1", branch: "offense", cluster: "offenseDamage", role: "vertex", vertexSlot: 1,
    name: "Edge Sharpener II", description: "Increase base weapon damage.",
    fragmentKind: "basic", effectKind: "damageAdd",
    requires: { id: "offenseDamageV0", level: 2 },
    levels: [
      { pointCost: 170, fragmentCost: 14, bonus: 1 },
      { pointCost: 240, fragmentCost: 20, bonus: 1 },
      { pointCost: 320, fragmentCost: 28, bonus: 1 },
      { pointCost: 420, fragmentCost: 36, bonus: 1 },
    ],
  },
  offenseDamageV2: {
    id: "offenseDamageV2", branch: "offense", cluster: "offenseDamage", role: "vertex", vertexSlot: 2,
    name: "Vector Edge I", description: "Greatly increase base weapon damage.",
    fragmentKind: "basic", effectKind: "damageAdd",
    requires: { id: "offenseDamageV1", level: 2 },
    levels: [
      { pointCost: 210, fragmentCost: 17, bonus: 2 },
      { pointCost: 290, fragmentCost: 23, bonus: 2 },
      { pointCost: 380, fragmentCost: 31, bonus: 2 },
      { pointCost: 480, fragmentCost: 40, bonus: 2 },
    ],
  },
  offenseDamageV3: {
    id: "offenseDamageV3", branch: "offense", cluster: "offenseDamage", role: "vertex", vertexSlot: 3,
    name: "Vector Edge II", description: "Greatly increase base weapon damage.",
    fragmentKind: "basic", effectKind: "damageAdd",
    requires: { id: "offenseDamageV2", level: 2 },
    levels: [
      { pointCost: 260, fragmentCost: 21, bonus: 2 },
      { pointCost: 350, fragmentCost: 28, bonus: 2 },
      { pointCost: 460, fragmentCost: 37, bonus: 2 },
      { pointCost: 580, fragmentCost: 46, bonus: 2 },
    ],
  },
  offenseDamageV4: {
    id: "offenseDamageV4", branch: "offense", cluster: "offenseDamage", role: "vertex", vertexSlot: 4,
    name: "Vector Edge III", description: "Greatly increase base weapon damage.",
    fragmentKind: "basic", effectKind: "damageAdd",
    requires: { id: "offenseDamageV3", level: 2 },
    levels: [
      { pointCost: 310, fragmentCost: 25, bonus: 2 },
      { pointCost: 410, fragmentCost: 32, bonus: 2 },
      { pointCost: 530, fragmentCost: 41, bonus: 2 },
    ],
  },
  offenseDamageV5: {
    id: "offenseDamageV5", branch: "offense", cluster: "offenseDamage", role: "vertex", vertexSlot: 5,
    name: "Edge Sharpener III", description: "Increase base weapon damage.",
    fragmentKind: "basic", effectKind: "damageAdd",
    requires: { id: "offenseDamageV4", level: 2 },
    levels: [
      { pointCost: 360, fragmentCost: 28, bonus: 1 },
      { pointCost: 470, fragmentCost: 36, bonus: 1 },
      { pointCost: 600, fragmentCost: 46, bonus: 1 },
    ],
  },
  offenseDamageCore: {
    id: "offenseDamageCore", branch: "offense", cluster: "offenseDamage", role: "core",
    name: "Overcharge Core", description: "Massive increase to base weapon damage.",
    fragmentKind: "elite", effectKind: "damageAdd",
    requires: { id: "offenseDamageV3", level: 4 },
    isCore: true,
    levels: [
      { pointCost: 800, fragmentCost: 6, bonus: 5 },
      { pointCost: 1200, fragmentCost: 9, bonus: 5 },
    ],
  },

  // ── CLUSTER: OFFENSE · TEMPO ──────────────────────────────────────────────
  offenseTempoConn: {
    id: "offenseTempoConn", branch: "offense", cluster: "offenseTempo", role: "connector",
    name: "Focal Link", description: "Increase base crit rate.",
    fragmentKind: "elite", effectKind: "critAdd",
    levels: [
      { pointCost: 130, fragmentCost: 2, bonus: 0.02 },
      { pointCost: 200, fragmentCost: 3, bonus: 0.02 },
      { pointCost: 280, fragmentCost: 4, bonus: 0.02 },
    ],
  },
  offenseTempoV0: {
    id: "offenseTempoV0", branch: "offense", cluster: "offenseTempo", role: "vertex", vertexSlot: 0,
    name: "Critical Lens I", description: "Increase base crit rate.",
    fragmentKind: "elite", effectKind: "critAdd",
    requires: { id: "offenseTempoConn", level: 1 },
    levels: [
      { pointCost: 160, fragmentCost: 3, bonus: 0.02 },
      { pointCost: 230, fragmentCost: 4, bonus: 0.02 },
      { pointCost: 320, fragmentCost: 5, bonus: 0.02 },
    ],
  },
  offenseTempoV1: {
    id: "offenseTempoV1", branch: "offense", cluster: "offenseTempo", role: "vertex", vertexSlot: 1,
    name: "Critical Lens II", description: "Increase base crit rate.",
    fragmentKind: "elite", effectKind: "critAdd",
    requires: { id: "offenseTempoV0", level: 2 },
    levels: [
      { pointCost: 200, fragmentCost: 3, bonus: 0.02 },
      { pointCost: 280, fragmentCost: 4, bonus: 0.02 },
      { pointCost: 380, fragmentCost: 5, bonus: 0.02 },
    ],
  },
  offenseTempoV2: {
    id: "offenseTempoV2", branch: "offense", cluster: "offenseTempo", role: "vertex", vertexSlot: 2,
    name: "Rate Optimizer I", description: "Reduce weapon fire interval.",
    fragmentKind: "basic", effectKind: "periodMul",
    requires: { id: "offenseTempoV1", level: 2 },
    levels: [
      { pointCost: 180, fragmentCost: 14, bonus: -0.03 },
      { pointCost: 260, fragmentCost: 20, bonus: -0.03 },
      { pointCost: 350, fragmentCost: 28, bonus: -0.03 },
    ],
  },
  offenseTempoV3: {
    id: "offenseTempoV3", branch: "offense", cluster: "offenseTempo", role: "vertex", vertexSlot: 3,
    name: "Rate Optimizer II", description: "Reduce weapon fire interval.",
    fragmentKind: "basic", effectKind: "periodMul",
    requires: { id: "offenseTempoV2", level: 2 },
    levels: [
      { pointCost: 220, fragmentCost: 17, bonus: -0.03 },
      { pointCost: 310, fragmentCost: 24, bonus: -0.03 },
      { pointCost: 410, fragmentCost: 32, bonus: -0.03 },
    ],
  },
  offenseTempoV4: {
    id: "offenseTempoV4", branch: "offense", cluster: "offenseTempo", role: "vertex", vertexSlot: 4,
    name: "Velocity Field", description: "Increase projectile speed.",
    fragmentKind: "basic", effectKind: "projectileSpeedMul",
    requires: { id: "offenseTempoV3", level: 2 },
    levels: [
      { pointCost: 200, fragmentCost: 16, bonus: 0.05 },
      { pointCost: 280, fragmentCost: 22, bonus: 0.05 },
      { pointCost: 370, fragmentCost: 30, bonus: 0.05 },
    ],
  },
  offenseTempoV5: {
    id: "offenseTempoV5", branch: "offense", cluster: "offenseTempo", role: "vertex", vertexSlot: 5,
    name: "Penetration Field", description: "Projectiles pierce additional enemies.",
    fragmentKind: "elite", effectKind: "pierceAdd",
    requires: { id: "offenseTempoV4", level: 2 },
    levels: [
      { pointCost: 360, fragmentCost: 5, bonus: 1 },
      { pointCost: 520, fragmentCost: 7, bonus: 1 },
    ],
  },
  offenseTempoCore: {
    id: "offenseTempoCore", branch: "offense", cluster: "offenseTempo", role: "core",
    name: "Multi-Barrel Core", description: "Fire additional projectiles per shot.",
    fragmentKind: "elite", effectKind: "projectilesAdd",
    requires: { id: "offenseTempoV3", level: 3 },
    isCore: true,
    levels: [
      { pointCost: 900, fragmentCost: 7, bonus: 1 },
      { pointCost: 1400, fragmentCost: 10, bonus: 1 },
    ],
  },

  // ── CLUSTER: EFFICIENCY · POINTS ──────────────────────────────────────────
  efficiencyPointsConn: {
    id: "efficiencyPointsConn", branch: "efficiency", cluster: "efficiencyPoints", role: "connector",
    name: "Salvage Link", description: "Increase run points earned.",
    fragmentKind: "basic", effectKind: "pointRewardMul",
    levels: [
      { pointCost: 100, fragmentCost: 12, bonus: 0.03 },
      { pointCost: 160, fragmentCost: 18, bonus: 0.03 },
      { pointCost: 230, fragmentCost: 25, bonus: 0.03 },
    ],
  },
  efficiencyPointsV0: {
    id: "efficiencyPointsV0", branch: "efficiency", cluster: "efficiencyPoints", role: "vertex", vertexSlot: 0,
    name: "Salvage Protocol I", description: "Increase run points earned.",
    fragmentKind: "basic", effectKind: "pointRewardMul",
    requires: { id: "efficiencyPointsConn", level: 1 },
    levels: [
      { pointCost: 130, fragmentCost: 14, bonus: 0.02 },
      { pointCost: 200, fragmentCost: 20, bonus: 0.02 },
      { pointCost: 280, fragmentCost: 28, bonus: 0.02 },
    ],
  },
  efficiencyPointsV1: {
    id: "efficiencyPointsV1", branch: "efficiency", cluster: "efficiencyPoints", role: "vertex", vertexSlot: 1,
    name: "Salvage Protocol II", description: "Increase run points earned.",
    fragmentKind: "basic", effectKind: "pointRewardMul",
    requires: { id: "efficiencyPointsV0", level: 2 },
    levels: [
      { pointCost: 170, fragmentCost: 17, bonus: 0.02 },
      { pointCost: 240, fragmentCost: 23, bonus: 0.02 },
      { pointCost: 320, fragmentCost: 31, bonus: 0.02 },
    ],
  },
  efficiencyPointsV2: {
    id: "efficiencyPointsV2", branch: "efficiency", cluster: "efficiencyPoints", role: "vertex", vertexSlot: 2,
    name: "Salvage Protocol III", description: "Greatly increase run points earned.",
    fragmentKind: "basic", effectKind: "pointRewardMul",
    requires: { id: "efficiencyPointsV1", level: 2 },
    levels: [
      { pointCost: 210, fragmentCost: 21, bonus: 0.04 },
      { pointCost: 290, fragmentCost: 28, bonus: 0.04 },
      { pointCost: 380, fragmentCost: 36, bonus: 0.04 },
    ],
  },
  efficiencyPointsV3: {
    id: "efficiencyPointsV3", branch: "efficiency", cluster: "efficiencyPoints", role: "vertex", vertexSlot: 3,
    name: "Salvage Protocol IV", description: "Greatly increase run points earned.",
    fragmentKind: "basic", effectKind: "pointRewardMul",
    requires: { id: "efficiencyPointsV2", level: 2 },
    levels: [
      { pointCost: 260, fragmentCost: 25, bonus: 0.04 },
      { pointCost: 350, fragmentCost: 33, bonus: 0.04 },
      { pointCost: 460, fragmentCost: 42, bonus: 0.04 },
    ],
  },
  efficiencyPointsV4: {
    id: "efficiencyPointsV4", branch: "efficiency", cluster: "efficiencyPoints", role: "vertex", vertexSlot: 4,
    name: "Salvage Protocol V", description: "Greatly increase run points earned.",
    fragmentKind: "basic", effectKind: "pointRewardMul",
    requires: { id: "efficiencyPointsV3", level: 2 },
    levels: [
      { pointCost: 310, fragmentCost: 29, bonus: 0.04 },
      { pointCost: 410, fragmentCost: 37, bonus: 0.04 },
      { pointCost: 530, fragmentCost: 47, bonus: 0.04 },
    ],
  },
  efficiencyPointsV5: {
    id: "efficiencyPointsV5", branch: "efficiency", cluster: "efficiencyPoints", role: "vertex", vertexSlot: 5,
    name: "Salvage Protocol VI", description: "Increase run points earned.",
    fragmentKind: "basic", effectKind: "pointRewardMul",
    requires: { id: "efficiencyPointsV4", level: 2 },
    levels: [
      { pointCost: 360, fragmentCost: 32, bonus: 0.02 },
      { pointCost: 470, fragmentCost: 41, bonus: 0.02 },
      { pointCost: 600, fragmentCost: 52, bonus: 0.02 },
    ],
  },
  efficiencyPointsCore: {
    id: "efficiencyPointsCore", branch: "efficiency", cluster: "efficiencyPoints", role: "core",
    name: "Salvage Core", description: "Massive increase to run points earned.",
    fragmentKind: "elite", effectKind: "pointRewardMul",
    requires: { id: "efficiencyPointsV3", level: 3 },
    isCore: true,
    levels: [
      { pointCost: 800, fragmentCost: 6, bonus: 0.1 },
      { pointCost: 1200, fragmentCost: 9, bonus: 0.1 },
    ],
  },

  // ── CLUSTER: EFFICIENCY · FRAGMENTS ───────────────────────────────────────
  efficiencyFragmentsConn: {
    id: "efficiencyFragmentsConn", branch: "efficiency", cluster: "efficiencyFragments", role: "connector",
    name: "Recycler Link", description: "Increase fragment gain.",
    fragmentKind: "elite", effectKind: "fragmentRewardMul",
    levels: [
      { pointCost: 130, fragmentCost: 2, bonus: 0.03 },
      { pointCost: 200, fragmentCost: 3, bonus: 0.03 },
      { pointCost: 280, fragmentCost: 4, bonus: 0.03 },
    ],
  },
  efficiencyFragmentsV0: {
    id: "efficiencyFragmentsV0", branch: "efficiency", cluster: "efficiencyFragments", role: "vertex", vertexSlot: 0,
    name: "Fragment Recycler I", description: "Increase fragment gain.",
    fragmentKind: "elite", effectKind: "fragmentRewardMul",
    requires: { id: "efficiencyFragmentsConn", level: 1 },
    levels: [
      { pointCost: 160, fragmentCost: 3, bonus: 0.03 },
      { pointCost: 230, fragmentCost: 4, bonus: 0.03 },
      { pointCost: 320, fragmentCost: 5, bonus: 0.03 },
    ],
  },
  efficiencyFragmentsV1: {
    id: "efficiencyFragmentsV1", branch: "efficiency", cluster: "efficiencyFragments", role: "vertex", vertexSlot: 1,
    name: "Fragment Recycler II", description: "Increase fragment gain.",
    fragmentKind: "elite", effectKind: "fragmentRewardMul",
    requires: { id: "efficiencyFragmentsV0", level: 2 },
    levels: [
      { pointCost: 200, fragmentCost: 3, bonus: 0.03 },
      { pointCost: 280, fragmentCost: 4, bonus: 0.03 },
      { pointCost: 380, fragmentCost: 5, bonus: 0.03 },
    ],
  },
  efficiencyFragmentsV2: {
    id: "efficiencyFragmentsV2", branch: "efficiency", cluster: "efficiencyFragments", role: "vertex", vertexSlot: 2,
    name: "Fragment Recycler III", description: "Greatly increase fragment gain.",
    fragmentKind: "elite", effectKind: "fragmentRewardMul",
    requires: { id: "efficiencyFragmentsV1", level: 2 },
    levels: [
      { pointCost: 240, fragmentCost: 4, bonus: 0.04 },
      { pointCost: 330, fragmentCost: 5, bonus: 0.04 },
      { pointCost: 440, fragmentCost: 6, bonus: 0.04 },
    ],
  },
  efficiencyFragmentsV3: {
    id: "efficiencyFragmentsV3", branch: "efficiency", cluster: "efficiencyFragments", role: "vertex", vertexSlot: 3,
    name: "Neural Reservoir I", description: "Permanently grant skill upgrade points.",
    fragmentKind: "elite", effectKind: "skillPointsAdd",
    requires: { id: "efficiencyFragmentsV2", level: 2 },
    levels: [
      { pointCost: 600, fragmentCost: 4, bonus: 20 },
    ],
  },
  efficiencyFragmentsV4: {
    id: "efficiencyFragmentsV4", branch: "efficiency", cluster: "efficiencyFragments", role: "vertex", vertexSlot: 4,
    name: "Neural Reservoir II", description: "Permanently grant skill upgrade points.",
    fragmentKind: "elite", effectKind: "skillPointsAdd",
    requires: { id: "efficiencyFragmentsV3", level: 1 },
    levels: [
      { pointCost: 700, fragmentCost: 5, bonus: 20 },
    ],
  },
  efficiencyFragmentsV5: {
    id: "efficiencyFragmentsV5", branch: "efficiency", cluster: "efficiencyFragments", role: "vertex", vertexSlot: 5,
    name: "Neural Reservoir III", description: "Permanently grant skill upgrade points.",
    fragmentKind: "elite", effectKind: "skillPointsAdd",
    requires: { id: "efficiencyFragmentsV4", level: 1 },
    levels: [
      { pointCost: 800, fragmentCost: 6, bonus: 20 },
    ],
  },
  efficiencyFragmentsCore: {
    id: "efficiencyFragmentsCore", branch: "efficiency", cluster: "efficiencyFragments", role: "core",
    name: "Reservoir Core", description: "Permanently grant a large pool of skill upgrade points.",
    fragmentKind: "elite", effectKind: "skillPointsAdd",
    requires: { id: "efficiencyFragmentsV5", level: 1 },
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
  { id: "offenseDamage",       angleDeg: -90 },
  { id: "survivalHp",          angleDeg: -30 },
  { id: "survivalMobility",    angleDeg: 30 },
  { id: "efficiencyFragments", angleDeg: 90 },
  { id: "efficiencyPoints",    angleDeg: 150 },
  { id: "offenseTempo",        angleDeg: 210 },
];
