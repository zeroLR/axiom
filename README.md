# Axiom

A 3–5 minute mobile-portrait reverse bullet-hell deckbuilder. A geometric avatar
auto-fires at converging hostile shapes; between waves you draft rune-cards
that mutate your form and build lethal synergies.

See [`docs/concept.md`](./docs/concept.md) for the full concept, worldview,
verb list, and deckbuilder spec.

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
