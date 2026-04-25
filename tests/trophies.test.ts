import { describe, it, expect } from "vitest";
import {
  TROPHIES,
  trophyForBoss,
  getTrophyDef,
  trophyGrantedSkills,
} from "../src/game/content/trophies";
import {
  defaultPlayerProfile,
  defaultTrophyState,
  type TrophyId,
} from "../src/game/data/types";
import type { BossId } from "../src/game/bosses/types";
import { CLASS_NODES } from "../src/game/content/classes";

const ALL_BOSSES: BossId[] = ["orthogon", "jets", "mirror", "lattice", "rift"];
const ALL_TROPHY_IDS: TrophyId[] = [
  "axis-lock",
  "wing-dash",
  "mirror-echo",
  "grid-overlay",
  "void-blink",
];

describe("trophy registry", () => {
  it("registers exactly one trophy per current boss", () => {
    expect(TROPHIES).toHaveLength(ALL_BOSSES.length);
    const fromBosses = TROPHIES.map((t) => t.fromBoss).sort();
    expect(fromBosses).toEqual([...ALL_BOSSES].sort());
  });

  it("trophy IDs are unique", () => {
    const ids = TROPHIES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every trophy defines a non-empty passive", () => {
    for (const t of TROPHIES) {
      const values = Object.values(t.passive);
      expect(values.length).toBeGreaterThan(0);
      expect(values.every((v) => typeof v === "number" && v !== 0)).toBe(true);
    }
  });

  it("trophyForBoss returns the registered trophy for each boss", () => {
    for (const boss of ALL_BOSSES) {
      const trophy = trophyForBoss(boss);
      expect(trophy).not.toBeNull();
      expect(trophy?.fromBoss).toBe(boss);
    }
  });

  it("getTrophyDef round-trips by id", () => {
    for (const id of ALL_TROPHY_IDS) {
      const def = getTrophyDef(id);
      expect(def.id).toBe(id);
    }
  });
});

describe("trophy state defaults", () => {
  it("default trophy state has all entries locked and nothing equipped", () => {
    const state = defaultTrophyState();
    expect(state.equipped).toBeNull();
    for (const id of ALL_TROPHY_IDS) {
      expect(state.unlocked[id]).toBe(false);
    }
  });

  it("default player profile carries the default trophy state", () => {
    const profile = defaultPlayerProfile();
    expect(profile.trophies.equipped).toBeNull();
    expect(profile.trophies.unlocked["axis-lock"]).toBe(false);
    expect(profile.trophies.unlocked["void-blink"]).toBe(false);
  });
});

describe("trophy-granted skills (§6.3)", () => {
  it("4 of 5 trophies grant a primal skill; orthogon stays passive-only", () => {
    const map: Record<TrophyId, string | undefined> = {
      "axis-lock": undefined,
      "wing-dash": "overload",
      "mirror-echo": "shadowClone",
      "grid-overlay": "timeStop",
      "void-blink": "lifestealPulse",
    };
    for (const def of TROPHIES) {
      expect(def.grantsSkill).toBe(map[def.id]);
    }
  });

  it("trophyGrantedSkills returns only skills from currently unlocked trophies", () => {
    const empty = defaultTrophyState();
    expect(trophyGrantedSkills(empty.unlocked)).toEqual([]);

    const partial = defaultTrophyState();
    partial.unlocked["wing-dash"] = true;
    partial.unlocked["void-blink"] = true;
    expect(trophyGrantedSkills(partial.unlocked).sort()).toEqual(
      ["lifestealPulse", "overload"],
    );

    const allUnlocked = defaultTrophyState();
    for (const id of Object.keys(allUnlocked.unlocked) as TrophyId[]) {
      allUnlocked.unlocked[id] = true;
    }
    // axis-lock has no grantsSkill, so 4 entries.
    expect(trophyGrantedSkills(allUnlocked.unlocked)).toHaveLength(4);
  });

  it("class T2 nodes no longer carry unlocksSkill (skills moved to trophies)", () => {
    expect(CLASS_NODES["axis-t2a"].unlocksSkill).toBeUndefined();
    expect(CLASS_NODES["axis-t2b"].unlocksSkill).toBeUndefined();
    expect(CLASS_NODES["wing-t2a"].unlocksSkill).toBeUndefined();
    expect(CLASS_NODES["mirror-t2a"].unlocksSkill).toBeUndefined();
  });

  it("class T1 nodes retain their identity skill (unchanged)", () => {
    expect(CLASS_NODES["axis-t1"].unlocksSkill).toBe("barrage");
    expect(CLASS_NODES["wing-t1"].unlocksSkill).toBe("axisFreeze");
    expect(CLASS_NODES["mirror-t1"].unlocksSkill).toBe("reflectShield");
  });
});
