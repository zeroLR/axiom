// Limit runtime — thin shim over the declarative phase script.
// See `bosses/scripts/limit.ts` for phase data.

import type { Rng } from "../../rng";
import type { Components, World } from "../../world";
import { runPhaseScript } from "./phaseDsl";
import { LIMIT_MAX_HP, LIMIT_SCRIPT } from "../scripts/limit";

export function updateLimitPattern(
  world: World,
  c: Components,
  ax: number,
  ay: number,
  rng: Rng,
  dt: number,
  fireAimedFan: (world: World, c: Components, baseAngle: number, rng: Rng) => void,
): void {
  runPhaseScript(LIMIT_SCRIPT, {
    world, c, ax, ay, rng, dt, fireAimedFan,
    maxHp: LIMIT_MAX_HP,
  });
}
