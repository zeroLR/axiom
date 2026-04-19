// ── Equipment system ────────────────────────────────────────────────────────
// Manages the pre-run loadout. Players equip enhancement cards bought from the
// shop; these are applied to the avatar at the start of every run.

import type { EquipmentLoadout } from "./data/types";
import { EQUIP_EFFECTS, SHOP_ITEMS } from "./data/shop";
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
  const c = world.get(avatarId);
  if (!c || !c.avatar || !c.weapon) return;

  for (const cardId of loadout.equipped) {
    const eff = EQUIP_EFFECTS[cardId];
    if (!eff) continue;

    switch (eff.effectKind) {
      case "damageAdd":
        c.weapon.damage += eff.effectValue;
        break;
      case "periodMul":
        c.weapon.period = Math.max(0.05, c.weapon.period * eff.effectValue);
        break;
      case "projectileSpeedMul":
        c.weapon.projectileSpeed *= eff.effectValue;
        break;
      case "pierceAdd":
        c.weapon.pierce += eff.effectValue;
        break;
      case "critAdd":
        c.weapon.crit = Math.min(1, c.weapon.crit + eff.effectValue);
        break;
      case "maxHpAdd":
        c.avatar.maxHp += eff.effectValue;
        c.avatar.hp = Math.min(c.avatar.maxHp, c.avatar.hp + eff.effectValue);
        break;
      case "speedMul":
        c.avatar.speedMul *= eff.effectValue;
        break;
      case "projectilesAdd":
        c.weapon.projectiles += eff.effectValue;
        break;
      case "iframeAdd":
        // Stored on avatar; consumed by collision system.
        c.avatar.iframeBonus = (c.avatar.iframeBonus ?? 0) + eff.effectValue;
        break;
      case "pickupRadiusMul":
        // Stored on avatar; consumed by pickup system if present.
        c.avatar.pickupRadiusMul = (c.avatar.pickupRadiusMul ?? 1) * eff.effectValue;
        break;
    }
  }
}
