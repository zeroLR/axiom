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
import { EndgameScene } from "./scenes/endgame";
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
import { createActiveSkillStates } from "./game/skills";
import { MAX_SKILL_LEVEL } from "./game/data/types";
import { unlockAchievement } from "./game/achievements";
import type { RunResult } from "./game/rewards";
import {
  applyStartingShapeLoadout,
  resolveSelectedStartingShape,
  runSkinForStartingShape,
} from "./game/startingShapes";
import { iconTimeStop, iconClone, iconReflect, iconBarrage, iconLifesteal, setIconHtml, CARD_GLYPHS, SHOP_GLYPHS } from "./icons";
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
} from "./game/data/types";

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
  let currentRun: { mode: GameMode; stageIndex: number } | null = null;
  let paused = false;
  let seed = 0;
  let menuRng = createRng(42);
  let runInventory = new CardInventory();

  function syncRunControlButtons(): void {
    const runActive = currentRun !== null;
    if (btnRestart instanceof HTMLButtonElement) btnRestart.disabled = !runActive;
    if (btnPause instanceof HTMLButtonElement) {
      btnPause.disabled = !runActive;
      btnPause.textContent = paused ? "resume" : "pause";
      btnPause.setAttribute("aria-pressed", paused ? "true" : "false");
      btnPause.setAttribute("aria-label", paused ? "Resume run" : "Pause run");
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
      startRun(currentRun.mode, currentRun.stageIndex);
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
      };
      const SKILL_LABELS: Record<string, string> = {
        timeStop: "Time Stop",
        shadowClone: "Clone",
        reflectShield: "Shield",
        barrage: "Barrage",
        lifestealPulse: "Lifesteal",
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

  function startRun(mode: GameMode, stageIndex: number): void {
    while (stack.top()) stack.pop();
    app.stage.removeChildren();
    currentRun = { mode, stageIndex };
    setPaused(false);

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

    const activeSkills = createActiveSkillStates(skillTree);

    const startingShape = resolveSelectedStartingShape(profile);
    const runSkin = runSkinForStartingShape(startingShape, profile.activeSkin);

    // Reset card inventory for this run.
    runInventory = new CardInventory();

    play = new PlayScene(
      rng,
      {
        updateHud,
        onWaveCleared: (cleared) => {
          playSfx("draft");
          const label = mode === "survival"
            ? `${cleared}`
            : `${cleared} of ${play.totalWaves()}`;
          const offer = drawOffer(rng, 3);
          let rerollUses = 0;
          let draft: DraftScene;
          draft = new DraftScene(offer, label, {
            onPick: (pick) => onPickCard(pick),
            onReroll: () => {
              const cost = rerollTokenCostForUse(rerollUses);
              if (play.draftTokens < cost) return false;
              play.draftTokens -= cost;
              rerollUses += 1;
              draft.setOffer(drawOffer(rng, 3));
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
          stack.push(new EndgameScene("dead", play.currentWave1(), total, () => showMainMenu()));
        },
        onRunWon: () => {
          currentRun = null;
          setPaused(false);
          const total = play.totalWaves();
          stack.push(new EndgameScene("won", total, total, () => showMainMenu()));
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
      { mode, waves, gridColor: theme.gridColor, stageIndex, activeSkills, theme, activeSkin: runSkin },
    );

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

    app.stage.addChild(play.root);
    stack.push(play);
    showSkillButtons();
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
    if (runInventory.has(card.id) && isLevelableEffect(card.effect)) {
      // Duplicate pick — level up instead of stacking another copy.
      const newLevel = runInventory.levelUp(card.id);
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

    const menu = new MainMenuScene(async (action: MenuAction) => {
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
            alert("Data imported successfully!");
            showMainMenu();
          });
          input.click();
          break;
        }
      }
    });
    app.stage.addChild(menu.root);
    stack.push(menu);
  }

  // ── Controls ──────────────────────────────────────────────────────────

  btnRestart?.addEventListener("click", () => {
    if (!currentRun) return;
    startRun(currentRun.mode, currentRun.stageIndex);
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
    saveSettings({ muted: isMuted() });
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
