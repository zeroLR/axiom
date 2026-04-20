import { Container } from "pixi.js";
import type { Scene } from "./scene";
import { iconBack, iconSpan } from "../icons";
import { isMuted, setMuted } from "../game/audio";
import { isScreenShakeEnabled, setScreenShakeEnabled } from "../game/screenShake";

// ── Settings scene (DOM overlay) ────────────────────────────────────────────

export interface SettingsCallbacks {
  onBack: () => void;
  onChanged: () => void;
}

export class SettingsScene implements Scene {
  readonly root: Container;
  private readonly cb: SettingsCallbacks;

  constructor(cb: SettingsCallbacks) {
    this.root = new Container();
    this.cb = cb;
  }

  enter(): void {
    const overlay = document.getElementById("overlay");
    const inner = document.getElementById("overlay-inner");
    if (!overlay || !inner) return;
    inner.innerHTML = "";

    const title = document.createElement("div");
    title.className = "overlay-title";
    title.textContent = "Settings";
    inner.appendChild(title);

    // ── Sound toggle ────────────────────────────────────────────────────────
    const soundRow = this.createToggleRow(
      "Sound effects",
      !isMuted(),
      (on) => {
        setMuted(!on);
        this.cb.onChanged();
      },
    );
    inner.appendChild(soundRow);

    // ── Screen shake toggle ─────────────────────────────────────────────────
    const shakeRow = this.createToggleRow(
      "Screen shake",
      isScreenShakeEnabled(),
      (on) => {
        setScreenShakeEnabled(on);
        this.cb.onChanged();
      },
    );
    inner.appendChild(shakeRow);

    // ── Back button ─────────────────────────────────────────────────────────
    const back = document.createElement("button");
    back.type = "button";
    back.className = "big-btn";
    back.style.marginTop = "8px";
    back.appendChild(iconSpan(iconBack));
    back.append(" back");
    back.addEventListener("click", () => this.cb.onBack());
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

  private createToggleRow(
    label: string,
    initial: boolean,
    onChange: (on: boolean) => void,
  ): HTMLElement {
    const row = document.createElement("div");
    row.className = "developer-form-row";
    row.style.padding = "10px 0";
    row.style.borderBottom = "1px solid var(--chrome)";

    const labelEl = document.createElement("span");
    labelEl.className = "developer-form-label";
    labelEl.style.fontSize = "14px";
    labelEl.textContent = label;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "secondary-btn";
    toggle.style.flex = "0 0 auto";
    toggle.style.minWidth = "72px";

    const update = (on: boolean): void => {
      toggle.textContent = on ? "ON" : "OFF";
      toggle.style.borderColor = on ? "var(--fg)" : "#ccc";
      toggle.style.color = on ? "var(--fg)" : "var(--muted)";
    };

    let state = initial;
    update(state);

    toggle.addEventListener("click", () => {
      state = !state;
      update(state);
      onChange(state);
    });

    row.appendChild(labelEl);
    row.appendChild(toggle);
    return row;
  }
}
