import { Container } from "pixi.js";
import type { Scene } from "./scene";
import type { PlayerProfile, TalentId } from "../game/data/types";
import {
  TALENT_NODES,
  type TalentEffectKind,
  type TalentBranch,
} from "../game/content/talents";
import {
  talentDefinition,
  talentLevel,
  talentPrerequisiteMessage,
  type TalentActionResult,
} from "../game/talents";
import {
  closeOverlay,
  createBackButton,
  createOverlayTitle,
  openOverlay,
} from "./ui";
import type { NotifyType } from "../app/notificationService";
import {
  glyphAegis,
  glyphCrit,
  glyphPhaseShift,
  glyphRecursion,
  glyphSharpShot,
  glyphStar4,
  iconReset,
  iconTalents,
  iconSpan,
} from "../icons";

// ── Layout constants ───────────────────────────────────────────────────────────

const CANVAS_SIZE = 1200;
const CANVAS_CX = CANVAS_SIZE / 2;
const CANVAS_CY = CANVAS_SIZE / 2;
// Ring radius per depth level (0 = innermost). Level 6+ clamps to last entry.
const RING_RADII = [180, 265, 345, 420, 490, 555, 555] as const;
const SECTOR_HALF_RAD = (54 * Math.PI) / 180;
const SECTOR_CENTER: Record<TalentBranch, number> = {
  offense:    -Math.PI / 2,          // top
  survival:    Math.PI / 6,          // lower-right
  efficiency:  (5 * Math.PI) / 6,   // lower-left
};
const BRANCH_CSS_COLOR: Record<TalentBranch, string> = {
  offense:    "var(--branch-offense)",
  survival:   "var(--branch-survival)",
  efficiency: "var(--branch-efficiency)",
};
const SVG_NS = "http://www.w3.org/2000/svg";

// ── Callbacks ─────────────────────────────────────────────────────────────────

export interface TalentSceneCallbacks {
  getProfile: () => PlayerProfile;
  onUpgrade: (id: TalentId) => Promise<TalentActionResult>;
  onReset: () => Promise<TalentActionResult>;
  onBack: () => void;
  notify: (message: string, type: NotifyType) => void;
}

const TALENT_IDS = Object.keys(TALENT_NODES) as TalentId[];

// ── Scene ─────────────────────────────────────────────────────────────────────

export class TalentScene implements Scene {
  readonly root: Container;
  private readonly cb: TalentSceneCallbacks;

  private selectedId: TalentId | null = null;
  private zoom = 0.55;
  private panX = 0;
  private panY = 0;
  private didDrag = false;
  private panZoomAbort: AbortController | null = null;
  private _animFromPan: { x: number; y: number } | null = null;

  constructor(cb: TalentSceneCallbacks) {
    this.root = new Container();
    this.cb = cb;
    // Center the canvas in the viewport at the initial zoom level
    this.panX = CANVAS_CX * (1 - this.zoom);
    this.panY = CANVAS_CY * (1 - this.zoom);
  }

  enter(): void {
    const { inner, content } = openOverlay({ constrained: true });
    const profile = this.cb.getProfile();

    content.appendChild(createOverlayTitle("talent tree"));
    content.appendChild(this.createResourceTags(profile));
    content.appendChild(this.createRadialView(profile));

    // Upgrade sheet: floats below the canvas, outside the pan/zoom wrap
    const sheetWrapper = document.createElement("div");
    sheetWrapper.className = "talent-sheet-wrapper";
    if (this.selectedId !== null) {
      sheetWrapper.appendChild(this.createUpgradeSheet(profile, this.selectedId));
      requestAnimationFrame(() => sheetWrapper.classList.add("open"));
    }
    content.appendChild(sheetWrapper);

    inner.appendChild(createBackButton(() => this.cb.onBack()));
  }

  exit(): void {
    if (this.panZoomAbort) {
      this.panZoomAbort.abort();
      this.panZoomAbort = null;
    }
    closeOverlay({ constrained: true });
  }

  update(_dt: number): void {}
  render(_alpha: number): void {}

  // ── Depth & position computation ──────────────────────────────────────────

  private computeDepths(): Map<TalentId, number> {
    const depths = new Map<TalentId, number>();
    for (const id of TALENT_IDS) {
      if (!TALENT_NODES[id].requires) depths.set(id, 0);
    }
    let changed = true;
    while (changed) {
      changed = false;
      for (const id of TALENT_IDS) {
        const def = TALENT_NODES[id];
        if (!def.requires) continue;
        const parentDepth = depths.get(def.requires.id);
        if (parentDepth === undefined) continue;
        const newDepth = parentDepth + 1;
        if (!depths.has(id) || depths.get(id)! > newDepth) {
          depths.set(id, newDepth);
          changed = true;
        }
      }
    }
    for (const id of TALENT_IDS) {
      if (!depths.has(id)) depths.set(id, 0);
    }
    return depths;
  }

  private computeRadialPositions(): Map<TalentId, { x: number; y: number }> {
    const depths = this.computeDepths();
    const positions = new Map<TalentId, { x: number; y: number }>();

    // Group ids by branch
    const branchMap = new Map<TalentBranch, TalentId[]>();
    for (const id of TALENT_IDS) {
      const b = TALENT_NODES[id].branch;
      if (!branchMap.has(b)) branchMap.set(b, []);
      branchMap.get(b)!.push(id);
    }

    for (const [branch, ids] of branchMap) {
      const sectorCenter = SECTOR_CENTER[branch];
      const idSet = new Set(ids);

      // Build per-branch dependency tree
      const children = new Map<TalentId, TalentId[]>();
      const roots: TalentId[] = [];
      for (const id of ids) children.set(id, []);
      for (const id of ids) {
        const req = TALENT_NODES[id].requires;
        if (req && idSet.has(req.id)) {
          children.get(req.id)!.push(id);
        } else {
          roots.push(id);
        }
      }

      // Count leaf nodes in each subtree (leaf = no children within this branch)
      const leafCount = new Map<TalentId, number>();
      const countLeaves = (id: TalentId): number => {
        const kids = children.get(id) ?? [];
        if (kids.length === 0) { leafCount.set(id, 1); return 1; }
        const n = kids.reduce((s, k) => s + countLeaves(k), 0);
        leafCount.set(id, n);
        return n;
      };
      for (const root of roots) countLeaves(root);

      // Recursively place a subtree within the angular slice [a0, a1]
      const layout = (id: TalentId, a0: number, a1: number): void => {
        const depth = Math.min(depths.get(id) ?? 0, RING_RADII.length - 1);
        const r = RING_RADII[depth]!;
        const angle = (a0 + a1) / 2;
        positions.set(id, {
          x: CANVAS_CX + r * Math.cos(angle),
          y: CANVAS_CY + r * Math.sin(angle),
        });
        const kids = children.get(id) ?? [];
        if (kids.length === 0) return;
        const total = kids.reduce((s, k) => s + (leafCount.get(k) ?? 1), 0);
        let cursor = a0;
        for (const kid of kids) {
          const slice = ((leafCount.get(kid) ?? 1) / total) * (a1 - a0);
          layout(kid, cursor, cursor + slice);
          cursor += slice;
        }
      };

      // Distribute root nodes across the full sector proportionally to subtree size
      const totalLeaves = roots.reduce((s, r) => s + (leafCount.get(r) ?? 1), 0);
      let cursor = sectorCenter - SECTOR_HALF_RAD;
      for (const root of roots) {
        const slice = ((leafCount.get(root) ?? 1) / totalLeaves) * (SECTOR_HALF_RAD * 2);
        layout(root, cursor, cursor + slice);
        cursor += slice;
      }
    }

    this.spreadBranchRingNodes(positions, depths);
    return positions;
  }

  // ── Spread pass: push same-branch same-ring nodes apart ────────────────────

  private spreadBranchRingNodes(
    positions: Map<TalentId, { x: number; y: number }>,
    depths: Map<TalentId, number>,
  ): void {
    const MIN_ARC_PX = 64;

    type NodeRef = { id: TalentId; angle: number };
    const groups = new Map<string, { r: number; branch: TalentBranch; nodes: NodeRef[] }>();

    for (const id of TALENT_IDS) {
      const depth = Math.min(depths.get(id) ?? 0, RING_RADII.length - 1);
      const branch = TALENT_NODES[id].branch;
      const key = `${branch}:${depth}`;
      if (!groups.has(key)) {
        groups.set(key, { r: RING_RADII[depth]!, branch, nodes: [] });
      }
      const pos = positions.get(id)!;
      groups.get(key)!.nodes.push({
        id,
        angle: Math.atan2(pos.y - CANVAS_CY, pos.x - CANVAS_CX),
      });
    }

    for (const { r, branch, nodes } of groups.values()) {
      if (nodes.length <= 1) continue;
      const minAngle = MIN_ARC_PX / r;
      nodes.sort((a, b) => a.angle - b.angle);

      for (let iter = 0; iter < 120; iter++) {
        let moved = false;
        for (let i = 0; i < nodes.length - 1; i++) {
          const gap = nodes[i + 1]!.angle - nodes[i]!.angle;
          if (gap < minAngle) {
            const push = (minAngle - gap) / 2;
            nodes[i]!.angle -= push;
            nodes[i + 1]!.angle += push;
            moved = true;
          }
        }
        if (!moved) break;
      }

      // Re-center spread group back to branch sector center
      const mean = nodes.reduce((s, n) => s + n.angle, 0) / nodes.length;
      const shift = SECTOR_CENTER[branch] - mean;
      for (const n of nodes) n.angle += shift;

      for (const { id, angle } of nodes) {
        positions.set(id, {
          x: Math.round(CANVAS_CX + r * Math.cos(angle)),
          y: Math.round(CANVAS_CY + r * Math.sin(angle)),
        });
      }
    }
  }

  // ── Radial view ────────────────────────────────────────────────────────────

  private createRadialView(profile: PlayerProfile): HTMLElement {
    const positions = this.computeRadialPositions();

    const wrap = document.createElement("div");
    wrap.className = "talent-radial-wrap";

    // Canvas (pan/zoom target)
    const canvas = document.createElement("div");
    canvas.className = "talent-radial-canvas";
    canvas.style.width = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;
    this.applyTransform(canvas);
    wrap.appendChild(canvas);

    // SVG connection lines (rendered behind nodes)
    canvas.appendChild(this.createRadialSVG(positions, profile));

    // Center icon
    const center = document.createElement("div");
    center.className = "talent-radial-center";
    center.style.left = `${CANVAS_CX}px`;
    center.style.top = `${CANVAS_CY}px`;
    center.appendChild(iconSpan(iconTalents));
    canvas.appendChild(center);

    // Node buttons
    for (const [id, pos] of positions) {
      canvas.appendChild(this.createRadialNode(profile, id, pos.x, pos.y));
    }

    // Smooth pan animation from previous position when a node is selected
    if (this._animFromPan) {
      const { x: fromX, y: fromY } = this._animFromPan;
      this._animFromPan = null;
      const targetTransform = canvas.style.transform;
      canvas.style.transform = `translate(calc(-50% + ${fromX}px), calc(-50% + ${fromY}px)) scale(${this.zoom})`;
      requestAnimationFrame(() => {
        canvas.style.transition = "transform 380ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        canvas.style.transform = targetTransform;
        setTimeout(() => { canvas.style.transition = ""; }, 400);
      });
    }

    // Pan/zoom interaction
    this.attachPanZoom(wrap, canvas);

    return wrap;
  }

  private applyTransform(canvas: HTMLElement): void {
    canvas.style.transform = `translate(calc(-50% + ${this.panX}px), calc(-50% + ${this.panY}px)) scale(${this.zoom})`;
  }

  // ── SVG connection lines ───────────────────────────────────────────────────

  private createRadialSVG(
    positions: Map<TalentId, { x: number; y: number }>,
    profile: PlayerProfile,
  ): SVGElement {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "talent-radial-svg");
    svg.setAttribute("viewBox", `0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`);
    svg.setAttribute("width", String(CANVAS_SIZE));
    svg.setAttribute("height", String(CANVAS_SIZE));

    for (const id of TALENT_IDS) {
      const def = TALENT_NODES[id];
      if (!def.requires) continue;
      const from = positions.get(def.requires.id);
      const to = positions.get(id);
      if (!from || !to) continue;

      const parentLevel = talentLevel(profile.talents, def.requires.id);
      const isReachable = parentLevel >= def.requires.level;

      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", String(Math.round(from.x)));
      line.setAttribute("y1", String(Math.round(from.y)));
      line.setAttribute("x2", String(Math.round(to.x)));
      line.setAttribute("y2", String(Math.round(to.y)));
      line.setAttribute("class", `talent-radial-line--${def.branch}`);
      line.setAttribute("stroke-width", "1.5");
      line.setAttribute("stroke-opacity", isReachable ? "0.55" : "0.18");
      line.setAttribute("stroke-linecap", "round");
      svg.appendChild(line);
    }

    return svg;
  }

  // ── Node button ────────────────────────────────────────────────────────────

  private createRadialNode(
    profile: PlayerProfile,
    id: TalentId,
    x: number,
    y: number,
  ): HTMLButtonElement {
    const def = talentDefinition(id);
    const level = talentLevel(profile.talents, id);
    const maxLevel = def.levels.length;
    const locked = Boolean(talentPrerequisiteMessage(profile.talents, id));
    const isMaxed = level >= maxLevel;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "talent-radial-node";
    btn.style.left = `${Math.round(x)}px`;
    btn.style.top = `${Math.round(y)}px`;
    btn.style.setProperty("--node-color", BRANCH_CSS_COLOR[def.branch]);
    btn.setAttribute("aria-label", `${def.name} Lv${level}/${maxLevel}`);
    btn.title = def.name;

    if (def.isCore) btn.classList.add("is-core");
    if (locked) btn.classList.add("is-locked");
    if (isMaxed) btn.classList.add("is-maxed");
    if (this.selectedId === id) btn.classList.add("is-selected");

    const iconWrap = document.createElement("span");
    iconWrap.className = "talent-radial-node-icon";
    iconWrap.appendChild(iconSpan(this.nodeIcon(def.effectKind)));
    btn.appendChild(iconWrap);

    const levelChip = document.createElement("span");
    levelChip.className = "talent-radial-node-level";
    levelChip.textContent = `${level}/${maxLevel}`;
    btn.appendChild(levelChip);

    btn.addEventListener("click", () => {
      if (this.didDrag) return;
      const newId = this.selectedId === id ? null : id;
      if (newId !== null) {
        this._animFromPan = { x: this.panX, y: this.panY };
        this.panX = CANVAS_CX - x * this.zoom;
        this.panY = CANVAS_CY - y * this.zoom;
      }
      this.selectedId = newId;
      this.enter();
    });

    return btn;
  }

  // ── Upgrade bottom sheet ───────────────────────────────────────────────────

  private createUpgradeSheet(profile: PlayerProfile, id: TalentId): HTMLElement {
    const def = talentDefinition(id);
    const level = talentLevel(profile.talents, id);
    const maxLevel = def.levels.length;
    const isMaxed = level >= maxLevel;
    const prereqMsg = talentPrerequisiteMessage(profile.talents, id);
    const nextLevelDef = def.levels[level];

    const sheet = document.createElement("div");
    sheet.className = "talent-upgrade-sheet";

    // Header
    const header = document.createElement("div");
    header.className = "talent-upgrade-sheet-header";
    const titleEl = document.createElement("div");
    titleEl.className = "talent-upgrade-sheet-title";
    titleEl.textContent = def.name;
    const dismissBtn = document.createElement("button");
    dismissBtn.type = "button";
    dismissBtn.className = "talent-upgrade-sheet-dismiss";
    dismissBtn.textContent = "×";
    dismissBtn.addEventListener("click", () => {
      this.selectedId = null;
      this.enter();
    });
    header.append(titleEl, dismissBtn);
    sheet.appendChild(header);

    // Meta row: branch badge + level tag
    const metaRow = document.createElement("div");
    metaRow.className = "talent-upgrade-sheet-meta";
    const branchBadge = document.createElement("span");
    branchBadge.className = "talent-branch-badge";
    branchBadge.style.color = BRANCH_CSS_COLOR[def.branch];
    branchBadge.textContent = def.branch;
    const levelTag = this.createTag(`Lv ${level}/${maxLevel}`);
    metaRow.append(branchBadge, levelTag);
    sheet.appendChild(metaRow);

    // Description
    const desc = document.createElement("div");
    desc.className = "card-text";
    desc.textContent = def.description;
    sheet.appendChild(desc);

    // State: maxed / locked / next level cost
    if (isMaxed) {
      sheet.appendChild(this.createTag("MAX LEVEL", "accent"));
    } else if (prereqMsg) {
      const lockMsg = document.createElement("div");
      lockMsg.className = "card-text";
      lockMsg.textContent = prereqMsg;
      sheet.appendChild(lockMsg);
    } else if (nextLevelDef) {
      const costRow = document.createElement("div");
      costRow.className = "talent-tag-row";
      costRow.style.justifyContent = "flex-start";
      costRow.appendChild(this.createTag(`${nextLevelDef.pointCost} pts`));
      costRow.appendChild(
        this.createTag(`${nextLevelDef.fragmentCost} ${def.fragmentKind}`),
      );
      const bonusText = this.formatNodeBonus(def.effectKind, nextLevelDef.bonus);
      costRow.appendChild(this.createTag(bonusText, "accent"));
      sheet.appendChild(costRow);

      // Confirm button
      const actions = document.createElement("div");
      actions.className = "talent-upgrade-sheet-actions";
      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "big-btn";
      confirmBtn.textContent = `Upgrade → Lv ${level + 1}`;
      confirmBtn.addEventListener("click", async () => {
        confirmBtn.disabled = true;
        const result = await this.cb.onUpgrade(id);
        this.cb.notify(
          result.ok
            ? `${def.name} → Lv ${level + 1}`
            : (result.reason ?? "Upgrade failed."),
          result.ok ? "success" : "error",
        );
        this.enter();
      });
      actions.appendChild(confirmBtn);
      sheet.appendChild(actions);
    }

    return sheet;
  }

  // ── Pan / zoom ─────────────────────────────────────────────────────────────

  private attachPanZoom(viewport: HTMLElement, canvas: HTMLElement): void {
    if (this.panZoomAbort) this.panZoomAbort.abort();
    this.panZoomAbort = new AbortController();
    const { signal } = this.panZoomAbort;

    const update = (): void => {
      canvas.style.transition = "";
      canvas.style.transform = `translate(calc(-50% + ${this.panX}px), calc(-50% + ${this.panY}px)) scale(${this.zoom})`;
    };

    // ── Touch (mobile) ───────────────────────────────────────────────────────
    let touchStartX = 0, touchStartY = 0;
    let touchStartPanX = 0, touchStartPanY = 0;
    let pinchStartDist = 0, pinchStartZoom = 0;

    viewport.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.didDrag = false;
      if (e.touches.length === 1) {
        touchStartX = e.touches[0]!.clientX;
        touchStartY = e.touches[0]!.clientY;
        touchStartPanX = this.panX;
        touchStartPanY = this.panY;
      } else if (e.touches.length === 2) {
        pinchStartDist = Math.hypot(
          e.touches[0]!.clientX - e.touches[1]!.clientX,
          e.touches[0]!.clientY - e.touches[1]!.clientY,
        );
        pinchStartZoom = this.zoom;
      }
    }, { passive: false, signal });

    viewport.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const dx = e.touches[0]!.clientX - touchStartX;
        const dy = e.touches[0]!.clientY - touchStartY;
        if (Math.abs(dx) + Math.abs(dy) > 4) this.didDrag = true;
        this.panX = touchStartPanX + dx;
        this.panY = touchStartPanY + dy;
        update();
      } else if (e.touches.length === 2 && pinchStartDist > 0) {
        const dist = Math.hypot(
          e.touches[0]!.clientX - e.touches[1]!.clientX,
          e.touches[0]!.clientY - e.touches[1]!.clientY,
        );
        this.zoom = Math.max(0.3, Math.min(2.2, pinchStartZoom * (dist / pinchStartDist)));
        update();
      }
    }, { passive: false, signal });

    viewport.addEventListener("touchend", (e) => {
      // Forward tap as click when no drag occurred (touchstart preventDefault blocks synthetic clicks)
      if (!this.didDrag && e.changedTouches.length === 1) {
        const t = e.changedTouches[0]!;
        const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null;
        const btn = el?.closest<HTMLButtonElement>("button");
        if (btn) btn.click();
      }
    }, { signal });

    // ── Mouse (desktop) ──────────────────────────────────────────────────────
    let mouseDown = false;
    let mouseStartX = 0, mouseStartY = 0;
    let mouseStartPanX = 0, mouseStartPanY = 0;

    viewport.addEventListener("mousedown", (e) => {
      mouseDown = true;
      this.didDrag = false;
      mouseStartX = e.clientX;
      mouseStartY = e.clientY;
      mouseStartPanX = this.panX;
      mouseStartPanY = this.panY;
      e.preventDefault();
    }, { signal });

    window.addEventListener("mousemove", (e) => {
      if (!mouseDown) return;
      const dx = e.clientX - mouseStartX;
      const dy = e.clientY - mouseStartY;
      if (Math.abs(dx) + Math.abs(dy) > 4) this.didDrag = true;
      this.panX = mouseStartPanX + dx;
      this.panY = mouseStartPanY + dy;
      update();
    }, { signal });

    window.addEventListener("mouseup", () => {
      mouseDown = false;
    }, { signal });

    // ── Mouse wheel zoom ─────────────────────────────────────────────────────
    viewport.addEventListener("wheel", (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      this.zoom = Math.max(0.3, Math.min(2.2, this.zoom * factor));
      update();
    }, { passive: false, signal });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private createResourceTags(profile: PlayerProfile): HTMLElement {
    const row = document.createElement("div");
    row.className = "talent-tag-row talent-resource-row";
    row.appendChild(this.createTag(`pts ${profile.points}`));
    row.appendChild(this.createTag(`basic ${profile.fragments.basic}`));
    row.appendChild(this.createTag(`elite ${profile.fragments.elite}`));

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "talent-tag talent-tag--action talent-tag--icon-btn";
    resetBtn.setAttribute("aria-label", "reset tree");
    resetBtn.title = "reset tree";
    resetBtn.appendChild(iconSpan(iconReset));
    resetBtn.addEventListener("click", () => { void this.handleReset(); });
    row.appendChild(resetBtn);

    return row;
  }

  private async handleReset(): Promise<void> {
    const result = await this.cb.onReset();
    this.cb.notify(
      result.ok ? "Talents reset, points refunded." : (result.reason ?? "Reset failed."),
      result.ok ? "success" : "error",
    );
    if (result.ok) this.selectedId = null;
    this.enter();
  }

  private createTag(text: string, variant: "normal" | "accent" = "normal"): HTMLElement {
    const tag = document.createElement("span");
    tag.className = `talent-tag${variant === "accent" ? " talent-tag--accent" : ""}`;
    tag.textContent = text;
    return tag;
  }

  private formatNodeBonus(effectKind: TalentEffectKind, bonus: number): string {
    switch (effectKind) {
      case "maxHpAdd":         return `+${Math.round(bonus)} HP`;
      case "iframeAdd":        return `+${bonus.toFixed(2)}s iframe`;
      case "damageAdd":        return `+${Math.round(bonus)} dmg`;
      case "critAdd":          return `+${(bonus * 100).toFixed(0)}% crit`;
      case "pointRewardMul":   return `+${(bonus * 100).toFixed(0)}% pts`;
      case "fragmentRewardMul": return `+${(bonus * 100).toFixed(0)}% frag`;
      case "speedMul":         return `+${(bonus * 100).toFixed(0)}% spd`;
      case "periodMul":        return `×${bonus.toFixed(2)} fire`;
      case "pierceAdd":        return `+${bonus} pierce`;
      case "projectilesAdd":   return `+${bonus} proj`;
      case "projectileSpeedMul": return `+${(bonus * 100).toFixed(0)}% projspd`;
      case "skillPointsAdd":   return `+${bonus} skill pts`;
      case "pickupRadiusMul":  return `+${(bonus * 100).toFixed(0)}% pickup`;
      default:                 return `+${bonus}`;
    }
  }

  private nodeIcon(effectKind: TalentEffectKind): string {
    switch (effectKind) {
      case "maxHpAdd":      return glyphAegis;
      case "iframeAdd":     return glyphPhaseShift;
      case "damageAdd":     return glyphSharpShot;
      case "critAdd":       return glyphCrit;
      case "pointRewardMul": return glyphStar4;
      case "fragmentRewardMul": return glyphRecursion;
      default:              return glyphStar4;
    }
  }
}
