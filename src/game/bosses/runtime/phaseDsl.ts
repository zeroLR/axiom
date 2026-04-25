// ── Boss Phase DSL ────────────────────────────────────────────────────────────
// Declarative phase scripts replace the per-boss switch(bossPhase) machines
// for "compositional" bosses (Orthogon / Lattice / Rift). Mirror keeps its
// custom runtime because its abilities derive from player picks; Jets keeps
// its custom runtime because it threads waypoint pathing + dash callbacks
// that don't fit a verb sequence.
//
// The interpreter mirrors the original control flow exactly:
//   1. Lazy-init bossPhase / bossTimer / bossWaypointIdx.
//   2. Each frame: decrement bossTimer; if still positive, return.
//   3. Run the current phase's `steps` in order (instant), then set bossTimer
//      to the phase's `cooldown` (or `enragedCooldown` when applicable).
//   4. Advance bossPhase with wraparound.
//
// `enrageBelowHpFrac` defaults to 0.5 to match every existing boss.

import { spawnEnemyShot } from "../../entities";
import type { Rng } from "../../rng";
import type { Components, World } from "../../world";

export type TelegraphAngleSet = "cardinal" | "all8";

const CARDINAL_ANGLES: readonly number[] = [
  0, Math.PI / 2, Math.PI, -Math.PI / 2,
];
const ALL8_ANGLES: readonly number[] = [
  ...CARDINAL_ANGLES,
  Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4, -Math.PI / 4,
];

function anglesFor(set: TelegraphAngleSet): number[] {
  return set === "all8" ? [...ALL8_ANGLES] : [...CARDINAL_ANGLES];
}

/** Fractional bounding box used by `blink`. Coordinates are 0..1 of PLAY_W/H. */
export interface BlinkBoundsFrac {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export type BossVerb =
  | {
      kind: "setTelegraph";
      angles: TelegraphAngleSet;
      enragedAngles?: TelegraphAngleSet;
    }
  | {
      kind: "volleyOnTelegraph";
      shotsPerLine: number;
      spread: number;
      speed: number;
    }
  | { kind: "fanAtPlayer" }
  | {
      kind: "homingAtPlayer";
      count: number;
      enragedCount?: number;
      speed: number;
      spread: number;
    }
  | {
      kind: "radialBurst";
      count: number;
      enragedCount?: number;
      speed: number;
      /** When true, rotates by `(bossWaypointIdx * π / count)` and advances index. */
      useRotateOffset?: boolean;
    }
  | {
      kind: "blink";
      bounds: BlinkBoundsFrac;
      playW: number;
      playH: number;
    }
  | { kind: "ifEnraged"; then: BossVerb }
  | {
      /** Freeze up to `count` non-boss enemies for `duration` seconds. */
      kind: "freezeEnemies";
      count: number;
      duration: number;
    }
  | {
      /** Teleport the avatar to the opposite side of the play field. */
      kind: "forceDash";
      playW: number;
      playH: number;
    };

export interface BossPhase {
  /** Instant actions run when the boss enters this phase. */
  steps: readonly BossVerb[];
  /** Seconds the boss waits before advancing to the next phase. */
  cooldown: number;
  /** Override `cooldown` while bossEnraged is true. */
  enragedCooldown?: number;
}

export interface BossPhaseScript {
  /** HP fraction at or below which `bossEnraged` flips to true (default 0.5). */
  enrageBelowHpFrac?: number;
  /** Phase ring; cycles 0 → 1 → … → last → 0. */
  phases: readonly BossPhase[];
}

/** Context passed into runPhaseScript by the dispatcher. */
export interface BossScriptCtx {
  world: World;
  c: Components;
  ax: number;
  ay: number;
  rng: Rng;
  dt: number;
  fireAimedFan: (world: World, c: Components, baseAngle: number, rng: Rng) => void;
  /** Boss `maxHp` (used for the enrage threshold). */
  maxHp: number;
  /** Avatar entity id — required by `forceDash`; optional for backwards compat. */
  avatarId?: number;
}

// ── Verb runner ────────────────────────────────────────────────────────────

function runVerb(verb: BossVerb, ctx: BossScriptCtx): void {
  const { world, c, ax, ay, rng } = ctx;
  const e = c.enemy!;
  const enraged = e.bossEnraged === true;

  switch (verb.kind) {
    case "setTelegraph": {
      const set = enraged && verb.enragedAngles ? verb.enragedAngles : verb.angles;
      e.bossTelegraphLines = anglesFor(set);
      return;
    }
    case "volleyOnTelegraph": {
      const angles = e.bossTelegraphLines ?? CARDINAL_ANGLES;
      for (const baseAngle of angles) {
        for (let i = 0; i < verb.shotsPerLine; i++) {
          const offset = (i - (verb.shotsPerLine - 1) / 2) * verb.spread;
          const a = baseAngle + offset;
          spawnEnemyShot(
            world,
            c.pos!.x,
            c.pos!.y,
            Math.cos(a) * verb.speed,
            Math.sin(a) * verb.speed,
            c.weapon!.damage,
            false,
          );
        }
      }
      e.bossTelegraphLines = undefined;
      return;
    }
    case "fanAtPlayer": {
      const baseAngle = Math.atan2(ay - c.pos!.y, ax - c.pos!.x);
      ctx.fireAimedFan(world, c, baseAngle, rng);
      return;
    }
    case "homingAtPlayer": {
      const count = enraged && verb.enragedCount !== undefined ? verb.enragedCount : verb.count;
      const baseAngle = Math.atan2(ay - c.pos!.y, ax - c.pos!.x);
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * verb.spread;
        const a = baseAngle + offset;
        const id = spawnEnemyShot(
          world,
          c.pos!.x,
          c.pos!.y,
          Math.cos(a) * verb.speed,
          Math.sin(a) * verb.speed,
          c.weapon!.damage,
          false,
        );
        const sc = world.get(id);
        if (sc?.projectile) sc.projectile.homingAvatar = true;
      }
      return;
    }
    case "radialBurst": {
      const count = enraged && verb.enragedCount !== undefined ? verb.enragedCount : verb.count;
      let rotOffset = 0;
      if (verb.useRotateOffset) {
        if (e.bossWaypointIdx === undefined) e.bossWaypointIdx = 0;
        rotOffset = (e.bossWaypointIdx * Math.PI) / count;
        e.bossWaypointIdx = (e.bossWaypointIdx + 1) % (count * 2);
      }
      for (let i = 0; i < count; i++) {
        const a = rotOffset + (i / count) * Math.PI * 2;
        spawnEnemyShot(
          world,
          c.pos!.x,
          c.pos!.y,
          Math.cos(a) * verb.speed,
          Math.sin(a) * verb.speed,
          c.weapon!.damage,
          false,
        );
      }
      return;
    }
    case "blink": {
      c.pos!.x = verb.playW * (verb.bounds.x0 + rng() * (verb.bounds.x1 - verb.bounds.x0));
      c.pos!.y = verb.playH * (verb.bounds.y0 + rng() * (verb.bounds.y1 - verb.bounds.y0));
      return;
    }
    case "ifEnraged": {
      if (enraged) runVerb(verb.then, ctx);
      return;
    }
    case "freezeEnemies": {
      // Collect up to `count` live non-boss enemies sorted by ascending HP
      // (freeze the weakest so they can't clean up the player while evading).
      const targets: { id: number; hp: number }[] = [];
      for (const [id, fc] of world.with("enemy", "hp")) {
        if (fc.enemy!.kind === "boss") continue;
        if ((fc.hp?.value ?? 0) <= 0) continue;
        targets.push({ id, hp: fc.hp!.value });
      }
      targets.sort((a, b) => a.hp - b.hp);
      for (let i = 0; i < Math.min(verb.count, targets.length); i++) {
        const fc = world.get(targets[i]!.id);
        if (fc?.enemy) fc.enemy.frozenTimer = verb.duration;
      }
      return;
    }
    case "forceDash": {
      // Teleport avatar to the side of the field opposite the boss.
      const bx = c.pos!.x;
      const by = c.pos!.y;
      const cx = verb.playW / 2;
      const cy = verb.playH / 2;
      for (const [, ac] of world.with("avatar", "pos")) {
        // Mirror through the field centre, clamped 15% from each wall.
        const margin = 0.15;
        const nx = cx + (cx - bx);
        const ny = cy + (cy - by);
        ac.pos!.x = Math.max(verb.playW * margin, Math.min(verb.playW * (1 - margin), nx));
        ac.pos!.y = Math.max(verb.playH * margin, Math.min(verb.playH * (1 - margin), ny));
      }
      return;
    }
  }
}

// ── Public entrypoint ──────────────────────────────────────────────────────

/**
 * Drive one frame of a script-based boss. Caller is responsible for owning
 * the `BossPhaseScript` and threading `maxHp` (interpreter doesn't know it).
 */
export function runPhaseScript(script: BossPhaseScript, ctx: BossScriptCtx): void {
  const e = ctx.c.enemy!;
  const hp = ctx.c.hp!;
  if (e.bossTimer === undefined) e.bossTimer = 0;
  if (e.bossPhase === undefined) e.bossPhase = 0;

  const enrageFrac = script.enrageBelowHpFrac ?? 0.5;
  if (!e.bossEnraged && hp.value <= ctx.maxHp * enrageFrac) {
    e.bossEnraged = true;
  }

  e.bossTimer -= ctx.dt;
  if (e.bossTimer > 0) return;

  const phaseIdx = e.bossPhase % script.phases.length;
  const phase = script.phases[phaseIdx]!;
  for (const step of phase.steps) runVerb(step, ctx);

  const cooldown = e.bossEnraged && phase.enragedCooldown !== undefined
    ? phase.enragedCooldown
    : phase.cooldown;
  e.bossTimer = cooldown;
  e.bossPhase = (phaseIdx + 1) % script.phases.length;
}
