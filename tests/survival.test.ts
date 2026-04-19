import { describe, expect, it } from "vitest";
import { createRng } from "../src/game/rng";
import { survivalWaveSpec, isBossWave, isMirrorBossWave, survivalHpScale, survivalSpeedScale } from "../src/game/survivalWaves";

describe("survival waves", () => {
  it("generates a valid WaveSpec for any wave number", () => {
    const rng = createRng(42);
    for (let w = 1; w <= 32; w++) {
      const spec = survivalWaveSpec(w, rng);
      expect(spec.index).toBe(w);
      expect(spec.groups.length).toBeGreaterThan(0);
      for (const g of spec.groups) {
        expect(g.count).toBeGreaterThan(0);
        expect(g.t).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("boss waves have a single boss spawn", () => {
    const rng = createRng(7);
    const spec = survivalWaveSpec(8, rng);
    expect(spec.groups).toHaveLength(1);
    expect(spec.groups[0]!.kind).toBe("boss");
  });

  it("isBossWave matches multiples of 8", () => {
    expect(isBossWave(8)).toBe(true);
    expect(isBossWave(16)).toBe(true);
    expect(isBossWave(24)).toBe(true);
    expect(isBossWave(7)).toBe(false);
    expect(isBossWave(0)).toBe(false);
  });

  it("isMirrorBossWave matches multiples of 16", () => {
    expect(isMirrorBossWave(16)).toBe(true);
    expect(isMirrorBossWave(32)).toBe(true);
    expect(isMirrorBossWave(8)).toBe(false);
  });

  it("survival scaling increases over waves", () => {
    expect(survivalHpScale(1)).toBe(1);
    expect(survivalHpScale(10)).toBeGreaterThan(1);
    expect(survivalSpeedScale(10)).toBeGreaterThan(survivalSpeedScale(1));
  });
});
