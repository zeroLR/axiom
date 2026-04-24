import { describe, expect, it } from "vitest";
import { defaultSkillTreeState, MAX_SKILL_LEVEL } from "../src/game/data/types";
import {
  skillDuration,
  skillCooldown,
  upgradeCost,
  PRIMAL_SKILLS,
  createActiveSkillStates,
  activateSkill,
  tickSkillState,
  barrageProjectiles,
  barrageDamage,
  lifestealRadius,
  lifestealDamage,
  reflectDamageRatio,
} from "../src/game/skills";

describe("primal skills", () => {
  it("duration increases and cooldown decreases with level", () => {
    const def = PRIMAL_SKILLS.timeStop;
    const dur0 = skillDuration(def, 0);
    const dur5 = skillDuration(def, 5);
    expect(dur5).toBeGreaterThan(dur0);
    const cd0 = skillCooldown(def, 0);
    const cd5 = skillCooldown(def, 5);
    expect(cd5).toBeLessThan(cd0);
  });

  it("upgrade cost increases with level", () => {
    expect(upgradeCost(1)).toBeGreaterThan(upgradeCost(0));
    expect(upgradeCost(5)).toBeGreaterThan(upgradeCost(1));
  });

  it("upgrade cost is Infinity at max level", () => {
    expect(upgradeCost(MAX_SKILL_LEVEL)).toBe(Infinity);
    expect(upgradeCost(MAX_SKILL_LEVEL + 1)).toBe(Infinity);
  });

  it("has 7 skill definitions", () => {
    const ids = Object.keys(PRIMAL_SKILLS);
    expect(ids).toHaveLength(7);
    expect(ids).toContain("timeStop");
    expect(ids).toContain("shadowClone");
    expect(ids).toContain("reflectShield");
    expect(ids).toContain("barrage");
    expect(ids).toContain("lifestealPulse");
    expect(ids).toContain("axisFreeze");
    expect(ids).toContain("overload");
  });

  it("new skills have valid balance parameters", () => {
    for (const def of Object.values(PRIMAL_SKILLS)) {
      expect(def.baseDuration).toBeGreaterThan(0);
      expect(def.baseCooldown).toBeGreaterThan(0);
      expect(def.durationPerLevel).toBeGreaterThan(0);
      expect(def.cooldownPerLevel).toBeGreaterThan(0);
      expect(skillCooldown(def, 100)).toBeGreaterThanOrEqual(5); // min cooldown cap
    }
  });
});

describe("new skill helpers", () => {
  it("barrageProjectiles scales with level", () => {
    expect(barrageProjectiles(0)).toBe(12);
    expect(barrageProjectiles(5)).toBe(22);
  });

  it("barrageDamage scales with level", () => {
    expect(barrageDamage(0)).toBe(2);
    expect(barrageDamage(3)).toBe(5);
  });

  it("lifestealRadius scales with level", () => {
    expect(lifestealRadius(0)).toBe(80);
    expect(lifestealRadius(5)).toBe(130);
  });

  it("lifestealDamage scales with level", () => {
    expect(lifestealDamage(0)).toBe(1);
    expect(lifestealDamage(4)).toBe(3);
  });

  it("reflectDamageRatio scales with level", () => {
    expect(reflectDamageRatio(0)).toBe(1);
    expect(reflectDamageRatio(5)).toBeCloseTo(1.75);
  });
});

describe("active skill state", () => {
  it("creates no states when no skill IDs provided", () => {
    const tree = defaultSkillTreeState();
    expect(createActiveSkillStates([], tree)).toHaveLength(0);
  });

  it("creates states for given unlocked skill IDs", () => {
    const tree = defaultSkillTreeState();
    const ids = ["timeStop", "shadowClone", "reflectShield", "barrage", "lifestealPulse"] as const;
    expect(createActiveSkillStates(ids, tree)).toHaveLength(5);
  });

  it("activateSkill starts the active timer", () => {
    const tree = defaultSkillTreeState();
    const [state] = createActiveSkillStates(["timeStop"], tree);
    expect(activateSkill(state!)).toBe(true);
    expect(state!.active).toBeGreaterThan(0);
    // Can't activate again while active
    expect(activateSkill(state!)).toBe(false);
  });

  it("tickSkillState transitions from active to cooldown", () => {
    const tree = defaultSkillTreeState();
    const [state] = createActiveSkillStates(["timeStop"], tree);
    activateSkill(state!);
    // Tick through entire duration
    for (let i = 0; i < 600; i++) tickSkillState(state!, 1 / 60);
    expect(state!.active).toBe(0);
    expect(state!.cooldown).toBeGreaterThan(0);
  });
});
