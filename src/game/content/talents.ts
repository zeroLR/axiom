import type { TalentId } from "../data/types";
import type { CardEffect } from "./cards";

export type TalentBranch = "survival" | "offense" | "efficiency";
export type TalentFragmentKind = "basic" | "elite";
export type TalentEffectKind =
  | "maxHpAdd"
  | "iframeAdd"
  | "damageAdd"
  | "critAdd"
  | "pointRewardMul"
  | "fragmentRewardMul";

export interface TalentLevelDef {
  pointCost: number;
  fragmentCost: number;
  bonus: number;
}

export interface TalentNodeDef {
  id: TalentId;
  branch: TalentBranch;
  name: string;
  description: string;
  fragmentKind: TalentFragmentKind;
  /**
   * For basic nodes: the scalar effect kind added to TalentBonuses.
   * Absent on core nodes — use `coreEffect` instead.
   */
  effectKind?: TalentEffectKind;
  levels: TalentLevelDef[];
  requires?: { id: TalentId; level: number };
  /**
   * Marks a node as a core-ability unlock (one-level gate).
   * When levelled to 1, `coreEffect` is applied to the avatar at run start.
   */
  isCore?: boolean;
  /** The CardEffect applied at run start when this core node is levelled. */
  coreEffect?: CardEffect;
}

export const TALENT_NODES: Record<TalentId, TalentNodeDef> = {
  // ── Survival branch ───────────────────────────────────────────────────────

  survivalVitality: {
    id: "survivalVitality",
    branch: "survival",
    name: "Vitality Matrix",
    description: "Increase starting max HP.",
    fragmentKind: "basic",
    effectKind: "maxHpAdd",
    levels: [
      { pointCost: 120, fragmentCost: 10, bonus: 2 },
      { pointCost: 180, fragmentCost: 16, bonus: 2 },
      { pointCost: 250, fragmentCost: 24, bonus: 2 },
      { pointCost: 320, fragmentCost: 32, bonus: 2 },
      { pointCost: 420, fragmentCost: 40, bonus: 2 },
    ],
  },
  survivalPhase: {
    id: "survivalPhase",
    branch: "survival",
    name: "Phase Shell",
    description: "Gain extra hit-invulnerability time.",
    fragmentKind: "elite",
    effectKind: "iframeAdd",
    requires: { id: "survivalVitality", level: 2 },
    levels: [
      { pointCost: 140, fragmentCost: 2, bonus: 0.04 },
      { pointCost: 220, fragmentCost: 3, bonus: 0.04 },
      { pointCost: 320, fragmentCost: 4, bonus: 0.04 },
      { pointCost: 420, fragmentCost: 5, bonus: 0.04 },
    ],
  },
  survivalArmor: {
    id: "survivalArmor",
    branch: "survival",
    name: "Armour Protocol",
    description: "Further increase max HP.",
    fragmentKind: "basic",
    effectKind: "maxHpAdd",
    requires: { id: "survivalVitality", level: 3 },
    levels: [
      { pointCost: 300, fragmentCost: 28, bonus: 3 },
      { pointCost: 420, fragmentCost: 38, bonus: 3 },
      { pointCost: 560, fragmentCost: 50, bonus: 3 },
    ],
  },
  survivalReflexes: {
    id: "survivalReflexes",
    branch: "survival",
    name: "Reflex Override",
    description: "Further reduce hit stun window.",
    fragmentKind: "elite",
    effectKind: "iframeAdd",
    requires: { id: "survivalPhase", level: 2 },
    levels: [
      { pointCost: 320, fragmentCost: 4, bonus: 0.04 },
      { pointCost: 450, fragmentCost: 6, bonus: 0.04 },
      { pointCost: 600, fragmentCost: 8, bonus: 0.04 },
    ],
  },
  survivalShield: {
    id: "survivalShield",
    branch: "survival",
    name: "Energy Shield",
    description: "Gain a regenerating energy shield that absorbs damage.",
    fragmentKind: "elite",
    isCore: true,
    coreEffect: { kind: "shieldRegen", max: 3, period: 6 },
    requires: { id: "survivalArmor", level: 2 },
    levels: [
      { pointCost: 800, fragmentCost: 10, bonus: 1 },
    ],
  },
  survivalRevive: {
    id: "survivalRevive",
    branch: "survival",
    name: "Last Stand",
    description: "Once per run, survive a killing blow at 1 HP.",
    fragmentKind: "elite",
    isCore: true,
    coreEffect: { kind: "secondChance" },
    requires: { id: "survivalReflexes", level: 2 },
    levels: [
      { pointCost: 1000, fragmentCost: 12, bonus: 1 },
    ],
  },

  // ── Offense branch ────────────────────────────────────────────────────────

  offenseVector: {
    id: "offenseVector",
    branch: "offense",
    name: "Vector Edge",
    description: "Increase base weapon damage.",
    fragmentKind: "basic",
    effectKind: "damageAdd",
    levels: [
      { pointCost: 120, fragmentCost: 10, bonus: 1 },
      { pointCost: 180, fragmentCost: 16, bonus: 1 },
      { pointCost: 250, fragmentCost: 24, bonus: 1 },
      { pointCost: 320, fragmentCost: 32, bonus: 1 },
      { pointCost: 420, fragmentCost: 40, bonus: 1 },
    ],
  },
  offenseCritical: {
    id: "offenseCritical",
    branch: "offense",
    name: "Critical Lens",
    description: "Increase base crit rate.",
    fragmentKind: "elite",
    effectKind: "critAdd",
    requires: { id: "offenseVector", level: 2 },
    levels: [
      { pointCost: 140, fragmentCost: 2, bonus: 0.01 },
      { pointCost: 220, fragmentCost: 3, bonus: 0.01 },
      { pointCost: 320, fragmentCost: 4, bonus: 0.01 },
      { pointCost: 420, fragmentCost: 5, bonus: 0.01 },
      { pointCost: 540, fragmentCost: 6, bonus: 0.01 },
    ],
  },
  offenseEdge: {
    id: "offenseEdge",
    branch: "offense",
    name: "Sharpened Edge",
    description: "Further increase weapon damage.",
    fragmentKind: "basic",
    effectKind: "damageAdd",
    requires: { id: "offenseVector", level: 3 },
    levels: [
      { pointCost: 300, fragmentCost: 28, bonus: 1 },
      { pointCost: 420, fragmentCost: 38, bonus: 1 },
      { pointCost: 560, fragmentCost: 50, bonus: 1 },
    ],
  },
  offensePrecision: {
    id: "offensePrecision",
    branch: "offense",
    name: "Precision Module",
    description: "Further increase critical strike rate.",
    fragmentKind: "elite",
    effectKind: "critAdd",
    requires: { id: "offenseCritical", level: 2 },
    levels: [
      { pointCost: 320, fragmentCost: 4, bonus: 0.02 },
      { pointCost: 450, fragmentCost: 6, bonus: 0.02 },
      { pointCost: 600, fragmentCost: 8, bonus: 0.02 },
    ],
  },
  offenseCombustion: {
    id: "offenseCombustion",
    branch: "offense",
    name: "Combustion Protocol",
    description: "Every 8 kills triggers a chain explosion around the player.",
    fragmentKind: "elite",
    isCore: true,
    coreEffect: { kind: "synergy", id: "combustion" },
    requires: { id: "offenseEdge", level: 2 },
    levels: [
      { pointCost: 900, fragmentCost: 10, bonus: 1 },
    ],
  },
  offenseDesperado: {
    id: "offenseDesperado",
    branch: "offense",
    name: "Desperate Drive",
    description: "Deal bonus damage at low HP.",
    fragmentKind: "elite",
    isCore: true,
    coreEffect: { kind: "synergy", id: "desperate" },
    requires: { id: "offensePrecision", level: 2 },
    levels: [
      { pointCost: 1000, fragmentCost: 12, bonus: 1 },
    ],
  },

  // ── Efficiency branch ─────────────────────────────────────────────────────

  efficiencyPoints: {
    id: "efficiencyPoints",
    branch: "efficiency",
    name: "Salvage Protocol",
    description: "Increase run points earned.",
    fragmentKind: "basic",
    effectKind: "pointRewardMul",
    levels: [
      { pointCost: 100, fragmentCost: 12, bonus: 0.04 },
      { pointCost: 160, fragmentCost: 18, bonus: 0.04 },
      { pointCost: 230, fragmentCost: 25, bonus: 0.04 },
      { pointCost: 300, fragmentCost: 33, bonus: 0.04 },
      { pointCost: 400, fragmentCost: 42, bonus: 0.04 },
    ],
  },
  efficiencyFragments: {
    id: "efficiencyFragments",
    branch: "efficiency",
    name: "Fragment Recycler",
    description: "Increase fragment gain.",
    fragmentKind: "elite",
    effectKind: "fragmentRewardMul",
    requires: { id: "efficiencyPoints", level: 2 },
    levels: [
      { pointCost: 140, fragmentCost: 2, bonus: 0.04 },
      { pointCost: 220, fragmentCost: 3, bonus: 0.04 },
      { pointCost: 320, fragmentCost: 4, bonus: 0.04 },
      { pointCost: 420, fragmentCost: 5, bonus: 0.04 },
      { pointCost: 540, fragmentCost: 6, bonus: 0.04 },
    ],
  },
  efficiencyAccrual: {
    id: "efficiencyAccrual",
    branch: "efficiency",
    name: "Accrual Engine",
    description: "Further increase fragment gain.",
    fragmentKind: "elite",
    effectKind: "fragmentRewardMul",
    requires: { id: "efficiencyFragments", level: 2 },
    levels: [
      { pointCost: 300, fragmentCost: 4, bonus: 0.04 },
      { pointCost: 420, fragmentCost: 6, bonus: 0.04 },
      { pointCost: 560, fragmentCost: 8, bonus: 0.04 },
    ],
  },
  efficiencyProfit: {
    id: "efficiencyProfit",
    branch: "efficiency",
    name: "Profit Engine",
    description: "Further increase points earned per run.",
    fragmentKind: "basic",
    effectKind: "pointRewardMul",
    requires: { id: "efficiencyPoints", level: 3 },
    levels: [
      { pointCost: 320, fragmentCost: 30, bonus: 0.04 },
      { pointCost: 450, fragmentCost: 40, bonus: 0.04 },
      { pointCost: 600, fragmentCost: 52, bonus: 0.04 },
    ],
  },
  efficiencyKinetic: {
    id: "efficiencyKinetic",
    branch: "efficiency",
    name: "Kinetic Loop",
    description: "Moving at full speed increases weapon damage.",
    fragmentKind: "elite",
    isCore: true,
    coreEffect: { kind: "synergy", id: "kinetic" },
    requires: { id: "efficiencyAccrual", level: 2 },
    levels: [
      { pointCost: 800, fragmentCost: 10, bonus: 1 },
    ],
  },
  efficiencyHoming: {
    id: "efficiencyHoming",
    branch: "efficiency",
    name: "Homing Array",
    description: "Deploy a secondary weapon that auto-tracks enemies.",
    fragmentKind: "elite",
    isCore: true,
    coreEffect: { kind: "addWeapon", mode: "homing" },
    requires: { id: "efficiencyProfit", level: 2 },
    levels: [
      { pointCost: 1000, fragmentCost: 12, bonus: 1 },
    ],
  },
};

export const TALENT_BRANCH_ORDER: TalentBranch[] = [
  "survival",
  "offense",
  "efficiency",
];
