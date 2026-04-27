// ── Shard Boss definition (Stage 8 — Act III trial) ───────────────────────
// FRACTURE domain boss. Four-phase pattern: all-8 volley → fragment spawn+fan →
// pull+radial → blink+homing. Enrages at 45%.

import type { Card } from '../cards';
import type { Components } from '../world';
import type { BossDef, BossSpec } from './types';
import { SHARD_MAX_HP } from './scripts/shard';

function buildSpec(_picks: readonly Card[]): BossSpec {
  return {
    hp: SHARD_MAX_HP,
    contactDamage: 1,
    maxSpeed: 48,
    weapon: {
      period: 1.3,
      damage: 1,
      projectileSpeed: 205,
      projectiles: 2,
      pierce: 0,
      crit: 0,
      cooldown: 1.3,
      ricochet: 0,
      chain: 0,
      burnDps: 0,
      burnDuration: 0,
      slowPct: 0,
      slowDuration: 0,
    },
    patternKind: 'shard',
  };
}

function install(entity: Components, spec: BossSpec): void {
  if (!entity.enemy || !entity.hp) return;
  entity.enemy.contactDamage = spec.contactDamage;
  entity.enemy.maxSpeed = spec.maxSpeed;
  entity.hp.value = spec.hp;
  entity.weapon = { ...spec.weapon };
  entity.enemy.bossPattern = 'shard';
  entity.enemy.bossPhase = 0;
  entity.enemy.bossTimer = 0;
  entity.enemy.bossEnraged = false;
  entity.enemy.bossWaypointIdx = 0;
}

export const shardBossDef: BossDef = {
  id: 'shard',
  displayName: 'SHARD',
  theoremLine: '"the whole is less than its fragments"',
  glyph: '◈',
  buildSpec,
  install,
};
