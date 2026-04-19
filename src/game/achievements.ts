// ── Achievement definitions & tracking ──────────────────────────────────────

import type { AchievementId, AchievementState } from "./data/types";

export interface AchievementDef {
  id: AchievementId;
  name: string;
  description: string;
  glyph: string;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  // ── Progress ──
  {
    id: "firstBossKill",
    name: "Shape Slayer",
    description: "Defeat a boss for the first time.",
    glyph: "⚔",
  },
  {
    id: "firstPrimalSkill",
    name: "Awakened",
    description: "Obtain your first Primal Skill.",
    glyph: "✧",
  },
  {
    id: "kill100",
    name: "Centurion",
    description: "Eliminate 100 enemies (lifetime).",
    glyph: "C",
  },
  {
    id: "kill1000",
    name: "Annihilator",
    description: "Eliminate 1,000 enemies (lifetime).",
    glyph: "M",
  },
  {
    id: "clear3Stages",
    name: "Trailblazer",
    description: "Clear all 3 normal-mode stages.",
    glyph: "★",
  },
  // ── Difficulty ──
  {
    id: "noPowerNormalClear",
    name: "Minimalist",
    description: "Clear any normal-mode stage without picking a single card.",
    glyph: "○",
  },
  {
    id: "noPowerSurvival16",
    name: "Purist",
    description: "Survive 16 waves in survival mode without picking any cards.",
    glyph: "◉",
  },
  {
    id: "survival32",
    name: "Endurance",
    description: "Survive 32 waves in survival mode.",
    glyph: "∞",
  },
  {
    id: "clearStage3",
    name: "Stage 3 Victor",
    description: "Clear normal-mode Stage 3.",
    glyph: "▲",
  },
  // ── Style ──
  {
    id: "allWeapons",
    name: "Arsenal",
    description: "Draft all 6 weapon types in a single run.",
    glyph: "⚙",
  },
  {
    id: "fullEquipment",
    name: "Fully Loaded",
    description: "Fill all equipment slots before a run.",
    glyph: "⬡",
  },
  {
    id: "maxSkillLevel",
    name: "Mastery",
    description: "Upgrade any Primal Skill to max level.",
    glyph: "⬢",
  },
  {
    id: "own5Skins",
    name: "Collector",
    description: "Own 5 or more skins.",
    glyph: "◆",
  },
  // ── Speed ──
  {
    id: "speedStage1",
    name: "Blitz",
    description: "Clear Stage 1 in under 120 seconds.",
    glyph: "⚡",
  },
  {
    id: "speed5Waves",
    name: "Quick Start",
    description: "Clear the first 5 waves in under 60 seconds.",
    glyph: "»",
  },
  {
    id: "bossRush3",
    name: "Boss Breaker",
    description: "Defeat 3 bosses (lifetime).",
    glyph: "☆",
  },
];

/** Unlock an achievement if it hasn't been unlocked yet. Returns true if newly unlocked. */
export function unlockAchievement(state: AchievementState, id: AchievementId): boolean {
  if (state[id].unlocked) return false;
  state[id] = { unlocked: true, unlockedAt: Date.now() };
  return true;
}
