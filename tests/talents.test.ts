import { describe, expect, it } from "vitest";
import { TALENT_CLUSTER_ORDER, TALENT_NODES } from "../src/game/content/talents";
import { TALENT_ID_RENAME } from "../src/game/storage";
import { defaultPlayerProfile, defaultSkillTreeState, defaultTalentState } from "../src/game/data/types";
import {
  canUpgradeTalent,
  resetTalentGrowth,
  talentBonuses,
  talentBossGateMessage,
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
    const cost = TALENT_NODES.axisGuardConn.levels[0]!;

    const result = upgradeTalent(profile, "axisGuardConn");

    expect(result.ok).toBe(true);
    expect(profile.talents.levels.axisGuardConn).toBe(1);
    expect(profile.points).toBe(beforePoints - cost.pointCost);
    expect(profile.fragments.basic).toBe(beforeBasic - cost.fragmentCost);
  });

  it("blocks upgrade when prerequisite level is not met", () => {
    const profile = defaultPlayerProfile();
    profile.points = 9999;
    profile.fragments.basic = 9999;

    const can = canUpgradeTalent(profile, profile.talents, "axisGuardV0");

    expect(can.ok).toBe(false);
    expect(can.reason).toContain("Requires");
  });

  it("aggregates bonuses from invested levels", () => {
    const profile = defaultPlayerProfile();
    profile.points = 9999;
    profile.fragments.basic = 9999;
    profile.fragments.elite = 9999;
    upgradeTalent(profile, "axisGuardConn");
    upgradeTalent(profile, "mirrorPressConn");
    upgradeTalent(profile, "voidYieldConn");

    const bonuses = talentBonuses(profile.talents);

    expect(bonuses.maxHpAdd).toBeGreaterThan(0);
    expect(bonuses.damageAdd).toBeGreaterThan(0);
    expect(bonuses.pointRewardMul).toBeCloseTo(0.03);
  });

  it("reset is free and refunds spent points", () => {
    const profile = defaultPlayerProfile();
    profile.points = 9999;
    profile.fragments.basic = 9999;
    upgradeTalent(profile, "axisGuardConn");
    upgradeTalent(profile, "mirrorPressConn");
    const spent = talentTotalSpentPoints(profile.talents);
    const pointsAfterUpgrade = profile.points;

    const result = resetTalentGrowth(profile);

    expect(result.ok).toBe(true);
    expect(profile.points).toBe(pointsAfterUpgrade + spent);
    expect(profile.talents.levels.axisGuardConn).toBe(0);
    expect(profile.talents.levels.mirrorPressConn).toBe(0);
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

  it("coreSyntax cluster grants skill points (sum 120)", () => {
    const profile = defaultPlayerProfile();
    profile.points = 99999;
    profile.fragments.basic = 9999;
    profile.fragments.elite = 9999;
    const skillTree = defaultSkillTreeState();

    upgradeTalent(profile, "coreSyntaxConn", skillTree);
    upgradeTalent(profile, "coreSyntaxV0", skillTree);
    upgradeTalent(profile, "coreSyntaxV0", skillTree);
    upgradeTalent(profile, "coreSyntaxV1", skillTree);
    upgradeTalent(profile, "coreSyntaxV1", skillTree);
    upgradeTalent(profile, "coreSyntaxV2", skillTree);
    upgradeTalent(profile, "coreSyntaxV2", skillTree);
    upgradeTalent(profile, "coreSyntaxV3", skillTree);
    upgradeTalent(profile, "coreSyntaxV4", skillTree);
    upgradeTalent(profile, "coreSyntaxV5", skillTree);
    upgradeTalent(profile, "coreSyntaxCore", skillTree);
    upgradeTalent(profile, "coreSyntaxCore", skillTree);

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
    expect(TALENT_NODES.gridPulseV5.effectKind).toBe("pierceAdd");
    expect(TALENT_NODES.gridPulseCore.effectKind).toBe("projectilesAdd");
  });

  it("survival mobility cluster covers speed, iframe, and pickup", () => {
    const effects = new Set(
      Object.values(TALENT_NODES)
        .filter((n) => n.cluster === "wingFlow")
        .map((n) => n.effectKind),
    );
    expect(effects.has("speedMul")).toBe(true);
    expect(effects.has("iframeAdd")).toBe(true);
    expect(effects.has("pickupRadiusMul")).toBe(true);
  });

  it("five cluster cores carry an unlockAfterBoss gate, mapped 1-to-1 with each boss", () => {
    const expected: Record<string, string> = {
      axisGuardCore: "orthogon",
      wingFlowCore: "jets",
      mirrorPressCore: "mirror",
      gridPulseCore: "lattice",
      voidYieldCore: "rift",
    };
    for (const [coreId, bossId] of Object.entries(expected)) {
      expect(TALENT_NODES[coreId as keyof typeof TALENT_NODES].unlockAfterBoss).toBe(bossId);
    }
    // Sixth core (fragments) intentionally ungated.
    expect(TALENT_NODES.coreSyntaxCore.unlockAfterBoss).toBeUndefined();
  });

  it("blocks core upgrade when the gating boss has not been defeated", () => {
    const profile = defaultPlayerProfile();
    profile.points = 999999;
    profile.fragments.basic = 9999;
    profile.fragments.elite = 9999;
    // Pre-fill all prerequisites for axisGuardCore.
    profile.talents.levels.axisGuardConn = 3;
    profile.talents.levels.axisGuardV0 = 4;
    profile.talents.levels.axisGuardV1 = 4;
    profile.talents.levels.axisGuardV2 = 4;
    profile.talents.levels.axisGuardV3 = 4;

    const result = canUpgradeTalent(profile, profile.talents, "axisGuardCore");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/orthogon/i);
    expect(talentBossGateMessage(profile, "axisGuardCore")).toMatch(/orthogon/i);
  });

  it("allows core upgrade once the gating boss is defeated", () => {
    const profile = defaultPlayerProfile();
    profile.points = 999999;
    profile.fragments.basic = 9999;
    profile.fragments.elite = 9999;
    profile.talents.levels.axisGuardConn = 3;
    profile.talents.levels.axisGuardV0 = 4;
    profile.talents.levels.axisGuardV1 = 4;
    profile.talents.levels.axisGuardV2 = 4;
    profile.talents.levels.axisGuardV3 = 4;
    profile.stats.normalCleared = [true, false, false, false, false];

    expect(talentBossGateMessage(profile, "axisGuardCore")).toBeNull();
    const before = profile.points;
    const result = upgradeTalent(profile, "axisGuardCore");
    expect(result.ok).toBe(true);
    expect(profile.talents.levels.axisGuardCore).toBe(1);
    expect(profile.points).toBeLessThan(before);
  });

  it("ungated nodes have no boss-gate message regardless of stats", () => {
    const profile = defaultPlayerProfile();
    expect(talentBossGateMessage(profile, "axisGuardConn")).toBeNull();
    expect(talentBossGateMessage(profile, "coreSyntaxCore")).toBeNull();
  });

  it("talentBonuses accumulates multiplicative delta kinds", () => {
    const profile = defaultPlayerProfile();
    profile.points = 9999;
    profile.fragments.basic = 9999;
    profile.fragments.elite = 9999;
    upgradeTalent(profile, "wingFlowConn");
    upgradeTalent(profile, "wingFlowConn");
    upgradeTalent(profile, "gridPulseConn");

    const bonuses = talentBonuses(profile.talents);

    expect(bonuses.speedMul).toBeCloseTo(0.04);
    expect(bonuses.critAdd).toBeCloseTo(0.02);
  });
});

describe("talent id rename map (SCHEMA_VERSION 6→7)", () => {
  it("covers all 48 legacy node IDs and maps each to a current node", () => {
    expect(Object.keys(TALENT_ID_RENAME)).toHaveLength(48);
    for (const [legacy, current] of Object.entries(TALENT_ID_RENAME)) {
      expect(legacy).not.toBe(current);
      expect(TALENT_NODES).toHaveProperty(current);
    }
  });

  it("maps representative legacy ids to expected boss-domain names", () => {
    expect(TALENT_ID_RENAME.survivalHpConn).toBe("axisGuardConn");
    expect(TALENT_ID_RENAME.survivalHpCore).toBe("axisGuardCore");
    expect(TALENT_ID_RENAME.survivalMobilityV3).toBe("wingFlowV3");
    expect(TALENT_ID_RENAME.offenseDamageCore).toBe("mirrorPressCore");
    expect(TALENT_ID_RENAME.offenseTempoV5).toBe("gridPulseV5");
    expect(TALENT_ID_RENAME.efficiencyPointsCore).toBe("voidYieldCore");
    expect(TALENT_ID_RENAME.efficiencyFragmentsCore).toBe("coreSyntaxCore");
  });
});
