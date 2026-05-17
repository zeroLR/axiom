// ── Limit Boss definition (Stage 11 — Act IV trial) ───────────────────────
// FIXPOINT domain trial boss. Six-phase script with freeze-and-burst signature.

import type { Card } from '../cards';
import type { Components } from '../world';
import type { BossDef, BossSpec } from './types';
import { LIMIT_MAX_HP } from './scripts/limit';

function buildSpec(_picks: readonly Card[]): BossSpec {
  return {
    hp: LIMIT_MAX_HP,
    contactDamage: 1,
    maxSpeed: 36,
    weapon: {
      period: 1.4,
      damage: 1,
      projectileSpeed: 200,
      projectiles: 2,
      pierce: 0,
      crit: 0,
      cooldown: 1.4,
      ricochet: 0,
      chain: 0,
      burnDps: 0,
      burnDuration: 0,
      slowPct: 0,
      slowDuration: 0,
    },
    patternKind: 'limit',
  };
}

function install(entity: Components, spec: BossSpec): void {
  if (!entity.enemy || !entity.hp) return;
  entity.enemy.contactDamage = spec.contactDamage;
  entity.enemy.maxSpeed = spec.maxSpeed;
  entity.hp.value = spec.hp;
  entity.weapon = { ...spec.weapon };
  entity.enemy.bossPattern = 'limit';
  entity.enemy.bossPhase = 0;
  entity.enemy.bossTimer = 0;
  entity.enemy.bossEnraged = false;
  entity.enemy.bossWaypointIdx = 0;
}

export const limitBossDef: BossDef = {
  id: 'limit',
  displayName: 'LIMIT',
  theoremLine: '"convergence is its own attack"',
  glyph: '⊙',
  buildSpec,
  install,
};
