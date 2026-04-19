import type { EnemyKind } from "./world";

// Wave spec: each wave has a timeline of spawn groups. Each group fires at
// `t` seconds after wave start. Wave ends when all groups are fired AND no
// enemies remain alive. Boss waves simply schedule one boss.

export interface SpawnGroup { t: number; kind: EnemyKind; count: number }
export interface WaveSpec {
  index: number;       // 1-based, for display
  durationHint: number; // informational; real end is "all spawned + dead"
  groups: SpawnGroup[];
}

export const WAVES: readonly WaveSpec[] = [
  {
    index: 1,
    durationHint: 20,
    groups: [
      { t: 0.5, kind: "circle", count: 3 },
      { t: 6,   kind: "circle", count: 4 },
      { t: 12,  kind: "circle", count: 5 },
    ],
  },
  {
    index: 2,
    durationHint: 22,
    groups: [
      { t: 0.5, kind: "circle", count: 5 },
      { t: 7,   kind: "circle", count: 6 },
      { t: 14,  kind: "square", count: 2 },
    ],
  },
  {
    index: 3,
    durationHint: 24,
    groups: [
      { t: 0.5, kind: "circle", count: 4 },
      { t: 5,   kind: "square", count: 3 },
      { t: 12,  kind: "circle", count: 6 },
      { t: 18,  kind: "square", count: 3 },
    ],
  },
  {
    index: 4,
    durationHint: 26,
    groups: [
      { t: 0.5, kind: "square", count: 4 },
      { t: 7,   kind: "circle", count: 6 },
      { t: 14,  kind: "square", count: 4 },
      { t: 20,  kind: "circle", count: 5 },
    ],
  },
  {
    index: 5,
    durationHint: 28,
    groups: [
      { t: 0.5, kind: "circle", count: 6 },
      { t: 6,   kind: "star",   count: 1 },
      { t: 14,  kind: "square", count: 5 },
      { t: 22,  kind: "star",   count: 2 },
    ],
  },
  {
    index: 6,
    durationHint: 32,
    groups: [
      { t: 0.5, kind: "square", count: 5 },
      { t: 6,   kind: "circle", count: 8 },
      { t: 14,  kind: "star",   count: 3 },
      { t: 22,  kind: "square", count: 6 },
    ],
  },
  {
    index: 7,
    durationHint: 36,
    groups: [
      { t: 0.5, kind: "star",   count: 2 },
      { t: 5,   kind: "circle", count: 8 },
      { t: 12,  kind: "square", count: 6 },
      { t: 20,  kind: "star",   count: 4 },
      { t: 28,  kind: "circle", count: 8 },
    ],
  },
  {
    index: 8,
    durationHint: 60,
    groups: [
      { t: 0.5, kind: "boss",   count: 1 },
    ],
  },
];

export const TOTAL_WAVES = WAVES.length;
