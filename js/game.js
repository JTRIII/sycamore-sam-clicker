/*
 * Sycamore Sam Clicker - browser UI.
 * Wires the engine (js/engine.js) to the page: rendering, input, the game
 * loop, settings, sound, autosave, and save-file export/import.
 */
(function () {
  'use strict';
  const { data, engine, audio } = window.SSC;

  const SAVE_KEY = 'sycamoreSamClicker.save';
  const SETTINGS_KEY = 'sycamoreSamClicker.settings';
  const AUTOSAVE_MS = 60 * 1000; // requirement: autosave every minute
  const BACKUP_REMINDER_MS = 30 * 60 * 1000;
  const LONG_PRESS_MS = 450;
  const TICK_MS = 100;
  const params = new URLSearchParams(location.search);
  const FAST_GOLDEN = params.has('golden'); // ?golden for testing golden leaves
  const reducedMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touchFirst = window.matchMedia && matchMedia('(hover: none)').matches;

  const DEFAULT_SETTINGS = {
    sound: true, volume: 50, fallingLeaves: !reducedMotion, floatingText: true,
    news: true, shortNumbers: false, backupReminder: true, lastExport: 0,
  };

  let state = engine.newState();
  let settings = loadSettings();
  let buyAmount = 1;
  let storeMode = 'buy'; // 'buy' or 'sell'
  let lastTick = performance.now();
  let lastReminder = Date.now();
  let lastPointerType = 'mouse';
  const imageOk = {}; // image key -> loaded image URL

  const fmt = (n, d) => engine.formatNumber(n, d, settings.shortNumbers ? 'short' : 'long');
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LEAF_MINI = '<img class="leaf-mini" src="images/isu-leaf.svg" alt="leaves">';
  const sound = (name) => audio && audio.play(name);

  // ------------------------------------------------------------------ settings
  function loadSettings() {
    const out = Object.assign({}, DEFAULT_SETTINGS);
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      if (saved && typeof saved === 'object') {
        Object.keys(DEFAULT_SETTINGS).forEach((k) => {
          if (typeof saved[k] === typeof DEFAULT_SETTINGS[k]) out[k] = saved[k];
        });
      }
    } catch (e) { /* use defaults */ }
    return out;
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* not critical */ }
  }

  function applySettings() {
    if (audio) {
      audio.setEnabled(settings.sound);
      audio.setVolume(settings.volume / 100);
    }
    document.querySelector('.ticker').hidden = !settings.news;
    document.querySelectorAll('[data-setting]').forEach((input) => {
      const k = input.dataset.setting;
      if (input.type === 'checkbox') input.checked = !!settings[k];
      else input.value = settings[k];
    });
    const vol = document.querySelector('[data-setting="volume"]');
    if (vol) vol.disabled = !settings.sound;
  }

  // ------------------------------------------------------------------ images
  /** Swaps in real ISU photos listed in images/images.js; emoji are used otherwise. */
  function loadImages() {
    const list = window.SSC.images || {};
    Object.keys(list).forEach((key) => {
      if (!list[key]) return;
      const img = new Image();
      img.onload = () => {
        imageOk[key] = img.src;
        if (key === 'leaf') {
          const big = el('img');
          big.src = img.src;
          big.alt = '';
          $('leafSvg').replaceWith(big);
        } else {
          buildStore();
          renderCampus(true);
        }
      };
      img.onerror = () => console.warn('Image not found for "' + key + '": ' + list[key]);
      img.src = list[key];
    });
  }

  function iconFor(key, emoji, alt) {
    if (imageOk[key]) {
      const img = el('img', 'icon');
      img.src = imageOk[key];
      img.alt = alt || '';
      img.draggable = false;
      return img;
    }
    const span = el('span', 'icon', emoji);
    span.setAttribute('aria-hidden', 'true');
    return span;
  }

  function upgradeIcon(u) {
    return u.target ? iconFor(u.target, u.icon) : iconFor(u.type, u.icon);
  }

  // ------------------------------------------------------------------ saving
  function saveLocal(reason) {
    try {
      localStorage.setItem(SAVE_KEY, engine.serialize(state));
      $('saveStatus').textContent = 'Saved ' + new Date().toLocaleTimeString() + (reason === 'auto' ? ' (autosave)' : '');
      return true;
    } catch (e) {
      $('saveStatus').textContent = 'Browser saving unavailable - use Export save';
      return false;
    }
  }

  function loadLocal() {
    try {
      const text = localStorage.getItem(SAVE_KEY);
      return text ? engine.deserialize(text) : null;
    } catch (e) {
      console.warn('Could not load browser save:', e);
      return null;
    }
  }

  function exportSave() {
    const text = engine.serialize(state);
    const blob = new Blob([text], { type: 'application/json' });
    const a = el('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    a.href = URL.createObjectURL(blob);
    a.download = 'sycamore-sam-save-' + stamp + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    settings.lastExport = Date.now();
    saveSettings();
    saveLocal();
    toast('Save exported', 'Your save file was downloaded. Use "Import save" to load it later.');
  }

  function importSave(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const loaded = engine.deserialize(String(reader.result));
        state = loaded;
        state.savedAt = Date.now(); // no offline bonus for imported files
        refreshAll();
        saveLocal();
        toast('Save imported', 'Welcome back! You have ' + fmt(state.leaves) + ' leaves.');
      } catch (e) {
        toast('Import failed', e.message, 'error');
      }
    };
    reader.onerror = () => toast('Import failed', 'The file could not be read.', 'error');
    reader.readAsText(file);
  }

  function resetGame() {
    if (!confirm('Reset ALL progress? This wipes your leaves, buildings, upgrades, achievements and Alumni Pride.\n\n'
      + 'To start a new run but keep permanent bonuses, use Graduate instead.\n'
      + 'Tip: use "Export save" first if you want a backup.')) return;
    state = engine.newState();
    refreshAll();
    saveLocal();
    toast('Fresh start', 'Your grove has been replanted.');
  }

  // ------------------------------------------------------------------ toasts / tooltip
  function toast(title, body, kind, action) {
    const t = el('div', 'toast' + (kind ? ' ' + kind : ''));
    t.appendChild(el('strong', null, title));
    if (body) t.appendChild(el('span', null, body));
    if (action) {
      const b = el('button', 'toast-action', action.label);
      b.type = 'button';
      b.addEventListener('click', () => { t.remove(); action.fn(); });
      t.appendChild(b);
    }
    $('toasts').appendChild(t);
    while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
    setTimeout(() => t.remove(), action ? 15000 : kind === 'error' ? 7000 : 4500);
  }

  let tooltipSource = null;
  function showTooltip(target, html) {
    tooltipSource = target;
    const tt = $('tooltip');
    tt.innerHTML = html;
    tt.hidden = false;
    const r = target.getBoundingClientRect();
    const tw = tt.offsetWidth, th = tt.offsetHeight;
    let left = r.left - tw - 10;
    if (left < 8) left = Math.min(r.right + 10, window.innerWidth - tw - 8);
    let top = Math.min(Math.max(8, r.top), window.innerHeight - th - 8);
    if (left < 8) { // narrow screen: place above or below the item
      left = Math.max(8, Math.min(r.left, window.innerWidth - tw - 8));
      top = r.top - th - 8 > 8 ? r.top - th - 8 : Math.min(r.bottom + 8, window.innerHeight - th - 8);
    }
    tt.style.left = left + 'px';
    tt.style.top = Math.max(8, top) + 'px';
  }
  function hideTooltip() { tooltipSource = null; $('tooltip').hidden = true; }

  /**
   * Mouse/keyboard: tooltip on hover or focus. Touch: press and hold shows the
   * tooltip without buying (a normal tap still buys).
   */
  function attachTooltip(node, htmlFn) {
    let timer = null;
    const show = () => showTooltip(node, htmlFn());
    node.addEventListener('mouseenter', () => { if (lastPointerType !== 'touch') show(); });
    node.addEventListener('focus', () => { if (lastPointerType !== 'touch') show(); });
    node.addEventListener('mouseleave', () => { if (lastPointerType !== 'touch') hideTooltip(); });
    node.addEventListener('blur', () => { if (lastPointerType !== 'touch') hideTooltip(); });
    node.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      node._longPressed = false;
      clearTimeout(timer);
      timer = setTimeout(() => {
        node._longPressed = true;
        show();
        try { if (navigator.vibrate) navigator.vibrate(10); } catch (err) { /* optional */ }
      }, LONG_PRESS_MS);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => node.addEventListener(ev, () => clearTimeout(timer)));
    node.addEventListener('contextmenu', (e) => { if (lastPointerType === 'touch') e.preventDefault(); });
    node._tooltip = htmlFn;
  }

  /** True (once) if this click is the end of a long press, which should not buy. */
  function wasLongPress(node) {
    if (!node._longPressed) return false;
    node._longPressed = false;
    return true;
  }

  function buildingTooltip(b) {
    const owned = state.buildings[b.id];
    const each = owned ? engine.buildingCps(state, b.id) / owned
      : b.baseCps * engine.buildingMult(state, b.id) * engine.globalMult(state);
    const total = engine.buildingCps(state, b.id);
    const share = engine.baseCps(state) ? (100 * total / engine.baseCps(state)).toFixed(1) : '0';
    let head;
    if (storeMode === 'sell') {
      const n = Math.min(buyAmount, owned);
      head = '<div class="tt-head"><span>' + escapeHtml(b.name) + '</span><span class="tt-cost sell">+' + LEAF_MINI + ' ' + fmt(engine.sellValue(state, b.id, buyAmount)) + '</span></div>'
        + '<div class="tt-tag">owned: ' + owned + ' · selling ' + n + ' for ' + Math.round(engine.SELL_RATE * 100) + '% of the price</div>';
    } else {
      const cost = engine.buildingCost(state, b.id, buyAmount);
      head = '<div class="tt-head"><span>' + escapeHtml(b.name) + '</span><span class="tt-cost' + (state.leaves >= cost ? '' : ' no') + '">' + LEAF_MINI + ' ' + fmt(cost) + '</span></div>'
        + '<div class="tt-tag">owned: ' + owned + (buyAmount > 1 ? ' · buying ' + buyAmount : '') + '</div>';
    }
    return head
      + '<p class="tt-flavor">' + escapeHtml(b.desc) + '</p>'
      + '<p>Each produces <b>' + fmt(each, 1) + '</b> leaves per second.'
      + (owned ? '<br>' + owned + ' producing <b>' + fmt(total, 1) + '</b> per second (' + share + '% of total).' : '') + '</p>';
  }

  function upgradeTooltip(u) {
    const can = state.leaves >= u.cost;
    const tag = u.type === 'synergy' ? 'synergy upgrade' : 'upgrade';
    return '<div class="tt-head"><span>' + escapeHtml(u.name) + '</span><span class="tt-cost' + (can ? '' : ' no') + '">' + LEAF_MINI + ' ' + fmt(u.cost) + '</span></div>'
      + '<div class="tt-tag">' + tag + '</div><p>' + escapeHtml(u.desc) + '</p>';
  }

  // ------------------------------------------------------------------ store
  let upgradeKey = null;
  let buildingKey = null;

  /** Buildings shown: all owned or affordable-so-far ones, plus one "???" teaser. */
  function visibleBuildings() {
    let lastOwned = -1;
    data.buildings.forEach((b, i) => {
      if (state.buildings[b.id] > 0 || state.totalEarned >= b.baseCost * 0.5) lastOwned = i;
    });
    return data.buildings.slice(0, Math.min(data.buildings.length, Math.max(lastOwned + 1, 1) + 1))
      .map((b, i, arr) => ({ b, mystery: i === arr.length - 1 && i > lastOwned && state.buildings[b.id] === 0 }));
  }

  function buildStore() {
    upgradeKey = null;
    buildingKey = null;
    renderUpgrades();
    renderBuildings();
  }

  function renderUpgrades() {
    const list = engine.availableUpgrades(state);
    const key = list.map((u) => u.id).join(',') + '|' + settings.shortNumbers;
    const box = $('upgrades');
    if (key !== upgradeKey) {
      upgradeKey = key;
      box.textContent = '';
      if (!list.length) box.appendChild(el('div', 'empty', 'Keep clicking to unlock upgrades!'));
      list.forEach((u) => {
        const btn = el('button', 'upgrade' + (u.type === 'synergy' ? ' synergy' : ''));
        btn.type = 'button';
        btn.dataset.id = u.id;
        btn.setAttribute('aria-label', 'Upgrade: ' + u.name + ', costs ' + fmt(u.cost) + ' leaves. ' + u.desc);
        btn.appendChild(upgradeIcon(u));
        btn.addEventListener('click', () => {
          if (wasLongPress(btn)) return;
          if (engine.buyUpgrade(state, u.id)) {
            hideTooltip();
            sound('upgrade');
            toast('Upgrade purchased', u.name);
            afterPurchase();
          }
        });
        attachTooltip(btn, () => upgradeTooltip(u));
        box.appendChild(btn);
      });
    }
    box.querySelectorAll('.upgrade').forEach((btn) => {
      const can = state.leaves >= engine.upgradeById[btn.dataset.id].cost;
      btn.classList.toggle('can-buy', can);
      btn.classList.toggle('cant-buy', !can);
    });
  }

  function onBuildingClick(btn, b) {
    if (wasLongPress(btn)) return;
    if (storeMode === 'sell') {
      if (state.buildings[b.id] < 1) return;
      const refund = engine.sellBuilding(state, b.id, buyAmount);
      sound('sell');
      floatTextAt(btn, '+' + fmt(refund));
    } else {
      if (!engine.buyBuilding(state, b.id, buyAmount)) return;
      sound('buy');
    }
    afterPurchase();
    if (tooltipSource === btn) showTooltip(btn, buildingTooltip(b));
  }

  function renderBuildings() {
    const vis = visibleBuildings();
    const key = vis.map((v) => v.b.id + (v.mystery ? '?' : '')).join(',');
    const box = $('buildings');
    box.classList.toggle('selling', storeMode === 'sell');
    if (key !== buildingKey) {
      buildingKey = key;
      box.textContent = '';
      vis.forEach(({ b, mystery }) => {
        const btn = el('button', 'building' + (mystery ? ' mystery' : ''));
        btn.type = 'button';
        btn.dataset.id = b.id;
        btn.appendChild(iconFor(b.id, b.icon, b.name));
        const mid = el('span');
        mid.appendChild(el('span', 'name', mystery ? '???' : b.name));
        mid.appendChild(el('span', 'price'));
        btn.appendChild(mid);
        btn.appendChild(el('span', 'owned'));
        if (mystery) {
          btn.disabled = true;
        } else {
          btn.addEventListener('click', () => onBuildingClick(btn, b));
          attachTooltip(btn, () => buildingTooltip(b));
        }
        box.appendChild(btn);
      });
    }
    box.querySelectorAll('.building').forEach((btn) => {
      const id = btn.dataset.id;
      const name = engine.buildingById[id].name;
      const owned = state.buildings[id];
      let can, priceText, label;
      if (storeMode === 'sell' && !btn.classList.contains('mystery')) {
        can = owned > 0;
        priceText = '+' + fmt(engine.sellValue(state, id, buyAmount));
        label = 'Sell ' + Math.min(buyAmount, owned) + ' ' + name + ' for ' + priceText + ' leaves. Owned: ' + owned;
      } else {
        const cost = engine.buildingCost(state, id, buyAmount);
        can = state.leaves >= cost;
        priceText = fmt(cost);
        label = 'Buy ' + buyAmount + ' ' + name + ' for ' + priceText + ' leaves. Owned: ' + owned;
      }
      const price = btn.querySelector('.price');
      if (price.textContent !== priceText) price.textContent = priceText;
      const ownedEl = btn.querySelector('.owned');
      const ownedText = owned ? String(owned) : '';
      if (ownedEl.textContent !== ownedText) ownedEl.textContent = ownedText;
      btn.classList.toggle('can-buy', can);
      btn.classList.toggle('cant-buy', !can);
      if (!btn.classList.contains('mystery')) btn.setAttribute('aria-label', label);
    });
  }

  function afterPurchase() {
    renderUpgrades();
    renderBuildings();
    renderCampus();
    renderCounter();
    checkAchievements();
  }

  // ------------------------------------------------------------------ campus
  const MAX_ICONS = 40;
  let campusKey = '';
  function renderCampus(force) {
    const key = data.buildings.map((b) => state.buildings[b.id]).join(',') + '|' + settings.shortNumbers;
    if (key === campusKey && !force) return;
    campusKey = key;
    const box = $('campus');
    box.textContent = '';
    const owned = data.buildings.filter((b) => state.buildings[b.id] > 0);
    if (!owned.length) {
      box.appendChild(el('p', 'campus-empty', 'Your campus is empty. Click the leaf, then buy a Sycamore Sapling from the store to start producing leaves automatically.'));
      return;
    }
    owned.forEach((b) => {
      const n = state.buildings[b.id];
      const row = el('div', 'campus-row');
      if (imageOk[b.id]) {
        row.classList.add('has-photo');
        row.style.backgroundImage = 'linear-gradient(90deg, rgba(0,36,59,0.94) 0%, rgba(0,58,93,0.80) 55%, rgba(0,58,93,0.45) 100%), url("' + imageOk[b.id] + '")';
      }
      const h = el('h3');
      h.appendChild(el('span', 'campus-name', b.name));
      h.appendChild(el('span', null, n + ' owned · ' + fmt(engine.buildingCps(state, b.id), 1) + '/s'));
      row.appendChild(h);
      const icons = el('div', 'campus-icons');
      for (let i = 0; i < Math.min(n, MAX_ICONS); i++) icons.appendChild(iconFor(b.id, b.icon));
      if (n > MAX_ICONS) icons.appendChild(el('span', 'more', '+' + (n - MAX_ICONS) + ' more'));
      row.appendChild(icons);
      box.appendChild(row);
    });
  }

  // ------------------------------------------------------------------ counter / stats / panels
  function renderCounter() {
    const now = Date.now();
    const leaves = Math.floor(state.leaves);
    $('leafCount').textContent = fmt(leaves) + (leaves === 1 ? ' leaf' : ' leaves');
    $('cpsLabel').textContent = 'per second: ' + fmt(engine.cps(state, now), 1);
    document.title = fmt(leaves) + ' leaves - Sycamore Sam Clicker';
    const bar = $('buffBar');
    const buffs = engine.activeBuffs(state, now);
    if (buffs.length) {
      bar.hidden = false;
      const text = buffs.map((b) => b.name + ' x' + b.mult + (b.kind === 'click' ? ' clicks' : '') + ' · ' + Math.ceil((b.endsAt - now) / 1000) + 's').join('\n');
      if (bar.textContent !== text) bar.textContent = text;
    } else if (!bar.hidden) {
      bar.hidden = true;
    }
  }

  function renderStats() {
    if ($('statsPanel').hidden) return;
    const now = Date.now();
    const rows = [
      ['Leaves in bank', fmt(state.leaves)],
      ['Leaves earned (this run)', fmt(state.totalEarned)],
      ['Leaves earned (all time)', fmt(state.allTimeEarned)],
      ['Leaves per second', fmt(engine.cps(state, now), 1)],
      ['Leaves per click', fmt(engine.clickValue(state, now), 1)],
      ['Leaf clicks', fmt(state.clicks)],
      ['Leaves from clicking', fmt(state.handmade)],
      ['Buildings owned', fmt(Object.values(state.buildings).reduce((a, b) => a + b, 0))],
      ['Buildings sold', fmt(state.sold)],
      ['Upgrades purchased', state.upgrades.length + ' / ' + data.upgrades.length],
      ['Golden leaves clicked', fmt(state.goldenClicks)],
      ['Production bonus', '+' + fmt(Math.round((engine.globalMult(state) - 1) * 100)) + '%'],
      ['Graduations', fmt(state.graduations)],
      ['This run started', new Date(state.runStartedAt).toLocaleDateString()],
      ['Playing since', new Date(state.startedAt).toLocaleDateString()],
    ];
    const dl = $('statsList');
    dl.textContent = '';
    rows.forEach(([k, v]) => { dl.appendChild(el('dt', null, k)); dl.appendChild(el('dd', null, v)); });

    const pending = engine.pendingPride(state);
    const info = $('gradInfo');
    info.textContent = '';
    info.appendChild(el('p', null, 'Alumni Pride: ' + fmt(state.pride) + ' (+' + pridePct(state.pride) + '% production, kept forever).'));
    if (pending > 0) {
      info.appendChild(el('p', 'grad-ready', 'Graduate now to earn ' + fmt(pending) + ' more Alumni Pride. Use the Graduate button in the top bar.'));
    } else {
      info.appendChild(el('p', null, 'Earn ' + fmt(engine.nextPrideAt(state)) + ' leaves (all time) to unlock your '
        + (state.pride ? 'next' : 'first') + ' Alumni Pride point. You have ' + fmt(state.allTimeEarned) + '.'));
    }

    $('achCount').textContent = '(' + state.achievements.length + ' / ' + data.achievements.length + ')';
    const list = $('achList');
    if (list.dataset.count !== String(state.achievements.length)) {
      list.dataset.count = String(state.achievements.length);
      list.textContent = '';
      data.achievements.forEach((a) => {
        const got = state.achievements.includes(a.id);
        const d = el('div', 'ach ' + (got ? 'earned' : 'locked'));
        d.appendChild(el('strong', null, a.name));
        d.appendChild(el('span', null, a.desc));
        list.appendChild(d);
      });
    }
  }

  /** Shows one overlay panel in the middle column ('stats', 'settings') or none. */
  function showPanel(name) {
    [['stats', 'statsPanel', 'btnStats'], ['settings', 'settingsPanel', 'btnSettings']].forEach(([n, panel, btn]) => {
      const open = n === name;
      $(panel).hidden = !open;
      $(btn).setAttribute('aria-pressed', String(open));
    });
    renderStats();
  }

  function togglePanel(name) {
    const panel = $(name === 'stats' ? 'statsPanel' : 'settingsPanel');
    showPanel(panel.hidden ? name : null);
  }

  function checkAchievements() {
    const got = engine.checkAchievements(state);
    if (got.length) sound('achievement');
    got.forEach((a) => toast('Achievement unlocked: ' + a.name, a.desc + ' (+1% production)', 'gold'));
  }

  // ------------------------------------------------------------------ graduation
  const pridePct = (p) => fmt(Math.round(p * engine.PRIDE_BONUS * 100));

  function updateGraduateButton() {
    const pending = engine.pendingPride(state);
    const btn = $('btnGraduate');
    btn.hidden = pending < 1;
    btn.textContent = pending >= 1 ? 'Graduate (+' + fmt(pending) + ')' : 'Graduate';
  }

  function doGraduate() {
    const gained = engine.graduate(state);
    if (!gained) return;
    sound('graduate');
    toast('Congratulations, graduate!', 'You earned ' + fmt(gained) + ' Alumni Pride. Your Alumni Pride bonus is now +' + pridePct(state.pride) + '% production, forever.', 'gold');
    checkAchievements();
    refreshAll();
    saveLocal();
  }

  function askGraduate() {
    const pending = engine.pendingPride(state);
    if (pending < 1) return;
    const text = 'You will earn ' + fmt(pending) + ' Alumni Pride, for a total of ' + fmt(state.pride + pending)
      + ' (+' + pridePct(state.pride + pending) + '% production).';
    const dlg = $('graduateDialog');
    if (dlg && typeof dlg.showModal === 'function') {
      $('gradDialogText').textContent = text;
      dlg.returnValue = '';
      dlg.showModal();
    } else if (confirm('Graduate?\n\n' + text + '\n\nYou keep achievements and Alumni Pride; leaves, buildings and upgrades start over.')) {
      doGraduate();
    }
  }

  // ------------------------------------------------------------------ clicking & effects
  function onLeafClick(ev) {
    const gained = engine.click(state);
    sound('click');
    let x = ev.clientX, y = ev.clientY;
    if (!x && !y) { // keyboard activation: use the leaf's center
      const r = $('bigLeaf').getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 3;
    }
    floatText('+' + fmt(gained, 1), x, y);
    if (settings.fallingLeaves && Math.random() < 0.5) fallingLeaf();
    renderCounter();
  }

  function floatText(text, x, y) {
    if (!settings.floatingText) return;
    if (document.querySelectorAll('.float-text').length > 25) return;
    const f = el('div', 'float-text', text);
    f.style.left = x + (Math.random() * 30 - 15) + 'px';
    f.style.top = y - 20 + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1000);
  }

  function floatTextAt(node, text) {
    const r = node.getBoundingClientRect();
    floatText(text, r.left + r.width / 2, r.top + r.height / 2);
  }

  function fallingLeaf() {
    if (document.querySelectorAll('.falling-leaf').length > 20) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 200 200');
    svg.setAttribute('class', 'falling-leaf');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#leaf-shape');
    svg.appendChild(use);
    const leftPanel = document.querySelector('.leaf-panel').getBoundingClientRect();
    svg.style.left = leftPanel.left + Math.random() * (leftPanel.width - 22) + 'px';
    const dur = 3 + Math.random() * 2;
    svg.style.animationDuration = dur + 's';
    document.body.appendChild(svg);
    setTimeout(() => svg.remove(), dur * 1000);
  }

  // ------------------------------------------------------------------ golden leaf
  function scheduleGolden() {
    const delay = FAST_GOLDEN ? 3000 + Math.random() * 3000 : (120 + Math.random() * 180) * 1000;
    setTimeout(spawnGolden, delay);
  }

  function spawnGolden() {
    const btn = el('button', 'golden-leaf golden');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Golden Sycamore Leaf! Click it for a bonus.');
    btn.innerHTML = '<svg viewBox="0 0 200 200" aria-hidden="true"><use href="#leaf-shape"/></svg>';
    btn.style.left = 20 + Math.random() * (window.innerWidth - 120) + 'px';
    btn.style.top = 80 + Math.random() * (window.innerHeight - 180) + 'px';
    let done = false;
    const finish = () => { if (done) return; done = true; btn.remove(); scheduleGolden(); };
    btn.addEventListener('click', (ev) => {
      const result = engine.goldenLeaf(state);
      sound('reward');
      if (result.type === 'lucky') {
        toast(result.title, 'You found ' + fmt(result.amount) + ' leaves.', 'gold');
        floatText('+' + fmt(result.amount), ev.clientX || window.innerWidth / 2, ev.clientY || window.innerHeight / 2);
      } else {
        toast(result.title, result.text, 'gold');
      }
      checkAchievements();
      renderCounter();
      finish();
    });
    document.body.appendChild(btn);
    sound('golden');
    setTimeout(finish, 13000);
  }

  // ------------------------------------------------------------------ news ticker
  function rotateNews() {
    if (!settings.news) return;
    const line = data.news[Math.floor(Math.random() * data.news.length)];
    const text = typeof line === 'function' ? line(state) : line;
    const span = $('news');
    const fresh = span.cloneNode(false);
    fresh.textContent = text;
    span.replaceWith(fresh);
  }

  // ------------------------------------------------------------------ loop
  function tick() {
    const nowPerf = performance.now();
    const dt = Math.min((nowPerf - lastTick) / 1000, 5); // clamp long stalls; offline handles the rest
    lastTick = nowPerf;
    engine.tick(state, dt);
    renderCounter();
    renderUpgrades();
    renderBuildings();
  }

  function slowTick() {
    checkAchievements();
    renderCampus();
    renderStats();
    updateGraduateButton();
    if (tooltipSource && tooltipSource._tooltip && document.body.contains(tooltipSource)) {
      showTooltip(tooltipSource, tooltipSource._tooltip());
    }
    maybeRemindBackup();
  }

  function maybeRemindBackup() {
    if (!settings.backupReminder || state.allTimeEarned < 1000) return;
    const now = Date.now();
    if (now - Math.max(settings.lastExport, lastReminder) < BACKUP_REMINDER_MS) return;
    lastReminder = now;
    toast('Back up your progress', 'Export a save file so you can restore your game if browser data is ever cleared.', null,
      { label: 'Export save', fn: exportSave });
  }

  function refreshAll() {
    hideTooltip();
    $('achList').dataset.count = '';
    buildStore();
    renderCampus(true);
    renderCounter();
    renderStats();
    updateGraduateButton();
  }

  // ------------------------------------------------------------------ setup
  function bindUi() {
    const leaf = $('bigLeaf');
    leaf.addEventListener('click', onLeafClick);
    leaf.addEventListener('keydown', (e) => { if (e.repeat) e.preventDefault(); }); // no hold-to-autoclick

    $('btnSave').addEventListener('click', () => { if (saveLocal()) toast('Game saved', 'Your progress is saved in this browser.'); });
    $('btnExport').addEventListener('click', exportSave);
    $('btnImport').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) importSave(file);
      e.target.value = '';
    });
    $('btnReset').addEventListener('click', resetGame);
    $('btnStats').addEventListener('click', () => togglePanel('stats'));
    $('btnSettings').addEventListener('click', () => togglePanel('settings'));
    $('btnGraduate').addEventListener('click', askGraduate);
    $('graduateDialog').addEventListener('close', () => {
      if ($('graduateDialog').returnValue === 'confirm') doGraduate();
    });

    document.querySelectorAll('.buy-amount.amounts button').forEach((b) => {
      b.addEventListener('click', () => {
        buyAmount = Number(b.dataset.amount);
        document.querySelectorAll('.buy-amount.amounts button').forEach((x) => x.classList.toggle('active', x === b));
        renderBuildings();
      });
    });
    document.querySelectorAll('.buy-amount.mode button').forEach((b) => {
      b.addEventListener('click', () => {
        storeMode = b.dataset.mode;
        document.querySelectorAll('.buy-amount.mode button').forEach((x) => x.classList.toggle('active', x === b));
        hideTooltip();
        renderBuildings();
      });
    });

    document.querySelectorAll('[data-setting]').forEach((input) => {
      input.addEventListener(input.type === 'range' ? 'input' : 'change', () => {
        const k = input.dataset.setting;
        settings[k] = input.type === 'checkbox' ? input.checked : Number(input.value);
        saveSettings();
        applySettings();
        if (k === 'shortNumbers') refreshAll();
        if (k === 'news' && settings.news) rotateNews();
        if (k === 'sound' || k === 'volume') sound('buy'); // preview the volume
      });
    });

    // Remember how the player last pointed, so touch taps don't open hover tooltips.
    document.addEventListener('pointerdown', (e) => {
      lastPointerType = e.pointerType || 'mouse';
      if (tooltipSource && e.pointerType === 'touch' && !tooltipSource.contains(e.target)) hideTooltip();
    }, true);
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      hideTooltip();
      if (!$('statsPanel').hidden || !$('settingsPanel').hidden) showPanel(null);
    });

    window.addEventListener('beforeunload', () => saveLocal());
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveLocal(); });
  }

  function init() {
    const loaded = loadLocal();
    if (loaded) {
      state = loaded;
      const off = engine.offlineEarnings(state);
      if (off.seconds >= 60 && off.amount >= 1) {
        engine.earn(state, off.amount);
        toast('Welcome back!', 'While you were away for ' + engine.formatDuration(off.seconds) + ', your campus gathered ' + fmt(off.amount) + ' leaves.');
      }
    }
    $('touchHint').hidden = !touchFirst;
    bindUi();
    applySettings();
    refreshAll();
    loadImages();
    rotateNews();
    setInterval(tick, TICK_MS);
    setInterval(slowTick, 1000);
    setInterval(rotateNews, 10000);
    setInterval(() => saveLocal('auto'), AUTOSAVE_MS);
    scheduleGolden();
    if (!loaded) saveLocal();
  }

  // exposed for debugging in the console: SSC.game.state()
  window.SSC.game = {
    state: () => state, save: saveLocal, spawnGolden, settings: () => settings,
    testBackupReminder: () => { lastReminder = 0; settings.lastExport = 0; maybeRemindBackup(); },
  };

  init();
})();
