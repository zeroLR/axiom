import { isLevelableEffect, levelBonusFraction } from "./cardLevels";
import { CARD_POOL } from "./content/cards";
import { applyEffectToWorld, MAX_EXTRA_WEAPONS } from "./effectEngine";
import { type Rng, shuffle } from "./rng";
import type { EntityId, World } from "./world";
import type { Card } from "./content/cards";
export type { Card, CardEffect, Rarity } from "./content/cards";

export { MAX_EXTRA_WEAPONS };

export const POOL = CARD_POOL;

import type { PlayerStats } from "./data/types";
import { filterUnlockedCards } from "./unlocks";

export function drawOffer(rng: Rng, count: number, pool: readonly Card[] = POOL, stats?: PlayerStats): Card[] {
  const available = stats ? filterUnlockedCards(pool, stats) : [...pool];
  return shuffle(rng, available).slice(0, Math.min(count, available.length));
}

function formatNum(value: number, maxDigits = 2): string {
  const s = value.toFixed(maxDigits);
  return s.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

/**
 * Projected effect text for a card pick at a given target level.
 * Level 1 returns the base card text.
 */
export function projectedCardText(card: Card, targetLevel: number): string {
  if (!isLevelableEffect(card.effect) || targetLevel <= 1) return card.text;
  const frac = levelBonusFraction(targetLevel);
  const e = card.effect;
  switch (e.kind) {
    case "damageAdd":
      return `+${Math.max(1, Math.round(e.value * frac))} damage`;
    case "periodMul": {
      const reduction = (1 - e.value) * frac;
      return `-${Math.round(reduction * 100)}% fire interval`;
    }
    case "projectileSpeedMul": {
      const boost = (e.value - 1) * frac;
      return `+${Math.round(boost * 100)}% projectile speed`;
    }
    case "projectilesAdd": {
      const add = e.value * frac >= 0.5 ? Math.max(1, Math.round(e.value * frac)) : 0;
      return `+${add} projectile${add === 1 ? "" : "s"}`;
    }
    case "pierceAdd": {
      const add = e.value * frac >= 0.5 ? Math.max(1, Math.round(e.value * frac)) : 0;
      return `+${add} pierce`;
    }
    case "critAdd":
      return `+${Math.round(e.value * frac * 100)}% crit chance`;
    case "maxHpAdd":
      return `+${Math.max(1, Math.round(e.value * frac))} max HP`;
    case "speedMul": {
      const boost = (e.value - 1) * frac;
      return `+${Math.round(boost * 100)}% move speed`;
    }
    case "ricochetAdd": {
      const add = e.value * frac >= 0.5 ? Math.max(1, Math.round(e.value * frac)) : 0;
      return `+${add} ricochet`;
    }
    case "chainAdd": {
      const add = e.value * frac >= 0.5 ? Math.max(1, Math.round(e.value * frac)) : 0;
      return `+${add} chain`;
    }
    case "burnAdd":
      return `Burn ${formatNum(e.dps * frac)} dps for ${formatNum(e.duration)}s`;
    case "slowAdd":
      return `Slow ${Math.round(e.pct * frac * 100)}% for ${formatNum(e.duration)}s`;
    default:
      return card.text;
  }
}

export function applyCard(world: World, avatarId: EntityId, card: Card): void {
  applyEffectToWorld(card.effect, world, avatarId);
}

/**
 * Apply the *delta* from levelling a card from `newLevel - 1` → `newLevel`.
 *
 * For levelable effects (stat modifiers), each level applies a diminishing
 * fraction of the base effect.  Multiplicative effects (periodMul, speedMul,
 * projectileSpeedMul, hitboxMul) are converted to additive deltas so they
 * don't compound exponentially.
 *
 * Non-levelable effects (synergy, evolution, weapon-class) are ignored — they
 * only fire once via `applyCard` on the first pick and don't scale further.
 */
export function applyCardLevelUp(world: World, avatarId: EntityId, card: Card, newLevel: number): void {
  if (!isLevelableEffect(card.effect)) return;

  const c = world.get(avatarId);
  if (!c || !c.avatar || !c.weapon) return;

  const frac = levelBonusFraction(newLevel);
  const e = card.effect;

  switch (e.kind) {
    case "damageAdd":
      c.weapon.damage += Math.max(1, Math.round(e.value * frac));
      break;
    case "periodMul": {
      // Base bonus is (1 - value), e.g. 0.8 → 0.2 reduction.
      // Each level adds a diminishing additive chunk of that reduction.
      const baseReduction = 1 - e.value; // positive for speed-ups
      const delta = baseReduction * frac;
      c.weapon.period = Math.max(0.05, c.weapon.period - c.weapon.period * delta);
      break;
    }
    case "projectileSpeedMul": {
      const baseBoost = e.value - 1; // e.g. 1.25 → 0.25
      const delta = baseBoost * frac;
      c.weapon.projectileSpeed *= 1 + delta;
      break;
    }
    case "projectilesAdd":
      // Only grant +1 at certain levels (rounding)
      if (e.value * frac >= 0.5) c.weapon.projectiles += Math.max(1, Math.round(e.value * frac));
      break;
    case "pierceAdd":
      if (e.value * frac >= 0.5) c.weapon.pierce += Math.max(1, Math.round(e.value * frac));
      break;
    case "critAdd":
      c.weapon.crit = Math.min(1, c.weapon.crit + e.value * frac);
      break;
    case "maxHpAdd": {
      const add = Math.max(1, Math.round(e.value * frac));
      c.avatar.maxHp += add;
      c.avatar.hp = Math.min(c.avatar.maxHp, c.avatar.hp + add);
      break;
    }
    case "speedMul": {
      const baseBoost = e.value - 1; // e.g. 1.2 → 0.2
      const delta = baseBoost * frac;
      c.avatar.speedMul *= 1 + delta;
      break;
    }
    case "ricochetAdd":
      if (e.value * frac >= 0.5) c.weapon.ricochet += Math.max(1, Math.round(e.value * frac));
      break;
    case "chainAdd":
      if (e.value * frac >= 0.5) c.weapon.chain += Math.max(1, Math.round(e.value * frac));
      break;
    case "burnAdd":
      c.weapon.burnDps += e.dps * frac;
      c.weapon.burnDuration = Math.max(c.weapon.burnDuration, e.duration);
      break;
    case "slowAdd":
      c.weapon.slowPct = Math.min(0.9, c.weapon.slowPct + e.pct * frac);
      c.weapon.slowDuration = Math.max(c.weapon.slowDuration, e.duration);
      break;
  }
}
