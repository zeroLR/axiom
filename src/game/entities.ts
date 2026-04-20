import {
  AVATAR_BASE_HP,
  AVATAR_RADIUS,
  AVATAR_START_X,
  AVATAR_START_Y,
  ENEMY_SPAWN_MARGIN,
  PLAY_H,
  PLAY_W,
  PROJECTILE_RADIUS,
  WEAPON_BASE_CRIT,
  WEAPON_BASE_DAMAGE,
  WEAPON_BASE_PIERCE,
  WEAPON_BASE_PERIOD,
  WEAPON_BASE_PROJECTILES,
  WEAPON_BASE_PROJECTILE_SPEED,
} from './config';
import type { Card } from './cards';
import { type Rng } from './rng';
import {
  type EnemyKind,
  type EntityId,
  type WeaponMode,
  type WeaponState,
  World,
} from './world';
import { BOSS_REGISTRY } from './bosses/registry';

export function spawnAvatar(
  world: World,
  skinId: string = 'triangle',
): EntityId {
  return world.create({
    pos: { x: AVATAR_START_X, y: AVATAR_START_Y },
    vel: { x: 0, y: 0 },
    radius: AVATAR_RADIUS,
    team: 'player',
    avatar: {
      hp: AVATAR_BASE_HP,
      maxHp: AVATAR_BASE_HP,
      speedMul: 1,
      iframes: 0,
      targetX: AVATAR_START_X,
      targetY: AVATAR_START_Y,
      skinId,
    },
    weapon: {
      mode: 'vertex',
      period: WEAPON_BASE_PERIOD,
      damage: WEAPON_BASE_DAMAGE,
      projectileSpeed: WEAPON_BASE_PROJECTILE_SPEED,
      projectiles: WEAPON_BASE_PROJECTILES,
      pierce: WEAPON_BASE_PIERCE,
      crit: WEAPON_BASE_CRIT,
      cooldown: 0.2, // tiny grace before first shot
      ricochet: 0,
      chain: 0,
      burnDps: 0,
      burnDuration: 0,
      slowPct: 0,
      slowDuration: 0,
    },
  });
}

export interface EnemyStats {
  hp: number;
  maxSpeed: number;
  contactDamage: number;
  radius: number;
}

const ENEMY_STATS: Record<EnemyKind, EnemyStats> = {
  circle: { hp: 3, maxSpeed: 72, contactDamage: 1, radius: 8 },
  square: { hp: 5, maxSpeed: 98, contactDamage: 1, radius: 9 },
  star: { hp: 8, maxSpeed: 88, contactDamage: 1, radius: 11 },
  boss: { hp: 80, maxSpeed: 52, contactDamage: 1, radius: 22 },
  pentagon: { hp: 6, maxSpeed: 68, contactDamage: 1, radius: 10 },
  hexagon: { hp: 7, maxSpeed: 62, contactDamage: 1, radius: 10 },
  diamond: { hp: 4, maxSpeed: 112, contactDamage: 1, radius: 8 },
  cross: { hp: 7, maxSpeed: 58, contactDamage: 1, radius: 10 },
  crescent: { hp: 5, maxSpeed: 78, contactDamage: 1, radius: 9 },
  // Named bosses — stats overridden by BossDef.install after spawn.
  orthogon: { hp: 135, maxSpeed: 45, contactDamage: 1, radius: 22 },
  jets: { hp: 250, maxSpeed: 60, contactDamage: 1, radius: 22 },
  mirror: { hp: 400, maxSpeed: 50, contactDamage: 1, radius: 22 },
};

/** Kinds tagged as elite at spawn. Aligns with tier-2+ KILL_POINTS. */
const ELITE_KINDS: ReadonlySet<EnemyKind> = new Set([
  'star',
  'pentagon',
  'hexagon',
  'cross',
]);

/** Per-kill HP multiplier applied to elite-marked spawns. */
const ELITE_HP_MUL = 1.5;

export function isEliteKind(kind: EnemyKind): boolean {
  return ELITE_KINDS.has(kind);
}

export function spawnEnemy(
  world: World,
  kind: EnemyKind,
  rng: Rng,
  picks: readonly Card[] = [],
): EntityId {
  // Named bosses spawn as `boss` EnemyKind entities, then get their pattern installed.
  const namedBossId: Record<string, keyof typeof BOSS_REGISTRY> = {
    orthogon: 'orthogon',
    jets: 'jets',
    mirror: 'mirror',
  };
  const namedBossKey = namedBossId[kind];
  if (namedBossKey) {
    const bossDef = BOSS_REGISTRY[namedBossKey];
    const baseStats = ENEMY_STATS[kind];
    const id = world.create({
      pos: { x: PLAY_W / 2, y: PLAY_H * 0.15 },
      vel: { x: 0, y: 0 },
      radius: baseStats.radius,
      team: 'enemy',
      enemy: {
        kind: 'boss',
        maxHp: baseStats.hp,
        contactDamage: baseStats.contactDamage,
        maxSpeed: baseStats.maxSpeed,
        wobblePhase: 0,
      },
      hp: { value: baseStats.hp },
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
    });
    const c = world.get(id);
    if (c) {
      const spec = bossDef.buildSpec(picks);
      bossDef.install(c, spec);
      c.enemy!.maxHp = c.hp!.value;
    }
    return id;
  }

  const stats = ENEMY_STATS[kind];
  // Bosses appear in the upper play-field, centered. Other enemies spawn on
  // the outer margin of one of the four edges.
  let x: number, y: number;
  if (kind === 'boss') {
    x = PLAY_W / 2;
    y = PLAY_H * 0.15;
  } else {
    const edge = Math.floor(rng() * 4);
    if (edge === 0) {
      x = rng() * PLAY_W;
      y = ENEMY_SPAWN_MARGIN;
    } else if (edge === 1) {
      x = PLAY_W - ENEMY_SPAWN_MARGIN;
      y = rng() * PLAY_H;
    } else if (edge === 2) {
      x = rng() * PLAY_W;
      y = PLAY_H - ENEMY_SPAWN_MARGIN;
    } else {
      x = ENEMY_SPAWN_MARGIN;
      y = rng() * PLAY_H;
    }
  }
  const elite = isEliteKind(kind);
  const hp = elite ? Math.ceil(stats.hp * ELITE_HP_MUL) : stats.hp;
  return world.create({
    pos: { x, y },
    vel: { x: 0, y: 0 },
    radius: stats.radius,
    team: 'enemy',
    enemy: {
      kind,
      maxHp: hp,
      contactDamage: stats.contactDamage,
      maxSpeed: stats.maxSpeed,
      wobblePhase: rng() * Math.PI * 2,
      // Kind-specific fields
      shield: kind === 'hexagon' ? 1 : undefined,
      dashCooldown: kind === 'diamond' ? 2 + rng() * 2 : undefined,
      shootCooldown: kind === 'cross' ? 1.5 + rng() : undefined,
      orbitAngle: kind === 'crescent' ? rng() * Math.PI * 2 : undefined,
      isElite: elite || undefined,
    },
    hp: { value: hp },
  });
}

/** Spawn an enemy at a specific position (for pentagon splits etc.). */
export function spawnEnemyAt(
  world: World,
  kind: EnemyKind,
  rng: Rng,
  atX: number,
  atY: number,
): EntityId {
  const stats = ENEMY_STATS[kind];
  const spread = 12;
  const x = atX + (rng() - 0.5) * spread;
  const y = atY + (rng() - 0.5) * spread;
  const elite = isEliteKind(kind);
  const hp = elite ? Math.ceil(stats.hp * ELITE_HP_MUL) : stats.hp;
  return world.create({
    pos: { x, y },
    vel: { x: 0, y: 0 },
    radius: stats.radius,
    team: 'enemy',
    enemy: {
      kind,
      maxHp: hp,
      contactDamage: stats.contactDamage,
      maxSpeed: stats.maxSpeed,
      wobblePhase: rng() * Math.PI * 2,
      shield: kind === 'hexagon' ? 1 : undefined,
      dashCooldown: kind === 'diamond' ? 2 + rng() * 2 : undefined,
      shootCooldown: kind === 'cross' ? 1.5 + rng() : undefined,
      orbitAngle: kind === 'crescent' ? rng() * Math.PI * 2 : undefined,
      isElite: elite || undefined,
    },
    hp: { value: hp },
  });
}

export function spawnProjectile(
  world: World,
  x: number,
  y: number,
  vx: number,
  vy: number,
  weapon: WeaponState,
  crit: boolean,
  ttl: number = 1.6,
): EntityId {
  return world.create({
    pos: { x, y },
    vel: { x: vx, y: vy },
    radius: PROJECTILE_RADIUS,
    team: 'projectile',
    projectile: {
      damage: weapon.damage * (crit ? 2 : 1),
      crit,
      pierceRemaining: weapon.pierce,
      ricochetRemaining: weapon.ricochet,
      chainRemaining: weapon.chain,
      burnDps: weapon.burnDps,
      burnDuration: weapon.burnDuration,
      slowPct: weapon.slowPct,
      slowDuration: weapon.slowDuration,
      hitIds: new Set<EntityId>(),
      ttl,
    },
  });
}

export function spawnOrbitShard(
  world: World,
  ownerId: EntityId,
  angle: number,
  weapon: WeaponState,
  crit: boolean,
): EntityId {
  const owner = world.get(ownerId);
  const ox = owner?.pos?.x ?? AVATAR_START_X;
  const oy = owner?.pos?.y ?? AVATAR_START_Y;
  const radius = 34;
  return world.create({
    pos: {
      x: ox + Math.cos(angle) * radius,
      y: oy + Math.sin(angle) * radius,
    },
    vel: { x: 0, y: 0 },
    radius: PROJECTILE_RADIUS + 1,
    team: 'projectile',
    projectile: {
      damage: weapon.damage * (crit ? 2 : 1),
      crit,
      pierceRemaining: weapon.pierce,
      ricochetRemaining: weapon.ricochet,
      chainRemaining: weapon.chain,
      burnDps: weapon.burnDps,
      burnDuration: weapon.burnDuration,
      slowPct: weapon.slowPct,
      slowDuration: weapon.slowDuration,
      hitIds: new Set<EntityId>(),
      ttl: 2.8,
      orbit: {
        ownerId,
        angle,
        radius,
        angularSpeed: 5.2,
      },
    },
  });
}

/** Spawn a chain-jumped projectile from `(x,y)` toward the given target. */
export function spawnChainBolt(
  world: World,
  x: number,
  y: number,
  tx: number,
  ty: number,
  damage: number,
  chainRemaining: number,
  burnDps: number,
  burnDuration: number,
  slowPct: number,
  slowDuration: number,
  hitIds: Set<EntityId>,
): EntityId {
  const dx = tx - x;
  const dy = ty - y;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = 520;
  return world.create({
    pos: { x, y },
    vel: { x: (dx / dist) * speed, y: (dy / dist) * speed },
    radius: PROJECTILE_RADIUS,
    team: 'projectile',
    projectile: {
      damage,
      crit: false,
      pierceRemaining: 0,
      ricochetRemaining: 0,
      chainRemaining,
      burnDps,
      burnDuration,
      slowPct,
      slowDuration,
      hitIds: new Set(hitIds),
      ttl: 0.5,
    },
  });
}

/**
 * Build a fresh WeaponState for a Weapon-class draft pick. Each mode picks its
 * own period / damage / projectile-speed defaults so extras don't inherit the
 * primary's modifiers (mostly so balance is decoupled from prior picks).
 */
export function createWeaponForMode(mode: WeaponMode): WeaponState {
  const base: WeaponState = {
    mode,
    period: WEAPON_BASE_PERIOD,
    damage: WEAPON_BASE_DAMAGE,
    projectileSpeed: WEAPON_BASE_PROJECTILE_SPEED,
    projectiles: WEAPON_BASE_PROJECTILES,
    pierce: WEAPON_BASE_PIERCE,
    crit: WEAPON_BASE_CRIT,
    cooldown: 0.4, // small stagger so all extras don't fire on the same frame
    ricochet: 0,
    chain: 0,
    burnDps: 0,
    burnDuration: 0,
    slowPct: 0,
    slowDuration: 0,
  };
  switch (mode) {
    case 'faceBeam':
      return { ...base, period: 0.95, damage: 1, projectiles: 1 };
    case 'orbitShard':
      return { ...base, period: 1.6, damage: 1, projectiles: 3 };
    case 'homing':
      return {
        ...base,
        period: 0.8,
        damage: 2,
        projectileSpeed: 320,
        projectiles: 1,
      };
    case 'burst':
      return {
        ...base,
        period: 1.1,
        damage: 3,
        projectileSpeed: 360,
        projectiles: 1,
      };
    case 'fan':
      return { ...base, period: 0.7, damage: 1, projectiles: 5 };
    case 'charge':
      return {
        ...base,
        period: 1.6,
        damage: 4,
        projectileSpeed: 700,
        pierce: 99,
        projectiles: 1,
      };
    default:
      return base;
  }
}

/**
 * Spawn N small radial projectiles from (x,y). Used by burst weapons when their
 * primary projectile is consumed (hit or ttl). Fragments inherit a fraction of
 * the parent damage and never burst again to keep the chain bounded.
 */
export function spawnBurstFragments(
  world: World,
  x: number,
  y: number,
  count: number,
  parentDamage: number,
): void {
  const dmg = Math.max(1, Math.round(parentDamage * 0.5));
  const speed = 320;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const vx = Math.cos(a) * speed;
    const vy = Math.sin(a) * speed;
    world.create({
      pos: { x, y },
      vel: { x: vx, y: vy },
      radius: PROJECTILE_RADIUS,
      team: 'projectile',
      projectile: {
        damage: dmg,
        crit: false,
        pierceRemaining: 0,
        ricochetRemaining: 0,
        chainRemaining: 0,
        burnDps: 0,
        burnDuration: 0,
        slowPct: 0,
        slowDuration: 0,
        hitIds: new Set<EntityId>(),
        ttl: 0.45,
      },
    });
  }
}

export function spawnEnemyShot(
  world: World,
  x: number,
  y: number,
  vx: number,
  vy: number,
  damage: number,
  crit: boolean,
): EntityId {
  return world.create({
    pos: { x, y },
    vel: { x: vx, y: vy },
    radius: PROJECTILE_RADIUS + 1,
    team: 'enemy-shot',
    projectile: {
      damage: crit ? damage * 2 : damage,
      crit,
      pierceRemaining: 0,
      ricochetRemaining: 0,
      chainRemaining: 0,
      burnDps: 0,
      burnDuration: 0,
      slowPct: 0,
      slowDuration: 0,
      hitIds: new Set<EntityId>(),
      ttl: 2.4,
    },
  });
}
