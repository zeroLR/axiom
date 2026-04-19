import { HIT_FLASH_TIME } from "./config";
import type { GameEvents } from "./events";
import type { Avatar, EntityId, SynergyRuntime, World } from "./world";

export type { SynergyId, SynergyRuntime } from "./world";

export const SYNERGY_CONFIG = {
  combustion: { interval: 10, radius: 60, damage: 2 },
  desperate:  { hpThreshold: 2, damageMul: 2 },
  kinetic:    { critAdd: 0.25, moveEps: 1 },
  stillness:  { periodMul: 0.75, moveEps: 1 },
} as const;

export interface SynergyBonuses {
  damageMul: number;
  periodMul: number;
  critAdd: number;
}

const NEUTRAL: SynergyBonuses = { damageMul: 1, periodMul: 1, critAdd: 0 };

function isMoving(avatar: Avatar, velMag: number): boolean {
  return velMag > SYNERGY_CONFIG.kinetic.moveEps && avatar.speedMul > 0;
}

export function computeSynergyBonuses(
  synergies: readonly SynergyRuntime[] | undefined,
  avatar: Avatar,
  velMag: number,
): SynergyBonuses {
  if (!synergies || synergies.length === 0) return { ...NEUTRAL };
  let damageMul = 1;
  let periodMul = 1;
  let critAdd = 0;
  const moving = isMoving(avatar, velMag);
  for (const s of synergies) {
    switch (s.id) {
      case "desperate":
        if (avatar.hp <= SYNERGY_CONFIG.desperate.hpThreshold) {
          damageMul *= SYNERGY_CONFIG.desperate.damageMul;
        }
        break;
      case "kinetic":
        if (moving) critAdd += SYNERGY_CONFIG.kinetic.critAdd;
        break;
      case "stillness":
        if (!moving) periodMul *= SYNERGY_CONFIG.stillness.periodMul;
        break;
      case "combustion":
        break;
    }
  }
  return { damageMul, periodMul, critAdd };
}

/**
 * Damage every enemy whose body overlaps a circle at `(x,y)` with radius `r`.
 * Mirrors collision.ts shield handling and emits onEnemyKilled for kills.
 * Returns the entity ids of killed enemies so the caller can continue counters.
 */
export function explodeAt(
  world: World,
  x: number,
  y: number,
  radius: number,
  damage: number,
  events?: GameEvents,
): EntityId[] {
  const killed: EntityId[] = [];
  for (const [id, c] of world.with("enemy", "pos", "hp", "radius")) {
    const hp = c.hp!;
    if (hp.value <= 0) continue;
    const er = c.radius!;
    const dx = c.pos!.x - x;
    const dy = c.pos!.y - y;
    const rr = radius + er;
    if (dx * dx + dy * dy > rr * rr) continue;

    if (c.enemy!.shield !== undefined && c.enemy!.shield > 0) {
      c.enemy!.shield -= 1;
      c.flash = HIT_FLASH_TIME;
      continue;
    }

    hp.value -= damage;
    c.flash = HIT_FLASH_TIME;
    if (hp.value <= 0) {
      killed.push(id);
      events?.onEnemyKilled?.(id);
    }
  }
  return killed;
}
