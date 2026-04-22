# Axiom

> **「當秩序崩解成幾何風暴，你就是唯一仍可證明真理的向量。」**

Axiom 是一款 3–5 分鐘、手機直式體驗的 reverse bullet-hell deckbuilder。
你將操控幾何化身穿越 AXIS / WING / MIRROR 三重領域，在彈幕壓力下持續生存，
並在每波之間抽取符文卡與技能，構築能反轉戰局的連鎖組合。

See [`docs/concept.md`](./docs/concept.md) for the full concept, worldview,
verb list, and deckbuilder spec.

## Game Overview

- **Core loop**：移動閃避 → 自動射擊清場 → 波次後選卡強化
- **Build craft**：透過卡牌、技能、裝備與起始形態堆疊 synergies
- **Boss progression**：挑戰 Orthogon / Jets / Mirror，逐步解鎖更多內容
- **Run style**：短局高密度、可重複挑戰、seed 可重現

## Stack

- **Vite + TypeScript (strict)** — same conventions as `simple-roguelike/`
- **PixiJS 8** (WebGL) — lots of geometric projectiles at 60 fps
- **Vitest** — unit tests, especially for RNG / shuffle determinism
- Audio (Howler) deferred until the game is actually making sounds

Stack chosen by `game-deckbuilder` skill; no `rot.js` (no FOV / pathfinding /
dungeon gen), no Phaser (too heavy for a 1-week jam with pure geometry).

## Getting started

```bash
npm install
npm run dev        # vite dev server with HMR
npm test           # vitest single run
npm run build      # typecheck + vite build → dist/
```

Open the URL Vite prints. On mobile, add `?seed=<number>` to reproduce a run.

## Controls (MVP smoke test)

- **Touch / mouse drag** — avatar steers toward your pointer
- **Arrow keys** — desktop fallback (1 nudge per press)
- **`r`** or the **restart** button — new seed

## Structure

```
axiom/
├── docs/concept.md          # contract for downstream skills
├── index.html               # portrait viewport, safe-area aware
├── src/
│   ├── main.ts              # boot, canvas fit, input, MVP loop
│   ├── style.css            # portrait letterbox, touch-action: none
│   └── game/
│       └── rng.ts           # seeded mulberry32 + shuffle
├── tests/
│   └── rng.test.ts          # determinism + shuffle distribution
└── .claude/settings.json    # typecheck on edit, vitest on stop
```

More folders (`cards/`, `encounters/`, `ui/`, `systems/`) will appear as the
game grows — see `game-systems` / `game-loop` for the patterns.

## Music References

- [tallbeard-music-loop-bundle](https://tallbeard.itch.io/music-loop-bundle)
