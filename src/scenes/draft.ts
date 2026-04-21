import { Container } from "pixi.js";
import { projectedCardText, type Card } from "../game/cards";
import { isLevelableEffect, lowerRarity, MAX_CARD_LEVEL, type CardInventory } from "../game/cardLevels";
import type { Scene } from "./scene";
import { CARD_GLYPHS, setIconHtml } from "../icons";
import { closeOverlay, createCardList, createOverlayTitle, openOverlay } from "./ui";

// Overlay-based scene — no Pixi drawing. Renders into `#overlay-inner` and
// waits for a tap on one of the offered cards.

export interface DraftHandlers {
  onPick: (card: Card) => void;
  /** Spend a token to redraw the offer. Returns true iff redraw happened. */
  onReroll: () => boolean;
  /** Leave without picking and without consuming a token. */
  onSkip: () => void;
  /** Current token balance, read each render. */
  getTokens: () => number;
  /** Cost of the next reroll (for label rendering). */
  getRerollCost: () => number;
  /** Run-scoped card inventory for level display. */
  getInventory: () => CardInventory;
}

export class DraftScene implements Scene {
  readonly root: Container;
  private offer: readonly Card[];
  private readonly handlers: DraftHandlers;
  private readonly clearedWaveLabel: string;
  private selected: Card | null = null;

  constructor(offer: readonly Card[], clearedWaveLabel: string, handlers: DraftHandlers) {
    this.root = new Container();
    this.offer = offer;
    this.handlers = handlers;
    this.clearedWaveLabel = clearedWaveLabel;
  }

  /** Replace the visible card offer (used by reroll). */
  setOffer(next: readonly Card[]): void {
    this.offer = next;
    this.selected = null;
    this.renderDom();
  }

  enter(): void {
    this.selected = null;
    this.renderDom();
  }

  exit(): void {
    closeOverlay();
  }

  update(_dt: number): void {}
  // Pixi render hook is a no-op; this scene draws through DOM on enter/reroll.
  render(_alpha: number): void {}

  private renderDom(): void {
    const { content } = openOverlay();

    const title = createOverlayTitle(`wave ${this.clearedWaveLabel} cleared — pick a rune`);
    content.appendChild(title);

    const tokens = this.handlers.getTokens();
    const tokenRow = document.createElement("div");
    tokenRow.className = "draft-tokens";
    tokenRow.textContent = `tokens: ${tokens}`;
    content.appendChild(tokenRow);

    const inventory = this.handlers.getInventory();

    const list = createCardList();
    const btnByCard = new Map<string, HTMLButtonElement>();
    for (const card of this.offer) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card-btn";
      btn.setAttribute("data-card-id", card.id);

      // Check if this card is already held and can level up.
      const entry = inventory.getForCard(card);
      const isUpgrade = entry != null && isLevelableEffect(card.effect);
      const atMaxLevel = entry != null && entry.level >= MAX_CARD_LEVEL;
      const targetLevel = isUpgrade ? Math.min(MAX_CARD_LEVEL, entry!.level + 1) : 1;

      if (isUpgrade) btn.classList.add("card-btn--upgrade");
      if (atMaxLevel) btn.classList.add("card-btn--maxed");

      const glyph = document.createElement("span");
      glyph.className = "card-glyph";
      const svgGlyph = CARD_GLYPHS[card.id];
      if (svgGlyph) setIconHtml(glyph, svgGlyph);
      else glyph.textContent = card.glyph;
      glyph.setAttribute("aria-hidden", "true");
      btn.appendChild(glyph);

      const body = document.createElement("span");
      body.className = "card-body";
      const name = document.createElement("span");
      name.className = "card-name";
      if (isUpgrade && !atMaxLevel) {
        name.textContent = `${card.name}  ↑ Lv${entry!.level + 1}`;
      } else if (atMaxLevel) {
        name.textContent = `${card.name}  MAX`;
      } else {
        name.textContent = card.name;
      }
      const text = document.createElement("span");
      text.className = "card-text";
      text.textContent = projectedCardText(card, targetLevel);
      const rarity = document.createElement("span");
      rarity.className = "card-rarity";
      const mergedRarity = isUpgrade ? lowerRarity(entry!.rarity, card.rarity) : card.rarity;
      if (isUpgrade && !atMaxLevel) {
        rarity.textContent = `${mergedRarity} · level up`;
      } else if (atMaxLevel) {
        rarity.textContent = `${mergedRarity} · max level`;
      } else {
        rarity.textContent = mergedRarity;
      }
      body.appendChild(name);
      body.appendChild(text);
      body.appendChild(rarity);
      btn.appendChild(body);

      btn.addEventListener("click", () => {
        this.selected = card;
        for (const [id, b] of btnByCard) b.classList.toggle("selected", id === card.id);
        confirmBtn.disabled = false;
        if (isUpgrade && !atMaxLevel) {
          confirmBtn.textContent = `level up: ${card.name}`;
        } else {
          confirmBtn.textContent = `confirm: ${card.name}`;
        }
      });
      btnByCard.set(card.id, btn);
      list.appendChild(btn);
    }
    content.appendChild(list);

    // Two-step commit: user selects a card, then confirms. Prevents an
    // accidental tap (carried over from gameplay drag) from locking in a pick
    // before the user has read the options.
    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "big-btn";
    confirmBtn.disabled = true;
    confirmBtn.textContent = "pick a card first";
    confirmBtn.addEventListener("click", () => {
      if (this.selected) this.handlers.onPick(this.selected);
    });
    content.appendChild(confirmBtn);

    const actionRow = document.createElement("div");
    actionRow.className = "draft-actions";

    const rerollCost = this.handlers.getRerollCost();
    const rerollBtn = document.createElement("button");
    rerollBtn.type = "button";
    rerollBtn.className = "secondary-btn";
    rerollBtn.textContent = `reroll (${rerollCost})`;
    rerollBtn.disabled = tokens < rerollCost;
    rerollBtn.addEventListener("click", () => {
      if (this.handlers.onReroll()) {
        // setOffer re-renders; no further action here.
      }
    });

    const skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.className = "secondary-btn";
    skipBtn.textContent = "skip";
    skipBtn.addEventListener("click", () => this.handlers.onSkip());

    actionRow.appendChild(rerollBtn);
    actionRow.appendChild(skipBtn);
    content.appendChild(actionRow);
  }
}
