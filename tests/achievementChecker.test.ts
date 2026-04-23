import { describe, it, expect } from 'vitest';
import { checkRunAchievements, type AchievementCheckParams } from '../src/app/achievementChecker';
import type { RunResult } from '../src/game/rewards';
import type { PlayerStats, EquipmentLoadout } from '../src/game/data/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeStats(overrides: Partial<PlayerStats> = {}): PlayerStats {
  return {
    totalRuns: 1,
    totalKills: 0,
    totalBossKills: 0,
    bestSurvivalWave: 0,
    normalCleared: [false, false, false],
    totalPointsEarned: 0,
    ...overrides,
  };
}

function makeEquipment(overrides: Partial<EquipmentLoadout> = {}): EquipmentLoadout {
  return { maxSlots: 3, equipped: [], ownedCards: [], ...overrides };
}

function makeResult(overrides: Partial<RunResult> = {}): RunResult {
  return {
    mode: 'survival',
    stageIndex: 0,
    wavesCleared: 1,
    totalKills: 0,
    bossKills: 0,
    pointsEarned: 0,
    loot: [],
    noPowerRun: false,
    ...overrides,
  };
}

function makeParams(
  result: RunResult,
  statsOverrides: Partial<PlayerStats> = {},
  equipOverrides: Partial<EquipmentLoadout> = {},
  ownedSkins: string[] = ['triangle'],
  normalStageWaveTarget = 8,
): AchievementCheckParams {
  return {
    result,
    stats: makeStats(statsOverrides),
    equipment: makeEquipment(equipOverrides),
    ownedSkins,
    normalStageWaveTarget,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('checkRunAchievements', () => {
  it('returns empty array when no conditions are met', () => {
    const ids = checkRunAchievements(makeParams(makeResult()));
    expect(ids).toHaveLength(0);
  });

  // ── firstBossKill ─────────────────────────────────────────────────────────

  it('grants firstBossKill when bossKills > 0', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult({ bossKills: 1 })),
    );
    expect(ids).toContain('firstBossKill');
  });

  it('does not grant firstBossKill when bossKills === 0', () => {
    const ids = checkRunAchievements(makeParams(makeResult()));
    expect(ids).not.toContain('firstBossKill');
  });

  // ── bossRush3 ─────────────────────────────────────────────────────────────

  it('grants bossRush3 when totalBossKills >= 3', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult(), { totalBossKills: 3 }),
    );
    expect(ids).toContain('bossRush3');
  });

  it('does not grant bossRush3 when totalBossKills < 3', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult(), { totalBossKills: 2 }),
    );
    expect(ids).not.toContain('bossRush3');
  });

  // ── noPowerNormalClear ────────────────────────────────────────────────────

  it('grants noPowerNormalClear for no-power normal clear', () => {
    const ids = checkRunAchievements(
      makeParams(
        makeResult({ mode: 'normal', wavesCleared: 8, noPowerRun: true }),
      ),
    );
    expect(ids).toContain('noPowerNormalClear');
  });

  it('does not grant noPowerNormalClear if run not cleared', () => {
    const ids = checkRunAchievements(
      makeParams(
        makeResult({ mode: 'normal', wavesCleared: 7, noPowerRun: true }),
      ),
    );
    expect(ids).not.toContain('noPowerNormalClear');
  });

  it('does not grant noPowerNormalClear if not noPowerRun', () => {
    const ids = checkRunAchievements(
      makeParams(
        makeResult({ mode: 'normal', wavesCleared: 8, noPowerRun: false }),
      ),
    );
    expect(ids).not.toContain('noPowerNormalClear');
  });

  // ── noPowerSurvival16 ─────────────────────────────────────────────────────

  it('grants noPowerSurvival16 for no-power survival with >=16 waves', () => {
    const ids = checkRunAchievements(
      makeParams(
        makeResult({ mode: 'survival', wavesCleared: 16, noPowerRun: true }),
      ),
    );
    expect(ids).toContain('noPowerSurvival16');
  });

  it('does not grant noPowerSurvival16 below 16 waves', () => {
    const ids = checkRunAchievements(
      makeParams(
        makeResult({ mode: 'survival', wavesCleared: 15, noPowerRun: true }),
      ),
    );
    expect(ids).not.toContain('noPowerSurvival16');
  });

  // ── kill milestones ───────────────────────────────────────────────────────

  it('grants kill100 when totalKills >= 100', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult(), { totalKills: 100 }),
    );
    expect(ids).toContain('kill100');
  });

  it('grants kill1000 when totalKills >= 1000', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult(), { totalKills: 1000 }),
    );
    expect(ids).toContain('kill1000');
    expect(ids).toContain('kill100');
  });

  it('does not grant kill100 at 99 kills', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult(), { totalKills: 99 }),
    );
    expect(ids).not.toContain('kill100');
  });

  // ── clear3Stages ──────────────────────────────────────────────────────────

  it('grants clear3Stages when all 3 stages cleared', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult(), { normalCleared: [true, true, true] }),
    );
    expect(ids).toContain('clear3Stages');
  });

  it('does not grant clear3Stages with only 2 cleared', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult(), { normalCleared: [true, true, false] }),
    );
    expect(ids).not.toContain('clear3Stages');
  });

  // ── survival32 ───────────────────────────────────────────────────────────

  it('grants survival32 when survival wavesCleared >= 32', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult({ mode: 'survival', wavesCleared: 32 })),
    );
    expect(ids).toContain('survival32');
  });

  it('does not grant survival32 below 32 waves', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult({ mode: 'survival', wavesCleared: 31 })),
    );
    expect(ids).not.toContain('survival32');
  });

  // ── clearStage3 ───────────────────────────────────────────────────────────

  it('grants clearStage3 when normal mode stage 2 cleared', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult({ mode: 'normal', stageIndex: 2, wavesCleared: 8 })),
    );
    expect(ids).toContain('clearStage3');
  });

  it('does not grant clearStage3 for stage 0 or 1', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult({ mode: 'normal', stageIndex: 1, wavesCleared: 8 })),
    );
    expect(ids).not.toContain('clearStage3');
  });

  // ── clearStage4 ───────────────────────────────────────────────────────────

  it('grants clearStage4 when normal mode stage 3 cleared', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult({ mode: 'normal', stageIndex: 3, wavesCleared: 10 }), {}, {}, ['triangle'], 10),
    );
    expect(ids).toContain('clearStage4');
  });

  it('does not grant clearStage4 for lower stages', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult({ mode: 'normal', stageIndex: 2, wavesCleared: 8 })),
    );
    expect(ids).not.toContain('clearStage4');
  });

  // ── clearStage5 ───────────────────────────────────────────────────────────

  it('grants clearStage5 when normal mode stage 4 cleared', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult({ mode: 'normal', stageIndex: 4, wavesCleared: 12 }), {}, {}, ['triangle'], 12),
    );
    expect(ids).toContain('clearStage5');
  });

  it('does not grant clearStage5 for lower stages', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult({ mode: 'normal', stageIndex: 3, wavesCleared: 10 }), {}, {}, ['triangle'], 10),
    );
    expect(ids).not.toContain('clearStage5');
  });

  // ── fullEquipment ─────────────────────────────────────────────────────────

  it('grants fullEquipment when all slots filled with maxSlots >= 3', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult(), {}, { maxSlots: 3, equipped: ['a', 'b', 'c'], ownedCards: [] }),
    );
    expect(ids).toContain('fullEquipment');
  });

  it('does not grant fullEquipment if maxSlots < 3', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult(), {}, { maxSlots: 2, equipped: ['a', 'b'], ownedCards: [] }),
    );
    expect(ids).not.toContain('fullEquipment');
  });

  it('does not grant fullEquipment if slots not all filled', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult(), {}, { maxSlots: 3, equipped: ['a', 'b'], ownedCards: [] }),
    );
    expect(ids).not.toContain('fullEquipment');
  });

  // ── own5Skins ─────────────────────────────────────────────────────────────

  it('grants own5Skins when ownedSkins.length >= 5', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult(), {}, {}, ['a', 'b', 'c', 'd', 'e']),
    );
    expect(ids).toContain('own5Skins');
  });

  it('does not grant own5Skins with fewer than 5 skins', () => {
    const ids = checkRunAchievements(
      makeParams(makeResult(), {}, {}, ['a', 'b', 'c', 'd']),
    );
    expect(ids).not.toContain('own5Skins');
  });

  // ── no duplicates in return value ─────────────────────────────────────────

  it('never returns duplicate IDs', () => {
    // Fill all conditions that can be satisfied simultaneously
    const ids = checkRunAchievements(
      makeParams(
        makeResult({
          mode: 'normal',
          stageIndex: 2,
          wavesCleared: 8,
          bossKills: 3,
          noPowerRun: true,
        }),
        {
          totalKills: 1001,
          totalBossKills: 3,
          normalCleared: [true, true, true],
        },
        { maxSlots: 3, equipped: ['a', 'b', 'c'], ownedCards: [] },
        ['a', 'b', 'c', 'd', 'e'],
      ),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});
