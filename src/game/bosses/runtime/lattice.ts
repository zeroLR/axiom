import { spawnEnemyShot } from "../../entities";
import type { Rng } from "../../rng";
import type { Components, World } from "../../world";

/** Seconds the axis telegraph shows before firing. */
const LATTICE_TELEGRAPH_SECS = 0.7;
/** Seconds between Lattice attack cycles. */
const LATTICE_CYCLE_PERIOD = 1.6;
/** Projectile speed for grid axis shots. */
const LATTICE_SHOT_SPEED = 200;
/** Number of projectiles per axis line. */
const LATTICE_SHOTS_PER_LINE = 4;
/** Spread between projectiles on an axis (radians). */
const LATTICE_SHOT_SPREAD = 0.08;

export function updateLatticePattern(
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

  const maxHp = 320;
  if (!e.bossEnraged && hp.value <= maxHp * 0.5) {
    e.bossEnraged = true;
  }

  e.bossTimer -= dt;
  if (e.bossTimer > 0) return;

  switch (e.bossPhase) {
    case 0: {
      // Telegraph cardinal + optional diagonal axes
      const cardinalAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
      const diagAngles = [
        Math.PI / 4,
        (3 * Math.PI) / 4,
        (-3 * Math.PI) / 4,
        -Math.PI / 4,
      ];
      e.bossTelegraphLines = e.bossEnraged
        ? [...cardinalAngles, ...diagAngles]
        : cardinalAngles;
      e.bossPhase = 1;
      e.bossTimer = LATTICE_TELEGRAPH_SECS;
      break;
    }
    case 1: {
      // Fire grid volleys along telegraphed axes
      const angles = e.bossTelegraphLines ?? [
        0, Math.PI / 2, Math.PI, -Math.PI / 2,
      ];
      for (const baseAngle of angles) {
        for (let i = 0; i < LATTICE_SHOTS_PER_LINE; i++) {
          const offset =
            (i - (LATTICE_SHOTS_PER_LINE - 1) / 2) * LATTICE_SHOT_SPREAD;
          const a = baseAngle + offset;
          const vx = Math.cos(a) * LATTICE_SHOT_SPEED;
          const vy = Math.sin(a) * LATTICE_SHOT_SPEED;
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
      e.bossTimer = LATTICE_CYCLE_PERIOD * (e.bossEnraged ? 0.65 : 1);
      break;
    }
    case 2: {
      // Aimed fan at player; on enrage also fires a homing shot
      const baseAngle = Math.atan2(ay - c.pos!.y, ax - c.pos!.x);
      fireAimedFan(world, c, baseAngle, rng);
      if (e.bossEnraged) {
        const id = spawnEnemyShot(
          world,
          c.pos!.x,
          c.pos!.y,
          Math.cos(baseAngle) * 180,
          Math.sin(baseAngle) * 180,
          c.weapon!.damage,
          false,
        );
        const sc = world.get(id);
        if (sc?.projectile) sc.projectile.homingAvatar = true;
      }
      e.bossPhase = 0;
      e.bossTimer = 0.2;
      break;
    }
  }
}
