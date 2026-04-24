import type { EnemyKind } from "../world";
import {
  emptyFragmentDetailRecord,
  type FragmentDetailRecord,
} from "../fragments";

// ── Persistent data models ──────────────────────────────────────────────────
// All types stored in IndexedDB. Kept in a single file so every store shares
// one import path and one schema version constant.

/** Global schema version — bump when store shapes change. */
export const SCHEMA_VERSION = 3;

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
  normalCleared: boolean[];  // indexed 0..4 for 5 stages
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
    stats: {
      totalRuns: 0,
      totalKills: 0,
      totalBossKills: 0,
      enemyKills: defaultEnemyKills(),
      bestSurvivalWave: 0,
      normalCleared: [false, false, false, false, false],
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

// ── Talent Growth ────────────────────────────────────────────────────────────

export type TalentId =
  // survival (24)
  | "survivalVitality" | "survivalPhase"
  | "survivalHp2" | "survivalHp3" | "survivalHp4" | "survivalHp5" | "survivalHp6"
  | "survivalIframe2" | "survivalIframe3" | "survivalIframe4"
  | "survivalSpeed1" | "survivalSpeed2" | "survivalSpeed3" | "survivalSpeed4"
  | "survivalPickup1" | "survivalPickup2" | "survivalPickup3" | "survivalPickup4"
  | "survivalCoreHp1" | "survivalCoreHp2" | "survivalCoreHp3"
  | "survivalCoreIframe" | "survivalCoreSpeed" | "survivalCorePickup"
  // offense (24)
  | "offenseVector" | "offenseCritical"
  | "offenseDamage2" | "offenseDamage3" | "offenseDamage4" | "offenseDamage5" | "offenseDamage6"
  | "offenseCrit2" | "offenseCrit3" | "offenseCrit4"
  | "offensePeriod1" | "offensePeriod2" | "offensePeriod3" | "offensePeriod4"
  | "offenseProjSpeed1" | "offenseProjSpeed2" | "offenseProjSpeed3" | "offenseProjSpeed4"
  | "offenseCoreDamage" | "offenseCoreCrit" | "offenseCorePeriod"
  | "offenseCoreProjSpeed" | "offenseCoreProjectiles" | "offenseCorePierce"
  // efficiency (24)
  | "efficiencyPoints" | "efficiencyFragments"
  | "efficiencyPoints2" | "efficiencyPoints3" | "efficiencyPoints4"
  | "efficiencyPoints5" | "efficiencyPoints6" | "efficiencyPoints7" | "efficiencyPoints8" | "efficiencyPoints9"
  | "efficiencyFragments2" | "efficiencyFragments3" | "efficiencyFragments4"
  | "efficiencyFragments5" | "efficiencyFragments6" | "efficiencyFragments7"
  | "efficiencyFragments8" | "efficiencyFragments9"
  | "efficiencySkillPt1" | "efficiencySkillPt2" | "efficiencySkillPt3"
  | "efficiencySkillPt4" | "efficiencySkillPt5" | "efficiencySkillPt6";

export interface TalentState {
  levels: Record<TalentId, number>;
}

export function defaultTalentState(): TalentState {
  return {
    levels: {
      // survival
      survivalVitality: 0, survivalPhase: 0,
      survivalHp2: 0, survivalHp3: 0, survivalHp4: 0, survivalHp5: 0, survivalHp6: 0,
      survivalIframe2: 0, survivalIframe3: 0, survivalIframe4: 0,
      survivalSpeed1: 0, survivalSpeed2: 0, survivalSpeed3: 0, survivalSpeed4: 0,
      survivalPickup1: 0, survivalPickup2: 0, survivalPickup3: 0, survivalPickup4: 0,
      survivalCoreHp1: 0, survivalCoreHp2: 0, survivalCoreHp3: 0,
      survivalCoreIframe: 0, survivalCoreSpeed: 0, survivalCorePickup: 0,
      // offense
      offenseVector: 0, offenseCritical: 0,
      offenseDamage2: 0, offenseDamage3: 0, offenseDamage4: 0, offenseDamage5: 0, offenseDamage6: 0,
      offenseCrit2: 0, offenseCrit3: 0, offenseCrit4: 0,
      offensePeriod1: 0, offensePeriod2: 0, offensePeriod3: 0, offensePeriod4: 0,
      offenseProjSpeed1: 0, offenseProjSpeed2: 0, offenseProjSpeed3: 0, offenseProjSpeed4: 0,
      offenseCoreDamage: 0, offenseCoreCrit: 0, offenseCorePeriod: 0,
      offenseCoreProjSpeed: 0, offenseCoreProjectiles: 0, offenseCorePierce: 0,
      // efficiency
      efficiencyPoints: 0, efficiencyFragments: 0,
      efficiencyPoints2: 0, efficiencyPoints3: 0, efficiencyPoints4: 0,
      efficiencyPoints5: 0, efficiencyPoints6: 0, efficiencyPoints7: 0, efficiencyPoints8: 0, efficiencyPoints9: 0,
      efficiencyFragments2: 0, efficiencyFragments3: 0, efficiencyFragments4: 0,
      efficiencyFragments5: 0, efficiencyFragments6: 0, efficiencyFragments7: 0,
      efficiencyFragments8: 0, efficiencyFragments9: 0,
      efficiencySkillPt1: 0, efficiencySkillPt2: 0, efficiencySkillPt3: 0,
      efficiencySkillPt4: 0, efficiencySkillPt5: 0, efficiencySkillPt6: 0,
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
