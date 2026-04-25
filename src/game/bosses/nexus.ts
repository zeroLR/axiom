// ── Nexus Boss definition (Stage 6 — Act II gate) ────────────────────────────
// NEXUS domain boss. Five-phase pattern: telegraph + volley, aimed fan,
// rotating radial, blink+homing. Enrages at 35% HP.

import type { Card } from '../cards';
import type { Components } from '../world';
import type { BossDef, BossSpec } from './types';
import { NEXUS_MAX_HP } from './scripts/nexus';

function buildSpec(_picks: readonly Card[]): BossSpec {
  return {
    hp: NEXUS_MAX_HP,
    contactDamage: 1,
    maxSpeed: 36,
    weapon: {
      period: 0.9,
      damage: 1,
      projectileSpeed: 210,
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
    patternKind: 'nexus',
  };
}

function install(entity: Components, spec: BossSpec): void {
  if (!entity.enemy || !entity.hp) return;
  entity.enemy.contactDamage = spec.contactDamage;
  entity.enemy.maxSpeed = spec.maxSpeed;
  entity.hp.value = spec.hp;
  entity.weapon = { ...spec.weapon };
  entity.enemy.bossPattern = 'nexus';
  entity.enemy.bossPhase = 0;
  entity.enemy.bossTimer = 0;
  entity.enemy.bossEnraged = false;
  entity.enemy.bossWaypointIdx = 0;
}

export const nexusBossDef: BossDef = {
  id: 'nexus',
  displayName: 'NEXUS',
  theoremLine: '"all axioms collapse here"',
  glyph: '⊕',
  buildSpec,
  install,
};
