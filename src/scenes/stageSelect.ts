import { Container } from "pixi.js";
import type { Scene } from "./scene";
import { STAGE_THEMES } from "../game/stageThemes";
import { STAGE_WAVES } from "../game/stageWaves";
import { bossForStage } from "../game/bosses/registry";
import type { PlayerStats } from "../game/data/types";
import { openOverlay, closeOverlay, createOverlayTitle, createOverlaySub, createBodyScroll, createCardList, createBackButton } from "./ui";

// ── Stage select (Main Story) ───────────────────────────────────────────────

export class StageSelectScene implements Scene {
  readonly root: Container;
  readonly id = "stage-select";
  private readonly onSelect: (stageIndex: number) => void;
  private readonly onBack: () => void;
  private readonly getStats: () => PlayerStats;

  constructor(
    onSelect: (stageIndex: number) => void,
    onBack: () => void,
    getStats: () => PlayerStats,
  ) {
    this.root = new Container();
    this.onSelect = onSelect;
    this.onBack = onBack;
    this.getStats = getStats;
  }

  enter(): void {
    const { inner, content } = openOverlay();

    content.appendChild(createOverlayTitle("MAIN STORY"));

    const sub = createOverlaySub("主線模式");
    sub.style.marginBottom = "12px";
    content.appendChild(sub);

    const body = createBodyScroll();
    content.appendChild(body);

    const list = createCardList();

    const stats = this.getStats();

    STAGE_THEMES.forEach((theme, i) => {
      // Linear unlock: Stage N+1 requires Stage N cleared.
      const locked = i > 0 && !(stats.normalCleared?.[i - 1] === true);
      const bossDef = bossForStage(i);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card-btn";
      if (locked) {
        btn.disabled = true;
        btn.style.opacity = "0.45";
      }

      const glyph = document.createElement("span");
      glyph.className = "card-glyph";
      glyph.style.fontFamily = "ui-monospace, monospace";
      glyph.textContent = locked ? "?" : `${i + 1}`;
      btn.appendChild(glyph);

      const bodyEl = document.createElement("span");
      bodyEl.className = "card-body";
      const name = document.createElement("span");
      name.className = "card-name";
      name.style.fontFamily = "ui-monospace, monospace";
      name.style.textTransform = "uppercase";
      name.style.letterSpacing = "0.05em";
      name.textContent = locked
        ? `STAGE ${i + 1} — ???`
        : `STAGE ${i + 1} — DOMAIN: ${theme.domainName}`;
      const desc = document.createElement("span");
      desc.className = "card-text";
      desc.style.fontFamily = "ui-monospace, monospace";
      if (locked) {
        desc.textContent = "???";
      } else {
        desc.textContent = `BOSS: ${bossDef.displayName} · THEOREM: ${theme.theoremLine}`;
      }
      const waveInfo = document.createElement("span");
      waveInfo.className = "card-text";
      waveInfo.style.fontSize = "10px";
      waveInfo.textContent = `${STAGE_WAVES[i]?.length ?? 0} waves`;
      bodyEl.appendChild(name);
      bodyEl.appendChild(desc);
      bodyEl.appendChild(waveInfo);
      btn.appendChild(bodyEl);

      // Color swatch
      const swatch = document.createElement("span");
      swatch.style.width = "20px";
      swatch.style.height = "20px";
      swatch.style.borderRadius = "4px";
      swatch.style.border = "1px solid #999";
      swatch.style.background = locked
        ? "#888"
        : `#${theme.background.toString(16).padStart(6, "0")}`;
      btn.appendChild(swatch);

      if (!locked) {
        btn.addEventListener("click", () => this.onSelect(i));
      }
      list.appendChild(btn);
    });
    body.appendChild(list);

    inner.appendChild(createBackButton(() => this.onBack()));
  }

  exit(): void {
    closeOverlay();
  }

  update(_dt: number): void {}
  render(_alpha: number): void {}
}
