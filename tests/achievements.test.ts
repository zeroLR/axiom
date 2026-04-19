import { describe, expect, it } from "vitest";
import { defaultAchievementState } from "../src/game/data/types";
import { unlockAchievement, ACHIEVEMENTS } from "../src/game/achievements";

describe("achievements", () => {
  it("unlockAchievement returns true on first unlock", () => {
    const state = defaultAchievementState();
    expect(unlockAchievement(state, "firstBossKill")).toBe(true);
    expect(state.firstBossKill.unlocked).toBe(true);
    expect(state.firstBossKill.unlockedAt).toBeGreaterThan(0);
  });

  it("unlockAchievement returns false on repeated unlock", () => {
    const state = defaultAchievementState();
    unlockAchievement(state, "firstBossKill");
    expect(unlockAchievement(state, "firstBossKill")).toBe(false);
  });

  it("default state has all achievements locked", () => {
    const state = defaultAchievementState();
    for (const def of ACHIEVEMENTS) {
      expect(state[def.id].unlocked).toBe(false);
    }
  });

  it("has 16 achievement definitions", () => {
    expect(ACHIEVEMENTS).toHaveLength(16);
  });

  it("achievement IDs are unique", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("default state includes all 16 achievement IDs", () => {
    const state = defaultAchievementState();
    const ids = Object.keys(state);
    expect(ids).toHaveLength(16);
    for (const def of ACHIEVEMENTS) {
      expect(ids).toContain(def.id);
    }
  });

  it("new achievements can be unlocked", () => {
    const state = defaultAchievementState();
    expect(unlockAchievement(state, "kill100")).toBe(true);
    expect(state.kill100.unlocked).toBe(true);
    expect(unlockAchievement(state, "survival32")).toBe(true);
    expect(state.survival32.unlocked).toBe(true);
    expect(unlockAchievement(state, "bossRush3")).toBe(true);
    expect(state.bossRush3.unlocked).toBe(true);
  });
});
