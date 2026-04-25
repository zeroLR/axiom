import type { EnemyKind } from "./world";

export type FragmentCategory = "basic" | "elite" | "boss";

export const ELITE_FRAGMENT_KINDS = [
  "star",
  "pentagon",
  "hexagon",
  "cross",
  "prism",
  "octo",
  "shade",
] as const;

export const BOSS_FRAGMENT_KINDS = [
  "boss",
  "orthogon",
  "jets",
  "mirror",
  "lattice",
  "rift",
  "nexus",
] as const;

export type EliteFragmentKind = (typeof ELITE_FRAGMENT_KINDS)[number];
export type BossFragmentKind = (typeof BOSS_FRAGMENT_KINDS)[number];

export type FragmentId =
  | "basic-core"
  | `elite-${EliteFragmentKind}`
  | `boss-${BossFragmentKind}`;

export interface FragmentMeta {
  id: FragmentId;
  category: FragmentCategory;
  label: string;
  enemyKind?: EnemyKind;
  buyPrice: number;
  sellPrice: number;
  unlockKills: number;
}

export type FragmentDetailRecord = Record<FragmentId, number>;
export const FRAGMENT_MATERIAL_CAP = 9999;

const BASE_STRENGTH: Record<EnemyKind, number> = {
  circle: 1,
  square: 2,
  star: 3,
  pentagon: 3,
  hexagon: 4,
  diamond: 3,
  cross: 4,
  crescent: 3,
  spiral: 3,
  lance: 3,
  prism: 5,
  octo: 6,
  shade: 5,
  boss: 50,
  orthogon: 50,
  jets: 50,
  mirror: 50,
  lattice: 50,
  rift: 50,
  nexus: 50,
};

export const FRAGMENT_META: readonly FragmentMeta[] = [
  {
    id: "basic-core",
    category: "basic",
    label: "Basic Fragment",
    buyPrice: 10,
    sellPrice: 3,
    unlockKills: 0,
  },
  ...ELITE_FRAGMENT_KINDS.map((kind) => {
    const strength = BASE_STRENGTH[kind];
    return {
      id: `elite-${kind}` as const,
      category: "elite" as const,
      label: `${kind.toUpperCase()} Elite Fragment`,
      enemyKind: kind,
      buyPrice: strength * 3,
      sellPrice: strength,
      unlockKills: 30,
    };
  }),
  ...BOSS_FRAGMENT_KINDS.map((kind) => {
    const strength = BASE_STRENGTH[kind];
    return {
      id: `boss-${kind}` as const,
      category: "boss" as const,
      label: `${kind.toUpperCase()} Boss Fragment`,
      enemyKind: kind,
      buyPrice: strength * 3,
      sellPrice: strength,
      unlockKills: 10,
    };
  }),
];

export const FRAGMENT_META_BY_ID: Record<FragmentId, FragmentMeta> = FRAGMENT_META.reduce(
  (acc, meta) => {
    acc[meta.id] = meta;
    return acc;
  },
  {} as Record<FragmentId, FragmentMeta>,
);

export function emptyFragmentDetailRecord(): FragmentDetailRecord {
  const out = {} as FragmentDetailRecord;
  for (const meta of FRAGMENT_META) out[meta.id] = 0;
  return out;
}

export function bossKindForStage(stageIndex: number): BossFragmentKind {
  switch (stageIndex) {
    case 0:
      return "orthogon";
    case 1:
      return "jets";
    case 2:
      return "mirror";
    case 3:
      return "lattice";
    case 4:
      return "rift";
    case 5:
      return "nexus";
    default:
      return "boss";
  }
}

export function fragmentCategory(id: FragmentId): FragmentCategory {
  if (id === "basic-core") return "basic";
  return id.startsWith("elite-") ? "elite" : "boss";
}

export interface FragmentOverflowResult {
  accepted: number;
  overflow: number;
  overflowPoints: number;
}

/**
 * Apply fragment gain with a hard cap per fragment material.
 * Mutates `detailed` in place for the provided `id`.
 * - `detailed`: player-owned per-fragment inventory record.
 * - `id`: fragment material identifier to receive.
 * - `amount`: incoming fragment count (floored to integer, negative treated as 0).
 * Returns accepted amount, overflow count, and overflow points converted by that
 * fragment material's sell price.
 */
export function applyFragmentGainWithCap(
  detailed: FragmentDetailRecord,
  id: FragmentId,
  amount: number,
): FragmentOverflowResult {
  const safeAmount = Math.max(0, Math.floor(amount));
  if (safeAmount === 0) {
    return { accepted: 0, overflow: 0, overflowPoints: 0 };
  }
  const current = Math.max(0, detailed[id] ?? 0);
  const remaining = Math.max(0, FRAGMENT_MATERIAL_CAP - current);
  const accepted = Math.min(safeAmount, remaining);
  const overflow = safeAmount - accepted;
  detailed[id] = current + accepted;
  const overflowPoints = overflow * FRAGMENT_META_BY_ID[id].sellPrice;
  return { accepted, overflow, overflowPoints };
}
