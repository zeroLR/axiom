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
  },
];

/** The default theme (stage 0 / survival fallback). */
export const DEFAULT_THEME: StageTheme = STAGE_THEMES[0]!;
