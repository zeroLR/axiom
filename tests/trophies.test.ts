import { describe, it, expect } from "vitest";
import {
  TROPHIES,
  trophyForBoss,
  getTrophyDef,
} from "../src/game/content/trophies";
import {
  defaultPlayerProfile,
  defaultTrophyState,
  type TrophyId,
} from "../src/game/data/types";
import type { BossId } from "../src/game/bosses/types";

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
