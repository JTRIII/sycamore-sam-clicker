# Developer Guide

## Overview

Sycamore Sam Clicker is a static, framework-free web game. It uses plain HTML, CSS and JavaScript
loaded with ordinary `<script>` tags (not ES modules), so it runs straight from the file system
(`file://`) as well as from any web server. There are no dependencies and no build step.

The code is split into three layers:

| Layer | File | Responsibility |
| --- | --- | --- |
| Content | `js/data.js` | Buildings, upgrades, achievements, news lines (plain data) |
| Engine | `js/engine.js` | Game rules: prices, production, purchases, saves. No DOM access. |
| UI | `js/game.js` | Rendering, input, game loop, autosave, export/import |

Keeping the engine free of DOM code means it can be unit tested in Node (`tests/engine.test.js`).

## Folder and file structure

```
Sycamore Sam Clicker/
├── index.html            Entry point: page layout, the drawn leaf SVG, script tags
├── css/
│   └── style.css         All styling; ISU color tokens in :root; phone layout under 860px
├── js/
│   ├── data.js           Game content (SSC.data)
│   ├── engine.js         Game rules (SSC.engine)
│   └── game.js           Browser UI and game loop (SSC.game)
├── images/
│   ├── images.js         List of real ISU image files to use (SSC.images)
│   ├── README.md         How to add images, and image permissions
│   └── buildings/        Put building photos here
├── tests/
│   └── engine.test.js    Unit tests (Node built-in test runner)
├── docs/                 Project documentation
└── README.md
```

## Entry points

- **Players:** `index.html`. It loads, in order: `images/images.js`, `js/data.js`, `js/engine.js`,
  `js/game.js`. Each file adds one property to the global `SSC` namespace object.
- **Game start:** `init()` at the bottom of `js/game.js` loads the browser save, applies offline
  earnings, wires the buttons, and starts the timers.
- **Tests:** `node --test tests/` loads `data.js` and `engine.js` into Node and checks the rules.
- **Debugging:** in the browser console, `SSC.game.state()` returns the live game state,
  `SSC.game.spawnGolden()` spawns a golden leaf, and opening `index.html?golden` makes golden leaves
  appear every 3–6 seconds.

## Game state

All progress lives in one plain object created by `engine.newState()`:

```js
{
  leaves, totalEarned, handmade, clicks, goldenClicks,   // numbers
  buildings: { sapling: 0, sam: 0, ... },                // count owned per building id
  upgrades: ['click1', 'sam_t1', ...],                   // purchased upgrade ids
  achievements: ['earn1', ...],                          // earned achievement ids
  buff: { name, mult, endsAt } | null,                   // active golden-leaf frenzy
  startedAt, savedAt                                     // timestamps (ms)
}
```

Only ids and numbers are stored. Names, prices and effects always come from `data.js`, so content can
be rebalanced without breaking old saves.

## Core rules (`js/engine.js`)

- **Click value:** `1 × 2^(click upgrades) + cps × (sum of clickPct upgrades)`. Starts at exactly 1.
- **Building price:** `ceil(baseCost × 1.15^owned)`, the same 1.15 growth as the classic genre.
  Bulk purchases add up the individual prices.
- **Production (cps):** for each building `owned × baseCps × 2^(tier upgrades)`, summed, then
  multiplied by `(1 + global upgrades) × (1 + 1% per achievement)` and by any active buff.
- **Upgrade visibility:** each upgrade and achievement has a `req` object (`earned`, `clicks`,
  `building`+`count`, `cps`, `golden`), checked by `reqMet()`.
- **Golden leaf:** 50% Homecoming Frenzy (×7 production for 77 s), 50% Lucky Leaf
  (`min(15% of bank, 900 s of production) + 13`).
- **Offline earnings:** 50% of production for the time since the last save, capped at 8 hours.

## Game loop and saving (`js/game.js`)

| Timer | Interval | Work |
| --- | --- | --- |
| `tick` | 100 ms | Add production for the real elapsed time; update counter and store prices |
| `slowTick` | 1 s | Achievements, campus view, stats panel, open tooltip |
| `rotateNews` | 10 s | New ticker line |
| autosave | 60 s | `localStorage` key `sycamoreSamClicker.save` |

The game also saves on `beforeunload` and when the tab becomes hidden. Store and campus DOM nodes are
rebuilt only when their contents change; on other ticks only text and classes are updated.

**Save file format** (used by both the browser save and Export/Import):

```json
{ "game": "sycamore-sam-clicker", "version": 1, "state": { ... } }
```

`engine.deserialize()` rejects files that are not JSON, belong to another game, or come from a newer
version. It also cleans the data: negative or non-numeric values become defaults, unknown building,
upgrade and achievement ids are dropped, and duplicates are removed.

## Making changes

- **Add a building:** add an entry to `buildings` in `js/data.js` (keep `baseCost` increasing). Its
  8 tier upgrades and 2 achievements are generated automatically. Optionally add an image key in
  `images/images.js`.
- **Add an upgrade:** push an object with `id`, `type` (`building`, `click`, `clickPct`, `global`),
  `value`, `cost`, `req`, `name`, `icon`, `desc`.
- **Change colors:** edit the variables at the top of `css/style.css`.
- **Change save behavior:** `AUTOSAVE_MS` in `js/game.js`, `OFFLINE_RATE` and `OFFLINE_CAP_SECONDS`
  in `js/engine.js`. If the state shape changes incompatibly, increase `SAVE_VERSION` and handle
  older versions in `deserialize()`.
- Run `node --test tests/` after any engine or data change.
