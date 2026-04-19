import { describe, expect, it } from "vitest";
import { spawnAvatar } from "../src/game/entities";
import { updateWeapon } from "../src/game/systems/weapon";
import { World } from "../src/game/world";

function seedEnemy(world: World): void {
  world.create({
    pos: { x: 180, y: 120 },
    vel: { x: 0, y: 0 },
    radius: 8,
    team: "enemy",
    enemy: { kind: "circle", contactDamage: 1, maxSpeed: 1, wobblePhase: 0 },
    hp: { value: 5 },
  });
}

describe("weapon modes", () => {
  it("faceBeam fires four short-range beams", () => {
    const world = new World();
    const avatarId = spawnAvatar(world);
    seedEnemy(world);
    const avatar = world.get(avatarId)!;
    avatar.weapon!.mode = "faceBeam";
    avatar.weapon!.cooldown = 0;
    updateWeapon(world, avatarId, () => 0, 0.016);
    const shots = Array.from(world.with("projectile"));
    expect(shots).toHaveLength(4);
    for (const [, c] of shots) {
      expect(c.projectile?.ttl).toBeCloseTo(0.24, 6);
    }
  });

  it("orbitShard spawns orbiting projectiles", () => {
    const world = new World();
    const avatarId = spawnAvatar(world);
    seedEnemy(world);
    const avatar = world.get(avatarId)!;
    avatar.weapon!.mode = "orbitShard";
    avatar.weapon!.cooldown = 0;
    updateWeapon(world, avatarId, () => 0, 0.016);
    const shots = Array.from(world.with("projectile"));
    expect(shots).toHaveLength(1);
    expect(shots[0]?.[1].projectile?.orbit?.ownerId).toBe(avatarId);
  });
});

