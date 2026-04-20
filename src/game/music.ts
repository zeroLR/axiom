import { Howl } from "howler";

type StageMusicIndex = 0 | 1 | 2;

const STAGE_MUSIC: Record<StageMusicIndex, string[]> = {
  0: [`${import.meta.env.BASE_URL}music/axis-loop.wav`],
  1: [`${import.meta.env.BASE_URL}music/wing-loop.wav`],
  2: [`${import.meta.env.BASE_URL}music/mirror-loop.wav`],
};

const BASE_STAGE_VOLUME: Record<StageMusicIndex, number> = {
  0: 0.55,
  1: 0.55,
  2: 0.6,
};

const tracks: Partial<Record<StageMusicIndex, Howl>> = {};

let currentStage: StageMusicIndex | null = null;
let currentTrack: Howl | null = null;
let musicVolume = 0.5;
let masterVolMul = 1;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function normalizeStage(stageIdx: number): StageMusicIndex {
  if (stageIdx === 1 || stageIdx === 2) return stageIdx;
  return 0;
}

function effectiveVolume(stage: StageMusicIndex): number {
  return BASE_STAGE_VOLUME[stage] * musicVolume * masterVolMul;
}

function getTrack(stage: StageMusicIndex): Howl {
  const cached = tracks[stage];
  if (cached) return cached;
  const track = new Howl({
    src: STAGE_MUSIC[stage],
    preload: true,
    loop: true,
    volume: effectiveVolume(stage),
  });
  tracks[stage] = track;
  return track;
}

/** Set music volume (0..1). */
export function setMusicVolume(vol: number, master: number): void {
  musicVolume = clamp01(vol);
  masterVolMul = clamp01(master);
  if (!currentTrack || currentStage === null) return;
  currentTrack.volume(effectiveVolume(currentStage));
}

/** Start ambient music for a given stage index (0-based). */
export function playMusic(stageIdx: number): void {
  const stage = normalizeStage(stageIdx);
  if (currentStage === stage && currentTrack?.playing()) {
    currentTrack.volume(effectiveVolume(stage));
    return;
  }

  stopMusic();
  currentStage = stage;
  currentTrack = getTrack(stage);
  currentTrack.volume(effectiveVolume(stage));

  try {
    currentTrack.play();
  } catch {
    // Ignore — browsers may block audio before first user gesture.
  }
}

/** Stop all ambient music. */
export function stopMusic(): void {
  if (currentTrack) {
    try {
      currentTrack.stop();
    } catch {
      // Ignore driver/runtime stop errors.
    }
  }
  currentTrack = null;
  currentStage = null;
}

/** Whether music is currently playing. */
export function isMusicPlaying(): boolean {
  return currentTrack?.playing() ?? false;
}
