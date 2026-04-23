import { Container } from "pixi.js";
import type { Scene } from "./scene";
import type { PlayerProfile, TalentId, TalentState } from "../game/data/types";
import {
  TALENT_BRANCH_ORDER,
  TALENT_NODES,
  type TalentEffectKind,
  type TalentBranch,
} from "../game/content/talents";
import {
  resetTalentGrowth,
  talentBonuses,
  talentDefinition,
  talentLevel,
  talentNodeBonus,
  talentPrerequisiteMessage,
  upgradeTalent,
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
import {
  iconBranchEfficiency,
  iconBranchOffense,
  iconBranchSurvival,
  iconSpan,
} from "../icons";

export interface TalentSceneCallbacks {
  getProfile: () => PlayerProfile;
  onUpgrade: (id: TalentId) => Promise<TalentActionResult>;
  onReset: () => Promise<TalentActionResult>;
  onBack: () => void;
  notify: (message: string, type: NotifyType) => void;
}

interface DraftEvaluation {
  changed: boolean;
  reason?: string;
  target: TalentState;
  pointDelta: number;
  basicDelta: number;
  eliteDelta: number;
  droppedNodes: TalentId[];
}

const TALENT_IDS = Object.keys(TALENT_NODES) as TalentId[];

export class TalentScene implements Scene {
  readonly root: Container;
  private readonly cb: TalentSceneCallbacks;
  private selectedId: TalentId | null = null;
  private draftLevel = 0;
  private shouldFocusSelection = false;

  constructor(cb: TalentSceneCallbacks) {
    this.root = new Container();
    this.cb = cb;
  }

  enter(): void {
    const { inner, content } = openOverlay({ constrained: true });
    const profile = this.cb.getProfile();
    const bonuses = talentBonuses(profile.talents);

    content.appendChild(createOverlayTitle("talent growth"));
    content.appendChild(this.createResourceTags(profile));
    content.appendChild(this.createBonusTags(bonuses));

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "menu-btn";
    resetBtn.textContent = "Reset all talents (free)";
    resetBtn.addEventListener("click", () => {
      void this.handleReset();
    });
    content.appendChild(resetBtn);

    const body = createBodyScroll();
    content.appendChild(body);
    const list = createCardList();
    body.appendChild(list);

    const nodeButtons = new Map<TalentId, HTMLButtonElement>();

    for (const branch of TALENT_BRANCH_ORDER) {
      const section = this.createBranchSection(profile, branch, nodeButtons);
      list.appendChild(section);
    }

    if (this.selectedId && TALENT_NODES[this.selectedId]) {
      this.draftLevel = Math.max(
        0,
        Math.min(
          talentDefinition(this.selectedId).levels.length,
          this.draftLevel,
        ),
      );
      const modal = this.createTalentDetailModal(profile, this.selectedId);
      list.appendChild(modal);
      if (this.shouldFocusSelection) {
        this.shouldFocusSelection = false;
        const selectedBtn = nodeButtons.get(this.selectedId);
        if (selectedBtn) {
          selectedBtn.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        }
        requestAnimationFrame(() => {
          modal.classList.add("open");
          modal.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      } else {
        modal.classList.add("open");
      }
    }

    inner.appendChild(createBackButton(() => this.cb.onBack()));
  }

  exit(): void {
    closeOverlay({ constrained: true });
  }

  update(_dt: number): void {}
  render(_alpha: number): void {}

  private createBranchSection(
    profile: PlayerProfile,
    branch: TalentBranch,
    nodeButtons: Map<TalentId, HTMLButtonElement>,
  ): HTMLElement {
    const section = document.createElement("section");
    section.className = "talent-branch-section";

    const title = document.createElement("div");
    title.className = "talent-branch-head";
    title.appendChild(iconSpan(this.branchIcon(branch)));
    const titleText = createOverlaySub(this.branchLabel(branch));
    titleText.style.textAlign = "left";
    titleText.style.margin = "0";
    title.appendChild(titleText);
    section.appendChild(title);

    const track = document.createElement("div");
    track.className = "talent-tree-track";
    section.appendChild(track);

    const ids = TALENT_IDS.filter((id) => TALENT_NODES[id].branch === branch);
    ids.forEach((id, index) => {
      const button = this.createTalentNodeButton(profile, id);
      nodeButtons.set(id, button);
      track.appendChild(button);
      if (index < ids.length - 1) {
        const connector = document.createElement("div");
        connector.className = "talent-tree-link";
        track.appendChild(connector);
      }
    });

    return section;
  }

  private createTalentNodeButton(profile: PlayerProfile, id: TalentId): HTMLButtonElement {
    const def = talentDefinition(id);
    const level = talentLevel(profile.talents, id);
    const maxLevel = def.levels.length;
    const locked = Boolean(talentPrerequisiteMessage(profile.talents, id));

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "talent-tree-node";
    if (locked) btn.classList.add("is-locked");
    if (this.selectedId === id) btn.classList.add("is-selected");

    const name = document.createElement("span");
    name.className = "talent-tree-node-name";
    name.textContent = def.name;
    btn.appendChild(name);

    const meta = document.createElement("div");
    meta.className = "talent-tree-node-meta";
    meta.appendChild(this.createTag(`Lv ${level}/${maxLevel}`));
    meta.appendChild(this.createTag(this.formatNodeBonus(def.effectKind, talentNodeBonus(profile.talents, id))));
    btn.appendChild(meta);

    btn.addEventListener("click", () => {
      this.selectedId = id;
      this.draftLevel = level;
      this.shouldFocusSelection = true;
      this.enter();
    });

    return btn;
  }

  private createTalentDetailModal(profile: PlayerProfile, id: TalentId): HTMLElement {
    const def = talentDefinition(id);
    const currentLevel = talentLevel(profile.talents, id);
    const maxLevel = def.levels.length;

    const modal = document.createElement("section");
    modal.className = "talent-detail-modal";

    const title = document.createElement("div");
    title.className = "card-name";
    title.textContent = def.name;
    modal.appendChild(title);

    const desc = document.createElement("div");
    desc.className = "card-text";
    desc.textContent = def.description;
    modal.appendChild(desc);

    const tagRow = document.createElement("div");
    tagRow.className = "talent-tag-row";
    modal.appendChild(tagRow);

    const warning = document.createElement("div");
    warning.className = "card-text";
    warning.style.whiteSpace = "pre-line";
    modal.appendChild(warning);

    const controls = document.createElement("div");
    controls.className = "talent-detail-level-controls";
    const minusBtn = document.createElement("button");
    minusBtn.type = "button";
    minusBtn.className = "menu-btn";
    minusBtn.textContent = "-";
    const levelTag = this.createTag("");
    const plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.className = "menu-btn";
    plusBtn.textContent = "+";
    controls.append(minusBtn, levelTag, plusBtn);
    modal.appendChild(controls);

    const actions = document.createElement("div");
    actions.className = "talent-detail-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "menu-btn";
    cancelBtn.textContent = "Cancel";
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "big-btn";
    saveBtn.textContent = "Save changes";
    actions.append(cancelBtn, saveBtn);
    modal.appendChild(actions);

    const refresh = (): void => {
      const evaluation = this.evaluateDraft(profile, id, this.draftLevel);
      const nextStep = this.evaluateDraft(
        profile,
        id,
        Math.min(this.draftLevel + 1, maxLevel),
      );
      const prerequisiteMessage = talentPrerequisiteMessage(evaluation.target, id);

      tagRow.innerHTML = "";
      tagRow.appendChild(this.createTag(`Now Lv ${currentLevel}/${maxLevel}`));
      tagRow.appendChild(this.createTag(`Draft Lv ${this.draftLevel}/${maxLevel}`, "accent"));
      tagRow.appendChild(this.createTag(`Δ pts ${evaluation.pointDelta >= 0 ? "+" : ""}${evaluation.pointDelta}`));
      tagRow.appendChild(this.createTag(`Δ basic ${evaluation.basicDelta >= 0 ? "+" : ""}${evaluation.basicDelta}`));
      tagRow.appendChild(this.createTag(`Δ elite ${evaluation.eliteDelta >= 0 ? "+" : ""}${evaluation.eliteDelta}`));

      const warnings: string[] = [];
      if (prerequisiteMessage) warnings.push(prerequisiteMessage);
      if (evaluation.reason) warnings.push(evaluation.reason);
      if (evaluation.droppedNodes.length > 0) {
        warnings.push(`Auto-reset dependent nodes: ${evaluation.droppedNodes.map((nodeId) => talentDefinition(nodeId).name).join(", ")}`);
      }
      warning.textContent = warnings.join("\n");
      warning.style.display = warnings.length > 0 ? "block" : "none";

      levelTag.textContent = `Lv ${this.draftLevel}`;
      minusBtn.disabled = this.draftLevel <= 0;
      plusBtn.disabled = this.draftLevel >= maxLevel || !nextStep.changed || Boolean(nextStep.reason);
      saveBtn.disabled = !evaluation.changed || Boolean(evaluation.reason);
    };

    minusBtn.addEventListener("click", () => {
      this.draftLevel = Math.max(0, this.draftLevel - 1);
      refresh();
    });

    plusBtn.addEventListener("click", () => {
      this.draftLevel = Math.min(maxLevel, this.draftLevel + 1);
      refresh();
    });

    cancelBtn.addEventListener("click", () => {
      this.selectedId = null;
      this.enter();
    });

    saveBtn.addEventListener("click", async () => {
      const result = await this.commitDraft(id, this.draftLevel);
      this.cb.notify(
        result.ok ? "Talent changes saved." : result.reason ?? "Failed to save talent changes.",
        result.ok ? "success" : "error",
      );
      if (result.ok) {
        this.shouldFocusSelection = false;
        this.enter();
      }
    });

    refresh();
    return modal;
  }

  private evaluateDraft(
    profile: PlayerProfile,
    id: TalentId,
    draftLevel: number,
  ): DraftEvaluation {
    const target = this.buildTargetState(profile, id, draftLevel);
    const changed = !this.sameState(profile.talents, target);
    const simulation = this.simulateTarget(profile, target);
    const droppedNodes = TALENT_IDS.filter(
      (nodeId) =>
        nodeId !== id &&
        talentLevel(profile.talents, nodeId) > 0 &&
        talentLevel(target, nodeId) === 0,
    );
    return {
      changed,
      reason: simulation.reason,
      target,
      pointDelta: simulation.pointDelta,
      basicDelta: simulation.basicDelta,
      eliteDelta: simulation.eliteDelta,
      droppedNodes,
    };
  }

  private buildTargetState(
    profile: PlayerProfile,
    id: TalentId,
    draftLevel: number,
  ): TalentState {
    const levels = { ...profile.talents.levels };
    const maxLevel = talentDefinition(id).levels.length;
    levels[id] = Math.max(0, Math.min(maxLevel, Math.trunc(draftLevel)));

    let changed = true;
    while (changed) {
      changed = false;
      for (const nodeId of TALENT_IDS) {
        const def = talentDefinition(nodeId);
        const boundedLevel = Math.max(0, Math.min(def.levels.length, Math.trunc(levels[nodeId] ?? 0)));
        if (levels[nodeId] !== boundedLevel) {
          levels[nodeId] = boundedLevel;
          changed = true;
        }
        if (levels[nodeId] <= 0 || !def.requires) continue;
        if ((levels[def.requires.id] ?? 0) < def.requires.level) {
          levels[nodeId] = 0;
          changed = true;
        }
      }
    }

    return { levels };
  }

  private simulateTarget(
    profile: PlayerProfile,
    target: TalentState,
  ): {
    reason?: string;
    pointDelta: number;
    basicDelta: number;
    eliteDelta: number;
  } {
    const clone = this.cloneProfile(profile);
    if (this.needsReset(profile.talents, target)) {
      const resetResult = resetTalentGrowth(clone);
      if (!resetResult.ok) {
        return {
          reason: resetResult.reason ?? "Reset failed.",
          pointDelta: 0,
          basicDelta: 0,
          eliteDelta: 0,
        };
      }
    }

    const safetyLimit = 128;
    for (let attempt = 0; attempt < safetyLimit; attempt++) {
      let remaining = false;
      let progressed = false;
      for (const nodeId of TALENT_IDS) {
        const current = talentLevel(clone.talents, nodeId);
        const wanted = talentLevel(target, nodeId);
        if (current >= wanted) continue;
        remaining = true;
        const result = upgradeTalent(clone, nodeId);
        if (result.ok) progressed = true;
      }
      if (!remaining) {
        return {
          pointDelta: clone.points - profile.points,
          basicDelta: clone.fragments.basic - profile.fragments.basic,
          eliteDelta: clone.fragments.elite - profile.fragments.elite,
        };
      }
      if (!progressed) {
        return {
          reason: "Draft cannot be applied with current resources or prerequisites.",
          pointDelta: 0,
          basicDelta: 0,
          eliteDelta: 0,
        };
      }
    }

    return {
      reason: "Draft exceeded processing limit.",
      pointDelta: 0,
      basicDelta: 0,
      eliteDelta: 0,
    };
  }

  private async commitDraft(id: TalentId, draftLevel: number): Promise<TalentActionResult> {
    const profile = this.cb.getProfile();
    const evaluation = this.evaluateDraft(profile, id, draftLevel);
    if (!evaluation.changed) return { ok: false, reason: "No pending changes." };
    if (evaluation.reason) return { ok: false, reason: evaluation.reason };

    if (this.needsReset(profile.talents, evaluation.target)) {
      const resetResult = await this.cb.onReset();
      if (!resetResult.ok) return resetResult;
    }

    const safetyLimit = 128;
    for (let attempt = 0; attempt < safetyLimit; attempt++) {
      const currentProfile = this.cb.getProfile();
      let remaining = false;
      let progressed = false;
      for (const nodeId of TALENT_IDS) {
        const current = talentLevel(currentProfile.talents, nodeId);
        const wanted = talentLevel(evaluation.target, nodeId);
        if (current >= wanted) continue;
        remaining = true;
        const result = await this.cb.onUpgrade(nodeId);
        if (!result.ok) continue;
        progressed = true;
      }
      if (!remaining) {
        return { ok: true };
      }
      if (!progressed) {
        return { ok: false, reason: "Unable to apply drafted levels." };
      }
    }

    return { ok: false, reason: "Talent save exceeded processing limit." };
  }

  private async handleReset(): Promise<void> {
    const result = await this.cb.onReset();
    this.cb.notify(
      result.ok ? "Talents reset, points refunded." : result.reason ?? "Reset failed.",
      result.ok ? "success" : "error",
    );
    if (result.ok) {
      this.selectedId = null;
    }
    this.enter();
  }

  private createResourceTags(profile: PlayerProfile): HTMLElement {
    const row = document.createElement("div");
    row.className = "talent-tag-row";
    row.appendChild(this.createTag(`pts ${profile.points}`));
    row.appendChild(this.createTag(`basic ${profile.fragments.basic}`));
    row.appendChild(this.createTag(`elite ${profile.fragments.elite}`));
    return row;
  }

  private createBonusTags(
    bonuses: ReturnType<typeof talentBonuses>,
  ): HTMLElement {
    const row = document.createElement("div");
    row.className = "talent-tag-row";
    row.appendChild(this.createTag(`hp +${bonuses.maxHpAdd}`));
    row.appendChild(this.createTag(`dmg +${bonuses.damageAdd}`));
    row.appendChild(this.createTag(`crit +${(bonuses.critAdd * 100).toFixed(0)}%`));
    row.appendChild(this.createTag(`pts +${(bonuses.pointRewardMul * 100).toFixed(0)}%`));
    row.appendChild(this.createTag(`frag +${(bonuses.fragmentRewardMul * 100).toFixed(0)}%`));
    return row;
  }

  private createTag(text: string, variant: "normal" | "accent" = "normal"): HTMLElement {
    const tag = document.createElement("span");
    tag.className = `talent-tag ${variant === "accent" ? "talent-tag--accent" : ""}`.trim();
    tag.textContent = text;
    return tag;
  }

  private formatNodeBonus(
    effectKind: TalentEffectKind,
    total: number,
  ): string {
    switch (effectKind) {
      case "maxHpAdd":
        return `+${Math.round(total)} HP`;
      case "iframeAdd":
        return `+${total.toFixed(2)}s iframe`;
      case "damageAdd":
        return `+${Math.round(total)} dmg`;
      case "critAdd":
        return `+${(total * 100).toFixed(0)}% crit`;
      case "pointRewardMul":
        return `+${(total * 100).toFixed(0)}% pts`;
      case "fragmentRewardMul":
        return `+${(total * 100).toFixed(0)}% frag`;
      default:
        return `${total}`;
    }
  }

  private branchLabel(branch: TalentBranch): string {
    const labels: Record<TalentBranch, string> = {
      survival: "survival branch",
      offense: "offense branch",
      efficiency: "efficiency branch",
    };
    return labels[branch];
  }

  private branchIcon(branch: TalentBranch): string {
    const icons: Record<TalentBranch, string> = {
      survival: iconBranchSurvival,
      offense: iconBranchOffense,
      efficiency: iconBranchEfficiency,
    };
    return icons[branch];
  }

  private needsReset(current: TalentState, target: TalentState): boolean {
    return TALENT_IDS.some((id) => talentLevel(target, id) < talentLevel(current, id));
  }

  private sameState(a: TalentState, b: TalentState): boolean {
    return TALENT_IDS.every((id) => talentLevel(a, id) === talentLevel(b, id));
  }

  private cloneProfile(profile: PlayerProfile): PlayerProfile {
    return {
      ...profile,
      ownedSkins: [...profile.ownedSkins],
      stats: profile.stats,
      fragments: {
        ...profile.fragments,
      },
      talents: {
        levels: { ...profile.talents.levels },
      },
    };
  }
}
