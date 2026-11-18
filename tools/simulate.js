// Balance simulation for Sycamore Sam Clicker.
//
//   node tools/simulate.js [hours] [clicksPerSecond]
//
// A simple "bot" plays the game using the real engine: it clicks at a steady
// rate and always buys whatever pays for itself fastest (cost divided by the
// production it adds). Golden leaves are ignored, so real players who click
// them will progress somewhat faster. Prints when each milestone is reached.
'use strict';
const path = require('node:path');
require(path.join(__dirname, '..', 'js', 'data.js'));
require(path.join(__dirname, '..', 'js', 'engine.js'));
const { engine: E, data: D } = globalThis.SSC;

const HOURS = Number(process.argv[2]) || 48;
const CPS_CLICKS = process.argv[3] != null ? Number(process.argv[3]) : 3;
const T0 = 0;

const s = E.newState(T0);
const clone = (st) => Object.assign({}, st, { buildings: Object.assign({}, st.buildings), upgrades: st.upgrades.slice() });
const rate = (st) => E.cps(st, T0) + CPS_CLICKS * E.clickValue(st, T0);

function options(st) {
  const out = [];
  const base = rate(st);
  let lastSeen = 0;
  D.buildings.forEach((b, i) => { if (st.buildings[b.id] > 0 || st.totalEarned >= b.baseCost * 0.5) lastSeen = i; });
  D.buildings.slice(0, lastSeen + 2).forEach((b) => {
    const t = clone(st); t.buildings[b.id] += 1;
    out.push({ kind: 'building', id: b.id, cost: E.buildingCost(st, b.id), gain: rate(t) - base });
  });
  E.availableUpgrades(st).forEach((u) => {
    const t = clone(st); t.upgrades.push(u.id);
    out.push({ kind: 'upgrade', id: u.id, cost: u.cost, gain: rate(t) - base });
  });
  return out.filter((o) => o.gain > 0).map((o) => Object.assign(o, { payback: o.cost / o.gain + o.cost / Math.max(base, 1e-9) }));
}

const events = [];
const seen = new Set();
const mark = (key, label, t) => { if (!seen.has(key)) { seen.add(key); events.push([t, label]); } };
const fmtT = (sec) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = Math.floor(sec % 60);
  return (h ? h + 'h ' : '') + (h || m ? m + 'm ' : '') + x + 's';
};

let t = 0;
const end = HOURS * 3600;
while (t < end) {
  const dt = t < 3600 ? 1 : 5;
  // click income + passive production
  E.earn(s, CPS_CLICKS * dt * E.clickValue(s, T0));
  s.clicks += CPS_CLICKS * dt;
  E.tick(s, dt, T0);
  t += dt;
  // buy best options while affordable
  for (let guard = 0; guard < 50; guard++) {
    const opts = options(s);
    if (!opts.length) break;
    opts.sort((a, b) => a.payback - b.payback);
    const best = opts[0];
    if (s.leaves < best.cost) break;
    if (best.kind === 'building') E.buyBuilding(s, best.id); else E.buyUpgrade(s, best.id);
  }
  E.checkAchievements(s);
  D.buildings.forEach((b) => { if (s.buildings[b.id] > 0) mark('b' + b.id, 'first ' + b.name, t); });
  [[1e3, 'thousand'], [1e6, 'million'], [1e9, 'billion (first Alumni Pride)'], [1e12, 'trillion (10 Alumni Pride)'], [1e15, 'quadrillion']]
    .forEach(([n, name]) => { if (s.allTimeEarned >= n) mark('e' + n, '1 ' + name + ' leaves earned', t); });
}

console.log('Simulated ' + HOURS + ' h, ' + CPS_CLICKS + ' clicks/s, no golden leaves.\n');
events.forEach(([time, label]) => console.log(fmtT(time).padStart(14) + '  ' + label));
console.log('\nAt the end: ' + E.formatNumber(E.cps(s, T0), 1) + ' leaves/s, '
  + Object.values(s.buildings).reduce((a, b) => a + b, 0) + ' buildings, '
  + s.upgrades.length + ' upgrades, ' + s.achievements.length + ' achievements, '
  + 'Alumni Pride available: ' + E.pendingPride(s));
