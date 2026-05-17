// ── Theorem Boss definition (Stage 12 — Act IV gate) ──────────────────────
// HYPERGRID terminal gate. Six-phase script that recombines every prior verb.

import type { Card } from '../cards';
import type { Components } from '../world';
import type { BossDef, BossSpec } from './types';
import { THEOREM_MAX_HP } from './scripts/theorem';

function buildSpec(_picks: readonly Card[]): BossSpec {
  return {
    hp: THEOREM_MAX_HP,
    contactDamage: 1,
    maxSpeed: 38,
    weapon: {
      period: 1.2,
      damage: 1,
      projectileSpeed: 200,
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
    patternKind: 'theorem',
  };
}

function install(entity: Components, spec: BossSpec): void {
  if (!entity.enemy || !entity.hp) return;
  entity.enemy.contactDamage = spec.contactDamage;
  entity.enemy.maxSpeed = spec.maxSpeed;
  entity.hp.value = spec.hp;
  entity.weapon = { ...spec.weapon };
  entity.enemy.bossPattern = 'theorem';
  entity.enemy.bossPhase = 0;
  entity.enemy.bossTimer = 0;
  entity.enemy.bossEnraged = false;
  entity.enemy.bossWaypointIdx = 0;
}

export const theoremBossDef: BossDef = {
  id: 'theorem',
  displayName: 'THEOREM',
  theoremLine: '"the proof concludes"',
  glyph: '∎',
  buildSpec,
  install,
};
