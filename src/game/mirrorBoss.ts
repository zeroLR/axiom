import type { Card } from './cards';
import type { Components, WeaponState } from './world';
import { applyEffectToMirrorSpec } from './effectEngine';

// Mirror Boss: the wave-8 boss's combat stats are derived from whatever cards
// the player drafted during the run. Offensive picks make it shoot harder;
// movement picks make it faster. Pure mirror — no separate boss tuning pass.

// Baseline boss combat profile before any mirror scaling.
const BASE: {
  weapon: WeaponState;
  contactDamage: number;
  maxSpeed: number;
  hp: number;
} = {
  weapon: {
    period: 1.1,
    damage: 1,
    projectileSpeed: 200,
    projectiles: 1,
    pierce: 0,
    crit: 0,
    cooldown: 1.0,
    ricochet: 0,
    chain: 0,
    burnDps: 0,
    burnDuration: 0,
    slowPct: 0,
    slowDuration: 0,
  },
  contactDamage: 1,
  maxSpeed: 50,
  hp: 400,
};

export interface MirrorBossSpec {
  weapon: WeaponState;
  contactDamage: number;
  maxSpeed: number;
  hp: number;
  // ── Mirror-specific abilities ──────────────────────────────────────────
  /** Regenerating shield (mirrors Aegis). */
  shieldMax?: number;
  shieldRegenPeriod?: number;
  /** Auto-dodge period (mirrors Phase Shift). */
  dodgePeriod?: number;
  /** One-shot revive (mirrors Revenant). */
  secondChance?: boolean;
  /** Boss fires homing shots (mirrors Tracker). */
  homingShots?: boolean;
}

export function mirrorBossSpec(picks: readonly Card[]): MirrorBossSpec {
  const w: WeaponState = { ...BASE.weapon };
  let contactDamage = BASE.contactDamage;
  let maxSpeed = BASE.maxSpeed;
  let hp = BASE.hp;

  // Ability mirrors (true parity instead of HP conversion)
  let shieldMax: number | undefined;
  let shieldRegenPeriod: number | undefined;
  let dodgePeriod: number | undefined;
  let secondChance: boolean | undefined;
  let homingShots: boolean | undefined;

  for (const card of picks) {
    const spec = {
      weapon: w,
      contactDamage,
      maxSpeed,
      hp,
      shieldMax,
      shieldRegenPeriod,
      dodgePeriod,
      secondChance,
      homingShots,
    };
    applyEffectToMirrorSpec(card.effect, spec);
    ({ contactDamage, maxSpeed, hp, shieldMax, shieldRegenPeriod, dodgePeriod, secondChance, homingShots } = spec);
  }

  return {
    weapon: w,
    contactDamage,
    maxSpeed,
    hp,
    shieldMax,
    shieldRegenPeriod,
    dodgePeriod,
    secondChance,
    homingShots,
  };
}

export function applyMirrorSpec(boss: Components, spec: MirrorBossSpec): void {
  if (!boss.enemy || !boss.hp) return;
  boss.enemy.contactDamage = spec.contactDamage;
  boss.enemy.maxSpeed = spec.maxSpeed;
  boss.hp.value = spec.hp;
  boss.weapon = { ...spec.weapon };

  // ── Ability mirrors ────────────────────────────────────────────────────
  if (spec.shieldMax !== undefined && spec.shieldMax > 0) {
    boss.enemy.shield = spec.shieldMax;
    boss.enemy.mirrorShieldMax = spec.shieldMax;
    boss.enemy.shieldRegenPeriod = spec.shieldRegenPeriod;
    boss.enemy.shieldRegenTimer = 0;
  }
  if (spec.dodgePeriod !== undefined) {
    boss.enemy.mirrorDodgePeriod = spec.dodgePeriod;
    boss.enemy.mirrorDodgeCooldown = spec.dodgePeriod; // start with full cooldown
    boss.enemy.mirrorIframes = 0;
  }
  if (spec.secondChance) {
    boss.enemy.mirrorSecondChance = true;
  }
  if (spec.homingShots) {
    boss.enemy.mirrorHomingShots = true;
    // Parallel homing weapon fires on its own period (slightly slower than base).
    boss.enemy.mirrorHomingPeriod = spec.weapon.period * 1.5;
    boss.enemy.mirrorHomingCooldown = boss.enemy.mirrorHomingPeriod;
  }
}
