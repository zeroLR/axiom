// ── Survival mode infinite wave generator ───────────────────────────────────
// Dynamically creates WaveSpecs that grow in difficulty without end.
// • Every 8 waves → a normal boss
// • Every 16 waves → a mirror boss (flagged so PlayScene can apply mirror scaling)
// • Enemy HP / speed / density scale up per wave via multipliers.

import type { EnemyKind } from "./world";
import type { SpawnGroup, WaveSpec } from "./waves";
import type { Rng } from "./rng";

/** Extended enemy pool for survival waves (all types). */
const BASE_KINDS: EnemyKind[] = ["circle", "square", "star", "pentagon", "diamond", "hexagon", "cross", "crescent"];

/** Is this wave index (1-based) a boss wave? */
export function isBossWave(wave1: number): boolean {
  return wave1 > 0 && wave1 % 8 === 0;
}

/** Is this wave index (1-based) a mirror-boss wave? */
export function isMirrorBossWave(wave1: number): boolean {
  return wave1 > 0 && wave1 % 16 === 0;
}

/** Generate a WaveSpec for the given 1-based wave number. */
export function survivalWaveSpec(wave1: number, rng: Rng): WaveSpec {
  if (isBossWave(wave1)) {
    return {
      index: wave1,
      durationHint: 60,
      groups: [{ t: 0.5, kind: "boss", count: 1 }],
    };
  }

  // Difficulty ramp: more enemy groups, higher counts, over time.
  const tier = Math.floor((wave1 - 1) / 4);  // 0, 0, 0, 0, 1, 1, 1, ...
  const baseGroupCount = 3 + Math.min(tier, 5);
  const baseEnemyCount = 3 + tier;

  const groups: SpawnGroup[] = [];
  let t = 0.5;

  // Unlock more kinds as waves progress.
  const availableKinds = BASE_KINDS.slice(0, Math.min(2 + tier, BASE_KINDS.length));

  for (let g = 0; g < baseGroupCount; g++) {
    const kind = availableKinds[Math.floor(rng() * availableKinds.length)]!;
    const count = Math.max(1, Math.round(baseEnemyCount * (0.6 + rng() * 0.8)));
    groups.push({ t, kind, count });
    t += 4 + Math.floor(rng() * 4);
  }

  return {
    index: wave1,
    durationHint: Math.ceil(t + 10),
    groups,
  };
}

/** HP multiplier for survival enemies at this wave. */
export function survivalHpScale(wave1: number): number {
  return 1 + (wave1 - 1) * 0.08;
}

/** Speed multiplier for survival enemies at this wave. */
export function survivalSpeedScale(wave1: number): number {
  return 1 + (wave1 - 1) * 0.02;
}
