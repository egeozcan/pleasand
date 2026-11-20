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
    p.iron = 2; p.coal = 80; p.x = (mould === "bell" ? s.xf + 17 : s.xf - 3) + 0.5; p.y = s.R0 - 1;
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
    check(g.peasants[3].spark === "foundry", "the sixtieth bar did not put it into the head of the one who smelted most (" + g.peasants[3].spark + ")");
    g.know.foundry = "TEST";
    settle(g);
    check(w.hPlanFoundry(g, g.peasants[0]), "nowhere for a foundry");
    var s = sites(g, "foundry")[0], f = sites(g, "furnace")[0];
    check(Math.abs(s.cx - f.cx) < 60, "the foundry is " + Math.round(Math.abs(s.cx - f.cx)) + " columns from the furnace");
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
  test("moon rocket: fire by a fuelled rocket blows it up, and anybody aboard is thrown clear", function () {
    var R = rocket(true), w = R.w, g = R.g, s = R.s, M = w.MAT, k;
    s.oil = 4;
    var q = g.peasants[3];
    s.crew = [q.id]; q.aboard = s.id; q.state = "space"; q.spaceT = 1e9;
    var j = (R.G - 3) * g.gw + s.x0 + 11;
    w.sandPlace(g, j, M.EMBER);   /* (a burning stick, dropped on the pad by it) */
    for (k = 0; k < 100 && !g.rocketBooms; k++) sim.step(w, 1);
    check(g.rocketBooms === 1 && s.oil === 0, "it did not go up");
    check(!q.aboard && q.state !== "space", "the one aboard was not thrown clear");
    var left = s.plan.filter(function (e) { return e.rk && g.m[e.i] === M.METAL; }).length;
    check(left < 20, left + " plates still where they were");
  });
};
