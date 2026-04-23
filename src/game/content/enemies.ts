import type { EnemyKind } from "../world";

export interface EnemyStats {
  hp: number;
  maxSpeed: number;
  contactDamage: number;
  radius: number;
}

export type EnemySpawnBehavior = "shielded" | "dash" | "shoot" | "orbit" | "spiral" | "lance" | "tri-shoot" | "burst8" | "homing-orbit";

export interface EnemyDef {
  kind: EnemyKind;
  stats: EnemyStats;
  isElite?: boolean;
  spawnBehavior?: EnemySpawnBehavior;
}

export const ENEMY_REGISTRY: Record<EnemyKind, EnemyDef> = {
  circle: {
    kind: "circle",
    stats: { hp: 3, maxSpeed: 72, contactDamage: 1, radius: 8 },
  },
  square: {
    kind: "square",
    stats: { hp: 5, maxSpeed: 98, contactDamage: 1, radius: 9 },
  },
  star: {
    kind: "star",
    stats: { hp: 8, maxSpeed: 88, contactDamage: 1, radius: 11 },
    isElite: true,
  },
  boss: {
    kind: "boss",
    stats: { hp: 80, maxSpeed: 52, contactDamage: 1, radius: 22 },
  },
  pentagon: {
    kind: "pentagon",
    stats: { hp: 6, maxSpeed: 68, contactDamage: 1, radius: 10 },
    isElite: true,
  },
  hexagon: {
    kind: "hexagon",
    stats: { hp: 7, maxSpeed: 62, contactDamage: 1, radius: 10 },
    isElite: true,
    spawnBehavior: "shielded",
  },
  diamond: {
    kind: "diamond",
    stats: { hp: 4, maxSpeed: 112, contactDamage: 1, radius: 8 },
    spawnBehavior: "dash",
  },
  cross: {
    kind: "cross",
    stats: { hp: 7, maxSpeed: 58, contactDamage: 1, radius: 10 },
    isElite: true,
    spawnBehavior: "shoot",
  },
  crescent: {
    kind: "crescent",
    stats: { hp: 5, maxSpeed: 78, contactDamage: 1, radius: 9 },
    spawnBehavior: "orbit",
  },
  // ── Stage 4 enemies ───────────────────────────────────────────────────────
  spiral: {
    kind: "spiral",
    stats: { hp: 6, maxSpeed: 68, contactDamage: 1, radius: 10 },
    spawnBehavior: "spiral",
  },
  lance: {
    kind: "lance",
    stats: { hp: 5, maxSpeed: 52, contactDamage: 2, radius: 8 },
    spawnBehavior: "lance",
  },
  prism: {
    kind: "prism",
    stats: { hp: 12, maxSpeed: 52, contactDamage: 1, radius: 11 },
    isElite: true,
    spawnBehavior: "tri-shoot",
  },
  // ── Stage 5 enemies ───────────────────────────────────────────────────────
  octo: {
    kind: "octo",
    stats: { hp: 22, maxSpeed: 30, contactDamage: 1, radius: 14 },
    isElite: true,
    spawnBehavior: "burst8",
  },
  shade: {
    kind: "shade",
    stats: { hp: 16, maxSpeed: 60, contactDamage: 1, radius: 11 },
    isElite: true,
    spawnBehavior: "homing-orbit",
  },
  // ── Named bosses ──────────────────────────────────────────────────────────
  orthogon: {
    kind: "orthogon",
    stats: { hp: 135, maxSpeed: 45, contactDamage: 1, radius: 22 },
  },
  jets: {
    kind: "jets",
    stats: { hp: 250, maxSpeed: 60, contactDamage: 1, radius: 22 },
  },
  mirror: {
    kind: "mirror",
    stats: { hp: 400, maxSpeed: 50, contactDamage: 1, radius: 22 },
  },
  lattice: {
    kind: "lattice",
    stats: { hp: 320, maxSpeed: 38, contactDamage: 1, radius: 24 },
  },
  rift: {
    kind: "rift",
    stats: { hp: 460, maxSpeed: 42, contactDamage: 1, radius: 24 },
  },
};
