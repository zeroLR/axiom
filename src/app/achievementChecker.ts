// ── Achievement checker — pure function ────────────────────────────────────
// Determines which achievement IDs *should* be unlocked after a run.
// Zero side-effects: takes read-only inputs, returns the candidate ID list.
// The caller is responsible for filtering out already-unlocked IDs (via
// `unlockAchievement`) and persisting the updated AchievementState.

import type { AchievementId, EquipmentLoadout, PlayerStats } from '../game/data/types';
import type { RunResult } from '../game/rewards';

export interface AchievementCheckParams {
  /** The run result (bossKills, noPowerRun, mode, stageIndex, wavesCleared). */
  result: RunResult;
  /**
   * Player stats AFTER this run has been applied (totalKills, totalBossKills,
   * normalCleared, etc. are already updated by the caller before invoking this).
   */
  stats: PlayerStats;
  /** Current equipment loadout (equipped.length, maxSlots). */
  equipment: EquipmentLoadout;
  /** All skin IDs currently owned by the player. */
  ownedSkins: string[];
  /**
   * Wave-count target for the current normal-mode stage.
   * Pass 0 (or any value) for survival runs — the mode check short-circuits first.
   */
  normalStageWaveTarget: number;
}

/**
 * Returns the `AchievementId`s that the player has earned based on the run
 * result and current state.  Does NOT check whether the achievement is already
 * unlocked — callers should pass each ID to `unlockAchievement()` which
 * returns `false` for already-unlocked ones.
 */
export function checkRunAchievements(
  params: AchievementCheckParams,
): AchievementId[] {
  const { result, stats, equipment, ownedSkins, normalStageWaveTarget } =
    params;

  const ids: AchievementId[] = [];

  const normalCleared =
    result.mode === 'normal' &&
    result.wavesCleared >= normalStageWaveTarget;

  // ── Boss-related ──────────────────────────────────────────────────────────
  if (result.bossKills > 0) ids.push('firstBossKill');
  if (stats.totalBossKills >= 3) ids.push('bossRush3');

  // ── No-power runs ─────────────────────────────────────────────────────────
  if (result.noPowerRun && normalCleared) ids.push('noPowerNormalClear');
  if (result.noPowerRun && result.mode === 'survival' && result.wavesCleared >= 16)
    ids.push('noPowerSurvival16');

  // ── Progress ──────────────────────────────────────────────────────────────
  if (stats.totalKills >= 100) ids.push('kill100');
  if (stats.totalKills >= 1000) ids.push('kill1000');
  if (stats.normalCleared.filter(Boolean).length >= 3) ids.push('clear3Stages');

  // ── Difficulty ────────────────────────────────────────────────────────────
  if (result.mode === 'survival' && result.wavesCleared >= 32) ids.push('survival32');
  if (result.mode === 'normal' && result.stageIndex === 2 && normalCleared)
    ids.push('clearStage3');
  if (result.mode === 'normal' && result.stageIndex === 3 && normalCleared)
    ids.push('clearStage4');
  if (result.mode === 'normal' && result.stageIndex === 4 && normalCleared)
    ids.push('clearStage5');

  // ── Style ─────────────────────────────────────────────────────────────────
  if (
    equipment.equipped.length >= equipment.maxSlots &&
    equipment.maxSlots >= 3
  )
    ids.push('fullEquipment');
  if (ownedSkins.length >= 5) ids.push('own5Skins');

  return ids;
}
