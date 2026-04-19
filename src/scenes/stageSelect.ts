import { Container } from "pixi.js";
import type { Scene } from "./scene";
import { STAGE_THEMES } from "../game/stageThemes";
import { STAGE_WAVES } from "../game/stageWaves";
import { iconBack, iconSpan } from "../icons";

// ── Stage select (Normal mode) ──────────────────────────────────────────────

export class StageSelectScene implements Scene {
  readonly root: Container;
  private readonly onSelect: (stageIndex: number) => void;
  private readonly onBack: () => void;

  constructor(onSelect: (stageIndex: number) => void, onBack: () => void) {
    this.root = new Container();
    this.onSelect = onSelect;
    this.onBack = onBack;
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
    title.textContent = "select stage";
    content.appendChild(title);

    const body = document.createElement("div");
    body.className = "overlay-body-scroll";
    content.appendChild(body);

    const list = document.createElement("div");
    list.className = "card-list";

    STAGE_THEMES.forEach((theme, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card-btn";

      const glyph = document.createElement("span");
      glyph.className = "card-glyph";
      glyph.textContent = `${i + 1}`;
      btn.appendChild(glyph);

      const body = document.createElement("span");
      body.className = "card-body";
      const name = document.createElement("span");
      name.className = "card-name";
      name.textContent = theme.name;
      const desc = document.createElement("span");
      desc.className = "card-text";
      desc.textContent = `Stage ${i + 1} · ${STAGE_WAVES[i]?.length ?? 0} waves`;
      body.appendChild(name);
      body.appendChild(desc);
      btn.appendChild(body);

      // Color swatch
      const swatch = document.createElement("span");
      swatch.style.width = "20px";
      swatch.style.height = "20px";
      swatch.style.borderRadius = "4px";
      swatch.style.border = "1px solid #999";
      swatch.style.background = `#${theme.background.toString(16).padStart(6, "0")}`;
      btn.appendChild(swatch);

      btn.addEventListener("click", () => this.onSelect(i));
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
