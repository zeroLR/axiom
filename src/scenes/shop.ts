import { Container } from "pixi.js";
import type { Scene } from "./scene";
import { SHOP_ITEMS, type ShopItem } from "../game/data/shop";
import type { PlayerProfile, EquipmentLoadout, ShopUnlocks } from "../game/data/types";
import { iconSkins, iconEnhance, iconSpan, SHOP_GLYPHS, setIconHtml } from "../icons";
import { openOverlay, closeOverlay, createOverlayTitle, createOverlaySub, createBodyScroll, createCardList, createBackButton } from "./ui";

// ── Shop scene (DOM overlay) ────────────────────────────────────────────────

export interface ShopCallbacks {
  getProfile: () => PlayerProfile;
  getEquipment: () => EquipmentLoadout;
  getShopUnlocks: () => ShopUnlocks;
  onPurchase: (item: ShopItem) => void;
  onBack: () => void;
}

type ShopTab = "skin" | "enhance";

export class ShopScene implements Scene {
  readonly root: Container;
  private readonly cb: ShopCallbacks;
  private activeTab: ShopTab = "skin";

  constructor(cb: ShopCallbacks) {
    this.root = new Container();
    this.cb = cb;
  }

  enter(): void {
    const { inner, content } = openOverlay({ constrained: true });

    content.appendChild(createOverlayTitle("shop"));

    const pointsEl = createOverlaySub("");
    pointsEl.id = "shop-points";
    this.refreshPoints(pointsEl);
    content.appendChild(pointsEl);

    // Tab row
    const tabRow = document.createElement("div");
    tabRow.className = "tab-row";
    const skinTab = this.createTab(iconSkins, "Skins", "skin", tabRow);
    const enhTab = this.createTab(iconEnhance, "Enhance", "enhance", tabRow);
    if (this.activeTab === "skin") skinTab.classList.add("tab-active");
    else enhTab.classList.add("tab-active");
    content.appendChild(tabRow);

    const body = createBodyScroll();
    content.appendChild(body);

    // Item list (filtered by tab)
    const list = createCardList();

    const filteredItems = SHOP_ITEMS.filter((item) => {
      if (this.activeTab === "skin") return item.category === "skin";
      return item.category === "equipCard" || item.category === "slotExpand";
    });

    for (const item of filteredItems) {
      const profile = this.cb.getProfile();
      const purchased = this.isPurchased(item);
      const canAfford = profile.points >= item.price;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card-btn";
      if (purchased) btn.style.opacity = "0.5";

      const glyph = document.createElement("span");
      glyph.className = "card-glyph";
      const svgGlyph = SHOP_GLYPHS[item.id];
      if (svgGlyph) setIconHtml(glyph, svgGlyph);
      else glyph.textContent = item.glyph;
      btn.appendChild(glyph);

      const body = document.createElement("span");
      body.className = "card-body";
      const name = document.createElement("span");
      name.className = "card-name";
      name.textContent = `${item.name} — ${item.price}pts`;
      const desc = document.createElement("span");
      desc.className = "card-text";
      desc.textContent = purchased ? "owned" : item.description;
      body.appendChild(name);
      body.appendChild(desc);
      btn.appendChild(body);

      if (!purchased && canAfford) {
        btn.addEventListener("click", () => {
          this.cb.onPurchase(item);
          // Re-render
          this.enter();
        });
      } else {
        btn.disabled = true;
      }

      list.appendChild(btn);
    }
    body.appendChild(list);

    inner.appendChild(createBackButton(() => this.cb.onBack()));
  }

  exit(): void {
    closeOverlay({ constrained: true });
  }

  update(_dt: number): void {}
  render(_alpha: number): void {}

  private createTab(icon: string, label: string, tab: ShopTab, parent: HTMLElement): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab-btn";
    btn.appendChild(iconSpan(icon));
    btn.append(` ${label}`);
    btn.addEventListener("click", () => {
      this.activeTab = tab;
      this.enter();
    });
    parent.appendChild(btn);
    return btn;
  }

  private refreshPoints(el: HTMLElement): void {
    el.textContent = `points: ${this.cb.getProfile().points}`;
  }

  private isPurchased(item: ShopItem): boolean {
    const profile = this.cb.getProfile();
    if (item.category === "skin") return profile.ownedSkins.includes(item.id);
    const shopUnlocks = this.cb.getShopUnlocks();
    return shopUnlocks.purchased.includes(item.id);
  }
}
