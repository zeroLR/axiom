import { describe, expect, it } from "vitest";
import { createRng } from "../src/game/rng";
import {
  BASE_KILL_POINTS,
  BOSS_WAVE_BONUS,
  killPointsForEnemy,
  NORMAL_STAGE_POINT_MUL,
  normalStagePointMultiplier,
  rollBossLoot,
  rollBossChestReward,
  emptyFragmentTally,
  basicFragmentsForEnemy,
  rollFragmentDrops,
} from "../src/game/rewards";

describe("rewards", () => {
  function createSequentialRng(values: number[]): () => number {
    let i = 0;
    return () => {
      const v = values[Math.min(i, values.length - 1)] ?? 0;
      i += 1;
      return v;
    };
  }

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

  it("rollBossChestReward returns valid structured reward", () => {
    const rng = createRng(456);
    for (let i = 0; i < 80; i++) {
      const reward = rollBossChestReward(rng);
      expect(["white", "blue", "crimson"]).toContain(reward.tier);
      expect(reward.bossFragments).toBeGreaterThan(0);
      expect([0, 1]).toContain(reward.core);
    }
  });

  it("rollBossChestReward tier ranges and core chances are respected", () => {
    const white = rollBossChestReward(() => 0.2);
    expect(white.tier).toBe("white");
    expect(white.core).toBe(0);
    expect(white.bossFragments).toBeGreaterThanOrEqual(3);
    expect(white.bossFragments).toBeLessThanOrEqual(5);

    const blueWithCore = rollBossChestReward(createSequentialRng([0.8, 0.4, 0.05]));
    expect(blueWithCore.tier).toBe("blue");
    expect(blueWithCore.core).toBe(1);
    expect(blueWithCore.bossFragments).toBeGreaterThanOrEqual(6);
    expect(blueWithCore.bossFragments).toBeLessThanOrEqual(9);

    const crimsonNoCore = rollBossChestReward(createSequentialRng([0.95, 0.2, 0.9]));
    expect(crimsonNoCore.tier).toBe("crimson");
    expect(crimsonNoCore.core).toBe(0);
    expect(crimsonNoCore.bossFragments).toBeGreaterThanOrEqual(10);
    expect(crimsonNoCore.bossFragments).toBeLessThanOrEqual(14);
  });
});

describe("fragment drops", () => {
  it("emptyFragmentTally returns all zeros", () => {
    const t = emptyFragmentTally();
    expect(t.basic).toBe(0);
    expect(t.elite).toBe(0);
    expect(t.boss).toBe(0);
  });

  it("basicFragmentsForEnemy returns 0 for boss-kind", () => {
    expect(basicFragmentsForEnemy("boss", "normal", 0)).toBe(0);
    expect(basicFragmentsForEnemy("orthogon", "normal", 0)).toBe(0);
    expect(basicFragmentsForEnemy("jets", "normal", 2)).toBe(0);
    expect(basicFragmentsForEnemy("mirror", "normal", 2)).toBe(0);
    expect(basicFragmentsForEnemy("lattice", "normal", 3)).toBe(0);
    expect(basicFragmentsForEnemy("rift", "normal", 4)).toBe(0);
  });

  it("basicFragmentsForEnemy scales with stage strength in normal mode", () => {
    // stageStrengthMul: 1, 1.5, 2.0, 3.0, 4.0
    expect(basicFragmentsForEnemy("circle", "normal", 0)).toBe(1); // ceil(1*1)=1
    expect(basicFragmentsForEnemy("circle", "normal", 1)).toBe(2); // ceil(1*1.5)=2
    expect(basicFragmentsForEnemy("circle", "normal", 2)).toBe(2); // ceil(1*2.0)=2
    expect(basicFragmentsForEnemy("circle", "normal", 3)).toBe(3); // ceil(1*3.0)=3
    expect(basicFragmentsForEnemy("circle", "normal", 4)).toBe(4); // ceil(1*4.0)=4
  });

  it("basicFragmentsForEnemy returns 1 for any normal enemy in survival mode", () => {
    expect(basicFragmentsForEnemy("circle", "survival", 0)).toBe(1);
    expect(basicFragmentsForEnemy("square", "survival", 5)).toBe(1);
  });

  it("rollFragmentDrops: regular enemy drops only basic fragments", () => {
    const rng = createRng(1);
    const result = rollFragmentDrops("circle", false, "normal", 0, rng);
    expect(result.basic).toBeGreaterThanOrEqual(1);
    expect(result.elite).toBe(0);
    expect(result.boss).toBe(0);
  });

  it("rollFragmentDrops: elite enemy drops basic + 0-2 elite fragments", () => {
    const rng = createRng(42);
    for (let i = 0; i < 30; i++) {
      const result = rollFragmentDrops("star", true, "normal", 0, rng);
      expect(result.basic).toBeGreaterThanOrEqual(1);
      expect(result.elite).toBeGreaterThanOrEqual(0);
      expect(result.elite).toBeLessThanOrEqual(2);
      expect(result.boss).toBe(0);
    }
  });

  it("rollFragmentDrops: boss drops 1-5 boss fragments only", () => {
    const rng = createRng(99);
    for (let i = 0; i < 50; i++) {
      const result = rollFragmentDrops("boss", false, "normal", 0, rng);
      expect(result.basic).toBe(0);
      expect(result.elite).toBe(0);
      expect(result.boss).toBeGreaterThanOrEqual(1);
      expect(result.boss).toBeLessThanOrEqual(5);
    }
  });

  it("rollFragmentDrops: boss kind ignores isElite and always returns boss-only", () => {
    const rng = createRng(7);
    const result = rollFragmentDrops("boss", true, "normal", 2, rng);
    expect(result.basic).toBe(0);
    expect(result.elite).toBe(0);
    expect(result.boss).toBeGreaterThanOrEqual(1);
  });

  it("rollFragmentDrops: basic fragments scale with stage in normal mode", () => {
    const rng = createRng(1);
    const stage0 = rollFragmentDrops("circle", false, "normal", 0, rng);
    const rng2 = createRng(1);
    const stage4 = rollFragmentDrops("circle", false, "normal", 4, rng2);
    expect(stage4.basic).toBeGreaterThan(stage0.basic);
  });
});
