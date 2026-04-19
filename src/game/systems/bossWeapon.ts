import { spawnEnemyShot } from "../entities";
import type { Rng } from "../rng";
import type { EntityId, World } from "../world";

/** Fan half-spread (radians) between adjacent projectiles. */
export const BOSS_FAN_SPREAD = 0.22;
/**
 * Seconds of lead time between the telegraph appearing and the actual shot.
 * Matches concept.md § "偏離表" — boss skills must be readable before firing.
 */
export const BOSS_TELEGRAPH_LEAD = 0.8;

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
    const w = c.weapon!;
    w.cooldown -= dt;

    // Snapshot the aim once the lead window opens. The render layer keys off
    // telegraphAngle to draw the warning arc; locking the angle here means
    // the player's dodge target matches the drawn warning, not the boss's
    // current tracking.
    if (w.cooldown <= BOSS_TELEGRAPH_LEAD && c.enemy!.telegraphAngle === undefined) {
      c.enemy!.telegraphAngle = Math.atan2(ay - c.pos!.y, ax - c.pos!.x);
    }

    if (w.cooldown > 0) continue;

    const baseAngle =
      c.enemy!.telegraphAngle ?? Math.atan2(ay - c.pos!.y, ax - c.pos!.x);
    c.enemy!.telegraphAngle = undefined;

    const n = Math.max(1, w.projectiles);
    const startAngle = baseAngle - (BOSS_FAN_SPREAD * (n - 1)) / 2;
    for (let i = 0; i < n; i++) {
      const a = startAngle + BOSS_FAN_SPREAD * i;
      const vx = Math.cos(a) * w.projectileSpeed;
      const vy = Math.sin(a) * w.projectileSpeed;
      const crit = rng() < w.crit;
      spawnEnemyShot(world, c.pos!.x, c.pos!.y, vx, vy, w.damage, crit);
    }
    w.cooldown = w.period;
  }
}
