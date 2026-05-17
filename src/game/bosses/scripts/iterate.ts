// ── Iterate phase script (declarative) ─────────────────────────────────────
// Act IV trial boss (Stage 10 — RECURSION domain). Five-phase cycle that
// builds on the COLLAPSE-era verb vocabulary: cardinal-axis volley → recursive
// mote spawn → rotating radial burst → homing cluster → blink. The "recursion"
// flavour comes from the mote-spawn step in phase 1 — defeating Iterate without
// clearing the spawned motes lets the next phase pile on top.
// Enrages at 50% HP.

import { PLAY_H, PLAY_W } from "../../config";
import type { BossPhaseScript } from "../runtime/phaseDsl";

export const ITERATE_MAX_HP = 720;

export const ITERATE_SCRIPT: BossPhaseScript = {
  enrageBelowHpFrac: 0.5,
  phases: [
    {
      // Phase 0 — telegraph cardinal axes; volley along telegraph
      steps: [
        { kind: "setTelegraph", angles: "cardinal", enragedAngles: "all8" },
        { kind: "volleyOnTelegraph", shotsPerLine: 2, spread: 0.08, speed: 210 },
      ],
      cooldown: 1.3,
      enragedCooldown: 0.8,
    },
    {
      // Phase 1 — recursive: spawn motes + aimed fan
      steps: [
        { kind: "spawnMinions", enemyKind: "mote", count: 2, enragedCount: 4 },
        { kind: "fanAtPlayer" },
      ],
      cooldown: 1.4,
      enragedCooldown: 0.9,
    },
    {
      // Phase 2 — rotating radial burst (signature shape pattern)
      steps: [
        { kind: "radialBurst", count: 8, enragedCount: 12, speed: 165, useRotateOffset: true },
      ],
      cooldown: 1.0,
      enragedCooldown: 0.6,
    },
    {
      // Phase 3 — homing cluster
      steps: [
        { kind: "homingAtPlayer", count: 2, enragedCount: 4, speed: 195, spread: 0.22 },
      ],
      cooldown: 0.9,
      enragedCooldown: 0.5,
    },
    {
      // Phase 4 — blink + enraged extra mote spawn
      steps: [
        {
          kind: "blink",
          bounds: { x0: 0.15, x1: 0.85, y0: 0.06, y1: 0.40 },
          playW: PLAY_W,
          playH: PLAY_H,
        },
        {
          kind: "ifEnraged",
          then: { kind: "spawnMinions", enemyKind: "mote", count: 2 },
        },
      ],
      cooldown: 0.4,
    },
  ],
};
