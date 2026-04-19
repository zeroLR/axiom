import { HIT_FLASH_TIME } from "../config";
import type { GameEvents } from "../events";
import type { EntityId, World } from "../world";

// Ticks burn and slow debuffs on enemies. Burn deals DPS on a 0.5 s sub-tick
// so the damage feels steady without spamming every frame. Slow just decays
// its remaining timer — movement code reads `enemy.slow.pct`.
const BURN_TICK = 0.5;

// Phase accumulator shared across enemies keeps the implementation allocation-
// free. It's not persisted and doesn't need to be seeded.
let burnPhase = 0;

export function updateStatusEffects(
  world: World,
  dt: number,
  events: GameEvents = {},
): void {
  burnPhase += dt;
  const tickNow = burnPhase >= BURN_TICK;
  if (tickNow) burnPhase -= BURN_TICK;

  for (const [id, c] of world.with("enemy", "hp")) {
    const e = c.enemy!;
    if (c.hp!.value <= 0) continue;
    if (e.burn) {
      // Apply the sub-tick damage first so a burn applied for exactly `t`
      // seconds deposits `ceil(t / BURN_TICK)` ticks before expiring.
      if (tickNow) {
        const dmg = e.burn.dps * BURN_TICK;
        c.hp!.value -= dmg;
        c.flash = HIT_FLASH_TIME;
        if (c.hp!.value <= 0) events.onEnemyKilled?.(id as EntityId);
      }
      e.burn.remaining -= dt;
      if (e.burn.remaining <= 0) e.burn = undefined;
    }
    if (e.slow) {
      e.slow.remaining -= dt;
      if (e.slow.remaining <= 0) e.slow = undefined;
    }
  }
}

/** Reset the internal burn tick phase. Call at scene setup between runs. */
export function resetStatusPhase(): void {
  burnPhase = 0;
}
