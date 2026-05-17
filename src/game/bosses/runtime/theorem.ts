// Theorem runtime — thin shim over the declarative phase script.
// See `bosses/scripts/theorem.ts` for phase data.

import type { Rng } from "../../rng";
import type { Components, World } from "../../world";
import { runPhaseScript } from "./phaseDsl";
import { THEOREM_MAX_HP, THEOREM_SCRIPT } from "../scripts/theorem";

export function updateTheoremPattern(
  world: World,
  c: Components,
  ax: number,
  ay: number,
  rng: Rng,
  dt: number,
  fireAimedFan: (world: World, c: Components, baseAngle: number, rng: Rng) => void,
): void {
  runPhaseScript(THEOREM_SCRIPT, {
    world, c, ax, ay, rng, dt, fireAimedFan,
    maxHp: THEOREM_MAX_HP,
  });
}
