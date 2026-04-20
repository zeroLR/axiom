import "./style.css";
import { Application } from "pixi.js";

import { isMuted, playSfx, primeSfx, setMuted } from "./game/audio";
import { PLAY_H, PLAY_W, rerollTokenCostForUse } from "./game/config";
import { startLoop } from "./game/loop";
import { createRng, pickSeed } from "./game/rng";
import { applyCard, applyCardLevelUp, drawOffer, POOL, type Card } from "./game/cards";
import { CardInventory, isLevelableEffect } from "./game/cardLevels";
import { bossForStage } from "./game/bosses/registry";
import { DraftScene } from "./scenes/draft";
import { EndgameScene, type EndgameUnlocks } from "./scenes/endgame";
import { PlayScene, type PointerMapper, type GameMode } from "./scenes/play";
import { SceneStack } from "./scenes/scene";
import { MainMenuScene, type MenuAction } from "./scenes/mainMenu";
import { StageSelectScene } from "./scenes/stageSelect";
import { ShopScene } from "./scenes/shop";
import { EquipmentScene } from "./scenes/equipment";
import { StartShapeSelectScene } from "./scenes/startShapeSelect";
import { SkillTreeScene } from "./scenes/skillTree";
import { AchievementsScene } from "./scenes/achievements";
import { STAGE_THEMES, DEFAULT_THEME, type StageTheme } from "./game/stageThemes";
import { STAGE_WAVES } from "./game/stageWaves";
import { WAVES } from "./game/waves";
import { survivalWaveSpec } from "./game/survivalWaves";
import { applyEquipment } from "./game/equipment";
import { equipCard, unequipCard } from "./game/equipment";
import { mapEquipmentToRunCardId, listUnmappedEquipmentCards } from "./game/equipment";
import { createActiveSkillStates, PRIMAL_SKILLS } from "./game/skills";
import { diffUnlocks } from "./game/unlocks";
import { MAX_SKILL_LEVEL } from "./game/data/types";
import { unlockAchievement } from "./game/achievements";
import type { RunResult } from "./game/rewards";
import {
  applyStartingShapeLoadout,
  resolveSelectedStartingShape,
  runSkinForStartingShape,
} from "./game/startingShapes";
import { iconTimeStop, iconClone, iconReflect, iconBarrage, iconLifesteal, iconAxisFreeze, iconOverload, setIconHtml, CARD_GLYPHS, SHOP_GLYPHS } from "./icons";
import {
  loadProfile, saveProfile,
  loadEquipment, saveEquipment,
  loadSkillTree, saveSkillTree,
  loadAchievements, saveAchievements,
  loadShopUnlocks, saveShopUnlocks,
  loadSettings, saveSettings,
  exportSaveData, downloadSaveData,
  parseSaveData, importSaveData,
} from "./game/storage";
import type {
  PlayerProfile,
  EquipmentLoadout,
  SkillTreeState,
  AchievementState,
  ShopUnlocks,
  PrimalSkillId,
} from "./game/data/types";
import type { EnemyKind } from "./game/world";

/** O(1) lookup for pool cards by ID. */
const POOL_BY_ID = new Map(POOL.map((c) => [c.id, c]));

async function boot(): Promise<void> {
  const gameEl = document.getElementById("game");
  const hudHp = document.getElementById("hud-hp");
  const hudWave = document.getElementById("hud-wave");
  const hudPts = document.getElementById("hud-pts");
  const hudTokens = document.getElementById("hud-tokens");
  const hudSeed = document.getElementById("hud-seed");
  const btnRestart = document.getElementById("btn-restart");
  const btnPause = document.getElementById("btn-pause");
  const btnComments = document.getElementById("btn-comments");
  const btnMute = document.getElementById("btn-mute");
  const btnMenu = document.getElementById("btn-menu");
  const hudSkills = document.getElementById("hud-skills");
  const commentsDialog = document.getElementById("comments-dialog");
  if (!gameEl) throw new Error("#game element missing");

  // ── Load persistent state ───────────────────────────────────────────────
  let profile: PlayerProfile = await loadProfile();
  let equipment: EquipmentLoadout = await loadEquipment();
  let skillTree: SkillTreeState = await loadSkillTree();
  let achievements: AchievementState = await loadAchievements();
  let shopUnlocks: ShopUnlocks = await loadShopUnlocks();
  const settings = await loadSettings();

  // ── Pixi init ───────────────────────────────────────────────────────────
  const app = new Application();
  await app.init({
    width: PLAY_W,
    height: PLAY_H,
    background: 0xffffff,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  gameEl.insertBefore(app.canvas, gameEl.firstChild);

  const stack = new SceneStack();

  let cachedRect: DOMRect = app.canvas.getBoundingClientRect();
  const mapper: PointerMapper = {
    target: app.canvas,
    clientToPlay: (clientX, clientY) => {
      const r = cachedRect;
      const px = ((clientX - r.left) / r.width) * PLAY_W;
      const py = ((clientY - r.top) / r.height) * PLAY_H;
      return {
        x: Math.max(0, Math.min(PLAY_W, px)),
        y: Math.max(0, Math.min(PLAY_H, py)),
      };
    },
  };

  function fitCanvas(): void {
    const { clientWidth: cw, clientHeight: ch } = gameEl!;
    if (cw === 0 || ch === 0) return;
    const scale = Math.min(cw / PLAY_W, ch / PLAY_H);
    const w = Math.floor(PLAY_W * scale);
    const h = Math.floor(PLAY_H * scale);
    app.canvas.style.width = `${w}px`;
    app.canvas.style.height = `${h}px`;
    cachedRect = app.canvas.getBoundingClientRect();
  }
  fitCanvas();
  window.addEventListener("resize", fitCanvas);

  let play: PlayScene;
  let currentRun: { mode: GameMode; stageIndex: number; developMode: boolean } | null = null;
  let paused = false;
  let seed = 0;
  let menuRng = createRng(42);
  let runInventory = new CardInventory();
  /** Snapshot of stats at run start, used to compute unlock diff at end. */
  let statsBeforeRun: import("./game/data/types").PlayerStats | null = null;
  /** Pending unlock diff from the latest settled run (set by settleRun, read by endgame). */
  let pendingUnlocks: EndgameUnlocks | null = null;
  let developerModeUnlocked = settings.developerMode ?? false;

  function syncRunControlButtons(): void {
    const runActive = currentRun !== null;
    if (btnRestart instanceof HTMLButtonElement) btnRestart.disabled = !runActive;
    if (btnPause instanceof HTMLButtonElement) {
      btnPause.disabled = !runActive;
      btnPause.textContent = paused ? "resume" : "pause";
      btnPause.setAttribute("aria-pressed", paused ? "true" : "false");
      btnPause.setAttribute("aria-label", paused ? "Resume run" : "Pause run");
    }
    if (hudSkills) {
      const toggleBtn = hudSkills.querySelector<HTMLButtonElement>("[data-dev-toggle='pause']");
      if (toggleBtn) toggleBtn.textContent = paused ? "resume" : "pause";
    }
  }

  function renderPauseOverlay(): void {
    const overlay = document.getElementById("overlay");
    const inner = document.getElementById("overlay-inner");
    if (!overlay || !inner || !paused) return;
    inner.innerHTML = "";

    const title = document.createElement("div");
    title.className = "overlay-title";
    title.textContent = "paused";
    inner.appendChild(title);

    const avatar = play ? play.world.get(play.avatarId) : undefined;
    if (avatar?.avatar && avatar.weapon) {
      const bonusPanel = document.createElement("div");
      bonusPanel.className = "pause-panel";

      const panelTitle = document.createElement("div");
      panelTitle.className = "pause-panel-title";
      panelTitle.textContent = "current bonuses";
      bonusPanel.appendChild(panelTitle);

      const rows = document.createElement("div");
      rows.className = "pause-bonus-grid";
      const bonusRows: Array<[string, string]> = [
        ["damage", `${avatar.weapon.damage}`],
        ["fire interval", `${avatar.weapon.period.toFixed(2)}s`],
        ["projectile speed", `${Math.round(avatar.weapon.projectileSpeed)}`],
        ["projectiles", `${avatar.weapon.projectiles}`],
        ["pierce", `${avatar.weapon.pierce}`],
        ["crit", `${Math.round(avatar.weapon.crit * 100)}%`],
        ["move speed", `${Math.round(avatar.avatar.speedMul * 100)}%`],
        ["max hp", `${avatar.avatar.maxHp}`],
        ["ricochet", `${avatar.weapon.ricochet}`],
        ["chain", `${avatar.weapon.chain}`],
      ];
      if (avatar.weapon.burnDps > 0) {
        bonusRows.push(["burn", `${avatar.weapon.burnDps.toFixed(2)} dps / ${avatar.weapon.burnDuration.toFixed(1)}s`]);
      }
      if (avatar.weapon.slowPct > 0) {
        bonusRows.push(["slow", `${Math.round(avatar.weapon.slowPct * 100)}% / ${avatar.weapon.slowDuration.toFixed(1)}s`]);
      }
      for (const [k, v] of bonusRows) {
        const row = document.createElement("div");
        row.className = "pause-bonus-row";
        const key = document.createElement("span");
        key.className = "pause-bonus-key";
        key.textContent = k;
        const value = document.createElement("span");
        value.className = "pause-bonus-value";
        value.textContent = v;
        row.appendChild(key);
        row.appendChild(value);
        rows.appendChild(row);
      }
      bonusPanel.appendChild(rows);
      inner.appendChild(bonusPanel);
    }

    const statusPanel = document.createElement("div");
    statusPanel.className = "pause-panel";
    const statusTitle = document.createElement("div");
    statusTitle.className = "pause-panel-title";
    statusTitle.textContent = "card holdings";
    statusPanel.appendChild(statusTitle);

    const list = document.createElement("div");
    list.className = "pause-card-list";
    const rarityRank: Record<Card["rarity"], number> = { common: 0, uncommon: 1, rare: 2 };
    const sortedPool = [...POOL].sort((a, b) => {
      const rankDelta = rarityRank[a.rarity] - rarityRank[b.rarity];
      if (rankDelta !== 0) return rankDelta;
      return a.name.localeCompare(b.name);
    });
    for (const card of sortedPool) {
      const entry = runInventory.getForCard(card);
      const row = document.createElement("div");
      row.className = "pause-card-row";
      const isSharedAbility = entry != null && !entry.sourceCardIds.includes(card.id);
      const sourceLabel = isSharedAbility && entry
        ? ` (shared with: ${entry.sourceCardIds.map((id) => POOL_BY_ID.get(id)?.name ?? id).join(", ")})`
        : "";
      const status = entry
        ? (isSharedAbility ? `merged · Lv${entry.level}` : `held · Lv${entry.level}`)
        : "not held";
      row.textContent = `${card.name} · ${entry?.rarity ?? card.rarity} · ${status}${sourceLabel}`;
      list.appendChild(row);
    }
    statusPanel.appendChild(list);
    inner.appendChild(statusPanel);

    const resumeBtn = document.createElement("button");
    resumeBtn.type = "button";
    resumeBtn.className = "big-btn";
    resumeBtn.textContent = "resume";
    resumeBtn.addEventListener("click", () => setPaused(false));
    inner.appendChild(resumeBtn);

    const restartBtn = document.createElement("button");
    restartBtn.type = "button";
    restartBtn.className = "menu-btn";
    restartBtn.textContent = "restart";
    restartBtn.addEventListener("click", () => {
      if (!currentRun) return;
      startRun(currentRun.mode, currentRun.stageIndex, currentRun.developMode);
    });
    inner.appendChild(restartBtn);

    const menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.className = "menu-btn";
    menuBtn.textContent = "main menu";
    menuBtn.addEventListener("click", () => showMainMenu());
    inner.appendChild(menuBtn);

    overlay.hidden = false;
  }

  function setPaused(next: boolean): void {
    paused = next;
    syncRunControlButtons();
    const overlay = document.getElementById("overlay");
    const inner = document.getElementById("overlay-inner");
    if (!paused) {
      if (overlay) overlay.hidden = true;
      if (inner) inner.innerHTML = "";
      return;
    }
    renderPauseOverlay();
  }

  function setTheme(theme: StageTheme): void {
    app.renderer.background.color = theme.background;
    const overlay = document.getElementById("overlay");
    if (overlay) overlay.style.background = theme.overlayBg;
  }

  // ── Title-card (stage entry / boss spawn) ────────────────────────────────

  /** Show a brief monospace title-card that fades in/out without blocking input. */
  function showTitleCard(lines: string[], durationMs = 1500): void {
    const container = document.createElement("div");
    container.className = "title-card";
    for (const line of lines) {
      const el = document.createElement("div");
      el.textContent = line;
      container.appendChild(el);
    }
    document.getElementById("game")?.appendChild(container);

    // Fade in (force reflow first to ensure transition triggers)
    container.offsetWidth; // eslint-disable-line @typescript-eslint/no-unused-expressions
    container.style.opacity = "1";

    // Fade out then remove
    setTimeout(() => {
      container.style.opacity = "0";
      setTimeout(() => container.remove(), 300);
    }, durationMs);
  }

  // ── HUD ─────────────────────────────────────────────────────────────────

  function updateHud(
    hp: number,
    maxHp: number,
    waveIdx: number,
    totalWaves: number,
    points: number,
    tokens: number,
  ): void {
    if (hudHp) hudHp.textContent = `HP: ${hp}/${maxHp}`;
    if (hudWave) hudWave.textContent = `W: ${waveIdx}/${totalWaves}`;
    if (hudPts) hudPts.textContent = `${points}pts`;
    if (hudTokens) hudTokens.textContent = `⟐ ${tokens}`;
  }

  const skillButtonUpdaters = new WeakMap<HTMLButtonElement, () => void>();

  function showSkillButtons(): void {
    if (!hudSkills) return;
    hudSkills.innerHTML = "";
    for (let i = 0; i < play.activeSkills.length; i++) {
      const sk = play.activeSkills[i]!;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "skill-btn";
      btn.addEventListener("click", () => play.activateSkill(i));

      const SKILL_ICONS: Record<string, string> = {
        timeStop: iconTimeStop,
        shadowClone: iconClone,
        reflectShield: iconReflect,
        barrage: iconBarrage,
        lifestealPulse: iconLifesteal,
        axisFreeze: iconAxisFreeze,
        overload: iconOverload,
      };
      const SKILL_LABELS: Record<string, string> = {
        timeStop: "Time Stop",
        shadowClone: "Clone",
        reflectShield: "Shield",
        barrage: "Barrage",
        lifestealPulse: "Lifesteal",
        axisFreeze: "Freeze",
        overload: "Overload",
      };

      const updateLabel = (): void => {
        const icon = SKILL_ICONS[sk.id] ?? iconTimeStop;
        if (sk.active > 0) {
          setIconHtml(btn, icon);
          btn.append(` ${sk.active.toFixed(1)}s`);
          btn.disabled = true;
        } else if (sk.cooldown > 0) {
          setIconHtml(btn, icon);
          btn.append(` ${Math.ceil(sk.cooldown)}s`);
          btn.disabled = true;
        } else {
          setIconHtml(btn, icon);
          btn.append(` ${SKILL_LABELS[sk.id] ?? sk.id}`);
          btn.disabled = false;
        }
      };
      updateLabel();
      skillButtonUpdaters.set(btn, updateLabel);
      hudSkills.appendChild(btn);
    }
  }

  function refreshSkillButtons(): void {
    if (!hudSkills) return;
    for (const btn of hudSkills.querySelectorAll<HTMLButtonElement>(".skill-btn")) {
      skillButtonUpdaters.get(btn)?.();
    }
  }

  function showDeveloperControls(): void {
    if (!hudSkills) return;
    hudSkills.innerHTML = "";
    const addControlButton = (label: string, onClick: () => void, attrs?: Record<string, string>): void => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "menu-btn";
      btn.textContent = label;
      btn.style.flex = "1 1 0";
      if (attrs) {
        for (const [k, v] of Object.entries(attrs)) {
          btn.setAttribute(k, v);
        }
      }
      btn.addEventListener("click", onClick);
      hudSkills.appendChild(btn);
    };
    addControlButton("player", openDeveloperPlayerMenu);
    addControlButton("enemy", openDeveloperEnemyMenu);
    addControlButton("enhance", openDeveloperEnhanceMenu);
    addControlButton("skills", openDeveloperSkillsMenu);
    addControlButton("start", () => {
      play.spawnDeveloperEnemiesNow();
      setPaused(false);
    });
    addControlButton(paused ? "resume" : "pause", () => {
      const nextPaused = !paused;
      setPaused(nextPaused);
      const toggleBtn = hudSkills.querySelector<HTMLButtonElement>("[data-dev-toggle='pause']");
      if (toggleBtn) toggleBtn.textContent = nextPaused ? "resume" : "pause";
    }, { "data-dev-toggle": "pause" });
    addControlButton("restart", () => startRun("survival", 0, true));
  }

  interface DeveloperFormField {
    name: string;
    label: string;
    type: "number" | "text" | "checkbox";
    value: string;
    min?: number;
    max?: number;
    step?: number;
  }

  function parseNumericFormValue(value: string, fallback: number): number {
    const n = Number(value);
    return Number.isNaN(n) ? fallback : n;
  }

  async function openDeveloperForm(
    title: string,
    fields: DeveloperFormField[],
  ): Promise<Record<string, string> | null> {
    return new Promise((resolve) => {
      const wasPaused = paused;
      if (!wasPaused) setPaused(true);

      const dialog = document.createElement("dialog");
      dialog.className = "developer-dialog";
      dialog.setAttribute("aria-label", title);

      const form = document.createElement("form");
      form.className = "developer-form";
      form.method = "dialog";
      dialog.appendChild(form);

      const heading = document.createElement("div");
      heading.className = "overlay-title";
      heading.textContent = title;
      form.appendChild(heading);

      const body = document.createElement("div");
      body.className = "pause-panel";
      form.appendChild(body);

      for (const field of fields) {
        const row = document.createElement("label");
        row.className = "developer-form-row";
        const label = document.createElement("span");
        label.className = "developer-form-label";
        label.textContent = field.label;

        if (field.type === "number" && field.min !== undefined && field.max !== undefined) {
          // Numeric field with known range — show range slider + number input
          const wrapper = document.createElement("div");
          wrapper.className = "developer-form-slider-group";

          const range = document.createElement("input");
          range.type = "range";
          range.className = "developer-form-range";
          range.min = `${field.min}`;
          range.max = `${field.max}`;
          if (field.step !== undefined) range.step = `${field.step}`;
          range.value = field.value;

          const input = document.createElement("input");
          input.name = field.name;
          input.type = "number";
          input.className = "developer-form-input developer-form-input--slim";
          input.min = `${field.min}`;
          input.max = `${field.max}`;
          if (field.step !== undefined) input.step = `${field.step}`;
          input.value = field.value;

          range.addEventListener("input", () => { input.value = range.value; });
          input.addEventListener("input", () => { range.value = input.value; });

          wrapper.appendChild(range);
          wrapper.appendChild(input);
          row.appendChild(label);
          row.appendChild(wrapper);
        } else {
          const input = document.createElement("input");
          input.name = field.name;
          input.className = "developer-form-input";
          input.type = field.type;
          if (field.type === "checkbox") {
            input.checked = field.value === "1" || field.value.toLowerCase() === "true";
            input.classList.add("developer-form-checkbox");
          } else {
            input.value = field.value;
            if (field.type === "number") {
              if (field.min !== undefined) input.min = `${field.min}`;
              if (field.max !== undefined) input.max = `${field.max}`;
              if (field.step !== undefined) input.step = `${field.step}`;
            }
          }
          row.appendChild(label);
          row.appendChild(input);
        }

        body.appendChild(row);
      }

      const actions = document.createElement("div");
      actions.className = "draft-actions";
      const saveBtn = document.createElement("button");
      saveBtn.type = "submit";
      saveBtn.className = "big-btn";
      saveBtn.textContent = "save";
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "menu-btn";
      cancelBtn.textContent = "cancel";
      cancelBtn.addEventListener("click", () => dialog.close("cancel"));
      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      form.appendChild(actions);

      const finalize = (result: Record<string, string> | null): void => {
        dialog.remove();
        if (!wasPaused) setPaused(false);
        resolve(result);
      };

      form.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const values: Record<string, string> = {};
        for (const field of fields) {
          const input = form.elements.namedItem(field.name);
          if (input instanceof HTMLInputElement) {
            values[field.name] = input.type === "checkbox" ? (input.checked ? "1" : "0") : input.value;
          }
        }
        dialog.close("save");
        finalize(values);
      });
      dialog.addEventListener("close", () => {
        if (dialog.returnValue !== "save") finalize(null);
      }, { once: true });

      document.body.appendChild(dialog);
      dialog.showModal();
    });
  }

  async function openDeveloperPlayerMenu(): Promise<void> {
    if (!play?.isDeveloperMode()) return;
    const avatar = play.world.get(play.avatarId);
    if (!avatar?.avatar || !avatar.weapon) return;
    const snapshot = play.getDeveloperSnapshot();
    const values = await openDeveloperForm("developer · player", [
      { name: "hp", label: "hp", type: "number", value: `${avatar.avatar.hp}`, min: 1, max: 999, step: 1 },
      { name: "maxHp", label: "max hp", type: "number", value: `${avatar.avatar.maxHp}`, min: 1, max: 999, step: 1 },
      { name: "speedMul", label: "move speed", type: "number", value: avatar.avatar.speedMul.toFixed(2), min: 0.1, max: 5, step: 0.01 },
      { name: "damage", label: "damage", type: "number", value: `${avatar.weapon.damage}`, min: 1, max: 999, step: 1 },
      { name: "fireInterval", label: "fire interval", type: "number", value: avatar.weapon.period.toFixed(2), min: 0, max: 5, step: 0.01 },
      { name: "projectileSpeed", label: "proj speed", type: "number", value: `${Math.round(avatar.weapon.projectileSpeed)}`, min: 1, max: 2000, step: 1 },
      { name: "projectiles", label: "projectiles", type: "number", value: `${avatar.weapon.projectiles}`, min: 1, max: 20, step: 1 },
      { name: "pierce", label: "pierce", type: "number", value: `${avatar.weapon.pierce}`, min: 0, max: 50, step: 1 },
      { name: "crit", label: "crit %", type: "number", value: `${Math.round(avatar.weapon.crit * 100)}`, min: 0, max: 100, step: 1 },
      { name: "invincible", label: "invincible", type: "checkbox", value: snapshot.invincible ? "1" : "0" },
      { name: "showEnemyHp", label: "show enemy hp", type: "checkbox", value: snapshot.showEnemyHp ? "1" : "0" },
    ]);
    if (!values) return;

    play.setDeveloperPlayerStats({
      hp: parseNumericFormValue(values.hp, avatar.avatar.hp),
      maxHp: parseNumericFormValue(values.maxHp, avatar.avatar.maxHp),
      speedMul: parseNumericFormValue(values.speedMul, avatar.avatar.speedMul),
      damage: parseNumericFormValue(values.damage, avatar.weapon.damage),
      fireInterval: parseNumericFormValue(values.fireInterval, avatar.weapon.period),
      projectileSpeed: parseNumericFormValue(values.projectileSpeed, avatar.weapon.projectileSpeed),
      projectiles: parseNumericFormValue(values.projectiles, avatar.weapon.projectiles),
      pierce: parseNumericFormValue(values.pierce, avatar.weapon.pierce),
      crit: parseNumericFormValue(values.crit, Math.round(avatar.weapon.crit * 100)) / 100,
    });
    play.setDeveloperInvincible(values.invincible === "1");
    play.setDeveloperShowEnemyHp(values.showEnemyHp === "1");
  }

  // ── Developer enemy list (add/edit/delete card-based UI) ──────────────────

  interface DeveloperEnemyEntry {
    kind: EnemyKind;
    count: number;
    hp: number;
    attack: number;
    speed: number;
    attackFrequency: number;
  }

  /** Persistent enemy list for develop mode (reset on run restart). */
  let developerEnemyEntries: DeveloperEnemyEntry[] = [];

  /** Apply current enemy entries to the PlayScene. */
  function applyDeveloperEnemyEntries(): void {
    if (!play?.isDeveloperMode()) return;
    const kinds: EnemyKind[] = ["circle", "square", "star", "pentagon", "hexagon", "diamond", "cross", "crescent", "boss"];
    for (const k of kinds) play.setDeveloperEnemySpawn(k, false, 0);
    for (const entry of developerEnemyEntries) {
      play.setDeveloperEnemySpawn(entry.kind, true, entry.count);
      play.setDeveloperEnemyStats(entry.kind, {
        hp: entry.hp,
        attack: entry.attack,
        speed: entry.speed,
        attackFrequency: entry.attackFrequency,
      });
    }
  }

  async function openDeveloperEnemyMenu(): Promise<void> {
    if (!play?.isDeveloperMode()) return;

    return new Promise<void>((resolve) => {
      const wasPaused = paused;
      if (!wasPaused) setPaused(true);

      const dialog = document.createElement("dialog");
      dialog.className = "developer-dialog";
      dialog.setAttribute("aria-label", "developer · enemy");

      const finalize = (): void => {
        dialog.remove();
        if (!wasPaused) setPaused(false);
        resolve();
      };

      const kinds: EnemyKind[] = ["circle", "square", "star", "pentagon", "hexagon", "diamond", "cross", "crescent", "boss"];

      function renderList(): void {
        dialog.innerHTML = "";
        const container = document.createElement("div");
        container.className = "developer-form";

        const heading = document.createElement("div");
        heading.className = "overlay-title";
        heading.textContent = "developer · enemy";
        container.appendChild(heading);

        // Spawn interval control
        const snapshot = play.getDeveloperSnapshot();
        const intervalRow = document.createElement("div");
        intervalRow.className = "developer-form-row";
        const intervalLabel = document.createElement("span");
        intervalLabel.className = "developer-form-label";
        intervalLabel.textContent = "interval";
        const intervalGroup = document.createElement("div");
        intervalGroup.className = "developer-form-slider-group";
        const intervalRange = document.createElement("input");
        intervalRange.type = "range";
        intervalRange.className = "developer-form-range";
        intervalRange.min = "0.1";
        intervalRange.max = "10";
        intervalRange.step = "0.1";
        intervalRange.value = snapshot.enemy.interval.toFixed(1);
        const intervalInput = document.createElement("input");
        intervalInput.type = "number";
        intervalInput.className = "developer-form-input developer-form-input--slim";
        intervalInput.min = "0.1";
        intervalInput.max = "10";
        intervalInput.step = "0.1";
        intervalInput.value = snapshot.enemy.interval.toFixed(1);
        intervalRange.addEventListener("input", () => {
          intervalInput.value = intervalRange.value;
          play.setDeveloperEnemyInterval(parseNumericFormValue(intervalRange.value, 2));
        });
        intervalInput.addEventListener("input", () => {
          intervalRange.value = intervalInput.value;
          play.setDeveloperEnemyInterval(parseNumericFormValue(intervalInput.value, 2));
        });
        intervalGroup.appendChild(intervalRange);
        intervalGroup.appendChild(intervalInput);
        intervalRow.appendChild(intervalLabel);
        intervalRow.appendChild(intervalGroup);
        container.appendChild(intervalRow);

        // Enemy cards
        const list = document.createElement("div");
        list.className = "developer-enemy-list";
        for (let i = 0; i < developerEnemyEntries.length; i++) {
          const entry = developerEnemyEntries[i]!;
          const card = document.createElement("div");
          card.className = "developer-enemy-card";

          const info = document.createElement("div");
          info.className = "developer-enemy-card-info";
          const kindLabel = document.createElement("div");
          kindLabel.className = "developer-enemy-card-kind";
          kindLabel.textContent = entry.kind;
          const statsLabel = document.createElement("div");
          statsLabel.className = "developer-enemy-card-stats";
          statsLabel.textContent = `×${entry.count}  hp:${entry.hp}  atk:${entry.attack}  spd:${entry.speed.toFixed(1)}`;
          info.appendChild(kindLabel);
          info.appendChild(statsLabel);

          const actions = document.createElement("div");
          actions.className = "developer-enemy-card-actions";
          const editBtn = document.createElement("button");
          editBtn.type = "button";
          editBtn.className = "secondary-btn";
          editBtn.textContent = "edit";
          editBtn.style.cssText = "flex:0 0 auto;padding:4px 10px;min-height:28px;font-size:11px";
          const idx = i;
          editBtn.addEventListener("click", () => renderEdit(idx));
          const delBtn = document.createElement("button");
          delBtn.type = "button";
          delBtn.className = "secondary-btn";
          delBtn.textContent = "del";
          delBtn.style.cssText = "flex:0 0 auto;padding:4px 10px;min-height:28px;font-size:11px;color:var(--accent)";
          delBtn.addEventListener("click", () => {
            developerEnemyEntries.splice(idx, 1);
            applyDeveloperEnemyEntries();
            renderList();
          });
          actions.appendChild(editBtn);
          actions.appendChild(delBtn);

          card.appendChild(info);
          card.appendChild(actions);
          list.appendChild(card);
        }
        container.appendChild(list);

        // + add button
        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "menu-btn";
        addBtn.textContent = "+ add enemy";
        addBtn.addEventListener("click", () => renderAdd());
        container.appendChild(addBtn);

        // Close button
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "menu-btn";
        closeBtn.textContent = "close";
        closeBtn.addEventListener("click", () => { dialog.close(); finalize(); });
        container.appendChild(closeBtn);

        dialog.appendChild(container);
      }

      function renderAdd(): void {
        dialog.innerHTML = "";
        const container = document.createElement("div");
        container.className = "developer-form";

        const heading = document.createElement("div");
        heading.className = "overlay-title";
        heading.textContent = "add enemy";
        container.appendChild(heading);

        // Kind selector
        const kindRow = document.createElement("div");
        kindRow.className = "developer-form-row";
        const kindLabel = document.createElement("span");
        kindLabel.className = "developer-form-label";
        kindLabel.textContent = "kind";
        const kindSelect = document.createElement("select");
        kindSelect.className = "developer-form-input";
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "select...";
        placeholder.disabled = true;
        placeholder.selected = true;
        kindSelect.appendChild(placeholder);
        for (const k of kinds) {
          const opt = document.createElement("option");
          opt.value = k;
          opt.textContent = k;
          kindSelect.appendChild(opt);
        }
        kindRow.appendChild(kindLabel);
        kindRow.appendChild(kindSelect);
        container.appendChild(kindRow);

        // Fields container (shown after kind selection)
        const fieldsContainer = document.createElement("div");
        fieldsContainer.className = "pause-panel";
        fieldsContainer.hidden = true;
        container.appendChild(fieldsContainer);

        const saveBtn = document.createElement("button");
        saveBtn.type = "button";
        saveBtn.className = "big-btn";
        saveBtn.textContent = "save";
        saveBtn.hidden = true;
        container.appendChild(saveBtn);

        const backBtn = document.createElement("button");
        backBtn.type = "button";
        backBtn.className = "menu-btn";
        backBtn.textContent = "back";
        backBtn.addEventListener("click", () => renderList());
        container.appendChild(backBtn);

        let currentInputs: { count: HTMLInputElement; hp: HTMLInputElement; attack: HTMLInputElement; speed: HTMLInputElement; attackFrequency: HTMLInputElement } | null = null;

        kindSelect.addEventListener("change", () => {
          const kind = kindSelect.value as EnemyKind;
          if (!kinds.includes(kind)) return;
          const snapshot = play.getDeveloperSnapshot();
          const baseStats = snapshot.enemy.stats[kind];
          fieldsContainer.innerHTML = "";
          fieldsContainer.hidden = false;
          saveBtn.hidden = false;

          const inputs = buildEnemyStatsFields(fieldsContainer, {
            count: 1, hp: baseStats.hp, attack: baseStats.attack,
            speed: baseStats.speed, attackFrequency: baseStats.attackFrequency,
          });
          currentInputs = inputs;
        });

        saveBtn.addEventListener("click", () => {
          const kind = kindSelect.value as EnemyKind;
          if (!kinds.includes(kind) || !currentInputs) return;
          developerEnemyEntries.push({
            kind,
            count: Math.max(1, Math.round(parseNumericFormValue(currentInputs.count.value, 1))),
            hp: Math.max(1, Math.round(parseNumericFormValue(currentInputs.hp.value, 1))),
            attack: Math.max(0, parseNumericFormValue(currentInputs.attack.value, 1)),
            speed: Math.max(0, parseNumericFormValue(currentInputs.speed.value, 1)),
            attackFrequency: Math.max(0, parseNumericFormValue(currentInputs.attackFrequency.value, 1)),
          });
          applyDeveloperEnemyEntries();
          renderList();
        });

        dialog.appendChild(container);
      }

      function renderEdit(index: number): void {
        const entry = developerEnemyEntries[index];
        if (!entry) { renderList(); return; }

        dialog.innerHTML = "";
        const container = document.createElement("div");
        container.className = "developer-form";

        const heading = document.createElement("div");
        heading.className = "overlay-title";
        heading.textContent = `edit · ${entry.kind}`;
        container.appendChild(heading);

        const fieldsContainer = document.createElement("div");
        fieldsContainer.className = "pause-panel";
        container.appendChild(fieldsContainer);

        const inputs = buildEnemyStatsFields(fieldsContainer, entry);

        const actions = document.createElement("div");
        actions.className = "draft-actions";
        const saveBtn = document.createElement("button");
        saveBtn.type = "button";
        saveBtn.className = "big-btn";
        saveBtn.textContent = "save";
        saveBtn.addEventListener("click", () => {
          entry.count = Math.max(1, Math.round(parseNumericFormValue(inputs.count.value, entry.count)));
          entry.hp = Math.max(1, Math.round(parseNumericFormValue(inputs.hp.value, entry.hp)));
          entry.attack = Math.max(0, parseNumericFormValue(inputs.attack.value, entry.attack));
          entry.speed = Math.max(0, parseNumericFormValue(inputs.speed.value, entry.speed));
          entry.attackFrequency = Math.max(0, parseNumericFormValue(inputs.attackFrequency.value, entry.attackFrequency));
          applyDeveloperEnemyEntries();
          renderList();
        });
        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "menu-btn";
        cancelBtn.textContent = "back";
        cancelBtn.addEventListener("click", () => renderList());
        actions.appendChild(saveBtn);
        actions.appendChild(cancelBtn);
        container.appendChild(actions);

        dialog.appendChild(container);
      }

      function buildEnemyStatsFields(
        parent: HTMLElement,
        defaults: { count: number; hp: number; attack: number; speed: number; attackFrequency: number },
      ): { count: HTMLInputElement; hp: HTMLInputElement; attack: HTMLInputElement; speed: HTMLInputElement; attackFrequency: HTMLInputElement } {
        const fieldDefs: { name: string; label: string; value: number; min: number; max: number; step: number }[] = [
          { name: "count", label: "count", value: defaults.count, min: 1, max: 50, step: 1 },
          { name: "hp", label: "hp", value: defaults.hp, min: 1, max: 9999, step: 1 },
          { name: "attack", label: "attack", value: defaults.attack, min: 0, max: 100, step: 0.1 },
          { name: "speed", label: "speed", value: defaults.speed, min: 0, max: 500, step: 0.1 },
          { name: "attackFrequency", label: "atk freq", value: defaults.attackFrequency, min: 0, max: 10, step: 0.1 },
        ];
        const inputs: Record<string, HTMLInputElement> = {};
        for (const fd of fieldDefs) {
          const row = document.createElement("label");
          row.className = "developer-form-row";
          const label = document.createElement("span");
          label.className = "developer-form-label";
          label.textContent = fd.label;

          const wrapper = document.createElement("div");
          wrapper.className = "developer-form-slider-group";
          const range = document.createElement("input");
          range.type = "range";
          range.className = "developer-form-range";
          range.min = `${fd.min}`;
          range.max = `${fd.max}`;
          range.step = `${fd.step}`;
          range.value = `${fd.value}`;
          const input = document.createElement("input");
          input.type = "number";
          input.className = "developer-form-input developer-form-input--slim";
          input.min = `${fd.min}`;
          input.max = `${fd.max}`;
          input.step = `${fd.step}`;
          input.value = `${fd.value}`;
          range.addEventListener("input", () => { input.value = range.value; });
          input.addEventListener("input", () => { range.value = input.value; });
          wrapper.appendChild(range);
          wrapper.appendChild(input);

          row.appendChild(label);
          row.appendChild(wrapper);
          parent.appendChild(row);
          inputs[fd.name] = input;
        }
        return inputs as { count: HTMLInputElement; hp: HTMLInputElement; attack: HTMLInputElement; speed: HTMLInputElement; attackFrequency: HTMLInputElement };
      }

      renderList();
      document.body.appendChild(dialog);
      dialog.showModal();

      dialog.addEventListener("close", () => finalize(), { once: true });
    });
  }

  function applyDeveloperEnhance(card: Card, targetLevel: number): void {
    const safeLevel = Math.max(1, Math.floor(targetLevel));
    if (!runInventory.hasForCard(card)) {
      applyCard(play.world, play.avatarId, card);
      runInventory.add(card);
      play.recordPick(card);
    }
    if (!isLevelableEffect(card.effect)) {
      renderCardHud();
      return;
    }
    while ((runInventory.getForCard(card)?.level ?? 1) < safeLevel) {
      const newLevel = runInventory.levelUpForCard(card);
      if (newLevel <= 0) break;
      applyCardLevelUp(play.world, play.avatarId, card, newLevel);
      play.recordPick(card);
    }
    renderCardHud();
  }

  async function openDeveloperEnhanceMenu(): Promise<void> {
    if (!play?.isDeveloperMode()) return;
    const values = await openDeveloperForm("developer · enhance", [
      { name: "cardId", label: "card id", type: "text", value: "damagePlus" },
      { name: "level", label: "target level", type: "number", value: "1", min: 1, max: 5, step: 1 },
    ]);
    if (!values) return;
    const cardId = values.cardId.trim();
    const card = cardId ? POOL_BY_ID.get(cardId) : undefined;
    if (!card) return;
    applyDeveloperEnhance(card, parseNumericFormValue(values.level, 1));
  }

  async function openDeveloperSkillsMenu(): Promise<void> {
    if (!play?.isDeveloperMode()) return;
    const snapshot = play.getDeveloperSnapshot();
    const skillIds = Object.keys(PRIMAL_SKILLS) as PrimalSkillId[];
    const values = await openDeveloperForm("developer · skills", [
      { name: "id", label: "skill id", type: "text", value: "barrage" },
      { name: "enabled", label: "enabled", type: "checkbox", value: "1" },
      { name: "level", label: "level", type: "number", value: "0", min: 0, max: 10, step: 1 },
      { name: "duration", label: "duration", type: "number", value: "2", min: 0, max: 30, step: 0.1 },
      { name: "cooldown", label: "cooldown", type: "number", value: "8", min: 0, max: 60, step: 0.1 },
    ]);
    if (!values) return;
    const id = values.id.trim() as PrimalSkillId;
    if (!skillIds.includes(id)) return;
    const prev = snapshot.skills[id];
    play.setDeveloperSkillConfig(id, {
      enabled: values.enabled === "1",
      level: parseNumericFormValue(values.level, prev.level),
      duration: parseNumericFormValue(values.duration, prev.duration),
      cooldown: parseNumericFormValue(values.cooldown, prev.cooldown),
    });
  }

  // ── Card HUD (top-left overlay) ─────────────────────────────────────────

  function renderCardHud(): void {
    let container = document.getElementById("hud-cards");
    if (!container) {
      container = document.createElement("div");
      container.id = "hud-cards";
      gameEl!.appendChild(container);
    }
    container.innerHTML = "";

    for (const [, entry] of runInventory.all()) {
      const chip = document.createElement("span");
      chip.className = "card-chip";
      chip.title = `${entry.card.name} Lv${entry.level}`;

      const glyphSpan = document.createElement("span");
      glyphSpan.className = "card-chip-glyph";
      const svgGlyph = CARD_GLYPHS[entry.card.id];
      if (svgGlyph) setIconHtml(glyphSpan, svgGlyph);
      else glyphSpan.textContent = entry.card.glyph;

      const lvSpan = document.createElement("span");
      lvSpan.className = "card-chip-lv";
      lvSpan.textContent = `${entry.level}`;

      chip.appendChild(glyphSpan);
      chip.appendChild(lvSpan);
      container.appendChild(chip);
    }

    const unmappedEquipment = listUnmappedEquipmentCards(equipment.equipped);
    for (const eqCard of unmappedEquipment) {
      const chip = document.createElement("span");
      chip.className = "card-chip";
      chip.title = `${eqCard.name} (equipment)`;

      const glyphSpan = document.createElement("span");
      glyphSpan.className = "card-chip-glyph";
      const svgGlyph = SHOP_GLYPHS[eqCard.id];
      if (svgGlyph) setIconHtml(glyphSpan, svgGlyph);
      else glyphSpan.textContent = eqCard.glyph;

      const lvSpan = document.createElement("span");
      lvSpan.className = "card-chip-lv";
      lvSpan.textContent = "E";

      chip.appendChild(glyphSpan);
      chip.appendChild(lvSpan);
      container.appendChild(chip);
    }

    container.hidden = runInventory.size === 0 && unmappedEquipment.length === 0;
  }

  function clearCardHud(): void {
    const container = document.getElementById("hud-cards");
    if (container) {
      container.innerHTML = "";
      container.hidden = true;
    }
  }

  // ── Run lifecycle ───────────────────────────────────────────────────────

  function startRun(mode: GameMode, stageIndex: number, developMode = false): void {
    while (stack.top()) stack.pop();
    app.stage.removeChildren();
    currentRun = { mode, stageIndex, developMode };
    setPaused(false);
    pendingUnlocks = null;

    // Snapshot stats before run so we can compute unlock diff at settle.
    statsBeforeRun = {
      ...profile.stats,
      normalCleared: [...profile.stats.normalCleared],
    };

    const theme = mode === "normal" ? (STAGE_THEMES[stageIndex] ?? DEFAULT_THEME) : DEFAULT_THEME;
    setTheme(theme);

    seed = pickSeed();
    const rng = createRng(seed);
    // eslint-disable-next-line no-console
    console.log(`[axiom] run seed = ${seed}, mode = ${mode}, stage = ${stageIndex}`);
    if (hudSeed) hudSeed.textContent = `seed: ${seed}`;

    // Build waves
    const waves = mode === "normal"
      ? (STAGE_WAVES[stageIndex] ?? WAVES)
      : [survivalWaveSpec(1, rng)]; // survival starts with wave 1

    // In develop mode, start with no skills and default skin (bare avatar).
    const activeSkills = developMode ? [] : createActiveSkillStates(skillTree);

    const startingShape = resolveSelectedStartingShape(profile);
    const runSkin = developMode ? "triangle" : runSkinForStartingShape(startingShape, profile.activeSkin);

    // Reset card inventory for this run.
    runInventory = new CardInventory();
    // Reset developer enemy entries on new run.
    if (developMode) developerEnemyEntries = [];

    play = new PlayScene(
      rng,
      {
        updateHud,
        onWaveCleared: (cleared) => {
          playSfx("draft");
          const label = mode === "survival"
            ? `${cleared}`
            : `${cleared} of ${play.totalWaves()}`;
          const offer = drawOffer(rng, 3, POOL, profile.stats);
          let rerollUses = 0;
          let draft: DraftScene;
          draft = new DraftScene(offer, label, {
            onPick: (pick) => onPickCard(pick),
            onReroll: () => {
              const cost = rerollTokenCostForUse(rerollUses);
              if (play.draftTokens < cost) return false;
              play.draftTokens -= cost;
              rerollUses += 1;
              draft.setOffer(drawOffer(rng, 3, POOL, profile.stats));
              return true;
            },
            onSkip: () => {
              stack.pop();
              play.advanceToNextWave();
            },
            getTokens: () => play.draftTokens,
            getRerollCost: () => rerollTokenCostForUse(rerollUses),
            getInventory: () => runInventory,
          });
          stack.push(draft);
        },
        onPlayerDied: () => {
          playSfx("death");
          currentRun = null;
          setPaused(false);
          const total = mode === "survival" ? play.currentWave1() : play.totalWaves();
          stack.push(new EndgameScene("dead", play.currentWave1(), total, () => showMainMenu(), pendingUnlocks ?? undefined));
        },
        onRunWon: () => {
          currentRun = null;
          setPaused(false);
          const total = play.totalWaves();
          stack.push(new EndgameScene("won", total, total, () => showMainMenu(), pendingUnlocks ?? undefined));
        },
        onRunComplete: (result) => settleRun(result),
        onBossWaveStart: () => {
          if (mode === "normal") {
            const bossDef = bossForStage(stageIndex);
            const stageTheme = STAGE_THEMES[stageIndex];
            if (stageTheme) {
              showTitleCard([
                `BOSS: ${bossDef.displayName}`,
                `THEOREM: ${stageTheme.theoremLine}`,
              ]);
            }
          }
        },
      },
      mapper,
      { mode, waves, gridColor: theme.gridColor, stageIndex, activeSkills, theme, activeSkin: runSkin, developerMode: developMode },
    );

    if (!developMode) {
      applyStartingShapeLoadout(play.world, play.avatarId, startingShape);
      // Apply equipment loadout at run start.
      applyEquipment(equipment, play.world, play.avatarId);

      // Seed the card inventory with equipped equipment cards (they count as Lv 1).
      for (const cardId of equipment.equipped) {
        const runCardId = mapEquipmentToRunCardId(cardId) ?? cardId;
        const poolCard = POOL_BY_ID.get(runCardId);
        if (poolCard && !runInventory.has(runCardId)) {
          runInventory.add(poolCard);
        }
      }
    }

    app.stage.addChild(play.root);
    stack.push(play);
    if (developMode) {
      showDeveloperControls();
    } else {
      showSkillButtons();
    }
    renderCardHud();

    // Stage-entry title-card (normal mode only).
    if (mode === "normal") {
      const stageTheme = STAGE_THEMES[stageIndex];
      if (stageTheme) {
        showTitleCard([
          `STAGE ${stageIndex + 1} — DOMAIN: ${stageTheme.domainName}`,
          `THEOREM: ${stageTheme.theoremLine}`,
        ]);
      }
    }
  }

  function onPickCard(card: Card): void {
    if (runInventory.hasForCard(card) && isLevelableEffect(card.effect)) {
      // Duplicate pick — level up instead of stacking another copy.
      const newLevel = runInventory.levelUpForCard(card);
      if (newLevel > 0) {
        applyCardLevelUp(play.world, play.avatarId, card, newLevel);
      }
    } else {
      applyCard(play.world, play.avatarId, card);
      runInventory.add(card);
    }
    play.recordPick(card);
    stack.pop();
    play.advanceToNextWave();
    renderCardHud();
  }

  async function settleRun(result: RunResult): Promise<void> {
    // Update profile
    profile.points += result.pointsEarned;
    profile.stats.totalRuns += 1;
    profile.stats.totalKills += result.totalKills;
    profile.stats.totalBossKills += result.bossKills;
    profile.stats.totalPointsEarned += result.pointsEarned;

    // Apply loot
    for (const drop of result.loot) {
      if (drop.kind === "core") skillTree.cores += drop.value;
      if (drop.kind === "skillPoints") skillTree.skillPoints += drop.value;
    }

    // Survival best
    if (result.mode === "survival") {
      profile.stats.bestSurvivalWave = Math.max(profile.stats.bestSurvivalWave, result.wavesCleared);
    }

    const normalStageWaveTarget = result.mode === "normal"
      ? (STAGE_WAVES[result.stageIndex]?.length ?? WAVES.length)
      : 0;

    // Normal mode clear tracking
    if (result.mode === "normal" && result.wavesCleared >= normalStageWaveTarget) {
      profile.stats.normalCleared[result.stageIndex] = true;
    }

    // Check achievements
    if (result.bossKills > 0) {
      if (unlockAchievement(achievements, "firstBossKill")) {
        // eslint-disable-next-line no-console
        console.log("[axiom] Achievement unlocked: firstBossKill");
      }
    }
    if (result.noPowerRun && result.mode === "normal" && result.wavesCleared >= normalStageWaveTarget) {
      unlockAchievement(achievements, "noPowerNormalClear");
    }
    if (result.noPowerRun && result.mode === "survival" && result.wavesCleared >= 16) {
      unlockAchievement(achievements, "noPowerSurvival16");
    }

    // Progress achievements
    if (profile.stats.totalKills >= 100) {
      unlockAchievement(achievements, "kill100");
    }
    if (profile.stats.totalKills >= 1000) {
      unlockAchievement(achievements, "kill1000");
    }
    if (profile.stats.normalCleared.filter(Boolean).length >= 3) {
      unlockAchievement(achievements, "clear3Stages");
    }

    // Difficulty achievements
    if (result.mode === "survival" && result.wavesCleared >= 32) {
      unlockAchievement(achievements, "survival32");
    }
    if (result.mode === "normal" && result.stageIndex === 2 && result.wavesCleared >= normalStageWaveTarget) {
      unlockAchievement(achievements, "clearStage3");
    }

    // Boss rush
    if (profile.stats.totalBossKills >= 3) {
      unlockAchievement(achievements, "bossRush3");
    }

    // Style: full equipment
    if (equipment.equipped.length >= equipment.maxSlots && equipment.maxSlots >= 3) {
      unlockAchievement(achievements, "fullEquipment");
    }

    // Style: own 5 skins
    if (profile.ownedSkins.length >= 5) {
      unlockAchievement(achievements, "own5Skins");
    }

    // Persist
    await Promise.all([
      saveProfile(profile),
      saveSkillTree(skillTree),
      saveAchievements(achievements),
    ]);

    // Compute unlock diff for endgame banner (map IDs to display names).
    if (statsBeforeRun) {
      const allSkillDefs = Object.values(PRIMAL_SKILLS);
      const diff = diffUnlocks(statsBeforeRun, profile.stats, POOL, allSkillDefs);
      if (diff.newCards.length > 0 || diff.newSkills.length > 0) {
        pendingUnlocks = {
          newCards: diff.newCards.map((id) => POOL_BY_ID.get(id)?.name ?? id),
          newSkills: diff.newSkills.map((id) => PRIMAL_SKILLS[id as keyof typeof PRIMAL_SKILLS]?.name ?? id),
        };
      }
    }
  }

  // ── Main menu ─────────────────────────────────────────────────────────

  function showMainMenu(): void {
    while (stack.top()) stack.pop();
    app.stage.removeChildren();
    currentRun = null;
    setPaused(false);
    setTheme(DEFAULT_THEME);
    if (hudSkills) hudSkills.innerHTML = "";
    clearCardHud();

    const menu = new MainMenuScene(
      async (action: MenuAction) => {
        switch (action.kind) {
        case "normalMode":
          stack.pop(); // remove menu
          stack.push(new StageSelectScene(
            (idx) => { stack.pop(); startRun("normal", idx); },
            () => { stack.pop(); showMainMenu(); },
            () => profile.stats,
          ));
          break;

        case "survivalMode":
          stack.pop();
          startRun("survival", 0);
          break;

        case "developMode":
          stack.pop();
          startRun("survival", 0, true);
          break;

        case "shop":
          stack.pop();
          stack.push(new ShopScene({
            getProfile: () => profile,
            getEquipment: () => equipment,
            getShopUnlocks: () => shopUnlocks,
            onPurchase: async (item) => {
              if (profile.points < item.price) return;
              profile.points -= item.price;
              if (item.category === "skin") {
                if (!profile.ownedSkins.includes(item.id)) profile.ownedSkins.push(item.id);
              } else if (item.category === "equipCard") {
                if (!equipment.ownedCards.includes(item.id)) equipment.ownedCards.push(item.id);
              } else if (item.category === "slotExpand") {
                equipment.maxSlots += 1;
              }
              if (!shopUnlocks.purchased.includes(item.id)) shopUnlocks.purchased.push(item.id);
              await Promise.all([saveProfile(profile), saveEquipment(equipment), saveShopUnlocks(shopUnlocks)]);
            },
            onBack: () => { stack.pop(); showMainMenu(); },
          }));
          break;

        case "equipment":
          stack.pop();
          stack.push(new EquipmentScene({
            getLoadout: () => equipment,
            getProfile: () => profile,
            onEquip: async (cardId) => {
              equipCard(equipment, cardId);
              await saveEquipment(equipment);
            },
            onUnequip: async (cardId) => {
              unequipCard(equipment, cardId);
              await saveEquipment(equipment);
            },
            onActivateSkin: async (skinId) => {
              profile.activeSkin = skinId;
              await saveProfile(profile);
            },
            onBack: () => { stack.pop(); showMainMenu(); },
          }));
          break;

        case "startShape":
          stack.pop();
          stack.push(new StartShapeSelectScene({
            getProfile: () => profile,
            onSelect: async (shapeId) => {
              profile.activeStartShape = shapeId;
              await saveProfile(profile);
            },
            onBack: () => { stack.pop(); showMainMenu(); },
          }));
          break;

        case "skillTree":
          stack.pop();
          stack.push(new SkillTreeScene({
            getState: () => skillTree,
            getStats: () => profile.stats,
            getRng: () => menuRng,
            onStateChanged: async (state) => {
              skillTree = state;
              // Check achievements
              const anyUnlocked = Object.values(skillTree.skills).some((s) => s.unlocked);
              if (anyUnlocked) {
                if (unlockAchievement(achievements, "firstPrimalSkill")) {
                  await saveAchievements(achievements);
                }
              }
              const anyMaxed = Object.values(skillTree.skills).some(
                (s) => s.unlocked && s.level >= MAX_SKILL_LEVEL,
              );
              if (anyMaxed) {
                if (unlockAchievement(achievements, "maxSkillLevel")) {
                  await saveAchievements(achievements);
                }
              }
              await saveSkillTree(skillTree);
            },
            onBack: () => { stack.pop(); showMainMenu(); },
          }));
          break;

        case "achievements":
          stack.pop();
          stack.push(new AchievementsScene(
            () => achievements,
            () => { stack.pop(); showMainMenu(); },
          ));
          break;

        case "settings":
          // Simple toggle for now
          setMuted(!isMuted());
          syncMuteLabel();
          break;

        case "exportData": {
          const data = await exportSaveData();
          downloadSaveData(data);
          break;
        }

        case "importData": {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".json";
          input.addEventListener("change", async () => {
            const file = input.files?.[0];
            if (!file) return;
            const text = await file.text();
            const data = parseSaveData(text);
            if (!data) {
              alert("Invalid save file.");
              return;
            }
            await importSaveData(data);
            // Reload state
            profile = await loadProfile();
            equipment = await loadEquipment();
            skillTree = await loadSkillTree();
            achievements = await loadAchievements();
            shopUnlocks = await loadShopUnlocks();
            developerModeUnlocked = (await loadSettings()).developerMode ?? false;
            alert("Data imported successfully!");
            showMainMenu();
          });
          input.click();
          break;
        }
        }
      },
      {
        showDevelopMode: developerModeUnlocked,
        onDeveloperUnlock: async () => {
          if (developerModeUnlocked) return;
          developerModeUnlocked = true;
          await saveSettings({ muted: isMuted(), developerMode: true });
          alert("Developer mode enabled.");
          showMainMenu();
        },
      },
    );
    app.stage.addChild(menu.root);
    stack.push(menu);
  }

  // ── Controls ──────────────────────────────────────────────────────────

  btnRestart?.addEventListener("click", () => {
    if (!currentRun) return;
    startRun(currentRun.mode, currentRun.stageIndex, currentRun.developMode);
  });
  btnPause?.addEventListener("click", () => {
    if (!currentRun) return;
    const top = stack.top();
    if (!paused && top !== play) return;
    setPaused(!paused);
  });
  btnComments?.addEventListener("click", () => {
    if (!(commentsDialog instanceof HTMLDialogElement)) return;
    if (!paused && currentRun) setPaused(true);
    commentsDialog.showModal();
  });
  btnMenu?.addEventListener("click", () => showMainMenu());

  function onFirstGesture(): void {
    primeSfx();
    document.removeEventListener("pointerdown", onFirstGesture);
  }
  document.addEventListener("pointerdown", onFirstGesture);

  function syncMuteLabel(): void {
    if (btnMute) btnMute.textContent = isMuted() ? "sfx off" : "sfx on";
  }
  btnMute?.addEventListener("click", () => {
    setMuted(!isMuted());
    syncMuteLabel();
    saveSettings({ muted: isMuted(), developerMode: developerModeUnlocked });
  });
  if (settings.muted) setMuted(true);
  syncMuteLabel();

  // ── Start ─────────────────────────────────────────────────────────────

  showMainMenu();
  syncRunControlButtons();

  startLoop(
    (dt) => {
      if (paused) return;
      stack.update(dt);
      refreshSkillButtons();
    },
    (alpha) => stack.render(alpha),
  );
}

boot().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[axiom] boot failed:", err);
});
