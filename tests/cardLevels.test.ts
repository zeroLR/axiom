import { describe, expect, it } from "vitest";
import {
  CardInventory,
  MAX_CARD_LEVEL,
  levelBonusFraction,
  isLevelableEffect,
} from "../src/game/cardLevels";
import { applyCard, applyCardLevelUp, POOL, type Card } from "../src/game/cards";
import { spawnAvatar } from "../src/game/entities";
import { World } from "../src/game/world";

const cardById = (id: string): Card => {
  const found = POOL.find((c) => c.id === id);
  if (!found) throw new Error(`no card '${id}'`);
  return found;
};

describe("CardInventory", () => {
  it("adds a card at level 1", () => {
    const inv = new CardInventory();
    const entry = inv.add(cardById("sharp"));
    expect(entry.level).toBe(1);
    expect(inv.has("sharp")).toBe(true);
    expect(inv.size).toBe(1);
  });

  it("levels up an existing card", () => {
    const inv = new CardInventory();
    inv.add(cardById("sharp"));
    const newLv = inv.levelUp("sharp");
    expect(newLv).toBe(2);
    expect(inv.get("sharp")!.level).toBe(2);
  });

  it("stops levelling at MAX_CARD_LEVEL", () => {
    const inv = new CardInventory();
    inv.add(cardById("sharp"));
    for (let i = 1; i < MAX_CARD_LEVEL; i++) inv.levelUp("sharp");
    expect(inv.get("sharp")!.level).toBe(MAX_CARD_LEVEL);
    expect(inv.levelUp("sharp")).toBe(0);
    expect(inv.canLevelUp("sharp")).toBe(false);
  });

  it("levelUp returns 0 for unknown cards", () => {
    const inv = new CardInventory();
    expect(inv.levelUp("nonexistent")).toBe(0);
  });

  it("clear resets everything", () => {
    const inv = new CardInventory();
    inv.add(cardById("sharp"));
    inv.add(cardById("rapid"));
    inv.clear();
    expect(inv.size).toBe(0);
    expect(inv.has("sharp")).toBe(false);
  });

  it("merges duplicate abilities across different card ids", () => {
    const inv = new CardInventory();
    inv.add(cardById("heavy")); // +2 damage (rare)
    expect(inv.size).toBe(1);
    expect(inv.has("heavy")).toBe(true);
    expect(inv.has("axisLock")).toBe(false);

    // axisLock has the same levelable effect as heavy.
    const newLv = inv.levelUpForCard(cardById("axisLock"));
    expect(newLv).toBe(2);
    expect(inv.size).toBe(1);
    expect(inv.has("axisLock")).toBe(true);
    expect(inv.get("heavy")?.rarity).toBe("uncommon");
  });
});

describe("levelBonusFraction", () => {
  it("returns 1.0 for level 1 (first pick)", () => {
    expect(levelBonusFraction(1)).toBe(1.0);
  });

  it("returns diminishing fractions for higher levels", () => {
    const fracs = [1, 2, 3, 4, 5].map(levelBonusFraction);
    for (let i = 1; i < fracs.length; i++) {
      expect(fracs[i]).toBeLessThan(fracs[i - 1]!);
    }
  });

  it("returns 0 for level < 1", () => {
    expect(levelBonusFraction(0)).toBe(0);
    expect(levelBonusFraction(-1)).toBe(0);
  });
});

describe("isLevelableEffect", () => {
  it("stat modifiers are levelable", () => {
    expect(isLevelableEffect(cardById("sharp").effect)).toBe(true);
    expect(isLevelableEffect(cardById("rapid").effect)).toBe(true);
    expect(isLevelableEffect(cardById("velocity").effect)).toBe(true);
    expect(isLevelableEffect(cardById("fork").effect)).toBe(true);
    expect(isLevelableEffect(cardById("crit").effect)).toBe(true);
    expect(isLevelableEffect(cardById("plating").effect)).toBe(true);
    expect(isLevelableEffect(cardById("dash").effect)).toBe(true);
  });

  it("synergy / evolution / weapon cards are NOT levelable", () => {
    expect(isLevelableEffect(cardById("combustion").effect)).toBe(false);
    expect(isLevelableEffect(cardById("aegis").effect)).toBe(false);
    expect(isLevelableEffect(cardById("revenant").effect)).toBe(false);
    expect(isLevelableEffect(cardById("wpnFaceBeam").effect)).toBe(false);
  });
});

describe("applyCardLevelUp", () => {
  it("increases damage with diminishing returns", () => {
    const world = new World();
    const id = spawnAvatar(world);
    const card = cardById("sharp"); // +1 damage
    applyCard(world, id, card); // level 1: +1
    const afterLv1 = world.get(id)!.weapon!.damage;

    applyCardLevelUp(world, id, card, 2); // +1 * 0.7 → rounds to 1
    const afterLv2 = world.get(id)!.weapon!.damage;
    expect(afterLv2).toBeGreaterThan(afterLv1);

    applyCardLevelUp(world, id, card, 3); // +1 * 0.5 → rounds to 1
    const afterLv3 = world.get(id)!.weapon!.damage;
    expect(afterLv3).toBeGreaterThan(afterLv2);
  });

  it("reduces fire period via additive scaling (not multiplicative)", () => {
    const world = new World();
    const id = spawnAvatar(world);
    const card = cardById("rapid"); // periodMul 0.8
    applyCard(world, id, card);
    const afterLv1 = world.get(id)!.weapon!.period;

    applyCardLevelUp(world, id, card, 2);
    const afterLv2 = world.get(id)!.weapon!.period;
    expect(afterLv2).toBeLessThan(afterLv1);

    // Period should never go below floor
    for (let lv = 3; lv <= MAX_CARD_LEVEL; lv++) {
      applyCardLevelUp(world, id, card, lv);
    }
    expect(world.get(id)!.weapon!.period).toBeGreaterThanOrEqual(0.05);
  });

  it("does not apply to non-levelable effects", () => {
    const world = new World();
    const id = spawnAvatar(world);
    const card = cardById("combustion"); // synergy
    applyCard(world, id, card);
    const synergyCount = world.get(id)!.avatar!.synergies!.length;
    applyCardLevelUp(world, id, card, 2);
    // Should not add another synergy instance
    expect(world.get(id)!.avatar!.synergies!.length).toBe(synergyCount);
  });

  it("increases max HP with diminishing returns", () => {
    const world = new World();
    const id = spawnAvatar(world);
    const card = cardById("plating"); // +1 maxHp
    applyCard(world, id, card);
    const afterLv1 = world.get(id)!.avatar!.maxHp;

    applyCardLevelUp(world, id, card, 2);
    const afterLv2 = world.get(id)!.avatar!.maxHp;
    expect(afterLv2).toBeGreaterThan(afterLv1);
  });

  it("heavy rounds (+2 damage) diminishes correctly at higher levels", () => {
    const world = new World();
    const id = spawnAvatar(world);
    const card = cardById("heavy"); // +2 damage
    applyCard(world, id, card); // level 1: full +2
    const afterLv1 = world.get(id)!.weapon!.damage;

    applyCardLevelUp(world, id, card, 2);
    const afterLv2 = world.get(id)!.weapon!.damage;
    expect(afterLv2).toBe(afterLv1 + Math.max(1, Math.round(2 * levelBonusFraction(2))));
  });
});
