import { describe, expect, it } from "vitest";
import { createRng } from "../../src/game/rng";
import { updateJetsPattern } from "../../src/game/bosses/runtime/jets";
import { World, type Components, type WeaponState } from "../../src/game/world";

const TICK = 0.016;
const MAX_TICKS = 6000;

function weapon(partial: Partial<WeaponState> = {}): WeaponState {
  return {
    period: 1.2,
    damage: 1,
    projectileSpeed: 200,
    projectiles: 2,
    pierce: 0,
    crit: 0,
    cooldown: 1,
    ricochet: 0,
    chain: 0,
    burnDps: 0,
    burnDuration: 0,
    slowPct: 0,
    slowDuration: 0,
    ...partial,
  };
}

function spawnJetsBoss(world: World): Components {
  const id = world.create({
    pos: { x: 180, y: 60 },
    vel: { x: 0, y: 0 },
    radius: 22,
    team: "enemy",
    enemy: {
      kind: "boss",
      contactDamage: 1,
      maxSpeed: 60,
      wobblePhase: 0,
      bossPattern: "jets",
      bossPhase: 0,
      bossTimer: 0,
      bossEnraged: false,
    },
    hp: { value: 250 },
    weapon: weapon(),
  });
  return world.get(id)!;
}

function tickUntil(
  world: World,
  boss: Components,
  rng: ReturnType<typeof createRng>,
  pred: () => boolean,
) {
  const noopFan = () => {};
  for (let i = 0; i < MAX_TICKS; i++) {
    updateJetsPattern(world, boss, 180, 500, rng, TICK, noopFan);
    if (pred()) return true;
  }
  return false;
}

describe("jets runtime", () => {
  it("starts by gliding to dash-start", () => {
    const world = new World();
    const rng = createRng(1);
    const boss = spawnJetsBoss(world);
    const noopFan = () => {};
    updateJetsPattern(world, boss, 180, 500, rng, TICK, noopFan);
    expect(boss.enemy!.bossPhase).toBe(1);
    expect(boss.enemy!.bossDashTarget).toBeDefined();
  });

  it("reaches telegraph phase after arriving dash-start", () => {
    const world = new World();
    const rng = createRng(1);
    const boss = spawnJetsBoss(world);
    const reached = tickUntil(world, boss, rng, () => boss.enemy!.bossPhase === 2);
    expect(reached).toBe(true);
    expect(boss.enemy!.bossTelegraphLines?.length).toBe(1);
  });
});
