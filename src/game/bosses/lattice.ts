// ── Lattice Boss definition (Stage 4) ────────────────────────────────────────
// Grid-cross boss. Pattern: rapid cardinal axis volleys + aimed fan shots.
// At ≤50% HP adds diagonal axes (8-way) and enraged timing.

import type { Card } from '../cards';
import type { Components } from '../world';
import type { BossDef, BossSpec } from './types';

/** Lattice baseline stats — Stage 4 difficulty. */
function buildSpec(_picks: readonly Card[]): BossSpec {
  return {
    hp: 320,
    contactDamage: 1,
    maxSpeed: 38,
    weapon: {
      period: 1.2,
      damage: 1,
      projectileSpeed: 200,
      projectiles: 3,
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
    patternKind: 'lattice',
  };
}

function install(entity: Components, spec: BossSpec): void {
  if (!entity.enemy || !entity.hp) return;
  entity.enemy.contactDamage = spec.contactDamage;
  entity.enemy.maxSpeed = spec.maxSpeed;
  entity.hp.value = spec.hp;
  entity.weapon = { ...spec.weapon };
  entity.enemy.bossPattern = 'lattice';
  entity.enemy.bossPhase = 0;
  entity.enemy.bossTimer = 0;
  entity.enemy.bossEnraged = false;
}

export const latticeBossDef: BossDef = {
  id: 'lattice',
  displayName: 'LATTICE',
  theoremLine: '"all planes align"',
  glyph: '⊞',
  buildSpec,
  install,
};
