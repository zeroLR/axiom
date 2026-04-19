// Play-field is a 9:16 rectangle in internal pixels. All gameplay math uses
// these coords; CSS scales the canvas to the viewport.
export const PLAY_W = 360;
export const PLAY_H = 640;

// Avatar
export const AVATAR_START_X = PLAY_W / 2;
export const AVATAR_START_Y = PLAY_H * 0.75;
export const AVATAR_BASE_SPEED = 260; // play-field px / s
export const AVATAR_RADIUS = 10;
export const AVATAR_BASE_HP = 4;
export const AVATAR_IFRAMES = 0.6; // seconds of invulnerability after a hit

// Weapon (Vertex Shot — starting weapon)
export const WEAPON_BASE_PERIOD = 0.55; // seconds between shots
export const WEAPON_BASE_DAMAGE = 1;
export const WEAPON_BASE_PROJECTILE_SPEED = 520;
export const WEAPON_BASE_PIERCE = 0;
export const WEAPON_BASE_PROJECTILES = 1;
export const WEAPON_BASE_CRIT = 0;

export const PROJECTILE_RADIUS = 4;

// Enemies
export const ENEMY_SPAWN_MARGIN = 24; // spawn just outside this inset from edges
export const ENEMY_SEEK_ACCEL = 1400; // how fast enemies reach their max speed

// Fixed-step sim
export const FIXED_DT = 1 / 60;
export const MAX_FRAME = 0.1;

// Hit flash (seconds)
export const HIT_FLASH_TIME = 0.1;

// Draft token economy (concept.md § Resource model).
export const STARTING_DRAFT_TOKENS = 2;
export const REROLL_TOKEN_BASE_COST = 1;

/** Cost curve for draft rerolls within a single draft screen. */
export function rerollTokenCostForUse(useCount: number): number {
  return REROLL_TOKEN_BASE_COST + Math.max(0, Math.floor(useCount));
}
