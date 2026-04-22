# Axiom — 遊戲設計守則

> 本文件供 AI agent 與貢獻者在進行遊戲設計相關決策時參考。
> 工程流程規範見 [`AGENTS.md`](../AGENTS.md)。
> 完整世界觀與 Deckbuilder spec 見 [`docs/concept.md`](./concept.md)。

---

## 1. 世界觀一致性

Axiom 的世界觀是「幾何形狀即規則，崩潰的定理具象化為敵人」。所有設計決策（敵人外型、卡牌效果名稱、Boss 行為、敘事文字）都應能被這個框架詮釋。

### 敘事語氣

- 冷靜、極簡、機械感。無情緒渲染，無角色對話。
- 輸贏皆不帶慶祝或哀悼；只陳述事實。
- 文字一律使用英文大寫 monospace（UI title card、overlay 標題）。
- Boss 稱呼格式：`BOSS: <NAME> / THEOREM: "<theorem line>"`。

### 命名慣例

| 對象 | 命名風格 | 範例 |
|---|---|---|
| Stage 名稱 | 全大寫英文 Domain 縮寫 | `AXIS`、`WING`、`MIRROR` |
| Boss 名稱 | Pascal Case，幾何/物理隱喻 | `Orthogon`、`Jets`、`Mirror` |
| 卡牌名稱 | Title Case，動詞或名詞短語 | `Axis Lock`、`Rebound+` |
| 技能名稱 | Title Case，直觀描述能力 | `Time Stop`、`Reflect Shield` |
| 敵人種類 | 全小寫，幾何形狀 | `circle`、`pentagon`、`crescent` |

---

## 2. 遊戲平衡原則

### 2.1 核心不變量

- 目標局長：**3–5 分鐘**一把（約 180–300 秒）。
- 死亡後重開應在 3 秒內可操作。
- 玩家 HP 起始值為 3；卡牌 HP 修改應謹慎，避免局長失控。

### 2.2 數值調整指引

- 新增卡牌時，先確認同類現有卡牌的基礎值範圍，保持一致的數值尺度。
- Boss HP / 傷害調整後，在兩種模式下（Normal Story / Develop Mode）各測試一把。
- 技能冷卻 / 持續時間修改時，同步確認 `tests/skills.test.ts` 仍正確反映新數值。
- Stage 強度倍率（Stage 2 = 1.5×、Stage 3 = 2.5×）應只透過 `src/game/entities.ts` 的 spawn 時套用，不直接改 base stats。

### 2.3 解鎖進程

- 新卡牌 / 技能若設有 Boss 門檻，使用 `unlockAfterBoss?: BossId` 欄位，並在 `src/game/unlocks.ts` 的篩選邏輯驗證。
- 線性解鎖順序：Stage 1（Orthogon）→ Stage 2（Jets）→ Stage 3（Mirror）。
- 避免在 Stage 1 即解鎖過強的修飾卡，破壞前期壓力感受。

---

## 3. 視覺設計守則（摘要）

完整規範見 [`STYLE.md`](../STYLE.md)。以下為設計決策時的快速參照：

### 3.1 設計哲學

| 原則 | 意涵 |
|---|---|
| **幾何極簡** | 所有視覺元素（敵人、圖示、卡牌）由基本幾何圖形組成，無具象插畫。 |
| **機械冷靜** | 色調冷靜、精準，不使用情緒性色彩爆發。 |
| **高對比易讀** | UI 在亮 / 暗兩種 Stage 主題下均需清晰可辨。 |
| **Monospace 紀律** | 所有文字使用 monospace 字型，禁止 serif 或 display 字體。 |

### 3.2 新增敵人視覺規則

- 形狀必須是基本幾何圖形（圓、多邊形、線段組合）。
- 填色使用 `STYLE.md §2.4` 定義的淡色調（亮主題）；暗主題下轉為飽和版本。
- 不同種類在 30px 大小下需視覺可分辨。

### 3.3 新增卡牌圖示規則

- 新增卡牌的 glyph SVG 集中定義於 `src/icons.ts` 的 `CARD_GLYPHS`。
- ViewBox 固定 `0 0 24 24`，尺寸 `1.4em × 1.4em`。
- 純幾何線條（stroke-based），不使用文字元素或圖片。

---

## 4. 待討論事項

> 以下為尚未定案、需要後續決策的設計問題。新增待討論項目請附上背景說明。

| 項目 | 描述 | 狀態 |
|---|---|---|
| 色盲友善模式 | 需定義替代色板與切換機制（見 ROADMAP P2） | 待設計 |
| 第四關卡設計 | 新 Domain / Theorem / Boss（見 ROADMAP P1） | 待設計 |
| Daily Seed 機制 | 全球同 seed 每日挑戰，需後端或時間同步方案 | 待設計 |
| 新手 Onboarding | 第一次遊玩的教學波設計 | 待設計 |
