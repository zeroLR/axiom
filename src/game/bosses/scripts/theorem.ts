// ── Theorem phase script (declarative) ─────────────────────────────────────
// Act IV gate boss (Stage 12 — HYPERGRID domain). Six-phase terminal cycle
// that recombines every prior verb to imply "the proof concludes":
// silence + telegraph → volley (+enraged radial) → spawn lemma + fan →
// pull + dense radial → blink + homing cluster → final radial + fan + silence
// echo. Enrages at 30% HP (matches Null).

import { PLAY_H, PLAY_W } from "../../config";
import type { BossPhaseScript } from "../runtime/phaseDsl";

export const THEOREM_MAX_HP = 1080;

export const THEOREM_SCRIPT: BossPhaseScript = {
  enrageBelowHpFrac: 0.3,
  phases: [
    {
      // Phase 0 — silence opener + telegraph
      steps: [
        { kind: "silenceAvatar", duration: 1.2, enragedDuration: 0.7 },
        { kind: "setTelegraph", angles: "all8" },
      ],
      cooldown: 0.8,
      enragedCooldown: 0.4,
    },
    {
      // Phase 1 — volley along telegraph; enraged radial chaser
      steps: [
        { kind: "volleyOnTelegraph", shotsPerLine: 3, spread: 0.06, speed: 220 },
        {
          kind: "ifEnraged",
          then: { kind: "radialBurst", count: 8, speed: 170 },
        },
      ],
      cooldown: 1.5,
      enragedCooldown: 0.9,
    },
    {
      // Phase 2 — spawn lemma adds + fan
      steps: [
        { kind: "spawnMinions", enemyKind: "lemma", count: 2, enragedCount: 3 },
        { kind: "fanAtPlayer" },
      ],
      cooldown: 1.4,
      enragedCooldown: 0.9,
    },
    {
      // Phase 3 — pull + dense rotating radial
      steps: [
        { kind: "pullAvatar", duration: 2.5 },
        { kind: "radialBurst", count: 12, enragedCount: 16, speed: 175, useRotateOffset: true },
      ],
      cooldown: 1.4,
      enragedCooldown: 0.8,
    },
    {
      // Phase 4 — blink + homing
      steps: [
        {
          kind: "blink",
          bounds: { x0: 0.12, x1: 0.88, y0: 0.05, y1: 0.38 },
          playW: PLAY_W,
          playH: PLAY_H,
        },
        { kind: "homingAtPlayer", count: 3, enragedCount: 5, speed: 205, spread: 0.22 },
      ],
      cooldown: 1.0,
      enragedCooldown: 0.6,
    },
    {
      // Phase 5 — final radial + fan + enraged silence echo (QED)
      steps: [
        { kind: "radialBurst", count: 14, enragedCount: 18, speed: 170 },
        { kind: "fanAtPlayer" },
        {
          kind: "ifEnraged",
          then: { kind: "silenceAvatar", duration: 0.6 },
        },
      ],
      cooldown: 0.9,
      enragedCooldown: 0.5,
    },
  ],
};
