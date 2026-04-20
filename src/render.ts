import { Graphics } from "pixi.js";
import { PLAY_H, PLAY_W } from "./game/config";
import { BOSS_FAN_SPREAD, BOSS_TELEGRAPH_LEAD } from "./game/systems/bossWeapon";
import type { EnemyKind, World } from "./game/world";
import type { StageTheme } from "./game/stageThemes";

// Cap for the fullscreen matte layer so enemies remain readable.
const MAX_BASE_FOG_ALPHA = 0.18;
// Maps theme fogAlpha (0..1) to the fullscreen matte layer opacity.
const FOG_ALPHA_SCALE = 0.55;
// Additional alpha multiplier for soft fog blobs.
const FOG_BLOB_ALPHA_MULTIPLIER = 0.12;

export function drawGrid(g: Graphics, gridColor: number = 0xf0f0f0): void {
  const STEP = 40;
  for (let x = 0; x <= PLAY_W; x += STEP) { g.moveTo(x, 0); g.lineTo(x, PLAY_H); }
  for (let y = 0; y <= PLAY_H; y += STEP) { g.moveTo(0, y); g.lineTo(PLAY_W, y); }
  g.stroke({ color: gridColor, width: 1 });
}

export function drawWorld(
  g: Graphics,
  world: World,
  theme?: StageTheme,
  opts?: { showEnemyHp?: boolean },
): void {
  g.clear();
  const dark = theme?.dark ?? false;
  const strokeColor = theme?.enemyStroke ?? 0x111111;
  const playerBodyColor = theme?.playerColor ?? 0x111111;
  drawMatteFog(g, theme);

  for (const [, c] of world.with("projectile", "pos", "radius")) {
    const enemyShot = c.team === "enemy-shot";
    const color = enemyShot
      ? (c.projectile!.crit ? 0xff2020 : 0xff7043)
      : (c.projectile!.crit ? 0xff3030 : 0xd81b60);
    g.circle(c.pos!.x, c.pos!.y, c.radius!);
    g.fill({ color });
    if (enemyShot) {
      g.circle(c.pos!.x, c.pos!.y, c.radius! + 1.5);
      g.stroke({ color: strokeColor, width: 1 });
    }
  }

  // Boss telegraph: draw each pending fan ray before enemies so the boss
  // body overlaps the origin. Alpha ramps up as the shot nears.
  const RAY_LEN = Math.hypot(PLAY_W, PLAY_H);
  for (const [, c] of world.with("enemy", "weapon", "pos")) {
    if (c.enemy!.kind !== "boss") continue;

    // Standard fan telegraph (Mirror / Jets dash / generic aimed shots)
    const ang = c.enemy!.telegraphAngle;
    if (ang !== undefined) {
      const remaining = c.weapon!.cooldown;
      const t = 1 - Math.max(0, Math.min(1, remaining / BOSS_TELEGRAPH_LEAD));
      const alpha = 0.2 + 0.55 * t;
      const n = Math.max(1, c.weapon!.projectiles);
      const startAngle = ang - (BOSS_FAN_SPREAD * (n - 1)) / 2;
      for (let i = 0; i < n; i++) {
        const a = startAngle + BOSS_FAN_SPREAD * i;
        g.moveTo(c.pos!.x, c.pos!.y);
        g.lineTo(c.pos!.x + Math.cos(a) * RAY_LEN, c.pos!.y + Math.sin(a) * RAY_LEN);
      }
      g.stroke({ color: 0xff2020, alpha, width: 2 });
    }

    // Orthogon axis telegraph lines
    const axisLines = c.enemy!.bossTelegraphLines;
    if (axisLines && axisLines.length > 0) {
      const bossTimer = c.enemy!.bossTimer ?? 0;
      const t = 1 - Math.max(0, Math.min(1, bossTimer / 0.8));
      const alpha = 0.15 + 0.6 * t;
      for (const a of axisLines) {
        g.moveTo(c.pos!.x, c.pos!.y);
        g.lineTo(c.pos!.x + Math.cos(a) * RAY_LEN, c.pos!.y + Math.sin(a) * RAY_LEN);
      }
      g.stroke({ color: 0xff4040, alpha, width: 2.5 });
    }
  }

  for (const [, c] of world.with("enemy", "pos", "radius")) {
    const { x, y } = c.pos!;
    const r = c.radius!;
    const kind = c.enemy!.kind;
    const flash = (c.flash ?? 0) > 0;
    const bossPattern = c.enemy!.bossPattern;
    const fillColor = flash ? 0xffffff
      : kind === "boss" ? bossColor(bossPattern, dark)
      : enemyColor(kind, dark);
    if (kind === "boss" && bossPattern) {
      drawBossShape(g, bossPattern, x, y, r);
    } else {
      drawEnemyShape(g, kind, x, y, r);
    }
    const bossStroke = kind === "boss" && bossPattern === "jets" && c.enemy!.bossEnraged
      ? 0xff3030 : strokeColor;
    g.fill({ color: fillColor }).stroke({ color: bossStroke, width: 2 });

    // Shield indicator (hexagon)
    if (c.enemy!.shield && c.enemy!.shield > 0) {
      g.circle(x, y, r + 3);
      g.stroke({ color: 0x00e5ff, width: 1.5 });
    }

    // Elite ring — visual tell that this kill yields a draft token.
    if (c.enemy!.isElite) {
      g.circle(x, y, r + 5);
      g.stroke({ color: 0xd81b60, width: 1.5 });
    }

    if (opts?.showEnemyHp && c.hp) {
      const maxHp = Math.max(1, c.enemy?.maxHp ?? c.hp.value);
      const ratio = Math.max(0, Math.min(1, c.hp.value / maxHp));
      const barW = Math.max(14, r * 2);
      const barX = x - barW / 2;
      const barY = y - r - 8;
      g.rect(barX, barY, barW, 3);
      g.fill({ color: 0x000000, alpha: 0.3 });
      g.rect(barX, barY, barW * ratio, 3);
      g.fill({ color: 0x00c853 });
    }
  }

  for (const [, c] of world.with("avatar", "pos", "radius")) {
    const { x, y } = c.pos!;
    const r = c.radius!;
    const a = c.avatar!;
    const bodyFill = (c.flash ?? 0) > 0 ? 0xffffff : playerBodyColor;
    drawAvatarShape(g, a.skinId ?? "triangle", x, y, r);
    g.fill({ color: bodyFill }).stroke({ color: playerBodyColor, width: 2 });
    if (a.iframes > 0) {
      g.circle(x, y, r + 4);
      g.stroke({ color: 0x00bcd4, width: 1.5 });
    }
    // Aegis ring — thicker stroke when more shield charges remain.
    if (a.shield !== undefined && a.shield > 0) {
      g.circle(x, y, r + 7);
      g.stroke({ color: 0x80d8ff, width: a.shield > 1 ? 2.5 : 1.5 });
    }
    // Phase Shift chip — small dot when a dodge charge is loaded.
    if ((a.dodgeCharges ?? 0) > 0) {
      g.circle(x + r + 6, y - r - 6, 2.5);
      g.fill({ color: 0xb388ff });
    }
  }
}

function drawAvatarShape(g: Graphics, skinId: string, x: number, y: number, r: number): void {
  switch (skinId) {
    case "skin-square":
      g.rect(x - r, y - r, r * 2, r * 2);
      break;
    case "skin-diamond":
      drawDiamond(g, x, y, r);
      break;
    case "skin-hexagon":
      drawPolygon(g, x, y, r, 6);
      break;
    case "skin-star":
      drawStar(g, x, y, r, 5);
      break;
    case "skin-boss":
      drawPolygon(g, x, y, r, 6);
      break;
    default: {
      const h = r * Math.sqrt(3) / 2;
      g.moveTo(x, y - h * 0.9);
      g.lineTo(x + r * 0.9, y + h * 0.6);
      g.lineTo(x - r * 0.9, y + h * 0.6);
      g.closePath();
      break;
    }
  }
}

function drawMatteFog(g: Graphics, theme?: StageTheme): void {
  const fogAlpha = theme?.fogAlpha ?? 0;
  if (fogAlpha <= 0) return;
  const fogColor = theme?.fogColor ?? 0xffffff;
  g.rect(0, 0, PLAY_W, PLAY_H);
  g.fill({ color: fogColor, alpha: Math.min(MAX_BASE_FOG_ALPHA, fogAlpha * FOG_ALPHA_SCALE) });
  const blobs = [
    { x: PLAY_W * 0.18, y: PLAY_H * 0.2, r: 120, a: 1.0 },
    { x: PLAY_W * 0.78, y: PLAY_H * 0.28, r: 150, a: 0.85 },
    { x: PLAY_W * 0.52, y: PLAY_H * 0.58, r: 170, a: 0.7 },
    { x: PLAY_W * 0.2, y: PLAY_H * 0.86, r: 135, a: 0.9 },
    { x: PLAY_W * 0.82, y: PLAY_H * 0.84, r: 145, a: 0.75 },
  ] as const;
  for (const blob of blobs) {
    g.circle(blob.x, blob.y, blob.r);
    g.fill({ color: fogColor, alpha: fogAlpha * FOG_BLOB_ALPHA_MULTIPLIER * blob.a });
  }
}

function enemyColor(kind: EnemyKind, dark: boolean): number {
  if (dark) {
    // Brighter, more saturated palette for dark backgrounds
    switch (kind) {
      case "circle":    return 0xffffff;
      case "square":    return 0xffd740;
      case "star":      return 0x64b5f6;
      case "boss":      return 0xff80ab;
      case "pentagon":  return 0x69f0ae;
      case "hexagon":   return 0x40c4ff;
      case "diamond":   return 0xffab40;
      case "cross":     return 0xea80fc;
      case "crescent":  return 0xffe57f;
    }
  }
  switch (kind) {
    case "circle":    return 0xfafafa;
    case "square":    return 0xffe6a0;
    case "star":      return 0xc9e7ff;
    case "boss":      return 0xffd1e1;
    case "pentagon":  return 0xd4f5d4;
    case "hexagon":   return 0xd0f0ff;
    case "diamond":   return 0xffe0cc;
    case "cross":     return 0xf5d0f5;
    case "crescent":  return 0xfff4cc;
  }
}

function drawEnemyShape(g: Graphics, kind: EnemyKind, x: number, y: number, r: number): void {
  switch (kind) {
    case "circle":   g.circle(x, y, r); break;
    case "square":   g.rect(x - r, y - r, r * 2, r * 2); break;
    case "star":     drawStar(g, x, y, r, 5); break;
    case "boss":     drawPolygon(g, x, y, r, 6); break;
    case "pentagon": drawPolygon(g, x, y, r, 5); break;
    case "hexagon":  drawPolygon(g, x, y, r, 6); break;
    case "diamond":  drawDiamond(g, x, y, r); break;
    case "cross":    drawCross(g, x, y, r); break;
    case "crescent": drawCrescent(g, x, y, r); break;
  }
}

/** Per-boss body fill colour. */
function bossColor(pattern: string | undefined, dark: boolean): number {
  switch (pattern) {
    case "orthogon": return dark ? 0xb0bec5 : 0xeceff1; // steel grey
    case "jets":     return dark ? 0x81d4fa : 0xb3e5fc; // sky blue
    default:         return dark ? 0xff80ab : 0xffd1e1; // pink (mirror)
  }
}

/** Draw boss body shape per boss type. */
function drawBossShape(g: Graphics, pattern: string, x: number, y: number, r: number): void {
  switch (pattern) {
    case "orthogon": drawBossCross(g, x, y, r); break;
    case "jets":     drawBossJets(g, x, y, r); break;
    default:         drawPolygon(g, x, y, r, 6); break; // mirror → hexagon
  }
}

/** Orthogon: thick plus/cross shape (bigger than enemy cross). */
function drawBossCross(g: Graphics, cx: number, cy: number, r: number): void {
  const w = r * 0.4;
  g.moveTo(cx - w, cy - r);
  g.lineTo(cx + w, cy - r);
  g.lineTo(cx + w, cy - w);
  g.lineTo(cx + r, cy - w);
  g.lineTo(cx + r, cy + w);
  g.lineTo(cx + w, cy + w);
  g.lineTo(cx + w, cy + r);
  g.lineTo(cx - w, cy + r);
  g.lineTo(cx - w, cy + w);
  g.lineTo(cx - r, cy + w);
  g.lineTo(cx - r, cy - w);
  g.lineTo(cx - w, cy - w);
  g.closePath();
}

/** Jets: paper-plane / arrowhead shape facing downward (toward player). */
function drawBossJets(g: Graphics, cx: number, cy: number, r: number): void {
  // Downward-pointing dart / paper-plane silhouette
  g.moveTo(cx, cy + r);                // nose (bottom-center)
  g.lineTo(cx - r * 0.8, cy - r * 0.7); // left wing
  g.lineTo(cx - r * 0.2, cy - r * 0.2); // left notch
  g.lineTo(cx, cy - r * 0.5);           // tail center
  g.lineTo(cx + r * 0.2, cy - r * 0.2); // right notch
  g.lineTo(cx + r * 0.8, cy - r * 0.7); // right wing
  g.closePath();
}

function drawPolygon(g: Graphics, cx: number, cy: number, r: number, sides: number): void {
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath();
}

function drawStar(g: Graphics, cx: number, cy: number, r: number, points: number): void {
  const inner = r * 0.45;
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath();
}

function drawDiamond(g: Graphics, cx: number, cy: number, r: number): void {
  g.moveTo(cx, cy - r);       // top
  g.lineTo(cx + r * 0.6, cy); // right
  g.lineTo(cx, cy + r);       // bottom
  g.lineTo(cx - r * 0.6, cy); // left
  g.closePath();
}

function drawCross(g: Graphics, cx: number, cy: number, r: number): void {
  const w = r * 0.35;
  g.moveTo(cx - w, cy - r);
  g.lineTo(cx + w, cy - r);
  g.lineTo(cx + w, cy - w);
  g.lineTo(cx + r, cy - w);
  g.lineTo(cx + r, cy + w);
  g.lineTo(cx + w, cy + w);
  g.lineTo(cx + w, cy + r);
  g.lineTo(cx - w, cy + r);
  g.lineTo(cx - w, cy + w);
  g.lineTo(cx - r, cy + w);
  g.lineTo(cx - r, cy - w);
  g.lineTo(cx - w, cy - w);
  g.closePath();
}

function drawCrescent(g: Graphics, cx: number, cy: number, r: number): void {
  // Outer arc (full circle)
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill({ color: 0x000000 }); // placeholder — overridden by caller
  // Inner cutout (shifted circle to create crescent shape)
  // We draw crescent as a custom shape instead:
  const steps = 20;
  const outerR = r;
  const innerR = r * 0.7;
  const offset = r * 0.4;
  // outer arc (full circle CW)
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const x = cx + Math.cos(a) * outerR;
    const y = cy + Math.sin(a) * outerR;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  // inner arc (offset circle CCW) — create crescent by "cutting"
  for (let i = steps; i >= 0; i--) {
    const a = (i / steps) * Math.PI * 2;
    const x = cx + offset + Math.cos(a) * innerR;
    const y = cy + Math.sin(a) * innerR;
    g.lineTo(x, y);
  }
  g.closePath();
}
