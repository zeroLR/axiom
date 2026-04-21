import type { BossId } from "../bosses/types";
import type { SynergyId, WeaponMode } from "../world";

export type Rarity = "common" | "uncommon" | "rare";

export type CardEffect =
  | { kind: "damageAdd"; value: number }
  | { kind: "periodMul"; value: number }      // < 1 = faster fire
  | { kind: "projectileSpeedMul"; value: number }
  | { kind: "projectilesAdd"; value: number }
  | { kind: "pierceAdd"; value: number }
  | { kind: "critAdd"; value: number }         // 0..1
  | { kind: "maxHpAdd"; value: number }
  | { kind: "speedMul"; value: number }
  | { kind: "ricochetAdd"; value: number }
  | { kind: "chainAdd"; value: number }
  | { kind: "burnAdd"; dps: number; duration: number }
  | { kind: "slowAdd"; pct: number; duration: number }
  | { kind: "synergy"; id: SynergyId }
  // --- Evolution effects ---
  | { kind: "shieldRegen"; max: number; period: number }
  | { kind: "secondChance" }
  | { kind: "hitboxMul"; value: number }
  | { kind: "dodgeCD"; cooldown: number }
  // --- Weapon-class cards: each adds a parallel weapon firing alongside primary. ---
  | { kind: "addWeapon"; mode: WeaponMode };

export interface Card {
  id: string;
  name: string;
  glyph: string;    // single-char symbol rendered as the art
  rarity: Rarity;
  text: string;
  effect: CardEffect;
  /** If set, this card only appears in the draft pool after the given boss is defeated. */
  unlockAfterBoss?: BossId;
}

export const CARD_POOL: readonly Card[] = [
  { id: "sharp",      name: "Sharp Edge",    glyph: "△", rarity: "common",   text: "+1 damage",              effect: { kind: "damageAdd", value: 1 } },
  { id: "rapid",      name: "Rapid Fire",    glyph: "⟫", rarity: "common",   text: "-20% fire interval",     effect: { kind: "periodMul", value: 0.8 } },
  { id: "velocity",   name: "Velocity",      glyph: "→", rarity: "common",   text: "+25% projectile speed",  effect: { kind: "projectileSpeedMul", value: 1.25 } },
  { id: "fork",       name: "Fork",          glyph: "⋔", rarity: "uncommon", text: "+1 projectile",          effect: { kind: "projectilesAdd", value: 1 } },
  { id: "pierce",     name: "Pierce",        glyph: "◇", rarity: "uncommon", text: "+1 pierce",              effect: { kind: "pierceAdd", value: 1 } },
  { id: "crit",       name: "Crit",          glyph: "✦", rarity: "uncommon", text: "+25% crit chance",       effect: { kind: "critAdd", value: 0.25 } },
  { id: "plating",    name: "Plating",       glyph: "▢", rarity: "common",   text: "+1 max HP",              effect: { kind: "maxHpAdd", value: 1 } },
  { id: "dash",       name: "Dash",          glyph: "≫", rarity: "common",   text: "+20% move speed",        effect: { kind: "speedMul", value: 1.2 } },
  { id: "overclock",  name: "Overclock",     glyph: "◎", rarity: "rare",     text: "-35% fire interval",     effect: { kind: "periodMul", value: 0.65 } },
  { id: "heavy",      name: "Heavy Rounds",  glyph: "■", rarity: "rare",     text: "+2 damage",              effect: { kind: "damageAdd", value: 2 } },
  { id: "rebound",    name: "Rebound",       glyph: "⇌", rarity: "uncommon", text: "+1 ricochet",            effect: { kind: "ricochetAdd", value: 1 } },
  { id: "ignite",     name: "Ignite",        glyph: "※", rarity: "rare",     text: "Burn 2 dps for 3s",      effect: { kind: "burnAdd", dps: 2, duration: 3 } },
  { id: "freeze",     name: "Freeze",        glyph: "❄", rarity: "uncommon", text: "Slow 35% for 2s",        effect: { kind: "slowAdd", pct: 0.35, duration: 2 } },
  { id: "arc",        name: "Arc",           glyph: "⌇", rarity: "rare",     text: "+1 chain",               effect: { kind: "chainAdd", value: 1 } },
  { id: "combustion", name: "Combustion",    glyph: "❂", rarity: "rare",     text: "Every 10 kills: AoE explosion", effect: { kind: "synergy", id: "combustion" } },
  { id: "desperate",  name: "Desperate",     glyph: "✖", rarity: "rare",     text: "While HP ≤ 2: ×2 damage",       effect: { kind: "synergy", id: "desperate" } },
  { id: "kinetic",    name: "Kinetic",       glyph: "↯", rarity: "uncommon", text: "While moving: +25% crit",       effect: { kind: "synergy", id: "kinetic" } },
  { id: "stillness",  name: "Stillness",     glyph: "◦", rarity: "uncommon", text: "While still: -25% fire interval", effect: { kind: "synergy", id: "stillness" } },
  { id: "aegis",      name: "Aegis",         glyph: "❖", rarity: "rare",     text: "Shield 2; +1 every 6s when safe", effect: { kind: "shieldRegen", max: 2, period: 6 } },
  { id: "revenant",   name: "Revenant",      glyph: "↻", rarity: "rare",     text: "Once per run: revive at 50% HP",  effect: { kind: "secondChance" } },
  { id: "compact",    name: "Compact",       glyph: "▽", rarity: "uncommon", text: "-25% hitbox",                     effect: { kind: "hitboxMul", value: 0.75 } },
  { id: "phaseShift", name: "Phase Shift",   glyph: "⇶", rarity: "rare",     text: "Auto-dodge every 8s",             effect: { kind: "dodgeCD", cooldown: 8 } },
  // --- Weapon-class: each adds a parallel weapon firing alongside primary. ---
  { id: "wpnFaceBeam",   name: "Face Beam",   glyph: "✚", rarity: "rare",     text: "+Weapon: 4-way beam",             effect: { kind: "addWeapon", mode: "faceBeam" } },
  { id: "wpnOrbitShard", name: "Orbit Shard", glyph: "◌", rarity: "rare",     text: "+Weapon: orbiting shards",        effect: { kind: "addWeapon", mode: "orbitShard" } },
  { id: "wpnHoming",     name: "Tracker",     glyph: "⊙", rarity: "uncommon", text: "+Weapon: homing missile",         effect: { kind: "addWeapon", mode: "homing" } },
  { id: "wpnBurst",      name: "Burst",       glyph: "✺", rarity: "rare",     text: "+Weapon: bursts into fragments",  effect: { kind: "addWeapon", mode: "burst" } },
  { id: "wpnFan",        name: "Sweep",       glyph: "≋", rarity: "uncommon", text: "+Weapon: 5-shot fan",             effect: { kind: "addWeapon", mode: "fan" } },
  { id: "wpnCharge",     name: "Cannon",      glyph: "⏶", rarity: "rare",     text: "+Weapon: piercing cannon",        effect: { kind: "addWeapon", mode: "charge" } },
  // --- Boss-gated cards (unlocked by defeating specific bosses) ---
  { id: "axisLock",      name: "Axis Lock",    glyph: "╋", rarity: "uncommon", text: "+2 damage, axis-only fire",       effect: { kind: "damageAdd", value: 2 },       unlockAfterBoss: "orthogon" },
  { id: "gridSnap",      name: "Grid Snap",    glyph: "⊞", rarity: "uncommon", text: "+25% crit chance",                effect: { kind: "critAdd", value: 0.25 },      unlockAfterBoss: "orthogon" },
  { id: "contrail",      name: "Contrail",     glyph: "⁓", rarity: "uncommon", text: "Burn 1.5 dps for 2.5s",           effect: { kind: "burnAdd", dps: 1.5, duration: 2.5 }, unlockAfterBoss: "jets" },
  { id: "reboundPlus",   name: "Rebound+",     glyph: "⤨", rarity: "uncommon", text: "+2 ricochet",                     effect: { kind: "ricochetAdd", value: 2 },     unlockAfterBoss: "jets" },
  { id: "recursion",     name: "Recursion",    glyph: "∞", rarity: "rare",     text: "+3 damage, -30% fire interval",   effect: { kind: "damageAdd", value: 3 },       unlockAfterBoss: "mirror" },
];
