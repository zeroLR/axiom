# Axiom 重構規劃 — Clean Code Refactor

> Planning & progress doc — 盤點 codebase 現況問題、分四期執行、逐項追蹤進度。
> 各期完成後更新 `docs/ADJUSTMENT_LOG.md`。

---

## 背景與現況問題

Axiom 的整體架構具備模組化基礎（boss registry、unlocks、synergies 等），
但擴充壓力高度集中在兩個巨型檔案，已同時承擔過多責任：

| 檔案 | 行數 | 混合的責任 |
|---|---:|---|
| `src/main.ts` | 3 642 | 啟動初始化 / 場景導航 / run lifecycle / 結算 / 成就 / developer mode / 資料匯入匯出 |
| `src/scenes/play.ts` | 948 | 戰鬥循環 / 技能效果 / Boss 觸發 / Developer 設定 / HUD 同步 |

### 問題一：邏輯職責混雜

- `main.ts` 是一個 3 642 行的單一閉包（`boot()`），所有狀態以捕捉變數共用，無法獨立測試任何一段邏輯。
- `play.ts` 的 `PlayScene` 類別同時包含戰鬥引擎、技能系統、開發者工具、HUD 刷新。

### 問題二：頁面元件重複

- 10 個 Scene 檔案（`shop`、`equipment`、`achievements`、`skillTree`、`draft`、`settings`、`endgame`、`stageSelect`、`mainMenu`、`startShapeSelect`）皆重複：overlay 初始化、標題建立、back 按鈕、card-list/card-btn 組裝流程。
- 共約 200+ 行相同模式散落各處，任何 UI 調整都需同步修改多個檔案。

### 問題三：擴充點不一致

| 擴充對象 | 現況 | 問題 |
|---|---|---|
| 效果（Effect）| `cards.ts`、`equipment.ts`、`mirrorBoss.ts` 各有 switch/map | 加新 effectKind 要改三處；`equipment.ts` 用 stringly-typed string |
| 敵人種類 | `ALL_ENEMY_KINDS` 陣列在 `main.ts`（×2）+ `play.ts`（×1）重複定義 | 新增敵人種類要改三個地方 |
| Boss runtime | 已有 `bosses/registry.ts`，但 AI 仍全集中在 `bossWeapon.ts`（503 行） | Orthogon / Jets / Mirror 邏輯無法獨立修改 |

---

## 重構計劃

### Phase 1 — 先降風險、拆責任骨架

目標：**不改任何平衡數值與玩法**，只把程式碼搬到正確的位置。

#### 1-A：抽出敵人種類常數

- [x] 建立 `src/game/enemies/kinds.ts`
  - 匯出 `ALL_ENEMY_KINDS` as const tuple（取代三處重複陣列）
- [x] 更新 `src/scenes/play.ts`（`createDefaultEnemyStats`）import from kinds.ts
- [x] 更新 `src/main.ts`（`applyDeveloperEnemyEntries`、`openDeveloperEnemyMenu`）import from kinds.ts

#### 1-B：Scene 共用 UI 函式庫

- [x] 建立 `src/scenes/ui.ts`
  - `openOverlay(opts?)` — 初始化 overlay-scroll，回傳 `{ overlay, inner, content }`
  - `initOverlay()` — 無 scroll 容器版（供 endgame / settings / mainMenu）
  - `closeOverlay(opts?)` — 清空並隱藏
  - `createBackButton(onClick, label?)` — 標準返回按鈕
  - `createCardList()` — `div.card-list` 容器
  - `createBodyScroll()` — `div.overlay-body-scroll`
  - `createOverlayTitle(text)` — `div.overlay-title`
  - `createOverlaySub(text)` — `div.overlay-sub`
- [x] 以 `src/scenes/achievements.ts` 切換為 ui.ts helpers
- [x] 以 `src/scenes/endgame.ts` 切換為 ui.ts helpers
- [x] `src/scenes/shop.ts` 切換為 ui.ts helpers
- [x] `src/scenes/equipment.ts` 切換為 ui.ts helpers
- [x] `src/scenes/skillTree.ts` 切換為 ui.ts helpers
- [x] `src/scenes/stageSelect.ts` 切換為 ui.ts helpers
- [x] `src/scenes/startShapeSelect.ts` 切換為 ui.ts helpers
- [x] `src/scenes/settings.ts` 切換為 ui.ts helpers
- [x] `src/scenes/mainMenu.ts` 切換為 ui.ts helpers

#### 1-C：抽出成就檢查為純函式

- [x] 建立 `src/app/achievementChecker.ts`
  - 輸入：`RunResult`、`PlayerStats`、`EquipmentLoadout`、`ownedSkins`、`normalStageWaveTarget`
  - 輸出：`AchievementId[]`（本次應解鎖的 ID 列表）
  - 零副作用，可獨立測試
- [x] `src/main.ts` 的 `settleRun` 改為呼叫 `checkRunAchievements()`
- [x] 新增 `tests/achievementChecker.test.ts`（25 個測試案例）

#### 1-D：抽出 Run Coordinator 介面定義

- [x] 建立 `src/app/runContext.ts`
  - `RunContext` interface（mode / stageIndex / developMode）
- [x] `src/main.ts` 中的 `currentRun` 型別改用 `RunContext`

---

### Phase 2 — 核心遊戲領域抽象

#### 2-A：統一 Effect Engine

- [x] 建立 `src/game/effectEngine.ts`
  - 定義 `EquipEffectKind` 嚴格 union（取代 `equipment.ts` 的 `effectKind: string`）
  - 匯出 `applyEffectToWorld(effect, world, avatarId)` 統一函式
  - `cards.ts` 的 `applyCard`、`equipment.ts` 的 `applyEquipment`、`mirrorBoss.ts` 的鏡像 switch 均可呼叫同一核心
- [x] 更新 `src/game/data/shop.ts` 使用 `EquipEffectKind`
- [x] 更新 `src/game/equipment.ts` 使用 `EquipEffectKind`
- [x] 新增 effect engine 單元測試

#### 2-B：EnemyRegistry — stats + 行為元資料

- [x] 建立 `src/game/enemies/registry.ts`
  - `EnemyDef` interface：`{ kind, stats, isElite?, spawnBehavior? }`
  - `ENEMY_REGISTRY: Record<EnemyKind, EnemyDef>`（取代 `entities.ts` 的 `ENEMY_STATS` + `ELITE_KINDS`）
  - `getEnemyStats(kind): EnemyStats`、`isEliteKind(kind): boolean` 改為查 registry
- [x] 更新 `src/game/entities.ts`（`spawnEnemy`、`spawnEnemyAt`）使用 registry
- [x] 更新 `docs/ENEMY.md` 指向 registry 作為 canonical 資料來源

#### 2-C：Boss Runtime 拆分

- [x] 建立 `src/game/bosses/runtime/` 目錄
  - `orthogon.ts` — Orthogon AI tick 函式（從 `bossWeapon.ts` 抽出）
  - `jets.ts` — Jets AI tick 函式（從 `bossWeapon.ts` 抽出）
  - `mirror.ts` — Mirror abilities tick（從 `bossWeapon.ts` 抽出）
  - `index.ts` — re-export + dispatch by `bossPattern`
- [x] 縮減 `src/game/systems/bossWeapon.ts` 至純入口 dispatch（約 50 行）
- [x] 新增各 boss runtime 的隔離測試

---

### Phase 3 — 頁面元件職責分離（承 Phase 1-B 完成後）

- [ ] Scene 只保留「畫面狀態與事件」邏輯，不直接寫 DOM
- [ ] DOM 組裝全部透過 `src/scenes/ui.ts` helpers 或更細粒度元件
- [x] 建立 `src/scenes/components/` — 可複用的 UI 片段（CardTag、BonusGrid、SkillButton 等）
- [x] Pause overlay（目前在 `main.ts`）提取為 `src/scenes/pause.ts`

---

### Phase 4 — 內容 Schema 化 + 測試分層補強

- [ ] 敵人、技能、卡牌、關卡資料改為 schema-first（資料物件 / 型別與業務邏輯分離）
- [ ] 補測試：
  - [ ] `tests/achievementChecker.test.ts`（Phase 1-C 新增）
  - [ ] `tests/effectEngine.test.ts`（Phase 2-A 新增）
  - [ ] `tests/enemies/registry.test.ts`（Phase 2-B 新增）
  - [ ] `tests/bosses/orthogon.test.ts`（Phase 2-C 新增）
  - [ ] `tests/bosses/jets.test.ts`（Phase 2-C 新增）
- [ ] 建立「新增內容 SOP」（`docs/CONTRIBUTING.md` §新增敵人 / 技能 / Boss / 關卡）

---

## 其他待討論的重構建議

| 項目 | 說明 | 優先度 |
|---|---|---|
| 淘汰 stringly-typed effectKind | `equipment.ts` 的 `effectKind: string` 改為嚴格 union | 隨 Phase 2-A |
| UI 通知統一化 | 逐步以 notification service 取代 `alert()`（9 處）；可獨立測試 | P2 |
| 邊界服務抽象 | storage / audio / music 以 adapter 介面隔離，方便測試與替換 | P3 |
| 新增內容 SOP | 完成 registry 模式後，撰寫「新增 X 只需改 registry + content」指引 | Phase 4 |

---

## 分期策略

```
Phase 1（骨架）→ Phase 2（領域抽象）→ Phase 3（UI 元件）→ Phase 4（Schema + 測試）
```

- 每期都能獨立 ship，不影響現有玩法。
- Phase 1 完成後，新增敵人種類只需改 `kinds.ts`；新增 Boss 只需改 registry。
- Phase 2 完成後，新增效果類型只需擴充 `effectEngine.ts` 的 union + 實作函式。
- Phase 3 完成後，新增 Scene 只需寫業務邏輯，不需複製 DOM 模板。
- Phase 4 完成後，新增任何遊戲內容都有 SOP + 自動驗證。

---

## 關鍵檔案索引

| 階段 | 新增 | 修改 |
|---|---|---|
| Phase 1-A | `src/game/enemies/kinds.ts` | `src/scenes/play.ts`, `src/main.ts`（×2） |
| Phase 1-B | `src/scenes/ui.ts` | 所有 10 個 Scene 檔案 |
| Phase 1-C | `src/app/achievementChecker.ts`, `tests/achievementChecker.test.ts` | `src/main.ts`（settleRun） |
| Phase 1-D | `src/app/runContext.ts` | `src/main.ts`（currentRun 型別） |
| Phase 2-A | `src/game/effectEngine.ts`, `tests/effectEngine.test.ts` | `src/game/equipment.ts`, `src/game/data/shop.ts`, `src/game/cards.ts`, `src/game/mirrorBoss.ts` |
| Phase 2-B | `src/game/enemies/registry.ts`, `tests/enemies/registry.test.ts` | `src/game/entities.ts` |
| Phase 2-C | `src/game/bosses/runtime/*.ts` | `src/game/systems/bossWeapon.ts` |
| Phase 3 | `src/scenes/components/*.ts`, `src/scenes/pause.ts` | 所有 Scene 檔案 |
| Phase 4 | `tests/*.test.ts`（多個）, `docs/CONTRIBUTING.md` | 各 registry / schema 檔案 |
