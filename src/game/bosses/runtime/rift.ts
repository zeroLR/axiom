import { PLAY_H, PLAY_W } from "../../config";
import { spawnEnemyShot } from "../../entities";
import type { Rng } from "../../rng";
import type { Components, World } from "../../world";

export function updateRiftPattern(
  world: World,
  c: Components,
  ax: number,
  ay: number,
  rng: Rng,
  dt: number,
  _fireAimedFan: (world: World, c: Components, baseAngle: number, rng: Rng) => void,
): void {
  const e = c.enemy!;
  const hp = c.hp!;
  if (e.bossTimer === undefined) e.bossTimer = 0;
  if (e.bossPhase === undefined) e.bossPhase = 0;
  if (e.bossWaypointIdx === undefined) e.bossWaypointIdx = 0;

  const maxHp = 460;
  if (!e.bossEnraged && hp.value <= maxHp * 0.5) {
    e.bossEnraged = true;
  }

  e.bossTimer -= dt;
  if (e.bossTimer > 0) return;

  switch (e.bossPhase) {
    case 0: {
      // Homing volley: fires 2 (normal) or 3 (enraged) homing shots
      const count = e.bossEnraged ? 3 : 2;
      const spd = 180;
      const baseAngle = Math.atan2(ay - c.pos!.y, ax - c.pos!.x);
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * 0.28;
        const a = baseAngle + offset;
        const id = spawnEnemyShot(
          world,
          c.pos!.x,
          c.pos!.y,
          Math.cos(a) * spd,
          Math.sin(a) * spd,
          c.weapon!.damage,
          false,
        );
        const sc = world.get(id);
        if (sc?.projectile) sc.projectile.homingAvatar = true;
      }
      e.bossPhase = 1;
      e.bossTimer = e.bossEnraged ? 0.8 : 1.2;
      break;
    }
    case 1: {
      // Rotating spread: fires a radial burst with a per-cycle rotation offset
      const count = e.bossEnraged ? 8 : 6;
      const spd = 130;
      const rotOffset = (e.bossWaypointIdx * Math.PI) / count;
      e.bossWaypointIdx = (e.bossWaypointIdx + 1) % (count * 2);
      for (let i = 0; i < count; i++) {
        const a = rotOffset + (i / count) * Math.PI * 2;
        spawnEnemyShot(
          world,
          c.pos!.x,
          c.pos!.y,
          Math.cos(a) * spd,
          Math.sin(a) * spd,
          c.weapon!.damage,
          false,
        );
      }
      e.bossPhase = 2;
      e.bossTimer = e.bossEnraged ? 0.7 : 1.0;
      break;
    }
    case 2: {
      // Blink: teleport to a random position in the upper play-field
      c.pos!.x = PLAY_W * (0.2 + rng() * 0.6);
      c.pos!.y = PLAY_H * (0.08 + rng() * 0.35);
      e.bossPhase = 0;
      e.bossTimer = e.bossEnraged ? 0.35 : 0.55;
      break;
    }
  }
}
