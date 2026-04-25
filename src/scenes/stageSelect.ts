import { Container } from "pixi.js";
import type { Scene } from "./scene";
import { STAGE_THEMES } from "../game/stageThemes";
import { STAGE_WAVES } from "../game/stageWaves";
import { bossForStage } from "../game/bosses/registry";
import type { PlayerStats } from "../game/data/types";
import { openOverlay, closeOverlay, createOverlayTitle, createOverlaySub, createBodyScroll, createCardList, createBackButton } from "./ui";
import { iconCheck, iconChevronRight, iconLock, iconSpan } from "../icons";

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

    // Find the current target — first un-cleared, un-locked stage.
    const firstUnclearedIdx = STAGE_THEMES.findIndex(
      (_, i) => !(stats.normalCleared?.[i] === true),
    );

    STAGE_THEMES.forEach((theme, i) => {
      // Linear unlock: Stage N+1 requires Stage N cleared.
      const locked = i > 0 && !(stats.normalCleared?.[i - 1] === true);
      const cleared = stats.normalCleared?.[i] === true;
      const isCurrent = !locked && !cleared && i === firstUnclearedIdx;
      const bossDef = bossForStage(i);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card-btn stage-card";
      if (cleared) btn.classList.add("stage-card--cleared");
      if (isCurrent) btn.classList.add("stage-card--current");
      if (locked) {
        btn.disabled = true;
        btn.classList.add("stage-card--locked");
      }

      const glyph = document.createElement("span");
      glyph.className = "card-glyph stage-glyph";
      glyph.textContent = locked ? "?" : `${i + 1}`;
      btn.appendChild(glyph);

      const bodyEl = document.createElement("span");
      bodyEl.className = "card-body";
      const name = document.createElement("span");
      name.className = "card-name stage-name";
      name.textContent = locked
        ? `STAGE ${i + 1} — ???`
        : `STAGE ${i + 1} — ${theme.domainName}`;
      bodyEl.appendChild(name);

      if (locked) {
        const desc = document.createElement("span");
        desc.className = "card-text";
        desc.textContent = "???";
        bodyEl.appendChild(desc);
      } else {
        const bossLine = document.createElement("span");
        bossLine.className = "card-text stage-boss";
        bossLine.textContent = `BOSS · ${bossDef.displayName.toUpperCase()}`;
        bodyEl.appendChild(bossLine);

        const theorem = document.createElement("span");
        theorem.className = "card-text stage-theorem";
        theorem.textContent = theme.theoremLine;
        bodyEl.appendChild(theorem);

        const chip = document.createElement("span");
        chip.className = "stage-wave-chip";
        chip.textContent = `${STAGE_WAVES[i]?.length ?? 0} waves`;
        bodyEl.appendChild(chip);
      }
      btn.appendChild(bodyEl);

      // Status indicator: lock / check / chevron + theme color bar
      const status = document.createElement("span");
      status.className = "stage-status";
      const statusIcon = locked
        ? iconLock
        : cleared
        ? iconCheck
        : isCurrent
        ? iconChevronRight
        : null;
      if (statusIcon) status.appendChild(iconSpan(statusIcon));
      const bar = document.createElement("span");
      bar.className = "stage-status-bar";
      bar.style.background = locked
        ? "var(--muted)"
        : `#${theme.background.toString(16).padStart(6, "0")}`;
      status.appendChild(bar);
      btn.appendChild(status);

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
