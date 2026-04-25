# Axiom — AI Agent 開發規範

> 本文件為 AI agent 的**唯一規範入口**。所有 agent 在進行任何操作（程式碼、文件、內容、重構）前均應先讀此文件。
> CLAUDE.md 僅引用本文件。若兩者有衝突，以本文件為準。

---

## 1. 角色定義與適用範圍

本規範適用於所有 AI agent 對此 repo 進行的操作，包括但不限於：

- 功能開發與 Bug 修復
- 遊戲內容新增（敵人、技能、Boss、關卡）
- 重構與架構調整
- 文件維護

遊戲設計守則（世界觀、視覺語言、平衡原則）另列於 [`docs/GAME_DESIGN.md`](./docs/GAME_DESIGN.md)，本文件以引用為主。

---

## 2. 核心開發原則

| 原則 | 說明 |
|---|---|
| **最小改動** | 只改任務需要的範圍，避免無關重構或風格整理混入同一次變更。 |
| **Schema-first** | 新增遊戲內容（敵人/技能/Boss/關卡）優先修改 `src/game/content/` 與 registry，不直接耦合 runtime（特殊需求除外）。 |
| **可測試性** | 業務邏輯偏好純函式；邊界服務以介面注入（見 `src/app/adapters.ts`）；禁止在 `src/` 中呼叫 `alert()`。 |
| **一致性** | UI/敘事/視覺語言須對齊 `STYLE.md` 與主線世界觀（`docs/concept.md`）。 |
| **安全第一** | 不引入資安風險；不破壞現有行為；不移除或弱化無關測試。 |

> **關於 runtime 修改：** 當功能需求確實要求調整行為，直接修改 runtime 是允許的，不需要繞路。確保所有測試通過、build 無誤即為正確。

---

## 3. 實作規範

### 3.1 變更前

1. 閱讀任務相關的原始檔案與文件，確認影響範圍。
2. 確認是否為「遊戲相關」變更（判斷後續是否需要記錄至 ADJUSTMENT_LOG）。
3. 若需求模糊或有衝突，**先提出澄清問題，再動手**。

### 3.2 變更中

- 遵守既有命名慣例與模組分層（見 §4 架構索引）。
- 不改動不在任務範圍內的程式碼，即使看起來可以一起清理。
- 不任意新增 npm 套件；若確實必要，先確認版本安全性。
- 禁止在任何來源中 commit secrets 或硬編碼的憑證。
- UI 元件使用 `src/scenes/ui.ts` 提供的 helpers（`openOverlay`、`createBackButton` 等），不回退為散落式 DOM 複製代碼。
- 圖示一律在 `src/icons.ts` 集中管理（`iconSpan()` / `setIconHtml()`），禁止使用 emoji 作為 UI 圖示。

### 3.3 變更後（必做）

```bash
npm test          # Vitest 單元測試，全部通過才算完成
npm run build     # tsc --noEmit + vite build，確認無型別錯誤與建置失敗
```

- 若修改內容涉及測試覆蓋的邏輯，須同步更新或補充對應測試。
- 不得因「測試難以通過」而刪除或跳過測試。

---

## 4. 模組架構索引

| 路徑 | 職責 |
|---|---|
| `src/main.ts` | 啟動、場景導航、run lifecycle、結算、Developer Mode |
| `src/scenes/play.ts` | 戰鬥循環、技能效果、Boss 觸發、HUD 同步 |
| `src/scenes/ui.ts` | 共用 overlay helpers（所有 Scene 共用） |
| `src/scenes/components/` | 可複用 UI 片段（CardTag、BonusGrid、SkillButton） |
| `src/app/adapters.ts` | 邊界服務介面（IStorageAdapter / IAudioAdapter / IMusicAdapter） |
| `src/app/notificationService.ts` | UI 通知（toast）；禁止使用 `alert()` |
| `src/app/achievementChecker.ts` | 純函式成就判斷 |
| `src/app/runContext.ts` | RunContext interface |
| `src/game/content/` | 遊戲內容 schema（cards / skills / stageThemes / enemies） |
| `src/game/effectEngine.ts` | 統一效果套用（卡牌/裝備/Mirror Boss） |
| `src/game/enemies/registry.ts` | 敵人 stats/elite/spawnBehavior 規範來源 |
| `src/game/enemies/kinds.ts` | ALL_ENEMY_KINDS 常數（唯一定義點） |
| `src/game/bosses/registry.ts` | Boss 與 Stage 對應（Orthogon/Jets/Mirror） |
| `src/game/bosses/runtime/` | 各 Boss AI runtime 實作 |
| `src/game/unlocks.ts` | Boss-gated 內容解鎖邏輯 |
| `src/game/cardLevels.ts` | Run 範圍內的卡牌升級系統 |
| `src/game/music.ts` | Stage BGM（Howler loops） |
| `src/game/content/classes.ts` | 職系 schema（ClassNodeDef、CLASS_LINEAGES、CHARACTER_SLOT_COSTS）|
| `src/game/classes.ts` | 職業純函式（classPassiveBonuses、promoteClass、resetCharacterClass、createCharacterSlot 等）|
| `src/scenes/classCreation.ts` | Class Creation Scene（槽位切換、職業樹、升階確認、重置）|
| `src/icons.ts` | 所有 SVG 圖示（唯一來源） |

---

## 5. 遊戲內容新增 SOP

完整流程見 [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md)，摘要如下：

| 內容類型 | 主要改動點 |
|---|---|
| 新增敵人 | `src/game/content/enemies.ts` → `ENEMY_REGISTRY`；若有新 kind 同步更新 `kinds.ts` |
| 新增技能 | `src/game/content/skills.ts` + `src/game/data/types.ts`（PrimalSkillId）|
| 新增 Boss | `src/game/bosses/` 新增 BossDef → 在 `registry.ts` 註冊 |
| 新增關卡 | `src/game/content/stageThemes.ts` + 解鎖邏輯 + 文件更新 |

每次內容新增後務必執行 `npm test` 與 `npm run build`。

---

## 6. 文件與版本同步規範

### 6.1 ADJUSTMENT_LOG（遊戲相關變更）

每次進行遊戲相關變更（新功能、內容、平衡、重構）後，須在 `docs/ADJUSTMENT_LOG.md` **開頭**追加一筆記錄，格式：

```
- **<變更標題> (v0.0.1-beta-<short SHA>):** <變更摘要，含驗證結果>
```

### 6.2 Version SHA

修改遊戲內容後，同步更新以下欄位為最新 commit 的 short SHA：

```
Version SHA (v0.0.1-beta-): <short-sha>
```

**目前版本**
Version SHA (v0.0.1-beta-): 1768645

---

## 7. 風格規範（摘要）

完整規範見 [`STYLE.md`](./STYLE.md)，以下為最常觸犯的要點：

- **色彩**：一律使用 CSS custom properties（`--bg`、`--fg`、`--accent`、`--muted`、`--chrome`），禁止硬編碼 hex。
- **字體**：全部 monospace；禁止 serif / display 字型。
- **圖示**：純 SVG 幾何；禁止 emoji；所有圖示定義在 `src/icons.ts`。
- **視覺語言**：幾何極簡、冷靜機械感，對齊 `docs/GAME_DESIGN.md` 的世界觀。

---

## 8. 遊戲設計守則（外部參考）

遊戲設計相關的原則（世界觀一致性、平衡調整指引、敘事語氣）另外記錄於：

- [`docs/GAME_DESIGN.md`](./docs/GAME_DESIGN.md) — 遊戲設計守則（AI agent 參考用）
- [`docs/concept.md`](./docs/concept.md) — 完整世界觀、Verb 清單、Deckbuilder spec
- [`docs/main-story.md`](./docs/main-story.md) — 主線模式設計規格

---

## 9. 操作檢查清單

### 動手前
- [ ] 已讀相關來源檔案與文件
- [ ] 確認影響範圍（是否牽涉其他模組/測試）
- [ ] 需求明確（若不確定，先澄清）

### 完成後
- [ ] `npm test` 全數通過
- [ ] `npm run build` 無錯誤
- [ ] 若為遊戲相關變更：已追加 `docs/ADJUSTMENT_LOG.md` 一筆
- [ ] 若修改遊戲內容：已更新 AGENTS.md Version SHA
- [ ] 若新增/修改測試對象：已同步更新或補充對應測試
- [ ] 若新增/修改 UI：已對齊 `STYLE.md` 規範
