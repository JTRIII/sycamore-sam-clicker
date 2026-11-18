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
    { id: 'bird', name: 'Larry Bird Legacy', icon: '🏆', baseCost: 5.1e9, baseCps: 260000,
      desc: 'Honoring the Sycamore legend who led ISU to the 1979 national title game.' },
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
  //   synergy  - `target` building +value per `source` building owned
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
    ['global1', 'Welcome Week', 1e5, 0.1],
    ['global2', 'Fall Family Weekend', 1e7, 0.15],
    ['global3', 'Donaghy Day', 1e9, 0.25],
    ['global4', 'Homecoming Weekend', 1e11, 0.35],
    ['global5', 'Spring Commencement', 1e13, 0.5],
    ['global6', 'Sesquicentennial Spirit', 1e15, 0.75],
  ].forEach(([id, name, cost, value]) => {
    upgrades.push({ id, type: 'global', value, name, icon: '⭐', cost,
      req: { earned: cost / 2 },
      desc: 'All leaf production +' + Math.round(value * 100) + '%.' });
  });

  // Synergies: the target building gets +value (e.g. 0.05 = +5%) for each source
  // building owned. Appear once you own 15 of both.
  const byId = Object.fromEntries(buildings.map((b) => [b.id, b]));
  [
    ['syn_sam_sapling', 'Mascot Gardening', 'sapling', 'sam', 0.05, 'Sycamore Sam waters the saplings.'],
    ['syn_crew_fountain', 'Fountain Meetups', 'fountain', 'bluecrew', 0.03, 'The Blue Crew gathers at the Fountain before every game.'],
    ['syn_hall_library', 'Library Archives', 'library', 'normalhall', 0.03, 'Normal Hall was the original campus library.'],
    ['syn_crew_hulman', 'Cheer Section', 'hulman', 'bluecrew', 0.02, 'A louder student section means a livelier arena.'],
    ['syn_stadium_parade', 'Game Day Parade', 'parade', 'stadium', 0.01, 'The parade ends with a big game at Memorial Stadium.'],
    ['syn_bird_hulman', 'Legends Night', 'hulman', 'bird', 0.05, 'Banners for Larry Bird hang over the court.'],
    ['syn_fountain_wabash', 'River Walk', 'wabash', 'fountain', 0.01, 'Fountain water finds its way to the Wabash.'],
    ['syn_parade_alumni', 'Alumni Weekend', 'alumni', 'parade', 0.02, 'Homecoming brings alumni back to campus.'],
  ].forEach(([id, name, target, source, value, flavor]) => {
    const t = byId[target], s = byId[source];
    upgrades.push({
      id, type: 'synergy', target, source, value, name, icon: t.icon,
      cost: 5000 * Math.max(t.baseCost, s.baseCost),
      req: { buildings: { [target]: 15, [source]: 15 } },
      desc: t.name + ' +' + Math.round(value * 100) + '% production for each ' + s.name + ' owned. ' + flavor,
    });
  });

  // ---------------------------------------------------------------------------
  // Achievements. Each one earned adds +1% to all production. Achievements are
  // kept when graduating.
  // ---------------------------------------------------------------------------
  const achievements = [];
  [
    ['earn1', 'First Leaf', 1], ['earn2', 'Leaf Pile', 1e3], ['earn3', 'Raking It In', 1e5],
    ['earn4', 'Leaf Tycoon', 1e6], ['earn5', 'Sycamore Billionaire', 1e9],
    ['earn6', 'Trillion-Leaf Canopy', 1e12], ['earn7', 'Quadrillion Canopy', 1e15],
    ['earn8', 'Quintillion Forest', 1e18],
  ].forEach(([id, name, n]) => achievements.push({ id, name, req: { allTime: n },
    desc: 'Earn a total of ' + n.toLocaleString('en-US') + (n === 1 ? ' leaf' : ' leaves') + ' (all time).' }));
  [
    ['hand1', 'Handpicked', 1e3], ['hand2', 'Green Thumb', 1e6], ['hand3', 'Leaf Whisperer', 1e9],
  ].forEach(([id, name, n]) => achievements.push({ id, name, req: { handmade: n },
    desc: 'Earn ' + n.toLocaleString('en-US') + ' leaves by clicking.' }));
  [
    ['click_a1', 'First Click', 1], ['click_a2', 'Clicker Freshman', 100],
    ['click_a3', 'Clicker Senior', 1000], ['click_a4', 'Clicker Ph.D.', 10000],
  ].forEach(([id, name, n]) => achievements.push({ id, name, req: { clicks: n },
    desc: 'Click the leaf ' + n.toLocaleString('en-US') + ' time' + (n === 1 ? '' : 's') + '.' }));
  [
    ['cps1', 'Steady Breeze', 1], ['cps2', 'Gusty Afternoon', 10], ['cps3', 'Leaf Storm', 100],
    ['cps4', 'Autumn Hurricane', 1e4], ['cps5', 'Season Without End', 1e6],
    ['cps6', 'Leafquake', 1e8],
  ].forEach(([id, name, n]) => achievements.push({ id, name, req: { cps: n },
    desc: 'Produce ' + n.toLocaleString('en-US') + (n === 1 ? ' leaf' : ' leaves') + ' per second.' }));
  buildings.forEach((b) => {
    achievements.push({ id: 'own1_' + b.id, name: 'Welcome, ' + b.name,
      req: { building: b.id, count: 1 }, desc: 'Own your first ' + b.name + '.' });
    achievements.push({ id: 'own50_' + b.id, name: b.name + ' Fan Club',
      req: { building: b.id, count: 50 }, desc: 'Own 50 ' + b.name + '.' });
    achievements.push({ id: 'own100_' + b.id, name: b.name + ' Hall of Fame',
      req: { building: b.id, count: 100 }, desc: 'Own 100 ' + b.name + '.' });
  });
  [
    ['upg1', 'Curious Student', 10], ['upg2', 'Honor Roll', 50], ['upg3', 'Summa Cum Laude', 100],
  ].forEach(([id, name, n]) => achievements.push({ id, name, req: { upgrades: n },
    desc: 'Own ' + n + ' upgrades at once.' }));
  achievements.push({ id: 'gold1', name: 'Lucky Find', req: { golden: 1 },
    desc: 'Click a Golden Sycamore Leaf.' });
  achievements.push({ id: 'gold2', name: 'Golden Collector', req: { golden: 7 },
    desc: 'Click 7 Golden Sycamore Leaves.' });
  achievements.push({ id: 'gold3', name: 'Golden Legacy', req: { golden: 27 },
    desc: 'Click 27 Golden Sycamore Leaves.' });
  achievements.push({ id: 'sell1', name: 'Change of Major', req: { sold: 1 },
    desc: 'Sell a building.' });
  achievements.push({ id: 'grad1', name: 'Graduation Day', req: { graduations: 1 },
    desc: 'Graduate for the first time.' });
  achievements.push({ id: 'grad2', name: 'Lifelong Learner', req: { graduations: 5 },
    desc: 'Graduate 5 times.' });
  achievements.push({ id: 'pride1', name: 'Proud Sycamore', req: { pride: 10 },
    desc: 'Have 10 Alumni Pride.' });
  achievements.push({ id: 'pride2', name: 'Blue Forever', req: { pride: 100 },
    desc: 'Have 100 Alumni Pride.' });

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
    (s) => (s.graduations > 0 ? 'Proud alumni (' + s.graduations + ' graduation' + (s.graduations === 1 ? '' : 's') + ' so far) return to plant new saplings.' : 'Seniors wonder what happens after graduation.'),
    (s) => (s.sold > 0 ? 'Registrar confirms: changing majors is perfectly normal.' : 'Advisors remind students that every major counts.'),
    'Blue Crew Roar measured at record volume in Hulman Center.',
    'Study finds sycamore leaves are 100% more clickable in the fall.',
  ];

  SSC.data = { buildings, upgrades, achievements, news };
})(typeof globalThis !== 'undefined' ? globalThis : this);
