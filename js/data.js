/*
 * Sycamore Sam Clicker - game content.
 * Everything players can buy or earn is defined here as plain data so it can
 * be tuned without touching the engine or UI code.
 */
(function (root) {
  'use strict';
  const SSC = (root.SSC = root.SSC || {});

  // ---------------------------------------------------------------------------
  // Buildings (automatic producers). Price of the Nth copy = baseCost * 1.15^N.
  // Real ISU photos can replace the emoji icons: see images/images.js.
  // ---------------------------------------------------------------------------
  const buildings = [
    { id: 'sapling', name: 'Sycamore Sapling', icon: '🌱', baseCost: 15, baseCps: 0.1,
      desc: 'A young sycamore tree that drops a leaf every so often.' },
    { id: 'sam', name: 'Sycamore Sam', icon: '💙', baseCost: 100, baseCps: 1,
      desc: "ISU's beloved mascot, gathering leaves with a big blue grin." },
    { id: 'bluecrew', name: 'Blue Crew', icon: '📣', baseCost: 1100, baseCps: 8,
      desc: 'The student section cheers the leaves right off the branches.' },
    { id: 'fountain', name: 'The Fountain', icon: '⛲', baseCost: 12000, baseCps: 47,
      desc: 'The fountain at the heart of campus, now flowing with leaves.' },
    { id: 'normalhall', name: 'Normal Hall', icon: '🏛️', baseCost: 130000, baseCps: 260,
      desc: 'A historic hall from the days of Indiana State Normal School.' },
    { id: 'library', name: 'Cunningham Library', icon: '📚', baseCost: 1.4e6, baseCps: 1400,
      desc: 'Research-grade leaf production, open late during finals week.' },
    { id: 'stadium', name: 'Memorial Stadium', icon: '🏟️', baseCost: 2e7, baseCps: 7800,
      desc: 'Game-day crowds rake in leaves by the grandstand-full.' },
    { id: 'hulman', name: 'Hulman Center', icon: '🏀', baseCost: 3.3e8, baseCps: 44000,
      desc: 'The arena packs in thousands of fans, and even more leaves.' },
    { id: 'bird', name: 'Larry Bird Statue', icon: '🗿', baseCost: 5.1e9, baseCps: 260000,
      desc: 'A tribute to the Sycamore legend who led ISU to the 1979 national title game.' },
    { id: 'parade', name: 'Homecoming Parade', icon: '🎉', baseCost: 7.5e10, baseCps: 1.6e6,
      desc: 'Blue-and-white floats carry leaves through downtown Terre Haute.' },
    { id: 'wabash', name: 'Banks of the Wabash', icon: '🌊', baseCost: 1e12, baseCps: 1e7,
      desc: 'The whole Wabash River valley joins the leaf harvest.' },
    { id: 'alumni', name: 'Sycamore Alumni Network', icon: '🎓', baseCost: 1.4e13, baseCps: 6.5e7,
      desc: 'Generations of Sycamores around the world send leaves home.' },
  ];

  // ---------------------------------------------------------------------------
  // Upgrades. Types:
  //   building - doubles one building's output
  //   click    - doubles the base value of a click
  //   clickPct - each click also earns `value` x your leaves-per-second
  //   global   - adds `value` (e.g. 0.05 = +5%) to all production
  // `req` controls when the upgrade appears in the store (see engine.reqMet).
  // ---------------------------------------------------------------------------
  const upgrades = [];

  const tierThresholds = [1, 5, 25, 50, 100, 150, 200, 250];
  const tierCostMult = [10, 50, 500, 5e4, 5e6, 5e8, 5e10, 5e13];
  const tierNames = [
    'Blue & White', 'Spirit Week', 'Homecoming Ready', 'Hall of Fame',
    'Valley Champions', 'National Spotlight', 'Legendary Sycamore', 'Forever Blue',
  ];
  buildings.forEach((b) => {
    tierThresholds.forEach((count, i) => {
      upgrades.push({
        id: b.id + '_t' + (i + 1), type: 'building', target: b.id, value: 2,
        name: b.name + ': ' + tierNames[i], icon: b.icon,
        desc: b.name + ' production is doubled.',
        cost: b.baseCost * tierCostMult[i],
        req: { building: b.id, count: count },
      });
    });
  });

  [
    ['click1', 'Blue Thumb', 100, { clicks: 15 }],
    ['click2', 'Spirit Fingers', 500, { earned: 250 }],
    ['click3', 'Sycamore Grip', 10000, { earned: 5000 }],
  ].forEach(([id, name, cost, req]) => {
    upgrades.push({ id, type: 'click', value: 2, name, icon: '👆', cost, req,
      desc: 'Clicking the leaf is twice as effective.' });
  });

  [
    ['clickPct1', 'Study Session', 5e4],
    ['clickPct2', 'All-Nighter', 5e6],
    ['clickPct3', "Dean's List", 5e8],
    ['clickPct4', 'Commencement', 5e10],
    ['clickPct5', 'Graduate School', 5e12],
  ].forEach(([id, name, cost]) => {
    upgrades.push({ id, type: 'clickPct', value: 0.01, name, icon: '✏️', cost,
      req: { earned: cost / 2 },
      desc: 'Each click also earns 1% of your leaves per second.' });
  });

  [
    ['global1', 'Welcome Week', 1e5, 0.05],
    ['global2', 'Fall Family Weekend', 1e7, 0.05],
    ['global3', 'Donaghy Day', 1e9, 0.1],
    ['global4', 'Homecoming Weekend', 1e11, 0.1],
    ['global5', 'Spring Commencement', 1e13, 0.15],
    ['global6', 'Sesquicentennial Spirit', 1e15, 0.2],
  ].forEach(([id, name, cost, value]) => {
    upgrades.push({ id, type: 'global', value, name, icon: '⭐', cost,
      req: { earned: cost / 2 },
      desc: 'All leaf production +' + Math.round(value * 100) + '%.' });
  });

  // ---------------------------------------------------------------------------
  // Achievements. Each one earned adds +1% to all production.
  // ---------------------------------------------------------------------------
  const achievements = [];
  [
    ['earn1', 'First Leaf', 1], ['earn2', 'Leaf Pile', 1e3], ['earn3', 'Raking It In', 1e5],
    ['earn4', 'Leaf Tycoon', 1e6], ['earn5', 'Sycamore Billionaire', 1e9],
    ['earn6', 'Trillion-Leaf Canopy', 1e12], ['earn7', 'Quadrillion Canopy', 1e15],
  ].forEach(([id, name, n]) => achievements.push({ id, name, req: { earned: n },
    desc: 'Earn a total of ' + n.toLocaleString('en-US') + (n === 1 ? ' leaf.' : ' leaves.') }));
  [
    ['click_a1', 'First Click', 1], ['click_a2', 'Clicker Freshman', 100],
    ['click_a3', 'Clicker Senior', 1000], ['click_a4', 'Clicker Ph.D.', 10000],
  ].forEach(([id, name, n]) => achievements.push({ id, name, req: { clicks: n },
    desc: 'Click the leaf ' + n.toLocaleString('en-US') + ' time' + (n === 1 ? '' : 's') + '.' }));
  [
    ['cps1', 'Steady Breeze', 1], ['cps2', 'Gusty Afternoon', 10], ['cps3', 'Leaf Storm', 100],
    ['cps4', 'Autumn Hurricane', 1e4], ['cps5', 'Season Without End', 1e6],
  ].forEach(([id, name, n]) => achievements.push({ id, name, req: { cps: n },
    desc: 'Produce ' + n.toLocaleString('en-US') + (n === 1 ? ' leaf' : ' leaves') + ' per second.' }));
  buildings.forEach((b) => {
    achievements.push({ id: 'own1_' + b.id, name: 'Welcome, ' + b.name,
      req: { building: b.id, count: 1 }, desc: 'Own your first ' + b.name + '.' });
    achievements.push({ id: 'own50_' + b.id, name: b.name + ' Fan Club',
      req: { building: b.id, count: 50 }, desc: 'Own 50 ' + b.name + '.' });
  });
  achievements.push({ id: 'gold1', name: 'Lucky Find', req: { golden: 1 },
    desc: 'Click a Golden Sycamore Leaf.' });
  achievements.push({ id: 'gold2', name: 'Golden Collector', req: { golden: 7 },
    desc: 'Click 7 Golden Sycamore Leaves.' });

  // ---------------------------------------------------------------------------
  // News ticker lines. Functions receive the state for dynamic lines.
  // ---------------------------------------------------------------------------
  const news = [
    'Campus news: students report an unusual number of blue leaves near the Fountain.',
    'Sycamore Sam spotted carrying a suspiciously large rake.',
    'Blue Crew announces new chant: "LEAVES! LEAVES! LEAVES!"',
    'Cunningham Library adds a new section: Advanced Leaf Studies.',
    'Weather update: 100% chance of leaves in Terre Haute today.',
    'Hulman Center sells out again. Fans asked to bring their own leaf bags.',
    'Normal Hall historians confirm: the leaves have always been here.',
    'Homecoming committee considers float made entirely of sycamore leaves.',
    'Alumni report they can hear the leaves rustling from across the country.',
    'Professors notice students clicking during lecture. "It\'s for science," they claim.',
    (s) => (s.buildings.sapling > 10 ? 'Grounds crew overwhelmed by ' + s.buildings.sapling + ' saplings.' : 'A single sapling sways bravely on the Quad.'),
    (s) => (s.clicks > 500 ? 'Local doctors warn of an outbreak of "clicker\'s thumb".' : 'Freshman discovers that leaves can be clicked.'),
  ];

  SSC.data = { buildings, upgrades, achievements, news };
})(typeof globalThis !== 'undefined' ? globalThis : this);
