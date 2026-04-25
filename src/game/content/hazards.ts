// ── Hazard registry ──────────────────────────────────────────────────────────
// Hazards are environmental modifiers that run for the duration of a
// `hazardWave` StageBeat. Each hazard owns a stable id, a CSS dataset value
// (used by `src/style.css` to drive visual overlays) and an optional per-frame
// avatar tick that constrains motion or other gameplay properties.
//
// Adding a hazard:
//   1. Add its id to `HazardId`.
//   2. Add an entry below.
//   3. (Optional) author CSS for `body[data-hazard="<id>"]` in style.css.

import { PLAY_H, PLAY_W } from "../config";
import type { Components } from "../world";

export type HazardId = "fog" | "axis-lock" | "slow" | "mirror" | "pull-toward" | "static-field";

export interface HazardDef {
  id: HazardId;
  name: string;
  description: string;
  /**
   * Per-frame override applied to the avatar's components before
   * `updateAvatarMotion` reads them. Allowed to mutate `avatar.targetX/Y`,
   * `avatar.speedMul`, etc. Pure read on `c.pos` is expected.
   */
  applyAvatarTick?: (c: Components, dt: number) => void;
}

const AXIS_LOCK: HazardDef = {
  id: "axis-lock",
  name: "Axis Lock",
  description: "Movement snaps to the dominant cardinal axis.",
  applyAvatarTick: (c) => {
    const a = c.avatar;
    const p = c.pos;
    if (!a || !p) return;
    const dx = a.targetX - p.x;
    const dy = a.targetY - p.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      a.targetY = p.y;
    } else {
      a.targetX = p.x;
    }
  },
};

const FOG: HazardDef = {
  id: "fog",
  name: "Fog",
  description: "Vision dims; the field reads only by silhouette.",
  // No avatar tick — fog is visual-only via CSS overlay.
};

const SLOW: HazardDef = {
  id: "slow",
  name: "Slow",
  description: "Movement speed reduced to 45%.",
  // play.ts snapshots speedMul before wave and restores after — safe to override each frame.
  applyAvatarTick: (c) => {
    if (c.avatar) c.avatar.speedMul = Math.min(c.avatar.speedMul, 0.45);
  },
};

const MIRROR: HazardDef = {
  id: "mirror",
  name: "Mirror",
  description: "Movement inputs are reflected through the field centre.",
  applyAvatarTick: (c) => {
    if (!c.avatar) return;
    c.avatar.targetX = PLAY_W - c.avatar.targetX;
    c.avatar.targetY = PLAY_H - c.avatar.targetY;
  },
};

const PULL_TOWARD: HazardDef = {
  id: "pull-toward",
  name: "Pull-Toward",
  description: "Gravitational bias draws movement toward the field centre.",
  applyAvatarTick: (c, dt) => {
    if (!c.avatar || !c.pos) return;
    const cx = PLAY_W / 2;
    const cy = PLAY_H / 2;
    const strength = 60;
    c.avatar.targetX += (cx - c.pos.x) * dt * (strength / 200);
    c.avatar.targetY += (cy - c.pos.y) * dt * (strength / 200);
  },
};

const STATIC_FIELD: HazardDef = {
  id: "static-field",
  name: "Static Field",
  description: "Speed reduced to 60%; electromagnetic interference disrupts movement.",
  applyAvatarTick: (c) => {
    if (c.avatar) c.avatar.speedMul = Math.min(c.avatar.speedMul, 0.60);
  },
};

export const HAZARD_REGISTRY: Record<HazardId, HazardDef> = {
  fog: FOG,
  "axis-lock": AXIS_LOCK,
  slow: SLOW,
  mirror: MIRROR,
  "pull-toward": PULL_TOWARD,
  "static-field": STATIC_FIELD,
};

export function getHazardDef(id: string | undefined): HazardDef | null {
  if (!id) return null;
  return HAZARD_REGISTRY[id as HazardId] ?? null;
}
