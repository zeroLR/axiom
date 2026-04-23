import type { PrimalSkillId } from "../data/types";

export interface PrimalSkillDef {
  id: PrimalSkillId;
  name: string;
  glyph: string;
  description: string;
  baseDuration: number;   // seconds
  baseCooldown: number;   // seconds
  /** Duration bonus per upgrade level. */
  durationPerLevel: number;
  /** Cooldown reduction per upgrade level. */
  cooldownPerLevel: number;
}

export const PRIMAL_SKILLS: Record<PrimalSkillId, PrimalSkillDef> = {
  timeStop: {
    id: "timeStop",
    name: "Time Stop",
    glyph: "⏱",
    description: "Slows all enemies and projectiles to near-zero speed.",
    baseDuration: 5,
    baseCooldown: 30,
    durationPerLevel: 0.8,
    cooldownPerLevel: 2,
  },
  shadowClone: {
    id: "shadowClone",
    name: "Shadow Clone",
    glyph: "👤",
    description: "Summons a clone that inherits part of your power.",
    baseDuration: 5,
    baseCooldown: 30,
    durationPerLevel: 0.5,
    cooldownPerLevel: 2,
  },
  reflectShield: {
    id: "reflectShield",
    name: "Reflect Shield",
    glyph: "🛡",
    description: "Blocks all damage and reflects enemy projectiles back.",
    baseDuration: 3,
    baseCooldown: 35,
    durationPerLevel: 0.4,
    cooldownPerLevel: 2,
  },
  barrage: {
    id: "barrage",
    name: "Barrage",
    glyph: "⁂",
    description: "Fires a burst of projectiles in all directions.",
    baseDuration: 2,
    baseCooldown: 25,
    durationPerLevel: 0.3,
    cooldownPerLevel: 1.5,
  },
  lifestealPulse: {
    id: "lifestealPulse",
    name: "Lifesteal Pulse",
    glyph: "♥",
    description: "Emits a pulse that damages nearby enemies and heals you.",
    baseDuration: 4,
    baseCooldown: 40,
    durationPerLevel: 0.5,
    cooldownPerLevel: 2.5,
  },
  axisFreeze: {
    id: "axisFreeze",
    name: "Axis Freeze",
    glyph: "❅",
    description: "Aligns all enemies to the nearest axis and stuns for 2s.",
    baseDuration: 2,
    baseCooldown: 30,
    durationPerLevel: 0.3,
    cooldownPerLevel: 2,
  },
  overload: {
    id: "overload",
    name: "Overload",
    glyph: "⚡",
    description: "Triple fire rate for a short burst. Self-damage 1.",
    baseDuration: 3,
    baseCooldown: 35,
    durationPerLevel: 0.4,
    cooldownPerLevel: 2,
  },
};

export const SKILL_IDS: readonly PrimalSkillId[] = ["timeStop", "shadowClone", "reflectShield", "barrage", "lifestealPulse", "axisFreeze", "overload"];

