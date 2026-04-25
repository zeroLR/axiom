import { Container } from "pixi.js";
import type { Scene } from "./scene";
import { STAGE_THEMES } from "../game/stageThemes";
import { STAGE_WAVES } from "../game/stageWaves";
import { STAGE_CONFIGS } from "../game/content/stages";
import { ACTS, type ActDef } from "../game/content/acts";
import {
  isActFullyCleared,
  isActUnlocked,
  isStageCleared,
  isStageUnlocked,
} from "../game/unlocks";
import { bossForStage } from "../game/bosses/registry";
import type { PlayerStats } from "../game/data/types";
import {
  openOverlay,
  closeOverlay,
  createOverlayTitle,
  createOverlaySub,
  createBodyScroll,
  createCardList,
  createBackButton,
} from "./ui";
import { iconCheck, iconChevronRight, iconLock, iconSpan } from "../icons";

// ── Stage select (Main Story) ───────────────────────────────────────────────
//
// Stages are grouped into Acts (FORM / DECAY). Within an Act the trial stages
// are clearable in any order; the gate stage (if any) opens once every trial
// is cleared. Acts unlock linearly via `unlockAfterAct` so global progression
// still moves forward.

interface StageBucketEntry {
  stageId: string;
  stageIndex: number;
  role: "trial" | "gate";
}

function bucketStagesForAct(act: ActDef): StageBucketEntry[] {
  const out: StageBucketEntry[] = [];
  for (const id of act.trialStageIds) {
    const idx = STAGE_CONFIGS.findIndex((c) => c.stageId === id);
    if (idx >= 0) out.push({ stageId: id, stageIndex: idx, role: "trial" });
  }
  if (act.gateStageId) {
    const idx = STAGE_CONFIGS.findIndex((c) => c.stageId === act.gateStageId);
    if (idx >= 0) {
      out.push({ stageId: act.gateStageId, stageIndex: idx, role: "gate" });
    }
  }
  return out;
}

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

    const stats = this.getStats();

    for (const act of ACTS) {
      body.appendChild(this.renderActSection(act, stats));
    }

    // Stages without an `actId` (none today, but safe for future test stages)
    // are listed under a fallback "OTHER" bucket so they remain reachable.
    const orphans = STAGE_CONFIGS
      .map((cfg, idx) => ({ cfg, idx }))
      .filter(({ cfg }) => !cfg.actId);
    if (orphans.length > 0) {
      const section = document.createElement("section");
      section.className = "menu-section";
      const title = document.createElement("div");
      title.className = "menu-section-title";
      title.textContent = "other";
      section.appendChild(title);
      const list = createCardList();
      for (const { cfg, idx } of orphans) {
        list.appendChild(this.renderStageCard(cfg.stageId, idx, "trial", stats));
      }
      section.appendChild(list);
      body.appendChild(section);
    }

    inner.appendChild(createBackButton(() => this.onBack()));
  }

  private renderActSection(act: ActDef, stats: PlayerStats): HTMLElement {
    const section = document.createElement("section");
    section.className = "menu-section";

    const header = document.createElement("div");
    header.className = "menu-section-title";
    const actUnlocked = isActUnlocked(act.id, stats);
    const actCleared = isActFullyCleared(act, stats);
    header.textContent = actUnlocked ? `${act.name.toLowerCase()} · ${act.motto}` : `??? · locked`;
    if (actCleared) header.textContent += "  ✓";
    section.appendChild(header);

    const list = createCardList();
    if (!actUnlocked) {
      const hint = document.createElement("div");
      hint.className = "card-text";
      hint.textContent = `Clear Act ${act.unlockAfterAct?.toUpperCase()} to reveal.`;
      hint.style.padding = "8px 4px";
      section.appendChild(hint);
      return section;
    }
    for (const entry of bucketStagesForAct(act)) {
      list.appendChild(
        this.renderStageCard(entry.stageId, entry.stageIndex, entry.role, stats),
      );
    }
    section.appendChild(list);
    return section;
  }

  private renderStageCard(
    stageId: string,
    stageIndex: number,
    role: "trial" | "gate",
    stats: PlayerStats,
  ): HTMLElement {
    const theme = STAGE_THEMES[stageIndex]!;
    const bossDef = bossForStage(stageIndex);
    const unlocked = isStageUnlocked(stageId, stats);
    const cleared = isStageCleared(stageId, stats);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card-btn stage-card";
    if (cleared) btn.classList.add("stage-card--cleared");
    if (!unlocked) {
      btn.disabled = true;
      btn.classList.add("stage-card--locked");
    }
    if (role === "gate") btn.classList.add("stage-card--gate");

    const glyph = document.createElement("span");
    glyph.className = "card-glyph stage-glyph";
    glyph.textContent = unlocked ? `${stageIndex + 1}` : "?";
    btn.appendChild(glyph);

    const bodyEl = document.createElement("span");
    bodyEl.className = "card-body";
    const name = document.createElement("span");
    name.className = "card-name stage-name";
    const roleTag = role === "gate" ? " · GATE" : "";
    name.textContent = unlocked
      ? `STAGE ${stageIndex + 1} — ${theme.domainName}${roleTag}`
      : `STAGE ${stageIndex + 1} — ???${roleTag}`;
    bodyEl.appendChild(name);

    if (!unlocked) {
      const desc = document.createElement("span");
      desc.className = "card-text";
      desc.textContent = role === "gate"
        ? "Clear every trial in this Act to open the gate."
        : "???";
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
      chip.textContent = `${STAGE_WAVES[stageIndex]?.length ?? 0} waves`;
      bodyEl.appendChild(chip);
    }
    btn.appendChild(bodyEl);

    const status = document.createElement("span");
    status.className = "stage-status";
    const statusIcon = !unlocked
      ? iconLock
      : cleared
      ? iconCheck
      : iconChevronRight;
    status.appendChild(iconSpan(statusIcon));
    const bar = document.createElement("span");
    bar.className = "stage-status-bar";
    bar.style.background = !unlocked
      ? "var(--muted)"
      : `#${theme.background.toString(16).padStart(6, "0")}`;
    status.appendChild(bar);
    btn.appendChild(status);

    if (unlocked) {
      btn.addEventListener("click", () => this.onSelect(stageIndex));
    }
    return btn;
  }

  exit(): void {
    closeOverlay();
  }

  update(_dt: number): void {}
  render(_alpha: number): void {}
}
