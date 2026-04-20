import { Howl, Howler } from 'howler';

export type SfxName = 'hit' | 'draft' | 'death';

// Relative paths resolve under Vite's configured `base`, so this works for both
// dev and prod GH Pages builds.
const SOURCES: Record<SfxName, string> = {
  hit: `${import.meta.env.BASE_URL}sfx/hit.wav`,
  draft: `${import.meta.env.BASE_URL}sfx/draft.wav`,
  death: `${import.meta.env.BASE_URL}sfx/death.wav`,
};

const BASE_VOLUMES: Record<SfxName, number> = {
  hit: 0.35,
  draft: 0.55,
  death: 0.7,
};

const sounds: Partial<Record<SfxName, Howl>> = {};
const lastPlayedAt: Partial<Record<SfxName, number>> = {};
const MIN_INTERVAL_MS: Partial<Record<SfxName, number>> = { hit: 40 };

let muted = false;
let masterVolume = 1;
let sfxVolume = 1;

function get(name: SfxName): Howl {
  const cached = sounds[name];
  if (cached) return cached;
  const h = new Howl({
    src: [SOURCES[name]],
    volume: BASE_VOLUMES[name] * sfxVolume * masterVolume,
    preload: true,
  });
  sounds[name] = h;
  return h;
}

export function primeSfx(): void {
  for (const n of Object.keys(SOURCES) as SfxName[]) get(n);
}

export function playSfx(name: SfxName): void {
  if (muted) return;
  const floor = MIN_INTERVAL_MS[name];
  if (floor !== undefined) {
    const now = performance.now();
    const last = lastPlayedAt[name] ?? 0;
    if (now - last < floor) return;
    lastPlayedAt[name] = now;
  }
  try {
    const h = get(name);
    h.volume(BASE_VOLUMES[name] * sfxVolume * masterVolume);
    h.play();
  } catch {
    // Ignore — browsers sometimes reject before first user gesture.
  }
}

export function setMuted(next: boolean): void {
  muted = next;
  Howler.mute(next);
}

export function isMuted(): boolean {
  return muted;
}

/** Update volume levels. Call when settings change. */
export function setVolumes(master: number, sfx: number): void {
  masterVolume = Math.max(0, Math.min(1, master));
  sfxVolume = Math.max(0, Math.min(1, sfx));
}

/** Get current master volume (0..1). */
export function getMasterVolume(): number { return masterVolume; }
/** Get current SFX volume (0..1). */
export function getSfxVolume(): number { return sfxVolume; }
