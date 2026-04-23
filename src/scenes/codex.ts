import { Container } from "pixi.js";
import type { Scene } from "./scene";
import type { PlayerStats } from "../game/data/types";
import { ALL_ENEMY_KINDS } from "../game/enemies/kinds";
import { getEnemyDef } from "../game/enemies/registry";
import { POOL } from "../game/cards";
import { CARD_GLYPHS, ENEMY_GLYPHS, iconCodex, iconEnhance, iconSpan, setIconHtml } from "../icons";
import {
  openOverlay,
  closeOverlay,
  createOverlayTitle,
  createOverlaySub,
  createBodyScroll,
  createCardList,
  createBackButton,
} from "./ui";

type CodexTab = "enemies" | "enhance";

function enemyBaseColor(kind: string): string {
  switch (kind) {
    case "circle": return "#fafafa";
    case "square": return "#ffe6a0";
    case "star": return "#c9e7ff";
    case "boss": return "#ffd1e1";
    case "pentagon": return "#d4f5d4";
    case "hexagon": return "#d0f0ff";
    case "diamond": return "#ffe0cc";
    case "cross": return "#f5d0f5";
    case "crescent": return "#fff4cc";
    case "orthogon":
    case "jets":
    case "mirror":
      return "#ffd1e1";
    case "spiral": return "#f1f8e9";
    case "lance": return "#fff8e1";
    case "prism": return "#e3f2fd";
    case "octo": return "#e8f5e9";
    case "shade": return "#f3e5f5";
    case "lattice": return "#e0f2f1";
    case "rift": return "#ede7f6";
    default: return "var(--fg)";
  }
}

export class CodexScene implements Scene {
  readonly root: Container;
  private readonly getStats: () => PlayerStats;
  private readonly onBack: () => void;
  private activeTab: CodexTab = "enemies";

  constructor(
    getStats: () => PlayerStats,
    onBack: () => void,
  ) {
    this.root = new Container();
    this.getStats = getStats;
    this.onBack = onBack;
  }

  enter(): void {
    const { inner, content } = openOverlay({ constrained: true });
    const stats = this.getStats();

    content.appendChild(createOverlayTitle("codex"));
    content.appendChild(createOverlaySub("enemies · enhance"));

    const tabRow = document.createElement("div");
    tabRow.className = "tab-row";
    const enemyTab = this.createTab(iconCodex, "Enemies", "enemies", tabRow);
    const enhanceTab = this.createTab(iconEnhance, "Enhance", "enhance", tabRow);
    if (this.activeTab === "enemies") enemyTab.classList.add("tab-active");
    else enhanceTab.classList.add("tab-active");
    content.appendChild(tabRow);

    const body = createBodyScroll();
    content.appendChild(body);
    const list = createCardList();
    if (this.activeTab === "enemies") this.renderEnemies(list, stats);
    else this.renderEnhance(list);
    body.appendChild(list);

    inner.appendChild(createBackButton(() => this.onBack()));
  }

  exit(): void {
    closeOverlay({ constrained: true });
  }

  update(_dt: number): void {}
  render(_alpha: number): void {}

  private renderEnemies(list: HTMLElement, stats: PlayerStats): void {
    for (const kind of ALL_ENEMY_KINDS) {
      const def = getEnemyDef(kind);
      const card = document.createElement("div");
      card.className = "card-btn";
      const glyph = document.createElement("span");
      glyph.className = "card-glyph codex-glyph codex-glyph--enemy";
      const svg = ENEMY_GLYPHS[kind];
      if (svg) setIconHtml(glyph, svg);
      else glyph.textContent = "◌";
      glyph.style.color = enemyBaseColor(kind);
      card.appendChild(glyph);
      const cardBody = document.createElement("span");
      cardBody.className = "card-body";
      const name = document.createElement("span");
      name.className = "card-name";
      name.textContent = kind.toUpperCase();
      const desc = document.createElement("span");
      desc.className = "card-text";
      desc.textContent = `HP ${def.stats.hp} · SPD ${Math.round(def.stats.maxSpeed)} · ATK ${def.stats.contactDamage} · Kills ${stats.enemyKills[kind] ?? 0}`;
      cardBody.appendChild(name);
      cardBody.appendChild(desc);
      card.appendChild(cardBody);
      list.appendChild(card);
    }
  }

  private renderEnhance(list: HTMLElement): void {
    const ordered = [...POOL].sort((a, b) => a.rarity.localeCompare(b.rarity) || a.name.localeCompare(b.name));
    for (const def of ordered) {
      const card = document.createElement("div");
      card.className = "card-btn";
      const glyph = document.createElement("span");
      glyph.className = "card-glyph codex-glyph codex-glyph--enhance";
      const svg = CARD_GLYPHS[def.id];
      if (svg) setIconHtml(glyph, svg);
      else glyph.textContent = def.glyph;
      card.appendChild(glyph);
      const cardBody = document.createElement("span");
      cardBody.className = "card-body";
      const name = document.createElement("span");
      name.className = "card-name";
      name.textContent = def.name;
      const desc = document.createElement("span");
      desc.className = "card-text";
      desc.textContent = `${def.text} · ${def.rarity.toUpperCase()}`;
      cardBody.appendChild(name);
      cardBody.appendChild(desc);
      card.appendChild(cardBody);
      list.appendChild(card);
    }
  }

  private createTab(icon: string, label: string, tab: CodexTab, parent: HTMLElement): HTMLButtonElement {
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
}
