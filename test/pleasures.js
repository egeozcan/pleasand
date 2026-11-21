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
    check(p.wspark === "baths", "the tenth swim did not put the baths into the swimmer's head");
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
    check(!g.causes.fire && !g.causes.lava, "the stoker died at the stoke-hole: " + JSON.stringify(g.causes));
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
    for (var x = s.px0; x < s.px0 + w.P_GPW; x++) for (var y = s.L; y < s.L + w.P_GPOOL; y++) w.sandPlace(g, y * g.gw + x, M.WATER);
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
    p.wspark = null;
    check(!w.iPlanFarm(g, p, true), "a field was planned with no room for one");
    check(g.noField > 0, "no room for a field was not noticed");
    check(p.wspark === "gardens", "nobody had the gardens put into their head (" + p.wspark + ")");
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
    G.T.forEach(function (t) { t.plan = []; t.done = true; });   /* (bare earth, called sown, so the screw is turned) */
    function box() { var n = 0; for (var y = s.y0 - 3; y <= s.y1 + 2; y++) for (var x = s.x0 - 4; x <= s.x1 + 4; x++) if (g.m[y * g.gw + x] === M.WATER) n++; return n; }
    var n0 = box(), bottom = 0, top = 0;
    check(n0 === w.P_GPOOL_N, "(the test wants the pool full: " + n0 + ")");
    for (var t = 0; t < 5000; t++) { sim.step(w, 1); bottom = Math.max(bottom, onTerrace(G, 0)); top = Math.max(top, onTerrace(G, 2)); }   /* (it runs through quick: every tick) */
    check(s.lifted >= 8, "the screw lifted only " + s.lifted + " cells in 5000 ticks");
    check(top > 0, "no water reached the top terrace");
    check(bottom > 0, "no water reached the bottom terrace");
    check(box() === n0, "water in the gardens went from " + n0 + " to " + box());
  });

  test("gardens: a pool left too low to turn the screw on is sent for water, and the screw turns once it is up", function () {
    var G = gardens(3, true), w = G.w, g = G.g, s = G.s, M = G.M, k, most = 0, x, y;
    /* (two cells left in it, its floor: what a turner leaves, stopping) */
    for (y = s.L; y < s.L + w.P_GPOOL - 1; y++) for (x = s.px0; x < s.px0 + w.P_GPW; x++) w.sandPlace(g, y * g.gw + x, M.EMPTY);
    g.peasants.forEach(function (q) { q.task = null; q.bored = 0; });
    while (g.tick % 300) sim.step(w, 1);
    w.pGardensStep(g, s);
    check(g.peasants.some(function (q) { return q.task && q.task.kind === "pfill"; }), "nobody sent for water for a pool too low to turn the screw on");
    var lifted0 = s.lifted || 0;
    for (k = 0; k < 15000 && (s.lifted || 0) <= lifted0; k += 30) { sim.step(w, 30); most = Math.max(most, w.P_GPOOL_N - w.wBathNeed(g, s)); }
    check(most >= w.P_GTURN && (s.lifted || 0) > lifted0, "the pool came up to " + most + " and the screw lifted " + ((s.lifted || 0) - lifted0));
  });

  test("gardens: a pool silted up with sand is not full: the sand is cleared out of it, and it is filled with water again", function () {
    var G = gardens(3, true), w = G.w, g = G.g, s = G.s, M = G.M, k, x, y, n = 0;
    for (y = s.L; y < s.L + w.P_GPOOL; y++) for (x = s.px0; x < s.px0 + w.P_GPW; x++) { w.sandPlace(g, y * g.gw + x, n < w.P_GPOOL_N - 8 ? M.EMPTY : (n < w.P_GPOOL_N - 2 ? M.SAND : M.WATER)); n++; }
    function count(v) { var c = 0; for (var y = s.L; y < s.L + w.P_GPOOL; y++) for (var x = s.px0; x < s.px0 + w.P_GPW; x++) if (g.m[y * g.gw + x] === v) c++; return c; }
    check(w.P_GPOOL_N - w.wBathNeed(g, s) === count(M.WATER), "the pool counts " + (w.P_GPOOL_N - w.wBathNeed(g, s)) + " of water, with " + count(M.WATER) + " in it");
    var cleared = false;
    for (k = 0; k < 24000 && count(M.WATER) < w.P_GTURN; k += 30) { sim.step(w, 30); if (s.repair) cleared = true; }
    check(cleared, "nobody set about clearing the sand out of the pool");
    check(count(M.WATER) >= w.P_GTURN, "the pool has only " + count(M.WATER) + " of water in it, and " + count(M.SAND) + " of sand");
  });

  test("gardens: built ones keep their own measures: a terrace planned again goes where it was, whatever the plan's numbers are now", function () {
    var G = gardens(0, true), w = G.w, g = G.g, s = G.s;
    var T = G.T.filter(function (t) { return t.tier === 0; })[0], cols = T.plan.map(function (e) { return e.i % g.gw; }).sort().join(",");
    w.eval("P_GLIP = [6, 13, 20]; P_GC = 27; P_GW = 30");   /* (the numbers changed since: a save from before) */
    w.bRemove(g, g.sites.indexOf(T));
    w.pTerraces(g, s);
    var T2 = g.sites.filter(function (t) { return t.terrace === s.id && t.tier === 0; })[0];
    check(!!T2, "(the test wants the terrace planned again)");
    var cols2 = T2.plan.map(function (e) { return e.i % g.gw; }).sort().join(",");
    check(cols2 === cols, "the terrace was planned again on " + cols2 + ", not " + cols);
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
    for (var x = s.px0; x < s.px0 + s.bw; x++) for (var y = s.L; y < s.L + s.bh; y++) w.sandPlace(g, y * g.gw + x, M.WATER);
    g.peasants.forEach(function (q, k) { if (k >= keep) q.dead = 1; else { q.x = s.x0 - 3 - k; q.y = s.G - 1; q.task = null; q.hunger = 0; q.tired = 0; q.coal = 12; } });
    sim.step(w, 1);
    return { w: w, g: g, s: s, M: M };
  }
  function tank(O) { return O.w.P_OTANK - O.w.wBathNeed(O.g, O.s) + O.w.pOrganSteam(O.g, O.s); }

  test("organ: its tank is shut in iron a peasant cannot pass, lid, floor and sides; dropped on it over a pipe in a concert, a visitor stays out of the water", function () {
    var O = organ(4), w = O.w, g = O.g, s = O.s, M = O.M, x, y, bad = [];
    for (x = s.px0 - 1; x <= s.px0 + s.bw; x++) for (y = s.L - 1; y <= s.L + s.bh; y++) {
      var inside = x >= s.px0 && x < s.px0 + s.bw && y >= s.L && y < s.L + s.bh;
      if (!inside && (w.P_PASS[g.m[y * g.gw + x]] || !w.SOLID[g.m[y * g.gw + x]])) bad.push(x + "," + y + " " + w.MAT_NAME[g.m[y * g.gw + x]]);
    }
    check(!bad.length, "the tank's shell is passable or open at " + bad.join(" "));
    /* (pi's round 26: a concert going, a visitor let go of over the middle pipe) */
    check(w.pOrganPlay(g, "test"), "(the test wants a concert)");
    sim.step(w, 1699);
    var v = JSON.parse(JSON.stringify(g.peasants[0])); v.id = 88;
    Object.assign(v, { x: w.pOPipeX(s, 2) + 0.5, y: s.G - 37, vx: 0, vy: 0, task: null, state: "walk", life: 1e9, hunger: 0, dir: 1, chuteCD: 0, stun: 0, dead: 0 });
    g.peasants.push(v);
    var entered = false;
    for (var i = 0; i < 400 && !v.dead; i++) { sim.step(w, 1); if (v.y >= s.L && v.y <= s.G - 1 && v.x >= s.px0 && v.x < s.px0 + s.bw) entered = true; }
    check(!entered && !v.dead && !g.causes.drown, "the visitor " + (entered ? "got into the tank" : "stayed out") + ", " + JSON.stringify(g.causes));
  });
  test("organ: a fired boiler makes steam that goes out of the open pipe and no other", function () {
    var O = organ(0), w = O.w, g = O.g, s = O.s, M = O.M;
    check(tank(O) === w.P_OTANK, "(the test wants the tank full: " + tank(O) + ")");
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
    check(!g.causes.fire && !g.causes.lava, "the organist died at the boiler: " + JSON.stringify(g.causes));
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

  test("organ: coal chipped in to the organist by the village is all the organist's: none of it lost", function () {
    var O = organ(2), w = O.w, g = O.g, s = O.s;
    var a = g.peasants[0], b = g.peasants[1];
    a.coal = 0; b.coal = 5; b.x = a.x + 2;
    var f = w.mSites(g, "furnace", true)[0]; if (f && f.stock) f.stock.coal = 0;
    var c0 = a.coal + b.coal;
    a.task = { kind: "organ", site: s.id, t: 0, act: 0, brave: true }; s.state = "firing"; s.fireT = g.tick;
    w.pTaskOrgan(g, a, a.task);
    check(a.coal + b.coal === c0, "coal went from " + c0 + " to " + (a.coal + b.coal) + " chipping in to the organist");
  });

  test("organ: a boiler shut up tight with steam in it a long while has its organist open a pipe to let it breathe", function () {
    var O = organ(1), w = O.w, g = O.g, s = O.s, M = O.M;
    /* (the HEAT brush on the tank, with every valve shut: steam, and nowhere for it to go) */
    s.nextT = 1e9;
    delete g.know.mine; g.sites.filter(function (t) { return t.mine; }).forEach(function (t) { w.bRemove(g, g.sites.indexOf(t)); });   /* (nobody off down a mine: the organist is who is about) */
    function heat() { for (var x = s.px0; x < s.px0 + s.bw; x++) for (var y = s.L; y < s.L + s.bh; y++) { var j = y * g.gw + x; if (g.m[j] === M.WATER) w.heatAdd(g, j, 30); } }
    for (var t = 0; t < 4000 && !s.breathe; t += 30) { if (t < 1500) heat(); sim.step(w, 30); }
    check(s.breathe >= 1, "nobody let it breathe (steam " + w.pOrganSteam(g, s) + ", shut since " + s.shutT + ")");
  });

  /* ---------------------------------------------------------------
     THE DUCK PALACE
     --------------------------------------------------------------- */
  /* a flat bank at 150 from x 90 to 200, a pond from 200 to 245 (eight deep), the duck palace on its bank, built. ducks:
     where to put them. peasants: none, unless keep */
  function palace(keep) {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x, y, k;
    for (k = g.sites.length - 1; k >= 0; k--) if (g.sites[k].x1 >= 80 && g.sites[k].x0 <= 255) w.bRemove(g, k);
    for (x = 80; x <= 255; x++) {
      for (y = 40; y < G; y++) w.sandPlace(g, y * g.gw + x, M.EMPTY);
      var pond = x >= 200 && x <= 245;
      for (y = G; y < G + 12; y++) w.sandPlace(g, y * g.gw + x, pond && y < G + 8 ? M.WATER : (y < G + 9 && (x < 185 || x > 250) ? M.SAND : M.STONE));   /* (a bank of rock: sand would slump into the water) */
    }
    know(g, ["farm", "dig", "bucket", "scarecrow", "duckpalace"]);
    g.ducks.length = 0;
    g.peasants.forEach(function (q, k) { if (k >= (keep || 0)) q.dead = 1; else { q.x = 150 + k * 3; q.y = G - 1; q.task = null; q.hunger = 0; } });
    var p = g.peasants[0];
    check(w.pPlanPalace(g, p), "nowhere for the duck palace on the pond");
    var s = sites(g, "duckpalace")[0];
    sim.build(w, s);
    w.wFinish(g, s, p);
    g.duckArriveT = 1e12;
    sim.step(w, 1);
    return { w: w, g: g, s: s, M: M, G: G };
  }
  function seedTrough(P) { P.w.pTrough(P.g, P.s).forEach(function (j) { if (P.g.m[j] === P.M.EMPTY) { P.w.sandPlace(P.g, j, P.M.SEED); } }); }

  test("duck palace: on the one beach out of a lake, it leaves a way out: a swimmer in the lake gets out", function () {
    /* (a lake out to the edge of the world, its only way out a sand beach on the left, a row down for every two along) */
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x, y, k;
    for (k = g.sites.length - 1; k >= 0; k--) if (g.sites[k].x1 >= 150) w.bRemove(g, k);
    for (x = 150; x < g.gw; x++) {
      for (y = 40; y < G + 14; y++) w.sandPlace(g, y * g.gw + x, M.EMPTY);
      var floor = x < 200 ? G : Math.min(G + 9, G + Math.floor((x - 200) / 2));
      for (y = floor; y < G + 14; y++) w.sandPlace(g, y * g.gw + x, y < floor + 3 ? M.SAND : M.STONE);
      for (y = G + 1; y < floor; y++) w.sandPlace(g, y * g.gw + x, M.WATER);
    }
    sim.step(w, 200);
    know(g, ["farm", "dig", "bucket", "scarecrow", "duckpalace"]);
    g.ducks.length = 0;
    g.peasants.forEach(function (q, k) { if (k >= 1) q.dead = 1; else { q.x = 160; q.y = G - 1; q.task = null; q.hunger = 0; } });
    var p = g.peasants[0];
    check(w.pPlanPalace(g, p), "nowhere for the duck palace on the beach");
    var s = sites(g, "duckpalace")[0];
    /* (without its ramp down into the water, the deck would shut the lake in: what wSeals is there for) */
    check(w.wSeals(g, s.plan.filter(function (e) { return e.i % g.gw <= s.x0 + w.P_DW - 1; }), s.x0, s.x0 + w.P_DW - 1), "(the test wants a deck that would shut the lake in)");
    sim.build(w, s); w.wFinish(g, s, p);
    g.duckArriveT = 1e12;
    p.x = 240.5; p.y = G + 6; p.task = null; p.swimT = 1000;
    var out = 0;
    /* (out: on dry ground; or out of their depth no longer, with a way on foot from there to dry ground. whether they
       then wander back in for another swim is up to the dice) */
    function ashore(x, y) { return w.pDryGoal(g)(x, y) || !!w.navFind(g, x, y, w.pDryGoal(g), 190, G - 1, 6000); }
    for (var t = 1; t <= 8000 && !out; t++) { sim.step(w, 1); if (!p.swimming && p.state === "walk" && ashore(Math.floor(p.x), Math.floor(p.y))) out = t; }
    check(out > 0 && !p.dead, "the swimmer never got out of the lake (at " + Math.floor(p.x) + "," + Math.floor(p.y) + ")");
  });

  test("duck palace: thought of by whoever shoos the most ducks; planned at the water's edge, half out over it", function () {
    var w = sim.load(1), g = w.g, p = g.peasants[0], M = w.MAT;
    know(g, ["farm", "dig", "bucket", "scarecrow"]);
    g.raids = 40;
    while (w.pDucksAbout(g) < 4) w.duckSpawn(g, 240, 155, null, false, true);
    g.peasants[1].shoos = 3; p.shoos = 3; p.wspark = null;
    w.pShooed(g, p);
    check(p.wspark === "duckpalace", "the duck palace was not put into the head of whoever shooed the most (" + p.wspark + ")");
    g.know.duckpalace = "TEST";
    check(w.pPlanPalace(g, p), "nowhere for the duck palace in seed 1");
    var s = sites(g, "duckpalace")[0], over = 0, on = 0;
    s.plan.forEach(function (e) {
      if (e.v !== M.PLANK || ((e.i / g.gw) | 0) !== s.Y) return;
      var x = e.i % g.gw, y;
      for (y = s.Y + 1; y < g.gh && w.AIRY[g.m[y * g.gw + x]]; y++);
      if (g.m[y * g.gw + x] === M.WATER) over++; else on++;
    });
    check(over >= 4 && on >= 4, "the deck is not half on the bank and half over the water: " + on + " on, " + over + " over");
  });

  test("duck palace: the reaper keeps seed, the feeder fills the trough, and the seed draws a duck past the wheat", function () {
    var P = palace(1), w = P.w, g = P.g, s = P.s, M = P.M, p = g.peasants[0];
    /* (a handful kept at the harvest) */
    var wx = 120, j = (P.G - 1) * g.gw + wx;
    w.sandPlace(g, j, M.WHEAT);
    p.x = wx + 1.5; p.y = P.G - 1; p.hunger = 900; p.seed = 0;
    p.task = { kind: "eat", x: wx, y: P.G - 1, t: 0, act: 0, n: 0 };
    for (var t = 0; t < 200 && g.m[j] === M.WHEAT; t++) sim.step(w, 1);
    check(p.seed === 1, "no seed kept from the harvest (" + p.seed + ")");
    /* the feeder */
    p.seed = 2; p.hunger = 0; p.task = null;
    check(w.pPalacePick(g, p, false), "nobody went to feed the ducks");
    for (t = 0; t < 2000 && !w.pTroughSeed(g, s).length; t++) sim.step(w, 1);
    check(w.pTroughSeed(g, s).length >= 2, "no seed in the trough");
    p.dead = 1;
    /* a duck at 150, wheat ten behind it, the trough fifty ahead */
    var wheat = (P.G - 1) * g.gw + 140;
    w.sandPlace(g, wheat, M.WHEAT); w.sandPlace(g, wheat - g.gw, M.WHEAT);
    var d = w.duckSpawn(g, 150.5, P.G - 0.5, null, false, true);
    d.dir = -1;
    var seeds = w.pTroughSeed(g, s).length, ate = false;
    for (t = 0; t < 6000 && !ate; t++) { sim.step(w, 1); if (w.pTroughSeed(g, s).length < seeds) ate = true; }
    check(ate, "the duck never ate from the trough (it is at " + Math.floor(d.x) + "," + Math.floor(d.y) + " " + d.state + ", trough " + w.pTrough(g, s).map(function (j) { return g.m[j]; }).join(",") + " seed " + JSON.stringify(d.seed) + ")");
    check(g.m[wheat] === M.WHEAT, "the duck went for the wheat");
  });

  test("duck palace: with the trough kept fed, raids on the wheat fall by half", function () {
    function raids(fed) {
      var P = palace(0), w = P.w, g = P.g, s = P.s, M = P.M, x, y;
      /* a field of ripe wheat, no scarecrow, and four ducks between it and the palace */
      function wheat() { for (x = 120; x <= 140; x += 2) for (y = P.G - 4; y < P.G; y++) { var j = y * g.gw + x; if (w.AIRY[g.m[j]]) w.sandPlace(g, j, M.WHEAT); } }
      wheat();
      for (var k = 0; k < 4; k++) w.duckSpawn(g, 150 + k * 8 + 0.5, P.G - 0.5, null, false, true);
      if (!fed) { w.bRemove(g, g.sites.indexOf(s)); g.wDuckPalace = 0; }
      var r0 = g.raids;
      for (var t = 0; t < 10000; t += 100) { if (fed) seedTrough(P); if (t % 1000 === 0) wheat(); sim.step(w, 100); }
      return g.raids - r0;
    }
    var without = raids(false), withP = raids(true);
    check(without >= 4, "(the test wants raids without the palace: " + without + ")");
    check(withP * 2 <= without, "raids in 10,000 ticks: " + without + " without the palace, " + withP + " with it fed");
    console.log("      (raids in 10,000 ticks: " + without + " without the palace, " + withP + " with it, fed)");
  });

  test("duck palace: ducklings hatch at the palace twice as often, never past the cap on ducks", function () {
    var P = palace(0), w = P.w, g = P.g, s = P.s;
    var mum = w.duckSpawn(g, w.pDU(s, 7) + 0.5, s.Y - 0.5, null, false, true);
    check(w.pPalaceMother(g) === mum, "a duck on the deck is not at home");
    var n0 = g.ducks.length;
    check(w.pPalaceHatch(g, mum, 4), "no ducklings hatched");
    check(g.ducks.length === n0 + 4 && s.hatched === 4, "ducklings: " + (g.ducks.length - n0));
    while (g.ducks.length < w.D_MAX) w.duckSpawn(g, 100, 140, null, false, true);
    w.pPalaceHatch(g, mum, 5);
    check(g.ducks.length <= w.D_MAX, g.ducks.length + " ducks, over the cap of " + w.D_MAX);
  });

  test("duck palace: throw a duck at it, and the ducks keep away from it a while", function () {
    var P = palace(0), w = P.w, g = P.g, s = P.s;
    seedTrough(P);
    var d = w.duckSpawn(g, s.cx, s.Y - 6, null, false, true);
    d.state = "thrown"; d.flyT = 4; d.vx = 0.5; d.vy = 0.5;
    sim.step(w, 2);
    check(s.boycott > g.tick, "the ducks were not offended");
    var o = w.duckSpawn(g, s.cx - 30, P.G - 0.5, null, false, true);
    check(!w.pPalaceSeed(g, o), "a duck made for the trough during the boycott");
    sim.step(w, w.P_DBOYCOTT + 30);
    seedTrough(P); o.x = s.cx - 30; o.y = P.G - 0.5; o.state = "walk";
    check(!!w.pPalaceSeed(g, o), "the ducks never forgave it");
  });

  /* ---------------------------------------------------------------
     THE ICE PALACE
     --------------------------------------------------------------- */
  /* a flat valley floor at 150, five deep in snow from 100 to 240, a house at 200 to be the village, the air frozen (the
     COOL brush, held down: freeze() keeps it so), and keep peasants with nothing else to do */
  function ice(keep) {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x, y, k;
    for (k = g.sites.length - 1; k >= 0; k--) w.bRemove(g, k);   /* (the village is the one house, below: nothing else to do) */
    g.sites.forEach(function (t) { t.done = true; });
    for (x = 90; x <= 250; x++) {
      for (y = 40; y < G; y++) w.sandPlace(g, y * g.gw + x, M.EMPTY);
      for (y = G; y < G + 8; y++) w.sandPlace(g, y * g.gw + x, M.SAND);
      if (x >= 100 && x <= 240) for (y = G - 5; y < G; y++) { var j = y * g.gw + x; w.sandPlace(g, j, M.SNOW); g.T[j] = -10; w.heatAccept(g, j); }
    }
    w.bNew(g, "house", null, [w.bE(g, 200, G - 9, M.PLANK, 0)], [196, G - 14, 204, G - 6], {}).done = true;
    know(g, ["farm", "dig", "bucket", "icepalace"]);
    g.got.snowman = 1; g.got.skate = 1;
    g.peasants.forEach(function (q, k) { if (k >= keep) q.dead = 1; else { q.x = 190 + k * 3 + 0.5; q.y = G - 6; q.task = null; q.hunger = 0; q.tired = 0; q.cold = 0; q.bored = 0; } });
    var I = { w: w, g: g, M: M, G: G };
    I.freeze = function (t) { for (x = 70; x <= 270; x++) for (y = 60; y < G + 2; y++) { var j = y * g.gw + x; if (g.T[j] > (t == null ? -4 : t) && (w.AIRY[g.m[j]] || g.m[j] === M.SNOW || g.m[j] === M.PACKSNOW || g.m[j] === M.ICE)) g.T[j] = t == null ? -4 : t; } };
    I.warm = function () { for (x = 70; x <= 270; x++) for (y = 60; y < G + 2; y++) { var j = y * g.gw + x; if (w.AIRY[g.m[j]]) g.T[j] = 30; } };
    I.freeze(); sim.step(w, 30); I.freeze();
    return I;
  }
  /* run until the palace is done (or n ticks), keeping it frozen: how long it took, or -1 */
  function iceBuild(I, n) {
    var g = I.g, s = sites(g, "icepalace")[0], t0 = g.tick;
    for (var t = 0; t < n && s && !s.done; t += 30) { sim.step(I.w, 30); I.freeze(); }
    return s && s.done ? g.tick - t0 : -1;
  }

  test("ice palace: a freeze with snow lying about puts it into the snowman-builder's head, and it is planned on the snow", function () {
    var I = ice(3), w = I.w, g = I.g, p = g.peasants[0];
    delete g.know.icepalace;
    g.lsnowmen.push({ id: ++g.sid, x: 150, G: I.G - 5, n: 26, who: p.short, name: "GARY", t0: 0, last: 0, dir: 1, up: true, by: p.id });
    w.L_SNOWMAN.forEach(function (c) { var j = (I.G - 6 - c[0]) * g.gw + 150 + c[1]; w.sandPlace(g, j, I.M.PACKSNOW); g.T[j] = -10; w.heatAccept(g, j); });
    p.wspark = null;
    sim.step(w, 30);
    check(p.wspark === "icepalace", "the snowman's builder did not think of an ice palace (" + p.wspark + ")");
    g.know.icepalace = "TEST";
    check(w.pAirAtHouses(g) < 0 && w.pSnowAbout(g) >= w.P_ISNOW, "(the test wants a freeze with snow about: " + w.pAirAtHouses(g) + "°, " + w.pSnowAbout(g) + " snow)");
    check(w.pPlanIce(g, p), "no ice palace planned in a freeze with snow about");
    var s = sites(g, "icepalace")[0], M = I.M, n = {};
    s.plan.forEach(function (e) { n[e.v] = (n[e.v] || 0) + 1; });
    check(n[M.PACKSNOW] >= 30 && n[M.ICE] >= 10, "it is not packed snow and ice: " + JSON.stringify(n));
    /* (and none when it is warm) */
    w.bRemove(g, g.sites.indexOf(s));
    I.warm(); sim.step(w, 2);
    check(!w.pPlanIce(g, p), "an ice palace was planned in the warm");
  });

  test("ice palace: built of the snow lying about, in under 1500 ticks with three hands and under 2500 with two", function () {
    var I3 = ice(3), I2 = ice(2);
    check(I3.w.pPlanIce(I3.g, I3.g.peasants[0]) && I2.w.pPlanIce(I2.g, I2.g.peasants[0]), "(the test wants it planned)");
    var t3 = iceBuild(I3, 4000), t2 = iceBuild(I2, 4000);
    console.log("      (built in " + t3 + " ticks with three hands, " + t2 + " with two)");
    check(t3 > 0 && t3 < 1500, "three hands took " + t3 + " ticks");
    check(t2 > 0 && t2 < 2500, "two hands took " + t2 + " ticks");
  });

  test("ice palace: it goes up while a pyramid is going up, and the heat melts it, and the village is sorry", function () {
    var I = ice(3), w = I.w, g = I.g, p = g.peasants[0], M = I.M, k;
    /* a pyramid, going up (the great work), far off */
    var plan = [];
    for (k = 0; k < 20; k++) plan.push(w.bE(g, 30 + (k % 5), 120 - (k / 5 | 0), M.BRICK, 0));
    w.bNew(g, "pyramid", p, plan, [30, 116, 34, 120], { wonder: true });
    check(w.wGreats(g).length > 0, "(the test wants a great work going up)");
    g.wPlanT = 0; p.planCD = 0;
    for (k = 0; k < 200 && !sites(g, "icepalace").length; k++) { g.wPlanT = 0; w.wPick(g, p, false); }
    check(sites(g, "icepalace").length === 1, "no ice palace planned while the pyramid was going up");
    check(iceBuild(I, 5000) > 0, "the ice palace was not built while the pyramid was going up");
    var s = sites(g, "icepalace")[0];
    check(s.done, "(the test wants it done)");
    /* the thaw */
    var said = 0;
    for (var t = 0; t < 30000 && sites(g, "icepalace").length; t += 30) {
      I.warm(); sim.step(w, 30);
      g.peasants.forEach(function (q) { if (q.say && w.P_SAY.iceGone.indexOf(q.say) >= 0) said++; });
    }
    check(!sites(g, "icepalace").length, "it never melted (" + w.pIceLeft(g, s) + " of " + s.cells + " left)");
    check(said > 0, "nobody was sorry");
    check(g.feed.some(function (f) { return /ice palace has melted/.test(f.text); }) || said > 0, "no news of it");
    /* the next freeze: again */
    I.freeze(); sim.step(w, 30); I.freeze();
    for (k = 0; k < 4000 && w.pSnowAbout(g) < w.P_ISNOW; k++) { var x = 100 + (k % 140), G = w.mGround(g, x); if (G > 10) { var j = (G - 1) * g.gw + x; if (g.m[j] === M.EMPTY) { w.sandPlace(g, j, M.SNOW); g.T[j] = -10; w.heatAccept(g, j); } } }
    g.sites.filter(function (t) { return t.kind === "pyramid" || t.kind === "quarry"; }).forEach(function (t) { w.bRemove(g, g.sites.indexOf(t)); });
    for (k = 0; k < 200 && !sites(g, "icepalace").length; k++) { g.wPlanT = 0; g.wNo = {}; p.task = null; p.planCD = 0; p.hunger = 0; p.cold = 0; w.wPick(g, p, false); }
    check(sites(g, "icepalace").length === 1, "it was not planned again at the next freeze (" + w.pAirAtHouses(g).toFixed(1) + "°, " + w.pSnowAbout(g) + " snow, plan says " + w.pPlanIce(g, p) + ")");
    check(iceBuild(I, 6000) > 0, "it was not built again");
    check(g.got.iceagain, "no news of building it again");
  });
};
