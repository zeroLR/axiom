import { spawnEnemyShot } from "../../entities";
import type { Rng } from "../../rng";
import type { EntityId, World } from "../../world";

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

  for (const [, c] of world.with("enemy", "hp")) {
    if (c.enemy!.kind !== "boss") continue;
    if (c.hp!.value <= 0) continue;
    const e = c.enemy!;

    const shieldMax = e.mirrorShieldMax;
    if (shieldMax !== undefined && (e.shield ?? 0) < shieldMax) {
      const period = e.shieldRegenPeriod ?? 6;
      e.shieldRegenTimer = (e.shieldRegenTimer ?? 0) + dt;
      if (e.shieldRegenTimer >= period) {
        e.shield = Math.min(shieldMax, (e.shield ?? 0) + 1);
        e.shieldRegenTimer = 0;
      }
    }

    if (e.mirrorIframes !== undefined && e.mirrorIframes > 0) {
      e.mirrorIframes = Math.max(0, e.mirrorIframes - dt);
    }

    const dodgePeriod = e.mirrorDodgePeriod;
    if (dodgePeriod !== undefined && (e.mirrorIframes ?? 0) === 0) {
      e.mirrorDodgeCooldown = (e.mirrorDodgeCooldown ?? 0) + dt;
      if (e.mirrorDodgeCooldown >= dodgePeriod) {
        e.mirrorIframes = MIRROR_DODGE_IFRAMES;
        e.mirrorDodgeCooldown = 0;
      }
    }

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
