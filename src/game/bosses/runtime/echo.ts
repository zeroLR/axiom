// Echo runtime — thin shim over the declarative phase script.
// See `bosses/scripts/echo.ts` for phase data.

import type { Rng } from "../../rng";
import type { Components, World } from "../../world";
import { runPhaseScript } from "./phaseDsl";
import { ECHO_MAX_HP, ECHO_SCRIPT } from "../scripts/echo";

export function updateEchoPattern(
  world: World,
  c: Components,
  ax: number,
  ay: number,
  rng: Rng,
  dt: number,
  fireAimedFan: (world: World, c: Components, baseAngle: number, rng: Rng) => void,
): void {
  runPhaseScript(ECHO_SCRIPT, {
    world, c, ax, ay, rng, dt, fireAimedFan,
    maxHp: ECHO_MAX_HP,
  });
}
