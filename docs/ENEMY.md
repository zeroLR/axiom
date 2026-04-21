# Axiom Enemy 記錄

資料來源：`src/game/enemies/registry.ts`（canonical）、`src/game/entities.ts`、`src/game/systems/ai.ts`、`src/game/systems/collision.ts`、`src/game/systems/bossWeapon.ts`、`src/game/mirrorBoss.ts`。

## 敵人種類與基礎強度

| 種類 (`EnemyKind`) | HP | 移動速度 (`maxSpeed`) | 接觸傷害 (`contactDamage`) | 半徑 (`radius`) | 基礎點數 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `circle` | 3 | 72 | 1 | 8 | 1 |
| `square` | 5 | 98 | 1 | 9 | 2 |
| `star` | 8 | 88 | 1 | 11 | 3 |
| `boss` | 80* | 52 | 1 | 22 | 50 |
| `pentagon` | 6 | 68 | 1 | 10 | 3 |
| `hexagon` | 7 | 62 | 1 | 10 | 4 |
| `diamond` | 4 | 112 | 1 | 8 | 3 |
| `cross` | 7 | 58 | 1 | 10 | 4 |
| `crescent` | 5 | 78 | 1 | 9 | 3 |

> 補充：`star`、`pentagon`、`hexagon`、`cross` 出生時會被標記為 Elite，HP 乘上 1.5（無條件進位）。
>
> 點數倍率（Normal 模式）：Stage 1 = 1x、Stage 2 = 2x、Stage 3 = 3x，實得擊殺點數 = 基礎點數 × 關卡倍率（無條件進位）。

## 描述與攻擊行為

### `circle`
- 描述：基礎追擊單位。
- 行為：持續朝玩家加速追蹤，造成接觸傷害。

### `square`
- 描述：較硬且速度更快的追擊單位。
- 行為：持續朝玩家加速追蹤，造成接觸傷害。

### `star`
- 描述：高血量、具橫向擺動的追擊單位。
- 行為：追蹤玩家時加入正弦側向偏移（wobble），軌跡較難預測。

### `pentagon`
- 描述：中高血量分裂型單位。
- 行為：一般追擊；死亡時分裂出 2~3 隻 `circle`。

### `hexagon`
- 描述：帶護盾的耐打單位。
- 行為：一般追擊；初始有 1 點護盾，第一下命中只會打掉護盾不扣 HP。

### `diamond`
- 描述：高速突進型單位。
- 行為：一般追擊之外，會週期性向玩家方向衝刺（約每 2.5~4 秒一次）。

### `cross`
- 描述：遠程射擊型單位。
- 行為：一般追擊之外，會週期性朝玩家發射子彈（約每 2~3 秒一次，基礎傷害 1）。

### `crescent`
- 描述：弧線繞行型單位。
- 行為：以追蹤向量混合切線向量移動，形成環繞/弧形接近。

### `boss`
- 描述：波次首領，具可讀取的扇形彈幕與鏡像成長機制。
- 行為：
  - 一般追擊玩家。
  - 以 `BOSS_TELEGRAPH_LEAD = 0.8s` 先顯示預警，再發射扇形子彈。
  - 扇形彈幕間距 `BOSS_FAN_SPREAD = 0.22` 弧度，彈數由 boss 武器 `projectiles` 決定。
  - 進場後會套用 Mirror Boss 規則：依玩家本局抽到的卡牌調整 boss 的 HP / 速度 / 射擊能力。
