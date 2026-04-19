import { describe, expect, it } from "vitest";
import { spawnAvatar } from "../src/game/entities";
import { defaultPlayerProfile } from "../src/game/data/types";
import { applyStartingShapeLoadout, isStartingShapeUnlocked, resolveSelectedStartingShape } from "../src/game/startingShapes";
import { World } from "../src/game/world";

describe("starting shapes", () => {
  it("keeps triangle unlocked by default", () => {
    const profile = defaultPlayerProfile();
    expect(isStartingShapeUnlocked(profile, "triangle")).toBe(true);
    expect(isStartingShapeUnlocked(profile, "square")).toBe(false);
    expect(isStartingShapeUnlocked(profile, "diamond")).toBe(false);
  });

  it("unlocks square and diamond with cumulative points", () => {
    const profile = defaultPlayerProfile();
    profile.stats.totalPointsEarned = 650;
    expect(isStartingShapeUnlocked(profile, "square")).toBe(true);
    expect(isStartingShapeUnlocked(profile, "diamond")).toBe(false);
    profile.stats.totalPointsEarned = 1500;
    expect(isStartingShapeUnlocked(profile, "diamond")).toBe(true);
  });

  it("falls back to triangle if selected shape is locked", () => {
    const profile = defaultPlayerProfile();
    profile.activeStartShape = "diamond";
    expect(resolveSelectedStartingShape(profile)).toBe("triangle");
  });

  it("applies shape weapon mode to avatar", () => {
    const world = new World();
    const avatarId = spawnAvatar(world);
    applyStartingShapeLoadout(world, avatarId, "square");
    expect(world.get(avatarId)?.weapon?.mode).toBe("faceBeam");
    applyStartingShapeLoadout(world, avatarId, "diamond");
    expect(world.get(avatarId)?.weapon?.mode).toBe("orbitShard");
    applyStartingShapeLoadout(world, avatarId, "triangle");
    expect(world.get(avatarId)?.weapon?.mode).toBe("vertex");
  });
});

