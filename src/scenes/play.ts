import { Container, Graphics } from "pixi.js";

import { playSfx } from "../game/audio";
import type { Card } from "../game/cards";
import { PLAY_H, PLAY_W, STARTING_DRAFT_TOKENS } from "../game/config";
import { spawnAvatar } from "../game/entities";
import { bossForStage } from "../game/bosses/registry";
import type { BossSpec } from "../game/bosses/types";
import type { Rng } from "../game/rng";
import { updateEnemyAi } from "../game/systems/ai";
import { updateBossWeapon } from "../game/systems/bossWeapon";
import { removeDeadEnemies, updateCollisions } from "../game/systems/collision";
import { decayHitFlash, updateAvatarMotion, updateProjectileMotion } from "../game/systems/motion";
import { resetStatusPhase, updateStatusEffects } from "../game/systems/status";
import { newWaveState, updateWave, type WaveState } from "../game/systems/wave";
import { updateWeapon } from "../game/systems/weapon";
import type { WaveSpec } from "../game/waves";
import { type EntityId, World } from "../game/world";
import { drawGrid, drawWorld } from "../render";
import type { Scene } from "./scene";
import { BOSS_WAVE_BONUS, killPointsForEnemy, rollBossLoot, type LootDrop, type RunResult } from "../game/rewards";
import {
  type ActiveSkillState,
  activateSkill,
  tickSkillState,
  timeStopSpeedMul,
  cloneInheritRatio,
  barrageProjectiles,
  barrageDamage,
  lifestealRadius,
  lifestealDamage,
  lifestealHeal,
} from "../game/skills";
import { survivalWaveSpec, isMirrorBossWave, survivalHpScale, survivalSpeedScale } from "../game/survivalWaves";
import type { StageTheme } from "../game/stageThemes";
import { SYNERGY_CONFIG, explodeAt } from "../game/synergies";

export type GameMode = "normal" | "survival";

// Stage 1 / Stage 2 / Stage 3 normal-mode enemy strength multipliers.
const NORMAL_STAGE_STRENGTH_MUL: readonly number[] = [1, 1.5, 2.5];

export interface PlayCallbacks {
  onWaveCleared: (clearedIdx: number) => void; // 1-based
  onPlayerDied: () => void;
  onRunWon: () => void;
  onRunComplete: (result: RunResult) => void;
  updateHud: (hp: number, maxHp: number, waveIdx: number, totalWaves: number, points: number, tokens: number) => void;
  /** Called once when the boss wave begins (wave index is 1-based). */
  onBossWaveStart?: (wave1: number) => void;
}

// The canvas CSS size varies per viewport; map pointer events back to the
// fixed 360×640 play-field so gameplay math stays resolution-independent.
export interface PointerMapper {
  clientToPlay: (clientX: number, clientY: number) => { x: number; y: number };
  target: HTMLElement;
}

export class PlayScene implements Scene {
  readonly root: Container;
  readonly world: World;
  avatarId: EntityId;
  readonly picks: Card[] = [];

  private readonly rng: Rng;
  private readonly g: Graphics;
  private readonly cb: PlayCallbacks;
  private readonly mapper: PointerMapper;
  private readonly mode: GameMode;
  private readonly waves: readonly WaveSpec[];
  private waveIdx: number;
  private wave: WaveState;
  private tracking = false;
  private readonly boundOnDown: (ev: PointerEvent) => void;
  private readonly boundOnMove: (ev: PointerEvent) => void;
  private readonly boundOnUp: (ev: PointerEvent) => void;
  private ended = false;
  private bossApplied = false;
  private readonly gridColor: number;
  private readonly theme: StageTheme | undefined;

  // Points & stats
  private runPoints = 0;
  private runKills = 0;
  private runBossKills = 0;
  private runEliteKills = 0;
  draftTokens = STARTING_DRAFT_TOKENS;
  private readonly loot: LootDrop[] = [];
  readonly stageIndex: number;

  // Primal skills (runtime)
  readonly activeSkills: ActiveSkillState[];
  private cloneId: EntityId | null = null;
  /** Accumulator for lifesteal pulse ticks (~1 per second while active). */
  private lifestealTick = 0;
  /** Whether overload fire-rate boost is currently applied. */
  private overloadApplied = false;
  /** Saved weapon period before overload. */
  private savedWeaponPeriod = 0;

  constructor(
    rng: Rng,
    cb: PlayCallbacks,
    mapper: PointerMapper,
    opts: {
      mode: GameMode;
      waves: readonly WaveSpec[];
      gridColor?: number;
      stageIndex?: number;
      activeSkills?: ActiveSkillState[];
      theme?: StageTheme;
      activeSkin?: string;
    },
  ) {
    this.root = new Container();
    const gridG = new Graphics();
    this.gridColor = opts.gridColor ?? 0xf0f0f0;
    drawGrid(gridG, this.gridColor);
    this.root.addChild(gridG);
    this.g = new Graphics();
    this.root.addChild(this.g);
    this.world = new World();
    this.rng = rng;
    this.cb = cb;
    this.mapper = mapper;
    this.mode = opts.mode;
    this.waves = opts.waves;
    this.stageIndex = opts.stageIndex ?? 0;
    this.activeSkills = opts.activeSkills ?? [];
    this.theme = opts.theme;
    this.avatarId = spawnAvatar(this.world, opts.activeSkin ?? "triangle");
    this.waveIdx = 0;
    this.wave = newWaveState(this.waves[this.waveIdx]!);
    resetStatusPhase();

    this.boundOnDown = (ev) => this.onPointerDown(ev);
    this.boundOnMove = (ev) => this.onPointerMove(ev);
    this.boundOnUp = (ev) => this.onPointerUp(ev);
    this.updateHud();
  }

  enter(): void {
    const t = this.mapper.target;
    t.addEventListener("pointerdown", this.boundOnDown);
    t.addEventListener("pointermove", this.boundOnMove);
    t.addEventListener("pointerup", this.boundOnUp);
    t.addEventListener("pointercancel", this.boundOnUp);
  }

  exit(): void {
    this.tracking = false;
    const t = this.mapper.target;
    t.removeEventListener("pointerdown", this.boundOnDown);
    t.removeEventListener("pointermove", this.boundOnMove);
    t.removeEventListener("pointerup", this.boundOnUp);
    t.removeEventListener("pointercancel", this.boundOnUp);
  }

  advanceToNextWave(): void {
    if (this.mode === "normal" && this.waveIdx + 1 >= this.waves.length) return;

    this.waveIdx += 1;

    if (this.mode === "survival") {
      // Dynamically generate the next wave.
      const spec = survivalWaveSpec(this.waveIdx + 1, this.rng);
      this.wave = newWaveState(spec);
    } else {
      this.wave = newWaveState(this.waves[this.waveIdx]!);
    }
    this.ended = false;
    this.bossApplied = false;
    this.updateHud();
  }

  recordPick(card: Card): void {
    this.picks.push(card);
  }

  currentWave1(): number {
    return this.waveIdx + 1;
  }

  totalWaves(): number {
    return this.mode === "survival" ? this.waveIdx + 1 : this.waves.length;
  }

  /** Activate a primal skill by index. */
  activateSkill(index: number): void {
    const sk = this.activeSkills[index];
    if (!sk) return;
    if (!activateSkill(sk)) return;

    if (sk.id === "shadowClone") {
      this.spawnClone(sk);
    } else if (sk.id === "barrage") {
      this.fireBarrage(sk);
    } else if (sk.id === "axisFreeze") {
      this.triggerAxisFreeze(sk);
    } else if (sk.id === "overload") {
      this.triggerOverload(sk);
    }
  }

  buildRunResult(): RunResult {
    return {
      mode: this.mode,
      stageIndex: this.stageIndex,
      wavesCleared: this.waveIdx + 1,
      totalKills: this.runKills,
      bossKills: this.runBossKills,
      pointsEarned: this.runPoints,
      loot: this.loot,
      noPowerRun: this.picks.length === 0,
    };
  }

  update(dt: number): void {
    if (this.ended) return;

    // Tick primal skills.
    const timeStopActive = this.activeSkills.some((s) => s.id === "timeStop" && s.active > 0);
    const slowMul = timeStopActive ? timeStopSpeedMul(0) : 1;
    for (const sk of this.activeSkills) tickSkillState(sk, dt);

    // Effective dt for enemies when time-stop is active.
    const enemyDt = dt * slowMul;

    updateWave(this.wave, this.world, this.rng, dt);

    // Boss application (normal mode last wave, or survival mirror waves).
    const wave1 = this.waveIdx + 1;
    const shouldApplyBoss =
      this.mode === "normal"
        ? wave1 === this.waves.length
        : isMirrorBossWave(wave1);
    if (shouldApplyBoss && !this.bossApplied) {
      this.applyBossOnce();
    }

    // Apply mode-specific scaling to newly spawned enemies after mirror stats.
    if (this.mode === "survival") {
      this.applySurvivalScaling();
    } else {
      this.applyNormalStageScaling();
    }

    updateAvatarMotion(this.world, dt);
    updateEnemyAi(this.world, this.avatarId, enemyDt, this.rng);
    updateProjectileMotion(this.world, dt);
    updateWeapon(this.world, this.avatarId, this.rng, dt);
    updateBossWeapon(this.world, this.avatarId, this.rng, enemyDt);

    // Shadow clone weapon
    if (this.cloneId !== null) {
      const clone = this.world.get(this.cloneId);
      if (clone) {
        updateWeapon(this.world, this.cloneId, this.rng, dt);
        // Move clone to follow avatar
        const avatar = this.world.get(this.avatarId);
        if (avatar?.pos && clone.avatar) {
          clone.avatar.targetX = avatar.pos.x + 20;
          clone.avatar.targetY = avatar.pos.y + 20;
        }
        updateAvatarMotion(this.world, dt);
      }
      // Check if clone should expire (managed by skill state)
      const cloneSkill = this.activeSkills.find((s) => s.id === "shadowClone");
      if (!cloneSkill || cloneSkill.active <= 0) {
        if (this.cloneId !== null) {
          this.world.remove(this.cloneId);
          this.cloneId = null;
        }
      }
    }

    // Reflect shield: grant invincibility while active
    const reflectActive = this.activeSkills.some((s) => s.id === "reflectShield" && s.active > 0);
    {
      const avatar = this.world.get(this.avatarId);
      if (avatar?.avatar) {
        if (reflectActive && avatar.avatar.iframes < 1) {
          avatar.avatar.iframes = 1; // keep refreshed while shield is active
        }
      }
    }

    // Lifesteal pulse: damage nearby enemies and heal avatar every ~1 second
    const lifestealSkill = this.activeSkills.find((s) => s.id === "lifestealPulse" && s.active > 0);
    if (lifestealSkill) {
      this.lifestealTick += dt;
      if (this.lifestealTick >= 1) {
        this.lifestealTick -= 1;
        const avatar = this.world.get(this.avatarId);
        if (avatar?.pos && avatar.avatar) {
          const radius = lifestealRadius(lifestealSkill.level);
          const dmg = lifestealDamage(lifestealSkill.level);
          const heal = lifestealHeal(lifestealSkill.level);
          let healed = false;
          for (const [, c] of this.world.with("pos", "hp", "enemy")) {
            const dx = c.pos!.x - avatar.pos.x;
            const dy = c.pos!.y - avatar.pos.y;
            if (dx * dx + dy * dy <= radius * radius) {
              c.hp!.value -= dmg;
              healed = true;
            }
          }
          if (healed) {
            avatar.avatar.hp = Math.min(avatar.avatar.maxHp, avatar.avatar.hp + heal);
          }
        }
      }
    } else {
      this.lifestealTick = 0;
    }

    // Axis Freeze: stun all enemies while active
    const axisFreezeActive = this.activeSkills.some((s) => s.id === "axisFreeze" && s.active > 0);
    if (axisFreezeActive) {
      for (const [, c] of this.world.with("pos", "enemy")) {
        // Stun: zero out velocity while active
        if (c.vel) { c.vel.x = 0; c.vel.y = 0; }
        // Snap position to the nearest cardinal axis relative to arena center
        if (c.pos) {
          const cx = PLAY_W / 2, cy = PLAY_H / 2;
          const dx = Math.abs(c.pos.x - cx);
          const dy = Math.abs(c.pos.y - cy);
          if (dx < dy) c.pos.x = cx; // snap to vertical axis
          else c.pos.y = cy;          // snap to horizontal axis
        }
      }
    }

    // Overload: triple fire rate while active (applied as weapon period modifier)
    const overloadSkill = this.activeSkills.find((s) => s.id === "overload" && s.active > 0);
    if (overloadSkill && !this.overloadApplied) {
      const avatar = this.world.get(this.avatarId);
      if (avatar?.weapon) {
        this.savedWeaponPeriod = avatar.weapon.period;
        avatar.weapon.period *= 0.33; // triple fire rate
        this.overloadApplied = true;
      }
    } else if (!overloadSkill && this.overloadApplied) {
      // Overload ended — restore fire rate and apply self-damage
      const avatar = this.world.get(this.avatarId);
      if (avatar?.weapon && this.savedWeaponPeriod > 0) {
        avatar.weapon.period = this.savedWeaponPeriod;
      }
      if (avatar?.avatar) {
        avatar.avatar.hp = Math.max(1, avatar.avatar.hp - 1);
      }
      this.overloadApplied = false;
      this.savedWeaponPeriod = 0;
    }

    let died = false;
    const events: import("../game/events").GameEvents = {
      onEnemyKilled: (eid: EntityId) => {
        playSfx("hit");
        this.onEnemyKilled(eid);
        this.tickCombustion(events);
      },
      onPlayerDied: () => { died = true; },
    };
    updateCollisions(this.world, this.avatarId, events, this.rng);
    updateStatusEffects(this.world, enemyDt, events);
    removeDeadEnemies(this.world);
    decayHitFlash(this.world, dt);

    this.updateHud();

    if (died) {
      this.ended = true;
      this.cb.onRunComplete(this.buildRunResult());
      this.cb.onPlayerDied();
      return;
    }

    if (this.wave.cleared) {
      const cleared = this.waveIdx + 1;
      if (this.mode === "normal" && cleared >= this.waves.length) {
        this.ended = true;
        this.cb.onRunComplete(this.buildRunResult());
        this.cb.onRunWon();
      } else {
        // Wave clear grants a draft token, awarded before the draft screen
        // opens so reroll is affordable on the very first draft.
        this.draftTokens += 1;
        this.cb.onWaveCleared(cleared);
      }
    }
  }

  render(_alpha: number): void {
    drawWorld(this.g, this.world, this.theme);
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private onEnemyKilled(eid: EntityId): void {
    const ec = this.world.get(eid);
    if (!ec?.enemy) return;
    const kind = ec.enemy.kind;
    const pts = killPointsForEnemy(kind, this.mode, this.stageIndex);
    this.runPoints += pts;
    this.runKills += 1;

    if (ec.enemy.isElite) {
      this.runEliteKills += 1;
      this.draftTokens += 1;
    }

    if (kind === "boss") {
      this.runBossKills += 1;
      // Boss wave bonus
      this.runPoints += BOSS_WAVE_BONUS * (this.waveIdx + 1);
      // Roll loot
      const drop = rollBossLoot(this.rng);
      this.loot.push(drop);
      if (drop.kind === "points") this.runPoints += drop.value;
    }
  }

  private tickCombustion(events: import("../game/events").GameEvents): void {
    const a = this.world.get(this.avatarId);
    const pos = a?.pos;
    const synergies = a?.avatar?.synergies;
    if (!pos || !synergies) return;
    const cfg = SYNERGY_CONFIG.combustion;
    for (const s of synergies) {
      if (s.id !== "combustion") continue;
      s.killCounter = (s.killCounter ?? 0) + 1;
      if (s.killCounter >= cfg.interval) {
        // Reset before firing so chain-kills start a fresh cycle and we can't
        // re-trigger this same blast recursively.
        s.killCounter = 0;
        explodeAt(this.world, pos.x, pos.y, cfg.radius, cfg.damage, events);
      }
    }
  }

  private applyBossOnce(): void {
    const bossDef = this.mode === "survival"
      ? bossForStage(2)   // survival always uses Mirror
      : bossForStage(this.stageIndex);
    const spec: BossSpec = bossDef.buildSpec(this.picks);
    for (const [, c] of this.world.with("enemy", "hp")) {
      if (c.enemy!.kind !== "boss") continue;
      bossDef.install(c, spec);
      this.bossApplied = true;
      this.cb.onBossWaveStart?.(this.waveIdx + 1);
      return;
    }
  }

  private applySurvivalScaling(): void {
    const wave1 = this.waveIdx + 1;
    const hpMul = survivalHpScale(wave1);
    const spdMul = survivalSpeedScale(wave1);
    for (const [, c] of this.world.with("enemy", "hp")) {
      if (c.enemy!.kind === "boss") continue;
      if (c.enemy!.scaled) continue;
      c.hp!.value = Math.ceil(c.hp!.value * hpMul);
      c.enemy!.maxSpeed *= spdMul;
      c.enemy!.scaled = true;
    }
  }

  private applyNormalStageScaling(): void {
    // `stageIndex` is 0-based (0=stage 1, 1=stage 2, 2=stage 3).
    const stageMul = this.stageIndex >= 0 && this.stageIndex < NORMAL_STAGE_STRENGTH_MUL.length
      ? NORMAL_STAGE_STRENGTH_MUL[this.stageIndex]!
      : 1;
    for (const [, c] of this.world.with("enemy", "hp")) {
      if (c.enemy!.scaled) continue;
      // Boss stats are set by BossDef.install — skip stage scaling for bosses.
      if (c.enemy!.kind === "boss") { c.enemy!.scaled = true; continue; }
      c.hp!.value = Math.max(1, Math.ceil(c.hp!.value * stageMul));
      c.enemy!.maxSpeed *= stageMul;
      c.enemy!.contactDamage = Math.max(1, Math.ceil(c.enemy!.contactDamage * stageMul));
      if (c.weapon) c.weapon.damage = Math.max(1, Math.ceil(c.weapon.damage * stageMul));
      c.enemy!.scaled = true;
    }
  }

  private spawnClone(sk: ActiveSkillState): void {
    const avatar = this.world.get(this.avatarId);
    if (!avatar?.pos || !avatar.weapon || !avatar.avatar) return;
    const ratio = cloneInheritRatio(sk.level);
    this.cloneId = this.world.create({
      pos: { x: avatar.pos.x + 20, y: avatar.pos.y + 20 },
      vel: { x: 0, y: 0 },
      radius: 8,
      team: "player",
      avatar: {
        hp: 1,
        maxHp: 1,
        speedMul: avatar.avatar.speedMul,
        iframes: 999, // clones can't be hit
        targetX: avatar.pos.x + 20,
        targetY: avatar.pos.y + 20,
      },
      weapon: {
        period: avatar.weapon.period / ratio,
        damage: Math.max(1, Math.floor(avatar.weapon.damage * ratio)),
        projectileSpeed: avatar.weapon.projectileSpeed,
        projectiles: Math.max(1, Math.floor(avatar.weapon.projectiles * ratio)),
        pierce: avatar.weapon.pierce,
        crit: avatar.weapon.crit * ratio,
        cooldown: 0.3,
        ricochet: avatar.weapon.ricochet,
        chain: avatar.weapon.chain,
        burnDps: avatar.weapon.burnDps * ratio,
        burnDuration: avatar.weapon.burnDuration,
        slowPct: avatar.weapon.slowPct,
        slowDuration: avatar.weapon.slowDuration,
      },
    });
  }

  /** Fire a burst of projectiles in all directions. */
  private fireBarrage(sk: ActiveSkillState): void {
    const avatar = this.world.get(this.avatarId);
    if (!avatar?.pos) return;
    const count = barrageProjectiles(sk.level);
    const dmg = barrageDamage(sk.level);
    const speed = 250;
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count;
      this.world.create({
        pos: { x: avatar.pos.x, y: avatar.pos.y },
        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        radius: 3,
        team: "projectile",
        projectile: {
          damage: dmg,
          crit: false,
          pierceRemaining: 1,
          ricochetRemaining: 0,
          chainRemaining: 0,
          burnDps: 0,
          burnDuration: 0,
          slowPct: 0,
          slowDuration: 0,
          hitIds: new Set(),
          ttl: 1.2,
        },
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private triggerAxisFreeze(_sk: ActiveSkillState): void {
    // Axis freeze is handled in the main update loop; activation is enough.
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private triggerOverload(_sk: ActiveSkillState): void {
    // Overload fire-rate boost is applied in the main update loop on activation.
  }

  private updateHud(): void {
    const c = this.world.get(this.avatarId);
    const hp = c?.avatar?.hp ?? 0;
    const maxHp = c?.avatar?.maxHp ?? 0;
    this.cb.updateHud(hp, maxHp, this.waveIdx + 1, this.totalWaves(), this.runPoints, this.draftTokens);
  }

  private onPointerDown(ev: PointerEvent): void {
    this.tracking = true;
    this.mapper.target.setPointerCapture?.(ev.pointerId);
    this.setAvatarTarget(ev.clientX, ev.clientY);
  }

  private onPointerMove(ev: PointerEvent): void {
    if (!this.tracking) return;
    this.setAvatarTarget(ev.clientX, ev.clientY);
  }

  private onPointerUp(ev: PointerEvent): void {
    this.tracking = false;
    this.mapper.target.releasePointerCapture?.(ev.pointerId);
  }

  private setAvatarTarget(clientX: number, clientY: number): void {
    const p = this.mapper.clientToPlay(clientX, clientY);
    const a = this.world.get(this.avatarId)?.avatar;
    if (!a) return;
    a.targetX = p.x;
    a.targetY = p.y;
  }
}
