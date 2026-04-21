import type { EnemyKind } from "../world";
import {
  ENEMY_REGISTRY,
  type EnemyDef,
  type EnemySpawnBehavior,
  type EnemyStats,
} from "../content/enemies";

export { ENEMY_REGISTRY };
export type { EnemyDef, EnemySpawnBehavior, EnemyStats };

export function getEnemyStats(kind: EnemyKind): EnemyStats {
  return ENEMY_REGISTRY[kind].stats;
}

export function getEnemyDef(kind: EnemyKind): EnemyDef {
  return ENEMY_REGISTRY[kind];
}

export function isEliteKind(kind: EnemyKind): boolean {
  return ENEMY_REGISTRY[kind].isElite === true;
}
