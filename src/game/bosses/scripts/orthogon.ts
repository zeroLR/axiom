// ── Orthogon phase script (declarative) ───────────────────────────────────────
// Cycles: telegraph axes → fire axis volleys → fan at player → repeat.
// Enrage (≤50% HP) widens telegraph from cardinal to all-8 and shortens the
// post-volley cooldown.

import type { BossPhaseScript } from "../runtime/phaseDsl";

export const ORTHOGON_MAX_HP = 135;

export const ORTHOGON_SCRIPT: BossPhaseScript = {
  phases: [
    {
      // Phase 0 — telegraph
      steps: [
        { kind: "setTelegraph", angles: "cardinal", enragedAngles: "all8" },
      ],
      cooldown: 0.8,
    },
    {
      // Phase 1 — fire 3 shots per telegraphed axis
      steps: [
        { kind: "volleyOnTelegraph", shotsPerLine: 3, spread: 0.1, speed: 190 },
      ],
      cooldown: 2.2,
      enragedCooldown: 2.2 * 0.75,
    },
    {
      // Phase 2 — aimed fan at player
      steps: [{ kind: "fanAtPlayer" }],
      cooldown: 0.3,
    },
  ],
};
