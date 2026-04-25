import { Container } from "pixi.js";
import type { Scene } from "./scene";
import type { PlayerProfile, TalentId } from "../game/data/types";
import {
  TALENT_NODES,
  TALENT_CLUSTER_ORDER,
  type TalentEffectKind,
  type TalentBranch,
  type TalentClusterId,
} from "../game/content/talents";
import {
  talentBossGateMessage,
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

const CANVAS_SIZE = 1400;
const CANVAS_CX = CANVAS_SIZE / 2;
const CANVAS_CY = CANVAS_SIZE / 2;
// Connector node distance from origin (between center hex and cluster hex).
const R_CONNECTOR = 175;
// Cluster core distance from origin (center of each peripheral hexagon).
const R_CLUSTER = 470;
// Hex side length: distance of vertices from cluster core.
const R_VERTEX = 130;
const SVG_NS = "http://www.w3.org/2000/svg";

const BRANCH_CSS_COLOR: Record<TalentBranch, string> = {
  offense:    "var(--branch-offense)",
  survival:   "var(--branch-survival)",
  efficiency: "var(--branch-efficiency)",
};

// ── Callbacks ─────────────────────────────────────────────────────────────────

export interface TalentSceneCallbacks {
  getProfile: () => PlayerProfile;
  onUpgrade: (id: TalentId) => Promise<TalentActionResult>;
  onReset: () => Promise<TalentActionResult>;
  onBack: () => void;
  notify: (message: string, type: NotifyType) => void;
}

const TALENT_IDS = Object.keys(TALENT_NODES) as TalentId[];

const CLUSTER_ANGLE_RAD: Record<TalentClusterId, number> = TALENT_CLUSTER_ORDER.reduce(
  (acc, c) => {
    acc[c.id] = (c.angleDeg * Math.PI) / 180;
    return acc;
  },
  {} as Record<TalentClusterId, number>,
);

// ── Scene ─────────────────────────────────────────────────────────────────────

export class TalentScene implements Scene {
  readonly root: Container;
  readonly id = "talent";
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
    this.panX = CANVAS_CX * (1 - this.zoom);
    this.panY = CANVAS_CY * (1 - this.zoom);
  }

  enter(): void {
    const { inner, content } = openOverlay({ constrained: true });
    const profile = this.cb.getProfile();

    content.appendChild(createOverlayTitle("talent tree"));
    content.appendChild(this.createResourceTags(profile));
    content.appendChild(this.createRadialView(profile));

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

  // ── Hex position computation ─────────────────────────────────────────────

  private computeHexPositions(): Map<TalentId, { x: number; y: number }> {
    const positions = new Map<TalentId, { x: number; y: number }>();

    for (const id of TALENT_IDS) {
      const def = TALENT_NODES[id];
      const theta = CLUSTER_ANGLE_RAD[def.cluster];

      if (def.role === "connector") {
        positions.set(id, {
          x: Math.round(CANVAS_CX + R_CONNECTOR * Math.cos(theta)),
          y: Math.round(CANVAS_CY + R_CONNECTOR * Math.sin(theta)),
        });
      } else if (def.role === "core") {
        positions.set(id, {
          x: Math.round(CANVAS_CX + R_CLUSTER * Math.cos(theta)),
          y: Math.round(CANVAS_CY + R_CLUSTER * Math.sin(theta)),
        });
      } else {
        // vertex: regular hexagon around cluster core, slot 0 nearest origin (angle θ + π).
        const slot = def.vertexSlot ?? 0;
        const vAngle = theta + Math.PI + (slot * Math.PI) / 3;
        const cx = CANVAS_CX + R_CLUSTER * Math.cos(theta);
        const cy = CANVAS_CY + R_CLUSTER * Math.sin(theta);
        positions.set(id, {
          x: Math.round(cx + R_VERTEX * Math.cos(vAngle)),
          y: Math.round(cy + R_VERTEX * Math.sin(vAngle)),
        });
      }
    }
    return positions;
  }

  // ── Radial view ────────────────────────────────────────────────────────────

  private createRadialView(profile: PlayerProfile): HTMLElement {
    const positions = this.computeHexPositions();

    const wrap = document.createElement("div");
    wrap.className = "talent-radial-wrap";

    const canvas = document.createElement("div");
    canvas.className = "talent-radial-canvas";
    canvas.style.width = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;
    this.applyTransform(canvas);
    wrap.appendChild(canvas);

    canvas.appendChild(this.createRadialSVG(positions, profile));

    // Center decorative hex with talent icon (no upgrade target).
    const center = document.createElement("div");
    center.className = "talent-radial-center";
    center.style.left = `${CANVAS_CX}px`;
    center.style.top = `${CANVAS_CY}px`;
    center.appendChild(iconSpan(iconTalents));
    canvas.appendChild(center);

    for (const [id, pos] of positions) {
      canvas.appendChild(this.createRadialNode(profile, id, pos.x, pos.y));
    }

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

    // Decorative central hexagon outline (the "center hex" the clusters grow from).
    svg.appendChild(this.hexOutline(CANVAS_CX, CANVAS_CY, R_CONNECTOR * 0.78));

    // Decorative cluster hexagon outlines (one per peripheral cluster).
    for (const c of TALENT_CLUSTER_ORDER) {
      const theta = (c.angleDeg * Math.PI) / 180;
      const cx = CANVAS_CX + R_CLUSTER * Math.cos(theta);
      const cy = CANVAS_CY + R_CLUSTER * Math.sin(theta);
      svg.appendChild(this.hexOutline(cx, cy, R_VERTEX, c.id));
    }

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
      line.setAttribute("stroke-width", "1.8");
      line.setAttribute("stroke-opacity", isReachable ? "0.6" : "0.2");
      line.setAttribute("stroke-linecap", "round");
      svg.appendChild(line);
    }

    return svg;
  }

  /**
   * Builds a hexagon outline polygon with one vertex pointing toward origin
   * (for cluster hexes) or just flat orientation (for the center hex).
   */
  private hexOutline(cx: number, cy: number, radius: number, clusterId?: TalentClusterId): SVGElement {
    const hex = document.createElementNS(SVG_NS, "polygon");
    const baseAngle = clusterId ? CLUSTER_ANGLE_RAD[clusterId] + Math.PI : 0;
    const points: string[] = [];
    for (let k = 0; k < 6; k++) {
      const a = baseAngle + (k * Math.PI) / 3;
      const x = cx + radius * Math.cos(a);
      const y = cy + radius * Math.sin(a);
      points.push(`${Math.round(x)},${Math.round(y)}`);
    }
    hex.setAttribute("points", points.join(" "));
    hex.setAttribute("class", "talent-hex-guide");
    return hex;
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
    const locked = Boolean(
      talentPrerequisiteMessage(profile.talents, id)
      || talentBossGateMessage(profile, id),
    );
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
    if (def.role === "connector") btn.classList.add("is-connector");
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
    const bossGateMsg = talentBossGateMessage(profile, id);
    const lockMsgText = prereqMsg ?? bossGateMsg;
    const nextLevelDef = def.levels[level];

    const sheet = document.createElement("div");
    sheet.className = "talent-upgrade-sheet";

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

    const metaRow = document.createElement("div");
    metaRow.className = "talent-upgrade-sheet-meta";
    const branchBadge = document.createElement("span");
    branchBadge.className = "talent-branch-badge";
    branchBadge.style.color = BRANCH_CSS_COLOR[def.branch];
    branchBadge.textContent = def.branch;
    const levelTag = this.createTag(`Lv ${level}/${maxLevel}`);
    metaRow.append(branchBadge, levelTag);
    sheet.appendChild(metaRow);

    const desc = document.createElement("div");
    desc.className = "card-text";
    desc.textContent = def.description;
    sheet.appendChild(desc);

    if (isMaxed) {
      sheet.appendChild(this.createTag("MAX LEVEL", "accent"));
    } else if (lockMsgText) {
      const lockMsg = document.createElement("div");
      lockMsg.className = "card-text";
      lockMsg.textContent = lockMsgText;
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
      if (!this.didDrag && e.changedTouches.length === 1) {
        const t = e.changedTouches[0]!;
        const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null;
        const btn = el?.closest<HTMLButtonElement>("button");
        if (btn) btn.click();
      }
    }, { signal });

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
