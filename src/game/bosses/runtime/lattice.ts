// Lattice runtime — thin shim over the declarative phase script. See
// `bosses/scripts/lattice.ts` for the actual phase data.

import type { Rng } from "../../rng";
import type { Components, World } from "../../world";
import { runPhaseScript } from "./phaseDsl";
import { LATTICE_MAX_HP, LATTICE_SCRIPT } from "../scripts/lattice";

export function updateLatticePattern(
  world: World,
  c: Components,
  ax: number,
  ay: number,
  rng: Rng,
  dt: number,
  fireAimedFan: (world: World, c: Components, baseAngle: number, rng: Rng) => void,
): void {
  runPhaseScript(LATTICE_SCRIPT, {
    world, c, ax, ay, rng, dt, fireAimedFan,
    maxHp: LATTICE_MAX_HP,
  });
}
