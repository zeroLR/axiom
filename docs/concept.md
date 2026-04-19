# Axiom

## Pitch
A 3–5 minute reverse bullet-hell where a geometric avatar auto-fires at converging hostile shapes, drafting rune-cards between waves to mutate its own form and build lethal synergies.

## Worldview
- **Setting:** 純白網格即「公理平面」(Axiom Plane)。當某條被過度推論的定理崩解時，其殘餘以規則化形狀群湧出，侵蝕平面秩序，形成局部「崩塌領域」(Collapse Domain)；每個領域被一條失控的「定理」(Theorem) 統治，關底為該定理具象化的「錯誤證明」(Counter-Proof / Boss)。沒有敘事角色，只有形狀與規則。
- **Domains & Theorems (Main Story):**
  - **Stage 1 — 線域 (AXIS):** Theorem "lines converge"。Boss: **Orthogon** (十字形)。
  - **Stage 2 — 翼域 (WING):** Theorem "edges strike first"。Boss: **Jets** (紙飛機)。
  - **Stage 3 — 鏡域 (MIRROR):** Theorem "every inference reflects"。Boss: **Mirror** (鏡像玩家卡組)。
- **Tone:** 冷靜、極簡、機械感。無音樂氾濫，只有乾淨音效與節拍脈衝；輸贏都不帶情緒渲染。
- **Protagonist:** 一個會自動射擊的幾何圖形（起始為三角形）。玩家只用單指在螢幕下半部拖曳來操控移動，射擊完全自動。
- **Antagonist forces:** 從邊緣湧入的敵方形狀群（圓、方、星、多邊形），每波更密、更快、模式不同；每關最終波為該 Domain 的獨特 Boss（Orthogon / Jets / Mirror）。
- **Themes:** 湧現（Emergence）、輸贏皆在牌組選擇、秩序 vs 混沌的幾何隱喻。
- **Sensory palette:**
  - 主色：純白底 + 單色高對比幾何（黑、洋紅、青）
  - 關鍵音：敵人破碎是短促的玻璃「叮」，抽卡是低頻脈衝
  - 簽名元素：每張卡是一個 glyph 符號，不是插畫
- **References:**
  - Games: *Geometry Wars*, *20 Minutes Till Dawn*, *Balatro*
  - Non-game: 包浩斯海報、Brian Eno 環境音、Sol LeWitt 幾何牆繪

## Verbs
玩家秒對秒在做的事（單指直向觸控）：
- **Drag** — 單指在下半螢幕拖曳，幾何體跟隨移動（或 relative-drag / virtual stick，scaffold 階段定案）
- **Dodge** — 穿梭於敵方彈幕與形狀之間
- **(Auto) fire** — 武器按卡組配置自動射擊，無需瞄準
- **Tap to draft** — 每波結束點選 3 張卡中的 1 張
- **Build synergy** — 組合多張卡讓效果疊加/質變
- **Tap to reroll / skip** — 用有限資源換一次重抽或跳過
- **Unlock** — run 結束累積代幣解鎖新卡池/起始形狀

## Audience & scope
- **Scope:** Game jam（一週內 MVP）
- **Session length:** 3–5 分鐘一把；死亡 < 3 秒重開
- **Platform:** mobile web，**直向 (portrait) 觸控為主**；畫面比例鎖 9:16 / 9:19.5，UI 元素尺寸 ≥ 44pt、遊玩區域完全避開拇指遮擋區（底部 25% 為控制熱區）。桌面瀏覽器以鏡像直向視窗支援（非核心）。

## Chosen Genre
deckbuilder

## Why this genre
遊戲的「決策面」幾乎全部在波間抽卡——射擊與移動雖是即時，但勝負由卡組 synergy 決定，而非操作精度。這種「低操作精度要求」正好契合手機直向單指觸控：移動可以靠拖曳，射擊完全自動。因此 deckbuilder skill 的核心教材（卡牌資料結構、隨機 draft、synergy 與縮放難度、shuffle bias 與 effect ordering 的坑）最契合。auto-shooter 的即時層可視為 deckbuilder 的「結算動畫」：卡組是角色，一場遊戲是一次牌組表演。若 `game-deckbuilder` skill 的預設範本過於回合制，會在 scaffold 階段標注偏離點。

## Deckbuilder spec

### 與經典 deckbuilder 的偏離（重要）

Axiom 是 **draft-based real-time deckbuilder**，非 STS 式回合制。以下為對 `game-deckbuilder` 預設範本的偏離：

| 經典項目 | Axiom | 說明 |
|---|---|---|
| Draw / Hand / Discard zones | **無** | 卡牌抽到後即「永久裝備」，不進手牌/棄牌堆 |
| Per-turn energy | **無** | 沒有回合概念；改用 *draft tokens*（重抽次數）作為限資源 |
| Intent telegraph | **改為地面預警線** | 即時敵人沒有「下一步」icon；Boss 技能前 ~0.8 秒在地面畫出警告區 |
| Animation queue | **不需要** | 即時 RAF loop 取代；只有抽卡/升級轉場需要輕量 tween |
| Map node graph | **線性** | Jam 範圍直接線性 8 波，不做分岔 |
| Turn-based combat | **即時 reverse bullet-hell** | 波間有 draft screen，進入波次則為即時 |

shuffle bias、effect ordering、relic 事件 hook、seeded RNG、save/load、synergy 探索——這些 pillar 全部保留。

### Run shape
- **主線模式 (Main Story):** 3 個關卡，線性解鎖。每關最終波為該 Domain 的獨特 Boss：
  - Stage 1 (AXIS): 8 波，Boss = Orthogon
  - Stage 2 (WING): 12 波，Boss = Jets
  - Stage 3 (MIRROR): 15 波，Boss = Mirror（鏡像玩家卡組）
- 波間 **draft screen**：從 3 張隨機卡中選 1，或花 token reroll（同一輪 draft 每次 reroll 消耗 +1）/ 0 token skip
- 全程目標 **3–5 分鐘**；死亡立即 run-over，tap 重開 < 3 秒

### Starting loadout
- **1 張起始武器卡**（依起始形狀而不同）
  - 三角 (預設): *Vertex Shot* — 單發直線彈，中速中傷
  - 方塊 (unlock): *Face Beam* — 四方向同時短程雷射
  - 菱形 (unlock): *Orbit Shard* — 環繞軌道彈
- **avatar stats**：HP 3、speed 中、無被動
- 無起始手牌概念——卡是永久裝備在形狀上的 modifier

### Resource model
- **無 energy / mana**：波內戰鬥不消耗資源
- **Draft tokens**：run 開始給 2 token，擊殺 elite / 完成波次 +1 token；只在 draft screen 消耗（reroll 基礎 1，且同一輪每次 +1）
- **Currency (Shards)**：每波結束依效率給 1–3 shards；run 結束累計到 meta 解鎖

### Card pool (MVP = 24 張)
依作用分類；每類含 common / uncommon / rare：

- **Weapon (6 張)** — 新增一種自動射擊武器槽（軌道彈、雷射、爆裂、追蹤…）
- **Modifier (10 張)** — 修改已裝備武器：+dmg、+fire rate、+proj size、pierce、ricochet、multi-shot、crit
- **Evolution (4 張)** — 改變 avatar 本體：+hp、+speed、shield regen、dash
- **Synergy (4 張)** — 條件觸發：例 "每 10 kills 爆炸"、"低血時傷害 ×2"、"移動時 +crit"

卡池常數在 `cards/pool.ts`；效果由 engine 解釋，**禁止** per-card 寫死邏輯。

### Keyword glossary
Lock 在寫卡前定案：
- **Pierce (N)** — 投射物穿透 N 個敵人後消失
- **Ricochet (N)** — 投射物彈跳 N 次
- **Crit (%)** — 命中時 N% 機率造成 2× 傷害
- **Burn (dps, t)** — 命中賦予 t 秒內每秒 dps 傷害
- **Slow (%, t)** — t 秒內減速 N%
- **Chain (N)** — 跳躍至附近 N 個敵人

### Encounter table
Jam MVP 8 波，spawn budget 遞增：

| Wave | 時長 | 敵人池 | 備註 |
|---|---|---|---|
| 1–2 | 20s | circle (slow) | 教學波 |
| 3–4 | 25s | circle + square (straight line) | 加壓 |
| 5 | 30s | + star (zigzag) | 第一隻 elite |
| 6–7 | 40s | + pentagon (splitter) | 密度高峰 |
| 8 | until-kill | **Mirror Boss** | 吸收玩家 3 張 run-cards 產出技能 |

### Relic / artifact pool
Jam 範圍**合併進 Synergy 卡類**，不做獨立系統。事件 hook（`onKill`、`onHit`、`onWaveStart`、`onDamageTaken`）仍透過 event bus 統一派發（見 `game-systems` § Event bus）。

### Map structure
線性：`w1 → w2 → w3 → w4 → w5 (elite) → w6 → w7 → w8 (boss)`。每波後固定一個 draft screen；不做分岔、商店、rest。

### Run length target
- 一把 ~4 分鐘（目標 180–300 秒）
- 若 MVP 實測 < 2 分鐘代表難度曲線太陡；> 6 分鐘代表 spawn budget 不足

### Win/loss conditions
- **Loss**：HP → 0（即刻 game over 畫面，顯示 deck summary + shards earned）
- **Win**：擊殺 Mirror Boss（同樣結算畫面 + 額外 shards）
- 無 endless mode（jam 外再說）

### Meta-progression scope
Jam 範圍**刻意保守**：
- Shards 累計解鎖 **2 個額外起始形狀**（方塊 / 菱形）
- Shards 解鎖 **6 張進階卡**加入卡池
- 無永久數值 buff（避免破壞 in-run synergy 感受）
- 全部 meta 進度存 localStorage（版本化）
