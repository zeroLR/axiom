import { Container } from "pixi.js";
import type { Scene } from "./scene";
import { STAGE_THEMES } from "../game/stageThemes";
import { STAGE_WAVES } from "../game/stageWaves";
import { bossForStage } from "../game/bosses/registry";
import { iconBack, iconSpan } from "../icons";
import type { PlayerStats } from "../game/data/types";

// ── Stage select (Main Story) ───────────────────────────────────────────────

export class StageSelectScene implements Scene {
  readonly root: Container;
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
    const overlay = document.getElementById("overlay");
    const inner = document.getElementById("overlay-inner");
    if (!overlay || !inner) return;
    inner.innerHTML = "";
    const content = document.createElement("div");
    content.className = "overlay-scroll";
    inner.appendChild(content);

    const title = document.createElement("div");
    title.className = "overlay-title";
    title.textContent = "MAIN STORY";
    content.appendChild(title);

    const sub = document.createElement("div");
    sub.className = "overlay-sub";
    sub.textContent = "主線模式";
    sub.style.marginBottom = "12px";
    content.appendChild(sub);

    const body = document.createElement("div");
    body.className = "overlay-body-scroll";
    content.appendChild(body);

    const list = document.createElement("div");
    list.className = "card-list";

    const stats = this.getStats();

    STAGE_THEMES.forEach((theme, i) => {
      // Linear unlock: Stage N+1 requires Stage N cleared.
      const locked = i > 0 && !stats.normalCleared[i - 1];
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

    const back = document.createElement("button");
    back.type = "button";
    back.className = "big-btn";
    back.appendChild(iconSpan(iconBack));
    back.append(" back");
    back.style.marginTop = "8px";
    back.addEventListener("click", () => this.onBack());
    inner.appendChild(back);

    overlay.hidden = false;
  }

  exit(): void {
    const overlay = document.getElementById("overlay");
    const inner = document.getElementById("overlay-inner");
    if (inner) inner.innerHTML = "";
    if (overlay) overlay.hidden = true;
  }

  update(_dt: number): void {}
  render(_alpha: number): void {}
}
