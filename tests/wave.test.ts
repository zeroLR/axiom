import { describe, expect, it } from "vitest";
import { createRng } from "../src/game/rng";
import { newWaveState, updateWave } from "../src/game/systems/wave";
import { WAVES, type SpawnGroup, type WaveSpec } from "../src/game/waves";
import { World } from "../src/game/world";

function countEnemies(world: World): number {
  let n = 0;
  for (const [, c] of world.with("enemy")) {
    if ((c.hp?.value ?? 0) > 0) n++;
  }
  return n;
}

function tick(state: { elapsed: number; nextGroupIdx: number; cleared: boolean; spec: WaveSpec }, world: World, rng: () => number, steps: number, dt = 1 / 60): void {
  for (let i = 0; i < steps; i++) updateWave(state, world, rng, dt);
}

describe("WAVES spec sanity", () => {
  it("has 8 waves with monotonic indices", () => {
    expect(WAVES).toHaveLength(8);
    WAVES.forEach((w, i) => expect(w.index).toBe(i + 1));
  });

  it("every wave has at least one spawn group", () => {
    for (const w of WAVES) expect(w.groups.length).toBeGreaterThan(0);
  });

  it("spawn groups fire in non-decreasing time order", () => {
    for (const w of WAVES) {
      for (let i = 1; i < w.groups.length; i++) {
        expect(w.groups[i]!.t).toBeGreaterThanOrEqual(w.groups[i - 1]!.t);
      }
    }
  });

  it("only the final wave spawns a boss", () => {
    WAVES.forEach((w, i) => {
      const hasBoss = w.groups.some((g: SpawnGroup) => g.kind === "boss");
      if (i === WAVES.length - 1) expect(hasBoss).toBe(true);
      else expect(hasBoss).toBe(false);
    });
  });
});

describe("updateWave", () => {
  it("spawns groups at their scheduled times", () => {
    const world = new World();
    const rng = createRng(1);
    const spec = WAVES[0]!;
    const state = newWaveState(spec);
    // first group fires at t=0.5 with 3 circles.
    tick(state, world, rng, 40); // ~0.67s
    expect(countEnemies(world)).toBe(3);
  });

  it("does not mark cleared until every group has fired", () => {
    const world = new World();
    const rng = createRng(2);
    const spec = WAVES[0]!;
    const state = newWaveState(spec);
    tick(state, world, rng, 60 * 3); // 3 seconds — only first group has fired
    expect(state.cleared).toBe(false);
  });

  it("clears once all groups fired and enemies wiped", () => {
    const world = new World();
    const rng = createRng(3);
    const spec = WAVES[0]!;
    const state = newWaveState(spec);
    // Advance past the last group time and remove enemies before the next tick.
    const maxT = spec.groups[spec.groups.length - 1]!.t;
    tick(state, world, rng, Math.ceil((maxT + 0.2) * 60));
    // All enemies are defeated by the bored designer.
    for (const [, c] of world.with("enemy", "hp")) c.hp!.value = 0;
    updateWave(state, world, rng, 1 / 60);
    expect(state.cleared).toBe(true);
  });
});
