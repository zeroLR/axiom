// Null runtime — thin shim over the declarative phase script.
// See `bosses/scripts/null.ts` for phase data.

import type { Rng } from "../../rng";
import type { Components, World } from "../../world";
import { runPhaseScript } from "./phaseDsl";
import { NULL_MAX_HP, NULL_SCRIPT } from "../scripts/null";

export function updateNullPattern(
  world: World,
  c: Components,
  ax: number,
  ay: number,
  rng: Rng,
  dt: number,
  fireAimedFan: (world: World, c: Components, baseAngle: number, rng: Rng) => void,
): void {
  runPhaseScript(NULL_SCRIPT, {
    world, c, ax, ay, rng, dt, fireAimedFan,
    maxHp: NULL_MAX_HP,
  });
}
