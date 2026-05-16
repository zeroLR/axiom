// ── Affix registry & stage policy ────────────────────────────────────────────
// Per-enemy mutation table consumed by `rollAffixes` / `applyAffixSpawnEffects`
// in `src/game/affixes.ts`. Schema-first: adding a new affix means appending a
// row here and (when behavior needs runtime hooks) wiring the corresponding
// `AffixId` case in collision/ai/render.

import type { AffixId } from '../world';
import type { EnemyArchetype } from './enemies';

export interface AffixDef {
  id: AffixId;
  /** Lowest 0-based stage the affix may roll on. */
  minStageIndex: number;
  /** Relative weight inside the per-stage roll. */
  weight: number;
  /** Archetype gate; if set, the affix only rolls on enemies tagged with one. */
  archetypes?: readonly EnemyArchetype[];
  /** Affixes that cannot coexist on one enemy (e.g. swift + dense). */
  excludes?: readonly AffixId[];
  /** Render hint — outline color used by `drawWorld` in `render.ts`. */
  outlineColor: number;
}

export interface StageAffixPolicy {
  /** Probability that a non-elite enemy receives one affix at spawn (0..1). */
  normalRollChance: number;
  /** How many affixes elites roll (0, 1, or 2). */
  eliteAffixCount: number;
  /** Optional stage-specific pool override; defaults to all eligible affixes. */
  pool?: readonly AffixId[];
}

export const AFFIX_REGISTRY: Record<AffixId, AffixDef> = {
  shielded: {
    id: 'shielded',
    minStageIndex: 2,
    weight: 2,
    excludes: ['regen'], // both stretch TTK; pick one
    outlineColor: 0x00e5ff,
  },
  swift: {
    id: 'swift',
    minStageIndex: 1,
    weight: 3,
    excludes: ['dense'],
    archetypes: ['swarmer', 'rusher', 'spiral', 'orbital'],
    outlineColor: 0x76ff03,
  },
  dense: {
    id: 'dense',
    minStageIndex: 1,
    weight: 3,
    excludes: ['swift'],
    outlineColor: 0x9e9e9e,
  },
  vampiric: {
    id: 'vampiric',
    minStageIndex: 3,
    weight: 2,
    outlineColor: 0xff5252,
  },
  splitting: {
    id: 'splitting',
    minStageIndex: 3,
    weight: 2,
    archetypes: ['swarmer', 'heavy', 'volley'],
    outlineColor: 0xffffff,
  },
  regen: {
    id: 'regen',
    minStageIndex: 4,
    weight: 2,
    excludes: ['shielded'],
    outlineColor: 0x4caf50,
  },
  charged: {
    id: 'charged',
    minStageIndex: 4,
    weight: 2,
    archetypes: ['swarmer', 'rusher', 'shielded', 'heavy', 'spiral'],
    outlineColor: 0xffeb3b,
  },
  linked: {
    id: 'linked',
    minStageIndex: 5,
    weight: 2,
    archetypes: ['rusher', 'swarmer', 'spiral'],
    outlineColor: 0xff9100,
  },
};

/**
 * Per-stage roll policy. Returns the affix budget for stageIndex (0-based).
 * Stages 0-1 stay clean (no affixes) so onboarding teaches base shapes first.
 */
export function defaultAffixPolicy(stageIndex: number): StageAffixPolicy {
  // Table indices: 0..11 ⇒ stage 1..12. Act IV (rows 9-11) ramps to 3-affix
  // elites at the terminal gate; the cap remains 3 so `excludes` constraints
  // in `rollAffixes` still produce coherent combinations.
  const table: readonly [number, number][] = [
    [0.00, 0], // stage 1 — vanilla
    [0.00, 1], // stage 2 — elites get a single affix
    [0.05, 1], // stage 3
    [0.10, 1], // stage 4
    [0.15, 1], // stage 5
    [0.20, 2], // stage 6
    [0.25, 2], // stage 7
    [0.30, 2], // stage 8
    [0.35, 2], // stage 9
    [0.38, 2], // stage 10 — Act IV (RECURSION)
    [0.42, 2], // stage 11 — Act IV (FIXPOINT)
    [0.45, 3], // stage 12 — Act IV gate (HYPERGRID); 3-affix elites
  ];
  const idx = Math.max(0, Math.min(table.length - 1, stageIndex));
  const [normalRollChance, eliteAffixCount] = table[idx]!;
  return { normalRollChance, eliteAffixCount };
}
