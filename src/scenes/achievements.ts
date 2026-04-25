import { Container } from "pixi.js";
import type { Scene } from "./scene";
import type { AchievementState, AchievementId } from "../game/data/types";
import { ACHIEVEMENTS, type AchievementDef } from "../game/achievements";
import { ACHIEVEMENT_GLYPHS, setIconHtml } from "../icons";
import {
  openOverlay,
  closeOverlay,
  createOverlayTitle,
  createOverlaySub,
  createBodyScroll,
  createCardList,
  createBackButton,
} from "./ui";

// ── Achievement category grouping ──────────────────────────────────────────

interface AchievementCategory {
  label: string;
  ids: readonly AchievementId[];
}

const CATEGORIES: readonly AchievementCategory[] = [
  { label: "Progress", ids: ["firstBossKill", "firstPrimalSkill", "kill100", "kill1000", "clear3Stages"] },
  { label: "Difficulty", ids: ["noPowerNormalClear", "noPowerSurvival16", "survival32", "clearStage3", "clearStage4", "clearStage5"] },
  { label: "Style", ids: ["allWeapons", "fullEquipment", "maxSkillLevel", "own5Skins"] },
  { label: "Speed", ids: ["speedStage1", "speed5Waves", "bossRush3"] },
];

// ── Achievements browse scene ───────────────────────────────────────────────

export class AchievementsScene implements Scene {
  readonly root: Container;
  readonly id = "achievements";
  private readonly getState: () => AchievementState;
  private readonly onBack: () => void;

  constructor(getState: () => AchievementState, onBack: () => void) {
    this.root = new Container();
    this.getState = getState;
    this.onBack = onBack;
  }

  enter(): void {
    const { inner, content } = openOverlay();

    const state = this.getState();

    content.appendChild(createOverlayTitle("achievements"));

    const unlocked = Object.values(state).filter((e) => e.unlocked).length;
    const total = ACHIEVEMENTS.length;
    content.appendChild(createOverlaySub(`${unlocked}/${total} unlocked`));

    const body = createBodyScroll();
    content.appendChild(body);

    const achMap = new Map<string, AchievementDef>();
    for (const def of ACHIEVEMENTS) achMap.set(def.id, def);

    for (const cat of CATEGORIES) {
      const catLabel = createOverlaySub(cat.label);
      catLabel.style.marginTop = "12px";
      catLabel.style.fontWeight = "bold";
      body.appendChild(catLabel);

      const list = createCardList();

      for (const id of cat.ids) {
        const def = achMap.get(id);
        if (!def) continue;
        const entry = state[id];
        const btn = document.createElement("div");
        btn.className = "card-btn";
        if (!entry.unlocked) btn.style.opacity = "0.4";

        const glyph = document.createElement("span");
        glyph.className = "card-glyph";
        if (entry.unlocked) {
          const achSvg = ACHIEVEMENT_GLYPHS[def.id];
          if (achSvg) setIconHtml(glyph, achSvg);
          else glyph.textContent = def.glyph;
        } else {
          glyph.textContent = "?";
        }
        btn.appendChild(glyph);

        const cardBody = document.createElement("span");
        cardBody.className = "card-body";
        const name = document.createElement("span");
        name.className = "card-name";
        name.textContent = def.name;
        const desc = document.createElement("span");
        desc.className = "card-text";
        desc.textContent = entry.unlocked ? def.description : "???";
        cardBody.appendChild(name);
        cardBody.appendChild(desc);

        if (entry.unlocked && entry.unlockedAt) {
          const date = document.createElement("span");
          date.className = "card-rarity";
          date.textContent = new Date(entry.unlockedAt).toLocaleDateString();
          cardBody.appendChild(date);
        }

        btn.appendChild(cardBody);
        list.appendChild(btn);
      }
      body.appendChild(list);
    }

    inner.appendChild(createBackButton(() => this.onBack()));
  }

  exit(): void {
    closeOverlay();
  }

  update(_dt: number): void {}
  render(_alpha: number): void {}
}
