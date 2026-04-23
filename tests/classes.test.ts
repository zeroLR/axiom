import { describe, expect, it } from "vitest";
import { CLASS_NODES, CLASS_LINEAGES, CHARACTER_SLOT_COSTS, MAX_CHARACTER_SLOTS, MAX_CLASS_TIER } from "../src/game/content/classes";
import { defaultPlayerProfile, defaultCharactersState } from "../src/game/data/types";
import {
  activeCharacterSlot,
  canCreateCharacterSlot,
  canPromoteClass,
  classPassiveBonuses,
  createCharacterSlot,
  getActiveNodeChain,
  lineageToStartingShape,
  promoteClass,
  resetCharacterClass,
  setActiveCharacterSlot,
  startingShapeToLineage,
  totalPromotionPointsSpent,
} from "../src/game/classes";

// ── Schema sanity ─────────────────────────────────────────────────────────────

describe("class schema", () => {
  it("all CLASS_LINEAGES have a corresponding starting shape", () => {
    for (const lineage of CLASS_LINEAGES) {
      expect(["triangle", "square", "diamond"]).toContain(lineage.startingShape);
    }
  });

  it("every T1+ node has a non-null promotionReq", () => {
    for (const node of Object.values(CLASS_NODES)) {
      if (node.tier === 0) {
        expect(node.promotionReq).toBeNull();
      } else {
        expect(node.promotionReq).not.toBeNull();
      }
    }
  });

  it("T2 nodes require stageClear 1 (jets fragment)", () => {
    for (const node of Object.values(CLASS_NODES)) {
      if (node.tier === 2) {
        expect(node.promotionReq?.stageClear).toBe(1);
        expect(node.promotionReq?.fragmentId).toBe("boss-jets");
      }
    }
  });

  it("T3 nodes require stageClear 2 (mirror fragment)", () => {
    for (const node of Object.values(CLASS_NODES)) {
      if (node.tier === 3) {
        expect(node.promotionReq?.stageClear).toBe(2);
        expect(node.promotionReq?.fragmentId).toBe("boss-mirror");
      }
    }
  });

  it("each lineage has exactly 8 nodes (T0, T1, T2×2, T3×4)", () => {
    for (const lineage of CLASS_LINEAGES) {
      const nodes = Object.values(CLASS_NODES).filter((n) => n.lineage === lineage.id);
      expect(nodes).toHaveLength(8);
    }
  });
});

// ── Shape / lineage mapping ───────────────────────────────────────────────────

describe("lineage / startingShape mapping", () => {
  it("lineageToStartingShape covers all lineages", () => {
    expect(lineageToStartingShape("axis")).toBe("triangle");
    expect(lineageToStartingShape("wing")).toBe("square");
    expect(lineageToStartingShape("mirror")).toBe("diamond");
  });

  it("startingShapeToLineage is the inverse", () => {
    expect(startingShapeToLineage("triangle")).toBe("axis");
    expect(startingShapeToLineage("square")).toBe("wing");
    expect(startingShapeToLineage("diamond")).toBe("mirror");
  });
});

// ── Default state ─────────────────────────────────────────────────────────────

describe("defaultCharactersState", () => {
  it("starts with one slot at tier 0 (axis lineage)", () => {
    const state = defaultCharactersState();
    expect(state.slots).toHaveLength(1);
    expect(state.slots[0]!.lineage).toBe("axis");
    expect(state.slots[0]!.tier).toBe(0);
    expect(state.maxSlots).toBe(1);
  });

  it("activeSlotId matches the single slot id", () => {
    const state = defaultCharactersState();
    expect(state.activeSlotId).toBe(state.slots[0]!.id);
  });
});

// ── Node chain ────────────────────────────────────────────────────────────────

describe("getActiveNodeChain", () => {
  it("returns just T0 for a tier-0 slot", () => {
    const state = defaultCharactersState();
    const slot = state.slots[0]!;
    expect(getActiveNodeChain(slot)).toEqual(["axis-t0"]);
  });

  it("returns T0+T1 for tier 1", () => {
    const slot = { ...defaultCharactersState().slots[0]!, tier: 1 };
    expect(getActiveNodeChain(slot)).toEqual(["axis-t0", "axis-t1"]);
  });

  it("follows branchPath for T2", () => {
    const slotA = { ...defaultCharactersState().slots[0]!, tier: 2, branchPath: [0] };
    expect(getActiveNodeChain(slotA)).toContain("axis-t2a");
    expect(getActiveNodeChain(slotA)).not.toContain("axis-t2b");

    const slotB = { ...defaultCharactersState().slots[0]!, tier: 2, branchPath: [1] };
    expect(getActiveNodeChain(slotB)).toContain("axis-t2b");
  });

  it("follows branchPath for T3", () => {
    const slot = { ...defaultCharactersState().slots[0]!, tier: 3, branchPath: [1, 0] };
    // T2 = branch b, T3 = branch a → axis-t3ba
    expect(getActiveNodeChain(slot)).toContain("axis-t3ba");
    expect(getActiveNodeChain(slot)).not.toContain("axis-t3aa");
  });
});

// ── Class passive bonuses ─────────────────────────────────────────────────────

describe("classPassiveBonuses", () => {
  it("returns zero / default-1 bonuses for tier-0 axis slot", () => {
    const profile = defaultPlayerProfile();
    // axis-t0 gives damageAdd +1
    const bonuses = classPassiveBonuses(profile.characters);
    expect(bonuses.damageAdd).toBe(1);
    expect(bonuses.critAdd).toBe(0);
    expect(bonuses.periodMul).toBe(1);  // no fire-rate change
    expect(bonuses.speedMul).toBe(1);   // no speed change
  });

  it("wing-t0 applies periodMul (multiplicative)", () => {
    const profile = defaultPlayerProfile();
    profile.characters.slots[0]!.lineage = "wing";
    const bonuses = classPassiveBonuses(profile.characters);
    // wing-t0 passives: periodMul 0.95
    expect(bonuses.periodMul).toBeCloseTo(0.95);
    expect(bonuses.projectilesAdd).toBe(0); // no T1 yet
  });

  it("mirror-t0 gives maxHpAdd", () => {
    const profile = defaultPlayerProfile();
    profile.characters.slots[0]!.lineage = "mirror";
    const bonuses = classPassiveBonuses(profile.characters);
    expect(bonuses.maxHpAdd).toBe(2);
  });

  it("accumulates from T0 through T2", () => {
    const profile = defaultPlayerProfile();
    const slot = profile.characters.slots[0]!;
    slot.lineage = "axis";
    slot.tier = 2;
    slot.branchPath = [0]; // T2-A (Precision Protocol: critAdd +0.08)
    const bonuses = classPassiveBonuses(profile.characters);
    // T0: damageAdd +1, T1: critAdd +0.05, T2A: critAdd +0.08
    expect(bonuses.damageAdd).toBe(1);
    expect(bonuses.critAdd).toBeCloseTo(0.13);
  });

  it("multiplies periodMul values across tiers for WING", () => {
    const profile = defaultPlayerProfile();
    const slot = profile.characters.slots[0]!;
    slot.lineage = "wing";
    slot.tier = 2;
    slot.branchPath = [0]; // T2-A (periodMul 0.92)
    const bonuses = classPassiveBonuses(profile.characters);
    // T0: 0.95, T2A: 0.92 → product 0.95 * 0.92 ≈ 0.874
    expect(bonuses.periodMul).toBeCloseTo(0.95 * 0.92);
  });

  it("economy passives (pointRewardMul) only present at MIRROR T2B", () => {
    const profile = defaultPlayerProfile();
    const slot = profile.characters.slots[0]!;
    slot.lineage = "mirror";
    slot.tier = 2;
    slot.branchPath = [1]; // T2-B (Salvage Engine: pointRewardMul +0.08)
    const bonuses = classPassiveBonuses(profile.characters);
    expect(bonuses.pointRewardMul).toBeCloseTo(0.08);
    expect(bonuses.fragmentRewardMul).toBe(0);
  });
});

// ── Promotion ─────────────────────────────────────────────────────────────────

describe("promoteClass", () => {
  function richProfile() {
    const profile = defaultPlayerProfile();
    profile.points = 99999;
    profile.fragments.boss = 9999;
    profile.fragments.detailed["boss-orthogon"] = 9999;
    profile.fragments.detailed["boss-jets"] = 9999;
    profile.fragments.detailed["boss-mirror"] = 9999;
    profile.stats.normalCleared = [true, true, true, true, true];
    return profile;
  }

  it("promotes axis slot from T0 to T1 consuming points + fragments", () => {
    const profile = richProfile();
    const slotId = profile.characters.slots[0]!.id;
    const prevPoints = profile.points;
    const prevFragments = profile.fragments.detailed["boss-orthogon"]!;

    const result = promoteClass(profile, slotId, 0);

    expect(result.ok).toBe(true);
    expect(profile.characters.slots[0]!.tier).toBe(1);
    expect(profile.points).toBe(prevPoints - 200); // T1 pointCost
    expect(profile.fragments.detailed["boss-orthogon"]).toBe(prevFragments - 3); // fragmentCost
  });

  it("blocks promotion when not enough points", () => {
    const profile = richProfile();
    profile.points = 0;
    const result = canPromoteClass(profile, profile.characters.slots[0]!.id, 0);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("points");
  });

  it("blocks promotion when stage not cleared", () => {
    const profile = richProfile();
    profile.stats.normalCleared[0] = false;
    const result = canPromoteClass(profile, profile.characters.slots[0]!.id, 0);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Stage");
  });

  it("blocks promotion above MAX_CLASS_TIER", () => {
    const profile = richProfile();
    const slot = profile.characters.slots[0]!;
    slot.tier = MAX_CLASS_TIER;
    slot.branchPath = [0, 0];
    const result = canPromoteClass(profile, slot.id, 0);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("maximum tier");
  });

  it("records branch choice in branchPath during T2 promotion", () => {
    const profile = richProfile();
    const slotId = profile.characters.slots[0]!.id;
    // Promote to T1 first
    promoteClass(profile, slotId, 0);
    // Promote to T2 branch B
    const result = promoteClass(profile, slotId, 1);
    expect(result.ok).toBe(true);
    expect(profile.characters.slots[0]!.tier).toBe(2);
    expect(profile.characters.slots[0]!.branchPath[0]).toBe(1); // branch B recorded
  });

  it("blocks promotion with unknown slotId", () => {
    const profile = richProfile();
    const result = canPromoteClass(profile, "nonexistent-id", 0);
    expect(result.ok).toBe(false);
  });
});

// ── Reset ─────────────────────────────────────────────────────────────────────

describe("resetCharacterClass", () => {
  it("refunds spent points and resets tier to 0", () => {
    const profile = defaultPlayerProfile();
    profile.points = 99999;
    profile.fragments.boss = 9999;
    profile.fragments.detailed["boss-orthogon"] = 9999;
    profile.stats.normalCleared = [true, true, true, true, true];

    const slotId = profile.characters.slots[0]!.id;
    promoteClass(profile, slotId, 0); // T1 costs 200 pts
    const pointsAfterPromotion = profile.points;
    const spent = totalPromotionPointsSpent(profile.characters.slots[0]!);

    const result = resetCharacterClass(profile, slotId);

    expect(result.ok).toBe(true);
    expect(profile.characters.slots[0]!.tier).toBe(0);
    expect(profile.characters.slots[0]!.branchPath).toEqual([]);
    expect(profile.points).toBe(pointsAfterPromotion + spent);
  });

  it("fragments are NOT refunded on reset", () => {
    const profile = defaultPlayerProfile();
    profile.points = 99999;
    profile.fragments.boss = 9999;
    profile.fragments.detailed["boss-orthogon"] = 9999;
    profile.stats.normalCleared[0] = true;

    const slotId = profile.characters.slots[0]!.id;
    promoteClass(profile, slotId, 0);
    const fragmentsAfterPromotion = profile.fragments.detailed["boss-orthogon"]!;

    resetCharacterClass(profile, slotId);

    expect(profile.fragments.detailed["boss-orthogon"]).toBe(fragmentsAfterPromotion);
  });

  it("refuses to reset a tier-0 slot", () => {
    const profile = defaultPlayerProfile();
    const result = resetCharacterClass(profile, profile.characters.slots[0]!.id);
    expect(result.ok).toBe(false);
  });
});

// ── Character slot creation ───────────────────────────────────────────────────

describe("createCharacterSlot", () => {
  it("second slot costs CHARACTER_SLOT_COSTS[1] points", () => {
    const profile = defaultPlayerProfile();
    profile.points = 99999;
    const prevPoints = profile.points;
    const cost = CHARACTER_SLOT_COSTS[1]!;

    const result = createCharacterSlot(profile, "wing");

    expect(result.ok).toBe(true);
    expect(profile.characters.slots).toHaveLength(2);
    expect(profile.characters.slots[1]!.lineage).toBe("wing");
    expect(profile.points).toBe(prevPoints - cost);
  });

  it("cannot create more than MAX_CHARACTER_SLOTS slots", () => {
    const profile = defaultPlayerProfile();
    profile.points = 99999999;
    for (let i = 1; i < MAX_CHARACTER_SLOTS; i++) {
      createCharacterSlot(profile, "axis");
    }
    const result = canCreateCharacterSlot(profile);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Maximum");
  });

  it("blocks creation when not enough points", () => {
    const profile = defaultPlayerProfile();
    profile.points = 0;
    const result = canCreateCharacterSlot(profile);
    // Slot 1 is free; trying to create slot 2 would cost 300
    // profile already has 1 slot, so cost = CHARACTER_SLOT_COSTS[1] = 300
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("points");
  });
});

// ── Active slot ───────────────────────────────────────────────────────────────

describe("activeCharacterSlot & setActiveCharacterSlot", () => {
  it("returns the slot matching activeSlotId", () => {
    const profile = defaultPlayerProfile();
    profile.points = 99999;
    createCharacterSlot(profile, "mirror");
    const newSlotId = profile.characters.slots[1]!.id;

    setActiveCharacterSlot(profile.characters, newSlotId);

    expect(activeCharacterSlot(profile.characters)?.id).toBe(newSlotId);
    expect(activeCharacterSlot(profile.characters)?.lineage).toBe("mirror");
  });

  it("returns false for unknown slotId", () => {
    const profile = defaultPlayerProfile();
    const ok = setActiveCharacterSlot(profile.characters, "does-not-exist");
    expect(ok).toBe(false);
  });
});
