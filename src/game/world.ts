export type EntityId = number;

export type Team = 'player' | 'enemy' | 'projectile' | 'enemy-shot';

export type EnemyKind =
  | 'circle'
  | 'square'
  | 'star'
  | 'boss'
  | 'pentagon'
  | 'hexagon'
  | 'diamond'
  | 'cross'
  | 'crescent'
  | 'orthogon'
  | 'jets'
  | 'mirror';

export interface Pos {
  x: number;
  y: number;
}
export interface Vel {
  x: number;
  y: number;
}

export type WeaponMode =
  | 'vertex'
  | 'faceBeam'
  | 'orbitShard'
  | 'homing'
  | 'burst'
  | 'fan'
  | 'charge';

export interface WeaponState {
  mode?: WeaponMode;
  period: number; // seconds between shots
  damage: number;
  projectileSpeed: number;
  projectiles: number; // shots fired per trigger (spread fan if > 1)
  pierce: number; // projectile hits before despawn (0 = one hit)
  crit: number; // 0..1 crit chance for 2x damage
  cooldown: number; // seconds remaining until next shot
  // Keyword modifiers (defaults = 0, no effect).
  ricochet: number; // bounces to next nearest enemy after exhausting pierce
  chain: number; // spawns chain bolts to additional nearby enemies on hit
  burnDps: number; // per-hit inflicted burn damage per second
  burnDuration: number; // seconds the burn lasts on target
  slowPct: number; // per-hit inflicted slow fraction (0..1)
  slowDuration: number; // seconds the slow lasts on target
  orbitAngle?: number;
}

export interface Projectile {
  damage: number;
  crit: boolean;
  pierceRemaining: number;
  ricochetRemaining: number;
  chainRemaining: number;
  burnDps: number;
  burnDuration: number;
  slowPct: number;
  slowDuration: number;
  // Enemies already hit, so pierce/ricochet/chain don't re-hit the same target.
  hitIds: Set<EntityId>;
  ttl: number;
  orbit?: {
    ownerId: EntityId;
    angle: number;
    radius: number;
    angularSpeed: number;
  };
  /** Homing weapon: motion system steers velocity toward the nearest enemy. */
  homing?: boolean;
  /** Burst weapon: when the projectile despawns, spawn N radial fragments. */
  burstFragments?: number;
}

export interface Enemy {
  kind: EnemyKind;
  maxHp?: number;
  contactDamage: number;
  maxSpeed: number;
  wobblePhase: number;
  /** Shield HP (hexagon only). Absorbs one hit when > 0 before real HP takes damage. */
  shield?: number;
  /** Diamond dash state: cooldown timer, dash speed multiplier. */
  dashCooldown?: number;
  /** Cross shooting timer. */
  shootCooldown?: number;
  /** Crescent orbit angle (radians). */
  orbitAngle?: number;
  /** Whether survival scaling has been applied (prevents double-scaling). */
  scaled?: boolean;
  /** Burn DoT applied by keyword effects. */
  burn?: { dps: number; remaining: number };
  /** Slow debuff applied by keyword effects. */
  slow?: { pct: number; remaining: number };
  /** Marked as elite at spawn time. Elite kills yield +1 draft token. */
  isElite?: boolean;
  /**
   * Boss telegraph aim snapshotted at the start of the lead window.
   * Locked so the player can dodge from the warning they see, not from
   * where the boss is currently tracking. Cleared when the shot fires.
   */
  telegraphAngle?: number;

  // ── Boss AI state (set by BossDef.install) ──────────────────────────────
  /** Weapon pattern kind for dispatch in `bossWeapon.ts`. */
  bossPattern?: 'standard' | 'orthogon' | 'jets';
  /** Current boss AI phase/move index, cycling through the pattern sequence. */
  bossPhase?: number;
  /** General-purpose boss AI timer (seconds remaining for current action). */
  bossTimer?: number;
  /** Whether the boss has entered enrage (≤50% HP). */
  bossEnraged?: boolean;
  /** Target position for dash / sweep movements. */
  bossDashTarget?: { x: number; y: number };
  /** Boss telegraph lines for rendering (array of angles, cleared after shot). */
  bossTelegraphLines?: number[];
  /** Waypoint index for Jets Z-sweep movement. */
  bossWaypointIdx?: number;
}

export type SynergyId = 'combustion' | 'desperate' | 'kinetic' | 'stillness';

export interface SynergyRuntime {
  id: SynergyId;
  /** Combustion only: rolling kill count since last detonation. */
  killCounter?: number;
}

export interface Avatar {
  hp: number;
  maxHp: number;
  speedMul: number;
  iframes: number; // seconds of invulnerability remaining
  targetX: number;
  targetY: number;
  /** Active synergy cards the player has drafted. Evaluated at fire time. */
  synergies?: SynergyRuntime[];
  /** Cosmetic avatar skin ID chosen from equipment screen. */
  skinId?: string;
  // --- Evolution cards (each undefined unless drafted) ---
  /** Aegis: regenerating shield. Each point absorbs one hit. */
  shield?: number;
  shieldMax?: number;
  shieldRegenPeriod?: number; // seconds per +1 shield while not at max
  shieldRegenTimer?: number; // accumulator; resets to 0 on hit
  /** Revenant: one-shot revive flag. true while available, false after consumed. */
  secondChance?: boolean;
  /** Phase Shift: auto-dodge charges that regen on a cooldown. */
  dodgeMax?: number;
  dodgeCharges?: number;
  dodgePeriod?: number;
  dodgeCooldown?: number;
  // --- Equipment bonuses ---
  /** Bonus iframe duration from equipment (added to base on-hit iframes). */
  iframeBonus?: number;
  /** Multiplier for pickup radius from equipment. */
  pickupRadiusMul?: number;
  // --- Weapon-class cards: secondary weapons that fire alongside the primary. ---
  /** Extra weapons added by Weapon-class draft picks. Each ticks its own cooldown. */
  extraWeapons?: WeaponState[];
}

export interface Components {
  pos?: Pos;
  vel?: Vel;
  radius?: number;
  team?: Team;
  avatar?: Avatar;
  weapon?: WeaponState;
  enemy?: Enemy;
  projectile?: Projectile;
  hp?: { value: number }; // enemies only; avatar hp lives on Avatar
  flash?: number; // seconds of hit flash remaining
}

export class World {
  private nextId: EntityId = 1;
  readonly entities = new Map<EntityId, Components>();

  create(c: Components): EntityId {
    const id = this.nextId++;
    this.entities.set(id, c);
    return id;
  }

  remove(id: EntityId): void {
    this.entities.delete(id);
  }

  get(id: EntityId): Components | undefined {
    return this.entities.get(id);
  }

  // Iterate entities that have all requested components. The returned map is
  // the same reference as stored, so callers may mutate in place.
  *with<K extends keyof Components>(
    ...keys: K[]
  ): Generator<[EntityId, Components]> {
    outer: for (const [id, c] of this.entities) {
      for (const k of keys) if (c[k] === undefined) continue outer;
      yield [id, c];
    }
  }

  clear(): void {
    this.entities.clear();
    this.nextId = 1;
  }
}
