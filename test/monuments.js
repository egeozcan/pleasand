/* =====================================================================
   PLEASAND  --  test/monuments.js

   the great works in stone (monuments.js): the theatre and the pyramid.
   required by test/run.js
   ===================================================================== */
"use strict";

module.exports = function (test, check, sim) {
  function know(g, list) { list.forEach(function (k) { g.know[k] = "TEST"; }); }
  function sites(g, kind) { return g.sites.filter(function (s) { return s.kind === kind; }); }
  /* ground shaped by a function of the column, from x0 to x1: sand over stone, nothing over it, and nobody's site on it */
  function ground(w, x0, x1, top) {
    var g = w.g, x, y, k;
    for (k = g.sites.length - 1; k >= 0; k--) if (g.sites[k].x1 >= x0 - 6 && g.sites[k].x0 <= x1 + 6) w.bRemove(g, k);
    for (x = x0; x <= x1; x++) {
      var G = top(x);
      for (y = 40; y < G; y++) w.sandPlace(g, y * g.gw + x, w.MAT.EMPTY);
      for (y = G; y < G + 6; y++) w.sandPlace(g, y * g.gw + x, w.MAT.SAND);
      for (y = G + 6; y < 182; y++) if (!w.ROCK[g.m[y * g.gw + x]]) w.sandPlace(g, y * g.gw + x, w.MAT.STONE);
    }
  }
  /* a theatre on a slope at column 150 of seed 1, rising away from the stage, built */
  function theatre(build) {
    var w = sim.load(1), g = w.g, x0 = 150;
    ground(w, 120, 200, function (x) { return x < x0 + 9 ? 150 : 150 - Math.min(5, ((x - x0 - 9) / 3) | 0); });
    know(g, ["farm", "dig", "bucket", "festival", "mine", "masonry", "theatre"]);
    var p = g.peasants[0];
    p.x = x0 + 4.5; p.y = 149;
    check(w.mPlanTheatre(g, p), "nowhere for the theatre");
    var s = sites(g, "theatre")[0];
    if (build) sim.build(w, s);
    return { w: w, g: g, s: s };
  }

  test("theatre: planned on a slope near the houses, stepped into it, and built by its crew", function () {
    var T = theatre(false), w = T.w, g = T.g, s = T.s;
    var top = w.mU(s, 20), rise = s.G - w.mGround(g, top);
    check(rise >= 2, "the theatre is not on a slope: the back of it is " + rise + " up");
    /* (stepped into the slope: less stone made up under the tiers than on the flat, which wants 24) */
    var made = s.plan.filter(function (e) { return e.v === w.MAT.BRICK; }).length;
    check(made < 24, made + " blocks of stone made up under the seats, as many as on the flat");
    check(s.seats.length === 6, s.seats.length + " seats");
    /* built: wood and stone enough for it in the village's pockets, and the time it takes */
    g.peasants.forEach(function (q) { q.boards = 8; q.stone = 12; q.hunger = 0; q.task = null; q.x = w.mU(s, 7 + (q.id & 1)) + 0.5; q.y = s.G - 1; q.state = "walk"; });
    var t0 = g.tick;
    for (var k = 0; k < 9000 && !s.done; k++) sim.step(w, 1);
    /* (done; or all but a cell or two with something runny lying in it, which a site waits out) */
    var left = s.plan.filter(function (e) { return e.v && !w.bOk(g, e) && !w.LIQUID[g.m[e.i]]; }).length;
    check(s.done || left === 0, "the theatre was not built in 9000 ticks (" + Math.round(w.bShare(g, s) * 100) + "% up)");
    T.ticks = g.tick - t0;
  });

  /* the cast and the house, idle by the theatre, and the theatre's tale */
  function play(T) {
    var w = T.w, g = T.g, s = T.s;
    g.tales = [];
    w.wTale(g, "space", g.peasants[3]);
    /* (everybody about, in the pit in front of the stage) */
    g.peasants.forEach(function (q) { q.task = null; q.bored = 900; q.hunger = 0; q.tired = 0; q.x = w.mU(s, 7 + (q.id & 1)) + 0.5; q.y = s.G - 1; q.nav = null; q.mineCD = 1e9; q.state = "walk"; q.vx = q.vy = 0; });
    s.playT = 0;
    sim.step(w, 30);
    check(!!s.play, "no play was put on");
    return s.play;
  }
  test("theatre: a play puts actors on the stage and an audience on the tiers, and the tale is staged", function () {
    var T = theatre(true), w = T.w, g = T.g, s = T.s;
    var P = play(T), tale = P.tale, onStage = 0, seated = 0;
    check(P.cast.length >= 2, P.cast.length + " in the cast");
    for (var k = 0; k < 4000 && s.play; k++) {
      sim.step(w, 1);
      if (!s.play || !s.play.on) continue;
      var n = s.play.cast.filter(function (id) { var q = w.lAlive(g, id); return q && Math.floor(q.y) === s.G - 2 && Math.abs(q.x - w.mU(s, 3)) < 5; }).length;
      onStage = Math.max(onStage, n);
      seated = Math.max(seated, g.peasants.filter(function (q) { return q.task && q.task.kind === "audience" && q.task.sat && q.pose === "sit"; }).length);
    }
    check(onStage >= 2, "the actors never stood on the stage together (" + onStage + ")");
    check(seated >= 1, "nobody sat on the tiers");
    check(tale.staged > 0, "the tale was not marked staged");
    check(g.got.play, "the first play was no news");
  });

  test("theatre: a fire on the stage in the middle of a play is applauded for a while, then fought", function () {
    var T = theatre(true), w = T.w, g = T.g, s = T.s, k;
    play(T);
    for (k = 0; k < 3000 && !(s.play && s.play.on); k++) sim.step(w, 1);
    check(s.play && s.play.on, "(the test wants the play going)");
    /* the backdrop alight */
    var bx = w.mU(s, 0), j = (s.G - 4) * g.gw + bx;
    w.sandSet(g, j, w.MAT.EMBER); w.heatAccept(g, j);
    var t0 = g.tick, fought = 0, early = false;
    for (k = 0; k < 600 && !fought; k++) {
      sim.step(w, 1);
      if (g.tick - t0 < 100 && g.blaze.some(function (b) { return b.site === s.id; })) early = true;
      if (g.peasants.some(function (q) { return q.task && q.task.kind === "bucket" && q.task.site === s.id; })) fought = g.tick - t0;
    }
    check(!early, "the brigade came before anybody had applauded");
    check(fought >= 100, "the fire was never fought (or was at once: " + fought + ")");
    check(g.tales.some(function (t) { return t.kind === "stagefire"; }), "the fire on the stage is not a tale");
  });

  test("pyramid: the king dies, and the heir thinks of a pyramid", function () {
    var w = sim.load(1), g = w.g;
    know(g, ["farm", "dig", "mine", "masonry"]);
    g.wQuarryOk = true;
    var king = w.pKing(g);
    check(!!king, "(the test wants a king)");
    w.pDie(g, king, "old");
    var heir = w.pKing(g);
    check(heir && heir !== king && heir.spark === "pyramid", "the heir has no pyramid in mind (" + (heir && heir.spark) + ")");
    check(g.lastKing && g.lastKing.name === king.name, "the old king is not remembered for the tomb");
  });

  /* a level stretch near the left edge of the valley, a pyramid planned on it and built (no gold anywhere) */
  function pyramid() {
    var w = sim.load(1), g = w.g;
    ground(w, 4, 60, function () { return 150; });
    know(g, ["farm", "dig", "mine", "masonry", "pyramid"]);
    g.kingDied = 1; g.lastKing = { name: "KING BOB", hat: w.P_HATS[6] };
    g.peasants.forEach(function (q) { q.gold = 0; });
    var p = g.peasants[0];
    check(w.mPlanPyramid(g, p), "nowhere for a pyramid");
    return { w: w, g: g, s: sites(g, "pyramid")[0], p: p };
  }
  test("pyramid: planned near an edge, and there is a way from its foot to its top", function () {
    var P = pyramid(), w = P.w, g = P.g, s = P.s;
    check(s.x0 < 70 || s.x1 > g.gw - 70, "the pyramid is in the middle of the valley, at " + s.x0);
    sim.build(w, s);
    var route = w.navFind(g, s.x0 - 3, s.G - 1, function (x, y) { return x === s.px && y === s.T - 1; }, s.px, s.T - 1, 20000);
    check(!!route, "no way up it from its foot");
  });

  test("pyramid: with no gold, finished with a stone capstone, gilded later; and it brings somebody new", function () {
    var P = pyramid(), w = P.w, g = P.g, s = P.s, M = w.MAT;
    var cap = s.plan.filter(function (e) { return e.i === s.T * g.gw + s.px; })[0];
    check(cap && cap.v === M.BRICK && cap.gild, "the capstone is not a stone stand-in: " + (cap && cap.v));
    g.popGoal = 8; var goal = g.popGoal;
    sim.build(w, s); s.done = false;
    w.bFinish(g, s, P.p);
    check(s.done && g.got.pyramid, "the pyramid was not finished");
    check(g.m[s.T * g.gw + s.px] === M.BRICK, "the capstone is not stone");
    check(g.popGoal === goal + 1, "the valley's count did not go up: " + goal + " -> " + g.popGoal);
  });

  test("pyramid: an opened tomb curses the first one in, who falls over on sand, and it is reopened for mending", function () {
    var P = pyramid(), w = P.w, g = P.g, s = P.s, M = w.MAT, k;
    sim.build(w, s); s.done = false; w.bFinish(g, s, P.p);
    g.tick = Math.ceil(g.tick / 30) * 30;
    w.wStep(g);
    check(s.sealed && !s.open, "(the test wants it sealed)");
    /* the wall of the chamber, rubbed out, and somebody walks in */
    var j = (s.cy0 + 1) * g.gw + s.cx0 - 1;
    g.m[j] = M.EMPTY; w.heatSync(g, j);
    var q = g.peasants[1];
    q.x = s.cx0 + 1.5; q.y = s.cy0 + 1; q.task = null; q.state = "walk";
    g.tick = Math.ceil(g.tick / 30) * 30;
    w.wStep(g);
    check(s.open && q.curse > g.tick, "the first one in was not cursed");
    /* on the level sand by the pyramid, walking: down they go, now and then */
    q.x = s.x1 + 6.5; q.y = 149; q.task = { kind: "explore", x: s.x1 + 30, y: 149, t: 0, high: 0 };
    var slips = g.curseSlips || 0;
    for (k = 0; k < 2000 && (g.curseSlips || 0) === slips; k++) { sim.step(w, 1); if (!q.task) q.task = { kind: "explore", x: q.x < s.x1 + 20 ? s.x1 + 40 : s.x1 + 6, y: 149, t: 0, high: 0 }; }
    check((g.curseSlips || 0) > slips, "the cursed peasant never fell over");
    /* and it is reopened, to be mended (as far in as anybody can reach it from outside) */
    for (k = 0; k < 400 && !s.repair; k++) sim.step(w, 1);
    check(s.repair && !s.done, "the opened tomb was not reopened for mending");
  });
};
