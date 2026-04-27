import type { EnemyKind } from "../world";

export interface EnemyStats {
  hp: number;
  maxSpeed: number;
  contactDamage: number;
  radius: number;
}

export type EnemySpawnBehavior = "shielded" | "dash" | "shoot" | "orbit" | "spiral" | "lance" | "tri-shoot" | "burst8" | "homing-orbit" | "blink" | "weave";

/**
 * Archetype tags for declarative wave authoring.
 *
 * Stages can request enemies by archetype rather than by fixed `kind`, so
 * adding a new enemy is opt-in: tag it and it joins every existing pool that
 * already requests its archetype. Multiple tags allowed when an enemy plays
 * more than one role.
 */
export type EnemyArchetype =
  | "swarmer"   // cheap fillers — circle, square, pentagon
  | "rusher"    // closer-fast, contact pressure — diamond
  | "volley"    // projectile threat — cross, prism, octo
  | "orbital"   // arcs / homing arcs — crescent, shade
  | "shielded"  // damage-mitigating — hexagon
  | "spiral"    // curved trajectories — spiral, lance
  | "heavy";    // high HP / elite weight — star, prism, octo

export interface EnemyDef {
  kind: EnemyKind;
  stats: EnemyStats;
  isElite?: boolean;
  spawnBehavior?: EnemySpawnBehavior;
  /**
   * Tag list for archetype-based spawn pools.
   * Bosses leave this unset — they are not pooled by archetype.
   */
  archetypes?: readonly EnemyArchetype[];
  /**
   * Lowest 0-based stage index this enemy is eligible to spawn from when
   * resolved through an archetype pool. Default 0 if unset.
   * Ignored when the enemy is referenced directly via `kind` or `enemies[]`.
   */
  minStageIndex?: number;
}

export const ENEMY_REGISTRY: Record<EnemyKind, EnemyDef> = {
  circle: {
    kind: "circle",
    stats: { hp: 3, maxSpeed: 72, contactDamage: 1, radius: 8 },
    archetypes: ["swarmer"],
    minStageIndex: 0,
  },
  square: {
    kind: "square",
    stats: { hp: 5, maxSpeed: 98, contactDamage: 1, radius: 9 },
    archetypes: ["swarmer"],
    minStageIndex: 0,
  },
  star: {
    kind: "star",
    stats: { hp: 8, maxSpeed: 88, contactDamage: 1, radius: 11 },
    isElite: true,
    archetypes: ["heavy"],
    minStageIndex: 0,
  },
  boss: {
    kind: "boss",
    stats: { hp: 80, maxSpeed: 52, contactDamage: 1, radius: 22 },
  },
  pentagon: {
    kind: "pentagon",
    stats: { hp: 6, maxSpeed: 68, contactDamage: 1, radius: 10 },
    isElite: true,
    archetypes: ["swarmer"],
    minStageIndex: 1,
  },
  hexagon: {
    kind: "hexagon",
    stats: { hp: 7, maxSpeed: 62, contactDamage: 1, radius: 10 },
    isElite: true,
    spawnBehavior: "shielded",
    archetypes: ["shielded"],
    minStageIndex: 1,
  },
  diamond: {
    kind: "diamond",
    stats: { hp: 4, maxSpeed: 112, contactDamage: 1, radius: 8 },
    spawnBehavior: "dash",
    archetypes: ["rusher"],
    minStageIndex: 1,
  },
  cross: {
    kind: "cross",
    stats: { hp: 7, maxSpeed: 58, contactDamage: 1, radius: 10 },
    isElite: true,
    spawnBehavior: "shoot",
    archetypes: ["volley"],
    minStageIndex: 1,
  },
  crescent: {
    kind: "crescent",
    stats: { hp: 5, maxSpeed: 78, contactDamage: 1, radius: 9 },
    spawnBehavior: "orbit",
    archetypes: ["orbital"],
    minStageIndex: 1,
  },
  // ── Stage 4 enemies ───────────────────────────────────────────────────────
  spiral: {
    kind: "spiral",
    stats: { hp: 6, maxSpeed: 68, contactDamage: 1, radius: 10 },
    spawnBehavior: "spiral",
    archetypes: ["spiral"],
    minStageIndex: 3,
  },
  lance: {
    kind: "lance",
    stats: { hp: 5, maxSpeed: 52, contactDamage: 2, radius: 8 },
    spawnBehavior: "lance",
    archetypes: ["spiral"],
    minStageIndex: 3,
  },
  prism: {
    kind: "prism",
    stats: { hp: 12, maxSpeed: 52, contactDamage: 1, radius: 11 },
    isElite: true,
    spawnBehavior: "tri-shoot",
    archetypes: ["volley", "heavy"],
    minStageIndex: 3,
  },
  // ── Stage 5 enemies ───────────────────────────────────────────────────────
  octo: {
    kind: "octo",
    stats: { hp: 22, maxSpeed: 30, contactDamage: 1, radius: 14 },
    isElite: true,
    spawnBehavior: "burst8",
    archetypes: ["volley", "heavy"],
    minStageIndex: 4,
  },
  shade: {
    kind: "shade",
    stats: { hp: 16, maxSpeed: 60, contactDamage: 1, radius: 11 },
    isElite: true,
    spawnBehavior: "homing-orbit",
    archetypes: ["orbital"],
    minStageIndex: 4,
  },
  // ── Act III enemies ───────────────────────────────────────────────────────
  ring: {
    kind: "ring",
    stats: { hp: 12, maxSpeed: 48, contactDamage: 1, radius: 11 },
    spawnBehavior: "homing-orbit",
    archetypes: ["orbital"],
    minStageIndex: 5,
  },
  node: {
    kind: "node",
    stats: { hp: 20, maxSpeed: 25, contactDamage: 1, radius: 12 },
    isElite: true,
    spawnBehavior: "blink",
    archetypes: ["heavy"],
    minStageIndex: 6,
  },
  thorn: {
    kind: "thorn",
    stats: { hp: 30, maxSpeed: 12, contactDamage: 2, radius: 14 },
    isElite: true,
    spawnBehavior: "burst8",
    archetypes: ["heavy", "volley"],
    minStageIndex: 6,
  },
  weave: {
    kind: "weave",
    stats: { hp: 6, maxSpeed: 138, contactDamage: 1, radius: 8 },
    spawnBehavior: "weave",
    archetypes: ["rusher"],
    minStageIndex: 5,
  },
  // ── Named bosses ──────────────────────────────────────────────────────────
  orthogon: {
    kind: "orthogon",
    stats: { hp: 135, maxSpeed: 45, contactDamage: 1, radius: 22 },
  },
  jets: {
    kind: "jets",
    stats: { hp: 250, maxSpeed: 60, contactDamage: 1, radius: 22 },
  },
  mirror: {
    kind: "mirror",
    stats: { hp: 400, maxSpeed: 50, contactDamage: 1, radius: 22 },
  },
  lattice: {
    kind: "lattice",
    stats: { hp: 320, maxSpeed: 38, contactDamage: 1, radius: 24 },
  },
  rift: {
    kind: "rift",
    stats: { hp: 460, maxSpeed: 42, contactDamage: 1, radius: 24 },
  },
  nexus: {
    kind: "nexus",
    stats: { hp: 620, maxSpeed: 36, contactDamage: 1, radius: 26 },
  },
  echo: {
    kind: "echo",
    stats: { hp: 520, maxSpeed: 44, contactDamage: 1, radius: 24 },
  },
  shard: {
    kind: "shard",
    stats: { hp: 680, maxSpeed: 48, contactDamage: 1, radius: 22 },
  },
  null: {
    kind: "null",
    stats: { hp: 820, maxSpeed: 38, contactDamage: 1, radius: 28 },
  },
};

// ── Archetype pool helpers ───────────────────────────────────────────────────

/**
 * Return all non-boss enemies whose archetypes include `archetype` and whose
 * `minStageIndex` does not exceed `stageIndex`.
 *
 * Pure function — caller owns the weighted-pick. Returns enemies in registry
 * declaration order so the result is deterministic.
 */
export function enemiesForArchetype(
  archetype: EnemyArchetype,
  stageIndex: number,
): EnemyKind[] {
  const out: EnemyKind[] = [];
  for (const def of Object.values(ENEMY_REGISTRY)) {
    if (!def.archetypes) continue;
    if (!def.archetypes.includes(archetype)) continue;
    if ((def.minStageIndex ?? 0) > stageIndex) continue;
    out.push(def.kind);
  }
  return out;
}
