import { Howl, Howler } from 'howler';

export type SfxName = 'hit' | 'draft' | 'death';

// Relative paths resolve under Vite's configured `base`, so this works for both
// dev and prod GH Pages builds.
const SOURCES: Record<SfxName, string> = {
  hit: `${import.meta.env.BASE_URL}sfx/hit.wav`,
  draft: `${import.meta.env.BASE_URL}sfx/draft.wav`,
  death: `${import.meta.env.BASE_URL}sfx/death.wav`,
};

const VOLUMES: Record<SfxName, number> = {
  hit: 0.35,
  draft: 0.55,
  death: 0.7,
};

const sounds: Partial<Record<SfxName, Howl>> = {};
const lastPlayedAt: Partial<Record<SfxName, number>> = {};
const MIN_INTERVAL_MS: Partial<Record<SfxName, number>> = { hit: 40 };

let muted = false;

function get(name: SfxName): Howl {
  const cached = sounds[name];
  if (cached) return cached;
  const h = new Howl({
    src: [SOURCES[name]],
    volume: VOLUMES[name],
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
    get(name).play();
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
