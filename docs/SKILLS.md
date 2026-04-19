# Axiom 特殊 Skill 記錄

資料來源：`src/game/skills.ts`。

## 特殊 Skill 種類與能力描述

| ID | 名稱 | 描述 | 基礎持續時間 | 基礎冷卻時間 |
| --- | --- | --- | ---: | ---: |
| `timeStop` | Time Stop | Slows all enemies and projectiles to near-zero speed. | 5 秒 | 30 秒 |
| `shadowClone` | Shadow Clone | Summons a clone that inherits part of your power. | 5 秒 | 30 秒 |
| `reflectShield` | Reflect Shield | Blocks all damage and reflects enemy projectiles back. | 3 秒 | 35 秒 |
| `barrage` | Barrage | Fires a burst of projectiles in all directions. | 2 秒 | 25 秒 |
| `lifestealPulse` | Lifesteal Pulse | Emits a pulse that damages nearby enemies and heals you. | 4 秒 | 40 秒 |

## 升級規則（目前實作）

- 最高等級：**10**（`MAX_SKILL_LEVEL`）
- 升級花費：`20 + 15 * 當前等級`（滿級時不可繼續升級）
- 持續時間：`baseDuration + durationPerLevel * 等級`
- 冷卻時間：`max(5, baseCooldown - cooldownPerLevel * 等級)`
- `timeStop`：每級持續時間 +0.8 秒，冷卻 -2 秒
- `shadowClone`：每級持續時間 +0.5 秒，冷卻 -2 秒
- `reflectShield`：每級持續時間 +0.4 秒，冷卻 -2 秒
- `barrage`：每級持續時間 +0.3 秒，冷卻 -1.5 秒；投射物數量 12 + 2×等級
- `lifestealPulse`：每級持續時間 +0.5 秒，冷卻 -2.5 秒；範圍 80 + 10×等級

## 資源循環

- **Primal Cores**（✧）：Boss 掉落，用於抽取技能
- **Skill Points**：重複抽取已有技能時獲得 15 點，用於升級
- 花費 1 Core 抽取隨機技能；若已解鎖則轉為 Skill Points
