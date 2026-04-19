# Axiom 強化卡記錄

資料來源：`src/game/cards.ts`、`src/game/cardLevels.ts`。

## 卡牌種類與能力描述

| ID | 名稱 | 稀有度 | 能力描述 |
| --- | --- | --- | --- |
| `sharp` | Sharp Edge | common | +1 damage |
| `rapid` | Rapid Fire | common | -20% fire interval |
| `velocity` | Velocity | common | +25% projectile speed |
| `fork` | Fork | uncommon | +1 projectile |
| `pierce` | Pierce | uncommon | +1 pierce |
| `crit` | Crit | uncommon | +25% crit chance |
| `plating` | Plating | common | +1 max HP |
| `dash` | Dash | common | +20% move speed |
| `overclock` | Overclock | rare | -35% fire interval |
| `heavy` | Heavy Rounds | rare | +2 damage |
| `rebound` | Rebound | uncommon | +1 ricochet |
| `ignite` | Ignite | rare | Burn 2 dps for 3s |
| `freeze` | Freeze | uncommon | Slow 35% for 2s |
| `arc` | Arc | rare | +1 chain |
| `combustion` | Combustion | rare | Every 10 kills: AoE explosion |
| `desperate` | Desperate | rare | While HP ≤ 2: ×2 damage |
| `kinetic` | Kinetic | uncommon | While moving: +25% crit |
| `stillness` | Stillness | uncommon | While still: -25% fire interval |

## 卡牌等級系統（Card Level System）

資料來源：`src/game/cardLevels.ts`。

### 設計決策

1. **Run 內持久** — 等級在單次 run 內持續累積，run 結束後重置。
2. **重複合併** — Draft 中選到已持有的卡牌時，合併為該卡牌升級（+1 級）。
3. **遞減成長** — 每級追加效果遞減；乘法效果（如 periodMul、speedMul）改走加法疊加，避免數值膨脹。
4. **統一上限** — 所有卡牌共用 `MAX_CARD_LEVEL = 5`。
5. **起始裝備計入** — 裝備欄位的卡牌在 run 開始時以 Lv 1 登錄，也可在 draft 中升級。
6. **特殊效果卡不升級** — Synergy / Evolution / Weapon 類卡牌暫不納入升級系統，後續獨立討論。

### 等級加成係數

| 等級 | 加成比例（佔基礎效果的 %） |
| ---: | ---: |
| 1 | 100% |
| 2 | 70% |
| 3 | 50% |
| 4 | 35% |
| 5 | 25% |

以 Sharp Edge（+1 dmg）為例：Lv 1 → +1、Lv 2 → +1、Lv 3 → +1、Lv 4 → +1、Lv 5 → +1（每級至少 +1，round 後最低 1）。

以 Heavy Rounds（+2 dmg）為例：Lv 1 → +2、Lv 2 → +1（2×0.7=1.4→1）、Lv 3 → +1、Lv 4 → +1、Lv 5 → +1。

### HUD 顯示

遊戲進行中，左上角以小型圖標 + 等級數字顯示目前持有的所有卡牌，由左往右排列。
