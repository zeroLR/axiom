import { describe, it, expect } from "vitest";
import {
  bossToStageIndex,
  isBossDefeated,
  isCardUnlocked,
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

  it("computes newly unlocked cards after a boss defeat", () => {
    const before = makeStats([false, false, false]);
    const after = makeStats([true, false, false]);
    const allSkillDefs = Object.values(PRIMAL_SKILLS) as PrimalSkillDef[];
    const diff = diffUnlocks(before, after, POOL, allSkillDefs);

    // Orthogon gates: axisLock, gridSnap
    expect(diff.newCards).toContain("axisLock");
    expect(diff.newCards).toContain("gridSnap");
    // Skills are now class-gated, not boss-gated
    expect(diff.newSkills).toHaveLength(0);

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

  it("reports Jets card unlocks correctly", () => {
    const before = makeStats([true, false, false]);
    const after = makeStats([true, true, false]);
    const allSkillDefs = Object.values(PRIMAL_SKILLS) as PrimalSkillDef[];
    const diff = diffUnlocks(before, after, POOL, allSkillDefs);
    expect(diff.newCards).toContain("contrail");
    expect(diff.newCards).toContain("reboundPlus");
    expect(diff.newSkills).toHaveLength(0);
  });

  it("reports Mirror card unlocks correctly", () => {
    const before = makeStats([true, true, false]);
    const after = makeStats([true, true, true]);
    const allSkillDefs = Object.values(PRIMAL_SKILLS) as PrimalSkillDef[];
    const diff = diffUnlocks(before, after, POOL, allSkillDefs);
    expect(diff.newCards).toContain("recursion");
    expect(diff.newSkills).toHaveLength(0);
  });

  // ── trophies ────────────────────────────────────────────────────────────

  it("diffs the matching trophy when a boss is newly defeated", () => {
    const allSkillDefs = Object.values(PRIMAL_SKILLS) as PrimalSkillDef[];

    const a = diffUnlocks(makeStats([false, false, false, false, false]),
                          makeStats([true,  false, false, false, false]),
                          POOL, allSkillDefs);
    expect(a.newTrophies).toEqual(["axis-lock"]);

    const b = diffUnlocks(makeStats([true, false, false, false, false]),
                          makeStats([true, true,  false, false, false]),
                          POOL, allSkillDefs);
    expect(b.newTrophies).toEqual(["wing-dash"]);

    const c = diffUnlocks(makeStats([true, true, true, false, false]),
                          makeStats([true, true, true, true,  true]),
                          POOL, allSkillDefs);
    expect(c.newTrophies.sort()).toEqual(["grid-overlay", "void-blink"]);
  });

  it("returns empty newTrophies when no fresh boss kill", () => {
    const allSkillDefs = Object.values(PRIMAL_SKILLS) as PrimalSkillDef[];
    const same = makeStats([true, true, false, false, false]);
    const diff = diffUnlocks(same, same, POOL, allSkillDefs);
    expect(diff.newTrophies).toHaveLength(0);
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

});
