import { ENEMY_SEEK_ACCEL, PLAY_H, PLAY_W } from '../config';
import { spawnEnemyShot } from '../entities';
import type { Rng } from '../rng';
import type { Components, EntityId, World } from '../world';

/** Fan half-spread (radians) between adjacent projectiles. */
export const BOSS_FAN_SPREAD = 0.22;
/**
 * Seconds of lead time between the telegraph appearing and the actual shot.
 * Matches concept.md § "偏離表" — boss skills must be readable before firing.
 */
export const BOSS_TELEGRAPH_LEAD = 0.8;

// ── Orthogon tuning ─────────────────────────────────────────────────────────
/** Seconds the axis telegraph shows before firing. */
const ORTHO_TELEGRAPH_SECS = 0.8;
/** Seconds between Orthogon attack cycles. */
const ORTHO_CYCLE_PERIOD = 2.2;
/** Projectile speed for axis shots. */
const ORTHO_SHOT_SPEED = 190;
/** Number of projectiles per axis line. */
const ORTHO_SHOTS_PER_LINE = 3;
/** Spread between projectiles on an axis (radians). */
const ORTHO_SHOT_SPREAD = 0.1;

// ── Jets tuning ─────────────────────────────────────────────────────────────
/** Pause between Jets actions (seconds). */
const JETS_ACTION_PAUSE = 1.2;
/** Number of scatter projectiles during enrage burst. */
const JETS_SCATTER_COUNT = 8;
/** Scatter projectile speed. */
const JETS_SCATTER_SPEED = 150;
/** Enrage speed multiplier (≤50% HP). */
const JETS_ENRAGE_SPEED_MUL = 1.5;
/** Normal glide speed when repositioning to dash-start. */
const JETS_GLIDE_SPEED = 200;
/** Fast dash speed across the playfield. */
const JETS_DASH_SPEED = 650;
/** Z-sweep glide speed between waypoints. */
const JETS_SWEEP_SPEED = 280;
/** Arrival distance threshold (px). */
const JETS_ARRIVE_DIST = 8;
/** Telegraph hold time before dash (seconds). */
const JETS_DASH_TELEGRAPH_SECS = 0.5;

/** Z-sweep waypoints traversed in order, firing one aimed shot at each. */
const JETS_ZSWEEP_WPS: readonly { x: number; y: number }[] = [
  { x: 40, y: 50 },
  { x: PLAY_W - 40, y: 50 },
  { x: 40, y: PLAY_H * 0.35 },
  { x: PLAY_W - 40, y: PLAY_H * 0.35 },
];

// ── Main entry point ────────────────────────────────────────────────────────

export function updateBossWeapon(
  world: World,
  avatarId: EntityId,
  rng: Rng,
  dt: number,
): void {
  const avatar = world.get(avatarId);
  if (!avatar?.pos) return;
  const ax = avatar.pos.x;
  const ay = avatar.pos.y;

  for (const [, c] of world.with('enemy', 'weapon', 'pos', 'hp')) {
    if (c.enemy!.kind !== 'boss') continue;
    if (c.hp!.value <= 0) continue;

    const pattern = c.enemy!.bossPattern ?? 'standard';
    switch (pattern) {
      case 'orthogon':
        updateOrthogonPattern(world, c, ax, ay, rng, dt);
        break;
      case 'jets':
        updateJetsPattern(world, c, ax, ay, rng, dt);
        break;
      default:
        updateStandardPattern(world, c, ax, ay, rng, dt);
        break;
    }
  }
}

// ── Standard (Mirror / fallback) ────────────────────────────────────────────

function updateStandardPattern(
  world: World,
  c: Components,
  ax: number,
  ay: number,
  rng: Rng,
  dt: number,
): void {
  const w = c.weapon!;
  w.cooldown -= dt;

  // Snapshot the aim once the lead window opens.
  if (
    w.cooldown <= BOSS_TELEGRAPH_LEAD &&
    c.enemy!.telegraphAngle === undefined
  ) {
    c.enemy!.telegraphAngle = Math.atan2(ay - c.pos!.y, ax - c.pos!.x);
  }
  if (w.cooldown > 0) return;

  const baseAngle =
    c.enemy!.telegraphAngle ?? Math.atan2(ay - c.pos!.y, ax - c.pos!.x);
  c.enemy!.telegraphAngle = undefined;

  fireAimedFan(world, c, baseAngle, rng);
  w.cooldown = w.period;
}

// ── Orthogon AI ─────────────────────────────────────────────────────────────
//
// Cycle: telegraph → fire axis shots → pause → aimed fan → repeat.
// Cardinal axes (up/down/left/right). At ≤50% HP also fires diagonals.
//
// bossPhase: 0 = idle/pause, 1 = telegraph, 2 = fire+pause, 3 = fan

function updateOrthogonPattern(
  world: World,
  c: Components,
  ax: number,
  ay: number,
  rng: Rng,
  dt: number,
): void {
  const e = c.enemy!;
  const hp = c.hp!;
  if (e.bossTimer === undefined) e.bossTimer = 0;
  if (e.bossPhase === undefined) e.bossPhase = 0;

  // Check enrage
  const maxHp = 135; // from orthogon buildSpec
  if (!e.bossEnraged && hp.value <= maxHp * 0.5) {
    e.bossEnraged = true;
  }

  e.bossTimer -= dt;
  if (e.bossTimer > 0) return;

  switch (e.bossPhase) {
    case 0: {
      // Idle → start telegraph
      const cardinalAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
      const diagAngles = [
        Math.PI / 4,
        (3 * Math.PI) / 4,
        (-3 * Math.PI) / 4,
        -Math.PI / 4,
      ];
      const angles = e.bossEnraged
        ? [...cardinalAngles, ...diagAngles]
        : cardinalAngles;
      e.bossTelegraphLines = angles;
      e.bossPhase = 1;
      e.bossTimer = ORTHO_TELEGRAPH_SECS;
      break;
    }
    case 1: {
      // Telegraph done → fire axis shots
      const angles = e.bossTelegraphLines ?? [
        0,
        Math.PI / 2,
        Math.PI,
        -Math.PI / 2,
      ];
      for (const baseAngle of angles) {
        for (let i = 0; i < ORTHO_SHOTS_PER_LINE; i++) {
          const offset =
            (i - (ORTHO_SHOTS_PER_LINE - 1) / 2) * ORTHO_SHOT_SPREAD;
          const a = baseAngle + offset;
          const vx = Math.cos(a) * ORTHO_SHOT_SPEED;
          const vy = Math.sin(a) * ORTHO_SHOT_SPEED;
          spawnEnemyShot(
            world,
            c.pos!.x,
            c.pos!.y,
            vx,
            vy,
            c.weapon!.damage,
            false,
          );
        }
      }
      e.bossTelegraphLines = undefined;
      e.bossPhase = 2;
      e.bossTimer = ORTHO_CYCLE_PERIOD * (e.bossEnraged ? 0.75 : 1);
      break;
    }
    case 2: {
      // Pause → fire aimed fan at player
      const baseAngle = Math.atan2(ay - c.pos!.y, ax - c.pos!.x);
      fireAimedFan(world, c, baseAngle, rng);
      e.bossPhase = 0;
      e.bossTimer = 0.3;
      break;
    }
  }
}

// ── Jets AI ─────────────────────────────────────────────────────────────────
//
// Cycle: idle → glide-to-start → telegraph(0.5s) → fast-dash → Z-sweep → fan.
// All position changes use smooth velocity-based movement (no teleporting).
//
// Phases:
//   0  idle / seek player (timer countdown before dash sequence)
//   1  glide to dash-start wall position
//   2  telegraph hold (bossTelegraphLines set, 0.5s)
//   3  fast dash to opposite wall
//   4  Z-sweep: glide through waypoints, fire at each (bossWaypointIdx tracks)
//   5  aimed fan shot at player, then back to phase 0

/** Move pos toward (tx,ty) at speed px/s. Returns true when arrived. */
function glideToward(
  p: { x: number; y: number },
  v: { x: number; y: number },
  tx: number,
  ty: number,
  speed: number,
  dt: number,
): boolean {
  const dx = tx - p.x;
  const dy = ty - p.y;
  const dist = Math.hypot(dx, dy);
  if (dist < JETS_ARRIVE_DIST) {
    p.x = tx;
    p.y = ty;
    v.x = 0;
    v.y = 0;
    return true;
  }
  // Clamp step so we cannot overshoot in a single frame.
  const s = Math.min(speed, dist / dt);
  v.x = (dx / dist) * s;
  v.y = (dy / dist) * s;
  p.x += v.x * dt;
  p.y += v.y * dt;
  return false;
}

function updateJetsPattern(
  world: World,
  c: Components,
  ax: number,
  ay: number,
  rng: Rng,
  dt: number,
): void {
  const e = c.enemy!;
  const hp = c.hp!;
  const p = c.pos!;
  const v = c.vel ?? { x: 0, y: 0 };
  if (e.bossTimer === undefined) e.bossTimer = JETS_ACTION_PAUSE;
  if (e.bossPhase === undefined) e.bossPhase = 0;

  // Check enrage (≤50% of base HP).
  const maxHp = 250;
  if (!e.bossEnraged && hp.value <= maxHp * 0.5) {
    e.bossEnraged = true;
    e.maxSpeed *= JETS_ENRAGE_SPEED_MUL;
  }
  const enrageScale = e.bossEnraged ? JETS_ENRAGE_SPEED_MUL : 1;
  const pauseMul = e.bossEnraged ? 0.6 : 1;

  // ── Per-frame: glide toward bossDashTarget ─────────────────────────────
  if (e.bossDashTarget !== undefined) {
    const speed =
      e.bossPhase === 3
        ? JETS_DASH_SPEED * enrageScale
        : e.bossPhase === 4
          ? JETS_SWEEP_SPEED * enrageScale
          : JETS_GLIDE_SPEED * enrageScale;

    const arrived = glideToward(
      p,
      v,
      e.bossDashTarget.x,
      e.bossDashTarget.y,
      speed,
      dt,
    );
    if (arrived) {
      e.bossDashTarget = undefined;
      switch (e.bossPhase) {
        case 1: {
          // Arrived at dash-start → telegraph: one line toward dash end.
          const endX = p.x < PLAY_W / 2 ? PLAY_W - 30 : 30;
          const dashAngle = endX > p.x ? 0 : Math.PI;
          e.bossTelegraphLines = [dashAngle];
          e.bossPhase = 2;
          e.bossTimer = JETS_DASH_TELEGRAPH_SECS;
          break;
        }
        case 3: {
          // Arrived at dash-end → scatter burst (if enraged), start Z-sweep.
          if (e.bossEnraged)
            fireScatterBurst(world, p.x, p.y, c.weapon!.damage, rng);
          e.bossWaypointIdx = 0;
          e.bossDashTarget = { ...JETS_ZSWEEP_WPS[0]! };
          e.bossPhase = 4;
          break;
        }
        case 4: {
          // Arrived at a Z-sweep waypoint → fire aimed shot, advance.
          const angle = Math.atan2(ay - p.y, ax - p.x);
          spawnEnemyShot(
            world,
            p.x,
            p.y,
            Math.cos(angle) * c.weapon!.projectileSpeed,
            Math.sin(angle) * c.weapon!.projectileSpeed,
            c.weapon!.damage,
            false,
          );
          const nextIdx = (e.bossWaypointIdx ?? 0) + 1;
          e.bossWaypointIdx = nextIdx;
          if (nextIdx < JETS_ZSWEEP_WPS.length) {
            e.bossDashTarget = { ...JETS_ZSWEEP_WPS[nextIdx]! };
          } else {
            // Z-sweep complete → scatter (if enraged), then fan phase.
            if (e.bossEnraged)
              fireScatterBurst(world, p.x, p.y, c.weapon!.damage, rng);
            e.bossPhase = 5;
            e.bossTimer = JETS_ACTION_PAUSE * pauseMul;
          }
          break;
        }
      }
    }
    return; // skip timer logic while gliding
  }

  // ── Phase 0: idle — gently seek player ────────────────────────────────
  if (e.bossPhase === 0) {
    const sdx = ax - p.x;
    const sdy = ay - p.y;
    const sdist = Math.hypot(sdx, sdy) || 1;
    const targetVx = (sdx / sdist) * e.maxSpeed;
    const targetVy = (sdy / sdist) * e.maxSpeed;
    const dvx = targetVx - v.x;
    const dvy = targetVy - v.y;
    const dvLen = Math.hypot(dvx, dvy);
    const maxStep = ENEMY_SEEK_ACCEL * dt;
    if (dvLen <= maxStep) {
      v.x = targetVx;
      v.y = targetVy;
    } else {
      v.x += (dvx / dvLen) * maxStep;
      v.y += (dvy / dvLen) * maxStep;
    }
    p.x += v.x * dt;
    p.y += v.y * dt;
    p.x = Math.max(-30, Math.min(PLAY_W + 30, p.x));
    p.y = Math.max(-30, Math.min(PLAY_H + 30, p.y));
  }

  // ── Timer countdown ────────────────────────────────────────────────────
  e.bossTimer -= dt;
  if (e.bossTimer > 0) return;

  // ── Phase transitions (timer expired) ─────────────────────────────────
  switch (e.bossPhase) {
    case 0: {
      // Begin dash sequence — glide to the nearer wall first.
      const startX = p.x < PLAY_W / 2 ? 30 : PLAY_W - 30;
      const dashY = Math.max(40, Math.min(PLAY_H * 0.6, ay));
      e.bossDashTarget = { x: startX, y: dashY };
      e.bossPhase = 1;
      break;
    }
    case 2: {
      // Telegraph done → fast dash to opposite wall.
      e.bossTelegraphLines = undefined;
      const endX = p.x < PLAY_W / 2 ? PLAY_W - 30 : 30;
      e.bossDashTarget = { x: endX, y: p.y };
      e.bossPhase = 3;
      break;
    }
    case 5: {
      // Fire aimed fan, return to idle.
      const baseAngle = Math.atan2(ay - p.y, ax - p.x);
      fireAimedFan(world, c, baseAngle, rng);
      if (e.bossEnraged)
        fireScatterBurst(world, p.x, p.y, c.weapon!.damage, rng);
      e.bossPhase = 0;
      e.bossTimer = JETS_ACTION_PAUSE * pauseMul;
      break;
    }
  }
}

// ── Shared helpers ──────────────────────────────────────────────────────────

function fireAimedFan(
  world: World,
  c: Components,
  baseAngle: number,
  rng: Rng,
): void {
  const w = c.weapon!;
  const n = Math.max(1, w.projectiles);
  const startAngle = baseAngle - (BOSS_FAN_SPREAD * (n - 1)) / 2;
  for (let i = 0; i < n; i++) {
    const a = startAngle + BOSS_FAN_SPREAD * i;
    const vx = Math.cos(a) * w.projectileSpeed;
    const vy = Math.sin(a) * w.projectileSpeed;
    const crit = rng() < w.crit;
    spawnEnemyShot(world, c.pos!.x, c.pos!.y, vx, vy, w.damage, crit);
  }
}

function fireScatterBurst(
  world: World,
  x: number,
  y: number,
  damage: number,
  rng: Rng,
): void {
  const offsetAngle = rng() * Math.PI * 2;
  for (let i = 0; i < JETS_SCATTER_COUNT; i++) {
    const a = offsetAngle + (i / JETS_SCATTER_COUNT) * Math.PI * 2;
    const vx = Math.cos(a) * JETS_SCATTER_SPEED;
    const vy = Math.sin(a) * JETS_SCATTER_SPEED;
    spawnEnemyShot(world, x, y, vx, vy, damage, false);
  }
}

// ── Mirror boss per-frame ability updates ───────────────────────────────────
// Handles shield regen, dodge cooldown / invincibility tick.
// Call once per frame alongside the other update systems.

/** Duration (seconds) of the mirror boss invincibility window per dodge. */
const MIRROR_DODGE_IFRAMES = 0.6;

export function updateMirrorBossAbilities(
  world: World,
  avatarId: EntityId,
  rng: Rng,
  dt: number,
): void {
  const avatar = world.get(avatarId);
  const ax = avatar?.pos?.x ?? 0;
  const ay = avatar?.pos?.y ?? 0;

  for (const [, c] of world.with('enemy', 'hp')) {
    if (c.enemy!.kind !== 'boss') continue;
    if (c.hp!.value <= 0) continue;
    const e = c.enemy!;

    // ── Shield regeneration ──────────────────────────────────────────────
    const shieldMax = e.mirrorShieldMax;
    if (shieldMax !== undefined && (e.shield ?? 0) < shieldMax) {
      const period = e.shieldRegenPeriod ?? 6;
      e.shieldRegenTimer = (e.shieldRegenTimer ?? 0) + dt;
      if (e.shieldRegenTimer >= period) {
        e.shield = Math.min(shieldMax, (e.shield ?? 0) + 1);
        e.shieldRegenTimer = 0;
      }
    }

    // ── Dodge invincibility tick-down ────────────────────────────────────
    if (e.mirrorIframes !== undefined && e.mirrorIframes > 0) {
      e.mirrorIframes = Math.max(0, e.mirrorIframes - dt);
    }

    // ── Dodge cooldown → trigger invincibility ───────────────────────────
    const dodgePeriod = e.mirrorDodgePeriod;
    if (dodgePeriod !== undefined && (e.mirrorIframes ?? 0) === 0) {
      e.mirrorDodgeCooldown = (e.mirrorDodgeCooldown ?? 0) + dt;
      if (e.mirrorDodgeCooldown >= dodgePeriod) {
        e.mirrorIframes = MIRROR_DODGE_IFRAMES;
        e.mirrorDodgeCooldown = 0;
      }
    }

    // ── Parallel homing weapon (mirrors Tracker) ─────────────────────────
    if (e.mirrorHomingShots && c.pos) {
      const period = e.mirrorHomingPeriod ?? 1.65;
      e.mirrorHomingCooldown = (e.mirrorHomingCooldown ?? period) - dt;
      if (e.mirrorHomingCooldown <= 0) {
        const baseAngle = Math.atan2(ay - c.pos.y, ax - c.pos.x);
        const w = c.weapon!;
        const pid = spawnEnemyShot(
          world,
          c.pos.x,
          c.pos.y,
          Math.cos(baseAngle) * w.projectileSpeed,
          Math.sin(baseAngle) * w.projectileSpeed,
          w.damage,
          rng() < w.crit,
        );
        const shot = world.get(pid);
        if (shot?.projectile) shot.projectile.homingAvatar = true;
        e.mirrorHomingCooldown = period;
      }
    }
  }
}
