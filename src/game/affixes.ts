// ── Affix runtime: rolling + spawn-time mutation + per-frame tick ──────────
// Pure functions consumed by `src/scenes/play.ts` during stage scaling and
// the main update loop. Keeping these out of the scene class makes them unit-
// testable without spinning up the Pixi runtime.

import {
  AFFIX_REGISTRY,
  type StageAffixPolicy,
} from './content/affixes';
import { ENEMY_REGISTRY } from './content/enemies';
import type { Rng } from './rng';
import { weightedPick } from './weightedSampler';
import type { AffixId, Components, EntityId, World } from './world';

const REGEN_PERIOD_SEC = 1.0;
const CHARGED_BASE_COOLDOWN = 3.0;
const CHARGED_WINDUP = 1.5;
const CHARGED_BURST_COUNT = 4;
const CHARGED_SPREAD_RAD = Math.PI / 6;
const CHARGED_SHOT_SPEED = 150;

const SWIFT_SPEED_MUL = 1.4;
const DENSE_HP_MUL = 1.8;
const DENSE_SPEED_MUL = 0.85;
const VAMPIRIC_HEAL_RANGE = 220;

/**
 * Roll affixes for an enemy at scaling time.
 *
 * - Bosses skip the roll entirely (boss difficulty comes from phase scripts).
 * - Elites always receive `policy.eliteAffixCount` (subject to filter).
 * - Non-elites receive 1 affix with probability `policy.normalRollChance`.
 *
 * Returns the rolled ids in deterministic order. Caller is responsible for
 * writing them onto the `Enemy` component and invoking `applyAffixSpawnEffects`.
 */
export function rollAffixes(
  comp: Components,
  policy: StageAffixPolicy,
  stageIndex: number,
  rng: Rng,
): AffixId[] {
  const enemy = comp.enemy;
  if (!enemy || enemy.kind === 'boss') return [];

  const def = ENEMY_REGISTRY[enemy.kind];
  if (!def) return [];

  const eligible = eligibleAffixesFor(def.archetypes ?? [], policy, stageIndex);
  if (eligible.length === 0) return [];

  const isElite = enemy.isElite === true;
  const targetCount = isElite
    ? policy.eliteAffixCount
    : rng() < policy.normalRollChance
      ? 1
      : 0;
  if (targetCount <= 0) return [];

  const out: AffixId[] = [];
  const pool = eligible.slice();
  for (let i = 0; i < targetCount && pool.length > 0; i++) {
    const choice = weightedPick(
      pool.map((id) => ({
        item: id,
        weight: AFFIX_REGISTRY[id].weight,
      })),
      rng,
    );
    out.push(choice);
    // Remove the chosen affix and any incompatible ones for the next roll.
    const excludes = new Set<AffixId>(AFFIX_REGISTRY[choice].excludes ?? []);
    excludes.add(choice);
    for (let j = pool.length - 1; j >= 0; j--) {
      if (excludes.has(pool[j]!)) pool.splice(j, 1);
    }
  }
  return out;
}

/**
 * Apply spawn-time mutations from the rolled affixes. Idempotent across the
 * roll but should be called exactly once per enemy (right after `rollAffixes`).
 * Writes affix-related state (shield, regenAccumulator, chargedCooldown) and
 * adjusts maxSpeed/HP for swift/dense.
 */
export function applyAffixSpawnEffects(
  comp: Components,
  affixes: readonly AffixId[],
): void {
  if (affixes.length === 0) return;
  const enemy = comp.enemy;
  const hp = comp.hp;
  if (!enemy || !hp) return;

  for (const id of affixes) {
    switch (id) {
      case 'shielded':
        // Stack on top of any existing shield (hexagon already has shield=1).
        enemy.shield = (enemy.shield ?? 0) + 1;
        break;
      case 'swift':
        enemy.maxSpeed *= SWIFT_SPEED_MUL;
        break;
      case 'dense': {
        const newHp = Math.max(1, Math.ceil(hp.value * DENSE_HP_MUL));
        hp.value = newHp;
        enemy.maxHp = newHp;
        enemy.maxSpeed *= DENSE_SPEED_MUL;
        break;
      }
      case 'regen':
        enemy.regenAccumulator = 0;
        break;
      case 'charged':
        enemy.chargedCooldown = CHARGED_BASE_COOLDOWN;
        enemy.chargedWindup = 0;
        break;
      case 'vampiric':
      case 'splitting':
      case 'linked':
        // No spawn-time stat change; behavior handled at runtime hooks.
        break;
    }
  }
  enemy.affixes = affixes;
}

/**
 * Pair every unpaired `linked` enemy with its nearest unpaired peer. Run after
 * a scaling pass so newly-spawned linked grunts get partnered together. Singles
 * (odd one out) are left without a partner — they lose the half-damage bonus
 * until another linked grunt spawns (next pass will re-attempt pairing).
 */
export function pairLinkedAffixEnemies(world: World): void {
  type LinkedEntry = { id: EntityId; x: number; y: number };
  const unpaired: LinkedEntry[] = [];
  for (const [id, c] of world.with('enemy', 'pos')) {
    if (!c.enemy!.affixes?.includes('linked')) continue;
    if (c.enemy!.linkedPartnerId !== undefined) {
      // Drop stale references whose partner already despawned.
      if (!world.get(c.enemy!.linkedPartnerId)) {
        c.enemy!.linkedPartnerId = undefined;
      } else {
        continue;
      }
    }
    unpaired.push({ id: id as EntityId, x: c.pos!.x, y: c.pos!.y });
  }

  while (unpaired.length >= 2) {
    const a = unpaired.shift()!;
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < unpaired.length; i++) {
      const b = unpaired[i]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist) {
        bestDist = d2;
        bestIdx = i;
      }
    }
    const b = unpaired.splice(bestIdx, 1)[0]!;
    const ca = world.get(a.id);
    const cb = world.get(b.id);
    if (ca?.enemy && cb?.enemy) {
      ca.enemy.linkedPartnerId = b.id;
      cb.enemy.linkedPartnerId = a.id;
    }
  }
}

/**
 * Per-frame tick for affix behaviors that aren't event-driven:
 *  - `regen`  accumulates `dt`; on every REGEN_PERIOD_SEC heal +1 HP (cap maxHp).
 *  - `charged` counts down cooldown → spawns telegraph; windup → fires burst.
 *
 * Called from the play scene main update with the world-time `dt` (matches the
 * AI tick, so enemy-time-stop / freeze should pre-multiply before calling).
 */
export function tickAffixes(
  world: World,
  avatarId: EntityId,
  dt: number,
  rng: Rng,
  spawnShot: (x: number, y: number, vx: number, vy: number, dmg: number) => void,
): void {
  const avatar = world.get(avatarId);
  const ax = avatar?.pos?.x ?? 0;
  const ay = avatar?.pos?.y ?? 0;

  for (const [, c] of world.with('enemy', 'pos', 'hp')) {
    const e = c.enemy!;
    if (!e.affixes || e.affixes.length === 0) continue;
    if (c.hp!.value <= 0) continue;
    if (e.frozenTimer !== undefined && e.frozenTimer > 0) continue;

    if (e.affixes.includes('regen') && e.maxHp !== undefined) {
      e.regenAccumulator = (e.regenAccumulator ?? 0) + dt;
      while (e.regenAccumulator >= REGEN_PERIOD_SEC) {
        e.regenAccumulator -= REGEN_PERIOD_SEC;
        if (c.hp!.value < e.maxHp) {
          c.hp!.value = Math.min(e.maxHp, c.hp!.value + 1);
        }
      }
    }

    if (e.affixes.includes('charged')) {
      if (e.chargedWindup !== undefined && e.chargedWindup > 0) {
        e.chargedWindup -= dt;
        if (e.chargedWindup <= 0) {
          const angle = e.chargedAngle ?? Math.atan2(ay - c.pos!.y, ax - c.pos!.x);
          for (let i = 0; i < CHARGED_BURST_COUNT; i++) {
            const a = angle + (i - (CHARGED_BURST_COUNT - 1) / 2) * CHARGED_SPREAD_RAD;
            spawnShot(
              c.pos!.x,
              c.pos!.y,
              Math.cos(a) * CHARGED_SHOT_SPEED,
              Math.sin(a) * CHARGED_SHOT_SPEED,
              e.contactDamage,
            );
          }
          e.chargedWindup = undefined;
          e.chargedAngle = undefined;
          e.chargedCooldown = CHARGED_BASE_COOLDOWN + rng() * 1.5;
        }
      } else if (e.chargedCooldown !== undefined) {
        e.chargedCooldown -= dt;
        if (e.chargedCooldown <= 0) {
          e.chargedWindup = CHARGED_WINDUP;
          e.chargedAngle = Math.atan2(ay - c.pos!.y, ax - c.pos!.x);
        }
      }
    }
  }
}

/**
 * Vampiric handler: when an enemy dies, heal any nearby vampiric peer +1 HP.
 * Wired into the `onEnemyKilled` event in `play.ts` so it composes cleanly
 * with combustion and fragment-drop hooks already running there.
 */
export function onVampiricKill(world: World, killedId: EntityId): void {
  const killed = world.get(killedId);
  const pos = killed?.pos;
  if (!pos) return;
  // Only trigger when the killed enemy itself was vampiric — that scopes the
  // mechanic to the affix family and avoids healing every random kill.
  if (!killed?.enemy?.affixes?.includes('vampiric')) return;
  const rangeSq = VAMPIRIC_HEAL_RANGE * VAMPIRIC_HEAL_RANGE;
  for (const [id, c] of world.with('enemy', 'pos', 'hp')) {
    if (id === killedId) continue;
    if (!c.enemy!.affixes?.includes('vampiric')) continue;
    if (c.hp!.value <= 0) continue;
    const max = c.enemy!.maxHp ?? c.hp!.value;
    if (c.hp!.value >= max) continue;
    const dx = c.pos!.x - pos.x;
    const dy = c.pos!.y - pos.y;
    if (dx * dx + dy * dy > rangeSq) continue;
    c.hp!.value = Math.min(max, c.hp!.value + 1);
  }
}

/** Internal: which affixes are eligible for an enemy given policy + stage. */
function eligibleAffixesFor(
  archetypes: readonly string[],
  policy: StageAffixPolicy,
  stageIndex: number,
): AffixId[] {
  const allowed = new Set<AffixId>(
    (policy.pool ?? (Object.keys(AFFIX_REGISTRY) as AffixId[])),
  );
  const out: AffixId[] = [];
  for (const id of Object.keys(AFFIX_REGISTRY) as AffixId[]) {
    if (!allowed.has(id)) continue;
    const def = AFFIX_REGISTRY[id];
    if (def.minStageIndex > stageIndex) continue;
    if (def.archetypes && def.archetypes.length > 0) {
      const ok = def.archetypes.some((a) =>
        archetypes.includes(a as string),
      );
      if (!ok) continue;
    }
    out.push(id);
  }
  return out;
}
