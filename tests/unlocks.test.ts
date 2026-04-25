import { describe, it, expect } from "vitest";
import {
  bossToStageIndex,
  bossToStageId,
  isActFullyCleared,
  isActTrialsCleared,
  isActUnlocked,
  isBossDefeated,
  isCardUnlocked,
  isStageCleared,
  isStageUnlocked,
  filterUnlockedCards,
  diffUnlocks,
} from "../src/game/unlocks";
import { ACTS } from "../src/game/content/acts";
import { POOL, type Card } from "../src/game/cards";
import { PRIMAL_SKILLS, type PrimalSkillDef } from "../src/game/skills";
import { defaultEnemyKills, type PlayerStats } from "../src/game/data/types";

function makeStats(normalCleared: boolean[]): PlayerStats {
  // Mirror the legacy positional flags into the stageId-keyed map so
  // current-API helpers (isStageCleared / isActUnlocked / etc.) see the same
  // truth as `isBossDefeated` did historically. Test fixtures may pass arrays
  // of any length; map only the indices that exist in STAGE_CONFIGS.
  const clearedStages: Record<string, boolean> = {};
  const STAGE_IDS = ["stage1", "stage2", "stage3", "stage4", "stage5"];
  STAGE_IDS.forEach((id, i) => {
    if (normalCleared[i] === true) clearedStages[id] = true;
  });
  return {
    totalRuns: 0,
    totalKills: 0,
    totalBossKills: 0,
    enemyKills: defaultEnemyKills(),
    bestSurvivalWave: 0,
    normalCleared,
    clearedStages,
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

  // ── Acts / stageId map ──────────────────────────────────────────────────

  it("bossToStageId returns canonical stageIds", () => {
    expect(bossToStageId("orthogon")).toBe("stage1");
    expect(bossToStageId("jets")).toBe("stage2");
    expect(bossToStageId("mirror")).toBe("stage3");
    expect(bossToStageId("lattice")).toBe("stage4");
    expect(bossToStageId("rift")).toBe("stage5");
  });

  it("isStageCleared reads stageId map", () => {
    const stats = makeStats([true, false, true, false, false]);
    expect(isStageCleared("stage1", stats)).toBe(true);
    expect(isStageCleared("stage2", stats)).toBe(false);
    expect(isStageCleared("stage3", stats)).toBe(true);
  });

  it("isActUnlocked: FORM is always unlocked, DECAY needs FORM cleared", () => {
    const empty = makeStats([false, false, false, false, false]);
    expect(isActUnlocked("form", empty)).toBe(true);
    expect(isActUnlocked("decay", empty)).toBe(false);

    const trialsOnly = makeStats([true, true, false, false, false]);
    // Form trials cleared but gate not — DECAY still locked.
    expect(isActTrialsCleared(ACTS[0]!, trialsOnly)).toBe(true);
    expect(isActFullyCleared(ACTS[0]!, trialsOnly)).toBe(false);
    expect(isActUnlocked("decay", trialsOnly)).toBe(false);

    const formDone = makeStats([true, true, true, false, false]);
    expect(isActFullyCleared(ACTS[0]!, formDone)).toBe(true);
    expect(isActUnlocked("decay", formDone)).toBe(true);
  });

  it("isStageUnlocked: trials in any order, gate after all trials", () => {
    const empty = makeStats([false, false, false, false, false]);
    // FORM trials available immediately
    expect(isStageUnlocked("stage1", empty)).toBe(true);
    expect(isStageUnlocked("stage2", empty)).toBe(true);
    // FORM gate locked until trials cleared
    expect(isStageUnlocked("stage3", empty)).toBe(false);
    // DECAY locked entirely
    expect(isStageUnlocked("stage4", empty)).toBe(false);

    const trialsCleared = makeStats([true, true, false, false, false]);
    expect(isStageUnlocked("stage3", trialsCleared)).toBe(true);
    expect(isStageUnlocked("stage4", trialsCleared)).toBe(false);

    const formDone = makeStats([true, true, true, false, false]);
    expect(isStageUnlocked("stage4", formDone)).toBe(true);
    expect(isStageUnlocked("stage5", formDone)).toBe(true);
  });

  it("isStageUnlocked allows clearing trials in reverse order", () => {
    // Clear stage2 first, then stage1 — both should be selectable, gate opens
    // only after both are cleared.
    const stage2First = makeStats([false, true, false, false, false]);
    expect(isStageUnlocked("stage1", stage2First)).toBe(true);
    expect(isStageUnlocked("stage2", stage2First)).toBe(true);
    expect(isStageUnlocked("stage3", stage2First)).toBe(false);

    const both = makeStats([true, true, false, false, false]);
    expect(isStageUnlocked("stage3", both)).toBe(true);
  });

  it("isBossDefeated still reads cleared state via the new map", () => {
    const partial = makeStats([true, false, true, false, false]);
    expect(isBossDefeated("orthogon", partial)).toBe(true);
    expect(isBossDefeated("jets", partial)).toBe(false);
    expect(isBossDefeated("mirror", partial)).toBe(true);
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
