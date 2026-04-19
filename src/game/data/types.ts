// ── Persistent data models ──────────────────────────────────────────────────
// All types stored in IndexedDB. Kept in a single file so every store shares
// one import path and one schema version constant.

/** Global schema version — bump when store shapes change. */
export const SCHEMA_VERSION = 2;

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
}

export type StartingShapeId = "triangle" | "square" | "diamond";

export interface PlayerStats {
  totalRuns: number;
  totalKills: number;
  totalBossKills: number;
  bestSurvivalWave: number;
  normalCleared: boolean[];  // indexed 0..2 for 3 stages
  /** Cumulative points earned across all runs; used for progression unlocks. */
  totalPointsEarned: number;
}

export function defaultPlayerProfile(): PlayerProfile {
  return {
    points: 0,
    ownedSkins: ["triangle"],
    activeSkin: "triangle",
    activeStartShape: "triangle",
    stats: {
      totalRuns: 0,
      totalKills: 0,
      totalBossKills: 0,
      bestSurvivalWave: 0,
      normalCleared: [false, false, false],
      totalPointsEarned: 0,
    },
  };
}

// ── Equipment ───────────────────────────────────────────────────────────────

/** A purchasable enhancement card that can be equipped before a run. */
export interface EquipmentCard {
  id: string;
  name: string;
  glyph: string;
  text: string;
  /** Effect applied at run start (same shape as in-run Card effects). */
  effectKind: string;
  effectValue: number;
}

export interface EquipmentLoadout {
  /** Max number of equippable card slots (starts at 3, expandable). */
  maxSlots: number;
  /** IDs of cards currently equipped (length ≤ maxSlots). */
  equipped: string[];
  /** IDs of all owned equipment cards. */
  ownedCards: string[];
}

export function defaultEquipmentLoadout(): EquipmentLoadout {
  return { maxSlots: 3, equipped: [], ownedCards: [] };
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
}

export function defaultGameSettings(): GameSettings {
  return { muted: false };
}

// ── Aggregate save blob (for export / import) ───────────────────────────────

export interface SaveData {
  version: number;
  profile: PlayerProfile;
  equipment: EquipmentLoadout;
  skillTree: SkillTreeState;
  achievements: AchievementState;
  shop: ShopUnlocks;
  settings: GameSettings;
}
