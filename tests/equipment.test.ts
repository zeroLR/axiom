import { describe, expect, it } from "vitest";
import { defaultEquipmentLoadout } from "../src/game/data/types";
import {
  canEquip,
  equipCard,
  unequipCard,
  MAX_SAME_CARD,
  mapEquipmentToRunCardId,
  listUnmappedEquipmentCards,
} from "../src/game/equipment";
import { SHOP_ITEMS, EQUIP_EFFECTS } from "../src/game/data/shop";

describe("equipment system", () => {
  it("allows equipping owned cards up to slot limit", () => {
    const loadout = defaultEquipmentLoadout();
    loadout.ownedCards = ["eq-toughness", "eq-swiftness", "eq-sharpshot"];
    expect(canEquip(loadout, "eq-toughness")).toBe(true);
    equipCard(loadout, "eq-toughness");
    expect(loadout.equipped).toHaveLength(1);
    equipCard(loadout, "eq-swiftness");
    equipCard(loadout, "eq-sharpshot");
    expect(loadout.equipped).toHaveLength(3);
    // 4th card should fail (only 3 slots by default)
    expect(canEquip(loadout, "eq-toughness")).toBe(false);
  });

  it("rejects non-owned cards", () => {
    const loadout = defaultEquipmentLoadout();
    expect(canEquip(loadout, "eq-toughness")).toBe(false);
    equipCard(loadout, "eq-toughness");
    expect(loadout.equipped).toHaveLength(0);
  });

  it("limits same card to MAX_SAME_CARD copies", () => {
    const loadout = defaultEquipmentLoadout();
    loadout.maxSlots = 5;
    loadout.ownedCards = ["eq-toughness"];
    equipCard(loadout, "eq-toughness");
    equipCard(loadout, "eq-toughness");
    expect(loadout.equipped).toHaveLength(MAX_SAME_CARD);
    // Second copy is rejected when only one same card is allowed.
    expect(canEquip(loadout, "eq-toughness")).toBe(false);
  });

  it("unequip removes first occurrence", () => {
    const loadout = defaultEquipmentLoadout();
    loadout.ownedCards = ["eq-toughness", "eq-swiftness"];
    equipCard(loadout, "eq-toughness");
    equipCard(loadout, "eq-swiftness");
    expect(loadout.equipped).toHaveLength(2);
    unequipCard(loadout, "eq-toughness");
    expect(loadout.equipped).toEqual(["eq-swiftness"]);
  });

  it("has 10 equipment cards in shop", () => {
    const equipCards = SHOP_ITEMS.filter((i) => i.category === "equipCard");
    expect(equipCards).toHaveLength(10);
  });

  it("has 3 slot expansions in shop", () => {
    const slots = SHOP_ITEMS.filter((i) => i.category === "slotExpand");
    expect(slots).toHaveLength(3);
    expect(slots.map((s) => s.id)).toContain("slot-6");
  });

  it("all equipment cards have matching effects", () => {
    const equipCards = SHOP_ITEMS.filter((i) => i.category === "equipCard");
    for (const card of equipCards) {
      expect(EQUIP_EFFECTS[card.id]).toBeDefined();
    }
  });

  it("new equipment effects are properly defined", () => {
    expect(EQUIP_EFFECTS["eq-resilience"]).toEqual({ effectKind: "iframeAdd", effectValue: 0.3 });
    expect(EQUIP_EFFECTS["eq-magnet"]).toEqual({ effectKind: "pickupRadiusMul", effectValue: 1.2 });
    expect(EQUIP_EFFECTS["eq-piercing"]).toEqual({ effectKind: "pierceAdd", effectValue: 1 });
    expect(EQUIP_EFFECTS["eq-multishot"]).toEqual({ effectKind: "projectilesAdd", effectValue: 1 });
  });

  it("maps run-equivalent equipment cards to run card ids", () => {
    expect(mapEquipmentToRunCardId("eq-toughness")).toBe("plating");
    expect(mapEquipmentToRunCardId("eq-quickdraw")).toBe("rapid");
    expect(mapEquipmentToRunCardId("eq-piercing")).toBe("pierce");
  });

  it("returns unmapped equipment cards for HUD display", () => {
    const unmapped = listUnmappedEquipmentCards(["eq-sharpshot", "eq-resilience", "eq-magnet"]);
    expect(unmapped.map((c) => c.id)).toEqual(["eq-resilience", "eq-magnet"]);
  });
});
