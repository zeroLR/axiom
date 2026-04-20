import type { BossId } from "./bosses/types";
import { isLevelableEffect, levelBonusFraction } from "./cardLevels";
import { createWeaponForMode } from "./entities";
import { type Rng, shuffle } from "./rng";
import type { EntityId, SynergyId, WeaponMode, World } from "./world";

/** Soft cap on simultaneous Weapon-class picks per run. Prevents runaway DPS / FPS. */
export const MAX_EXTRA_WEAPONS = 3;

export type Rarity = "common" | "uncommon" | "rare";

export type CardEffect =
  | { kind: "damageAdd"; value: number }
  | { kind: "periodMul"; value: number }      // < 1 = faster fire
  | { kind: "projectileSpeedMul"; value: number }
  | { kind: "projectilesAdd"; value: number }
  | { kind: "pierceAdd"; value: number }
  | { kind: "critAdd"; value: number }         // 0..1
  | { kind: "maxHpAdd"; value: number }
  | { kind: "speedMul"; value: number }
  | { kind: "ricochetAdd"; value: number }
  | { kind: "chainAdd"; value: number }
  | { kind: "burnAdd"; dps: number; duration: number }
  | { kind: "slowAdd"; pct: number; duration: number }
  | { kind: "synergy"; id: SynergyId }
  // --- Evolution effects ---
  | { kind: "shieldRegen"; max: number; period: number }
  | { kind: "secondChance" }
  | { kind: "hitboxMul"; value: number }
  | { kind: "dodgeCD"; cooldown: number }
  // --- Weapon-class cards: each adds a parallel weapon firing alongside primary. ---
  | { kind: "addWeapon"; mode: WeaponMode };

export interface Card {
  id: string;
  name: string;
  glyph: string;    // single-char symbol rendered as the art
  rarity: Rarity;
  text: string;
  effect: CardEffect;
  /** If set, this card only appears in the draft pool after the given boss is defeated. */
  unlockAfterBoss?: BossId;
}

export const POOL: readonly Card[] = [
  { id: "sharp",      name: "Sharp Edge",    glyph: "△", rarity: "common",   text: "+1 damage",              effect: { kind: "damageAdd", value: 1 } },
  { id: "rapid",      name: "Rapid Fire",    glyph: "⟫", rarity: "common",   text: "-20% fire interval",     effect: { kind: "periodMul", value: 0.8 } },
  { id: "velocity",   name: "Velocity",      glyph: "→", rarity: "common",   text: "+25% projectile speed",  effect: { kind: "projectileSpeedMul", value: 1.25 } },
  { id: "fork",       name: "Fork",          glyph: "⋔", rarity: "uncommon", text: "+1 projectile",          effect: { kind: "projectilesAdd", value: 1 } },
  { id: "pierce",     name: "Pierce",        glyph: "◇", rarity: "uncommon", text: "+1 pierce",              effect: { kind: "pierceAdd", value: 1 } },
  { id: "crit",       name: "Crit",          glyph: "✦", rarity: "uncommon", text: "+25% crit chance",       effect: { kind: "critAdd", value: 0.25 } },
  { id: "plating",    name: "Plating",       glyph: "▢", rarity: "common",   text: "+1 max HP",              effect: { kind: "maxHpAdd", value: 1 } },
  { id: "dash",       name: "Dash",          glyph: "≫", rarity: "common",   text: "+20% move speed",        effect: { kind: "speedMul", value: 1.2 } },
  { id: "overclock",  name: "Overclock",     glyph: "◎", rarity: "rare",     text: "-35% fire interval",     effect: { kind: "periodMul", value: 0.65 } },
  { id: "heavy",      name: "Heavy Rounds",  glyph: "■", rarity: "rare",     text: "+2 damage",              effect: { kind: "damageAdd", value: 2 } },
  { id: "rebound",    name: "Rebound",       glyph: "⇌", rarity: "uncommon", text: "+1 ricochet",            effect: { kind: "ricochetAdd", value: 1 } },
  { id: "ignite",     name: "Ignite",        glyph: "※", rarity: "rare",     text: "Burn 2 dps for 3s",      effect: { kind: "burnAdd", dps: 2, duration: 3 } },
  { id: "freeze",     name: "Freeze",        glyph: "❄", rarity: "uncommon", text: "Slow 35% for 2s",        effect: { kind: "slowAdd", pct: 0.35, duration: 2 } },
  { id: "arc",        name: "Arc",           glyph: "⌇", rarity: "rare",     text: "+1 chain",               effect: { kind: "chainAdd", value: 1 } },
  { id: "combustion", name: "Combustion",    glyph: "❂", rarity: "rare",     text: "Every 10 kills: AoE explosion", effect: { kind: "synergy", id: "combustion" } },
  { id: "desperate",  name: "Desperate",     glyph: "✖", rarity: "rare",     text: "While HP ≤ 2: ×2 damage",       effect: { kind: "synergy", id: "desperate" } },
  { id: "kinetic",    name: "Kinetic",       glyph: "↯", rarity: "uncommon", text: "While moving: +25% crit",       effect: { kind: "synergy", id: "kinetic" } },
  { id: "stillness",  name: "Stillness",     glyph: "◦", rarity: "uncommon", text: "While still: -25% fire interval", effect: { kind: "synergy", id: "stillness" } },
  { id: "aegis",      name: "Aegis",         glyph: "❖", rarity: "rare",     text: "Shield 2; +1 every 6s when safe", effect: { kind: "shieldRegen", max: 2, period: 6 } },
  { id: "revenant",   name: "Revenant",      glyph: "↻", rarity: "rare",     text: "Once per run: revive at 50% HP",  effect: { kind: "secondChance" } },
  { id: "compact",    name: "Compact",       glyph: "▽", rarity: "uncommon", text: "-25% hitbox",                     effect: { kind: "hitboxMul", value: 0.75 } },
  { id: "phaseShift", name: "Phase Shift",   glyph: "⇶", rarity: "rare",     text: "Auto-dodge every 8s",             effect: { kind: "dodgeCD", cooldown: 8 } },
  // --- Weapon-class: each adds a parallel weapon firing alongside primary. ---
  { id: "wpnFaceBeam",   name: "Face Beam",   glyph: "✚", rarity: "rare",     text: "+Weapon: 4-way beam",             effect: { kind: "addWeapon", mode: "faceBeam" } },
  { id: "wpnOrbitShard", name: "Orbit Shard", glyph: "◌", rarity: "rare",     text: "+Weapon: orbiting shards",        effect: { kind: "addWeapon", mode: "orbitShard" } },
  { id: "wpnHoming",     name: "Tracker",     glyph: "⊙", rarity: "uncommon", text: "+Weapon: homing missile",         effect: { kind: "addWeapon", mode: "homing" } },
  { id: "wpnBurst",      name: "Burst",       glyph: "✺", rarity: "rare",     text: "+Weapon: bursts into fragments",  effect: { kind: "addWeapon", mode: "burst" } },
  { id: "wpnFan",        name: "Sweep",       glyph: "≋", rarity: "uncommon", text: "+Weapon: 5-shot fan",             effect: { kind: "addWeapon", mode: "fan" } },
  { id: "wpnCharge",     name: "Cannon",      glyph: "⏶", rarity: "rare",     text: "+Weapon: piercing cannon",        effect: { kind: "addWeapon", mode: "charge" } },
  // --- Boss-gated cards (unlocked by defeating specific bosses) ---
  { id: "axisLock",      name: "Axis Lock",    glyph: "╋", rarity: "uncommon", text: "+2 damage, axis-only fire",       effect: { kind: "damageAdd", value: 2 },       unlockAfterBoss: "orthogon" },
  { id: "gridSnap",      name: "Grid Snap",    glyph: "⊞", rarity: "uncommon", text: "+25% crit chance",                effect: { kind: "critAdd", value: 0.25 },      unlockAfterBoss: "orthogon" },
  { id: "contrail",      name: "Contrail",     glyph: "⁓", rarity: "uncommon", text: "Burn 1.5 dps for 2.5s",           effect: { kind: "burnAdd", dps: 1.5, duration: 2.5 }, unlockAfterBoss: "jets" },
  { id: "reboundPlus",   name: "Rebound+",     glyph: "⤨", rarity: "uncommon", text: "+2 ricochet",                     effect: { kind: "ricochetAdd", value: 2 },     unlockAfterBoss: "jets" },
  { id: "recursion",     name: "Recursion",    glyph: "∞", rarity: "rare",     text: "+3 damage, -30% fire interval",   effect: { kind: "damageAdd", value: 3 },       unlockAfterBoss: "mirror" },
];

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
      return `+${add} projectile`;
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
  const c = world.get(avatarId);
  if (!c || !c.avatar || !c.weapon) return;
  const e = card.effect;
  switch (e.kind) {
    case "damageAdd":          c.weapon.damage += e.value; break;
    case "periodMul":          c.weapon.period = Math.max(0.05, c.weapon.period * e.value); break;
    case "projectileSpeedMul": c.weapon.projectileSpeed *= e.value; break;
    case "projectilesAdd":     c.weapon.projectiles += e.value; break;
    case "pierceAdd":          c.weapon.pierce += e.value; break;
    case "critAdd":            c.weapon.crit = Math.min(1, c.weapon.crit + e.value); break;
    case "maxHpAdd":
      c.avatar.maxHp += e.value;
      c.avatar.hp = Math.min(c.avatar.maxHp, c.avatar.hp + e.value);
      break;
    case "speedMul":           c.avatar.speedMul *= e.value; break;
    case "ricochetAdd":        c.weapon.ricochet += e.value; break;
    case "chainAdd":           c.weapon.chain += e.value; break;
    case "burnAdd":
      // Stack burn DPS additively; extend duration to the longer of the two.
      c.weapon.burnDps += e.dps;
      c.weapon.burnDuration = Math.max(c.weapon.burnDuration, e.duration);
      break;
    case "slowAdd":
      c.weapon.slowPct = Math.min(0.9, c.weapon.slowPct + e.pct);
      c.weapon.slowDuration = Math.max(c.weapon.slowDuration, e.duration);
      break;
    case "synergy":
      if (!c.avatar.synergies) c.avatar.synergies = [];
      // Combustion starts at 0 kills; others carry no per-instance state.
      c.avatar.synergies.push(
        e.id === "combustion" ? { id: e.id, killCounter: 0 } : { id: e.id },
      );
      break;
    case "shieldRegen":
      c.avatar.shieldMax = (c.avatar.shieldMax ?? 0) + e.max;
      c.avatar.shield = (c.avatar.shield ?? 0) + e.max;
      // Stacking copies use the shortest regen window so picks compound.
      c.avatar.shieldRegenPeriod = Math.min(c.avatar.shieldRegenPeriod ?? Infinity, e.period);
      c.avatar.shieldRegenTimer = 0;
      break;
    case "secondChance":
      // Only the first pick matters; later copies are dead picks rather than
      // stacking lives (keeps the card from trivialising late-run runs).
      if (c.avatar.secondChance === undefined) c.avatar.secondChance = true;
      break;
    case "hitboxMul":
      if (c.radius !== undefined) c.radius = Math.max(2, c.radius * e.value);
      break;
    case "dodgeCD":
      c.avatar.dodgeMax = (c.avatar.dodgeMax ?? 0) + 1;
      c.avatar.dodgeCharges = (c.avatar.dodgeCharges ?? 0) + 1;
      c.avatar.dodgePeriod = Math.min(c.avatar.dodgePeriod ?? Infinity, e.cooldown);
      c.avatar.dodgeCooldown = 0;
      break;
    case "addWeapon":
      // Soft-cap parallel weapons. Past the cap, the pick is a dead draft —
      // simpler than rerolling at draw time and still drives the cap visually.
      if (!c.avatar.extraWeapons) c.avatar.extraWeapons = [];
      if (c.avatar.extraWeapons.length < MAX_EXTRA_WEAPONS) {
        c.avatar.extraWeapons.push(createWeaponForMode(e.mode));
      }
      break;
  }
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
