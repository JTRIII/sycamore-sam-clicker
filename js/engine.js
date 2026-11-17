/*
 * Sycamore Sam Clicker - game engine.
 * Pure game rules with no DOM access, so they run in the browser and in the
 * Node test suite (tests/engine.test.js). Requires js/data.js to load first.
 */
(function (root) {
  'use strict';
  const SSC = (root.SSC = root.SSC || {});
  const data = SSC.data;

  const GAME_ID = 'sycamore-sam-clicker';
  const SAVE_VERSION = 1;
  const PRICE_GROWTH = 1.15;
  const OFFLINE_RATE = 0.5; // fraction of production earned while away
  const OFFLINE_CAP_SECONDS = 8 * 60 * 60; // at most 8 hours of offline earnings

  const buildingById = Object.fromEntries(data.buildings.map((b) => [b.id, b]));
  const upgradeById = Object.fromEntries(data.upgrades.map((u) => [u.id, u]));
  const achievementById = Object.fromEntries(data.achievements.map((a) => [a.id, a]));

  function newState(now = Date.now()) {
    const buildings = {};
    data.buildings.forEach((b) => { buildings[b.id] = 0; });
    return {
      leaves: 0, // current bank
      totalEarned: 0, // all-time leaves earned (never decreases)
      handmade: 0, // leaves earned by clicking
      clicks: 0,
      goldenClicks: 0,
      buildings,
      upgrades: [], // ids of purchased upgrades
      achievements: [], // ids of earned achievements
      buff: null, // { name, mult, endsAt }
      startedAt: now,
      savedAt: now,
    };
  }

  // ---- prices --------------------------------------------------------------
  function priceOf(baseCost, owned) {
    return Math.ceil(baseCost * Math.pow(PRICE_GROWTH, owned));
  }

  /** Total price of buying `amount` more of a building. */
  function buildingCost(state, id, amount = 1) {
    const b = buildingById[id];
    const owned = state.buildings[id] || 0;
    let total = 0;
    for (let i = 0; i < amount; i++) total += priceOf(b.baseCost, owned + i);
    return total;
  }

  // ---- production ------------------------------------------------------------
  function owns(state, upgradeId) {
    return state.upgrades.includes(upgradeId);
  }

  function ownedUpgrades(state, type) {
    return state.upgrades.map((id) => upgradeById[id]).filter((u) => u && u.type === type);
  }

  function buildingMult(state, id) {
    return ownedUpgrades(state, 'building')
      .filter((u) => u.target === id)
      .reduce((m, u) => m * u.value, 1);
  }

  function globalMult(state) {
    const fromUpgrades = ownedUpgrades(state, 'global').reduce((s, u) => s + u.value, 0);
    const fromAchievements = state.achievements.length * 0.01;
    return (1 + fromUpgrades) * (1 + fromAchievements);
  }

  /** Leaves per second produced by one building type (all copies). */
  function buildingCps(state, id) {
    const b = buildingById[id];
    return (state.buildings[id] || 0) * b.baseCps * buildingMult(state, id) * globalMult(state);
  }

  /** Leaves per second ignoring temporary buffs. */
  function baseCps(state) {
    return data.buildings.reduce((sum, b) => sum + buildingCps(state, b.id), 0);
  }

  function buffMult(state, now = Date.now()) {
    return state.buff && state.buff.endsAt > now ? state.buff.mult : 1;
  }

  /** Current leaves per second including any active buff. */
  function cps(state, now = Date.now()) {
    return baseCps(state) * buffMult(state, now);
  }

  /** Leaves earned by one click of the big leaf. Starts at exactly 1. */
  function clickValue(state, now = Date.now()) {
    const mult = ownedUpgrades(state, 'click').reduce((m, u) => m * u.value, 1);
    const pct = ownedUpgrades(state, 'clickPct').reduce((s, u) => s + u.value, 0);
    return 1 * mult + cps(state, now) * pct;
  }

  // ---- actions ---------------------------------------------------------------
  function earn(state, amount) {
    if (!(amount > 0)) return;
    state.leaves += amount;
    state.totalEarned += amount;
  }

  function click(state, now = Date.now()) {
    const gained = clickValue(state, now);
    earn(state, gained);
    state.handmade += gained;
    state.clicks += 1;
    return gained;
  }

  /** Advance the game by `seconds` of real time. */
  function tick(state, seconds, now = Date.now()) {
    if (state.buff && state.buff.endsAt <= now) state.buff = null;
    earn(state, cps(state, now) * seconds);
  }

  function buyBuilding(state, id, amount = 1) {
    if (!buildingById[id]) return false;
    const cost = buildingCost(state, id, amount);
    if (state.leaves < cost) return false;
    state.leaves -= cost;
    state.buildings[id] += amount;
    return true;
  }

  function reqMet(state, req) {
    if (!req) return true;
    if (req.earned != null && state.totalEarned < req.earned) return false;
    if (req.clicks != null && state.clicks < req.clicks) return false;
    if (req.building != null && (state.buildings[req.building] || 0) < req.count) return false;
    if (req.cps != null && baseCps(state) < req.cps) return false;
    if (req.golden != null && state.goldenClicks < req.golden) return false;
    return true;
  }

  /** Upgrades currently shown in the store, cheapest first. */
  function availableUpgrades(state) {
    return data.upgrades
      .filter((u) => !owns(state, u.id) && reqMet(state, u.req))
      .sort((a, b) => a.cost - b.cost);
  }

  function buyUpgrade(state, id) {
    const u = upgradeById[id];
    if (!u || owns(state, id) || !reqMet(state, u.req) || state.leaves < u.cost) return false;
    state.leaves -= u.cost;
    state.upgrades.push(id);
    return true;
  }

  /** Awards any newly met achievements and returns them. */
  function checkAchievements(state) {
    const earned = data.achievements.filter(
      (a) => !state.achievements.includes(a.id) && reqMet(state, a.req)
    );
    earned.forEach((a) => state.achievements.push(a.id));
    return earned;
  }

  // ---- golden leaf -------------------------------------------------------------
  /** Applies a golden-leaf reward. `roll` in [0,1) picks the effect. */
  function goldenLeaf(state, roll = Math.random(), now = Date.now()) {
    state.goldenClicks += 1;
    if (roll < 0.5) {
      state.buff = { name: 'Homecoming Frenzy', mult: 7, endsAt: now + 77 * 1000 };
      return { type: 'frenzy', text: 'Homecoming Frenzy! Production x7 for 77 seconds.' };
    }
    const amount = Math.min(state.leaves * 0.15, baseCps(state) * 900) + 13;
    earn(state, amount);
    return { type: 'lucky', amount, text: 'Lucky Leaf!' };
  }

  // ---- offline progress ---------------------------------------------------------
  function offlineEarnings(state, now = Date.now()) {
    const seconds = Math.min(Math.max(0, (now - state.savedAt) / 1000), OFFLINE_CAP_SECONDS);
    return { seconds, amount: baseCps(state) * seconds * OFFLINE_RATE };
  }

  // ---- saving / loading ----------------------------------------------------------
  function serialize(state, now = Date.now()) {
    state.savedAt = now;
    return JSON.stringify({ game: GAME_ID, version: SAVE_VERSION, state }, null, 2);
  }

  function cleanNumber(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  /** Parses and validates a save. Throws an Error with a readable message on bad input. */
  function deserialize(text, now = Date.now()) {
    let obj;
    try {
      obj = JSON.parse(text);
    } catch (e) {
      throw new Error('That file could not be read as a save (it is not valid JSON).');
    }
    if (!obj || obj.game !== GAME_ID || typeof obj.state !== 'object' || obj.state === null) {
      throw new Error('That file is not a Sycamore Sam Clicker save.');
    }
    if (typeof obj.version !== 'number' || obj.version > SAVE_VERSION) {
      throw new Error('That save was made by a newer version of the game.');
    }
    const src = obj.state;
    const s = newState(now);
    ['leaves', 'totalEarned', 'handmade', 'clicks', 'goldenClicks', 'startedAt', 'savedAt']
      .forEach((k) => { s[k] = cleanNumber(src[k], s[k]); });
    s.totalEarned = Math.max(s.totalEarned, s.leaves);
    const srcBuildings = src.buildings && typeof src.buildings === 'object' ? src.buildings : {};
    data.buildings.forEach((b) => { s.buildings[b.id] = Math.floor(cleanNumber(srcBuildings[b.id], 0)); });
    const known = (list, table) => (Array.isArray(list) ? [...new Set(list)].filter((id) => table[id]) : []);
    s.upgrades = known(src.upgrades, upgradeById);
    s.achievements = known(src.achievements, achievementById);
    const buff = src.buff;
    if (buff && typeof buff.name === 'string' && cleanNumber(buff.mult, 0) > 0 && cleanNumber(buff.endsAt, 0) > now) {
      s.buff = { name: buff.name, mult: buff.mult, endsAt: buff.endsAt };
    }
    return s;
  }

  // ---- formatting -----------------------------------------------------------------
  const BIG_NAMES = ['million', 'billion', 'trillion', 'quadrillion', 'quintillion',
    'sextillion', 'septillion', 'octillion', 'nonillion', 'decillion'];

  function formatNumber(n, decimals = 0) {
    if (!Number.isFinite(n)) return 'Infinity';
    if (Math.abs(n) < 1e6) {
      const d = Math.abs(n) < 1000 ? decimals : 0;
      const factor = Math.pow(10, d);
      const v = Math.floor(n * factor) / factor;
      return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d });
    }
    const tier = Math.floor(Math.log10(Math.abs(n)) / 3) - 2; // 0 = million
    if (tier >= BIG_NAMES.length) return n.toExponential(3);
    const scaled = n / Math.pow(10, (tier + 2) * 3);
    return (Math.floor(scaled * 1000) / 1000).toFixed(3) + ' ' + BIG_NAMES[tier];
  }

  function formatDuration(seconds) {
    const s = Math.floor(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h) return h + 'h ' + m + 'm';
    if (m) return m + 'm ' + sec + 's';
    return sec + 's';
  }

  SSC.engine = {
    GAME_ID, SAVE_VERSION, PRICE_GROWTH, OFFLINE_RATE, OFFLINE_CAP_SECONDS,
    buildingById, upgradeById, achievementById,
    newState, priceOf, buildingCost, owns, buildingMult, globalMult, buildingCps,
    baseCps, buffMult, cps, clickValue, earn, click, tick, buyBuilding, reqMet,
    availableUpgrades, buyUpgrade, checkAchievements, goldenLeaf, offlineEarnings,
    serialize, deserialize, formatNumber, formatDuration,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
