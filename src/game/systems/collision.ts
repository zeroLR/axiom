import { AVATAR_IFRAMES, HIT_FLASH_TIME } from "../config";
import { spawnBurstFragments, spawnChainBolt, spawnEnemyAt } from "../entities";
import type { GameEvents } from "../events";
import type { Rng } from "../rng";
import type { Components, EntityId, World } from "../world";

// Backward-compatible alias. Prefer importing `GameEvents` from `../events`.
export type CombatEvents = GameEvents;

function findNextTarget(
  world: World,
  fromX: number,
  fromY: number,
  skip: ReadonlySet<EntityId>,
  maxDistSq = Infinity,
): EntityId | null {
  let bestId: EntityId | null = null;
  let bestDist = maxDistSq;
  for (const [id, c] of world.with("enemy", "pos", "hp")) {
    if (skip.has(id)) continue;
    if ((c.hp!.value) <= 0) continue;
    const dx = c.pos!.x - fromX;
    const dy = c.pos!.y - fromY;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      bestId = id;
    }
  }
  return bestId;
}

export function updateCollisions(
  world: World,
  avatarId: EntityId,
  events: GameEvents,
  rng?: Rng,
): void {
  for (const [pid, pc] of world.with("projectile", "pos", "radius")) {
    if (pc.team === "enemy-shot") continue;
    const proj = pc.projectile!;
    const pr = pc.radius!;
    const px = pc.pos!.x;
    const py = pc.pos!.y;
    for (const [eid, ec] of world.with("enemy", "pos", "radius", "hp")) {
      if (ec.hp!.value <= 0) continue;
      if (proj.hitIds.has(eid)) continue;
      const er = ec.radius!;
      const dx = ec.pos!.x - px;
      const dy = ec.pos!.y - py;
      const rr = (pr + er);
      if (dx * dx + dy * dy > rr * rr) continue;

      // Hexagon shield: absorb the first hit without HP loss, but still
      // consumes pierce/ricochet/chain like any other collision.
      if (ec.enemy!.shield !== undefined && ec.enemy!.shield > 0) {
        ec.enemy!.shield -= 1;
        ec.flash = HIT_FLASH_TIME;
        proj.hitIds.add(eid);
        if (!advanceProjectile(world, pid, pc, ec.pos!.x, ec.pos!.y)) {
          consumeProjectile(world, pid, pc);
        }
        break;
      }

      ec.hp!.value -= proj.damage;
      ec.flash = HIT_FLASH_TIME;
      proj.hitIds.add(eid);

      // Apply burn / slow status on hit.
      if (proj.burnDps > 0 && proj.burnDuration > 0) {
        const prev = ec.enemy!.burn;
        const prevDps = prev?.dps ?? 0;
        const prevRem = prev?.remaining ?? 0;
        ec.enemy!.burn = {
          dps: Math.max(prevDps, proj.burnDps),
          remaining: Math.max(prevRem, proj.burnDuration),
        };
      }
      if (proj.slowPct > 0 && proj.slowDuration > 0) {
        const prev = ec.enemy!.slow;
        const prevPct = prev?.pct ?? 0;
        const prevRem = prev?.remaining ?? 0;
        ec.enemy!.slow = {
          pct: Math.min(0.9, Math.max(prevPct, proj.slowPct)),
          remaining: Math.max(prevRem, proj.slowDuration),
        };
      }

      events.onEnemyHit?.(eid, proj.damage, proj.crit);

      if (ec.hp!.value <= 0) {
        // Pentagon splits into small circles on death near its position.
        if (ec.enemy!.kind === "pentagon" && rng) {
          const count = 2 + Math.floor(rng() * 2); // 2-3
          for (let i = 0; i < count; i++) {
            spawnEnemyAt(world, "circle", rng, ec.pos!.x, ec.pos!.y);
          }
        }
        events.onEnemyKilled?.(eid);
      }

      if (!advanceProjectile(world, pid, pc, ec.pos!.x, ec.pos!.y)) {
        consumeProjectile(world, pid, pc);
      }
      break;
    }
  }

  const avatar = world.get(avatarId);
  if (!avatar || !avatar.avatar || !avatar.pos) return;
  const a = avatar.avatar;
  if (a.hp <= 0) return;
  const ar = avatar.radius ?? 10;
  const ax = avatar.pos.x;
  const ay = avatar.pos.y;
  for (const [, ec] of world.with("enemy", "pos", "radius", "hp")) {
    if (ec.hp!.value <= 0) continue;
    const er = ec.radius!;
    const dx = ec.pos!.x - ax;
    const dy = ec.pos!.y - ay;
    const rr = ar + er;
    if (dx * dx + dy * dy > rr * rr) continue;
    if (a.iframes > 0) continue;
    if (applyAvatarDamage(avatar, ec.enemy!.contactDamage, events)) break;
    break;
  }

  for (const [sid, sc] of world.with("projectile", "pos", "radius")) {
    if (sc.team !== "enemy-shot") continue;
    if (a.iframes > 0) break;
    if (a.hp <= 0) break;
    const dx = sc.pos!.x - ax;
    const dy = sc.pos!.y - ay;
    const rr = ar + sc.radius!;
    if (dx * dx + dy * dy > rr * rr) continue;
    applyAvatarDamage(avatar, sc.projectile!.damage, events);
    world.remove(sid);
    break;
  }
}

// Resolve one incoming hit against the avatar's defensive layers in order:
//   dodge charge → shield → HP (with Revenant on lethal).
// Returns true regardless — the caller's iteration always breaks after a
// successful intercept so one frame can't burn through every layer.
function applyAvatarDamage(
  avatar: Components,
  dmg: number,
  events: GameEvents,
): boolean {
  const a = avatar.avatar!;
  // Phase Shift: free dodge consumes a charge instead of HP.
  if ((a.dodgeCharges ?? 0) > 0) {
    a.dodgeCharges = (a.dodgeCharges ?? 0) - 1;
    a.dodgeCooldown = 0;
    a.iframes = AVATAR_IFRAMES;
    avatar.flash = HIT_FLASH_TIME;
    return true;
  }
  // Aegis: shield soaks one hit (any size). Hit gates regen for the period.
  if ((a.shield ?? 0) > 0) {
    a.shield = (a.shield ?? 0) - 1;
    a.shieldRegenTimer = 0;
    a.iframes = AVATAR_IFRAMES;
    avatar.flash = HIT_FLASH_TIME;
    events.onPlayerHit?.(0);
    return true;
  }
  a.hp -= dmg;
  a.iframes = AVATAR_IFRAMES;
  avatar.flash = HIT_FLASH_TIME;
  events.onPlayerHit?.(dmg);
  if (a.hp <= 0) {
    // Revenant: spend the one-shot revive instead of dying.
    if (a.secondChance) {
      a.secondChance = false;
      a.hp = Math.max(1, Math.floor(a.maxHp / 2));
      a.iframes = AVATAR_IFRAMES * 2;
      return true;
    }
    a.hp = 0;
    events.onPlayerDied?.();
  }
  return true;
}

// After a projectile hits an enemy, decide whether it keeps flying (pierce),
// bends toward a new target (ricochet), forks a chain bolt, or despawns.
// Returns true if the original projectile should be kept alive.
function advanceProjectile(
  world: World,
  _pid: EntityId,
  pc: Components,
  hitX: number,
  hitY: number,
): boolean {
  const p = pc.projectile;
  const v = pc.vel;
  if (!p || !v || !pc.pos) return false;

  if (p.pierceRemaining > 0) {
    p.pierceRemaining -= 1;
    return true;
  }
  if (p.ricochetRemaining > 0) {
    const next = findNextTarget(world, hitX, hitY, p.hitIds);
    if (next !== null) {
      const target = world.get(next)!;
      const dx = target.pos!.x - hitX;
      const dy = target.pos!.y - hitY;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = Math.hypot(v.x, v.y) || 1;
      v.x = (dx / dist) * speed;
      v.y = (dy / dist) * speed;
      p.ricochetRemaining -= 1;
      return true;
    }
  }
  if (p.chainRemaining > 0) {
    const next = findNextTarget(world, hitX, hitY, p.hitIds, 180 * 180);
    if (next !== null) {
      const target = world.get(next)!;
      // Chain bolts keep burn/slow payload and carry remaining chains forward.
      spawnChainBolt(
        world,
        hitX,
        hitY,
        target.pos!.x,
        target.pos!.y,
        Math.max(1, Math.ceil(p.damage * 0.7)),
        p.chainRemaining - 1,
        p.burnDps,
        p.burnDuration,
        p.slowPct,
        p.slowDuration,
        p.hitIds,
      );
    }
  }
  return false;
}

// Removes a projectile after a hit, triggering burst fragmentation if the
// weapon mode requested it. Mirrors the same check in motion.ts (ttl/oob
// despawn) so burst fires whether the projectile dies on contact or in flight.
function consumeProjectile(world: World, pid: EntityId, pc: Components): void {
  const p = pc.projectile;
  if (p?.burstFragments && pc.pos) {
    spawnBurstFragments(world, pc.pos.x, pc.pos.y, p.burstFragments, p.damage);
  }
  world.remove(pid);
}

export function removeDeadEnemies(world: World): void {
  for (const [id, c] of world.with("enemy", "hp")) {
    if (c.hp!.value <= 0) world.remove(id);
  }
}
