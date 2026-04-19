import { describe, expect, it } from "vitest";
import { applyCard, drawOffer, POOL, type Card } from "../src/game/cards";
import { spawnAvatar } from "../src/game/entities";
import { createRng } from "../src/game/rng";
import { World } from "../src/game/world";

describe("drawOffer", () => {
  it("returns the requested count without duplicates", () => {
    const offer = drawOffer(createRng(1), 3);
    expect(offer).toHaveLength(3);
    const ids = offer.map((c) => c.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("is deterministic for the same seed", () => {
    const a = drawOffer(createRng(42), 3).map((c) => c.id);
    const b = drawOffer(createRng(42), 3).map((c) => c.id);
    expect(a).toEqual(b);
  });

  it("tolerates a count larger than the pool", () => {
    const offer = drawOffer(createRng(7), POOL.length + 5);
    expect(offer).toHaveLength(POOL.length);
  });
});

describe("applyCard", () => {
  const cardById = (id: string): Card => {
    const found = POOL.find((c) => c.id === id);
    if (!found) throw new Error(`no card '${id}'`);
    return found;
  };

  it("sharp adds 1 damage to the weapon", () => {
    const world = new World();
    const id = spawnAvatar(world);
    const before = world.get(id)!.weapon!.damage;
    applyCard(world, id, cardById("sharp"));
    expect(world.get(id)!.weapon!.damage).toBe(before + 1);
  });

  it("rapid multiplies fire period by 0.8 and clamps to >= 0.05", () => {
    const world = new World();
    const id = spawnAvatar(world);
    const before = world.get(id)!.weapon!.period;
    applyCard(world, id, cardById("rapid"));
    expect(world.get(id)!.weapon!.period).toBeCloseTo(before * 0.8, 6);
    for (let i = 0; i < 100; i++) applyCard(world, id, cardById("rapid"));
    expect(world.get(id)!.weapon!.period).toBeGreaterThanOrEqual(0.05);
  });

  it("fork increases projectiles by 1", () => {
    const world = new World();
    const id = spawnAvatar(world);
    const before = world.get(id)!.weapon!.projectiles;
    applyCard(world, id, cardById("fork"));
    expect(world.get(id)!.weapon!.projectiles).toBe(before + 1);
  });

  it("pierce increases pierce count by 1", () => {
    const world = new World();
    const id = spawnAvatar(world);
    const before = world.get(id)!.weapon!.pierce;
    applyCard(world, id, cardById("pierce"));
    expect(world.get(id)!.weapon!.pierce).toBe(before + 1);
  });

  it("crit stacks up to 1.0", () => {
    const world = new World();
    const id = spawnAvatar(world);
    for (let i = 0; i < 10; i++) applyCard(world, id, cardById("crit"));
    expect(world.get(id)!.weapon!.crit).toBe(1);
  });

  it("plating raises both current and max hp", () => {
    const world = new World();
    const id = spawnAvatar(world);
    const a = world.get(id)!.avatar!;
    a.hp = 1; // mid-combat simulation
    const beforeMax = a.maxHp;
    applyCard(world, id, cardById("plating"));
    expect(a.maxHp).toBe(beforeMax + 1);
    expect(a.hp).toBe(2);
  });

  it("dash multiplies avatar speedMul by 1.2", () => {
    const world = new World();
    const id = spawnAvatar(world);
    const before = world.get(id)!.avatar!.speedMul;
    applyCard(world, id, cardById("dash"));
    expect(world.get(id)!.avatar!.speedMul).toBeCloseTo(before * 1.2, 6);
  });

  it("rebound adds 1 ricochet", () => {
    const world = new World();
    const id = spawnAvatar(world);
    expect(world.get(id)!.weapon!.ricochet).toBe(0);
    applyCard(world, id, cardById("rebound"));
    applyCard(world, id, cardById("rebound"));
    expect(world.get(id)!.weapon!.ricochet).toBe(2);
  });

  it("arc adds 1 chain", () => {
    const world = new World();
    const id = spawnAvatar(world);
    applyCard(world, id, cardById("arc"));
    expect(world.get(id)!.weapon!.chain).toBe(1);
  });

  it("ignite stacks burn DPS additively, duration stays max", () => {
    const world = new World();
    const id = spawnAvatar(world);
    applyCard(world, id, cardById("ignite"));
    applyCard(world, id, cardById("ignite"));
    const w = world.get(id)!.weapon!;
    expect(w.burnDps).toBe(4);
    expect(w.burnDuration).toBe(3);
  });

  it("freeze stacks slow pct additively up to 0.9", () => {
    const world = new World();
    const id = spawnAvatar(world);
    for (let i = 0; i < 5; i++) applyCard(world, id, cardById("freeze"));
    const w = world.get(id)!.weapon!;
    expect(w.slowPct).toBe(0.9);
    expect(w.slowDuration).toBe(2);
  });

  it("synergy cards register on avatar without touching weapon stats", () => {
    const world = new World();
    const id = spawnAvatar(world);
    const weaponBefore = { ...world.get(id)!.weapon! };
    const maxHpBefore = world.get(id)!.avatar!.maxHp;
    for (const cid of ["combustion", "desperate", "kinetic", "stillness"]) {
      applyCard(world, id, cardById(cid));
    }
    const avatar = world.get(id)!.avatar!;
    expect(avatar.synergies?.map((s) => s.id)).toEqual([
      "combustion",
      "desperate",
      "kinetic",
      "stillness",
    ]);
    expect(avatar.synergies?.[0]?.killCounter).toBe(0);
    expect(world.get(id)!.weapon).toEqual(weaponBefore);
    expect(avatar.maxHp).toBe(maxHpBefore);
  });
});
