# Axiom — Roadmap

> 僅列項目；各項細節文件另行存放於 `docs/` 目錄（多數為後補）。
> 分層：P0 = 對齊 `docs/concept.md` MVP 缺口、P1 = 內容與系統擴充、P2 = 工程與平台 polish。

## P0 — 對齊 concept.md MVP 缺口

### 戰鬥系統
- [x] **Boss 技能地面預警線**（技能釋放前 ~0.8 秒畫出警告區；concept § 偏離表明訂）
- [x] **Elite 標記 + 擊殺 +1 draft token**（補齊 token 經濟：起始 2、elite / wave clear +1）
- [x] **Pentagon splitter** 行為：擊殺後分裂成 2–3 個小圓形敵人

### 關鍵字系統
- [x] **Ricochet (N)**：投射物彈跳邏輯
- [x] **Burn (dps, t)**：DoT 標記 + tick 系統
- [x] **Slow (%, t)**：debuff 計時器
- [x] **Chain (N)**：跳躍至附近 N 個敵人
- [x] 事件 bus（`onEnemyKilled` / `onEnemyHit` / `onPlayerHit` / `onWaveStart`）統一派發 Synergy 卡效果

### 卡池擴充到 24 張
- [x] **Weapon 類別開張（6 張）**：`Face Beam`（四方雷射）、`Orbit Shard`（環繞軌道彈）、追蹤彈、爆裂彈、扇形散射、聚能砲；引擎需支援武器槽抉擇
- [x] **Modifier 補到 10 張**：multi-shot、projectile size、homing 等（含上述關鍵字的承載卡）
- [x] **Evolution 補到 4 張**：shield regen、second chance、size/collision、dash CD
- [x] **Synergy 補到 4 張**：每 N kills 爆炸／低血 ×2／移動 +crit／靜止 +fire rate

### 起始形狀解鎖
- [x] 累計貨幣解鎖**方塊**（Face Beam）為起始形狀
- [x] 累計貨幣解鎖**菱形**（Orbit Shard）為起始形狀
- [x] 主選單新增「起始形狀選擇」頁

## P1 — 內容與系統擴充

### 敵人 / 頭目
- [ ] 多種**中型頭目**，wave 4 後機率性跟隨小敵人出沒
- [ ] 多種**大型頭目**，wave 8 隨機出一種，可能與中型頭目同場
- [ ] **特級頭目**系統：戰鬥時介面上方顯示頭目血條；生存模式每 10 wave 30% 機率出現
  - [ ] **噴射機 Jets**（細節見 `docs/boss-jets.md`）
  - [ ] 額外特級頭目至少 2 隻（後補 design doc）

### 關卡 / 模式
- [ ] 第 4 個 stage（新主題、新敵人組合）
- [ ] **Daily seed**：全球同 seed 的每日挑戰
- [ ] **挑戰模式**：固定卡組／固定敵人組合的 puzzle run
- [ ] 本地 top 10 排行榜（生存模式分數、daily 時間）

### 技能樹 / Meta
- [x] 新增 Primal Skills（目前 2 個 → 5+）：反射盾、分身彈幕、吸血脈衝等
- [x] 成就擴充（4 → 15–20，含難度／樣式／速通類）
- [x] 裝備卡擴充 + 槽位成長曲線重新平衡

### 手感 / 視聽覺 Polish
- [x] 擊殺／受擊畫面震動（可關）
- [x] 卡牌 glyph 視覺統一（concept：「每張卡是 glyph 不是插畫」）
- [x] **Synergy HUD 指示器**：哪些觸發條件正在 active
- [x] 各 stage ambient music
- [x] 音訊 mix：master / sfx / music 各別音量

## P2 — 可近用性、平台、工程

### 可近用性 / 平台
- [ ] 色盲友善色板切換
- [ ] Reduced motion 開關（關閉震動／粒子）
- [ ] 觸覺回饋（Vibration API；可關）
- [ ] 桌機鏡像直向視窗 + 鍵盤操作支援
- [ ] 第一次開啟的新手 onboarding／教學波

### 工程 / 資料
- [ ] **Seed 分享**：結算畫面顯示 seed，可複製重播連結
- [ ] **Run history / stats** 頁：每把 kills、選過的卡、存活時長
- [x] **存檔版本遷移**機制（concept 明言 localStorage 版本化）
- [ ] 本地匿名 telemetry（用於平衡調整）
