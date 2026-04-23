import { describe, it, expect } from "vitest";
import {
  bossToStageIndex,
  isBossDefeated,
  isCardUnlocked,
  isSkillUnlocked,
  filterUnlockedCards,
  diffUnlocks,
} from "../src/game/unlocks";
import { POOL, type Card } from "../src/game/cards";
import { PRIMAL_SKILLS, type PrimalSkillDef } from "../src/game/skills";
import { defaultEnemyKills, type PlayerStats } from "../src/game/data/types";

function makeStats(normalCleared: boolean[]): PlayerStats {
  return {
    totalRuns: 0,
    totalKills: 0,
    totalBossKills: 0,
    enemyKills: defaultEnemyKills(),
    bestSurvivalWave: 0,
    normalCleared,
    totalPointsEarned: 0,
  };
}

describe("unlock system", () => {
  // ── bossToStageIndex ────────────────────────────────────────────────────

  it("maps boss IDs to correct stage indices", () => {
    expect(bossToStageIndex("orthogon")).toBe(0);
    expect(bossToStageIndex("jets")).toBe(1);
    expect(bossToStageIndex("mirror")).toBe(2);
  });

  // ── isBossDefeated ──────────────────────────────────────────────────────

  it("detects defeated bosses from normalCleared", () => {
    const fresh = makeStats([false, false, false]);
    expect(isBossDefeated("orthogon", fresh)).toBe(false);
    expect(isBossDefeated("jets", fresh)).toBe(false);
    expect(isBossDefeated("mirror", fresh)).toBe(false);

    const stage1 = makeStats([true, false, false]);
    expect(isBossDefeated("orthogon", stage1)).toBe(true);
    expect(isBossDefeated("jets", stage1)).toBe(false);

    const all = makeStats([true, true, true]);
    expect(isBossDefeated("orthogon", all)).toBe(true);
    expect(isBossDefeated("jets", all)).toBe(true);
    expect(isBossDefeated("mirror", all)).toBe(true);
  });

  // ── isCardUnlocked ──────────────────────────────────────────────────────

  it("ungated cards are always unlocked", () => {
    const card: Card = {
      id: "test", name: "Test", glyph: "T", rarity: "common",
      text: "test", effect: { kind: "damageAdd", value: 1 },
    };
    expect(isCardUnlocked(card, makeStats([false, false, false]))).toBe(true);
  });

  it("gated cards are locked until boss defeated", () => {
    const card: Card = {
      id: "gated", name: "Gated", glyph: "G", rarity: "uncommon",
      text: "test", effect: { kind: "damageAdd", value: 1 },
      unlockAfterBoss: "jets",
    };
    expect(isCardUnlocked(card, makeStats([true, false, false]))).toBe(false);
    expect(isCardUnlocked(card, makeStats([true, true, false]))).toBe(true);
  });

  // ── isSkillUnlocked ─────────────────────────────────────────────────────

  it("ungated skills are always unlocked", () => {
    const def: PrimalSkillDef = {
      id: "barrage", name: "Barrage", glyph: "⁂",
      description: "test", baseDuration: 2, baseCooldown: 25,
      durationPerLevel: 0.3, cooldownPerLevel: 1.5,
    };
    expect(isSkillUnlocked(def, makeStats([false, false, false]))).toBe(true);
  });

  it("gated skills are locked until boss defeated", () => {
    expect(isSkillUnlocked(PRIMAL_SKILLS.axisFreeze, makeStats([false, false, false]))).toBe(false);
    expect(isSkillUnlocked(PRIMAL_SKILLS.axisFreeze, makeStats([true, false, false]))).toBe(true);
    expect(isSkillUnlocked(PRIMAL_SKILLS.timeStop, makeStats([true, true, false]))).toBe(false);
    expect(isSkillUnlocked(PRIMAL_SKILLS.timeStop, makeStats([true, true, true]))).toBe(true);
  });

  // ── filterUnlockedCards ─────────────────────────────────────────────────

  it("filters pool to only unlocked cards", () => {
    const fresh = filterUnlockedCards(POOL, makeStats([false, false, false]));
    const gatedIds = POOL.filter((c) => c.unlockAfterBoss).map((c) => c.id);
    expect(gatedIds.length).toBeGreaterThan(0);
    for (const id of gatedIds) {
      expect(fresh.find((c) => c.id === id)).toBeUndefined();
    }

    const all = filterUnlockedCards(POOL, makeStats([true, true, true]));
    expect(all.length).toBe(POOL.length);
  });

  // ── diffUnlocks ─────────────────────────────────────────────────────────

  it("computes newly unlocked items after a boss defeat", () => {
    const before = makeStats([false, false, false]);
    const after = makeStats([true, false, false]);
    const allSkillDefs = Object.values(PRIMAL_SKILLS) as PrimalSkillDef[];
    const diff = diffUnlocks(before, after, POOL, allSkillDefs);

    // Orthogon gates: axisLock, gridSnap, axisFreeze
    expect(diff.newCards).toContain("axisLock");
    expect(diff.newCards).toContain("gridSnap");
    expect(diff.newSkills).toContain("axisFreeze");

    // Jets/Mirror cards should NOT be in the diff
    expect(diff.newCards).not.toContain("contrail");
    expect(diff.newCards).not.toContain("recursion");
  });

  it("returns empty diff when no new boss defeated", () => {
    const before = makeStats([true, false, false]);
    const after = makeStats([true, false, false]);
    const allSkillDefs = Object.values(PRIMAL_SKILLS) as PrimalSkillDef[];
    const diff = diffUnlocks(before, after, POOL, allSkillDefs);
    expect(diff.newCards).toHaveLength(0);
    expect(diff.newSkills).toHaveLength(0);
  });

  it("reports Jets unlocks correctly", () => {
    const before = makeStats([true, false, false]);
    const after = makeStats([true, true, false]);
    const allSkillDefs = Object.values(PRIMAL_SKILLS) as PrimalSkillDef[];
    const diff = diffUnlocks(before, after, POOL, allSkillDefs);
    expect(diff.newCards).toContain("contrail");
    expect(diff.newCards).toContain("reboundPlus");
    expect(diff.newSkills).toContain("shadowClone");
  });

  it("reports Mirror unlocks correctly", () => {
    const before = makeStats([true, true, false]);
    const after = makeStats([true, true, true]);
    const allSkillDefs = Object.values(PRIMAL_SKILLS) as PrimalSkillDef[];
    const diff = diffUnlocks(before, after, POOL, allSkillDefs);
    expect(diff.newCards).toContain("recursion");
    expect(diff.newSkills).toContain("timeStop");
    expect(diff.newSkills).toContain("overload");
  });

  // ── POOL integrity ────────────────────────────────────────────────────

  it("pool has exactly 5 boss-gated cards", () => {
    const gated = POOL.filter((c) => c.unlockAfterBoss);
    expect(gated).toHaveLength(5);
    expect(gated.map((c) => c.id).sort()).toEqual(
      ["axisLock", "contrail", "gridSnap", "reboundPlus", "recursion"],
    );
  });

  it("all gated cards have valid boss IDs", () => {
    const validBosses = new Set(["orthogon", "jets", "mirror"]);
    for (const card of POOL.filter((c) => c.unlockAfterBoss)) {
      expect(validBosses.has(card.unlockAfterBoss!)).toBe(true);
    }
  });

  // ── Skill gate integrity ──────────────────────────────────────────────

  it("4 skills are boss-gated", () => {
    const gated = Object.values(PRIMAL_SKILLS).filter((d) => d.unlockAfterBoss);
    expect(gated).toHaveLength(4);
    const ids = gated.map((d) => d.id).sort();
    expect(ids).toEqual(["axisFreeze", "overload", "shadowClone", "timeStop"]);
  });
});
