/* =====================================================================
   PLEASAND  --  test/run.js

   does it still work: villages played headless (test/sim.js), with
   some things forced, and checked. run them all, or the ones whose
   names have a word in them:

     node test/run.js
     node test/run.js lift
   ===================================================================== */
"use strict";
var sim = require("./sim.js"), tests = [], only = process.argv[2];
function test(name, fn) { tests.push({ name: name, fn: fn }); }
function check(ok, what) { if (!ok) throw new Error(what); }
function know(g, list) { list.forEach(function (k) { g.know[k] = "TEST"; }); }
function sites(g, kind) { return g.sites.filter(function (s) { return s.kind === kind; }); }
/* n ticks, watching: nobody may spend more than 2500 ticks running on one ladder, or die */
function watch(w, n) {
  var g = w.g, on = {}, rip = g.rip;
  for (var t = 0; t < n; t++) {
    sim.step(w, 1);
    g.peasants.forEach(function (p) {
      on[p.id] = p.climb ? (on[p.id] || 0) + 1 : 0;
      check(on[p.id] < 2500, p.name + " has been on the ladder at " + Math.floor(p.x) + "," + Math.floor(p.y) + " for 2500 ticks");
    });
  }
  check(g.rip === rip, (g.rip - rip) + " died");
}

test("water washing through a broken bridge does not announce repairs that never happened", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], x = 30, y = 30, plan = [];
  for (var d = 0; d < 5; d++) plan.push(w.bE(g, x + d, y, w.MAT.PLANK, 2));
  var s = sim.build(w, w.bNew(g, "bridge", p, plan, [x, y, x + 4, y], {})), hole = plan[2];
  g.feed = [];
  w.sandSet(g, hole.i, w.MAT.EMPTY);
  w.bInspect(g, s, g.sites.indexOf(s));
  check(s.repair && !s.done, "the broken bridge was not reopened");
  for (var wave = 0; wave < 3; wave++) {
    w.sandSet(g, hole.i, w.MAT.WATER);
    p.task = { kind: "build", site: s.id, t: 0, idle: 0 };
    w.bTaskBuild(g, p, p.task);
    check(!s.done && s.repair, "water alone finished the repair on wave " + wave);
    check(!g.feed.some(function (f) { return /as good as new/.test(f.text); }), "announced a repair without replacing the missing plank");
    w.sandSet(g, hole.i, w.MAT.EMPTY);
    if (s.done) w.bInspect(g, s, g.sites.indexOf(s));
  }
  p.boards = 1;
  w.bPlace(g, s, hole, p);
  w.bTaskBuild(g, p, p.task);
  check(s.done && !s.repair, "replacing the plank did not finish the repair");
  check(g.feed.filter(function (f) { return /as good as new/.test(f.text); }).length === 1, "the real repair was not announced once");
});

test("construction waits for liquids and fire, but leaves permanent obstacles and underwater digging alone", function () {
  var w = sim.load(1), g = w.g, e = w.bE(g, 30, 30, w.MAT.PLANK, 2), s = { plan: [e] };
  [w.MAT.WATER, w.MAT.SALTWATER, w.MAT.OIL, w.MAT.ACID, w.MAT.LAVA, w.MAT.FIRE, w.MAT.EMBER].forEach(function (v) {
    w.sandSet(g, e.i, v);
    check(!w.bFinished(g, s), "temporary material " + v + " finished construction");
  });
  w.sandSet(g, e.i, w.MAT.STONE);
  check(w.bFinished(g, s), "builders should leave permanent rock alone");
  w.sandSet(g, e.i, w.MAT.PLANK);
  check(w.bFinished(g, s), "the finished plank was not recognised");
  e.v = w.MAT.EMPTY; e.dry = true;
  w.sandSet(g, e.i, w.MAT.SAND);
  w.sandSet(g, e.i - g.gw, w.MAT.WATER);
  check(w.bFinished(g, s), "builders should not dig up an underwater pond floor");
});

test("a village that knows how sinks a mine, digs it out, and can climb out of it", function () {
  var w = sim.load(1), g = w.g;
  know(g, ["farm", "dig", "mine"]);
  watch(w, 6000);
  var m = sites(g, "mine")[0];
  check(m && m.done, "no mine dug in 6000 ticks");
  check(g.found.stone > 50, "only " + g.found.stone + " stone came up");
  for (var y = m.S; y <= m.B; y++) check(g.m[y * g.gw + m.col] === w.MAT.LADDER, "no ladder at row " + y + " of the shaft");
});

test("galleries go out from the bottom of the shaft, and what is in the rock comes up", function () {
  var w = sim.load(2), g = w.g;
  know(g, ["farm", "dig", "mine"]);
  watch(w, 16000);
  check(sites(g, "tunnel").length >= 2, "only " + sites(g, "tunnel").length + " galleries");
  check(g.found.coal + g.found.ore + g.found.gold > 0, "nothing but stone came up: " + JSON.stringify(g.found));
});

test("a peasant who could not plan a mine tries again later", function () {
  var w = sim.load(3), g = w.g, p = g.peasants[0];
  p.mineCD = 1500;
  sim.step(w, 1600);
  check(!p.mineCD, "mineCD is still " + p.mineCD);
});

test("the furnace makes iron from what is on its pile, for anybody who comes", function () {
  var w = sim.load(1), g = w.g;
  know(g, ["farm", "dig", "mine", "smelt"]);
  var p = g.peasants[0];
  check(w.mPlanFurnace(g, p), "nowhere for a furnace");
  var f = sim.build(w, sites(g, "furnace")[0]);
  f.stock = { ore: 6, coal: 6 };
  g.peasants.forEach(function (q) { q.ore = q.coal = 0; q.task = null; });
  watch(w, 8000);
  check(g.iron >= 1, "no iron made");
  check(f.stock.ore < 6 || f.stock.coal < 6, "the pile was not used: " + JSON.stringify(f.stock));
});

test("a site with what it needs on its pile gets built by whoever is about, empty-handed or not", function () {
  var w = sim.load(1), g = w.g;
  know(g, ["farm", "masonry"]);
  check(w.mPlanTower(g, g.peasants[0]), "nowhere for a tower");
  var T = sites(g, "tower")[0];
  T.stock = { stone: 60, wood: 80 };
  g.peasants.forEach(function (q) { q.task = null; q.logs = q.boards = q.stone = 0; });
  watch(w, 6000);
  check(w.bShare(g, T) > 0.5, "only " + Math.round(w.bShare(g, T) * 100) + "% of it is up");
});

test("the last girder of a lift, paid for on its pile, is somebody's job", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0];
  know(g, ["farm", "masonry", "lift"]);
  check(w.mPlanTower(g, p), "nowhere for a tower");
  sim.build(w, sites(g, "tower")[0]);
  p.iron = 10; p.planCD = 0;
  check(w.mPlanLift(g, p), "could not plan a lift");
  var L = sites(g, "lift")[0], last = L.plan[L.plan.length - 1];
  L.plan.forEach(function (e) { if (e !== last) { w.sandSet(g, e.i, e.v); w.heatAccept(g, e.i); } });
  L.stock = { iron: 0.2 };
  p.iron = p.logs = p.boards = p.stone = 0; p.task = null;
  check(w.bNearestSite(g, p, 9999, true) === L, "nobody would take on the last girder");
});

test("a lift carries them up a tower a good deal faster than the ladder", function () {
  var w = sim.load(1), g = w.g;
  know(g, ["farm", "dig", "mine", "masonry", "lift"]);
  var p = g.peasants[0];
  check(w.mPlanTower(g, p), "nowhere for a tower");
  var T = sim.build(w, sites(g, "tower")[0]);
  function up() {
    p.task = null; p.idle = 0; p.x = T.lad + 0.5; p.y = T.F - 1; p.state = "walk"; p.climb = null; p.sleep = 0; p.stun = 0;
    w.bClimbStart(g, p, T.lad, -1);
    for (var t = 0; t < 600 && p.climb; t++) sim.step(w, 1);
    check(!p.climb && Math.floor(p.y) === T.T - 1, "did not get to the top (" + p.x.toFixed(1) + "," + p.y.toFixed(1) + ")");
    return t;
  }
  var climb = up();
  p.iron = 10; p.planCD = 0;
  check(w.mPlanLift(g, p), "could not plan a lift on the tower");
  sim.build(w, sites(g, "lift")[0]);
  var ride = up();
  check(ride < climb * 0.7, "the lift took " + ride + " ticks, the ladder " + climb);
  check(g.got.lift, "nobody noticed riding the lift");
});

test("the bell wakes the whole valley for a fire, buckets or no buckets", function () {
  var w = sim.load(1), g = w.g;
  know(g, ["farm", "dig", "mine", "masonry", "bell"]);
  var p = g.peasants[0];
  check(w.mPlanTower(g, p), "nowhere for a tower");
  sim.build(w, sites(g, "tower")[0]);
  p.gold = 5;
  check(w.mPlanBell(g, p), "nowhere for a bell");
  sim.build(w, sites(g, "bell")[0]);
  var hut = sites(g, "house")[0], cell = hut.plan.filter(function (e) { return e.v === w.MAT.WOOD; })[0];
  var far = g.peasants.filter(function (q) { return Math.abs(q.x - hut.cx) > 60; })[0] || g.peasants[1];
  far.task = null; far.sleep = 5000; far.inBed = false;
  w.pIgniteCell(g, cell.i);
  sim.step(w, 120);
  check(!g.know.bucket, "(the test wants a village with no buckets)");
  check(w.mRinging(g), "the bell is not ringing");
  check(!far.sleep, far.name + " slept through it");
});

test("peasants slip on ice, and slide when they are thrown onto it", function () {
  var w = sim.load(1), g = w.g, x, y, k, j;
  for (x = 20; x < g.gw - 20; x++) for (y = 0; y < g.gh; y++) {
    if (g.m[y * g.gw + x] === w.MAT.SAND) { for (k = 0; k < 2; k++) { j = (y + k) * g.gw + x; if (g.m[j] === w.MAT.SAND) w.sandPlace(g, j, w.MAT.ICE); } break; }
    if (g.m[y * g.gw + x] && !w.P_LEAF[g.m[y * g.gw + x]]) break;
  }
  watch(w, 4000);
  check(g.slips > 0, "nobody slipped");
  var p = g.peasants[0], gx = 120, gy = w.mGround(g, gx);
  check(g.m[gy * g.gw + gx] === w.MAT.ICE, "(the test wants ice at " + gx + ")");
  p.state = "fly"; p.x = gx + 0.5; p.y = gy - 3; p.vx = 1.4; p.vy = 0.3; p.flyT = 20; p.immune = 10; p.slip = 0;
  for (k = 0; k < 120 && p.state === "fly"; k++) sim.step(w, 1);
  check(p.slip > 0 && Math.abs(p.ivx) > 0.1, "thrown onto the ice, and did not slide (slip " + p.slip + ", ivx " + p.ivx + ")");
});

test("iron ore, melted, sets as iron", function () {
  var w = sim.load(1), g = w.g, j = -1, t;
  for (var i = g.m.length - 3 * g.gw; i > 0 && j < 0; i--) if (g.m[i] === w.MAT.STONE) j = i;
  w.sandPlace(g, j, w.MAT.ORE);
  for (t = 0; t < 400 && g.m[j] === w.MAT.ORE; t++) { w.heatAdd(g, j, 300); sim.step(w, 1); }
  check(g.m[j] === w.MAT.LAVA && g.aux[j] === w.MAT.METAL, "ore heated did not run as molten metal (" + g.m[j] + ")");
  g.T[j] = 900;
  sim.step(w, 2);
  check(g.m[j] === w.MAT.METAL, "molten iron cooled did not set as iron (" + g.m[j] + ")");
});

test("a village with everything draws, reads out and describes itself without falling over", function () {
  var w = sim.load(4), g = w.g;
  know(g, ["farm", "dig", "mine", "masonry", "smelt", "lift", "bell"]);
  for (var n = 0; n < 12; n++) {
    watch(w, 1000);
    w.gameDraw(g, w.ctx);
    g.peasants.forEach(function (p) { var s = w.pMood(g, p); check(!/undefined|NaN/.test(s), "mood: " + s); });
    g.sites.forEach(function (s) { s.plan.forEach(function (e, k) { if (k % 5 === 0) { var r = w.cellReadout(g, e.i); check(!/undefined|NaN/.test(r), "readout: " + r); } }); });
    check(!/undefined/.test(w.iSummary(g)), "summary: " + w.iSummary(g));
  }
});

var failed = 0, t0 = Date.now();
tests.forEach(function (t) {
  if (only && t.name.indexOf(only) < 0) return;
  var t1 = Date.now();
  try { t.fn(); console.log("ok    " + t.name + "  (" + ((Date.now() - t1) / 1000).toFixed(1) + "s)"); }
  catch (e) { failed++; console.log("FAIL  " + t.name + "\n      " + (e && e.message)); }
});
console.log((failed ? failed + " failed" : "all passed") + " in " + ((Date.now() - t0) / 1000).toFixed(0) + "s");
process.exit(failed ? 1 : 0);
