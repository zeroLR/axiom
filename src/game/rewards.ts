// ── Reward / point system ───────────────────────────────────────────────────
// Points are earned per-kill during a run and settled to persistent storage at
// run end. Boss kills also roll for special loot (skins, skill cores, etc.).
// Fragment drops are collected across a run and settled to the player's
// persistent fragment inventory at run end.

import type { EnemyKind } from './world';
import type { Rng } from './rng';
import { buildStagePointMulArray, stagePointMul, stageStrengthMul } from './stageCompiler';
import {
  bossKindForStage,
  emptyFragmentDetailRecord,
  type BossFragmentKind,
  type EliteFragmentKind,
  type FragmentDetailRecord,
  type FragmentId,
} from './fragments';

/** Points awarded per enemy kill by kind. */
export const BASE_KILL_POINTS: Record<EnemyKind, number> = {
  circle: 1,
  square: 2,
  star: 3,
  pentagon: 3,
  hexagon: 4,
  diamond: 3,
  cross: 4,
  crescent: 3,
  spiral: 3,
  lance: 3,
  prism: 5,
  octo: 6,
  shade: 5,
  boss: 50,
  orthogon: 50,
  jets: 50,
  mirror: 50,
  lattice: 50,
  rift: 50,
  nexus: 50,
};

/**
 * Stage 1–N normal-mode point multipliers, derived from STAGE_CONFIGS.
 * Exported for backward compatibility (tests reference this directly).
 */
export const NORMAL_STAGE_POINT_MUL: readonly number[] = buildStagePointMulArray();

/** Backward-compatible alias for base points. */
export const KILL_POINTS = BASE_KILL_POINTS;

export function normalStagePointMultiplier(stageIndex: number): number {
  return stagePointMul(stageIndex);
}

export function killPointsForEnemy(
  kind: EnemyKind,
  mode: 'normal' | 'survival',
  stageIndex: number,
): number {
  const base = BASE_KILL_POINTS[kind] ?? 1;
  if (mode !== 'normal') return base;
  return Math.max(1, Math.ceil(base * normalStagePointMultiplier(stageIndex)));
}

/** Bonus points added per wave number for boss kills (wave × multiplier). */
export const BOSS_WAVE_BONUS = 5;

// ── Boss loot rolls ─────────────────────────────────────────────────────────

export type LootKind = 'points' | 'skin' | 'skillPoints';

export interface LootDrop {
  kind: LootKind;
  /** Label shown to the player. */
  label: string;
  /** Numeric value (points amount, etc.). 0 for non-numeric drops. */
  value: number;
}

export type BossChestTier = 'white' | 'blue' | 'crimson';

export interface BossChestReward {
  tier: BossChestTier;
  bossFragments: number;
}

interface LootEntry {
  kind: LootKind;
  label: string;
  value: number;
  /** Cumulative weight (see rollBossLoot). */
  weight: number;
}

const BOSS_LOOT_TABLE: LootEntry[] = [
  { kind: 'points', label: '+100 points', value: 100, weight: 45 },
  { kind: 'skin', label: 'Boss skin shard', value: 0, weight: 60 },
  { kind: 'skillPoints', label: '+30 skill pts', value: 30, weight: 100 },
];

/** Roll one loot drop from the boss loot table. */
export function rollBossLoot(rng: Rng): LootDrop {
  const roll = rng() * 100;
  for (const entry of BOSS_LOOT_TABLE) {
    if (roll < entry.weight) {
      return { kind: entry.kind, label: entry.label, value: entry.value };
    }
  }
  // fallback
  return { kind: 'points', label: '+100 points', value: 100 };
}

/** Roll post-boss chest reward shown before endgame settlement. */
export function rollBossChestReward(rng: Rng): BossChestReward {
  const rarityRoll = rng();
  if (rarityRoll < 0.7) {
    return { tier: 'white', bossFragments: 3 + Math.floor(rng() * 3) }; // 3–5
  }
  if (rarityRoll < 0.9) {
    return { tier: 'blue', bossFragments: 6 + Math.floor(rng() * 4) }; // 6–9
  }
  return { tier: 'crimson', bossFragments: 10 + Math.floor(rng() * 5) }; // 10–14
}

// ── Fragment drop system ─────────────────────────────────────────────────────

/** The three categories of fragment that can drop during a run. */
export type FragmentKind = 'basic' | 'elite' | 'boss';

/**
 * Per-run fragment accumulator.  All three counters start at 0 and are
 * incremented in PlayScene.onEnemyKilled().
 */
export interface FragmentTally {
  /** Dropped by every regular and elite enemy kill; scales with stage strength. */
  basic: number;
  /** Dropped by elite-marked enemies only (0–2 per kill). */
  elite: number;
  /** Dropped by the stage boss kill only (1–5 per kill). */
  boss: number;
  /** Per-fragment detailed tally (basic + each elite/boss exclusive type). */
  detailed: FragmentDetailRecord;
}

export function emptyFragmentTally(): FragmentTally {
  return { basic: 0, elite: 0, boss: 0, detailed: emptyFragmentDetailRecord() };
}

/**
 * Base basic-fragment count per kill before stage-strength scaling.
 * Named bosses (all stored as kind = 'boss') return 0 — they use the
 * boss-only drop path instead.
 */
const BASE_FRAGMENT_DROP: Partial<Record<EnemyKind, number>> = {
  boss: 0, orthogon: 0, jets: 0, mirror: 0, lattice: 0, rift: 0, nexus: 0,
};

/**
 * How many basic fragments a single enemy kill yields.
 * - In normal mode the count scales with `stageStrengthMul`.
 * - In survival mode the base count (1) is always returned.
 * - Boss-kind enemies always return 0.
 */
export function basicFragmentsForEnemy(
  kind: EnemyKind,
  mode: 'normal' | 'survival',
  stageIndex: number,
): number {
  const base = BASE_FRAGMENT_DROP[kind] ?? 1;
  if (base === 0) return 0;
  if (mode !== 'normal') return base;
  return Math.max(1, Math.ceil(base * stageStrengthMul(stageIndex)));
}

/**
 * Roll the fragment drops for a single enemy kill.
 *
 * - Regular enemy   → basic fragments (stage-strength scaled)
 * - Elite enemy     → basic fragments + 0–2 elite fragments
 * - Boss enemy      → 1–5 boss fragments ONLY (no basic/elite)
 */
export function rollFragmentDrops(
  kind: EnemyKind,
  isElite: boolean,
  mode: 'normal' | 'survival',
  stageIndex: number,
  rng: Rng,
  bossKindHint?: BossFragmentKind,
): FragmentTally {
  const tally = emptyFragmentTally();

  if (kind === 'boss') {
    tally.boss = 1 + Math.floor(rng() * 5); // 1–5
    const bossKind = bossKindHint ?? bossKindForStage(stageIndex);
    tally.detailed[`boss-${bossKind}`] += tally.boss;
    return tally;
  }

  if (
    kind === 'orthogon' ||
    kind === 'jets' ||
    kind === 'mirror' ||
    kind === 'lattice' ||
    kind === 'rift' ||
    kind === 'nexus'
  ) {
    tally.boss = 1 + Math.floor(rng() * 5); // 1–5
    tally.detailed[`boss-${kind}`] += tally.boss;
    return tally;
  }

  tally.basic = basicFragmentsForEnemy(kind, mode, stageIndex);
  tally.detailed['basic-core'] += tally.basic;

  if (isElite) {
    tally.elite = Math.floor(rng() * 3); // 0–2
    if (tally.elite > 0) {
      tally.detailed[`elite-${kind as EliteFragmentKind}` as FragmentId] += tally.elite;
    }
  }

  return tally;
}

// ── Run result ──────────────────────────────────────────────────────────────

export interface RunResult {
  mode: 'normal' | 'survival';
  stageIndex: number; // 0-based (normal only)
  wavesCleared: number;
  totalKills: number;
  bossKills: number;
  pointsEarned: number;
  loot: LootDrop[];
  /** Fragments collected across this run (settled at run end). */
  fragments: FragmentTally;
  /** Kills grouped by enemy kind for post-run analytics and codex progression. */
  killsByKind?: Partial<Record<EnemyKind, number>>;
  /** Boss-only chest reward revealed after boss death sequence. */
  bossChestReward?: BossChestReward;
  /** Run duration in seconds. */
  durationSec?: number;
  /** True if the player picked 0 cards during the run. */
  noPowerRun: boolean;
}
