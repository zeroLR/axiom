import { describe, it, expect } from "vitest";
import { BOSS_REGISTRY, bossForStage } from "../../src/game/bosses/registry";
import type { BossId, BossSpec } from "../../src/game/bosses/types";

describe("Boss registry", () => {
  it("contains all three boss ids", () => {
    const ids: BossId[] = ["orthogon", "jets", "mirror"];
    for (const id of ids) {
      expect(BOSS_REGISTRY[id]).toBeDefined();
      expect(BOSS_REGISTRY[id].id).toBe(id);
    }
  });

  it("maps stages 0–2 to orthogon, jets, mirror", () => {
    expect(bossForStage(0).id).toBe("orthogon");
    expect(bossForStage(1).id).toBe("jets");
    expect(bossForStage(2).id).toBe("mirror");
  });

  it("falls back to mirror for out-of-range stage indices", () => {
    expect(bossForStage(3).id).toBe("mirror");
    expect(bossForStage(-1).id).toBe("mirror");
  });

  it("buildSpec returns deterministic output for orthogon (no picks dependency)", () => {
    const a = BOSS_REGISTRY.orthogon.buildSpec([]);
    const b = BOSS_REGISTRY.orthogon.buildSpec([]);
    expect(a).toEqual(b);
  });

  it("buildSpec returns deterministic output for jets (no picks dependency)", () => {
    const a = BOSS_REGISTRY.jets.buildSpec([]);
    const b = BOSS_REGISTRY.jets.buildSpec([]);
    expect(a).toEqual(b);
  });

  it("mirror buildSpec reflects player picks (damage pick → higher boss damage)", () => {
    const noPicks = BOSS_REGISTRY.mirror.buildSpec([]);
    const withDamage = BOSS_REGISTRY.mirror.buildSpec([
      { id: "sharp", name: "Sharp Edge", glyph: "△", rarity: "common", text: "+1 damage", effect: { kind: "damageAdd", value: 1 } },
    ]);
    expect(withDamage.weapon.damage).toBeGreaterThan(noPicks.weapon.damage);
  });

  it("every boss buildSpec produces valid BossSpec shape", () => {
    for (const def of Object.values(BOSS_REGISTRY)) {
      const spec: BossSpec = def.buildSpec([]);
      expect(spec.hp).toBeGreaterThan(0);
      expect(spec.contactDamage).toBeGreaterThan(0);
      expect(spec.maxSpeed).toBeGreaterThan(0);
      expect(spec.weapon).toBeDefined();
      expect(spec.weapon.period).toBeGreaterThan(0);
      expect(["standard", "orthogon", "jets"]).toContain(spec.patternKind);
    }
  });

  it("every boss has displayName and theoremLine", () => {
    for (const def of Object.values(BOSS_REGISTRY)) {
      expect(def.displayName.length).toBeGreaterThan(0);
      expect(def.theoremLine.length).toBeGreaterThan(0);
      expect(def.glyph.length).toBeGreaterThan(0);
    }
  });
});
