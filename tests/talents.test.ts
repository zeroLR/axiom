import { describe, expect, it } from "vitest";
import { TALENT_CLUSTER_ORDER, TALENT_NODES } from "../src/game/content/talents";
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
    const cost = TALENT_NODES.survivalHpConn.levels[0]!;

    const result = upgradeTalent(profile, "survivalHpConn");

    expect(result.ok).toBe(true);
    expect(profile.talents.levels.survivalHpConn).toBe(1);
    expect(profile.points).toBe(beforePoints - cost.pointCost);
    expect(profile.fragments.basic).toBe(beforeBasic - cost.fragmentCost);
  });

  it("blocks upgrade when prerequisite level is not met", () => {
    const profile = defaultPlayerProfile();
    profile.points = 9999;
    profile.fragments.basic = 9999;

    const can = canUpgradeTalent(profile, profile.talents, "survivalHpV0");

    expect(can.ok).toBe(false);
    expect(can.reason).toContain("Requires");
  });

  it("aggregates bonuses from invested levels", () => {
    const profile = defaultPlayerProfile();
    profile.points = 9999;
    profile.fragments.basic = 9999;
    profile.fragments.elite = 9999;
    upgradeTalent(profile, "survivalHpConn");
    upgradeTalent(profile, "offenseDamageConn");
    upgradeTalent(profile, "efficiencyPointsConn");

    const bonuses = talentBonuses(profile.talents);

    expect(bonuses.maxHpAdd).toBeGreaterThan(0);
    expect(bonuses.damageAdd).toBeGreaterThan(0);
    expect(bonuses.pointRewardMul).toBeCloseTo(0.03);
  });

  it("reset is free and refunds spent points", () => {
    const profile = defaultPlayerProfile();
    profile.points = 9999;
    profile.fragments.basic = 9999;
    upgradeTalent(profile, "survivalHpConn");
    upgradeTalent(profile, "offenseDamageConn");
    const spent = talentTotalSpentPoints(profile.talents);
    const pointsAfterUpgrade = profile.points;

    const result = resetTalentGrowth(profile);

    expect(result.ok).toBe(true);
    expect(profile.points).toBe(pointsAfterUpgrade + spent);
    expect(profile.talents.levels.survivalHpConn).toBe(0);
    expect(profile.talents.levels.offenseDamageConn).toBe(0);
  });

  it("hex talent tree has exactly 48 nodes (6 clusters × 8)", () => {
    const ids = Object.keys(TALENT_NODES);
    expect(ids).toHaveLength(48);
    for (const cluster of TALENT_CLUSTER_ORDER) {
      const inCluster = ids.filter(
        (id) => TALENT_NODES[id as keyof typeof TALENT_NODES].cluster === cluster.id,
      );
      expect(inCluster).toHaveLength(8);
    }
  });

  it("each cluster has exactly 1 connector, 6 vertices, 1 core", () => {
    for (const cluster of TALENT_CLUSTER_ORDER) {
      const nodes = Object.values(TALENT_NODES).filter((n) => n.cluster === cluster.id);
      expect(nodes.filter((n) => n.role === "connector")).toHaveLength(1);
      expect(nodes.filter((n) => n.role === "vertex")).toHaveLength(6);
      expect(nodes.filter((n) => n.role === "core")).toHaveLength(1);
    }
  });

  it("each branch has exactly 2 clusters", () => {
    for (const branch of ["survival", "offense", "efficiency"] as const) {
      const clusters = new Set(
        Object.values(TALENT_NODES)
          .filter((n) => n.branch === branch)
          .map((n) => n.cluster),
      );
      expect(clusters.size).toBe(2);
    }
  });

  it("vertex slots 0..5 are all present in each cluster", () => {
    for (const cluster of TALENT_CLUSTER_ORDER) {
      const slots = Object.values(TALENT_NODES)
        .filter((n) => n.cluster === cluster.id && n.role === "vertex")
        .map((n) => n.vertexSlot)
        .sort();
      expect(slots).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });

  it("efficiencyFragments cluster grants skill points (sum 120)", () => {
    const profile = defaultPlayerProfile();
    profile.points = 99999;
    profile.fragments.basic = 9999;
    profile.fragments.elite = 9999;
    const skillTree = defaultSkillTreeState();

    upgradeTalent(profile, "efficiencyFragmentsConn", skillTree);
    upgradeTalent(profile, "efficiencyFragmentsV0", skillTree);
    upgradeTalent(profile, "efficiencyFragmentsV0", skillTree);
    upgradeTalent(profile, "efficiencyFragmentsV1", skillTree);
    upgradeTalent(profile, "efficiencyFragmentsV1", skillTree);
    upgradeTalent(profile, "efficiencyFragmentsV2", skillTree);
    upgradeTalent(profile, "efficiencyFragmentsV2", skillTree);
    upgradeTalent(profile, "efficiencyFragmentsV3", skillTree);
    upgradeTalent(profile, "efficiencyFragmentsV4", skillTree);
    upgradeTalent(profile, "efficiencyFragmentsV5", skillTree);
    upgradeTalent(profile, "efficiencyFragmentsCore", skillTree);
    upgradeTalent(profile, "efficiencyFragmentsCore", skillTree);

    // V3,V4,V5 each grant 20 (1 level × 20). Core grants 30+30 = 60. Total = 120.
    expect(skillTree.skillPoints).toBe(120);
  });

  it("each cluster's core has isCore: true", () => {
    for (const cluster of TALENT_CLUSTER_ORDER) {
      const core = Object.values(TALENT_NODES).find(
        (n) => n.cluster === cluster.id && n.role === "core",
      );
      expect(core?.isCore).toBe(true);
    }
  });

  it("offense tempo cluster includes pierce and projectiles effects", () => {
    expect(TALENT_NODES.offenseTempoV5.effectKind).toBe("pierceAdd");
    expect(TALENT_NODES.offenseTempoCore.effectKind).toBe("projectilesAdd");
  });

  it("survival mobility cluster covers speed, iframe, and pickup", () => {
    const effects = new Set(
      Object.values(TALENT_NODES)
        .filter((n) => n.cluster === "survivalMobility")
        .map((n) => n.effectKind),
    );
    expect(effects.has("speedMul")).toBe(true);
    expect(effects.has("iframeAdd")).toBe(true);
    expect(effects.has("pickupRadiusMul")).toBe(true);
  });

  it("talentBonuses accumulates multiplicative delta kinds", () => {
    const profile = defaultPlayerProfile();
    profile.points = 9999;
    profile.fragments.basic = 9999;
    profile.fragments.elite = 9999;
    upgradeTalent(profile, "survivalMobilityConn");
    upgradeTalent(profile, "survivalMobilityConn");
    upgradeTalent(profile, "offenseTempoConn");

    const bonuses = talentBonuses(profile.talents);

    expect(bonuses.speedMul).toBeCloseTo(0.04);
    expect(bonuses.critAdd).toBeCloseTo(0.02);
  });
});
