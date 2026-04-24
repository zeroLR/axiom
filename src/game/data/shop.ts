// ── Shop item catalogue ─────────────────────────────────────────────────────
// All purchasable items live here. The shop scene reads this, the purchase
// logic deducts points and writes to IndexedDB via storage.ts.

export type ShopCategory = "skin";

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
];
