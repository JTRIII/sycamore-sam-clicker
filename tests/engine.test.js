// Unit tests for the game engine. Run with:  node --test tests/
// Uses only Node's built-in test runner (Node 18+), no packages to install.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

require(path.join(__dirname, '..', 'js', 'data.js'));
require(path.join(__dirname, '..', 'js', 'engine.js'));
const { engine: E, data: D } = globalThis.SSC;

const NOW = 1_700_000_000_000;
const fresh = () => E.newState(NOW);

test('one click of the leaf counts as exactly 1', () => {
  const s = fresh();
  assert.equal(E.clickValue(s, NOW), 1);
  assert.equal(E.click(s, NOW), 1);
  assert.equal(s.leaves, 1);
  assert.equal(s.clicks, 1);
});

test('building prices scale by 1.15 per copy owned', () => {
  const s = fresh();
  assert.equal(E.buildingCost(s, 'sapling'), 15);
  s.buildings.sapling = 1;
  assert.equal(E.buildingCost(s, 'sapling'), Math.ceil(15 * 1.15)); // 18
  s.buildings.sapling = 10;
  assert.equal(E.buildingCost(s, 'sapling'), Math.ceil(15 * Math.pow(1.15, 10)));
  for (const b of D.buildings) {
    const t = fresh();
    t.buildings[b.id] = 7;
    assert.equal(E.buildingCost(t, b.id), Math.ceil(b.baseCost * Math.pow(1.15, 7)), b.id);
  }
});

test('bulk price equals the sum of single prices', () => {
  const s = fresh();
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += E.priceOf(15, i);
  assert.equal(E.buildingCost(s, 'sapling', 10), sum);
});

test('buying a building spends leaves and refuses when too poor', () => {
  const s = fresh();
  s.leaves = 14;
  assert.equal(E.buyBuilding(s, 'sapling'), false);
  assert.equal(s.buildings.sapling, 0);
  s.leaves = 15;
  assert.equal(E.buyBuilding(s, 'sapling'), true);
  assert.equal(s.leaves, 0);
  assert.equal(s.buildings.sapling, 1);
  assert.equal(E.buyBuilding(s, 'not-a-building'), false);
});

test('production adds up and ticks over time', () => {
  const s = fresh();
  s.buildings.sapling = 10; // 1/s
  s.buildings.sam = 2; // 2/s
  assert.ok(Math.abs(E.cps(s, NOW) - 3) < 1e-9);
  E.tick(s, 10, NOW);
  assert.ok(Math.abs(s.leaves - 30) < 1e-9);
  assert.ok(Math.abs(s.totalEarned - 30) < 1e-9);
});

test('upgrades appear when requirements are met and apply their effects', () => {
  const s = fresh();
  assert.equal(E.availableUpgrades(s).length, 0);
  s.buildings.sam = 1;
  const avail = E.availableUpgrades(s).map((u) => u.id);
  assert.ok(avail.includes('sam_t1'));
  s.leaves = 1000;
  assert.equal(E.buyUpgrade(s, 'sam_t1'), true);
  assert.equal(s.leaves, 0);
  assert.equal(E.buildingMult(s, 'sam'), 2);
  assert.equal(E.cps(s, NOW), 2);
  assert.equal(E.buyUpgrade(s, 'sam_t1'), false, 'cannot buy twice');
  assert.equal(E.buyUpgrade(s, 'sam_t2'), false, 'locked until 5 owned');
});

test('click upgrades double the click and clickPct adds a share of cps', () => {
  const s = fresh();
  s.upgrades.push('click1', 'click2');
  assert.equal(E.clickValue(s, NOW), 4);
  s.buildings.sam = 100; // 100/s
  s.upgrades.push('clickPct1');
  assert.ok(Math.abs(E.clickValue(s, NOW) - 5) < 1e-9);
});

test('global upgrades and achievements boost production', () => {
  const s = fresh();
  s.buildings.sam = 10;
  s.upgrades.push('global1'); // +5%
  assert.ok(Math.abs(E.cps(s, NOW) - 10.5) < 1e-9);
  s.achievements.push('earn1', 'earn2'); // +2%
  assert.ok(Math.abs(E.cps(s, NOW) - 10.5 * 1.02) < 1e-9);
});

test('achievements are awarded once', () => {
  const s = fresh();
  E.click(s, NOW);
  const got = E.checkAchievements(s).map((a) => a.id);
  assert.deepEqual(got.sort(), ['click_a1', 'earn1']);
  assert.equal(E.checkAchievements(s).length, 0);
});

test('golden leaf frenzy multiplies production for 77 seconds', () => {
  const s = fresh();
  s.buildings.sam = 1;
  const r = E.goldenLeaf(s, 0.1, NOW);
  assert.equal(r.type, 'frenzy');
  assert.equal(E.cps(s, NOW + 1000), 7);
  assert.equal(E.cps(s, NOW + 78 * 1000), 1);
  E.tick(s, 1, NOW + 78 * 1000);
  assert.equal(s.buff, null);
});

test('golden leaf lucky reward is capped by bank and production', () => {
  const s = fresh();
  s.leaves = 1e6;
  s.buildings.sam = 1; // 1/s -> cap 900
  const r = E.goldenLeaf(s, 0.9, NOW);
  assert.equal(r.type, 'lucky');
  assert.equal(r.amount, 913);
  assert.equal(s.goldenClicks, 1);
});

test('offline earnings are 50% of production and capped at 8 hours', () => {
  const s = fresh();
  s.buildings.sam = 1;
  assert.equal(E.offlineEarnings(s, NOW + 100 * 1000).amount, 50);
  const capped = E.offlineEarnings(s, NOW + 48 * 3600 * 1000);
  assert.equal(capped.seconds, 8 * 3600);
  assert.equal(capped.amount, 8 * 3600 * 0.5);
  assert.equal(E.offlineEarnings(s, NOW - 5000).amount, 0, 'clock going backwards gives nothing');
});

test('save files round-trip', () => {
  const s = fresh();
  s.leaves = 1234.5;
  s.totalEarned = 99999;
  s.clicks = 42;
  s.buildings.fountain = 3;
  s.upgrades.push('click1');
  s.achievements.push('earn1');
  const text = E.serialize(s, NOW + 5);
  const back = E.deserialize(text, NOW + 10);
  assert.equal(back.leaves, 1234.5);
  assert.equal(back.totalEarned, 99999);
  assert.equal(back.clicks, 42);
  assert.equal(back.buildings.fountain, 3);
  assert.deepEqual(back.upgrades, ['click1']);
  assert.deepEqual(back.achievements, ['earn1']);
  assert.equal(back.savedAt, NOW + 5);
});

test('bad or tampered save files are rejected or cleaned', () => {
  assert.throws(() => E.deserialize('not json'), /not valid JSON/);
  assert.throws(() => E.deserialize('{"game":"other","version":1,"state":{}}'), /not a Sycamore Sam Clicker save/);
  assert.throws(() => E.deserialize('{"game":"sycamore-sam-clicker","version":99,"state":{}}'), /newer version/);
  const dirty = JSON.stringify({
    game: 'sycamore-sam-clicker', version: 1,
    state: {
      leaves: -50, clicks: 'lots', totalEarned: 10,
      buildings: { sapling: 2.7, sam: -3, hacker: 999 },
      upgrades: ['click1', 'click1', 'fake'], achievements: 'nope',
    },
  });
  const s = E.deserialize(dirty, NOW);
  assert.equal(s.leaves, 0);
  assert.equal(s.clicks, 0);
  assert.equal(s.buildings.sapling, 2);
  assert.equal(s.buildings.sam, 0);
  assert.equal(s.buildings.hacker, undefined);
  assert.deepEqual(s.upgrades, ['click1']);
  assert.deepEqual(s.achievements, []);
});

test('numbers are formatted for display', () => {
  assert.equal(E.formatNumber(0), '0');
  assert.equal(E.formatNumber(12.34, 1), '12.3');
  assert.equal(E.formatNumber(1234567), '1.234 million');
  assert.equal(E.formatNumber(999999), '999,999');
  assert.equal(E.formatNumber(2.5e12), '2.500 trillion');
  assert.equal(E.formatNumber(1e40), '1.000e+40');
});

test('content data is consistent', () => {
  const ids = new Set();
  for (const list of [D.buildings, D.upgrades, D.achievements]) {
    for (const item of list) {
      assert.ok(!ids.has(item.id), 'duplicate id ' + item.id);
      ids.add(item.id);
    }
  }
  for (const u of D.upgrades) {
    assert.ok(u.cost > 0 && Number.isFinite(u.cost), u.id);
    if (u.type === 'building') assert.ok(E.buildingById[u.target], u.id);
  }
  for (let i = 1; i < D.buildings.length; i++) {
    assert.ok(D.buildings[i].baseCost > D.buildings[i - 1].baseCost);
  }
});
