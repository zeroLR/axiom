import { spawnEnemy } from "../entities";
import type { Rng } from "../rng";
import { type WaveSpec } from "../waves";
import type { World } from "../world";

export interface WaveState {
  spec: WaveSpec;
  elapsed: number;
  nextGroupIdx: number;
  cleared: boolean;
}

export function newWaveState(spec: WaveSpec): WaveState {
  return { spec, elapsed: 0, nextGroupIdx: 0, cleared: false };
}

export function updateWave(state: WaveState, world: World, rng: Rng, dt: number): void {
  if (state.cleared) return;
  state.elapsed += dt;
  while (state.nextGroupIdx < state.spec.groups.length) {
    const g = state.spec.groups[state.nextGroupIdx]!;
    if (state.elapsed < g.t) break;
    for (let i = 0; i < g.count; i++) spawnEnemy(world, g.kind, rng);
    state.nextGroupIdx += 1;
  }
  if (state.nextGroupIdx >= state.spec.groups.length) {
    // All groups fired — check if any enemy remains.
    let alive = false;
    for (const [, c] of world.with("enemy", "hp")) {
      if ((c.hp?.value ?? 0) > 0) { alive = true; break; }
    }
    if (!alive) state.cleared = true;
  }
}
