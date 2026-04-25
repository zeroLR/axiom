// Nexus runtime — thin shim over the declarative phase script. See
// `bosses/scripts/nexus.ts` for the actual phase data.

import type { Rng } from "../../rng";
import type { Components, World } from "../../world";
import { runPhaseScript } from "./phaseDsl";
import { NEXUS_MAX_HP, NEXUS_SCRIPT } from "../scripts/nexus";

export function updateNexusPattern(
  world: World,
  c: Components,
  ax: number,
  ay: number,
  rng: Rng,
  dt: number,
  fireAimedFan: (world: World, c: Components, baseAngle: number, rng: Rng) => void,
): void {
  runPhaseScript(NEXUS_SCRIPT, {
    world, c, ax, ay, rng, dt, fireAimedFan,
    maxHp: NEXUS_MAX_HP,
  });
}
