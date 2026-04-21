# Contributing to Axiom

## 新增內容 SOP

以下流程適用於新增「敵人 / 技能 / Boss / 關卡」內容，目標是只改 schema 與 registry，不直接把新內容耦合進 runtime 邏輯。

### 1) 新增敵人

1. 在 `src/game/content/enemies.ts` 的 `ENEMY_REGISTRY` 新增敵人資料（`kind`, `stats`, `isElite`, `spawnBehavior`）。
2. 若新增全新 `EnemyKind`，同步更新 `src/game/world.ts` 的 `EnemyKind` union 與 `src/game/enemies/kinds.ts`。
3. 若有新行為模式，擴充敵人 AI/武器系統對應分支（例如 `spawnBehavior` 的處理點）。
4. 更新 `tests/enemies/registry.test.ts` 與相關行為測試。

### 2) 新增技能

1. 在 `src/game/content/skills.ts` 的 `PRIMAL_SKILLS` 與 `SKILL_IDS` 新增技能資料。
2. 同步更新 `src/game/data/types.ts` 的 `PrimalSkillId` 與 `defaultSkillTreeState()`。
3. 在 `src/game/skills.ts`（runtime）補上技能數值函式或行為處理。
4. 更新 `tests/skills.test.ts` 與關聯技能測試。

### 3) 新增 Boss

1. 在 `src/game/bosses/` 新增 Boss 定義（實作 `BossDef`）。
2. 在 `src/game/bosses/registry.ts` 註冊新 Boss 與對應 stage。
3. 若需要獨立 AI runtime，於 `src/game/bosses/runtime/` 增加對應檔案並在 `index.ts` dispatch。
4. 更新 Boss 測試（如 `tests/bosses/*.test.ts`）與文件說明。

### 4) 新增關卡（Stage）

1. 在 `src/game/content/stageThemes.ts` 新增 `StageTheme` 資料（含 `bossId/domainName/theoremLine`）。
2. 依需要更新 stage 解鎖/流程（如 `stageSelect`、run 進程與結算）。
3. 若關卡包含新內容解鎖，補上 `unlocks` 規則與測試。
4. 更新對應文件（例如 `docs/main-story.md`）。

## 驗證流程

每次內容新增或重構後，至少執行：

- `npm test`
- `npm run build`
