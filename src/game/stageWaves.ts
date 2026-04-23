// ── Multi-stage wave definitions ────────────────────────────────────────────
// Stage 1: 6 waves. Stage 2: 7 waves. Stage 3: 8 waves.
// Stages 4 & 5 introduce new enemy types (spiral/lance/prism/octo/shade).
// - Stage 4: 10 waves (domain GRID, boss Lattice)
// - Stage 5: 12 waves (domain VOID, boss Rift)

import type { WaveSpec } from "./waves";

export type { WaveSpec };

// Stage 1 — "White Grid" (6-wave run)
const STAGE_1: readonly WaveSpec[] = [
  { index: 1, durationHint: 20, groups: [
    { t: 0.5, kind: "circle", count: 3 },
    { t: 6, kind: "circle", count: 4 },
    { t: 12, kind: "circle", count: 5 },
  ] },
  { index: 2, durationHint: 22, groups: [
    { t: 0.5, kind: "circle", count: 5 },
    { t: 7, kind: "circle", count: 6 },
    { t: 14, kind: "square", count: 2 },
  ] },
  { index: 3, durationHint: 24, groups: [
    { t: 0.5, kind: "circle", count: 4 },
    { t: 5, kind: "square", count: 3 },
    { t: 12, kind: "circle", count: 6 },
    { t: 18, kind: "square", count: 3 },
  ] },
  { index: 4, durationHint: 26, groups: [
    { t: 0.5, kind: "square", count: 3 },
    { t: 0.5, kind: "circle", count: 3 },
    { t: 7, kind: "circle", count: 4 },
    { t: 7, kind: "square", count: 2 },
    { t: 14, kind: "square", count: 4 },
    { t: 20, kind: "circle", count: 5 },
  ] },
  { index: 5, durationHint: 28, groups: [
    { t: 0.5, kind: "circle", count: 4 },
    { t: 0.5, kind: "square", count: 2 },
    { t: 6, kind: "star", count: 1 },
    { t: 14, kind: "square", count: 3 },
    { t: 14, kind: "circle", count: 3 },
    { t: 22, kind: "star", count: 2 },
  ] },
  { index: 6, durationHint: 60, groups: [
    { t: 0.5, kind: "boss", count: 1 },
  ] },
];

// Stage 2 — "Deep Blue" (adds pentagon & diamond, 7-wave run)
const STAGE_2: readonly WaveSpec[] = [
  { index: 1, durationHint: 20, groups: [
    { t: 0.5, kind: "circle", count: 4 },
    { t: 6, kind: "square", count: 3 },
    { t: 12, kind: "circle", count: 5 },
  ] },
  { index: 2, durationHint: 22, groups: [
    { t: 0.5, kind: "square", count: 4 },
    { t: 7, kind: "pentagon", count: 2 },
    { t: 14, kind: "circle", count: 6 },
  ] },
  { index: 3, durationHint: 24, groups: [
    { t: 0.5, kind: "pentagon", count: 2 },
    { t: 5, kind: "diamond", count: 2 },
    { t: 12, kind: "square", count: 5 },
    { t: 18, kind: "circle", count: 6 },
  ] },
  { index: 4, durationHint: 26, groups: [
    { t: 0.5, kind: "diamond", count: 2 },
    { t: 0.5, kind: "pentagon", count: 2 },
    { t: 7, kind: "star", count: 2 },
    { t: 7, kind: "circle", count: 3 },
    { t: 14, kind: "pentagon", count: 3 },
    { t: 20, kind: "square", count: 3 },
    { t: 20, kind: "diamond", count: 2 },
  ] },
  { index: 5, durationHint: 28, groups: [
    { t: 0.5, kind: "star", count: 2 },
    { t: 6, kind: "hexagon", count: 1 },
    { t: 6, kind: "pentagon", count: 2 },
    { t: 14, kind: "diamond", count: 2 },
    { t: 14, kind: "circle", count: 3 },
    { t: 22, kind: "pentagon", count: 3 },
  ] },
  { index: 6, durationHint: 32, groups: [
    { t: 0.5, kind: "hexagon", count: 2 },
    { t: 0.5, kind: "diamond", count: 2 },
    { t: 6, kind: "star", count: 2 },
    { t: 6, kind: "pentagon", count: 2 },
    { t: 14, kind: "diamond", count: 3 },
    { t: 14, kind: "circle", count: 3 },
    { t: 22, kind: "pentagon", count: 3 },
  ] },
  { index: 7, durationHint: 60, groups: [
    { t: 0.5, kind: "boss", count: 1 },
  ] },
];

// Stage 3 — "Dark Core" (adds cross & crescent, 8-wave run; regular enemy strength ×2.0)
const STAGE_3: readonly WaveSpec[] = [
  { index: 1, durationHint: 20, groups: [
    { t: 0.5, kind: "square", count: 4 },
    { t: 6, kind: "diamond", count: 3 },
    { t: 12, kind: "circle", count: 6 },
  ] },
  { index: 2, durationHint: 22, groups: [
    { t: 0.5, kind: "pentagon", count: 3 },
    { t: 7, kind: "cross", count: 1 },
    { t: 14, kind: "diamond", count: 3 },
  ] },
  { index: 3, durationHint: 24, groups: [
    { t: 0.5, kind: "cross", count: 2 },
    { t: 5, kind: "crescent", count: 2 },
    { t: 12, kind: "hexagon", count: 2 },
    { t: 18, kind: "star", count: 3 },
  ] },
  { index: 4, durationHint: 26, groups: [
    { t: 0.5, kind: "crescent", count: 2 },
    { t: 0.5, kind: "cross", count: 2 },
    { t: 7, kind: "diamond", count: 2 },
    { t: 7, kind: "pentagon", count: 2 },
    { t: 14, kind: "hexagon", count: 2 },
    { t: 20, kind: "star", count: 2 },
    { t: 20, kind: "crescent", count: 2 },
  ] },
  { index: 5, durationHint: 28, groups: [
    { t: 0.5, kind: "hexagon", count: 2 },
    { t: 0.5, kind: "cross", count: 2 },
    { t: 6, kind: "crescent", count: 2 },
    { t: 6, kind: "diamond", count: 2 },
    { t: 14, kind: "cross", count: 2 },
    { t: 14, kind: "pentagon", count: 2 },
    { t: 22, kind: "star", count: 3 },
  ] },
  { index: 6, durationHint: 32, groups: [
    { t: 0.5, kind: "cross", count: 2 },
    { t: 0.5, kind: "crescent", count: 2 },
    { t: 6, kind: "pentagon", count: 3 },
    { t: 6, kind: "diamond", count: 2 },
    { t: 14, kind: "crescent", count: 3 },
    { t: 14, kind: "hexagon", count: 2 },
    { t: 22, kind: "diamond", count: 3 },
    { t: 22, kind: "star", count: 2 },
  ] },
  { index: 7, durationHint: 36, groups: [
    { t: 0.5, kind: "crescent", count: 2 },
    { t: 0.5, kind: "cross", count: 2 },
    { t: 5, kind: "hexagon", count: 2 },
    { t: 5, kind: "diamond", count: 2 },
    { t: 12, kind: "star", count: 3 },
    { t: 12, kind: "pentagon", count: 3 },
    { t: 20, kind: "crescent", count: 3 },
    { t: 20, kind: "cross", count: 2 },
    { t: 28, kind: "diamond", count: 4 },
  ] },
  { index: 8, durationHint: 60, groups: [
    { t: 0.5, kind: "boss", count: 1 },
  ] },
];

// Stage 4 — "Grid Lock" (introduces spiral, lance, prism; 10-wave run)
const STAGE_4: readonly WaveSpec[] = [
  { index: 1, durationHint: 20, groups: [
    { t: 0.5, kind: "spiral", count: 3 },
    { t: 6, kind: "circle", count: 3 },
    { t: 12, kind: "spiral", count: 2 },
  ] },
  { index: 2, durationHint: 22, groups: [
    { t: 0.5, kind: "spiral", count: 3 },
    { t: 7, kind: "lance", count: 2 },
    { t: 14, kind: "circle", count: 4 },
  ] },
  { index: 3, durationHint: 24, groups: [
    { t: 0.5, kind: "lance", count: 3 },
    { t: 5, kind: "pentagon", count: 2 },
    { t: 12, kind: "spiral", count: 2 },
    { t: 18, kind: "square", count: 4 },
  ] },
  { index: 4, durationHint: 26, groups: [
    { t: 0.5, kind: "prism", count: 1 },
    { t: 0.5, kind: "lance", count: 2 },
    { t: 7, kind: "spiral", count: 3 },
    { t: 7, kind: "pentagon", count: 2 },
    { t: 14, kind: "lance", count: 2 },
    { t: 20, kind: "circle", count: 4 },
  ] },
  { index: 5, durationHint: 28, groups: [
    { t: 0.5, kind: "prism", count: 2 },
    { t: 6, kind: "hexagon", count: 2 },
    { t: 6, kind: "lance", count: 2 },
    { t: 14, kind: "spiral", count: 3 },
    { t: 14, kind: "pentagon", count: 2 },
    { t: 22, kind: "prism", count: 1 },
  ] },
  { index: 6, durationHint: 32, groups: [
    { t: 0.5, kind: "spiral", count: 3 },
    { t: 0.5, kind: "lance", count: 3 },
    { t: 6, kind: "prism", count: 2 },
    { t: 6, kind: "pentagon", count: 2 },
    { t: 14, kind: "hexagon", count: 2 },
    { t: 14, kind: "spiral", count: 2 },
    { t: 22, kind: "lance", count: 3 },
  ] },
  { index: 7, durationHint: 36, groups: [
    { t: 0.5, kind: "prism", count: 3 },
    { t: 5, kind: "hexagon", count: 2 },
    { t: 5, kind: "lance", count: 2 },
    { t: 12, kind: "spiral", count: 3 },
    { t: 12, kind: "pentagon", count: 3 },
    { t: 20, kind: "prism", count: 2 },
    { t: 20, kind: "lance", count: 2 },
    { t: 28, kind: "spiral", count: 3 },
  ] },
  { index: 8, durationHint: 38, groups: [
    { t: 0.5, kind: "prism", count: 3 },
    { t: 0.5, kind: "spiral", count: 4 },
    { t: 6, kind: "hexagon", count: 2 },
    { t: 6, kind: "lance", count: 3 },
    { t: 14, kind: "prism", count: 2 },
    { t: 14, kind: "pentagon", count: 3 },
    { t: 22, kind: "spiral", count: 3 },
    { t: 28, kind: "lance", count: 3 },
  ] },
  { index: 9, durationHint: 42, groups: [
    { t: 0.5, kind: "prism", count: 3 },
    { t: 0.5, kind: "spiral", count: 4 },
    { t: 6, kind: "hexagon", count: 3 },
    { t: 6, kind: "lance", count: 3 },
    { t: 14, kind: "prism", count: 3 },
    { t: 14, kind: "pentagon", count: 3 },
    { t: 22, kind: "spiral", count: 4 },
    { t: 22, kind: "lance", count: 2 },
    { t: 30, kind: "hexagon", count: 2 },
  ] },
  { index: 10, durationHint: 60, groups: [
    { t: 0.5, kind: "boss", count: 1 },
  ] },
];

// Stage 5 — "Void Core" (introduces octo & shade; hardest, 12-wave run)
const STAGE_5: readonly WaveSpec[] = [
  { index: 1, durationHint: 20, groups: [
    { t: 0.5, kind: "octo", count: 1 },
    { t: 6, kind: "spiral", count: 2 },
    { t: 12, kind: "prism", count: 2 },
  ] },
  { index: 2, durationHint: 22, groups: [
    { t: 0.5, kind: "shade", count: 2 },
    { t: 7, kind: "cross", count: 2 },
    { t: 14, kind: "crescent", count: 2 },
  ] },
  { index: 3, durationHint: 24, groups: [
    { t: 0.5, kind: "octo", count: 2 },
    { t: 5, kind: "shade", count: 2 },
    { t: 12, kind: "prism", count: 3 },
    { t: 18, kind: "spiral", count: 2 },
  ] },
  { index: 4, durationHint: 26, groups: [
    { t: 0.5, kind: "octo", count: 2 },
    { t: 0.5, kind: "cross", count: 2 },
    { t: 7, kind: "shade", count: 2 },
    { t: 7, kind: "crescent", count: 3 },
    { t: 14, kind: "prism", count: 2 },
    { t: 20, kind: "octo", count: 1 },
  ] },
  { index: 5, durationHint: 28, groups: [
    { t: 0.5, kind: "prism", count: 3 },
    { t: 6, kind: "shade", count: 3 },
    { t: 6, kind: "octo", count: 2 },
    { t: 14, kind: "cross", count: 2 },
    { t: 14, kind: "crescent", count: 2 },
    { t: 22, kind: "shade", count: 2 },
  ] },
  { index: 6, durationHint: 32, groups: [
    { t: 0.5, kind: "octo", count: 3 },
    { t: 0.5, kind: "shade", count: 3 },
    { t: 6, kind: "cross", count: 3 },
    { t: 6, kind: "crescent", count: 3 },
    { t: 14, kind: "prism", count: 2 },
    { t: 14, kind: "octo", count: 2 },
    { t: 22, kind: "shade", count: 3 },
  ] },
  { index: 7, durationHint: 36, groups: [
    { t: 0.5, kind: "shade", count: 3 },
    { t: 0.5, kind: "cross", count: 3 },
    { t: 5, kind: "octo", count: 2 },
    { t: 5, kind: "prism", count: 3 },
    { t: 12, kind: "crescent", count: 2 },
    { t: 12, kind: "shade", count: 3 },
    { t: 20, kind: "octo", count: 2 },
    { t: 20, kind: "cross", count: 2 },
    { t: 28, kind: "prism", count: 3 },
  ] },
  { index: 8, durationHint: 38, groups: [
    { t: 0.5, kind: "octo", count: 3 },
    { t: 0.5, kind: "shade", count: 4 },
    { t: 6, kind: "cross", count: 3 },
    { t: 6, kind: "prism", count: 3 },
    { t: 14, kind: "crescent", count: 3 },
    { t: 14, kind: "octo", count: 2 },
    { t: 22, kind: "shade", count: 3 },
    { t: 22, kind: "cross", count: 3 },
    { t: 30, kind: "prism", count: 2 },
  ] },
  { index: 9, durationHint: 40, groups: [
    { t: 0.5, kind: "shade", count: 4 },
    { t: 0.5, kind: "cross", count: 4 },
    { t: 6, kind: "octo", count: 3 },
    { t: 6, kind: "prism", count: 3 },
    { t: 14, kind: "crescent", count: 3 },
    { t: 14, kind: "spiral", count: 2 },
    { t: 22, kind: "shade", count: 3 },
    { t: 22, kind: "octo", count: 2 },
    { t: 30, kind: "cross", count: 3 },
  ] },
  { index: 10, durationHint: 42, groups: [
    { t: 0.5, kind: "octo", count: 4 },
    { t: 0.5, kind: "shade", count: 4 },
    { t: 6, kind: "cross", count: 3 },
    { t: 6, kind: "crescent", count: 4 },
    { t: 14, kind: "prism", count: 3 },
    { t: 14, kind: "shade", count: 3 },
    { t: 22, kind: "octo", count: 3 },
    { t: 22, kind: "cross", count: 3 },
    { t: 30, kind: "prism", count: 3 },
  ] },
  { index: 11, durationHint: 44, groups: [
    { t: 0.5, kind: "shade", count: 5 },
    { t: 0.5, kind: "cross", count: 4 },
    { t: 6, kind: "octo", count: 4 },
    { t: 6, kind: "prism", count: 4 },
    { t: 14, kind: "crescent", count: 4 },
    { t: 14, kind: "shade", count: 4 },
    { t: 22, kind: "octo", count: 3 },
    { t: 22, kind: "cross", count: 3 },
    { t: 30, kind: "prism", count: 4 },
  ] },
  { index: 12, durationHint: 60, groups: [
    { t: 0.5, kind: "boss", count: 1 },
  ] },
];

export const STAGE_WAVES: readonly (readonly WaveSpec[])[] = [
  STAGE_1, STAGE_2, STAGE_3, STAGE_4, STAGE_5,
];

/** Number of stages available in normal mode. */
export const STAGE_COUNT = STAGE_WAVES.length;
