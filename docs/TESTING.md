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
