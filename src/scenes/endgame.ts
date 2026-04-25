import { Container } from "pixi.js";
import type { Scene } from "./scene";
import type { EnemyKind } from "../game/world";
import type { FragmentTally } from "../game/rewards";
import { FRAGMENT_META } from "../game/fragments";
import {
  CARD_GLYPHS,
  ENEMY_GLYPHS,
  FRAGMENT_GLYPHS,
  setIconHtml,
} from "../icons";
import { closeOverlay, createOverlayTitle, createOverlaySub, initOverlay } from "./ui";

export type EndgameKind = "dead" | "won";

export interface EndgameUnlocks {
  newCards: string[];
  newSkills: string[];
}

interface EndgameActions {
  onRetry: () => void;
  onMenu: () => void;
  onNext?: () => void;
}

interface EndgameSummary {
  fragments?: FragmentTally;
  unlocks?: EndgameUnlocks;
  durationSec?: number;
  killsByKind?: Partial<Record<EnemyKind, number>>;
  enhanceEntries?: Array<{ id: string; level: number }>;
}

export class EndgameScene implements Scene {
  readonly root: Container;
  readonly id = "endgame";
  private readonly kind: EndgameKind;
  private readonly wavesCleared: number;
  private readonly totalWaves: number;
  private readonly actions: EndgameActions;
  private readonly summary: EndgameSummary;

  constructor(
    kind: EndgameKind,
    wavesCleared: number,
    totalWaves: number,
    actions: EndgameActions,
    summary?: EndgameSummary,
  ) {
    this.root = new Container();
    this.kind = kind;
    this.wavesCleared = wavesCleared;
    this.totalWaves = totalWaves;
    this.actions = actions;
    this.summary = summary ?? {};
  }

  enter(): void {
    const { inner } = initOverlay();

    inner.appendChild(
      createOverlayTitle(this.kind === "dead" ? "shattered" : "run complete"),
    );
    const subText =
      this.kind === "dead"
        ? `reached wave ${this.wavesCleared}/${this.totalWaves}`
        : `cleared ${this.totalWaves}/${this.totalWaves} waves`;
    inner.appendChild(createOverlaySub(subText));

    if (this.summary.durationSec !== undefined) {
      const time = document.createElement("div");
      time.className = "overlay-sub";
      time.textContent = `time: ${this.summary.durationSec.toFixed(1)}s`;
      inner.appendChild(time);
    }

    this.renderAbilityPanel(inner);
    this.renderKillPanel(inner);
    this.renderFragmentPanel(inner);
    this.renderUnlockBanner(inner);

    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.className = "big-btn";
    retryBtn.textContent = "retry";
    retryBtn.addEventListener("click", () => this.actions.onRetry());
    inner.appendChild(retryBtn);

    if (this.actions.onNext) {
      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "menu-btn";
      nextBtn.textContent = "next stage";
      nextBtn.addEventListener("click", () => this.actions.onNext?.());
      inner.appendChild(nextBtn);
    }

    const menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.className = "menu-btn";
    menuBtn.textContent = "main menu";
    menuBtn.addEventListener("click", () => this.actions.onMenu());
    inner.appendChild(menuBtn);
  }

  exit(): void {
    closeOverlay();
  }

  update(_dt: number): void {}
  render(_alpha: number): void {}

  private renderAbilityPanel(inner: HTMLElement): void {
    const entries = this.summary.enhanceEntries ?? [];
    if (entries.length === 0) return;
    const panel = document.createElement("div");
    panel.className = "pause-panel";
    const title = document.createElement("div");
    title.className = "pause-panel-title";
    title.textContent = "enhance";
    panel.appendChild(title);
    const list = document.createElement("div");
    list.className = "pause-card-tag-list";
    for (const entry of [...entries].sort((a, b) => b.level - a.level || a.id.localeCompare(b.id))) {
      const chip = document.createElement("span");
      chip.className = "pause-card-tag";
      const glyph = document.createElement("span");
      glyph.className = "pause-card-tag-glyph";
      const svg = CARD_GLYPHS[entry.id];
      if (svg) setIconHtml(glyph, svg);
      else glyph.textContent = "•";
      chip.appendChild(glyph);
      const lv = document.createElement("span");
      lv.className = "pause-card-tag-lv";
      lv.textContent = `Lv${entry.level}`;
      chip.appendChild(lv);
      list.appendChild(chip);
    }
    panel.appendChild(list);
    inner.appendChild(panel);
  }

  private renderKillPanel(inner: HTMLElement): void {
    const kills = this.summary.killsByKind;
    if (!kills) return;
    const rows = Object.entries(kills).filter(([, n]) => (n ?? 0) > 0);
    if (rows.length === 0) return;
    const panel = document.createElement("div");
    panel.className = "pause-panel";
    const title = document.createElement("div");
    title.className = "pause-panel-title";
    title.textContent = "enemy kills";
    panel.appendChild(title);
    const list = document.createElement("div");
    list.className = "pause-fragment-list";
    for (const [kind, count] of rows.sort(([, countA], [, countB]) => (countB ?? 0) - (countA ?? 0))) {
      const row = document.createElement("div");
      row.className = "pause-fragment-row";
      const glyph = document.createElement("span");
      glyph.className = "pause-card-tag-glyph";
      const svg = ENEMY_GLYPHS[kind];
      if (svg) setIconHtml(glyph, svg);
      else glyph.textContent = "•";
      row.appendChild(glyph);
      const label = document.createElement("span");
      label.className = "pause-bonus-key";
      label.textContent = kind.toUpperCase();
      row.appendChild(label);
      const val = document.createElement("span");
      val.className = "pause-bonus-value";
      val.textContent = `×${count}`;
      row.appendChild(val);
      list.appendChild(row);
    }
    panel.appendChild(list);
    inner.appendChild(panel);
  }

  private renderFragmentPanel(inner: HTMLElement): void {
    const fragments = this.summary.fragments;
    if (!fragments) return;
    const rows = FRAGMENT_META.filter((meta) => fragments.detailed[meta.id] > 0);
    if (rows.length === 0) return;
    const panel = document.createElement("div");
    panel.className = "pause-panel";
    const title = document.createElement("div");
    title.className = "pause-panel-title";
    title.textContent = "fragments";
    panel.appendChild(title);
    const list = document.createElement("div");
    list.className = "pause-fragment-list";
    for (const meta of rows) {
      const row = document.createElement("div");
      row.className = "pause-fragment-row";
      const glyph = document.createElement("span");
      glyph.className = "pause-card-tag-glyph";
      const svg = FRAGMENT_GLYPHS[meta.id];
      if (svg) setIconHtml(glyph, svg);
      else glyph.textContent = "•";
      row.appendChild(glyph);
      const name = document.createElement("span");
      name.className = "pause-bonus-key";
      name.textContent = meta.label;
      row.appendChild(name);
      const val = document.createElement("span");
      val.className = "pause-bonus-value";
      val.textContent = `×${fragments.detailed[meta.id]}`;
      row.appendChild(val);
      list.appendChild(row);
    }
    panel.appendChild(list);
    inner.appendChild(panel);
  }

  private renderUnlockBanner(inner: HTMLElement): void {
    const unlocks = this.summary.unlocks;
    if (!unlocks || (unlocks.newCards.length === 0 && unlocks.newSkills.length === 0)) return;
    const banner = document.createElement("div");
    banner.className = "pause-panel";
    const heading = document.createElement("div");
    heading.className = "pause-panel-title";
    heading.textContent = "domain sealed";
    banner.appendChild(heading);
    const unlockLine = document.createElement("div");
    unlockLine.className = "pause-bonus-value";
    unlockLine.textContent = `UNLOCKED: ${[...unlocks.newCards, ...unlocks.newSkills].join(", ")}`;
    banner.appendChild(unlockLine);
    inner.appendChild(banner);
  }
}
