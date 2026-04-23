import { Container } from "pixi.js";
import type { Scene } from "./scene";
import { closeOverlay, createOverlayTitle, createOverlaySub, initOverlay } from "./ui";
import type { FragmentTally } from "../game/rewards";

// Combined overlay scene for game-over / win. Content varies by flavour; both
// end the run and offer a tap-to-restart button.

export type EndgameKind = "dead" | "won";

/** Items unlocked by this run (computed by diffUnlocks). */
export interface EndgameUnlocks {
  /** Card display names that became available. */
  newCards: string[];
  /** Skill display names that became available. */
  newSkills: string[];
}

export class EndgameScene implements Scene {
  readonly root: Container;
  private readonly kind: EndgameKind;
  private readonly wavesCleared: number;
  private readonly totalWaves: number;
  private readonly onRestart: () => void;
  private readonly unlocks?: EndgameUnlocks;
  private readonly fragments?: FragmentTally;

  constructor(
    kind: EndgameKind,
    wavesCleared: number,
    totalWaves: number,
    onRestart: () => void,
    unlocks?: EndgameUnlocks,
    fragments?: FragmentTally,
  ) {
    this.root = new Container();
    this.kind = kind;
    this.wavesCleared = wavesCleared;
    this.totalWaves = totalWaves;
    this.onRestart = onRestart;
    this.unlocks = unlocks;
    this.fragments = fragments;
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

    // Fragment haul summary
    if (this.fragments) {
      const { basic, elite, boss } = this.fragments;
      const total = basic + elite + boss;
      if (total > 0) {
        const haul = document.createElement("div");
        haul.style.fontFamily = "ui-monospace, monospace";
        haul.style.textTransform = "uppercase";
        haul.style.letterSpacing = "0.08em";
        haul.style.textAlign = "center";
        haul.style.margin = "12px 0";
        haul.style.padding = "10px";
        haul.style.border = "1px solid currentColor";
        haul.style.opacity = "0.9";

        const heading = document.createElement("div");
        heading.style.fontWeight = "bold";
        heading.style.marginBottom = "6px";
        heading.textContent = "FRAGMENT HAUL";
        haul.appendChild(heading);

        const lines: string[] = [];
        if (basic > 0) lines.push(`BASIC ×${basic}`);
        if (elite > 0) lines.push(`ELITE ×${elite}`);
        if (boss > 0) lines.push(`BOSS ×${boss}`);

        const detail = document.createElement("div");
        detail.style.fontSize = "0.9em";
        detail.textContent = lines.join("  |  ");
        haul.appendChild(detail);

        inner.appendChild(haul);
      }
    }

    // DOMAIN SEALED — unlock banner
    if (this.unlocks && (this.unlocks.newCards.length > 0 || this.unlocks.newSkills.length > 0)) {
      const banner = document.createElement("div");
      banner.style.fontFamily = "ui-monospace, monospace";
      banner.style.textTransform = "uppercase";
      banner.style.letterSpacing = "0.08em";
      banner.style.textAlign = "center";
      banner.style.margin = "12px 0";
      banner.style.padding = "10px";
      banner.style.border = "1px solid currentColor";
      banner.style.opacity = "0.9";

      const heading = document.createElement("div");
      heading.style.fontWeight = "bold";
      heading.style.marginBottom = "6px";
      heading.textContent = "DOMAIN SEALED";
      banner.appendChild(heading);

      const items = [...this.unlocks.newCards, ...this.unlocks.newSkills];
      const unlockLine = document.createElement("div");
      unlockLine.textContent = `UNLOCKED: ${items.join(", ")}`;
      banner.appendChild(unlockLine);

      inner.appendChild(banner);
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "big-btn";
    btn.textContent = "new run";
    btn.addEventListener("click", () => this.onRestart());
    inner.appendChild(btn);
  }

  exit(): void {
    closeOverlay();
  }

  update(_dt: number): void {}

  render(_alpha: number): void {}
}
