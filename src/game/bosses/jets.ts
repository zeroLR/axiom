// ── Jets Boss definition (Stage 2) ──────────────────────────────────────────
// Phase 1: fallback to standard fan pattern (same as Mirror baseline).
// Phase 2 will add side-dash + Z-sweep + 50% enrage AI per boss-jets.md.

import type { Card } from "../cards";
import type { Components } from "../world";
import type { BossDef, BossSpec } from "./types";

/** Jets baseline stats — tuned for Stage 2 difficulty. */
function buildSpec(_picks: readonly Card[]): BossSpec {
  return {
    hp: 55,
    contactDamage: 1,
    maxSpeed: 60,
    weapon: {
      period: 1.0,
      damage: 1,
      projectileSpeed: 210,
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
    patternKind: "standard",  // Phase 1 fallback; Phase 2 → "jets"
  };
}

function install(entity: Components, spec: BossSpec): void {
  if (!entity.enemy || !entity.hp) return;
  entity.enemy.contactDamage = spec.contactDamage;
  entity.enemy.maxSpeed = spec.maxSpeed;
  entity.hp.value = spec.hp;
  entity.weapon = { ...spec.weapon };
}

export const jetsBossDef: BossDef = {
  id: "jets",
  displayName: "JETS",
  theoremLine: '"edges strike first"',
  glyph: "▷",
  buildSpec,
  install,
};
