import type { EnemyKind } from "../world";
import {
  emptyFragmentDetailRecord,
  type FragmentDetailRecord,
} from "../fragments";

// ── Persistent data models ──────────────────────────────────────────────────
// All types stored in IndexedDB. Kept in a single file so every store shares
// one import path and one schema version constant.

/** Global schema version — bump when store shapes change. */
export const SCHEMA_VERSION = 6;

// ── Player Profile ──────────────────────────────────────────────────────────

/** Player‐level persistent state (points, unlocks, lifetime stats). */
export interface PlayerProfile {
  /** Spendable currency earned from runs. */
  points: number;
  /** IDs of unlocked avatar skins (cosmetic). */
  ownedSkins: string[];
  /** Currently selected skin ID. */
  activeSkin: string;
  /** Currently selected starting shape ID (drives starting weapon). */
  activeStartShape: StartingShapeId;
  /** Lifetime stats. */
  stats: PlayerStats;
  /** Persistent fragment inventory accumulated across all runs. */
  fragments: FragmentInventory;
  /** Persistent talent progression state. */
  talents: TalentState;
  /** Class Creation — character slots and progression. */
  characters: CharactersState;
  /** Fusion / Mutation placeholder (not yet functional). */
  fusion: FusionState;
  /** Boss-defeat trophy state (one signature passive equipped at a time). */
  trophies: TrophyState;
}

/** Persistent storage for the three kinds of collectible fragment. */
export interface FragmentInventory {
  basic: number;
  elite: number;
  boss: number;
  detailed: FragmentDetailRecord;
}

export type StartingShapeId = "triangle" | "square" | "diamond";

export interface PlayerStats {
  totalRuns: number;
  totalKills: number;
  totalBossKills: number;
  enemyKills: Record<EnemyKind, number>;
  bestSurvivalWave: number;
  /**
   * Legacy positional clear flags, indexed 0..4 for the original 5 stages.
   * Kept for backward compat with code paths (achievements, mirror boss
   * spec, etc.) that still read by index. New code should prefer
   * `clearedStages` which is keyed by `StageConfig.stageId`.
   */
  normalCleared: boolean[];
  /**
   * StageId-keyed clear map. Survives stage reordering and supports adding
   * a 6th stage without bumping a positional array length. Authoritative
   * source for Act-based unlock logic in `unlocks.ts`.
   */
  clearedStages: Record<string, boolean>;
  /** Cumulative points earned across all runs; used for progression unlocks. */
  totalPointsEarned: number;
}

export function defaultEnemyKills(): Record<EnemyKind, number> {
  return {
    circle: 0,
    square: 0,
    star: 0,
    boss: 0,
    pentagon: 0,
    hexagon: 0,
    diamond: 0,
    cross: 0,
    crescent: 0,
    spiral: 0,
    lance: 0,
    prism: 0,
    octo: 0,
    shade: 0,
    orthogon: 0,
    jets: 0,
    mirror: 0,
    lattice: 0,
    rift: 0,
  };
}

export function defaultPlayerProfile(): PlayerProfile {
  return {
    points: 0,
    ownedSkins: ["triangle"],
    activeSkin: "triangle",
    activeStartShape: "triangle",
    fragments: { basic: 0, elite: 0, boss: 0, detailed: emptyFragmentDetailRecord() },
    talents: defaultTalentState(),
    characters: defaultCharactersState(),
    fusion: defaultFusionState(),
    trophies: defaultTrophyState(),
    stats: {
      totalRuns: 0,
      totalKills: 0,
      totalBossKills: 0,
      enemyKills: defaultEnemyKills(),
      bestSurvivalWave: 0,
      normalCleared: [false, false, false, false, false],
      clearedStages: {},
      totalPointsEarned: 0,
    },
  };
}

// ── Class Creation ────────────────────────────────────────────────────────────

/** Identifies one of the three playable class lineages. */
export type ClassLineageId = "axis" | "wing" | "mirror";

/**
 * A single character slot. The character's class progress is stored here.
 * - `tier` 0–3: current advancement tier (0 = base class, 3 = fully promoted)
 * - `branchPath`: array of branch choices per tier ≥ 2 ([t2Branch, t3Branch], each 0 or 1)
 */
export interface CharacterSlot {
  id: string;
  name: string;
  lineage: ClassLineageId;
  tier: number;
  branchPath: number[];
  createdAt: number;
}

export interface CharactersState {
  slots: CharacterSlot[];
  /** ID of the currently active character slot. */
  activeSlotId: string;
  /** How many slots are currently unlocked (max 6). */
  maxSlots: number;
}

export function defaultCharactersState(): CharactersState {
  return {
    slots: [
      {
        id: "char-1",
        name: "Character 1",
        lineage: "axis",
        tier: 0,
        branchPath: [],
        createdAt: 0,
      },
    ],
    activeSlotId: "char-1",
    maxSlots: 1,
  };
}

// ── Fusion (placeholder — not yet functional) ─────────────────────────────────

/**
 * A future Fusion record (not yet implemented).
 * Stored so future feature work can migrate existing data.
 */
export interface FusionRecord {
  id: string;
  slotAId: string;
  slotBId: string;
  /** ID of the boss fragment used to fuse (e.g. "boss-mirror"). */
  bossFusionFragmentId: string;
}

export interface FusionState {
  /** All fusion records (placeholder, not yet functional). */
  records: FusionRecord[];
}

export function defaultFusionState(): FusionState {
  return { records: [] };
}

// ── Trophies ──────────────────────────────────────────────────────────────────

/** Stable identifier for a Boss Trophy (one per current boss). */
export type TrophyId =
  | "axis-lock"
  | "wing-dash"
  | "mirror-echo"
  | "grid-overlay"
  | "void-blink";

/** Persistent trophy progression: which trophies are unlocked and which one is equipped. */
export interface TrophyState {
  unlocked: Record<TrophyId, boolean>;
  /** ID of the currently equipped trophy, or null when nothing is equipped. */
  equipped: TrophyId | null;
}

export function defaultTrophyState(): TrophyState {
  return {
    unlocked: {
      "axis-lock": false,
      "wing-dash": false,
      "mirror-echo": false,
      "grid-overlay": false,
      "void-blink": false,
    },
    equipped: null,
  };
}

// ── Talent Growth ────────────────────────────────────────────────────────────

// Hex talent tree: 6 clusters × 8 nodes (1 connector + 6 vertices + 1 core) = 48.
export type TalentId =
  // survivalHp cluster
  | "survivalHpConn"
  | "survivalHpV0" | "survivalHpV1" | "survivalHpV2"
  | "survivalHpV3" | "survivalHpV4" | "survivalHpV5"
  | "survivalHpCore"
  // survivalMobility cluster
  | "survivalMobilityConn"
  | "survivalMobilityV0" | "survivalMobilityV1" | "survivalMobilityV2"
  | "survivalMobilityV3" | "survivalMobilityV4" | "survivalMobilityV5"
  | "survivalMobilityCore"
  // offenseDamage cluster
  | "offenseDamageConn"
  | "offenseDamageV0" | "offenseDamageV1" | "offenseDamageV2"
  | "offenseDamageV3" | "offenseDamageV4" | "offenseDamageV5"
  | "offenseDamageCore"
  // offenseTempo cluster
  | "offenseTempoConn"
  | "offenseTempoV0" | "offenseTempoV1" | "offenseTempoV2"
  | "offenseTempoV3" | "offenseTempoV4" | "offenseTempoV5"
  | "offenseTempoCore"
  // efficiencyPoints cluster
  | "efficiencyPointsConn"
  | "efficiencyPointsV0" | "efficiencyPointsV1" | "efficiencyPointsV2"
  | "efficiencyPointsV3" | "efficiencyPointsV4" | "efficiencyPointsV5"
  | "efficiencyPointsCore"
  // efficiencyFragments cluster
  | "efficiencyFragmentsConn"
  | "efficiencyFragmentsV0" | "efficiencyFragmentsV1" | "efficiencyFragmentsV2"
  | "efficiencyFragmentsV3" | "efficiencyFragmentsV4" | "efficiencyFragmentsV5"
  | "efficiencyFragmentsCore";

export interface TalentState {
  levels: Record<TalentId, number>;
}

export function defaultTalentState(): TalentState {
  return {
    levels: {
      survivalHpConn: 0,
      survivalHpV0: 0, survivalHpV1: 0, survivalHpV2: 0,
      survivalHpV3: 0, survivalHpV4: 0, survivalHpV5: 0,
      survivalHpCore: 0,
      survivalMobilityConn: 0,
      survivalMobilityV0: 0, survivalMobilityV1: 0, survivalMobilityV2: 0,
      survivalMobilityV3: 0, survivalMobilityV4: 0, survivalMobilityV5: 0,
      survivalMobilityCore: 0,
      offenseDamageConn: 0,
      offenseDamageV0: 0, offenseDamageV1: 0, offenseDamageV2: 0,
      offenseDamageV3: 0, offenseDamageV4: 0, offenseDamageV5: 0,
      offenseDamageCore: 0,
      offenseTempoConn: 0,
      offenseTempoV0: 0, offenseTempoV1: 0, offenseTempoV2: 0,
      offenseTempoV3: 0, offenseTempoV4: 0, offenseTempoV5: 0,
      offenseTempoCore: 0,
      efficiencyPointsConn: 0,
      efficiencyPointsV0: 0, efficiencyPointsV1: 0, efficiencyPointsV2: 0,
      efficiencyPointsV3: 0, efficiencyPointsV4: 0, efficiencyPointsV5: 0,
      efficiencyPointsCore: 0,
      efficiencyFragmentsConn: 0,
      efficiencyFragmentsV0: 0, efficiencyFragmentsV1: 0, efficiencyFragmentsV2: 0,
      efficiencyFragmentsV3: 0, efficiencyFragmentsV4: 0, efficiencyFragmentsV5: 0,
      efficiencyFragmentsCore: 0,
    },
  };
}

// ── Skill Tree ──────────────────────────────────────────────────────────────

export type PrimalSkillId = "timeStop" | "shadowClone" | "reflectShield" | "barrage" | "lifestealPulse" | "axisFreeze" | "overload";

export interface SkillLevel {
  unlocked: boolean;
  /** Upgrade level (0 = base, each level improves duration / cooldown). */
  level: number;
}

/** Maximum upgrade level for any primal skill. */
export const MAX_SKILL_LEVEL = 10;

export interface SkillTreeState {
  /** Primal skill core currency — dropped by bosses. */
  cores: number;
  /** Bonus points earned from duplicate skill draws (can upgrade skills). */
  skillPoints: number;
  skills: Record<PrimalSkillId, SkillLevel>;
}

export function defaultSkillTreeState(): SkillTreeState {
  return {
    cores: 0,
    skillPoints: 0,
    skills: {
      timeStop: { unlocked: false, level: 0 },
      shadowClone: { unlocked: false, level: 0 },
      reflectShield: { unlocked: false, level: 0 },
      barrage: { unlocked: false, level: 0 },
      lifestealPulse: { unlocked: false, level: 0 },
      axisFreeze: { unlocked: false, level: 0 },
      overload: { unlocked: false, level: 0 },
    },
  };
}

// ── Achievements ────────────────────────────────────────────────────────────

export type AchievementId =
  // ── Progress ──
  | "firstBossKill"
  | "firstPrimalSkill"
  | "kill100"
  | "kill1000"
  | "clear3Stages"
  // ── Difficulty ──
  | "noPowerNormalClear"
  | "noPowerSurvival16"
  | "survival32"
  | "clearStage3"
  // ── Style ──
  | "allWeapons"
  | "fullEquipment"
  | "maxSkillLevel"
  | "own5Skins"
  | "clearStage4"
  | "clearStage5"
  // ── Speed ──
  | "speedStage1"
  | "speed5Waves"
  | "bossRush3";

export interface AchievementEntry {
  unlocked: boolean;
  unlockedAt: number | null;  // timestamp ms
}

export type AchievementState = Record<AchievementId, AchievementEntry>;

export function defaultAchievementState(): AchievementState {
  return {
    // Progress
    firstBossKill:       { unlocked: false, unlockedAt: null },
    firstPrimalSkill:    { unlocked: false, unlockedAt: null },
    kill100:             { unlocked: false, unlockedAt: null },
    kill1000:            { unlocked: false, unlockedAt: null },
    clear3Stages:        { unlocked: false, unlockedAt: null },
    // Difficulty
    noPowerNormalClear:  { unlocked: false, unlockedAt: null },
    noPowerSurvival16:   { unlocked: false, unlockedAt: null },
    survival32:          { unlocked: false, unlockedAt: null },
    clearStage3:         { unlocked: false, unlockedAt: null },
    clearStage4:         { unlocked: false, unlockedAt: null },
    clearStage5:         { unlocked: false, unlockedAt: null },
    // Style
    allWeapons:          { unlocked: false, unlockedAt: null },
    fullEquipment:       { unlocked: false, unlockedAt: null },
    maxSkillLevel:       { unlocked: false, unlockedAt: null },
    own5Skins:           { unlocked: false, unlockedAt: null },
    // Speed
    speedStage1:         { unlocked: false, unlockedAt: null },
    speed5Waves:         { unlocked: false, unlockedAt: null },
    bossRush3:           { unlocked: false, unlockedAt: null },
  };
}

// ── Shop Unlocks ────────────────────────────────────────────────────────────

export interface ShopUnlocks {
  /** IDs of items the player has purchased. */
  purchased: string[];
}

export function defaultShopUnlocks(): ShopUnlocks {
  return { purchased: [] };
}

// ── Settings ────────────────────────────────────────────────────────────────

export interface GameSettings {
  muted: boolean;
  developerMode: boolean;
  /** Master volume (0..1). Scales both SFX and music. Default 1. */
  masterVolume: number;
  /** SFX volume (0..1). Default 1. */
  sfxVolume: number;
  /** Music volume (0..1). Default 0.5. */
  musicVolume: number;
  /** Enable screen shake on hit/kill. Default true. */
  screenShake: boolean;
}

export function defaultGameSettings(): GameSettings {
  return { muted: false, developerMode: false, masterVolume: 1, sfxVolume: 1, musicVolume: 0.5, screenShake: true };
}

// ── Aggregate save blob (for export / import) ───────────────────────────────

export interface SaveData {
  version: number;
  profile: PlayerProfile;
  skillTree: SkillTreeState;
  achievements: AchievementState;
  shop: ShopUnlocks;
  settings: GameSettings;
}
