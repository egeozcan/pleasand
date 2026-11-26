/* =====================================================================
   PLEASAND  --  test/run.js

   does it still work: villages played headless (test/sim.js), with
   some things forced, and checked. run them all, or the ones whose
   names have a word in them:

     node test/run.js
     node test/run.js lift
     node test/run.js -j1 lift      (one at a time, in this process)

   they run side by side, one process to a core (-jN for N of them),
   the longest first, as long as they took last time (test/.timings.json)
   ===================================================================== */
"use strict";
var ARGS = process.argv.slice(2), JOBS = 0, only;
ARGS.forEach(function (a) { var m = /^-j(\d+)$/.exec(a); if (m) JOBS = +m[1]; else only = a; });
var sim = require("./sim.js"), tests = [];
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

/* a build task, as bPick makes one */
function btask(site) { return { kind: "build", site: site, t: 0, act: 0, idle: 0, wait: 0 }; }
/* a quiet flat column, its air cleared, for a site built by hand in a test */
function clearSpot(w, at) {
  var g = w.g, x = at, gy = -1, d, xx, y;
  for (d = 0; d < 30 && gy < 30; d++) {
    for (var sd = -1; sd <= 1; sd += 2) {
      x = at + d * sd; if (x < 6 || x >= g.gw - 6) continue;
      gy = w.mGround(g, x); if (gy > 30) break;
    }
  }
  check(gy > 30, "no ground near " + at);
  for (y = gy - 26; y < gy; y++) for (xx = x - 4; xx <= x + 4; xx++) {
    if (xx < 0 || xx >= g.gw || y < 0) continue;
    w.sandPlace(g, y * g.gw + xx, w.MAT.EMPTY);
  }
  return { x: x, gy: gy };
}
test("the soak observer catches duck and peasant cycles without flagging productive work", function () {
  require("./stuck.js").run();
});

test("ducks escape ash on water without getting stuck or dying", function () {
  var ducks = require("../harness/playtests/check.js");
  ducks.ashCycle(false);
  ducks.ashCycle(true);
});

test("ducks trapped below a ceiling time out, but ducks that can surface survive", function () {
  var ducks = require("../harness/playtests/check.js");
  ducks.submergedCeiling(false);
  ducks.submergedCeiling(true);
  ducks.surfacingResetsTimeout();
});

test("a porch light is put up even when the builder is standing under it", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], spot = clearSpot(w, 200), x = spot.x, gy = spot.gy;
  /* a wall to hang the bracket off, and a lamp in the same column the builder stands in */
  w.sandPlace(g, (gy - 13) * g.gw + x + 1, w.MAT.STONE);
  w.sandPlace(g, (gy - 12) * g.gw + x + 1, w.MAT.STONE);
  var s = w.bNew(g, "lamp", p, [w.bE(g, x, gy - 13, w.MAT.PLANK, 1), w.bE(g, x, gy - 12, w.MAT.LAMP, 2)],
                 [x, gy - 13, x, gy - 12], { side: -1 });
  p.x = x + 0.5; p.y = gy - 1; p.dir = 1; p.boards = 4; p.logs = 0;
  p.task = btask(s.id);
  for (var t = 0; t < 200 && !s.done; t++) w.bTaskBuild(g, p, p.task);
  check(s.done, "the lamp was never built (side " + s.side + ", dir " + p.dir + ", act " + (p.task && p.task.act) + ")");
  check(g.m[(gy - 12) * g.gw + x] === w.MAT.LAMP, "no lantern in the bracket");
});

test("a capped ladder is still climbed when the work is within reach of the top", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], spot = clearSpot(w, 230), x = spot.x, gy = spot.gy, y;
  for (y = gy - 6; y <= gy - 1; y++) { w.sandPlace(g, y * g.gw + x, w.MAT.LADDER); g.aux[y * g.gw + x] = 1; }
  w.sandPlace(g, (gy - 7) * g.gw + x, w.MAT.STONE);
  check(!w.bLadderGoes(g, x, gy - 1), "(the test wants a ladder that goes nowhere)");
  w.sandPlace(g, (gy - 15) * g.gw + x + 1, w.MAT.STONE);
  var s = w.bNew(g, "tower", p, [w.bE(g, x, gy - 15, w.MAT.PLANK, 1)], [x, gy - 15, x, gy - 15], {});
  p.x = x + 0.5; p.y = gy - 1; p.boards = 4;
  p.task = btask(s.id);
  check(w.bReach(g, p, s.plan[0]) === false, "(the test wants the work out of reach on foot)");
  check(w.bLadderReaches(g, x, gy - 1, gy - 15), "(the test wants the ladder to reach the work)");
  w.bTaskBuild(g, p, p.task);
  check(!!p.climb, "the builder would not climb a capped ladder that reaches the work");
});

test("a builder climbs the ladder its own site is still putting up", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], spot = clearSpot(w, 240), x = spot.x, gy = spot.gy, y;
  for (y = gy - 6; y <= gy - 1; y++) { w.sandPlace(g, y * g.gw + x, w.MAT.LADDER); g.aux[y * g.gw + x] = 1; }
  w.sandPlace(g, (gy - 7) * g.gw + x, w.MAT.STONE);
  w.sandPlace(g, (gy - 20) * g.gw + x + 1, w.MAT.STONE);
  var s = w.bNew(g, "tower", p, [
    w.bE(g, x, gy - 2, w.MAT.LADDER, 1),       /* its own ladder: already placed, and it goes nowhere yet */
    w.bE(g, x, gy - 20, w.MAT.PLANK, 2)
  ], [x, gy - 20, x, gy - 20], {});
  p.x = x + 0.5; p.y = gy - 1; p.boards = 4;
  p.task = btask(s.id);
  check(!w.bLadderGoes(g, x, gy - 1), "(the test wants a ladder that goes nowhere)");
  check(!w.bLadderReaches(g, x, gy - 1, gy - 20), "(the test wants the work out of its reach)");
  w.bTaskBuild(g, p, p.task);
  check(!!p.climb, "the builder would not climb a ladder its own site is putting up");
});

test("a route down through a bush is not started from a row too high", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], spot = clearSpot(w, 220), x = spot.x, gy = spot.gy, y;
  for (y = gy - 4; y <= gy - 1; y++) w.sandPlace(g, y * g.gw + x, w.MAT.PLANT);
  var top = gy - 5, dn = w.navSink(g, x, top);
  check(dn >= 0, "(the test wants a bush to go down through)");
  p.x = x + 0.5; p.y = gy - 7;   /* a couple of rows above the top of it */
  p.nav = { key: "down" + x, path: [{ x: x, y: top, m: 0 }, { x: x, y: dn, m: 8 }], i: 0, t: g.tick, off: 0 };
  var left = w.pathGo(g, p, "down" + x, x, dn, w.pathNear(x, dn, 2, 13, 2));
  check(p.nav.t !== -1e9, "the route was thrown away before they were on top of the bush");
  check(p.nav.i === 0 && left === 2, "the wrong waypoint: " + p.nav.i + " of " + left);
});

test("a builder does not climb a ladder that goes nowhere", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], spot = clearSpot(w, 210), x = spot.x, gy = spot.gy, y;
  /* a ladder up into a stone ceiling: no way off at the top */
  for (y = gy - 6; y <= gy - 1; y++) { w.sandPlace(g, y * g.gw + x, w.MAT.LADDER); g.aux[y * g.gw + x] = 1; }  /* (a 1-wide ladder: its middle column) */
  w.sandPlace(g, (gy - 7) * g.gw + x, w.MAT.STONE);
  check(!w.bLadderGoes(g, x, gy - 1), "(the test wants a ladder that goes nowhere)");
  /* something to build, far above, in the same column */
  w.sandPlace(g, (gy - 20) * g.gw + x + 1, w.MAT.STONE);
  var s = w.bNew(g, "tower", p, [w.bE(g, x, gy - 20, w.MAT.PLANK, 1)], [x, gy - 20, x, gy - 20], {});
  p.x = x + 0.5; p.y = gy - 1; p.boards = 4;
  p.task = btask(s.id);
  check(w.bReach(g, p, s.plan[0]) === false, "(the test wants the work out of reach)");
  check(w.bSupported(g, s.plan[0]), "(the test wants a cell that can go in)");
  w.bTaskBuild(g, p, p.task);
  check(!p.climb, "the builder climbed the dead-end ladder at " + x + "," + (gy - 1));
});

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

test("a mine worked out along the bottom opens an upper level, dug from the ladder by somebody from a way off", function () {
  var w = sim.load(1), g = w.g, p = null, k;
  know(g, ["farm", "dig", "mine", "lift"]);
  for (k = 0; k < g.peasants.length && !sites(g, "mine").length; k++) { p = g.peasants[k]; w.mPlanMine(g, p); }
  var m = sim.build(w, sites(g, "mine")[0]);
  check(w.mUpper(m), "(the test wants a shaft deep enough for an upper level)");
  p.iron = 9;
  check(w.mPlanLift(g, p), "no lift on the mine");
  sim.build(w, sites(g, "lift")[0]);
  m.out = { "1": true, "-1": true };
  check(!w.mWorkedOut(m), "a mine with an upper level still to come counted as worked out");
  p.task = null;
  check(w.mPlanTunnel(g, p), "no gallery planned on the upper level");
  var t = sites(g, "tunnel")[0];
  check(t.lv === 1 && t.B === m.B - w.M_LEVEL, "the gallery is not on the upper level");
  p.x = m.col + 40.5; p.y = w.mGround(g, Math.floor(p.x)) - 1; p.climb = null;
  for (k = 0; k < 3000 && !t.done; k++) {
    sim.step(w, 1);
    if (!p.task || p.task.site !== t.id) { p.task = btask(t.id); p.failSite = 0; }
  }
  check(t.done, "the upper gallery was never dug (" + t.plan.filter(function (e) { return !w.bOk(g, e); }).length + " cells left)");
  m.out = { "1": true, "-1": true };
  check(w.mWorkedOut(m), "a mine worked out on both levels still counts as being worked");
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
  /* (nobody off down a mine, bringing more: this is about the pile) */
  g.peasants.forEach(function (q) { q.ore = q.coal = 0; q.task = null; q.mineCD = 1e9; });
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
  know(g, ["farm", "dig", "mine", "masonry", "smelt", "lift", "bell", "oil", "rocket"]);
  g.iron = 6; g.barrels = 12;
  for (var n = 0; n < 12; n++) {
    watch(w, 1000);
    w.gameDraw(g, w.ctx);
    g.peasants.forEach(function (p) { var s = w.pMood(g, p); check(!/undefined|NaN/.test(s), "mood: " + s); });
    g.sites.forEach(function (s) { s.plan.forEach(function (e, k) { if (k % 5 === 0) { var r = w.cellReadout(g, e.i); check(!/undefined|NaN/.test(r), "readout: " + r); } }); });
    check(!/undefined/.test(w.iSummary(g)), "summary: " + w.iSummary(g));
  }
});

test("there is oil in the rock, and a mine can smell it", function () {
  var w = sim.load(2), g = w.g, p = g.peasants[0];
  know(g, ["farm", "dig", "mine"]);
  check(w.oOilInRock(g) > 100, "only " + w.oOilInRock(g) + " cells of oil in the rock");
  check(w.mPlanMine(g, p), "nowhere for a mine");
  sim.build(w, sites(g, "mine")[0]);
  w.oSmell(g);
  check(g.oilSeen && g.found.oil, "the mine did not smell the oil");
  g.iron = 1;
  var idea = w.IDEAS.filter(function (I) { return I.id === "oil"; })[0];
  check(idea && idea.ready(g), "nobody thought of an oil well");
});

/* a shelf of rock right across the valley, high over everybody's heads, too thin to sink a shaft in: the ground under
   open sky is on top of it, and everything worth having is under the valley floor, under it */
function shelf(w) {
  var g = w.g, x, y, hi = 1e9;
  for (x = 0; x < g.gw; x++) { y = w.mSurface(g, x, false, 0); if (y >= 0) hi = Math.min(hi, y); }
  var y0 = hi - 40, y1 = hi - 28;
  check(y0 > 0, "(the test wants room over the valley for a shelf)");
  for (y = y0; y <= y1; y++) for (x = 0; x < g.gw; x++) if (g.m[y * g.gw + x] === w.MAT.EMPTY) w.sandPlace(g, y * g.gw + x, w.MAT.STONE);
  return y1;
}
test("a shelf of rock over the valley: the mine and the well go in on the floor under it", function () {
  var w = sim.load(2), g = w.g, x, k, p;
  know(g, ["farm", "dig", "mine"]);
  var under = shelf(w);
  /* (nowhere on top of the shelf: it is too thin. the old way, from the sky down, found nothing) */
  for (x = 24; x < g.gw - 24; x++) check(!w.mMinePlot(g, x), "a mine plot on top of a shelf too thin for a shaft, at " + x);
  check(w.mFloors(g, 60, true).length >= 2, "the shelf and the floor under it are not two floors");
  for (k = 0; k < g.peasants.length && !sites(g, "mine").length; k++) { p = g.peasants[k]; w.mPlanMine(g, p); }
  var m = sites(g, "mine")[0];
  check(m, "nowhere for a mine under the shelf");
  check(m.y0 > under && m.ref > under, "the mine went in on the shelf, not under it");
  sim.build(w, m);
  w.oSmell(g);
  check(g.oilSeen, "the mine under the shelf did not smell the oil");
  g.know.oil = "TEST"; g.iron = 5;
  p = g.peasants.find(function (q) { return w.oPlanWell(g, q); });
  check(p, "nowhere under the shelf for a well");
  var s = sites(g, "well")[0];
  check(s.T > under && s.pump.y > under, "the derrick went up on top of the shelf");
});

function planOilWell(w) {
  var g = w.g;
  g.know.oil = "TEST"; g.iron = 5;
  var p = g.peasants.find(function (q) { return w.oPlanWell(g, q); });
  check(p, "nowhere to sink a well");
  return { p: p, s: sites(g, "well")[0] };
}
function clearOil(w, keep) {
  var g = w.g;
  for (var j = 0; j < g.m.length; j++) if (j !== keep && g.m[j] === w.MAT.OIL) w.sandPlace(g, j, w.MAT.EMPTY);
}
function standAtPump(p, s) {
  p.x = s.pump.x + 0.5; p.y = s.pump.y; p.state = "walk"; p.task = null;
}

test("an oil well is planned over a pool, and its pump brings the oil up", function () {
  var w = sim.load(7), g = w.g, well = planOilWell(w), p = well.p, s = well.s, i;
  check(s.plan.some(function (e) { return e.v === w.MAT.GIRDER; }), "the derrick has no iron in it");
  check(s.plan.some(function (e) { return e.v === w.MAT.LADDER; }), "the derrick has no ladder in it");
  /* the oil the pump can reach, exactly as oFindOil sees it */
  function poolOil() {
    var n = 0;
    for (var y = s.G + 4; y < Math.min(g.gh - 1, s.G + 90); y++)
      for (var x = Math.max(1, s.col - w.O_SLANT); x <= Math.min(g.gw - 2, s.col + w.O_SLANT); x++)
        if (g.m[y * g.gw + x] === w.MAT.OIL) n++;
    return n;
  }
  var before = poolOil();
  sim.build(w, s);
  w.bFinish(g, s, p);
  check(g.barrels === before - poolOil(), "the gusher made oil out of nothing");
  standAtPump(p, s);
  var made = g.barrels, left = poolOil();
  check(w.oGoPump(g, p), "nobody would take a shift at the pump");
  for (i = 0; i < 1200 && p.task; i++) w.oTask(g, p, p.task);
  check(!p.task && g.barrels - made === w.O_STROKE_N, "the shift did not pump " + w.O_STROKE_N + " barrels");
  check(poolOil() === left - (g.barrels - made), "the pump was not drawing from the pool (" + left + " -> " + poolOil() + ")");
  check(s.tank > 0 && s.tank <= 5, "the tank holds " + s.tank + " barrels");
  check(w.oSumpCount(g, s) > 0, "nothing overflowed into the sump");
  check(!s.dry, "the well went dry at once");
  w.gameDraw(g, w.ctx);
  /* work the pool out, and the well knows it */
  made = g.barrels;
  clearOil(w);
  g.tick += w.O_PUMP;
  w.oStep(g);
  check(s.dry, "the well did not run dry");
  check(!w.oGoPump(g, p) && g.barrels === made, "a dry well was still giving oil");
});

test("an oil well needs ground beneath it, not a floating stone deck", function () {
  var w = sim.load(7), g = w.g, p = g.peasants[0], col = 100, ground = g.gh - 30, deck = ground - 35;
  w.sandClear(g);
  g.m.fill(w.MAT.STONE, (ground + 3) * g.gw);
  g.m.fill(w.MAT.SAND, ground * g.gw, (ground + 3) * g.gw);
  var oil = (ground + 12) * g.gw + col;
  w.sandPlace(g, oil, w.MAT.OIL);
  g.aux[oil] = w.O_RESERVOIR;
  g.know.oil = "TEST"; g.iron = 5;
  p.x = col + 0.5; p.y = ground - 1;
  check(w.oPlanWell(g, p) && g.sites[0].G === ground, "the well would not use solid ground over the pool");
  w.bRemove(g, 0);
  g.m.fill(w.MAT.STONE, deck * g.gw + col - 8, deck * g.gw + col + 9);
  p.y = deck - 1;
  /* (they may still find a spot on the real ground beside it, reaching the pool with a turned bore: never on the deck) */
  check(!w.oPlanWell(g, p) || g.sites[0].G === ground, "the well was planned on a floating deck, with its bore hanging in the air");
});

test("painted oil is neither a mine discovery nor a derrick plot", function () {
  var w = sim.load(7), g = w.g, well = planOilWell(w), s = well.s, p = well.p;
  w.bRemove(g, g.sites.indexOf(s));
  clearOil(w);
  w.sandPlace(g, s.oilY * g.gw + s.col, w.MAT.OIL);
  g.know.mine = "TEST";
  check(w.mPlanMine(g, p), "nowhere for a mine");
  sim.build(w, sites(g, "mine")[0]);
  w.oSmell(g);
  check(!g.oilSeen && !g.found.oil, "the mine discovered painted oil");
  w.bRemove(g, g.sites.indexOf(sites(g, "mine")[0]));
  check(!w.oWellPlot(g, s.dx0, s.G - 1), "painted oil qualified as a derrick plot");
});

test("a derrick cannot pump its own overflow back up", function () {
  var w = sim.load(7), g = w.g, well = planOilWell(w), s = well.s, p = well.p;
  sim.build(w, s);
  standAtPump(p, s);
  clearOil(w);
  s.tank = w.O_TANK;
  check(w.oSpill(g, s), "no oil spilled at the spout");
  var from = s.spill.y * g.gw + s.spill.x, to = (s.G + 5) * g.gw + s.spill.x;
  check(g.m[from] === w.MAT.OIL, "the spout wasn't clear");
  w.sandPlace(g, to, w.MAT.EMPTY);
  w.sandSwap(g, from, to);   /* the spill reached a hole below the derrick */
  check(w.oGoPump(g, p), "the pump was not staffed");
  p.task.act = w.O_PUMP - 1;
  w.oTask(g, p, p.task);
  check(s.dry && g.barrels === 0 && g.m[to] === w.MAT.OIL, "the well counted its own overflow as a new barrel");
});

test("a derrick runs dry even if its last barrel fills the sump", function () {
  var w = sim.load(7), g = w.g, well = planOilWell(w), s = well.s, p = well.p;
  sim.build(w, s);
  standAtPump(p, s);
  var last = w.oFindOil(g, s);
  check(last >= 0, "the well has no reservoir");
  clearOil(w, last);
  s.tank = w.O_TANK;
  for (var dx = -8, n = 0; n < w.O_SPILL_MAX - 1; dx++) if (Math.abs(dx) > 2) {
    w.sandPlace(g, (s.spill.y - 5) * g.gw + s.spill.x + dx, w.MAT.OIL);
    n++;
  }
  check(w.oGoPump(g, p), "the pump was not staffed");
  p.task.act = w.O_PUMP - 1; p.task.n = w.O_STROKE_N - 1;
  w.oTask(g, p, p.task);
  check(!p.task && g.barrels === 1 && w.oSumpCount(g, s) === w.O_SPILL_MAX, "the final barrel did not fill the sump");
  check(!w.oGoPump(g, p), "somebody took another shift at the full well");
  g.tick += w.O_PUMP;
  w.oStep(g);
  check(s.dry, "the full well was never marked dry");
  check(s.note.indexOf("dry") >= 0 && s.note.indexOf(w.O_TANK + " barrels") >= 0, "the readout hid the dry well's remaining stock");
  g.know.rocket = "TEST"; p.iron = 1;
  check(w.oGoPack(g, p), "the dry well's tank could not be used for a pack");
});

test("a derrick gives reservoir oil time to flow back under the drill", function () {
  var w = sim.load(7), g = w.g, s = planOilWell(w).s;
  sim.build(w, s);
  var cell = w.oFindOil(g, s), edge = ((cell / g.gw) | 0) * g.gw + s.col + w.O_SLANT;
  check(cell >= 0 && cell !== edge, "the test needs oil away from the edge of the drill's reach");
  clearOil(w, cell);
  w.sandPlace(g, edge + 1, w.MAT.EMPTY);
  w.sandSwap(g, cell, edge + 1);
  check(w.oFindOil(g, s) < 0, "the test oil is still in reach");
  w.oStep(g);
  check(!s.dry, "the derrick was marked dry before the remaining oil could settle");
  w.sandPlace(g, edge, w.MAT.EMPTY);
  w.sandSwap(g, edge + 1, edge);
  g.tick += w.O_PUMP;
  w.oStep(g);
  check(!s.dry && w.oFindOil(g, s) === edge, "the remaining oil did not stay drillable after moving");
});

test("derrick workers respect the cooldown after giving up on a route", function () {
  var w = sim.load(7), g = w.g, well = planOilWell(w), s = well.s, p = well.p;
  sim.build(w, s);
  g.know.rocket = "TEST"; p.iron = 1; s.tank = w.O_PACK_OIL;
  check(w.oGoPump(g, p), "no shift at the pump");
  w.pGiveUp(g, p, s.pump.x);
  check(!w.oGoPump(g, p) && !w.oGoPack(g, p), "the worker immediately retried the unreachable well");
  g.tick = p.avoidT;
  check(w.oGoPack(g, p), "the worker did not retry after the cooldown");
});

test("a derrick can be pumped even if a pack maker got there first", function () {
  var w = sim.load(7), g = w.g, well = planOilWell(w), s = well.s, p = well.p;
  var q = g.peasants.find(function (other) { return other !== p; });
  sim.build(w, s);
  g.know.rocket = "TEST"; p.iron = 1; s.tank = w.O_PACK_OIL;
  check(w.oGoPack(g, p), "no shift making a pack");
  check(w.oGoPump(g, q), "the pack maker blocked the pump shift");
  p.task = null;
  check(!w.oGoPump(g, p) && w.oGoPack(g, p), "the pump should take one worker and not block pack making");
});

test("a derrick on uneven ground stands its posts under its own legs", function () {
  var w = sim.load(7), g = w.g, p = null, s = null, k, x0, gy, j, r, cols = {};
  g.know.oil = "TEST"; g.iron = 5;
  for (k = 0; k < g.peasants.length && !s; k++) {
    p = g.peasants[k];
    if (w.oPlanWell(g, p)) s = g.sites[g.sites.length - 1];
  }
  check(s && s.kind === "well", "nowhere to sink a well");
  x0 = s.dx0;
  w.bRemove(g, g.sites.indexOf(s));
  gy = w.bGround(g, x0, s.G - 1);
  check(gy > 0 && g.m[(gy + 2) * g.gw + x0] !== w.MAT.EMPTY, "(the test wants two cells of ground to take away)");
  for (k = 0; k < 2; k++) { j = (gy + k) * g.gw + x0; g.m[j] = w.MAT.EMPTY; w.heatSync(g, j); }
  r = w.oWellPlot(g, x0, s.G - 1);
  check(r, "the lowered plot is no longer a plot");
  check(r.fill.length > 0, "nothing was planned under the low leg");
  r.fill.forEach(function (f) { cols[f[0]] = 1; });
  check(cols[x0] === 1, "the posts were not put under the leg at " + x0 + " (" + Object.keys(cols).join(",") + ")");
});

test("a derrick that is stocked with iron goes up without being forced", function () {
  var w = sim.load(8), g = w.g, p = null, s = null, k, t;
  g.know.oil = "TEST"; g.iron = 8;
  for (k = 0; k < g.peasants.length && !s; k++) {
    p = g.peasants[k];
    if (w.oPlanWell(g, p)) s = g.sites[g.sites.length - 1];
  }
  check(s && s.kind === "well", "nowhere to sink a well");
  s.stock = { iron: 40 };
  g.peasants.forEach(function (q) { q.task = null; });
  g.peasants.slice(0, 3).forEach(function (q) { w.bJoin(g, q, s); });
  for (t = 0; t < 6000 && !s.done; t++) {
    sim.step(w, 1);
    if (t % 1000 === 999) g.peasants.forEach(function (q) { if (!q.task) w.bJoin(g, q, s); });
  }
  check(s.done, "the derrick did not go up (" + Math.round(w.bShare(g, s) * 100) + "%)");
});

test("with oil in the tank, a peasant builds a rocket pack and flies it", function () {
  var w = sim.load(7), g = w.g, p = null, s = null, k, i, x;
  g.know.oil = "TEST"; g.know.rocket = "TEST"; g.iron = 5; g.barrels = 12;
  for (k = 0; k < g.peasants.length && !s; k++) {
    p = g.peasants[k];
    if (w.oPlanWell(g, p)) s = g.sites[g.sites.length - 1];
  }
  check(s && s.kind === "well", "nowhere to sink a well");
  var idea = w.IDEAS.filter(function (I) { return I.id === "rocket"; })[0];
  check(idea && idea.ready(g), "nobody thought of rocket packs");
  sim.build(w, s);
  s.tank = 6; p.iron = 1; p.pack = 0; p.task = null;
  p.x = s.pump.x + 0.5; p.y = s.pump.y; p.state = "walk";
  k = { kind: "pack", site: s.id, t: 0, act: 0 };
  for (i = 0; i < 400 && !p.pack; i++) w.oTaskPack(g, p, k);
  check(p.pack, "no rocket pack was built");
  check(s.tank === 6 - w.O_PACK_OIL, "the pack did not take its oil (" + s.tank + ")");
  check(p.iron === 0, "the pack did not take its iron (" + p.iron + ")");
  w.gameDraw(g, w.ctx);   /* (the tank on their back) */
  /* open ground, and up */
  for (x = 20; x < g.gw - 20; x++) { var gy = w.mGround(g, x); if (gy > 20) break; }
  p.x = x + 0.5; p.y = gy - 1; p.state = "walk"; p.task = null; p.idle = 0; p.chute = null; p.climb = null;
  check(w.oLaunch(g, p), "would not launch");
  check(p.state === "fly" && p.immune > 0, "the launch went nowhere");
  w.gameDraw(g, w.ctx);   /* (the flame under it) */
  for (i = 0; i < 1600 && p.state === "fly"; i++) sim.step(w, 1);
  check(!p.dead, "the rocket pack killed them");
  check(p.state === "walk", "still up there");
  sim.step(w, 2);
  check(!p.launch, "the pack is still burning after landing");
});

test("a rocket pack burns oil, is filled up again at the well, points away from the edge, and bowls nobody over", function () {
  var w = sim.load(7), g = w.g, well = planOilWell(w), s = well.s, p = well.p, q, i, gy;
  sim.build(w, s);
  g.know.rocket = "TEST";
  p.pack = 1; p.fuel = 1;
  /* near the left edge of the world, facing it */
  for (var x = 30; x < 90; x++) { gy = w.mGround(g, x); if (gy > 30 && w.pRoom(g, x, gy - 1)) break; }
  p.x = x + 0.5; p.y = gy - 1; p.dir = -1; p.state = "walk"; p.task = null; p.climb = null; p.chute = null;
  /* and somebody standing right beside them */
  q = g.peasants.find(function (o) { return o !== p; });
  q.x = p.x + 1; q.y = p.y; q.state = "walk"; q.task = null; q.climb = null;
  check(w.oLaunch(g, p), "would not launch");
  check(p.vx > 0, "launched at the edge of the world (vx " + p.vx + ")");
  check(p.fuel === 0, "the flight burned no oil");
  for (i = 0; i < 1600 && p.state === "fly"; i++) sim.step(w, 1);
  check(!p.dead && g.peasants.indexOf(p) >= 0, "the rocket pack lost them");
  check(!q.dead && q.state !== "fly", "the take-off knocked their neighbour flying");
  p.state = "walk"; p.launch = 0;
  check(!w.oLaunch(g, p), "an empty pack took off");
  s.tank = w.O_TANK;
  check(w.oGoRefuel(g, p), "nobody went to fill up the empty pack");
  standAtPump(p, s); p.task = { kind: "refuel", site: s.id, t: 0, act: 0 };
  for (i = 0; i < 200 && p.task; i++) w.oTask(g, p, p.task);
  check(p.fuel === w.O_PACK_FUEL && s.tank === w.O_TANK - w.O_PACK_OIL, "the pack was not filled from the tank (" + p.fuel + ", " + s.tank + ")");
});

test("whoever went for wood and found none thinks of forestry, and plants a tree where it has room", function () {
  var w = sim.load(3), g = w.g, p = g.peasants[0], i;
  know(g, ["farm"]);
  g.ideaT = 0; g.tick = 10000;
  w.iTreeless(g, p);
  check(g.treeless === 1 && p.spark === "forest", "nobody noticed the trees were gone");
  p.muse = w.I_MUSE;
  check(w.iEureka(g, p) && g.know.forest === p.name, "the one who went looking did not think of forestry");
  /* clear every tree away, then plant */
  for (var j = 0; j < g.m.length; j++) if ((g.m[j] === w.MAT.WOOD || g.m[j] === w.MAT.SAPLING) && !w.bMarked(g, j % g.gw, (j / g.gw) | 0)) w.sandPlace(g, j, w.MAT.EMPTY);
  p.plantCD = 0; p.task = null;
  check(w.iGoPlant(g, p), "a forester with no woods about them did not go and plant one");
  var k = p.task;
  check(w.bPlantOk(g, k.x, k.y, true) && !w.bSiteAround(g, k.x, k.y, "house", 10), "the sapling spot is no good");
  p.hunger = 0; p.tired = 0;
  /* (somebody else may get a sapling in close by first, which is as good) */
  for (i = 0; i < 1500 && !w.iWoods(g, k.x, 8, 1); i++) { sim.step(w, 1); if (!p.task) p.task = k; }
  check(w.iWoods(g, k.x, 8, 1), "no sapling went in near " + k.x + "," + k.y);
  check(g.got.grove, "nobody noticed the woods were being planted");
  /* and nobody chops down a tree that is still growing */
  var spot = clearSpot(w, 150), tx = spot.x, ty = spot.gy - 1;
  w.sandPlace(g, ty * g.gw + tx, w.MAT.WOOD); w.sandPlace(g, (ty - 1) * g.gw + tx, w.MAT.WOOD); w.sandPlace(g, (ty - 2) * g.gw + tx, w.MAT.SAPLING);
  check(!w.pChoppable(g, tx, ty), "a growing tree was fair game for the axe");
  w.sandPlace(g, (ty - 2) * g.gw + tx, w.MAT.WOOD);
  check(w.pChoppable(g, tx, ty), "a grown tree could not be chopped");
});

test("the one who strikes the ore thinks of smelting, and the next idea is mostly the one on their minds longest", function () {
  var w = sim.load(2), g = w.g, p = g.peasants[0], q = g.peasants[1];
  know(g, ["farm", "dig", "mine"]);
  g.found.coal = g.found.ore = 2; g.found.stone = 30; g.tick = 20000; g.ideaT = 0;
  w.iSpark(g, q, "smelt");
  q.muse = w.I_MUSE;
  check(w.iEureka(g, q) && g.know.smelt === q.name, "the finder thought of " + JSON.stringify(g.know));
  /* masonry has been ready since long ago; the lift only now: the old one wins, more often than not */
  var wins = 0;
  w.eval("mLadders = function () { return 1; }");   /* (so that the lift is ready too) */
  for (var n = 0; n < 40; n++) {
    delete g.know.masonry; delete g.know.lift; g.ideaT = 0; g.iron = 3;
    g.readyT = { masonry: 100, lift: 19990 };
    p.spark = null; p.muse = w.I_MUSE;
    w.iEureka(g, p);
    if (g.know.masonry) wins++;
  }
  check(wins > 20, "the longest-standing idea came first only " + wins + " times in 40");
});

test("a fireworks show goes up well away from anything that burns, and the watchers stand clear of the sparks", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0];
  know(g, ["farm", "festival"]);
  g.festT = 0; p.festCD = 0;
  check(w.iPlanFestival(g, p), "nowhere for a show");
  var k = p.task, x, y;
  for (y = Math.max(0, k.y - 15); y <= k.y + 2; y++) for (x = k.x - w.I_FEST_CLEAR; x <= k.x + w.I_FEST_CLEAR; x++)
    check(!w.P_FLAM[w.pCell(g, x, y)], "something that burns at " + x + "," + y + ", under the sparks");
  /* and a rocket's trail, once it is well up, lights nothing: a hedge either side of its climb, 25 up, is safe */
  var spot = clearSpot(w, 120), hx = spot.x, hy = spot.gy - 25, j0 = (spot.gy - 1) * g.gw + hx, i;
  for (x = hx - 8; x <= hx + 8; x++) if (Math.abs(x - hx) >= 3) w.sandPlace(g, hy * g.gw + x, w.MAT.PLANT);
  w.sandPlace(g, j0, w.MAT.FIREWORK); w.sandLaunch(g, j0);
  for (i = 0; i < 200; i++) sim.step(w, 1);
  for (x = hx - 8; x <= hx + 8; x++) for (y = hy - 2; y <= hy + 2; y++) check(g.m[y * g.gw + x] !== w.MAT.FIRE && g.m[y * g.gw + x] !== w.MAT.EMBER, "the trail set the hedge alight at " + x + "," + y);
});

test("with masonry, a house that burned is put back in stone, and a new one goes up in it", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], h, k, n = 0;
  p.logs = 20;
  check(w.bPlanHouse(g, p), "(the test wants somewhere for a house)");
  h = sites(g, "house").filter(function (s) { return !s.hut; })[0];
  check(!h.plan.some(function (e) { return e.v === w.MAT.BRICK; }), "a village that knows no masonry built in stone");
  sim.build(w, h);
  know(g, ["farm", "masonry"]);
  g.peasants.forEach(function (q) { q.stone = 24; });
  /* and the next one, with stone to spare, goes up in it */
  var q2 = g.peasants[1]; q2.logs = 20; q2.home = 0;
  if (w.bPlanHouse(g, q2)) {
    var h2 = sites(g, "house").filter(function (s) { return !s.hut && s !== h; })[0];
    check(h2.stone && h2.plan.some(function (e) { return e.v === w.MAT.BRICK; }), "the new house is not of stone");
    check(h2.plan.some(function (e) { return e.v === w.MAT.PLANK && e.a === 1; }), "the new house has no window");
    w.bRemove(g, g.sites.indexOf(h2));
  }
  /* the roof burns away */
  h.plan.forEach(function (e) { if (e.v === w.MAT.PLANK && e.a !== 1 && n < 6) { w.sandPlace(g, e.i, w.MAT.EMPTY); n++; } });
  w.bInspect(g, h, g.sites.indexOf(h));
  check(h.repair && h.stone, "the burned house was not to be rebuilt in stone");
  var bricks = h.plan.filter(function (e) { return e.v === w.MAT.BRICK; }).length;
  check(bricks === n, bricks + " cells of stone planned for " + n + " burned");
  check(h.plan.some(function (e) { return e.v === w.MAT.PLANK && e.a === 1; }), "the window went in as stone");
  for (k = 0; k < 800 && !h.done; k++) { p.task = p.task && p.task.site === h.id ? p.task : btask(h.id); w.bTaskBuild(g, p, p.task); sim.step(w, 1); }
  check(h.done, "the house was never rebuilt");
  check(g.got.stonehouse, "nobody noticed it was stone now");
});

test("the greatest mind gets a statue, and the bored go and stand in front of it", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], q = g.peasants[1], i;
  know(g, ["farm", "dig", "mine", "masonry"]);
  ["lamp", "fish", "smelt"].forEach(function (k) { g.know[k] = q.name; });
  g.found.gold = 3;
  var idea = w.IDEAS.filter(function (I) { return I.id === "statue"; })[0];
  check(idea.ready(g, p), "nobody thought of a statue");
  g.know.statue = q.name;
  p.stone = 24; p.gold = 1; p.planCD = 0;
  check(w.iPlanStatue(g, p), "nowhere for a statue");
  var s = sim.build(w, sites(g, "statue")[0]);
  check(s.of === w.iShort(q.name), "the statue is of " + s.of + ", not " + q.name);
  w.iFinish(g, s, p);
  check(g.got.statue, "nobody noticed the statue");
  w.gameDraw(g, w.ctx);
  p.task = null; p.bored = 900;
  check(w.iGoAdmire(g, p), "nobody went to look at it");
  for (i = 0; i < 2400 && p.task && p.task.kind === "admire"; i++) sim.step(w, 1);
  check(p.task === null || p.task.kind !== "admire", "still admiring it");
  check(!/undefined|NaN/.test(w.iSummary(g)) && /statue/i.test(w.bLabel(s)), "the statue reads out wrong: " + w.bLabel(s));
});

test("an old wooden house is done over in stone, board by board, and the boards go in a pocket", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], h, k;
  p.logs = 20;
  check(w.bPlanHouse(g, p), "(the test wants somewhere for a house)");
  h = sim.build(w, sites(g, "house").filter(function (s) { return !s.hut; })[0]);
  know(g, ["farm", "masonry"]);
  g.peasants.forEach(function (q) { q.stone = 24; });
  p.planCD = 0; p.task = null; g.renoT = 0;
  check(w.mRenovate(g, p) && h.redo && !h.done, "the wooden house was not done over");
  var boards = p.boards || 0;
  for (k = 0; k < 6000 && !h.done; k++) { if (!p.task || p.task.site !== h.id) { p.task = btask(h.id); p.failSite = 0; } p.hunger = 0; p.tired = 0; sim.step(w, 1); }
  check(h.done, "the house was never finished in stone");
  check(!h.plan.some(function (e) { return g.m[e.i] === w.MAT.PLANK && e.a !== 1; }), "planks left in a stone house");
  check(h.plan.some(function (e) { return e.a === 1 && g.m[e.i] === w.MAT.PLANK; }), "the window went");
  check((p.boards || 0) > boards, "the old boards went nowhere");
  check(!w.mRenovate(g, p), "the same house was done over twice");
});

test("a peasant with coal and no logs makes a fire of it, and it smoulders", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], i, ground = g.gh - 30, spot = { x: 100, gy: ground };
  w.sandClear(g);
  g.m.fill(w.MAT.SAND, ground * g.gw);
  g.peasants.forEach(function (q) { if (q !== p) { q.x = 20.5; q.y = ground - 1; } });
  p.x = spot.x + 0.5; p.y = spot.gy - 1; p.logs = 0; p.coal = 5; p.dir = 1; p.task = null; p.state = "walk";
  var cx = -1;
  for (var d = 3; d <= 5 && cx < 0; d++) if (w.pCampOk(g, p, spot.x + d, spot.gy - 1)) cx = spot.x + d;
  check(cx >= 0, "(the test wants room for a fire)");
  p.task = { kind: "camp", x: cx, y: spot.gy - 1, t: 0, act: 0, coal: true };
  for (i = 0; i < 200 && p.task; i++) sim.step(w, 1);
  var lit = 0;
  for (var x = cx - 1; x <= cx + 1; x++) for (var y = spot.gy - 2; y <= spot.gy - 1; y++) if (g.m[y * g.gw + x] === w.MAT.EMBER || g.m[y * g.gw + x] === w.MAT.COAL) lit++;
  check(p.coal < 5 && lit > 0, "no coal fire (" + p.coal + " coal left, " + lit + " cells)");
});

test("oil is smelled by a mine whose workings come near it, and a dry field puts buckets in their heads", function () {
  var w = sim.load(2), g = w.g, p = g.peasants[0];
  know(g, ["farm", "dig", "mine"]);
  check(w.mPlanMine(g, p), "nowhere for a mine");
  var m = sim.build(w, sites(g, "mine")[0]);
  /* every pool of oil out of reach of it: nothing */
  var moved = 0;
  for (var j = 0; j < g.m.length; j++) if (w.oReservoirOil(g, j) && Math.abs(j % g.gw - m.col) < w.O_SNIFF + 10) { w.sandPlace(g, j, w.MAT.STONE); moved++; }
  w.oSmell(g);
  check(!g.oilSeen, "a mine smelled oil from across the valley");
  var near = (m.B - 2) * g.gw + m.x1 + 10;
  w.sandPlace(g, near, w.MAT.OIL); g.aux[near] = w.O_RESERVOIR;
  w.oSmell(g);
  check(g.oilSeen, "the mine did not smell the oil next to it");
  var bucket = w.IDEAS.filter(function (I) { return I.id === "bucket"; })[0];
  g.burnt = false;
  check(!bucket.ready(g, p) || sites(g, "farm").length, "buckets came out of nowhere");
  g.sites.push({ kind: "farm", id: 999, plan: [], x0: 0, x1: 0, y0: 0, y1: 0, cx: 0, cy: 0 });
  check(bucket.ready(g, p), "a village with a field and a spade did not think of buckets");
});

test("a bucket thrown from inside a bush wets the bush, it does not set fire to it", function () {
  var w = sim.load(1), g = w.g, spot = clearSpot(w, 200), x = spot.x, y = spot.gy - 6, k, j = y * g.gw + x;
  for (k = -1; k <= 1; k++) w.sandPlace(g, y * g.gw + x + k, w.MAT.PLANT);
  var water = function () { var n = 0; for (var i = 0; i < g.m.length; i++) if (g.m[i] === w.MAT.WATER) n++; return n; }, n0 = water();
  var q = w.partAdd(g, w.PK_DEBRIS, x + 0.5, y + 0.5, 0.5, -0.2, 240, 0, w.MAT.WATER);
  g.pt[q] = 854;   /* (a bucketful of warm water: as much heat as the thrower in seed 3 carried) */
  sim.step(w, 1);
  var landed = 0;
  for (var dy = -3; dy <= 3; dy++) for (var dx = -3; dx <= 3; dx++) if (g.m[(y + dy) * g.gw + x + dx] === w.MAT.WATER) landed++;
  check(landed > 0, "the bucketful never landed as water by the bush");
  for (k = 1; k < 40; k++) sim.step(w, 1);
  for (k = -1; k <= 1; k++) check(g.T[y * g.gw + x + k] < 120, "the bush went to " + g.T[y * g.gw + x + k].toFixed(0) + " degrees");
  /* (it landed as water, wherever it has run off to since: it did not boil away) */
  var steam = 0;
  for (var i = 0; i < g.m.length; i++) if (g.m[i] === w.MAT.STEAM && Math.abs(i % g.gw - x) < 10) steam++;
  check(water() >= n0 && !steam, "the water vanished (" + n0 + " -> " + water() + ", " + steam + " steam)");
});

test("iron is forged into tools at the furnace, which go faster and wear out", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], i;
  know(g, ["farm", "dig", "mine", "smelt", "forge"]);
  check(w.mPlanFurnace(g, p), "nowhere for a furnace");
  var f = sim.build(w, sites(g, "furnace")[0]);
  p.iron = 2; p.tools = 0; p.task = null;
  check(w.mGoForge(g, p), "nobody went to forge tools");
  p.x = f.sx + 0.5; p.y = w.mGround(g, f.sx) - 1;
  for (i = 0; i < 400 && p.task; i++) w.mTask(g, p, p.task);
  check(p.tools && p.iron === 1, "no tools forged (" + p.tools + ", " + p.iron + " iron)");
  check(g.got.forge, "nobody noticed the first tools");
  for (i = 0; i < w.M_WEAR; i++) w.mWear(g, p);
  check(!p.tools, "the tools never wore out");
});

test("with no tower to hang it from, the bell goes on the beam of a lift", function () {
  var w = sim.load(1), g = w.g, p = null, k;
  know(g, ["farm", "dig", "mine", "lift", "bell"]);
  for (k = 0; k < g.peasants.length && !sites(g, "mine").length; k++) { p = g.peasants[k]; w.mPlanMine(g, p); }
  sim.build(w, sites(g, "mine")[0]);
  p.iron = 9;
  check(w.mPlanLift(g, p), "no lift");
  sim.build(w, sites(g, "lift")[0]);
  g.found.gold = 2;
  var idea = w.IDEAS.filter(function (I) { return I.id === "bell"; })[0];
  check(idea.ready(g, p), "a village with a lift and gold did not think of a bell");
  p.gold = 3;
  check(w.mPlanBell(g, p), "nowhere on the lift for the bell");
  var b = sim.build(w, sites(g, "bell")[0]);
  w.mFinish(g, b, p);
  check(w.mRing(g, 1), "the bell does not ring");
  w.gameDraw(g, w.ctx);
});

test("the village chips in coal and gold for a bigger fireworks show, with a golden finale", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], q = g.peasants[1], i;
  know(g, ["farm", "festival"]);
  g.festT = 0; p.festCD = 0; q.coal = 5; q.gold = 2;
  check(w.iPlanFestival(g, p), "nowhere for a show");
  var k = p.task, n0 = k.n;
  for (i = 0; i < 2000 && !k.on; i++) { sim.step(w, 1); if (p.task !== k) p.task = k; }
  check(k.on && k.gold && k.n === n0 + 3, "the show did not take the coal and gold (" + k.n + "/" + n0 + ", gold " + k.gold + ")");
  check(q.coal === 2 && q.gold === 1, "nothing came out of the pockets (" + q.coal + ", " + q.gold + ")");
});

test("a gallery goes on through the rock for the stone once there is nothing better ahead", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], k;
  know(g, ["farm", "dig", "mine"]);
  for (k = 0; k < g.peasants.length && !sites(g, "mine").length; k++) { p = g.peasants[k]; w.mPlanMine(g, p); }
  var m = sim.build(w, sites(g, "mine")[0]);
  /* nothing worth having anywhere in the rock */
  for (var j = 0; j < g.m.length; j++) if (g.m[j] === w.MAT.COAL || g.m[j] === w.MAT.ORE || g.m[j] === w.MAT.GOLD || g.m[j] === w.MAT.ROCKSALT) g.m[j] = w.MAT.STONE;
  var r = w.mTunnelPlot(g, m, 1) || w.mTunnelPlot(g, m, -1);
  check(r && r.plan.length > 0 && !r.ore, "no gallery for the stone");
});

test("a bucket spilled down the head of a mine is bailed out, not swum in for ever", function () {
  var w = sim.load(1), g = w.g, p = null, k;
  know(g, ["farm", "dig", "mine"]);
  for (k = 0; k < g.peasants.length && !sites(g, "mine").length; k++) { p = g.peasants[k]; w.mPlanMine(g, p); }
  var m = sim.build(w, sites(g, "mine")[0]);
  var j1 = (m.S - 1) * g.gw + m.col, j2 = j1 + 1;
  w.sandPlace(g, j1, w.MAT.WATER); w.sandPlace(g, j2, w.MAT.WATER);
  w.bInspect(g, m, g.sites.indexOf(m));
  check(m.repair, "a puddle on the ladder did not reopen the mine");
  for (k = 0; k < 3000 && !m.done; k++) { if (!p.task || p.task.site !== m.id) { p.task = btask(m.id); p.failSite = 0; } p.hunger = 0; p.tired = 0; sim.step(w, 1); }
  check(m.done, "the puddle was never bailed out");
  check(!m.plan.some(function (e) { return w.LIQUID[g.m[e.i]]; }), "water left in the mine");
});

test("peasants grow old and go quietly, and somebody new walks into the valley", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], i;
  sim.step(w, 120);
  var n = g.peasants.filter(function (q) { return !q.dead; }).length, rip = g.rip;
  check(g.popGoal === n, "the valley does not know how many it holds (" + g.popGoal + ")");
  /* very old, and asleep */
  p.born = g.tick - w.pLifespan(p) - 10; p.sleep = 100; p.task = null;
  for (i = 0; i < 120; i++) sim.step(w, 1);
  check(p.dead && g.rip === rip + 1, "old age did not take them");
  check(g.dead.length && /old|life|peaceful|nodded/.test(g.dead[g.dead.length - 1].note), "the cross would not say how: " + JSON.stringify(g.dead));
  g.arriveT = 0;
  for (i = 0; i < 400 && g.peasants.filter(function (q) { return !q.dead; }).length < n; i++) sim.step(w, 1);
  check(g.peasants.filter(function (q) { return !q.dead; }).length === n, "nobody new came");
  check(g.got.arrive, "nobody noticed the newcomer");
});

test("one graveyard, never more than ten crosses: the oldest weathers away, and nobody puts it back", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], k, L;
  know(g, ["grave"]);
  function owe(n) { g.dead.push({ name: "TEST " + n, note: "rest easy", site: 0 }); }
  for (k = 0; k < 14; k++) {
    owe(k);
    check(w.iPlanGrave(g, p), "no cross for the " + (k + 1) + "th");
    sim.build(w, sites(g, "grave").filter(function (s) { return !s.done; })[0]);
    L = sites(g, "grave");
    check(L.length <= w.I_GRAVE_MAX, L.length + " crosses standing");
  }
  check(L.length === w.I_GRAVE_MAX, "only " + L.length + " crosses");
  var xs = L.map(function (s) { return s.cx; }), lo = Math.min.apply(null, xs), hi = Math.max.apply(null, xs);
  check(hi - lo <= w.I_GRAVE_GAP * (w.I_GRAVE_MAX + 2), "crosses all over the valley: " + xs.join(","));
  check(!w.iGraveDue(g), "a cross that weathered away is owed again");
  /* an old village, with crosses everywhere: they go, one at a time, down to ten */
  var at = L[0];
  for (k = 0; k < 3; k++) w.bNew(g, "grave", p, [], [at.x0 + 60 + k * 9, at.y0, at.x1 + 60 + k * 9, at.y1], { of: "OLD " + k, done: true });
  for (k = 0; k < 4; k++) w.iGraveyardStep(g);
  check(sites(g, "grave").length === w.I_GRAVE_MAX, sites(g, "grave").length + " crosses after weathering");
});

test("a peasant you make yourself raises the count the valley keeps up, and a new valley counts again", function () {
  var w = sim.load(2), g = w.g, i;
  sim.step(w, 120);
  var n = g.popGoal;
  check(n > 0, "(the test wants a village)");
  g.sel = w.PICK.findIndex(function (k) { return k.tool === "peasant"; });
  g.cx = 60; g.cy = 20; g.btn = 0; g.keys = {};
  g.mx = w.PANEL + g.cx * w.CELL; g.my = w.PLAY_Y + g.cy * w.CELL;
  w.gameTap(g, g.mx, g.my);
  check(g.popGoal === n + 1, "making a peasant did not raise the count (" + n + " -> " + g.popGoal + ")");
  w.sandLandscape(g);
  check(g.popGoal == null, "a new valley kept the old one's count");
  sim.step(w, 120);
  check(g.popGoal === g.peasants.filter(function (q) { return !q.dead; }).length, "the new valley did not count its own");
});

test("now and then a duck walks into the valley, but not into a valley full of ducks", function () {
  var w = sim.load(3), g = w.g, i;
  sim.step(w, 120);
  var n = g.ducks.length;
  g.duckArriveT = g.tick;
  for (i = 0; i < 61; i++) sim.step(w, 1);
  check(g.ducks.length > n, "no duck walked in");
  var d = g.ducks[g.ducks.length - 1];
  check(d.x < 40 || d.x > g.gw - 40, "the newcomer did not come from the edge (x " + d.x + ")");
  for (i = 0; i < 240; i++) sim.step(w, 1);
  check(!d.dead, "the newcomer died on arrival");
  /* and a full pond gets nobody new */
  while (g.ducks.filter(function (q) { return !q.baby; }).length < w.D_ARRIVE_UPTO) w.duckWalkIn(g, 0);
  n = g.ducks.length; g.duckArriveT = g.tick;
  for (i = 0; i < 61; i++) sim.step(w, 1);
  check(g.ducks.length <= n, "ducks kept coming into a full valley");
  /* and a family brings its ducklings along behind it */
  var mom = w.duckWalkIn(g, 4), kids = g.ducks.filter(function (q) { return q.baby && q.lead; });
  check(mom && kids.length >= 1, "the mother came without her ducklings");
});

test("with nowhere else for a mine, one of two fields is dug up for it, and never the last", function () {
  var w = sim.load(4), g = w.g, p = g.peasants[0], k, f;
  know(g, ["farm", "dig", "mine"]);
  /* two fields, then every other plot in the valley ruled out by a mine already there */
  for (k = 0; k < 2; k++) { p.planCD = 0; check(w.iPlanFarm(g, p), "(the test wants two fields)"); sim.build(w, sites(g, "farm")[k]); }
  w.eval("var __mp = mMinePlot; mMinePlot = function (g, cx, ref) { var r = M_FARMOK ? __mp(g, cx, ref) : null; return r && mFieldsUnder(g, cx - r.hw - 2, cx + r.hw + 2) ? r : null; }");
  var fields = sites(g, "farm").length, ok = w.mPlanMine(g, p);
  if (ok) {
    check(sites(g, "farm").length === fields - 1, "the mine went in without digging up exactly one field");
    check(sites(g, "mine").length === 1, "no mine");
  }
  /* and with one field left, it stays */
  g.sites.filter(function (s) { return s.kind === "mine"; }).forEach(function (s) { w.bRemove(g, g.sites.indexOf(s)); });
  while (sites(g, "farm").length > 1) w.bRemove(g, g.sites.indexOf(sites(g, "farm")[0]));
  check(!w.mPlanMine(g, p) && sites(g, "farm").length === 1, "the last field was dug up for a mine");
});

test("the next greatest mind gets a statue of their own, but not the same one twice", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], q = g.peasants[1], r = g.peasants[2];
  know(g, ["farm", "dig", "mine", "masonry"]);
  ["lamp", "fish", "smelt"].forEach(function (k) { g.know[k] = q.name; });
  ["bucket", "grave"].forEach(function (k) { g.know[k] = r.name; });
  g.know.statue = q.name; g.found.gold = 5; p.stone = 24; p.gold = 2; p.planCD = 0;
  check(w.iPlanStatue(g, p), "no first statue");
  sim.build(w, sites(g, "statue")[0]);
  p.planCD = 0;
  check(w.iPlanStatue(g, p), "no second statue");
  var two = sites(g, "statue");
  check(two.length === 2 && two[0].of !== two[1].of, "the same mind got two statues: " + two.map(function (s) { return s.of; }));
});

test("a bell on a house goes up on the ridge, out of everybody's way, and leaves the doors clear", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0];
  p.logs = 20;
  check(w.bPlanHouse(g, p), "(the test wants a house)");
  var h = sim.build(w, sites(g, "house").filter(function (s) { return !s.hut; })[0]);
  know(g, ["farm", "bell"]); g.found.gold = 3; p.gold = 3;
  check(w.mPlanBell(g, p), "nowhere for the bell");
  var b = sites(g, "bell")[0], y, k;
  check(w.bSite(g, b.on) === h, "the bell is not on the house");
  b.plan.forEach(function (e) { check(((e.i / g.gw) | 0) < h.F - 14, "a piece of the belfry at row " + ((e.i / g.gw) | 0) + ", below the ridge (" + (h.F - 14) + ")"); });
  /* the doors, and a cell either side of them, still have a peasant's height of room */
  for (k = -1; k <= 1; k++) for (y = h.F - 9; y < h.F; y++) {
    check(!b.plan.some(function (e) { return e.i === y * g.gw + h.x0 + k || e.i === y * g.gw + h.x1 + k; }), "the bell is in a doorway");
  }
});

test("a peasant who never eats at all starves in the end, and a newcomer does not walk in the same day", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], i;
  sim.step(w, 120);
  p.hunger = w.P_STARVE - 5;
  /* (on the ground, not halfway up a rope: a rope is no place to notice you are hungry) */
  p.rope = null; p.climb = null; p.jumping = false; p.task = null; p.y = w.mGround(g, Math.floor(p.x)) - 1;
  for (i = 0; i < 20 && !p.dead; i++) sim.step(w, 1);
  check(p.dead, "nobody ever starves");
  var q = g.peasants[1];
  q.born = g.tick - w.pLifespan(q) - 10; q.sleep = 100; q.task = null; g.arriveT = 0;
  for (i = 0; i < 70 && !q.dead; i++) sim.step(w, 1);
  check(q.dead && g.arriveT > g.tick + 1000, "a newcomer is due the moment somebody dies (" + (g.arriveT - g.tick) + ")");
});

/* a shelf of stone drawn in the sky over the left of the valley, filled to the brim with a lake, and a pillar at its
   right-hand end leaning out over the water (as somebody drew it in a village where everybody ended up in it) */
function skyLake(w) {
  var g = w.g, x, y;
  function put(x, y, v) { w.sandPlace(g, y * g.gw + x, v); }
  [[26, 117, 120], [27, 116, 121], [28, 116, 121], [29, 116, 122], [30, 117, 122], [31, 117, 123], [32, 117, 123], [33, 118, 124],
   [34, 118, 125], [35, 119, 125], [36, 119, 125], [37, 120, 125], [38, 120, 125], [39, 120, 126], [40, 121, 127], [41, 120, 128],
   [42, 120, 129], [43, 120, 129], [44, 120, 129], [45, 120, 129], [46, 120, 129]]
    .forEach(function (r) { for (x = r[1]; x <= r[2]; x++) put(x, r[0], w.MAT.STONE); });
  for (y = 47; y < 56; y++) for (x = 0; x <= 129; x++) put(x, y, w.MAT.STONE);
  for (y = 36; y < 47; y++) for (x = 0; x < 120; x++) if (!w.SOLID[g.m[y * g.gw + x]]) put(x, y, w.MAT.WATER);
}

test("a peasant swimming in a lake whose only bank leans out over the water ropes up it, and gets out", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], t, rip = g.rip;
  sim.step(w, 120);
  skyLake(w);
  p.x = 100.5; p.y = 41; p.task = null; p.rope = null; p.climb = null; p.jumping = false; p.falling = false; p.nav = null;
  for (t = 0; t < 6000 && (p.swimming || p.rope || p.y > 36 && p.y < 47); t++) sim.step(w, 1);
  check(!p.swimming && !p.dead && g.rip === rip, "still in the lake after 6000 ticks, at " + Math.floor(p.x) + "," + Math.floor(p.y));
});

test("somebody new walks in on the ground the village lives on, not onto a shelf or a pond in the sky", function () {
  var w = sim.load(1), g = w.g, i, x, y;
  sim.step(w, 120);
  g.sites.forEach(function (s) { sim.build(w, s); });
  check(g.sites.some(function (s) { return s.done; }), "(the test wants something built)");
  skyLake(w);
  /* and a dry shelf over the right-hand edge */
  for (y = 45; y < 52; y++) for (x = 200; x < g.gw; x++) w.sandPlace(g, y * g.gw + x, w.MAT.STONE);
  var floor = function (x) { for (var y = 60; y < g.gh; y++) if (!w.AIRY[g.m[y * g.gw + x]]) return y; return -1; };
  /* under the lake on the left, and under the dry shelf on the right: the valley floor, not the top of either */
  [8, 226].forEach(function (x) {
    var y = w.pArriveY(g, x);
    check(y > 60 && Math.abs(y - floor(x)) < 3, "at column " + x + " they would walk in at " + y + ", not on the valley floor (" + floor(x) + ")");
  });
  var n = g.peasants.length;
  g.popGoal = g.peasants.filter(function (q) { return !q.dead; }).length + 1; g.arriveT = 0;
  for (i = 0; i < 60 && g.peasants.length === n; i++) sim.step(w, 1);
  check(g.peasants.length > n, "nobody new came");
  var q = g.peasants[g.peasants.length - 1];
  check(q.y > 60 && !q.swimming, q.name + " walked in at " + Math.floor(q.x) + "," + Math.floor(q.y) + ", up in the sky");
});

test("gold to spare is left at the foot of a statue, for luck", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], q = g.peasants[1], i, n0 = 0, n1 = 0;
  know(g, ["farm", "dig", "mine", "masonry"]);
  ["lamp", "fish", "smelt"].forEach(function (k) { g.know[k] = q.name; });
  g.know.statue = q.name; g.found.gold = 3; p.stone = 24; p.gold = 1; p.planCD = 0;
  check(w.iPlanStatue(g, p), "nowhere for a statue");
  var s = sim.build(w, sites(g, "statue")[0]);
  for (i = 0; i < g.m.length; i++) if (g.m[i] === w.MAT.GOLD) n0++;
  p.gold = 5;
  for (var tries = 0; tries < 12 && p.gold === 5; tries++) {
    p.task = { kind: "admire", site: s.id, side: 1, t: 0, act: 0 };
    p.x = s.px + 4.5; p.y = s.G - 1;
    for (i = 0; i < 400 && p.task; i++) w.iTask(g, p, p.task);
  }
  for (i = 0; i < g.m.length; i++) if (g.m[i] === w.MAT.GOLD) n1++;
  check(p.gold === 4 && n1 === n0 + 1, "no offering (" + p.gold + " gold, " + n0 + " -> " + n1 + " cells)");
});

test("a tree grown up at the mouth of the furnace is felled, and the iron comes out again", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], k;
  know(g, ["farm", "dig", "mine", "smelt"]);
  check(w.mPlanFurnace(g, p), "nowhere for a furnace");
  var f = sim.build(w, sites(g, "furnace")[0]);
  check(f.plan.some(function (e) { return e.clear; }), "the furnace keeps no place clear to stand at its mouth");
  /* a trunk right where the smelter stands */
  var tx = f.sx, ty = w.mGround(g, tx) - 1;
  for (k = 0; k < 6; k++) w.sandPlace(g, (ty - k) * g.gw + tx, w.MAT.WOOD);
  w.bInspect(g, f, g.sites.indexOf(f));
  check(f.repair, "the blocked mouth did not reopen the furnace");
  g.peasants.forEach(function (q) { q.mineCD = 1e9; });
  for (k = 0; k < 4000 && !f.done; k++) { if (!p.task || p.task.site !== f.id) { p.task = btask(f.id); p.failSite = 0; } p.hunger = 0; p.tired = 0; sim.step(w, 1); }
  check(f.done, "the tree was never cleared");
  f.stock = { ore: 3, coal: 3 }; var iron = g.iron;
  g.peasants.forEach(function (q) { q.ore = q.coal = 0; });
  watch(w, 6000);
  check(g.iron > iron, "no iron after the mouth was cleared");
});

test("sand slid in over the furnace's mouth after it was built is dug out, and the iron comes out again", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], k, X, Y;
  know(g, ["farm", "dig", "mine", "smelt"]);
  check(w.mPlanFurnace(g, p), "nowhere for a furnace");
  var f = sim.build(w, sites(g, "furnace")[0]), o = f.spots[0], n = f.plan.length;
  /* a heap of sand, four deep, over where the smelter stands (deeper than anything planned clear there) */
  for (X = o.x - 1; X <= o.x + 1; X++) { if (X >= o.a && X <= o.b) continue; for (Y = o.y; Y > o.y - 4; Y--) w.sandPlace(g, Y * g.gw + X, w.MAT.SAND); }
  w.bInspect(g, f, g.sites.indexOf(f));
  check(f.repair, "the buried mouth did not reopen the furnace");
  g.peasants.forEach(function (q) { q.mineCD = 1e9; });
  for (k = 0; k < 6000 && !f.done; k++) { if (!p.task || p.task.site !== f.id) { p.task = btask(f.id); p.failSite = 0; } p.hunger = 0; p.tired = 0; sim.step(w, 1); }
  check(f.done, "the sand was never cleared");
  check(w.mGround(g, o.x) >= o.y, "sand still heaped over the mouth");
  f.stock = { ore: 3, coal: 3 }; var iron = g.iron;
  g.peasants.forEach(function (q) { q.ore = q.coal = 0; });
  watch(w, 6000);
  check(g.iron > iron, "no iron after the mouth was cleared");
});

test("sand heaped against a watchtower's door, so nobody can walk in, is dug away", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], k, X;
  know(g, ["farm", "dig", "masonry"]);
  check(w.mPlanTower(g, p), "nowhere for a tower");
  var t = sim.build(w, sites(g, "tower")[0]), o = t.spots[1];
  check(w.mDoorOpen(g, o), "the new tower's door cannot be walked into");
  /* a bank of sand three high across the way in, under the lintel (a step or two they duck under: three, no) */
  for (X = o.door + 1; X <= o.door + 3; X++) for (var Y = w.mGround(g, X) - 1; Y >= t.F - 3; Y--) w.sandPlace(g, Y * g.gw + X, w.MAT.SAND);
  check(!w.mDoorOpen(g, o), "a bank three high up to the door, under its lintel, is still walkable");
  w.bInspect(g, t, g.sites.indexOf(t)); g.tick += 600; w.bInspect(g, t, g.sites.indexOf(t));   /* (blocked twice running) */
  check(t.repair, "the blocked door did not reopen the tower");
  for (k = 0; k < 6000 && !t.done; k++) { if (!p.task || p.task.site !== t.id) { p.task = btask(t.id); p.failSite = 0; } p.hunger = 0; p.tired = 0; sim.step(w, 1); }
  check(t.done && w.mDoorOpen(g, o), "the way in was never dug out");
});

test("a really hungry peasant goes for the wheat in a field, however far, rather than down the mine", function () {
  var w = sim.load(1), g = w.g, k, f = null;
  for (k = 0; k < 40 && !f; k++) {
    sim.step(w, 1000);
    f = sites(g, "farm").filter(function (s) { return s.plan.some(function (e) { return g.m[e.i] === w.MAT.WHEAT; }); })[0];
  }
  check(f, "no field ever had wheat in it");
  var p = g.peasants.filter(function (q) { return !q.dead; }).sort(function (a, b) { return Math.abs(b.x - f.cx) - Math.abs(a.x - f.cx); })[0];
  p.hunger = w.P_HUNGRY * 3; p.task = null; p.eatCD = 0; p.avoidT = 0; p.boards = p.logs = 0;
  w.pPickTask(g, p);
  check(p.task && p.task.kind === "eat", "a starving peasant did not go for food: " + (p.task && p.task.kind));
  check(g.m[p.task.y * g.gw + p.task.x] === w.MAT.WHEAT, "they went for something other than the field's wheat");
  check(p.task.want, "no long walk allowed for it");
});

test("with iron to spare, a village puts up an iron street lamp between the houses, and it is lit", function () {
  var w = sim.load(1), g = w.g, k, h = null;
  for (k = 0; k < 30 && !h; k++) { sim.step(w, 1000); h = sites(g, "house").filter(function (s) { return s.done; })[0]; }
  check(h, "no house ever went up");
  know(g, ["lamp", "mine", "smelt", "forge"]);
  var p = g.peasants.filter(function (q) { return !q.dead; })[0];
  g.peasants.forEach(function (q) { q.iron = 0; }); p.iron = 20;
  check(w.IDEAS.filter(function (I) { return I.id === "post"; })[0].ready(g), "nobody thought of street lamps with 20 iron to hand");
  g.know.post = "TEST";
  check(w.iPlanPost(g, p), "nowhere for a street lamp");
  var s = sites(g, "post")[0];
  sim.build(w, s);
  check(s.done && g.m[s.plan[s.plan.length - 1].i] === w.MAT.LAMP, "the lamp is not up on its post");
  /* (a post is iron: nobody has to walk round it) */
  check(w.P_PASS[w.MAT.GIRDER], "the post is in everybody's way");
  w.gameDraw(g, w.ctx);
});

test("a peasant with a rocket pack under a roof walks out to open sky, and flies from there", function () {
  var w = sim.load(7), g = w.g, k, x, p = g.peasants[0];
  g.know.oil = "TEST"; g.know.rocket = "TEST";
  /* stood under a stone slab, with open ground about */
  for (x = 60; x < g.gw - 60; x++) { var gy = w.mGround(g, x); if (gy > 40 && w.oSkyOk(g, x, gy - 1)) break; }
  for (k = -2; k <= 2; k++) w.sandPlace(g, (gy - 12) * g.gw + x + k, w.MAT.STONE);
  g.peasants.forEach(function (q) { if (q !== p) q.x = 5; });
  p.x = x + 0.5; p.y = gy - 1; p.state = "walk"; p.task = null; p.pack = 1; p.fuel = 2; p.bored = 2000; p.hunger = 0;
  check(!w.oLaunch(g, p), "launched straight up into the stone");
  check(w.oGoLaunch(g, p), "found nowhere with open sky");
  for (k = 0; k < 2000 && p.state !== "fly"; k++) { p.hunger = 0; p.tired = 0; sim.step(w, 1); }
  check(p.state === "fly", "never got off the ground");
});

test("a site nobody can ever walk to is given up after enough tries, and a furnace's standing row is the one over the ground", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], k;
  know(g, ["farm", "dig", "mine", "smelt", "masonry"]);
  check(w.mPlanFurnace(g, p), "nowhere for a furnace");
  var f = sites(g, "furnace")[0];
  check(f.sy === w.mGround(g, f.sx) - 1, "the furnace's standing row is " + f.sy + ", the ground under it at " + w.mGround(g, f.sx));
  check(w.mPlanTower(g, p), "nowhere for a tower");
  var t = sites(g, "tower")[0];
  for (k = 0; k < 30 && g.sites.indexOf(t) >= 0; k++) w.bFail(g, p, t, 10, "walk");
  check(g.sites.indexOf(t) < 0, "a tower nobody could get to " + k + " times is still planned (lost " + t.lost + ")");
});

/* -------------------------------------------------------------------
   what is left over (leftovers.js)
   ------------------------------------------------------------------- */
/* a layer of v, n deep, over the top of the ground from x0 to x1 */
function coat(w, x0, x1, v, n) {
  var g = w.g;
  for (var x = x0; x <= x1; x++) {
    var G = w.mGround(g, x);
    if (G < 2) continue;
    for (var k = 1; k <= n; k++) { var j = (G - k) * g.gw + x; if (w.AIRY[g.m[j]]) w.sandPlace(g, j, v); }
  }
}
function count(w, v) { var n = 0; for (var i = 0; i < w.g.m.length; i++) if (w.g.m[i] === v) n++; return n; }

test("loose ash and salt lying about are picked up, and the ash puts potash into a farmer's head", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], x = Math.floor(p.x);
  know(g, ["farm"]);
  w.iPlanFarm(g, p, true); sim.build(w, sites(g, "farm")[0]);
  coat(w, x + 6, x + 12, w.MAT.ASH, 1);
  p.task = null; p.bored = 800; p.lGatherT = 0;
  check(w.lGoGather(g, p) && p.task.kind === "gather", "nobody went to pick up the ash");
  for (var k = 0; k < 2000 && p.task && p.task.kind === "gather"; k++) sim.step(w, 1);
  check((p.ash || 0) >= 3 && g.found.ash >= 3, "only " + (p.ash || 0) + " ash in their pockets");
  check(p.spark === "potash" || g.know.potash, "sweeping ash by a field put nothing in their head (" + p.spark + ")");
  /* (a lump of glass the lightning left is a find; a glass window is not) */
  var G = w.mGround(g, x + 30);
  for (var dx = 0; dx < 20; dx++) w.sandPlace(g, (G - 1) * g.gw + x + 20 + dx, w.MAT.GLASS);
  check(!w.lPickable(g, p, x + 25, G - 1), "they would take a glass wall to pieces");
});

test("with snow on the ground, the bored throw snowballs at each other, and it spreads", function () {
  var w = sim.load(1), g = w.g, x = Math.floor(g.peasants[0].x), most = 0;
  coat(w, x - 40, x + 40, w.MAT.SNOW, 2);
  g.peasants.forEach(function (q) { q.bored = 800; q.hunger = 0; q.lSnowT = 1e9; });   /* (no snowmen: this is about the fight) */
  for (var t = 0; t < 5000; t++) {
    sim.step(w, 1);
    most = Math.max(most, g.peasants.filter(function (q) { return q.task && q.task.kind === "snowball"; }).length);
  }
  check(g.lfights >= 1, "nobody ever threw one back");
  check(most >= 3 && g.got.snowball, "at most " + most + " in a snowball fight");
});

test("a snowman is built out of the snow about, with a name, and melts in the end", function () {
  var w = sim.load(2), g = w.g, p = g.peasants[0], x = Math.floor(p.x), k, m = null;
  coat(w, x - 50, x + 50, w.MAT.SNOW, 2);
  g.peasants.forEach(function (q) { q.x = 5; q.task = null; });   /* (out of the way) */
  p.x = x + 0.5; p.y = w.mGround(g, x) - 1; p.bored = 800; p.hunger = 0; p.task = null;
  var snow = w.pFind(g, p, w.P_SNOW, 40, w.lSnowy, 10);
  check(w.lGoSnowman(g, p, snow), "nowhere for a snowman");
  for (k = 0; k < 3000 && !(m = g.lsnowmen.filter(function (s) { return s.up; })[0]); k++) { sim.step(w, 1); if (!p.task) p.task = { kind: "snowman", man: g.lsnowmen[0].id, t: 0, act: 0, hand: 0 }; }
  check(m, "no snowman finished in 3000 ticks");
  var his = w.L_SNOWMAN.filter(function (c) { return w.pCell(g, m.x + c[1], m.G - 1 - c[0]) === w.MAT.PACKSNOW; }).length;
  check(his === w.L_SNOWMAN.length, his + " cells of packed snow, for a snowman of " + w.L_SNOWMAN.length);
  check(g.feed.some(function (f) { return f.text.indexOf("snowman") >= 0 && f.text.indexOf(w.iName(m.name)) >= 0; }), "the snowman has no name in the news");
  /* the thaw: packed snow melts like snow does, and he is mourned */
  for (var i = 0; i < g.m.length; i++) if (g.m[i] === w.MAT.PACKSNOW) { g.T[i] = 10; g.lat[i] = 2000; }
  sim.step(w, 300);
  check(g.lsnowmen.indexOf(m) < 0 && count(w, w.MAT.PACKSNOW) === 0, "the snowman did not melt");
  check(g.feed.some(function (f) { return f.text.indexOf("has melted") >= 0; }), "nobody noticed he melted");
});

test("a bored peasant goes skating on a stretch of ice, on purpose, back and forth", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], x = Math.floor(p.x), xx, laps = 0;
  for (xx = x - 30; xx <= x + 30; xx++) w.sandPlace(g, w.mGround(g, xx) * g.gw + xx, w.MAT.ICE);
  p.task = null; p.bored = 800; p.hunger = 0; p.lSkateT = 0;
  check(w.lGoSkate(g, p), "no ice to skate on");
  for (var t = 0; t < 2000 && p.task && p.task.kind === "skate"; t++) { sim.step(w, 1); laps = Math.max(laps, p.task ? p.task.laps : 0); }
  check(g.got.skate, "they never got onto the ice");
  check(laps >= 1, "they never turned round on it");
});

test("salt is flung on the ice where somebody slipped, and melts it into brine", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], x = Math.floor(p.x) + 12, xx, y = 0;
  know(g, ["salt"]);
  /* ice a good few cells thick, so it does not just melt on its own */
  for (xx = x - 6; xx <= x + 6; xx++) { y = w.mGround(g, xx); for (var d = 0; d < 4; d++) w.sandPlace(g, (y + d) * g.gw + xx, w.MAT.ICE); }
  g.lslip.push({ x: x, y: w.mGround(g, x), t: g.tick });
  g.peasants.forEach(function (q) { q.x = 5; q.task = null; });
  p.x = x - 14.5; p.y = w.mGround(g, x - 15) - 1; p.salt = 6; p.task = null; p.lGritT = 0;
  check(w.lGoGrit(g, p), "nobody went to salt the ice");
  var ice0 = count(w, w.MAT.ICE);
  for (var t = 0; t < 2500; t++) sim.step(w, 1);
  check(p.salt <= 4 && g.got.grit, "only " + (6 - p.salt) + " handfuls of salt flung");
  check(count(w, w.MAT.ICE) < ice0 - 4 && count(w, w.MAT.SALTWATER) > 0, "the ice did not melt (" + ice0 + " -> " + count(w, w.MAT.ICE) + ")");
});

test("a fish caught on a full stomach is salted and kept, and eaten when they are hungry", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0];
  know(g, ["salt", "fish"]);
  p.salt = 2; p.hunger = 0;
  check(w.lSaltFish(g, p) && p.fish === 1 && p.salt === 1, "the fish was not salted");
  p.hunger = w.P_HUNGRY * 3; p.task = null; p.eatCD = 0;
  w.pPickTask(g, p);
  check(p.fish === 0 && p.hunger === w.P_HUNGRY * 3 - 1400 && g.got.saltfish, "the salt fish was not eaten");
});

test("potash makes the wheat grow faster, on its own field only, and frost stops it", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0];
  know(g, ["farm", "potash"]);
  w.iPlanFarm(g, p, true);
  var f = sim.build(w, sites(g, "farm")[0]), i = f.plan.filter(function (e) { return e.v === w.MAT.CROP; })[0].i, x = i % g.gw;
  g.lboost = new Uint8Array(g.gw); g.lboostY = new Int16Array(g.gw);
  check(w.lGrowth(g, i, x) === 1, "plain wheat grows at " + w.lGrowth(g, i, x));
  g.peasants.forEach(function (q) { q.x = 5; q.task = null; });
  p.x = f.cx; p.y = f.G - 1; p.ash = 3; p.task = null;
  check(w.lGoPotash(g, p), "nobody went to rake ash into the field");
  for (var t = 0; t < 1500 && p.task; t++) sim.step(w, 1);
  sim.step(w, 20);
  check(f.potash > g.tick && w.lGrowth(g, i, x) === w.L_GROW, "potash did not speed it up (" + w.lGrowth(g, i, x) + ")");
  g.T[i] = -5;
  check(w.lGrowth(g, i, x) === 0, "frozen wheat still grows");
  /* (the boost is the field's own: a bush in the same columns, well up a cliff over it, gets none of it) */
  check(w.lBoost(g, x, f.G - 1) & 1 && !w.lBoost(g, x, f.G - 40), "the potash reaches up the whole column");
});

test("coal, salt and ash are ground into black powder, never by a fire", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0];
  know(g, ["mine", "powder"]);
  p.coal = 2; p.salt = 2; p.ash = 4; p.hunger = 0; p.task = { kind: "grind", t: 0, act: 0, away: 0 };
  /* a torch burning a few steps off: they walk off from it first */
  var fx = Math.floor(p.x) + 9, fy = Math.floor(p.y) - 2;
  w.sandPlace(g, fy * g.gw + fx, w.MAT.TORCH);
  for (var t = 0; t < 1200 && p.task && p.task.kind === "grind"; t++) sim.step(w, 1);
  check(p.powder === 1 && p.coal === 1 && p.salt === 1 && p.ash === 2, "no powder made: " + w.mPockets(p));
  check(Math.abs(p.x - fx) > 10, "they ground it right next to the torch");
});

test("a charge set in a gallery takes the face out a few columns at once, and whoever lit it stands well back", function () {
  var w = sim.load(2), g = w.g, p = null, k;
  know(g, ["farm", "dig", "mine", "powder"]);
  for (k = 0; k < g.peasants.length && !sites(g, "mine").length; k++) { p = g.peasants[k]; w.mPlanMine(g, p); }
  sim.build(w, sites(g, "mine")[0]);
  p.task = null;
  check(w.mPlanTunnel(g, p), "no gallery");
  var tn = sites(g, "tunnel")[0], rock = function () { return tn.plan.filter(function (e) { return w.ROCK[g.m[e.i]]; }).length; };
  check(!w.lFace(g, tn), "a charge would go in right by the shaft, with nowhere to stand back to");
  /* (the first stretch dug by hand) */
  tn.plan.forEach(function (e) { if (e.ph < 10 && w.ROCK[g.m[e.i]]) w.sandPlace(g, e.i, w.MAT.EMPTY); });
  var r0 = rock();
  g.peasants.forEach(function (q) { if (q !== p) { q.task = null; q.mineCD = 1e9; q.x = 5; } });
  p.powder = 1; p.hunger = 0; p.x = tn.xa + 0.5; p.y = tn.B; p.climb = null; p.task = null;
  check(w.lGoBlast(g, p), "no charge set");
  var far = 0;
  g.peasants.forEach(function (q) { if (q !== p) q.taskCD = 1e9; });   /* (nobody else down there with a pick) */
  for (var t = 0; t < 2000 && !g.got.blast; t++) { sim.step(w, 1); if (g.lcharges.length) far = Math.abs(p.x - g.lcharges[0].x); }
  check(r0 - rock() >= 12, "the charge took out " + (r0 - rock()) + " cells");
  check(far >= 8, "they were " + far.toFixed(1) + " from it when it went off");
  check(!(p.stun > 0), "whoever lit it flattened themselves");
  check(g.got.blast && !p.dead, "no blast, or it killed them");
});

test("a charge thrown in the pond brings up fish for whoever is on the bank, and puts the ducks up", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0];
  know(g, ["fish", "powder"]);
  g.peasants.forEach(function (q) { q.task = null; q.taskCD = 1e9; });
  p.taskCD = 0; p.powder = 1; p.hunger = 2000; p.bored = 1000; p.lBombT = 0;
  check(w.lGoBombFish(g, p), "no pond to throw it in");
  var h0 = 0;
  for (var t = 0; t < 4000 && !g.got.bombfish; t++) { sim.step(w, 1); if (p.task && p.task.kind === "bombfish") h0 = p.hunger; }
  check(g.got.bombfish && p.powder === 0, "the charge never went in the pond");
  check(p.hunger < h0, "whoever threw it did not eat");
});

test("glass is made at the furnace out of sand and coal, and a glasshouse goes up over a field", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0];
  know(g, ["farm", "dig", "mine", "smelt", "glass"]);
  check(w.mPlanFurnace(g, p), "nowhere for a furnace");
  var fu = sim.build(w, sites(g, "furnace")[0]);
  fu.stock = { coal: 10 };
  w.iPlanFarm(g, p, true);
  var f = sim.build(w, sites(g, "farm")[0]);   /* (a field wanting a roof: that is what the glass is for) */
  g.peasants.forEach(function (q) { q.task = null; q.mineCD = 1e9; });
  p.task = { kind: "glassblow", site: fu.id, t: 0, act: 0, n: 0 }; p.hunger = 0;
  for (var t = 0; t < 3600 && p.task && p.task.kind === "glassblow"; t++) sim.step(w, 1);
  check((p.glass || 0) >= 2 && g.got.glass, "no glass made: " + w.mPockets(p));
  p.glass = 14; p.iron = 6; p.task = null; p.planCD = 0;
  check(w.lPlanGlasshouse(g, p), "no glasshouse planned");
  var gh = sites(g, "glasshouse")[0];
  check(gh.plan.every(function (e) { return e.v !== w.MAT.GLASS || ((e.i / g.gw) | 0) === f.G - w.L_ROOF; }), "the roof is not over the field");
  check(w.P_PASS[w.MAT.GIRDER], "the posts are in everybody's way");
  for (t = 0; t < 6000 && !gh.done; t++) sim.step(w, 1);
  sim.step(w, 20);
  check(gh.done && g.lboost[f.x0] & 2, "the glasshouse never went up (" + Math.round(w.bShare(g, gh) * 100) + "%)");
  check(!w.iThirsty(g, f), "a field under glass still wants watering");
  /* the glass keeps the warmth in: chill the field hard, and under the roof it comes back up, a little at a time */
  var crop = f.plan.filter(function (e) { return e.v === w.MAT.CROP; }).map(function (e) { return e.i; });
  crop.forEach(function (i) { g.T[i] = -6; });
  check(crop.every(function (i) { return w.lGrowth(g, i, i % g.gw) === 0; }), "chilled wheat under glass still grows");
  sim.step(w, 1200);
  var warm = crop.filter(function (i) { return g.T[i] > w.L_FROST; }).length;
  check(warm >= crop.length - 1, "only " + warm + " of " + crop.length + " stalks warmed back up under the glass");
});

test("a snowman is nobody's to dig up, and packed snow melts, dissolves and blows apart like snow", function () {
  var w = sim.load(2), g = w.g, p = g.peasants[0], x = Math.floor(p.x), k;
  coat(w, x - 50, x + 50, w.MAT.SNOW, 2);
  var snow = w.pFind(g, p, w.P_SNOW, 40, w.lSnowy, 10);
  check(w.lGoSnowman(g, p, snow), "nowhere for a snowman");
  var m = g.lsnowmen[0];
  check(w.bMarked(g, m.x, m.G - 3) && w.bMarked(g, m.x, m.G), "a snowman's spot is not marked as anybody's");
  /* a site given up elsewhere re-marks the plans: the snowman stays marked */
  know(g, ["farm"]); w.iPlanFarm(g, g.peasants[3], true);
  var fi = g.sites.indexOf(sites(g, "farm")[0]); w.bRemove(g, fi);
  check(w.bMarked(g, m.x, m.G - 3), "removing a site unmarked the snowman");
  w.lDropMan(g, m);
  check(!w.bMarked(g, m.x, m.G - 3), "a snowman given up still holds his spot");
  /* packed snow: a bang melts it, it does not set it on fire */
  var spot = clearSpot(w, 120), X = spot.x, Y = spot.gy - 6, dx, dy;
  for (dy = 0; dy < 3; dy++) for (dx = 0; dx < 3; dx++) w.sandPlace(g, (Y + dy) * g.gw + X + dx, w.MAT.PACKSNOW);
  w.sandBoom(g, (Y + 1) * g.gw + X - 2, 3, 1);
  for (dy = 0; dy < 3; dy++) for (dx = 0; dx < 3; dx++) check(g.m[(Y + dy) * g.gw + X + dx] !== w.MAT.FIRE, "a bang set packed snow on fire");
  /* and salt melts it, as it melts snow */
  var s2 = clearSpot(w, 200), j = (s2.gy - 1) * g.gw + s2.x;
  w.sandPlace(g, j, w.MAT.PACKSNOW); g.T[j] = -15; w.sandPlace(g, j - g.gw, w.MAT.SALT);
  for (k = 0; k < 200 && g.m[j] === w.MAT.PACKSNOW; k++) { g.T[j] = -15; sim.step(w, 1); }
  check(g.m[j] !== w.MAT.PACKSNOW, "salt does not melt packed snow");
});

test("full pockets of ash go into the store by the furnace, and the makings of a charge are fetched back out", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0];
  know(g, ["farm", "dig", "mine", "smelt", "powder"]);
  check(w.mPlanFurnace(g, p), "nowhere for a furnace");
  var f = sim.build(w, sites(g, "furnace")[0]);
  g.peasants.forEach(function (q) { q.task = null; q.taskCD = 1e9; q.mineCD = 1e9; });
  p.taskCD = 0; p.ash = 12; p.lStoreT = 0; p.hunger = 0;
  check(w.lGoStore(g, p) && p.task.put, "full pockets of ash went nowhere");
  for (var t = 0; t < 2400 && p.task && p.task.kind === "store"; t++) sim.step(w, 1);
  check(p.ash === w.L_KEEP && f.stock.ash === 12 - w.L_KEEP, "the ash did not go in the store: " + p.ash + " in hand, " + f.stock.ash + " stored");
  /* coal and salt, and no ash (and the village has charges enough, so this is a fetch, not a grind): the ash is fetched */
  p.ash = 0; p.coal = 2; p.salt = 2; p.powder = 1; g.peasants[1].powder = 2; p.task = null; p.lStoreT = 0;
  check(w.lGoStore(g, p) && !p.task.put && p.task.what === "ash", "nobody went to the store for ash");
  for (t = 0; t < 2400 && p.task && p.task.kind === "store"; t++) sim.step(w, 1);
  check(p.ash >= 2, "no ash fetched out of the store (" + p.ash + ")");
});

test("a village short of salt boils a bucket of brine down at the furnace", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0];
  know(g, ["farm", "dig", "mine", "smelt", "salt", "bucket"]);
  check(w.mPlanFurnace(g, p), "nowhere for a furnace");
  var fu = sim.build(w, sites(g, "furnace")[0]);
  fu.stock = { coal: 1 };   /* (a lump of coal to boil it on) */
  /* a little pool of brine in the ground a way off: stone round it, so it stays put */
  var x0 = fu.x1 + 20, G = w.mGround(g, x0), x, y;
  for (x = x0 - 1; x <= x0 + 6; x++) for (y = G; y <= G + 3; y++) w.sandPlace(g, y * g.gw + x, x === x0 - 1 || x === x0 + 6 || y === G + 3 ? w.MAT.STONE : w.MAT.SALTWATER);
  g.peasants.forEach(function (q) { q.task = null; q.taskCD = 1e9; q.mineCD = 1e9; q.salt = 0; });
  p.taskCD = 0; p.hunger = 0; p.lBrineT = 0; p.x = x0 - 5.5; p.y = w.mGround(g, x0 - 6) - 1; p.wade = false;
  check(w.lGoBrine(g, p), "nobody went for brine");
  for (var t = 0; t < 3600 && p.task && p.task.kind === "brine"; t++) sim.step(w, 1);
  check((p.salt || 0) >= 1 && g.brineT, "no salt out of the brine (" + p.salt + ")");
  check(fu.stock.coal === 0, "boiling it burned no coal");
});

test("a glasshouse keeps the wheat warmer than the open field through a cold snap, out of the ground's own warmth", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0];
  know(g, ["farm", "dig", "mine", "smelt", "glass"]);
  w.iPlanFarm(g, p, true); var f = sim.build(w, sites(g, "farm")[0]);
  w.iPlanFarm(g, g.peasants[5], true); var f2 = sim.build(w, sites(g, "farm").filter(function (s) { return s !== f; })[0]);
  p.glass = 14; p.iron = 6; p.planCD = 0;
  check(w.lPlanGlasshouse(g, p), "no glasshouse");
  var gh = sim.build(w, sites(g, "glasshouse")[0]);
  function avg(F) { var c = F.plan.filter(function (e) { return e.v === w.MAT.CROP; }); return c.reduce(function (a, e) { return a + g.T[e.i]; }, 0) / c.length; }
  function inside(x, y) { return x >= gh.x0 && x <= gh.x1 && y > gh.R && y <= f.G; }
  for (var t = 0; t < 1000; t++) {
    for (var y = 0; y < g.gh; y++) for (var x = 0; x < g.gw; x++) { var j = y * g.gw + x; if (g.m[j] === w.MAT.EMPTY && !inside(x, y)) g.T[j] = -15; }
    sim.step(w, 1);
  }
  check(avg(f) > w.L_FROST && avg(f2) < w.L_FROST, "under glass " + avg(f).toFixed(1) + ", in the open " + avg(f2).toFixed(1));
});

test("with coal, salt and ash on the furnace's pile, somebody fetches the makings and grinds a charge", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0];
  know(g, ["farm", "dig", "mine", "smelt", "powder", "salt"]);
  check(w.mPlanFurnace(g, p), "nowhere for a furnace");
  var f = sim.build(w, sites(g, "furnace")[0]);
  f.stock = { coal: 4, salt: 4, ash: 8 };
  g.peasants.forEach(function (q) { q.task = null; q.taskCD = 1e9; q.mineCD = 1e9; q.coal = q.salt = q.ash = q.powder = 0; });
  p.taskCD = 0; p.hunger = 0;
  for (var k = 0; k < 40 && !(p.task && p.task.kind === "store" && p.task.want < 0); k++) { p.task = null; p.lStoreT = 0; w.lGoStore(g, p); }
  check(p.task && p.task.kind === "store" && p.task.want < 0, "nobody went to the pile for the makings of a charge");
  for (var t = 0; t < 3000 && !(p.powder >= 1); t++) sim.step(w, 1);
  check(p.powder >= 1, "no charge ground out of the pile: " + w.mPockets(p) + ", pile " + JSON.stringify(f.stock));
});

test("a snowman blown apart by a bang is not said to have melted", function () {
  var w = sim.load(2), g = w.g, p = g.peasants[0], x = Math.floor(p.x), k, m = null;
  coat(w, x - 50, x + 50, w.MAT.SNOW, 2);
  g.peasants.forEach(function (q) { q.x = 5; q.task = null; });
  p.x = x + 0.5; p.y = w.mGround(g, x) - 1; p.bored = 800; p.hunger = 0; p.task = null;
  check(w.lGoSnowman(g, p, w.pFind(g, p, w.P_SNOW, 40, w.lSnowy, 10)), "nowhere for a snowman");
  for (k = 0; k < 3000 && !(m = g.lsnowmen.filter(function (s) { return s.up; })[0]); k++) { sim.step(w, 1); if (!p.task && g.lsnowmen[0]) p.task = { kind: "snowman", man: g.lsnowmen[0].id, t: 0, act: 0, hand: 0 }; }
  check(m, "no snowman");
  p.x = 5;
  w.sandBoom(g, (m.G - 3) * g.gw + m.x, 5, 1.2);
  sim.step(w, 60);
  check(g.lsnowmen.indexOf(m) < 0, "he survived the bang");
  check(g.feed.some(function (f) { return f.text.indexOf("nobody saw what happened") >= 0; }), "the bang was reported as a thaw");
});

test("a blast through half-molten rock leaves no impossibly hot air, and nobody works a gallery with a lit fuse in it", function () {
  var w = sim.load(2), g = w.g, p = null, k;
  know(g, ["farm", "dig", "mine", "powder"]);
  for (k = 0; k < g.peasants.length && !sites(g, "mine").length; k++) { p = g.peasants[k]; w.mPlanMine(g, p); }
  sim.build(w, sites(g, "mine")[0]);
  p.task = null;
  check(w.mPlanTunnel(g, p), "no gallery");
  var tn = sites(g, "tunnel")[0];
  tn.plan.forEach(function (e) { if (e.ph < 10 && w.ROCK[g.m[e.i]]) w.sandPlace(g, e.i, w.MAT.EMPTY); });
  var f = w.lFace(g, tn);
  check(f, "no face to blast");
  tn.plan.forEach(function (e) { if (e.ph >= f.ph && w.ROCK[g.m[e.i]]) { g.T[e.i] = 1150; g.lat[e.i] = 4400; } });
  g.lcharges.push({ x: f.x, y: tn.B - 3, site: tn.id, ph: f.ph, who: p.id, fuse: 50 });
  /* a builder sent to it while the fuse burns: off again */
  var q = g.peasants.filter(function (o) { return o !== p; })[0];
  q.task = { kind: "build", site: tn.id, t: 0, act: 0, idle: 0, wait: 0 };
  w.bTaskBuild(g, q, q.task);
  check(!q.task, "somebody went on digging with a lit fuse in the gallery");
  check(!w.iFieldWork(g, q, 400, "tunnel"), "a gallery with a lit fuse in it is offered as work");
  for (k = 0; k < 60; k++) sim.step(w, 1);
  var hot = 0;
  for (var i = 0; i < g.m.length; i++) if (g.T[i] > 3000) hot++;
  check(hot === 0, hot + " cells over 3000 degrees after the blast");
});

test("a hard frost kills ripe wheat too, from the top of the stalk down", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0];
  know(g, ["farm"]);
  w.iPlanFarm(g, p, true);
  var f = sim.build(w, sites(g, "farm")[0]), i = f.plan.filter(function (e) { return e.v === w.MAT.CROP; })[0].i;
  w.sandPlace(g, i, w.MAT.CROP); w.sandPlace(g, i - g.gw, w.MAT.WHEAT);   /* (a stalk with a ripe ear on it) */
  for (var k = 0; k < 60 && g.m[i - g.gw] === w.MAT.WHEAT; k++) { g.T[i] = g.T[i - g.gw] = -30; w.lFrostKill(g); }
  check(g.m[i - g.gw] !== w.MAT.WHEAT, "the ripe ear shrugged off a hard frost");
});

test("a glasshouse past mending is let go, and a new one goes up over what is left of it", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0];
  know(g, ["farm", "dig", "mine", "smelt", "glass"]);
  w.iPlanFarm(g, p, true); var f = sim.build(w, sites(g, "farm")[0]);
  p.glass = 14; p.iron = 6; p.planCD = 0;
  check(w.lPlanGlasshouse(g, p), "no glasshouse");
  var gh = sim.build(w, sites(g, "glasshouse")[0]), panes = gh.plan.filter(function (e) { return e.v === w.MAT.GLASS; });
  w.lFinish(g, gh, p);
  panes.slice(0, 11).forEach(function (e) { w.sandPlace(g, e.i, w.MAT.STONE); });
  gh.badT = g.tick - 10000; gh.repair = false;
  w.lStep(g);
  check(sites(g, "glasshouse").length === 0, "a roof past mending is still somebody's job");
  panes.slice(0, 11).forEach(function (e) { w.sandPlace(g, e.i, w.MAT.EMPTY); });
  p.planCD = 0;
  check(w.lPlanGlasshouse(g, p), "what was left of the old glasshouse stops a new one going up");
});

test("a miner on the far side of the gallery stands back for a lit fuse too", function () {
  var w = sim.load(2), g = w.g, p = null, k;
  know(g, ["farm", "dig", "mine", "powder"]);
  for (k = 0; k < g.peasants.length && !sites(g, "mine").length; k++) { p = g.peasants[k]; w.mPlanMine(g, p); }
  sim.build(w, sites(g, "mine")[0]);
  p.task = null;
  check(w.mPlanTunnel(g, p), "no gallery");
  var tn = sites(g, "tunnel")[0];
  tn.plan.forEach(function (e) { if (e.ph < 10 && w.ROCK[g.m[e.i]]) w.sandPlace(g, e.i, w.MAT.EMPTY); });
  var q = g.peasants.filter(function (o) { return o !== p; })[0];
  q.task = { kind: "build", site: tn.id, t: 0, act: 0, idle: 0, wait: 0 }; q.x = 3; q.y = w.mGround(g, 3) - 1;   /* (a long way off, on their way) */
  p.powder = 1; p.x = w.lFace(g, tn).x - tn.dir * 3 + 0.5; p.y = tn.B; p.climb = null;
  check(w.lGoBlast(g, p), "no charge");
  for (k = 0; k < 200 && !g.lcharges.length; k++) sim.step(w, 1);
  check(g.lcharges.length, "the charge was never set");
  check(q.task && q.task.kind === "standback", "a miner on their way to the face was not told: " + (q.task && q.task.kind));
});

test("somebody who comes down into a gallery after the fuse is lit is sent back too", function () {
  var w = sim.load(2), g = w.g, p = null, k;
  know(g, ["farm", "dig", "mine", "powder"]);
  for (k = 0; k < g.peasants.length && !sites(g, "mine").length; k++) { p = g.peasants[k]; w.mPlanMine(g, p); }
  sim.build(w, sites(g, "mine")[0]);
  p.task = null;
  check(w.mPlanTunnel(g, p), "no gallery");
  var tn = sites(g, "tunnel")[0];
  tn.plan.forEach(function (e) { if (e.ph < 10 && w.ROCK[g.m[e.i]]) w.sandPlace(g, e.i, w.MAT.EMPTY); });
  var fx = w.lFace(g, tn).x;
  g.lcharges.push({ x: fx, y: tn.B - 3, site: tn.id, ph: 0, who: p.id, fuse: 200 });
  var q = g.peasants.filter(function (o) { return o !== p; })[0];
  q.x = fx - tn.dir * 3 + 0.5; q.y = tn.B; q.climb = null; q.task = null; q.state = "walk"; q.sleep = 900;   /* (having a nap down there, even) */
  for (k = 0; k < 10; k++) sim.step(w, 1);
  check(q.task && q.task.kind === "standback", "a late arrival by the face was not sent back: " + (q.task && q.task.kind));
  for (k = 0; k < 190 && g.lcharges.length; k++) sim.step(w, 1);
  check(!(q.stun > 0), "the late arrival was flattened by the blast, at " + q.x.toFixed(1) + " (face " + fx + ")");
});

test("clearing the world takes the charges, snowballs and snowmen with it", function () {
  var w = sim.load(1), g = w.g;
  g.lcharges.push({ x: 50, y: 50, site: 1, ph: 0, who: 1, fuse: 30 });
  g.lballs.push({ x: 50, y: 50, vx: 0, vy: 0, from: 1, kind: "snow", t: 0 });
  g.lsnowmen.push({ id: 99, x: 60, G: 100, n: 0, up: true, name: "TEST", who: "X" });
  w.sandClear(g);
  check(!g.lcharges.length && !g.lballs.length && !g.lsnowmen.length, "something of ours outlived the clear");
});

test("something lying right at their feet goes in a pocket in passing, on any errand", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], fx = Math.floor(p.x), G = w.mGround(g, fx + 1);
  w.sandPlace(g, (G - 1) * g.gw + fx + 1, w.MAT.ASH);
  p.task = { kind: "explore", x: fx + 60, y: G - 1, t: 0 };
  for (var t = 0; t < 40 && !(p.ash >= 1); t++) { w.lPassBy(g, p); }
  check(p.ash === 1 && g.found.ash === 1, "the ash at their feet was left lying");
});

test("rock salt in the rock comes up out of a mine as salt", function () {
  var w = sim.load(2), g = w.g, p = g.peasants[0], j;
  check(count(w, w.MAT.ROCKSALT) > 40, "no rock salt in the valley");
  for (j = 0; j < g.m.length && g.m[j] !== w.MAT.ROCKSALT; j++);
  var s = { plan: [], last: 0 };
  w.mMine(g, s, { i: j }, p);
  check(g.m[j] === w.MAT.EMPTY && p.salt === 1 && g.found.salt === 1 && g.got.salt, "rock salt did not come up as salt");
  /* and hot enough, it cracks out of the rock as salt */
  for (j = 0; j < g.m.length && g.m[j] !== w.MAT.ROCKSALT; j++);
  for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) g.T[j + dy * g.gw + dx] = 1500;
  sim.step(w, 2);
  check(g.m[j] === w.MAT.SALT || g.m[j] === w.MAT.EMPTY, "rock salt at 900 is still " + w.MAT_NAME[g.m[j]]);
});

test("a peasant on fire with black powder in their pockets goes off", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0];
  p.powder = 2; w.pIgnite(g, p);
  for (var t = 0; t < 400 && !g.got.pockets; t++) sim.step(w, 1);
  check(g.got.pockets && !(p.powder > 0), "their pockets never went off");
});

test("a peasant a step above a doorway's floor ducks under the lintel and walks in", function () {
  var w = sim.load(1), g = w.g, p = g.peasants[0], k;
  know(g, ["farm", "dig", "masonry"]);
  check(w.mPlanTower(g, p), "nowhere for a tower");
  var t = sim.build(w, sites(g, "tower")[0]), o = t.spots[1], X;
  /* a ridge a step high outside the door, nothing under the lintel inside */
  for (X = o.door + 1; X <= o.door + 3; X++) for (var Y = w.mGround(g, X) - 1; Y >= t.F - 1; Y--) w.sandPlace(g, Y * g.gw + X, w.MAT.SAND);
  check(w.mDoorOpen(g, o), "the route finder will not duck under a lintel a step down");
  g.peasants.forEach(function (q) { q.x = 5; });
  p.x = o.door + 3.5; p.y = t.F - 2; p.state = "walk"; p.task = null; p.dir = -1; p.idle = 0;
  for (k = 0; k < 60; k++) w.pStepX(g, p, 0.18);
  check(p.x < o.door + 0.9, "they walked into the lintel and stopped, at " + p.x.toFixed(1) + "," + p.y);
});

test("a save loads into another village and carries on exactly as the first would have", function () {
  var open = require("../harness").open, a = open({ seed: 14 });
  a.give(["farm", "bucket", "dig", "mine"]);
  a.step(2500);
  var doc = JSON.parse(JSON.stringify(a.saveDoc()));   /* through a real round of json, as a file would be */
  var at = a.hash();
  a.step(600);
  var b = open({ seed: 99 }), r = b.load(doc);
  check(r.deterministic && r.hash === at, "loaded hash " + r.hash + ", saved at " + at);
  b.step(600);
  check(b.hash() === a.hash(), "after 600 more ticks they differ: " + b.hash() + " vs " + a.hash());
  check(!doc.checksFailed.length, "a healthy village failed checks: " + doc.checksFailed.join(", "));
  /* who is who survives: hats are the game's own hats, and a pointer to a peasant is that peasant */
  var g = b.g, hats = b.P_HATS;
  check(g.peasants.every(function (p) { return !p.hat || hats.indexOf(p.hat) >= 0; }), "a hat is a copy, not one of P_HATS");
  check(!g.helloP || g.peasants.indexOf(g.helloP) >= 0 || g.ghosts.indexOf(g.helloP) >= 0 || g.helloP.dead, "g.helloP is not one of the peasants any more");
});

test("the fingerprint sees two small differences in one field, not just one", function () {
  /* same.js trusts stateHash to tell two worlds apart. two temperatures a last bit off (what reordering a sum does),
     or two numbers with their signs flipped, must not cancel out */
  var sh = require("../harness/snapshot.js").stateHash, U = new Uint32Array(1), F = new Float32Array(U.buffer);
  function ulp(v) { F[0] = v; U[0] += 1; return F[0]; }
  var a = new Float32Array(2000), s = 1, t, i, j, same = 0, flipped = 0;
  for (i = 0; i < a.length; i++) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; a[i] = 20 + 5 * (s / 4294967296); }
  var h0 = sh({ T: a }).fields.T;
  for (t = 0; t < 400; t++) {
    var b = a.slice();
    i = (t * 7919) % a.length; j = (t * 104729 + 13) % a.length; if (i === j) j = (j + 1) % a.length;
    b[i] = ulp(b[i]); b[j] = ulp(b[j]);
    if (sh({ T: b }).fields.T === h0) same++;
    b = a.slice(); b[i] = -b[i]; b[j] = -b[j];
    if (sh({ T: b }).fields.T === h0) flipped++;
  }
  check(!same, "two temperatures a last bit off went unseen " + same + " times in 400");
  check(!flipped, "two temperatures with their signs flipped went unseen " + flipped + " times in 400");
  var A = sh({ parts: [{ vx: 0.37 }, { vx: -0.81 }], T: new Float32Array([21.5, 20, -3.75, 20]) });
  var B = sh({ parts: [{ vx: -0.37 }, { vx: 0.81 }], T: new Float32Array([-21.5, 20, 3.75, 20]) });
  check(A.fields.parts !== B.fields.parts && A.fields.T !== B.fields.T && A.hash !== B.hash, "two sign flips in a field cancel out");
  /* and a typed array is hashed by its bits: a NaN that is not the usual NaN is not the usual NaN */
  var n1 = new Float32Array([1, NaN, 2]), n2 = n1.slice(), u2 = new Uint32Array(n2.buffer);
  u2[1] ^= 1;
  check(sh({ T: n1 }).fields.T !== sh({ T: n2 }).fields.T, "two NaNs of different bits hash the same");
});

test("the save skips what the harness's snapshots skip", function () {
  var skip = require("../harness/snapshot.js").SKIP, h = require("../harness").open({ seed: 1 });
  var mine = h.eval("SAVE_SKIP");
  check(mine.length === skip.size && mine.every(function (k) { return skip.has(k); }), "SAVE_SKIP and snapshot.js SKIP differ");
});

test("a browser save keeps a journal, keyframes and errors, and loads with fresh dice", function () {
  var h = require("../harness").open({ seed: 5 }), g = h.g;
  h.eval("SAVE_J.on = true; saveJournalStart(g)");
  h.step(2000);
  h.tap(300, 150); h.key("t"); h.key("t");
  h.g.peasants[0].vx = NaN;                       /* something an agent should spot */
  h.eval("saveError(g, new Error('test error'), 'update')");
  var doc = JSON.parse(JSON.stringify(h.eval("saveDocument(g)")));
  h.eval("SAVE_J.on = false");
  check(doc.meta.source === "browser" && !doc.meta.deterministic, "not marked as a browser save");
  check(doc.history.trail.length >= 10, "only " + doc.history.trail.length + " trail samples");
  check(doc.history.inputs.some(function (e) { return e.kind === "tap"; }) && doc.history.inputs.some(function (e) { return e.kind === "key" && e.k === "t"; }), "inputs not journalled");
  check(doc.history.events.some(function (e) { return e.kind === "feed"; }), "no events journalled");
  check(doc.history.errors.length === 1 && /test error/.test(doc.history.errors[0].message) && doc.history.errors[0].stack, "error not journalled");
  check(doc.keyframes.length >= 2, "only " + doc.keyframes.length + " keyframes");
  check(doc.keyframes.some(function (k) { return /first error/.test(k.why); }), "no keyframe at the first error");
  check(doc.checksFailed.indexOf("peasants finite") >= 0, "the NaN was not caught by the checks");
  var b = require("../harness").open({ seed: 1 }), r = b.load(doc, { seed: 3 });
  check(!r.deterministic && Number.isNaN(b.g.peasants[0].vx), "the NaN did not survive the trip");
  check(r.keyframes.length >= 2, "keyframes did not become checkpoints");
  b.restore("kf0"); b.step(60);
  var info = require("../harness/saveinfo.js").text(doc);
  check(/FAILED peasants finite/.test(info) && /test error/.test(info), "save-info does not show what went wrong");
});

test("the browser's dice are the harness's dice, and a browser save carries them", function () {
  var open = require("../harness").open, mk = require("../harness/loader.js").makeRng;
  var a = open({ seed: 2 }), mine = a.eval("rngMake")(12345), theirs = mk(12345), i;
  for (i = 0; i < 1000; i++) check(mine.random() === theirs.random(), "rngMake and makeRng differ at draw " + i);
  check(mine.state === theirs.state, "their states differ");
  /* play the browser: the game owns its dice, and draws a picture between ticks (on the side dice) */
  a.eval("RNG = rngMake(777); Math.random = RNG.random");
  var upd = a.eval("gameUpdate"), draw = a.eval("gameDrawSide"), ctx = a.eval("cv.getContext('2d')"), g = a.g;
  function play(h, n, drawing) { for (var k = 0; k < n; k++) { if (drawing) upd(h.g, 1 / 60); else h.step(1); if (drawing && k % 2) draw(h.g, ctx); } }
  function print(gg) {
    var sum = 0, k;
    for (k = 0; k < gg.m.length; k++) sum = (sum * 31 + gg.m[k] + Math.round(gg.T[k] * 16)) >>> 0;
    return sum + " " + gg.peasants.map(function (p) { return p.id + "@" + p.x.toFixed(3) + "," + p.y.toFixed(3) + p.state; }).join(" ");
  }
  play(a, 1500, true);
  var doc = JSON.parse(JSON.stringify(a.eval("saveDocument(g)")));
  check(doc.meta.deterministic && doc.rng === a.eval("RNG.state"), "the browser save did not carry its dice");
  play(a, 600, true);
  var b = open({ seed: 9 }), r = b.load(doc);
  check(r.deterministic, "the harness did not take the save's dice");
  play(b, 600, false);
  check(print(b.g) === print(g), "the harness went another way than the browser would have");
});

/* the old huts finished and a village that knows landscaping and the bucket: for the tidying tests */
function tidyVillage(seed) {
  var w = sim.load(seed || 1), g = w.g;
  sim.step(w, 120);
  know(g, ["dig", "bucket", "farm"]);
  sites(g, "house").forEach(function (s) { sim.build(w, s); });
  sim.step(w, 30);
  return w;
}
/* a pond, dug, beside house h (and the water in it, if full) */
function pondBy(w, h, full) {
  var g = w.g, p = g.peasants[0], s, k, y;
  w.eval("globalThis.__pf = iPondFor; iPondFor = function (g, p) { return g.sites.filter(function (s) { return s.kind === 'house'; })[" + g.sites.filter(function (q) { return q.kind === "house"; }).indexOf(h) + "]; }");
  var ok = w.iPlanPond(g, p);
  w.eval("iPondFor = globalThis.__pf");
  if (!ok) return null;
  s = sites(g, "pond")[sites(g, "pond").length - 1];
  sim.build(w, s);
  if (full) for (k = 0; k < w.I_POND_W; k++) for (y = s.L; y < s.S[k]; y++) w.sandPlace(g, y * g.gw + s.px0 + k, w.MAT.WATER);
  p.task = null;
  return s;
}

test("a pond is filled from real water, never out of another pond (which would have them carrying it back and forth for ever)", function () {
  var w = tidyVillage(1), g = w.g, hs = sites(g, "house");
  var full = pondBy(w, hs[0], true), empty = pondBy(w, hs[0], false) || pondBy(w, hs[1], false);
  check(full && empty && full !== empty, "(the test wants two ponds)");
  check(w.iPondNeed(g, full) === 0 && w.iPondNeed(g, empty) > w.I_POND_KEEP, "(the test wants one pond full and one empty)");
  /* standing on the bank of the full one: filling the empty one, its water is not to be had; watering the wheat, it is */
  var bank = { x: full.px0 - 1, y: full.L - 1 };
  check(!w.iFindWater(g, bank, 20, null, true, w.iBarred(g, empty), true), "the full pond was fetched from to fill the empty one");
  check(w.iFindWater(g, bank, 20, null, true, w.iBarred(g, null), true), "a full pond was not there to water the wheat from");
  check(w.iBarred(g, null).indexOf(empty) >= 0, "a pond still being filled was fetched from for the wheat");
});

test("water sealed in a cave under a house is no use to a bucket: it does not count as water near it", function () {
  var w = tidyVillage(1), g = w.g, h = sites(g, "house")[0], x, y;
  /* (no other water near it: what water there is, far off on the other side of the valley) */
  check(!w.iWaterNear(g, { x: h.cx, y: h.y1 - 1 }, w.I_POND_NEAR, false), "(the test wants a house a long way from water)");
  /* a sealed pocket of water in the rock, right under it */
  for (y = h.y1 + 6; y < h.y1 + 10; y++) for (x = Math.floor(h.cx) - 3; x <= Math.floor(h.cx) + 3; x++) w.sandPlace(g, y * g.gw + x, w.MAT.WATER);
  for (x = Math.floor(h.cx) - 4; x <= Math.floor(h.cx) + 4; x++) w.sandPlace(g, (h.y1 + 5) * g.gw + x, w.MAT.STONE);
  check(!w.iWaterNear(g, { x: h.cx, y: h.y1 - 1 }, w.I_POND_NEAR, false), "the water sealed under the floor counted as water near the house");
  /* (and the same water, opened up to the sky, does count) */
  for (x = Math.floor(h.cx) - 4; x <= Math.floor(h.cx) + 4; x++) for (y = h.y1 - 12; y <= h.y1 + 5; y++) if (!w.AIRY[g.m[y * g.gw + x]] || y >= h.y1) w.sandSet(g, y * g.gw + x, w.MAT.EMPTY);
  check(w.iWaterNear(g, { x: h.cx, y: h.y1 - 1 }, w.I_POND_NEAR, false), "a pool of water with the sky over it did not count as water near the house");
  /* and a broad shallow stream is water near it too (a bucket fills from it as well as from a pond), a puddle is not */
  var sx = h.x1 + 12, sg = w.bGround(g, sx, h.y1);
  for (x = sx; x < sx + 20; x++) for (y = sg - 12; y < sg + 3; y++) w.sandSet(g, y * g.gw + x, y < sg ? w.MAT.EMPTY : w.MAT.STONE);
  for (x = sx + 1; x < sx + 19; x++) for (y = sg - 2; y < sg; y++) w.sandPlace(g, y * g.gw + x, w.MAT.WATER);
  for (x = sx; x < sx + 20; x += 19) for (y = sg - 3; y < sg; y++) w.sandSet(g, y * g.gw + x, w.MAT.STONE);
  var at = { x: sx + 10, y: sg - 3 };
  check(w.iWaterNear(g, at, 15, false), "a stream two deep and eighteen across did not count as water near");
  for (x = sx + 1; x < sx + 19; x++) for (y = sg - 2; y < sg; y++) w.sandSet(g, y * g.gw + x, w.MAT.EMPTY);
  for (x = sx + 9; x < sx + 12; x++) w.sandPlace(g, (sg - 1) * g.gw + x, w.MAT.WATER);
  check(!w.iWaterNear(g, at, 15, false), "a puddle of three counted as water near");
});

test("a pond nobody can get to while it is first being dug is given up, and not planned there again; one that was dug once is mended", function () {
  var w = tidyVillage(1), g = w.g, p = g.peasants[0], h = sites(g, "house")[0];
  w.eval("globalThis.__pf = iPondFor; iPondFor = function (g, p) { return g.sites.filter(function (s) { return s.kind === 'house'; })[0]; }");
  check(w.iPlanPond(g, p), "(the test wants a pond)");
  var s = sites(g, "pond")[0], k;
  for (k = 0; k < 30 && g.sites.indexOf(s) >= 0; k++) w.bFail(g, p, s, 10, "walk");
  check(g.sites.indexOf(s) < 0, "a pond nobody could get to was never given up, and no other pond could be planned");
  var again = w.iPlanPond(g, p), s2 = sites(g, "pond")[0];
  check(!again || s2.x1 < s.x0 || s2.x0 > s.x1, "the pond was planned again right where they had just given it up");
  if (!again) { g.pondNo = {}; check(w.iPlanPond(g, p), "(the test wants another pond)"); }
  w.eval("iPondFor = globalThis.__pf");
  s = sites(g, "pond")[0]; sim.build(w, s); s.done = false; s.repair = true;
  for (k = 0; k < 30; k++) w.bFail(g, p, s, 10, "walk");
  check(g.sites.indexOf(s) >= 0, "a pond being mended was given up");
});

test("a puddle on a hut floor is bailed out, a bucket at a time, and carried off to real water", function () {
  var w = tidyVillage(2), g = w.g, h = sites(g, "house")[0], dx, t, rip = g.rip;
  function lake() { var n = 0; for (var j = 0; j < g.m.length; j++) if (g.m[j] === w.MAT.WATER && (j % g.gw < h.x0 || j % g.gw > h.x1)) n++; return n; }
  var water0 = lake();
  var fl = h.y1 - 2;   /* (the hut floor is the row over the ground) */
  for (; fl > h.y0 && !w.AIRY[g.m[fl * g.gw + Math.floor(h.cx)]]; fl--);
  for (; fl < h.y1 && w.AIRY[g.m[(fl + 1) * g.gw + Math.floor(h.cx)]]; fl++);
  for (dx = -3; dx <= 3; dx++) w.sandPlace(g, fl * g.gw + Math.floor(h.cx) + dx, w.MAT.WATER);
  function wet() { var n = 0; for (var y = h.y0; y <= h.y1; y++) for (var x = h.x0; x <= h.x1; x++) if (g.m[y * g.gw + x] === w.MAT.WATER) n++; return n; }
  check(wet() === 7, "(the test wants a puddle in the hut)");
  var p = g.peasants.filter(function (q) { return !q.dead; })[0];
  nearHouse(w, p, h); g.bailT = 0;
  check(w.tGoBail(g, p), "nobody went to bail out the puddle in the hut");
  check(p.task.src && p.task.of === h.id && p.task.dump, "the bailing job did not know where the puddle was, or where it was going");
  for (t = 0; t < 5000 && p.task && p.task.src; t++) sim.step(w, 1);
  check(wet() === 0, wet() + " cells of the puddle still on the hut floor");
  sim.step(w, 120);   /* (the last bucketful, still in the air) */
  check(lake() >= water0 + 6, "the water out of the hut did not end up in the water outside (" + (lake() - water0) + " more)");
  check(g.bailed >= 1 && g.feed.some(function (f) { return /bailed out a puddle/.test(f.text); }), "the first puddle bailed was not news");
  check(g.rip === rip, "somebody died bailing");
});

test("a puddle in a field or a pond is theirs, and salt water and a pond's worth of water are not puddles", function () {
  var w = tidyVillage(4), g = w.g, p = g.peasants[0], x, y;
  check(w.iPlanFarm(g, p, true), "(the test wants a field)");
  var f = sites(g, "farm")[0]; sim.build(w, f);
  var e = f.plan.filter(function (q) { return q.v === w.MAT.SOIL; })[0], ex = e.i % g.gw, ey = (e.i / g.gw) | 0;
  w.sandPlace(g, (ey - 1) * g.gw + ex, w.MAT.WATER);
  var c = w.tPuddleOf(g, ex, ey - 1);
  check(c && w.tOwned(g, c), "a puddle on the field was not the field's own");
  /* a big body of water, away from everything: no puddle */
  for (y = 20; y < 26; y++) for (x = 120; x < 126; x++) w.sandPlace(g, y * g.gw + x, w.MAT.WATER);
  check(!w.tPuddleOf(g, 122, 20), "thirty-six cells of water counted as a puddle");
  /* a splash on the bank of a pond is the pond's */
  var pond = pondBy(w, sites(g, "house")[1], true) || pondBy(w, sites(g, "house")[0], true);
  check(pond, "(the test wants a pond)");
  w.sandPlace(g, (pond.L - 2) * g.gw + pond.x0 - 1, w.MAT.WATER);
  var bank = w.tPuddleOf(g, pond.x0 - 1, pond.L - 2);
  check(!bank || w.tOwned(g, bank), "a splash on the pond's bank was nobody's");
  /* and salt water on a hut floor is left well alone */
  var h = sites(g, "house")[0], cx = Math.floor(h.cx), fl = h.y1 - 2;
  for (; fl > h.y0 && !w.AIRY[g.m[fl * g.gw + cx]]; fl--);
  for (; fl < h.y1 && w.AIRY[g.m[(fl + 1) * g.gw + cx]]; fl++);
  for (x = cx - 3; x <= cx + 3; x++) w.sandPlace(g, fl * g.gw + x, w.MAT.SALTWATER);
  var q = g.peasants.filter(function (r) { return !r.dead; })[0];
  g.bailT = 0; q.task = null;
  check(!w.tHousePuddle(g, h), "salt water on the hut floor counted as water to bail");
  check(!w.tGoBail(g, q) || q.task.of !== h.id, "salt water on the hut floor was bailed (into the pond, where it would kill the wheat)");
});

test("sand on a roof is swept off and tipped out of everybody's way; ash on it goes in a pocket", function () {
  var w = tidyVillage(1), g = w.g, h = sites(g, "house")[0], x, y, n = 0, rip = g.rip;
  for (x = h.x0; x <= h.x1; x++) {
    for (y = h.y0 - 10; y < h.y1 && w.AIRY[w.pCell(g, x, y)]; y++);
    if (y < h.y1 - 5) { w.sandPlace(g, (y - 1) * g.gw + x, x % 3 ? w.MAT.SAND : w.MAT.ASH); n++; }
  }
  function litter() { var c = 0; for (var x = h.x0 - 1; x <= h.x1 + 1; x++) for (var y = h.y0 - 12; y < h.y1; y++) if (w.tLitterAt(g, x, y)) c++; return c; }
  var before = litter();
  check(before >= 10, "(the test wants sand on the roof: " + before + ")");
  var p = g.peasants.filter(function (q) { return !q.dead; })[0], heap = null;
  g.tidyT = 0; p.task = null;
  check(w.tGoTidy(g, p), "nobody went to sweep the roof");
  for (var t = 0; t < 8000 && p.task && p.task.kind === "tidy"; t++) { sim.step(w, 1); if (p.task && p.task.heap && !heap) { heap = p.task.heap; heap.near = g.sites.filter(function (s) { return s.kind !== "heap" && heap.x >= s.x0 - w.TD_HEAP_PAD + 1 && heap.x <= s.x1 + w.TD_HEAP_PAD - 1 && heap.y >= s.y0 - w.TD_HEAP_PAD + 1 && heap.y <= s.y1 + w.TD_HEAP_PAD - 1; })[0]; } }   /* (the village's heap is a site of its own) */
  check(litter() <= 2, "the roof is still covered: " + litter() + " of " + before);
  check(g.tidied >= 1, "the sweeping was never tipped anywhere");
  check((p.ash || 0) >= 1, "the ash off the roof did not go in a pocket");
  if (!litter()) check(g.cleanNewsT > 0, "a roof swept clean was not news");
  check(heap && !heap.near, "the sand was tipped next to somebody's site" + (heap && heap.near ? ": " + heap.near.kind : ""));
  check(g.rip === rip, "somebody died sweeping the roof");
});

test("sand on a field, or on a grave, is not litter; sand on a bridge or a stair is", function () {
  var w = tidyVillage(2), g = w.g, p = g.peasants[0];
  check(w.iPlanFarm(g, p, true), "(the test wants a field)");
  var f = sites(g, "farm")[0]; sim.build(w, f);
  var e = f.plan.filter(function (q) { return q.v === w.MAT.SOIL; })[0], ex = e.i % g.gw, ey = (e.i / g.gw) | 0;
  for (var y = ey - 1; y > ey - 8 && !w.AIRY[g.m[y * g.gw + ex]]; y--) w.sandSet(g, y * g.gw + ex, w.MAT.EMPTY);
  w.sandPlace(g, (ey - 1) * g.gw + ex, w.MAT.SAND);
  check(!w.tLitterAt(g, ex, ey - 1), "sand on the field was swept up as litter");
  /* a board of somebody's, made by hand, with sand on it */
  var at = clearSpot(w, 140), s = w.bNew(g, "bridge", p, [w.bE(g, at.x, at.gy - 4, w.MAT.PLANK, 0)], [at.x, at.gy - 4, at.x, at.gy - 4], {});
  sim.build(w, s);
  w.sandPlace(g, (at.gy - 5) * g.gw + at.x, w.MAT.SAND);
  check(w.tLitterAt(g, at.x, at.gy - 5) === s, "sand on a bridge deck was not litter");
  s.kind = "grave";
  check(!w.tLitterAt(g, at.x, at.gy - 5), "a grave was swept");
});

/* stand p by house h (off any rope, with no route in mind): a bailer is whoever is about, not anybody in the valley */
function nearHouse(w, p, h) { p.x = h.x0 + 2.5; p.y = w.tFloor(w.g, h) - 1; p.rope = null; p.nav = null; p.vx = p.vy = 0; p.task = null; }
/* a puddle on the floor of the first hut: its row, and the hut */
function hutPuddle(w, n) {
  var g = w.g, h = sites(g, "house")[0], cx = Math.floor(h.cx), fl = h.y1 - 2, dx;
  for (; fl > h.y0 && !w.AIRY[g.m[fl * g.gw + cx]]; fl--);
  for (; fl < h.y1 && w.AIRY[g.m[(fl + 1) * g.gw + cx]]; fl++);
  for (dx = -(n >> 1); dx < n - (n >> 1); dx++) w.sandPlace(g, fl * g.gw + cx + dx, w.MAT.WATER);
  return h;
}

test("tidying needs landscaping, and a bailer needs the bucket too", function () {
  var w = tidyVillage(2), g = w.g, p = g.peasants[0], k;
  hutPuddle(w, 7);
  g.know = { farm: "TEST" };
  w.eval("globalThis.__tp = tPick; globalThis.__tpHit = false; tPick = function () { globalThis.__tpHit = true; return false; }");
  for (k = 0; k < 200; k++) { p.task = null; p.planCD = 0; w.iPick(g, p); }
  var hit = w.eval("globalThis.__tpHit");
  w.eval("tPick = globalThis.__tp");
  check(!hit, "a village that does not know landscaping went tidying");
  g.know = { dig: "TEST" };
  for (k = 0; k < 200; k++) { p.task = null; g.bailT = 0; w.tPick(g, p, false); check(!(p.task && p.task.src), "a village with no buckets bailed a puddle"); }
  g.know = { dig: "TEST", bucket: "TEST" };
  nearHouse(w, p, sites(g, "house")[0]);
  for (k = 0; k < 200 && !(p.task && p.task.src); k++) { p.task = null; g.bailT = 0; w.tPick(g, p, false); }
  check(p.task && p.task.src, "(and with buckets, they do)");
});

test("an armful of sweepings is put down, not lost, when something else comes up", function () {
  var w = tidyVillage(1), g = w.g, p = g.peasants.filter(function (q) { return !q.dead; })[0];
  function sand() { var n = 0; for (var j = 0; j < g.m.length; j++) if (g.m[j] === w.MAT.SAND) n++; return n; }
  /* (the top of the nearest sand, a handful at a time) */
  function top() { for (var d = 0; d < 60; d++) for (var y = 1; y < g.gh; y++) { var x = Math.floor(p.x) + d; if (g.m[y * g.gw + x] === w.MAT.SAND && w.AIRY[g.m[(y - 1) * g.gw + x]]) return [x, y]; } }
  var x = Math.floor(p.x), y = Math.floor(p.y), before = sand(), t;
  for (var k = 0; k < 4; k++) { t = top(); w.tSweep(g, p, { n: 0 }, t[0], t[1]); }
  check(sand() === before - 4 && w.tHeld(p) === 4, "(the test wants four handfuls in their arms)");
  /* (the next tick of theirs puts it down: tCarry, from pWalk. the rest of the village goes on digging and tilling round
     them, so the sand is counted as it is put down) */
  p.task = { kind: "eat", x: x, y: y, t: 0 };
  w.tCarry(g, p);
  check(w.tHeld(p) === 0 && sand() === before, "the sweepings went missing when the job changed: " + (before - sand()) + " cells gone");
  for (k = 0; k < 4; k++) { t = top(); w.tSweep(g, p, { n: 0 }, t[0], t[1]); }
  for (k = 0; k < 120 && w.tHeld(p); k++) sim.step(w, 1);
  check(w.tHeld(p) === 0, "a peasant kept an armful of sweepings with no sweeping job");
  before = sand();
  /* and on dying */
  for (k = 0; k < 3; k++) { t = top(); w.tSweep(g, p, { n: 0 }, t[0], t[1]); }
  p.task = { kind: "tidy", site: 0, x: 0, y: 0, t: 0, act: 0, n: 0, tipping: true };
  w.pDie(g, p, "old");
  check(w.tHeld(p) === 0 && sand() === before, "the sweepings went missing with whoever died carrying them");
});

test("a puddle in nobody's way with no real water to go to is let be, and the edge of a river is not a puddle", function () {
  var w = tidyVillage(1), g = w.g, j, x, y;
  for (j = 0; j < g.m.length; j++) if (g.m[j] === w.MAT.WATER) w.sandSet(g, j, w.MAT.EMPTY);
  /* a puddle out in the open, in nobody's way, and no pond or field that wants it, nor water to tip it in */
  var h = sites(g, "house")[0], ox = h.x1 + 30, og = w.bGround(g, ox, h.y1), p = g.peasants.filter(function (q) { return !q.dead; })[0];
  for (x = ox - 3; x <= ox + 3; x++) for (y = og - 6; y < og + 2; y++) w.sandSet(g, y * g.gw + x, y < og ? w.MAT.EMPTY : w.MAT.STONE);
  for (x = ox - 2; x <= ox + 2; x++) w.sandPlace(g, (og - 1) * g.gw + x, w.MAT.WATER);
  check(!w.bSiteAround(g, ox, og, null, 2), "(the test wants open ground)");
  g.bailT = 0; p.task = null;
  check(!w.tGoBail(g, p), "a puddle in nobody's way was bailed with nowhere at all to carry it (it would only be poured out again)");
  /* a body of water, and a cell off its corner: the river's */
  for (y = 30; y < 36; y++) for (x = 120; x < 126; x++) w.sandPlace(g, y * g.gw + x, w.MAT.WATER);
  w.sandPlace(g, 29 * g.gw + 126, w.MAT.WATER);
  check(!w.tPuddleOf(g, 126, 29), "a cell at the corner of a pond was a puddle");
  w.sandPlace(g, 28 * g.gw + 128, w.MAT.WATER);
  check(!w.tPuddleOf(g, 128, 28), "a splash a cell off the pond was a puddle");
});

test("a bailer whose pond fills up on the way takes the rest of the puddle to real water, not back where it was", function () {
  var w = tidyVillage(4), g = w.g, h = sites(g, "house")[0], pond = pondBy(w, h, false);
  check(pond, "(the test wants a pond)");
  hutPuddle(w, 9);
  var p = g.peasants.filter(function (q) { return !q.dead; })[0];
  nearHouse(w, p, h); g.bailT = 0;
  check(w.tGoBail(g, p) && p.task.pond === pond.id, "the puddle was not taken to the pond that wanted it");
  /* the pond fills up before they get going */
  for (var k = 0; k < w.I_POND_W; k++) for (var y = pond.L; y < pond.S[k]; y++) w.sandPlace(g, y * g.gw + pond.px0 + k, w.MAT.WATER);
  check(!w.iPondThirst(g, pond), "(the test wants the pond full)");
  var job = p.task;
  w.tBailScoop(g, p, job);
  /* (the full pond is no longer where it goes: the real water it found to fall back on is) */
  check(p.task === job && job.dump && w.tBailTarget(g, job) === job.dump, "the job did not go on to somewhere else real for the water: " + JSON.stringify({ same: p.task === job, pond: job.pond, dump: job.dump }));
  check(job.dump.x < h.x0 - 3 || job.dump.x > h.x1 + 3, "the water was to be tipped back in the hut");
});

test("a drop or two is let dry, and a crack outside the hut wall nobody can get a bucket into is not bailed for ever", function () {
  var w = tidyVillage(2), g = w.g, h = hutPuddle(w, 2), p = g.peasants.filter(function (q) { return !q.dead; })[0], k, jobs = 0, prev = null;
  g.bailT = 0; p.task = null;
  check(!w.tGoBail(g, p), "two cells of water on the floor got a bucket");
  /* a crack a cell wide, just outside the wall, with water in the bottom of it, and a puddle on the floor inside */
  var gy = w.bGround(g, h.x0 - 1, h.y1), cx = h.x0 - 1;
  hutPuddle(w, 6);
  for (var y = gy; y < gy + 4; y++) w.sandSet(g, y * g.gw + cx, w.MAT.EMPTY);
  w.sandPlace(g, (gy + 3) * g.gw + cx, w.MAT.WATER);
  for (k = 0; k < 15000; k++) {
    sim.step(w, 1);
    g.peasants.forEach(function (q) { if (q.task && q.task.src && q.task !== prev) { prev = q.task; jobs++; } });
  }
  check(jobs <= 4, jobs + " bailing jobs, round and round, for a crack and a floor");
});

test("sweepings are tipped in a hole in the ground, and fill it in", function () {
  var w = tidyVillage(1), g = w.g, h = sites(g, "house")[0], p = g.peasants.filter(function (q) { return !q.dead; })[0], x, y, t;
  /* a level stretch of rock well away from everything, with a hole in it five wide and three deep */
  var hx = h.x1 + 40, Gf = w.bGround(g, hx, h.y1);
  check(Gf > 0 && !w.bSiteAround(g, hx, Gf, null, 22), "(the test wants open ground)");
  for (x = hx - 14; x <= hx + 14; x++) for (y = Gf - 24; y <= Gf + 6; y++) w.sandSet(g, y * g.gw + x, y < Gf ? w.MAT.EMPTY : w.MAT.STONE);
  for (x = hx - 2; x <= hx + 2; x++) for (y = Gf; y < Gf + 3; y++) w.sandSet(g, y * g.gw + x, w.MAT.EMPTY);
  p.x = hx - 9.5; p.y = Gf - 1; p.task = null;
  var spot = w.tHeapSpot(g, p, Gf - 1);
  check(spot && spot.dip && Math.abs(spot.x - hx) <= 2, "the hole was not where the sweepings were to go: " + JSON.stringify(spot));
  /* an armful, off a roof (sand made up on the spot, away up in the air), and off to tip it */
  for (x = 0; x < 6; x++) { w.sandPlace(g, 20 * g.gw + 20 + x, w.MAT.SAND); w.tSweep(g, p, { n: 0 }, 20 + x, 20); }
  check(w.tHeld(p) === 6, "(the test wants an armful)");
  /* standing on the rim, with the armful, the job picks its own spot and tips it */
  p.x = spot.x - 2.5; p.y = Gf - 1; p.rope = null; p.nav = null; p.vx = p.vy = 0;   /* (off the rope they were exploring on) */
  var k = { kind: "tidy", site: h.id, x: 0, y: 0, t: 0, act: 0, n: 6, trips: 9, tipping: true };
  p.task = k;
  for (t = 0; t < 1500 && p.task === k; t++) sim.step(w, 1);
  check(k.heap && k.heap.dip, "the job did not pick the hole to tip in: " + JSON.stringify(k.heap));
  check(!w.tHeld(p), "the armful would not go in the hole");
  var sand = 0;
  for (x = hx - 2; x <= hx + 2; x++) for (y = Gf - 2; y < Gf + 3; y++) if (g.m[y * g.gw + x] === w.MAT.SAND) sand++;
  check(sand >= 5, "the hole has " + sand + " of the six handfuls in it");
  check(g.filled >= 1, "filling the hole was not counted");
});

test("sweepings are not tipped into a bush, and the job only says it tipped what it tipped", function () {
  var w = tidyVillage(1), g = w.g, h = sites(g, "house")[0], x, y;
  var hx = h.x1 + 40, Gf = w.bGround(g, hx, h.y1);
  for (x = hx - 14; x <= hx + 14; x++) for (y = Gf - 24; y <= Gf + 6; y++) w.sandSet(g, y * g.gw + x, y < Gf ? w.MAT.EMPTY : w.MAT.STONE);
  check(w.tHeapOk(g, hx, Gf, w.TD_HEAP_PAD), "(the test wants open level ground)");
  for (x = hx - 14; x <= hx + 14; x++) w.sandPlace(g, (Gf - 1) * g.gw + x, w.MAT.PLANT);
  check(!w.tHeapOk(g, hx, Gf, w.TD_HEAP_PAD), "a bush was somewhere to tip sweepings");
  var p = g.peasants.filter(function (q) { return !q.dead; })[0], tidied = g.tidied || 0;
  p.sweep = [{ m: w.MAT.SAND, sh: 3, q: 0 }];
  var k = { kind: "tidy", site: h.id, x: 0, y: 0, t: 0, act: 0, n: 1, tipping: true, heap: { x: hx, y: Gf, dip: false } };
  p.task = k; p.x = hx - 2.5; p.y = Gf - 2;
  for (var t = 0; t < 40 && p.task === k; t++) w.tTaskTip(g, p, k);
  /* (nowhere to put it on the bush: nothing tipped, so nothing counted, and no news of a heap) */
  check(!k.tipped, "a handful went into the bush");
  check((g.tidied || 0) === tidied, "a job that tipped nothing was counted as tidying");
  check(!g.feed.some(function (f) { return /tipped it/.test(f.text); }), "a job that tipped nothing said it had");
});

test("a puddle on a hut floor with no water near is poured out over a bush, from inside the hut, a full bucket at a time", function () {
  var w = tidyVillage(1), g = w.g, h = sites(g, "house")[0], t, rip = g.rip;
  check(!w.iFindWater(g, { x: h.cx, y: h.y1 - 1 }, w.TD_CARRY, null, true, null, true), "(the test wants a hut a long way from water)");
  hutPuddle(w, 10);
  function wet() { var n = 0; for (var y = h.y0; y <= h.y1; y++) for (var x = h.x0; x <= h.x1; x++) if (g.m[y * g.gw + x] === w.MAT.WATER) n++; return n; }
  var p = g.peasants.filter(function (q) { return !q.dead; })[0], outside = 0, loads = [];
  g.bailT = 0; p.task = null;
  check(w.tGoBail(g, p) && p.task.dump, "nobody bailed a puddle with no water near enough to tip it in");
  var job = p.task, had = 0;
  w.eval("globalThis.__sc2 = tScoopCells; tScoopCells = function (g, c, x, y, r) { if ((x <= " + h.x0 + " || x >= " + h.x1 + ") && !tAtDoor(g, bSite(g, " + h.id + "), x, y)) globalThis.__out = (globalThis.__out || 0) + 1; return globalThis.__sc2(g, c, x, y, r); }");
  for (t = 0; t < 8000 && p.task === job; t++) {
    sim.step(w, 1);
    if (p.pail && !had) loads.push(0);
    if (p.pail) loads[loads.length - 1] = p.pail.length;
    had = p.pail ? 1 : 0;
  }
  outside = w.eval("globalThis.__out || 0");
  w.eval("tScoopCells = globalThis.__sc2");
  check(wet() === 0, wet() + " cells of the puddle still on the floor");
  check(!outside, "they bailed from outside the hut, through the wall");   /* (from the doorway is from the doorway) */
  check(loads.length <= 3, loads.length + " trips for ten cells of water: " + loads.join(","));
  check(/bush|yard/.test(job.into), "the water went to " + job.into);
  check(g.rip === rip, "somebody died bailing");
});

test("nobody waters the wheat (or bails a puddle) by throwing the bucket through the wall of a hut", function () {
  var w = tidyVillage(2), g = w.g, h = sites(g, "house")[1], x, y;
  /* standing on the floor just inside the west wall, throwing at a spot well outside it */
  var fy = h.y1 - 1;
  for (; fy > h.y0 && !w.AIRY[g.m[fy * g.gw + h.x0 + 2]]; fy--);
  for (; fy < h.y1 && w.AIRY[g.m[(fy + 1) * g.gw + h.x0 + 2]]; fy++);
  var t = { x: h.x0 - 10, y: fy };
  check(w.iThrowFrom(g, h.x0 + 2, fy, t), "(the test wants a throw in range)");
  check(!w.iClearArc(g, h.x0 + 2, fy, t), "a bucket thrown from inside the hut cleared its wall");
  check(!w.iClearArc(g, h.x0 + 1, fy, t), "a bucket thrown from right inside the door went out through it");
});

test("a roof nobody can climb onto does not hide the puddle on the floor under it, and is let be after a couple of tries", function () {
  var w = tidyVillage(2), g = w.g, h = sites(g, "house")[0], x;
  hutPuddle(w, 7);
  for (x = h.x0 - 2; x <= h.x1 + 2; x++) w.tNoGo(g, x);   /* (every sweeper who tried the roof gave up) */
  check(w.tPuddleNear(g, { of: h.id }), "the roof's give-ups hid the puddle on the floor");
  var p = g.peasants.filter(function (q) { return !q.dead; })[0];
  nearHouse(w, p, h); g.bailT = 0;
  check(w.tGoBail(g, p) && p.task.of === h.id, "nobody bailed the floor under a roof nobody could get onto");
  w.tGaveUp(g, h, "tidy");
  check(!(h.tidyRest > g.tick), "one try was enough to give the roof up");
  w.tGaveUp(g, h, "tidy");
  check(h.tidyRest > g.tick, "a roof nobody could get onto, twice running, was not let be");
  w.sandPlace(g, (h.y0 - 1) * g.gw + Math.floor(h.cx), w.MAT.SAND);
  check(!w.tFindLitter(g, p, 300, h), "a roof being let be was swept anyway");
});

test("sand on a roof swept clean is swept again, unless it keeps coming back", function () {
  var w = tidyVillage(1), g = w.g, h = sites(g, "house")[0], p = g.peasants.filter(function (q) { return !q.dead; })[0];
  var k = { kind: "tidy", site: h.id, n: 5 };
  /* (nothing left on it: the old huts may have a drift at a door of their own, which is not this test's business) */
  w.eval("globalThis.__fl = tFindLitter; tFindLitter = function () { return null; }");
  p.task = k; w.tSwept(g, p, k);
  check(!(h.sweptT > g.tick), "a roof swept clean once was let be");
  g.tick += 100; p.task = k; w.tSwept(g, p, k);
  var rest = h.sweptT > g.tick;
  w.eval("tFindLitter = globalThis.__fl");
  check(rest, "a roof swept clean twice in a row (sand coming back) was not let be");
});

test("their own floor and their own roof, they see to themselves", function () {
  var w = tidyVillage(2), g = w.g, h = sites(g, "house")[0];
  var o = g.peasants.filter(function (q) { return !q.dead && w.bHome(g, q) === h; })[0] || g.peasants.filter(function (q) { return !q.dead; })[0];
  o.home = h.id; h.owner = o.id;
  hutPuddle(w, 7);
  o.task = null; o.homeT = 0; g.bailT = 1e9;   /* (the village is not looking for puddles just now: only the owner) */
  check(w.tHome(g, o) && o.task.src && o.task.of === h.id, "the owner did not see to the puddle on their own floor");
  o.task = null; o.homeT = 0;
  var x, y; for (x = h.x0; x <= h.x1; x++) for (y = h.y0; y <= h.y1; y++) if (g.m[y * g.gw + x] === w.MAT.WATER) w.sandSet(g, y * g.gw + x, w.MAT.EMPTY);
  for (x = h.x0 + 2; x <= h.x1 - 2; x++) { for (y = h.y0 - 10; y < h.y1 && w.AIRY[w.pCell(g, x, y)]; y++); if (y < h.y1 - 5) w.sandPlace(g, (y - 1) * g.gw + x, w.MAT.SAND); }
  check(w.tHome(g, o) && o.task.kind === "tidy" && o.task.site === h.id, "the owner did not sweep their own roof");
});

test("sand drifted up against a hut's door is dug away, before the roof", function () {
  var w = tidyVillage(1), g = w.g, h = sites(g, "house")[0], p = g.peasants.filter(function (q) { return !q.dead; })[0];
  var d = w.tDoors(g, h).filter(function (q) { return q.side > 0; })[0], x, y;
  check(d, "(the test wants a door on the east side)");
  /* (the old huts' walls are wood, which a peasant pushes through, door or no door: a plank lintel over it, as a
     house the village built has) */
  for (y = d.top - 4; y < d.top; y++) w.sandSet(g, y * g.gw + d.x, w.MAT.PLANK);
  for (x = d.x + 1; x <= d.x + 3; x++) for (y = d.bot - 4; y <= d.bot; y++) if (w.AIRY[g.m[y * g.gw + x]]) w.sandPlace(g, y * g.gw + x, w.MAT.SAND);
  check(w.tBlocked(g, d), "(the test wants the door drifted shut)");
  p.home = h.id;   /* (their own door: the one they use) */
  w.sandPlace(g, (h.y0 - 1) * g.gw + Math.floor(h.cx), w.MAT.SAND);
  var t = w.tFindLitter(g, p, 300, h);
  check(t && t.drift, "sand against the door was not seen to: " + JSON.stringify(t));
  g.tidyT = 0; p.task = null; p.rope = null;
  check(w.tGoTidy(g, p) && p.task.drift, "nobody went to dig out the door");
  for (var k = 0; k < 6000 && p.task && p.task.kind === "tidy"; k++) sim.step(w, 1);
  check(!w.tBlocked(g, d), "the door is still drifted shut");
});

test("a door with a lantern by it is still dug out when it is drifted shut; a back door against a dune, with the front open, is let be", function () {
  var w = tidyVillage(1), g = w.g, h = sites(g, "house")[0], p = g.peasants.filter(function (q) { return !q.dead; })[0], x, y;
  var ds = w.tDoors(g, h), e = ds.filter(function (q) { return q.side > 0; })[0], o = ds.filter(function (q) { return q.side < 0; })[0];
  [e, o].forEach(function (d) { for (y = d.top - 4; y < d.top; y++) w.sandSet(g, y * g.gw + d.x, w.MAT.PLANK); });   /* (plank lintels: see above) */
  /* (and the west door's way in clear, whatever the dunes have done to it) */
  for (x = o.x - 3; x <= o.x - 1; x++) for (y = o.top - 4; y <= o.bot; y++) if (!w.bMarked(g, x, y)) w.sandSet(g, y * g.gw + x, w.MAT.EMPTY);
  /* the east door drifted shut, with a lantern over the drift */
  for (x = e.x + 1; x <= e.x + 3; x++) for (y = e.top - 2; y <= e.bot; y++) if (w.AIRY[g.m[y * g.gw + x]]) w.sandPlace(g, y * g.gw + x, w.MAT.SAND);
  w.bNew(g, "lamp", p, [w.bE(g, e.x + 1, e.top - 4, w.MAT.LAMP, 0)], [e.x + 1, e.top - 4, e.x + 1, e.top - 4], {});
  w.sandSet(g, (e.top - 4) * g.gw + e.x + 1, w.MAT.LAMP);
  check(w.tBlocked(g, e) && !w.tShut(g, h), "(the test wants the east door shut, the west open): " + w.tBlocked(g, e) + " " + w.tBlocked(g, o));
  var q = g.peasants.filter(function (r) { return !r.dead && r !== p; })[0] || p;
  q.home = 0; p.home = h.id;
  check(!w.tFindLitter(g, q, 300, h) || !w.tFindLitter(g, q, 300, h).drift, "a back door against a dune was dug out while the front was open");
  var t = w.tFindLitter(g, p, 300, h);
  check(t && t.drift, "the owner's own door, drifted shut under a lantern, was not seen to");
  /* both doors shut: anybody digs */
  for (x = o.x - 3; x <= o.x - 1; x++) for (y = o.top - 2; y <= o.bot; y++) if (w.AIRY[g.m[y * g.gw + x]]) w.sandPlace(g, y * g.gw + x, w.MAT.SAND);
  check(w.tShut(g, h), "(the test wants both doors shut)");
  t = w.tFindLitter(g, q, 300, h);
  check(t && t.drift, "a house drifted shut all round was not dug out");
});

test("a puddle that dries up before the bailer gets there is let be a while, not walked to all day", function () {
  var w = tidyVillage(2), g = w.g, h = hutPuddle(w, 4), p = g.peasants.filter(function (q) { return !q.dead; })[0];
  nearHouse(w, p, h); g.bailT = 0;
  check(w.tGoBail(g, p), "(the test wants a bailer)");
  var k = p.task, x, y;
  /* half of it gone (soaked away, say) before they get there */
  var cells = w.tPuddleNear(g, { of: h.id });
  w.sandSet(g, cells[0], w.MAT.EMPTY); w.sandSet(g, cells[1], w.MAT.EMPTY);
  w.tBailScoop(g, p, k);
  check(p.task !== k, "(the test wants the job over)");
  g.bailT = 0; p.task = null;
  check(!w.tGoBail(g, p) || p.task.of !== h.id, "the same drop was gone after again straight away");
});

test("a big spill on a hut floor is bailed, however much of it there is, and a bailer gone astray holds nobody else up", function () {
  /* (a hut whose floor holds water: one with the ground washed out from under a door lets it run away outside, and
     which hut that is, if any, is up to the dice) */
  var w, g, h, x, y, n, cells, tried = [];
  [2, 1, 3, 4].some(function (seed) {
    return sites((w = tidyVillage(seed)).g, "house").some(function (hh, k) {
      if (k > 0) w = tidyVillage(seed);
      g = w.g; h = sites(g, "house")[k]; n = 0;
      var cx = Math.floor(h.cx), fl = h.y1 - 2;
      for (; fl > h.y0 && !w.AIRY[g.m[fl * g.gw + cx]]; fl--);
      for (; fl < h.y1 && w.AIRY[g.m[(fl + 1) * g.gw + cx]]; fl++);
      for (y = fl; y > fl - 3; y--) for (x = h.x0 + 3; x <= h.x1 - 3; x++) if (w.AIRY[g.m[y * g.gw + x]]) { w.sandPlace(g, y * g.gw + x, w.MAT.WATER); n++; }
      sim.step(w, 30);
      cells = w.tHousePuddle(g, h);
      tried.push(seed + "/" + k + ": " + (cells && cells.length));
      return n > 20 && cells && cells.length > w.TD_PUDDLE;
    });
  });
  check(n > 20 && cells && cells.length > w.TD_PUDDLE, "(the test wants more than a puddle's worth on a floor: " + tried.join(", ") + ")");
  var p = g.peasants.filter(function (q) { return !q.dead; })[0], q = g.peasants.filter(function (r) { return !r.dead && r !== p; })[0];
  nearHouse(w, p, h); nearHouse(w, q, h); g.bailT = 0;
  check(w.tGoBail(g, p) && p.task.of === h.id, "a floor with " + cells.length + " cells of water on it was not bailed");
  /* the bailer is gone a long while (swimming the lake, say): somebody else may have the floor */
  p.task.t0 = g.tick - w.TD_LONG - 10;
  g.bailT = 0; q.task = null;
  check(w.tGoBail(g, q) && q.task.of === h.id, "a bailing job gone on for ever kept everybody else off the floor");
});

test("a sweep that swept nothing does not count the roof as clean", function () {
  var w = tidyVillage(1), g = w.g, h = sites(g, "house")[0], p = g.peasants.filter(function (q) { return !q.dead; })[0];
  w.eval("globalThis.__fl2 = tFindLitter; tFindLitter = function () { return null; }");
  var k = { kind: "tidy", site: h.id, n: 0 };
  p.task = k; w.tSwept(g, p, k); g.tick += 50; p.task = k; w.tSwept(g, p, k);
  var rest = h.sweptT > g.tick, clean = h.cleanT;
  w.eval("tFindLitter = globalThis.__fl2");
  check(!rest && !clean, "two empty sweeps put the roof to rest as if sand kept coming back to it");
});

test("a flooded floor with a drop or two outside the door is a floor, not the lake come in", function () {
  var w = tidyVillage(2), g = w.g, h = sites(g, "house")[0], x, y, n = 0;
  var cx = Math.floor(h.cx), fl = h.y1 - 2;
  for (; fl > h.y0 && !w.AIRY[g.m[fl * g.gw + cx]]; fl--);
  for (; fl < h.y1 && w.AIRY[g.m[(fl + 1) * g.gw + cx]]; fl++);
  for (y = fl; y > fl - 3; y--) for (x = h.x0 + 1; x <= h.x1 - 1; x++) if (w.AIRY[g.m[y * g.gw + x]]) { w.sandPlace(g, y * g.gw + x, w.MAT.WATER); n++; }
  /* two drops on the step outside the east door */
  var G = w.bGround(g, h.x1 + 1, h.y1);
  w.sandPlace(g, (G - 1) * g.gw + h.x1 + 1, w.MAT.WATER); w.sandPlace(g, (G - 1) * g.gw + h.x1 + 2, w.MAT.WATER);
  var c = w.tHousePuddle(g, h);
  check(c && c.length >= n - 2, "a flooded floor with two drops outside it was taken for the lake come in: " + (c && c.length) + " of " + n);
  /* and the lake itself, at the door, is the lake */
  for (x = h.x1 + 1; x <= h.x1 + 16; x++) for (y = fl - 3; y <= G + 1; y++) w.sandPlace(g, y * g.gw + x, y <= fl ? w.MAT.WATER : w.MAT.STONE);
  check(!w.tHousePuddle(g, h), "the lake come in at the door was bailed");
});

test("a bailer who ends up swimming gives it up, and water uphill of a puddle is not where it goes", function () {
  var w = tidyVillage(2), g = w.g, h = hutPuddle(w, 7), p = g.peasants.filter(function (q) { return !q.dead; })[0];
  nearHouse(w, p, h); g.bailT = 0;
  check(w.tGoBail(g, p), "(the test wants a bailer)");
  var k = p.task;
  p.swimming = 1;
  for (var t = 0; t < 400; t += 20) { g.tick += 20; p.swimming = 1; w.tStep(g); }
  check(p.task !== k, "a bailer swimming the lake kept the job");
  /* and a sweeper the same */
  var sk = { kind: "tidy", site: h.id, x: h.x0 + 3, y: h.y0, t: 0, t0: g.tick, act: 0, n: 0, trips: 0 };
  p.task = sk;
  for (t = 0; t < 400; t += 20) { g.tick += 20; p.swimming = 1; w.tStep(g); }
  check(p.task !== sk && w.tNo(g, h.x0 + 3), "a sweeper treading water kept the job, or will make for the same spot again");
  p.swimming = 0;
  /* a pool a little way up the slope from a puddle, and nothing else: no destination */
  var cells = w.tHousePuddle(g, h), top = w.tTop(g, cells, cells[0] % g.gw);
  var fake = w.eval("(function (cells, x, y) { var r = iFindWater; iFindWater = function () { return { x: x, y: y - 1 }; }; var d = tBailDest(g, cells, g.sites.filter(function (s) { return s.kind === 'house'; })[0]); iFindWater = r; return d; })");
  var up = fake(cells, top.x + 6, top.y - 4);
  check(!up || up.dump.x !== top.x + 6, "water uphill of the puddle, close by, was chosen to tip it in");
  var level = fake(cells, top.x + 30, top.y);
  check(level && level.dump.x === top.x + 30, "(water level with it, further off, is somewhere to tip it: the test checks the uphill rule, not nothing)");
});

test("a bailer is not sent across the lake, water on a roof is bailed too, and a swim gives up on where it was going, not the floor", function () {
  var w = tidyVillage(2), g = w.g, hs = sites(g, "house"), h = hs[0], far = hs[1];
  check(Math.abs(far.cx - h.cx) > w.TD_CARRY + 30, "(the test wants two houses a long way apart)");
  hutPuddle(w, 7);
  var p = g.peasants.filter(function (q) { return !q.dead; })[0];
  p.x = far.cx; p.y = far.y1 - 1; p.rope = null; p.task = null; g.bailT = 0;
  /* (a flooded floor is anybody's business, from anywhere they can walk there from with dry feet: not across the lake) */
  var sent = w.tGoBail(g, p);
  check(!sent || w.tCanGet(g, p, p.task.src.x, p.task.src.y, 5), "somebody at the far end of the valley was sent to bail a floor at the other, with no dry way there");
  p.task = null;
  /* water on the roof of the far house: a puddle in its way */
  var x, y, top = w.tInsideTop(g, far), done = 0;
  for (x = far.x0 + 2; x <= far.x1 - 2 && done < 5; x++) {
    for (y = far.y0 - 10; y < top && w.AIRY[w.pCell(g, x, y)]; y++);
    if (y < top && w.AIRY[w.pCell(g, x, y - 1)]) { w.sandPlace(g, (y - 1) * g.gw + x, w.MAT.WATER); done++; }
  }
  g.bailT = 0;
  var ok = w.tGoBail(g, p);
  check(ok && p.task.src.y < top, "water on a roof was never bailed" + (ok ? " (" + JSON.stringify(p.task.src) + ")" : ""));
  /* the far house's floor job, swimming to a pond it wanted: the pond is written off, not the floor */
  var job = { kind: "bucket", src: { x: h.x0 + 3, y: h.y1 - 2 }, at: { x: h.x0 + 3, y: h.y1 - 2 }, of: h.id, pond: 0, field: 0, dump: { x: h.x1 + 40, y: h.y1 }, n: 1, t0: g.tick };
  p.task = job; p.pail = [{ m: w.MAT.WATER, sh: 0, q: 0 }];
  for (var t = 0; t < 400; t += 20) { g.tick += 20; p.swimming = 1; w.tStep(g); }
  check(p.task !== job && !w.tNo(g, h.x0 + 3, true) && w.tNo(g, h.x1 + 40, true), "a swim on the way to the water blamed the floor, not where it was going");
  p.swimming = 0; p.pail = null;
});

test("water poured out of a house goes nowhere near anybody's site, and a pond too far off is not where a puddle goes", function () {
  /* (every house in a few villages: wherever tOutside would pour its floor out, it is clear of everybody's site) */
  [1, 2, 3, 4].forEach(function (seed) {
    var w = tidyVillage(seed), g = w.g;
    sites(g, "house").forEach(function (h) {
      var o = w.tOutside(g, h);
      if (!o) return;
      var near = g.sites.filter(function (s) { return s !== h && o.x >= s.x0 - 1 && o.x <= s.x1 + 1 && o.y + 1 >= s.y0 - 1 && o.y + 1 <= s.y1 + 1; })[0];
      check(!near, "seed " + seed + ": the floor of " + w.bLabel(h) + " would be poured out into " + (near && w.bLabel(near)));
      for (var y = o.y - 2; y <= o.y + 2; y++) for (var x = o.x - 2; x <= o.x + 2; x++) check(!w.HOT[w.pCell(g, x, y)], "poured out onto something hot");
    });
  });
  /* a thirsty pond at the far end of the valley: the puddle goes out of the door instead */
  var w = tidyVillage(1), g = w.g, hs = sites(g, "house"), far = hs.slice().sort(function (a, b) { return Math.abs(b.cx - hs[0].cx) - Math.abs(a.cx - hs[0].cx); })[0];
  var pd = pondBy(w, far, false);
  check(pd && Math.abs(pd.cx - hs[0].cx) > w.TD_CARRY + 40, "(the test wants a pond a long way off)");
  check(w.iPondThirst(g, pd), "(the test wants the pond thirsty)");
  hutPuddle(w, 7);
  var d = w.tBailDest(g, w.tHousePuddle(g, hs[0]), hs[0]);
  check(d && !d.pond, "a puddle was sent " + Math.round(Math.abs(pd.cx - hs[0].cx)) + " columns to a pond");
});

test("a flood on a hut floor is bailed out in a few minutes, not a quarter of an hour", function () {
  var w = tidyVillage(1), g = w.g, h = hutPuddle(w, 1), k, n0;
  /* (the whole floor, a few cells deep) */
  var top = w.tInsideTop(g, h), fl = w.tFloor(g, h);
  for (var y = fl - 1; y >= fl - 4 && y >= top; y--) for (var x = h.x0 + 1; x <= h.x1 - 1; x++) if (w.AIRY[g.m[y * g.gw + x]] && !w.bMarked(g, x, y)) w.sandPlace(g, y * g.gw + x, w.MAT.WATER);
  n0 = (w.tHousePuddle(g, h, true) || []).length;
  check(n0 >= 40, "(the test wants a flood: " + n0 + ")");
  for (k = 0; k < 15000 && (w.tHousePuddle(g, h, true) || []).length > 2; k += 50) sim.step(w, 50);
  var left = (w.tHousePuddle(g, h, true) || []).length;
  check(left <= 2, n0 + " cells of water on the floor, and " + left + " still there after " + k + " ticks");
});

test("a grain on its way past is not litter; a roof nobody can get onto is let be, however well the rest of it went", function () {
  var w = tidyVillage(1), g = w.g, h = sites(g, "house")[0], x = Math.floor(h.cx), y;
  for (y = h.y0 - 12; y < h.y1 && w.AIRY[w.pCell(g, x, y)]; y++);
  var j = (y - 1) * g.gw + x;
  w.sandPlace(g, j, w.MAT.SAND);
  g.stamp[j] = g.tick;
  check(!w.tLitterAt(g, x, y - 1), "a grain that has only just landed on the roof is litter already");
  g.stamp[j] = g.tick - 100;
  check(w.tLitterAt(g, x, y - 1) === h, "a grain lying on the roof a while is not litter");
  /* two give-ups, with a good sweep in between: still let be */
  w.tGaveUp(g, h, "tidy");
  w.tSwept(g, g.peasants[0], { kind: "tidy", site: h.id, n: 3, trips: 0 });
  w.tGaveUp(g, h, "tidy");
  check(h.tidyRest > g.tick, "a roof given up on twice was not let be, because a sweep in between went well");
});

test("a pile of sand tipped out beside a hut is carried off, onto the village's heap, until the ground is level; the lie of the land is let be", function () {
  var w = tidyVillage(3), g = w.g, h = sites(g, "house")[0], X = -1, d, sd, x, G, r, dx, put = 0;
  sim.step(w, 600);   /* (the ground as it was, looked at) */
  check(g.tGround, "nobody looked at the ground");
  check(!g.tLumps.length, "the valley as it was, before anybody tipped anything, has piles in it: " + JSON.stringify(g.tLumps));
  for (d = 6; d < 40 && X < 0; d++) for (sd = 1; sd >= -1 && X < 0; sd -= 2) {
    x = Math.round(sd > 0 ? h.x1 + d : h.x0 - d); G = w.mGround(g, x);
    if (G > 0 && !w.tGroundBusy(g, x - 6, G) && !w.tGroundBusy(g, x, G) && !w.tGroundBusy(g, x + 6, G) && w.tVillage(g, x)) X = x;
  }
  check(X > 0, "(the test wants open ground by the hut)");
  for (r = 0; put < 50 && r < 12; r++) for (dx = -(6 - r); dx <= 6 - r && put < 50; dx++) {
    G = w.mGround(g, X + dx);
    if (G > 1 && w.AIRY[g.m[(G - 1) * g.gw + X + dx]]) { w.sandPlace(g, (G - 1) * g.gw + X + dx, w.MAT.SAND); put++; }
  }
  sim.step(w, 400);
  check(g.tLumps.some(function (L) { return L.x0 <= X && L.x1 >= X; }), "a pile of " + put + " handfuls by the hut is not a pile: " + JSON.stringify(g.tLumps));
  var lev = function () { var n = 0; for (var q = X - 8; q <= X + 8; q++) n += Math.max(0, g.tGround[q] - w.mGround(g, q)); return n; };
  for (var t = 0; t < 20000 && lev() > 2; t += 100) sim.step(w, 100);
  check(lev() <= 2, "the pile is still there: " + lev() + " handfuls over the ground as it was");
  check(g.tidied >= 3, "the ground went level by itself, not by anybody carrying it off");
  var heap = g.tip && w.bSite(g, g.tip.site);
  check(heap && heap.kind === "heap" && w.bLabel(heap) === "the village heap", "the village's heap is not somewhere of its own");
  check(Math.abs(g.tip.x - X) > 12, "the heap is where the pile was");
});

test("a pile in a village with a mine is still a pile: only where the spoil goes is the spoil heap's", function () {
  var w = tidyVillage(1), g = w.g, p = g.peasants.filter(function (q) { return !q.dead; })[0];
  know(g, ["farm", "dig", "bucket", "mine"]);
  for (var k = 0; k < g.peasants.length && !sites(g, "mine").length; k++) w.mPlanMine(g, g.peasants[k]);
  check(sites(g, "mine").length, "(the test wants a mine)");
  var m = sites(g, "mine")[0], col = m.col != null ? m.col : Math.round(m.cx), x, G, busy = 0, looked = 0;
  /* (the ground round about the mine, outside its box, is nobody's yet) */
  for (x = col - 40; x <= col + 40; x++) {
    if (x >= m.x0 - 4 && x <= m.x1 + 4) continue;
    G = w.mGround(g, x);
    if (G < 0 || g.sites.some(function (s) { return x >= s.x0 - 3 && x <= s.x1 + 3 && G >= s.y0 - 8 && G <= s.y1 + 4; })) continue;
    looked++;
    if (w.tGroundBusy(g, x, G)) busy++;
  }
  check(looked > 10 && !busy, busy + " of " + looked + " columns round a mine were let off being tidied, with no spoil on them");
  /* (a spadeful of spoil carried up and tipped: where it went is the spoil heap's) */
  var j = -1;
  for (var q = 0; q < m.plan.length && j < 0; q++) if (g.m[m.plan[q].i] === w.MAT.SAND) j = m.plan[q].i;
  check(j >= 0, "(the test wants sand in the mine's way)");
  var before = {}; for (x = 0; x < g.gw; x++) before[x] = w.mGround(g, x);
  check(w.mSpoil(g, m, j), "(the spoil went nowhere)");
  var landed = -1; for (x = 0; x < g.gw && landed < 0; x++) if (w.mGround(g, x) !== before[x]) landed = x;
  check(landed >= 0 && w.tGroundBusy(g, landed, w.mGround(g, landed)), "the spoil heap at column " + landed + " is a pile to be tidied away");
});

test("a bush grown up in a doorway is cut back, and a bucket for a puddle is not thrown through a bush", function () {
  var w = tidyVillage(1), g = w.g, h = sites(g, "house").filter(function (s) { return !s.hut; })[0] || sites(g, "house")[0];
  var d = w.tDoors(g, h)[0], y, x = d.x + 2 * d.side, put = 0;
  for (y = d.bot - 4; y <= d.bot; y++) if (w.AIRY[w.pCell(g, x, y)]) { w.sandPlace(g, y * g.gw + x, w.MAT.PLANT); put++; }
  check(put >= 3, "(the test wants room for a bush on the step)");
  var p = g.peasants.filter(function (q) { return !q.dead; })[0];
  nearHouse(w, p, h);
  check(w.tGoWeed(g, p) && p.task.weed && p.task.site === h.id, "nobody went to cut back the bush in the doorway");
  for (var t = 0; t < 3000 && p.task && p.task.weed; t++) sim.step(w, 1);
  var left = 0; for (y = d.top - 1; y <= d.bot; y++) for (var a = 0; a <= 3; a++) if (w.tWeedAt(g, h, d.x + a * d.side, y)) left++;
  check(left === 0, left + " cells of bush still in the doorway");
  check(h.weedT > g.tick, "a doorway just cut back is not let be a while");
  /* (a throw over a bush: a fire does not care, a puddle does) */
  var fy = w.tFloor(g, h) - 1, tx = x + 12 * d.side, ty = fy;
  for (var k = 0; k < 60 && w.iClearArc(g, x, fy, { x: tx, y: ty }); k++) {
    var X = x + d.side * (3 + (k % 6)), Y = fy - 9 - ((k / 6) | 0);
    if (w.AIRY[w.pCell(g, X, Y)]) w.sandPlace(g, Y * g.gw + X, w.MAT.PLANT);
  }
  check(!w.iClearArc(g, x, fy, { x: tx, y: ty }, true), "a bucket for a puddle is thrown through a bush");
});

test("a roof somebody is already sweeping sends the next one to the next roof; the heap is not started under a bush; a flood gets two buckets", function () {
  var w = tidyVillage(1), g = w.g, hs = sites(g, "house"), ps = g.peasants.filter(function (q) { return !q.dead; });
  function sand(h) {
    for (var x = h.x0 + 1; x <= h.x1 - 1; x++) { for (var y = h.y0 - 12; y < h.y1 && w.AIRY[w.pCell(g, x, y)]; y++); if (y < h.y1) { w.sandPlace(g, (y - 1) * g.gw + x, w.MAT.SAND); g.stamp[(y - 1) * g.gw + x] = 0; } }
  }
  sand(hs[0]); sand(hs[1]);
  var p = ps[0], q = ps[1];
  nearHouse(w, p, hs[0]);
  q.task = { kind: "tidy", site: hs[0].id, x: hs[0].x0, y: hs[0].y0, t: 0, t0: g.tick, act: 0, n: 0, trips: 0 };
  var t = w.tFindLitter(g, p, w.TD_LOOK);
  check(t && t.site === hs[1].id, "with somebody on the nearest roof, the next one in looked no further: " + JSON.stringify(t));
  q.task = null;
  /* (a bush hanging over a bit of open ground: no place for a heap. the ground found by looking out from 30 east of the
     first house, since what grows where is up to the dice) */
  function open(x) { var gg = x > 8 && x < g.gw - 8 ? w.mGround(g, x) : -1; return gg > 8 && w.tHeapOk(g, x, gg, 0) ? gg : -1; }
  var x0 = -1, G = -1, d, at = Math.floor(hs[0].x1) + 30;
  for (d = 0; d < 60 && G < 0; d++) if ((G = open(x0 = at + d)) < 0) G = open(x0 = at - d);
  check(G > 0, "(the test wants open ground for a heap)");
  w.sandPlace(g, (G - 4) * g.gw + x0, w.MAT.PLANT);
  check(!w.tHeapOk(g, x0, G, 0), "the heap would be started under a bush");
  /* (a flood: two on it, a puddle: one) */
  check(w.tBailCrew({ length: 40 }) === 2 && w.tBailCrew({ length: 8 }) === 1, "a flood and a puddle get the same number of buckets");
});

test("a pool more than a puddle, standing against a hut by its door (run off the roof), is bailed; one out in the open is a pond", function () {
  var w = tidyVillage(1), g = w.g, h = sites(g, "house")[0], d = w.tDoors(g, h)[0], p = g.peasants.filter(function (q) { return !q.dead; })[0];
  var n = 0, x, y, G;
  for (x = d.x + d.side; Math.abs(x - d.x) <= 8 && n < 26; x += d.side) {
    G = w.mGround(g, x);
    for (y = G - 1; y >= G - 3 && n < 26; y--) if (w.AIRY[g.m[y * g.gw + x]]) { w.sandPlace(g, y * g.gw + x, w.MAT.WATER); n++; }
  }
  check(n > w.TD_PUDDLE, "(the test wants a pool bigger than a puddle: " + n + ")");
  nearHouse(w, p, h); g.bailT = 0;
  check(w.tGoBail(g, p) && p.task.src && Math.abs(p.task.src.x - d.x) <= 10, "a pool against the door of the hut was let be as a pond");
});

test("nothing is tipped on top of a buried house, and a swim into a flooded floor counts against it", function () {
  var w = tidyVillage(1), g = w.g, h = sites(g, "house")[0];
  check(!w.tHeapOk(g, Math.floor(h.cx), h.y0 - 8, 2) && !w.tHeapOk(g, Math.floor(h.cx), h.y0 - 8, 5, true), "sand heaped over a buried roof is somewhere to tip more");
  var p = g.peasants.filter(function (q) { return !q.dead; })[0];
  p.task = { kind: "bucket", src: { x: h.x0 + 3, y: h.y1 - 2 }, at: { x: h.x0 + 3, y: h.y1 - 2 }, of: h.id, n: 0, t0: g.tick };
  for (var t = 0; t < 400; t += 20) { g.tick += 20; p.swimming = 1; w.tStep(g); }
  p.swimming = 0;
  check(h.bailFail === 1, "a bailer who swam in the flood and gave up was not counted");
});

test("a pond is not planned on a pile of loose sand somebody tipped out", function () {
  var w = tidyVillage(1), g = w.g, x0, r = null, fy = 0;
  sites(g, "house").forEach(function (h) { for (var d = 3; d < 40 && !r; d++) for (var sd = -1; sd <= 1 && !r; sd += 2) { x0 = sd > 0 ? Math.floor(h.x1) + d : Math.floor(h.x0) - d - w.I_POND_W; fy = Math.floor(h.y1); r = w.iPondPlot(g, x0, fy); } });
  x0++;
  check(r, "(the test wants somewhere for a pond)");
  x0--;
  g.tLumps = [{ x0: x0 + 4, x1: x0 + 8, lev: fy }];
  check(!w.iPondPlot(g, x0, fy), "a pond was planned on a pile");
  g.tLumps = [];
});

test("a door buried over its lintel is shut, and the heap is full by its height over where it was started", function () {
  var w = tidyVillage(1), g = w.g, h = sites(g, "house")[0], d = w.tDoors(g, h)[0], x = d.x + d.side, y;
  for (y = d.top - 6; y <= d.bot; y++) if (w.AIRY[g.m[y * g.gw + x]]) w.sandSet(g, y * g.gw + x, w.MAT.SAND);
  check(w.tBlocked(g, d), "a door with sand heaped up over its lintel reads as open");
  var X = Math.floor(h.x1) + 40, G = w.mGround(g, X);
  g.tip = { x: X, y: G, site: 0, n: 3 };
  for (y = G - 1; y >= G - w.TD_HEAP_HIGH - 1; y--) w.sandSet(g, y * g.gw + X, w.MAT.SAND);
  for (y = G - 1; y >= G - w.TD_HEAP_HIGH - 1; y--) { w.sandSet(g, y * g.gw + X - 6, w.MAT.SAND); w.sandSet(g, y * g.gw + X + 6, w.MAT.SAND); }
  check(w.tTipFull(g), "a heap as high again as a heap goes over its own ground is not full, because the sand beside it went up too");
  g.tip = null;
});

/* the great works: the framework (wonders.js), the ones in stone (monuments.js), and the ones for enjoying (pleasures.js) */
require("./wonders.js")(test, check, sim);
require("./monuments.js")(test, check, sim);
require("./pleasures.js")(test, check, sim);
require("./heavens.js")(test, check, sim);
/* a crowded valley: storeys on the houses (storeys.js) */
require("./storeys.js")(test, check, sim);
/* and when the roofs will take no more: platforms on trestle legs (platforms.js) */
require("./platforms.js")(test, check, sim);
/* the valley, four screens wide, and the view along it (docs/wide-valley-spec.md) */
require("./valley.js")(test, check, sim);
/* the picker's MORE row, and its flyout */
require("./picker.js")(test, check, sim);
/* and the hand, under MORE: a lump of the valley lifted, carried and put down (hand.js) */
require("./hand.js")(test, check, sim);

/* one test, its console.log kept rather than printed (so tests side by side do not interleave) */
function runOne(t) {
  var out = [], log = console.log, t1 = Date.now(), err = null;
  console.log = function () { out.push(Array.prototype.join.call(arguments, " ")); };
  try { t.fn(); } catch (e) { err = String(e && e.message); } finally { console.log = log; }
  return { ok: !err, err: err, ms: Date.now() - t1, out: out };
}
function report(t, r) {
  var s = r.ok ? "ok    " + t.name + "  (" + (r.ms / 1000).toFixed(1) + "s)" : "FAIL  " + t.name + "\n      " + r.err;
  console.log((r.out.length ? r.out.join("\n") + "\n" : "") + s);
}

if (process.env.PLEASAND_TEST_WORKER) {
  /* a worker: the parent hands it tests by number, and it hands back how they went */
  process.on("message", function (i) {
    if (i < 0) return process.disconnect();
    process.send({ i: i, r: runOne(tests[i]) });
  });
} else {
  var fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");
  var TIMINGS = path.join(__dirname, ".timings.json"), last = {};
  try { last = JSON.parse(fs.readFileSync(TIMINGS, "utf8")); } catch (e) { /* none yet: registration order */ }
  var picked = [], failed = 0, failures = [], took = {}, t0 = Date.now();
  tests.forEach(function (t, i) { if (!only || t.name.indexOf(only) >= 0) picked.push(i); });
  /* the longest first, so no long one is left to start at the end on its own */
  picked.sort(function (a, b) { return (last[tests[b].name] || 0) - (last[tests[a].name] || 0) || a - b; });
  var jobs = Math.max(1, Math.min(JOBS || (os.availableParallelism ? os.availableParallelism() : os.cpus().length), picked.length));
  var done = function (i, r) {
    took[tests[i].name] = r.ms;
    if (!r.ok) { failed++; failures.push(tests[i].name); }
    report(tests[i], r);
  };
  var finish = function () {
    var all = {}; Object.keys(last).forEach(function (k) { all[k] = last[k]; });
    Object.keys(took).forEach(function (k) { all[k] = took[k]; });
    try { fs.writeFileSync(TIMINGS, JSON.stringify(all, null, 1)); } catch (e) { /* read-only: no matter */ }
    if (failures.length > 1) console.log("\nfailed:\n" + failures.map(function (n) { return "  " + n; }).join("\n"));
    console.log((failed ? failed + " failed" : "all passed") + " (" + picked.length + " tests, " + jobs + " at a time) in " +
                ((Date.now() - t0) / 1000).toFixed(1) + "s");
    process.exit(failed ? 1 : 0);
  };
  if (jobs === 1) {
    picked.sort(function (a, b) { return a - b; }).forEach(function (i) { done(i, runOne(tests[i])); });
    finish();
  } else {
    var next = 0, live = 0;
    var spawn = function () {
      var c = cp.fork(__filename, [], { env: Object.assign({}, process.env, { PLEASAND_TEST_WORKER: "1" }) }), at = -1;
      live++;
      var feed = function () { at = next < picked.length ? picked[next++] : -1; c.send(at); };
      c.on("message", function (m) { at = -1; done(m.i, m.r); feed(); });
      c.on("exit", function (code) {
        live--;
        /* it died in the middle of one: that one failed, and a fresh worker takes up the rest */
        if (at >= 0) { done(at, { ok: false, err: "the worker died (exit " + code + ")", ms: 0, out: [] }); at = -1; if (next < picked.length) spawn(); }
        if (!live) finish();
      });
      feed();
    };
    for (var k = 0; k < jobs; k++) spawn();
  }
}
