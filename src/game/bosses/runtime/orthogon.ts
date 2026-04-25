// Orthogon runtime — thin shim over the declarative phase script. Kept as a
// dedicated entry point so the dispatcher and existing tests continue to
// import `updateOrthogonPattern` unchanged. All combat behaviour now lives in
// `bosses/scripts/orthogon.ts` + the DSL interpreter.

import type { Rng } from "../../rng";
import type { Components, World } from "../../world";
import { runPhaseScript } from "./phaseDsl";
import { ORTHOGON_MAX_HP, ORTHOGON_SCRIPT } from "../scripts/orthogon";

export function updateOrthogonPattern(
  world: World,
  c: Components,
  ax: number,
  ay: number,
  rng: Rng,
  dt: number,
  fireAimedFan: (world: World, c: Components, baseAngle: number, rng: Rng) => void,
): void {
  runPhaseScript(ORTHOGON_SCRIPT, {
    world, c, ax, ay, rng, dt, fireAimedFan,
    maxHp: ORTHOGON_MAX_HP,
  });
}
