import { Container } from "pixi.js";
import type { Scene } from "./scene";
import type { PlayerStats, SkillTreeState } from "../game/data/types";
import { ALL_ENEMY_KINDS } from "../game/enemies/kinds";
import { getEnemyDef } from "../game/enemies/registry";
import { PRIMAL_SKILLS, skillCooldown, skillDuration } from "../game/skills";
import { ENEMY_GLYPHS, SKILL_GLYPHS, setIconHtml } from "../icons";
import {
  openOverlay,
  closeOverlay,
  createOverlayTitle,
  createOverlaySub,
  createBodyScroll,
  createCardList,
  createBackButton,
} from "./ui";

export class CodexScene implements Scene {
  readonly root: Container;
  private readonly getStats: () => PlayerStats;
  private readonly getSkillTree: () => SkillTreeState;
  private readonly onBack: () => void;

  constructor(
    getStats: () => PlayerStats,
    getSkillTree: () => SkillTreeState,
    onBack: () => void,
  ) {
    this.root = new Container();
    this.getStats = getStats;
    this.getSkillTree = getSkillTree;
    this.onBack = onBack;
  }

  enter(): void {
    const { inner, content } = openOverlay();
    const stats = this.getStats();
    const tree = this.getSkillTree();

    content.appendChild(createOverlayTitle("codex"));
    content.appendChild(createOverlaySub("enemies · abilities"));

    const body = createBodyScroll();
    content.appendChild(body);

    const enemyTitle = createOverlaySub("Enemies");
    enemyTitle.style.fontWeight = "bold";
    body.appendChild(enemyTitle);
    const enemyList = createCardList();
    for (const kind of ALL_ENEMY_KINDS) {
      const def = getEnemyDef(kind);
      const card = document.createElement("div");
      card.className = "card-btn";
      const glyph = document.createElement("span");
      glyph.className = "card-glyph codex-glyph codex-glyph--enemy";
      const svg = ENEMY_GLYPHS[kind];
      if (svg) setIconHtml(glyph, svg);
      else glyph.textContent = "◌";
      card.appendChild(glyph);
      const cardBody = document.createElement("span");
      cardBody.className = "card-body";
      const name = document.createElement("span");
      name.className = "card-name";
      name.textContent = kind.toUpperCase();
      const desc = document.createElement("span");
      desc.className = "card-text";
      desc.textContent = `HP ${def.stats.hp} · SPD ${Math.round(def.stats.maxSpeed)} · ATK ${def.stats.contactDamage} · Kills ${stats.enemyKills[kind] ?? 0}`;
      cardBody.appendChild(name);
      cardBody.appendChild(desc);
      card.appendChild(cardBody);
      enemyList.appendChild(card);
    }
    body.appendChild(enemyList);

    const abilityTitle = createOverlaySub("Abilities");
    abilityTitle.style.marginTop = "10px";
    abilityTitle.style.fontWeight = "bold";
    body.appendChild(abilityTitle);
    const abilityList = createCardList();
    for (const def of Object.values(PRIMAL_SKILLS)) {
      const entry = tree.skills[def.id];
      const card = document.createElement("div");
      card.className = "card-btn";
      const glyph = document.createElement("span");
      glyph.className = "card-glyph codex-glyph codex-glyph--skill";
      const svg = SKILL_GLYPHS[def.id];
      if (svg) setIconHtml(glyph, svg);
      else glyph.textContent = def.glyph;
      card.appendChild(glyph);
      const cardBody = document.createElement("span");
      cardBody.className = "card-body";
      const name = document.createElement("span");
      name.className = "card-name";
      name.textContent = `${def.name} · Lv${entry.level}`;
      const desc = document.createElement("span");
      desc.className = "card-text";
      desc.textContent = `${def.description} · Duration ${skillDuration(def, entry.level).toFixed(1)}s · Cooldown ${skillCooldown(def, entry.level).toFixed(1)}s`;
      cardBody.appendChild(name);
      cardBody.appendChild(desc);
      card.appendChild(cardBody);
      abilityList.appendChild(card);
    }
    body.appendChild(abilityList);

    inner.appendChild(createBackButton(() => this.onBack()));
  }

  exit(): void {
    closeOverlay();
  }

  update(_dt: number): void {}
  render(_alpha: number): void {}
}
