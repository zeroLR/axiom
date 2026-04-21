import { spawnEnemyShot } from "../../entities";
import type { Rng } from "../../rng";
import type { Components, World } from "../../world";

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

export function updateOrthogonPattern(
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
  if (e.bossTimer === undefined) e.bossTimer = 0;
  if (e.bossPhase === undefined) e.bossPhase = 0;

  const maxHp = 135;
  if (!e.bossEnraged && hp.value <= maxHp * 0.5) {
    e.bossEnraged = true;
  }

  e.bossTimer -= dt;
  if (e.bossTimer > 0) return;

  switch (e.bossPhase) {
    case 0: {
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
      const baseAngle = Math.atan2(ay - c.pos!.y, ax - c.pos!.x);
      fireAimedFan(world, c, baseAngle, rng);
      e.bossPhase = 0;
      e.bossTimer = 0.3;
      break;
    }
  }
}
