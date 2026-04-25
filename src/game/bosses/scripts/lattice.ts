// ── Lattice phase script (declarative) ────────────────────────────────────────
// Same archetype as Orthogon but denser (4 shots per axis, faster cycle) and
// adds an enrage-only homing chaser piggybacked on the aimed fan.

import type { BossPhaseScript } from "../runtime/phaseDsl";

export const LATTICE_MAX_HP = 320;

export const LATTICE_SCRIPT: BossPhaseScript = {
  phases: [
    {
      steps: [
        { kind: "setTelegraph", angles: "cardinal", enragedAngles: "all8" },
      ],
      cooldown: 0.7,
    },
    {
      steps: [
        { kind: "volleyOnTelegraph", shotsPerLine: 4, spread: 0.08, speed: 200 },
      ],
      cooldown: 1.6,
      enragedCooldown: 1.6 * 0.65,
    },
    {
      steps: [
        { kind: "fanAtPlayer" },
        // Enrage-only homing chaser. `count: 1` with `spread: 0` reproduces
        // the original single-shot behaviour from runtime/lattice.ts.
        {
          kind: "ifEnraged",
          then: { kind: "homingAtPlayer", count: 1, speed: 180, spread: 0 },
        },
      ],
      cooldown: 0.2,
    },
  ],
};
