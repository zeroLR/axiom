import { Container } from "pixi.js";
import type { Scene } from "./scene";
import type { PlayerProfile, StartingShapeId } from "../game/data/types";
import { STARTING_SHAPES, isStartingShapeUnlocked, resolveSelectedStartingShape, unlockProgress } from "../game/startingShapes";
import { glyphTriangle, iconBack, iconSkins, iconSpan, SHOP_GLYPHS, setIconHtml } from "../icons";

export interface StartShapeCallbacks {
  getProfile: () => PlayerProfile;
  onSelect: (shapeId: StartingShapeId) => void;
  onBack: () => void;
}

export class StartShapeSelectScene implements Scene {
  readonly root: Container;
  private readonly cb: StartShapeCallbacks;

  constructor(cb: StartShapeCallbacks) {
    this.root = new Container();
    this.cb = cb;
  }

  enter(): void {
    const overlay = document.getElementById("overlay");
    const inner = document.getElementById("overlay-inner");
    if (!overlay || !inner) return;
    inner.innerHTML = "";
    const content = document.createElement("div");
    content.className = "overlay-scroll";
    inner.appendChild(content);

    const profile = this.cb.getProfile();
    const selected = resolveSelectedStartingShape(profile);

    const title = document.createElement("div");
    title.className = "overlay-title";
    title.textContent = "starting shape";
    content.appendChild(title);

    const sub = document.createElement("div");
    sub.className = "overlay-sub";
    sub.appendChild(iconSpan(iconSkins));
    sub.append(` total points: ${profile.stats.totalPointsEarned}`);
    content.appendChild(sub);

    const body = document.createElement("div");
    body.className = "overlay-body-scroll";
    content.appendChild(body);

    const list = document.createElement("div");
    list.className = "card-list";

    for (const shape of STARTING_SHAPES) {
      const unlocked = isStartingShapeUnlocked(profile, shape.id);
      const isSelected = selected === shape.id;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = isSelected ? "card-btn selected" : "card-btn";
      if (!unlocked) btn.style.opacity = "0.6";

      const glyph = document.createElement("span");
      glyph.className = "card-glyph";
      if (shape.id === "triangle") {
        setIconHtml(glyph, glyphTriangle);
      } else {
        const skinId = shape.id === "square" ? "skin-square" : "skin-diamond";
        setIconHtml(glyph, SHOP_GLYPHS[skinId]!);
      }
      btn.appendChild(glyph);

      const body = document.createElement("span");
      body.className = "card-body";
      const name = document.createElement("span");
      name.className = "card-name";
      name.textContent = `${shape.name} — ${shape.weaponName}`;
      const desc = document.createElement("span");
      desc.className = "card-text";
      if (unlocked) {
        desc.textContent = isSelected ? "selected" : "tap to select";
      } else {
        const p = unlockProgress(profile, shape.id);
        desc.textContent = `locked: ${p.current}/${p.required} cumulative points`;
      }
      body.appendChild(name);
      body.appendChild(desc);
      btn.appendChild(body);

      if (unlocked && !isSelected) {
        btn.addEventListener("click", () => {
          this.cb.onSelect(shape.id);
          this.enter();
        });
      } else if (!unlocked) {
        btn.disabled = true;
      }

      list.appendChild(btn);
    }

    body.appendChild(list);

    const back = document.createElement("button");
    back.type = "button";
    back.className = "big-btn";
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
}
