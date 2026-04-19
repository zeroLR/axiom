import { spawnOrbitShard, spawnProjectile } from "../entities";
import type { Rng } from "../rng";
import { computeSynergyBonuses } from "../synergies";
import { closestEnemy } from "../targeting";
import type { Components, EntityId, WeaponMode, WeaponState, World } from "../world";

const FAN_SPREAD = 0.25;
const FAN_WIDE_SPREAD = 0.5; // extra-wide fan for the "fan" weapon mode

interface FireBonus {
  damageMul: number;
  periodMul: number;
  critAdd: number;
}

function applyBonus(w: WeaponState, b: FireBonus): WeaponState {
  return {
    ...w,
    damage: w.damage * b.damageMul,
    period: Math.max(0.05, w.period * b.periodMul),
    crit: Math.min(1, w.crit + b.critAdd),
  };
}

export function updateWeapon(
  world: World,
  avatarId: EntityId,
  rng: Rng,
  dt: number,
): void {
  const c = world.get(avatarId);
  if (!c || !c.weapon || !c.pos) return;
  const velMag = c.vel ? Math.hypot(c.vel.x, c.vel.y) : 0;
  const bonus = c.avatar
    ? computeSynergyBonuses(c.avatar.synergies, c.avatar, velMag)
    : { damageMul: 1, periodMul: 1, critAdd: 0 };

  fireWeapon(world, avatarId, c, c.weapon, bonus, rng, dt);
  for (const extra of c.avatar?.extraWeapons ?? []) {
    fireWeapon(world, avatarId, c, extra, bonus, rng, dt);
  }
}

function fireWeapon(
  world: World,
  avatarId: EntityId,
  c: Components,
  w: WeaponState,
  bonus: FireBonus,
  rng: Rng,
  dt: number,
): void {
  w.cooldown -= dt;
  if (w.cooldown > 0) return;

  const targetId = closestEnemy(world, c.pos!.x, c.pos!.y);
  if (targetId === null) {
    if (w.cooldown < -0.5) w.cooldown = 0;
    return;
  }

  const eff = applyBonus(w, bonus);
  const target = world.get(targetId)!;
  const dx = target.pos!.x - c.pos!.x;
  const dy = target.pos!.y - c.pos!.y;
  const baseAngle = Math.atan2(dy, dx);

  fireForMode(world, avatarId, c, w, eff, baseAngle, rng);
  w.cooldown = eff.period;
}

function fireForMode(
  world: World,
  avatarId: EntityId,
  c: Components,
  w: WeaponState,
  eff: WeaponState,
  baseAngle: number,
  rng: Rng,
): void {
  const mode: WeaponMode = w.mode ?? "vertex";
  const n = Math.max(1, eff.projectiles);
  const x = c.pos!.x;
  const y = c.pos!.y;

  switch (mode) {
    case "faceBeam": {
      const dirs = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
      const speed = eff.projectileSpeed * 1.35;
      for (let k = 0; k < n; k++) {
        const spread = (k - (n - 1) / 2) * 0.08;
        for (const d of dirs) {
          const a = d + spread;
          const crit = rng() < eff.crit;
          spawnProjectile(world, x, y, Math.cos(a) * speed, Math.sin(a) * speed, eff, crit, 0.24);
        }
      }
      return;
    }
    case "orbitShard": {
      const base = w.orbitAngle ?? 0;
      const step = (Math.PI * 2) / n;
      for (let i = 0; i < n; i++) {
        const a = base + i * step;
        const crit = rng() < eff.crit;
        spawnOrbitShard(world, avatarId, a, eff, crit);
      }
      w.orbitAngle = base + 0.55;
      return;
    }
    case "homing": {
      // One steered projectile aimed roughly at the current target. The motion
      // system re-targets each frame so a missed enemy still gets chased down.
      const speed = eff.projectileSpeed;
      const crit = rng() < eff.crit;
      const id = spawnProjectile(world, x, y, Math.cos(baseAngle) * speed, Math.sin(baseAngle) * speed, eff, crit, 1.8);
      const proj = world.get(id);
      if (proj?.projectile) proj.projectile.homing = true;
      return;
    }
    case "burst": {
      // One heavy projectile that splits into 6 fragments when consumed.
      const speed = eff.projectileSpeed;
      const crit = rng() < eff.crit;
      const id = spawnProjectile(world, x, y, Math.cos(baseAngle) * speed, Math.sin(baseAngle) * speed, eff, crit, 1.4);
      const proj = world.get(id);
      if (proj?.projectile) proj.projectile.burstFragments = 6;
      return;
    }
    case "fan": {
      // Forces a wide 5-shot spread regardless of projectiles count.
      const FAN_N = Math.max(5, n);
      const startAngle = baseAngle - FAN_WIDE_SPREAD * (FAN_N - 1) / 2;
      const speed = eff.projectileSpeed;
      for (let i = 0; i < FAN_N; i++) {
        const a = startAngle + FAN_WIDE_SPREAD * i;
        const crit = rng() < eff.crit;
        spawnProjectile(world, x, y, Math.cos(a) * speed, Math.sin(a) * speed, eff, crit);
      }
      return;
    }
    case "charge": {
      // Slow but devastating piercing shot.
      const speed = eff.projectileSpeed;
      const crit = rng() < eff.crit;
      spawnProjectile(world, x, y, Math.cos(baseAngle) * speed, Math.sin(baseAngle) * speed, eff, crit, 2.2);
      return;
    }
    case "vertex":
    default: {
      const startAngle = baseAngle - FAN_SPREAD * (n - 1) / 2;
      for (let i = 0; i < n; i++) {
        const a = startAngle + FAN_SPREAD * i;
        const crit = rng() < eff.crit;
        spawnProjectile(world, x, y, Math.cos(a) * eff.projectileSpeed, Math.sin(a) * eff.projectileSpeed, eff, crit);
      }
    }
  }
}
