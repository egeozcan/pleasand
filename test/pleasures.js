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
};
