// ── Null phase script (declarative) ────────────────────────────────────────
// Act III gate boss. Six-phase cycle: silence+telegraph → axis volley →
// fan+homing → pull+radial → blink+silence+homing → dense radial+fan.
// Enrages at 30% HP (earliest of all bosses).
// The "null" mechanic: silenceAvatar periodically removes the player's weapon,
// forcing pure positional survival during silence windows.

import { PLAY_H, PLAY_W } from "../../config";
import type { BossPhaseScript } from "../runtime/phaseDsl";

export const NULL_MAX_HP = 820;

export const NULL_SCRIPT: BossPhaseScript = {
  enrageBelowHpFrac: 0.30,
  phases: [
    {
      // Phase 0 — silence + telegraph all-8 (weapon muted while telegraph resolves)
      steps: [
        { kind: "silenceAvatar", duration: 1.2, enragedDuration: 0.7 },
        { kind: "setTelegraph", angles: "all8" },
      ],
      cooldown: 0.8,
      enragedCooldown: 0.4,
    },
    {
      // Phase 1 — axis volley; enrage adds diagonal radial gap-fill
      steps: [
        { kind: "volleyOnTelegraph", shotsPerLine: 3, spread: 0.07, speed: 215 },
        {
          kind: "ifEnraged",
          then: { kind: "radialBurst", count: 6, speed: 170, useRotateOffset: false },
        },
      ],
      cooldown: 1.5,
      enragedCooldown: 0.9,
    },
    {
      // Phase 2 — aimed fan + homing cluster
      steps: [
        { kind: "fanAtPlayer" },
        {
          kind: "homingAtPlayer",
          count: 2,
          enragedCount: 4,
          speed: 195,
          spread: 0.22,
        },
      ],
      cooldown: 0.5,
    },
    {
      // Phase 3 — pull + dense rotating radial
      steps: [
        { kind: "pullAvatar", duration: 2.5 },
        { kind: "radialBurst", count: 10, enragedCount: 14, speed: 150, useRotateOffset: true },
      ],
      cooldown: 1.4,
      enragedCooldown: 0.8,
    },
    {
      // Phase 4 — blink + silence + homing (most dangerous phase)
      steps: [
        {
          kind: "blink",
          bounds: { x0: 0.12, x1: 0.88, y0: 0.05, y1: 0.38 },
          playW: PLAY_W,
          playH: PLAY_H,
        },
        { kind: "silenceAvatar", duration: 0.8, enragedDuration: 0.5 },
        {
          kind: "homingAtPlayer",
          count: 3,
          enragedCount: 5,
          speed: 200,
          spread: 0.22,
        },
      ],
      cooldown: 1.0,
      enragedCooldown: 0.6,
    },
    {
      // Phase 5 — dense radial burst + fan (enrage escalation climax)
      steps: [
        { kind: "radialBurst", count: 14, enragedCount: 18, speed: 145, useRotateOffset: true },
        { kind: "fanAtPlayer" },
      ],
      cooldown: 0.9,
      enragedCooldown: 0.5,
    },
  ],
};
