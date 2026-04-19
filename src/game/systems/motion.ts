import { AVATAR_BASE_SPEED, PLAY_H, PLAY_W } from "../config";
import { spawnBurstFragments } from "../entities";
import { closestEnemy } from "../targeting";
import type { World } from "../world";

const HOMING_TURN_RATE = 8; // radians per second; bounded so missiles arc, not snap

export function updateAvatarMotion(world: World, dt: number): void {
  for (const [, c] of world.with("avatar", "pos", "vel")) {
    const a = c.avatar!;
    const p = c.pos!;
    // Glide toward target at capped speed. No acceleration — it feels snappy
    // on mobile drag.
    const dx = a.targetX - p.x;
    const dy = a.targetY - p.y;
    const dist = Math.hypot(dx, dy);
    const maxStep = AVATAR_BASE_SPEED * a.speedMul * dt;
    if (dist <= maxStep || dist < 0.1) {
      p.x = a.targetX;
      p.y = a.targetY;
      c.vel!.x = 0;
      c.vel!.y = 0;
    } else {
      const nx = dx / dist;
      const ny = dy / dist;
      p.x += nx * maxStep;
      p.y += ny * maxStep;
      c.vel!.x = nx * AVATAR_BASE_SPEED * a.speedMul;
      c.vel!.y = ny * AVATAR_BASE_SPEED * a.speedMul;
    }
    // Keep avatar inside play-field.
    if (p.x < 0) p.x = 0;
    if (p.x > PLAY_W) p.x = PLAY_W;
    if (p.y < 0) p.y = 0;
    if (p.y > PLAY_H) p.y = PLAY_H;
    if (a.iframes > 0) a.iframes = Math.max(0, a.iframes - dt);
    // Aegis: shield regens 1 every shieldRegenPeriod sec while not at max.
    if (a.shieldMax !== undefined && (a.shield ?? 0) < a.shieldMax) {
      a.shieldRegenTimer = (a.shieldRegenTimer ?? 0) + dt;
      const period = a.shieldRegenPeriod ?? 6;
      if (a.shieldRegenTimer >= period) {
        a.shield = Math.min(a.shieldMax, (a.shield ?? 0) + 1);
        a.shieldRegenTimer = 0;
      }
    }
    // Phase Shift: dodge charge regens on cooldown timer.
    if (a.dodgeMax !== undefined && (a.dodgeCharges ?? 0) < a.dodgeMax) {
      a.dodgeCooldown = (a.dodgeCooldown ?? 0) + dt;
      const period = a.dodgePeriod ?? 8;
      if (a.dodgeCooldown >= period) {
        a.dodgeCharges = Math.min(a.dodgeMax, (a.dodgeCharges ?? 0) + 1);
        a.dodgeCooldown = 0;
      }
    }
  }
}

export function updateProjectileMotion(world: World, dt: number): void {
  for (const [id, c] of world.with("projectile", "pos", "vel")) {
    const orbit = c.projectile!.orbit;
    if (orbit) {
      const owner = world.get(orbit.ownerId);
      if (!owner?.pos) {
        world.remove(id);
        continue;
      }
      orbit.angle += orbit.angularSpeed * dt;
      c.pos!.x = owner.pos.x + Math.cos(orbit.angle) * orbit.radius;
      c.pos!.y = owner.pos.y + Math.sin(orbit.angle) * orbit.radius;
    } else {
      // Homing weapons re-target the nearest live enemy each frame and steer
      // their velocity toward it at a bounded turn rate.
      if (c.projectile!.homing) {
        const tid = closestEnemy(world, c.pos!.x, c.pos!.y);
        if (tid !== null) {
          const t = world.get(tid)!;
          const dxh = t.pos!.x - c.pos!.x;
          const dyh = t.pos!.y - c.pos!.y;
          const speed = Math.hypot(c.vel!.x, c.vel!.y) || 1;
          const targetAngle = Math.atan2(dyh, dxh);
          const currentAngle = Math.atan2(c.vel!.y, c.vel!.x);
          let delta = targetAngle - currentAngle;
          while (delta > Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          const maxTurn = HOMING_TURN_RATE * dt;
          const newAngle = currentAngle + Math.max(-maxTurn, Math.min(maxTurn, delta));
          c.vel!.x = Math.cos(newAngle) * speed;
          c.vel!.y = Math.sin(newAngle) * speed;
        }
      }
      c.pos!.x += c.vel!.x * dt;
      c.pos!.y += c.vel!.y * dt;
    }
    c.projectile!.ttl -= dt;
    // Despawn if out of bounds or timed out.
    if (
      c.projectile!.ttl <= 0 ||
      c.pos!.x < -20 || c.pos!.x > PLAY_W + 20 ||
      c.pos!.y < -20 || c.pos!.y > PLAY_H + 20
    ) {
      if (c.projectile!.burstFragments) {
        spawnBurstFragments(world, c.pos!.x, c.pos!.y, c.projectile!.burstFragments, c.projectile!.damage);
      }
      world.remove(id);
    }
  }
}

export function decayHitFlash(world: World, dt: number): void {
  for (const [, c] of world.entities) {
    if (c.flash !== undefined && c.flash > 0) {
      c.flash = Math.max(0, c.flash - dt);
    }
  }
}
