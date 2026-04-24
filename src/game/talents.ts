import {
  TALENT_NODES,
  type TalentNodeDef,
} from "./content/talents";
import {
  defaultTalentState,
  type PlayerProfile,
  type SkillTreeState,
  type TalentId,
  type TalentState,
} from "./data/types";

export interface TalentBonuses {
  // additive
  maxHpAdd: number;
  iframeAdd: number;
  damageAdd: number;
  critAdd: number;
  pierceAdd: number;
  projectilesAdd: number;
  // multiplicative deltas (apply as 1 + delta to world)
  speedMul: number;
  pickupRadiusMul: number;
  projectileSpeedMul: number;
  periodMul: number;
  // run reward multiplier deltas
  pointRewardMul: number;
  fragmentRewardMul: number;
  // skill points (granted once on upgrade, tracked separately)
  skillPointsAdd: number;
}

/** Effect kinds applied additively to the world entity at run start. */
export const AVATAR_TALENT_EFFECT_KINDS_ADD = [
  "maxHpAdd",
  "iframeAdd",
  "damageAdd",
  "critAdd",
  "pierceAdd",
  "projectilesAdd",
] as const;
export type AvatarTalentEffectKindAdd = (typeof AVATAR_TALENT_EFFECT_KINDS_ADD)[number];

/** Effect kinds stored as deltas, applied as (1 + delta) to the world entity. */
export const AVATAR_TALENT_EFFECT_KINDS_MUL = [
  "speedMul",
  "pickupRadiusMul",
  "projectileSpeedMul",
  "periodMul",
] as const;
export type AvatarTalentEffectKindMul = (typeof AVATAR_TALENT_EFFECT_KINDS_MUL)[number];

/** Legacy alias kept for callers that only use additive kinds. */
export const AVATAR_TALENT_EFFECT_KINDS = AVATAR_TALENT_EFFECT_KINDS_ADD;
export type AvatarTalentEffectKind = AvatarTalentEffectKindAdd;

export interface TalentActionResult {
  ok: boolean;
  reason?: string;
  skillPointsGranted?: number;
}

const TALENT_IDS = Object.keys(TALENT_NODES) as TalentId[];

export function talentLevel(state: TalentState, id: TalentId): number {
  const raw = state.levels[id] ?? 0;
  return Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : 0;
}

export function talentMaxLevel(id: TalentId): number {
  return TALENT_NODES[id].levels.length;
}

export function talentDefinition(id: TalentId): TalentNodeDef {
  return TALENT_NODES[id];
}

export function talentNodeBonus(state: TalentState, id: TalentId): number {
  const def = TALENT_NODES[id];
  const level = Math.min(talentLevel(state, id), def.levels.length);
  let total = 0;
  for (let i = 0; i < level; i++) total += def.levels[i]!.bonus;
  return total;
}

export function talentPrerequisiteMessage(
  state: TalentState,
  id: TalentId,
): string | null {
  const def = TALENT_NODES[id];
  if (!def.requires) return null;
  const reqLevel = talentLevel(state, def.requires.id);
  if (reqLevel >= def.requires.level) return null;
  return `Locked: ${TALENT_NODES[def.requires.id].name} Lv.${def.requires.level}`;
}

export function talentTotalSpentPoints(state: TalentState): number {
  let total = 0;
  for (const id of TALENT_IDS) {
    const def = TALENT_NODES[id];
    const level = Math.min(talentLevel(state, id), def.levels.length);
    for (let i = 0; i < level; i++) {
      total += def.levels[i]!.pointCost;
    }
  }
  return total;
}

export function talentBonuses(state: TalentState): TalentBonuses {
  const bonuses: TalentBonuses = {
    maxHpAdd: 0,
    iframeAdd: 0,
    damageAdd: 0,
    critAdd: 0,
    pierceAdd: 0,
    projectilesAdd: 0,
    speedMul: 0,
    pickupRadiusMul: 0,
    projectileSpeedMul: 0,
    periodMul: 0,
    pointRewardMul: 0,
    fragmentRewardMul: 0,
    skillPointsAdd: 0,
  };
  for (const id of TALENT_IDS) {
    const def = TALENT_NODES[id];
    bonuses[def.effectKind] += talentNodeBonus(state, id);
  }
  return bonuses;
}

export function canUpgradeTalent(
  profile: PlayerProfile,
  state: TalentState,
  id: TalentId,
): TalentActionResult {
  const def = TALENT_NODES[id];
  const currentLevel = talentLevel(state, id);
  if (currentLevel >= def.levels.length) {
    return { ok: false, reason: "Already max level." };
  }
  if (def.requires) {
    const reqLevel = talentLevel(state, def.requires.id);
    if (reqLevel < def.requires.level) {
      return { ok: false, reason: `Requires ${TALENT_NODES[def.requires.id].name} Lv.${def.requires.level}.` };
    }
  }
  const next = def.levels[currentLevel]!;
  if (profile.points < next.pointCost) {
    return { ok: false, reason: "Not enough points." };
  }
  if (profile.fragments[def.fragmentKind] < next.fragmentCost) {
    return { ok: false, reason: `Not enough ${def.fragmentKind} fragments.` };
  }
  return { ok: true };
}

export function upgradeTalent(
  profile: PlayerProfile,
  id: TalentId,
  skillTree?: SkillTreeState,
): TalentActionResult {
  const state = profile.talents;
  const check = canUpgradeTalent(profile, state, id);
  if (!check.ok) return check;

  const def = TALENT_NODES[id];
  const currentLevel = talentLevel(state, id);
  const next = def.levels[currentLevel]!;
  profile.points -= next.pointCost;
  profile.fragments[def.fragmentKind] -= next.fragmentCost;
  state.levels[id] = currentLevel + 1;

  if (def.effectKind === "skillPointsAdd" && skillTree) {
    skillTree.skillPoints += next.bonus;
    return { ok: true, skillPointsGranted: next.bonus };
  }
  return { ok: true };
}

export function resetTalentGrowth(profile: PlayerProfile): TalentActionResult {
  const spent = talentTotalSpentPoints(profile.talents);
  if (spent <= 0) return { ok: false, reason: "No talent points spent yet." };
  profile.points += spent;
  profile.talents = defaultTalentState();
  return { ok: true };
}
