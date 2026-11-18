# Developer Guide

## Overview

Sycamore Sam Clicker is a static, framework-free web game. It uses plain HTML, CSS and JavaScript
loaded with ordinary `<script>` tags (not ES modules), so it runs straight from the file system
(`file://`) as well as from any web server. There are no dependencies and no build step.

The code is split into three layers:

| Layer | File | Responsibility |
| --- | --- | --- |
| Content | `js/data.js` | Buildings, upgrades, achievements, news lines (plain data) |
| Engine | `js/engine.js` | Game rules: prices, production, purchases, selling, graduation, saves. No DOM access. |
| Sound | `js/audio.js` | Sound effects generated with the Web Audio API (no audio files); the leaf click is a quiet "pop" |
| UI | `js/game.js` | Rendering, input, game loop, settings, autosave, export/import |

Keeping the engine free of DOM code means it can be unit tested in Node (`tests/engine.test.js`).

## Folder and file structure

```
Sycamore Sam Clicker/
├── index.html            Entry point: page layout, the drawn leaf SVG, script tags
├── css/
│   └── style.css         All styling; ISU color tokens in :root; phone layout under 860px
├── js/
│   ├── data.js           Game content (SSC.data)
│   ├── audio.js          Sound effects (SSC.audio)
│   ├── engine.js         Game rules (SSC.engine)
│   └── game.js           Browser UI and game loop (SSC.game)
├── images/
│   ├── images.js         Which image file each building / upgrade type uses (SSC.images)
│   ├── README.md         Image credits and licenses, and how to change an image
│   ├── isu-leaf.svg      Small ISU leaf icon (prices, achievements)
│   ├── isu-leaf-gold.svg Gold version for earned achievements
│   ├── buildings/        One 320×320 picture per building
│   └── upgrades/         Pictures for click, study and campus-wide upgrades
├── tests/
│   └── engine.test.js    Unit tests (Node built-in test runner)
├── tools/
│   └── simulate.js       Balance simulation (a bot plays the real engine)
├── docs/                 Project documentation
└── README.md
```

## Entry points

- **Players:** `index.html`. It loads, in order: `images/images.js`, `js/data.js`, `js/audio.js`,
  `js/engine.js`, `js/game.js`. Each file adds one property to the global `SSC` namespace object.
- **Game start:** `init()` at the bottom of `js/game.js` loads the browser save, applies offline
  earnings, wires the buttons, and starts the timers.
- **Tests:** `node --test tests/` loads `data.js` and `engine.js` into Node and checks the rules.
- **Balance check:** `node tools/simulate.js [hours] [clicksPerSecond]` (defaults 48 h, 3 clicks/s)
  prints when a bot playing the real engine reaches each milestone.
- **Debugging:** in the browser console, `SSC.game.state()` returns the live game state,
  `SSC.game.spawnGolden()` spawns a golden leaf, `SSC.game.testBackupReminder()` shows the backup
  reminder, and opening `index.html?golden` makes golden leaves appear every 3–6 seconds.

## Game state

All progress lives in one plain object created by `engine.newState()`:

```js
{
  leaves,                      // current bank
  totalEarned,                 // leaves earned this run (reset by graduating)
  allTimeEarned,               // leaves earned in all runs (drives Alumni Pride)
  handmade, clicks, goldenClicks, sold,   // all-time counters
  pride, graduations,          // prestige
  buildings: { sapling: 0, sam: 0, ... }, // count owned per building id (this run)
  upgrades: ['click1', 'sam_t1', ...],    // purchased upgrade ids (this run)
  achievements: ['earn1', ...],           // earned achievement ids (kept forever)
  buffs: [{ name, kind: 'cps' | 'click', mult, endsAt }], // active golden-leaf effects
  startedAt, runStartedAt, savedAt        // timestamps (ms)
}
```

Only ids and numbers are stored. Names, prices and effects always come from `data.js`, so content can
be rebalanced without breaking old saves.

## Images

`images/images.js` maps keys to files: one key per building id, plus `click`, `clickPct` and `global`
for upgrades that are not tied to a building (building upgrades reuse their building's picture).
`loadImages()` in `js/game.js` loads each listed file; when it loads, that picture replaces the emoji
in the store, tooltips and campus view. Unlisted or missing files fall back to the emoji.

The leaf shape (`#leaf-shape` in `index.html`) is the sycamore leaf traced from the ISU logo. It is
reused through SVG `<use>` for the big leaf, the top-bar logo, falling leaves and golden leaves; its
colors come from the CSS custom properties `--leaf-fill`, `--leaf-edge` and `--leaf-vein`.

## Core rules (`js/engine.js`)

- **Click value:** `(1 × 2^(click upgrades) + cps × (sum of clickPct upgrades)) × click buffs`.
  Starts at exactly 1.
- **Building price:** `ceil(baseCost × 1.15^owned)`, the same 1.15 growth as the classic genre.
  Bulk purchases add up the individual prices.
- **Production (cps):** for each building
  `owned × baseCps × 2^(tier upgrades) × (1 + Σ synergy value × source owned)`, summed, then
  multiplied by `(1 + global upgrades) × (1 + 1% per achievement) × (1 + 2% per Alumni Pride)` and
  by any active production buff.
- **Selling:** refunds `floor(price × 0.25)` for each copy, using the prices those copies had. Refunds
  are not counted as earned leaves.
- **Graduation:** Alumni Pride = `floor(cbrt(allTimeEarned / 1e9))`; graduating adds the difference to
  `pride`, then resets leaves, this run's earnings, buildings, upgrades and buffs. Upgrade unlocks use
  this run's earnings; "earn" achievements use all-time earnings.
- **Upgrade visibility:** each upgrade and achievement has a `req` object (`earned`, `clicks`,
  `building`+`count`, `cps`, `golden`), checked by `reqMet()`.
- **Golden leaf:** 45% Homecoming Frenzy (×7 production for 77 s), 45% Lucky Leaf
  (`min(15% of bank, 900 s of production) + 13`), 10% Blue Crew Roar (×77 clicks for 13 s). A frenzy
  and a Roar can run at the same time.
- **Offline earnings:** 50% of production for the time since the last save, capped at 8 hours.

## Game loop and saving (`js/game.js`)

| Timer | Interval | Work |
| --- | --- | --- |
| `tick` | 100 ms | Add production for the real elapsed time; update counter and store prices |
| `slowTick` | 1 s | Achievements, campus view, stats panel, open tooltip |
| `rotateNews` | 10 s | New ticker line |
| autosave | 60 s | `localStorage` key `sycamoreSamClicker.save` |
| backup reminder | checked every 1 s | Toast with an Export button if 30 min passed since the last export or reminder |

The game also saves on `beforeunload` and when the tab becomes hidden. Store and campus DOM nodes are
rebuilt only when their contents change; on other ticks only text and classes are updated.

Settings (sound, volume, effects, ticker, number format, reminders) are stored separately under the
`localStorage` key `sycamoreSamClicker.settings`, so Reset and Import never change them.

**Touch input:** store buttons show their tooltip on hover/focus for mouse and keyboard. For touch,
`attachTooltip()` starts a 450 ms timer on `pointerdown`; if it fires, the tooltip opens and the
following `click` is ignored (`wasLongPress()`), so a long press never buys.

**Save file format** (used by both the browser save and Export/Import):

```json
{ "game": "sycamore-sam-clicker", "version": 2, "state": { ... } }
```

`engine.deserialize()` accepts versions 1 and 2. Version 1 saves (before graduation existed) are
upgraded: `allTimeEarned` is set from `totalEarned`, and the single `buff` becomes `buffs`. It rejects
files that are not JSON, belong to another game, or come from a newer version. It also cleans the data: negative or non-numeric values become defaults, unknown building,
upgrade and achievement ids are dropped, and duplicates are removed.

## Making changes

- **Add a building:** add an entry to `buildings` in `js/data.js` (keep `baseCost` increasing). Its
  8 tier upgrades and 2 achievements are generated automatically. Add its picture in
  `images/buildings/`, an entry in `images/images.js`, and a credit in `images/README.md`. The
  `icon` emoji is only used if no picture is listed.
- **Add an upgrade:** push an object with `id`, `type` (`building`, `click`, `clickPct`, `global`,
  `synergy`), `value`, `cost`, `req`, `name`, `icon`, `desc` (synergies also need `target` and
  `source`).
- **Add a sound:** add a function to `sounds` in `js/audio.js` and call `sound('name')` in `game.js`.
- **Rebalance:** change numbers in `js/data.js` (or `PRIDE_BASE` / `PRIDE_BONUS` / `SELL_RATE` in
  `js/engine.js`), then run `node tools/simulate.js 24` and compare the milestone times.
- **Change colors:** edit the variables at the top of `css/style.css`.
- **Change save behavior:** `AUTOSAVE_MS` in `js/game.js`, `OFFLINE_RATE` and `OFFLINE_CAP_SECONDS`
  in `js/engine.js`. If the state shape changes incompatibly, increase `SAVE_VERSION` and handle
  older versions in `deserialize()`.
- Run `node --test tests/` after any engine or data change.
