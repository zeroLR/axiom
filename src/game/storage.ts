// ── IndexedDB persistence layer ─────────────────────────────────────────────
// Thin wrapper around the raw IndexedDB API. No external deps; keeps the
// bundle tiny. Each logical store is a separate object-store keyed by a fixed
// singleton key ("v1") so we can just `put`/`get` the entire blob.

import {
  SCHEMA_VERSION,
  defaultPlayerProfile,
  defaultEnemyKills,
  defaultTalentState,
  defaultEquipmentLoadout,
  defaultSkillTreeState,
  defaultAchievementState,
  defaultShopUnlocks,
  defaultGameSettings,
  type PlayerProfile,
  type EquipmentLoadout,
  type SkillTreeState,
  type AchievementState,
  type ShopUnlocks,
  type GameSettings,
  type SaveData,
} from "./data/types";
import { emptyFragmentDetailRecord, FRAGMENT_META } from "./fragments";

const DB_NAME = "axiom";
const DB_VERSION = 2; // IndexedDB schema version (bump to trigger onupgradeneeded)
const STORES = [
  "profile",
  "equipment",
  "skillTree",
  "achievements",
  "shop",
  "settings",
  "developSlots",
] as const;
type StoreName = (typeof STORES)[number];

const KEY = "v1"; // singleton key inside each store

// ── Open / create DB ────────────────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name);
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

// ── Low-level helpers ───────────────────────────────────────────────────────

async function getStore<T>(store: StoreName, fallback: T): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(KEY);
    req.onsuccess = () => resolve((req.result as T | undefined) ?? fallback);
    req.onerror = () => reject(req.error);
  });
}

async function putStore<T>(store: StoreName, value: T): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Public typed accessors ──────────────────────────────────────────────────

export async function loadProfile(): Promise<PlayerProfile> {
  const raw = await getStore("profile", defaultPlayerProfile());
  const base = defaultPlayerProfile();
  const detailedBase = emptyFragmentDetailRecord();
  const rawDetailed = raw.fragments?.detailed ?? {};
  const detailed = { ...detailedBase };
  for (const meta of FRAGMENT_META) {
    detailed[meta.id] = Number(rawDetailed[meta.id] ?? detailedBase[meta.id]) || 0;
  }
  const enemyKills = { ...defaultEnemyKills(), ...(raw.stats?.enemyKills ?? {}) };
  const talentBase = defaultTalentState();
  const rawTalentLevels = raw.talents?.levels ?? {};
  return {
    ...base,
    ...raw,
    activeStartShape: raw.activeStartShape ?? base.activeStartShape,
    fragments: {
      basic: raw.fragments?.basic ?? 0,
      elite: raw.fragments?.elite ?? 0,
      boss: raw.fragments?.boss ?? 0,
      detailed,
    },
    talents: {
      levels: {
        ...talentBase.levels,
        ...rawTalentLevels,
      },
    },
    stats: {
      ...base.stats,
      ...raw.stats,
      enemyKills,
      totalPointsEarned: raw.stats?.totalPointsEarned ?? base.stats.totalPointsEarned,
      // Expand normalCleared to cover all 5 stages (forward-compat migration).
      normalCleared: base.stats.normalCleared.map(
        (b, i) => (raw.stats?.normalCleared?.[i] ?? b),
      ),
    },
  };
}
export async function saveProfile(p: PlayerProfile): Promise<void> {
  return putStore("profile", p);
}

export async function loadEquipment(): Promise<EquipmentLoadout> {
  return getStore("equipment", defaultEquipmentLoadout());
}
export async function saveEquipment(e: EquipmentLoadout): Promise<void> {
  return putStore("equipment", e);
}

export async function loadSkillTree(): Promise<SkillTreeState> {
  const raw = await getStore("skillTree", defaultSkillTreeState());
  // Migrate: ensure all skill IDs exist (handles v1 → v2 upgrade).
  const base = defaultSkillTreeState();
  return {
    cores: raw.cores ?? base.cores,
    skillPoints: raw.skillPoints ?? base.skillPoints,
    skills: { ...base.skills, ...raw.skills },
  };
}
export async function saveSkillTree(s: SkillTreeState): Promise<void> {
  return putStore("skillTree", s);
}

export async function loadAchievements(): Promise<AchievementState> {
  const raw = await getStore("achievements", defaultAchievementState());
  // Migrate: ensure all achievement IDs exist (handles v1 → v2 upgrade).
  const base = defaultAchievementState();
  return { ...base, ...raw };
}
export async function saveAchievements(a: AchievementState): Promise<void> {
  return putStore("achievements", a);
}

export async function loadShopUnlocks(): Promise<ShopUnlocks> {
  return getStore("shop", defaultShopUnlocks());
}
export async function saveShopUnlocks(s: ShopUnlocks): Promise<void> {
  return putStore("shop", s);
}

export async function loadSettings(): Promise<GameSettings> {
  const raw = await getStore("settings", defaultGameSettings());
  const base = defaultGameSettings();
  return {
    ...base,
    ...raw,
    developerMode: raw.developerMode ?? base.developerMode,
  };
}
export async function saveSettings(s: GameSettings): Promise<void> {
  return putStore("settings", s);
}

export interface DevelopModeSaveSlot {
  name: string;
  savedAt: number | null;
  config: unknown | null;
}

export const DEVELOP_MODE_SLOT_COUNT = 10;

export function defaultDevelopModeSlots(): DevelopModeSaveSlot[] {
  return Array.from({ length: DEVELOP_MODE_SLOT_COUNT }, (_, index) => ({
    name: `slot ${index + 1}`,
    savedAt: null,
    config: null,
  }));
}

export async function loadDevelopModeSlots(): Promise<DevelopModeSaveSlot[]> {
  const raw = await getStore<unknown[]>("developSlots", []);
  const base = defaultDevelopModeSlots();
  if (!Array.isArray(raw)) return base;
  return base.map((slot, index) => {
    const row = raw[index];
    if (!row || typeof row !== "object") return slot;
    const candidate = row as Record<string, unknown>;
    return {
      name:
        typeof candidate.name === "string" && candidate.name.trim().length > 0
          ? candidate.name.slice(0, 40)
          : slot.name,
      savedAt:
        typeof candidate.savedAt === "number" && Number.isFinite(candidate.savedAt)
          ? candidate.savedAt
          : null,
      config: candidate.config ?? null,
    };
  });
}

export async function saveDevelopModeSlots(slots: DevelopModeSaveSlot[]): Promise<void> {
  const base = defaultDevelopModeSlots();
  const normalized = base.map((slot, index) => {
    const row = slots[index];
    if (!row) return slot;
    return {
      name: (row.name?.trim() || slot.name).slice(0, 40),
      savedAt:
        typeof row.savedAt === "number" && Number.isFinite(row.savedAt)
          ? row.savedAt
          : null,
      config: row.config ?? null,
    };
  });
  return putStore("developSlots", normalized);
}

// ── Export / Import ─────────────────────────────────────────────────────────

export async function exportSaveData(): Promise<SaveData> {
  const [profile, equipment, skillTree, achievements, shop, settings] =
    await Promise.all([
      loadProfile(),
      loadEquipment(),
      loadSkillTree(),
      loadAchievements(),
      loadShopUnlocks(),
      loadSettings(),
    ]);
  return { version: SCHEMA_VERSION, profile, equipment, skillTree, achievements, shop, settings };
}

export function downloadSaveData(data: SaveData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `axiom-save-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse and validate an imported JSON blob. Returns null if invalid. */
export function parseSaveData(json: string): SaveData | null {
  try {
    const obj = JSON.parse(json) as Record<string, unknown>;
    if (typeof obj !== "object" || obj === null) return null;
    if (typeof obj.version !== "number") return null;
    // Minimal shape check — trust the version field for forward compat.
    if (!obj.profile || !obj.equipment || !obj.skillTree || !obj.achievements || !obj.shop || !obj.settings) {
      return null;
    }
    return obj as unknown as SaveData;
  } catch {
    return null;
  }
}

export async function importSaveData(data: SaveData): Promise<void> {
  await Promise.all([
    saveProfile(data.profile),
    saveEquipment(data.equipment),
    saveSkillTree(data.skillTree),
    saveAchievements(data.achievements),
    saveShopUnlocks(data.shop),
    saveSettings(data.settings),
  ]);
}
