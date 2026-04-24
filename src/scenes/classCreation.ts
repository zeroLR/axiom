import { Container } from "pixi.js";
import type { Scene } from "./scene";
import type {
  CharacterSlot,
  ClassLineageId,
  PlayerProfile,
} from "../game/data/types";
import {
  CLASS_LINEAGES,
  CLASS_NODES,
  CHARACTER_SLOT_COSTS,
  MAX_CHARACTER_SLOTS,
  MAX_CLASS_TIER,
} from "../game/content/classes";
import { PRIMAL_SKILLS } from "../game/skills";
import {
  type ClassActionResult,
  activeCharacterSlot,
  canCreateCharacterSlot,
  canPromoteClass,
  findCharacterSlot,
  getActiveNodeChain,
  lineageToStartingShape,
} from "../game/classes";
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
  glyphAegis,
  glyphCrit,
  glyphPhaseShift,
  glyphRapid,
  glyphSharpShot,
  iconClassCreate,
  iconLineageAxis,
  iconLineageMirror,
  iconLineageWing,
  iconSpan,
} from "../icons";

const SVG_NS = "http://www.w3.org/2000/svg";

// ── Callbacks ─────────────────────────────────────────────────────────────────

export interface ClassCreationCallbacks {
  getProfile: () => PlayerProfile;
  onPromote: (slotId: string, branch: number) => Promise<ClassActionResult>;
  onReset: (slotId: string) => Promise<ClassActionResult>;
  onCreateSlot: (lineage: ClassLineageId) => Promise<ClassActionResult>;
  onSelectSlot: (slotId: string) => void;
  onBack: () => void;
  notify: (message: string, type: NotifyType) => void;
}

// ── Lineage icon helper ───────────────────────────────────────────────────────

function lineageIcon(lineage: ClassLineageId): string {
  switch (lineage) {
    case "wing":   return iconLineageWing;
    case "mirror": return iconLineageMirror;
    default:       return iconLineageAxis;
  }
}

// ── Passive summary helper ────────────────────────────────────────────────────

function passiveSummary(slot: CharacterSlot): string {
  const parts: string[] = [];
  for (const nodeId of getActiveNodeChain(slot)) {
    const node = CLASS_NODES[nodeId];
    if (!node) continue;
    for (const p of node.passives) {
      switch (p.kind) {
        case "damageAdd":        parts.push(`+${p.value} dmg`); break;
        case "critAdd":          parts.push(`+${(p.value * 100).toFixed(0)}% crit`); break;
        case "maxHpAdd":         parts.push(`+${p.value} HP`); break;
        case "iframeAdd":        parts.push(`+${p.value.toFixed(2)}s iframe`); break;
        case "projectilesAdd":   parts.push(`+${p.value} proj`); break;
        case "periodMul":        parts.push(`×${p.value.toFixed(2)} fire rate`); break;
        case "speedMul":         parts.push(`×${p.value.toFixed(2)} speed`); break;
        case "pointRewardMul":   parts.push(`+${(p.value * 100).toFixed(0)}% pts`); break;
        case "fragmentRewardMul": parts.push(`+${(p.value * 100).toFixed(0)}% frags`); break;
      }
    }
  }
  return parts.length > 0 ? parts.join("  ·  ") : "—";
}

function singlePassiveLine(kind: string, value: number): string {
  switch (kind) {
    case "damageAdd":        return `+${value} dmg`;
    case "critAdd":          return `+${(value * 100).toFixed(0)}% crit`;
    case "maxHpAdd":         return `+${value} HP`;
    case "iframeAdd":        return `+${value.toFixed(2)}s iframe`;
    case "projectilesAdd":   return `+${value} proj`;
    case "periodMul":        return `×${value.toFixed(2)} fire rate`;
    case "speedMul":         return `×${value.toFixed(2)} speed`;
    case "pointRewardMul":   return `+${(value * 100).toFixed(0)}% pts reward`;
    case "fragmentRewardMul": return `+${(value * 100).toFixed(0)}% frag reward`;
    default: return `${kind}: ${value}`;
  }
}

// ── Scene ─────────────────────────────────────────────────────────────────────

export class ClassCreationScene implements Scene {
  readonly root: Container;
  private readonly cb: ClassCreationCallbacks;

  /** ID of the character slot currently being viewed. Defaults to the active slot. */
  private viewSlotId: string | null = null;

  /** Whether the promote modal is open. */
  private promoteModalOpen = false;

  /** Branch chosen in the promote modal (0 = A, 1 = B). */
  private pendingBranch = 0;

  /** Whether the create-slot modal is open. */
  private createModalOpen = false;

  /** Lineage chosen in the create-slot modal. */
  private createLineage: ClassLineageId = "axis";

  constructor(cb: ClassCreationCallbacks) {
    this.root = new Container();
    this.cb = cb;
  }

  enter(): void {
    const { inner, content } = openOverlay({ constrained: true });
    const profile = this.cb.getProfile();

    // Ensure viewSlotId is valid.
    const activeSlot = activeCharacterSlot(profile.characters);
    if (!this.viewSlotId || !findCharacterSlot(profile.characters, this.viewSlotId)) {
      this.viewSlotId = activeSlot?.id ?? null;
    }
    const slot = findCharacterSlot(profile.characters, this.viewSlotId ?? "") ?? activeSlot;

    // Title
    content.appendChild(createOverlayTitle("class creation"));

    // Resource row
    content.appendChild(this.createResourceRow(profile));

    // Slot tabs
    content.appendChild(this.createSlotTabs(profile, slot));

    const body = createBodyScroll();
    content.appendChild(body);
    const list = createCardList();
    body.appendChild(list);

    if (slot) {
      // Portrait + stats header (replaces plain lineage header)
      list.appendChild(this.createPortraitSection(slot));
      list.appendChild(this.createStatChips(slot));
      list.appendChild(this.createRadarWrap(slot));

      // Class tree
      list.appendChild(this.createClassTree(profile, slot));

      // Promote modal (inline, appears below tree)
      if (this.promoteModalOpen) {
        const modal = this.createPromoteModal(profile, slot);
        list.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add("open"));
      } else if (slot.tier < MAX_CLASS_TIER) {
        list.appendChild(this.createPromoteBar(profile, slot));
      } else {
        const maxed = document.createElement("div");
        maxed.className = "talent-tag talent-tag--accent";
        maxed.style.margin = "10px 0";
        maxed.style.textAlign = "center";
        maxed.textContent = "Class fully promoted";
        list.appendChild(maxed);
      }

      // Bottom bar: passive summary + reset
      list.appendChild(this.createBottomBar(slot));
    } else {
      // No slots (shouldn't normally happen)
      const msg = createOverlaySub("No characters available. Create one to begin.");
      list.appendChild(msg);
    }

    // Create-slot modal
    if (this.createModalOpen) {
      const modal = this.createSlotCreationModal(profile);
      list.appendChild(modal);
      requestAnimationFrame(() => modal.classList.add("open"));
    }

    inner.appendChild(createBackButton(() => this.cb.onBack()));
  }

  exit(): void {
    closeOverlay({ constrained: true });
  }

  update(_dt: number): void {}
  render(_alpha: number): void {}

  // ── Resource row ────────────────────────────────────────────────────────────

  private createResourceRow(profile: PlayerProfile): HTMLElement {
    const row = document.createElement("div");
    row.className = "talent-tag-row talent-resource-row";
    row.appendChild(this.createTag(`pts ${profile.points}`));
    // Show boss fragment counts (relevant for promotion costs)
    const bossFrag = profile.fragments.boss;
    row.appendChild(this.createTag(`boss frags ${bossFrag}`));
    return row;
  }

  // ── Slot tabs ───────────────────────────────────────────────────────────────

  private createSlotTabs(profile: PlayerProfile, viewSlot: CharacterSlot | null): HTMLElement {
    const row = document.createElement("div");
    row.className = "cc-slot-tabs";

    for (const s of profile.characters.slots) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cc-slot-tab";
      if (s.id === viewSlot?.id) btn.classList.add("is-active");

      const icon = iconSpan(lineageIcon(s.lineage));
      icon.style.fontSize = "1.1em";
      btn.appendChild(icon);

      const label = document.createElement("span");
      label.textContent = `${s.lineage.toUpperCase()[0]}${s.tier}`;
      btn.appendChild(label);
      btn.title = `${s.name} — ${CLASS_NODES[`${s.lineage}-t0` as const]?.name ?? s.lineage} T${s.tier}`;

      btn.addEventListener("click", () => {
        this.viewSlotId = s.id;
        this.promoteModalOpen = false;
        this.createModalOpen = false;
        this.cb.onSelectSlot(s.id);
        this.enter();
      });
      row.appendChild(btn);
    }

    // "+ New Character" button
    if (profile.characters.slots.length < MAX_CHARACTER_SLOTS) {
      const cost = CHARACTER_SLOT_COSTS[profile.characters.slots.length];
      const createBtn = document.createElement("button");
      createBtn.type = "button";
      createBtn.className = "cc-slot-tab is-create";
      const plusIcon = iconSpan(iconClassCreate);
      plusIcon.style.fontSize = "1.1em";
      createBtn.appendChild(plusIcon);
      const label = document.createElement("span");
      label.textContent = cost !== undefined && cost > 0 ? `+${cost}` : "+";
      createBtn.appendChild(label);
      createBtn.title = cost !== undefined && cost > 0
        ? `Create new character slot (${cost} pts)`
        : "Create new character slot (free)";

      createBtn.addEventListener("click", () => {
        this.createModalOpen = !this.createModalOpen;
        this.promoteModalOpen = false;
        this.enter();
      });
      row.appendChild(createBtn);
    }

    return row;
  }

  // ── Portrait section ────────────────────────────────────────────────────────

  private lineageCssColor(lineage: ClassLineageId): string {
    switch (lineage) {
      case "wing":   return "var(--lineage-wing)";
      case "mirror": return "var(--lineage-mirror)";
      default:       return "var(--lineage-axis)";
    }
  }

  private createPortraitSection(slot: CharacterSlot): HTMLElement {
    const lineageDef = CLASS_LINEAGES.find((l) => l.id === slot.lineage)!;
    const tierLabel = slot.tier === 0 ? "T0" : `T${slot.tier}`;

    const wrap = document.createElement("div");
    wrap.className = "cc-portrait-wrap";
    wrap.style.setProperty("--cc-color", this.lineageCssColor(slot.lineage));

    // Large animated emblem
    const emblem = document.createElement("div");
    emblem.className = "cc-portrait-emblem";
    emblem.appendChild(iconSpan(lineageIcon(slot.lineage)));
    wrap.appendChild(emblem);

    // Name + tier chip inline
    const nameRow = document.createElement("div");
    nameRow.style.cssText = "display:flex; align-items:center; gap:8px;";
    const nameEl = document.createElement("span");
    nameEl.className = "cc-portrait-name";
    nameEl.textContent = lineageDef.name;
    const tierChip = document.createElement("span");
    tierChip.className = "cc-portrait-tier";
    tierChip.textContent = tierLabel;
    nameRow.append(nameEl, tierChip);
    wrap.appendChild(nameRow);

    // Flavor line
    const flavor = document.createElement("div");
    flavor.className = "cc-portrait-flavor";
    flavor.textContent = lineageDef.flavorLine;
    wrap.appendChild(flavor);

    return wrap;
  }

  // ── Stat chips ──────────────────────────────────────────────────────────────

  private computeSlotStats(slot: CharacterSlot): {
    dmg: number; crit: number; hp: number; firerate: number; proj: number;
  } {
    let dmg = 0, crit = 0, hp = 0, firerate = 0, proj = 0;
    for (const nodeId of getActiveNodeChain(slot)) {
      const node = CLASS_NODES[nodeId];
      if (!node) continue;
      for (const p of node.passives) {
        if (p.kind === "damageAdd")      dmg      += p.value;
        else if (p.kind === "critAdd")   crit     += p.value;
        else if (p.kind === "maxHpAdd")  hp       += p.value;
        else if (p.kind === "periodMul") firerate += (1 - p.value);
        else if (p.kind === "projectilesAdd") proj += p.value;
      }
    }
    return { dmg, crit, hp, firerate, proj };
  }

  private createStatChips(slot: CharacterSlot): HTMLElement {
    const { dmg, crit, hp } = this.computeSlotStats(slot);
    const row = document.createElement("div");
    row.className = "cc-stat-chips";

    const makeChip = (icon: string, text: string): HTMLElement => {
      const chip = document.createElement("span");
      chip.className = "cc-stat-chip";
      chip.appendChild(iconSpan(icon));
      chip.appendChild(document.createTextNode(text));
      return chip;
    };

    row.appendChild(makeChip(glyphSharpShot, dmg > 0 ? `+${dmg} dmg` : "0 dmg"));
    row.appendChild(makeChip(glyphCrit, crit > 0 ? `+${(crit * 100).toFixed(0)}% crit` : "0% crit"));
    row.appendChild(makeChip(glyphAegis, hp > 0 ? `+${hp} HP` : "0 HP"));
    return row;
  }

  // ── Radar chart ─────────────────────────────────────────────────────────────

  private createRadarWrap(slot: CharacterSlot): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "cc-radar-wrap";
    wrap.style.setProperty("--cc-color", this.lineageCssColor(slot.lineage));
    wrap.appendChild(this.createRadarSvg(slot));
    return wrap;
  }

  private createRadarSvg(slot: CharacterSlot): SVGElement {
    const { dmg, crit, hp, firerate, proj } = this.computeSlotStats(slot);
    const SIZE = 88, CX = 44, CY = 44, MAX_R = 36;
    const AXES = 5;
    // Normalise scores [0, 1] against reasonable maxima for a single class
    const scores = [
      Math.min(dmg      / 5,    1),
      Math.min(crit     / 0.23, 1),
      Math.min(hp       / 10,   1),
      Math.min(firerate / 0.12, 1),
      Math.min(proj     / 2,    1),
    ];
    const labels = ["DMG", "CRIT", "HP", "RATE", "PROJ"];
    const baseAngle = -Math.PI / 2;

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${SIZE} ${SIZE}`);
    svg.setAttribute("width", String(SIZE));
    svg.setAttribute("height", String(SIZE));

    // Background pentagon + axis lines
    const bgPts = Array.from({ length: AXES }, (_, i) => {
      const a = baseAngle + (2 * Math.PI * i) / AXES;
      return `${(CX + MAX_R * Math.cos(a)).toFixed(1)},${(CY + MAX_R * Math.sin(a)).toFixed(1)}`;
    }).join(" ");
    const bgPoly = document.createElementNS(SVG_NS, "polygon");
    bgPoly.setAttribute("points", bgPts);
    bgPoly.setAttribute("fill", "none");
    bgPoly.setAttribute("stroke-width", "1");
    bgPoly.style.stroke = "var(--chrome)";
    svg.appendChild(bgPoly);

    for (let i = 0; i < AXES; i++) {
      const a = baseAngle + (2 * Math.PI * i) / AXES;
      const axLine = document.createElementNS(SVG_NS, "line");
      axLine.setAttribute("x1", String(CX));
      axLine.setAttribute("y1", String(CY));
      axLine.setAttribute("x2", (CX + MAX_R * Math.cos(a)).toFixed(1));
      axLine.setAttribute("y2", (CY + MAX_R * Math.sin(a)).toFixed(1));
      axLine.setAttribute("stroke-width", "1");
      axLine.style.stroke = "var(--chrome)";
      svg.appendChild(axLine);
    }

    // Filled score polygon
    const polyPts = scores.map((score, i) => {
      const a = baseAngle + (2 * Math.PI * i) / AXES;
      const r = Math.max(score * MAX_R, 2);
      return `${(CX + r * Math.cos(a)).toFixed(1)},${(CY + r * Math.sin(a)).toFixed(1)}`;
    }).join(" ");
    const poly = document.createElementNS(SVG_NS, "polygon");
    poly.setAttribute("points", polyPts);
    poly.setAttribute("class", "cc-radar-polygon");
    poly.style.fill = "var(--cc-color)";
    poly.style.stroke = "var(--cc-color)";
    svg.appendChild(poly);

    // Axis labels
    for (let i = 0; i < AXES; i++) {
      const a = baseAngle + (2 * Math.PI * i) / AXES;
      const lx = CX + (MAX_R + 8) * Math.cos(a);
      const ly = CY + (MAX_R + 8) * Math.sin(a);
      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", lx.toFixed(1));
      text.setAttribute("y", ly.toFixed(1));
      text.setAttribute("font-size", "5");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.style.fill = "var(--muted)";
      text.style.fontFamily = "ui-monospace, monospace";
      text.textContent = labels[i]!;
      svg.appendChild(text);
    }

    return svg;
  }

  // ── Class tree ──────────────────────────────────────────────────────────────

  private createClassTree(profile: PlayerProfile, slot: CharacterSlot): HTMLElement {
    const track = document.createElement("div");
    track.className = "cc-tree-track";
    track.style.marginTop = "12px";

    // T0 node (always active)
    const t0Node = CLASS_NODES[`${slot.lineage}-t0`];
    if (t0Node) {
      track.appendChild(this.createTreeNode(t0Node.name, t0Node.description, t0Node.passives, slot.tier === 0 ? "active" : "past"));
      track.appendChild(this.createConnector());
    }

    // T1 node
    const t1Node = CLASS_NODES[`${slot.lineage}-t1`];
    if (t1Node) {
      const state = slot.tier >= 1 ? (slot.tier === 1 ? "active" : "past") : (this.canReach(profile, slot, 1) ? "next" : "locked");
      track.appendChild(this.createTreeNode(t1Node.name, t1Node.description, t1Node.passives, state));
      track.appendChild(this.createConnector());
    }

    // T2: two branch options
    const t2aNode = CLASS_NODES[`${slot.lineage}-t2a`];
    const t2bNode = CLASS_NODES[`${slot.lineage}-t2b`];
    if (t2aNode && t2bNode) {
      const pair = document.createElement("div");
      pair.className = "cc-branch-pair";

      if (slot.tier >= 2) {
        // Show the chosen branch as active/past, the unchosen as inactive
        const chosenBranch = slot.branchPath[0] ?? 0;
        const aState = chosenBranch === 0 ? (slot.tier === 2 ? "active" : "past") : "inactive";
        const bState = chosenBranch === 1 ? (slot.tier === 2 ? "active" : "past") : "inactive";
        pair.appendChild(this.createTreeNode(t2aNode.name, t2aNode.description, t2aNode.passives, aState, "A"));
        pair.appendChild(this.createTreeNode(t2bNode.name, t2bNode.description, t2bNode.passives, bState, "B"));
      } else {
        // Both are available options (locked or next)
        const canReach = this.canReach(profile, slot, 2);
        const aState = canReach ? "next" : "locked";
        const bState = canReach ? "next" : "locked";
        pair.appendChild(this.createTreeNode(t2aNode.name, t2aNode.description, t2aNode.passives, aState, "A"));
        pair.appendChild(this.createTreeNode(t2bNode.name, t2bNode.description, t2bNode.passives, bState, "B"));
      }
      track.appendChild(pair);
      track.appendChild(this.createConnector());
    }

    // T3: four options, but only 2 are reachable based on T2 branch
    if (slot.tier >= 2) {
      const chosenT2Branch = slot.branchPath[0] ?? 0;
      const prefix = chosenT2Branch === 0 ? "a" : "b";
      const t3aNd = CLASS_NODES[`${slot.lineage}-t3${prefix}a`];
      const t3bNd = CLASS_NODES[`${slot.lineage}-t3${prefix}b`];

      if (t3aNd && t3bNd) {
        const pair = document.createElement("div");
        pair.className = "cc-branch-pair";

        if (slot.tier >= 3) {
          const chosenT3Branch = slot.branchPath[1] ?? 0;
          const aState = chosenT3Branch === 0 ? "active" : "inactive";
          const bState = chosenT3Branch === 1 ? "active" : "inactive";
          pair.appendChild(this.createTreeNode(t3aNd.name, t3aNd.description, t3aNd.passives, aState, "A"));
          pair.appendChild(this.createTreeNode(t3bNd.name, t3bNd.description, t3bNd.passives, bState, "B"));
        } else {
          const canReach = this.canReach(profile, slot, 3);
          const s = canReach ? "next" : "locked";
          pair.appendChild(this.createTreeNode(t3aNd.name, t3aNd.description, t3aNd.passives, s, "A"));
          pair.appendChild(this.createTreeNode(t3bNd.name, t3bNd.description, t3bNd.passives, s, "B"));
        }
        track.appendChild(pair);
      }
    } else {
      // T3 not yet reachable: show two generic placeholders
      const simplePair = document.createElement("div");
      simplePair.className = "cc-branch-pair";
      simplePair.appendChild(this.createTreeNode("T3-A", "Choose T2 branch first", [], "locked"));
      simplePair.appendChild(this.createTreeNode("T3-B", "Choose T2 branch first", [], "locked"));
      track.appendChild(simplePair);
    }

    return track;
  }

  private canReach(profile: PlayerProfile, slot: CharacterSlot, tier: number): boolean {
    if (slot.tier >= tier) return false; // already at or past this tier
    if (slot.tier < tier - 1) return false; // can't skip tiers
    // Check whether a promotion to the next tier is possible at all (stage clear gate).
    // Resource failures (points / fragments) do not lock the node display.
    const result = canPromoteClass(profile, slot.id, 0);
    if (result.ok) return true;
    const stageLocked = result.reason?.includes("Stage") ?? false;
    return !stageLocked;
  }

  private passiveIcon(kind: string): string {
    switch (kind) {
      case "damageAdd":      return glyphSharpShot;
      case "critAdd":        return glyphCrit;
      case "maxHpAdd":       return glyphAegis;
      case "iframeAdd":      return glyphPhaseShift;
      case "periodMul":      return glyphRapid;
      default:               return glyphSharpShot;
    }
  }

  private createTreeNode(
    name: string,
    desc: string,
    passives: { kind: string; value: number }[],
    state: "active" | "past" | "next" | "locked" | "inactive",
    branchLabel?: string,
  ): HTMLElement {
    const el = document.createElement("div");
    el.className = "cc-node";
    if (state === "active") el.classList.add("is-active");
    else if (state === "next") el.classList.add("is-next");
    else if (state === "locked") el.classList.add("is-locked");
    else if (state === "inactive") el.classList.add("is-inactive");
    // "past" = no extra class (plain / dimmer accent)

    if (branchLabel) {
      const chip = document.createElement("div");
      chip.className = "cc-node-tier-chip";
      chip.textContent = branchLabel;
      el.appendChild(chip);
    }

    // Name row: small icon + name
    const nameRow = document.createElement("div");
    nameRow.style.cssText = "display:flex; align-items:center; gap:4px;";
    if (passives.length > 0) {
      const iconEl = iconSpan(this.passiveIcon(passives[0]!.kind));
      iconEl.style.cssText = "width:12px; height:12px; flex:0 0 auto; opacity:0.55;";
      nameRow.appendChild(iconEl);
    }
    const nameEl = document.createElement("span");
    nameEl.className = "cc-node-name";
    nameEl.textContent = name;
    nameRow.appendChild(nameEl);
    el.appendChild(nameRow);

    if (passives.length > 0) {
      const passiveEl = document.createElement("div");
      passiveEl.className = "cc-node-passive";
      passiveEl.textContent = passives.map((p) => singlePassiveLine(p.kind, p.value)).join("  ·  ");
      el.appendChild(passiveEl);
    } else if (desc) {
      const descEl = document.createElement("div");
      descEl.className = "cc-node-passive";
      descEl.textContent = desc;
      el.appendChild(descEl);
    }

    return el;
  }

  private createConnector(): HTMLElement {
    const el = document.createElement("div");
    el.className = "cc-tree-link";
    return el;
  }

  // ── Promote bar (shown when not at max tier and modal is closed) ─────────────

  private createPromoteBar(profile: PlayerProfile, slot: CharacterSlot): HTMLElement {
    const check = canPromoteClass(profile, slot.id, 0); // branch 0 as sample
    const nextTier = slot.tier + 1;

    const bar = document.createElement("div");
    bar.className = "talent-bottom-bar";
    bar.style.marginTop = "10px";

    const promoteBtn = document.createElement("button");
    promoteBtn.type = "button";
    promoteBtn.className = "big-btn";
    promoteBtn.style.flex = "1";
    const needsChoice = nextTier >= 2; // T2 and T3 need branch choice
    promoteBtn.textContent = needsChoice ? `Promote → T${nextTier} (choose branch)` : `Promote → T${nextTier}`;

    if (!check.ok) {
      // Disable if blocked by stage clear; keep enabled for resource-only failures
      // (resource failures are shown in the modal)
      const stageLocked = check.reason?.includes("Stage") ?? false;
      promoteBtn.disabled = stageLocked;
      if (stageLocked) {
        promoteBtn.textContent = check.reason ?? "Locked";
      }
    }

    promoteBtn.addEventListener("click", () => {
      this.promoteModalOpen = true;
      this.pendingBranch = 0;
      this.createModalOpen = false;
      this.enter();
    });

    bar.appendChild(promoteBtn);
    return bar;
  }

  // ── Promote modal ───────────────────────────────────────────────────────────

  private createPromoteModal(profile: PlayerProfile, slot: CharacterSlot): HTMLElement {
    const modal = document.createElement("section");
    modal.className = "cc-promote-modal";
    modal.style.marginTop = "10px";

    const nextTier = slot.tier + 1;
    const needsBranch = nextTier >= 2;

    // Modal title
    const title = document.createElement("div");
    title.className = "card-name";
    title.textContent = `Promote to T${nextTier}`;
    modal.appendChild(title);

    // Branch selector for T2/T3
    if (needsBranch) {
      const branchTitle = document.createElement("div");
      branchTitle.className = "card-text";
      branchTitle.textContent = "Choose a branch:";
      modal.appendChild(branchTitle);

      const branchRow = document.createElement("div");
      branchRow.className = "cc-branch-row";
      modal.appendChild(branchRow);

      const renderBranchOptions = (): void => {
        branchRow.innerHTML = "";
        for (const branch of [0, 1] as const) {
          // Determine node ID for this branch option
          let nodeId = "";
          if (nextTier === 2) {
            nodeId = `${slot.lineage}-t2${branch === 0 ? "a" : "b"}`;
          } else if (nextTier === 3) {
            const b2 = (slot.branchPath[0] ?? 0) === 0 ? "a" : "b";
            nodeId = `${slot.lineage}-t3${b2}${branch === 0 ? "a" : "b"}`;
          }
          const node = CLASS_NODES[nodeId as keyof typeof CLASS_NODES];
          if (!node) continue;

          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "cc-branch-btn";
          if (branch === this.pendingBranch) btn.classList.add("is-selected");

          const bName = document.createElement("div");
          bName.className = "cc-branch-btn-name";
          bName.textContent = `${branch === 0 ? "A" : "B"}. ${node.name}`;
          btn.appendChild(bName);

          if (node.passives.length > 0) {
            const bPassive = document.createElement("div");
            bPassive.className = "cc-branch-btn-passive";
            bPassive.textContent = node.passives.map((p) => singlePassiveLine(p.kind, p.value)).join("  ·  ");
            btn.appendChild(bPassive);
          }

          if (node.unlocksSkill) {
            const skillName = PRIMAL_SKILLS[node.unlocksSkill]?.name ?? node.unlocksSkill;
            const skillLine = document.createElement("div");
            skillLine.className = "cc-branch-btn-passive";
            skillLine.style.color = "var(--accent)";
            skillLine.textContent = `Unlocks skill: ${skillName}`;
            btn.appendChild(skillLine);
          }

          btn.addEventListener("click", () => {
            this.pendingBranch = branch;
            renderBranchOptions();
            updateCostRow();
          });
          branchRow.appendChild(btn);
        }
      };
      renderBranchOptions();

      // Cost row (updates with branch selection)
      const costRow = document.createElement("div");
      costRow.className = "talent-tag-row";
      modal.appendChild(costRow);

      const updateCostRow = (): void => {
        costRow.innerHTML = "";
        let nodeId = "";
        if (nextTier === 2) {
          nodeId = `${slot.lineage}-t2${this.pendingBranch === 0 ? "a" : "b"}`;
        } else if (nextTier === 3) {
          const b2 = (slot.branchPath[0] ?? 0) === 0 ? "a" : "b";
          nodeId = `${slot.lineage}-t3${b2}${this.pendingBranch === 0 ? "a" : "b"}`;
        }
        const node = CLASS_NODES[nodeId as keyof typeof CLASS_NODES];
        const req = node?.promotionReq;
        if (req) {
          const pts = profile.points;
          const frags = profile.fragments.detailed[req.fragmentId] ?? 0;
          const hasPts = pts >= req.pointCost;
          const hasFrags = frags >= req.fragmentCost;
          const ptTag = this.createTag(`pts: ${pts} / ${req.pointCost}`);
          if (!hasPts) ptTag.style.color = "var(--fg)";
          const fragTag = this.createTag(`${req.fragmentId}: ${frags} / ${req.fragmentCost}`);
          if (!hasFrags) fragTag.style.color = "var(--fg)";
          costRow.appendChild(ptTag);
          costRow.appendChild(fragTag);
        }
      };
      updateCostRow();

      // Warning / error line
      const warn = document.createElement("div");
      warn.className = "card-text";
      warn.style.minHeight = "1em";
      modal.appendChild(warn);

      // Action buttons
      const actions = document.createElement("div");
      actions.className = "cc-promote-actions";
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "menu-btn";
      cancelBtn.textContent = "Cancel";
      cancelBtn.addEventListener("click", () => {
        this.promoteModalOpen = false;
        this.enter();
      });
      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "big-btn";
      confirmBtn.textContent = "Confirm Promote";
      confirmBtn.addEventListener("click", async () => {
        const check = canPromoteClass(profile, slot.id, this.pendingBranch);
        if (!check.ok) {
          warn.textContent = check.reason ?? "Cannot promote.";
          return;
        }
        const result = await this.cb.onPromote(slot.id, this.pendingBranch);
        if (result.ok) {
          this.promoteModalOpen = false;
          this.cb.notify(`Promoted to T${nextTier}!`, "success");
        } else {
          this.cb.notify(result.reason ?? "Promotion failed.", "error");
        }
        this.enter();
      });
      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);
      modal.appendChild(actions);
    } else {
      // T0→T1: no branch needed
      const t1Node = CLASS_NODES[`${slot.lineage}-t1`];
      if (t1Node) {
        const desc = document.createElement("div");
        desc.className = "card-text";
        desc.textContent = t1Node.description;
        modal.appendChild(desc);

        const passiveEl = document.createElement("div");
        passiveEl.className = "talent-tag-row";
        passiveEl.style.flexWrap = "wrap";
        t1Node.passives.forEach((p) => {
          passiveEl.appendChild(this.createTag(singlePassiveLine(p.kind, p.value), "accent"));
        });
        modal.appendChild(passiveEl);

        if (t1Node.unlocksSkill) {
          const skillName = PRIMAL_SKILLS[t1Node.unlocksSkill]?.name ?? t1Node.unlocksSkill;
          const skillRow = document.createElement("div");
          skillRow.className = "talent-tag-row";
          skillRow.style.marginTop = "4px";
          skillRow.appendChild(this.createTag(`Unlocks skill: ${skillName}`, "accent"));
          modal.appendChild(skillRow);
        }

        const req = t1Node.promotionReq;
        if (req) {
          const pts = profile.points;
          const frags = profile.fragments.detailed[req.fragmentId] ?? 0;
          const costRow = document.createElement("div");
          costRow.className = "talent-tag-row";
          costRow.appendChild(this.createTag(`pts: ${pts} / ${req.pointCost}`));
          costRow.appendChild(this.createTag(`${req.fragmentId}: ${frags} / ${req.fragmentCost}`));
          modal.appendChild(costRow);
        }
      }

      const warn = document.createElement("div");
      warn.className = "card-text";
      warn.style.minHeight = "1em";
      modal.appendChild(warn);

      const actions = document.createElement("div");
      actions.className = "cc-promote-actions";
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "menu-btn";
      cancelBtn.textContent = "Cancel";
      cancelBtn.addEventListener("click", () => {
        this.promoteModalOpen = false;
        this.enter();
      });
      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "big-btn";
      confirmBtn.textContent = "Confirm Promote";
      confirmBtn.addEventListener("click", async () => {
        const check = canPromoteClass(profile, slot.id, 0);
        if (!check.ok) {
          warn.textContent = check.reason ?? "Cannot promote.";
          return;
        }
        const result = await this.cb.onPromote(slot.id, 0);
        if (result.ok) {
          this.promoteModalOpen = false;
          this.cb.notify("Promoted to T1!", "success");
        } else {
          this.cb.notify(result.reason ?? "Promotion failed.", "error");
        }
        this.enter();
      });
      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);
      modal.appendChild(actions);
    }

    return modal;
  }

  // ── Bottom bar: passive summary + reset ─────────────────────────────────────

  private createBottomBar(slot: CharacterSlot): HTMLElement {
    const bar = document.createElement("div");
    bar.className = "talent-bottom-bar";
    bar.style.marginTop = "12px";
    bar.style.flexDirection = "column";
    bar.style.alignItems = "stretch";

    const summary = document.createElement("div");
    summary.className = "cc-lineage-flavor";
    summary.style.fontStyle = "normal";
    summary.style.fontSize = "12px";
    const bonusSummary = passiveSummary(slot);
    summary.textContent = `Active bonuses: ${bonusSummary}`;
    bar.appendChild(summary);

    if (slot.tier > 0) {
      const resetRow = document.createElement("div");
      resetRow.style.display = "flex";
      resetRow.style.justifyContent = "flex-end";
      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.className = "menu-btn talent-reset-btn";
      resetBtn.textContent = "reset class (pts refund)";
      resetBtn.addEventListener("click", async () => {
        const result = await this.cb.onReset(slot.id);
        if (result.ok) {
          this.promoteModalOpen = false;
          this.cb.notify("Class reset. Points refunded.", "success");
        } else {
          this.cb.notify(result.reason ?? "Reset failed.", "error");
        }
        this.enter();
      });
      resetRow.appendChild(resetBtn);
      bar.appendChild(resetRow);
    }

    return bar;
  }

  // ── Slot creation modal ─────────────────────────────────────────────────────

  private createSlotCreationModal(profile: PlayerProfile): HTMLElement {
    const modal = document.createElement("section");
    modal.className = "cc-promote-modal";
    modal.style.marginTop = "10px";

    const title = document.createElement("div");
    title.className = "card-name";
    title.textContent = "Create New Character";
    modal.appendChild(title);

    const slotCount = profile.characters.slots.length;
    const cost = CHARACTER_SLOT_COSTS[slotCount] ?? 0;
    const canCreate = canCreateCharacterSlot(profile);

    const costTag = document.createElement("div");
    costTag.className = "talent-tag-row";
    costTag.appendChild(this.createTag(`cost: ${cost} pts`));
    costTag.appendChild(this.createTag(`available: ${profile.points} pts`));
    modal.appendChild(costTag);

    const lineageTitle = document.createElement("div");
    lineageTitle.className = "card-text";
    lineageTitle.textContent = "Choose lineage:";
    modal.appendChild(lineageTitle);

    // Lineage picker
    const lineageRow = document.createElement("div");
    lineageRow.className = "cc-create-lineage-row";

    const renderLineageOptions = (): void => {
      lineageRow.innerHTML = "";
      for (const lineageDef of CLASS_LINEAGES) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cc-create-lineage-btn";
        if (lineageDef.id === this.createLineage) btn.classList.add("is-selected");

        const icon = iconSpan(lineageIcon(lineageDef.id));
        btn.appendChild(icon);

        const nameEl = document.createElement("div");
        nameEl.className = "cc-create-lineage-name";
        nameEl.textContent = lineageDef.name;
        btn.appendChild(nameEl);

        const shapeEl = document.createElement("div");
        shapeEl.className = "cc-create-lineage-shape";
        shapeEl.textContent = lineageToStartingShape(lineageDef.id);
        btn.appendChild(shapeEl);

        btn.addEventListener("click", () => {
          this.createLineage = lineageDef.id;
          renderLineageOptions();
        });
        lineageRow.appendChild(btn);
      }
    };
    renderLineageOptions();
    modal.appendChild(lineageRow);

    const warn = document.createElement("div");
    warn.className = "card-text";
    warn.style.minHeight = "1em";
    modal.appendChild(warn);
    if (!canCreate.ok) {
      warn.textContent = canCreate.reason ?? "Cannot create slot.";
    }

    const actions = document.createElement("div");
    actions.className = "cc-promote-actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "menu-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => {
      this.createModalOpen = false;
      this.enter();
    });

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "big-btn";
    confirmBtn.textContent = "Create Character";
    confirmBtn.disabled = !canCreate.ok;

    confirmBtn.addEventListener("click", async () => {
      const result = await this.cb.onCreateSlot(this.createLineage);
      if (result.ok) {
        this.createModalOpen = false;
        // Switch to newly created slot
        const latest = profile.characters.slots[profile.characters.slots.length - 1];
        if (latest) this.viewSlotId = latest.id;
        this.cb.notify(`New character created (${this.createLineage.toUpperCase()})!`, "success");
      } else {
        this.cb.notify(result.reason ?? "Failed to create character.", "error");
      }
      this.enter();
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    modal.appendChild(actions);

    return modal;
  }

  // ── Shared tag helper ────────────────────────────────────────────────────────

  private createTag(text: string, variant: "normal" | "accent" = "normal"): HTMLElement {
    const tag = document.createElement("span");
    tag.className = `talent-tag ${variant === "accent" ? "talent-tag--accent" : ""}`.trim();
    tag.textContent = text;
    return tag;
  }
}
