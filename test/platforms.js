/* =====================================================================
   PLEASAND  --  test/platforms.js

   no ground left and no roof that will take a floor (platforms.js,
   docs/platforms-plan.md): a deck high on trestle legs, a ladder up to
   it, and a house on top. and TRESTLE, the legs, which anybody can
   paint. required by test/run.js
   ===================================================================== */
"use strict";
var H = require("../harness");

module.exports = function (test, check, sim) {
  function know(g, list) { list.forEach(function (k) { g.know[k] = "TEST"; }); }
  function sites(g, kind) { return g.sites.filter(function (s) { return s.kind === kind; }); }
  function btask(site) { return { kind: "build", site: site, t: 0, act: 0, idle: 0, wait: 0 }; }
  /* a valley that has thought of platforms, and a deck planned (not built) for p, near where p stands */
  function planned(seed) {
    var w = sim.load(seed || 1), g = w.g, p = g.peasants[0];
    know(g, ["farm", "masonry", "storey", "deck"]);
    p.logs = 20; p.home = 0;
    g.sites.forEach(function (s) { if (s.owner === p.id) s.owner = 0; });
    var r = w.plFind(g, Math.floor(p.x));
    check(r, "(the test wants somewhere for a deck near " + p.name + ")");
    var s = w.plCommit(g, p, r);
    return { w: w, g: g, p: p, r: r, s: s };
  }
  /* and built at once, with its house on it built too */
  function decked(seed) {
    var C = planned(seed), w = C.w, g = C.g;
    sim.build(w, C.s); w.bFinish(g, C.s, C.p);
    C.h = w.bSite(g, C.s.house);
    check(C.h && C.h.deck === C.s.id, "(no house planned on the finished deck)");
    sim.build(w, C.h); w.bFinish(g, C.h, C.p);
    g.peasants.forEach(function (o) { if (o.task && o.task.kind === "build") o.task = null; });
    return C;
  }
  /* the row of the first thing under (x, y) a peasant's feet would stop on */
  function ground(w, g, x, y) { while (y < g.gh - 1 && !w.pSolid(g, x, y + 1)) y++; return y; }

  test("platforms: TRESTLE holds sand and water up, is walked through, burns, and is in MORE under BUILDING", function () {
    var w = sim.load(2), g = w.g, M = w.MAT, x0 = 60, y = 40, x;
    for (x = x0; x < x0 + 12; x++) for (var yy = y; yy < y + 2; yy++) { w.sandPlace(g, yy * g.gw + x, M.EMPTY); w.sandSet(g, yy * g.gw + x, M.TRESTLE); }
    w.sandSet(g, (y - 6) * g.gw + x0 + 3, M.SAND); w.sandSet(g, (y - 6) * g.gw + x0 + 8, M.WATER);
    /* (and nothing under it, in a row of its own, to catch what comes through) */
    for (x = x0; x < x0 + 12; x++) w.sandPlace(g, (y + 2) * g.gw + x, M.EMPTY);
    var through = 0;
    for (var t = 0; t < 60; t++) { sim.step(w, 1); for (x = x0 + 1; x < x0 + 11; x++) if (g.m[(y + 2) * g.gw + x] === M.SAND || g.m[(y + 2) * g.gw + x] === M.WATER) through++; }
    var sand = false;
    for (x = x0; x < x0 + 12; x++) if (g.m[(y - 1) * g.gw + x] === M.SAND) sand = true;
    check(sand, "the sand did not settle on the trestle");
    check(!through, "sand or water came through the trestle");
    check(w.P_PASS[M.TRESTLE] && w.WOODY[M.TRESTLE] && w.P_FLAM[M.TRESTLE] && w.B_COST[M.TRESTLE] === 0.5, "a trestle is not walked through, wooden, flammable and half a board");
    var pick = w.PICK.filter(function (q) { return q.m === M.TRESTLE; })[0];
    check(pick && pick.more === "build" && w.MAT_NAME[M.TRESTLE] === "TRESTLE", "TRESTLE is not in MORE, under BUILDING");
  });

  test("platforms: a plain village never thinks of it, and never writes a deck", function () {
    var h = H.open({ seed: 3 }), g = h.g;
    for (var t = 0; t < 20000; t += 400) {
      h.step(400);
      check(!h._eval("plReady")(g), "PLATFORMS ready without STOREYS at " + g.tick);
      check(!g.know.deck && !g.sites.some(function (s) { return s.kind === "deck"; }), "a deck in a plain village at " + g.tick);
    }
  });

  test("platforms: a deck clears a roof by three rows and anything stood on by twelve; its legs and ladder are in bounds", function () {
    [1, 3, 7, 11].forEach(function (seed) {
      var w = sim.load(seed), g = w.g, n = 0;
      for (var xa = 10; xa < g.gw - 40; xa += 7) for (var d = -1; d <= 1; d += 2) for (var ins = 0; ins < 2; ins++) {
        var r = w.plPlan(g, xa, 23, d, !!ins);
        if (!r) continue;
        n++;
        for (var x = r.xa; x <= r.xb; x++) {
          var t = w.plTop(g, x, 10);
          check(t && t.y - r.P >= t.clear, "seed " + seed + ": the deck at " + r.xa + " is " + (t.y - r.P) + " rows over column " + x + ", wants " + t.clear);
        }
        check(r.fy - r.P <= w.PL_LAD, "seed " + seed + ": a ladder of " + (r.fy - r.P) + " rows");
        r.legs.forEach(function (L) { check(L.gy - r.P - 1 <= w.PL_LEG, "seed " + seed + ": a leg of " + (L.gy - r.P - 1) + " rows"); });
        check(r.inside ? (r.d > 0 ? r.lad === r.xb - 1 : r.lad === r.xa + 1) : (r.d > 0 ? r.lad === r.xb + 2 : r.lad === r.xa - 2), "a ladder not at the deck's end");
      }
      check(n > 0, "seed " + seed + ": nowhere for a deck in an open valley");
    });
  });

  test("platforms: a homeless peasant crowded out of the ground and the roofs builds a deck, then a house on it", function () {
    var C = planned(1), w = C.w, g = C.g, p = C.p, s = C.s;
    check(s.owner === p.id && s.P === C.r.P && s.lad === C.r.lad, "the deck is not p's, or not where it was planned");
    for (var t = 0; t < 40000 && !s.done; t += 50) {
      for (var u = 0; u < 50 && !s.done; u++) {
        p.hunger = 0; p.tired = 0; p.logs = Math.max(p.logs || 0, 10); p.cold = 0;
        if (!p.task || p.task.kind !== "build" || p.task.site !== s.id) p.task = btask(s.id);
        sim.step(w, 1);
      }
    }
    check(s.done, "the deck was never finished: " + Math.round(w.bShare(g, s) * 100) + "% up after 40000 ticks");
    check(s.plan.every(function (e) { return w.bOk(g, e); }), "the deck is not all there");
    var h = w.bSite(g, s.house);
    check(h && h.kind === "house" && h.deck === s.id && h.F === s.P && h.owner === p.id, "no house on it for its builder");
    check(!h.plan.some(function (e) { return ((e.i / g.gw) | 0) === s.P; }), "the house on the deck has a floor of its own");
    check(!g.got.stilts, "a house on stilts noticed before it is built");
    sim.build(w, h); w.bFinish(g, h, p);
    check(g.got.stilts, "nobody noticed the first house on stilts");
  });

  test("platforms: the house's owner climbs up to it and sleeps in its bed, and gets down again", function () {
    [1, 7].forEach(function (seed) {
      var C = decked(seed), w = C.w, g = C.g, p = C.p, h = C.h, s = C.s;
      check(w.bHome(g, p) === h, "(its owner does not live in it)");
      /* put down on the ground, well off from the deck, and sent to bed */
      p.x = (s.d > 0 ? s.xb + 8 : s.xa - 8) + 0.5; p.y = ground(w, g, Math.floor(p.x), 10); p.vx = p.vy = 0; p.climb = null; p.state = "walk";
      p.sleep = 0; p.hunger = 0; p.task = { kind: "sleep", t: 0 };
      var got = false, on = 0;
      for (var t = 0; t < 3000 && !got; t++) {
        sim.step(w, 1); p.hunger = 0;
        on = p.climb ? on + 1 : 0;
        check(on < 1500, p.name + " has been on the ladder for 1500 ticks");
        if (p.sleep > 0 && p.inBed && w.bInside(h, p)) got = true;
      }
      check(got, "seed " + seed + ": " + p.name + " never got into bed on the deck: at " + p.x.toFixed(1) + "," + p.y.toFixed(1) + " " + (p.task && p.task.kind));
      /* woken, and sent down to the ground the far side */
      p.sleep = 0; p.inBed = false; p.tired = 0;
      var gx = s.d > 0 ? s.xa - 10 : s.xb + 10, gy = ground(w, g, gx, 10), down = false, off = false, climbed = false;
      p.task = { kind: "explore", x: gx, y: gy, t: 0, high: 0 };
      for (t = 0; t < 3000 && !down; t++) {
        var was = Math.abs(p.y - (s.P - 1)) < 0.6 && !p.climb;
        sim.step(w, 1); p.hunger = 0;
        if (was && p.falling && !p.climb) off = true;
        if (p.climb && !climbed) climbed = t + ":" + Math.floor(p.x) + "," + Math.floor(p.y) + " ladder " + p.climb.x;
        if (p.y > s.P + 3 && !p.climb && !p.falling && Math.abs(p.x - gx) < 4) down = true;
      }
      check(down, "seed " + seed + ": " + p.name + " never got down: at " + p.x.toFixed(1) + "," + p.y.toFixed(1));
    });
  });

  test("platforms: a deck is not planned while a storey or another deck is going up, nor by somebody with a home", function () {
    var C = planned(1), w = C.w, g = C.g, q = g.peasants[1];
    q.home = 0; q.logs = 20; q.planCD = 0; g.noStoreyT = g.tick; g.noPlotT = g.tick;
    g.sites.forEach(function (o) { if (o.owner === q.id) o.owner = 0; });
    check(!w.plTry(g, q), "a second deck was planned while the first is going up");
    w.bRemove(g, g.sites.indexOf(C.s));
    var crowded = w.sCrowded(g);
    if (crowded) check(w.plTry(g, q), "nothing planned with the first deck gone");
  });

  test("platforms: no campfire, sapling or heap under a deck; a roof just under one is not swept", function () {
    var C = decked(7), w = C.w, g = C.g, s = C.s, p = g.peasants[2];
    var x = Math.floor((s.xa + s.xb) / 2), fy = ground(w, g, x, s.P + 1);
    p.x = x + 0.5; p.y = fy;
    check(!w.pCampOk(g, p, x, fy), "a campfire under the deck");
    check(!w.bPlantOk(g, x, fy, false) && !w.bPlantOk(g, x, fy, true), "a sapling under the deck");
    check(!w.tHeapOk(g, x, fy + 1, 2), "a heap under the deck");
    var fake = { kind: "house", x0: s.xa, x1: s.xa + 10, y0: s.P + 4 };
    check(w.plOverRoof(g, fake) && w.tNoSweep(fake, g), "a roof four rows under the deck would be swept");
  });

  test("platforms: a deck's owner does not go over the hills while it goes up, nor while it waits for its house", function () {
    var C = planned(1), w = C.w, g = C.g;
    check(w.sAnyHome(g), "a deck going up is no home coming");
    sim.build(w, C.s); C.s.done = true;
    check(w.sAnyHome(g), "a finished deck with no house on it is no home coming");
  });

  test("platforms: a deck with a house on it, mostly burnt, is mended, not given up; one given up takes its house with it", function () {
    var C = decked(7), w = C.w, g = C.g, s = C.s, h = C.h, p = C.p;
    s.plan.forEach(function (e) { if (e.v === w.MAT.TRESTLE || e.v === w.MAT.LADDER) w.sandSet(g, e.i, w.MAT.EMPTY); });
    w.bInspect(g, s, g.sites.indexOf(s));
    check(w.bSite(g, s.id) && s.repair, "a deck carrying a house was given up, or not opened for repairs");
    /* (and nobody able to get to it to mend it, time after time, does not give it up either: its house is on it) */
    for (var f = 0; f < 30; f++) { w.bFail(g, p, s, 10, "walk"); w.bFail(g, p, s, 10, "nothing"); }
    s.last = g.tick - 30000; sim.step(w, 30);
    check(w.bSite(g, s.id) && w.bSite(g, h.id), "a deck carrying a house, that nobody could get to, was given up");
    /* a deck given up before its house is done */
    var D = planned(7);
    sim.build(D.w, D.s); D.w.bFinish(D.g, D.s, D.p);
    var hh = D.w.bSite(D.g, D.s.house);
    check(hh && !hh.done, "(the test wants the house half up)");
    D.w.bRemove(D.g, D.g.sites.indexOf(D.s));
    for (var t = 0; t < 60; t++) sim.step(D.w, 1);
    check(!D.w.bSite(D.g, hh.id), "the house on a deck that is gone is still there");
  });

  test("platforms: the storeys' fire rule covers a deck's ladder: fire at its foot makes it hot, and a climber on it is on it", function () {
    var C = decked(7), w = C.w, g = C.g, s = C.s;
    check(w.sIsLadder(g, s.lad), "the deck's ladder is not a ladder the storeys' fire rule knows");
    var fy = s.fy;
    for (var k = -1; k <= 1; k++) w.sandSet(g, (fy - 2) * g.gw + s.lad + k, w.MAT.FIRE);
    check(w.sLadderHot(g, s.lad), "the deck's ladder with fire on it is not hot");
    check(w.sOnLadder(g, s.lad, s.P + 4), "a climber on the deck's ladder is not on it");
  });

  test("platforms: saved and loaded with a deck going up, a village goes on as it would have", function () {
    var h = H.open({ seed: 1 }), g = h.g, G = h.game;
    h.step(200);
    ["farm", "masonry", "storey", "deck"].forEach(function (k) { g.know[k] = "TEST"; });
    var p = g.peasants[0]; p.logs = 20; p.home = 0;
    g.sites.forEach(function (o) { if (o.owner === p.id) o.owner = 0; });
    var r = G.plFind(g, Math.floor(p.x));
    check(r, "(no deck)");
    var s = G.plCommit(g, p, r);
    h.step(600);
    check(!s.done, "(the test wants the deck half up)");
    var doc = h.saveDoc();
    var a = H.open({ seed: 1 }); a.load(doc); a.step(600);
    h.step(600);
    check(a.hash() === h.hash(), "the loaded village went on otherwise: " + a.hash() + " against " + h.hash());
  });

  test("platforms: the high street: a deck planned beside a finished one is run on from it, at its row, with no ladder, and is got to up the first one's", function () {
    var C = decked(7), w = C.w, g = C.g, s = C.s, q = g.peasants[1];
    q.home = 0; q.logs = 30; q.planCD = 0;
    g.sites.forEach(function (o) { if (o.owner === q.id) o.owner = 0; });
    var r = w.plFind(g, Math.floor(s.cx));
    check(r && r.join === s.id, "the next deck was not run on from the first: " + JSON.stringify(r && [r.xa, r.xb, r.P, r.join]));
    check(r.P === s.P && r.lad === -1 && (r.grow > 0 ? r.xa === s.xb + 1 : r.xb === s.xa - 1), "not at its row, or not against its end, or with a ladder");
    var t = w.plCommit(g, q, r);
    check(t.x0 === r.xa && t.x1 === r.xb && t.y0 === r.P, "the joined deck's box is not its span: " + JSON.stringify([t.x0, t.y0, t.x1, t.y1]));
    check(!t.plan.some(function (e) { return e.v === w.MAT.LADDER; }), "the joined deck has a ladder");
    sim.build(w, t); w.bFinish(g, t, q);
    check(g.got.highstreet && w.plNote(g, t).indexOf("2 PLATFORMS") >= 0, "nobody noticed the high street: " + w.plNote(g, t));
    var h2 = w.bSite(g, t.house);
    check(h2 && h2.owner === q.id, "no house for the joined deck's builder");
    sim.build(w, h2); w.bFinish(g, h2, q);
    g.peasants.forEach(function (o) { if (o.task && o.task.kind === "build") o.task = null; });
    /* home from the ground, past the first deck's ladder */
    q.x = (s.d > 0 ? s.xb + 6 : s.xa - 6) + 0.5; q.y = ground(w, g, Math.floor(q.x), 10); q.climb = null; q.state = "walk";
    q.sleep = 0; q.hunger = 0; q.task = { kind: "sleep", t: 0 };
    var got = false;
    for (var k = 0; k < 3000 && !got; k++) { sim.step(w, 1); q.hunger = 0; if (q.sleep > 0 && q.inBed && w.bInside(h2, q)) got = true; }
    check(got, q.name + " never got into bed on the second deck: at " + q.x.toFixed(1) + "," + q.y.toFixed(1));
  });

  test("platforms: under the boards: somebody with no home sleeps under a deck, and wakes without a backache or an idea of sleeping rough", function () {
    var C = decked(7), w = C.w, g = C.g, s = C.s, q = g.peasants[3];
    q.home = 0; g.sites.forEach(function (o) { if (o.owner === q.id) o.owner = 0; });
    q.x = (s.xa + s.xb) / 2 + 0.5; q.y = ground(w, g, Math.floor(q.x), s.P + 1); q.climb = null; q.state = "walk";
    q.x += 20; q.y = ground(w, g, Math.floor(q.x), 10);
    q.sleep = 0; q.hunger = 0; q.task = { kind: "sleep", t: 0 };
    var under = false;
    for (var k = 0; k < 2000 && !under; k++) { sim.step(w, 1); q.hunger = 0; if (q.sleep > 0 && q.underDeck) under = true; }
    check(under, q.name + " never lay down under the deck: at " + q.x.toFixed(1) + "," + q.y.toFixed(1));
    check(q.x >= s.xa && q.x <= s.xb + 1 && q.y > s.P + 9, "asleep under it, but not under it: " + q.x.toFixed(1) + "," + q.y.toFixed(1));
    q.wspark = null;
    for (k = 0; k < 3000 && q.sleep > 0; k++) { sim.step(w, 1); q.hunger = 0; }
    check(!(q.sleep > 0), "(the test wants them awake)");
    check(!q.underDeck && !q.wspark, "woke under the deck still under it, or with a rough sleeper's idea");
    check(w.P_SAY.underWake.indexOf(q.say) >= 0, "woke under the deck and said \"" + q.say + "\", not one of the under-the-boards lines");
  });

  test("platforms: a deck the high street runs on from is kept, and mended, when its own house goes: the houses along it have no other way up", function () {
    var C = decked(7), w = C.w, g = C.g, s = C.s, q = g.peasants[1];
    q.home = 0; q.logs = 30; q.planCD = 0;
    g.sites.forEach(function (o) { if (o.owner === q.id) o.owner = 0; });
    var t = w.plCommit(g, q, w.plFind(g, Math.floor(s.cx)));
    sim.build(w, t); w.bFinish(g, t, q);
    var h2 = w.bSite(g, t.house); sim.build(w, h2); w.bFinish(g, h2, q);
    g.peasants.forEach(function (o) { if (o.task && o.task.kind === "build") o.task = null; });
    var h1 = w.bSite(g, s.house);
    if (h1) w.bRemove(g, g.sites.indexOf(h1));
    s.plan.forEach(function (e) { w.sandSet(g, e.i, w.MAT.EMPTY); });
    w.bInspect(g, s, g.sites.indexOf(s));
    check(w.bSite(g, s.id) && w.plCarries(g, s), "the first deck, burnt with its house, was given up under the second one's house");
    for (var k = 0; k < 30; k++) w.bFail(g, s, q, "walk");
    check(w.bSite(g, s.id), "given up on bFail");
  });

  test("platforms: a ladder or a leg does not go down through a crop or wheat: nobody digs those out, and the rung would never go in", function () {
    var C = decked(7), w = C.w, g = C.g, s = C.s, x = s.lad, y = s.P + 3;
    w.bRemove(g, g.sites.indexOf(s));
    for (var yy = s.P; yy < g.gh - 1; yy++) if (g.m[yy * g.gw + x] === w.MAT.LADDER || g.m[yy * g.gw + x] === w.MAT.TRESTLE) w.sandSet(g, yy * g.gw + x, w.MAT.EMPTY);
    check(w.plFoot(g, x, s.P + 1, 40) >= 0, "(the test wants a ladder column with ground under it)");
    w.sandSet(g, y * g.gw + x, w.MAT.WHEAT);
    check(w.plFoot(g, x, s.P + 1, 40) === -1, "a column through wheat has a foot");
    w.sandSet(g, y * g.gw + x, w.MAT.PLANT);
    check(w.plFoot(g, x, s.P + 1, 40) >= 0, "a column through a bush has no foot");
  });

  test("platforms: the high street steps: a deck run on from another a row or three up from it, with a riser, is walked up to bed", function () {
    var C = decked(7), w = C.w, g = C.g, s = C.s, q = g.peasants[1];
    q.home = 0; q.logs = 30; q.planCD = 0;
    g.sites.forEach(function (o) { if (o.owner === q.id) o.owner = 0; });
    var grow = w.plGrow(s), xm = grow > 0 ? s.xb + 8 : s.xa - 8;
    /* (a stack of rock under the next stretch along, so a deck there must be two rows higher than this one) */
    var top = s.P + 12 - 2, y;
    for (var x = xm; x <= xm + 1; x++) for (y = top; y < g.gh - 1 && !w.pSolid(g, x, y); y++) w.sandSet(g, y * g.gw + x, w.MAT.STONE);
    var r = w.plFind(g, Math.floor(s.cx));
    check(r && r.join === s.id, "not run on: " + JSON.stringify(r && [r.xa, r.xb, r.P, r.join]));
    check(r.P === s.P - 2 && r.rise && r.rise.length === 2, "not two rows up with a riser: P " + r.P + " vs " + s.P + ", rise " + JSON.stringify(r.rise));
    var t = w.plCommit(g, q, r);
    sim.build(w, t); w.bFinish(g, t, q);
    var h2 = w.bSite(g, t.house); sim.build(w, h2); w.bFinish(g, h2, q);
    g.peasants.forEach(function (o) { if (o.task && o.task.kind === "build") o.task = null; });
    q.x = (s.d > 0 ? s.xb + 6 : s.xa - 6) + 0.5; q.y = ground(w, g, Math.floor(q.x), 10); q.climb = null; q.state = "walk";
    q.sleep = 0; q.hunger = 0; q.task = { kind: "sleep", t: 0 };
    var got = false;
    for (var k = 0; k < 3000 && !got; k++) { sim.step(w, 1); q.hunger = 0; if (q.sleep > 0 && q.inBed && w.bInside(h2, q)) got = true; }
    check(got, q.name + " never got up the step into bed: at " + q.x.toFixed(1) + "," + q.y.toFixed(1));
  });

  test("platforms: the high street hops: a deck run on from another six rows up has a short ladder between them, built by the village, and walked up and down", function () {
    var C = decked(7), w = C.w, g = C.g, s = C.s, q = g.peasants[1];
    q.home = 0; q.logs = 30; q.planCD = 0;
    g.sites.forEach(function (o) { if (o.owner === q.id) o.owner = 0; });
    var xm = w.plGrow(s) > 0 ? s.xb + 8 : s.xa - 8, y;
    for (var x = xm; x <= xm + 1; x++) for (y = s.P + 12 - 6; y < g.gh - 1 && !w.pSolid(g, x, y); y++) w.sandSet(g, y * g.gw + x, w.MAT.STONE);
    var r = w.plFind(g, Math.floor(s.cx));
    check(r && r.join === s.id && r.P === s.P - 6 && r.jl && !r.jl.hang, "not run on six rows up with a ladder: " + JSON.stringify(r && [r.P, s.P, r.jl]));
    var t = w.plCommit(g, q, r);
    check(t.plan.filter(function (e) { return e.v === w.MAT.LADDER; }).length === 18, "the ladder between them is not three columns of six rungs");
    for (var k = 0; k < 20000 && !t.done; k += 50) sim.step(w, 50);
    check(t.done, "the village did not build it: " + t.plan.filter(function (e) { return !w.bOk(g, e); }).length + " cells left");
    var h2 = w.bSite(g, t.house); if (h2 && !h2.done) { sim.build(w, h2); w.bFinish(g, h2, q); }
    g.peasants.forEach(function (o) { if (o.task && o.task.kind === "build") o.task = null; });
    q.x = (s.d > 0 ? s.xb + 6 : s.xa - 6) + 0.5; q.y = ground(w, g, Math.floor(q.x), 10); q.climb = null; q.state = "walk";
    q.sleep = 0; q.hunger = 0; q.task = { kind: "sleep", t: 0 };
    var got = false;
    for (k = 0; k < 4000 && !got; k++) { sim.step(w, 1); q.hunger = 0; if (q.sleep > 0 && q.inBed && w.bInside(h2, q)) got = true; }
    check(got, q.name + " never got up to bed: at " + q.x.toFixed(1) + "," + q.y.toFixed(1));
    q.sleep = 0; q.inBed = false; q.task = null;
    var down = false;
    for (k = 0; k < 4000 && !down; k++) { sim.step(w, 1); q.hunger = 0; q.tired = 0; if (q.y > s.P + 5 && !q.climb) down = true; }
    check(down, q.name + " never came down: at " + q.x.toFixed(1) + "," + q.y.toFixed(1));
  });

  test("platforms: a ladder burnt down into a heap of ash is put back from the top of the heap, and the house on the deck is got to again", function () {
    var C = decked(1), w = C.w, g = C.g, s = C.s, p = C.p, x, y;
    check(s.lad >= 0, "(the test wants a deck with a ladder of its own)");
    /* the ladder gone, and ash heaped over its foot: seven rows of it (and then it slumps) */
    s.plan.forEach(function (e) { if (e.v === w.MAT.LADDER) w.sandSet(g, e.i, w.MAT.EMPTY); });
    for (x = s.lad - 3; x <= s.lad + 3; x++) for (y = s.fy - 6; y <= s.fy; y++) if (!w.pSolid(g, x, y)) w.sandSet(g, y * g.gw + x, w.MAT.ASH);
    w.bInspect(g, s, g.sites.indexOf(s));
    check(!s.done, "(the deck was not reopened for its ladder)");
    for (var k = 0; k < 20000 && !s.done; k += 50) sim.step(w, 50);
    check(s.done, "the ladder was never put back: " + s.plan.filter(function (e) { return !w.bOk(g, e); }).length + " left, foot at " + s.fy);
    check(!s.plan.some(function (e) { return e.v === w.MAT.LADDER && g.m[e.i] !== w.MAT.LADDER; }), "a rung of it is not back");
    g.peasants.forEach(function (o) { if (o.task && o.task.kind === "build") o.task = null; });
    p.x = s.lad + 6.5; p.y = ground(w, g, Math.floor(p.x), 10); p.climb = null; p.state = "walk";
    p.sleep = 0; p.hunger = 0; p.task = { kind: "sleep", t: 0 };
    var got = false;
    for (k = 0; k < 4000 && !got; k++) { sim.step(w, 1); p.hunger = 0; if (p.sleep > 0 && p.inBed && w.bInside(C.h, p)) got = true; }
    check(got, p.name + " never got back up to bed: at " + p.x.toFixed(1) + "," + p.y.toFixed(1));
  });

  test("platforms: the high street hops down too: a deck six rows under the last is reached by a ladder hung from its end, built from the top", function () {
    var C = decked(7), w = C.w, g = C.g, s = C.s, q = g.peasants[1];
    q.home = 0; q.logs = 30; q.planCD = 0;
    g.sites.forEach(function (o) { if (o.owner === q.id) o.owner = 0; });
    var gr = w.plGrow(s), xa = gr > 0 ? s.xb + 1 : s.xa - 19;
    var r = w.plJoinAt(g, s, xa, xa + 18, s.P + 6, gr);
    check(r && r.jl && r.jl.hang && r.jl.top === s.P && r.jl.bot === s.P + 5, "no hung ladder: " + JSON.stringify(r && r.jl) + " " + w.PL_WHY);
    var t = w.plCommit(g, q, r);
    for (var k = 0; k < 20000 && !t.done; k += 50) sim.step(w, 50);
    check(t.done, "the village did not build it: " + t.plan.filter(function (e) { return !w.bOk(g, e); }).length + " cells left");
    var h2 = w.bSite(g, t.house);
    check(h2 && h2.owner === q.id, "(the test wants the house on it to be " + q.name + "'s)");
    if (!h2.done) { sim.build(w, h2); w.bFinish(g, h2, q); }
    g.peasants.forEach(function (o) { if (o.task && o.task.kind === "build") o.task = null; });
    q.x = (s.d > 0 ? s.xb + 6 : s.xa - 6) + 0.5; q.y = ground(w, g, Math.floor(q.x), 10); q.climb = null; q.state = "walk";
    q.sleep = 0; q.hunger = 0; q.task = { kind: "sleep", t: 0 };
    var got = false;
    for (k = 0; k < 4000 && !got; k++) { sim.step(w, 1); q.hunger = 0; if (q.sleep > 0 && q.inBed && w.bInside(h2, q)) got = true; }
    check(got, q.name + " never got down to bed: at " + q.x.toFixed(1) + "," + q.y.toFixed(1));
  });

  test("platforms: a deep heap over a deck's ladder: the ladder is put back through it, and again down to the ground when it is cleared", function () {
    var C = decked(3), w = C.w, g = C.g, s = C.s, p = C.p, x, y, k;
    var rungs = function () { return s.plan.filter(function (e) { return e.v === w.MAT.LADDER && g.m[e.i] !== w.MAT.LADDER; }).length; };
    s.plan.forEach(function (e) { if (e.v === w.MAT.LADDER) w.sandSet(g, e.i, w.MAT.EMPTY); });
    var heap = [];
    for (x = s.lad - 2; x <= s.lad + 2; x++) for (y = s.fy - 11; y <= s.fy; y++) if (!w.pSolid(g, x, y)) { w.sandSet(g, y * g.gw + x, w.MAT.STONE); heap.push(y * g.gw + x); }
    /* (packed snow: loose, dug like sand, but it stands up on its own) */
    heap.forEach(function (i) { g.m[i] = w.MAT.PACKSNOW; });
    w.bInspect(g, s, g.sites.indexOf(s));
    for (k = 0; k < 20000 && !s.done; k += 50) sim.step(w, 50);
    check(s.done, "the ladder was not put back over the heap: " + rungs() + " rungs missing, column " + (function () { var o = []; for (var yy = s.P; yy <= s.fy + 1; yy++) o.push(yy + ":" + g.m[yy * g.gw + s.lad]); return o.join(" "); })());
    /* the heap cleared away */
    heap.forEach(function (i) { if (g.m[i] === w.MAT.PACKSNOW) w.sandSet(g, i, w.MAT.EMPTY); });
    for (k = 0; k < 20000 && (rungs() > 0 || !s.done); k += 50) sim.step(w, 50);
    check(rungs() === 0 && s.done, rungs() + " rungs never put back after the heap went");
    g.peasants.forEach(function (o) { if (o.task && o.task.kind === "build") o.task = null; });
    p.x = s.lad - 6 * s.d + 0.5; p.y = ground(w, g, Math.floor(p.x), 10); p.climb = null; p.state = "walk";
    p.sleep = 0; p.hunger = 0; p.task = { kind: "sleep", t: 0 };
    var got = false;
    for (k = 0; k < 4000 && !got; k++) { sim.step(w, 1); p.hunger = 0; if (p.sleep > 0 && p.inBed && w.bInside(C.h, p)) got = true; }
    check(got, p.name + " never got up to bed from the ground: at " + p.x.toFixed(1) + "," + p.y.toFixed(1));
  });
};
