# <img src="./public/icons/axiom-jets-a.svg" width="28" alt="Axiom icon" /> Axiom

[繁體中文](./README.zh-TW.md)

> **“When order collapses into a geometric storm, you are the last vector that can still prove the truth.”**

Axiom is a 3–5 minute reverse bullet-hell deckbuilder designed for portrait mobile play.
You control a geometric avatar through the AXIS / WING / MIRROR domains, survive dense projectile pressure,
and draft rune cards and skills between waves to build chain combos that can flip the battle.

See [`docs/concept.md`](./docs/concept.md) for the full concept, worldview,
verb list, and deckbuilder specification.

## Game Overview

- **Core loop**: Dodge and move → auto-fire and clear waves → draft cards after each wave
- **Build crafting**: Stack synergies with cards, skills, equipment, and starter forms
- **Boss progression**: Defeat Orthogon / Jets / Mirror to unlock more content
- **Run style**: Short high-density runs, high replayability, and reproducible seeds

## Stack

- **Vite + TypeScript (strict)** — same conventions as `simple-roguelike/`
- **PixiJS 8** (WebGL) — many geometric projectiles at 60 fps
- **Vitest** — unit tests, especially for RNG / shuffle determinism
- Audio (Howler) is deferred until the game is actively using sound

Stack was chosen by the `game-deckbuilder` skill; no `rot.js` (no FOV / pathfinding / dungeon generation),
and no Phaser (too heavy for a one-week jam focused on pure geometry).

## Getting Started

```bash
npm install
npm run dev        # Vite dev server with HMR
npm test           # Vitest single run
npm run build      # typecheck + Vite build → dist/
```

Open the URL printed by Vite. On mobile, append `?seed=<number>` to reproduce a run.

## Controls (MVP Smoke Test)

- **Touch / mouse drag** — steer the avatar toward your pointer
- **Arrow keys** — desktop fallback (one nudge per press)
- **`r`** or the **restart** button — start a new seed

## Structure

```text
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
└── .claude/settings.json    # typecheck on edit, Vitest on stop
```

More folders (`cards/`, `encounters/`, `ui/`, `systems/`) will appear as the
game grows — see `game-systems` / `game-loop` for the expected patterns.

## Music References

- [tallbeard-music-loop-bundle](https://tallbeard.itch.io/music-loop-bundle)
