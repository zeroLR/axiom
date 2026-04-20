# MIRROR — Boss 參考文件

> **關卡：** 第三關（以及所有生存模式的鏡像 Boss 波次）

---

## 基礎數值

| 數值 | 內容 |
|---|---|
| 血量 | 400（基礎值） |
| 接觸傷害 | 1（基礎值） |
| 最大速度 | 50 像素/秒（基礎值） |
| 武器射擊間隔 | 1.1 秒 |
| 子彈速度 | 200 像素/秒 |
| 每次射擊數 | 1（基礎值） |
| 攻擊模式 | `standard`（朝玩家扇形散射） |

> 所有基礎數值皆會依玩家本局抽取的卡牌進行縮放。詳見下方「數值縮放」。

---

## 描述

Mirror 是一個反射型 Boss，其戰鬥強度直接反映玩家在本局中收集的卡牌。每張攻擊性卡牌讓它射擊更強；每張移動卡牌讓它速度更快。這創造了一種動態難度曲線：玩家愈強，Boss 也愈強。

Mirror 使用標準扇形射擊模式（朝玩家方向散射，擴散角度 ±`BOSS_FAN_SPREAD` = 0.22 弧度），沒有額外的階段式 AI。

---

## 依玩家卡牌縮放數值

Mirror 在安裝時讀取完整的卡牌選擇紀錄，並套用以下鏡像規則：

| 卡牌效果 | 鏡像縮放方式 |
|---|---|
| `damageAdd +N` | Boss `weapon.damage += N`、`contactDamage += N` |
| `periodMul ×M` | Boss `weapon.period = max(0.2, period × M)` |
| `projectileSpeedMul ×M` | Boss `weapon.projectileSpeed *= M` |
| `projectilesAdd +N` | Boss `weapon.projectiles += N` |
| `pierceAdd +N` | Boss `hp += N × 8`（穿透對射擊無效，改為增加血量） |
| `critAdd +P` | Boss `weapon.crit = min(1, crit + P)` |
| `maxHpAdd +N` | Boss `hp += N × 10` |
| `speedMul ×M` | Boss `maxSpeed *= M` |
| `ricochetAdd +N` | Boss `hp += N × 6`（反彈噪音過大，改為增加血量） |
| `chainAdd +N` | Boss `weapon.projectiles += N` |
| `burnAdd (dps, dur)` | Boss `weapon.damage += max(1, round(dps × dur × 0.25))` |
| `slowAdd (pct)` | Boss `maxSpeed *= 1 + pct × 0.5` |
| `synergy: combustion` | Boss `weapon.damage += 2` |
| `synergy: desperate` | Boss `hp += 30` |
| `synergy: overdrive` | Boss `maxSpeed *= 1.1` |
| `synergy: pierce` | Boss `hp += 15` |
| `synergy: crystal` | Boss `weapon.damage += 1` |
| 其他協同效應 | 無效果 |

---

## 攻擊模式：標準扇形

Mirror 沒有階段式 AI，使用標準 Boss 武器迴圈發射瞄準型扇形彈幕：

- **鎖定角度：** 在射擊前 `BOSS_TELEGRAPH_LEAD`（0.8 秒）鎖定玩家位置
- **擴散範圍：** ±`BOSS_FAN_SPREAD`（0.22 弧度），分佈於 `projectiles` 發子彈之間
- **冷卻：** 每次射擊後重置為 `weapon.period`

---

## 激怒機制

Mirror 沒有激怒機制，難度完全來自於與玩家卡牌的數值縮放。

---

## 生存模式

在生存模式中，Mirror 出現於每個鏡像 Boss 波次（見 `isMirrorBossWave()`）。數值仍反映該時間點的卡牌選擇記錄。

---

## 開發者模式

透過開發者模式生成（種類 = `mirror`）時，會以空的卡牌選擇清單呼叫 `buildSpec([])`，產生上方的基礎數值。之後可透過敵人數值滑桿覆蓋血量、速度、攻擊等屬性。

---

## AI 狀態欄位

| 欄位 | 用途 |
|---|---|
| `bossPattern` | `"standard"` — 使用通用扇形射擊 AI |
| `bossPhase` | 未使用（無階段切換） |
| `bossTimer` | 未使用 |
| `bossEnraged` | 恆為 `false` |
