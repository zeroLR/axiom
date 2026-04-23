import type { TalentId } from "../data/types";

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
  effectKind: TalentEffectKind;
  levels: TalentLevelDef[];
  requires?: { id: TalentId; level: number };
}

export const TALENT_NODES: Record<TalentId, TalentNodeDef> = {
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
};

export const TALENT_BRANCH_ORDER: TalentBranch[] = [
  "survival",
  "offense",
  "efficiency",
];
