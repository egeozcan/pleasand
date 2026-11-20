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
  /* a theatre on a slope in seed 1 (one is made at column 150, rising away from the stage, if the valley has none
     nearer the houses), built */
  function theatre(build) {
    var w = sim.load(1), g = w.g, x0 = 150;
    ground(w, 120, 200, function (x) { return x < x0 + 9 ? 150 : 150 - Math.min(7, ((x - x0 - 9) / 2) | 0); });
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
    /* (stepped into the slope: less stone built up out of thin air than on the flat, where the tiers and the stage's
       plinth want 55) */
    var made = s.plan.filter(function (e) { return e.v === w.MAT.BRICK && w.AIRY[g.m[e.i]]; }).length;
    check(made < 40, made + " blocks of stone built up out of nothing, near enough as many as on the flat");
    /* (and stone faces it, where the audience sits and where the steps go up: not sand) */
    s.seats.forEach(function (st) { check(s.plan.some(function (e) { return e.i === (st.y + 1) * g.gw + st.x && e.v === w.MAT.BRICK; }), "a seat at " + st.x + " is not on stone"); });
    check(s.plan.filter(function (e) { return e.v === w.MAT.LAMP; }).length === 2, "not two lanterns");
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
    w.mTheatreStep(g, s);   /* (now: before a field nearby gives them all something better to do) */
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
      var n = s.play.cast.filter(function (id) { var q = w.lAlive(g, id); return q && Math.floor(q.y) === w.mMark(s, 0).y && Math.abs(q.x - w.mU(s, 3)) < 5; }).length;
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

  /* a level stretch at column 130..200 of seed 1 (row 150: sand six deep, over stone), and a cathedral planned on it.
     built and finished, if build */
  function cathedral(build, gold) {
    var w = sim.load(1), g = w.g;
    ground(w, 130, 200, function () { return 150; });
    know(g, ["farm", "dig", "bucket", "mine", "masonry", "glass", "stained", "cathedral"]);
    g.peasants.forEach(function (q) { q.gold = gold || 0; });
    var p = g.peasants[0];
    p.x = 165.5; p.y = 149;
    check(w.mPlanCathedral(g, p, 165), "nowhere for the cathedral");
    var s = sites(g, "cathedral")[0];
    if (build) { sim.build(w, s); s.done = false; w.bFinish(g, s, p); }
    return { w: w, g: g, s: s, p: p };
  }
  /* everybody idle and about, standing by the west door */
  function idleBy(w, s) {
    w.g.peasants.forEach(function (q) { q.task = null; q.bored = 900; q.hunger = 0; q.tired = 0; q.cold = 0; q.x = s.x0 - 4 + (q.id % 3) + 0.5; q.y = s.F - 1; q.nav = null; q.mineCD = 1e9; q.state = "walk"; q.vx = q.vy = 0; });
  }

  test("cathedral: a cross weathers away, and whoever was at the graveyard thinks of a cathedral", function () {
    var w = sim.load(1), g = w.g, p = g.peasants[0];
    know(g, ["farm", "dig", "glass", "stained", "bell", "grave"]);
    sim.build(w, w.bNew(g, "bell", null, [], [10, 100, 12, 102], { bx: 11, by: 102, ring: 0 }));
    var x = Math.floor(p.x) + 3, G = w.mGround(g, x);
    var cross = w.bNew(g, "grave", null, [w.bE(g, x, G - 1, w.MAT.WOOD, 10)], [x - 1, G - 4, x + 1, G - 1], { of: "GARY THE BOLD" });
    g.dead.push({ name: "GARY THE BOLD", note: "here lies gary", site: cross.id });
    g.peasants.forEach(function (q) { if (q !== p) q.x = x + 120; });
    check(!w.wIdea("cathedral").ready(g), "(the cathedral was thought of before the cross went)");
    w.iWeather(g, cross, false);
    check(g.dead[g.dead.length - 1].site === -1, "(the cross did not weather)");
    check(p.spark === "cathedral", "the one at the graveyard did not think of a cathedral (" + p.spark + ")");
  });

  test("cathedral: planned on level ground under open sky, with a crypt dug under it, and built by its crew", function () {
    var C = cathedral(false), w = C.w, g = C.g, s = C.s, M = w.MAT;
    check(s.y0 <= s.F - 35, "the spire is not thirty-five up");
    check(s.plan.some(function (e) { return e.v === M.LADDER && e.i > s.F * g.gw; }), "no ladder down into the crypt");
    check(s.plan.filter(function (e) { return e.v === M.LAMP; }).length === 3, "not three candles");
    check(s.plan.filter(function (e) { return e.v === M.GIRDER; }).length === 3, "no rod on the spire");
    /* built: with what it wants in the village's pockets */
    g.peasants.forEach(function (q) { q.boards = 12; q.stone = 16; q.glass = 2; q.stained = 2; q.iron = 1; q.hunger = 0; q.task = null; q.x = s.x0 - 3 + (q.id % 4) + 0.5; q.y = s.F - 1; q.state = "walk"; q.mineCD = 1e9; });
    var t0 = g.tick, k;
    for (k = 0; k < 16000 && !s.done; k++) sim.step(w, 1);
    check(s.done, "the cathedral was not built in 16000 ticks (" + Math.round(w.bShare(g, s) * 100) + "% up: " + s.note + ")");
    /* (the crypt can be got down into, and out of) */
    var down = w.navFind(g, s.x0 - 3, s.F - 1, function (x, y) { return y === s.F + 9 && x > s.x0 + 5; }, s.x0 + 8, s.F + 9, 20000);
    check(!!down, "no way down into the crypt");
    console.log("      (built in " + (g.tick - t0) + " ticks, a crew of " + w.wCap(g) + ")");
  });

  test("cathedral: the rose window is stained, green and amber, and ruby at the heart if there is gold", function () {
    var C = cathedral(false, 1), w = C.w, g = C.g, s = C.s, M = w.MAT;
    var rose = s.plan.filter(function (e) { return e.v === M.STAINED; });
    check(rose.length === 13, rose.length + " panes of coloured glass in the rose");
    var heart = rose.filter(function (e) { return e.i === (s.F - 16) * g.gw + s.x0 + 8; })[0];
    check(heart && heart.a === 0, "the heart of the rose is not ruby, with gold to hand");
    check(rose.some(function (e) { return e.a === 1; }) && rose.some(function (e) { return e.a === 2; }), "the rose is not green and amber");
    var C2 = cathedral(false, 0), h2 = C2.s.plan.filter(function (e) { return e.v === M.STAINED && e.a === 0; });
    check(!h2.length, "a ruby with no gold anywhere");
    /* built, with the candles lit: the window glows */
    sim.build(w, s);
    check(w.wLitGlass(g, s.x0 + 8, s.F - 18) && w.wLitGlass(g, s.x0 + 6, s.F - 16), "the candles do not light the rose from behind");
  });

  test("cathedral: a bolt aimed at a house beside it goes down the rod, and nothing burns; open ground is struck where it was aimed", function () {
    var C = cathedral(true), w = C.w, g = C.g, s = C.s, M = w.MAT, x, y;
    g.peasants.forEach(function (q) { q.x = 20; });
    /* a little stone house of theirs, just east of it */
    var plan = [], hx = s.x0 + 18;
    for (x = hx; x < hx + 5; x++) for (y = s.F - 6; y < s.F; y++) plan.push(w.bE(g, x, y, M.BRICK, 0));
    sim.build(w, w.bNew(g, "statue", null, plan, [hx, s.F - 6, hx + 4, s.F - 1], { of: "NOBODY", px: hx + 2, G: s.F }));
    var hits = s.rodHits || 0;
    w.sandLightning(g, s.rod.x + 8);
    check((s.rodHits || 0) === hits + 1, "the rod did not take a bolt aimed at the house beside it");
    var burnt = 0;
    for (x = s.x0 - 2; x < hx + 7; x++) for (y = s.F - 40; y < s.F + 2; y++) { var c = g.m[y * g.gw + x]; if (c === M.FIRE || c === M.EMBER || (c === M.GLASS && !s.plan.some(function (e) { return e.i === y * g.gw + x; }))) burnt++; }
    check(burnt === 0, burnt + " cells burned or fused round the house and the cathedral");
    check(g.bolts[g.bolts.length - 1].rod, "the bolt was not drawn down the rod");
    /* open ground eight off the rod's reach the other way (nothing of theirs): the rod has no say in it */
    var ox = s.x0 - 1, oy = w.mGround(g, ox);
    check(!w.bMarked(g, ox, oy), "(the test wants open ground)");
    check(!w.wRod(g, { x: ox, y: oy }, [[ox, 0], [ox, oy]]), "the rod took a bolt that was going into open ground");
    check((s.rodHits || 0) === hits + 1, "(the count moved)");
  });

  test("cathedral: every name gets a niche in the crypt, and a weathered one comes back", function () {
    var w = sim.load(1), g = w.g;
    g.dead.push({ name: "GARY THE BOLD", note: "x", site: -1 }, { name: "ALICE", note: "y", site: 0 });
    var C = (function () { var c = cathedral(false); c.g.dead = g.dead; return c; })(), w2 = C.w, g2 = C.g, s = C.s;
    sim.build(w2, s); s.done = false; w2.bFinish(g2, s, C.p);
    check(s.niches.length === 2, s.niches.length + " niches");
    check(s.niches.some(function (n) { return n.name === "GARY THE BOLD" && n.gone; }), "the weathered name has no niche");
    /* and one who dies after: a niche on the next look */
    g2.dead.push({ name: "BOB", note: "z", site: 0 });
    g2.tick = Math.ceil(g2.tick / 30) * 30; w2.wStep(g2);
    check(s.niches.some(function (n) { return n.name === "BOB"; }), "the newly dead got no niche");
    var at = w2.mNiche(s, 2);
    check(at.x > s.x0 + 4 && at.x < s.x0 + 15 && at.y > s.F && at.y < s.F + 10, "a niche is not in the crypt's wall");
    void w;
  });

  test("cathedral: a service rings the bell, fills the pews, and the eldest names the dead", function () {
    var C = cathedral(true), w = C.w, g = C.g, s = C.s;
    g.tales = [];
    w.wTale(g, "death", { short: "GARY", x: 0, y: 0 }, "reentry");
    w.wTale(g, "death", { short: "MAUD", x: 0, y: 0 }, "drown");
    idleBy(w, s);
    s.servT = 0;
    g.tick = Math.ceil(g.tick / 30) * 30; w.mCathStep(g, s);
    check(!!s.serv, "no service");
    var seated = 0, t0 = g.tick, k;
    for (k = 0; k < 3000 && s.serv; k++) {
      sim.step(w, 1);
      seated = Math.max(seated, g.peasants.filter(function (q) { return q.task && q.task.kind === "audience" && q.task.sat && q.pose === "sit" && Math.floor(q.y) === s.F - 2; }).length);
    }
    check(!s.serv, "the service never ended");
    check(seated >= 3, "only " + seated + " sat in the pews");
    var said = (s.named || []).join(" | ");
    check(/Gary, who came back from space too fast/.test(said) && /Maud, who drowned/.test(said), "the dead were not named: " + said);
    check(s.services === 1, "the service did not count");
    check(g.peasants.filter(function (q) { return q.cosyT > g.tick + 500; }).length >= 3, "nobody went away thinking the better for it");
    void t0;
  });

  test("cathedral: the bell is taken down from where it hung and rehung in the belfry, and rings there", function () {
    var C = cathedral(false), w = C.w, g = C.g, s = C.s, M = w.MAT;
    /* a bell hung off a post somewhere else: three cells of gold */
    var bx = 40, by = 100, plan = [w.bE(g, bx, by - 1, M.BRICK, 0), w.bE(g, bx, by, M.GOLD, 1), w.bE(g, bx - 1, by, M.GOLD, 1), w.bE(g, bx + 1, by, M.GOLD, 1)];
    var old = sim.build(w, w.bNew(g, "bell", null, plan, [bx - 1, by - 1, bx + 1, by], { bx: bx, by: by, ring: 0 }));
    sim.build(w, s); s.done = false; w.bFinish(g, s, C.p);
    check(!w.bSite(g, old.id) && g.m[by * g.gw + bx] === M.EMPTY, "the old bell is still up");
    var nb = sites(g, "bell")[0];
    check(nb && nb.on === s.id && nb.by < s.F - 20 && nb.bx === s.x0 + 8, "no bell going up in the belfry");
    check(Math.abs((nb.stock.gold || 0) - 0.6) < 1e-6, "the old bell's gold was not kept for the new: " + nb.stock.gold);
    sim.build(w, nb);
    check(w.mRing(g, 1) && nb.ring > 0, "the rehung bell does not ring");
  });

  test("cathedral: a flooded crypt is bailed out, up the ladder, and the water goes somewhere it will not run back", function () {
    var C = cathedral(true), w = C.w, g = C.g, s = C.s, M = w.MAT, x, y, n = 0;
    for (y = s.F + 7; y <= s.F + 9; y++) for (x = s.x0 + 5; x <= s.x0 + 14; x++) { w.sandPlace(g, y * g.gw + x, M.WATER); n++; }
    idleBy(w, s);
    var t0 = g.tick, k, bailer = null;
    for (k = 0; k < 20000 && w.mCryptWater(g, s) > 0; k++) {
      sim.step(w, 1);
      if (!bailer) bailer = g.peasants.filter(function (q) { return q.task && q.task.kind === "cbail"; })[0];
      if (k % 600 === 0) idleBy2();
    }
    function idleBy2() { g.peasants.forEach(function (q) { q.hunger = 0; q.tired = 0; }); }
    check(!!bailer, "nobody went to bail the crypt");
    check(w.mCryptWater(g, s) === 0, "the crypt still has " + w.mCryptWater(g, s) + " cells of water in it after " + (g.tick - t0) + " ticks");
    /* (and it is not in the nave, either) */
    var nave = 0;
    for (y = s.F - 9; y < s.F; y++) for (x = s.x0 + 2; x <= s.x0 + 14; x++) if (w.WET[g.m[y * g.gw + x]]) nave++;
    check(nave <= 2, nave + " cells of the crypt's water left on the nave floor");
    console.log("      (" + n + " cells bailed in " + (g.tick - t0) + " ticks, " + (s.bailed || 0) + " pails)");
  });

  test("cathedral: the bored go down to the crypt with a candle, to somebody's niche", function () {
    var C = cathedral(true), w = C.w, g = C.g, s = C.s;
    s.niches = [{ name: "GARY THE BOLD", gone: true, t: 0 }];
    idleBy(w, s);
    var p = g.peasants[1], k;
    for (k = 0; k < 200 && !(p.task && p.task.kind === "crypt"); k++) { p.task = null; w.mCathPick(g, p, false); }
    check(p.task && p.task.kind === "crypt", "nobody went down to the crypt");
    g.peasants.forEach(function (q) { if (q !== p) q.x = 10; });
    for (k = 0; k < 2500 && p.task && p.task.kind === "crypt" && !p.task.on; k++) sim.step(w, 1);
    check(p.task && p.task.on && p.y > s.F + 5, "they did not get down to the niche (at " + Math.floor(p.x) + "," + Math.floor(p.y) + ")");
  });

  test("cathedral: the rose window melts in a fire and sets plain, and the glazier puts the colours back", function () {
    var C = cathedral(true), w = C.w, g = C.g, s = C.s, M = w.MAT;
    var rose = s.plan.filter(function (e) { return e.v === M.STAINED; });
    /* the heart of it, hot enough to melt (as from a fire that got going in the gable), and let cool */
    rose.forEach(function (e) { if (e.a !== 1) w.heatAdd(g, e.i, 2400); });
    g.peasants.forEach(function (q) { q.x = 10; });
    var k, melted = 0;
    for (k = 0; k < 1500; k++) { sim.step(w, 1); melted = Math.max(melted, rose.filter(function (e) { return g.m[e.i] !== M.STAINED; }).length); }
    check(melted >= 3, "(the window did not melt: " + melted + ")");
    check(rose.some(function (e) { return g.m[e.i] === M.GLASS; }) || s.repair, "(the window did not set plain)");
    g.peasants.forEach(function (q) { q.stained = 1; q.boards = 4; q.stone = 4; q.hunger = 0; q.task = null; q.x = s.x0 + 8.5; q.y = s.F - 1; q.state = "walk"; q.mineCD = 1e9; });
    for (k = 0; k < 8000 && !rose.every(function (e) { return g.m[e.i] === M.STAINED; }); k++) sim.step(w, 1);
    check(s.glazes >= 1, "the plain glass in the window was never seen to");
    check(rose.every(function (e) { return g.m[e.i] === M.STAINED; }), "the colours were not put back: " + rose.filter(function (e) { return g.m[e.i] !== M.STAINED; }).length + " panes plain");
    check(w.wPocketed(g, "glass") >= 4, "the plain panes taken out were not kept");
  });

  test("cathedral: far from home when things go bang, the cathedral is where they hide", function () {
    var C = cathedral(true), w = C.w, g = C.g, s = C.s;
    idleBy(w, s);
    var p = g.peasants[2];
    p.home = 0; p.panic = 400;
    for (var k = 0; k < 1200 && !(p.hid && w.bInside(s, p)); k++) { sim.step(w, 1); p.panic = Math.max(p.panic, 50); }
    check(w.bInside(s, p) && p.hid, "they did not hide in the cathedral (at " + Math.floor(p.x) + "," + Math.floor(p.y) + ")");
  });
};
