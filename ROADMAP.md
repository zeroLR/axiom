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

### 掉落物系統（Fragment Drop）
> 為成長、職業、融合系統提供材料基礎；第一階段上線。
- [ ] **普通碎片**：小怪依種類掉落，用於兌換點數、Cook Core 晶核
- [ ] **Boss 碎片**：特定 Boss 專屬，用於轉職門檻與融合條件
- [ ] **保底機制**：連續若干波不掉落時保底給碎片
- [ ] Run 結算畫面新增「碎片獲得彙總」欄位
- [ ] 碎片→點數 / Core 兌換介面（Shop 或 Lab 子頁面）
- [ ] 材料上限與溢出轉換規則

### 成長（天賦）系統（Talent Growth）
> 透過點數與碎片強化玩家角色基礎能力；全局持久。
- [ ] 設計天賦樹結構：基礎生存支線、輸出支線、資源效率支線
- [ ] 天賦節點資料 schema（`src/game/content/talents.ts`）
- [ ] 天賦效果整合至 run 啟動時的角色 stats
- [ ] 天賦 UI（新增 TalentScene 頁面）
- [ ] 天賦重置機制（消費少量材料退還點數）
- [ ] 確保天賦加成不破壞卡牌構築核心的前期壓力感

### 職業（創造）系統（Class Creation）
> 從起始形狀延伸為基礎職系，分三大定理職業；角色可多開培養。
- [ ] 定義三大基礎定理職系（對應 AXIS / WING / MIRROR 主題）
- [ ] 每條職系支援 1→2→3→4 轉進階分支，定義轉職門檻（等級 / Boss 碎片 / 點數）
- [ ] 角色槽位系統：玩家可用點數生成新角色，各角色獨立成長
- [ ] 職業被動能力 schema 與 effectEngine 整合
- [ ] 職業選擇 UI（起始形狀選擇頁升級改版）
- [ ] 轉職流程 UI（消耗確認、動畫/演出）

### 融合（異變）系統（Fusion / Mutation）
> 終局內容：兩名 1 轉以上角色 + Boss 碎片 + 點數 → 異變特殊職業。
- [ ] 融合條件設計（角色轉職等級、指定 Boss 碎片種類、點數成本）
- [ ] 異變職業 schema（特殊被動與主動能力，不可再轉職或融合）
- [ ] 融合職業的碎片強化天賦路徑（替代轉職後的成長出口）
- [ ] 融合確認 UI 與不可逆警示
- [ ] 至少 3 種異變職業設計（每種對應不同 Boss 碎片組合）

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
