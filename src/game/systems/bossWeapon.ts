import { PLAY_H, PLAY_W } from "../config";
import { spawnEnemyShot } from "../entities";
import type { Rng } from "../rng";
import type { Components, EntityId, World } from "../world";

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
const ORTHO_SHOT_SPREAD = 0.10;

// ── Jets tuning ─────────────────────────────────────────────────────────────
/** Pause between Jets actions (seconds). */
const JETS_ACTION_PAUSE = 1.2;
/** Number of scatter projectiles during enrage burst. */
const JETS_SCATTER_COUNT = 8;
/** Scatter projectile speed. */
const JETS_SCATTER_SPEED = 150;
/** Enrage speed multiplier (≤50% HP). */
const JETS_ENRAGE_SPEED_MUL = 1.5;

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

  for (const [, c] of world.with("enemy", "weapon", "pos", "hp")) {
    if (c.enemy!.kind !== "boss") continue;
    if (c.hp!.value <= 0) continue;

    const pattern = c.enemy!.bossPattern ?? "standard";
    switch (pattern) {
      case "orthogon":
        updateOrthogonPattern(world, c, ax, ay, rng, dt);
        break;
      case "jets":
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
  world: World, c: Components, ax: number, ay: number, rng: Rng, dt: number,
): void {
  const w = c.weapon!;
  w.cooldown -= dt;

  // Snapshot the aim once the lead window opens.
  if (w.cooldown <= BOSS_TELEGRAPH_LEAD && c.enemy!.telegraphAngle === undefined) {
    c.enemy!.telegraphAngle = Math.atan2(ay - c.pos!.y, ax - c.pos!.x);
  }
  if (w.cooldown > 0) return;

  const baseAngle = c.enemy!.telegraphAngle ?? Math.atan2(ay - c.pos!.y, ax - c.pos!.x);
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
  world: World, c: Components, ax: number, ay: number, rng: Rng, dt: number,
): void {
  const e = c.enemy!;
  const hp = c.hp!;
  if (e.bossTimer === undefined) e.bossTimer = 0;
  if (e.bossPhase === undefined) e.bossPhase = 0;

  // Check enrage
  const maxHp = 45; // from buildSpec
  if (!e.bossEnraged && hp.value <= maxHp * 0.5) {
    e.bossEnraged = true;
  }

  e.bossTimer -= dt;
  if (e.bossTimer > 0) return;

  switch (e.bossPhase) {
    case 0: {
      // Idle → start telegraph
      const cardinalAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
      const diagAngles = [Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4, -Math.PI / 4];
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
      const angles = e.bossTelegraphLines ?? [0, Math.PI / 2, Math.PI, -Math.PI / 2];
      for (const baseAngle of angles) {
        for (let i = 0; i < ORTHO_SHOTS_PER_LINE; i++) {
          const offset = (i - (ORTHO_SHOTS_PER_LINE - 1) / 2) * ORTHO_SHOT_SPREAD;
          const a = baseAngle + offset;
          const vx = Math.cos(a) * ORTHO_SHOT_SPEED;
          const vy = Math.sin(a) * ORTHO_SHOT_SPEED;
          spawnEnemyShot(world, c.pos!.x, c.pos!.y, vx, vy, c.weapon!.damage, false);
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
// Cycle: side-wall dash → Z-sweep → aimed fan → repeat.
// At ≤50% HP: enrage — speed +50%, scatter burst after each action.
//
// bossPhase: 0 = pre-dash, 1 = dashing, 2 = Z-sweep, 3 = fan

function updateJetsPattern(
  world: World, c: Components, ax: number, ay: number, rng: Rng, dt: number,
): void {
  const e = c.enemy!;
  const hp = c.hp!;
  const p = c.pos!;
  if (e.bossTimer === undefined) e.bossTimer = JETS_ACTION_PAUSE;
  if (e.bossPhase === undefined) e.bossPhase = 0;

  // Check enrage
  const maxHp = 55; // from buildSpec
  if (!e.bossEnraged && hp.value <= maxHp * 0.5) {
    e.bossEnraged = true;
    e.maxSpeed *= JETS_ENRAGE_SPEED_MUL;
  }

  e.bossTimer -= dt;
  if (e.bossTimer > 0) return;

  switch (e.bossPhase) {
    case 0: {
      // Side-wall dash: teleport to one side, then dash to the other
      const startSide = p.x < PLAY_W / 2 ? 30 : PLAY_W - 30;
      const targetSide = startSide === 30 ? PLAY_W - 30 : 30;
      const dashY = Math.max(40, Math.min(PLAY_H * 0.6, ay));
      // Show telegraph line at dash height
      e.telegraphAngle = startSide < PLAY_W / 2 ? 0 : Math.PI;
      // Move to start position
      p.x = startSide;
      p.y = dashY;
      e.bossDashTarget = { x: targetSide, y: dashY };
      e.bossPhase = 1;
      e.bossTimer = BOSS_TELEGRAPH_LEAD; // telegraph before dash
      break;
    }
    case 1: {
      // Execute the dash — instant teleport to opposite wall
      e.telegraphAngle = undefined;
      const target = e.bossDashTarget ?? { x: PLAY_W - 30, y: PLAY_H / 2 };
      p.x = target.x;
      p.y = target.y;
      if (e.bossEnraged) fireScatterBurst(world, p.x, p.y, c.weapon!.damage, rng);
      e.bossPhase = 2;
      e.bossTimer = JETS_ACTION_PAUSE * (e.bossEnraged ? 0.6 : 1);
      break;
    }
    case 2: {
      // Z-sweep: rapid movement through waypoints, firing along the way
      const waypoints = [
        { x: 40, y: 50 },
        { x: PLAY_W - 40, y: 50 },
        { x: 40, y: PLAY_H * 0.35 },
        { x: PLAY_W - 40, y: PLAY_H * 0.35 },
      ];
      for (const wp of waypoints) {
        const angle = Math.atan2(ay - wp.y, ax - wp.x);
        spawnEnemyShot(world, wp.x, wp.y,
          Math.cos(angle) * c.weapon!.projectileSpeed,
          Math.sin(angle) * c.weapon!.projectileSpeed,
          c.weapon!.damage, false);
      }
      const last = waypoints[waypoints.length - 1]!;
      p.x = last.x;
      p.y = last.y;
      if (e.bossEnraged) fireScatterBurst(world, p.x, p.y, c.weapon!.damage, rng);
      e.bossPhase = 3;
      e.bossTimer = JETS_ACTION_PAUSE * (e.bossEnraged ? 0.6 : 1);
      break;
    }
    case 3: {
      // Aimed fan at player
      const baseAngle = Math.atan2(ay - p.y, ax - p.x);
      fireAimedFan(world, c, baseAngle, rng);
      if (e.bossEnraged) fireScatterBurst(world, p.x, p.y, c.weapon!.damage, rng);
      e.bossPhase = 0;
      e.bossTimer = JETS_ACTION_PAUSE * (e.bossEnraged ? 0.6 : 1);
      break;
    }
  }
}

// ── Shared helpers ──────────────────────────────────────────────────────────

function fireAimedFan(world: World, c: Components, baseAngle: number, rng: Rng): void {
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

function fireScatterBurst(world: World, x: number, y: number, damage: number, rng: Rng): void {
  const offsetAngle = rng() * Math.PI * 2;
  for (let i = 0; i < JETS_SCATTER_COUNT; i++) {
    const a = offsetAngle + (i / JETS_SCATTER_COUNT) * Math.PI * 2;
    const vx = Math.cos(a) * JETS_SCATTER_SPEED;
    const vy = Math.sin(a) * JETS_SCATTER_SPEED;
    spawnEnemyShot(world, x, y, vx, vy, damage, false);
  }
}
