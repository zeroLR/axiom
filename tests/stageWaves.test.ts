import { describe, expect, it } from "vitest";
import { STAGE_WAVES } from "../src/game/stageWaves";

describe("stage waves", () => {
  it("uses configured wave counts per stage", () => {
    expect(STAGE_WAVES[0]).toHaveLength(6);
    expect(STAGE_WAVES[1]).toHaveLength(7);
    expect(STAGE_WAVES[2]).toHaveLength(8);
    expect(STAGE_WAVES[3]).toHaveLength(10);
    expect(STAGE_WAVES[4]).toHaveLength(12);
  });

  it("keeps wave indices monotonic in each stage", () => {
    for (const stage of STAGE_WAVES) {
      stage.forEach((wave, i) => expect(wave.index).toBe(i + 1));
    }
  });

  it("spawns boss only in the final wave of each stage", () => {
    for (const stage of STAGE_WAVES) {
      stage.forEach((wave, i) => {
        const hasBoss = wave.groups.some((g) => g.kind === "boss");
        if (i === stage.length - 1) expect(hasBoss).toBe(true);
        else expect(hasBoss).toBe(false);
      });
    }
  });
});
