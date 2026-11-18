# Testing

Testing was done on 2026-11-17 on macOS (Darwin 22.6.0) with Node.js 20.17.0 and the Chromium-based
browser built into the Claude desktop app.

## 1. Automated unit tests

Run from the project folder:

```bash
node --test tests/
```

`tests/engine.test.js` has 16 tests for the game engine. **Result: 16 passed, 0 failed** (about 0.3 s).

| Test | What it checks |
| --- | --- |
| one click of the leaf counts as exactly 1 | Requirement: a click is worth 1 |
| building prices scale by 1.15 per copy owned | Requirement: 1.15 price scaling, for every building |
| bulk price equals the sum of single prices | x10 / x100 buying |
| buying a building spends leaves and refuses when too poor | Purchases, unknown ids |
| production adds up and ticks over time | Leaves per second and the game tick |
| upgrades appear when requirements are met and apply their effects | Unlocks, doubling, no double purchase |
| click upgrades double the click and clickPct adds a share of cps | Click math |
| global upgrades and achievements boost production | Percentage bonuses |
| achievements are awarded once | No duplicate awards |
| golden leaf frenzy multiplies production for 77 seconds | Buff start and expiry |
| golden leaf lucky reward is capped by bank and production | Lucky Leaf formula |
| offline earnings are 50% of production and capped at 8 hours | Offline progress, clock going backwards |
| save files round-trip | Export then import keeps all data |
| bad or tampered save files are rejected or cleaned | Invalid JSON, wrong game, newer version, negative and fake values |
| numbers are formatted for display | 999,999 / 1.234 million / exponent display |
| content data is consistent | Unique ids, valid costs and targets, increasing building costs |

## 2. Browser testing

The game was served with `python3 -m http.server` and played in the built-in browser. Checks were made
with screenshots and by running JavaScript in the page.

| Area | Result |
| --- | --- |
| Page loads with ISU colors, drawn leaf, store and news ticker | Pass |
| 20 clicks give exactly 20 leaves | Pass |
| Buying the first Sycamore Sapling costs 15; next price shows 18 | Pass |
| First upgrade (Blue Thumb, needs 15 clicks) is in the store after 20 clicks | Pass |
| Achievements unlock with a notification | Pass |
| x10 buying, upgrade purchase, campus view rows | Pass |
| Save button writes the browser save; reload restores progress | Pass |
| Import of a valid save file restores the game | Pass |
| Import of an invalid file shows "Import failed" and keeps the current game | Pass |
| Golden leaf appears (`?golden` test mode), Lucky Leaf pays 900 s of production | Pass |
| Homecoming Frenzy raises production ×7 and shows a 77 s countdown, and survives a reload | Pass |
| Stats panel and achievement list | Pass |
| Real image swap: a test image listed in `images/images.js` replaced the Sycamore Sam emoji in the store and campus | Pass (test image removed afterwards) |
| Desktop layout (1400×850): three columns | Pass |
| Phone layout (375×812): stacked columns, no sideways scrolling | Pass |
| No failed network requests or script errors in the console | Pass (after fix 4 below) |

Not tested: other browsers (Firefox, Safari), the autosave interval by waiting a full minute (the
timer calls the same save function the Save button uses), and opening `index.html` directly from the
file system in a real browser (the built-in browser only shows a static snapshot of local files).

## 3. Problems found and fixed during testing

| # | Problem | Fix |
| --- | --- | --- |
| 1 | The "Keep clicking to unlock upgrades!" hint never appeared in the empty Upgrades box, because the store's change-detection key started as an empty string and an empty list also produces an empty key. | Start the keys as `null` so the first render always runs. |
| 2 | The Golden Sycamore Leaf was drawn blue instead of gold. CSS rules like `.golden .leaf-body` cannot reach shapes cloned by SVG `<use>`. | Leaf colors are now CSS custom properties (`--leaf-fill`, `--leaf-edge`, `--leaf-vein`), which do pass into `<use>` clones. |
| 3 | The 🐾 icon for Sycamore Sam was nearly invisible on the blue background. | Changed to 💙. |
| 4 | Automatic image detection asked the server for 4 file types × 13 images on every load, filling the console with 52 "404 Not Found" errors when no photos had been added. | Replaced with an explicit list in `images/images.js`; only listed files are loaded. |
| 5 | A "Welcome back! … away for 0s" message appeared after a quick reload. | Offline earnings message only shows after at least 60 seconds away. |
| 6 | Achievement text read "Earn a total of 1 leaves" and "Produce 1 leaves per second". | Singular wording for 1. |

All unit tests were re-run after the fixes: 16 passed, 0 failed.

## 4. Image update testing (2026-11-18)

After real ISU photos replaced the emoji icons:

| Check | Result |
| --- | --- |
| Unit tests | 16 passed, 0 failed |
| All 12 buildings and all upgrades show photos in the store, tooltips and campus view (104 images on the page, none broken) | Pass |
| No emoji icons left in the store or campus view | Pass |
| No failed network requests | Pass |
| Big leaf, top-bar logo, falling leaves and golden leaf use the ISU logo leaf; golden leaf is gold | Pass |
| Price and achievement icons use the ISU leaf (gold for earned, gray for locked) | Pass |

## 5. GitHub Pages check (2026-11-18)

The live site at <https://jtriii.github.io/sycamore-sam-clicker/> returned HTTP 200 for the page, scripts, styles and images. In the
built-in browser, 20 clicks gave 20 leaves, a Sycamore Sapling could be bought, the browser save was
written, and no images or requests failed.

## 6. New features testing (2026-11-18)

Features added: graduation (Alumni Pride), selling, synergy upgrades, a third golden-leaf effect,
26 more achievements, settings and sound, press-and-hold tooltips on touch screens, campus photo
rows, and backup reminders.

### Unit tests

`node --test tests/` now has **25 tests: 25 passed, 0 failed**. New or changed tests:

| Test | What it checks |
| --- | --- |
| golden leaf Blue Crew Roar multiplies clicks for 13 seconds, alongside a frenzy | Two buffs at once; each expires on time |
| selling refunds 25% of the price and never more than owned | Refund math, refunds not counted as earnings, "Change of Major" achievement |
| buy then sell never makes a profit | No leaf-making exploit from buy/sell |
| synergy upgrades appear at 15 of both buildings and scale with the source count | Unlock rule and +5% per source building |
| graduating converts all-time leaves into Alumni Pride and starts a new run | Pride formula, what resets, what is kept, +2% per point |
| upgrade unlocks use this run, achievements use all time | Upgrades do not all reappear after graduating |
| version 1 saves load | Old saves (made before this update) still import |
| tampered pride is capped by all-time earnings | Edited save files cannot grant free Alumni Pride |
| short number format | "1.234M" style |

The golden-leaf, global-upgrade and save round-trip tests were updated for the new odds, the stronger
campus upgrades and the new save fields.

### Balance simulation

`node tools/simulate.js 24 3` lets a bot play for 24 simulated hours, clicking 3 times a second and
always buying whatever pays for itself fastest (no golden leaves).

| Milestone | Before rebalancing | After |
| --- | --- | --- |
| 1 million leaves | 24m 45s | 24m 42s |
| First Memorial Stadium | 1h 19m | 1h 18m |
| 1 billion leaves | 2h 13m | 2h 4m (first Alumni Pride) |
| First Hulman Center | 3h 26m | 3h 17m |
| First Larry Bird Legacy | 7h 51m | 6h 41m |
| First Homecoming Parade | 13h 47m | 12h 2m |
| 1 trillion leaves | 17h 18m (first Alumni Pride, worth +1%) | 13h 58m (10 Alumni Pride, +20%) |

Finding: with the original numbers, the first Alumni Pride point took 17 hours and was worth only +1%,
so graduating was pointless. Fix: Alumni Pride now starts at 1 billion leaves and gives +2% per point,
and the six campus-wide upgrades were strengthened (+10% … +75% instead of +5% … +20%). The early game
was not changed. The late game (Larry Bird Legacy onward) still takes many hours, which is normal for
the genre; graduating speeds up later runs.

### Browser testing

| Check | Result |
| --- | --- |
| A version 1 save (written by the previous game version) loads in the new version | Pass |
| Graduate button appears with the points available; the dialog shows the correct numbers | Pass |
| Graduating: 100 Alumni Pride gained, leaves/buildings/upgrades reset, achievements kept, graduation achievements unlocked | Pass |
| Sell mode shows refunds, sells, and unlocks "Change of Major" | Pass |
| Settings panel: short numbers, news ticker off, settings kept after reload | Pass |
| Phone size (375×812): "press and hold" hint shown; a long press shows the tooltip without buying; a normal tap buys | Pass |
| Phone size: no sideways scrolling | Pass |
| Blue Crew Roar: clicks worth ×77, shown in the buff bar | Pass |
| Backup reminder toast with an "Export save" button | Pass (triggered with `SSC.game.testBackupReminder()`) |
| Campus rows show the building photo behind the icons | Pass |
| No script errors or failed requests in the console | Pass |
| Sound effects run without errors | Pass, but **not heard**: the test browser has no speakers for the AI. Please listen to them yourself. |

### Problems found and fixed

| # | Problem | Fix |
| --- | --- | --- |
| 7 | Graduating was not worth it (see the balance table above). | Rebalanced Alumni Pride and campus-wide upgrades. |
| 8 | Some messages still said Alumni Pride was "+1%" per point after the rebalance. | All texts now calculate the percentage from `PRIDE_BONUS`. |
| 9 | User feedback: the leaf click sound (a burst of filtered noise) was too loud and annoying. | Replaced with a soft, short "pop" (a sine tone sliding down in pitch, slightly different each click). Measured by rendering both sounds offline in the browser: 12.5 dB quieter on average (−31.1 → −43.6 dB RMS, peak 0.17 → 0.05) and much less harsh (high-frequency content about 14× lower). |

### Not tested

- **Firefox and Safari:** only the Chromium-based built-in browser was used. Please open
  <https://jtriii.github.io/sycamore-sam-clicker/> in Safari (Mac and iPhone) and Firefox and check
  that the game loads, clicks, saves, and that the Graduate dialog opens.
- A real touch screen (touch was simulated with pointer events).
- Hearing the sound effects.
