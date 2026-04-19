import type { EntityId } from "./world";

// Canonical game-event hooks dispatched by combat/wave systems. Synergy cards
// and future relics subscribe here instead of scattering `if (kind === …)`
// checks across systems.
export interface GameEvents {
  /** An enemy's HP just dropped to zero or below. Fires once per kill. */
  onEnemyKilled?: (enemyId: EntityId) => void;
  /** A player projectile connected with an enemy (before kill check). */
  onEnemyHit?: (enemyId: EntityId, damage: number, crit: boolean) => void;
  /** The avatar took damage from an enemy or enemy shot. */
  onPlayerHit?: (amount: number) => void;
  /** The avatar's HP reached zero. */
  onPlayerDied?: () => void;
  /** A new wave just started (1-based index). */
  onWaveStart?: (wave1: number) => void;
}
