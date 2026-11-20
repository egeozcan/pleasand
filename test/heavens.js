/* =====================================================================
   PLEASAND  --  test/heavens.js

   the great works that look up (heavens.js): the observatory and its
   meteorites, the lighthouse, the foundry, the moon rocket. required by
   test/run.js
   ===================================================================== */
"use strict";

module.exports = function (test, check, sim) {
  var SHOTS = process.env.HEAVENS_PNG;   /* (a directory: pictures of each of them, to look at) */
  function know(g, list) { list.forEach(function (k) { g.know[k] = "TEST"; }); }
  function sites(g, kind) { return g.sites.filter(function (s) { return s.kind === kind; }); }
  function shot(w, name, s, pad) {
    if (!SHOTS) return;
    pad = pad || 10;
    sim.png(w, SHOTS + "/" + name + ".png", 5, [Math.max(0, s.x0 - pad), Math.max(0, s.y0 - pad), Math.min(w.g.gw - Math.max(0, s.x0 - pad), s.x1 - s.x0 + 2 * pad), Math.min(w.g.gh - Math.max(0, s.y0 - pad), s.y1 - s.y0 + 2 * pad)]);
  }
  /* flat ground from x0 to x1 at row G: sand over stone, nothing over it, and nobody's site on it */
  function flat(w, x0, x1, G) {
    var g = w.g, x, y, k;
    for (k = g.sites.length - 1; k >= 0; k--) if (g.sites[k].x1 >= x0 - 6 && g.sites[k].x0 <= x1 + 6) w.bRemove(g, k);
    /* (and any oil in the rock about it sealed in: cut into, it would run out over everything) */
    for (x = Math.max(0, x0 - 15); x <= Math.min(g.gw - 1, x1 + 15); x++) for (y = 0; y < g.gh; y++) if (g.m[y * g.gw + x] === w.MAT.OIL) w.sandPlace(g, y * g.gw + x, w.MAT.STONE);
    for (x = x0; x <= x1; x++) {
      for (y = 0; y < G; y++) w.sandPlace(g, y * g.gw + x, w.MAT.EMPTY);
      for (y = G; y < G + 8; y++) w.sandPlace(g, y * g.gw + x, w.MAT.SAND);
      for (y = G + 8; y < 182; y++) if (!w.ROCK[g.m[y * g.gw + x]]) w.sandPlace(g, y * g.gw + x, w.MAT.STONE);
    }
  }
  function settle(g) { g.peasants.forEach(function (q) { q.task = null; q.hunger = 0; q.tired = 0; q.mineCD = 1e9; }); }

  /* ---------------------------------------------------------------- the observatory */
  /* seed 1 with a watchtower built, and the observatory planned on it */
  function observatory(build) {
    var w = sim.load(1), g = w.g, p = g.peasants[0];
    know(g, ["farm", "dig", "mine", "masonry", "smelt", "glass"]);
    check(w.mPlanTower(g, p), "(the test wants a watchtower)");
    var t = sim.build(w, sites(g, "tower")[0]);
    know(g, ["observatory"]);
    p.task = null;
    check(w.hPlanObs(g, p), "nowhere for the observatory");
    var s = sites(g, "observatory")[0];
    if (build) { sim.build(w, s); s.done = false; w.bFinish(g, s, p); }
    return { w: w, g: g, s: s, t: t, p: p };
  }
  test("observatory: twenty looks out from the tower put it into the head of whoever looked most", function () {
    var O = observatory(false), w = O.w, g = O.g, p = g.peasants[2];
    g.know.observatory = undefined; delete g.know.observatory;
    g.looks = 18; p.looks = 30;
    w.hLooked(g, g.peasants[1]);
    check(!g.peasants.some(function (q) { return q.spark === "observatory"; }), "thought of at 19 looks");
    w.hLooked(g, g.peasants[1]);
    check(p.spark === "observatory", "the twentieth look did not put it into the head of whoever has looked most (" + p.spark + ")");
  });
  test("observatory: it is built on top of the watchtower, a dome with a telescope through a slit, and you can get up to it", function () {
    var O = observatory(false), w = O.w, g = O.g, s = O.s, t = O.t, M = w.MAT;
    check(s.tower === t.id && s.F === t.T, "not on the tower: on row " + s.F + ", the tower's top is " + t.T);
    var kinds = {};
    s.plan.forEach(function (e) { kinds[e.v] = (kinds[e.v] || 0) + 1; });
    check(kinds[M.BRICK] >= 20 && kinds[M.GIRDER] === 10 && kinds[M.GLASS] === 2, "the plan: " + JSON.stringify(kinds));
    /* built by its crew: stone, iron and glass in their pockets */
    settle(g);
    g.peasants.forEach(function (q) { q.stone = 12; q.iron = 2; q.glass = 2; q.gold = 0; q.x = t.x1 + 4.5; q.y = t.F - 1; });
    w.bJoin(g, g.peasants[0], s); w.bJoin(g, g.peasants[1], s);
    for (var k = 0; k < 15000 && !s.done; k++) sim.step(w, 1);
    check(s.done, "the observatory was not built in 15000 ticks (" + Math.round(w.bShare(g, s) * 100) + "% up)");
    shot(w, "observatory", s, 14);
    var route = w.navFind(g, t.x0 - 2, t.F - 1, function (x, y) { return Math.abs(x - s.spot) <= 1 && y === s.F - 1; }, s.spot, s.F - 1, 20000);
    check(!!route, "no way up to the telescope from the foot of the tower");
  });
  test("observatory: the astronomer foretells falling stars, and they fall", function () {
    var O = observatory(true), w = O.w, g = O.g, s = O.s, k;
    settle(g);
    s.showerT = 0; s.lookT = 0;
    var foretold = 0, fell = 0, gaze = 0;
    for (k = 0; k < 6000 && !fell; k++) {
      sim.step(w, 1);
      if (!foretold && s.shower > g.tick) foretold = g.tick;
      if (g.hShower && g.hShower.until > g.tick) fell = g.tick;
    }
    check(foretold > 0, "nobody foretold a shower (astronomer task: " + JSON.stringify((w.lAlive(g, s.astro) || {}).task) + ")");
    check(fell > foretold && fell - foretold >= 1400, "the shower came " + (fell - foretold) + " ticks after it was foretold");
    gaze = g.peasants.filter(function (q) { return q.task && q.task.kind === "stargaze"; }).length;
    check(gaze > 0, "nobody stopped to watch");
    check((g.moonLooks || 0) >= 1 && g.hConst && g.hConst.name, "the look named nothing and did not look at the moon");
  });
  test("observatory: a meteorite lands hot, nowhere near a house, and is dug up as iron and gold", function () {
    var O = observatory(true), w = O.w, g = O.g, s = O.s, M = w.MAT, k;
    settle(g);
    var iron0 = 0, gold0 = 0;
    g.peasants.forEach(function (q) { q.iron = 0; q.gold = 0; });
    check(w.hMeteorite(g, -1), "nowhere for a meteorite to come down");
    var R = g.hRock;
    for (k = 0; k < 300 && !R.down; k++) sim.step(w, 1);
    check(R.down, "it never came down");
    var hot = 0, metal = 0, gold = 0;
    R.cells.forEach(function (j) { hot = Math.max(hot, g.T[j]); if (g.m[j] === M.METAL) metal++; if (g.m[j] === M.GOLD) gold++; });
    check(hot > 600 && metal >= 12 && gold === 1, "the lump: " + metal + " iron, " + gold + " gold, " + Math.round(hot) + "°");
    g.sites.forEach(function (h) { if (h.kind === "house") check(R.tx < h.x0 - 12 || R.tx > h.x1 + 12, "it came down at " + R.tx + ", by the house at " + h.x0 + "-" + h.x1); });
    /* nothing set alight near a house */
    var lit = 0;
    for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.FIRE || g.m[j] === M.EMBER) {
      var x = j % g.gw;
      g.sites.forEach(function (h) { if (h.kind === "house" && x >= h.x0 - 12 && x <= h.x1 + 12 && Math.abs(x - R.tx) < 8) lit++; });
    }
    check(lit === 0, lit + " cells alight near a house");
    for (k = 0; k < 9000 && g.hRock; k++) sim.step(w, 1);
    var iron = 0, au = 0;
    g.peasants.forEach(function (q) { iron += q.iron || 0; au += q.gold || 0; });
    check(!g.hRock && au >= 1 && iron >= metal * 0.2 - 0.01, "not dug up: iron " + iron.toFixed(1) + ", gold " + au + (g.hRock ? ", still there" : ""));
    check(g.got.meteorite, "no news of it");
  });

  /* ---------------------------------------------------------------- the lighthouse */
  /* a lake of 480 cells of water, forty wide and twelve deep, in a stone basin in level ground at column 170 of seed 1 */
  function lake() {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x, y;
    flat(w, 120, 250, G);
    for (x = 169; x <= 210; x++) for (y = G; y <= G + 12; y++) w.sandPlace(g, y * g.gw + x, x === 169 || x === 210 || y === G + 12 ? M.STONE : M.WATER);
    know(g, ["farm", "dig", "bucket", "mine", "masonry", "smelt", "glass", "oil"]);
    settle(g);
    g.peasants.forEach(function (q) { q.x = 140 + q.id % 10; q.y = G - 1; });
    return { w: w, g: g, G: G };
  }
  /* a well, done, with oil in its tank, beside the lake (as oil.js keeps one: only its tank and pump matter here) */
  function well(w, x, G, tank) {
    var g = w.g;
    var s = w.bNew(g, "well", null, [], [x - 3, G - 13, x + 3, G - 1], { pump: { x: x, y: G - 1 }, col: x, tank: tank, barrels: 0, dry: false });
    s.done = true;
    return s;
  }
  test("lighthouse: a painted lake of 480 cells puts it into the head of the first one to swim in it", function () {
    var L = lake(), w = L.w, g = L.g, p = g.peasants[0], k;
    p.x = 190.5; p.y = L.G + 8; p.state = "walk";
    for (k = 0; k < 400 && p.spark !== "lighthouse"; k++) sim.step(w, 1);
    check(g.hLake && g.hLake.n >= 200, "the lake was not seen: " + JSON.stringify(g.hLake));
    check(p.spark === "lighthouse", "the swimmer did not think of a lighthouse (" + p.spark + ", swimming " + p.swimming + ")");
  });
  function lighthouse(build) {
    var L = lake(), w = L.w, g = L.g;
    know(g, ["lighthouse"]);
    check(w.hPlanLight(g, g.peasants[0]), "nowhere for the lighthouse");
    L.s = sites(g, "lighthouse")[0];
    if (build) { sim.build(w, L.s); L.s.done = false; w.bFinish(g, L.s, g.peasants[0]); }
    return L;
  }
  test("lighthouse: planned on the lake's bank, and built: the gallery and the lantern can be got up to", function () {
    var L = lighthouse(false), w = L.w, g = L.g, s = L.s;
    check(s.x1 < 170 && 170 - s.x1 <= 15 || s.x0 > 209 && s.x0 - 209 <= 15, "not on the bank: " + s.x0 + "-" + s.x1);
    settle(g);
    g.peasants.forEach(function (q) { q.stone = 12; q.iron = 1; q.glass = 2; q.boards = 12; q.x = s.cx + (s.side > 0 ? -8 : 8) + 0.5; q.y = L.G - 1; });
    w.bJoin(g, g.peasants[0], s); w.bJoin(g, g.peasants[1], s);
    for (var k = 0; k < 20000 && !s.done; k++) sim.step(w, 1);
    check(s.done, "the lighthouse was not built in 20000 ticks (" + Math.round(w.bShare(g, s) * 100) + "% up): " + s.note + " " +
      s.plan.filter(function (e) { return !w.bOk(g, e); }).slice(0, 8).map(function (e) { return (e.i % g.gw - s.x0 - 1) + "," + (s.G1 - ((e.i / g.gw) | 0)) + ":" + e.v + (w.bFree(g, e) ? "" : "!f" + g.m[e.i]) + (w.bSupported(g, e) ? "" : "!s"); }).join(" "));
    var route = w.navFind(g, Math.round(s.cx + (s.side > 0 ? -8 : 8)), L.G - 1, function (x, y) { return Math.abs(x - s.spot) <= 1 && y === s.G1 - 1; }, s.spot, s.G1 - 1, 30000);
    check(!!route, "no way up to the lamp");
  });
  test("lighthouse: the keeper fuels it from the well's tank, it shines (lamplight in the beam), and somebody follows the light in, once", function () {
    var L = lighthouse(true), w = L.w, g = L.g, s = L.s, k;
    var wl = well(w, s.side > 0 ? s.x0 - 14 : s.x1 + 14, L.G, 3);
    settle(g);
    g.popGoal = 8;
    check(!w.hLit(g, s), "lit with no oil in it");
    for (k = 0; k < 6000 && !w.hLit(g, s); k++) sim.step(w, 1);
    check(w.hLit(g, s), "the keeper never lit it (" + JSON.stringify(g.peasants.map(function (q) { return q.task && q.task.kind; })) + ")");
    check(wl.tank === 2, "the oil did not come out of the tank: " + wl.tank);
    check(g.popGoal === 9, "nobody followed the light in: " + g.popGoal);
    if (SHOTS) { for (k = 0; k < 600 && w.hBeamNow(g, s).c < 0.85; k++) sim.step(w, 1); wl.kind = "pretend"; shot(w, "lighthouse", s, 40); wl.kind = "well"; }
    /* the beam: lamplight wherever it is pointing, for a moment */
    var b = w.hBeamNow(g, s), x = s.lx + b.d * Math.round(b.L * 0.5), y = Math.round(s.ly + 1 + b.L * 0.5 * 0.12) + 4;
    check(w.hBeamLit(g, x, y) && w.iLampNear(g, x, y), "the beam is not lamplight where it points");
    /* out, and lit again: no more followers */
    s.fuel = 30; wl.tank = 0;
    for (k = 0; k < 90 && w.hLit(g, s); k++) sim.step(w, 1);
    check(!w.hLit(g, s), "it did not go dark with the oil gone");
    check(g.feed.some(function (f) { return /gone dark/.test(f.text); }), "going dark was no news");
    wl.tank = 2; s.noOil = 0;
    for (k = 0; k < 6000 && !w.hLit(g, s); k++) sim.step(w, 1);
    check(w.hLit(g, s) && g.popGoal === 9, "lit again " + w.hLit(g, s) + ", popGoal " + g.popGoal);
  });
  test("lighthouse: a swimmer short of breath swims for the light", function () {
    var L = lighthouse(true), w = L.w, g = L.g, s = L.s;
    s.fuel = 99999;
    var p = g.peasants[1];
    p.x = s.side > 0 ? 200.5 : 179.5; p.y = L.G + 8; p.state = "walk"; p.breath = 100; p.task = null;
    var x0 = p.x;
    for (var k = 0; k < 90; k++) { sim.step(w, 1); p.breath = Math.min(p.breath, 100); }
    check(p.swimming && (p.x - x0) * (s.cx - x0) > 0, "the swimmer went the other way: " + x0.toFixed(1) + " -> " + p.x.toFixed(1) + " (the light is at " + s.cx + ")");
  });
};
