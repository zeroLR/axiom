import { describe, it, expect } from "vitest";
import {
  ACTS,
  actForStageId,
  actStageIds,
  getActDef,
} from "../src/game/content/acts";
import { STAGE_CONFIGS } from "../src/game/content/stages";
import { migrateClearedStages } from "../src/game/storage";

describe("ACTS registry", () => {
  it("registers three acts: form, decay, collapse", () => {
    expect(ACTS.map((a) => a.id)).toEqual(["form", "decay", "collapse"]);
  });

  it("FORM groups stages 1–3 with stage3 as the gate", () => {
    const form = getActDef("form");
    expect(form.trialStageIds).toEqual(["stage1", "stage2"]);
    expect(form.gateStageId).toBe("stage3");
    expect(form.unlockAfterAct).toBeUndefined();
  });

  it("DECAY groups stages 4–5 with stage6 as the gate, gated behind FORM", () => {
    const decay = getActDef("decay");
    expect(decay.trialStageIds).toEqual(["stage4", "stage5"]);
    expect(decay.gateStageId).toBe("stage6");
    expect(decay.unlockAfterAct).toBe("form");
  });

  it("every existing stage is reachable through ACTS", () => {
    for (const cfg of STAGE_CONFIGS) {
      const act = actForStageId(cfg.stageId);
      expect(act).not.toBeNull();
      expect(actStageIds(act!)).toContain(cfg.stageId);
    }
  });

  it("StageConfig.actId matches Act membership", () => {
    for (const cfg of STAGE_CONFIGS) {
      const act = actForStageId(cfg.stageId);
      expect(cfg.actId).toBe(act?.id);
    }
  });
});

describe("storage migration: legacy normalCleared[] → clearedStages map", () => {
  it("projects positional flags onto stageIds in registry order", () => {
    const map = migrateClearedStages(undefined, [true, false, true, false, true]);
    expect(map).toEqual({
      stage1: true,
      stage3: true,
      stage5: true,
    });
  });

  it("returns an empty object for a fresh profile", () => {
    expect(migrateClearedStages(undefined, undefined)).toEqual({});
    expect(migrateClearedStages(undefined, [])).toEqual({});
  });

  it("preserves an existing clearedStages map and ignores false entries", () => {
    const map = migrateClearedStages(
      { stage1: true, stage4: false, stage5: true },
      undefined,
    );
    expect(map).toEqual({ stage1: true, stage5: true });
  });

  it("merges legacy + map, with legacy filling missing stageIds", () => {
    const map = migrateClearedStages(
      { stage5: true },
      [true, false, false, false, false],
    );
    expect(map.stage1).toBe(true);
    expect(map.stage5).toBe(true);
    expect(map.stage2).toBeUndefined();
  });

  it("drops unknown stageIds quietly (forward-compat: removed stage)", () => {
    const map = migrateClearedStages(
      { stage1: true, "ghost-removed": true },
      undefined,
    );
    expect(map.stage1).toBe(true);
    expect((map as Record<string, boolean>)["ghost-removed"]).toBeUndefined();
  });
});
