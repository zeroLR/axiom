import { Howl } from 'howler';

// ── Music categories ────────────────────────────────────────────────────────

export type MusicCategory = 'menu' | 'level' | 'boss';

const MENU_TRACKS: string[] = [
  `${import.meta.env.BASE_URL}music/menu/menu-ludum-dare-30-06.ogg`,
];

const LEVEL_TRACKS: Record<number, string> = {
  0: `${import.meta.env.BASE_URL}music/level/level-axis-VGMA-Challenge-21.ogg`,
  1: `${import.meta.env.BASE_URL}music/level/level-wing-VGMA-Challenge-24.ogg`,
  2: `${import.meta.env.BASE_URL}music/level/leve-mirror-VGMA-Challenge-08.ogg`,
};

const BOSS_TRACKS: Record<number, string> = {
  0: `${import.meta.env.BASE_URL}music/boss/boss-Orthogon-Ludum-Dare-30-09.ogg`,
  1: `${import.meta.env.BASE_URL}music/boss/boss-Jets-Ludum-Dare-38-04.ogg`,
  2: `${import.meta.env.BASE_URL}music/boss/boss-Mirror-VGMA-Challenge-20.ogg`,
};

// ── State ───────────────────────────────────────────────────────────────────

const howlCache = new Map<string, Howl>();

let currentHowl: Howl | null = null;
let currentKey = '';
let musicVolume = 0.5;
let masterVolMul = 1;

const CROSSFADE_MS = 800;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function effectiveVolume(): number {
  return musicVolume * masterVolMul;
}

function getHowl(src: string): Howl {
  const cached = howlCache.get(src);
  if (cached) return cached;
  const h = new Howl({
    src: [src],
    preload: true,
    loop: true,
    volume: 0,
  });
  howlCache.set(src, h);
  return h;
}

function resolveSrc(category: MusicCategory, stageIdx: number): string | null {
  switch (category) {
    case 'menu':
      return MENU_TRACKS[0] ?? null;
    case 'level':
      return LEVEL_TRACKS[stageIdx] ?? LEVEL_TRACKS[0] ?? null;
    case 'boss':
      return BOSS_TRACKS[stageIdx] ?? BOSS_TRACKS[0] ?? null;
  }
}

// ── Crossfade helper ────────────────────────────────────────────────────────

function fadeOut(howl: Howl, duration: number): void {
  howl.fade(howl.volume(), 0, duration);
  setTimeout(() => {
    try {
      howl.stop();
    } catch {
      /* ignore */
    }
  }, duration + 50);
}

function fadeIn(howl: Howl, targetVol: number, duration: number): void {
  howl.volume(0);
  try {
    howl.play();
  } catch {
    /* blocked before gesture */
  }
  howl.fade(0, targetVol, duration);
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Set music volume (0..1). */
export function setMusicVolume(vol: number, master: number): void {
  musicVolume = clamp01(vol);
  masterVolMul = clamp01(master);
  if (currentHowl) {
    currentHowl.volume(effectiveVolume());
  }
}

/** Play music for a given category and stage with crossfade. */
export function playMusic(category: MusicCategory, stageIdx = 0): void {
  const src = resolveSrc(category, stageIdx);
  if (!src) return;

  const key = `${category}:${stageIdx}`;
  if (key === currentKey && currentHowl?.playing()) {
    currentHowl.volume(effectiveVolume());
    return;
  }

  const next = getHowl(src);
  const vol = effectiveVolume();

  if (currentHowl && currentHowl !== next) {
    fadeOut(currentHowl, CROSSFADE_MS);
  }

  currentKey = key;
  currentHowl = next;
  fadeIn(next, vol, CROSSFADE_MS);
}

/** Stop all music with a fade-out. */
export function stopMusic(): void {
  if (currentHowl) {
    fadeOut(currentHowl, CROSSFADE_MS);
  }
  currentHowl = null;
  currentKey = '';
}

/** Whether music is currently playing. */
export function isMusicPlaying(): boolean {
  return currentHowl?.playing() ?? false;
}
