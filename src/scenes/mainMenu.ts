import { Container } from "pixi.js";
import type { Scene } from "./scene";
import {
  iconPlay, iconInfinity, iconShop,
  iconTalents, iconAchievements, iconExport, iconImport, iconSkins, iconSettings, iconCodex,
  iconSpan,
} from "../icons";
import { initOverlay, closeOverlay, createOverlayTitle, createOverlaySub } from "./ui";

// ── Main Menu (DOM overlay) ─────────────────────────────────────────────────
// Entry point of the game. Shows mode selection and meta-system access.

export type MenuAction =
  | { kind: "normalMode" }
  | { kind: "survivalMode" }
  | { kind: "developMode" }
  | { kind: "shop" }
  | { kind: "classCreation" }
  | { kind: "talentGrowth" }
  | { kind: "codex" }
  | { kind: "achievements" }
  | { kind: "settings" }
  | { kind: "exportData" }
  | { kind: "importData" };

export class MainMenuScene implements Scene {
  readonly root: Container;
  readonly id = "menu";
  private readonly onAction: (action: MenuAction) => void;
  private readonly showDevelopMode: boolean;
  private readonly onDeveloperUnlock?: () => void;
  private readonly titleTapTimes: number[] = [];
  private developerNotified = false;

  constructor(
    onAction: (action: MenuAction) => void,
    opts?: {
      showDevelopMode?: boolean;
      onDeveloperUnlock?: () => void;
    },
  ) {
    this.root = new Container();
    this.onAction = onAction;
    this.showDevelopMode = opts?.showDevelopMode ?? false;
    this.onDeveloperUnlock = opts?.onDeveloperUnlock;
  }

  enter(): void {
    const { inner } = initOverlay();

    // Title
    const title = createOverlayTitle("Axiom");
    title.style.fontSize = "22px";
    title.style.marginBottom = "8px";
    title.style.cursor = "pointer";
    title.addEventListener("click", () => this.onTitleTap(title));
    inner.appendChild(title);

    // Subtitle
    const sub = createOverlaySub("reverse bullet-hell deckbuilder");
    sub.style.marginBottom = "12px";
    inner.appendChild(sub);

    // ── MODE ────────────────────────────────────────────────────────────
    const modeGroup = document.createElement("div");
    modeGroup.className = "menu-section menu-section--mode";
    this.addBtn(modeGroup, iconPlay, "Main Story", "normalMode", "big-btn");
    this.addBtn(modeGroup, iconInfinity, "Survival Mode", "survivalMode", "big-btn");
    inner.appendChild(modeGroup);

    // ── BUILD ───────────────────────────────────────────────────────────
    const buildSection = this.addSection(inner, "Build");
    const buildGrid = document.createElement("div");
    buildGrid.className = "menu-grid";
    this.addBtn(buildGrid, iconTalents, "Talents", "talentGrowth", "menu-btn");
    this.addBtn(buildGrid, iconSkins, "Class & Skills", "classCreation", "menu-btn");
    buildSection.appendChild(buildGrid);

    // ── LIBRARY ─────────────────────────────────────────────────────────
    const libSection = this.addSection(inner, "Library");
    const libGrid = document.createElement("div");
    libGrid.className = "menu-grid";
    this.addBtn(libGrid, iconCodex, "Codex", "codex", "menu-btn");
    this.addBtn(libGrid, iconAchievements, "Achievements", "achievements", "menu-btn");
    libSection.appendChild(libGrid);
    this.addBtn(libSection, iconShop, "Shop", "shop", "menu-btn");

    // ── SYSTEM ──────────────────────────────────────────────────────────
    const sysSection = this.addSection(inner, "System");
    this.addBtn(sysSection, iconSettings, "Settings", "settings", "menu-btn");
    if (this.showDevelopMode) {
      this.addBtn(sysSection, iconInfinity, "Develop Mode", "developMode", "menu-btn");
    }
    const dataRow = document.createElement("div");
    dataRow.className = "menu-data-row";
    this.addBtn(dataRow, iconExport, "Export", "exportData", "menu-btn", "flex:1");
    this.addBtn(dataRow, iconImport, "Import", "importData", "menu-btn", "flex:1");
    sysSection.appendChild(dataRow);
  }

  private addSection(parent: HTMLElement, title: string): HTMLElement {
    const section = document.createElement("section");
    section.className = "menu-section";
    const heading = document.createElement("h3");
    heading.className = "menu-section-title";
    heading.textContent = title;
    section.appendChild(heading);
    parent.appendChild(section);
    return section;
  }

  exit(): void {
    closeOverlay();
  }

  update(_dt: number): void {}
  render(_alpha: number): void {}

  private addBtn(
    parent: HTMLElement,
    icon: string,
    label: string,
    action: MenuAction["kind"],
    className: string,
    extraStyle?: string,
  ): void {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    btn.appendChild(iconSpan(icon));
    btn.append(` ${label}`);
    if (extraStyle) btn.style.cssText += extraStyle;
    btn.addEventListener("click", () => this.onAction({ kind: action }));
    parent.appendChild(btn);
  }

  private onTitleTap(titleEl: HTMLElement): void {
    const now = performance.now();
    this.titleTapTimes.push(now);
    while (this.titleTapTimes.length > 0 && now - this.titleTapTimes[0]! > 3000) {
      this.titleTapTimes.shift();
    }
    if (this.titleTapTimes.length >= 7 && !this.developerNotified) {
      this.developerNotified = true;
      titleEl.textContent = "Axiom · developer enabled";
      this.onDeveloperUnlock?.();
    }
  }
}
