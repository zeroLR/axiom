import { WEAPON_BASE_PERIOD } from "./config";
import type { PlayerProfile, StartingShapeId } from "./data/types";
import type { EntityId, WeaponState, World } from "./world";

export interface StartingShapeDef {
  id: StartingShapeId;
  name: string;
  skinId: string;
  weaponName: string;
  weaponMode: WeaponState["mode"];
  unlockPoints: number;
}

export const STARTING_SHAPES: readonly StartingShapeDef[] = [
  {
    id: "triangle",
    name: "Triangle",
    skinId: "triangle",
    weaponName: "Vertex Shot",
    weaponMode: "vertex",
    unlockPoints: 0,
  },
  {
    id: "square",
    name: "Square",
    skinId: "skin-square",
    weaponName: "Face Beam",
    weaponMode: "faceBeam",
    unlockPoints: 600,
  },
  {
    id: "diamond",
    name: "Diamond",
    skinId: "skin-diamond",
    weaponName: "Orbit Shard",
    weaponMode: "orbitShard",
    unlockPoints: 1500,
  },
];

function shapeDef(id: StartingShapeId): StartingShapeDef {
  return STARTING_SHAPES.find((s) => s.id === id) ?? STARTING_SHAPES[0]!;
}

export function isStartingShapeUnlocked(profile: PlayerProfile, id: StartingShapeId): boolean {
  const total = profile.stats.totalPointsEarned ?? 0;
  return total >= shapeDef(id).unlockPoints;
}

export function unlockProgress(profile: PlayerProfile, id: StartingShapeId): { current: number; required: number } {
  const required = shapeDef(id).unlockPoints;
  const current = Math.min(required, profile.stats.totalPointsEarned ?? 0);
  return { current, required };
}

export function resolveSelectedStartingShape(profile: PlayerProfile): StartingShapeId {
  const selected = profile.activeStartShape ?? "triangle";
  return isStartingShapeUnlocked(profile, selected) ? selected : "triangle";
}

export function runSkinForStartingShape(shapeId: StartingShapeId, activeSkin: string): string {
  if (shapeId === "triangle") return activeSkin;
  return shapeDef(shapeId).skinId;
}

export function applyStartingShapeLoadout(world: World, avatarId: EntityId, shapeId: StartingShapeId): void {
  const avatar = world.get(avatarId);
  if (!avatar?.weapon) return;
  const weapon = avatar.weapon;
  weapon.orbitAngle = 0;
  switch (shapeId) {
    case "square":
      weapon.mode = "faceBeam";
      weapon.period = WEAPON_BASE_PERIOD * 1.15;
      break;
    case "diamond":
      weapon.mode = "orbitShard";
      weapon.period = WEAPON_BASE_PERIOD;
      break;
    case "triangle":
    default:
      weapon.mode = "vertex";
      weapon.period = WEAPON_BASE_PERIOD;
      break;
  }
}
