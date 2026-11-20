/* =====================================================================
   PLEASAND  --  test/pleasures.js

   the great works for enjoying (pleasures.js): the baths. required by
   test/run.js
   ===================================================================== */
"use strict";

module.exports = function (test, check, sim) {
  /* baths, built and filled with water at 20, on a patch of level ground (sand over stone) at column 200 of seed 1. the
     village moved off out of the way, but for those given */
  function baths(keep) {
    var w = sim.load(1), g = w.g, M = w.MAT, x0 = 200, G = 150, x, y, k;
    /* (nobody's hut in the way: its box would take the fire under the baths for a fire in the hut) */
    for (k = g.sites.length - 1; k >= 0; k--) if (g.sites[k].x1 >= x0 - 12 && g.sites[k].x0 <= x0 + 27) w.bRemove(g, k);
    for (x = x0 - 8; x < x0 + 23; x++) {
      for (y = G - 30; y < G; y++) w.sandPlace(g, y * g.gw + x, M.EMPTY);
      for (y = G; y < G + 9; y++) w.sandPlace(g, y * g.gw + x, M.SAND);
      for (y = G + 9; y < G + 13; y++) w.sandPlace(g, y * g.gw + x, M.STONE);
    }
    ["farm", "dig", "bucket", "mine", "masonry", "smelt", "concrete", "baths"].forEach(function (k) { g.know[k] = "TEST"; });
    var gy = []; for (x = 0; x < 15; x++) gy.push(G);
    var r = w.pBathsFit(g, x0, gy, G, G);
    check(!!r && r.G === G, "(the test wants the baths to fit on level ground)");
    var s = w.bNew(g, "baths", g.peasants[0], r.plan, [x0, G - 13, x0 + 14, G + 5],
                   { wonder: true, G: G, bath: true, L: G, px0: x0 + 3, S: [G + 3, G + 3, G + 3, G + 3, G + 3, G + 3, G + 3, G + 3, G + 3] });
    sim.build(w, s);
    for (x = s.px0; x < s.px0 + 9; x++) for (y = G; y < G + 3; y++) w.sandPlace(g, y * g.gw + x, M.WATER);
    g.peasants.forEach(function (q, k) { if (k >= (keep || 0)) q.dead = 1; else { q.x = x0 - 4 - k * 2 + 0.5; q.y = G - 1; q.task = null; q.hunger = 0; q.coal = 40; } });
    sim.step(w, 1);
    return { w: w, g: g, s: s, G: G, x0: x0 };
  }
  function temp(B) { return B.w.pBathT(B.g, B.s); }

  test("baths: planned sunk into level ground, concrete and firebrick under a colonnade, and the idea comes of swimming", function () {
    var w = sim.load(1), g = w.g, M = w.MAT;
    ["farm", "dig", "bucket", "mine", "masonry", "smelt", "concrete"].forEach(function (k) { g.know[k] = "TEST"; });
    g.found.coal = 20; g.swims = 9;
    var p = g.peasants[0];
    check(!w.wIdea("baths").ready(g, p), "the baths were thought of before anybody had swum enough");
    p.task = null; p.swimming = true;
    w.wSwam(g, p);
    check(p.spark === "baths", "the tenth swim did not put the baths into the swimmer's head");
    g.know.baths = "TEST";
    check(w.pPlanBaths(g, p), "nowhere for the baths in seed 1");
    var s = g.sites.filter(function (t) { return t.kind === "baths"; })[0];
    var kinds = {};
    s.plan.forEach(function (e) { kinds[e.v] = (kinds[e.v] || 0) + 1; });
    check(kinds[M.CONCRETE] >= 20 && kinds[M.FIREBRICK] >= 6 && kinds[M.BRICK] >= 10, "the plan is not concrete, firebrick and stone: " + JSON.stringify(kinds));
    /* (the water's top level with the ground, nine by three of it to dig, or already air) */
    var dug = {};
    s.plan.forEach(function (e) { if (e.v === M.EMPTY) dug[e.i] = 1; });
    var n = 0;
    for (var x = s.px0; x < s.px0 + 9; x++) for (var y = s.L; y < s.L + 3; y++) if (dug[y * g.gw + x] || w.AIRY[g.m[y * g.gw + x]]) n++;
    check(s.L === s.G && n === 27, "the basin is not sunk to the ground, nine by three: " + n);
  });

  test("baths: the basin holds its 27 cells of water, and none leaks in 2000 ticks", function () {
    var B = baths(0), w = B.w, g = B.g;
    check(w.wBathNeed(g, B.s) === 0, "(the test wants it full)");
    sim.step(w, 2000);
    var n = 0;
    for (var x = B.s.px0; x < B.s.px0 + 9; x++) for (var y = B.G; y < B.G + 3; y++) if (g.m[y * g.gw + x] === w.MAT.WATER) n++;
    check(n === 27, n + " cells of water left in the basin");
  });

  test("baths: the stoker brings the water from 20 to over 32 within 3000 ticks", function () {
    var B = baths(1), w = B.w, g = B.g, t;
    for (t = 0; t < 3000 && temp(B) <= 32; t += 30) sim.step(w, 30);
    check(temp(B) > 32, "the water is only " + temp(B).toFixed(1) + " after 3000 ticks (" + (B.s.coals || 0) + " coals)");
  });

  test("baths: the stoker keeps it between 30 and 46 for 10,000 ticks", function () {
    var B = baths(3), w = B.w, g = B.g, t, lo = 99, hi = 0, start = 0;
    for (t = 0; t < 14000; t += 30) {
      sim.step(w, 30);
      var T = temp(B);
      if (!start && T > 32) start = g.tick;
      if (start && g.tick - start > 1000 && g.tick - start <= 11000) { lo = Math.min(lo, T); hi = Math.max(hi, T); }
    }
    check(start > 0, "it never got warm");
    check(lo >= 30 && hi <= 46, "it went from " + lo.toFixed(1) + " to " + hi.toFixed(1) + " (" + B.s.coals + " coals)");
  });

  test("baths: a cold peasant bathes, and stops being cold; at 60 the bathers get out", function () {
    var B = baths(2), w = B.w, g = B.g, x, y;
    function heat(T) { for (x = B.s.px0; x < B.s.px0 + 9; x++) for (y = B.G; y < B.G + 3; y++) { var j = y * g.gw + x; g.T[j] = T; } }
    var p = g.peasants[0], q = g.peasants[1];
    q.coal = 0; q.x = B.x0 - 40;   /* (nobody stoking it hotter) */
    heat(37);
    p.cold = 300; p.coal = 0;
    check(w.wWarmBath(g, p), "a cold peasant did not go for a warm bath");
    var bathed = false;
    for (var t = 0; t < 1500 && p.cold > 0; t++) { sim.step(w, 1); heat(37); if (p.bathT === g.tick) bathed = true; }
    check(bathed && p.cold === 0, "still cold (" + Math.round(p.cold) + "), bathed " + bathed);
    /* too hot: out they get */
    p.task = null; w.pGoBathe(g, p, B.s, false);
    for (t = 0; t < 600 && !(p.bathT === g.tick); t++) { sim.step(w, 1); heat(37); }
    check(p.bathT === g.tick, "(the test wants them in the water)");
    heat(60);
    for (t = 0; t < 400; t++) { sim.step(w, 1); heat(60); }
    var fx = Math.floor(p.x), fy = Math.floor(p.y);
    check(!(fx >= B.s.px0 && fx < B.s.px0 + 9 && fy >= B.G && fy <= B.G + 2), "still in water at 60, at " + fx + "," + fy);
    check(!(p.task && p.task.kind === "bathe"), "still bathing at 60");
  });

  /* ---------------------------------------------------------------
     THE HANGING GARDENS
     --------------------------------------------------------------- */
  function know(g, list) { list.forEach(function (k) { g.know[k] = "TEST"; }); }
  function sites(g, kind) { return g.sites.filter(function (s) { return s.kind === kind; }); }
  /* the gardens planned on seed 1's slope and built at once, the terraces with fields on them (built, or only planned),
     the pool full; keep: how many peasants stay */
  function gardens(keep, sow) {
    var w = sim.load(1), g = w.g, M = w.MAT;
    know(g, ["farm", "dig", "bucket", "mine", "masonry", "smelt", "concrete", "gardens"]);
    var p = g.peasants[0];
    check(w.pPlanGardens(g, p), "nowhere for the hanging gardens in seed 1");
    var s = sites(g, "gardens")[0];
    sim.build(w, s);
    w.wFinish(g, s, p);
    var T = g.sites.filter(function (t) { return t.terrace === s.id; });
    if (sow) T.forEach(function (t) { sim.build(w, t); });
    for (var x = s.px0; x < s.px0 + 4; x++) for (var y = s.L; y < s.L + w.P_GPOOL; y++) w.sandPlace(g, y * g.gw + x, M.WATER);
    g.peasants.forEach(function (q, k) { if (k >= keep) q.dead = 1; else { q.x = s.crankX + 0.5 - s.d * 3 * (k + 1); q.y = s.crankY; q.task = null; q.hunger = 0; q.tired = 0; } });
    sim.step(w, 1);
    return { w: w, g: g, s: s, T: T, M: M };
  }
  /* water on terrace k of the gardens (on its bed, or over it) */
  function onTerrace(G, k) {
    var w = G.w, g = G.g, s = G.s, n = 0, Yk = w.pGBed(s.Y0, k);
    for (var u = w.P_GLIP[k] + 1; u <= w.P_GLIP[k] + 6; u++) for (var y = Yk - 8; y < Yk; y++) if (g.m[y * g.gw + w.pGU(s, u)] === G.M.WATER) n++;
    return n;
  }

  test("gardens: no room for another field puts the hanging gardens into the head of whoever looked", function () {
    var w = sim.load(1), g = w.g, p = g.peasants[0];
    know(g, ["farm", "dig", "bucket", "masonry", "smelt", "concrete"]);
    g.farmNo = g.farmNo || {}; for (var x = 0; x < g.gw; x++) g.farmNo[x] = 1e12;   /* (every field plot in the valley given up on) */
    check(!g.noField && !w.wIdea("gardens").ready(g, p), "(the test wants the gardens not thought of yet)");
    p.spark = null;
    check(!w.iPlanFarm(g, p, true), "a field was planned with no room for one");
    check(g.noField > 0, "no room for a field was not noticed");
    check(p.spark === "gardens", "nobody had the gardens put into their head (" + p.spark + ")");
    check(g.feed.some(function (f) { return /nowhere for another field/.test(f.text); }), "the valley did not hear there is no room");
  });

  test("gardens: a stair of three terraces up a slope, each a field that is sown and grows", function () {
    var G = gardens(3, false), w = G.w, g = G.g, s = G.s, M = G.M;
    var kinds = {};
    s.plan.forEach(function (e) { kinds[e.v] = (kinds[e.v] || 0) + 1; });
    check(kinds[M.CONCRETE] >= 1 && s.screw.length >= 15 && kinds[M.BRICK] >= 15, "not brick, iron and concrete: " + JSON.stringify(kinds));
    check(G.T.length === 3, G.T.length + " terraces with a field on");
    /* (each a terrace field: not counted against the cap on fields) */
    check(w.iFields(g) === sites(g, "farm").length - 3, "the terraces count against the field cap");
    var Y = G.T.map(function (t) { return t.G; });
    check(Y[0] - Y[1] === 5 && Y[1] - Y[2] === 5, "the terraces are not five over each other: " + Y.join(","));
    /* open sky over every bed */
    G.T.forEach(function (t) { for (var x = t.x0; x <= t.x1; x++) for (var y = t.G - 7; y < t.G; y++) check(w.AIRY[g.m[y * g.gw + x]], "something over a terrace at " + x + "," + y); });
    var t0 = g.tick;
    for (var k = 0; k < 6000 && G.T.some(function (t) { return !t.done; }); k += 30) sim.step(w, 30);
    check(G.T.every(function (t) { return t.done; }), "the terraces were not all sown in 6000 ticks: " + G.T.map(function (t) { return Math.round(w.bShare(g, t) * 100) + "%"; }).join(" "));
    function crops() { var n = 0; G.T.forEach(function (t) { for (var x = t.x0; x <= t.x1; x++) for (var y = t.G - 7; y < t.G; y++) { var c = g.m[y * g.gw + x]; if (c === M.CROP || c === M.WHEAT) n++; } }); return n; }
    var c0 = crops();
    g.peasants.forEach(function (q) { q.dead = 1; });
    sim.step(w, 3000);
    check(crops() > c0, "the wheat on the terraces did not grow (" + c0 + " to " + crops() + ")");
    void t0;
  });

  test("gardens: the screw lifts the pool into the cistern, the water runs down to the bottom terrace, and none is lost", function () {
    var G = gardens(1, false), w = G.w, g = G.g, s = G.s, M = G.M;
    delete g.know.farm;   /* (nobody sows the terraces: wheat drinks what lands on it, and this is about where the water goes) */
    function box() { var n = 0; for (var y = s.y0 - 3; y <= s.y1 + 2; y++) for (var x = s.x0 - 4; x <= s.x1 + 4; x++) if (g.m[y * g.gw + x] === M.WATER) n++; return n; }
    var n0 = box(), bottom = 0, top = 0;
    check(n0 === w.P_GPOOL_N, "(the test wants the pool full: " + n0 + ")");
    for (var t = 0; t < 5000; t++) { sim.step(w, 1); bottom = Math.max(bottom, onTerrace(G, 0)); top = Math.max(top, onTerrace(G, 2)); }   /* (it runs through quick: every tick) */
    check(s.lifted >= 8, "the screw lifted only " + s.lifted + " cells in 5000 ticks");
    check(top > 0, "no water reached the top terrace");
    check(bottom > 0, "no water reached the bottom terrace");
    check(box() === n0, "water in the gardens went from " + n0 + " to " + box());
  });

  /* ---------------------------------------------------------------
     THE STEAM ORGAN
     --------------------------------------------------------------- */
  /* the organ built on seed 1 and its tank filled; keep peasants, each with coal */
  function organ(keep) {
    var w = sim.load(1), g = w.g, M = w.MAT;
    know(g, ["farm", "dig", "bucket", "mine", "masonry", "smelt", "concrete", "festival", "organ"]);
    var p = g.peasants[0];
    check(w.pPlanOrgan(g, p), "nowhere for the organ in seed 1");
    var s = sites(g, "organ")[0];
    sim.build(w, s);
    w.wFinish(g, s, p);
    for (var x = s.px0; x < s.px0 + 13; x++) for (var y = s.L; y < s.L + 3; y++) w.sandPlace(g, y * g.gw + x, M.WATER);
    g.peasants.forEach(function (q, k) { if (k >= keep) q.dead = 1; else { q.x = s.x0 - 3 - k; q.y = s.G - 1; q.task = null; q.hunger = 0; q.tired = 0; q.coal = 12; } });
    sim.step(w, 1);
    return { w: w, g: g, s: s, M: M };
  }
  function tank(O) { return O.w.P_OTANK - O.w.wBathNeed(O.g, O.s) + O.w.pOrganSteam(O.g, O.s); }

  test("organ: a fired boiler makes steam that goes out of the open pipe and no other", function () {
    var O = organ(0), w = O.w, g = O.g, s = O.s, M = O.M;
    check(tank(O) === 39, "(the test wants the tank full: " + tank(O) + ")");
    for (var u = 0; u < 3; u++) { var j = w.pOBox(g, s, u); w.sandPlace(g, j, M.EMBER); g.aux[j] = 1; w.heatAccept(g, j); }
    w.pOOpen(g, s, 3);
    for (var t = 0; t < 1500; t++) {
      sim.step(w, 1);
      if (t % 200 === 0) for (u = 0; u < 3; u++) { j = w.pOBox(g, s, u); if (g.m[j] !== M.EMBER) { w.sandPlace(g, j, M.EMBER); g.aux[j] = 1; w.heatAccept(g, j); } }
    }
    check(s.exits[3] >= 5, "only " + s.exits[3] + " puffs out of the open pipe");
    check(s.exits.every(function (n, k) { return k === 3 || n === 0; }), "steam out of shut pipes: " + s.exits.join(","));
  });

  test("organ: a concert of thirty notes empties no more than forty cells, and every puff out of a pipe is a note", function () {
    var O = organ(3), w = O.w, g = O.g, s = O.s, heard = 0;
    w.eval("var _os = pOrganSounds; pOrganSounds = function (g) { g._heard = (g._heard || 0) + P_OQ.length; _os(g); }");
    var before = tank(O), n0 = s.notes;
    check(w.pOrganPlay(g, "test"), "the organ would not play with a full tank");
    for (var t = 0; t < 9000 && !s.concerts; t += 30) sim.step(w, 30);
    heard = g._heard || 0;
    check(s.concerts === 1, "no concert in 9000 ticks (" + s.state + ", note " + s.ni + ")");
    check(s.ni >= 30, "the concert was " + s.ni + " notes");
    check(s.lastUsed <= 40, "the concert used " + s.lastUsed + " cells of water");
    check(before - tank(O) <= 40, "the tank went from " + before + " to " + tank(O));
    check(s.notes - n0 >= 30 && heard >= s.notes - n0, (s.notes - n0) + " puffs, " + heard + " notes heard");
    console.log("      (a concert: " + s.lastNotes + " notes, " + s.lastUsed + " cells of water, " + s.coals + " coals)");
  });

  test("organ: the steam comes back down as rain in the valley, and the gutter's catch goes back in the tank", function () {
    var O = organ(2), w = O.w, g = O.g, s = O.s, M = O.M;
    function wet() { var n = 0; for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.WATER || g.m[j] === M.STEAM) n++; return n; }
    w.pOrganPlay(g, "test");
    for (var t = 0; t < 9000 && !s.concerts; t += 30) sim.step(w, 30);
    check(s.concerts === 1, "(the test wants a concert)");
    /* (nobody about with a bucket from here on: only the organist, bailing) */
    g.peasants.forEach(function (q) { if (q.id !== s.organist) q.dead = 1; });
    var w0 = wet();
    sim.step(w, 6000);
    var steam = 0;
    for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.STEAM) steam++;
    check(Math.abs(wet() - w0) <= 2, "water and steam in the valley went from " + w0 + " to " + wet());
    check(steam <= 4, steam + " cells of steam still up in the sky after 6000 ticks");
    console.log("      (of " + s.lastUsed + " cells boiled off, the gutter caught " + s.caught + " back into the tank in 6000 ticks)");
  });

  test("organ: a boiler shut up tight with steam in it a long while has its organist open a pipe to let it breathe", function () {
    var O = organ(1), w = O.w, g = O.g, s = O.s, M = O.M;
    /* (the HEAT brush on the tank, with every valve shut: steam, and nowhere for it to go) */
    s.nextT = 1e9;
    delete g.know.mine; g.sites.filter(function (t) { return t.mine; }).forEach(function (t) { w.bRemove(g, g.sites.indexOf(t)); });   /* (nobody off down a mine: the organist is who is about) */
    function heat() { for (var x = s.px0; x < s.px0 + 13; x++) for (var y = s.L; y < s.L + 3; y++) { var j = y * g.gw + x; if (g.m[j] === M.WATER) w.heatAdd(g, j, 30); } }
    for (var t = 0; t < 4000 && !s.breathe; t += 30) { if (t < 1500) heat(); sim.step(w, 30); }
    check(s.breathe >= 1, "nobody let it breathe (steam " + w.pOrganSteam(g, s) + ", shut since " + s.shutT + ")");
  });
};
