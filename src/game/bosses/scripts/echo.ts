// ── Echo phase script (declarative) ────────────────────────────────────────
// Act III trial boss. Five-phase cycle: cardinal volley → echo fan → pull+radial
// → echo homing → blink. Enrages at 50%.
// The "echo" mechanic is achieved by pairing each primary burst phase with a
// short-cooldown echo phase that repeats a lighter version of the same attack,
// creating a characteristic double-pulse rhythm.

import { PLAY_H, PLAY_W } from "../../config";
import type { BossPhaseScript } from "../runtime/phaseDsl";

export const ECHO_MAX_HP = 520;

export const ECHO_SCRIPT: BossPhaseScript = {
  enrageBelowHpFrac: 0.5,
  phases: [
    {
      // Phase 0 — telegraph cardinal axes and volley
      steps: [
        { kind: "setTelegraph", angles: "cardinal", enragedAngles: "all8" },
        { kind: "volleyOnTelegraph", shotsPerLine: 3, spread: 0.08, speed: 195 },
      ],
      cooldown: 1.2,
      enragedCooldown: 0.7,
    },
    {
      // Phase 1 — echo: immediate aimed fan (the "echo" of phase 0)
      steps: [{ kind: "fanAtPlayer" }],
      cooldown: 0.4,
    },
    {
      // Phase 2 — pull avatar in + radial burst
      steps: [
        { kind: "pullAvatar", duration: 1.5 },
        { kind: "radialBurst", count: 6, enragedCount: 10, speed: 160, useRotateOffset: true },
      ],
      cooldown: 1.1,
      enragedCooldown: 0.7,
    },
    {
      // Phase 3 — echo: homing cluster at player
      steps: [
        {
          kind: "homingAtPlayer",
          count: 2,
          enragedCount: 4,
          speed: 185,
          spread: 0.22,
        },
      ],
      cooldown: 0.9,
      enragedCooldown: 0.5,
    },
    {
      // Phase 4 — blink
      steps: [
        {
          kind: "blink",
          bounds: { x0: 0.15, x1: 0.85, y0: 0.06, y1: 0.40 },
          playW: PLAY_W,
          playH: PLAY_H,
        },
      ],
      cooldown: 0.3,
    },
  ],
};
