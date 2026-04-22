# <img src="./public/icons/axiom-jets-a.svg" width="28" alt="Axiom 圖示" /> Axiom

[English](./README.md)

> **「當秩序崩解成幾何風暴，你就是唯一仍可證明真理的向量。」**

Axiom 是一款 3–5 分鐘、手機直式體驗的反向彈幕 deckbuilder。
你將操控幾何化身穿越 AXIS / WING / MIRROR 三重領域，在高密度彈幕壓力下持續生存，
並在每波之間抽取符文卡與技能，構築能反轉戰局的連鎖組合。

完整概念、世界觀、動詞清單與 deckbuilder 規格請參考 [`docs/concept.md`](./docs/concept.md)。

## 遊戲概要

- **核心循環**：移動閃避 → 自動射擊清場 → 波次後選卡強化
- **構築玩法**：透過卡牌、技能、裝備與起始形態堆疊 synergies
- **Boss 進程**：挑戰 Orthogon / Jets / Mirror，逐步解鎖更多內容
- **Run 風格**：短局高密度、可重複挑戰、seed 可重現

## 技術棧

- **Vite + TypeScript (strict)** — 與 `simple-roguelike/` 採用相同慣例
- **PixiJS 8** (WebGL) — 支援大量幾何彈幕並維持 60 fps
- **Vitest** — 單元測試，特別針對 RNG / shuffle 決定性
- 音效（Howler）在遊戲實際啟用聲音時再導入

技術選型由 `game-deckbuilder` skill 決定；不使用 `rot.js`（不需要 FOV / pathfinding / dungeon generation），
也不使用 Phaser（對一週幾何主題 jam 來說過重）。

## 開始使用

```bash
npm install
npm run dev        # Vite 開發伺服器（HMR）
npm test           # Vitest 單次執行
npm run build      # 型別檢查 + Vite build → dist/
```

開啟 Vite 輸出的網址。手機上可加上 `?seed=<number>` 來重現同一局。

## 操作（MVP Smoke Test）

- **觸控 / 滑鼠拖曳** — 角色朝指標方向移動
- **方向鍵** — 桌面備援操作（每次按鍵位移一次）
- **`r`** 或 **restart** 按鈕 — 開新 seed

## 結構

```text
axiom/
├── docs/concept.md          # 下游 skills 的規格契約
├── index.html               # 直式 viewport 與 safe-area 設定
├── src/
│   ├── main.ts              # 啟動、canvas fit、輸入、MVP loop
│   ├── style.css            # 直式 letterbox、touch-action: none
│   └── game/
│       └── rng.ts           # seeded mulberry32 + shuffle
├── tests/
│   └── rng.test.ts          # 決定性與 shuffle 分佈測試
└── .claude/settings.json    # 編輯時型別檢查、停止時跑 Vitest
```

後續會隨遊戲成長新增更多資料夾（如 `cards/`、`encounters/`、`ui/`、`systems/`）；
實作模式可參考 `game-systems` / `game-loop`。

## 音樂參考

- [tallbeard-music-loop-bundle](https://tallbeard.itch.io/music-loop-bundle)
