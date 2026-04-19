// ── Jets Boss definition (Stage 2) ──────────────────────────────────────────
// Paper-plane boss. Pattern cycle: side-wall dash → Z-sweep → aimed fan.
// At ≤50% HP: enrage (speed +50%, scatter burst after each action).

import { PLAY_W, PLAY_H } from "../config";
import type { Card } from "../cards";
import type { Components } from "../world";
import type { BossDef, BossSpec } from "./types";

/** Jets baseline stats — Stage 2 difficulty. */
function buildSpec(_picks: readonly Card[]): BossSpec {
  return {
    hp: 55,
    contactDamage: 1,
    maxSpeed: 60,
    weapon: {
      period: 1.2,
      damage: 1,
      projectileSpeed: 200,
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
    patternKind: "jets",
  };
}

function install(entity: Components, spec: BossSpec): void {
  if (!entity.enemy || !entity.hp) return;
  entity.enemy.contactDamage = spec.contactDamage;
  entity.enemy.maxSpeed = spec.maxSpeed;
  entity.hp.value = spec.hp;
  entity.weapon = { ...spec.weapon };
  // Initialize boss AI state
  entity.enemy.bossPattern = "jets";
  entity.enemy.bossPhase = 0;  // 0=side-dash, 1=z-sweep, 2=fan
  entity.enemy.bossTimer = 1.5; // initial pause before first action
  entity.enemy.bossEnraged = false;
  // Start near top-center
  entity.enemy.bossDashTarget = { x: PLAY_W / 2, y: PLAY_H * 0.15 };
}

export const jetsBossDef: BossDef = {
  id: "jets",
  displayName: "JETS",
  theoremLine: '"edges strike first"',
  glyph: "▷",
  buildSpec,
  install,
};
