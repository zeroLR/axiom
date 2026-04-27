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

    // Frozen enemies: decrement timer and skip movement + shooting.
    if (e.frozenTimer !== undefined && e.frozenTimer > 0) {
      e.frozenTimer -= dt;
      v.x *= 0.85;
      v.y *= 0.85;
      continue;
    }

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

    // ── Lance: rapid high-speed dash ──────────────────────────────────────
    if (e.kind === 'lance' && e.dashCooldown !== undefined) {
      e.dashCooldown -= dt;
      if (e.dashCooldown <= 0) {
        const dashMul = e.slow ? 1 - e.slow.pct : 1;
        v.x = nx * e.maxSpeed * 5.5 * dashMul;
        v.y = ny * e.maxSpeed * 5.5 * dashMul;
        p.x += v.x * dt;
        p.y += v.y * dt;
        e.dashCooldown = 1.4 + (rng ? rng() * 0.8 : 0.5);
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

    // ── Spiral: rotating approach (inward spiral toward player) ──────────
    if (e.kind === 'spiral' && e.orbitAngle !== undefined) {
      e.orbitAngle += dt * 2.2;
      const rot = e.orbitAngle * 0.35;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      const rotNx = nx * cosR - ny * sinR;
      const rotNy = nx * sinR + ny * cosR;
      const len = Math.hypot(rotNx, rotNy) || 1;
      nx = rotNx / len;
      ny = rotNy / len;
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

    // ── Prism: 3-directional spread shot ──────────────────────────────────
    if (e.kind === 'prism' && e.shootCooldown !== undefined && rng) {
      e.shootCooldown -= dt;
      if (e.shootCooldown <= 0 && (c.hp?.value ?? 0) > 0) {
        const spd = 145;
        const baseAngle = Math.atan2(ay - p.y, ax - p.x);
        for (let i = 0; i < 3; i++) {
          const a = baseAngle + (i - 1) * ((Math.PI * 2) / 3);
          spawnEnemyShot(world, p.x, p.y, Math.cos(a) * spd, Math.sin(a) * spd, e.contactDamage, false);
        }
        e.shootCooldown = 2.5 + rng() * 0.5;
      }
    }

    // ── Octo: 8-directional burst ─────────────────────────────────────────
    if (e.kind === 'octo' && e.shootCooldown !== undefined && rng) {
      e.shootCooldown -= dt;
      if (e.shootCooldown <= 0 && (c.hp?.value ?? 0) > 0) {
        const spd = 115;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          spawnEnemyShot(world, p.x, p.y, Math.cos(a) * spd, Math.sin(a) * spd, e.contactDamage, false);
        }
        e.shootCooldown = 3.8 + rng() * 0.8;
      }
    }

    // ── Shade: maintain orbit range + homing shot ─────────────────────────
    if (e.kind === 'shade') {
      const SHADE_ORBIT_R = 130;
      if (dist < SHADE_ORBIT_R) {
        // Back away when too close
        nx = -nx;
        ny = -ny;
      }
      if (e.shootCooldown !== undefined) {
        e.shootCooldown -= dt;
        if (e.shootCooldown <= 0 && rng && (c.hp?.value ?? 0) > 0) {
          const shotSpd = 150;
          const shotId = spawnEnemyShot(world, p.x, p.y, nx * shotSpd, ny * shotSpd, e.contactDamage, false);
          const shotC = world.get(shotId);
          if (shotC?.projectile) shotC.projectile.homingAvatar = true;
          e.shootCooldown = 2.8 + rng() * 0.5;
        }
      }
    }

    // ── Ring: orbital homing shooter (homing-orbit, wider orbit range) ────
    if (e.kind === 'ring') {
      const RING_ORBIT_R = 110;
      if (dist < RING_ORBIT_R) {
        nx = -nx;
        ny = -ny;
      }
      if (e.shootCooldown !== undefined) {
        e.shootCooldown -= dt;
        if (e.shootCooldown <= 0 && rng && (c.hp?.value ?? 0) > 0) {
          const shotSpd = 140;
          const shotId = spawnEnemyShot(world, p.x, p.y, nx * shotSpd, ny * shotSpd, e.contactDamage, false);
          const shotC = world.get(shotId);
          if (shotC?.projectile) shotC.projectile.homingAvatar = true;
          e.shootCooldown = 3.2 + (rng ? rng() * 0.6 : 0.3);
        }
      }
    }

    // ── Node: periodic blink to random position + burst-4 ─────────────────
    if (e.kind === 'node' && e.dashCooldown !== undefined && rng) {
      e.dashCooldown -= dt;
      if (e.dashCooldown <= 0 && (c.hp?.value ?? 0) > 0) {
        const margin = 0.15;
        p.x = PLAY_W * (margin + rng() * (1 - 2 * margin));
        p.y = PLAY_H * (margin + rng() * (1 - 2 * margin));
        const spd = 130;
        const baseAngle = Math.atan2(ay - p.y, ax - p.x);
        for (let i = 0; i < 4; i++) {
          const a = baseAngle + (i - 1.5) * (Math.PI / 8);
          spawnEnemyShot(world, p.x, p.y, Math.cos(a) * spd, Math.sin(a) * spd, e.contactDamage, false);
        }
        e.dashCooldown = 3.5 + rng() * 1.5;
        v.x = 0;
        v.y = 0;
        continue;
      }
    }

    // ── Thorn: 8-directional burst (burst8 like octo, slower, higher dmg) ─
    if (e.kind === 'thorn' && e.shootCooldown !== undefined && rng) {
      e.shootCooldown -= dt;
      if (e.shootCooldown <= 0 && (c.hp?.value ?? 0) > 0) {
        const spd = 105;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          spawnEnemyShot(world, p.x, p.y, Math.cos(a) * spd, Math.sin(a) * spd, e.contactDamage, false);
        }
        e.shootCooldown = 4.5 + rng() * 1.0;
      }
    }

    // ── Weave: rapid diagonal zigzag approach ──────────────────────────────
    if (e.kind === 'weave' && e.orbitAngle !== undefined) {
      e.orbitAngle += dt * (Math.PI / 0.4); // half-cycle every 0.4s → alternates lateral dir
      const lateral = Math.sin(e.orbitAngle) >= 0 ? 1 : -1;
      const perpX = -ny;
      const perpY = nx;
      nx = nx * 0.55 + perpX * 0.83 * lateral;
      ny = ny * 0.55 + perpY * 0.83 * lateral;
      const wLen = Math.hypot(nx, ny) || 1;
      nx /= wLen;
      ny /= wLen;
    }

    // ── Boss: apply pull-avatar gravity if timer active ────────────────────
    if (e.kind === 'boss' && e.pullAvatarTimer !== undefined && e.pullAvatarTimer > 0) {
      e.pullAvatarTimer = Math.max(0, e.pullAvatarTimer - dt);
      const PULL_ACCEL = 160; // px/s²
      for (const [, ac] of world.with('avatar', 'vel', 'pos')) {
        const adx = p.x - ac.pos!.x;
        const ady = p.y - ac.pos!.y;
        const adist = Math.hypot(adx, ady) || 1;
        ac.vel!.x += (adx / adist) * PULL_ACCEL * dt;
        ac.vel!.y += (ady / adist) * PULL_ACCEL * dt;
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
