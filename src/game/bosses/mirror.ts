// ── Mirror Boss definition ───────────────────────────────────────────────────
// Wraps the existing mirrorBoss logic into the BossDef interface. The original
// `mirrorBossSpec` / `applyMirrorSpec` functions are re-exported for backwards
// compatibility with existing tests.

import type { Card } from "../cards";
import type { Components } from "../world";
import type { BossDef, BossSpec } from "./types";
import {
  mirrorBossSpec as legacyMirrorBossSpec,
  applyMirrorSpec as legacyApplyMirrorSpec,
  type MirrorBossSpec,
} from "../mirrorBoss";

export { mirrorBossSpec, applyMirrorSpec, type MirrorBossSpec } from "../mirrorBoss";

function buildSpec(picks: readonly Card[]): BossSpec {
  const legacy = legacyMirrorBossSpec(picks);
  return {
    hp: legacy.hp,
    contactDamage: legacy.contactDamage,
    maxSpeed: legacy.maxSpeed,
    weapon: legacy.weapon,
    patternKind: "standard",
  };
}

function install(entity: Components, spec: BossSpec): void {
  // Delegate to the legacy helper which handles the actual component mutation.
  const legacySpec: MirrorBossSpec = {
    hp: spec.hp,
    contactDamage: spec.contactDamage,
    maxSpeed: spec.maxSpeed,
    weapon: spec.weapon,
  };
  legacyApplyMirrorSpec(entity, legacySpec);
}

export const mirrorBossDef: BossDef = {
  id: "mirror",
  displayName: "MIRROR",
  theoremLine: '"every inference reflects"',
  glyph: "⬡",
  buildSpec,
  install,
};
