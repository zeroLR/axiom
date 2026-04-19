# Axiom 主線模式重構 — Main Story Mode Redesign

> Planning doc — not yet implemented. Reviewed decisions recorded below; execution happens in a follow-up PR per the phasing in §7.

## Context

目前 Axiom 的「Normal Mode」是 3 關 × 8 波、每關第 8 波都是同一隻 **Mirror Boss**（依玩家卡組鏡像產生）。三關只有顏色主題（White Grid / Deep Blue / Dark Core）區分，沒有 Boss 差異、沒有敘事骨架、也沒有 Boss 擊敗後的解鎖感。

使用者希望把 Normal Mode 重新定位為「**主線模式**」，圍繞一個更明確的世界觀設計、每關有洛克人式的獨特主題與 Boss，部分卡片 / 技能只在打敗特定主線 Boss 後解鎖。世界觀與關卡主題必須精心打磨，因為它們決定長線體驗與後續擴充空間。

**使用者決策（已確認）：**
- 關卡數：**維持 3 關**，深化主題與 Boss。
- Mirror Boss：**保留為第 3 關（最終關）Boss**，不改機制；前兩關換成獨立設計的 Boss。
- 解鎖順序：**線性**（過第 N 關才開第 N+1 關）。
- 解鎖範圍：**每關 Boss 解鎖 2–3 張卡 + 1 個 Primal Skill**，只新增內容，現有 27 張卡維持出場即抽。

---

## 1. 世界觀精煉 — Axiom / Domain / Theorem

維持 `docs/concept.md`「沒有敘事角色，只有形狀與規則」的核心戒律。把世界觀由「形狀試煉」升級為一個**極簡幾何神話**，提供主線與擴充錨點：

> 純白網格即「**公理平面**」(Axiom Plane)。當某條被過度推論的定理崩解時，其殘餘以規則化形狀群湧出，侵蝕平面秩序，形成局部**崩塌領域** (Collapse Domain)；每個領域被一條失控的「**定理**」(Theorem) 統治，關底為該定理具象化的**錯誤證明** (Counter-Proof / Boss)。玩家是可被重新定義的初始公理，透過抽卡等同推論步驟重寫自身，擊毀反證、封閉領域。

**敘事表面（唯一）**：每關進入時、第 8 波 Boss 出場時，短暫顯示一行 16px 大寫 monospace：

```
STAGE II — DOMAIN: WING
THEOREM: "edges strike first"
```

完全符合 `STYLE.md`（冷靜、機械感、單色高對比）。不加劇情動畫、不加角色對白。Boss 也不是「人」，是錯誤證明的幾何具象。這條敘事軸給後續擴充（新 Domain / 新 Theorem）留出乾淨接口。

---

## 2. 關卡 × Boss 定案（3 關）

| 關卡 | Domain 主題 | Theorem（規則暗示） | Boss | Boss 攻擊骨架 | 現有主要敵人 |
|---|---|---|---|---|---|
| 1 | **線域 (AXIS)** | "lines converge" — 一切沿直線壓近 | **Orthogon**（十字形，新） | 4 方向軸線掃射 + 預警十字雷射，50% HP 後加對角掃 | circle / square / star（沿用 STAGE_1） |
| 2 | **翼域 (WING)** | "edges strike first" — 攻擊來自邊緣 | **Jets**（紙飛機，沿用 `docs/boss-jets.md`） | 側牆衝刺、Z 字掃場、50% HP 狂暴 + 散射彈 | pentagon / diamond / star（沿用 STAGE_2） |
| 3 | **鏡域 (MIRROR)** | "every inference reflects" — 推論折返至自身 | **Mirror**（現有 `mirrorBoss.ts`，保留） | 既有：依玩家 3 張 run-card 鏡像產生屬性 | cross / crescent / hexagon（沿用 STAGE_3） |

- 第 3 關 Mirror 機制不動；只是從「通用關底」重新定位為「主線最終 Boss — 你的推論折返成反證」。
- Jets 沿用 `docs/boss-jets.md` 既有設計，不另外發明第三種新 Boss，把實作聚焦在 Orthogon + Jets。
- 波次結構（8 波 ending boss、4 分鐘目標）不變；只動 Boss 身分與三關的配色/敘事框。

---

## 3. Boss 基礎架構重構

目前 Boss 身分硬編碼在 `src/game/stageWaves.ts:64,124,186` 的 `{ kind: "boss" }`，所有 Boss 都走 `src/game/mirrorBoss.ts` 與 `src/game/systems/bossWeapon.ts`。需要把 Boss 抽成 registry：

**新檔：**
- `src/game/bosses/types.ts` — 定義 `BossId = "orthogon" | "jets" | "mirror"`、`BossDef { id, displayName, theoremLine, glyph, buildSpec(ctx), install(world, entity) }`、`BossSpec { hp, contactDamage, maxSpeed, weapon, patternKind }`。
- `src/game/bosses/registry.ts` — `BOSS_REGISTRY: Record<BossId, BossDef>` 與 `bossForStage(stageIndex: number): BossDef`。
- `src/game/bosses/mirror.ts` — 把現行 `src/game/mirrorBoss.ts` 的 `mirrorBossSpec` / `applyMirrorSpec` 搬進來、實作 `BossDef`；舊路徑保留一層 re-export shim 免動既有 tests。
- `src/game/bosses/orthogon.ts` — Phase 1 先 fallback 成 standard fan；Phase 2 實作軸線掃射 + 十字雷射。
- `src/game/bosses/jets.ts` — Phase 2 依 `docs/boss-jets.md` 實作側牆衝刺、Z 掃、50% 狂暴。

**修改：**
- `src/game/stageThemes.ts` — `StageTheme` 新增 `bossId: BossId`、`domainName: string`、`theoremLine: string`。三個現有主題填入對應值。
- `src/scenes/play.ts:285` — `applyMirrorBuildOnce` 改為呼叫 `BOSS_REGISTRY[bossForStage(this.stageIndex).id].install(...)`，`mirrorApplied` 欄位改名 `bossApplied`。
- `src/game/systems/bossWeapon.ts` — 以 `spec.patternKind` 分派；既有扇形留作 `"standard"`，Orthogon / Jets 加新 pattern 分支（或新增 `jetsAi.ts` 併跑）。

---

## 4. 解鎖門檻系統

**資料模型（最小擴充）：**
- `src/game/cards.ts` — `Card` 新增選配 `unlockAfterBoss?: BossId`。
- `src/game/skills.ts` — `PrimalSkillDef` 新增選配 `unlockAfterBoss?: BossId`。
- 新檔 `src/game/unlocks.ts` — `bossToStageIndex(id): 0|1|2`、`isCardUnlocked(card, stats)`、`isSkillUnlocked(def, stats)`、`diffUnlocks(before, after)`（給結算畫面公告用）。讀既有 `PlayerStats.normalCleared[0..2]`（`src/game/data/types.ts:32`），不需要新增持久欄位。

**過濾點：**
- `drawOffer()`（`src/game/cards.ts:73`）接受選配 `stats` 參數，shuffle 前把 `isCardUnlocked === false` 濾掉。呼叫端在 `src/main.ts` DraftScene 觸發處。
- Skill tree UI（`src/scenes/skillTree.ts`，若存在；否則於目前顯示 primal skill 的地方）把未解鎖技能顯示為鎖定格，不允許花 core。

**鎖定顯示（符合 STYLE.md 極簡風）：**
- Stage select：未解鎖關卡顯示 `???` Boss 名、`disabled` card-btn、無點擊。
- Draft / 技能樹裡的鎖定項目：glyph 30% 透明、名稱 `???`、描述 `UNLOCKS: DEFEAT ORTHOGON`（或對應 Boss）。

**初始 gated 清單（新內容，不動現有 27 張卡）：**
- 擊敗 **Orthogon** → 新增 2 張卡 `axis-lock`（"彈道只走正軸、+2 傷害"）、`grid-snap`（"於網格交點射擊時暴擊率 +25%"） + 1 新 Primal Skill `axis-freeze`（"2 秒內將所有敵人對齊最近正軸並暈眩"）。
- 擊敗 **Jets** → 新增 2 張卡 `contrail`（"拖曳時留下傷害尾跡"）、`rebound-plus`（"彈跳 +2"） + 現有 `shadowClone` 從 boss-core 解鎖改為 Jets 擊敗後直接解鎖（仍需升級用 core）。
- 擊敗 **Mirror** → 新增 1 張 rare `recursion`（"最後一張抽到的卡效果 ×2"） + 現有 `timeStop` 改為 Mirror 擊敗後解鎖 + 新 Primal Skill `overload`（"短暫射速 × 3、自傷 1"）。

共：**5 張新卡 + 2 個新 Primal Skill + 把既有 2 個 Primal Skill 的解鎖條件綁定 Boss**，數量符合「每關 Boss 2–3 卡 + 1 技能」且不破壞現有卡池手感。

---

## 5. UI 調整

- `src/scenes/mainMenu.ts:55` — `"Normal Mode"` 按鈕改為 `"Main Story"`（副標 `主線模式`），保留現有三角形圖示（STYLE.md §4.3 不動），`MenuAction.normalMode` 內部 id 不動以降低 blast radius。
- `src/scenes/stageSelect.ts` — 顯示格式 `主線 I — 線域 (AXIS)` / `BOSS: ORTHOGON` / `THEOREM: "lines converge"`；Stage N+1 在 `profile.stats.normalCleared[N-1] !== true` 時 disable + `???`。建構子新增接收 `profile`，呼叫端 `src/main.ts` 傳入。
- Endgame / Boss 結算：勝利時對比前後 unlock set，若有新解鎖顯示 `DOMAIN SEALED — UNLOCKED: <card name>, <skill name>`。實作於 `src/main.ts` 的 `settleRun`（約 line 339）用 `diffUnlocks` 計算。
- Boss 出場：第 8 波起始瞬間於 HUD 顯示 1.5s 的 `THEOREM: "..."` title-card（HUD overlay，淡入淡出，不攔截輸入）。

---

## 6. 檔案變更總表

**Modified**
- `src/scenes/mainMenu.ts` — 按鈕文案。
- `src/scenes/stageSelect.ts` — Domain / Theorem 標籤、鎖定渲染、接 `profile`。
- `src/scenes/play.ts` — 換用 `BOSS_REGISTRY`、Boss title-card、非 standard pattern 的 per-frame tick。
- `src/scenes/endgame.ts`（或對應結算畫面）— 解鎖公告 banner。
- `src/scenes/draft.ts` + `src/game/cards.ts`（`drawOffer`）— 依 profile 過濾 pool。
- `src/game/skills.ts` — `unlockAfterBoss` 欄位與過濾。
- `src/game/stageThemes.ts` — 新增 `bossId`、`domainName`、`theoremLine`。
- `src/game/stageWaves.ts` — 說明註記改為「Boss 由 registry 決定」，wave 8 spawn 不再隱含身分。
- `src/game/systems/bossWeapon.ts` — `patternKind` 分派。
- `src/main.ts` — 把 `profile` 接到 stage select / draft，settleRun 裡 `diffUnlocks`。
- `docs/concept.md` — 在 Worldview 下新增一段 Domain / Theorem 敘事定義；Run shape 段註明三關各有獨特 Boss（Orthogon / Jets / Mirror）。
- `docs/ADJUSTMENT_LOG.md` — 依 `AGENTS.md` 規範補一筆 adjustment。
- `STYLE.md` §4.3 — `"Normal Mode"` 行改 `"Main Story / 主線模式"`。
- 既有測試（`tests/` 下引用 `mirrorBossSpec` 的）— 透過 `bosses/mirror.ts` re-export 保持相容。

**New**
- `src/game/bosses/types.ts`
- `src/game/bosses/registry.ts`
- `src/game/bosses/mirror.ts`（從 `mirrorBoss.ts` 搬遷）
- `src/game/bosses/orthogon.ts`
- `src/game/bosses/jets.ts`
- `src/game/unlocks.ts`
- `docs/main-story.md` — 主線世界觀 + 三關設計的 canonical 設計文，給後續擴充用。

---

## 7. 分期上線（Phase 1 已具獨立價值）

**Phase 1 — 骨架（約 1 次 PR）**
- Boss registry 抽象、`mirrorBoss.ts` 搬到 `bosses/mirror.ts`。三關暫時都用 Mirror（玩家體感不變）。
- 主選單改名 `Main Story`。Stage select 加 Domain / Theorem 標籤、線性鎖定。
- 關卡入場 & Boss 出場 title-card（純文字）。
- `concept.md` / `STYLE.md` / `ADJUSTMENT_LOG.md` 同步。

**Phase 2 — 獨立 Boss**
- 實作 Orthogon（Stage 1）、Jets（Stage 2），替換 Mirror。Mirror 留在 Stage 3。
- Boss glyph 新增（`src/icons.ts`）。
- 依新 Boss 血量曲線重調 `NORMAL_STAGE_STRENGTH_MUL`（`src/scenes/play.ts:35`）。

**Phase 3 — 解鎖系統**
- `unlocks.ts`、`unlockAfterBoss` 欄位、`drawOffer` / skill tree 過濾。
- 5 張新卡 + 2 個新 Primal Skill 實裝；既有 `timeStop` / `shadowClone` 解鎖條件改綁 Boss。
- 結算畫面 `DOMAIN SEALED` banner。

分期獨立可出貨：Phase 1 即可 PR / 合入並觀察回饋；Phase 2 才是「洛克人化」的關鍵；Phase 3 把解鎖迴圈閉起來。

---

## 8. 驗證計畫

1. **全新 profile**：主選單顯示 `Main Story`；Stage 1 可選、Stage 2/3 顯示 `???` 鎖定。
2. **清完 Stage 1**：結算畫面出現 `DOMAIN SEALED — UNLOCKED: axis-lock, grid-snap, axis-freeze`；回主選單 Stage 2 解鎖；開 run 後 draft 有機會抽到 `axis-lock`。
3. **Stage 2 失敗**：`normalCleared[1]` 不寫入；Stage 3 保持鎖定。
4. **清完 Stage 3 (Mirror)**：`recursion` / `overload` 解鎖；既有卡池不因解鎖減少其他卡權重過多。
5. **Phase 2 驗證**：Stage 1 Boss 確為 Orthogon（十字軸線攻擊）、Stage 2 Boss 確為 Jets（側牆衝 + Z 掃 + 50% 狂暴）、Stage 3 仍為 Mirror。計時每關 3–5 分鐘內。
6. **舊存檔相容**：import 舊版 profile → 未遊玩過的欄位當作 false，既有卡池全可抽，不出現未解鎖提示（migration：`unlockAfterBoss === undefined` 視為 always unlocked）。
7. **測試**：新增 `tests/bosses/registry.test.ts`（每個 Boss `buildSpec` 決定性）+ 既有 mirror 測試續跑。於 `axiom/` 下 `npm run lint && npm run typecheck && npm test && npm run build`。
8. **手動**：以 iOS Safari portrait（9:16）跑完三關，確認 title-card / 鎖定 UI / draft filter 在小畫面可讀。

---

## 9. 與使用者的剩餘澄清（寫入計畫前已採保守預設）

下列小點以「最小風險預設」先寫入計畫，若要改向再說：
- **按鈕主要語言**：英文 `Main Story`（副標 `主線模式`），與既有代碼庫英文為主一致。若要主顯中文，只需改一行文案。
- **Title-card 數量**：只在 **關卡入場** 與 **Boss 出場** 各顯示一次（共 2 次 / run）。不在一般波次插入，避免牴觸「不情緒渲染」。
- **Orthogon / Jets 在 Phase 1 先全部 fallback 成 Mirror**：玩家 Phase 1 結束不會看到新 Boss AI，只看到新框架 + 鎖定系統。確保 Phase 1 可獨立 ship 並回復。

---

## 10. 關鍵檔案指引（實作時優先打開）

- `src/scenes/play.ts`（Boss 掛載、per-frame tick）
- `src/game/mirrorBoss.ts` → 搬至 `src/game/bosses/mirror.ts`
- `src/game/stageThemes.ts` / `stageWaves.ts`
- `src/game/cards.ts` / `skills.ts`
- `src/scenes/stageSelect.ts` / `mainMenu.ts`
- `src/main.ts`（`startRun` / `settleRun` / scene 組裝）
- `src/game/data/types.ts`（`PlayerStats.normalCleared[]`）
- `docs/concept.md` / `STYLE.md` / `ADJUSTMENT_LOG.md`
