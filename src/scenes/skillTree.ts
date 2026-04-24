import { Container } from "pixi.js";
import type { Scene } from "./scene";
import type { PrimalSkillId, SkillTreeState } from "../game/data/types";
import { MAX_SKILL_LEVEL } from "../game/data/types";
import {
  PRIMAL_SKILLS,
  upgradeCost,
  skillDuration,
  skillCooldown,
  type PrimalSkillDef,
} from "../game/skills";
import { SKILL_GLYPHS, setIconHtml } from "../icons";
import { openOverlay, closeOverlay, createOverlayTitle, createOverlaySub, createBodyScroll, createCardList, createBackButton } from "./ui";
import type { NotifyType } from "../app/notificationService";

// ── Skill Tree scene (DOM overlay) ──────────────────────────────────────────

export interface SkillTreeCallbacks {
  getState: () => SkillTreeState;
  /** Returns skill IDs currently unlocked by the active character's class. */
  getUnlockedSkillIds: () => PrimalSkillId[];
  onStateChanged: (state: SkillTreeState) => void;
  onBack: () => void;
  notify: (message: string, type: NotifyType) => void;
}

export class SkillTreeScene implements Scene {
  readonly root: Container;
  private readonly cb: SkillTreeCallbacks;

  constructor(cb: SkillTreeCallbacks) {
    this.root = new Container();
    this.cb = cb;
  }

  enter(): void {
    const { inner, content } = openOverlay();

    const state = this.cb.getState();
    const unlockedIds = new Set(this.cb.getUnlockedSkillIds());

    content.appendChild(createOverlayTitle("primal skills"));
    content.appendChild(createOverlaySub(`skill pts: ${state.skillPoints}`));

    const body = createBodyScroll();
    content.appendChild(body);

    const list = createCardList();

    for (const def of Object.values(PRIMAL_SKILLS) as PrimalSkillDef[]) {
      const entry = state.skills[def.id];
      const isUnlocked = unlockedIds.has(def.id);
      const btn = document.createElement("div");
      btn.className = "card-btn";
      btn.style.flexDirection = "column";
      btn.style.alignItems = "flex-start";
      if (!isUnlocked) btn.style.opacity = "0.4";

      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.gap = "8px";
      header.style.width = "100%";

      const glyph = document.createElement("span");
      glyph.className = "card-glyph";
      if (!isUnlocked) {
        glyph.textContent = "🔒";
      } else {
        const skillSvg = SKILL_GLYPHS[def.id];
        if (skillSvg) setIconHtml(glyph, skillSvg);
        else glyph.textContent = def.glyph;
      }
      header.appendChild(glyph);

      const nameSpan = document.createElement("span");
      nameSpan.className = "card-name";
      if (!isUnlocked) {
        nameSpan.textContent = `${def.name} — locked`;
      } else {
        const isMaxed = entry && entry.level >= MAX_SKILL_LEVEL;
        const level = entry?.level ?? 0;
        nameSpan.textContent = isMaxed ? `${def.name} (MAX)` : `${def.name} (Lv.${level})`;
      }
      header.appendChild(nameSpan);
      btn.appendChild(header);

      const desc = document.createElement("span");
      desc.className = "card-text";
      desc.style.marginTop = "4px";
      if (!isUnlocked) {
        desc.textContent = "UNLOCK VIA CLASS PROMOTION";
      } else if (entry) {
        const dur = skillDuration(def, entry.level).toFixed(1);
        const cd = skillCooldown(def, entry.level).toFixed(1);
        desc.textContent = `${def.description}\nDuration: ${dur}s · Cooldown: ${cd}s`;
        desc.style.whiteSpace = "pre-line";
      }
      btn.appendChild(desc);

      // Upgrade button (only for unlocked skills below max level)
      if (isUnlocked && entry && entry.level < MAX_SKILL_LEVEL) {
        const cost = upgradeCost(entry.level);
        const canUpgrade = state.skillPoints >= cost;
        const upBtn = document.createElement("button");
        upBtn.type = "button";
        upBtn.className = "menu-btn";
        upBtn.style.marginTop = "6px";
        upBtn.textContent = `Upgrade (${cost} pts)`;
        upBtn.disabled = !canUpgrade;
        if (!canUpgrade) upBtn.style.opacity = "0.5";
        upBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (state.skillPoints >= cost) {
            state.skillPoints -= cost;
            entry.level += 1;
            this.cb.onStateChanged(state);
            this.enter();
          }
        });
        btn.appendChild(upBtn);
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
