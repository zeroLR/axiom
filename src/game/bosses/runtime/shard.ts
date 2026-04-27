// Shard runtime — thin shim over the declarative phase script.
// See `bosses/scripts/shard.ts` for phase data.

import type { Rng } from "../../rng";
import type { Components, World } from "../../world";
import { runPhaseScript } from "./phaseDsl";
import { SHARD_MAX_HP, SHARD_SCRIPT } from "../scripts/shard";

export function updateShardPattern(
  world: World,
  c: Components,
  ax: number,
  ay: number,
  rng: Rng,
  dt: number,
  fireAimedFan: (world: World, c: Components, baseAngle: number, rng: Rng) => void,
): void {
  runPhaseScript(SHARD_SCRIPT, {
    world, c, ax, ay, rng, dt, fireAimedFan,
    maxHp: SHARD_MAX_HP,
  });
}
