// ── Rift Boss definition (Stage 5) ───────────────────────────────────────────
// Void-octagon boss. Pattern: homing shots → rotating spread → blink teleport.
// At ≤50% HP fires more homing shots and cycles faster.

import type { Card } from '../cards';
import type { Components } from '../world';
import type { BossDef, BossSpec } from './types';

/** Rift baseline stats — Stage 5 difficulty. */
function buildSpec(_picks: readonly Card[]): BossSpec {
  return {
    hp: 460,
    contactDamage: 1,
    maxSpeed: 42,
    weapon: {
      period: 1.1,
      damage: 1,
      projectileSpeed: 190,
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
    patternKind: 'rift',
  };
}

function install(entity: Components, spec: BossSpec): void {
  if (!entity.enemy || !entity.hp) return;
  entity.enemy.contactDamage = spec.contactDamage;
  entity.enemy.maxSpeed = spec.maxSpeed;
  entity.hp.value = spec.hp;
  entity.weapon = { ...spec.weapon };
  entity.enemy.bossPattern = 'rift';
  entity.enemy.bossPhase = 0;
  entity.enemy.bossTimer = 0;
  entity.enemy.bossEnraged = false;
  entity.enemy.bossWaypointIdx = 0; // reused as rotation step counter
}

export const riftBossDef: BossDef = {
  id: 'rift',
  displayName: 'RIFT',
  theoremLine: '"the null set expands"',
  glyph: '⊗',
  buildSpec,
  install,
};
