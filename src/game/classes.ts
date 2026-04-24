import {
  CLASS_NODES,
  CHARACTER_SLOT_COSTS,
  MAX_CHARACTER_SLOTS,
  MAX_CLASS_TIER,
  type ClassNodeId,
  type ClassPassiveKind,
} from "./content/classes";
import {
  type CharacterSlot,
  type CharactersState,
  type ClassLineageId,
  type PlayerProfile,
  type PrimalSkillId,
  type StartingShapeId,
} from "./data/types";

// ── Public result type ────────────────────────────────────────────────────────

export interface ClassActionResult {
  ok: boolean;
  reason?: string;
}

// ── Class passive bonus aggregate ─────────────────────────────────────────────

export interface ClassPassiveBonuses {
  // Additive avatar effects (applied via applyEffectToWorld)
  damageAdd: number;
  critAdd: number;
  maxHpAdd: number;
  iframeAdd: number;
  projectilesAdd: number;
  // Multiplicative avatar effects (default 1.0 = no change)
  periodMul: number;
  speedMul: number;
  // Settlement effects (handled in settleRun, not world)
  pointRewardMul: number;
  fragmentRewardMul: number;
}

/** Additive ClassPassiveKind values that map 1:1 to RuntimeEffect { kind, value }. */
export const CLASS_PASSIVE_AVATAR_ADDITIVE_KINDS = [
  "damageAdd",
  "critAdd",
  "maxHpAdd",
  "iframeAdd",
  "projectilesAdd",
] as const satisfies readonly ClassPassiveKind[];

// ── Node chain helpers ────────────────────────────────────────────────────────

/**
 * Returns the chain of ClassNodeIds from T0 to the slot's current tier,
 * following the slot's branchPath choices.
 */
export function getActiveNodeChain(slot: CharacterSlot): ClassNodeId[] {
  const { lineage, tier, branchPath } = slot;
  const chain: ClassNodeId[] = [];
  if (tier >= 0) chain.push(`${lineage}-t0` as ClassNodeId);
  if (tier >= 1) chain.push(`${lineage}-t1` as ClassNodeId);
  if (tier >= 2) {
    const b2 = branchPath[0] === 1 ? "b" : "a";
    chain.push(`${lineage}-t2${b2}` as ClassNodeId);
  }
  if (tier >= 3) {
    const b2 = branchPath[0] === 1 ? "b" : "a";
    const b3 = branchPath[1] === 1 ? "b" : "a";
    chain.push(`${lineage}-t3${b2}${b3}` as ClassNodeId);
  }
  return chain;
}

/** Returns all PrimalSkillIds unlocked by the slot's current class node chain. */
export function getClassUnlockedSkills(slot: CharacterSlot): PrimalSkillId[] {
  const skills: PrimalSkillId[] = [];
  for (const nodeId of getActiveNodeChain(slot)) {
    const skill = CLASS_NODES[nodeId]?.unlocksSkill;
    if (skill) skills.push(skill);
  }
  return skills;
}

/** Returns the ClassNodeId that would be reached by promoting with given branch. */
function promotionTargetNodeId(slot: CharacterSlot, branch: number): ClassNodeId | null {
  const { lineage, tier, branchPath } = slot;
  const nextTier = tier + 1;
  const b = branch === 1 ? "b" : "a";
  if (nextTier === 1) return `${lineage}-t1` as ClassNodeId;
  if (nextTier === 2) return `${lineage}-t2${b}` as ClassNodeId;
  if (nextTier === 3) {
    const b2 = branchPath[0] === 1 ? "b" : "a";
    return `${lineage}-t3${b2}${b}` as ClassNodeId;
  }
  return null;
}

// ── Aggregate bonuses ─────────────────────────────────────────────────────────

/**
 * Aggregates all passive bonuses for the active character slot.
 * Additive effects are summed; periodMul / speedMul are multiplied together.
 */
export function classPassiveBonuses(state: CharactersState): ClassPassiveBonuses {
  const bonuses: ClassPassiveBonuses = {
    damageAdd: 0,
    critAdd: 0,
    maxHpAdd: 0,
    iframeAdd: 0,
    projectilesAdd: 0,
    periodMul: 1,
    speedMul: 1,
    pointRewardMul: 0,
    fragmentRewardMul: 0,
  };
  const slot = activeCharacterSlot(state);
  if (!slot) return bonuses;
  for (const nodeId of getActiveNodeChain(slot)) {
    const node = CLASS_NODES[nodeId];
    if (!node) continue;
    for (const passive of node.passives) {
      if (passive.kind === "periodMul" || passive.kind === "speedMul") {
        bonuses[passive.kind] *= passive.value;
      } else {
        (bonuses as Record<ClassPassiveKind, number>)[passive.kind] += passive.value;
      }
    }
  }
  return bonuses;
}

// ── Slot accessors ────────────────────────────────────────────────────────────

export function activeCharacterSlot(state: CharactersState): CharacterSlot | null {
  return state.slots.find((s) => s.id === state.activeSlotId) ?? state.slots[0] ?? null;
}

export function findCharacterSlot(state: CharactersState, slotId: string): CharacterSlot | null {
  return state.slots.find((s) => s.id === slotId) ?? null;
}

// ── Shape / lineage mapping ───────────────────────────────────────────────────

export function lineageToStartingShape(lineage: ClassLineageId): StartingShapeId {
  switch (lineage) {
    case "wing":   return "square";
    case "mirror": return "diamond";
    default:       return "triangle";
  }
}

export function startingShapeToLineage(shape: StartingShapeId): ClassLineageId {
  switch (shape) {
    case "square":  return "wing";
    case "diamond": return "mirror";
    default:        return "axis";
  }
}

// ── Promotion ─────────────────────────────────────────────────────────────────

/** Returns the total points spent on promotions for a slot (used for reset refund). */
export function totalPromotionPointsSpent(slot: CharacterSlot): number {
  let total = 0;
  for (const nodeId of getActiveNodeChain(slot)) {
    const req = CLASS_NODES[nodeId]?.promotionReq;
    if (req) total += req.pointCost;
  }
  return total;
}

export function canPromoteClass(
  profile: PlayerProfile,
  slotId: string,
  branch: number,
): ClassActionResult {
  const slot = findCharacterSlot(profile.characters, slotId);
  if (!slot) return { ok: false, reason: "Character not found." };
  if (slot.tier >= MAX_CLASS_TIER) return { ok: false, reason: "Already at maximum tier." };

  const targetId = promotionTargetNodeId(slot, branch);
  if (!targetId) return { ok: false, reason: "Invalid promotion target." };

  const nodeDef = CLASS_NODES[targetId];
  const req = nodeDef?.promotionReq;
  if (!req) return { ok: false, reason: "Invalid promotion target." };

  // Stage clear check
  if (!profile.stats.normalCleared[req.stageClear]) {
    return { ok: false, reason: `Requires Stage ${req.stageClear + 1} cleared.` };
  }
  // Points check
  if (profile.points < req.pointCost) {
    return { ok: false, reason: "Not enough points." };
  }
  // Fragment check (uses detailed per-id inventory)
  const available = profile.fragments.detailed[req.fragmentId] ?? 0;
  if (available < req.fragmentCost) {
    return { ok: false, reason: `Not enough ${nodeDef.promotionReq!.fragmentId} fragments.` };
  }
  return { ok: true };
}

/**
 * Promotes a character slot by one tier, charging points + fragments.
 * Mutates profile in place.
 */
export function promoteClass(
  profile: PlayerProfile,
  slotId: string,
  branch: number,
): ClassActionResult {
  const check = canPromoteClass(profile, slotId, branch);
  if (!check.ok) return check;

  const slot = findCharacterSlot(profile.characters, slotId)!;
  const targetId = promotionTargetNodeId(slot, branch)!;
  const req = CLASS_NODES[targetId]!.promotionReq!;

  // Deduct costs
  profile.points -= req.pointCost;
  const cat = req.fragmentId.startsWith("elite-") ? "elite" : "boss";
  profile.fragments[cat] = Math.max(0, profile.fragments[cat] - req.fragmentCost);
  profile.fragments.detailed[req.fragmentId] = Math.max(
    0,
    (profile.fragments.detailed[req.fragmentId] ?? 0) - req.fragmentCost,
  );

  // Advance tier and record branch choice for the new tier.
  // branchPath indices: [0] = T2 branch, [1] = T3 branch.
  // For T1→T2 (slot.tier=1): index = tier-1 = 0. For T2→T3 (slot.tier=2): index = tier-1 = 1.
  if (slot.tier >= 1) {
    slot.branchPath[slot.tier - 1] = branch; // index = nextTier - 2 = currentTier - 1
  }
  slot.tier += 1;

  return { ok: true };
}

// ── Class reset ───────────────────────────────────────────────────────────────

/**
 * Resets a character slot to T0, refunding all spent points.
 * Fragments used for promotions are NOT refunded (that is the reset cost).
 * Mutates profile in place.
 */
export function resetCharacterClass(profile: PlayerProfile, slotId: string): ClassActionResult {
  const slot = findCharacterSlot(profile.characters, slotId);
  if (!slot) return { ok: false, reason: "Character not found." };
  if (slot.tier === 0) return { ok: false, reason: "No promotions to reset." };

  const refundPoints = totalPromotionPointsSpent(slot);
  profile.points += refundPoints;
  slot.tier = 0;
  slot.branchPath = [];
  return { ok: true };
}

// ── Character slot creation ───────────────────────────────────────────────────

export function canCreateCharacterSlot(profile: PlayerProfile): ClassActionResult {
  const slotCount = profile.characters.slots.length;
  if (slotCount >= MAX_CHARACTER_SLOTS) {
    return { ok: false, reason: "Maximum character slots reached." };
  }
  const cost = CHARACTER_SLOT_COSTS[slotCount] ?? Infinity;
  if (profile.points < cost) {
    return { ok: false, reason: "Not enough points." };
  }
  return { ok: true };
}

/**
 * Creates a new character slot for the given lineage, charging points.
 * Mutates profile in place.
 */
export function createCharacterSlot(
  profile: PlayerProfile,
  lineage: ClassLineageId,
): ClassActionResult {
  const check = canCreateCharacterSlot(profile);
  if (!check.ok) return check;

  const slotCount = profile.characters.slots.length;
  const cost = CHARACTER_SLOT_COSTS[slotCount] ?? 0;
  profile.points -= cost;

  const id = `char-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newSlot: CharacterSlot = {
    id,
    name: `Character ${slotCount + 1}`,
    lineage,
    tier: 0,
    branchPath: [],
    createdAt: Date.now(),
  };
  profile.characters.slots.push(newSlot);
  profile.characters.maxSlots = slotCount + 1;
  return { ok: true };
}

/** Sets the active character slot by ID. Returns false if the slot doesn't exist. */
export function setActiveCharacterSlot(state: CharactersState, slotId: string): boolean {
  const exists = state.slots.some((s) => s.id === slotId);
  if (!exists) return false;
  state.activeSlotId = slotId;
  return true;
}
