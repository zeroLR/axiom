// ── Nexus phase script (declarative) ──────────────────────────────────────────
// Act II gate boss. Five-phase cycle: all-8 telegraph → axis volley (+enrage
// radial gap-fill) → aimed fan → rotating radial spread → blink+homing.
// Enrages at 35% HP (earlier than any existing boss), then everything gets
// faster and denser.

import { PLAY_H, PLAY_W } from "../../config";
import type { BossPhaseScript } from "../runtime/phaseDsl";

export const NEXUS_MAX_HP = 620;

export const NEXUS_SCRIPT: BossPhaseScript = {
  enrageBelowHpFrac: 0.35,
  phases: [
    {
      // Phase 0 — telegraph all 8 axes immediately (no cardinal warm-up)
      steps: [{ kind: "setTelegraph", angles: "all8" }],
      cooldown: 0.6,
      enragedCooldown: 0.4,
    },
    {
      // Phase 1 — axis volley; enrage fires bonus radial to fill diagonal gaps
      steps: [
        { kind: "volleyOnTelegraph", shotsPerLine: 2, spread: 0.07, speed: 210 },
        {
          kind: "ifEnraged",
          then: { kind: "radialBurst", count: 4, speed: 170, useRotateOffset: false },
        },
      ],
      cooldown: 1.4,
      enragedCooldown: 0.9,
    },
    {
      // Phase 2 — aimed fan at player position
      steps: [{ kind: "fanAtPlayer" }],
      cooldown: 0.25,
    },
    {
      // Phase 3 — rotating radial burst, widens on enrage
      steps: [
        {
          kind: "radialBurst",
          count: 8,
          enragedCount: 12,
          speed: 150,
          useRotateOffset: true,
        },
      ],
      cooldown: 1.1,
      enragedCooldown: 0.65,
    },
    {
      // Phase 4 — blink teleport + immediate homing burst (signature combo)
      steps: [
        {
          kind: "blink",
          bounds: { x0: 0.15, x1: 0.85, y0: 0.06, y1: 0.40 },
          playW: PLAY_W,
          playH: PLAY_H,
        },
        {
          kind: "homingAtPlayer",
          count: 2,
          enragedCount: 4,
          speed: 195,
          spread: 0.22,
        },
      ],
      cooldown: 0.6,
      enragedCooldown: 0.35,
    },
  ],
};
