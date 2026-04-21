import { Container } from "pixi.js";
import type { Scene } from "./scene";
import type { PlayerProfile, StartingShapeId } from "../game/data/types";
import { STARTING_SHAPES, isStartingShapeUnlocked, resolveSelectedStartingShape, unlockProgress } from "../game/startingShapes";
import { glyphTriangle, iconSkins, iconSpan, SHOP_GLYPHS, setIconHtml } from "../icons";
import { openOverlay, closeOverlay, createOverlayTitle, createOverlaySub, createBodyScroll, createCardList, createBackButton } from "./ui";

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
    const { inner, content } = openOverlay();

    const profile = this.cb.getProfile();
    const selected = resolveSelectedStartingShape(profile);

    content.appendChild(createOverlayTitle("starting shape"));

    const sub = createOverlaySub("");
    sub.appendChild(iconSpan(iconSkins));
    sub.append(` total points: ${profile.stats.totalPointsEarned}`);
    content.appendChild(sub);

    const body = createBodyScroll();
    content.appendChild(body);

    const list = createCardList();

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

    inner.appendChild(createBackButton(() => this.cb.onBack()));
  }

  exit(): void {
    closeOverlay();
  }

  update(_dt: number): void {}
  render(_alpha: number): void {}
}
