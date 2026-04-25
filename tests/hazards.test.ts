import { describe, it, expect } from "vitest";
import {
  HAZARD_REGISTRY,
  getHazardDef,
  type HazardId,
} from "../src/game/content/hazards";
import type { Components } from "../src/game/world";

describe("HAZARD_REGISTRY", () => {
  it("registers exactly fog and axis-lock", () => {
    const ids = Object.keys(HAZARD_REGISTRY).sort();
    expect(ids).toEqual(["axis-lock", "fog"]);
  });

  it("getHazardDef returns null for unknown ids and missing input", () => {
    expect(getHazardDef(undefined)).toBeNull();
    expect(getHazardDef("not-real")).toBeNull();
    for (const id of Object.keys(HAZARD_REGISTRY) as HazardId[]) {
      expect(getHazardDef(id)?.id).toBe(id);
    }
  });

  it("fog has no avatar tick (visual-only hazard)", () => {
    expect(HAZARD_REGISTRY.fog.applyAvatarTick).toBeUndefined();
  });

  it("axis-lock snaps avatar target to the dominant cardinal axis", () => {
    const tick = HAZARD_REGISTRY["axis-lock"].applyAvatarTick;
    expect(tick).toBeDefined();

    // |dx| > |dy| → snap target Y to current pos Y (lock to horizontal).
    const horizontal: Components = {
      pos: { x: 100, y: 100 },
      avatar: {
        targetX: 200,
        targetY: 130,
        speedMul: 1,
        synergies: [],
        iframes: 0,
      },
    } as unknown as Components;
    tick!(horizontal, 1 / 60);
    expect(horizontal.avatar!.targetX).toBe(200);
    expect(horizontal.avatar!.targetY).toBe(100);

    // |dy| > |dx| → snap target X to current pos X (lock to vertical).
    const vertical: Components = {
      pos: { x: 100, y: 100 },
      avatar: {
        targetX: 130,
        targetY: 250,
        speedMul: 1,
        synergies: [],
        iframes: 0,
      },
    } as unknown as Components;
    tick!(vertical, 1 / 60);
    expect(vertical.avatar!.targetX).toBe(100);
    expect(vertical.avatar!.targetY).toBe(250);
  });

  it("axis-lock is a no-op when avatar or pos is missing", () => {
    const tick = HAZARD_REGISTRY["axis-lock"].applyAvatarTick!;
    const empty = {} as unknown as Components;
    expect(() => tick(empty, 1 / 60)).not.toThrow();
  });
});
