import { createWeaponForMode } from "./entities";
import type { CardEffect } from "./cards";
import type { EntityId, WeaponState, World } from "./world";

/** Soft cap on simultaneous Weapon-class picks per run. */
export const MAX_EXTRA_WEAPONS = 3;

export type EquipEffectKind =
  | "damageAdd"
  | "periodMul"
  | "projectileSpeedMul"
  | "pierceAdd"
  | "critAdd"
  | "maxHpAdd"
  | "speedMul"
  | "projectilesAdd"
  | "iframeAdd"
  | "pickupRadiusMul";

export interface EquipEffect {
  effectKind: EquipEffectKind;
  effectValue: number;
}

export type RuntimeEffect =
  | CardEffect
  | { kind: "iframeAdd"; value: number }
  | { kind: "pickupRadiusMul"; value: number };

export interface MirrorEffectSpecState {
  weapon: WeaponState;
  contactDamage: number;
  maxSpeed: number;
  hp: number;
  shieldMax?: number;
  shieldRegenPeriod?: number;
  dodgePeriod?: number;
  secondChance?: boolean;
  homingShots?: boolean;
}

export function toRuntimeEquipEffect(effect: EquipEffect): RuntimeEffect {
  return { kind: effect.effectKind, value: effect.effectValue } as RuntimeEffect;
}

export function applyEffectToWorld(
  effect: RuntimeEffect,
  world: World,
  avatarId: EntityId,
): void {
  const c = world.get(avatarId);
  if (!c || !c.avatar || !c.weapon) return;
  switch (effect.kind) {
    case "damageAdd":
      c.weapon.damage += effect.value;
      break;
    case "periodMul":
      c.weapon.period = Math.max(0.05, c.weapon.period * effect.value);
      break;
    case "projectileSpeedMul":
      c.weapon.projectileSpeed *= effect.value;
      break;
    case "projectilesAdd":
      c.weapon.projectiles += effect.value;
      break;
    case "pierceAdd":
      c.weapon.pierce += effect.value;
      break;
    case "critAdd":
      c.weapon.crit = Math.min(1, c.weapon.crit + effect.value);
      break;
    case "maxHpAdd":
      c.avatar.maxHp += effect.value;
      c.avatar.hp = Math.min(c.avatar.maxHp, c.avatar.hp + effect.value);
      break;
    case "speedMul":
      c.avatar.speedMul *= effect.value;
      break;
    case "ricochetAdd":
      c.weapon.ricochet += effect.value;
      break;
    case "chainAdd":
      c.weapon.chain += effect.value;
      break;
    case "burnAdd":
      c.weapon.burnDps += effect.dps;
      c.weapon.burnDuration = Math.max(c.weapon.burnDuration, effect.duration);
      break;
    case "slowAdd":
      c.weapon.slowPct = Math.min(0.9, c.weapon.slowPct + effect.pct);
      c.weapon.slowDuration = Math.max(c.weapon.slowDuration, effect.duration);
      break;
    case "synergy":
      if (!c.avatar.synergies) c.avatar.synergies = [];
      c.avatar.synergies.push(
        effect.id === "combustion"
          ? { id: effect.id, killCounter: 0 }
          : { id: effect.id },
      );
      break;
    case "shieldRegen":
      c.avatar.shieldMax = (c.avatar.shieldMax ?? 0) + effect.max;
      c.avatar.shield = (c.avatar.shield ?? 0) + effect.max;
      c.avatar.shieldRegenPeriod = Math.min(
        c.avatar.shieldRegenPeriod ?? Infinity,
        effect.period,
      );
      c.avatar.shieldRegenTimer = 0;
      break;
    case "secondChance":
      if (c.avatar.secondChance === undefined) c.avatar.secondChance = true;
      break;
    case "hitboxMul":
      if (c.radius !== undefined) c.radius = Math.max(2, c.radius * effect.value);
      break;
    case "dodgeCD":
      c.avatar.dodgeMax = (c.avatar.dodgeMax ?? 0) + 1;
      c.avatar.dodgeCharges = (c.avatar.dodgeCharges ?? 0) + 1;
      c.avatar.dodgePeriod = Math.min(
        c.avatar.dodgePeriod ?? Infinity,
        effect.cooldown,
      );
      c.avatar.dodgeCooldown = 0;
      break;
    case "addWeapon":
      if (!c.avatar.extraWeapons) c.avatar.extraWeapons = [];
      if (c.avatar.extraWeapons.length < MAX_EXTRA_WEAPONS) {
        c.avatar.extraWeapons.push(createWeaponForMode(effect.mode));
      }
      break;
    case "iframeAdd":
      c.avatar.iframeBonus = (c.avatar.iframeBonus ?? 0) + effect.value;
      break;
    case "pickupRadiusMul":
      c.avatar.pickupRadiusMul = (c.avatar.pickupRadiusMul ?? 1) * effect.value;
      break;
  }
}

export function applyEffectToMirrorSpec(
  effect: CardEffect,
  spec: MirrorEffectSpecState,
): void {
  switch (effect.kind) {
    case "damageAdd":
      spec.weapon.damage += effect.value;
      spec.contactDamage += effect.value;
      break;
    case "periodMul":
      spec.weapon.period = Math.max(0.2, spec.weapon.period * effect.value);
      break;
    case "projectileSpeedMul":
      spec.weapon.projectileSpeed *= effect.value;
      break;
    case "projectilesAdd":
      spec.weapon.projectiles += effect.value;
      break;
    case "pierceAdd":
      spec.hp += effect.value * 8;
      break;
    case "critAdd":
      spec.weapon.crit = Math.min(1, spec.weapon.crit + effect.value);
      break;
    case "maxHpAdd":
      spec.hp += effect.value * 10;
      break;
    case "speedMul":
      spec.maxSpeed *= effect.value;
      break;
    case "ricochetAdd":
      spec.hp += effect.value * 6;
      break;
    case "chainAdd":
      spec.weapon.projectiles += effect.value;
      break;
    case "burnAdd":
      spec.weapon.damage += Math.max(1, Math.round(effect.dps * effect.duration * 0.25));
      break;
    case "slowAdd":
      spec.maxSpeed *= 1 + effect.pct * 0.5;
      break;
    case "synergy":
      switch (effect.id) {
        case "combustion":
          spec.weapon.damage += 2;
          break;
        case "desperate":
          spec.hp += 15;
          break;
        case "kinetic":
          spec.maxSpeed *= 1.15;
          break;
        case "stillness":
          spec.weapon.period = Math.max(0.2, spec.weapon.period * 0.85);
          break;
      }
      break;
    case "shieldRegen":
      spec.shieldMax = (spec.shieldMax ?? 0) + effect.max;
      spec.shieldRegenPeriod =
        spec.shieldRegenPeriod === undefined
          ? effect.period
          : Math.min(spec.shieldRegenPeriod, effect.period);
      break;
    case "secondChance":
      spec.secondChance = true;
      break;
    case "hitboxMul":
      spec.maxSpeed *= 1 + (1 - effect.value) * 0.5;
      break;
    case "dodgeCD":
      spec.dodgePeriod =
        spec.dodgePeriod === undefined
          ? effect.cooldown * 2
          : Math.max(8, spec.dodgePeriod * 0.85);
      break;
    case "addWeapon":
      switch (effect.mode) {
        case "faceBeam":
          spec.weapon.projectiles += 1;
          break;
        case "orbitShard":
          spec.weapon.damage += 1;
          spec.hp += 8;
          break;
        case "homing":
          spec.homingShots = true;
          break;
        case "burst":
          spec.weapon.damage += 2;
          break;
        case "fan":
          spec.weapon.projectiles += 2;
          break;
        case "charge":
          spec.weapon.damage += 3;
          spec.weapon.period = Math.max(0.2, spec.weapon.period * 0.85);
          break;
      }
      break;
  }
}
