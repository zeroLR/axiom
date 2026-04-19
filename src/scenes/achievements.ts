import { Container } from "pixi.js";
import type { Scene } from "./scene";
import type { AchievementState, AchievementId } from "../game/data/types";
import { ACHIEVEMENTS, type AchievementDef } from "../game/achievements";
import { iconBack, iconSpan, ACHIEVEMENT_GLYPHS, setIconHtml } from "../icons";

// ── Achievement category grouping ──────────────────────────────────────────

interface AchievementCategory {
  label: string;
  ids: readonly AchievementId[];
}

const CATEGORIES: readonly AchievementCategory[] = [
  { label: "Progress", ids: ["firstBossKill", "firstPrimalSkill", "kill100", "kill1000", "clear3Stages"] },
  { label: "Difficulty", ids: ["noPowerNormalClear", "noPowerSurvival16", "survival32", "clearStage3"] },
  { label: "Style", ids: ["allWeapons", "fullEquipment", "maxSkillLevel", "own5Skins"] },
  { label: "Speed", ids: ["speedStage1", "speed5Waves", "bossRush3"] },
];

// ── Achievements browse scene ───────────────────────────────────────────────

export class AchievementsScene implements Scene {
  readonly root: Container;
  private readonly getState: () => AchievementState;
  private readonly onBack: () => void;

  constructor(getState: () => AchievementState, onBack: () => void) {
    this.root = new Container();
    this.getState = getState;
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

    const state = this.getState();

    const title = document.createElement("div");
    title.className = "overlay-title";
    title.textContent = "achievements";
    content.appendChild(title);

    const unlocked = Object.values(state).filter((e) => e.unlocked).length;
    const total = ACHIEVEMENTS.length;
    const sub = document.createElement("div");
    sub.className = "overlay-sub";
    sub.textContent = `${unlocked}/${total} unlocked`;
    content.appendChild(sub);

    const body = document.createElement("div");
    body.className = "overlay-body-scroll";
    content.appendChild(body);

    const achMap = new Map<string, AchievementDef>();
    for (const def of ACHIEVEMENTS) achMap.set(def.id, def);

    for (const cat of CATEGORIES) {
      const catLabel = document.createElement("div");
      catLabel.className = "overlay-sub";
      catLabel.style.marginTop = "12px";
      catLabel.style.fontWeight = "bold";
      catLabel.textContent = cat.label;
      body.appendChild(catLabel);

      const list = document.createElement("div");
      list.className = "card-list";

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

        const body = document.createElement("span");
        body.className = "card-body";
        const name = document.createElement("span");
        name.className = "card-name";
        name.textContent = def.name;
        const desc = document.createElement("span");
        desc.className = "card-text";
        desc.textContent = entry.unlocked ? def.description : "???";
        body.appendChild(name);
        body.appendChild(desc);

        if (entry.unlocked && entry.unlockedAt) {
          const date = document.createElement("span");
          date.className = "card-rarity";
          date.textContent = new Date(entry.unlockedAt).toLocaleDateString();
          body.appendChild(date);
        }

        btn.appendChild(body);
        list.appendChild(btn);
      }
      body.appendChild(list);
    }

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
