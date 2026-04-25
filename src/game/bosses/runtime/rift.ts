// Rift runtime — thin shim over the declarative phase script. See
// `bosses/scripts/rift.ts` for the actual phase data.

import type { Rng } from "../../rng";
import type { Components, World } from "../../world";
import { runPhaseScript } from "./phaseDsl";
import { RIFT_MAX_HP, RIFT_SCRIPT } from "../scripts/rift";

export function updateRiftPattern(
  world: World,
  c: Components,
  ax: number,
  ay: number,
  rng: Rng,
  dt: number,
  fireAimedFan: (world: World, c: Components, baseAngle: number, rng: Rng) => void,
): void {
  runPhaseScript(RIFT_SCRIPT, {
    world, c, ax, ay, rng, dt, fireAimedFan,
    maxHp: RIFT_MAX_HP,
  });
}
