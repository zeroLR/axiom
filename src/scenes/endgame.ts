import { Container } from "pixi.js";
import type { Scene } from "./scene";

// Combined overlay scene for game-over / win. Content varies by flavour; both
// end the run and offer a tap-to-restart button.

export type EndgameKind = "dead" | "won";

/** Items unlocked by this run (computed by diffUnlocks). */
export interface EndgameUnlocks {
  newCards: string[];
  newSkills: string[];
}

export class EndgameScene implements Scene {
  readonly root: Container;
  private readonly kind: EndgameKind;
  private readonly wavesCleared: number;
  private readonly totalWaves: number;
  private readonly onRestart: () => void;
  private readonly unlocks?: EndgameUnlocks;

  constructor(
    kind: EndgameKind,
    wavesCleared: number,
    totalWaves: number,
    onRestart: () => void,
    unlocks?: EndgameUnlocks,
  ) {
    this.root = new Container();
    this.kind = kind;
    this.wavesCleared = wavesCleared;
    this.totalWaves = totalWaves;
    this.onRestart = onRestart;
    this.unlocks = unlocks;
  }

  enter(): void {
    const overlay = document.getElementById("overlay");
    const inner = document.getElementById("overlay-inner");
    if (!overlay || !inner) return;
    inner.innerHTML = "";

    const title = document.createElement("div");
    title.className = "overlay-title";
    title.textContent = this.kind === "dead" ? "shattered" : "run complete";
    inner.appendChild(title);

    const sub = document.createElement("div");
    sub.className = "overlay-sub";
    sub.textContent =
      this.kind === "dead"
        ? `reached wave ${this.wavesCleared}/${this.totalWaves}`
        : `cleared ${this.totalWaves}/${this.totalWaves} waves`;
    inner.appendChild(sub);

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
