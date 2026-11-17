/*
 * Sycamore Sam Clicker - browser UI.
 * Wires the engine (js/engine.js) to the page: rendering, input, the game
 * loop, autosave, and save-file export/import.
 */
(function () {
  'use strict';
  const { data, engine } = window.SSC;
  const fmt = engine.formatNumber;

  const SAVE_KEY = 'sycamoreSamClicker.save';
  const AUTOSAVE_MS = 60 * 1000; // requirement: autosave every minute
  const TICK_MS = 100;
  const params = new URLSearchParams(location.search);
  const FAST_GOLDEN = params.has('golden'); // ?golden for testing golden leaves

  let state = engine.newState();
  let buyAmount = 1;
  let lastTick = performance.now();
  let lastSaveTime = null;
  const imageOk = {}; // building id / 'leaf' -> loaded image URL, if a real photo exists

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
      return img;
    }
    const span = el('span', 'icon', emoji);
    span.setAttribute('aria-hidden', 'true');
    return span;
  }

  function upgradeIcon(u) {
    return u.type === 'building' ? iconFor(u.target, u.icon) : iconFor('_none', u.icon);
  }

  // ------------------------------------------------------------------ saving
  function saveLocal(reason) {
    try {
      localStorage.setItem(SAVE_KEY, engine.serialize(state));
      lastSaveTime = new Date();
      $('saveStatus').textContent = 'Saved ' + lastSaveTime.toLocaleTimeString() + (reason === 'auto' ? ' (autosave)' : '');
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
    if (!confirm('Reset all progress? This wipes your leaves, buildings, upgrades and achievements.\n\nTip: use "Export save" first if you want a backup.')) return;
    state = engine.newState();
    refreshAll();
    saveLocal();
    toast('Fresh start', 'Your grove has been replanted.');
  }

  // ------------------------------------------------------------------ toasts / tooltip
  function toast(title, body, kind) {
    const t = el('div', 'toast' + (kind ? ' ' + kind : ''));
    t.appendChild(el('strong', null, title));
    if (body) t.appendChild(el('span', null, body));
    $('toasts').appendChild(t);
    while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
    setTimeout(() => t.remove(), kind === 'error' ? 7000 : 4500);
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
    if (left < 8) { left = 8; top = Math.min(r.bottom + 8, window.innerHeight - th - 8); }
    tt.style.left = left + 'px';
    tt.style.top = top + 'px';
  }
  function hideTooltip() { tooltipSource = null; $('tooltip').hidden = true; }
  function attachTooltip(node, htmlFn) {
    const show = () => showTooltip(node, htmlFn());
    node.addEventListener('mouseenter', show);
    node.addEventListener('focus', show);
    node.addEventListener('mouseleave', hideTooltip);
    node.addEventListener('blur', hideTooltip);
    node._tooltip = htmlFn;
  }

  function buildingTooltip(b) {
    const owned = state.buildings[b.id];
    const cost = engine.buildingCost(state, b.id, buyAmount);
    const each = owned ? engine.buildingCps(state, b.id) / owned
      : b.baseCps * engine.buildingMult(state, b.id) * engine.globalMult(state);
    const total = engine.buildingCps(state, b.id);
    const share = engine.baseCps(state) ? (100 * total / engine.baseCps(state)).toFixed(1) : '0';
    return '<div class="tt-head"><span>' + escapeHtml(b.name) + '</span><span class="tt-cost' + (state.leaves >= cost ? '' : ' no') + '">🍃 ' + fmt(cost) + '</span></div>'
      + '<div class="tt-tag">owned: ' + owned + (buyAmount > 1 ? ' · buying ' + buyAmount : '') + '</div>'
      + '<p class="tt-flavor">' + escapeHtml(b.desc) + '</p>'
      + '<p>Each produces <b>' + fmt(each, 1) + '</b> leaves per second.'
      + (owned ? '<br>' + owned + ' producing <b>' + fmt(total, 1) + '</b> per second (' + share + '% of total).' : '') + '</p>';
  }

  function upgradeTooltip(u) {
    const can = state.leaves >= u.cost;
    return '<div class="tt-head"><span>' + escapeHtml(u.name) + '</span><span class="tt-cost' + (can ? '' : ' no') + '">🍃 ' + fmt(u.cost) + '</span></div>'
      + '<div class="tt-tag">upgrade</div><p>' + escapeHtml(u.desc) + '</p>';
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
    const key = list.map((u) => u.id).join(',');
    const box = $('upgrades');
    if (key !== upgradeKey) {
      upgradeKey = key;
      box.textContent = '';
      if (!list.length) box.appendChild(el('div', 'empty', 'Keep clicking to unlock upgrades!'));
      list.forEach((u) => {
        const btn = el('button', 'upgrade');
        btn.type = 'button';
        btn.dataset.id = u.id;
        btn.setAttribute('aria-label', 'Upgrade: ' + u.name + ', costs ' + fmt(u.cost) + ' leaves. ' + u.desc);
        btn.appendChild(upgradeIcon(u));
        btn.addEventListener('click', () => {
          if (engine.buyUpgrade(state, u.id)) {
            hideTooltip();
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

  function renderBuildings() {
    const vis = visibleBuildings();
    const key = vis.map((v) => v.b.id + (v.mystery ? '?' : '')).join(',');
    const box = $('buildings');
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
        if (!mystery) {
          btn.addEventListener('click', () => {
            if (engine.buyBuilding(state, b.id, buyAmount)) {
              afterPurchase();
              if (tooltipSource === btn) showTooltip(btn, buildingTooltip(b));
            }
          });
          attachTooltip(btn, () => buildingTooltip(b));
        }
        box.appendChild(btn);
      });
    }
    box.querySelectorAll('.building').forEach((btn) => {
      const id = btn.dataset.id;
      const cost = engine.buildingCost(state, id, buyAmount);
      const can = state.leaves >= cost;
      const priceText = fmt(cost);
      const price = btn.querySelector('.price');
      if (price.textContent !== priceText) price.textContent = priceText;
      const owned = btn.querySelector('.owned');
      const ownedText = state.buildings[id] ? String(state.buildings[id]) : '';
      if (owned.textContent !== ownedText) owned.textContent = ownedText;
      btn.classList.toggle('can-buy', can);
      btn.classList.toggle('cant-buy', !can);
      if (!btn.classList.contains('mystery')) {
        btn.setAttribute('aria-label', 'Buy ' + buyAmount + ' ' + engine.buildingById[id].name + ' for ' + priceText + ' leaves. Owned: ' + state.buildings[id]);
      }
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
    const key = data.buildings.map((b) => state.buildings[b.id]).join(',');
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
      const h = el('h3');
      h.appendChild(el('span', null, b.name));
      h.appendChild(el('span', null, n + ' owned · ' + fmt(engine.buildingCps(state, b.id), 1) + '/s'));
      row.appendChild(h);
      const icons = el('div', 'campus-icons');
      for (let i = 0; i < Math.min(n, MAX_ICONS); i++) icons.appendChild(iconFor(b.id, b.icon));
      if (n > MAX_ICONS) icons.appendChild(el('span', 'more', '+' + (n - MAX_ICONS) + ' more'));
      row.appendChild(icons);
      box.appendChild(row);
    });
  }

  // ------------------------------------------------------------------ counter / stats
  function renderCounter() {
    const now = Date.now();
    const leaves = Math.floor(state.leaves);
    $('leafCount').textContent = fmt(leaves) + (leaves === 1 ? ' leaf' : ' leaves');
    $('cpsLabel').textContent = 'per second: ' + fmt(engine.cps(state, now), 1);
    document.title = fmt(leaves) + ' leaves - Sycamore Sam Clicker';
    const bar = $('buffBar');
    if (state.buff && state.buff.endsAt > now) {
      bar.hidden = false;
      bar.textContent = state.buff.name + ' x' + state.buff.mult + ' · ' + Math.ceil((state.buff.endsAt - now) / 1000) + 's';
    } else if (!bar.hidden) {
      bar.hidden = true;
    }
  }

  function renderStats() {
    if ($('statsPanel').hidden) return;
    const now = Date.now();
    const rows = [
      ['Leaves in bank', fmt(state.leaves)],
      ['Leaves earned (all time)', fmt(state.totalEarned)],
      ['Leaves per second', fmt(engine.cps(state, now), 1)],
      ['Leaves per click', fmt(engine.clickValue(state, now), 1)],
      ['Leaf clicks', fmt(state.clicks)],
      ['Leaves from clicking', fmt(state.handmade)],
      ['Buildings owned', fmt(Object.values(state.buildings).reduce((a, b) => a + b, 0))],
      ['Upgrades purchased', state.upgrades.length + ' / ' + data.upgrades.length],
      ['Golden leaves clicked', fmt(state.goldenClicks)],
      ['Production bonus', '+' + Math.round((engine.globalMult(state) - 1) * 100) + '%'],
      ['Playing since', new Date(state.startedAt).toLocaleDateString()],
    ];
    const dl = $('statsList');
    dl.textContent = '';
    rows.forEach(([k, v]) => { dl.appendChild(el('dt', null, k)); dl.appendChild(el('dd', null, v)); });
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

  function checkAchievements() {
    engine.checkAchievements(state).forEach((a) => toast('Achievement unlocked: ' + a.name, a.desc + ' (+1% production)', 'gold'));
  }

  // ------------------------------------------------------------------ clicking & effects
  function onLeafClick(ev) {
    const gained = engine.click(state);
    let x = ev.clientX, y = ev.clientY;
    if (!x && !y) { // keyboard activation: use the leaf's center
      const r = $('bigLeaf').getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 3;
    }
    floatText('+' + fmt(gained, 1), x, y);
    if (Math.random() < 0.5) fallingLeaf();
    renderCounter();
  }

  function floatText(text, x, y) {
    if (document.querySelectorAll('.float-text').length > 25) return;
    const f = el('div', 'float-text', text);
    f.style.left = x + (Math.random() * 30 - 15) + 'px';
    f.style.top = y - 20 + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1000);
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
      if (result.type === 'lucky') {
        toast('Lucky Leaf!', 'You found ' + fmt(result.amount) + ' leaves.', 'gold');
        floatText('+' + fmt(result.amount), ev.clientX || window.innerWidth / 2, ev.clientY || window.innerHeight / 2);
      } else {
        toast('Homecoming Frenzy!', 'Leaf production x7 for 77 seconds.', 'gold');
      }
      checkAchievements();
      renderCounter();
      finish();
    });
    document.body.appendChild(btn);
    setTimeout(finish, 13000);
  }

  // ------------------------------------------------------------------ news ticker
  function rotateNews() {
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
    if (tooltipSource && tooltipSource._tooltip && document.body.contains(tooltipSource)) {
      showTooltip(tooltipSource, tooltipSource._tooltip());
    }
  }

  function refreshAll() {
    hideTooltip();
    $('achList').dataset.count = '';
    buildStore();
    renderCampus(true);
    renderCounter();
    renderStats();
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
    $('btnStats').addEventListener('click', () => {
      const panel = $('statsPanel');
      panel.hidden = !panel.hidden;
      $('btnStats').setAttribute('aria-pressed', String(!panel.hidden));
      renderStats();
    });
    document.querySelectorAll('.buy-amount button').forEach((b) => {
      b.addEventListener('click', () => {
        buyAmount = Number(b.dataset.amount);
        document.querySelectorAll('.buy-amount button').forEach((x) => x.classList.toggle('active', x === b));
        renderBuildings();
      });
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
    bindUi();
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

  // expose for debugging in the console: SSC.game.state()
  window.SSC.game = { state: () => state, save: saveLocal, spawnGolden };

  init();
})();
