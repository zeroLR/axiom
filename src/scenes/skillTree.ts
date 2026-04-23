import { Container } from "pixi.js";
import type { Scene } from "./scene";
import type { CharacterSlot } from "../game/data/types";
import { CLASS_NODES } from "../game/content/classes";
import { getActiveNodeChain } from "../game/classes";
import {
  PRIMAL_SKILLS,
  skillDuration,
  skillCooldown,
  type PrimalSkillDef,
} from "../game/skills";
import type { PrimalSkillId } from "../game/data/types";
import { SKILL_GLYPHS, setIconHtml } from "../icons";
import { openOverlay, closeOverlay, createOverlayTitle, createOverlaySub, createBodyScroll, createCardList, createBackButton } from "./ui";

// ── Skill Tree scene (DOM overlay) ──────────────────────────────────────────
// Now shows class-derived skills instead of the legacy gacha system.

export interface SkillTreeCallbacks {
  getActiveSlot: () => CharacterSlot | null;
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

    const slot = this.cb.getActiveSlot();

    content.appendChild(createOverlayTitle("primal skills"));
    content.appendChild(createOverlaySub(
      slot ? `${slot.lineage.toUpperCase()} T${slot.tier} — skills from class promotions` : "no active character"
    ));

    const body = createBodyScroll();
    content.appendChild(body);
    const list = createCardList();

    // Collect skills granted by the active node chain.
    const granted = new Map<PrimalSkillId, boolean>();
    if (slot) {
      for (const nodeId of getActiveNodeChain(slot)) {
        const node = CLASS_NODES[nodeId];
        if (node?.skillId) granted.set(node.skillId, true);
      }
    }

    // Render all skills — unlocked ones show full info; locked ones are dimmed.
    for (const def of Object.values(PRIMAL_SKILLS) as PrimalSkillDef[]) {
      const isGranted = granted.has(def.id);
      const btn = document.createElement("div");
      btn.className = "card-btn";
      btn.style.flexDirection = "column";
      btn.style.alignItems = "flex-start";
      if (!isGranted) btn.style.opacity = "0.4";

      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.gap = "8px";
      header.style.width = "100%";

      const glyph = document.createElement("span");
      glyph.className = "card-glyph";
      if (isGranted) {
        const skillSvg = SKILL_GLYPHS[def.id];
        if (skillSvg) setIconHtml(glyph, skillSvg);
        else glyph.textContent = def.glyph;
      } else {
        glyph.textContent = "○";
      }
      header.appendChild(glyph);

      const nameSpan = document.createElement("span");
      nameSpan.className = "card-name";
      nameSpan.textContent = isGranted ? def.name : `${def.name} — not yet unlocked`;
      header.appendChild(nameSpan);
      btn.appendChild(header);

      const desc = document.createElement("span");
      desc.className = "card-text";
      desc.style.marginTop = "4px";
      if (isGranted) {
        const dur = skillDuration(def, 0).toFixed(1);
        const cd = skillCooldown(def, 0).toFixed(1);
        desc.textContent = `${def.description}\nDuration: ${dur}s · Cooldown: ${cd}s`;
        desc.style.whiteSpace = "pre-line";
      } else {
        desc.textContent = "Promote your class to unlock this skill.";
      }
      btn.appendChild(desc);

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
