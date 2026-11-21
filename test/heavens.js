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
    sim.png(w, SHOTS + "/" + name + ".png", 8, [Math.max(0, s.x0 - pad), Math.max(0, s.y0 - pad), Math.min(w.g.gw - Math.max(0, s.x0 - pad), s.x1 - s.x0 + 2 * pad), Math.min(w.g.gh - Math.max(0, s.y0 - pad), s.y1 - s.y0 + 2 * pad)]);
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
    check(!g.peasants.some(function (q) { return q.wspark === "observatory"; }), "thought of at 19 looks");
    w.hLooked(g, g.peasants[1]);
    check(p.wspark === "observatory", "the twentieth look did not put it into the head of whoever has looked most (" + p.wspark + ")");
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
  test("lighthouse: a lamp nobody can get up to is let be, and the barrel goes where it can (a tank), not carried for thousands of ticks", function () {
    var L = lighthouse(true), w = L.w, g = L.g, s = L.s, M = w.MAT, k, x, y;
    s.fuel = 0; s.noOil = g.tick + 1e9;
    var tank = well(w, s.cx + (s.side > 0 ? -60 : 60), w.mGround(g, s.cx + (s.side > 0 ? -60 : 60)), 1);
    var q = g.peasants[0];
    g.peasants.forEach(function (o) { if (o !== q) o.dead = 1; });
    /* (INERT across the gallery: every bit of air over its floor, out to the edges, but where the lamp is filled from) */
    for (x = s.x0 - 2; x <= s.x1 + 2; x++) for (y = s.G1 - 10; y < s.G1; y++) if (g.m[y * g.gw + x] === M.EMPTY && Math.abs(x - s.spot) > 1) w.sandPlace(g, y * g.gw + x, M.INERT);
    q.barrel = 1; q.task = null; q.hunger = 0; q.x = s.cx + (s.side > 0 ? -12 : 12); q.y = L.G - 1;
    for (k = 0; k < 4500 && q.barrel; k++) sim.step(w, 1);
    check(!q.barrel && tank.tank === 2, "the barrel is still carried for a lamp nobody can get to (" + k + " ticks): barrel " + q.barrel + ", tank " + tank.tank + ", lamp " + s.fuel + ", salvage " + JSON.stringify(g.salvage) + ", task " + JSON.stringify(q.task && q.task.kind));
    check(w.wNoGo(g, q, s.id), "the lamp was not let be");
  });
  test("barrels: dead with a barrel, it goes into a well's tank with room, passing a full one; with no room anywhere, it is kept", function () {
    var w = sim.load(1), g = w.g, G = 150, p = g.peasants[0];
    var full = well(w, 160, G, w.O_TANK), room = well(w, 260, G, 1);
    p.x = 165.5; p.y = G - 1; p.barrel = 1;
    w.pDie(g, p, "drain");
    check(room.tank === 2 && full.tank === w.O_TANK, "the barrel went " + full.tank + "/" + room.tank);
    room.tank = w.O_TANK;
    var q = g.peasants[1]; q.x = 165.5; q.y = G - 1; q.barrel = 1;
    w.pDie(g, q, "drain");
    check(g.salvage && g.salvage.barrel === 1, "the barrel was lost with every tank full: " + JSON.stringify(g.salvage));
  });
  test("barrels: a barrel in hand with nowhere wanting it goes back into a well's tank with room, not kept in a pocket", function () {
    var w = sim.load(1), g = w.g, G = 150, p = g.peasants[0];
    var s = well(w, 260, G, 1);
    p.x = 165.5; p.y = G - 1; p.barrel = 1;
    w.hDeliverBarrel(g, p);
    check(!p.barrel && s.tank === 2, "the barrel stayed in the pocket: " + p.barrel + ", tank " + s.tank);
  });
  test("lighthouse: a painted lake of 480 cells puts it into the head of the first one to swim in it", function () {
    var L = lake(), w = L.w, g = L.g, p = g.peasants[0], k;
    p.x = 190.5; p.y = L.G + 8; p.state = "walk";
    for (k = 0; k < 400 && p.wspark !== "lighthouse"; k++) sim.step(w, 1);
    check(g.hLake && g.hLake.n >= 200, "the lake was not seen: " + JSON.stringify(g.hLake));
    check(p.wspark === "lighthouse", "the swimmer did not think of a lighthouse (" + p.wspark + ", swimming " + p.swimming + ")");
  });
  test("lighthouse: a swimmer in a lake thinks of it the same, loaded into a game that had another valley open", function () {
    var L = lake(), w = L.w, g = L.g, p = g.peasants[0];
    sim.step(w, 31);   /* (the lake looked at once, swimmer or none) */
    var doc = JSON.parse(JSON.stringify(w.saveDocument(g, { source: "test" })));
    /* another game, with a different lake in it looked at (its own labels), then the first village loaded into it */
    var O = lake(), w2 = O.w, g2 = O.g, x, y;
    for (x = 169; x <= 210; x++) for (y = O.G; y <= O.G + 12; y++) w2.sandPlace(g2, y * g2.gw + x, w2.MAT.STONE);
    for (x = 60; x <= 100; x++) for (y = O.G - 8; y < O.G; y++) w2.sandPlace(g2, y * g2.gw + x, w2.MAT.WATER);
    w2.hLakeScan(g2);
    w2.saveLoad(g2, doc);
    [[w, g], [w2, g2]].forEach(function (P, n) {
      var q = P[1].peasants[0], k;
      q.x = 190.5; q.y = L.G + 8; q.state = "walk";
      for (k = 0; k < 400 && q.wspark !== "lighthouse"; k++) sim.step(P[0], 1);
      check(q.wspark === "lighthouse", (n ? "loaded into another game, " : "") + "the swimmer did not think of a lighthouse (" + q.wspark + ")");
    });
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
  test("lighthouse: lightning in the lantern sets its oil alight as it strikes, at any speed", function () {
    var L = lighthouse(true), w = L.w, g = L.g, s = L.s, k, hit = false;
    s.fuel = 4000;
    for (k = 0; k < 200 && !hit; k++) {
      g.bolts.length = 0;
      w.sandLightning(g, s.lx);
      var B = g.bolts[0], e = B && B.pts[B.pts.length - 1];
      hit = !!e && e[0] >= s.x0 - 1 && e[0] <= s.x1 + 1 && e[1] >= s.ly - 6 && e[1] <= s.ly + 3;
    }
    check(hit, "(the test wants a bolt in the lantern)");
    check(s.fuel === 0, "the bolt struck the lantern and the oil did not catch (it was left to a look at the bolt, later)");
  });
  test("lighthouse: a keeper's fetch timed out with the barrel in hand: they take it up to the lamp, and the light comes back", function () {
    var L = lighthouse(true), w = L.w, g = L.g, s = L.s, k;
    s.fuel = 0; s.noOil = g.tick + 1e9;   /* (no oil in any well's tank, to send anybody for) */
    var q = g.peasants[0];
    g.peasants.forEach(function (o) { if (o !== q) o.dead = 1; });
    q.barrel = 1; q.task = null; q.hunger = 0; q.x = s.cx - 12; q.y = L.G - 1;
    for (k = 0; k < 8000 && !(s.fuel > 0); k++) sim.step(w, 1);
    check(s.fuel > 0 && !q.barrel, "the barrel in hand never went up to the lamp: fuel " + s.fuel + ", barrel " + q.barrel);
  });
  test("lighthouse: never planned where it would leave a swimmer in the lake no way out", function () {
    var L = lighthouse(true), w = L.w, g = L.g, s = L.s, sx = s.side > 0 ? 190 : 185;
    var out = w.navFind(g, sx, L.G + 1, w.pDryGoal(g), s.cx, L.G - 1, 20000);
    check(!!out, "no way out of the lake with the lighthouse built");
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

  /* ---------------------------------------------------------------- the foundry */
  /* a foundry built on level ground at column 150 of seed 1, its founder by the side it is to pour, everybody else gone */
  function foundry(mould) {
    var w = sim.load(1), g = w.g, G = 150, k;
    flat(w, 110, 230, G);
    know(g, ["farm", "dig", "mine", "masonry", "smelt", "forge", "concrete", "foundry"]);
    var gy = []; for (k = 0; k < w.H_FW; k++) gy.push(G);
    var r = w.hFoundryFit(g, 150, gy, G, G);
    check(!!r, "(the test wants the foundry to fit on level ground)");
    var s = w.hFoundryAt(g, g.peasants[0], 150, r.R0, r.plan);
    sim.build(w, s); s.done = false; w.bFinish(g, s, g.peasants[0]);
    settle(g);
    g.peasants.forEach(function (q, n) { q.iron = 0; q.coal = 0; q.plate = 0; q.bell = 0; if (n > 0) q.dead = 1; });
    var p = g.peasants[0];
    p.iron = 2; p.coal = 80; p.x = (mould === "bell" ? s.xf + w.H_SPOT[1] : s.xf + w.H_SPOT[0]) + 0.5; p.y = s.R0 - 1;   /* (at the stations, outside the jacket) */
    s.casts = 1; s.mould = mould || "plate"; s.phase = 1; s.founder = p.id;
    return { w: w, g: g, s: s, p: p };
  }
  /* all the iron there is about the foundry: in pockets, as bars, plates and bells, and in the grid, as a fifth of a bar a cell */
  function ironOf(F) {
    var g = F.g, M = F.w.MAT, n = 0, s = F.s;
    g.peasants.forEach(function (q) { n += (q.iron || 0) + 0.2 * (q.plate || 0) + 1.8 * (q.bell || 0); });
    for (var y = s.y0 - 4; y <= s.y1 + 4; y++) for (var x = s.x0 - 4; x <= s.x1 + 4; x++) { var c = g.m[y * g.gw + x]; if (c === M.METAL || (c === M.LAVA && g.aux[y * g.gw + x] === M.METAL)) n += 0.2; }
    return n;
  }
  function fireb(F) { var n = 0; F.s.plan.forEach(function (e) { if (e.v === F.w.MAT.FIREBRICK && F.g.m[e.i] === F.w.MAT.FIREBRICK) n++; }); return n; }
  test("foundry: the forge, concrete and sixty bars put it into the head of whoever has worked the furnace most", function () {
    var w = sim.load(1), g = w.g;
    know(g, ["farm", "dig", "mine", "masonry", "smelt", "forge", "concrete"]);
    check(w.mPlanFurnace(g, g.peasants[0]), "(the test wants a furnace)");
    sim.build(w, sites(g, "furnace")[0]);
    g.iron = 60; g.peasants[3].smelts = 30;
    w.hSmelted(g, g.peasants[1]);
    check(g.peasants[3].wspark === "foundry", "the sixtieth bar did not put it into the head of the one who smelted most (" + g.peasants[3].wspark + ")");
    g.know.foundry = "TEST";
    settle(g);
    check(w.hPlanFoundry(g, g.peasants[0]), "nowhere for a foundry");
  });
  test("foundry: a closed chamber of lit coal with the bellows worked is mostly running and over 1500 within 2500 ticks; unworked it never passes 760", function () {
    var F = foundry("plate"), w = F.w, g = F.g, s = F.s, k, best = 0, hi = 0, fb = fireb(F);
    s.hold = true;   /* (not tapped: only heated) */
    for (k = 0; k < 4000 && s.phase < 2; k++) sim.step(w, 1);
    check(s.phase === 2, "the foundry was never charged");
    var t0 = g.tick;
    for (k = 0; k < 2500; k++) {
      sim.step(w, 1);
      var c = w.hChamber(g, s);
      if (c.liq + c.met) best = Math.max(best, c.liq / (c.liq + c.met));
      hi = Math.max(hi, w.hLavaT(g, s));
    }
    check(best >= 0.8 && hi > 1500, "at best " + Math.round(best * 100) + "% of it was running, at " + Math.round(hi) + "°, in 2500 ticks");
    check(fireb(F) === fb, "the firebrick melted: " + fb + " -> " + fireb(F));
    /* the same, charged, and nobody at the bellows or feeding the fire */
    F = foundry("plate"); w = F.w; g = F.g; s = F.s; s.hold = true;
    for (k = 0; k < 4000 && s.phase < 2; k++) sim.step(w, 1);
    F.p.dead = 1;
    hi = 0;
    for (k = 0; k < 2500; k++) { sim.step(w, 1); for (var j = 0; j < s.cells.length; j++) if (g.m[s.cells[j]] === w.MAT.METAL || g.m[s.cells[j]] === w.MAT.LAVA) hi = Math.max(hi, g.T[s.cells[j]]); }
    check(hi < 760, "unworked, the iron in it got to " + Math.round(hi));
  });
  test("foundry: the charge conserves iron: the founder's own only bar is not counted twice, and what there is no room for goes back", function () {
    /* (the village's one bar in the founder's pocket, and the charge wanting two) */
    var F = foundry("plate"), w = F.w, g = F.g, s = F.s, k;
    F.p.iron = 1;
    var i0 = ironOf(F);
    for (k = 0; k < 3000 && s.phase === 1; k++) sim.step(w, 1);
    check(s.phase === 2, "(the test wants it charged: phase " + s.phase + ")");
    check(Math.abs(ironOf(F) - i0) < 1e-6, "iron went from " + i0 + " to " + ironOf(F) + " in the charging");
    /* (two bars, and room in the chamber for only three cells of iron) */
    var F2 = foundry("plate"), w2 = F2.w, g2 = F2.g, s2 = F2.s, M = w2.MAT, free = 0;
    for (k = s2.cells.length - 1; k >= 0; k--) { var j = s2.cells[k]; if (k >= 2 && free < 3) { free++; continue; } if (k >= 2) w2.sandPlace(g2, j, M.BRICK); }
    var i2 = ironOf(F2);
    for (k = 0; k < 3000 && s2.phase === 1; k++) sim.step(w2, 1);
    check(s2.phase === 2, "(the test wants it charged: phase " + s2.phase + ")");
    check(Math.abs(ironOf(F2) - i2) < 1e-6, "iron went from " + i2 + " to " + ironOf(F2) + " into a chamber with room for three cells");
  });
  test("foundry: pouring a cell of melt into the mould makes no heat", function () {
    var F = foundry("plate"), w = F.w, g = F.g, s = F.s, M = w.MAT, k;
    var j = s.cells[0];
    w.sandPlace(g, j, M.LAVA); g.aux[j] = M.METAL; g.T[j] = 1600; w.heatAccept(g, j);
    for (k = 1; k < s.cells.length; k++) if (g.m[s.cells[k]] === M.LAVA) w.sandPlace(g, s.cells[k], M.EMPTY);
    var mould = w.hMould(g, s, "plate"), to = mould.filter(function (i) { return w.AIRY[g.m[i]]; })[0];
    var q0 = w.heatQ(g, j) + w.heatQ(g, to);
    s.phase = 3;
    check(w.hPourCell(g, s, F.p), "(the test wants a cell poured)");
    var q1 = w.heatQ(g, j) + w.heatQ(g, to);
    check(Math.abs(q1 - q0) < 1e-3, "the pour went from " + q0 + " to " + q1 + " heat");
  });
  test("foundry: charged with no coal to be had, it goes cold and is given up, the iron left in it; coal brought later, it is fired up again and melts", function () {
    var F = foundry("plate"), w = F.w, g = F.g, s = F.s, M = w.MAT, k;
    F.p.coal = 0;
    var charged = false;
    for (k = 0; k < 9000 && !(charged && s.phase === 0); k++) { sim.step(w, 1); if (s.phase === 2) charged = true; }
    /* (given up, back to idle: the iron left in the chamber for the next charge) */
    check(charged && s.phase === 0 && w.hChamber(g, s).met > 0, "(the test wants it charged, gone cold, and given up: phase " + s.phase + ")");
    var left = w.hChamber(g, s).met;
    F.p.coal = 80; F.p.iron = 12; s.casts = 0;   /* (coal, and something wanted cast again: a first pour) */
    for (k = 0; k < 8000 && s.phase < 3; k++) sim.step(w, 1);
    check(F.p.coal < 80, "none of the coal went in");
    check(s.phase >= 3, "it never melted (phase " + s.phase + ", " + Math.round(w.hChamber(g, s).hi) + "°)");
  });
  test("foundry: tapped, water in the mould is shoved out of it, not lost, and the other mould is let be", function () {
    var F = foundry("plate"), w = F.w, g = F.g, s = F.s, M = w.MAT, k;
    var plate = w.hMould(g, s, "plate"), bell = w.hMould(g, s, "bell");
    w.sandPlace(g, plate[0], M.WATER); w.sandPlace(g, bell[0], M.WATER);
    function water() { var n = 0; for (var j = 0; j < g.m.length; j++) if (w.WET[g.m[j]] || g.m[j] === M.STEAM) n++; return n; }
    var n0 = water();
    for (k = 0; k < 12000 && s.phase < 3; k++) sim.step(w, 1);
    check(s.phase === 3, "(the test wants it tapped: phase " + s.phase + ")");
    check(bell.some(function (j) { return w.WET[g.m[j]]; }), "the water in the bell mould, not being cast into, was taken out");   /* (it runs about the cup: anywhere in it) */
    check(water() === n0, "water (and steam) went from " + n0 + " to " + water() + " as it was tapped");
  });
  test("foundry: a bell wanted, and a drop of water in the bell's mould: the drop is shoved out, and it is a bell that is cast", function () {
    var F = foundry("plate"), w = F.w, g = F.g, s = F.s, M = w.MAT;
    w.wDef({ id: "bellwant" });
    var x = s.x1 + 20, G = w.mGround(g, x), e = w.bE(g, x, G - 1, M.METAL, 0); e.res = "bell"; e.cost = 1;
    w.bNew(g, "bellwant", F.p, [e], [x, G - 1, x, G - 1], { wonder: true });
    s.phase = 0; s.mould = "";
    var bell = w.hMould(g, s, "bell");
    w.sandPlace(g, bell[0], M.WATER);
    function water() { var n = 0; for (var j = 0; j < g.m.length; j++) if (w.WET[g.m[j]]) n++; return n; }
    var n0 = water();
    w.hFoundryStep(g, s);
    check(s.mould === "bell", "with a bell wanted, it was set to cast " + JSON.stringify(s.mould));
    check(!bell.some(function (j) { return w.WET[g.m[j]]; }), "the drop is still in the bell's mould");
    check(water() === n0, "water went from " + n0 + " to " + water());
  });
  test("foundry: ice in the bell's mould is lifted out of it, heat and all, not made to vanish", function () {
    var F = foundry("plate"), w = F.w, g = F.g, s = F.s, M = w.MAT;
    w.wDef({ id: "bellwant2" });
    var x = s.x1 + 20, G = w.mGround(g, x), e = w.bE(g, x, G - 1, M.METAL, 0); e.res = "bell"; e.cost = 1;
    w.bNew(g, "bellwant2", F.p, [e], [x, G - 1, x, G - 1], { wonder: true });
    s.phase = 0; s.mould = "";
    var bell = w.hMould(g, s, "bell");
    bell.forEach(function (j) { w.sandPlace(g, j, M.ICE); g.T[j] = -5; w.heatAccept(g, j); });
    function ice() { var n = 0; for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.ICE) n++; return n; }
    var n0 = ice();
    w.hFoundryStep(g, s);
    check(s.mould === "bell", "(the test wants a bell to be cast)");
    check(!bell.some(function (j) { return g.m[j] === M.ICE; }), "ice still in the bell's mould");
    check(ice() === n0, "ice went from " + n0 + " to " + ice());
  });
  test("foundry: a cold cell of iron left in an idle mould is taken out as scrap, iron and all, and the bell is cast", function () {
    var F = foundry("plate"), w = F.w, g = F.g, s = F.s, M = w.MAT;
    w.wDef({ id: "bellwant3" });
    var x = s.x1 + 20, G = w.mGround(g, x), e = w.bE(g, x, G - 1, M.METAL, 0); e.res = "bell"; e.cost = 1;
    w.bNew(g, "bellwant3", F.p, [e], [x, G - 1, x, G - 1], { wonder: true });
    s.phase = 0; s.mould = "";
    var bell = w.hMould(g, s, "bell");
    w.sandPlace(g, bell[0], M.METAL); g.T[bell[0]] = 20; w.heatAccept(g, bell[0]);
    var i0 = ironOf(F);
    w.hFoundryStep(g, s);
    check(s.mould === "bell" && s.phase === 1, "the bell's mould, with a cold cell of iron in it, was not cast into: " + JSON.stringify([s.mould, s.phase]));
    check(Math.abs(ironOf(F) - i0) < 1e-6, "iron went from " + i0 + " to " + ironOf(F));
  });
  test("foundry: the ninths of a bell kept in the salvage mend a bell's cell, and no new bell is cast for it", function () {
    var F = foundry("plate"), w = F.w, g = F.g, s = F.s, M = w.MAT, k;
    w.wDef({ id: "bellwant4" });
    var x = s.x1 + 20, G = w.mGround(g, x), e = w.bE(g, x, G - 1, M.METAL, 0); e.res = "bell"; e.cost = 1 / 9;
    var t = w.bNew(g, "bellwant4", F.p, [e], [x, G - 1, x, G - 1], { wonder: true });
    g.salvage = { bell: 8 / 9, x: x };
    check(w.hFoundryWant(g, s) === "", "the foundry wants to cast " + w.hFoundryWant(g, s) + ", with 8/9 of a bell kept");
    var q = g.peasants.filter(function (o) { return !o.dead; })[0];
    q.task = null; q.hunger = 0;
    check(w.wGoSalvage(g, q), "(the test wants somebody sent for it)");
    for (k = 0; k < 8000 && g.m[e.i] !== M.METAL; k++) sim.step(w, 1);
    check(g.m[e.i] === M.METAL, "the bell's cell was never mended from the salvage: " + JSON.stringify(g.salvage));
    /* (what is left: 7/9, in the salvage or in a pocket on its way back to it. a ninth went into the cell) */
    var left = ((g.salvage && g.salvage.bell) || 0) + g.peasants.reduce(function (n, o) { return n + (o.dead ? 0 : (o.bell || 0)); }, 0);
    check(Math.abs(left - 7 / 9) < 1e-6, "the salvage and pockets have " + left * 9 + " ninths of a bell left, not 7");
    void t;
  });
  test("foundry: a bell's ninths kept at a store over a drop nobody can climb back up are not counted on: a bell is cast", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, x, y;
    w.sandClear(g);
    for (x = 0; x < g.gw; x++) for (y = x >= 210 ? 102 : 150; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, M.STONE);   /* (a terrace, steep: down is a drop, up is no way) */
    var p = g.peasants[0];
    g.peasants.forEach(function (o) { if (o !== p) o.dead = 1; });
    p.x = 170.5; p.y = 149; p.task = null;
    var f = w.bNew(g, "furnace", p, [], [215, 89, 228, 103], { sx: 214, sy: 101, G: 102 }); f.done = true;
    var e = w.bE(g, 176, 148, M.METAL, 0, 1 / 9); e.res = "bell"; e.cost = 1 / 9;
    var pad = w.bNew(g, "moonrocket", p, [e], [175, 148, 182, 149], { wonder: true }); pad.repair = true;
    var fo = w.hFoundryAt(g, p, 110, 150, []); fo.done = true; fo.casts = 1;
    p.iron = 12; p.coal = 12;
    w.wDropAll(g, { x: 214.5, name: "the bell carrier", bell: 1 / 9 });
    check(g.salvage && g.salvage.bell > 0, "(the test wants the bell's ninth kept, up at the store)");
    check(w.hFoundryWant(g, fo) === "an engine bell", "the foundry counts on a bell's ninth nobody can get to: " + JSON.stringify(w.hFoundryWant(g, fo)));
    w.hFoundryStep(g, fo);
    check(fo.phase === 1, "no cast begun: phase " + fo.phase);
  });
  test("foundry: a founder who cannot get to it is let be, and somebody who can casts instead; and every job a great work hands out asks after backoff", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, x, y, i;
    w.sandClear(g);
    for (x = 0; x < g.gw; x++) for (y = 150; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, M.STONE);
    var chosen = g.peasants[0], local = g.peasants[1];
    g.peasants.forEach(function (o) { if (o !== chosen && o !== local) o.dead = 1; });
    g.know.foundry = "TEST"; g.know.moonrocket = "TEST";
    for (x = 135; x <= 181; x++) for (y = 150; y < 158; y++) w.sandPlace(g, y * g.gw + x, M.SAND);
    var gy = []; for (i = 0; i < w.H_FW; i++) gy.push(150);
    var fit = w.hFoundryFit(g, 155, gy, 150, 150), s = w.hFoundryAt(g, chosen, 155, fit.R0, fit.plan);
    sim.build(w, s); s.casts = 1; s.founder = chosen.id;
    var e = w.bE(g, 221, 148, M.METAL, 0, 1 / 9); e.res = "bell"; w.bNew(g, "moonrocket", local, [e], [221, 148, 222, 149], { wonder: true });
    for (x = 108; x <= 116; x++) for (y = 45; y < 150; y++) w.sandPlace(g, y * g.gw + x, M.STONE);   /* (a wall: the founder on the far side) */
    chosen.x = 75.5; chosen.y = 149; chosen.task = null; chosen.smelts = 9;
    local.x = 181.5; local.y = 149; local.task = null; local.iron = 12; local.coal = 120;   /* (by the station on the hot side: the foundry is 155 to 173) */
    var sent = [0, 0];
    for (i = 0; i < 8000 && s.phase <= 1; i++) {
      chosen.hunger = local.hunger = 0; sim.step(w, 1);
      [chosen, local].forEach(function (q, k) { if (q.task && q.task.kind === "found" && q.task.t <= 1) sent[k]++; });
    }
    check(s.phase > 1 && sent[1] > 0 && sent[0] <= 3, "the cast never began: phase " + s.phase + ", the cut-off founder sent " + sent[0] + " times, the other " + sent[1]);
    /* (and every job handed out by the great works' files asks wIdle with its site: but stargazing and a word about the moon,
       which take nobody anywhere) */
    var fs = require("fs"), path = require("path"), bare = [];
    ["wonders.js", "heavens.js", "monuments.js", "pleasures.js"].forEach(function (f) {
      fs.readFileSync(path.join(__dirname, "..", f), "utf8").split("\n").forEach(function (l, n) { if (/wIdle\(g, [a-z]+\)/.test(l) && !/stargaze|"moon"/.test(l)) bare.push(f + ":" + (n + 1)); });
    });
    check(!bare.length, "jobs handed out without asking after backoff: " + bare.join(", "));
  });
  test("foundry: a firebrick in the pocket of somebody who cannot get there is not counted on: the kiln makes another", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, x, y, i;
    w.sandClear(g);
    for (x = 0; x < g.gw; x++) for (y = 150; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, M.STONE);
    var carrier = g.peasants[0], local = g.peasants[1];
    g.peasants.forEach(function (o) { if (o !== carrier && o !== local) o.dead = 1; });
    g.know.concrete = "TEST"; g.know.foundry = "TEST";
    for (x = 145; x <= 185; x++) for (y = 150; y < 158; y++) w.sandPlace(g, y * g.gw + x, M.SAND);
    var gy = []; for (i = 0; i < w.H_FW; i++) gy.push(150);
    var fit = w.hFoundryFit(g, 162, gy, 150, 150), s = w.hFoundryAt(g, local, 162, fit.R0, fit.plan);
    sim.build(w, s); s.casts = 1;
    var e = s.plan.filter(function (e2) { return e2.v === M.FIREBRICK && e2.i % g.gw === s.xf + 10 && ((e2.i / g.gw) | 0) === s.R0 - 2; })[0];
    w.heatVanish(g, e.i); w.bInspect(g, s, g.sites.indexOf(s));
    check(s.repair, "(the test wants a firebrick to mend)");
    var f = w.bNew(g, "furnace", local, [], [202, 140, 214, 150], { sx: 200, sy: 149, G: 150, fc: 204, mouth: 1 }); sim.build(w, f);
    for (x = 108; x <= 116; x++) for (y = 45; y < 150; y++) w.sandPlace(g, y * g.gw + x, M.STONE);   /* (a wall: the carrier on the far side) */
    carrier.x = 75.5; carrier.y = 149; carrier.task = null; carrier.firebrick = 1;
    local.x = 200.5; local.y = 149; local.task = null; local.stone = 2; local.coal = 4;
    for (i = 0; i < 8000 && !(g.m[e.i] === M.FIREBRICK || (s.stock && s.stock.firebrick >= 1)); i++) { carrier.hunger = local.hunger = 0; sim.step(w, 1); }
    check(g.m[e.i] === M.FIREBRICK || (s.stock && s.stock.firebrick >= 1), "no firebrick made for it: orders " + JSON.stringify(w.wKilnOrders(g)) + ", carrier stranded " + w.wStranded(g, carrier));
    /* (and nowhere in the great works is what is in pockets counted on, for an order or a want, but the reachable way:
       wPocketedSure. the one bare count left is the readout's "waiting for") */
    /* (every file, not only the great works': in those, no bare count of pockets at all; elsewhere, none in a line about a
       great work, and none of what only a great work wants) */
    var fs = require("fs"), path = require("path"), bare = [], root = path.join(__dirname, ".."), W = ["wonders.js", "heavens.js", "monuments.js", "pleasures.js"];
    fs.readdirSync(root).filter(function (fn) { return /\.js$/.test(fn); }).forEach(function (fn) {
      fs.readFileSync(path.join(root, fn), "utf8").split("\n").forEach(function (l, n) {
        var t = l.trim();
        if (/^function wPocketed|return "waiting for/.test(t)) return;
        var hit = /\bwPocketed\(g/.test(l) ||
                  (W.indexOf(fn) >= 0 && /mGoldToHand\(|mIronToHand\(|lToHand\(|bStoneToHand\(/.test(l)) ||
                  (/\.wonder\b/.test(l) && /mGoldToHand\(|mIronToHand\(|lToHand\(/.test(l)) ||
                  /lToHand\(g, "(stained|firebrick|lime|plate|bell|moonrock|lump|mortar)"/.test(l);
        if (hit) bare.push(fn + ":" + (n + 1));
      });
    });
    check(!bare.length, "pockets counted on without asking whether they can be got to: " + bare.join(", "));
  });
  test("observatory, and every other great work the bored go to look at: not while they are backed off from it", function () {
    var w = sim.load(1), g = w.g, p = g.peasants[0], k, n = 0;
    var s = w.bNew(g, "observatory", p, [], [Math.floor(p.x) - 4, 100, Math.floor(p.x) + 4, 140], { wonder: true, spot: Math.floor(p.x), F: 120 }); s.done = true;
    p.bored = 5000; p.task = null;
    w.wBackoff(g, p, s.id);
    for (k = 0; k < 400; k++) { p.task = null; if (w.hObsPick(g, p, false)) n++; }
    check(n === 0, "a bored peasant backed off from the observatory asked to go up it " + n + " times");
    var fs = require("fs"), path = require("path"), bare = [];
    ["wonders.js", "heavens.js", "monuments.js", "pleasures.js"].forEach(function (fn) {
      fs.readFileSync(path.join(__dirname, "..", fn), "utf8").split("\n").forEach(function (l, i) { if (/p\.bored [<>]/.test(l) && /return|kind:/.test(l) && !/wNoGo/.test(l) && /s\.cx/.test(l)) bare.push(fn + ":" + (i + 1)); });
    });
    check(!bare.length, "the bored sent to a great work without asking after backoff: " + bare.join(", "));
  });
  test("observatory: an astronomer who cannot get up to it is let be till after the next look, and somebody who can looks", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, x, y, i;
    w.sandClear(g);
    for (x = 0; x < g.gw; x++) for (y = 150; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, M.STONE);
    g.arriveT = 1e9; g.helloT = 0; g.wAny = true; g.know = { observatory: "TEST" };
    var astro = g.peasants[0], local = g.peasants[1];
    g.peasants = [astro, local];
    function set(p, px, py) { p.x = px + 0.5; p.y = py; p.task = null; p.idle = 0; p.hunger = 0; p.bored = 0; p.life = 1e9; }
    set(local, 170, 149); set(astro, 105, 149);
    check(w.mPlanTower(g, local), "(the test wants a tower)");
    var tower = sites(g, "tower")[0]; sim.build(w, tower);
    check(w.hPlanObs(g, local), "(the test wants an observatory)");
    var s = sites(g, "observatory")[0]; sim.build(w, s);
    var wr = tower.x0 - 16;
    for (x = wr - 8; x <= wr; x++) for (y = 45; y < 150; y++) w.sandPlace(g, y * g.gw + x, M.STONE);   /* (a wall: the astronomer beyond it) */
    set(astro, tower.x0 - 42, 149); set(local, s.spot, s.F - 1);
    s.astro = astro.id; s.showerT = 1e9;
    var sent = 0, had = null;
    for (i = 0; i < 20000; i++) {
      g.tick++;
      if (astro.task) w.pTask(g, astro);
      if (local.task) w.pTask(g, local);
      if (g.tick % w.W_STRIDE === 0) w.hObsStep(g, s);
      if (astro.task && astro.task.kind === "observe" && astro.task !== had) sent++;
      had = astro.task;
    }
    check(sent <= 2 && s.looks > 0, "the cut-off astronomer sent " + sent + " times; looks " + (s.looks || 0));
  });
  test("cathedral: a pane in the pocket of somebody who cannot get there is not counted on: glass is blown, and the window mended", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, x, y, i;
    w.sandClear(g);
    for (x = 0; x < g.gw; x++) for (y = 150; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, M.STONE);
    g.arriveT = 1e9; g.helloT = 0; g.wAny = true; g.know = { cathedral: "TEST", stained: "TEST", glass: "TEST" }; g.ideaT = 1e9;
    for (x = 135; x <= 193; x++) for (y = 150; y < 165; y++) w.sandPlace(g, y * g.gw + x, M.SAND);
    var carrier = g.peasants[0], local = g.peasants[1];
    g.peasants = [carrier, local];
    function set(p, px) { p.x = px + 0.5; p.y = 149; p.task = null; p.idle = 0; p.hunger = 0; p.bored = 0; p.life = 1e9; }
    set(local, 165);
    check(w.mPlanCathedral(g, local, 165), "(the test wants a cathedral)");
    var s = sites(g, "cathedral")[0]; sim.build(w, s);
    var e = s.plan.filter(function (e2) { return e2.v === M.STAINED; }).sort(function (a, b) { return b.i - a.i; })[0];
    w.heatVanish(g, e.i); w.bInspect(g, s, g.sites.indexOf(s));
    var f = w.bNew(g, "furnace", local, [], [202, 140, 214, 150], { sx: 200, sy: 149, G: 150, fc: 204, mouth: 1, stock: { coal: 40 } }); sim.build(w, f);
    for (x = 108; x <= 116; x++) for (y = 45; y < 150; y++) w.sandPlace(g, y * g.gw + x, M.STONE);
    set(carrier, 105); carrier.stained = 1;
    set(local, 200); local.sand = 3; local.coal = 10;
    for (i = 0; i < 10000 && !w.bOk(g, e); i++) { carrier.hunger = local.hunger = 0; sim.step(w, 1); }
    check(w.bOk(g, e), "the window was never mended: glass blown " + (g.found.glass || 0));
  });
  /* (a flat valley, sand over stone, one villager, the foundry's ideas: for the foundry's own cases) */
  function fflat(seed) {
    var w = sim.load(seed), g = w.g, M = w.MAT, x, y;
    w.sandClear(g);
    for (x = 0; x < g.gw; x++) for (y = 150; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, y < 158 ? M.SAND : M.STONE);
    g.arriveT = 1e9; g.helloT = 0; g.ideaT = 1e9; g.wAny = true; g.know = { foundry: "TEST", moonrocket: "TEST", concrete: "TEST" };
    var p = g.peasants[0]; g.peasants = [p];
    p.x = 175.5; p.y = 149; p.task = null; p.idle = 0; p.hunger = 0; p.bored = 0; p.born = 0; p.iron = 0; p.coal = 100;   /* (beside it: the foundry is 150 to 168) */
    return { w: w, g: g, p: p, M: M };
  }
  function fRocketWantingBell(F, x) {
    var w = F.w, g = F.g, gy = [], i;
    for (i = 0; i < w.H_RW; i++) gy.push(150);
    var fit = w.hRocketFit(g, x || 220, gy, 150, 150), r = w.hRocketAt(g, F.p, x || 220, fit.R0, fit.plan);
    sim.build(w, r);
    r.plan.filter(function (e) { return e.res === "bell"; }).forEach(function (e) { w.heatVanish(g, e.i); });
    w.bInspect(g, r, g.sites.indexOf(r));
    return r;
  }
  function fFoundry(F, x) {
    var w = F.w, g = F.g, gy = [], i;
    for (i = 0; i < w.H_FW; i++) gy.push(150);
    var fit = w.hFoundryFit(g, x || 150, gy, 150, 150), s = w.hFoundryAt(g, F.p, x || 150, fit.R0, fit.plan);
    sim.build(w, s);
    return s;
  }
  test("foundry: a bell wanted and one bar to hand: nothing is cast till there is a bell's worth, and then a bell, iron and all", function () {
    var F = fflat(6), w = F.w, g = F.g, p = F.p, s = fFoundry(F), i;
    fRocketWantingBell(F);
    check(w.hFoundryWant(g, s) === "an engine bell", "(the test wants a bell wanted)");
    p.iron = 1;
    for (i = 0; i < 3000; i++) { p.hunger = 0; sim.step(w, 1); }
    check(!s.casts && p.iron === 1 && !(p.plate > 0), "one bar went in for a bell: " + s.casts + " casts, " + p.iron + " bars left, " + (p.plate || 0) + " plates");
    p.iron += 1;
    for (i = 0; i < 12000 && !(p.bell >= 1); i++) { p.hunger = 0; sim.step(w, 1); }
    check(p.bell >= 1, "two bars, and no bell: " + s.casts + " casts, phase " + s.phase + ", plates " + (p.plate || 0));
  });
  test("foundry: not planned where a bellows station is in the cliff next to it; planned beside open ground, it charges", function () {
    function run(cliff) {
      var F = fflat(1), w = F.w, g = F.g, p = F.p, M = F.M, x, y, i, x0 = g.gw / 2 - w.H_FW / 2;
      for (x = 0; x < g.gw; x++) if (x < x0 || x >= x0 + w.H_FW) for (y = 150; y < 158; y++) w.sandPlace(g, y * g.gw + x, M.STONE);
      g.sites.length = 0;   /* (the village to the left: a house at 40) */
      w.bNew(g, "house", p, [w.bE(g, 40, 150, M.STONE, 0)], [35, 136, 45, 149], { F: 149, door: 35 }).done = true;
      p.x = 60.5;
      check(w.mPlanFurnace(g, p), "(the test wants a furnace)");
      sim.build(w, sites(g, "furnace")[0]); p.task = null;
      if (cliff) for (x = x0 + 16; x <= x0 + 23; x++) for (y = 85; y < 150; y++) w.sandPlace(g, y * g.gw + x, M.STONE);
      p.x = x0 - 6 + 0.5; p.iron = 12; p.coal = 100;
      if (!w.hPlanFoundry(g, p)) return { planned: false };
      var s = sites(g, "foundry")[0];
      sim.build(w, s); p.task = null;
      for (x = 245; x < 245 + w.H_RW; x++) for (y = 150; y < 158; y++) w.sandPlace(g, y * g.gw + x, M.SAND);
      fRocketWantingBell(F, 245);
      for (i = 0; i < 11000 && s.phase < 2; i++) { p.hunger = 0; sim.step(w, 1); }
      return { planned: true, phase: s.phase };
    }
    var a = run(true), b = run(false);
    check(!a.planned || a.phase >= 2, "planned with a station in the cliff, and never charged: " + JSON.stringify(a));
    check(b.planned && b.phase >= 2, "beside open ground it did not charge: " + JSON.stringify(b));
  });
  test("foundry: hot air come down over the bellows, the founder steps back out of it, and does not catch fire", function () {
    var F = fflat(1), w = F.w, g = F.g, p = F.p, s = fFoundry(F), i, d;
    fRocketWantingBell(F); p.iron = 2;
    for (i = 0; i < 4000 && !(s.phase === 2 && p.task && p.task.kind === "found" && p.task.act > 0); i++) { p.hunger = 0; sim.step(w, 1); }
    check(s.phase === 2 && p.task && p.task.kind === "found", "(the test wants the founder at the bellows, firing: phase " + s.phase + ")");
    var sp = w.hSpotAt(g, s);
    /* (a plume over the station, head high, as smoke from the chimney blown back down: warming as it comes, to 520) */
    for (i = 0; i < 300 && !p.fire; i++) {
      var hot = Math.min(520, 200 + i * 2);
      for (d = -1; d <= 1; d++) [5, 6, 7, 8].forEach(function (dy) { var j = (sp.y - dy) * g.gw + sp.x + d; g.T[j] = hot; });
      p.hunger = 0; sim.step(w, 1);
    }
    check(!p.fire && !p.dead, "the founder stood in it and caught fire");
  });
  test("foundry: full casts on flat ground, seeds 1, 2, 4, 6: a bell each, nobody burnt, the air about the founder never near igniting", function () {
    [1, 2, 4, 6].forEach(function (seed) {
      var F = fflat(seed), w = F.w, g = F.g, p = F.p, M = F.M, i, d;
      var q = sim.load(seed).g.peasants[1];
      q.x = 172.5; q.y = 149; q.task = null; q.idle = 0; q.hunger = 0; q.bored = 0; q.born = 0; q.iron = 0; q.coal = 50;
      g.peasants.push(q);
      var s = fFoundry(F); fRocketWantingBell(F); p.iron = 2;
      var hot = 0, burnt = false;
      for (i = 0; i < 12000 && !(s.bells >= 1); i++) {
        p.hunger = q.hunger = 0; sim.step(w, 1);
        [p, q].forEach(function (o) {
          if (o.fire) burnt = true;
          if (!o.task || o.task.kind !== "found") return;
          var fx = Math.floor(o.x), fy = Math.floor(o.y);
          for (d = 0; d <= 8; d++) if (fy - d >= 0) hot = Math.max(hot, g.T[(fy - d) * g.gw + fx]);
        });
      }
      check(s.bells === 1 && !burnt && !g.causes.fire && !g.causes.lava, "seed " + seed + ": bells " + (s.bells || 0) + ", burnt " + burnt + ", " + JSON.stringify(g.causes));
      check(hot < w.W_TOOHOT, "seed " + seed + ": the air about the founder at work reached " + Math.round(hot) + " (limit " + w.W_TOOHOT + ")");
    });
  });
  test("foundry: the station, built over, moves out to the first free footing, six columns out included", function () {
    var F = fflat(1), w = F.w, g = F.g, M = F.M, s = fFoundry(F), x, y;
    s.mould = "bell";
    var sp = w.hSpotAt(g, s);
    for (x = sp.x; x < sp.x + 6; x++) for (y = sp.y - 9; y <= sp.y; y++) w.sandPlace(g, y * g.gw + x, M.STONE);   /* (a wall over it, five wide, and the sixth column out free) */
    var at = w.hSpotAt(g, s);
    check(at.x === sp.x + 6 && w.navStand(g, at.x, at.y) === 1, "the station went to " + JSON.stringify(at) + ", not six out at " + (sp.x + 6));
  });
  /* (pi's valley: a cliff at x 184, the foundry at 150 between it and the food, a villager on the cliff side) */
  function fBasin(seed) {
    var w = sim.load(seed), g = w.g, M = w.MAT, x, y;
    w.sandClear(g);
    for (x = 0; x < g.gw; x++) for (y = x >= 184 ? 96 : 150; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, y >= 150 && y < 158 ? M.SAND : M.STONE);
    g.arriveT = 1e9; g.helloT = 0; g.ideaT = 1e9; g.wAny = true; g.know = { foundry: "TEST", concrete: "TEST" };
    g.peasants.forEach(function (p, i) { p.x = 130.5 + i * 3; p.y = 149; p.task = null; p.idle = 0; p.hunger = 0; p.bored = 0; p.life = 1e9; p.iron = 0; p.coal = 0; });
    return w;
  }
  test("foundry: a first pour given up for want of coal, the iron left in it counts: coal alone and it is fired again", function () {
    var F = fflat(1), w = F.w, g = F.g, p = F.p, s = fFoundry(F), i, charged = false;
    p.iron = 12; p.coal = 0; s.casts = 0;
    for (i = 0; i < 9000 && !(charged && s.phase === 0); i++) { p.hunger = 0; sim.step(w, 1); if (s.phase === 2) charged = true; }
    check(charged && s.phase === 0 && w.hChamber(g, s).met > 0 && w.wCellsSure(g, "iron") < 60, "(the test wants a first pour given up, the pockets under twelve bars: phase " + s.phase + ", " + w.wCellsSure(g, "iron") + " cells)");
    check(w.hFoundryWant(g, s) === "a first pour", "with the chamber's iron, it does not want its first pour: " + JSON.stringify(w.hFoundryWant(g, s)));
    p.coal = 80;
    for (i = 0; i < 6000 && !(s.phase >= 2 && w.hChamber(g, s).emb > 0); i++) { p.hunger = 0; sim.step(w, 1); }
    check(s.phase >= 2 && w.hChamber(g, s).emb > 0, "coal brought, and it is not fired again: phase " + s.phase);
  });
  test("foundry: a charge that never catches (no coal) gives up back to idle, and the villager beyond it is not cut off from food", function () {
    var w = fBasin(2), g = w.g, M = w.MAT, i, x;
    var op = g.peasants[0], walker = g.peasants[1];
    g.peasants = [op, walker];
    op.x = 100.5; op.iron = 12; walker.x = 176.5; walker.dir = 1;
    check(w.mPlanFurnace(g, op), "(the test wants a furnace)");
    sim.build(w, g.sites[g.sites.length - 1]);
    op.x = 145.5;
    var gy = []; for (i = 0; i < w.H_FW; i++) gy.push(150);
    var fit = w.hFoundryFit(g, 150, gy, 150, 150), s = sim.build(w, w.hFoundryAt(g, op, 150, fit.R0, fit.plan));
    function food() { for (x = 112; x < 140; x++) if (g.m[149 * g.gw + x] === M.EMPTY) w.sandSet(g, 149 * g.gw + x, M.FLOWER); }
    for (i = 0; i < 19100 && !walker.dead; i++) { if (i % 60 === 0) food(); sim.step(w, 1); }
    check(!walker.dead && !g.causes.starve, "the villager beyond the foundry starved: " + JSON.stringify(g.causes));
    check(s.phase === 0 || s.phase === 1, "the charge that never caught left it at phase " + s.phase);
  });
  /* (pi's valley again, as pi left it: stone floor but for a strip of sand, a house west, and the only food east, past
     where the foundry goes, by the cliff) */
  function fValley() {
    var w = fBasin(2), g = w.g, M = w.MAT, x;
    var p = g.peasants[0], q = g.peasants[1];
    g.peasants = [p, q];
    for (x = 184; x < 203; x++) for (var y = 96; y < 150; y++) w.sandPlace(g, y * g.gw + x, M.EMPTY);   /* (pi's cliff is at 203) */
    for (x = 0; x < 174; x++) if (x < 150 || x > 161) w.sandPlace(g, 150 * g.gw + x, M.STONE);
    return { w: w, g: g, M: M, p: p, q: q };
  }
  test("foundry: charged and never lit, it closes nothing: the hungry villager crosses it to the only food, beyond it", function () {
    var V = fValley(), w = V.w, g = V.g, M = V.M, p = V.p, q = V.q, i, x;
    p.x = 145.5; p.iron = 12; p.coal = 0;
    q.x = 125.5;
    check(w.bPlanHouse(g, q), "(the test wants a house)"); var h = sim.build(w, g.sites[g.sites.length - 1]); q.home = h.id; q.task = null;
    check(w.hPlanFoundry(g, p), "(the test wants a foundry)"); var s = sim.build(w, g.sites[g.sites.length - 1]); p.task = null;
    q.x = 125.5; q.hunger = 15700; q.dir = 1;
    function food() { for (x = 184; x < 201; x++) if (g.m[149 * g.gw + x] === M.EMPTY) w.sandSet(g, 149 * g.gw + x, M.FLOWER); }
    var charged = false;
    for (i = 0; i < 4600 && !q.dead; i++) { if (i % 60 === 0) food(); sim.step(w, 1); if (s.phase >= 2) charged = true; }
    check(charged && !s.casts, "(the test wants it charged and never cast: casts " + s.casts + ")");
    check(!q.dead && !g.causes.starve && q.hunger < 15000, "starved, or never fed, beyond a cold foundry: hunger " + Math.round(q.hunger) + ", " + JSON.stringify(g.causes));
  });
  test("foundry: between the village and its open ground, they lay out a field past it, and nobody starves", function () {
    var V = fValley(), w = V.w, g = V.g, p = V.p, q = V.q, i;
    g.know.farm = "TEST"; g.know.dig = "TEST"; g.resow = 1;
    p.x = 118.5; q.x = 126.5;
    check(w.bPlanHouse(g, p), "(the test wants a house)"); var h = sim.build(w, g.sites[g.sites.length - 1]); p.home = q.home = h.id; p.task = null;
    check(w.hPlanFoundry(g, p), "(the test wants a foundry)"); sim.build(w, g.sites[g.sites.length - 1]); p.task = null;
    p.hunger = q.hunger = 11000;
    for (i = 0; i < 9000 && !(p.dead && q.dead); i++) sim.step(w, 1);
    check(!g.causes.starve && w.iFields(g) >= 1 && g.got.harvest, "fields " + w.iFields(g) + ", harvests " + (g.got.harvest || 0) + ", " + JSON.stringify(g.causes));
  });
  test("houses are planned beside a foundry, but never on its roof or up its chimney", function () {
    var w = fBasin(1), g = w.g, i, x;
    var gy = []; for (i = 0; i < w.H_FW; i++) gy.push(150);
    var fit = w.hFoundryFit(g, 150, gy, 150, 150), s = sim.build(w, w.hFoundryAt(g, g.peasants[0], 150, fit.R0, fit.plan));
    var bad = [];
    /* (standing on the roof, and over it on anything there: bPlot's ground is the floor under its feet) */
    for (x = s.x0 - 10; x <= s.x1; x++) for (var fy = s.R0 - 16; fy <= s.R0 - 11; fy++) if (w.bPlot(g, x, fy)) bad.push(x + "," + fy);
    check(!bad.length, "a house planned on the foundry's roof, at " + bad.slice(0, 6).join(" "));
  });
  /* a whole village about a foundry on flat ground, and a rocket wanting its bell: what the soak measures, each seed */
  function fSoak(seed, start, n) {
    var w = sim.load(seed), g = w.g, M = w.MAT, x, y, i;
    w.sandClear(g);
    for (x = 0; x < g.gw; x++) for (y = 150; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, y < 158 ? M.SAND : M.STONE);
    g.arriveT = 1e9; g.helloT = 0; g.ideaT = 1e9; g.wAny = true; g.know = { foundry: "TEST", moonrocket: "TEST", concrete: "TEST" };
    g.peasants.forEach(function (q, k) {
      q.x = start + k * 3; q.y = 149; q.task = null; q.idle = 0; q.hunger = 0; q.bored = 0; q.life = 1e9;
      q.iron = 12; q.coal = 100; q.plate = 0; q.bell = 0; q.boards = 20; q.stone = 10; q.glass = 1; q.gold = 0; q.firebrick = 10;
    });
    var p = g.peasants[0], gy = [];
    for (i = 0; i < w.H_FW; i++) gy.push(150);
    var ff = w.hFoundryFit(g, 150, gy, 150, 150), f = sim.build(w, w.hFoundryAt(g, p, 150, ff.R0, ff.plan));
    var ry = []; for (i = 0; i < w.H_RW; i++) ry.push(150);
    var rf = w.hRocketFit(g, 230, ry, 150, 150), r = w.hRocketAt(g, p, 230, rf.R0, w.wGild(g, rf.plan));
    r.stock = { mortar: 30 };
    var burnt = 0, roof = 0, side = 0, at = "", age = {}, held = {};
    for (i = 0; i < n; i++) {
      g.peasants.forEach(function (q) {
        q.hunger = 0; if (q.fire) burnt++;
        if (!q.dead && f.phase >= 1 && !(q.task && q.task.kind === "found") && q.x >= f.x0 - 1 && q.x < f.x1 + 2 && q.y <= f.R0 - 10 && q.y >= f.R0 - 30) roof++;
      });
      sim.step(w, 1);
      /* (the air where a body would stand beside it, rows 141 to 149, out to eight columns: air that has been air a while,
         and held that warm 20 ticks. not a cell just left by something warm going (a chopped stalk, a grain of ash): its
         heat is in the air for a tick or two, foundry or none) */
      for (x = f.x0 - 8; x <= f.x1 + 8; x++) if (x < f.x0 || x > f.x1) for (y = 141; y < 150; y++) {
        var j = y * g.gw + x, H = held[j] || (held[j] = []);
        age[j] = w.AIRY[g.m[j]] ? (age[j] || 0) + 1 : 0;
        H.push(g.T[j]); if (H.length > 20) H.shift();
        var mn = H.length < 20 ? 0 : Math.min.apply(null, H);
        if (age[j] >= 30 && mn > side) { side = mn; at = x + "," + y + " at " + g.tick; }
      }
    }
    return { f: f, g: g, burnt: burnt, roof: roof, side: side, at: at };
  }
  test("foundry: a whole village about it, ten seeds, 8000 ticks: nobody burnt, every one casts, and the air beside it at head height under 150", function () {
    /* (pi's cases among them: seed 2, a passer-by fallen into a plate pour; seed 11, a hot-air pulse before the first; seeds
       1 and 4, the hot side's ground; seed 6, a vine up the jacket and across the roof, alight from the chimney's mouth) */
    var roofs = [];
    [[1, 182.5], [2, 182.5], [3, 182.5], [7, 182.5], [11, 175.5], [4, 182.5], [5, 182.5], [6, 175.5], [8, 182.5], [9, 182.5]].forEach(function (c) {
      var r = fSoak(c[0], c[1], 8000), seed = c[0];
      check(r.f.casts >= 1 && !r.burnt && !r.g.causes.fire && !r.g.causes.lava && !r.g.causes.heat, "seed " + seed + ": casts " + (r.f.casts || 0) + ", burning " + r.burnt + " ticks, " + JSON.stringify(r.g.causes));
      check(r.side < 150, "seed " + seed + ": the air at head height beside the foundry reached " + Math.round(r.side) + " (" + r.at + ")");
      roofs.push(seed + ":" + r.roof);
    });
    console.log("      (anybody but the founder on its roof, ticks through a cast, by seed: " + roofs.join(" ") + ")");
  });
  test("foundry: nothing grows on a warm roof or up against its faces: a vine there withers to ash, at the warmth it was", function () {
    var F = fflat(1), w = F.w, g = F.g, M = F.M, p = F.p, s, i, x, y;
    p.x = 190.5; s = fFoundry(F);
    var cells = [[s.x0 + 2, s.R0 - 12], [s.x1 - 1, s.R0 - 13], [s.x1 + 1, s.R0 - 3], [s.x0 - 1, s.R0 - 6]];
    cells.forEach(function (c) { var j = c[1] * g.gw + c[0]; w.sandSet(g, j, M.PLANT); g.T[j] = 60; w.heatAccept(g, j); });
    s.phase = 1;
    for (i = 0; i < 40; i++) { p.hunger = 0; sim.step(w, 1); }
    var left = cells.filter(function (c) { var v = g.m[c[1] * g.gw + c[0]]; return v === M.PLANT || v === M.FLOWER || v === M.SEED; });
    check(!left.length, "still growing on the warm foundry: " + JSON.stringify(left));
    var hot = 0; for (x = s.x0 - 2; x <= s.x1 + 2; x++) for (y = s.R0 - 18; y < s.R0; y++) if (g.m[y * g.gw + x] === M.ASH) hot = Math.max(hot, g.T[y * g.gw + x]);
    check(hot < 120, "a leaf at 60 withered into ash at " + Math.round(hot));
    /* (and cold, it is let grow) */
    var F2 = fflat(1), w2 = F2.w, g2 = F2.g; F2.p.x = 190.5; var s2 = fFoundry(F2), j2 = (s2.R0 - 12) * g2.gw + s2.x0 + 2;
    w2.sandSet(g2, j2, F2.M.PLANT);
    for (i = 0; i < 40; i++) { F2.p.hunger = 0; F2.p.iron = 0; sim.step(w2, 1); }
    check(s2.phase === 0 && g2.m[j2] === F2.M.PLANT, "a plant on a cold idle foundry's roof withered (phase " + s2.phase + ")");
  });
  test("foundry: somebody on its roof when it is to be charged: sent off first, their job kept for after; it charges once the roof is clear, or after 1500 ticks anyway", function () {
    var F = fflat(1), w = F.w, g = F.g, p = F.p, s, i;
    p.x = 190.5; s = fFoundry(F);
    var q = JSON.parse(JSON.stringify(p)); q.id = 999; q.name = "Roofer"; g.peasants.push(q);
    q.x = s.x1 - 3.5; q.y = s.R0 - 12; q.task = { kind: "explore", t: 0, x: 40 }; q.dir = 1;
    p.iron = 12; s.casts = 0;
    check(w.hFoundryWant(g, s), "(the test wants a cast wanted)");
    w.hFoundryStep(g, s);
    check(s.phase === 0 && /roof/.test(s.note || ""), "charged with somebody on the roof: phase " + s.phase + " (" + s.note + ")");
    check(q.task && q.task.kind === "wcool" && q.task.roof && q.task.was && q.task.was.kind === "explore", "the one on the roof was not sent off it, their job kept: " + JSON.stringify(q.task).slice(0, 120));
    var off = -1, charged = -1, job = q.task.was, back = false;
    for (i = 0; i < 1500 && !(charged >= 0 && back); i++) {
      p.hunger = 0; q.hunger = 0; sim.step(w, 1);
      if (off < 0 && !(Math.floor(q.x) >= s.x0 - 1 && Math.floor(q.x) <= s.x1 + 1 && q.y <= s.R0 - 10)) off = i;
      if (charged < 0 && s.phase >= 1) charged = i;
      if (q.task === job) back = true;
    }
    check(off >= 0 && off < 200, "off the roof after " + off + " ticks");
    check(charged >= off, "charged at " + charged + ", before the roof was clear (" + off + ")");
    check(back, "their job was not taken up again: " + JSON.stringify(q.task).slice(0, 120));
    /* (somebody who will not come down: charged after 1500 ticks anyway) */
    var F2 = fflat(2), w2 = F2.w, g2 = F2.g, p2 = F2.p; p2.x = 190.5; var s2 = fFoundry(F2);
    var r = JSON.parse(JSON.stringify(p2)); r.id = 998; g2.peasants.push(r);
    p2.iron = 12; s2.casts = 0;
    for (i = 0; i < 1700 && s2.phase === 0; i++) { r.x = s2.x0 + 3.5; r.y = s2.R0 - 12; r.task = null; r.state = "walk"; p2.hunger = 0; r.hunger = 0; sim.step(w2, 1); }
    check(s2.phase >= 1 && i >= 1400, "kept on the roof, and charged at " + i + " (phase " + s2.phase + ")");
  });
  test("foundry: nobody jumps, leaps or hooks up onto a warm roof, from a heap beside it or a wall; cold, they may", function () {
    var F = fflat(1), w = F.w, g = F.g, M = F.M, p = F.p, s, x, y;
    p.x = 190.5; s = fFoundry(F);
    /* (a heap of sand against the hot side, six under the roof's top: a jump up onto it) */
    for (x = s.x1 + 1; x <= s.x1 + 4; x++) for (y = s.R0 - 6; y < 150; y++) w.sandPlace(g, y * g.gw + x, M.STONE);
    p.x = s.x1 + 2.5; p.y = s.R0 - 7; p.dir = -1; p.state = "walk"; p.task = null; p.jumping = false; p.rope = null;
    var fx = Math.floor(p.x), fy = Math.floor(p.y);
    check(w.pTryJump(g, p, fx, fy), "(the test wants a jump up onto the cold roof)");
    p.jumping = false; p.vy = 0; p.y = s.R0 - 7;
    s.phase = 1;
    check(!w.pTryJump(g, p, fx, fy), "jumped up onto the warm roof");
    /* (and the bare face, from the ground: the rope) */
    s.phase = 0; p.x = s.x1 + 1.5; p.y = 149; p.dir = -1;
    for (x = s.x1 + 1; x <= s.x1 + 4; x++) for (y = s.R0 - 6; y < 150; y++) { w.sandSet(g, y * g.gw + x, M.EMPTY); w.heatSync(g, y * g.gw + x); }
    fx = Math.floor(p.x); fy = Math.floor(p.y);
    var cold = w.pTryClimb(g, p, fx, fy); p.rope = null;
    s.phase = 1;
    check(!w.pTryClimb(g, p, fx, fy), "hooked up onto the warm roof" + (cold ? "" : " (cold, it was not hooked either)"));
  });
  test("foundry: stepping back from heat beside it, high up, is never back onto its roof", function () {
    var F = fflat(1), w = F.w, g = F.g, M = F.M, p = F.p, s, x, y;
    p.x = 190.5; s = fFoundry(F);
    /* (a ledge as high as the roof, east of it, and heat further east: the cooler way would be west, over the roof) */
    for (x = s.x1 + 3; x <= s.x1 + 20; x++) for (y = s.R0 - 10; y < 150; y++) w.sandPlace(g, y * g.gw + x, M.STONE);
    for (x = s.x1 + 6; x <= s.x1 + 12; x++) for (y = s.R0 - 19; y <= s.R0 - 11; y++) { var j = y * g.gw + x; g.T[j] = 400; }
    s.phase = 1;
    p.x = s.x1 + 4.5; p.y = s.R0 - 11; p.task = null;
    var k = { kind: "wcool", t: 0 };
    w.wStepBack(g, p, k);
    check(!(k.backX >= s.x0 - 1 && k.backX <= s.x1 + 1), "stepped back onto the roof, to " + k.backX + " (the roof is " + s.x0 + " to " + s.x1 + ")");
  });
  test("foundry: nobody, at work or not, walks onto a fresh casting: a whole village about a foundry casting a bell and plates", function () {
    [1, 7].forEach(function (seed) {
      var w = sim.load(seed), g = w.g, M = w.MAT, x, y, i;
      w.sandClear(g);
      for (x = 0; x < g.gw; x++) for (y = 150; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, y < 158 ? M.SAND : M.STONE);
      g.arriveT = 1e9; g.helloT = 0; g.ideaT = 1e9; g.wAny = true; g.know = { foundry: "TEST", moonrocket: "TEST", concrete: "TEST" };
      g.peasants.forEach(function (q, k) {
        q.x = 172.5 + k; q.y = 149; q.task = null; q.idle = 0; q.hunger = 0; q.bored = 0; q.life = 1e9;
        q.iron = 12; q.coal = 100; q.plate = 0; q.bell = 0; q.boards = 20; q.stone = 10; q.glass = 1; q.gold = 0; q.firebrick = 10;
      });
      var p = g.peasants[0], gy = [];
      for (i = 0; i < w.H_FW; i++) gy.push(150);
      var ff = w.hFoundryFit(g, 150, gy, 150, 150), f = sim.build(w, w.hFoundryAt(g, p, 150, ff.R0, ff.plan));
      var ry = []; for (i = 0; i < w.H_RW; i++) ry.push(150);
      var rf = w.hRocketFit(g, 220, ry, 150, 150), r = w.hRocketAt(g, p, 220, rf.R0, w.wGild(g, rf.plan));
      r.stock = { mortar: 30 };
      var burnt = 0;
      for (i = 0; i < 8000; i++) { g.peasants.forEach(function (q) { q.hunger = 0; if (q.fire) burnt++; }); sim.step(w, 1); }
      check(f.casts >= 2 && !burnt && !g.causes.fire && !g.causes.lava, "seed " + seed + ": casts " + f.casts + ", burning " + burnt + " ticks, " + JSON.stringify(g.causes));
    });
  });
  test("foundry, lighthouse: nobody at work at them dies of the heat, in long ordinary use: a bell and plates cast, the lamp kept lit", function () {
    /* (the foundry: a bell wanted, iron enough for it and more, a founder at the bellows, 12000 ticks) */
    var F = fflat(1), w = F.w, g = F.g, p = F.p, s = fFoundry(F), i;
    fRocketWantingBell(F); p.iron = 6;
    for (i = 0; i < 12000 && !p.dead; i++) { p.hunger = 0; sim.step(w, 1); }
    check(!p.dead && !g.causes.fire && !g.causes.lava, "the founder died at the foundry: " + JSON.stringify(g.causes) + ", casts " + s.casts);
    check(s.casts >= 1, "(the test wants something cast: " + s.casts + ")");
    /* (the lighthouse: lit, and kept lit, for 8000 ticks, from a well's tank) */
    var L = lighthouse(true), w2 = L.w, g2 = L.g;
    L.s.fuel = 0;
    var filled = 0, f0 = 0;
    for (i = 0; i < 8000; i++) {
      g2.peasants.forEach(function (q) { q.hunger = 0; });
      /* (a barrel in somebody's hands whenever the lamp is low and nobody has one: the keeper takes it up) */
      if (L.s.fuel < w2.H_LOW && !g2.peasants.some(function (q) { return !q.dead && q.barrel; })) { var kq = g2.peasants.filter(function (q) { return !q.dead; })[0]; if (kq) kq.barrel = 1; }
      if (L.s.fuel > f0) filled++; f0 = L.s.fuel;
      sim.step(w2, 1);
    }
    check(filled >= 1, "(the test wants the lamp filled)");
    check(!g2.causes.fire && !g2.causes.lava, "a keeper died at the lighthouse: " + JSON.stringify(g2.causes) + ", fuel " + L.s.fuel);
  });
  test("foundry: iron counted in whole cells: a bar and a half and half a bar make a bell, and ten fifths of a bar are two bars", function () {
    var F = fflat(6), w = F.w, g = F.g, p = F.p, i;
    var q = sim.load(6).g.peasants[1];   /* (a second villager, from another copy of the valley) */
    q.x = 172.5; q.y = 149; q.task = null; q.idle = 0; q.hunger = 0; q.bored = 0; q.born = 0; q.coal = 50;
    var s = fFoundry(F);
    fRocketWantingBell(F);
    p.iron = 1.5; q.iron = 0.5; g.peasants.push(q);
    for (i = 0; i < 18000 && !s.bells; i++) { p.hunger = q.hunger = 0; sim.step(w, 1); }
    check(s.bells === 1, "a bar and a half and half a bar made no bell: casts " + s.casts + ", iron " + p.iron + " and " + q.iron);
    /* (ten cells of cold iron in the plate mould, taken out as scrap: two bars, not 1.9999999999999998, and it casts) */
    var F2 = fflat(6), w2 = F2.w, g2 = F2.g, p2 = F2.p, s2 = fFoundry(F2);
    fRocketWantingBell(F2);
    w2.hMould(g2, s2, "plate").forEach(function (j) { w2.sandPlace(g2, j, F2.M.METAL); });
    w2.hFoundryStep(g2, s2);
    check(p2.iron === 2, "ten fifths of a bar came to " + p2.iron);
    w2.hFoundryStep(g2, s2);
    check(s2.phase === 1, "two bars' scrap, and no bell begun: phase " + s2.phase + " (" + s2.note + ")");
  });
  test("foundry: iron counted in tenths of a bar, pooled: after tools wear and girders are paid for, a bar and a half and half a bar are a bell's worth", function () {
    var F = fflat(6), w = F.w, g = F.g, p = F.p, M = F.M, i;
    var q = sim.load(6).g.peasants[1];
    q.x = 172.5; q.y = 149; q.task = null; q.idle = 0; q.hunger = 0; q.bored = 0; q.born = 0; q.iron = 0; q.coal = 50;
    g.peasants.push(q);
    var s = fFoundry(F); fRocketWantingBell(F);
    /* (two bars: worn tools give half a bar back each, a cell salvaged, six girders paid for, master's way, in floats) */
    p.iron = 2;
    [p, q].forEach(function (a) { a.wear = w.eval("M_WEAR") - 1; a.tools = 1; w.mWear(g, a); });
    w.sandPlace(g, 140 * g.gw + 200, M.METAL); w.lTake(g, q, 200, 140, false);   /* (in the open air, clear of the foundry) */
    for (i = 0; i < 5; i++) w.bPay(g, p, { stock: {} }, w.bE(g, 200, 140 + i, M.GIRDER, 0));
    w.bPay(g, q, { stock: {} }, w.bE(g, 200, 145, M.GIRDER, 0));
    check(p.iron !== 1.5 && Math.abs(p.iron - 1.5) < 1e-6, "(the test wants master's float arithmetic: " + p.iron + ")");
    check(w.wCellsSure(g, "iron") === 10, "a bar and a half and half a bar counted as " + w.wCellsSure(g, "iron") + " cells");
    for (i = 0; i < 2000 && s.phase < 2; i++) { p.hunger = q.hunger = 0; sim.step(w, 1); }
    check(s.phase >= 2, "a bell's worth, and no charge: phase " + s.phase);
    /* (and exactly: 1.5 and 0.5 are ten cells, not eleven) */
    var F2 = fflat(6), g2 = F2.g, q2 = sim.load(6).g.peasants[1];
    F2.p.iron = 1.5; q2.iron = 0.5; q2.dead = 0; g2.peasants.push(q2);
    check(F2.w.wCellsSure(g2, "iron") === 10, "1.5 and 0.5 bars counted as " + F2.w.wCellsSure(g2, "iron") + " cells");
  });
  test("foundry: INERT in a mould stays exactly where it was put: never lifted out, swept or cast over", function () {
    var F = foundry("plate"), w = F.w, g = F.g, s = F.s, M = w.MAT;
    w.wDef({ id: "bellwant3" });
    var x = s.x1 + 20, G = w.mGround(g, x), e = w.bE(g, x, G - 1, M.METAL, 0); e.res = "bell"; e.cost = 1;
    w.bNew(g, "bellwant3", F.p, [e], [x, G - 1, x, G - 1], { wonder: true });
    s.phase = 0; s.mould = "";
    var bell = w.hMould(g, s, "bell"), j = bell[0];
    w.sandPlace(g, j, M.INERT);
    for (var k = 0; k < 400; k++) { w.hFoundryStep(g, s); sim.step(w, 1); }
    check(g.m[j] === M.INERT, "the INERT in the mould was moved: " + w.MAT_NAME[g.m[j]]);
  });
  test("foundry: what is lifted out of one mould is never put down in the other", function () {
    var F = foundry("plate"), w = F.w, g = F.g, s = F.s, M = w.MAT;
    var bell = w.hMould(g, s, "bell"), plate = w.hMould(g, s, "plate");
    bell.forEach(function (j) { w.sandPlace(g, j, M.ICE); g.T[j] = -5; w.heatAccept(g, j); });
    w.hMouldSweep(g, s, "bell");
    check(!plate.some(function (j) { return g.m[j] === M.ICE; }), "ice from the bell's mould was put down in the plates' mould");
  });
  test("foundry: a charge of two bars, tapped, sets in the plate mould and is prised out as plates; the iron is all there, none of it outside, and the ash is raked out", function () {
    var F = foundry("plate"), w = F.w, g = F.g, s = F.s, M = w.MAT, k, iron0 = ironOf(F), fb = fireb(F), first = 0, set = 0;
    var mould = w.hMould(g, s, "plate");
    for (k = 0; k < 12000 && !(s.phase === 0 && k > 10); k++) {
      sim.step(w, 1);
      var lq = mould.filter(function (j) { return g.m[j] === M.LAVA; }).length;
      if (!first && lq) first = g.tick;
      if (first && !set && !lq && s.phase >= 4) set = g.tick;
      if (SHOTS && s.phase === 3 && g.tick - s.pourT === 40) shot(w, "foundry-pour", s, 8);
      if (s.phase === 4 && !F.checked) {
        /* (set, and before it is prised out: nothing of it outside the mould and the chamber) */
        F.checked = true;
        var out = 0;
        for (var y = s.y0 - 4; y <= s.y1 + 4; y++) for (var x = s.x0 - 4; x <= s.x1 + 4; x++) {
          var j = y * g.gw + x, c = g.m[j];
          if ((c === M.METAL || c === M.LAVA) && mould.indexOf(j) < 0 && s.cells.indexOf(j) < 0) out++;
        }
        check(out === 0, out + " cells of iron outside the mould");
      }
    }
    check(s.casts === 2 && s.phase === 0, "the pour was not finished: phase " + s.phase);
    check(F.p.plate >= 8, "only " + F.p.plate + " plates came out of a two-bar charge");
    check(Math.abs(ironOf(F) - iron0) < 0.01, "the iron was " + iron0.toFixed(2) + " bars, and is " + ironOf(F).toFixed(2));
    check((F.p.ash || 0) > 0 && g.found.ash > 0, "no ash was raked out");
    check(fireb(F) === fb, "the firebrick melted");
    console.log("      (" + F.p.plate + " plates; tapped " + (s.pourT - s.meltT) + " ticks after it was charged; " + (s.coals || 0) + " coals fed in after the charge's own; liquid in the mould " + (set - first) + " ticks)");
  });
  test("foundry: a charge tapped into the bell mould sets as an engine bell, cast whole, and the cell to spare is a plate", function () {
    var F = foundry("bell"), w = F.w, g = F.g, s = F.s, M = w.MAT, k, iron0 = ironOf(F);
    /* (something that wants a bell: a great work with one in it) */
    if (!w.wOf("bellstand")) w.wDef({ id: "bellstand" });
    var plan = [];
    for (k = 0; k < 9; k++) { var e = w.bE(g, 40 + (k % 3), 100 + ((k / 3) | 0), M.METAL, 1); e.res = "bell"; e.cost = 1 / 9; plan.push(e); }
    w.bNew(g, "bellstand", null, plan, [40, 100, 42, 102], { wonder: true });
    check(w.hFoundryWant(g, s) === "an engine bell", "(the test wants a bell wanted: " + w.hFoundryWant(g, s) + ")");
    for (k = 0; k < 12000 && !(s.phase === 0 && k > 10); k++) sim.step(w, 1);
    check(F.p.bell === 1, "no engine bell came out (" + F.p.bell + " bells, " + F.p.plate + " plates)");
    check(F.p.plate >= 0 && Math.abs(ironOf(F) - iron0) < 0.01, "the iron was " + iron0.toFixed(2) + " bars, and is " + ironOf(F).toFixed(2));
  });

  /* ---------------------------------------------------------------- the moon rocket */
  /* the rocket on level ground at column 150 of seed 1, its plan as hRocketFit makes it; built, if build */
  function rocket(build) {
    var w = sim.load(1), g = w.g, G = 150, k;
    flat(w, 110, 230, G);
    know(g, ["farm", "dig", "bucket", "mine", "masonry", "smelt", "forge", "concrete", "moonrocket"]);
    var gy = []; for (k = 0; k < w.H_RW; k++) gy.push(G);
    var r = w.hRocketFit(g, 150, gy, G, G);
    check(!!r, "(the test wants the rocket to fit on level ground)");
    var s = w.hRocketAt(g, g.peasants[0], 150, r.R0, r.plan);
    settle(g);
    g.peasants.forEach(function (q) { q.x = 172 + (q.id % 9) + 0.5; q.y = G - 1; });
    if (build) { sim.build(w, s); s.done = false; w.bFinish(g, s, g.peasants[0]); }
    return { w: w, g: g, s: s, G: G };
  }
  function heatAround(R) {
    var g = R.g, q = 0;
    for (var y = 0; y < g.gh; y++) for (var x = R.s.x0 - 30; x <= R.s.x1 + 30; x++) q += R.w.heatQ(g, y * g.gw + x);
    return q;
  }
  test("moon rocket: the moon looked at, the foundry, concrete, rocket-pack flights and barrels make it thinkable; it wants clear sky to the top of the world", function () {
    var w = sim.load(1), g = w.g, I = w.wIdea("moonrocket");
    know(g, ["concrete"]);
    g.moonLooks = 12; g.wDone = { foundry: 1 }; g.packFlights = 2; g.barrels = 30;
    check(!I.ready(g), "thought of with only two flights on a rocket pack");
    w.hFlew(g, g.peasants[1]);
    check(I.ready(g), "not thinkable with everything it wants");
    var R = rocket(false), s = R.s;
    var kinds = {};
    s.plan.forEach(function (e) { var key = e.res || e.v; kinds[key] = (kinds[key] || 0) + 1; });
    check(kinds[R.w.MAT.METAL] >= 45 && kinds.bell === 9 && kinds[R.w.MAT.GIRDER] >= 35 && kinds[R.w.MAT.CONCRETE] >= 12 && kinds[R.w.MAT.FIREBRICK] >= 6, "the plan: " + JSON.stringify(kinds));
    /* (a roof over it: nowhere for a rocket) */
    var gy = []; for (var k = 0; k < w.H_RW; k++) gy.push(R.G);
    R.w.sandPlace(R.g, 30 * R.g.gw + 157, R.w.MAT.STONE);
    check(!R.w.hRocketFit(R.g, 150, gy, R.G, R.G), "planned under a stone");
  });
  test("moon rocket: built by a crew of two out of plates, an engine bell, girders and concrete", function () {
    var R = rocket(false), w = R.w, g = R.g, s = R.s;
    g.peasants.forEach(function (q) { q.plate = 30; q.bell = 1; q.iron = 5; q.boards = 20; q.stone = 10; q.glass = 1; q.gold = 1; q.firebrick = 10; q.x = s.x0 - 4 + (q.id % 3) + 0.5; });
    s.stock = { mortar: 30 };
    w.bJoin(g, g.peasants[0], s); w.bJoin(g, g.peasants[1], s);
    for (var k = 0; k < 20000 && !s.done; k++) sim.step(w, 1);
    check(s.done, "the rocket was not built in 20000 ticks (" + Math.round(w.bShare(g, s) * 100) + "% up): " + s.note);
    shot(w, "rocket", s, 10);
  });
  test("moon rocket: a fetch for its last barrel timed out with the barrel in hand: it is still taken to the rocket", function () {
    var R = rocket(true), w = R.w, g = R.g, s = R.s, k;
    s.oil = 11; s.noOil = g.tick + 1e9;
    var q = g.peasants[0];
    g.peasants.forEach(function (o) { if (o !== q) o.dead = 1; });
    q.barrel = 1; q.task = null; q.hunger = 0;
    for (k = 0; k < 8000 && s.oil < 12; k++) sim.step(w, 1);
    check(s.oil === 12 && !q.barrel, "the barrel in hand never went into the rocket: " + s.oil + " barrels, barrel " + q.barrel);
  });
  test("moon rocket: moon rock with no gantry and no statue to set it out by is set out on open ground, and with none, kept", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x, y, k;
    flat(w, 110, 230, G);
    know(g, ["moonrocket"]);   /* (it went up, and was pulled down after) */
    var q = g.peasants[0];
    g.peasants.forEach(function (o) { if (o !== q) o.dead = 1; });
    function rock() { var n = 0; for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.MOONROCK) n++; return n; }
    /* (shut in a stone box first: nowhere to set it out) */
    for (x = 160; x <= 172; x++) for (y = G - 14; y < G; y++) if (x < 163 || x > 169 || y < G - 11) w.sandPlace(g, y * g.gw + x, M.STONE);
    q.x = 166.5; q.y = G - 1; q.moonrock = 2; q.task = null; q.hunger = 0; q.fromSpace = 0;
    for (k = 0; k < 400; k++) sim.step(w, 1);
    check(q.moonrock === 2 && rock() === 0, "moon rock thrown away with nowhere to set it out: " + q.moonrock + " carried, " + rock() + " out");
    for (x = 160; x <= 172; x++) for (y = G - 14; y < G; y++) w.sandPlace(g, y * g.gw + x, M.EMPTY);   /* (let out) */
    for (k = 0; k < 6000 && q.moonrock > 0; k++) sim.step(w, 1);
    check(!q.moonrock && rock() === 2, "the moon rock was not set out on open ground: " + q.moonrock + " carried, " + rock() + " out");
  });
  test("moon rocket: at 11 of 12 barrels, two fetching: it takes one, and the other barrel goes back, none lost", function () {
    var R = rocket(true), w = R.w, g = R.g, s = R.s, k;
    var wl = well(w, 200, w.mGround(g, 200), 4);
    s.oil = 11;
    var a = g.peasants[0], b = g.peasants[1];
    g.peasants.forEach(function (o) { if (o !== a && o !== b) o.dead = 1; });
    [a, b].forEach(function (o) { o.task = { kind: "fuel", site: s.id, t: 0, act: 0 }; o.hunger = 0; });
    function all() { return (s.oil || 0) + wl.tank + (a.barrel || 0) + (b.barrel || 0) + ((g.salvage && g.salvage.barrel) || 0); }
    var n0 = all();
    var most = 0;
    for (k = 0; k < 6000; k++) {
      sim.step(w, 1); most = Math.max(most, s.oil || 0);
      if (s.oil === 12 && [a, b].every(function (o) { return !o.barrel && !(o.task && o.task.kind === "fuel"); })) break;   /* (before the crew get in) */
    }
    check(most === 12 && s.oil === 12, "the rocket had up to " + most + " barrels in it");
    check(all() === n0, "barrels went from " + n0 + " to " + all());
  });
  test("moon rocket: a bell's ninths kept under a shelf of rock are fetched from footing the village can walk to, and mend it", function () {
    var R = rocket(true), w = R.w, g = R.g, s = R.s, M = w.MAT, x, y, t;
    var q = g.peasants[0], donor = g.peasants[1];
    g.peasants.forEach(function (o) { if (o !== q && o !== donor) o.dead = 1; });
    q.x = 200.5; q.y = 149; q.hunger = 0;
    var cx = Math.round(s.cx);
    for (x = cx - 14; x <= cx + 14; x++) for (y = 33; y <= 39; y++) w.sandPlace(g, y * g.gw + x, M.STONE);   /* (a shelf of rock up over it) */
    var e = s.plan.filter(function (e2) { return e2.res === "bell"; })[0];
    w.heatVanish(g, e.i); s.done = false; s.repair = true;
    donor.bell = 8 / 9; w.pDie(g, donor, "old");
    var at = w.wSalvageSpot(g);
    check(at && at.y > 39, "the salvage is to be fetched from on top of the shelf: " + JSON.stringify(at));
    for (t = 0; t < 8000 && g.m[e.i] !== M.METAL; t++) { q.hunger = 0; sim.step(w, 1); }
    check(g.m[e.i] === M.METAL, "the bell's cell was never mended: " + JSON.stringify(g.salvage));
  });
  test("moon rocket: a bell's ninths in the pocket of somebody who cannot get there are not counted on: the spare is fetched", function () {
    var R = rocket(true), w = R.w, g = R.g, s = R.s, M = w.MAT, G = R.G, x, y, t;
    var q = g.peasants[0], carrier = g.peasants[1], donor = g.peasants[2];
    g.peasants.forEach(function (o) { if (o !== q && o !== carrier && o !== donor) o.dead = 1; });
    q.x = 200.5; q.y = 149; q.hunger = 0;
    /* (the carrier across a wall of rock from everything) */
    for (x = 212; x < g.gw; x++) for (y = 0; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, y < G ? M.EMPTY : M.STONE);
    for (x = 205; x <= 211; x++) for (y = 65; y < G; y++) w.sandPlace(g, y * g.gw + x, M.STONE);
    carrier.x = 221.5; carrier.y = 149; carrier.bell = 8 / 9; donor.bell = 1 / 9;
    var e = s.plan.filter(function (e2) { return e2.res === "bell"; })[0];
    w.heatVanish(g, e.i); s.done = false; s.repair = true;
    w.pDie(g, donor, "old");
    for (t = 0; t < 8000 && g.m[e.i] !== M.METAL; t++) { carrier.hunger = 0; q.hunger = 0; sim.step(w, 1); }
    check(g.m[e.i] === M.METAL, "the bell's cell was never mended: salvage " + JSON.stringify(g.salvage) + ", carrier " + carrier.bell);
  });
  test("moon rocket: the best pilot cut off across a cliff is let be after a round, and somebody who can get to it goes", function () {
    var R = rocket(true), w = R.w, g = R.g, s = R.s, M = w.MAT, G = R.G, x, y, t;
    s.oil = 12;
    var pilot = g.peasants[0], local = g.peasants[1];
    g.peasants.forEach(function (o) { if (o !== pilot && o !== local) o.dead = 1; });
    ["farm", "dig", "masonry", "smelt", "forge", "glass", "mine", "concrete", "moonrocket"].forEach(function (id) { g.know[id] = pilot.name; });   /* (the thinker, too) */
    for (x = 205; x <= 211; x++) for (y = 65; y < G; y++) w.sandPlace(g, y * g.gw + x, M.STONE);
    for (x = 212; x < g.gw; x++) for (y = 0; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, y < G ? M.EMPTY : M.STONE);
    pilot.x = 226.5; pilot.y = 149; pilot.flights = 1; local.x = 170.5; local.y = 149;
    var picked = 0, was = false;
    for (t = 0; t < 12500 && !s.gone; t++) {
      pilot.hunger = 0; local.hunger = 0; sim.step(w, 1);
      var on = !!(s.crew && s.crew.indexOf(pilot.id) >= 0); if (on && !was) picked++; was = on;
    }
    check(s.gone && local.moon && picked <= 1, "it went: " + !!s.gone + ", the cut-off pilot picked " + picked + " times, the other went " + !!local.moon);
  });
  test("moon rocket: a snapshot from before it went up, restored, has no rocket in the air and no exhaust; and the great works keep nothing of the world outside g", function () {
    var H = require("../harness"), h = H.open({ seed: 1 }), control = H.open({ seed: 1 }), before = h.snapshot();
    h._eval("hLiftOff")(h.g, { id: 999, rx: 130, R0: 50, plan: [], crew: [] });
    h.restore(before);
    h.step(20); control.step(20);
    check(!h.g.rocket && h.hash() === control.hash(), "restored, the rocket is still going up: " + !!h.g.rocket);
    /* (what the great works' files keep at the top level, that changes: none of it the world. W_DEFS is filled as they
       load; H_LBL is scratch for one call; P_OQ is the organ's notes waiting to be heard) */
    var fs = require("fs"), path = require("path"), root = path.join(__dirname, ".."), found = [];
    ["wonders.js", "heavens.js", "monuments.js", "pleasures.js"].forEach(function (f) {
      var re = /^var ([A-Z_0-9]+) = (\[\]|\{\}|null|new )/gm, m, src = fs.readFileSync(path.join(root, f), "utf8");
      while ((m = re.exec(src))) found.push(m[1]);
    });
    check(found.sort().join() === "H_LBL,P_OQ,W_DEFS", "the great works keep this outside g: " + found.join());
  });
  test("moon rocket: gilded, its gold gone, the gilded nose knocked off: mended in stone, not waiting on gold for ever", function () {
    var R = rocket(false), w = R.w, g = R.g, s = R.s, M = w.MAT, t;
    g.peasants.forEach(function (q) { q.gold = 0; });
    var p = g.peasants[0], e = s.plan.filter(function (e2) { return e2.v === M.GOLD; })[0];
    check(!!e, "(the test wants a rocket with gold in its plan)");
    w.wGild(g, s.plan); sim.build(w, s); p.gold = 1;
    w.wRegild(g, s);
    check(e.v === M.GOLD && s.gilding && w.bPay(g, p, s, e), "(the test wants it being gilded)");
    w.sandPlace(g, e.i, M.GOLD); w.bFinish(g, s, p); p.gold = 0;
    w.heatVanish(g, e.i); w.bInspect(g, s, g.sites.indexOf(s));
    for (t = 0; t < 600 && e.v === M.GOLD; t++) sim.step(w, 1);
    check(e.v !== M.GOLD, "the gilded cell, gone, still waits for gold");
    g.peasants.forEach(function (q) { q.stone = (q.stone || 0) + 4; });
    for (t = 0; t < 8000 && !w.bOk(g, e); t++) sim.step(w, 1);
    check(w.bOk(g, e), "the cell was never mended in its stand-in: " + s.note);
  });
  test("moon rocket: back from the moon to a pad at the edge of the world, they come down on it, and the moon rock is never lost", function () {
    var w = sim.load(18), g = w.g, M = w.MAT, x, y, k, i;
    w.sandClear(g);
    for (x = 0; x < g.gw; x++) for (y = 150; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, M.STONE);
    var p = g.peasants[0];
    g.peasants = [p]; g.arriveT = 1e9; g.know = { moonrocket: "TEST" }; g.wAny = true;
    for (x = 6; x < 34; x++) for (y = 150; y < 158; y++) w.sandPlace(g, y * g.gw + x, M.SAND);
    var gy = []; for (i = 0; i < w.H_RW; i++) gy.push(150);
    var fit = w.hRocketFit(g, 8, gy, 150, 150), r = w.hRocketAt(g, p, 8, fit.R0, fit.plan);
    sim.build(w, r);
    g.tick = 1; r.crew = [p.id]; p.state = "space"; p.aboard = r.id; p.dir = -1; p.task = null; p.life = 1e9;
    w.hLiftOff(g, r); p.spaceT = 1;   /* (the last tick of the trip) */
    for (k = 0; k < 700 && !p.dead && !(p.state === "walk" && !p.fromSpace); k++) sim.step(w, 1);
    sim.step(w, 1);
    check(p.x >= 0 && p.x < g.gw, "came down off the edge of the world, at " + p.x.toFixed(1));
    var kept = (p.dead ? 0 : (p.moonrock || 0)) + ((g.salvage && g.salvage.moonrock) || 0);
    for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.MOONROCK) kept++;
    check(kept === 2, "the moon rock: " + kept + " of 2 kept (dead " + !!p.dead + ")");
    /* (and anybody gone out of the list, however they went: what they carried for the great works, in the salvage) */
    var q = { x: 3.5, y: 140, dead: 1, moonrock: 1, firebrick: 2 }; g.peasants.push(q);
    var before = ((g.salvage && g.salvage.moonrock) || 0);
    sim.step(w, 1);
    check(g.peasants.indexOf(q) < 0 && g.salvage && g.salvage.moonrock === before + 1 && g.salvage.firebrick >= 2, "gone from the list, and what they had is not kept: " + JSON.stringify(g.salvage));
  });
  test("moon rocket: fuelled, its crew get in, it counts down, and it goes: out of the grid, heat and all, and a flag on the moon", function () {
    var R = rocket(true), w = R.w, g = R.g, s = R.s, M = w.MAT, k;
    s.oil = 12;
    g.peasants[2].flights = 3; g.peasants[4].flights = 1;
    var q0 = 0, fire = 0, launchedAt = 0;
    for (k = 0; k < 6000 && !s.gone; k++) {
      if (s.count === 1 && g.tick - s.countT === 60 * 10 - 1) q0 = heatAround(R);
      sim.step(w, 1);
    }
    check(s.gone, "it never went (crew " + JSON.stringify(s.crew) + ", count " + s.count + ")");
    var crew = g.peasants.filter(function (q) { return q.moon; });
    check(crew.length >= 2 && crew.every(function (q) { return q.state === "space" && q.spaceX != null; }), crew.length + " went to the moon");
    check(s.plan.every(function (e) { return !e.rk; }) && !s.plan.some(function (e) { return e.v === M.METAL; }), "the rocket's cells are still in the plan");
    var left = 0;
    for (var y = R.G - 30; y <= R.G; y++) for (var x = s.x0 + 4; x <= s.x0 + 10; x++) if (g.m[y * g.gw + x] === M.METAL) left++;
    check(left === 0, left + " cells of the rocket left in the grid");
    if (q0) check(Math.abs(heatAround(R) - q0) <= (g.rocket ? g.rocket.fireQ : 0) + 200, "the heat jumped as it went: " + Math.round(q0) + " -> " + Math.round(heatAround(R)));
    if (SHOTS) { for (k = 0; k < 50; k++) sim.step(w, 1); shot(w, "liftoff", s, 10); }
    var qa = heatAround(R);
    for (k = 0; k < 3000 && g.rocket; k++) { fire = g.rocket.fireQ; sim.step(w, 1); }
    check(!g.rocket, "the rocket never left the top of the world");
    /* (the fire it put out goes on burning a moment, and that is heat too: half as much again, at the most) */
    check(heatAround(R) - qa <= fire * 1.5, "more heat about the pad than the fire it put out: " + Math.round(heatAround(R) - qa) + " against " + Math.round(fire));
    for (k = 0; k < 1000 && !g.moonFlag; k++) sim.step(w, 1);
    check(g.moonFlag && g.got.moon, "no flag on the moon");
  });
  test("moon rocket: the crew come back down over the pad, open their chutes (or not), and set out moon rock", function () {
    var R = rocket(true), w = R.w, g = R.g, s = R.s, M = w.MAT, k;
    s.oil = 12;
    g.peasants[2].flights = 3; g.peasants[4].flights = 2; g.peasants[5].flights = 1;
    for (k = 0; k < 6000 && !s.gone; k++) sim.step(w, 1);
    var crew = g.peasants.filter(function (q) { return q.moon; });
    check(crew.length >= 1, "nobody went");
    var landed = {}, chutes = 0;
    for (k = 0; k < 9000; k++) {
      sim.step(w, 1);
      crew.forEach(function (q) {
        if (q.chute) chutes++;
        if (!landed[q.id] && (q.dead || (q.state === "walk" && !q.chute && q.fromSpace === 0 && q.moonrock !== undefined && q.spaceT <= 0))) landed[q.id] = { x: q.x, dead: q.dead };
      });
      if (crew.every(function (q) { return q.dead || (q.state === "walk" && !(q.moonrock > 0)); })) break;
    }
    check(crew.every(function (q) { return q.state !== "space"; }), "somebody is still on the moon");
    check(crew.every(function (q) { return landed[q.id] && Math.abs(landed[q.id].x - s.rx) < 80; }), "they did not come down by the pad: " + JSON.stringify(landed));
    check(chutes > 0, "nobody opened a parachute");
    var rock = 0;
    for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.MOONROCK) rock++;
    var alive = crew.filter(function (q) { return !q.dead; }).length;
    var carried = crew.filter(function (q) { return !q.dead && q.moonrock > 0; }).length;
    check(alive > 0 && (rock >= 2 || carried > 0), alive + " came back alive, and " + rock + " moon rock was set out, " + carried + " still carrying it: " + crew.map(function (q) { return q.state + " " + q.dead + " rock " + q.moonrock + " " + (q.task && q.task.kind) + " " + q.x.toFixed(0) + "," + q.y.toFixed(0); }).join("; ") + " pad " + s.rx + " out " + g.hRockOut);
  });
  test("moon rocket: pulled down with its crew aboard, they come out; and a save with crew aboard a rocket that is not there lets them out", function () {
    var R = rocket(true), w = R.w, g = R.g, s = R.s, k;
    s.oil = 12;
    g.peasants[2].flights = 3; g.peasants[4].flights = 1;
    for (k = 0; k < 6000 && !s.count; k++) sim.step(w, 1);
    var crew = g.peasants.filter(function (q) { return q.aboard === s.id; });
    check(s.count > 0 && crew.length >= 1, "(the test wants a crew aboard, counting down)");
    w.bRemove(g, g.sites.indexOf(s));   /* (the eraser, say) */
    sim.step(w, 61);
    check(crew.every(function (q) { return !q.aboard && q.state !== "space"; }), "the crew are still aboard a rocket that is gone: " + crew.map(function (q) { return q.state + " " + q.aboard; }).join(", "));
    /* a save from before this: aboard a rocket id that is in no site, with a clock a billion ticks long */
    var q = g.peasants[0];
    q.aboard = 9999; q.state = "space"; q.spaceT = 1e9;
    var doc = JSON.parse(JSON.stringify(w.saveDocument(g, { source: "test" })));
    var w2 = sim.load(1), g2 = w2.g;
    w2.saveLoad(g2, doc);
    var q2 = g2.peasants.filter(function (o) { return o.id === q.id; })[0];
    sim.step(w2, 61);
    check(q2 && !q2.aboard && q2.state !== "space", "the loaded crew are still stranded: " + (q2 && q2.state + " " + q2.aboard));
  });
  test("moon rocket: a plate gone in the countdown calls it off, and the crew get out till it is mended", function () {
    var R = rocket(true), w = R.w, g = R.g, s = R.s, M = w.MAT, k;
    s.oil = 12;
    g.peasants[2].flights = 3; g.peasants[4].flights = 1;
    for (k = 0; k < 6000 && !s.count; k++) sim.step(w, 1);
    var crew = g.peasants.filter(function (q) { return q.aboard === s.id; });
    check(s.count > 0 && crew.length >= 1, "(the test wants a crew aboard, counting down)");
    var plate = s.plan.filter(function (e) { return e.rk && g.m[e.i] === M.METAL; })[0];
    w.sandPlace(g, plate.i, M.EMPTY);   /* (the eraser, on one plate) */
    for (k = 0; k < 600 && !(s.repair && crew.every(function (q) { return !q.aboard && q.state !== "space"; })); k++) sim.step(w, 1);
    check(s.repair, "(the test wants it seen to want mending)");
    check(!s.gone && !s.count, "it went (or is still counting down) with a plate gone");
    check(crew.every(function (q) { return !q.aboard && q.state !== "space"; }), "the crew are still aboard a rocket that wants mending: " + crew.map(function (q) { return q.state + " " + q.aboard; }).join(", "));
    check(crew.every(function (q) { return q.x < s.x0 || q.x > s.x1 + 1; }), "the crew came out inside the rocket's pad: " + crew.map(function (q) { return q.x.toFixed(1); }).join(", ") + " (" + s.x0 + "-" + s.x1 + ")");
  });
  test("moon rocket: called off with a puddle where they were to come out, the crew come out dry somewhere else off the pad", function () {
    var R = rocket(true), w = R.w, g = R.g, s = R.s, M = w.MAT, k;
    /* (a little pit two to the left of the pad, with a cell of water in it) */
    var px = s.x0 - 2, j = (R.G) * g.gw + px;
    w.sandPlace(g, j, M.EMPTY); w.sandPlace(g, j + g.gw, M.WATER);
    s.oil = 12;
    g.peasants[2].flights = 3; g.peasants[4].flights = 1;
    for (k = 0; k < 6000 && !s.count; k++) sim.step(w, 1);
    var crew = g.peasants.filter(function (q) { return q.aboard === s.id; });
    check(s.count > 0 && crew.length >= 1, "(the test wants a crew aboard, counting down)");
    var plate = s.plan.filter(function (e) { return e.rk && g.m[e.i] === M.METAL; })[0];
    w.sandPlace(g, plate.i, M.EMPTY);
    for (k = 0; k < 600 && crew.some(function (q) { return q.aboard; }); k++) sim.step(w, 1);
    check(crew.every(function (q) { return !q.aboard && q.state !== "space"; }), "the crew are still aboard");
    check(crew.every(function (q) { return q.x < s.x0 || q.x > s.x1 + 1; }), "the crew came out inside the pad: " + crew.map(function (q) { return q.x.toFixed(1); }).join(", ") + " (" + s.x0 + "-" + s.x1 + ")");
    check(crew.every(function (q) { return !w.WET[w.pCell(g, Math.floor(q.x), Math.floor(q.y))]; }), "the crew came out into water");
  });
  test("moon rocket: held: with nowhere in the valley to let them out, the crew stay in, unhurt, and say so; let out where there is", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x, y;
    var q = g.peasants[0];
    g.peasants.forEach(function (o) { if (o !== q) o.dead = 1; });
    for (x = 0; x < g.gw; x++) for (y = 0; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, M.STONE);   /* (rock, everywhere) */
    q.aboard = 999; q.state = "space"; q.spaceT = 0; q.x = 165.5; q.y = G - 8;
    sim.step(w, 130);
    check(q.aboard && q.state === "space" && !q.dead, "let out with nowhere to be let out to: " + q.state + " at " + q.x.toFixed(1) + "," + q.y.toFixed(1));
    check(/shut in the rocket/.test(w.iMood(g, q)), "the readout does not say they are shut in: " + w.iMood(g, q));
    var mx = Math.round(w.wMiddle(g));
    for (x = mx - 2; x <= mx + 2; x++) for (y = 0; y < G; y++) w.sandPlace(g, y * g.gw + x, M.EMPTY);   /* (a shaft down into the rock where the village lives, with a floor) */
    sim.step(w, 61);
    check(!q.aboard && q.state === "walk" && Math.abs(q.x - mx - 0.5) <= 3 && !q.dead, "not let out in the hole: " + q.state + " at " + q.x.toFixed(1));
  });
  test("moon rocket: the world cleared under a crew aboard, saved and loaded: let out onto the floor of the world, never dropped", function () {
    var w = sim.load(1), g = w.g, G = 150;
    var q = g.peasants[0], q2 = g.peasants[1];
    g.peasants.forEach(function (o) { if (o !== q && o !== q2) o.dead = 1; });
    [q, q2].forEach(function (o) { o.aboard = 999; o.state = "space"; o.spaceT = 0; o.x = 165.5; o.y = G - 30; });
    w.sandClear(g);
    var doc = JSON.parse(JSON.stringify(w.saveDocument(g, { source: "test" }))), w2 = sim.load(1), g2 = w2.g;
    w2.saveLoad(g2, doc);
    var C = g2.peasants.filter(function (o) { return o.id === q.id || o.id === q2.id; });
    sim.step(w2, 130);
    check(C.every(function (o) { return !o.aboard && o.state === "walk" && o.y >= g2.gh - 1.5; }), "not let out onto the floor: " + C.map(function (o) { return o.state + " " + o.y.toFixed(1); }).join(", "));
    sim.step(w2, 300);
    check(C.every(function (o) { return !o.dead; }), "let out, and died");
  });
  test("moon rocket: let out clear of a drain beside the nearest footing, and alive after", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x;
    var q = g.peasants[0];
    g.peasants.forEach(function (o) { if (o !== q) o.dead = 1; });
    w.sandClear(g);
    for (x = 166; x <= 174; x++) w.sandPlace(g, G * g.gw + x, M.STONE);   /* (a shelf, with a drain at the end of it) */
    w.sandPlace(g, G * g.gw + 175, M.DRAIN);
    q.aboard = 999; q.state = "space"; q.spaceT = 0; q.x = 174.5; q.y = G - 2;
    sim.step(w, 61); sim.step(w, 200);
    check(!q.aboard && !q.dead, "dead, or never let out: " + q.state + (q.dead ? " (" + q.dead + ")" : ""));
    check(Math.abs(q.x - 175.5) > 3 || q.y > G + 5, "let out right by the drain, at " + q.x.toFixed(1));
  });
  test("moon rocket: let out where they can walk home from: not into a sealed chamber, nor down a deep shaft, nearer", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 100, x, y, k;
    var q = g.peasants[0];
    g.peasants.forEach(function (o) { if (o !== q) o.dead = 1; });
    var mx = Math.round(w.wMiddle(g));
    /* (the village's floor: flat, from the middle out to x 250; under it, solid stone) */
    for (x = Math.min(mx, 140) - 10; x <= 250; x++) for (y = 9; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, y < G ? M.EMPTY : M.STONE);
    /* (a sealed chamber in the rock under where they are, and a shaft sixty deep beside it, too deep for a rope, open to the sky) */
    for (x = 200; x <= 210; x++) for (y = G + 4; y < G + 16; y++) w.sandPlace(g, y * g.gw + x, M.EMPTY);
    for (x = 214; x <= 217; x++) for (y = G; y < G + 60; y++) w.sandPlace(g, y * g.gw + x, M.EMPTY);
    q.aboard = 999; q.state = "space"; q.spaceT = 0; q.x = 215.5; q.y = G + 55;   /* (nearest the foot of the shaft) */
    for (k = 0; k < 130 && q.aboard; k++) sim.step(w, 1);
    check(!q.aboard && q.y <= G && !(q.x >= 214 && q.x <= 218 && q.y > G), "let out at " + q.x.toFixed(1) + "," + q.y.toFixed(1) + " (" + q.state + "), not on the floor they can walk home on");
  });
  test("moon rocket: a shaft sixty deep midway between two houses is not home: let out on the floor the houses are on", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 100, x, y, k;
    w.sandClear(g);
    for (x = 0; x < g.gw; x++) for (y = G; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, M.STONE);
    var q = g.peasants[0], a = g.peasants[1], b = g.peasants[2];
    g.peasants.forEach(function (o) { if (o !== q && o !== a && o !== b) o.dead = 1; });
    [[a, 90], [b, 240]].forEach(function (v) { var h = w.bNew(g, "house", v[0], [w.bE(g, v[1] - 4, G, M.STONE, 0)], [v[1] - 4, G - 14, v[1] + 4, G - 1], { F: G - 1, door: v[1] }); h.done = true; v[0].home = h.id; v[0].x = v[1] + 0.5; v[0].y = G - 1; });
    var mid = Math.round(w.wMiddle(g));
    for (x = mid - 2; x <= mid + 2; x++) for (y = G; y < G + 60; y++) w.sandPlace(g, y * g.gw + x, M.EMPTY);
    q.aboard = 999; q.state = "space"; q.spaceT = 0; q.x = mid + 0.5; q.y = G + 57;
    for (k = 0; k < 130 && q.aboard; k++) sim.step(w, 1);
    check(!q.aboard && q.y <= G, "let out at " + q.x.toFixed(1) + "," + q.y.toFixed(1) + ", down the shaft");
  });
  test("moon rocket: footing under a roof they can walk home from is found past any number nearer that they cannot", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x, y, k, n;
    var q = g.peasants[0];
    g.peasants.forEach(function (o) { if (o !== q) o.dead = 1; });
    var mx = Math.round(w.wMiddle(g));
    for (x = Math.min(mx, 140) - 10; x <= 266; x++) for (y = 9; y < g.gh; y++) w.sandPlace(g, y * g.gw + x, y < G ? M.EMPTY : M.STONE);
    for (x = 0; x < g.gw; x++) for (y = 0; y <= G - 12; y++) w.sandPlace(g, y * g.gw + x, M.STONE);   /* (rock over the whole floor: no open sky anywhere to put first) */
    /* (forty little sealed cells in the rock, every one nearer them than the floor up top) */
    for (n = 0; n < 40; n++) { var cx = 180 + (n % 20) * 4, cy = G + 12 + ((n / 20) | 0) * 12; for (x = cx; x <= cx + 2; x++) for (y = cy - 10; y < cy; y++) w.sandPlace(g, y * g.gw + x, M.EMPTY); }
    q.aboard = 999; q.state = "space"; q.spaceT = 0; q.x = 210.5; q.y = G + 20;
    for (k = 0; k < 130 && q.aboard; k++) sim.step(w, 1);
    check(!q.aboard && q.y <= G, "not let out on the floor up top: " + q.state + " at " + q.x.toFixed(1) + "," + q.y.toFixed(1));
  });
  test("moon rocket: a plate gone the tick before it goes, between lookings-over, and it does not go", function () {
    var R = rocket(true), w = R.w, g = R.g, s = R.s, M = w.MAT, k;
    s.oil = 12;
    g.peasants[2].flights = 3; g.peasants[4].flights = 1;
    for (k = 0; k < 6000 && !(s.count === 1 && g.tick - s.countT === 60 * 10 - 1); k++) sim.step(w, 1);
    check(s.count === 1, "(the test wants the last second of the countdown)");
    var plate = s.plan.filter(function (e) { return e.rk && g.m[e.i] === M.METAL; })[0];
    w.sandPlace(g, plate.i, M.EMPTY);
    s.done = true; s.repair = false;   /* (not looked over yet) */
    s.countT = g.tick - 60 * 10;   /* (its last second up) */
    w.hRocketStep(g, s);
    check(!s.gone, "it went with a plate gone");
  });
  test("moon rocket: a cell of its engine bell gone, the foundry is asked for a whole bell to mend it with", function () {
    var R = rocket(true), w = R.w, g = R.g, s = R.s, M = w.MAT;
    var gy = []; for (var k = 0; k < w.H_FW; k++) gy.push(R.G);
    var fr = w.hFoundryFit(g, 112, gy, R.G, R.G), f = w.hFoundryAt(g, g.peasants[0], 112, fr.R0, fr.plan);
    sim.build(w, f); f.done = true;
    g.peasants.forEach(function (q) { q.bell = 0; });
    var bell = s.plan.filter(function (e) { return e.res === "bell" && g.m[e.i] === M.METAL; })[0];
    w.sandPlace(g, bell.i, M.EMPTY); s.done = false; s.repair = true;
    check(w.hFoundryWant(g, f) === "an engine bell", "the foundry is asked for " + JSON.stringify(w.hFoundryWant(g, f)) + " for a ninth of a bell");
  });
  test("moon rocket: INERT painted over its hull is never flung by its blowing up", function () {
    var R = rocket(true), w = R.w, g = R.g, s = R.s, M = w.MAT, k;
    s.oil = 4;
    var hull = s.plan.filter(function (e) { return e.rk && g.m[e.i] === M.METAL; }).slice(0, 6).map(function (e) { return e.i; });
    hull.forEach(function (j) { w.sandPlace(g, j, M.INERT); });
    w.sandPlace(g, (R.G - 3) * g.gw + s.x0 + 11, M.EMBER);
    for (k = 0; k < 100 && !g.rocketBooms; k++) sim.step(w, 1);
    check(g.rocketBooms === 1, "(the test wants it to go up)");
    sim.step(w, 30);
    check(hull.every(function (j) { return g.m[j] === M.INERT; }), "INERT flung off the hull: " + hull.map(function (j) { return w.MAT_NAME[g.m[j]]; }).join(","));
  });
  test("moon rocket: fire by a fuelled rocket blows it up, and anybody aboard is thrown clear", function () {
    var R = rocket(true), w = R.w, g = R.g, s = R.s, M = w.MAT, k;
    s.oil = 4;
    var q = g.peasants[3];
    s.crew = [q.id]; q.aboard = s.id; q.state = "space"; q.spaceT = 1e9;
    var j = (R.G - 3) * g.gw + s.x0 + 11;
    w.sandPlace(g, j, M.EMBER);   /* (a burning stick, dropped on the pad by it) */
    for (k = 0; k < 100 && !g.rocketBooms; k++) sim.step(w, 1);
    check(g.rocketBooms === 1 && s.oil === 0, "it did not go up");
    for (k = 0; k < 130 && q.aboard; k++) sim.step(w, 1);
    check(!q.aboard && q.state !== "space", "the one aboard was not got clear");
    var left = s.plan.filter(function (e) { return e.rk && g.m[e.i] === M.METAL; }).length;
    check(left < 20, left + " plates still where they were");
  });
  test("moon rocket: blown up with its crew aboard, they are got out clear of the blast, not thrown into it: alive, and not burning", function () {
    var F = fflat(2), w = F.w, g = F.g, p = F.p, M = F.M, i;
    g.know = { moonrocket: "TEST" };
    var gy = []; for (i = 0; i < w.H_RW; i++) gy.push(150);
    var fit = w.hRocketFit(g, 120, gy, 150, 150), s = w.hRocketAt(g, p, 120, fit.R0, fit.plan);
    sim.build(w, s);
    s.oil = w.H_FUEL; s.crew = [p.id]; p.x = s.walk.x + 0.5; p.y = s.walk.y;
    p.task = { kind: "board", site: s.id, t: 0 }; w.pTask(g, p);
    check(p.aboard === s.id, "(the test wants them aboard)");
    w.sandPlace(g, (s.R0 - 1) * g.gw + s.x0 + 11, M.TORCH);   /* (a fire by it, fuelled) */
    g.tick = 29; sim.step(w, 1);
    check(g.rocketBooms === 1, "(the test wants it blown up)");
    var burnt = false;
    for (i = 0; i < 1000 && !p.dead; i++) { p.hunger = 0; sim.step(w, 1); if (p.fire) burnt = true; }
    check(!p.dead && !burnt && !p.aboard, "the crew: dead " + !!p.dead + " (" + JSON.stringify(g.causes) + "), caught fire " + burnt + ", still held " + !!p.aboard);
  });
};
