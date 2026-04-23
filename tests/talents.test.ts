import { describe, expect, it } from "vitest";
import { TALENT_NODES } from "../src/game/content/talents";
import { defaultPlayerProfile, defaultTalentState } from "../src/game/data/types";
import {
  TALENT_RESET_COST,
  canUpgradeTalent,
  resetTalentGrowth,
  talentBonuses,
  talentTotalSpentPoints,
  upgradeTalent,
} from "../src/game/talents";

describe("talent growth", () => {
  it("default talent state starts at level 0 for all nodes", () => {
    const state = defaultTalentState();
    for (const id of Object.keys(TALENT_NODES)) {
      expect(state.levels[id as keyof typeof state.levels]).toBe(0);
    }
  });

  it("upgrading a talent consumes points and fragments", () => {
    const profile = defaultPlayerProfile();
    profile.points = 9999;
    profile.fragments.basic = 9999;
    const beforePoints = profile.points;
    const beforeBasic = profile.fragments.basic;
    const cost = TALENT_NODES.survivalVitality.levels[0]!;

    const result = upgradeTalent(profile, "survivalVitality");

    expect(result.ok).toBe(true);
    expect(profile.talents.levels.survivalVitality).toBe(1);
    expect(profile.points).toBe(beforePoints - cost.pointCost);
    expect(profile.fragments.basic).toBe(beforeBasic - cost.fragmentCost);
  });

  it("blocks upgrade when prerequisite level is not met", () => {
    const profile = defaultPlayerProfile();
    profile.points = 9999;
    profile.fragments.elite = 9999;

    const can = canUpgradeTalent(profile, profile.talents, "survivalPhase");

    expect(can.ok).toBe(false);
    expect(can.reason).toContain("Requires");
  });

  it("aggregates bonuses from invested levels", () => {
    const profile = defaultPlayerProfile();
    profile.points = 9999;
    profile.fragments.basic = 9999;
    profile.fragments.elite = 9999;
    upgradeTalent(profile, "survivalVitality");
    upgradeTalent(profile, "survivalVitality");
    upgradeTalent(profile, "offenseVector");
    upgradeTalent(profile, "efficiencyPoints");

    const bonuses = talentBonuses(profile.talents);

    expect(bonuses.maxHpAdd).toBe(4);
    expect(bonuses.damageAdd).toBe(1);
    expect(bonuses.pointRewardMul).toBeCloseTo(0.04);
  });

  it("reset spends materials and refunds spent points", () => {
    const profile = defaultPlayerProfile();
    profile.points = 9999;
    profile.fragments.basic = 9999;
    profile.fragments.elite = 9999;
    upgradeTalent(profile, "survivalVitality");
    upgradeTalent(profile, "offenseVector");
    const spent = talentTotalSpentPoints(profile.talents);
    const pointsAfterUpgrade = profile.points;
    const basicAfterUpgrade = profile.fragments.basic;
    const eliteAfterUpgrade = profile.fragments.elite;

    const result = resetTalentGrowth(profile);

    expect(result.ok).toBe(true);
    expect(profile.points).toBe(pointsAfterUpgrade + spent);
    expect(profile.fragments.basic).toBe(basicAfterUpgrade - TALENT_RESET_COST.basic);
    expect(profile.fragments.elite).toBe(eliteAfterUpgrade - TALENT_RESET_COST.elite);
    expect(profile.talents.levels.survivalVitality).toBe(0);
    expect(profile.talents.levels.offenseVector).toBe(0);
  });
});
