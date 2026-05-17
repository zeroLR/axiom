// ── Iterate Boss definition (Stage 10 — Act IV trial) ──────────────────────
// RECURSION domain trial boss. Five-phase script: telegraph volley →
// mote-spawn + fan → rotating radial → homing cluster → blink. Enrages at 50%.

import type { Card } from '../cards';
import type { Components } from '../world';
import type { BossDef, BossSpec } from './types';
import { ITERATE_MAX_HP } from './scripts/iterate';

function buildSpec(_picks: readonly Card[]): BossSpec {
  return {
    hp: ITERATE_MAX_HP,
    contactDamage: 1,
    maxSpeed: 42,
    weapon: {
      period: 1.2,
      damage: 1,
      projectileSpeed: 195,
      projectiles: 2,
      pierce: 0,
      crit: 0,
      cooldown: 1.2,
      ricochet: 0,
      chain: 0,
      burnDps: 0,
      burnDuration: 0,
      slowPct: 0,
      slowDuration: 0,
    },
    patternKind: 'iterate',
  };
}

function install(entity: Components, spec: BossSpec): void {
  if (!entity.enemy || !entity.hp) return;
  entity.enemy.contactDamage = spec.contactDamage;
  entity.enemy.maxSpeed = spec.maxSpeed;
  entity.hp.value = spec.hp;
  entity.weapon = { ...spec.weapon };
  entity.enemy.bossPattern = 'iterate';
  entity.enemy.bossPhase = 0;
  entity.enemy.bossTimer = 0;
  entity.enemy.bossEnraged = false;
  entity.enemy.bossWaypointIdx = 0;
}

export const iterateBossDef: BossDef = {
  id: 'iterate',
  displayName: 'ITERATE',
  theoremLine: '"every result reapplies itself"',
  glyph: '↻',
  buildSpec,
  install,
};
