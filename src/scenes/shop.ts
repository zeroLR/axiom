import { Container } from "pixi.js";
import type { Scene } from "./scene";
import { SHOP_ITEMS, type ShopItem } from "../game/data/shop";
import type { EnemyKind } from "../game/world";
import type { PlayerProfile, EquipmentLoadout, ShopUnlocks } from "../game/data/types";
import {
  FRAGMENT_META,
  type FragmentId,
} from "../game/fragments";
import {
  iconSkins,
  iconEnhance,
  iconShop,
  iconSpan,
  SHOP_GLYPHS,
  FRAGMENT_GLYPHS,
  setIconHtml,
} from "../icons";
import { openOverlay, closeOverlay, createOverlayTitle, createOverlaySub, createBodyScroll, createCardList, createBackButton } from "./ui";

export interface ShopCallbacks {
  getProfile: () => PlayerProfile;
  getEquipment: () => EquipmentLoadout;
  getShopUnlocks: () => ShopUnlocks;
  getEnemyKillCount: (kind: EnemyKind) => number;
  onPurchase: (item: ShopItem) => void;
  onBuyFragment: (id: FragmentId, price: number) => void;
  onSellFragment: (id: FragmentId, gain: number) => void;
  onBack: () => void;
}

type ShopTab = "skin" | "enhance" | "fragments";

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

    const tabRow = document.createElement("div");
    tabRow.className = "tab-row";
    const skinTab = this.createTab(iconSkins, "Skins", "skin", tabRow);
    const enhTab = this.createTab(iconEnhance, "Enhance", "enhance", tabRow);
    const fragTab = this.createTab(iconShop, "Fragments", "fragments", tabRow);
    if (this.activeTab === "skin") skinTab.classList.add("tab-active");
    else if (this.activeTab === "enhance") enhTab.classList.add("tab-active");
    else fragTab.classList.add("tab-active");
    content.appendChild(tabRow);

    const body = createBodyScroll();
    content.appendChild(body);

    const list = createCardList();
    if (this.activeTab === "fragments") {
      this.renderFragmentMarket(list);
    } else {
      this.renderDefaultShop(list);
    }
    body.appendChild(list);

    inner.appendChild(createBackButton(() => this.cb.onBack()));
  }

  exit(): void {
    closeOverlay({ constrained: true });
  }

  update(_dt: number): void {}
  render(_alpha: number): void {}

  private renderDefaultShop(list: HTMLElement): void {
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
          this.enter();
        });
      } else {
        btn.disabled = true;
      }
      list.appendChild(btn);
    }
  }

  private renderFragmentMarket(list: HTMLElement): void {
    const profile = this.cb.getProfile();
    for (const meta of FRAGMENT_META) {
      const owned = profile.fragments.detailed[meta.id];
      const canBuyByKills =
        !meta.enemyKind ||
        this.cb.getEnemyKillCount(meta.enemyKind) >= meta.unlockKills;
      const canBuy = canBuyByKills && profile.points >= meta.buyPrice;
      const canSell = owned > 0;

      const card = document.createElement("div");
      card.className = "card-btn fragment-market-card";

      const glyph = document.createElement("span");
      glyph.className = "card-glyph";
      const icon = FRAGMENT_GLYPHS[meta.id];
      if (icon) setIconHtml(glyph, icon);
      else glyph.textContent = "•";
      card.appendChild(glyph);

      const body = document.createElement("span");
      body.className = "card-body";
      const name = document.createElement("span");
      name.className = "card-name";
      name.textContent = meta.label;
      const desc = document.createElement("span");
      desc.className = "card-text";
      const unlockRequirementText =
        !meta.enemyKind || meta.unlockKills <= 0
          ? "always tradable"
          : `${meta.enemyKind.toUpperCase()} kills: ${this.cb.getEnemyKillCount(meta.enemyKind)}/${meta.unlockKills}`;
      desc.textContent = `owned: ${owned} · buy ${meta.buyPrice}pts · sell +${meta.sellPrice}pts · ${unlockRequirementText}`;
      body.appendChild(name);
      body.appendChild(desc);
      card.appendChild(body);

      const actions = document.createElement("div");
      actions.className = "draft-actions";
      const buyBtn = document.createElement("button");
      buyBtn.type = "button";
      buyBtn.className = "menu-btn";
      buyBtn.textContent = "buy";
      buyBtn.disabled = !canBuy;
      buyBtn.addEventListener("click", () => {
        this.cb.onBuyFragment(meta.id, meta.buyPrice);
        this.enter();
      });
      const sellBtn = document.createElement("button");
      sellBtn.type = "button";
      sellBtn.className = "menu-btn";
      sellBtn.textContent = "sell";
      sellBtn.disabled = !canSell;
      sellBtn.addEventListener("click", () => {
        this.cb.onSellFragment(meta.id, meta.sellPrice);
        this.enter();
      });
      actions.appendChild(buyBtn);
      actions.appendChild(sellBtn);
      card.appendChild(actions);
      list.appendChild(card);
    }
  }

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
