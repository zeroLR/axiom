// ── Orthogon Boss definition (Stage 1) ──────────────────────────────────────
// Phase 1: fallback to standard fan pattern (same as Mirror baseline).
// Phase 2 will add axis-sweep + cross-laser AI.

import type { Card } from "../cards";
import type { Components } from "../world";
import type { BossDef, BossSpec } from "./types";

/** Orthogon baseline stats — tuned slightly lower than Mirror since it's Stage 1. */
function buildSpec(_picks: readonly Card[]): BossSpec {
  return {
    hp: 45,
    contactDamage: 1,
    maxSpeed: 45,
    weapon: {
      period: 1.2,
      damage: 1,
      projectileSpeed: 180,
      projectiles: 2,
      pierce: 0,
      crit: 0,
      cooldown: 1.0,
      ricochet: 0,
      chain: 0,
      burnDps: 0,
      burnDuration: 0,
      slowPct: 0,
      slowDuration: 0,
    },
    patternKind: "standard",  // Phase 1 fallback; Phase 2 → "orthogon"
  };
}

function install(entity: Components, spec: BossSpec): void {
  if (!entity.enemy || !entity.hp) return;
  entity.enemy.contactDamage = spec.contactDamage;
  entity.enemy.maxSpeed = spec.maxSpeed;
  entity.hp.value = spec.hp;
  entity.weapon = { ...spec.weapon };
}

export const orthogonBossDef: BossDef = {
  id: "orthogon",
  displayName: "ORTHOGON",
  theoremLine: '"lines converge"',
  glyph: "✛",
  buildSpec,
  install,
};
