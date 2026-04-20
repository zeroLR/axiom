// ── Boss type definitions ────────────────────────────────────────────────────
// Shared types for the boss registry system. Each boss is identified by a
// `BossId` and described by a `BossDef` that knows how to build its combat
// spec and install it onto an ECS entity.

import type { Card } from '../cards';
import type { Components, WeaponState } from '../world';

/** Unique identifier for each boss in the main story. */
export type BossId = 'orthogon' | 'jets' | 'mirror';

/** Combat stats produced by a boss definition. */
export interface BossSpec {
  hp: number;
  contactDamage: number;
  maxSpeed: number;
  weapon: WeaponState;
  /** Weapon pattern used by `bossWeapon.ts` to dispatch AI. */
  patternKind: 'standard' | 'orthogon' | 'jets';
  // ── Mirror-specific optional abilities ──────────────────────────────────
  mirrorShieldMax?: number;
  mirrorShieldRegenPeriod?: number;
  mirrorDodgePeriod?: number;
  mirrorSecondChance?: boolean;
  mirrorHomingShots?: boolean;
}

/** Full boss definition — metadata + factory functions. */
export interface BossDef {
  id: BossId;
  displayName: string;
  theoremLine: string;
  glyph: string;
  /** Build the boss combat spec. `picks` is the player's run-card list (used by Mirror). */
  buildSpec(picks: readonly Card[]): BossSpec;
  /** Apply the built spec to a spawned boss entity. */
  install(entity: Components, spec: BossSpec): void;
}
