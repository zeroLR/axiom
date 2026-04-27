// ── Shard phase script (declarative) ────────────────────────────────────────
// Act III trial boss. Four-phase cycle: all-8 volley → fragment spawn+fan →
// pull+radial → blink+homing. Enrages at 45%.
// The "shard" mechanic: spawnMinions injects elite thorn enemies mid-fight,
// forcing the player to manage arena control while fighting the boss.

import { PLAY_H, PLAY_W } from "../../config";
import type { BossPhaseScript } from "../runtime/phaseDsl";

export const SHARD_MAX_HP = 680;

export const SHARD_SCRIPT: BossPhaseScript = {
  enrageBelowHpFrac: 0.45,
  phases: [
    {
      // Phase 0 — telegraph all-8 axes + dense volley
      steps: [
        { kind: "setTelegraph", angles: "all8" },
        { kind: "volleyOnTelegraph", shotsPerLine: 2, spread: 0.07, speed: 205 },
      ],
      cooldown: 1.3,
      enragedCooldown: 0.8,
    },
    {
      // Phase 1 — spawn thorn fragments into arena + aimed fan
      steps: [
        { kind: "spawnMinions", enemyKind: "thorn", count: 2, enragedCount: 3 },
        { kind: "fanAtPlayer" },
      ],
      cooldown: 1.5,
      enragedCooldown: 1.0,
    },
    {
      // Phase 2 — pull avatar + rotating radial burst
      steps: [
        { kind: "pullAvatar", duration: 2.0 },
        { kind: "radialBurst", count: 8, enragedCount: 12, speed: 155, useRotateOffset: true },
      ],
      cooldown: 1.2,
      enragedCooldown: 0.7,
    },
    {
      // Phase 3 — blink + homing burst (signature mobile attack)
      steps: [
        {
          kind: "blink",
          bounds: { x0: 0.12, x1: 0.88, y0: 0.06, y1: 0.42 },
          playW: PLAY_W,
          playH: PLAY_H,
        },
        {
          kind: "homingAtPlayer",
          count: 2,
          enragedCount: 4,
          speed: 190,
          spread: 0.22,
        },
      ],
      cooldown: 0.8,
      enragedCooldown: 0.5,
    },
  ],
};
