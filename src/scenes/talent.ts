import { Container } from "pixi.js";
import type { Scene } from "./scene";
import type { PlayerProfile, TalentId } from "../game/data/types";
import {
  TALENT_BRANCH_ORDER,
  TALENT_NODES,
  type TalentEffectKind,
  type TalentBranch,
} from "../game/content/talents";
import {
  TALENT_RESET_COST,
  talentBonuses,
  talentDefinition,
  talentLevel,
  talentNodeBonus,
  talentPrerequisiteMessage,
  type TalentActionResult,
} from "../game/talents";
import {
  closeOverlay,
  createBackButton,
  createBodyScroll,
  createCardList,
  createOverlaySub,
  createOverlayTitle,
  openOverlay,
} from "./ui";
import type { NotifyType } from "../app/notificationService";

export interface TalentSceneCallbacks {
  getProfile: () => PlayerProfile;
  onUpgrade: (id: TalentId) => Promise<TalentActionResult>;
  onReset: () => Promise<TalentActionResult>;
  onBack: () => void;
  notify: (message: string, type: NotifyType) => void;
}

export class TalentScene implements Scene {
  readonly root: Container;
  private readonly cb: TalentSceneCallbacks;

  constructor(cb: TalentSceneCallbacks) {
    this.root = new Container();
    this.cb = cb;
  }

  enter(): void {
    const { inner, content } = openOverlay({ constrained: true });
    const profile = this.cb.getProfile();
    const bonuses = talentBonuses(profile.talents);

    content.appendChild(createOverlayTitle("talent growth"));
    content.appendChild(
      createOverlaySub(
        `points: ${profile.points} · basic: ${profile.fragments.basic} · elite: ${profile.fragments.elite}`,
      ),
    );
    content.appendChild(
      createOverlaySub(this.formatBonusSummary(bonuses)),
    );

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "menu-btn";
    resetBtn.textContent = `Reset talents (${TALENT_RESET_COST.basic} basic + ${TALENT_RESET_COST.elite} elite)`;
    resetBtn.addEventListener("click", () => {
      void this.handleReset();
    });
    content.appendChild(resetBtn);

    const body = createBodyScroll();
    content.appendChild(body);
    const list = createCardList();
    body.appendChild(list);

    for (const branch of TALENT_BRANCH_ORDER) {
      list.appendChild(this.createBranchTitle(branch));
      const ids = (Object.keys(TALENT_NODES) as TalentId[]).filter(
        (id) => TALENT_NODES[id].branch === branch,
      );
      for (const id of ids) {
        list.appendChild(this.createTalentCard(profile, id));
      }
    }

    inner.appendChild(createBackButton(() => this.cb.onBack()));
  }

  exit(): void {
    closeOverlay({ constrained: true });
  }

  update(_dt: number): void {}
  render(_alpha: number): void {}

  private createBranchTitle(branch: TalentBranch): HTMLElement {
    const BRANCH_LABELS: Record<TalentBranch, string> = {
      survival: "survival branch",
      offense: "offense branch",
      efficiency: "efficiency branch",
    };
    const el = document.createElement("div");
    el.className = "overlay-sub";
    el.style.textAlign = "left";
    el.style.margin = "2px 4px 0";
    el.style.letterSpacing = "0.08em";
    el.style.textTransform = "uppercase";
    el.textContent = BRANCH_LABELS[branch];
    return el;
  }

  private createTalentCard(profile: PlayerProfile, id: TalentId): HTMLElement {
    const def = talentDefinition(id);
    const level = talentLevel(profile.talents, id);
    const maxLevel = def.levels.length;
    const row = document.createElement("div");
    row.className = "card-btn";
    row.style.flexDirection = "column";
    row.style.alignItems = "flex-start";

    const name = document.createElement("span");
    name.className = "card-name";
    name.textContent =
      level >= maxLevel ? `${def.name} (MAX)` : `${def.name} (Lv.${level}/${maxLevel})`;
    row.appendChild(name);

    const desc = document.createElement("span");
    desc.className = "card-text";
    desc.style.whiteSpace = "pre-line";
    const next = def.levels[level];
    const prerequisiteMessage = talentPrerequisiteMessage(profile.talents, id);
    if (prerequisiteMessage) {
      desc.textContent = `${def.description}\n${prerequisiteMessage}`;
      row.style.opacity = "0.55";
    } else if (!next) {
      desc.textContent = `${def.description}\nCurrent bonus: ${this.formatNodeBonus(def.effectKind, talentNodeBonus(profile.talents, id))}`;
    } else {
      desc.textContent = `${def.description}\nCurrent bonus: ${this.formatNodeBonus(def.effectKind, talentNodeBonus(profile.talents, id))}\nNext cost: ${next.pointCost} pts + ${next.fragmentCost} ${def.fragmentKind}`;
    }
    row.appendChild(desc);

    if (next) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "menu-btn";
      btn.style.marginTop = "8px";
      btn.textContent = "Upgrade";
      btn.disabled =
        profile.points < next.pointCost ||
        profile.fragments[def.fragmentKind] < next.fragmentCost;
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        void this.handleUpgrade(id);
      });
      row.appendChild(btn);
    }

    return row;
  }

  private async handleUpgrade(id: TalentId): Promise<void> {
    const result = await this.cb.onUpgrade(id);
    this.cb.notify(
      result.ok ? "Talent upgraded." : result.reason ?? "Upgrade failed.",
      result.ok ? "success" : "error",
    );
    this.enter();
  }

  private async handleReset(): Promise<void> {
    const result = await this.cb.onReset();
    this.cb.notify(
      result.ok ? "Talents reset, points refunded." : result.reason ?? "Reset failed.",
      result.ok ? "success" : "error",
    );
    this.enter();
  }

  private formatNodeBonus(
    effectKind: TalentEffectKind,
    total: number,
  ): string {
    switch (effectKind) {
      case "maxHpAdd":
        return `+${Math.round(total)} max HP`;
      case "iframeAdd":
        return `+${total.toFixed(2)}s iframe`;
      case "damageAdd":
        return `+${Math.round(total)} damage`;
      case "critAdd":
        return `+${(total * 100).toFixed(0)}% crit`;
      case "pointRewardMul":
        return `+${(total * 100).toFixed(0)}% run points`;
      case "fragmentRewardMul":
        return `+${(total * 100).toFixed(0)}% fragments`;
      default:
        return `${total}`;
    }
  }

  private formatBonusSummary(
    bonuses: ReturnType<typeof talentBonuses>,
  ): string {
    const parts: Array<{ label: string; value: string }> = [
      { label: "hp", value: `${bonuses.maxHpAdd}` },
      { label: "dmg", value: `${bonuses.damageAdd}` },
      { label: "crit", value: `${(bonuses.critAdd * 100).toFixed(0)}%` },
      { label: "pts", value: `${(bonuses.pointRewardMul * 100).toFixed(0)}%` },
      { label: "frag", value: `${(bonuses.fragmentRewardMul * 100).toFixed(0)}%` },
    ];
    return parts.map((part) => `+${part.label} ${part.value}`).join(" · ");
  }
}
