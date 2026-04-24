import { describe, expect, it } from "vitest";
import { TALENT_NODES } from "../src/game/content/talents";
import { defaultPlayerProfile, defaultSkillTreeState, defaultTalentState } from "../src/game/data/types";
import {
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

  it("reset is free and refunds spent points", () => {
    const profile = defaultPlayerProfile();
    profile.points = 9999;
    profile.fragments.basic = 9999;
    profile.fragments.elite = 9999;
    upgradeTalent(profile, "survivalVitality");
    upgradeTalent(profile, "offenseVector");
    const spent = talentTotalSpentPoints(profile.talents);
    const pointsAfterUpgrade = profile.points;

    const result = resetTalentGrowth(profile);

    expect(result.ok).toBe(true);
    expect(profile.points).toBe(pointsAfterUpgrade + spent);
    expect(profile.talents.levels.survivalVitality).toBe(0);
    expect(profile.talents.levels.offenseVector).toBe(0);
  });

  it("talent tree has exactly 72 nodes (24 per branch)", () => {
    const ids = Object.keys(TALENT_NODES);
    expect(ids).toHaveLength(72);
    const survival = ids.filter((id) => TALENT_NODES[id as keyof typeof TALENT_NODES].branch === "survival");
    const offense = ids.filter((id) => TALENT_NODES[id as keyof typeof TALENT_NODES].branch === "offense");
    const efficiency = ids.filter((id) => TALENT_NODES[id as keyof typeof TALENT_NODES].branch === "efficiency");
    expect(survival).toHaveLength(24);
    expect(offense).toHaveLength(24);
    expect(efficiency).toHaveLength(24);
  });

  it("each branch has exactly 6 core nodes", () => {
    for (const branch of ["survival", "offense", "efficiency"] as const) {
      const cores = Object.values(TALENT_NODES).filter(
        (n) => n.branch === branch && n.isCore,
      );
      expect(cores).toHaveLength(6);
    }
  });

  it("efficiency branch has 6 skillPointsAdd core nodes", () => {
    const skillPtNodes = Object.values(TALENT_NODES).filter(
      (n) => n.effectKind === "skillPointsAdd",
    );
    expect(skillPtNodes).toHaveLength(6);
    for (const n of skillPtNodes) {
      expect(n.branch).toBe("efficiency");
      expect(n.isCore).toBe(true);
    }
  });

  it("upgrading a skill point node grants skill points to skillTree", () => {
    const profile = defaultPlayerProfile();
    profile.points = 9999;
    profile.fragments.basic = 9999;
    profile.fragments.elite = 9999;
    const skillTree = defaultSkillTreeState();

    // Unlock prerequisite (efficiencyPoints Lv2)
    upgradeTalent(profile, "efficiencyPoints", skillTree);
    upgradeTalent(profile, "efficiencyPoints", skillTree);

    const before = skillTree.skillPoints;
    const result = upgradeTalent(profile, "efficiencySkillPt1", skillTree);

    expect(result.ok).toBe(true);
    expect(result.skillPointsGranted).toBe(20);
    expect(skillTree.skillPoints).toBe(before + 20);
  });

  it("all 6 skill point nodes together grant 120 points", () => {
    const profile = defaultPlayerProfile();
    profile.points = 99999;
    profile.fragments.basic = 9999;
    profile.fragments.elite = 9999;
    const skillTree = defaultSkillTreeState();

    // Unlock prerequisites
    for (let i = 0; i < 5; i++) upgradeTalent(profile, "efficiencyPoints", skillTree);
    upgradeTalent(profile, "efficiencySkillPt1", skillTree);
    upgradeTalent(profile, "efficiencySkillPt2", skillTree);
    upgradeTalent(profile, "efficiencySkillPt3", skillTree);
    upgradeTalent(profile, "efficiencySkillPt4", skillTree);
    upgradeTalent(profile, "efficiencySkillPt5", skillTree);
    upgradeTalent(profile, "efficiencySkillPt6", skillTree);

    expect(skillTree.skillPoints).toBe(120);
  });

  it("offense core nodes include projectilesAdd and pierceAdd", () => {
    expect(TALENT_NODES.offenseCoreProjectiles.effectKind).toBe("projectilesAdd");
    expect(TALENT_NODES.offenseCoreProjectiles.isCore).toBe(true);
    expect(TALENT_NODES.offenseCorePierce.effectKind).toBe("pierceAdd");
    expect(TALENT_NODES.offenseCorePierce.isCore).toBe(true);
  });

  it("survival core nodes include speedMul and pickupRadiusMul", () => {
    expect(TALENT_NODES.survivalCoreSpeed.effectKind).toBe("speedMul");
    expect(TALENT_NODES.survivalCorePickup.effectKind).toBe("pickupRadiusMul");
  });

  it("talentBonuses accumulates multiplicative delta kinds", () => {
    const profile = defaultPlayerProfile();
    profile.points = 9999;
    profile.fragments.basic = 9999;
    upgradeTalent(profile, "survivalSpeed1");
    upgradeTalent(profile, "survivalSpeed1");
    upgradeTalent(profile, "offensePeriod1");

    const bonuses = talentBonuses(profile.talents);

    expect(bonuses.speedMul).toBeCloseTo(0.04);
    expect(bonuses.periodMul).toBeCloseTo(-0.03);
  });
});
