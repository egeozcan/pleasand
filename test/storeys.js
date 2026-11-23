/* =====================================================================
   PLEASAND  --  test/storeys.js

   a crowded valley (storeys.js, docs/storeys-plan.md): a flat on top of
   a house, its gable off and its ladder up, a second one on top of a
   stone one, and who lives in them.
   required by test/run.js
   ===================================================================== */
"use strict";
var H = require("../harness");

module.exports = function (test, check, sim) {
  function know(g, list) { list.forEach(function (k) { g.know[k] = "TEST"; }); }
  function sites(g, kind) { return g.sites.filter(function (s) { return s.kind === kind; }); }
  function btask(site) { return { kind: "build", site: site, t: 0, act: 0, idle: 0, wait: 0 }; }
  /* a valley with a finished house of p's, built at once, in plank (or in stone), and a village crowded out of room for
     another: masonry and storeys known, and q homeless, with the wood for a flat */
  function crowded(seed, stone) {
    var w = sim.load(seed || 1), g = w.g, p = g.peasants[0], q = g.peasants[1];
    p.logs = 20;
    if (stone) { know(g, ["masonry"]); g.peasants.forEach(function (o) { o.stone = 24; }); }
    check(w.bPlanHouse(g, p), "(the test wants somewhere for a house)");
    var h = sites(g, "house").filter(function (s) { return !s.hut && s.owner === p.id; })[0];
    sim.build(w, h); w.bFinish(g, h, p);
    know(g, ["farm", "masonry", "storey"]);
    q.home = 0; q.logs = 20; q.planCD = 0;
    g.sites.forEach(function (s) { if (s.owner === q.id) s.owner = 0; });
    g.noPlotT = g.tick;
    return { w: w, g: g, p: p, q: q, h: h };
  }
  test("storeys: a homeless peasant with nowhere for a house puts a flat on top of one: the gable off, the ladder, the walls, the roof, a bed", function () {
    var C = crowded(1), w = C.w, g = C.g, h = C.h, q = C.q, x0 = h.x0, F = h.F, gw = g.gw;
    var ceiling = []; for (var x = x0; x <= x0 + 10; x++) ceiling.push((F - 11) * gw + x);
    check(w.sReady(g), "STOREYS is not ready in a crowded village that knows masonry");
    check(w.sTry(g, q), "no storey was planned");
    var s = sites(g, "storey")[0];
    check(s && s.base === h.id && s.F === F - 11 && s.owner === q.id, "the storey is not on the house: " + JSON.stringify(s && [s.base, s.F, s.owner]));
    check(h.y0 === F - 11 && !h.plan.some(function (e) { return ((e.i / gw) | 0) < F - 11; }), "the house kept its gable in its plan");
    check(s.plan.filter(function (e) { return e.strip; }).length === 15, "the gable to strip is " + s.plan.filter(function (e) { return e.strip; }).length + " cells, not 15");
    var repaired = false;
    for (var t = 0; t < 30000 && !s.done; t += 50) {
      for (var u = 0; u < 50 && !s.done; u++) {
        q.hunger = 0; q.tired = 0; q.logs = Math.max(q.logs || 0, 10);
        if (!q.task || q.task.kind !== "build" || q.task.site !== s.id) q.task = btask(s.id);
        sim.step(w, 1);
        if (h.repair || !h.done) repaired = true;
        ceiling.forEach(function (i) { if (g.m[i] !== w.MAT.PLANK) repaired = "ceiling " + (i % gw) + " is " + g.m[i]; });
      }
    }
    check(s.done, "the storey was never finished: " + Math.round(w.bShare(g, s) * 100) + "% up after 30000 ticks");
    check(!repaired, "the house under it was opened up: " + repaired);
    check(w.bHome(g, q) === s, "its owner does not live in it");
    var ok = s.plan.every(function (e) { return w.bOk(g, e); });
    check(ok, "the storey is not all there");
    check(g.got.upstairs, "nobody noticed the first flat");
  });

  test("storeys: a plank house bears one storey and no more; stone and stone bear a second, up the other end", function () {
    var C = crowded(1), w = C.w, g = C.g, h = C.h, q = C.q;
    check(w.sBears(g, h), "a plank house will not take a storey");
    check(w.sTry(g, q), "no storey was planned");
    var s = sites(g, "storey")[0];
    sim.build(w, s); w.bFinish(g, s, q);
    check(!w.sBears(g, h), "a plank house and a plank storey would take a second");
    /* done over in stone, both of them */
    [h, s].forEach(function (f) { f.plan.forEach(function (e) { if (e.v === w.MAT.PLANK && e.a !== 1) { e.v = w.MAT.BRICK; w.sandSet(g, e.i, w.MAT.BRICK); } }); });
    check(w.sStony(g, h) && w.sStony(g, s), "(the test wants both floors stone)");
    check(w.sBears(g, h), "a stone house and a stone storey will not take a second");
    var r = g.peasants[2]; r.home = 0; r.logs = 20; r.planCD = 0;
    g.sites.forEach(function (o) { if (o.owner === r.id) o.owner = 0; });
    check(w.sTry(g, r), "no second storey was planned");
    var s2 = sites(g, "storey").filter(function (o) { return o !== s; })[0];
    check(s2.base === s.id && s2.d === -s.d && s2.F === s.F - 11 && s2.floor === 3, "the second storey is not over the first, up the other end: " + JSON.stringify([s2.base, s2.d, s.d, s2.F, s2.floor]));
    sim.build(w, s2); w.bFinish(g, s2, r);
    check(!w.sBears(g, h), "a stack of three would take a fourth");
    check(g.got.threeup, "nobody noticed three floors");
    /* one brick re-laid in a plank house is not a stone house */
    var D = crowded(3), hd = D.h, e = hd.plan.filter(function (o) { return o.v === D.w.MAT.PLANK && o.a !== 1; })[0];
    D.w.sandSet(D.g, e.i, D.w.MAT.BRICK); hd.stone = true;
    check(!D.w.sStony(D.g, hd), "one brick made a plank house stone");
  });

  test("storeys: each storey is got to by its own ladder and door, and its owner sleeps in its bed", function () {
    var C = crowded(1, true), w = C.w, g = C.g, h = C.h, q = C.q;
    check(w.sTry(g, q), "no storey was planned");
    var s = sites(g, "storey")[0];
    sim.build(w, s); w.bFinish(g, s, q);
    var r = g.peasants[2]; r.home = 0; r.logs = 20; r.planCD = 0;
    g.sites.forEach(function (o) { if (o.owner === r.id) o.owner = 0; });
    check(w.sBears(g, h), "(the test wants the stack stone)");
    check(w.sTry(g, r), "no second storey");
    var s2 = sites(g, "storey").filter(function (o) { return o !== s; })[0];
    sim.build(w, s2); w.bFinish(g, s2, r);
    /* both of them from the ground, put down beside the house, to bed */
    [[q, s], [r, s2]].forEach(function (pair) {
      var p = pair[0], f = pair[1];
      p.x = h.x0 - 12 + 0.5; p.y = h.F - 1; p.vx = p.vy = 0; p.climb = null; p.task = null; p.state = "walk";
      while (w.pBody(g, Math.floor(p.x), Math.floor(p.y) + 1) === false && p.y < g.gh - 2) p.y++;
      p.sleep = 0; p.hunger = 0; p.task = { kind: "sleep", t: 0 };
      var got = false, wrong = 0;
      for (var t = 0; t < 1500 && !got; t++) {
        sim.step(w, 1); p.hunger = 0;
        if (p.sleep > 0 && p.inBed && w.bInside(f, p)) got = true;
        var other = f === s ? s2 : s;
        if (w.bInside(other, p) && !p.climb) wrong++;
      }
      check(got, p.name + " never got into bed on floor " + f.floor + ": at " + p.x.toFixed(1) + "," + p.y.toFixed(1) + " " + (p.task && p.task.kind));
      check(wrong < 200, p.name + " spent " + wrong + " ticks in the other flat");
    });
  });

  test("storeys: a plain village never thinks of it before masonry, and never writes a storey", function () {
    var h = H.open({ seed: 3 }), g = h.g, early = false;
    for (var t = 0; t < 20000; t += 200) {
      h.step(200);
      if (!g.know.masonry && h._eval("sReady")(g)) early = true;
      check(!g.know.storey && !g.sites.some(function (s) { return s.kind === "storey"; }), "storeys in a plain village at " + g.tick);
    }
    check(!early, "STOREYS was ready before masonry");
  });

  /* a stack built at once: p's house, q's flat on it (and, stone, r's on that) */
  function stack(seed, two) {
    var C = crowded(seed || 1, two), w = C.w, g = C.g;
    check(w.sTry(g, C.q), "(no storey planned)");
    C.s = sites(g, "storey")[0]; sim.build(w, C.s); w.bFinish(g, C.s, C.q);
    if (two) {
      var r = C.r = g.peasants[2]; r.home = 0; r.logs = 20; r.planCD = 0;
      g.sites.forEach(function (o) { if (o.owner === r.id) o.owner = 0; });
      check(w.sTry(g, r), "(no second storey planned)");
      C.s2 = sites(g, "storey").filter(function (o) { return o !== C.s; })[0]; sim.build(w, C.s2); w.bFinish(g, C.s2, r);
    }
    g.peasants.forEach(function (o) { if (o.task && o.task.kind === "warming") o.task = null; });
    return C;
  }

  test("storeys: water spilt upstairs is bailed, and out of the flat's door it goes: gardyloo", function () {
    var C = stack(1), w = C.w, g = C.g, s = C.s, gw = g.gw, x;
    know(g, ["bucket", "dig"]);
    for (x = s.x0 + 2; x <= s.x0 + 5; x++) w.sandSet(g, (s.F - 1) * gw + x, w.MAT.WATER);   /* (beside the bed, not on it) */
    function wet() { var n = 0; for (var y = s.F - 10; y < s.F; y++) for (var xx = s.ix0; xx <= s.ix1; xx++) if (g.m[y * gw + xx] === w.MAT.WATER) n++; return n; }
    for (var t = 0; t < 8000 && (wet() > 1 || !g.got.gardyloo); t++) sim.step(w, 1);
    check(wet() <= 1, "the flat's floor is still wet: " + wet() + " cells");   /* (a drop or two is left to dry, as on any floor) */
    check(g.got.gardyloo, "nobody threw it out of the door");
  });

  test("storeys: a fire in the house at night wakes the flats over it, and they get out by their ladders", function () {
    var C = stack(1, true), w = C.w, g = C.g, h = C.h, gw = g.gw;
    know(g, ["bucket"]);
    [[C.q, C.s], [C.r, C.s2]].forEach(function (pr) {
      var p = pr[0], f = pr[1]; p.x = f.bed.x + 0.5; p.y = f.bed.y - 1; p.vx = p.vy = 0; p.task = null; p.climb = null; p.sleep = 3000; p.inBed = true;
    });
    for (var x = h.x0 + 1; x <= h.x0 + 3; x++) w.sandSet(g, (h.F - 1) * gw + x, w.MAT.FIRE);
    var woke = {}, out = {};
    for (var t = 0; t < 1500; t++) {
      sim.step(w, 1);
      [[C.q, C.s], [C.r, C.s2]].forEach(function (pr) { var p = pr[0]; if (!p.sleep) woke[p.id] = 1; if (!w.bInside(pr[1], p) && !p.dead) out[p.id] = 1; });
    }
    [C.q, C.r].forEach(function (p) {
      check(woke[p.id], p.name + " slept through the fire under them");
      check(!p.dead, p.name + " died: " + p.cause);
    });
  });

  test("storeys: a new flat gets a housewarming: the neighbours come up and stand about in it", function () {
    var C = crowded(1), w = C.w, g = C.g, q = C.q, p = C.p;
    check(w.sTry(g, q), "(no storey planned)");
    var s = sites(g, "storey")[0]; sim.build(w, s);
    g.peasants.forEach(function (o) { o.task = null; o.sleep = 0; o.hunger = 0; o.x = s.x0 - 8 + (o.id % 6); });
    w.bFinish(g, s, q);
    var guests = g.peasants.filter(function (o) { return o.task && o.task.kind === "warming"; });
    check(guests.length >= 1 && guests.indexOf(p) >= 0, "the neighbour downstairs was not asked up: " + guests.map(function (o) { return o.name; }));
    var inside = 0;
    for (var t = 0; t < 2000; t++) { sim.step(w, 1); p.hunger = 0; if (w.bInside(s, p)) inside++; }
    check(inside > 100, "the neighbour never came up: " + inside + " ticks inside");
  });

  test("storeys: word gets round: a valley that builds up, with everybody housed and fed, gets a newcomer; a hungry one does not", function () {
    function village(hungry) {
      var w = sim.load(1), g = w.g;
      sim.step(w, 200);
      know(g, ["farm", "masonry", "storey"]);
      /* (everybody housed: whoever has no house is let go of, as if they had never come) */
      g.peasants = g.peasants.filter(function (o) { return w.bHome(g, o); });
      g.popGoal = g.peasants.length; g.leanT = g.tick - 7000; g.wordT = null; g.arriveT = 0;
      var n0 = g.peasants.length, got = null;
      for (var t = 0; t < 13000 && !got; t++) {
        if (hungry) g.peasants[0].hunger = 6000; else g.peasants.forEach(function (o) { o.hunger = 0; });
        sim.step(w, 1);
        got = g.feed.filter(function (f) { return /word got round/.test(f.text || f.t || f.msg || JSON.stringify(f)); })[0];
      }
      return { n0: n0, n: g.peasants.filter(function (o) { return !o.dead; }).length, got: got, goal: g.popGoal };
    }
    var a = village(false);
    check(a.got && a.n === a.n0 + 1, "nobody came by word of mouth: " + JSON.stringify(a));
    var b = village(true);
    check(!b.got && b.n === b.n0, "somebody came to a hungry valley: " + JSON.stringify(b));
  });

  test("storeys: somebody homeless, lean, with nothing to build, goes over the hills: not dead, not mourned, and one less wanted", function () {
    var w = sim.load(1), g = w.g;
    sim.step(w, 200);
    know(g, ["farm", "masonry", "storey"]);
    var p = g.peasants.filter(function (o) { return !w.bHome(g, o); })[0];
    check(p, "(the test wants somebody homeless)");
    g.sites.filter(function (s) { return s.kind === "house" && !s.hut; }).forEach(function (s) { w.bRemove(g, g.sites.indexOf(s)); });
    g.noPlotT = g.tick; g.leanT = g.tick;
    var goal0 = g.popGoal, rip0 = g.rip, ghosts0 = g.ghosts.length, dead0 = g.dead.length;
    for (var t = 0; t < 5000 && !p.left; t++) {
      g.noPlotT = g.tick;
      p.roughT = g.tick - 30000; p.lean = 4000;   /* (lean already: fed now, or they only go and eat) */
      g.peasants.forEach(function (o) { o.hunger = 0; });
      /* (and no empty hut for them to have instead) */
      g.sites.forEach(function (o) { if (w.sDwelling(o) && !o.owner) { var q = g.peasants.filter(function (r) { return r !== p && !r.dead && !w.bHome(g, r); })[0]; if (q) { o.owner = q.id; q.home = o.id; } } });
      sim.step(w, 1);
    }
    check(p.left && p.dead, p.name + " never left: at " + p.x.toFixed(0) + ", " + (p.task && p.task.kind));
    check(g.popGoal === goal0 - 1, "the valley still wants " + g.popGoal + " (was " + goal0 + ")");
    check(g.rip === rip0 && g.ghosts.length === ghosts0 && g.dead.length === dead0, "leaving was a death: rip " + g.rip + " ghosts " + g.ghosts.length);
    check(g.got.hills, "nobody noticed");
    check(g.letters && g.letters.length === 1, "no letter to come");
  });

  test("storeys: a stack that can grow no further, in a valley short of fields, gets a garden on its roof: a hatch up, sand, wheat", function () {
    var C = stack(1, true), w = C.w, g = C.g, h = C.h, gw = g.gw;
    check(!w.sBears(g, h), "(the test wants a full stack)");
    g.noFieldT = g.tick;
    check(w.sRoofReady(g), "ROOF GARDENS is not ready");
    g.know.roofgarden = "TEST";
    var p = g.peasants[3]; p.logs = 10; p.stone = 10; p.planCD = 0;
    check(w.sTryRoof(g, p), "no roof garden planned");
    var r = sites(g, "roofgarden")[0];
    check(r && r.top === C.s2.id, "the garden is not on the top floor");
    for (var t = 0; t < 20000 && !r.done; t++) {
      p.hunger = 0; p.tired = 0; p.logs = Math.max(p.logs, 5); p.stone = Math.max(p.stone, 5);
      if (!p.task || p.task.kind !== "build" || p.task.site !== r.id) p.task = btask(r.id);
      sim.step(w, 1);
    }
    check(r.done, "the roof garden was never finished: " + Math.round(w.bShare(g, r) * 100) + "%");
    var f = sites(g, "farm").filter(function (o) { return o.roof === r.id; })[0];
    check(f, "no field on the roof");
    var n0 = w.iFields(g);
    check(sites(g, "farm").filter(function (o) { return !o.terrace && !o.roof; }).length === n0, "the roof field counts against the fields kept");
    /* sown, and somebody up there to eat it */
    know(g, ["farm"]);
    var sown = false;
    for (t = 0; t < 20000 && !sown; t++) { sim.step(w, 1); sown = f.plan.some(function (e) { return e.v === w.MAT.CROP && (g.m[e.i] === w.MAT.CROP || g.m[e.i] === w.MAT.WHEAT); }); }
    check(sown, "nobody sowed the roof");
    /* and both flats are still got to from the ground */
    [[C.q, C.s], [C.r, C.s2]].forEach(function (pr) {
      var o = pr[0], fl = pr[1];
      o.x = h.x0 - 12 + 0.5; o.y = h.F - 1; o.vx = o.vy = 0; o.climb = null; o.state = "walk"; o.sleep = 0; o.task = { kind: "sleep", t: 0 };
      var got = false;
      for (var u = 0; u < 1500 && !got; u++) { sim.step(w, 1); o.hunger = 0; if (o.sleep > 0 && o.inBed && w.bInside(fl, o)) got = true; }
      check(got, o.name + " can not get to bed on floor " + fl.floor + " with the garden up");
    });
  });

  test("storeys: a washing line from a shuttered window to a tree carries a fire in at the window; a glass one stops it", function () {
    function go(glass) {
      var C = stack(1), w = C.w, g = C.g, s = C.s, gw = g.gw, W = w.sWindow(s), x, y;
      if (glass) { w.sandSet(g, W.y * gw + W.x, w.MAT.GLASS); }
      /* a tree trunk eight columns out from the window, in the air if need be */
      var X = W.x + W.o * 8;
      for (y = W.y - 4; y <= W.y + 4; y++) for (x = W.x + W.o; W.o > 0 ? x <= X + 1 : x >= X - 1; x += W.o) if (g.m[y * gw + x] !== w.MAT.EMPTY && !w.bMarked(g, x, y)) w.sandSet(g, y * gw + x, w.MAT.EMPTY);
      for (y = W.y - 4; y <= W.y + 4; y++) w.sandSet(g, y * gw + X, w.MAT.WOOD);
      var cells = w.sLinePlan(g, s);
      check(cells && cells.length === 7, "no line from the window to the tree: " + (cells && cells.length));
      cells.forEach(function (i) { w.sandPlace(g, i, w.MAT.LINEN); g.aux[i] = 6; });
      g.lines = [{ from: s.id, cells: cells, wash: [], washT: 0 }];
      for (y = W.y - 4; y <= W.y + 4; y++) w.sandSet(g, y * gw + X, w.MAT.FIRE);
      w.sandSet(g, cells[cells.length - 1], w.MAT.FIRE);   /* (and the knot at the tree) */
      var inside = false;
      for (var t = 0; t < 1500 && !inside; t++) {
        sim.step(w, 1);
        var c = g.m[W.y * gw + W.x]; if (c === w.MAT.FIRE || c === w.MAT.EMBER) inside = true;
      }
      return { inside: inside, cordGone: cells.every(function (i) { return g.m[i] !== w.MAT.LINEN; }) };
    }
    var a = go(false);
    check(a.cordGone && a.inside, "the fire did not walk the line into the window: " + JSON.stringify(a));
    var b = go(true);
    check(b.cordGone && !b.inside, "the fire got in at a glass window: " + JSON.stringify(b));
  });

  test("storeys: saved and loaded with a flat going up and somebody on their way over the hills, a village goes on as it would have", function () {
    var h = H.open({ seed: 1 }), g = h.g, G = h.game;
    h.step(200);
    var p = g.peasants[0], q = g.peasants[1], r = g.peasants[2];
    p.logs = 20;
    if (!G.bPlanHouse(g, p)) throw new Error("(no house)");
    var hs = g.sites.filter(function (s) { return s.kind === "house" && !s.hut && s.owner === p.id; })[0];
    sim.build({ g: g, MAT: G.MAT, heatSync: G.heatSync, sandSet: G.sandSet, heatAccept: G.heatAccept }, hs); G.bFinish(g, hs, p);
    ["farm", "masonry", "storey"].forEach(function (k) { g.know[k] = "TEST"; });
    q.home = 0; q.logs = 20; q.planCD = 0; g.noPlotT = g.tick;
    g.sites.forEach(function (o) { if (o.owner === q.id) o.owner = 0; });
    check(G.sTry(g, q), "(no storey)");
    h.step(400);
    var st = g.sites.filter(function (o) { return o.kind === "storey"; })[0];
    check(st && !st.done, "(the test wants the flat half up)");
    r.home = 0; G.sLeave(g, r);
    check(r.task && r.task.kind === "leave", "(the test wants somebody leaving)");
    var doc = h.saveDoc();
    var a = H.open({ seed: 1 }); a.load(doc); a.step(600);
    h.step(600);
    check(a.hash() === h.hash(), "the loaded village went on otherwise: " + a.hash() + " against " + h.hash());
  });

  test("storeys: a flat planned with a pane nobody has any more gets a shutter, and is finished", function () {
    var C = crowded(1), w = C.w, g = C.g, q = C.q;
    q.glass = 1;
    check(w.sTry(g, q), "(no storey)");
    var s = sites(g, "storey")[0], win = s.plan.filter(function (e) { return e.v === w.MAT.GLASS; })[0];
    check(win, "(the test wants a glass window planned)");
    g.peasants.forEach(function (o) { o.glass = 0; });
    sim.step(w, 60);
    check(win.v === w.MAT.PLANK && win.a === 1, "the window still waits for glass");
  });

  test("storeys: a flat starts from boards as well as logs", function () {
    var C = crowded(1), w = C.w, g = C.g, q = C.q;
    q.logs = 0; q.boards = 12;
    check(w.sTry(g, q), "a peasant with twelve boards and no logs would not start a flat");
  });

  test("storeys: a house with a flat on it, mostly knocked down, is mended under it, not given up", function () {
    var C = stack(1), w = C.w, g = C.g, h = C.h, gw = g.gw;
    h.plan.forEach(function (e) { if (((e.i / gw) | 0) > h.F - 11) w.sandSet(g, e.i, w.MAT.EMPTY); });
    w.bInspect(g, h, g.sites.indexOf(h));
    check(g.sites.indexOf(h) >= 0 && h.repair, "the house was given up with a flat on it");
    check(g.sites.indexOf(C.s) >= 0, "the flat went with it");
  });

  test("storeys: a washing line across where the next flat's ladder goes is cut, and the flat goes up", function () {
    var C = crowded(1, true), w = C.w, g = C.g;
    check(w.sTry(g, C.q), "(no storey)");
    C.s = sites(g, "storey")[0]; sim.build(w, C.s); w.bFinish(g, C.s, C.q);
    g.peasants.forEach(function (o) { if (o.task && o.task.kind === "warming") o.task = null; });
    C.r = g.peasants[2];
    /* (a line across where the second flat's ladder will go, up the other end) */
    var lad = C.s.d > 0 ? C.h.x0 - 2 : C.h.x0 + 12, y = C.s.F - 5, cells = [];
    for (var x = lad - 1; x <= lad + 1; x++) { var i = y * g.gw + x; w.sandSet(g, i, w.MAT.EMPTY); w.sandPlace(g, i, w.MAT.LINEN); g.aux[i] = 6; cells.push(i); }
    g.lines = [{ from: C.s.id, cells: cells, wash: [], washT: 0 }];
    C.r.home = 0; C.r.planCD = 0; C.r.logs = 20;
    g.sites.forEach(function (o) { if (o.owner === C.r.id) o.owner = 0; });
    check(w.sTry(g, C.r), "the line stopped the second flat: " + w.S_WHY);
    check(!g.lines.length && cells.every(function (i) { return g.m[i] !== w.MAT.LINEN; }), "the line is still up");
  });

  test("storeys: ash piled up in a room with a flat over it (its ceiling stays, whatever burns) is cleared out, and nobody is buried", function () {
    var C = stack(1), w = C.w, g = C.g, h = C.h, gw = g.gw, x, y;
    function ash() { var n = 0; for (var yy = h.iy0; yy < h.F; yy++) for (var xx = h.ix0; xx <= h.ix1; xx++) if (g.m[yy * gw + xx] === w.MAT.ASH) n++; return n; }
    for (y = h.F - 5; y <= h.F - 1; y++) for (x = h.ix0; x <= h.ix1; x++) if (g.m[y * gw + x] === w.MAT.EMPTY) w.sandPlace(g, y * gw + x, w.MAT.ASH);
    var n0 = ash(), rip0 = g.rip;
    for (var t = 0; t < 12000 && ash() > 2; t++) sim.step(w, 1);
    check(ash() <= 2, "the room still has " + ash() + " of " + n0 + " cells of ash in it");
    check(g.rip === rip0, "somebody died: " + JSON.stringify(g.dead.slice(-1)));
  });
};
