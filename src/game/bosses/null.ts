// ── Null Boss definition (Stage 9 — Act III gate) ─────────────────────────
// VOID domain boss. Six-phase cycle incorporating weapon silence, pull,
// dense radials, and all prior attack types. Enrages at 30% HP.

import type { Card } from '../cards';
import type { Components } from '../world';
import type { BossDef, BossSpec } from './types';
import { NULL_MAX_HP } from './scripts/null';

function buildSpec(_picks: readonly Card[]): BossSpec {
  return {
    hp: NULL_MAX_HP,
    contactDamage: 1,
    maxSpeed: 38,
    weapon: {
      period: 0.9,
      damage: 1,
      projectileSpeed: 215,
      projectiles: 3,
      pierce: 0,
      crit: 0,
      cooldown: 0.9,
      ricochet: 0,
      chain: 0,
      burnDps: 0,
      burnDuration: 0,
      slowPct: 0,
      slowDuration: 0,
    },
    patternKind: 'null',
  };
}

function install(entity: Components, spec: BossSpec): void {
  if (!entity.enemy || !entity.hp) return;
  entity.enemy.contactDamage = spec.contactDamage;
  entity.enemy.maxSpeed = spec.maxSpeed;
  entity.hp.value = spec.hp;
  entity.weapon = { ...spec.weapon };
  entity.enemy.bossPattern = 'null';
  entity.enemy.bossPhase = 0;
  entity.enemy.bossTimer = 0;
  entity.enemy.bossEnraged = false;
  entity.enemy.bossWaypointIdx = 0;
}

export const nullBossDef: BossDef = {
  id: 'null',
  displayName: 'NULL',
  theoremLine: '"before axioms existed"',
  glyph: '∅',
  buildSpec,
  install,
};
