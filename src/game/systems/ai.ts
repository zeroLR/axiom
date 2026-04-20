import { ENEMY_SEEK_ACCEL, PLAY_H, PLAY_W } from '../config';
import { spawnEnemyShot } from '../entities';
import type { Rng } from '../rng';
import type { EntityId, World } from '../world';

export function updateEnemyAi(
  world: World,
  avatarId: EntityId,
  dt: number,
  rng?: Rng,
): void {
  const avatar = world.get(avatarId);
  if (!avatar || !avatar.pos) return;
  const ax = avatar.pos.x;
  const ay = avatar.pos.y;
  for (const [, c] of world.with('enemy', 'pos', 'vel')) {
    const p = c.pos!;
    const v = c.vel!;
    const e = c.enemy!;

    // Jets boss controls its own movement via bossWeapon.ts.
    if (e.kind === 'boss' && e.bossPattern === 'jets') continue;

    let dx = ax - p.x;
    let dy = ay - p.y;
    const dist = Math.hypot(dx, dy) || 1;
    let nx = dx / dist;
    let ny = dy / dist;

    if (e.kind === 'star') {
      // Lateral wobble: perpendicular sine added to direction.
      e.wobblePhase += dt * 3.2;
      const wob = Math.sin(e.wobblePhase) * 0.7;
      const px = -ny;
      const py = nx;
      nx += px * wob;
      ny += py * wob;
      const len = Math.hypot(nx, ny) || 1;
      nx /= len;
      ny /= len;
    }

    // ── Diamond: periodic dash toward player ──────────────────────────────
    if (e.kind === 'diamond' && e.dashCooldown !== undefined) {
      e.dashCooldown -= dt;
      if (e.dashCooldown <= 0) {
        const dashMul = e.slow ? 1 - e.slow.pct : 1;
        v.x = nx * e.maxSpeed * 3 * dashMul;
        v.y = ny * e.maxSpeed * 3 * dashMul;
        p.x += v.x * dt;
        p.y += v.y * dt;
        e.dashCooldown = 2.5 + (rng ? rng() * 1.5 : 1);
        continue;
      }
    }

    // ── Crescent: orbit / arc movement ────────────────────────────────────
    if (e.kind === 'crescent' && e.orbitAngle !== undefined) {
      e.orbitAngle += dt * 1.8;
      // Move toward player but with a strong tangential component.
      const tangX = -ny;
      const tangY = nx;
      const blend = 0.4; // how much tangent vs seek
      nx = nx * (1 - blend) + tangX * blend * Math.sin(e.orbitAngle);
      ny = ny * (1 - blend) + tangY * blend * Math.sin(e.orbitAngle);
      const len = Math.hypot(nx, ny) || 1;
      nx /= len;
      ny /= len;
    }

    // ── Cross: shoot at player periodically ───────────────────────────────
    if (e.kind === 'cross' && e.shootCooldown !== undefined && rng) {
      e.shootCooldown -= dt;
      if (e.shootCooldown <= 0 && (c.hp?.value ?? 0) > 0) {
        const spd = 160;
        const vx = nx * spd;
        const vy = ny * spd;
        spawnEnemyShot(world, p.x, p.y, vx, vy, e.contactDamage, false);
        e.shootCooldown = 2.0 + rng() * 1.0;
      }
    }

    const slowMul = e.slow ? 1 - e.slow.pct : 1;
    const curSpeed = e.maxSpeed * slowMul;
    const targetVx = nx * curSpeed;
    const targetVy = ny * curSpeed;
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

    // Keep enemies inside the playfield (+margin).
    p.x = Math.max(-30, Math.min(PLAY_W + 30, p.x));
    p.y = Math.max(-30, Math.min(PLAY_H + 30, p.y));
  }
}
