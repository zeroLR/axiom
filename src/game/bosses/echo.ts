// ── Echo Boss definition (Stage 7 — Act III trial) ────────────────────────
// RESONANCE domain boss. Five-phase double-pulse pattern: telegraph+volley →
// echo fan → pull+radial → echo homing → blink. Enrages at 50%.

import type { Card } from '../cards';
import type { Components } from '../world';
import type { BossDef, BossSpec } from './types';
import { ECHO_MAX_HP } from './scripts/echo';

function buildSpec(_picks: readonly Card[]): BossSpec {
  return {
    hp: ECHO_MAX_HP,
    contactDamage: 1,
    maxSpeed: 44,
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
    patternKind: 'echo',
  };
}

function install(entity: Components, spec: BossSpec): void {
  if (!entity.enemy || !entity.hp) return;
  entity.enemy.contactDamage = spec.contactDamage;
  entity.enemy.maxSpeed = spec.maxSpeed;
  entity.hp.value = spec.hp;
  entity.weapon = { ...spec.weapon };
  entity.enemy.bossPattern = 'echo';
  entity.enemy.bossPhase = 0;
  entity.enemy.bossTimer = 0;
  entity.enemy.bossEnraged = false;
  entity.enemy.bossWaypointIdx = 0;
}

export const echoBossDef: BossDef = {
  id: 'echo',
  displayName: 'ECHO',
  theoremLine: '"every pattern finds its echo"',
  glyph: '⊚',
  buildSpec,
  install,
};
