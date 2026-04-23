import { describe, expect, it } from "vitest";
import { createRng } from "../src/game/rng";
import { BASE_KILL_POINTS, BOSS_WAVE_BONUS, killPointsForEnemy, NORMAL_STAGE_POINT_MUL, normalStagePointMultiplier, rollBossLoot } from "../src/game/rewards";

describe("rewards", () => {
  it("every enemy kind has a positive point value", () => {
    for (const [kind, pts] of Object.entries(BASE_KILL_POINTS)) {
      expect(pts, `${kind} should award > 0 points`).toBeGreaterThan(0);
    }
  });

  it("boss awards the highest points", () => {
    const max = Math.max(...Object.values(BASE_KILL_POINTS));
    expect(BASE_KILL_POINTS.boss).toBe(max);
  });

  it("normal stage point multipliers are 1x through 5x", () => {
    expect(NORMAL_STAGE_POINT_MUL).toEqual([1, 2, 3, 4, 5]);
    expect(normalStagePointMultiplier(0)).toBe(1);
    expect(normalStagePointMultiplier(1)).toBe(2);
    expect(normalStagePointMultiplier(2)).toBe(3);
    expect(normalStagePointMultiplier(3)).toBe(4);
    expect(normalStagePointMultiplier(4)).toBe(5);
  });

  it("kill points scale by stage in normal mode", () => {
    expect(killPointsForEnemy("square", "normal", 0)).toBe(2);
    expect(killPointsForEnemy("square", "normal", 1)).toBe(4);
    expect(killPointsForEnemy("square", "normal", 2)).toBe(6);
    expect(killPointsForEnemy("square", "normal", 3)).toBe(8);
    expect(killPointsForEnemy("square", "normal", 4)).toBe(10);
  });

  it("survival mode keeps base kill points", () => {
    expect(killPointsForEnemy("square", "survival", 0)).toBe(BASE_KILL_POINTS.square);
    expect(killPointsForEnemy("boss", "survival", 2)).toBe(BASE_KILL_POINTS.boss);
  });

  it("rollBossLoot always returns a valid drop", () => {
    const rng = createRng(123);
    for (let i = 0; i < 50; i++) {
      const drop = rollBossLoot(rng);
      expect(drop.kind).toBeDefined();
      expect(drop.label).toBeDefined();
      expect(typeof drop.value).toBe("number");
    }
  });

  it("BOSS_WAVE_BONUS is positive", () => {
    expect(BOSS_WAVE_BONUS).toBeGreaterThan(0);
  });
});
