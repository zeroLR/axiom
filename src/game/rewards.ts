// ── Reward / point system ───────────────────────────────────────────────────
// Points are earned per-kill during a run and settled to persistent storage at
// run end. Boss kills also roll for special loot (skins, skill cores, etc.).

import type { EnemyKind } from './world';
import type { Rng } from './rng';

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
  boss: 50,
  orthogon: 50,
  jets: 50,
  mirror: 50,
};

/** Stage 1 / Stage 2 / Stage 3 normal-mode point multipliers. */
export const NORMAL_STAGE_POINT_MUL: readonly number[] = [1, 2, 3];

/** Backward-compatible alias for base points. */
export const KILL_POINTS = BASE_KILL_POINTS;

export function normalStagePointMultiplier(stageIndex: number): number {
  return stageIndex >= 0 && stageIndex < NORMAL_STAGE_POINT_MUL.length
    ? NORMAL_STAGE_POINT_MUL[stageIndex]!
    : 1;
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

export type LootKind = 'points' | 'skin' | 'skillPoints' | 'core';

export interface LootDrop {
  kind: LootKind;
  /** Label shown to the player. */
  label: string;
  /** Numeric value (points amount, etc.). 0 for non-numeric drops. */
  value: number;
}

interface LootEntry {
  kind: LootKind;
  label: string;
  value: number;
  /** Cumulative weight (see rollBossLoot). */
  weight: number;
}

const BOSS_LOOT_TABLE: LootEntry[] = [
  { kind: 'points', label: '+100 points', value: 100, weight: 40 },
  { kind: 'skin', label: 'Boss skin shard', value: 0, weight: 55 },
  { kind: 'skillPoints', label: '+30 skill pts', value: 30, weight: 75 },
  { kind: 'core', label: 'Primal core ✧', value: 1, weight: 100 },
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

// ── Run result ──────────────────────────────────────────────────────────────

export interface RunResult {
  mode: 'normal' | 'survival';
  stageIndex: number; // 0-based (normal only)
  wavesCleared: number;
  totalKills: number;
  bossKills: number;
  pointsEarned: number;
  loot: LootDrop[];
  /** True if the player picked 0 cards during the run. */
  noPowerRun: boolean;
}
