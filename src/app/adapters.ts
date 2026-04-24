// ── Boundary Service Interfaces ───────────────────────────────────────────────
// Abstract interfaces for the three external boundary services (storage, audio,
// music). Scenes and business logic depend only on these interfaces, not on the
// concrete IndexedDB / Howler implementations.  The composition root (main.ts)
// creates concrete adapters and injects them via scene callbacks.

import type { SfxName } from '../game/audio';
import type { MusicCategory } from '../game/music';
import type {
  PlayerProfile,
  SkillTreeState,
  AchievementState,
  ShopUnlocks,
  GameSettings,
  SaveData,
} from '../game/data/types';
import type { DevelopModeSaveSlot } from '../game/storage';

// ── Storage ───────────────────────────────────────────────────────────────────

export interface IStorageAdapter {
  loadProfile(): Promise<PlayerProfile>;
  saveProfile(p: PlayerProfile): Promise<void>;
  loadSkillTree(): Promise<SkillTreeState>;
  saveSkillTree(s: SkillTreeState): Promise<void>;
  loadAchievements(): Promise<AchievementState>;
  saveAchievements(a: AchievementState): Promise<void>;
  loadShopUnlocks(): Promise<ShopUnlocks>;
  saveShopUnlocks(s: ShopUnlocks): Promise<void>;
  loadSettings(): Promise<GameSettings>;
  saveSettings(s: GameSettings): Promise<void>;
  exportSaveData(): Promise<SaveData>;
  downloadSaveData(data: SaveData): void;
  parseSaveData(json: string): SaveData | null;
  importSaveData(data: SaveData): Promise<void>;
  loadDevelopModeSlots(): Promise<DevelopModeSaveSlot[]>;
  saveDevelopModeSlots(slots: DevelopModeSaveSlot[]): Promise<void>;
}

// ── Audio ─────────────────────────────────────────────────────────────────────

export interface IAudioAdapter {
  playSfx(name: SfxName): void;
  primeSfx(): void;
  isMuted(): boolean;
  setMuted(muted: boolean): void;
  setVolumes(master: number, sfx: number): void;
  getMasterVolume(): number;
  getSfxVolume(): number;
}

// ── Music ─────────────────────────────────────────────────────────────────────

export interface IMusicAdapter {
  playMusic(category: MusicCategory, stageIdx?: number): void;
  stopMusic(): void;
  isMusicPlaying(): boolean;
  setMusicVolume(vol: number, master: number): void;
}
