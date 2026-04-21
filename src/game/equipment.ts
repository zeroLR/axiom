// ── Equipment system ────────────────────────────────────────────────────────
// Manages the pre-run loadout. Players equip enhancement cards bought from the
// shop; these are applied to the avatar at the start of every run.

import type { EquipmentLoadout } from "./data/types";
import { EQUIP_EFFECTS, SHOP_ITEMS } from "./data/shop";
import { applyEffectToWorld, toRuntimeEquipEffect } from "./effectEngine";
import type { World, EntityId } from "./world";

/** Maximum copies of the same card that can be equipped simultaneously. */
export const MAX_SAME_CARD = 1;

/**
 * Equipment cards that map to draft/run cards and should count as Lv1 at run
 * start so duplicate draft picks can level them up.
 */
const EQUIPMENT_TO_RUN_CARD: Readonly<Record<string, string>> = {
  "eq-toughness": "plating",
  "eq-swiftness": "dash",
  "eq-sharpshot": "sharp",
  "eq-quickdraw": "rapid",
  "eq-longrange": "velocity",
  "eq-lucky": "crit",
  "eq-piercing": "pierce",
  "eq-multishot": "fork",
};

/** Resolve the corresponding run-card ID for an equipped card, if any. */
export function mapEquipmentToRunCardId(cardId: string): string | undefined {
  return EQUIPMENT_TO_RUN_CARD[cardId];
}

/**
 * Equipped cards with no run-card equivalent. These are still active and
 * should be shown in the run HUD.
 */
export function listUnmappedEquipmentCards(equipped: readonly string[]): readonly {
  id: string;
  name: string;
  glyph: string;
}[] {
  return equipped.flatMap((cardId) => {
    if (mapEquipmentToRunCardId(cardId)) return [];
    const shopCard = SHOP_ITEMS.find((item) => item.id === cardId && item.category === "equipCard");
    if (!shopCard) return [];
    return [{ id: shopCard.id, name: shopCard.name, glyph: shopCard.glyph }];
  });
}

/** Check if a card can be added to the loadout. */
export function canEquip(loadout: EquipmentLoadout, cardId: string): boolean {
  if (loadout.equipped.length >= loadout.maxSlots) return false;
  if (!loadout.ownedCards.includes(cardId)) return false;
  const count = loadout.equipped.filter((id) => id === cardId).length;
  return count < MAX_SAME_CARD;
}

/** Add a card to the equipped list (caller should check canEquip first). */
export function equipCard(loadout: EquipmentLoadout, cardId: string): void {
  if (!canEquip(loadout, cardId)) return;
  loadout.equipped.push(cardId);
}

/** Remove the first occurrence of a card from the equipped list. */
export function unequipCard(loadout: EquipmentLoadout, cardId: string): void {
  const idx = loadout.equipped.indexOf(cardId);
  if (idx >= 0) loadout.equipped.splice(idx, 1);
}

/** Apply all equipped cards to the avatar at run start. */
export function applyEquipment(loadout: EquipmentLoadout, world: World, avatarId: EntityId): void {
  for (const cardId of loadout.equipped) {
    const eff = EQUIP_EFFECTS[cardId];
    if (!eff) continue;
    applyEffectToWorld(toRuntimeEquipEffect(eff), world, avatarId);
  }
}
