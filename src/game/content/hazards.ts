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

import type { Components } from "../world";

export type HazardId = "fog" | "axis-lock";

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

export const HAZARD_REGISTRY: Record<HazardId, HazardDef> = {
  fog: FOG,
  "axis-lock": AXIS_LOCK,
};

export function getHazardDef(id: string | undefined): HazardDef | null {
  if (!id) return null;
  return HAZARD_REGISTRY[id as HazardId] ?? null;
}
