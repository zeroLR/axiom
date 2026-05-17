// ── Limit phase script (declarative) ───────────────────────────────────────
// Act IV trial boss (Stage 11 — FIXPOINT domain). Six-phase cycle: cardinal
// volley → pull + radial → fan + homing → freeze-and-burst → silence + volley
// → blink. The "fixpoint" mechanic emerges from the freezeEnemies step in
// phase 3 — Limit anchors the wave by halting its own minions, creating a
// brief geometric stillness that the player must read and exploit.
// Enrages at 40% HP (slightly later than the trial boss above).

import { PLAY_H, PLAY_W } from "../../config";
import type { BossPhaseScript } from "../runtime/phaseDsl";

export const LIMIT_MAX_HP = 880;

export const LIMIT_SCRIPT: BossPhaseScript = {
  enrageBelowHpFrac: 0.4,
  phases: [
    {
      // Phase 0 — eight-axis telegraph volley
      steps: [
        { kind: "setTelegraph", angles: "all8" },
        { kind: "volleyOnTelegraph", shotsPerLine: 3, spread: 0.06, speed: 200 },
      ],
      cooldown: 1.4,
      enragedCooldown: 0.9,
    },
    {
      // Phase 1 — pull avatar in, rotating radial burst
      steps: [
        { kind: "pullAvatar", duration: 2.0 },
        { kind: "radialBurst", count: 10, enragedCount: 14, speed: 175, useRotateOffset: true },
      ],
      cooldown: 1.4,
      enragedCooldown: 0.8,
    },
    {
      // Phase 2 — fan + homing follow-up
      steps: [
        { kind: "fanAtPlayer" },
        { kind: "homingAtPlayer", count: 2, enragedCount: 4, speed: 195, spread: 0.22 },
      ],
      cooldown: 0.6,
    },
    {
      // Phase 3 — fixpoint: freeze adds + radial burst (signature stillness)
      steps: [
        { kind: "freezeEnemies", count: 4, duration: 2.5 },
        { kind: "radialBurst", count: 6, speed: 170 },
      ],
      cooldown: 1.0,
      enragedCooldown: 0.6,
    },
    {
      // Phase 4 — silence + volley
      steps: [
        { kind: "silenceAvatar", duration: 1.0, enragedDuration: 0.6 },
        { kind: "volleyOnTelegraph", shotsPerLine: 2, spread: 0.06, speed: 220 },
      ],
      cooldown: 1.3,
      enragedCooldown: 0.8,
    },
    {
      // Phase 5 — blink
      steps: [
        {
          kind: "blink",
          bounds: { x0: 0.12, x1: 0.88, y0: 0.05, y1: 0.40 },
          playW: PLAY_W,
          playH: PLAY_H,
        },
      ],
      cooldown: 0.3,
    },
  ],
};
