// ── Primal skill definitions & runtime logic ────────────────────────────────
// Two special abilities that fundamentally alter gameplay. They are unlocked
// from Primal Cores (boss drops) and upgraded with skill points.

import type { BossId } from "./bosses/types";
import type { PrimalSkillId, SkillTreeState } from "./data/types";
import { MAX_SKILL_LEVEL } from "./data/types";
import type { Rng } from "./rng";

export { MAX_SKILL_LEVEL };

// ── Skill metadata ──────────────────────────────────────────────────────────

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
  /** If set, this skill only appears after the given boss is defeated. */
  unlockAfterBoss?: BossId;
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
    unlockAfterBoss: "mirror",
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
    unlockAfterBoss: "jets",
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
    unlockAfterBoss: "orthogon",
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
    unlockAfterBoss: "mirror",
  },
};

/** Upgrade cost in skill points for the next level. Returns Infinity if already at max. */
export function upgradeCost(currentLevel: number): number {
  if (currentLevel >= MAX_SKILL_LEVEL) return Infinity;
  return 20 + currentLevel * 15;
}

/** Effective duration (seconds) at the given level. */
export function skillDuration(def: PrimalSkillDef, level: number): number {
  return def.baseDuration + def.durationPerLevel * level;
}

/** Effective cooldown (seconds) at the given level. */
export function skillCooldown(def: PrimalSkillDef, level: number): number {
  return Math.max(5, def.baseCooldown - def.cooldownPerLevel * level);
}

// ── Draw / gacha ────────────────────────────────────────────────────────────

export type DrawResult =
  | { type: "new"; skillId: PrimalSkillId }
  | { type: "duplicate"; skillId: PrimalSkillId; pointsAwarded: number };

const SKILL_IDS: PrimalSkillId[] = ["timeStop", "shadowClone", "reflectShield", "barrage", "lifestealPulse", "axisFreeze", "overload"];

import type { PlayerStats } from "./data/types";
import { isSkillUnlocked } from "./unlocks";

/** Spend one core to draw a random primal skill. Returns null if 0 cores.
 *  When `stats` is provided, only boss-unlocked skills are in the draw pool. */
export function drawPrimalSkill(state: SkillTreeState, rng: Rng, stats?: PlayerStats): DrawResult | null {
  if (state.cores <= 0) return null;

  const available = stats
    ? SKILL_IDS.filter((id) => isSkillUnlocked(PRIMAL_SKILLS[id], stats))
    : SKILL_IDS;
  if (available.length === 0) return null;

  state.cores -= 1;
  const id = available[Math.floor(rng() * available.length)]!;
  if (!state.skills[id].unlocked) {
    state.skills[id].unlocked = true;
    return { type: "new", skillId: id };
  }
  // Duplicate → convert to skill points.
  const pts = 15;
  state.skillPoints += pts;
  return { type: "duplicate", skillId: id, pointsAwarded: pts };
}

// ── Runtime state (per-run, not persisted) ──────────────────────────────────

export interface ActiveSkillState {
  id: PrimalSkillId;
  /** Skill upgrade level (affects scaling). */
  level: number;
  /** Remaining cooldown (0 = ready). */
  cooldown: number;
  /** Remaining active duration (0 = inactive). */
  active: number;
  /** Cached stats. */
  duration: number;
  maxCooldown: number;
}

export function createActiveSkillStates(tree: SkillTreeState): ActiveSkillState[] {
  const result: ActiveSkillState[] = [];
  for (const id of SKILL_IDS) {
    const entry = tree.skills[id];
    if (!entry.unlocked) continue;
    const def = PRIMAL_SKILLS[id];
    result.push({
      id,
      level: entry.level,
      cooldown: 0,
      active: 0,
      duration: skillDuration(def, entry.level),
      maxCooldown: skillCooldown(def, entry.level),
    });
  }
  return result;
}

/** Activate a skill if it's off cooldown. Returns true on success. */
export function activateSkill(state: ActiveSkillState): boolean {
  if (state.cooldown > 0 || state.active > 0) return false;
  state.active = state.duration;
  return true;
}

/** Tick skill timers. */
export function tickSkillState(state: ActiveSkillState, dt: number): void {
  if (state.active > 0) {
    state.active = Math.max(0, state.active - dt);
    if (state.active <= 0) {
      state.cooldown = state.maxCooldown;
    }
  } else if (state.cooldown > 0) {
    state.cooldown = Math.max(0, state.cooldown - dt);
  }
}

/** Shadow clone inherits this fraction of player weapon stats. */
export function cloneInheritRatio(level: number): number {
  return Math.min(1, 0.3 + level * 0.08);
}

/** Time-stop speed multiplier applied to enemies/enemy-shots. */
export function timeStopSpeedMul(_level: number): number {
  return 0.05; // near-zero; can be improved by level if desired later
}

/** Number of barrage projectiles emitted. */
export function barrageProjectiles(level: number): number {
  return 12 + level * 2;
}

/** Barrage damage per projectile. */
export function barrageDamage(level: number): number {
  return 2 + level;
}

/** Lifesteal pulse radius (pixels). */
export function lifestealRadius(level: number): number {
  return 80 + level * 10;
}

/** Lifesteal pulse damage per tick. */
export function lifestealDamage(level: number): number {
  return 1 + Math.floor(level * 0.5);
}

/** Lifesteal heal amount per tick (every ~1s while active). */
export function lifestealHeal(_level: number): number {
  return 1;
}

/** Reflect shield reflects enemy projectiles and blocks all damage. */
export function reflectDamageRatio(level: number): number {
  return 1 + level * 0.15;
}
