import type { EntityId, World } from "./world";

/** Nearest live enemy to the given point, or null if none exist. */
export function closestEnemy(world: World, x: number, y: number): EntityId | null {
  let bestId: EntityId | null = null;
  let bestDist = Infinity;
  for (const [id, c] of world.with("enemy", "pos", "hp")) {
    if (c.hp!.value <= 0) continue;
    const dx = c.pos!.x - x;
    const dy = c.pos!.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      bestId = id;
    }
  }
  return bestId;
}
