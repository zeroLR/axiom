import './style.css';
import { Application } from 'pixi.js';

import { isMuted, playSfx, primeSfx, setMuted, setVolumes, getMasterVolume, getSfxVolume } from './game/audio';
import { PLAY_H, PLAY_W, rerollTokenCostForUse } from './game/config';
import { startLoop } from './game/loop';
import { createRng, pickSeed } from './game/rng';
import {
  applyCard,
  applyCardLevelUp,
  drawOffer,
  POOL,
  projectedCardText,
  type Card,
} from './game/cards';
import { showNotification } from './app/notificationService';
import type { IStorageAdapter, IAudioAdapter, IMusicAdapter } from './app/adapters';
import {
  CardInventory,
  isLevelableEffect,
  MAX_CARD_LEVEL,
} from './game/cardLevels';
import { bossForStage } from './game/bosses/registry';
import { DraftScene } from './scenes/draft';
import { EndgameScene, type EndgameUnlocks } from './scenes/endgame';
import { BossRewardScene } from './scenes/bossReward';
import { PlayScene, type PointerMapper, type GameMode } from './scenes/play';
import { SceneStack } from './scenes/scene';
import { MainMenuScene, type MenuAction } from './scenes/mainMenu';
import { CodexScene } from './scenes/codex';
import { StageSelectScene } from './scenes/stageSelect';
import { ShopScene } from './scenes/shop';
import { EquipmentScene } from './scenes/equipment';
import { ClassCreationScene } from './scenes/classCreation';
import { SkillTreeScene } from './scenes/skillTree';
import { TalentScene } from './scenes/talent';
import { AchievementsScene } from './scenes/achievements';
import { SettingsScene } from './scenes/settings';
import {
  STAGE_THEMES,
  DEFAULT_THEME,
  type StageTheme,
} from './game/stageThemes';
import { STAGE_WAVES } from './game/stageWaves';
import { STAGE_CONFIGS } from './game/content/stages';
import { WAVES } from './game/waves';
import { survivalWaveSpec } from './game/survivalWaves';
import { applyEquipment } from './game/equipment';
import { equipCard, unequipCard } from './game/equipment';
import {
  mapEquipmentToRunCardId,
  listUnmappedEquipmentCards,
} from './game/equipment';
import {
  createActiveSkillStates,
  activeSkillsFromCharacter,
  PRIMAL_SKILLS,
  cloneInheritRatio,
  timeStopSpeedMul,
  barrageProjectiles,
  barrageDamage,
  lifestealRadius,
  lifestealDamage,
  lifestealHeal,
  reflectDamageRatio,
} from './game/skills';
import { diffUnlocks } from './game/unlocks';
import { unlockAchievement } from './game/achievements';
import type { RunResult } from './game/rewards';
import {
  FRAGMENT_META,
  applyFragmentGainWithCap,
  bossKindForStage,
  fragmentCategory,
} from './game/fragments';
import {
  applyStartingShapeLoadout,
  resolveSelectedStartingShape,
  runSkinForStartingShape,
} from './game/startingShapes';
import {
  setIconHtml,
  CARD_GLYPHS,
  FRAGMENT_GLYPHS,
  SHOP_GLYPHS,
  SKILL_GLYPHS,
} from './icons';
import {
  loadProfile,
  saveProfile,
  loadEquipment,
  saveEquipment,
  loadSkillTree,
  saveSkillTree,
  loadAchievements,
  saveAchievements,
  loadShopUnlocks,
  saveShopUnlocks,
  loadSettings,
  saveSettings,
  exportSaveData,
  downloadSaveData,
  parseSaveData,
  importSaveData,
  loadDevelopModeSlots,
  saveDevelopModeSlots,
  type DevelopModeSaveSlot,
} from './game/storage';
import type {
  PlayerProfile,
  EquipmentLoadout,
  SkillTreeState,
  AchievementState,
  ShopUnlocks,
  PrimalSkillId,
  GameSettings,
} from './game/data/types';
import type { EnemyKind } from './game/world';
import { ALL_ENEMY_KINDS } from './game/enemies/kinds';
import { setScreenShakeEnabled } from './game/screenShake';
import { playMusic, setMusicVolume, stopMusic, isMusicPlaying } from './game/music';
import type { RunContext } from './app/runContext';
import { checkRunAchievements } from './app/achievementChecker';
import { applyEffectToWorld } from './game/effectEngine';
import {
  AVATAR_TALENT_EFFECT_KINDS,
  resetTalentGrowth,
  talentBonuses,
  talentCoreEffects,
  upgradeTalent,
} from './game/talents';
import {
  activeCharacterSlot,
  CLASS_PASSIVE_AVATAR_ADDITIVE_KINDS,
  classPassiveBonuses,
  createCharacterSlot,
  lineageToStartingShape,
  promoteClass,
  resetCharacterClass,
  setActiveCharacterSlot,
} from './game/classes';
import { renderPauseOverlay } from './scenes/pause';
import { closeOverlay } from './scenes/ui';
import { createSkillButton } from './scenes/components/skillButton';

/** O(1) lookup for pool cards by ID. */
const POOL_BY_ID = new Map(POOL.map((c) => [c.id, c]));

async function boot(): Promise<void> {
  // ── Boundary adapters ────────────────────────────────────────────────────
  // The composition root creates concrete adapters wrapping existing modules.
  // Scenes receive the adapter methods they need through their callback interfaces.
  const audioAdapter: IAudioAdapter = {
    playSfx,
    primeSfx,
    isMuted,
    setMuted,
    setVolumes,
    getMasterVolume,
    getSfxVolume,
  };
  const storageAdapter: IStorageAdapter = {
    loadProfile,
    saveProfile,
    loadEquipment,
    saveEquipment,
    loadSkillTree,
    saveSkillTree,
    loadAchievements,
    saveAchievements,
    loadShopUnlocks,
    saveShopUnlocks,
    loadSettings,
    saveSettings,
    exportSaveData,
    downloadSaveData,
    parseSaveData,
    importSaveData,
    loadDevelopModeSlots,
    saveDevelopModeSlots,
  };
  const musicAdapter: IMusicAdapter = {
    playMusic,
    stopMusic,
    isMusicPlaying,
    setMusicVolume,
  };
  // Satisfy unused-variable lint until adapters are threaded further.
  void storageAdapter;
  void musicAdapter;

  const gameEl = document.getElementById('game');
  const hudHp = document.getElementById('hud-hp');
  const hudWave = document.getElementById('hud-wave');
  const hudPts = document.getElementById('hud-pts');
  const hudTokens = document.getElementById('hud-tokens');
  const hudSeed = document.getElementById('hud-seed');
  const hudFragments = document.getElementById('hud-fragments');
  const btnRestart = document.getElementById('btn-restart');
  const btnPause = document.getElementById('btn-pause');
  const btnComments = document.getElementById('btn-comments');
  const btnMute = document.getElementById('btn-mute');
  const btnMenu = document.getElementById('btn-menu');
  const hudSkills = document.getElementById('hud-skills');
  const commentsDialog = document.getElementById('comments-dialog');
  if (!gameEl) throw new Error('#game element missing');

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
  window.addEventListener('resize', fitCanvas);

  let play: PlayScene;
  let currentRun: RunContext | null = null;
  let paused = false;
  let seed = 0;
  let menuRng = createRng(42); void menuRng; // available for future use (was used by legacy skill gacha)
  let runInventory = new CardInventory();
  /** Snapshot of stats at run start, used to compute unlock diff at end. */
  let statsBeforeRun: import('./game/data/types').PlayerStats | null = null;
  /** Pending unlock diff from the latest settled run (set by settleRun, read by endgame). */
  let pendingUnlocks: EndgameUnlocks | null = null;
  /** Pending fragment tally from the latest settled run (set by settleRun, read by endgame). */
  let pendingFragments: import('./game/rewards').FragmentTally | null = null;
  /** Pending boss chest reward shown before the endgame scene. */
  let pendingBossChestReward: import('./game/rewards').BossChestReward | null = null;
  /** Settled run payload consumed by endgame summary UI. */
  let pendingRunResult: RunResult | null = null;
  let developerModeUnlocked = settings.developerMode ?? false;
  /** Resource branch always grants at least +1 fragment when the source gain is positive. */
  const TALENT_FRAGMENT_BONUS_MIN = 1;

  function applyTalentAvatarBonuses(): void {
    const bonuses = talentBonuses(profile.talents);
    for (const kind of AVATAR_TALENT_EFFECT_KINDS) {
      const value = bonuses[kind];
      if (value <= 0) continue;
      applyEffectToWorld(
        { kind, value },
        play.world,
        play.avatarId,
      );
    }
  }

  function applyTalentCoreEffects(): void {
    const effects = talentCoreEffects(profile.talents);
    for (const effect of effects) {
      applyEffectToWorld(
        effect as import('./game/effectEngine').RuntimeEffect,
        play.world,
        play.avatarId,
      );
    }
  }

  function applyClassPassiveBonuses(): void {
    const bonuses = classPassiveBonuses(profile.characters);
    // Additive effects
    for (const kind of CLASS_PASSIVE_AVATAR_ADDITIVE_KINDS) {
      const value = bonuses[kind];
      if (value !== 0) applyEffectToWorld({ kind, value }, play.world, play.avatarId);
    }
    // Multiplicative fire-rate effect
    if (bonuses.periodMul !== 1) {
      applyEffectToWorld({ kind: 'periodMul', value: bonuses.periodMul }, play.world, play.avatarId);
    }
    // Multiplicative movement-speed effect
    if (bonuses.speedMul !== 1) {
      applyEffectToWorld({ kind: 'speedMul', value: bonuses.speedMul }, play.world, play.avatarId);
    }
    // pointRewardMul and fragmentRewardMul are applied in settleRun
  }

  function syncRunControlButtons(): void {
    const runActive = currentRun !== null;
    if (btnRestart instanceof HTMLButtonElement)
      btnRestart.disabled = !runActive;
    if (btnPause instanceof HTMLButtonElement) {
      btnPause.disabled = !runActive;
      btnPause.textContent = paused ? 'resume' : 'pause';
      btnPause.setAttribute('aria-pressed', paused ? 'true' : 'false');
      btnPause.setAttribute('aria-label', paused ? 'Resume run' : 'Pause run');
    }
    if (hudSkills) {
      const toggleBtn = hudSkills.querySelector<HTMLButtonElement>(
        "[data-dev-toggle='pause']",
      );
      if (toggleBtn) toggleBtn.textContent = paused ? 'resume' : 'pause';
    }
  }

  function setPaused(next: boolean): void {
    paused = next;
    syncRunControlButtons();
    if (!paused) {
      closeOverlay();
      return;
    }
    renderPauseOverlay({
      play,
      avatarId: play.avatarId,
      runInventory,
      resolveCardName: (id) => POOL_BY_ID.get(id)?.name ?? id,
      onResume: () => setPaused(false),
      onRestart: () => {
        if (!currentRun) return;
        startRun(currentRun.mode, currentRun.stageIndex, currentRun.developMode);
      },
      onMainMenu: () => showMainMenu(),
    });
  }

  function setTheme(theme: StageTheme): void {
    app.renderer.background.color = theme.background;
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.background = theme.overlayBg;
  }

  // ── Title-card (stage entry / boss spawn) ────────────────────────────────

  /** Show a brief monospace title-card that fades in/out without blocking input. */
  function showTitleCard(lines: string[], durationMs = 1500): void {
    const container = document.createElement('div');
    container.className = 'title-card';
    for (const line of lines) {
      const el = document.createElement('div');
      el.textContent = line;
      container.appendChild(el);
    }
    document.getElementById('game')?.appendChild(container);

    // Fade in (force reflow first to ensure transition triggers)
    container.offsetWidth; // eslint-disable-line @typescript-eslint/no-unused-expressions
    container.style.opacity = '1';

    // Fade out then remove
    setTimeout(() => {
      container.style.opacity = '0';
      setTimeout(() => container.remove(), 300);
    }, durationMs);
  }

  // ── HUD ─────────────────────────────────────────────────────────────────

  const hudSynergy = document.getElementById('hud-synergy');

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

  function renderFragmentHud(
    fragments: import('./game/rewards').FragmentTally,
  ): void {
    if (!hudFragments) return;
    hudFragments.innerHTML = '';
    const rows = FRAGMENT_META.filter((meta) => fragments.detailed[meta.id] > 0).slice(0, 5);
    for (const meta of rows) {
      const chip = document.createElement('div');
      chip.className = 'fragment-chip';
      const glyph = document.createElement('span');
      glyph.className = 'fragment-chip-glyph';
      const svg = FRAGMENT_GLYPHS[meta.id];
      if (svg) setIconHtml(glyph, svg);
      else glyph.textContent = '•';
      chip.appendChild(glyph);
      const val = document.createElement('span');
      val.className = 'fragment-chip-count';
      val.textContent = `×${fragments.detailed[meta.id]}`;
      chip.appendChild(val);
      hudFragments.appendChild(chip);
    }
    hudFragments.hidden = rows.length === 0;
  }

  /** Refresh synergy HUD chips based on current avatar state. */
  function updateSynergyHud(): void {
    if (!hudSynergy || !currentRun) return;
    const avatar = play?.world.get(play.avatarId);
    if (!avatar?.avatar) {
      hudSynergy.innerHTML = '';
      return;
    }
    const synergies = avatar.avatar.synergies;
    if (!synergies || synergies.length === 0) {
      hudSynergy.innerHTML = '';
      return;
    }

    // Ensure chip DOM matches synergy count
    while (hudSynergy.children.length > synergies.length) {
      hudSynergy.lastElementChild?.remove();
    }
    while (hudSynergy.children.length < synergies.length) {
      const chip = document.createElement('div');
      chip.className = 'synergy-chip';
      const icon = document.createElement('span');
      icon.className = 'synergy-icon';
      const label = document.createElement('span');
      label.className = 'synergy-label';
      chip.appendChild(icon);
      chip.appendChild(label);
      hudSynergy.appendChild(chip);
    }

    // Compute velocity for kinetic/stillness check
    const vel = avatar.vel;
    const velMag = vel ? Math.hypot(vel.x, vel.y) : 0;

    for (let i = 0; i < synergies.length; i++) {
      const s = synergies[i]!;
      const chip = hudSynergy.children[i] as HTMLElement;
      const iconEl = chip.querySelector('.synergy-icon') as HTMLElement;
      const labelEl = chip.querySelector('.synergy-label') as HTMLElement;

      // Set glyph
      const glyph = CARD_GLYPHS[s.id];
      if (glyph && iconEl.dataset['sid'] !== s.id) {
        setIconHtml(iconEl, glyph);
        iconEl.dataset['sid'] = s.id;
      }

      // Determine active state and label
      let active = false;
      let text = '';
      switch (s.id) {
        case 'combustion': {
          const count = s.killCounter ?? 0;
          text = `${count}/10`;
          active = count >= 8; // glow when close to triggering
          break;
        }
        case 'desperate':
          active = avatar.avatar!.hp <= 2;
          text = active ? '×2' : '—';
          break;
        case 'kinetic':
          active = velMag > 1 && avatar.avatar!.speedMul > 0;
          text = active ? '+crit' : '—';
          break;
        case 'stillness':
          active = !(velMag > 1 && avatar.avatar!.speedMul > 0);
          text = active ? '+rate' : '—';
          break;
      }

      labelEl.textContent = text;
      chip.classList.toggle('active', active);
    }
  }

  const skillButtonUpdaters = new WeakMap<HTMLButtonElement, () => void>();
  let developerHudPanel: 'settings' | 'skills' = 'settings';

  function renderSkillButtonsInto(container: HTMLElement): void {
    container.innerHTML = '';
    for (let i = 0; i < play.activeSkills.length; i++) {
      const sk = play.activeSkills[i]!;
      const { button, update } = createSkillButton(sk, () =>
        play.activateSkill(i),
      );
      skillButtonUpdaters.set(button, update);
      container.appendChild(button);
    }
  }

  function showSkillButtons(): void {
    if (!hudSkills) return;
    hudSkills.classList.remove('developer-hud');
    renderSkillButtonsInto(hudSkills);
  }

  function addDeveloperControlButton(
    container: HTMLElement,
    label: string,
    onClick: () => void,
    attrs?: Record<string, string>,
  ): void {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'menu-btn';
    btn.textContent = label;
    btn.style.flex = '1 1 0';
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        btn.setAttribute(k, v);
      }
    }
    btn.addEventListener('click', onClick);
    container.appendChild(btn);
  }

  function refreshSkillButtons(): void {
    if (!hudSkills) return;
    for (const btn of hudSkills.querySelectorAll<HTMLButtonElement>(
      '.skill-btn',
    )) {
      skillButtonUpdaters.get(btn)?.();
    }
  }

  function showDeveloperControls(): void {
    if (!hudSkills) return;
    hudSkills.innerHTML = '';
    hudSkills.classList.add('developer-hud');

    const panelToggle = document.createElement('button');
    panelToggle.type = 'button';
    panelToggle.className = 'menu-btn developer-hud-toggle';
    panelToggle.textContent =
      developerHudPanel === 'settings' ? 'skills' : 'develop';
    panelToggle.addEventListener('click', () => {
      developerHudPanel =
        developerHudPanel === 'settings' ? 'skills' : 'settings';
      showDeveloperControls();
    });

    const panel = document.createElement('div');
    panel.className = 'developer-hud-group';

    if (developerHudPanel === 'settings') {
      addDeveloperControlButton(panel, 'player', openDeveloperPlayerMenu);
      addDeveloperControlButton(panel, 'enemy', openDeveloperEnemyMenu);
      addDeveloperControlButton(panel, 'enhance', openDeveloperEnhanceMenu);
      addDeveloperControlButton(panel, 'skills', openDeveloperSkillsMenu);
      addDeveloperControlButton(panel, 'save/load', openDeveloperSaveLoadMenu);
      addDeveloperControlButton(panel, 'start', () => {
        play.spawnDeveloperEnemiesNow();
        setPaused(false);
      });
      addDeveloperControlButton(
        panel,
        paused ? 'resume' : 'pause',
        () => {
          const nextPaused = !paused;
          setPaused(nextPaused);
          const toggleBtn = hudSkills.querySelector<HTMLButtonElement>(
            "[data-dev-toggle='pause']",
          );
          if (toggleBtn)
            toggleBtn.textContent = nextPaused ? 'resume' : 'pause';
        },
        { 'data-dev-toggle': 'pause' },
      );
      addDeveloperControlButton(panel, 'restart', () =>
        startRun('survival', 0, true),
      );
    } else {
      renderSkillButtonsInto(panel);
    }

    hudSkills.appendChild(panelToggle);
    hudSkills.appendChild(panel);
  }

  interface DeveloperFormField {
    name: string;
    label: string;
    type: 'number' | 'text' | 'checkbox';
    value: string;
    min?: number;
    max?: number;
    step?: number;
  }

  /** Parses a numeric form value and falls back when input is NaN/invalid. */
  function parseNumericFormValue(value: string, fallback: number): number {
    const n = Number(value);
    return Number.isNaN(n) ? fallback : n;
  }

  /**
   * Formats a finite numeric value for UI labels while preserving sign.
   * Keeps up to `digits` decimals and strips insignificant trailing zeros.
   */
  function formatNumeric(value: number, digits = 2): string {
    const text = value.toFixed(digits);
    return text.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  }

  const UI_META_SEPARATOR = ' · ';

  /** Returns a short human-readable effect summary line for a skill at `level`. */
  function skillEffectSummary(id: PrimalSkillId, level: number): string {
    switch (id) {
      case 'timeStop':
        return `Enemy speed ×${formatNumeric(timeStopSpeedMul(level))}`;
      case 'shadowClone':
        return `Clone inherit ${Math.round(cloneInheritRatio(level) * 100)}% power`;
      case 'reflectShield':
        return `Reflect ratio ×${formatNumeric(reflectDamageRatio(level))}`;
      case 'barrage':
        return `${barrageProjectiles(level)} shots · ${barrageDamage(level)} dmg each`;
      case 'lifestealPulse':
        return `Radius ${Math.round(lifestealRadius(level))} · ${lifestealDamage(level)} dmg/tick · +${lifestealHeal(level)} hp/tick`;
      case 'axisFreeze':
        return 'Snap to axis and stun enemies';
      case 'overload':
        return 'Triple fire-rate burst and self-damage 1';
    }
  }

  async function openDeveloperForm(
    title: string,
    fields: DeveloperFormField[],
  ): Promise<Record<string, string> | null> {
    return new Promise((resolve) => {
      const wasPaused = paused;
      if (!wasPaused) setPaused(true);

      const dialog = document.createElement('dialog');
      dialog.className = 'developer-dialog';
      dialog.setAttribute('aria-label', title);

      const form = document.createElement('form');
      form.className = 'developer-form';
      form.method = 'dialog';
      dialog.appendChild(form);

      const heading = document.createElement('div');
      heading.className = 'overlay-title';
      heading.textContent = title;
      form.appendChild(heading);

      const body = document.createElement('div');
      body.className = 'pause-panel';
      form.appendChild(body);

      for (const field of fields) {
        const row = document.createElement('label');
        row.className = 'developer-form-row';
        const label = document.createElement('span');
        label.className = 'developer-form-label';
        label.textContent = field.label;

        if (
          field.type === 'number' &&
          field.min !== undefined &&
          field.max !== undefined
        ) {
          // Numeric field with known range — show range slider + number input
          const wrapper = document.createElement('div');
          wrapper.className = 'developer-form-slider-group';

          const range = document.createElement('input');
          range.type = 'range';
          range.className = 'developer-form-range';
          range.min = `${field.min}`;
          range.max = `${field.max}`;
          if (field.step !== undefined) range.step = `${field.step}`;
          range.value = field.value;

          const input = document.createElement('input');
          input.name = field.name;
          input.type = 'number';
          input.className = 'developer-form-input developer-form-input--slim';
          input.min = `${field.min}`;
          input.max = `${field.max}`;
          if (field.step !== undefined) input.step = `${field.step}`;
          input.value = field.value;

          range.addEventListener('input', () => {
            input.value = range.value;
          });
          input.addEventListener('input', () => {
            range.value = input.value;
          });

          wrapper.appendChild(range);
          wrapper.appendChild(input);
          row.appendChild(label);
          row.appendChild(wrapper);
        } else {
          const input = document.createElement('input');
          input.name = field.name;
          input.className = 'developer-form-input';
          input.type = field.type;
          if (field.type === 'checkbox') {
            input.checked =
              field.value === '1' || field.value.toLowerCase() === 'true';
            input.classList.add('developer-form-checkbox');
          } else {
            input.value = field.value;
            if (field.type === 'number') {
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

      const actions = document.createElement('div');
      actions.className = 'draft-actions';
      const saveBtn = document.createElement('button');
      saveBtn.type = 'submit';
      saveBtn.className = 'big-btn';
      saveBtn.textContent = 'save';
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'menu-btn';
      cancelBtn.textContent = 'cancel';
      cancelBtn.addEventListener('click', () => dialog.close('cancel'));
      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      form.appendChild(actions);

      const finalize = (result: Record<string, string> | null): void => {
        dialog.remove();
        if (!wasPaused) setPaused(false);
        resolve(result);
      };

      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const values: Record<string, string> = {};
        for (const field of fields) {
          const input = form.elements.namedItem(field.name);
          if (input instanceof HTMLInputElement) {
            values[field.name] =
              input.type === 'checkbox'
                ? input.checked
                  ? '1'
                  : '0'
                : input.value;
          }
        }
        dialog.close('save');
        finalize(values);
      });
      dialog.addEventListener(
        'close',
        () => {
          if (dialog.returnValue !== 'save') finalize(null);
        },
        { once: true },
      );

      document.body.appendChild(dialog);
      dialog.showModal();
    });
  }

  async function openDeveloperPlayerMenu(): Promise<void> {
    if (!play?.isDeveloperMode()) return;
    const avatar = play.world.get(play.avatarId);
    if (!avatar?.avatar || !avatar.weapon) return;
    const snapshot = play.getDeveloperSnapshot();
    const values = await openDeveloperForm('developer · player', [
      {
        name: 'hp',
        label: 'hp',
        type: 'number',
        value: `${avatar.avatar.hp}`,
        min: 1,
        max: 999,
        step: 1,
      },
      {
        name: 'maxHp',
        label: 'max hp',
        type: 'number',
        value: `${avatar.avatar.maxHp}`,
        min: 1,
        max: 999,
        step: 1,
      },
      {
        name: 'speedMul',
        label: 'move speed',
        type: 'number',
        value: avatar.avatar.speedMul.toFixed(2),
        min: 0.1,
        max: 5,
        step: 0.01,
      },
      {
        name: 'damage',
        label: 'damage',
        type: 'number',
        value: `${avatar.weapon.damage}`,
        min: 1,
        max: 999,
        step: 1,
      },
      {
        name: 'fireInterval',
        label: 'fire interval',
        type: 'number',
        value: avatar.weapon.period.toFixed(2),
        min: 0,
        max: 5,
        step: 0.01,
      },
      {
        name: 'projectileSpeed',
        label: 'projectile speed',
        type: 'number',
        value: `${Math.round(avatar.weapon.projectileSpeed)}`,
        min: 1,
        max: 2000,
        step: 1,
      },
      {
        name: 'projectiles',
        label: 'projectiles',
        type: 'number',
        value: `${avatar.weapon.projectiles}`,
        min: 1,
        max: 20,
        step: 1,
      },
      {
        name: 'pierce',
        label: 'pierce',
        type: 'number',
        value: `${avatar.weapon.pierce}`,
        min: 0,
        max: 50,
        step: 1,
      },
      {
        name: 'crit',
        label: 'crit %',
        type: 'number',
        value: `${Math.round(avatar.weapon.crit * 100)}`,
        min: 0,
        max: 100,
        step: 1,
      },
      {
        name: 'invincible',
        label: 'invincible',
        type: 'checkbox',
        value: snapshot.invincible ? '1' : '0',
      },
      {
        name: 'showEnemyHp',
        label: 'show enemy hp',
        type: 'checkbox',
        value: snapshot.showEnemyHp ? '1' : '0',
      },
    ]);
    if (!values) return;

    play.setDeveloperPlayerStats({
      hp: parseNumericFormValue(values.hp, avatar.avatar.hp),
      maxHp: parseNumericFormValue(values.maxHp, avatar.avatar.maxHp),
      speedMul: parseNumericFormValue(values.speedMul, avatar.avatar.speedMul),
      damage: parseNumericFormValue(values.damage, avatar.weapon.damage),
      fireInterval: parseNumericFormValue(
        values.fireInterval,
        avatar.weapon.period,
      ),
      projectileSpeed: parseNumericFormValue(
        values.projectileSpeed,
        avatar.weapon.projectileSpeed,
      ),
      projectiles: parseNumericFormValue(
        values.projectiles,
        avatar.weapon.projectiles,
      ),
      pierce: parseNumericFormValue(values.pierce, avatar.weapon.pierce),
      crit:
        parseNumericFormValue(
          values.crit,
          Math.round(avatar.weapon.crit * 100),
        ) / 100,
    });
    play.setDeveloperInvincible(values.invincible === '1');
    play.setDeveloperShowEnemyHp(values.showEnemyHp === '1');
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

  interface DeveloperEnhanceEntry {
    cardId: Card['id'];
    level: number;
  }

  interface DeveloperSkillEntry {
    id: PrimalSkillId;
    level: number;
    duration: number;
    cooldown: number;
  }

  interface DeveloperPlayerConfig {
    hp: number;
    maxHp: number;
    speedMul: number;
    damage: number;
    fireInterval: number;
    projectileSpeed: number;
    projectiles: number;
    pierce: number;
    crit: number;
    invincible: boolean;
    showEnemyHp: boolean;
  }

  interface DevelopModeConfig {
    version: number;
    player: DeveloperPlayerConfig;
    enemyInterval: number;
    enemies: DeveloperEnemyEntry[];
    enhances: DeveloperEnhanceEntry[];
    skills: DeveloperSkillEntry[];
  }

  /** Persistent enemy list for develop mode (reset on run restart). */
  let developerEnemyEntries: DeveloperEnemyEntry[] = [];
  /** Persistent enhance list for develop mode (reset on run restart). */
  let developerEnhanceEntries: DeveloperEnhanceEntry[] = [];
  /** Persistent skill list for develop mode (reset on run restart). */
  let developerSkillEntries: DeveloperSkillEntry[] = [];
  /** Pending config loaded from slot, applied when the next develop run starts. */
  let pendingDevelopModeConfig: DevelopModeConfig | null = null;

  /** Apply current enemy entries to the PlayScene. */
  function applyDeveloperEnemyEntries(): void {
    if (!play?.isDeveloperMode()) return;
    for (const k of ALL_ENEMY_KINDS) play.setDeveloperEnemySpawn(k, false, 0);
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

  function applyDeveloperEnhanceEntries(): void {
    if (!play?.isDeveloperMode()) return;
    for (const entry of developerEnhanceEntries) {
      const card = POOL_BY_ID.get(entry.cardId);
      if (!card) continue;
      applyDeveloperEnhance(card, entry.level);
    }
  }

  function applyDeveloperSkillEntries(): void {
    if (!play?.isDeveloperMode()) return;
    const skillIds = Object.keys(PRIMAL_SKILLS) as PrimalSkillId[];
    for (const id of skillIds) {
      play.setDeveloperSkillConfig(id, {
        enabled: false,
        level: 0,
        duration: 0,
        cooldown: 0,
      });
    }
    for (const entry of developerSkillEntries) {
      play.setDeveloperSkillConfig(entry.id, {
        enabled: true,
        level: Math.max(0, Math.floor(entry.level)),
        duration: Math.max(0, entry.duration),
        cooldown: Math.max(0, entry.cooldown),
      });
    }
  }

  async function openDeveloperEnemyMenu(): Promise<void> {
    if (!play?.isDeveloperMode()) return;

    return new Promise<void>((resolve) => {
      const wasPaused = paused;
      if (!wasPaused) setPaused(true);
      let finalized = false;

      const dialog = document.createElement('dialog');
      dialog.className = 'developer-dialog';
      dialog.setAttribute('aria-label', 'developer · enemy');

      const finalize = (): void => {
        if (finalized) return;
        finalized = true;
        dialog.remove();
        if (!wasPaused) setPaused(false);
        resolve();
      };

      const kinds = ALL_ENEMY_KINDS;

      function renderList(): void {
        dialog.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'developer-form';

        const heading = document.createElement('div');
        heading.className = 'overlay-title';
        heading.textContent = 'developer · enemy';
        container.appendChild(heading);

        // Spawn interval control
        const snapshot = play.getDeveloperSnapshot();
        const intervalRow = document.createElement('div');
        intervalRow.className = 'developer-form-row';
        const intervalLabel = document.createElement('span');
        intervalLabel.className = 'developer-form-label';
        intervalLabel.textContent = 'interval';
        const intervalGroup = document.createElement('div');
        intervalGroup.className = 'developer-form-slider-group';
        const intervalRange = document.createElement('input');
        intervalRange.type = 'range';
        intervalRange.className = 'developer-form-range';
        intervalRange.min = '0.1';
        intervalRange.max = '999';
        intervalRange.step = '0.1';
        intervalRange.value = snapshot.enemy.interval.toFixed(1);
        const intervalInput = document.createElement('input');
        intervalInput.type = 'number';
        intervalInput.className =
          'developer-form-input developer-form-input--slim';
        intervalInput.min = '0.1';
        intervalInput.max = '999';
        intervalInput.step = '0.1';
        intervalInput.value = snapshot.enemy.interval.toFixed(1);
        intervalRange.addEventListener('input', () => {
          intervalInput.value = intervalRange.value;
          play.setDeveloperEnemyInterval(
            parseNumericFormValue(intervalRange.value, 2),
          );
        });
        intervalInput.addEventListener('input', () => {
          intervalRange.value = intervalInput.value;
          play.setDeveloperEnemyInterval(
            parseNumericFormValue(intervalInput.value, 2),
          );
        });
        intervalGroup.appendChild(intervalRange);
        intervalGroup.appendChild(intervalInput);
        intervalRow.appendChild(intervalLabel);
        intervalRow.appendChild(intervalGroup);
        container.appendChild(intervalRow);

        // Enemy cards
        const list = document.createElement('div');
        list.className = 'developer-enemy-list';
        for (let i = 0; i < developerEnemyEntries.length; i++) {
          const entry = developerEnemyEntries[i]!;
          const card = document.createElement('div');
          card.className = 'developer-enemy-card';

          const info = document.createElement('div');
          info.className = 'developer-enemy-card-info';
          const kindLabel = document.createElement('div');
          kindLabel.className = 'developer-enemy-card-kind';
          kindLabel.textContent = entry.kind;
          const statsLabel = document.createElement('div');
          statsLabel.className = 'developer-enemy-card-stats';
          statsLabel.textContent = `×${entry.count}  hp:${entry.hp}  atk:${entry.attack}  spd:${entry.speed.toFixed(1)}`;
          info.appendChild(kindLabel);
          info.appendChild(statsLabel);

          const actions = document.createElement('div');
          actions.className = 'developer-enemy-card-actions';
          const editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.className = 'secondary-btn';
          editBtn.textContent = 'edit';
          editBtn.style.cssText =
            'flex:0 0 auto;padding:4px 10px;min-height:28px;font-size:11px';
          const idx = i;
          editBtn.addEventListener('click', () => renderEdit(idx));
          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'secondary-btn';
          delBtn.textContent = 'delete';
          delBtn.style.cssText =
            'flex:0 0 auto;padding:4px 10px;min-height:28px;font-size:11px;color:var(--accent)';
          delBtn.addEventListener('click', () => {
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
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'menu-btn';
        addBtn.textContent = '+ add enemy';
        addBtn.addEventListener('click', () => renderAdd());
        container.appendChild(addBtn);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'menu-btn';
        closeBtn.textContent = 'close';
        closeBtn.addEventListener('click', () => {
          dialog.close();
        });
        container.appendChild(closeBtn);

        dialog.appendChild(container);
      }

      function renderAdd(): void {
        dialog.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'developer-form';

        const heading = document.createElement('div');
        heading.className = 'overlay-title';
        heading.textContent = 'add enemy';
        container.appendChild(heading);

        // Kind selector
        const kindRow = document.createElement('div');
        kindRow.className = 'developer-form-row';
        const kindLabel = document.createElement('span');
        kindLabel.className = 'developer-form-label';
        kindLabel.textContent = 'kind';
        const kindSelect = document.createElement('select');
        kindSelect.className = 'developer-form-input';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'select...';
        placeholder.disabled = true;
        placeholder.selected = true;
        kindSelect.appendChild(placeholder);
        for (const k of kinds) {
          const opt = document.createElement('option');
          opt.value = k;
          opt.textContent = k;
          kindSelect.appendChild(opt);
        }
        kindRow.appendChild(kindLabel);
        kindRow.appendChild(kindSelect);
        container.appendChild(kindRow);

        // Fields container (shown after kind selection)
        const fieldsContainer = document.createElement('div');
        fieldsContainer.className = 'pause-panel';
        fieldsContainer.hidden = true;
        container.appendChild(fieldsContainer);

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'big-btn';
        saveBtn.textContent = 'save';
        saveBtn.hidden = true;
        container.appendChild(saveBtn);

        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'menu-btn';
        backBtn.textContent = 'back';
        backBtn.addEventListener('click', () => renderList());
        container.appendChild(backBtn);

        let currentInputs: {
          count: HTMLInputElement;
          hp: HTMLInputElement;
          attack: HTMLInputElement;
          speed: HTMLInputElement;
          attackFrequency: HTMLInputElement;
        } | null = null;

        kindSelect.addEventListener('change', () => {
          const kind = kindSelect.value as EnemyKind;
          if (!kinds.includes(kind)) return;
          const snapshot = play.getDeveloperSnapshot();
          const baseStats = snapshot.enemy.stats[kind];
          fieldsContainer.innerHTML = '';
          fieldsContainer.hidden = false;
          saveBtn.hidden = false;

          const inputs = buildEnemyStatsFields(fieldsContainer, {
            count: 1,
            hp: baseStats.hp,
            attack: baseStats.attack,
            speed: baseStats.speed,
            attackFrequency: baseStats.attackFrequency,
          });
          currentInputs = inputs;
        });

        saveBtn.addEventListener('click', () => {
          const kind = kindSelect.value as EnemyKind;
          if (!kinds.includes(kind) || !currentInputs) return;
          developerEnemyEntries.push({
            kind,
            count: Math.max(
              1,
              Math.round(parseNumericFormValue(currentInputs.count.value, 1)),
            ),
            hp: Math.max(
              1,
              Math.round(parseNumericFormValue(currentInputs.hp.value, 1)),
            ),
            attack: Math.max(
              0,
              parseNumericFormValue(currentInputs.attack.value, 1),
            ),
            speed: Math.max(
              0,
              parseNumericFormValue(currentInputs.speed.value, 1),
            ),
            attackFrequency: Math.max(
              0,
              parseNumericFormValue(currentInputs.attackFrequency.value, 1),
            ),
          });
          applyDeveloperEnemyEntries();
          renderList();
        });

        dialog.appendChild(container);
      }

      function renderEdit(index: number): void {
        const entry = developerEnemyEntries[index];
        if (!entry) {
          renderList();
          return;
        }

        dialog.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'developer-form';

        const heading = document.createElement('div');
        heading.className = 'overlay-title';
        heading.textContent = `edit · ${entry.kind}`;
        container.appendChild(heading);

        const fieldsContainer = document.createElement('div');
        fieldsContainer.className = 'pause-panel';
        container.appendChild(fieldsContainer);

        const inputs = buildEnemyStatsFields(fieldsContainer, entry);

        const actions = document.createElement('div');
        actions.className = 'draft-actions';
        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'big-btn';
        saveBtn.textContent = 'save';
        saveBtn.addEventListener('click', () => {
          entry.count = Math.max(
            1,
            Math.round(parseNumericFormValue(inputs.count.value, entry.count)),
          );
          entry.hp = Math.max(
            1,
            Math.round(parseNumericFormValue(inputs.hp.value, entry.hp)),
          );
          entry.attack = Math.max(
            0,
            parseNumericFormValue(inputs.attack.value, entry.attack),
          );
          entry.speed = Math.max(
            0,
            parseNumericFormValue(inputs.speed.value, entry.speed),
          );
          entry.attackFrequency = Math.max(
            0,
            parseNumericFormValue(
              inputs.attackFrequency.value,
              entry.attackFrequency,
            ),
          );
          applyDeveloperEnemyEntries();
          renderList();
        });
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'menu-btn';
        cancelBtn.textContent = 'back';
        cancelBtn.addEventListener('click', () => renderList());
        actions.appendChild(saveBtn);
        actions.appendChild(cancelBtn);
        container.appendChild(actions);

        dialog.appendChild(container);
      }

      function buildEnemyStatsFields(
        parent: HTMLElement,
        defaults: {
          count: number;
          hp: number;
          attack: number;
          speed: number;
          attackFrequency: number;
        },
      ): {
        count: HTMLInputElement;
        hp: HTMLInputElement;
        attack: HTMLInputElement;
        speed: HTMLInputElement;
        attackFrequency: HTMLInputElement;
      } {
        const fieldDefs: {
          name: string;
          label: string;
          value: number;
          min: number;
          max: number;
          step: number;
        }[] = [
          {
            name: 'count',
            label: 'count',
            value: defaults.count,
            min: 1,
            max: 50,
            step: 1,
          },
          {
            name: 'hp',
            label: 'hp',
            value: defaults.hp,
            min: 1,
            max: 9999,
            step: 1,
          },
          {
            name: 'attack',
            label: 'attack',
            value: defaults.attack,
            min: 0,
            max: 100,
            step: 0.1,
          },
          {
            name: 'speed',
            label: 'speed',
            value: defaults.speed,
            min: 0,
            max: 500,
            step: 0.1,
          },
          {
            name: 'attackFrequency',
            label: 'atk freq',
            value: defaults.attackFrequency,
            min: 0,
            max: 10,
            step: 0.1,
          },
        ];
        const inputs: Record<string, HTMLInputElement> = {};
        for (const fd of fieldDefs) {
          const row = document.createElement('label');
          row.className = 'developer-form-row';
          const label = document.createElement('span');
          label.className = 'developer-form-label';
          label.textContent = fd.label;

          const wrapper = document.createElement('div');
          wrapper.className = 'developer-form-slider-group';
          const range = document.createElement('input');
          range.type = 'range';
          range.className = 'developer-form-range';
          range.min = `${fd.min}`;
          range.max = `${fd.max}`;
          range.step = `${fd.step}`;
          range.value = `${fd.value}`;
          const input = document.createElement('input');
          input.type = 'number';
          input.className = 'developer-form-input developer-form-input--slim';
          input.min = `${fd.min}`;
          input.max = `${fd.max}`;
          input.step = `${fd.step}`;
          input.value = `${fd.value}`;
          range.addEventListener('input', () => {
            input.value = range.value;
          });
          input.addEventListener('input', () => {
            range.value = input.value;
          });
          wrapper.appendChild(range);
          wrapper.appendChild(input);

          row.appendChild(label);
          row.appendChild(wrapper);
          parent.appendChild(row);
          inputs[fd.name] = input;
        }
        return inputs as {
          count: HTMLInputElement;
          hp: HTMLInputElement;
          attack: HTMLInputElement;
          speed: HTMLInputElement;
          attackFrequency: HTMLInputElement;
        };
      }

      renderList();
      document.body.appendChild(dialog);
      dialog.showModal();

      dialog.addEventListener('close', () => finalize(), { once: true });
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
    return new Promise<void>((resolve) => {
      const wasPaused = paused;
      if (!wasPaused) setPaused(true);

      const dialog = document.createElement('dialog');
      dialog.className = 'developer-dialog';
      dialog.setAttribute('aria-label', 'developer · enhance');

      const finalize = (): void => {
        dialog.remove();
        if (!wasPaused) setPaused(false);
        resolve();
      };

      function buildLevelField(
        parent: HTMLElement,
        defaultLevel: number,
      ): HTMLInputElement {
        const row = document.createElement('label');
        row.className = 'developer-form-row';
        const label = document.createElement('span');
        label.className = 'developer-form-label';
        label.textContent = 'target level';

        const wrapper = document.createElement('div');
        wrapper.className = 'developer-form-slider-group';
        const range = document.createElement('input');
        range.type = 'range';
        range.className = 'developer-form-range';
        range.min = '1';
        range.max = '5';
        range.step = '1';
        range.value = `${Math.max(1, Math.min(5, Math.round(defaultLevel)))}`;
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'developer-form-input developer-form-input--slim';
        input.min = '1';
        input.max = `${MAX_CARD_LEVEL}`;
        input.step = '1';
        input.value = range.value;
        range.max = `${MAX_CARD_LEVEL}`;
        range.addEventListener('input', () => {
          input.value = range.value;
          input.dispatchEvent(new Event('change'));
        });
        input.addEventListener('input', () => {
          const n = Math.max(
            1,
            Math.min(
              MAX_CARD_LEVEL,
              Math.round(parseNumericFormValue(input.value, 1)),
            ),
          );
          range.value = `${n}`;
        });
        input.addEventListener('change', () => {
          const n = Math.max(
            1,
            Math.min(
              MAX_CARD_LEVEL,
              Math.round(parseNumericFormValue(input.value, 1)),
            ),
          );
          input.value = `${n}`;
          range.value = `${n}`;
        });
        wrapper.appendChild(range);
        wrapper.appendChild(input);
        row.appendChild(label);
        row.appendChild(wrapper);
        parent.appendChild(row);
        return input;
      }

      function renderList(): void {
        dialog.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'developer-form';

        const heading = document.createElement('div');
        heading.className = 'overlay-title';
        heading.textContent = 'developer · enhance';
        container.appendChild(heading);

        const list = document.createElement('div');
        list.className = 'developer-enemy-list';
        for (let i = 0; i < developerEnhanceEntries.length; i++) {
          const entry = developerEnhanceEntries[i]!;
          const card = POOL_BY_ID.get(entry.cardId);
          const cardLabel = card?.name ?? entry.cardId;
          const cardStats = `id:${entry.cardId}  target Lv${Math.max(1, Math.floor(entry.level))}`;

          const cardEl = document.createElement('div');
          cardEl.className = 'developer-enemy-card';

          const info = document.createElement('div');
          info.className = 'developer-enemy-card-info';
          const kindLabel = document.createElement('div');
          kindLabel.className = 'developer-enemy-card-kind';
          kindLabel.textContent = cardLabel;
          const statsLabel = document.createElement('div');
          statsLabel.className = 'developer-enemy-card-stats';
          statsLabel.textContent = cardStats;
          info.appendChild(kindLabel);
          info.appendChild(statsLabel);

          const actions = document.createElement('div');
          actions.className = 'developer-enemy-card-actions';
          const editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.className = 'secondary-btn';
          editBtn.textContent = 'edit';
          editBtn.style.cssText =
            'flex:0 0 auto;padding:4px 10px;min-height:28px;font-size:11px';
          const idx = i;
          editBtn.addEventListener('click', () => renderEdit(idx));
          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'secondary-btn';
          delBtn.textContent = 'delete';
          delBtn.style.cssText =
            'flex:0 0 auto;padding:4px 10px;min-height:28px;font-size:11px;color:var(--accent)';
          delBtn.addEventListener('click', () => {
            developerEnhanceEntries.splice(idx, 1);
            renderList();
          });
          actions.appendChild(editBtn);
          actions.appendChild(delBtn);

          cardEl.appendChild(info);
          cardEl.appendChild(actions);
          list.appendChild(cardEl);
        }
        container.appendChild(list);

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'menu-btn';
        addBtn.textContent = '+ add enhance';
        addBtn.addEventListener('click', () => renderAdd());
        container.appendChild(addBtn);

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'menu-btn';
        closeBtn.textContent = 'close';
        closeBtn.addEventListener('click', () => {
          dialog.close();
          finalize();
        });
        container.appendChild(closeBtn);

        dialog.appendChild(container);
      }

      function renderAdd(): void {
        dialog.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'developer-form';

        const heading = document.createElement('div');
        heading.className = 'overlay-title';
        heading.textContent = 'add enhance';
        container.appendChild(heading);

        const cardRow = document.createElement('div');
        cardRow.className = 'developer-form-row';
        const cardLabel = document.createElement('span');
        cardLabel.className = 'developer-form-label';
        cardLabel.textContent = 'card';
        const cardSelect = document.createElement('select');
        cardSelect.className = 'developer-form-input';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'select...';
        placeholder.disabled = true;
        placeholder.selected = true;
        cardSelect.appendChild(placeholder);
        for (const card of POOL) {
          const opt = document.createElement('option');
          opt.value = card.id;
          opt.textContent = `${card.name} (${card.id})`;
          cardSelect.appendChild(opt);
        }
        cardRow.appendChild(cardLabel);
        cardRow.appendChild(cardSelect);
        container.appendChild(cardRow);

        const fieldsContainer = document.createElement('div');
        fieldsContainer.className = 'pause-panel';
        fieldsContainer.hidden = true;
        container.appendChild(fieldsContainer);

        const previewCard = document.createElement('div');
        previewCard.className = 'developer-enhance-preview';
        previewCard.hidden = true;
        const previewGlyph = document.createElement('span');
        previewGlyph.className = 'developer-enhance-preview-glyph';
        previewGlyph.setAttribute('aria-hidden', 'true');
        const previewBody = document.createElement('div');
        previewBody.className = 'developer-enhance-preview-body';
        const previewName = document.createElement('div');
        previewName.className = 'developer-enhance-preview-name';
        const previewDesc = document.createElement('div');
        previewDesc.className = 'developer-enhance-preview-desc';
        const previewScaled = document.createElement('div');
        previewScaled.className = 'developer-enhance-preview-scaled';
        previewBody.appendChild(previewName);
        previewBody.appendChild(previewDesc);
        previewBody.appendChild(previewScaled);
        previewCard.appendChild(previewGlyph);
        previewCard.appendChild(previewBody);
        container.appendChild(previewCard);

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'big-btn';
        saveBtn.textContent = 'save';
        saveBtn.hidden = true;
        container.appendChild(saveBtn);

        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'menu-btn';
        backBtn.textContent = 'back';
        backBtn.addEventListener('click', () => renderList());
        container.appendChild(backBtn);

        let levelInput: HTMLInputElement | null = null;

        const updateEnhancePreview = (card: Card, level: number): void => {
          previewCard.hidden = false;
          previewGlyph.innerHTML = '';
          const svgGlyph = CARD_GLYPHS[card.id];
          if (svgGlyph) setIconHtml(previewGlyph, svgGlyph);
          else previewGlyph.textContent = card.glyph;
          const safeLevel = Math.max(
            1,
            Math.min(MAX_CARD_LEVEL, Math.floor(level)),
          );
          previewName.textContent = card.name;
          previewDesc.textContent = card.text;
          previewScaled.textContent = `Lv${safeLevel}: ${projectedCardText(card, safeLevel)}`;
        };

        cardSelect.addEventListener('change', () => {
          const cardId = cardSelect.value as Card['id'];
          if (!cardId || !POOL_BY_ID.has(cardId)) return;
          const card = POOL_BY_ID.get(cardId);
          if (!card) return;
          const existing = developerEnhanceEntries.find(
            (entry) => entry.cardId === cardId,
          );
          fieldsContainer.innerHTML = '';
          fieldsContainer.hidden = false;
          saveBtn.hidden = false;
          levelInput = buildLevelField(fieldsContainer, existing?.level ?? 1);
          const activeLevelInput = levelInput;
          updateEnhancePreview(
            card,
            parseNumericFormValue(activeLevelInput.value, 1),
          );
          activeLevelInput.addEventListener('change', () => {
            updateEnhancePreview(
              card,
              parseNumericFormValue(activeLevelInput.value, 1),
            );
          });
        });

        saveBtn.addEventListener('click', () => {
          const cardId = cardSelect.value as Card['id'];
          if (!cardId || !POOL_BY_ID.has(cardId) || !levelInput) return;
          const level = Math.max(
            1,
            Math.floor(parseNumericFormValue(levelInput.value, 1)),
          );
          const existingIndex = developerEnhanceEntries.findIndex(
            (entry) => entry.cardId === cardId,
          );
          if (existingIndex >= 0) {
            developerEnhanceEntries[existingIndex]!.level = level;
          } else {
            developerEnhanceEntries.push({ cardId, level });
          }
          applyDeveloperEnhanceEntries();
          renderList();
        });

        dialog.appendChild(container);
      }

      function renderEdit(index: number): void {
        const entry = developerEnhanceEntries[index];
        if (!entry) {
          renderList();
          return;
        }
        const card = POOL_BY_ID.get(entry.cardId);
        dialog.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'developer-form';

        const heading = document.createElement('div');
        heading.className = 'overlay-title';
        heading.textContent = `edit · ${card?.name ?? entry.cardId}`;
        container.appendChild(heading);

        const fieldsContainer = document.createElement('div');
        fieldsContainer.className = 'pause-panel';
        container.appendChild(fieldsContainer);
        const levelInput = buildLevelField(fieldsContainer, entry.level);

        if (card) {
          const previewCard = document.createElement('div');
          previewCard.className = 'developer-enhance-preview';
          const previewGlyph = document.createElement('span');
          previewGlyph.className = 'developer-enhance-preview-glyph';
          previewGlyph.setAttribute('aria-hidden', 'true');
          const svgGlyph = CARD_GLYPHS[card.id];
          if (svgGlyph) setIconHtml(previewGlyph, svgGlyph);
          else previewGlyph.textContent = card.glyph;

          const previewBody = document.createElement('div');
          previewBody.className = 'developer-enhance-preview-body';
          const previewName = document.createElement('div');
          previewName.className = 'developer-enhance-preview-name';
          previewName.textContent = card.name;
          const previewDesc = document.createElement('div');
          previewDesc.className = 'developer-enhance-preview-desc';
          previewDesc.textContent = card.text;
          const previewScaled = document.createElement('div');
          previewScaled.className = 'developer-enhance-preview-scaled';
          const syncScaled = (): void => {
            const level = Math.max(
              1,
              Math.min(
                MAX_CARD_LEVEL,
                Math.floor(
                  parseNumericFormValue(levelInput.value, entry.level),
                ),
              ),
            );
            previewScaled.textContent = `Lv${level}: ${projectedCardText(card, level)}`;
          };
          syncScaled();
          levelInput.addEventListener('change', syncScaled);

          previewBody.appendChild(previewName);
          previewBody.appendChild(previewDesc);
          previewBody.appendChild(previewScaled);
          previewCard.appendChild(previewGlyph);
          previewCard.appendChild(previewBody);
          container.appendChild(previewCard);
        }

        const actions = document.createElement('div');
        actions.className = 'draft-actions';
        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'big-btn';
        saveBtn.textContent = 'save';
        saveBtn.addEventListener('click', () => {
          entry.level = Math.max(
            1,
            Math.floor(parseNumericFormValue(levelInput.value, entry.level)),
          );
          applyDeveloperEnhanceEntries();
          renderList();
        });
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'menu-btn';
        cancelBtn.textContent = 'back';
        cancelBtn.addEventListener('click', () => renderList());
        actions.appendChild(saveBtn);
        actions.appendChild(cancelBtn);
        container.appendChild(actions);

        dialog.appendChild(container);
      }

      renderList();
      document.body.appendChild(dialog);
      dialog.showModal();

      dialog.addEventListener('close', () => finalize(), { once: true });
    });
  }

  async function openDeveloperSkillsMenu(): Promise<void> {
    if (!play?.isDeveloperMode()) return;
    const snapshot = play.getDeveloperSnapshot();
    const skillIds = Object.keys(PRIMAL_SKILLS) as PrimalSkillId[];
    if (developerSkillEntries.length === 0) {
      developerSkillEntries = skillIds.map((id) => ({
        id,
        level: snapshot.skills[id].level,
        duration: snapshot.skills[id].duration,
        cooldown: snapshot.skills[id].cooldown,
      }));
    } else {
      for (const id of skillIds) {
        if (developerSkillEntries.some((entry) => entry.id === id)) continue;
        developerSkillEntries.push({
          id,
          level: snapshot.skills[id].level,
          duration: snapshot.skills[id].duration,
          cooldown: snapshot.skills[id].cooldown,
        });
      }
    }

    return new Promise<void>((resolve) => {
      const wasPaused = paused;
      if (!wasPaused) setPaused(true);

      const dialog = document.createElement('dialog');
      dialog.className = 'developer-dialog';
      dialog.setAttribute('aria-label', 'developer · skills');

      const finalize = (): void => {
        dialog.remove();
        if (!wasPaused) setPaused(false);
        resolve();
      };

      function buildSkillFields(
        parent: HTMLElement,
        defaults: { level: number; duration: number; cooldown: number },
      ): {
        level: HTMLInputElement;
        duration: HTMLInputElement;
        cooldown: HTMLInputElement;
      } {
        const fieldDefs: {
          name: 'level' | 'duration' | 'cooldown';
          label: string;
          value: number;
          min: number;
          max: number;
          step: number;
        }[] = [
          {
            name: 'level',
            label: 'level',
            value: defaults.level,
            min: 0,
            max: 10,
            step: 1,
          },
          {
            name: 'duration',
            label: 'duration',
            value: defaults.duration,
            min: 0,
            max: 30,
            step: 0.1,
          },
          {
            name: 'cooldown',
            label: 'cooldown',
            value: defaults.cooldown,
            min: 0,
            max: 60,
            step: 0.1,
          },
        ];
        const inputs: Record<string, HTMLInputElement> = {};
        for (const fd of fieldDefs) {
          const row = document.createElement('label');
          row.className = 'developer-form-row';
          const label = document.createElement('span');
          label.className = 'developer-form-label';
          label.textContent = fd.label;

          const wrapper = document.createElement('div');
          wrapper.className = 'developer-form-slider-group';
          const range = document.createElement('input');
          range.type = 'range';
          range.className = 'developer-form-range';
          range.min = `${fd.min}`;
          range.max = `${fd.max}`;
          range.step = `${fd.step}`;
          range.value = `${fd.value}`;
          const input = document.createElement('input');
          input.type = 'number';
          input.className = 'developer-form-input developer-form-input--slim';
          input.min = `${fd.min}`;
          input.max = `${fd.max}`;
          input.step = `${fd.step}`;
          input.value = `${fd.value}`;
          range.addEventListener('input', () => {
            input.value = range.value;
          });
          input.addEventListener('input', () => {
            range.value = input.value;
          });
          wrapper.appendChild(range);
          wrapper.appendChild(input);

          row.appendChild(label);
          row.appendChild(wrapper);
          parent.appendChild(row);
          inputs[fd.name] = input;
        }
        return inputs as {
          level: HTMLInputElement;
          duration: HTMLInputElement;
          cooldown: HTMLInputElement;
        };
      }

      function renderList(): void {
        dialog.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'developer-form';

        const heading = document.createElement('div');
        heading.className = 'overlay-title';
        heading.textContent = 'developer · skills';
        container.appendChild(heading);

        const list = document.createElement('div');
        list.className = 'developer-enemy-list';
        for (let i = 0; i < developerSkillEntries.length; i++) {
          const entry = developerSkillEntries[i]!;
          const cardEl = document.createElement('div');
          cardEl.className = 'developer-enemy-card';

          const info = document.createElement('div');
          info.className = 'developer-enemy-card-info';
          const kindLabel = document.createElement('div');
          kindLabel.className = 'developer-enemy-card-kind';
          kindLabel.textContent = entry.id;
          const statsLabel = document.createElement('div');
          statsLabel.className = 'developer-enemy-card-stats';
          statsLabel.textContent = `Lv${Math.max(0, Math.floor(entry.level))}  dur:${entry.duration.toFixed(1)}  cd:${entry.cooldown.toFixed(1)}`;
          info.appendChild(kindLabel);
          info.appendChild(statsLabel);

          const actions = document.createElement('div');
          actions.className = 'developer-enemy-card-actions';
          const editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.className = 'secondary-btn';
          editBtn.textContent = 'edit';
          editBtn.style.cssText =
            'flex:0 0 auto;padding:4px 10px;min-height:28px;font-size:11px';
          const idx = i;
          editBtn.addEventListener('click', () => renderEdit(idx));
          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'secondary-btn';
          delBtn.textContent = 'delete';
          delBtn.style.cssText =
            'flex:0 0 auto;padding:4px 10px;min-height:28px;font-size:11px;color:var(--accent)';
          delBtn.addEventListener('click', () => {
            developerSkillEntries.splice(idx, 1);
            applyDeveloperSkillEntries();
            renderList();
          });
          actions.appendChild(editBtn);
          actions.appendChild(delBtn);

          cardEl.appendChild(info);
          cardEl.appendChild(actions);
          list.appendChild(cardEl);
        }
        container.appendChild(list);

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'menu-btn';
        addBtn.textContent = '+ add skill';
        addBtn.addEventListener('click', () => renderAdd());
        container.appendChild(addBtn);

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'menu-btn';
        closeBtn.textContent = 'close';
        closeBtn.addEventListener('click', () => {
          dialog.close();
          finalize();
        });
        container.appendChild(closeBtn);

        dialog.appendChild(container);
      }

      function renderAdd(): void {
        dialog.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'developer-form';

        const heading = document.createElement('div');
        heading.className = 'overlay-title';
        heading.textContent = 'add skill';
        container.appendChild(heading);

        const idRow = document.createElement('div');
        idRow.className = 'developer-form-row';
        const idLabel = document.createElement('span');
        idLabel.className = 'developer-form-label';
        idLabel.textContent = 'skill';
        const idSelect = document.createElement('select');
        idSelect.className = 'developer-form-input';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'select...';
        placeholder.disabled = true;
        placeholder.selected = true;
        idSelect.appendChild(placeholder);
        for (const id of skillIds) {
          const opt = document.createElement('option');
          opt.value = id;
          opt.textContent = id;
          idSelect.appendChild(opt);
        }
        idRow.appendChild(idLabel);
        idRow.appendChild(idSelect);
        container.appendChild(idRow);

        const fieldsContainer = document.createElement('div');
        fieldsContainer.className = 'pause-panel';
        fieldsContainer.hidden = true;
        container.appendChild(fieldsContainer);

        const previewCard = document.createElement('div');
        previewCard.className = 'developer-enhance-preview';
        previewCard.hidden = true;
        const previewGlyph = document.createElement('span');
        previewGlyph.className = 'developer-enhance-preview-glyph';
        previewGlyph.setAttribute('aria-hidden', 'true');
        const previewBody = document.createElement('div');
        previewBody.className = 'developer-enhance-preview-body';
        const previewName = document.createElement('div');
        previewName.className = 'developer-enhance-preview-name';
        const previewDesc = document.createElement('div');
        previewDesc.className = 'developer-enhance-preview-desc';
        const previewScaled = document.createElement('div');
        previewScaled.className = 'developer-enhance-preview-scaled';
        const previewEffect = document.createElement('div');
        previewEffect.className = 'developer-enhance-preview-scaled';
        previewBody.appendChild(previewName);
        previewBody.appendChild(previewDesc);
        previewBody.appendChild(previewScaled);
        previewBody.appendChild(previewEffect);
        previewCard.appendChild(previewGlyph);
        previewCard.appendChild(previewBody);
        container.appendChild(previewCard);

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'big-btn';
        saveBtn.textContent = 'save';
        saveBtn.hidden = true;
        container.appendChild(saveBtn);

        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'menu-btn';
        backBtn.textContent = 'back';
        backBtn.addEventListener('click', () => renderList());
        container.appendChild(backBtn);

        let inputs: {
          level: HTMLInputElement;
          duration: HTMLInputElement;
          cooldown: HTMLInputElement;
        } | null = null;
        const syncSkillPreview = (id: PrimalSkillId): void => {
          if (!inputs) return;
          previewCard.hidden = false;
          previewGlyph.innerHTML = '';
          const icon = SKILL_GLYPHS[id];
          if (icon) setIconHtml(previewGlyph, icon);
          const level = Math.max(
            0,
            Math.floor(parseNumericFormValue(inputs.level.value, 0)),
          );
          const duration = Math.max(
            0,
            parseNumericFormValue(inputs.duration.value, 0),
          );
          const cooldown = Math.max(
            0,
            parseNumericFormValue(inputs.cooldown.value, 0),
          );
          previewName.textContent = PRIMAL_SKILLS[id].name;
          previewDesc.textContent = PRIMAL_SKILLS[id].description;
          previewScaled.textContent = `Lv${level}${UI_META_SEPARATOR}duration ${formatNumeric(duration)}s${UI_META_SEPARATOR}cooldown ${formatNumeric(cooldown)}s`;
          previewEffect.textContent = skillEffectSummary(id, level);
        };

        idSelect.addEventListener('change', () => {
          const id = idSelect.value as PrimalSkillId;
          if (!skillIds.includes(id)) return;
          const existing = developerSkillEntries.find(
            (entry) => entry.id === id,
          );
          const defaults = existing ?? snapshot.skills[id];
          fieldsContainer.innerHTML = '';
          fieldsContainer.hidden = false;
          saveBtn.hidden = false;
          inputs = buildSkillFields(fieldsContainer, defaults);
          syncSkillPreview(id);
          const currentInputs = inputs;
          currentInputs.level.addEventListener('input', () =>
            syncSkillPreview(id),
          );
          currentInputs.duration.addEventListener('input', () =>
            syncSkillPreview(id),
          );
          currentInputs.cooldown.addEventListener('input', () =>
            syncSkillPreview(id),
          );
        });

        saveBtn.addEventListener('click', () => {
          const id = idSelect.value as PrimalSkillId;
          if (!skillIds.includes(id) || !inputs) return;
          const nextEntry: DeveloperSkillEntry = {
            id,
            level: Math.max(
              0,
              Math.floor(parseNumericFormValue(inputs.level.value, 0)),
            ),
            duration: Math.max(
              0,
              parseNumericFormValue(
                inputs.duration.value,
                snapshot.skills[id].duration,
              ),
            ),
            cooldown: Math.max(
              0,
              parseNumericFormValue(
                inputs.cooldown.value,
                snapshot.skills[id].cooldown,
              ),
            ),
          };
          const existingIndex = developerSkillEntries.findIndex(
            (entry) => entry.id === id,
          );
          if (existingIndex >= 0)
            developerSkillEntries[existingIndex] = nextEntry;
          else developerSkillEntries.push(nextEntry);
          applyDeveloperSkillEntries();
          renderList();
        });

        dialog.appendChild(container);
      }

      function renderEdit(index: number): void {
        const entry = developerSkillEntries[index];
        if (!entry) {
          renderList();
          return;
        }
        dialog.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'developer-form';

        const heading = document.createElement('div');
        heading.className = 'overlay-title';
        heading.textContent = `edit · ${entry.id}`;
        container.appendChild(heading);

        const fieldsContainer = document.createElement('div');
        fieldsContainer.className = 'pause-panel';
        container.appendChild(fieldsContainer);
        const inputs = buildSkillFields(fieldsContainer, entry);

        const previewCard = document.createElement('div');
        previewCard.className = 'developer-enhance-preview';
        const previewGlyph = document.createElement('span');
        previewGlyph.className = 'developer-enhance-preview-glyph';
        previewGlyph.setAttribute('aria-hidden', 'true');
        const icon = SKILL_GLYPHS[entry.id];
        if (icon) setIconHtml(previewGlyph, icon);
        const previewBody = document.createElement('div');
        previewBody.className = 'developer-enhance-preview-body';
        const previewName = document.createElement('div');
        previewName.className = 'developer-enhance-preview-name';
        previewName.textContent = PRIMAL_SKILLS[entry.id].name;
        const previewDesc = document.createElement('div');
        previewDesc.className = 'developer-enhance-preview-desc';
        previewDesc.textContent = PRIMAL_SKILLS[entry.id].description;
        const previewScaled = document.createElement('div');
        previewScaled.className = 'developer-enhance-preview-scaled';
        const previewEffect = document.createElement('div');
        previewEffect.className = 'developer-enhance-preview-scaled';
        const syncSkillEditPreview = (): void => {
          const level = Math.max(
            0,
            Math.floor(parseNumericFormValue(inputs.level.value, entry.level)),
          );
          const duration = Math.max(
            0,
            parseNumericFormValue(inputs.duration.value, entry.duration),
          );
          const cooldown = Math.max(
            0,
            parseNumericFormValue(inputs.cooldown.value, entry.cooldown),
          );
          previewScaled.textContent = `Lv${level}${UI_META_SEPARATOR}duration ${formatNumeric(duration)}s${UI_META_SEPARATOR}cooldown ${formatNumeric(cooldown)}s`;
          previewEffect.textContent = skillEffectSummary(entry.id, level);
        };
        syncSkillEditPreview();
        inputs.level.addEventListener('input', syncSkillEditPreview);
        inputs.duration.addEventListener('input', syncSkillEditPreview);
        inputs.cooldown.addEventListener('input', syncSkillEditPreview);
        previewBody.appendChild(previewName);
        previewBody.appendChild(previewDesc);
        previewBody.appendChild(previewScaled);
        previewBody.appendChild(previewEffect);
        previewCard.appendChild(previewGlyph);
        previewCard.appendChild(previewBody);
        container.appendChild(previewCard);

        const actions = document.createElement('div');
        actions.className = 'draft-actions';
        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'big-btn';
        saveBtn.textContent = 'save';
        saveBtn.addEventListener('click', () => {
          entry.level = Math.max(
            0,
            Math.floor(parseNumericFormValue(inputs.level.value, entry.level)),
          );
          entry.duration = Math.max(
            0,
            parseNumericFormValue(inputs.duration.value, entry.duration),
          );
          entry.cooldown = Math.max(
            0,
            parseNumericFormValue(inputs.cooldown.value, entry.cooldown),
          );
          applyDeveloperSkillEntries();
          renderList();
        });
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'menu-btn';
        cancelBtn.textContent = 'back';
        cancelBtn.addEventListener('click', () => renderList());
        actions.appendChild(saveBtn);
        actions.appendChild(cancelBtn);
        container.appendChild(actions);

        dialog.appendChild(container);
      }

      renderList();
      document.body.appendChild(dialog);
      dialog.showModal();

      dialog.addEventListener('close', () => finalize(), { once: true });
    });
  }

  function copyDeveloperEnemyEntries(
    entries: DeveloperEnemyEntry[],
  ): DeveloperEnemyEntry[] {
    return entries.map((entry) => ({ ...entry }));
  }

  function copyDeveloperEnhanceEntries(
    entries: DeveloperEnhanceEntry[],
  ): DeveloperEnhanceEntry[] {
    return entries.map((entry) => ({ ...entry }));
  }

  function copyDeveloperSkillEntries(
    entries: DeveloperSkillEntry[],
  ): DeveloperSkillEntry[] {
    return entries.map((entry) => ({ ...entry }));
  }

  function readCurrentDevelopModeConfig(): DevelopModeConfig | null {
    if (!play?.isDeveloperMode()) return null;
    const avatar = play.world.get(play.avatarId);
    if (!avatar?.avatar || !avatar.weapon) return null;
    const snapshot = play.getDeveloperSnapshot();
    return {
      version: 1,
      player: {
        hp: avatar.avatar.hp,
        maxHp: avatar.avatar.maxHp,
        speedMul: avatar.avatar.speedMul,
        damage: avatar.weapon.damage,
        fireInterval: avatar.weapon.period,
        projectileSpeed: avatar.weapon.projectileSpeed,
        projectiles: avatar.weapon.projectiles,
        pierce: avatar.weapon.pierce,
        crit: avatar.weapon.crit,
        invincible: snapshot.invincible,
        showEnemyHp: snapshot.showEnemyHp,
      },
      enemyInterval: snapshot.enemy.interval,
      enemies: copyDeveloperEnemyEntries(developerEnemyEntries),
      enhances: copyDeveloperEnhanceEntries(developerEnhanceEntries),
      skills: copyDeveloperSkillEntries(developerSkillEntries),
    };
  }

  function normalizeDevelopModeConfig(input: unknown): DevelopModeConfig | null {
    if (!input || typeof input !== 'object') return null;
    const raw = input as Record<string, unknown>;
    const playerRaw = raw.player;
    if (!playerRaw || typeof playerRaw !== 'object') return null;
    const player = playerRaw as Record<string, unknown>;

    const enemyRaw = Array.isArray(raw.enemies) ? raw.enemies : null;
    const enhanceRaw = Array.isArray(raw.enhances) ? raw.enhances : null;
    const skillsRaw = Array.isArray(raw.skills) ? raw.skills : null;
    if (!enemyRaw || !enhanceRaw || !skillsRaw) return null;

    const normalizedEnemies: DeveloperEnemyEntry[] = [];
    for (const row of enemyRaw) {
      if (!row || typeof row !== 'object') return null;
      const item = row as Record<string, unknown>;
      if (typeof item.kind !== 'string') return null;
      const count = Number(item.count);
      const hp = Number(item.hp);
      const attack = Number(item.attack);
      const speed = Number(item.speed);
      const attackFrequency = Number(item.attackFrequency);
      if (
        !Number.isFinite(count) ||
        !Number.isFinite(hp) ||
        !Number.isFinite(attack) ||
        !Number.isFinite(speed) ||
        !Number.isFinite(attackFrequency)
      ) {
        return null;
      }
      normalizedEnemies.push({
        kind: item.kind as EnemyKind,
        count: Math.max(1, Math.round(count)),
        hp: Math.max(1, Math.round(hp)),
        attack: Math.max(0, attack),
        speed: Math.max(0, speed),
        attackFrequency: Math.max(0, attackFrequency),
      });
    }

    const normalizedEnhances: DeveloperEnhanceEntry[] = [];
    for (const row of enhanceRaw) {
      if (!row || typeof row !== 'object') return null;
      const item = row as Record<string, unknown>;
      if (typeof item.cardId !== 'string') return null;
      const card = POOL_BY_ID.get(item.cardId);
      if (!card) return null;
      const level = Number(item.level);
      if (!Number.isFinite(level)) return null;
      normalizedEnhances.push({
        cardId: item.cardId as Card['id'],
        level: Math.max(1, Math.floor(level)),
      });
    }

    const skillIds = new Set(Object.keys(PRIMAL_SKILLS) as PrimalSkillId[]);
    const normalizedSkills: DeveloperSkillEntry[] = [];
    for (const row of skillsRaw) {
      if (!row || typeof row !== 'object') return null;
      const item = row as Record<string, unknown>;
      if (typeof item.id !== 'string' || !skillIds.has(item.id as PrimalSkillId))
        return null;
      const level = Number(item.level);
      const duration = Number(item.duration);
      const cooldown = Number(item.cooldown);
      if (
        !Number.isFinite(level) ||
        !Number.isFinite(duration) ||
        !Number.isFinite(cooldown)
      ) {
        return null;
      }
      normalizedSkills.push({
        id: item.id as PrimalSkillId,
        level: Math.max(0, Math.floor(level)),
        duration: Math.max(0, duration),
        cooldown: Math.max(0, cooldown),
      });
    }

    const hp = Number(player.hp);
    const maxHp = Number(player.maxHp);
    const speedMul = Number(player.speedMul);
    const damage = Number(player.damage);
    const fireInterval = Number(player.fireInterval);
    const projectileSpeed = Number(player.projectileSpeed);
    const projectiles = Number(player.projectiles);
    const pierce = Number(player.pierce);
    const crit = Number(player.crit);
    const enemyInterval = Number(raw.enemyInterval);
    if (
      !Number.isFinite(hp) ||
      !Number.isFinite(maxHp) ||
      !Number.isFinite(speedMul) ||
      !Number.isFinite(damage) ||
      !Number.isFinite(fireInterval) ||
      !Number.isFinite(projectileSpeed) ||
      !Number.isFinite(projectiles) ||
      !Number.isFinite(pierce) ||
      !Number.isFinite(crit) ||
      !Number.isFinite(enemyInterval)
    ) {
      return null;
    }

    return {
      version: typeof raw.version === 'number' ? raw.version : 1,
      player: {
        hp: Math.max(1, Math.round(hp)),
        maxHp: Math.max(1, Math.round(maxHp)),
        speedMul: Math.max(0.1, speedMul),
        damage: Math.max(1, Math.round(damage)),
        fireInterval: Math.max(0, fireInterval),
        projectileSpeed: Math.max(1, projectileSpeed),
        projectiles: Math.max(1, Math.round(projectiles)),
        pierce: Math.max(0, Math.round(pierce)),
        crit: Math.max(0, Math.min(1, crit)),
        invincible: !!player.invincible,
        showEnemyHp: !!player.showEnemyHp,
      },
      enemyInterval: Math.max(0.1, enemyInterval),
      enemies: normalizedEnemies,
      enhances: normalizedEnhances,
      skills: normalizedSkills,
    };
  }

  function toSlotFilename(index: number, name: string): string {
    const safeName = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const suffix = safeName.length > 0 ? `-${safeName}` : '';
    return `axiom-develop-slot-${index + 1}${suffix}.json`;
  }

  function downloadDevelopConfigJson(
    slotIndex: number,
    slotName: string,
    config: DevelopModeConfig,
  ): void {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = toSlotFilename(slotIndex, slotName);
    a.click();
    URL.revokeObjectURL(url);
  }

  async function openDeveloperSaveLoadMenu(): Promise<void> {
    if (!play?.isDeveloperMode()) return;
    const slots = await loadDevelopModeSlots();

    return new Promise<void>((resolve) => {
      const wasPaused = paused;
      if (!wasPaused) setPaused(true);

      const dialog = document.createElement('dialog');
      dialog.className = 'developer-dialog';
      dialog.setAttribute('aria-label', 'developer · save/load');

      const finalize = (): void => {
        dialog.remove();
        if (!wasPaused) setPaused(false);
        resolve();
      };

      const saveSlots = async (): Promise<void> => {
        await saveDevelopModeSlots(slots);
      };

      function slotUpdatedLabel(savedAt: number | null): string {
        return savedAt ? new Date(savedAt).toLocaleString() : 'empty';
      }

      function renderList(): void {
        dialog.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'developer-form';

        const heading = document.createElement('div');
        heading.className = 'overlay-title';
        heading.textContent = 'developer · save/load';
        container.appendChild(heading);

        const list = document.createElement('div');
        list.className = 'developer-enemy-list';

        for (let i = 0; i < slots.length; i++) {
          const slot = slots[i] as DevelopModeSaveSlot;
          const row = document.createElement('div');
          row.className = 'developer-slot-card';

          const top = document.createElement('div');
          top.className = 'developer-slot-head';
          const nameInput = document.createElement('input');
          nameInput.type = 'text';
          nameInput.className = 'developer-form-input';
          nameInput.style.maxWidth = '100%';
          nameInput.style.width = '100%';
          nameInput.value = slot.name;
          nameInput.maxLength = 40;
          const updated = document.createElement('div');
          updated.className = 'developer-enemy-card-stats';
          updated.textContent = `#${i + 1} · ${slotUpdatedLabel(slot.savedAt)}`;
          top.appendChild(nameInput);
          top.appendChild(updated);
          row.appendChild(top);

          nameInput.addEventListener('change', async () => {
            const value = nameInput.value.trim();
            slot.name = value.length > 0 ? value : `slot ${i + 1}`;
            nameInput.value = slot.name;
            await saveSlots();
          });

          const actions = document.createElement('div');
          actions.className = 'developer-slot-actions';

          const saveBtn = document.createElement('button');
          saveBtn.type = 'button';
          saveBtn.className = 'secondary-btn';
          saveBtn.textContent = 'save';
          saveBtn.addEventListener('click', async () => {
            const config = readCurrentDevelopModeConfig();
            if (!config) return;
            slot.config = config;
            slot.savedAt = Date.now();
            await saveSlots();
            renderList();
          });

          const loadBtn = document.createElement('button');
          loadBtn.type = 'button';
          loadBtn.className = 'secondary-btn';
          loadBtn.textContent = 'load';
          loadBtn.disabled = slot.config === null;
          loadBtn.addEventListener('click', () => {
            const config = normalizeDevelopModeConfig(slot.config);
            if (!config) {
              showNotification('Invalid slot data: configuration failed validation.', 'error');
              return;
            }
            pendingDevelopModeConfig = config;
            dialog.close();
            finalize();
            startRun('survival', 0, true);
          });

          const exportBtn = document.createElement('button');
          exportBtn.type = 'button';
          exportBtn.className = 'secondary-btn';
          exportBtn.textContent = 'export';
          exportBtn.disabled = slot.config === null;
          exportBtn.addEventListener('click', () => {
            const config = normalizeDevelopModeConfig(slot.config);
            if (!config) {
              showNotification('Invalid slot data: configuration failed validation.', 'error');
              return;
            }
            downloadDevelopConfigJson(i, slot.name, config);
          });

          const importBtn = document.createElement('button');
          importBtn.type = 'button';
          importBtn.className = 'secondary-btn';
          importBtn.textContent = 'import';
          importBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.addEventListener('change', async () => {
              const file = input.files?.[0];
              if (!file) return;
              const text = await file.text();
              let parsed: unknown;
              try {
                parsed = JSON.parse(text);
              } catch (error) {
                const detail =
                  error instanceof Error ? error.message : 'unknown parse error';
                showNotification(`Invalid JSON file: ${detail}`, 'error');
                return;
              }
              const config = normalizeDevelopModeConfig(parsed);
              if (!config) {
                showNotification('Invalid develop config: validation failed.', 'error');
                return;
              }
              slot.config = config;
              slot.savedAt = Date.now();
              await saveSlots();
              renderList();
            });
            input.click();
          });

          actions.appendChild(saveBtn);
          actions.appendChild(loadBtn);
          actions.appendChild(exportBtn);
          actions.appendChild(importBtn);
          row.appendChild(actions);
          list.appendChild(row);
        }

        container.appendChild(list);

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'menu-btn';
        closeBtn.textContent = 'close';
        closeBtn.addEventListener('click', () => {
          dialog.close();
          finalize();
        });
        container.appendChild(closeBtn);
        dialog.appendChild(container);
      }

      renderList();
      document.body.appendChild(dialog);
      dialog.showModal();
      dialog.addEventListener('close', () => finalize(), { once: true });
    });
  }

  // ── Card HUD (top-left overlay) ─────────────────────────────────────────

  function renderCardHud(): void {
    let container = document.getElementById('hud-cards');
    if (!container) {
      container = document.createElement('div');
      container.id = 'hud-cards';
      gameEl!.appendChild(container);
    }
    container.innerHTML = '';

    for (const [, entry] of runInventory.all()) {
      const chip = document.createElement('span');
      chip.className = 'card-chip';
      chip.title = `${entry.card.name} Lv${entry.level}`;

      const glyphSpan = document.createElement('span');
      glyphSpan.className = 'card-chip-glyph';
      const svgGlyph = CARD_GLYPHS[entry.card.id];
      if (svgGlyph) setIconHtml(glyphSpan, svgGlyph);
      else glyphSpan.textContent = entry.card.glyph;

      const lvSpan = document.createElement('span');
      lvSpan.className = 'card-chip-lv';
      lvSpan.textContent = `${entry.level}`;

      chip.appendChild(glyphSpan);
      chip.appendChild(lvSpan);
      container.appendChild(chip);
    }

    const unmappedEquipment = currentRun?.developMode
      ? []
      : listUnmappedEquipmentCards(equipment.equipped);
    for (const eqCard of unmappedEquipment) {
      const chip = document.createElement('span');
      chip.className = 'card-chip';
      chip.title = `${eqCard.name} (equipment)`;

      const glyphSpan = document.createElement('span');
      glyphSpan.className = 'card-chip-glyph';
      const svgGlyph = SHOP_GLYPHS[eqCard.id];
      if (svgGlyph) setIconHtml(glyphSpan, svgGlyph);
      else glyphSpan.textContent = eqCard.glyph;

      const lvSpan = document.createElement('span');
      lvSpan.className = 'card-chip-lv';
      lvSpan.textContent = 'E';

      chip.appendChild(glyphSpan);
      chip.appendChild(lvSpan);
      container.appendChild(chip);
    }

    container.hidden =
      runInventory.size === 0 && unmappedEquipment.length === 0;
  }

  function summarizeRunEnhances(): Array<{ id: string; level: number }> {
    const rows: Array<{ id: string; level: number }> = [];
    for (const [, entry] of runInventory.all()) {
      rows.push({ id: entry.card.id, level: entry.level });
    }
    return rows;
  }

  function clearCardHud(): void {
    const container = document.getElementById('hud-cards');
    if (container) {
      container.innerHTML = '';
      container.hidden = true;
    }
  }

  // ── Run lifecycle ───────────────────────────────────────────────────────

  function startRun(
    mode: GameMode,
    stageIndex: number,
    developMode = false,
  ): void {
    const loadedDevelopConfig = developMode ? pendingDevelopModeConfig : null;
    pendingDevelopModeConfig = null;

    while (stack.top()) stack.pop();
    app.stage.removeChildren();
    currentRun = { mode, stageIndex, developMode };
    setPaused(false);
    pendingUnlocks = null;
    pendingFragments = null;
    pendingBossChestReward = null;
    pendingRunResult = null;
    if (hudFragments) {
      hudFragments.innerHTML = '';
      hudFragments.hidden = true;
    }

    // Snapshot stats before run so we can compute unlock diff at settle.
    statsBeforeRun = {
      ...profile.stats,
      normalCleared: [...profile.stats.normalCleared],
    };

    const theme =
      mode === 'normal'
        ? (STAGE_THEMES[stageIndex] ?? DEFAULT_THEME)
        : DEFAULT_THEME;
    setTheme(theme);

    // Start ambient music for this stage
    playMusic('level', stageIndex);

    seed = pickSeed();
    const rng = createRng(seed);
    // eslint-disable-next-line no-console
    console.log(
      `[axiom] run seed = ${seed}, mode = ${mode}, stage = ${stageIndex}`,
    );
    if (hudSeed) hudSeed.textContent = `seed: ${seed}`;

    // Build waves
    const waves =
      mode === 'normal'
        ? (STAGE_WAVES[stageIndex] ?? WAVES)
        : [survivalWaveSpec(1, rng)]; // survival starts with wave 1

    // Derive starting shape from the active character's lineage (class system).
    // Falls back to the legacy activeStartShape field if no character slot exists.
    const activeChar = activeCharacterSlot(profile.characters);

    // In develop mode, start with no skills and default skin (bare avatar).
    // In normal mode, derive active skills from the character's class node chain.
    const activeSkills = developMode
      ? []
      : activeChar
        ? activeSkillsFromCharacter(activeChar)
        : createActiveSkillStates(skillTree);
    const startingShape = activeChar
      ? lineageToStartingShape(activeChar.lineage)
      : resolveSelectedStartingShape(profile);
    const runSkin = developMode
      ? 'triangle'
      : runSkinForStartingShape(startingShape, profile.activeSkin);

    // Reset card inventory for this run.
    runInventory = new CardInventory();
    // Reset developer entries on new run.
    if (developMode) {
      if (loadedDevelopConfig) {
        developerEnemyEntries = copyDeveloperEnemyEntries(
          loadedDevelopConfig.enemies,
        );
        developerEnhanceEntries = copyDeveloperEnhanceEntries(
          loadedDevelopConfig.enhances,
        );
        developerSkillEntries = copyDeveloperSkillEntries(
          loadedDevelopConfig.skills,
        );
      } else {
        developerEnemyEntries = [];
        developerEnhanceEntries = [];
        developerSkillEntries = [];
      }
    }

    play = new PlayScene(
      rng,
      {
        updateHud,
        updateFragments: (fragments) => renderFragmentHud(fragments),
        onWaveCleared: (cleared) => {
          playSfx('draft');
          const label =
            mode === 'survival'
              ? `${cleared}`
              : `${cleared} of ${play.totalWaves()}`;
          const stageEnhancePool = STAGE_CONFIGS[stageIndex]?.enhancePool;
          const offer = drawOffer(rng, 3, POOL, profile.stats, stageEnhancePool);
          let rerollUses = 0;
          let draft: DraftScene;
          draft = new DraftScene(offer, label, {
            onPick: (pick) => onPickCard(pick),
            onReroll: () => {
              const cost = rerollTokenCostForUse(rerollUses);
              if (play.draftTokens < cost) return false;
              play.draftTokens -= cost;
              rerollUses += 1;
              draft.setOffer(drawOffer(rng, 3, POOL, profile.stats, stageEnhancePool));
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
          playSfx('death');
          currentRun = null;
          setPaused(false);
          const total =
            mode === 'survival' ? play.currentWave1() : play.totalWaves();
          stack.push(
            new EndgameScene(
              'dead',
              play.currentWave1(),
              total,
              {
                onRetry: () => startRun(mode, stageIndex, developMode),
                onMenu: () => showMainMenu(),
              },
              {
                unlocks: pendingUnlocks ?? undefined,
                fragments: pendingFragments ?? undefined,
                durationSec: pendingRunResult?.durationSec,
                killsByKind: pendingRunResult?.killsByKind,
                enhanceEntries: summarizeRunEnhances(),
              },
            ),
          );
        },
        onRunWon: () => {
          currentRun = null;
          setPaused(false);
          const total = play.totalWaves();
          const hasNextStage =
            mode === 'normal' && stageIndex + 1 < STAGE_WAVES.length;
          const showWonEndgame = (): void => {
            stack.push(
              new EndgameScene(
                'won',
                total,
                total,
                {
                  onRetry: () => startRun(mode, stageIndex, developMode),
                  onNext: hasNextStage
                    ? () => startRun('normal', stageIndex + 1, false)
                    : undefined,
                  onMenu: () => showMainMenu(),
                },
                {
                  unlocks: pendingUnlocks ?? undefined,
                  fragments: pendingFragments ?? undefined,
                  durationSec: pendingRunResult?.durationSec,
                  killsByKind: pendingRunResult?.killsByKind,
                  enhanceEntries: summarizeRunEnhances(),
                },
              ),
            );
          };
          if (pendingBossChestReward) {
            const reward = pendingBossChestReward;
            stack.push(
              new BossRewardScene(reward, {
                onConfirm: () => {
                  pendingBossChestReward = null;
                  stack.pop();
                  showWonEndgame();
                },
              }),
            );
            return;
          }
          showWonEndgame();
        },
        onRunComplete: (result) => settleRun(result),
        playSfx: (name) => audioAdapter.playSfx(name),
        onBossWaveStart: () => {
          // Switch to boss music
          playMusic('boss', stageIndex);
          if (mode === 'normal') {
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
      {
        mode,
        waves,
        gridColor: theme.gridColor,
        stageIndex,
        activeSkills,
        theme,
        activeSkin: runSkin,
        developerMode: developMode,
      },
    );

    if (!developMode) {
      applyStartingShapeLoadout(play.world, play.avatarId, startingShape);
      // Apply equipment loadout at run start.
      applyEquipment(equipment, play.world, play.avatarId);
      applyTalentAvatarBonuses();
      applyTalentCoreEffects();
      applyClassPassiveBonuses();

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
      if (loadedDevelopConfig) {
        play.setDeveloperPlayerStats(loadedDevelopConfig.player);
        play.setDeveloperInvincible(loadedDevelopConfig.player.invincible);
        play.setDeveloperShowEnemyHp(loadedDevelopConfig.player.showEnemyHp);
        play.setDeveloperEnemyInterval(loadedDevelopConfig.enemyInterval);
        applyDeveloperEnemyEntries();
        applyDeveloperEnhanceEntries();
        applyDeveloperSkillEntries();
      }
      developerHudPanel = 'settings';
      showDeveloperControls();
    } else {
      showSkillButtons();
    }
    renderCardHud();

    // Stage-entry title-card (normal mode only).
    if (mode === 'normal') {
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
    pendingBossChestReward = result.bossChestReward ?? null;
    if (result.bossChestReward) {
      const stageBossFragmentId = `boss-${bossKindForStage(result.stageIndex)}` as const;
      result.fragments.boss += result.bossChestReward.bossFragments;
      result.fragments.detailed[stageBossFragmentId] += result.bossChestReward.bossFragments;
      if (result.bossChestReward.core > 0) skillTree.cores += result.bossChestReward.core;
    }

    const talentMeta = talentBonuses(profile.talents);
    if (talentMeta.fragmentRewardMul > 0) {
      for (const meta of FRAGMENT_META) {
        const base = result.fragments.detailed[meta.id] ?? 0;
        if (base <= 0) continue;
        const delta = Math.max(
          TALENT_FRAGMENT_BONUS_MIN,
          Math.round(base * talentMeta.fragmentRewardMul),
        );
        if (delta > 0) {
          result.fragments.detailed[meta.id] += delta;
          result.fragments[meta.category] += delta;
        }
      }
    }
    if (talentMeta.pointRewardMul > 0) {
      result.pointsEarned = Math.max(
        0,
        Math.round(result.pointsEarned * (1 + talentMeta.pointRewardMul)),
      );
    }

    // Apply class passive settlement bonuses (stack on top of talent bonuses)
    const classMeta = classPassiveBonuses(profile.characters);
    if (classMeta.fragmentRewardMul > 0) {
      for (const meta of FRAGMENT_META) {
        const base = result.fragments.detailed[meta.id] ?? 0;
        if (base <= 0) continue;
        const delta = Math.max(
          TALENT_FRAGMENT_BONUS_MIN,
          Math.round(base * classMeta.fragmentRewardMul),
        );
        if (delta > 0) {
          result.fragments.detailed[meta.id] += delta;
          result.fragments[meta.category] += delta;
        }
      }
    }
    if (classMeta.pointRewardMul > 0) {
      result.pointsEarned = Math.max(
        0,
        Math.round(result.pointsEarned * (1 + classMeta.pointRewardMul)),
      );
    }

    // Update profile
    profile.points += result.pointsEarned;
    profile.stats.totalRuns += 1;
    profile.stats.totalKills += result.totalKills;
    profile.stats.totalBossKills += result.bossKills;
    profile.stats.totalPointsEarned += result.pointsEarned;

    // Apply loot
    for (const drop of result.loot) {
      if (drop.kind === 'core') skillTree.cores += drop.value;
    }

    // Apply fragment drops to persistent inventory (FRAGMENT_MATERIAL_CAP per material with overflow-to-points conversion).
    let fragmentOverflowPoints = 0;
    for (const meta of FRAGMENT_META) {
      const gain = result.fragments.detailed[meta.id] ?? 0;
      const outcome = applyFragmentGainWithCap(profile.fragments.detailed, meta.id, gain);
      profile.fragments[meta.category] += outcome.accepted;
      fragmentOverflowPoints += outcome.overflowPoints;
    }
    if (fragmentOverflowPoints > 0) profile.points += fragmentOverflowPoints;
    pendingFragments = result.fragments;
    pendingRunResult = result;

    if (result.killsByKind) {
      for (const [kind, count] of Object.entries(result.killsByKind)) {
        const k = kind as EnemyKind;
        profile.stats.enemyKills[k] = (profile.stats.enemyKills[k] ?? 0) + (count ?? 0);
      }
    }

    // Survival best
    if (result.mode === 'survival') {
      profile.stats.bestSurvivalWave = Math.max(
        profile.stats.bestSurvivalWave,
        result.wavesCleared,
      );
    }

    const normalStageWaveTarget =
      result.mode === 'normal'
        ? (STAGE_WAVES[result.stageIndex]?.length ?? WAVES.length)
        : 0;

    // Normal mode clear tracking
    if (
      result.mode === 'normal' &&
      result.wavesCleared >= normalStageWaveTarget
    ) {
      profile.stats.normalCleared[result.stageIndex] = true;
    }

    // Check achievements
    const toUnlock = checkRunAchievements({
      result,
      stats: profile.stats,
      equipment,
      ownedSkins: profile.ownedSkins,
      normalStageWaveTarget,
    });
    for (const id of toUnlock) {
      if (unlockAchievement(achievements, id) && id === 'firstBossKill') {
        // eslint-disable-next-line no-console
        console.log('[axiom] Achievement unlocked: firstBossKill');
      }
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
      const diff = diffUnlocks(
        statsBeforeRun,
        profile.stats,
        POOL,
        allSkillDefs,
      );
      if (diff.newCards.length > 0 || diff.newSkills.length > 0) {
        pendingUnlocks = {
          newCards: diff.newCards.map((id) => POOL_BY_ID.get(id)?.name ?? id),
          newSkills: diff.newSkills.map(
            (id) => PRIMAL_SKILLS[id as keyof typeof PRIMAL_SKILLS]?.name ?? id,
          ),
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
    // Only start menu music if not already playing (avoids restart when returning from sub-menus)
    playMusic('menu');
    if (hudSkills) {
      hudSkills.innerHTML = '';
      hudSkills.classList.remove('developer-hud');
    }
    clearCardHud();
    if (hudFragments) {
      hudFragments.innerHTML = '';
      hudFragments.hidden = true;
    }
    if (hudSynergy) hudSynergy.innerHTML = '';

    const menu = new MainMenuScene(
      async (action: MenuAction) => {
        switch (action.kind) {
          case 'normalMode':
            stack.pop(); // remove menu
            stack.push(
              new StageSelectScene(
                (idx) => {
                  stack.pop();
                  startRun('normal', idx);
                },
                () => {
                  stack.pop();
                  showMainMenu();
                },
                () => profile.stats,
              ),
            );
            break;

          case 'survivalMode':
            stack.pop();
            startRun('survival', 0);
            break;

          case 'developMode':
            stack.pop();
            startRun('survival', 0, true);
            break;

          case 'shop':
            stack.pop();
            stack.push(
              new ShopScene({
                getProfile: () => profile,
                getEquipment: () => equipment,
                getShopUnlocks: () => shopUnlocks,
                getEnemyKillCount: (kind) => profile.stats.enemyKills[kind] ?? 0,
                onPurchase: async (item) => {
                  if (profile.points < item.price) return;
                  profile.points -= item.price;
                  if (item.category === 'skin') {
                    if (!profile.ownedSkins.includes(item.id))
                      profile.ownedSkins.push(item.id);
                  } else if (item.category === 'equipCard') {
                    if (!equipment.ownedCards.includes(item.id))
                      equipment.ownedCards.push(item.id);
                  } else if (item.category === 'slotExpand') {
                    equipment.maxSlots += 1;
                  }
                  if (!shopUnlocks.purchased.includes(item.id))
                    shopUnlocks.purchased.push(item.id);
                  await Promise.all([
                    saveProfile(profile),
                    saveEquipment(equipment),
                    saveShopUnlocks(shopUnlocks),
                  ]);
                },
                onBuyFragment: async (id, price) => {
                  if (profile.points < price) return;
                  profile.points -= price;
                  const category = fragmentCategory(id);
                  const outcome = applyFragmentGainWithCap(profile.fragments.detailed, id, 1);
                  profile.fragments[category] += outcome.accepted;
                  if (outcome.overflowPoints > 0) profile.points += outcome.overflowPoints;
                  await saveProfile(profile);
                },
                onSellFragment: async (id, gain) => {
                  if ((profile.fragments.detailed[id] ?? 0) <= 0) return;
                  const category = fragmentCategory(id);
                  profile.fragments[category] = Math.max(0, profile.fragments[category] - 1);
                  profile.fragments.detailed[id] = Math.max(
                    0,
                    profile.fragments.detailed[id] - 1,
                  );
                  profile.points += gain;
                  await saveProfile(profile);
                },
                onBack: () => {
                  stack.pop();
                  showMainMenu();
                },
              }),
            );
            break;

          case 'equipment':
            stack.pop();
            stack.push(
              new EquipmentScene({
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
                onBack: () => {
                  stack.pop();
                  showMainMenu();
                },
              }),
            );
            break;

          case 'classCreation':
            stack.pop();
            stack.push(
              new ClassCreationScene({
                getProfile: () => profile,
                onPromote: async (slotId, branch) => {
                  const result = promoteClass(profile, slotId, branch);
                  if (result.ok) {
                    // Sync activeStartShape with the active character's lineage
                    const activeChar = activeCharacterSlot(profile.characters);
                    if (activeChar) {
                      profile.activeStartShape = lineageToStartingShape(activeChar.lineage);
                    }
                    await saveProfile(profile);
                  }
                  return result;
                },
                onReset: async (slotId) => {
                  const result = resetCharacterClass(profile, slotId);
                  if (result.ok) {
                    await saveProfile(profile);
                  }
                  return result;
                },
                onCreateSlot: async (lineage) => {
                  const result = createCharacterSlot(profile, lineage);
                  if (result.ok) {
                    await saveProfile(profile);
                  }
                  return result;
                },
                onSelectSlot: (slotId) => {
                  if (setActiveCharacterSlot(profile.characters, slotId)) {
                    const activeChar = activeCharacterSlot(profile.characters);
                    if (activeChar) {
                      profile.activeStartShape = lineageToStartingShape(activeChar.lineage);
                    }
                    void saveProfile(profile);
                  }
                },
                onBack: () => {
                  stack.pop();
                  showMainMenu();
                },
                notify: (msg, type) => showNotification(msg, type),
              }),
            );
            break;

          case 'skillTree':
            stack.pop();
            stack.push(
              new SkillTreeScene({
                getActiveSlot: () => activeCharacterSlot(profile.characters),
                onBack: () => {
                  stack.pop();
                  showMainMenu();
                },
              }),
            );
            break;

          case 'talentGrowth':
            stack.pop();
            stack.push(
              new TalentScene({
                getProfile: () => profile,
                onUpgrade: async (id) => {
                  const result = upgradeTalent(profile, id);
                  if (result.ok) await saveProfile(profile);
                  return result;
                },
                onReset: async () => {
                  const result = resetTalentGrowth(profile);
                  if (result.ok) await saveProfile(profile);
                  return result;
                },
                onBack: () => {
                  stack.pop();
                  showMainMenu();
                },
                notify: (msg, type) => showNotification(msg, type),
              }),
            );
            break;

          case 'codex':
            stack.pop();
            stack.push(
              new CodexScene(
                () => profile.stats,
                () => {
                  stack.pop();
                  showMainMenu();
                },
              ),
            );
            break;

          case 'achievements':
            stack.pop();
            stack.push(
              new AchievementsScene(
                () => achievements,
                () => {
                  stack.pop();
                  showMainMenu();
                },
              ),
            );
            break;

          case 'settings':
            stack.pop();
            stack.push(
              new SettingsScene({
                onBack: () => {
                  stack.pop();
                  showMainMenu();
                },
                onChanged: () => {
                  syncMuteLabel();
                  saveSettings(buildSettings());
                },
                isMuted: () => audioAdapter.isMuted(),
                setMuted: (m) => audioAdapter.setMuted(m),
                getMasterVolume: () => settings.masterVolume ?? 1,
                getSfxVolume: () => settings.sfxVolume ?? 1,
                getMusicVolume: () => settings.musicVolume ?? 0.5,
                setVolumes: (master, sfx, music) => {
                  settings.masterVolume = master;
                  settings.sfxVolume = sfx;
                  settings.musicVolume = music;
                  setVolumes(master, sfx);
                  setMusicVolume(music, master);
                },
              }),
            );
            break;

          case 'exportData': {
            const data = await exportSaveData();
            downloadSaveData(data);
            break;
          }

          case 'importData': {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.addEventListener('change', async () => {
              const file = input.files?.[0];
              if (!file) {
                showNotification('Import canceled.', 'info');
                return;
              }
              try {
                const text = await file.text();
                const data = parseSaveData(text);
                if (!data) {
                  showNotification('Invalid save file.', 'error');
                  return;
                }
                await importSaveData(data);
                // Reload state
                profile = await loadProfile();
                equipment = await loadEquipment();
                skillTree = await loadSkillTree();
                achievements = await loadAchievements();
                shopUnlocks = await loadShopUnlocks();
                developerModeUnlocked =
                  (await loadSettings()).developerMode ?? false;
                showNotification('Data imported successfully!', 'success');
                showMainMenu();
              } catch (error) {
                const detail =
                  error instanceof Error && error.message
                    ? ` ${error.message}`
                    : '';
                showNotification(`Failed to import save data.${detail}`, 'error');
              }
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
          await saveSettings({ ...buildSettings(), developerMode: true });
          showNotification('Developer mode enabled.', 'success');
          showMainMenu();
        },
      },
    );
    app.stage.addChild(menu.root);
    stack.push(menu);
  }

  // ── Controls ──────────────────────────────────────────────────────────

  btnRestart?.addEventListener('click', () => {
    if (!currentRun) return;
    startRun(currentRun.mode, currentRun.stageIndex, currentRun.developMode);
  });
  btnPause?.addEventListener('click', () => {
    if (!currentRun) return;
    const top = stack.top();
    if (!paused && top !== play) return;
    setPaused(!paused);
  });
  btnComments?.addEventListener('click', () => {
    if (!(commentsDialog instanceof HTMLDialogElement)) return;
    if (!paused && currentRun) setPaused(true);
    commentsDialog.showModal();
  });
  btnMenu?.addEventListener('click', () => showMainMenu());

  function onFirstGesture(): void {
    primeSfx();
    document.removeEventListener('pointerdown', onFirstGesture);
  }
  document.addEventListener('pointerdown', onFirstGesture);

  function syncMuteLabel(): void {
    if (btnMute) btnMute.textContent = isMuted() ? 'sfx off' : 'sfx on';
  }
  btnMute?.addEventListener('click', () => {
    setMuted(!isMuted());
    syncMuteLabel();
    saveSettings(buildSettings());
  });
  if (settings.muted) setMuted(true);
  // Apply persisted volume/shake settings
  setVolumes(settings.masterVolume ?? 1, settings.sfxVolume ?? 1);
  setMusicVolume(settings.musicVolume ?? 0.5, settings.masterVolume ?? 1);
  setScreenShakeEnabled(settings.screenShake ?? true);
  syncMuteLabel();

  /** Build current GameSettings snapshot for persistence. */
  function buildSettings(): GameSettings {
    return {
      muted: isMuted(),
      developerMode: developerModeUnlocked,
      masterVolume: settings.masterVolume ?? 1,
      sfxVolume: settings.sfxVolume ?? 1,
      musicVolume: settings.musicVolume ?? 0.5,
      screenShake: settings.screenShake ?? true,
    };
  }

  // ── Start ─────────────────────────────────────────────────────────────

  showMainMenu();
  syncRunControlButtons();

  startLoop(
    (dt) => {
      if (paused) return;
      stack.update(dt);
      refreshSkillButtons();
      updateSynergyHud();
    },
    (alpha) => stack.render(alpha),
  );
}

boot().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[axiom] boot failed:', err);
});
