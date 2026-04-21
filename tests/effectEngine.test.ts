import { describe, expect, it } from "vitest";
import {
  applyEffectToMirrorSpec,
  applyEffectToWorld,
  toRuntimeEquipEffect,
  type MirrorEffectSpecState,
} from "../src/game/effectEngine";
import { World, type WeaponState } from "../src/game/world";
import type { Card } from "../src/game/cards";

function makeWeapon(): WeaponState {
  return {
    period: 1,
    damage: 1,
    projectileSpeed: 200,
    projectiles: 1,
    pierce: 0,
    crit: 0,
    cooldown: 0,
    ricochet: 0,
    chain: 0,
    burnDps: 0,
    burnDuration: 0,
    slowPct: 0,
    slowDuration: 0,
  };
}

function spawnAvatar(world: World): number {
  return world.create({
    pos: { x: 0, y: 0 },
    radius: 10,
    team: "player",
    avatar: {
      hp: 3,
      maxHp: 3,
      speedMul: 1,
      iframes: 0,
      targetX: 0,
      targetY: 0,
    },
    weapon: makeWeapon(),
  });
}

function card(effect: Card["effect"]): Card {
  return {
    id: "test",
    name: "test",
    glyph: "?",
    rarity: "common",
    text: "",
    effect,
  };
}

describe("effectEngine world effects", () => {
  it("applies card effects to avatar weapon", () => {
    const world = new World();
    const avatarId = spawnAvatar(world);
    applyEffectToWorld(card({ kind: "damageAdd", value: 2 }).effect, world, avatarId);
    expect(world.get(avatarId)!.weapon!.damage).toBe(3);
  });

  it("applies equipment-only effects via normalized runtime effect", () => {
    const world = new World();
    const avatarId = spawnAvatar(world);
    applyEffectToWorld(toRuntimeEquipEffect({ effectKind: "iframeAdd", effectValue: 0.3 }), world, avatarId);
    applyEffectToWorld(toRuntimeEquipEffect({ effectKind: "pickupRadiusMul", effectValue: 1.2 }), world, avatarId);
    const avatar = world.get(avatarId)!.avatar!;
    expect(avatar.iframeBonus).toBe(0.3);
    expect(avatar.pickupRadiusMul).toBe(1.2);
  });
});

describe("effectEngine mirror effects", () => {
  it("applies mirror-specific conversion for selected effects", () => {
    const spec: MirrorEffectSpecState = {
      weapon: makeWeapon(),
      contactDamage: 1,
      maxSpeed: 50,
      hp: 400,
    };
    applyEffectToMirrorSpec(card({ kind: "pierceAdd", value: 2 }).effect, spec);
    applyEffectToMirrorSpec(card({ kind: "addWeapon", mode: "homing" }).effect, spec);
    expect(spec.hp).toBe(416);
    expect(spec.homingShots).toBe(true);
  });
});
