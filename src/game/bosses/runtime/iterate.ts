// Iterate runtime — thin shim over the declarative phase script.
// See `bosses/scripts/iterate.ts` for phase data.

import type { Rng } from "../../rng";
import type { Components, World } from "../../world";
import { runPhaseScript } from "./phaseDsl";
import { ITERATE_MAX_HP, ITERATE_SCRIPT } from "../scripts/iterate";

export function updateIteratePattern(
  world: World,
  c: Components,
  ax: number,
  ay: number,
  rng: Rng,
  dt: number,
  fireAimedFan: (world: World, c: Components, baseAngle: number, rng: Rng) => void,
): void {
  runPhaseScript(ITERATE_SCRIPT, {
    world, c, ax, ay, rng, dt, fireAimedFan,
    maxHp: ITERATE_MAX_HP,
  });
}
