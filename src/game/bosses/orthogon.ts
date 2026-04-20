// ── Orthogon Boss definition (Stage 1) ──────────────────────────────────────
// Cross-shaped boss. Pattern: 4-axis fan sweep with telegraph cross-laser.
// At ≤50% HP adds diagonal axes (8-way).

import type { Card } from '../cards';
import type { Components } from '../world';
import type { BossDef, BossSpec } from './types';

/** Orthogon baseline stats — Stage 1 difficulty. */
function buildSpec(_picks: readonly Card[]): BossSpec {
  return {
    hp: 135,
    contactDamage: 1,
    maxSpeed: 45,
    weapon: {
      period: 1.4,
      damage: 1,
      projectileSpeed: 170,
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
    patternKind: 'orthogon',
  };
}

function install(entity: Components, spec: BossSpec): void {
  if (!entity.enemy || !entity.hp) return;
  entity.enemy.contactDamage = spec.contactDamage;
  entity.enemy.maxSpeed = spec.maxSpeed;
  entity.hp.value = spec.hp;
  entity.weapon = { ...spec.weapon };
  // Initialize boss AI state
  entity.enemy.bossPattern = 'orthogon';
  entity.enemy.bossPhase = 0;
  entity.enemy.bossTimer = 0;
  entity.enemy.bossEnraged = false;
}

export const orthogonBossDef: BossDef = {
  id: 'orthogon',
  displayName: 'ORTHOGON',
  theoremLine: '"lines converge"',
  glyph: '✛',
  buildSpec,
  install,
};
