import type { EquipEffect } from "../effectEngine";

// ── Shop item catalogue ─────────────────────────────────────────────────────
// All purchasable items live here. The shop scene reads this, the purchase
// logic deducts points and writes to IndexedDB via storage.ts.

export type ShopCategory = "skin" | "equipCard" | "slotExpand";

export interface ShopItem {
  id: string;
  category: ShopCategory;
  name: string;
  glyph: string;
  description: string;
  price: number;
}

export const SHOP_ITEMS: readonly ShopItem[] = [
  // ── Skins (cosmetic) ──
  { id: "skin-square",   category: "skin", name: "Square Form",     glyph: "□", description: "Play as a square.",     price: 200 },
  { id: "skin-diamond",  category: "skin", name: "Diamond Form",    glyph: "◇", description: "Play as a diamond.",    price: 300 },
  { id: "skin-hexagon",  category: "skin", name: "Hexagon Form",    glyph: "⬡", description: "Play as a hexagon.",    price: 500 },
  { id: "skin-star",     category: "skin", name: "Star Form",       glyph: "★", description: "Play as a star.",       price: 400 },
  { id: "skin-boss",     category: "skin", name: "Boss Form",       glyph: "⬢", description: "Play as a boss shape.", price: 1000 },

  // ── Equipment cards (passive buffs) ──
  { id: "eq-toughness",  category: "equipCard", name: "Toughness",      glyph: "▣", description: "+1 max HP at run start.",           price: 150 },
  { id: "eq-swiftness",  category: "equipCard", name: "Swiftness",      glyph: "»", description: "+10% move speed at run start.",     price: 150 },
  { id: "eq-sharpshot",  category: "equipCard", name: "Sharp Shot",     glyph: "▲", description: "+1 base damage at run start.",      price: 200 },
  { id: "eq-quickdraw",  category: "equipCard", name: "Quick Draw",     glyph: "⏩", description: "-10% fire interval at run start.", price: 200 },
  { id: "eq-longrange",  category: "equipCard", name: "Long Range",     glyph: "↗", description: "+15% projectile speed.",           price: 180 },
  { id: "eq-lucky",      category: "equipCard", name: "Lucky Strike",   glyph: "♦", description: "+10% crit chance.",                 price: 250 },
  { id: "eq-resilience", category: "equipCard", name: "Resilience",     glyph: "✚", description: "+0.3s invincibility after hit.",    price: 220 },
  { id: "eq-magnet",     category: "equipCard", name: "Magnet",         glyph: "⊕", description: "+20% pickup radius.",              price: 180 },
  { id: "eq-piercing",   category: "equipCard", name: "Piercing Shot",  glyph: "⟐", description: "+1 pierce at run start.",          price: 250 },
  { id: "eq-multishot",  category: "equipCard", name: "Multi Shot",     glyph: "⋮", description: "+1 projectile at run start.",       price: 300 },

  // ── Slot expansions ──
  { id: "slot-4",  category: "slotExpand", name: "4th Slot", glyph: "④", description: "Unlock equipment slot 4.", price: 500 },
  { id: "slot-5",  category: "slotExpand", name: "5th Slot", glyph: "⑤", description: "Unlock equipment slot 5.", price: 1200 },
  { id: "slot-6",  category: "slotExpand", name: "6th Slot", glyph: "⑥", description: "Unlock equipment slot 6.", price: 2500 },
];

/** Equipment card effect definitions — maps eq-card ID → effect. */
export const EQUIP_EFFECTS: Record<string, EquipEffect> = {
  "eq-toughness":  { effectKind: "maxHpAdd",            effectValue: 1 },
  "eq-swiftness":  { effectKind: "speedMul",            effectValue: 1.1 },
  "eq-sharpshot":  { effectKind: "damageAdd",           effectValue: 1 },
  "eq-quickdraw":  { effectKind: "periodMul",           effectValue: 0.9 },
  "eq-longrange":  { effectKind: "projectileSpeedMul",  effectValue: 1.15 },
  "eq-lucky":      { effectKind: "critAdd",             effectValue: 0.1 },
  "eq-resilience": { effectKind: "iframeAdd",           effectValue: 0.3 },
  "eq-magnet":     { effectKind: "pickupRadiusMul",     effectValue: 1.2 },
  "eq-piercing":   { effectKind: "pierceAdd",           effectValue: 1 },
  "eq-multishot":  { effectKind: "projectilesAdd",      effectValue: 1 },
};
