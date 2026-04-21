import { Container } from "pixi.js";
import type { Scene } from "./scene";
import type { PlayerStats, SkillTreeState } from "../game/data/types";
import { MAX_SKILL_LEVEL } from "../game/data/types";
import {
  PRIMAL_SKILLS,
  drawPrimalSkill,
  upgradeCost,
  skillDuration,
  skillCooldown,
  type PrimalSkillDef,
} from "../game/skills";
import { isSkillUnlocked } from "../game/unlocks";
import type { Rng } from "../game/rng";
import { iconSpan, glyphStar4, SKILL_GLYPHS, setIconHtml } from "../icons";
import { openOverlay, closeOverlay, createOverlayTitle, createOverlaySub, createBodyScroll, createCardList, createBackButton } from "./ui";

// ── Skill Tree scene (DOM overlay) ──────────────────────────────────────────

export interface SkillTreeCallbacks {
  getState: () => SkillTreeState;
  getStats: () => PlayerStats;
  getRng: () => Rng;
  onStateChanged: (state: SkillTreeState) => void;
  onBack: () => void;
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
    const stats = this.cb.getStats();

    content.appendChild(createOverlayTitle("primal skills"));

    // Resources bar
    content.appendChild(createOverlaySub(`cores: ${state.cores}  ·  skill pts: ${state.skillPoints}`));

    // Draw button
    if (state.cores > 0) {
      const drawBtn = document.createElement("button");
      drawBtn.type = "button";
      drawBtn.className = "big-btn";
      drawBtn.appendChild(iconSpan(glyphStar4));
      drawBtn.append(" Draw skill (1 core)");
      drawBtn.addEventListener("click", () => {
        const rng = this.cb.getRng();
        const result = drawPrimalSkill(state, rng, stats);
        if (result) {
          this.cb.onStateChanged(state);
          this.enter(); // re-render
          if (result.type === "new") {
            alert(`New skill unlocked: ${PRIMAL_SKILLS[result.skillId].name}!`);
          } else {
            alert(`Duplicate! +${result.pointsAwarded} skill points.`);
          }
        }
      });
      content.appendChild(drawBtn);
    }

    const body = createBodyScroll();
    content.appendChild(body);

    // Skill list
    const list = createCardList();

    for (const def of Object.values(PRIMAL_SKILLS) as PrimalSkillDef[]) {
      const entry = state.skills[def.id];
      const bossGated = !isSkillUnlocked(def, stats);
      const btn = document.createElement("div");
      btn.className = "card-btn";
      btn.style.flexDirection = "column";
      btn.style.alignItems = "flex-start";
      if (bossGated) btn.style.opacity = "0.4";

      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.gap = "8px";
      header.style.width = "100%";

      const glyph = document.createElement("span");
      glyph.className = "card-glyph";
      if (bossGated) {
        glyph.textContent = "🔒";
      } else {
        const skillSvg = SKILL_GLYPHS[def.id];
        if (skillSvg) setIconHtml(glyph, skillSvg);
        else glyph.textContent = def.glyph;
      }
      header.appendChild(glyph);

      const nameSpan = document.createElement("span");
      nameSpan.className = "card-name";
      if (bossGated) {
        nameSpan.textContent = "??? — locked";
      } else if (entry.unlocked) {
        const isMaxed = entry.level >= MAX_SKILL_LEVEL;
        nameSpan.textContent = isMaxed ? `${def.name} (MAX)` : `${def.name} (Lv.${entry.level})`;
      } else {
        nameSpan.textContent = `${def.name} — locked`;
      }
      header.appendChild(nameSpan);
      btn.appendChild(header);

      const desc = document.createElement("span");
      desc.className = "card-text";
      desc.style.marginTop = "4px";
      if (bossGated) {
        const bossName = def.unlockAfterBoss
          ? def.unlockAfterBoss.toUpperCase()
          : "???";
        desc.textContent = `UNLOCKS: DEFEAT ${bossName}`;
      } else if (entry.unlocked) {
        const dur = skillDuration(def, entry.level).toFixed(1);
        const cd = skillCooldown(def, entry.level).toFixed(1);
        desc.textContent = `${def.description}\nDuration: ${dur}s · Cooldown: ${cd}s`;
        desc.style.whiteSpace = "pre-line";
      } else {
        desc.textContent = "Draw from cores to unlock.";
      }
      btn.appendChild(desc);

      // Upgrade button (only for boss-available, unlocked skills)
      if (!bossGated && entry.unlocked && entry.level < MAX_SKILL_LEVEL) {
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
