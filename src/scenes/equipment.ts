import { Container } from "pixi.js";
import type { Scene } from "./scene";
import type { EquipmentLoadout, PlayerProfile } from "../game/data/types";
import { SHOP_ITEMS, EQUIP_EFFECTS } from "../game/data/shop";
import { canEquip, MAX_SAME_CARD } from "../game/equipment";
import { iconSkins, iconEnhance, iconBack, iconSpan, SHOP_GLYPHS, glyphTriangle, setIconHtml } from "../icons";

// ── Equipment management scene (DOM overlay) ────────────────────────────────

export interface EquipmentCallbacks {
  getLoadout: () => EquipmentLoadout;
  getProfile: () => PlayerProfile;
  onEquip: (cardId: string) => void;
  onUnequip: (cardId: string) => void;
  onActivateSkin: (skinId: string) => void;
  onBack: () => void;
}

type EquipTab = "skin" | "enhance";

export class EquipmentScene implements Scene {
  readonly root: Container;
  private readonly cb: EquipmentCallbacks;
  private activeTab: EquipTab = "enhance";

  constructor(cb: EquipmentCallbacks) {
    this.root = new Container();
    this.cb = cb;
  }

  enter(): void {
    const overlay = document.getElementById("overlay");
    const inner = document.getElementById("overlay-inner");
    if (!overlay || !inner) return;
    inner.innerHTML = "";
    inner.classList.add("overlay-constrained");
    const content = document.createElement("div");
    content.className = "overlay-scroll";
    inner.appendChild(content);

    const title = document.createElement("div");
    title.className = "overlay-title";
    title.textContent = "equipment";
    content.appendChild(title);

    // Tab row
    const tabRow = document.createElement("div");
    tabRow.className = "tab-row";
    const skinTab = this.createTab(iconSkins, "Skins", "skin", tabRow);
    const enhTab = this.createTab(iconEnhance, "Enhance", "enhance", tabRow);
    if (this.activeTab === "skin") skinTab.classList.add("tab-active");
    else enhTab.classList.add("tab-active");
    content.appendChild(tabRow);

    const body = document.createElement("div");
    body.className = "overlay-body-scroll";
    content.appendChild(body);

    if (this.activeTab === "skin") {
      this.renderSkinTab(body);
    } else {
      this.renderEnhanceTab(body);
    }

    const back = document.createElement("button");
    back.type = "button";
    back.className = "big-btn";
    back.appendChild(iconSpan(iconBack));
    back.append(" back");
    back.style.marginTop = "8px";
    back.addEventListener("click", () => this.cb.onBack());
    inner.appendChild(back);

    overlay.hidden = false;
  }

  exit(): void {
    const overlay = document.getElementById("overlay");
    const inner = document.getElementById("overlay-inner");
    if (inner) {
      inner.classList.remove("overlay-constrained");
      inner.innerHTML = "";
    }
    if (overlay) overlay.hidden = true;
  }

  update(_dt: number): void {}
  render(_alpha: number): void {}

  private createTab(icon: string, label: string, tab: EquipTab, parent: HTMLElement): HTMLButtonElement {
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

  // ── Skin tab ──────────────────────────────────────────────────────────────

  private renderSkinTab(inner: HTMLElement): void {
    const profile = this.cb.getProfile();

    const activeSkinLabel = document.createElement("div");
    activeSkinLabel.className = "overlay-sub";
    const activeItem = SHOP_ITEMS.find((i) => i.id === profile.activeSkin);
    const activeName = profile.activeSkin === "triangle"
      ? "Triangle (default)"
      : (activeItem?.name ?? profile.activeSkin);
    activeSkinLabel.textContent = `active: ${activeName}`;
    inner.appendChild(activeSkinLabel);

    const skinList = document.createElement("div");
    skinList.className = "card-list";

    // Default skin
    this.addSkinButton(skinList, "triangle", glyphTriangle, "Triangle (default)", profile.activeSkin === "triangle");

    // Owned skins
    for (const skinId of profile.ownedSkins) {
      if (skinId === "triangle") continue; // already added
      const shopItem = SHOP_ITEMS.find((i) => i.id === skinId);
      const skinGlyph = SHOP_GLYPHS[skinId] ?? shopItem?.glyph ?? "?";
      this.addSkinButton(
        skinList,
        skinId,
        skinGlyph,
        shopItem?.name ?? skinId,
        profile.activeSkin === skinId,
      );
    }

    if (profile.ownedSkins.length <= 1) {
      const hint = document.createElement("div");
      hint.className = "card-text";
      hint.textContent = "buy skins from the shop to unlock more";
      hint.style.textAlign = "center";
      hint.style.padding = "12px";
      skinList.appendChild(hint);
    }

    inner.appendChild(skinList);
  }

  private addSkinButton(
    parent: HTMLElement,
    skinId: string,
    glyph: string,
    label: string,
    isActive: boolean,
  ): void {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = isActive ? "card-btn selected" : "card-btn";

    const glyphEl = document.createElement("span");
    glyphEl.className = "card-glyph";
    // glyph is either an SVG string (contains <svg) or plain text
    if (glyph.includes("<svg")) setIconHtml(glyphEl, glyph);
    else glyphEl.textContent = glyph;
    btn.appendChild(glyphEl);

    const body = document.createElement("span");
    body.className = "card-body";
    const nameEl = document.createElement("span");
    nameEl.className = "card-name";
    nameEl.textContent = label;
    const desc = document.createElement("span");
    desc.className = "card-text";
    desc.textContent = isActive ? "equipped" : "tap to equip";
    body.appendChild(nameEl);
    body.appendChild(desc);
    btn.appendChild(body);

    if (!isActive) {
      btn.addEventListener("click", () => {
        this.cb.onActivateSkin(skinId);
        this.enter();
      });
    }

    parent.appendChild(btn);
  }

  // ── Enhance tab ───────────────────────────────────────────────────────────

  private renderEnhanceTab(inner: HTMLElement): void {
    const loadout = this.cb.getLoadout();

    // Current slots
    const slotsLabel = document.createElement("div");
    slotsLabel.className = "overlay-sub";
    slotsLabel.textContent = `slots: ${loadout.equipped.length}/${loadout.maxSlots}`;
    inner.appendChild(slotsLabel);

    // Equipped list
    const equippedDiv = document.createElement("div");
    equippedDiv.className = "card-list";
    if (loadout.equipped.length === 0) {
      const empty = document.createElement("div");
      empty.className = "card-text";
      empty.textContent = "no cards equipped";
      empty.style.textAlign = "center";
      empty.style.padding = "12px";
      equippedDiv.appendChild(empty);
    }
    for (const cardId of loadout.equipped) {
      const item = SHOP_ITEMS.find((i) => i.id === cardId);
      const eff = EQUIP_EFFECTS[cardId];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card-btn selected";
      const glyph = document.createElement("span");
      glyph.className = "card-glyph";
      const eqSvg = SHOP_GLYPHS[cardId];
      if (eqSvg) setIconHtml(glyph, eqSvg);
      else glyph.textContent = item?.glyph ?? "?";
      btn.appendChild(glyph);
      const body = document.createElement("span");
      body.className = "card-body";
      const name = document.createElement("span");
      name.className = "card-name";
      name.textContent = item?.name ?? cardId;
      const desc = document.createElement("span");
      desc.className = "card-text";
      desc.textContent = eff ? `${eff.effectKind}: ${eff.effectValue}` : "";
      body.appendChild(name);
      body.appendChild(desc);
      btn.appendChild(body);
      btn.addEventListener("click", () => {
        this.cb.onUnequip(cardId);
        this.enter();
      });
      equippedDiv.appendChild(btn);
    }
    inner.appendChild(equippedDiv);

    // Divider
    const divider = document.createElement("div");
    divider.style.borderTop = "1px solid #ccc";
    divider.style.margin = "8px 0";
    inner.appendChild(divider);

    // Owned cards (unequipped)
    const ownLabel = document.createElement("div");
    ownLabel.className = "overlay-sub";
    ownLabel.textContent = "owned cards";
    inner.appendChild(ownLabel);

    const ownedDiv = document.createElement("div");
    ownedDiv.className = "card-list";

    const unequipped = loadout.ownedCards.filter(
      (id) => {
        const eqCount = loadout.equipped.filter((e) => e === id).length;
        return eqCount < MAX_SAME_CARD;
      }
    );

    if (unequipped.length === 0) {
      const empty = document.createElement("div");
      empty.className = "card-text";
      empty.textContent = "no cards available — buy from shop";
      empty.style.textAlign = "center";
      empty.style.padding = "12px";
      ownedDiv.appendChild(empty);
    }

    for (const cardId of [...new Set(unequipped)]) {
      const item = SHOP_ITEMS.find((i) => i.id === cardId);
      const able = canEquip(loadout, cardId);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card-btn";
      if (!able) btn.style.opacity = "0.5";
      const glyph = document.createElement("span");
      glyph.className = "card-glyph";
      const ownSvg = SHOP_GLYPHS[cardId];
      if (ownSvg) setIconHtml(glyph, ownSvg);
      else glyph.textContent = item?.glyph ?? "?";
      btn.appendChild(glyph);
      const body = document.createElement("span");
      body.className = "card-body";
      const name = document.createElement("span");
      name.className = "card-name";
      name.textContent = item?.name ?? cardId;
      const desc = document.createElement("span");
      desc.className = "card-text";
      desc.textContent = item?.description ?? "";
      body.appendChild(name);
      body.appendChild(desc);
      btn.appendChild(body);
      if (able) {
        btn.addEventListener("click", () => {
          this.cb.onEquip(cardId);
          this.enter();
        });
      }
      ownedDiv.appendChild(btn);
    }
    inner.appendChild(ownedDiv);
  }
}
