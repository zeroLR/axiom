// ── Canonical enemy kind list ───────────────────────────────────────────────
// Single source of truth for ALL_ENEMY_KINDS.  Import from here instead of
// repeating the array in main.ts / play.ts / developer menus.

import type { EnemyKind } from '../world';

/**
 * Every valid enemy kind in declaration order.
 * Matches the EnemyKind union in `world.ts` exactly.
 */
export const ALL_ENEMY_KINDS = [
  'circle',
  'square',
  'star',
  'pentagon',
  'hexagon',
  'diamond',
  'cross',
  'crescent',
  'spiral',
  'lance',
  'prism',
  'octo',
  'shade',
  'boss',
  'orthogon',
  'jets',
  'mirror',
  'lattice',
  'rift',
  'nexus',
] as const satisfies readonly EnemyKind[];
