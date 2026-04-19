import { Container } from "pixi.js";
import type { Scene } from "./scene";

// Combined overlay scene for game-over / win. Content varies by flavour; both
// end the run and offer a tap-to-restart button.

export type EndgameKind = "dead" | "won";

export class EndgameScene implements Scene {
  readonly root: Container;
  private readonly kind: EndgameKind;
  private readonly wavesCleared: number;
  private readonly totalWaves: number;
  private readonly onRestart: () => void;

  constructor(kind: EndgameKind, wavesCleared: number, totalWaves: number, onRestart: () => void) {
    this.root = new Container();
    this.kind = kind;
    this.wavesCleared = wavesCleared;
    this.totalWaves = totalWaves;
    this.onRestart = onRestart;
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
