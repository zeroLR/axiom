import type { BossId } from "../bosses/types";

export interface StageTheme {
  /** Human-readable label shown in stage select. */
  name: string;
  /** Pixi background colour (hex int). */
  background: number;
  /** Grid-line colour. */
  gridColor: number;
  /** CSS hex string for overlay backdrop (keeps DOM overlay readable). */
  overlayBg: string;
  /** Whether this is a dark theme (affects entity contrast rendering). */
  dark?: boolean;
  /** Player body colour override for contrast on dark backgrounds. */
  playerColor?: number;
  /** Enemy stroke colour override for contrast on dark backgrounds. */
  enemyStroke?: number;
  /** Optional matte fog tint layered over the play-field. */
  fogColor?: number;
  /** Optional matte fog intensity (0..1). */
  fogAlpha?: number;
  /** Boss assigned to this stage's final wave. */
  bossId: BossId;
  /** Domain name for the main-story framing. */
  domainName: string;
  /** Theorem flavour text displayed on stage entry / boss spawn. */
  theoremLine: string;
  /** Optional subtle CSS tint applied to chrome (topbar/title-card/hud-skills). */
  accentTint?: string;
}

export const STAGE_THEMES: readonly StageTheme[] = [
  {
    name: "White Grid",
    background: 0xffffff,
    gridColor: 0xf0f0f0,
    overlayBg: "rgba(255,255,255,0.82)",
    bossId: "orthogon",
    domainName: "AXIS",
    theoremLine: '"lines converge"',
  },
  {
    name: "Deep Blue",
    background: 0x1b2340,
    gridColor: 0x2e3f66,
    overlayBg: "rgba(27,35,64,0.58)",
    dark: true,
    playerColor: 0x00e5ff,
    enemyStroke: 0xaaccff,
    fogColor: 0xc9d6ff,
    fogAlpha: 0.18,
    bossId: "jets",
    domainName: "WING",
    theoremLine: '"edges strike first"',
    accentTint: "rgba(170,200,255,0.10)",
  },
  {
    name: "Dark Core",
    background: 0x2b1b22,
    gridColor: 0x4a3440,
    overlayBg: "rgba(43,27,34,0.58)",
    dark: true,
    playerColor: 0xff6e40,
    enemyStroke: 0xffccaa,
    fogColor: 0xf2d8dc,
    fogAlpha: 0.24,
    bossId: "mirror",
    domainName: "MIRROR",
    theoremLine: '"every inference reflects"',
    accentTint: "rgba(255,180,150,0.10)",
  },
  {
    name: "Grid Lock",
    background: 0x1a2a2e,
    gridColor: 0x2a3f42,
    overlayBg: "rgba(26,42,46,0.58)",
    dark: true,
    playerColor: 0x80cbc4,
    enemyStroke: 0xb2dfdb,
    fogColor: 0xb2dfdb,
    fogAlpha: 0.20,
    bossId: "lattice",
    domainName: "GRID",
    theoremLine: '"all planes align"',
    accentTint: "rgba(178,223,219,0.10)",
  },
  {
    name: "Void Core",
    background: 0x1a0d26,
    gridColor: 0x2d1645,
    overlayBg: "rgba(26,13,38,0.58)",
    dark: true,
    playerColor: 0xce93d8,
    enemyStroke: 0xe1bee7,
    fogColor: 0xce93d8,
    fogAlpha: 0.26,
    bossId: "rift",
    domainName: "VOID",
    theoremLine: '"the null set expands"',
    accentTint: "rgba(206,147,216,0.12)",
  },
];

/** The default theme (stage 0 / survival fallback). */
export const DEFAULT_THEME: StageTheme = STAGE_THEMES[0]!;
