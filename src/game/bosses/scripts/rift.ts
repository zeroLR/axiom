// ── Rift phase script (declarative) ───────────────────────────────────────────
// Homing volley → rotating radial spread → blink. Enrage thickens every phase
// and shortens cooldowns.

import { PLAY_H, PLAY_W } from "../../config";
import type { BossPhaseScript } from "../runtime/phaseDsl";

export const RIFT_MAX_HP = 460;

export const RIFT_SCRIPT: BossPhaseScript = {
  phases: [
    {
      steps: [
        {
          kind: "homingAtPlayer",
          count: 2,
          enragedCount: 3,
          speed: 180,
          spread: 0.28,
        },
      ],
      cooldown: 1.2,
      enragedCooldown: 0.8,
    },
    {
      steps: [
        {
          kind: "radialBurst",
          count: 6,
          enragedCount: 8,
          speed: 130,
          useRotateOffset: true,
        },
      ],
      cooldown: 1.0,
      enragedCooldown: 0.7,
    },
    {
      steps: [
        {
          kind: "blink",
          bounds: { x0: 0.2, x1: 0.8, y0: 0.08, y1: 0.43 },
          playW: PLAY_W,
          playH: PLAY_H,
        },
      ],
      cooldown: 0.55,
      enragedCooldown: 0.35,
    },
  ],
};
