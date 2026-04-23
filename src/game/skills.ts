import type { PrimalSkillId, SkillTreeState } from "./data/types";
import { MAX_SKILL_LEVEL } from "./data/types";
import type { Rng } from "./rng";
import {
  PRIMAL_SKILLS,
  SKILL_IDS,
  type PrimalSkillDef,
} from "./content/skills";
import { CLASS_NODES } from "./content/classes";
import { getActiveNodeChain } from "./classes";
import type { CharacterSlot } from "./data/types";

export { MAX_SKILL_LEVEL };
export { PRIMAL_SKILLS, SKILL_IDS };
export type { PrimalSkillDef };

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

/**
 * Spend one core to draw a random primal skill. Returns null if 0 cores.
 * @deprecated Skills are now derived from class promotions via activeSkillsFromCharacter.
 *             This function is retained for legacy saves and developer tooling.
 */
export function drawPrimalSkill(state: SkillTreeState, rng: Rng): DrawResult | null {
  if (state.cores <= 0) return null;

  const available = SKILL_IDS;
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

// ── Class-derived skill loading ─────────────────────────────────────────────

/**
 * Derive the active primal skills for a run from the character's class node chain.
 * Each class node that has a `skillId` field contributes that skill at base level.
 * Skills are ordered as they appear in the node chain (T1 first, then T2).
 */
export function activeSkillsFromCharacter(slot: CharacterSlot): ActiveSkillState[] {
  const seen = new Set<PrimalSkillId>();
  const result: ActiveSkillState[] = [];
  for (const nodeId of getActiveNodeChain(slot)) {
    const node = CLASS_NODES[nodeId];
    if (!node?.skillId) continue;
    const id = node.skillId;
    if (seen.has(id)) continue;
    seen.add(id);
    const def = PRIMAL_SKILLS[id];
    result.push({
      id,
      level: 0,
      cooldown: 0,
      active: 0,
      duration: skillDuration(def, 0),
      maxCooldown: skillCooldown(def, 0),
    });
  }
  return result;
}
