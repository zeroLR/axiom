import type { Card } from './cards';
import type { Components, WeaponState } from './world';

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
}

export function mirrorBossSpec(picks: readonly Card[]): MirrorBossSpec {
  const w: WeaponState = { ...BASE.weapon };
  let contactDamage = BASE.contactDamage;
  let maxSpeed = BASE.maxSpeed;
  let hp = BASE.hp;

  for (const card of picks) {
    const e = card.effect;
    switch (e.kind) {
      case 'damageAdd':
        w.damage += e.value;
        contactDamage += e.value;
        break;
      case 'periodMul':
        w.period = Math.max(0.2, w.period * e.value);
        break;
      case 'projectileSpeedMul':
        w.projectileSpeed *= e.value;
        break;
      case 'projectilesAdd':
        w.projectiles += e.value;
        break;
      case 'pierceAdd':
        // Boss shots one-shot on contact (avatar iframes handle the rest), so
        // pierce has no use; mirror it as +HP so the stat still "counts".
        hp += e.value * 8;
        break;
      case 'critAdd':
        w.crit = Math.min(1, w.crit + e.value);
        break;
      case 'maxHpAdd':
        hp += e.value * 10;
        break;
      case 'speedMul':
        maxSpeed *= e.value;
        break;
      case 'ricochetAdd':
        // Bouncing enemy shots would be noisy; mirror as bonus HP instead.
        hp += e.value * 6;
        break;
      case 'chainAdd':
        // Extra projectiles stand in for chain jumps.
        w.projectiles += e.value;
        break;
      case 'burnAdd':
        // Sustained damage → bigger bullets that hurt more.
        w.damage += Math.max(1, Math.round(e.dps * e.duration * 0.25));
        break;
      case 'slowAdd':
        // Slow on the player is harsh; mirror as boss moving faster.
        maxSpeed *= 1 + e.pct * 0.5;
        break;
      case 'synergy':
        // Conditional player buffs mirror as flat stat increases on the boss.
        switch (e.id) {
          case 'combustion':
            w.damage += 2;
            break;
          case 'desperate':
            hp += 15;
            break;
          case 'kinetic':
            maxSpeed *= 1.15;
            break;
          case 'stillness':
            w.period = Math.max(0.2, w.period * 0.85);
            break;
        }
        break;
      case 'shieldRegen':
        // Aegis on the boss → meaningful chunk of bonus HP per shield point.
        hp += e.max * 8;
        break;
      case 'secondChance':
        // Revenant → boss soaks one extra phase worth of HP.
        hp += 20;
        break;
      case 'hitboxMul':
        // Compact shrinks the player; mirror as a faster, harder-to-pin boss.
        maxSpeed *= 1 + (1 - e.value) * 0.5;
        break;
      case 'dodgeCD':
        // Phase Shift adds an extra HP cushion roughly equal to a half-life.
        hp += 12;
        break;
      case 'addWeapon':
        // Player gains a parallel weapon → boss gets a flavour-matched buff
        // proportional to that weapon's threat. Mirror is symbolic, not literal:
        // the boss can't fire two patterns at once, so each pick lands as raw
        // stat pressure (damage / fire-rate / projectiles / HP).
        switch (e.mode) {
          case 'faceBeam':
            w.projectiles += 1;
            break;
          case 'orbitShard':
            w.damage += 1;
            hp += 8;
            break;
          case 'homing':
            w.damage += 1;
            w.projectileSpeed *= 1.1;
            break;
          case 'burst':
            w.damage += 2;
            break;
          case 'fan':
            w.projectiles += 2;
            break;
          case 'charge':
            w.damage += 3;
            w.period = Math.max(0.2, w.period * 0.85);
            break;
        }
        break;
    }
  }

  return { weapon: w, contactDamage, maxSpeed, hp };
}

export function applyMirrorSpec(boss: Components, spec: MirrorBossSpec): void {
  if (!boss.enemy || !boss.hp) return;
  boss.enemy.contactDamage = spec.contactDamage;
  boss.enemy.maxSpeed = spec.maxSpeed;
  boss.hp.value = spec.hp;
  boss.weapon = { ...spec.weapon };
}
