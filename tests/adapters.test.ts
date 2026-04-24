import { describe, it, expect, vi } from 'vitest';
import type { IStorageAdapter, IAudioAdapter, IMusicAdapter } from '../src/app/adapters';

// ── Adapter interface tests ───────────────────────────────────────────────────
// These tests verify that:
//  1. Mock implementations can satisfy each adapter interface (type-level check).
//  2. Callers that depend only on the interface can be exercised without any
//     real IndexedDB / Howler / AudioContext setup.
//
// This demonstrates the testability benefit of the boundary adapter pattern.

// ── IStorageAdapter ──────────────────────────────────────────────────────────

function makeMockStorage(
  overrides: Partial<IStorageAdapter> = {},
): IStorageAdapter {
  return {
    loadProfile: vi.fn().mockResolvedValue({ stats: {}, activeStartShape: 'triangle' }),
    saveProfile: vi.fn().mockResolvedValue(undefined),
    loadSkillTree: vi.fn().mockResolvedValue({ cores: 0, skillPoints: 0, skills: {} }),
    saveSkillTree: vi.fn().mockResolvedValue(undefined),
    loadAchievements: vi.fn().mockResolvedValue({}),
    saveAchievements: vi.fn().mockResolvedValue(undefined),
    loadShopUnlocks: vi.fn().mockResolvedValue({}),
    saveShopUnlocks: vi.fn().mockResolvedValue(undefined),
    loadSettings: vi.fn().mockResolvedValue({}),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    exportSaveData: vi.fn().mockResolvedValue({ version: 1 }),
    downloadSaveData: vi.fn(),
    parseSaveData: vi.fn().mockReturnValue(null),
    importSaveData: vi.fn().mockResolvedValue(undefined),
    loadDevelopModeSlots: vi.fn().mockResolvedValue([]),
    saveDevelopModeSlots: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('IStorageAdapter (mock)', () => {
  it('loadProfile resolves to the stubbed value', async () => {
    const storage = makeMockStorage();
    const profile = await storage.loadProfile();
    expect(profile).toBeDefined();
  });

  it('saveProfile is called with the provided value', async () => {
    const storage = makeMockStorage();
    const fakeProfile = { stats: {}, activeStartShape: 'square' } as Parameters<IStorageAdapter['saveProfile']>[0];
    await storage.saveProfile(fakeProfile);
    expect(storage.saveProfile).toHaveBeenCalledWith(fakeProfile);
  });

  it('parseSaveData returns null for invalid JSON', () => {
    const storage = makeMockStorage({
      parseSaveData: vi.fn().mockReturnValue(null),
    });
    expect(storage.parseSaveData('not json')).toBeNull();
  });

  it('parseSaveData returns an object for valid data', () => {
    const fakeData = { version: 2 };
    const storage = makeMockStorage({
      parseSaveData: vi.fn().mockReturnValue(fakeData),
    });
    expect(storage.parseSaveData(JSON.stringify(fakeData))).toEqual(fakeData);
  });
});

// ── IAudioAdapter ────────────────────────────────────────────────────────────

function makeMockAudio(overrides: Partial<IAudioAdapter> = {}): IAudioAdapter {
  let muted = false;
  let masterVol = 1;
  let sfxVol = 1;
  return {
    playSfx: vi.fn(),
    primeSfx: vi.fn(),
    isMuted: vi.fn().mockImplementation(() => muted),
    setMuted: vi.fn().mockImplementation((m: boolean) => { muted = m; }),
    setVolumes: vi.fn().mockImplementation((master: number, sfx: number) => {
      masterVol = master;
      sfxVol = sfx;
    }),
    getMasterVolume: vi.fn().mockImplementation(() => masterVol),
    getSfxVolume: vi.fn().mockImplementation(() => sfxVol),
    ...overrides,
  };
}

describe('IAudioAdapter (mock)', () => {
  it('isMuted returns false by default', () => {
    const audio = makeMockAudio();
    expect(audio.isMuted()).toBe(false);
  });

  it('setMuted toggles isMuted', () => {
    const audio = makeMockAudio();
    audio.setMuted(true);
    expect(audio.isMuted()).toBe(true);
    audio.setMuted(false);
    expect(audio.isMuted()).toBe(false);
  });

  it('setVolumes updates getMasterVolume and getSfxVolume', () => {
    const audio = makeMockAudio();
    audio.setVolumes(0.8, 0.6);
    expect(audio.getMasterVolume()).toBe(0.8);
    expect(audio.getSfxVolume()).toBe(0.6);
  });

  it('playSfx is callable with SFX names', () => {
    const audio = makeMockAudio();
    audio.playSfx('hit');
    audio.playSfx('draft');
    audio.playSfx('death');
    expect(audio.playSfx).toHaveBeenCalledTimes(3);
  });
});

// ── IMusicAdapter ────────────────────────────────────────────────────────────

function makeMockMusic(overrides: Partial<IMusicAdapter> = {}): IMusicAdapter {
  let playing = false;
  return {
    playMusic: vi.fn().mockImplementation(() => { playing = true; }),
    stopMusic: vi.fn().mockImplementation(() => { playing = false; }),
    isMusicPlaying: vi.fn().mockImplementation(() => playing),
    setMusicVolume: vi.fn(),
    ...overrides,
  };
}

describe('IMusicAdapter (mock)', () => {
  it('isMusicPlaying returns false before playMusic is called', () => {
    const music = makeMockMusic();
    expect(music.isMusicPlaying()).toBe(false);
  });

  it('isMusicPlaying returns true after playMusic', () => {
    const music = makeMockMusic();
    music.playMusic('menu');
    expect(music.isMusicPlaying()).toBe(true);
  });

  it('isMusicPlaying returns false after stopMusic', () => {
    const music = makeMockMusic();
    music.playMusic('level', 0);
    music.stopMusic();
    expect(music.isMusicPlaying()).toBe(false);
  });

  it('playMusic is called with category and stageIdx', () => {
    const music = makeMockMusic();
    music.playMusic('boss', 2);
    expect(music.playMusic).toHaveBeenCalledWith('boss', 2);
  });
});
