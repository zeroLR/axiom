import { spawnEnemyShot } from "../../entities";
import type { Rng } from "../../rng";
import type { Components, EntityId, World } from "../../world";
import { updateEchoPattern } from "./echo";
import { updateJetsPattern } from "./jets";
import { updateLatticePattern } from "./lattice";
import { updateMirrorBossAbilities } from "./mirror";
import { updateNexusPattern } from "./nexus";
import { updateNullPattern } from "./null";
import { updateOrthogonPattern } from "./orthogon";
import { updateRiftPattern } from "./rift";
import { updateShardPattern } from "./shard";

/** Fan half-spread (radians) between adjacent projectiles. */
export const BOSS_FAN_SPREAD = 0.22;
/**
 * Seconds of lead time between the telegraph appearing and the actual shot.
 * Matches concept.md § "偏離表" — boss skills must be readable before firing.
 */
export const BOSS_TELEGRAPH_LEAD = 0.8;

function updateStandardPattern(
  world: World,
  c: Components,
  ax: number,
  ay: number,
  rng: Rng,
  dt: number,
): void {
  const w = c.weapon!;
  w.cooldown -= dt;

  if (
    w.cooldown <= BOSS_TELEGRAPH_LEAD &&
    c.enemy!.telegraphAngle === undefined
  ) {
    c.enemy!.telegraphAngle = Math.atan2(ay - c.pos!.y, ax - c.pos!.x);
  }
  if (w.cooldown > 0) return;

  const baseAngle =
    c.enemy!.telegraphAngle ?? Math.atan2(ay - c.pos!.y, ax - c.pos!.x);
  c.enemy!.telegraphAngle = undefined;

  fireAimedFan(world, c, baseAngle, rng);
  w.cooldown = w.period;
}

function fireAimedFan(
  world: World,
  c: Components,
  baseAngle: number,
  rng: Rng,
): void {
  const w = c.weapon!;
  const n = Math.max(1, w.projectiles);
  const startAngle = baseAngle - (BOSS_FAN_SPREAD * (n - 1)) / 2;
  for (let i = 0; i < n; i++) {
    const a = startAngle + BOSS_FAN_SPREAD * i;
    const vx = Math.cos(a) * w.projectileSpeed;
    const vy = Math.sin(a) * w.projectileSpeed;
    const crit = rng() < w.crit;
    spawnEnemyShot(world, c.pos!.x, c.pos!.y, vx, vy, w.damage, crit);
  }
}

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

    const pattern = c.enemy!.bossPattern ?? "standard";
    switch (pattern) {
      case "orthogon":
        updateOrthogonPattern(world, c, ax, ay, rng, dt, fireAimedFan);
        break;
      case "jets":
        updateJetsPattern(world, c, ax, ay, rng, dt, fireAimedFan);
        break;
      case "lattice":
        updateLatticePattern(world, c, ax, ay, rng, dt, fireAimedFan);
        break;
      case "rift":
        updateRiftPattern(world, c, ax, ay, rng, dt, fireAimedFan);
        break;
      case "nexus":
        updateNexusPattern(world, c, ax, ay, rng, dt, fireAimedFan);
        break;
      case "echo":
        updateEchoPattern(world, c, ax, ay, rng, dt, fireAimedFan);
        break;
      case "shard":
        updateShardPattern(world, c, ax, ay, rng, dt, fireAimedFan);
        break;
      case "null":
        updateNullPattern(world, c, ax, ay, rng, dt, fireAimedFan);
        break;
      default:
        updateStandardPattern(world, c, ax, ay, rng, dt);
        break;
    }
  }
}

export { updateMirrorBossAbilities };
