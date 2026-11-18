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
  const SAVE_VERSION = 2;
  const PRICE_GROWTH = 1.15;
  const SELL_RATE = 0.25; // selling refunds 25% of a building's price
  const OFFLINE_RATE = 0.5; // fraction of production earned while away
  const OFFLINE_CAP_SECONDS = 8 * 60 * 60; // at most 8 hours of offline earnings
  const PRIDE_BASE = 1e9; // all-time leaves needed for the first Alumni Pride point
  const PRIDE_BONUS = 0.02; // +2% production per Alumni Pride point

  const buildingById = Object.fromEntries(data.buildings.map((b) => [b.id, b]));
  const upgradeById = Object.fromEntries(data.upgrades.map((u) => [u.id, u]));
  const achievementById = Object.fromEntries(data.achievements.map((a) => [a.id, a]));

  function newState(now = Date.now()) {
    const buildings = {};
    data.buildings.forEach((b) => { buildings[b.id] = 0; });
    return {
      leaves: 0, // current bank
      totalEarned: 0, // leaves earned this run (since the last graduation)
      allTimeEarned: 0, // leaves earned across all runs (never decreases)
      handmade: 0, // leaves earned by clicking (all time)
      clicks: 0, // all time
      goldenClicks: 0, // all time
      sold: 0, // buildings sold (all time)
      pride: 0, // Alumni Pride points (kept when graduating)
      graduations: 0,
      buildings,
      upgrades: [], // ids of purchased upgrades (this run)
      achievements: [], // ids of earned achievements (kept forever)
      buffs: [], // active golden-leaf effects: { name, kind: 'cps'|'click', mult, endsAt }
      startedAt: now,
      runStartedAt: now,
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

  /** Leaves refunded for selling up to `amount` of a building (fewer if fewer are owned). */
  function sellValue(state, id, amount = 1) {
    const b = buildingById[id];
    const owned = state.buildings[id] || 0;
    const n = Math.min(amount, owned);
    let total = 0;
    for (let k = 1; k <= n; k++) total += Math.floor(priceOf(b.baseCost, owned - k) * SELL_RATE);
    return total;
  }

  // ---- production ------------------------------------------------------------
  function owns(state, upgradeId) {
    return state.upgrades.includes(upgradeId);
  }

  function ownedUpgrades(state, type) {
    return state.upgrades.map((id) => upgradeById[id]).filter((u) => u && u.type === type);
  }

  /** Multiplier for one building: tier doublers x (1 + synergy bonuses). */
  function buildingMult(state, id) {
    const tiers = ownedUpgrades(state, 'building')
      .filter((u) => u.target === id)
      .reduce((m, u) => m * u.value, 1);
    const synergy = ownedUpgrades(state, 'synergy')
      .filter((u) => u.target === id)
      .reduce((s, u) => s + u.value * (state.buildings[u.source] || 0), 0);
    return tiers * (1 + synergy);
  }

  function prideMult(state) {
    return 1 + state.pride * PRIDE_BONUS;
  }

  function globalMult(state) {
    const fromUpgrades = ownedUpgrades(state, 'global').reduce((s, u) => s + u.value, 0);
    const fromAchievements = state.achievements.length * 0.01;
    return (1 + fromUpgrades) * (1 + fromAchievements) * prideMult(state);
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

  function activeBuffs(state, now = Date.now()) {
    return state.buffs.filter((b) => b.endsAt > now);
  }

  function buffMult(state, now = Date.now(), kind = 'cps') {
    return activeBuffs(state, now).filter((b) => b.kind === kind).reduce((m, b) => m * b.mult, 1);
  }

  /** Current leaves per second including any active buff. */
  function cps(state, now = Date.now()) {
    return baseCps(state) * buffMult(state, now, 'cps');
  }

  /** Leaves earned by one click of the big leaf. Starts at exactly 1. */
  function clickValue(state, now = Date.now()) {
    const mult = ownedUpgrades(state, 'click').reduce((m, u) => m * u.value, 1);
    const pct = ownedUpgrades(state, 'clickPct').reduce((s, u) => s + u.value, 0);
    return (1 * mult + cps(state, now) * pct) * buffMult(state, now, 'click');
  }

  // ---- actions ---------------------------------------------------------------
  function earn(state, amount) {
    if (!(amount > 0)) return;
    state.leaves += amount;
    state.totalEarned += amount;
    state.allTimeEarned += amount;
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
    if (state.buffs.length) state.buffs = activeBuffs(state, now);
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

  /** Sells up to `amount` of a building. Returns the refund (0 if none owned). */
  function sellBuilding(state, id, amount = 1) {
    if (!buildingById[id]) return 0;
    const n = Math.min(amount, state.buildings[id] || 0);
    if (n < 1) return 0;
    const refund = sellValue(state, id, n);
    state.buildings[id] -= n;
    state.leaves += refund; // a refund, not new earnings
    state.sold += n;
    return refund;
  }

  function reqMet(state, req) {
    if (!req) return true;
    if (req.earned != null && state.totalEarned < req.earned) return false;
    if (req.allTime != null && state.allTimeEarned < req.allTime) return false;
    if (req.clicks != null && state.clicks < req.clicks) return false;
    if (req.handmade != null && state.handmade < req.handmade) return false;
    if (req.building != null && (state.buildings[req.building] || 0) < req.count) return false;
    if (req.buildings != null) {
      for (const id of Object.keys(req.buildings)) {
        if ((state.buildings[id] || 0) < req.buildings[id]) return false;
      }
    }
    if (req.upgrades != null && state.upgrades.length < req.upgrades) return false;
    if (req.cps != null && baseCps(state) < req.cps) return false;
    if (req.golden != null && state.goldenClicks < req.golden) return false;
    if (req.sold != null && state.sold < req.sold) return false;
    if (req.graduations != null && state.graduations < req.graduations) return false;
    if (req.pride != null && state.pride < req.pride) return false;
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

  // ---- graduation (prestige) -----------------------------------------------------
  /** Total Alumni Pride earned by a given number of all-time leaves. */
  function prideFor(allTimeEarned) {
    return Math.floor(Math.cbrt(Math.max(0, allTimeEarned) / PRIDE_BASE));
  }

  /** Alumni Pride the player would gain by graduating now. */
  function pendingPride(state) {
    return Math.max(0, prideFor(state.allTimeEarned) - state.pride);
  }

  /** All-time leaves needed for the next Alumni Pride point. */
  function nextPrideAt(state) {
    return Math.pow(state.pride + pendingPride(state) + 1, 3) * PRIDE_BASE;
  }

  /**
   * Graduates: converts pending Alumni Pride into permanent points and starts a
   * new run. Keeps achievements, pride and all-time stats. Returns points gained.
   */
  function graduate(state, now = Date.now()) {
    const gained = pendingPride(state);
    if (gained < 1) return 0;
    state.pride += gained;
    state.graduations += 1;
    state.leaves = 0;
    state.totalEarned = 0;
    data.buildings.forEach((b) => { state.buildings[b.id] = 0; });
    state.upgrades = [];
    state.buffs = [];
    state.runStartedAt = now;
    return gained;
  }

  // ---- golden leaf -------------------------------------------------------------
  function addBuff(state, buff) {
    state.buffs = state.buffs.filter((b) => b.kind !== buff.kind).concat(buff);
  }

  /** Applies a golden-leaf reward. `roll` in [0,1) picks the effect. */
  function goldenLeaf(state, roll = Math.random(), now = Date.now()) {
    state.goldenClicks += 1;
    if (roll < 0.45) {
      addBuff(state, { name: 'Homecoming Frenzy', kind: 'cps', mult: 7, endsAt: now + 77 * 1000 });
      return { type: 'frenzy', title: 'Homecoming Frenzy!', text: 'Leaf production x7 for 77 seconds.' };
    }
    if (roll < 0.9) {
      const amount = Math.min(state.leaves * 0.15, baseCps(state) * 900) + 13;
      earn(state, amount);
      return { type: 'lucky', amount, title: 'Lucky Leaf!', text: 'You found extra leaves.' };
    }
    addBuff(state, { name: 'Blue Crew Roar', kind: 'click', mult: 77, endsAt: now + 13 * 1000 });
    return { type: 'clickFrenzy', title: 'Blue Crew Roar!', text: 'Clicks are worth x77 for 13 seconds. Click fast!' };
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

  function cleanBuff(b, now) {
    if (!b || typeof b.name !== 'string' || cleanNumber(b.mult, 0) <= 0 || cleanNumber(b.endsAt, 0) <= now) return null;
    return { name: b.name.slice(0, 60), kind: b.kind === 'click' ? 'click' : 'cps', mult: b.mult, endsAt: b.endsAt };
  }

  /**
   * Parses and validates a save (version 1 or 2). Throws an Error with a
   * readable message on bad input.
   */
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
    ['leaves', 'totalEarned', 'allTimeEarned', 'handmade', 'clicks', 'goldenClicks', 'sold',
      'graduations', 'startedAt', 'runStartedAt', 'savedAt']
      .forEach((k) => { s[k] = cleanNumber(src[k], s[k]); });
    if (typeof src.runStartedAt !== 'number') s.runStartedAt = s.startedAt; // version 1 saves
    s.totalEarned = Math.max(s.totalEarned, s.leaves);
    s.allTimeEarned = Math.max(s.allTimeEarned, s.totalEarned);
    s.pride = Math.min(Math.floor(cleanNumber(src.pride, 0)), prideFor(s.allTimeEarned));
    s.graduations = Math.floor(s.graduations);
    const srcBuildings = src.buildings && typeof src.buildings === 'object' ? src.buildings : {};
    data.buildings.forEach((b) => { s.buildings[b.id] = Math.floor(cleanNumber(srcBuildings[b.id], 0)); });
    const known = (list, table) => (Array.isArray(list) ? [...new Set(list)].filter((id) => table[id]) : []);
    s.upgrades = known(src.upgrades, upgradeById);
    s.achievements = known(src.achievements, achievementById);
    const buffs = Array.isArray(src.buffs) ? src.buffs : src.buff ? [src.buff] : []; // v1 had one `buff`
    s.buffs = buffs.map((b) => cleanBuff(b, now)).filter(Boolean).slice(0, 4);
    return s;
  }

  // ---- formatting -----------------------------------------------------------------
  const BIG_NAMES = ['million', 'billion', 'trillion', 'quadrillion', 'quintillion',
    'sextillion', 'septillion', 'octillion', 'nonillion', 'decillion'];
  const SHORT_NAMES = ['M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

  /** Formats a number for display. style 'long' = "1.234 million", 'short' = "1.234M". */
  function formatNumber(n, decimals = 0, style = 'long') {
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
    const digits = (Math.floor(scaled * 1000) / 1000).toFixed(3);
    return style === 'short' ? digits + SHORT_NAMES[tier] : digits + ' ' + BIG_NAMES[tier];
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
    GAME_ID, SAVE_VERSION, PRICE_GROWTH, SELL_RATE, OFFLINE_RATE, OFFLINE_CAP_SECONDS,
    PRIDE_BASE, PRIDE_BONUS,
    buildingById, upgradeById, achievementById,
    newState, priceOf, buildingCost, sellValue, owns, buildingMult, prideMult, globalMult,
    buildingCps, baseCps, activeBuffs, buffMult, cps, clickValue, earn, click, tick,
    buyBuilding, sellBuilding, reqMet, availableUpgrades, buyUpgrade, checkAchievements,
    prideFor, pendingPride, nextPrideAt, graduate, addBuff, goldenLeaf, offlineEarnings,
    serialize, deserialize, formatNumber, formatDuration,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
