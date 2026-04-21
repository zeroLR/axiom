import { ENEMY_SEEK_ACCEL, PLAY_H, PLAY_W } from "../../config";
import { spawnEnemyShot } from "../../entities";
import type { Rng } from "../../rng";
import type { Components, World } from "../../world";

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
  const s = Math.min(speed, dist / dt);
  v.x = (dx / dist) * s;
  v.y = (dy / dist) * s;
  p.x += v.x * dt;
  p.y += v.y * dt;
  return false;
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

export function updateJetsPattern(
  world: World,
  c: Components,
  ax: number,
  ay: number,
  rng: Rng,
  dt: number,
  fireAimedFan: (world: World, c: Components, baseAngle: number, rng: Rng) => void,
): void {
  const e = c.enemy!;
  const hp = c.hp!;
  const p = c.pos!;
  const v = c.vel ?? { x: 0, y: 0 };
  if (e.bossTimer === undefined) e.bossTimer = JETS_ACTION_PAUSE;
  if (e.bossPhase === undefined) e.bossPhase = 0;

  const maxHp = 250;
  if (!e.bossEnraged && hp.value <= maxHp * 0.5) {
    e.bossEnraged = true;
    e.maxSpeed *= JETS_ENRAGE_SPEED_MUL;
  }
  const enrageScale = e.bossEnraged ? JETS_ENRAGE_SPEED_MUL : 1;
  const pauseMul = e.bossEnraged ? 0.6 : 1;

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
          const endX = p.x < PLAY_W / 2 ? PLAY_W - 30 : 30;
          const dashAngle = endX > p.x ? 0 : Math.PI;
          e.bossTelegraphLines = [dashAngle];
          e.bossPhase = 2;
          e.bossTimer = JETS_DASH_TELEGRAPH_SECS;
          break;
        }
        case 3: {
          if (e.bossEnraged) {
            fireScatterBurst(world, p.x, p.y, c.weapon!.damage, rng);
          }
          e.bossWaypointIdx = 0;
          e.bossDashTarget = { ...JETS_ZSWEEP_WPS[0]! };
          e.bossPhase = 4;
          break;
        }
        case 4: {
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
            if (e.bossEnraged) {
              fireScatterBurst(world, p.x, p.y, c.weapon!.damage, rng);
            }
            e.bossPhase = 5;
            e.bossTimer = JETS_ACTION_PAUSE * pauseMul;
          }
          break;
        }
      }
    }
    return;
  }

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

  e.bossTimer -= dt;
  if (e.bossTimer > 0) return;

  switch (e.bossPhase) {
    case 0: {
      const startX = p.x < PLAY_W / 2 ? 30 : PLAY_W - 30;
      const dashY = Math.max(40, Math.min(PLAY_H * 0.6, ay));
      e.bossDashTarget = { x: startX, y: dashY };
      e.bossPhase = 1;
      break;
    }
    case 2: {
      e.bossTelegraphLines = undefined;
      const endX = p.x < PLAY_W / 2 ? PLAY_W - 30 : 30;
      e.bossDashTarget = { x: endX, y: p.y };
      e.bossPhase = 3;
      break;
    }
    case 5: {
      const baseAngle = Math.atan2(ay - p.y, ax - p.x);
      fireAimedFan(world, c, baseAngle, rng);
      if (e.bossEnraged) {
        fireScatterBurst(world, p.x, p.y, c.weapon!.damage, rng);
      }
      e.bossPhase = 0;
      e.bossTimer = JETS_ACTION_PAUSE * pauseMul;
      break;
    }
  }
}
