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
      for (var x = Math.max(1, s.col - 6); x <= Math.min(g.gw - 2, s.col + 6); x++)
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
  check(!w.oPlanWell(g, p), "the well was planned on a floating deck, with its bore hanging in the air");
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
  var cell = w.oFindOil(g, s), edge = ((cell / g.gw) | 0) * g.gw + s.col + 6;
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

var failed = 0, t0 = Date.now();
tests.forEach(function (t) {
  if (only && t.name.indexOf(only) < 0) return;
  var t1 = Date.now();
  try { t.fn(); console.log("ok    " + t.name + "  (" + ((Date.now() - t1) / 1000).toFixed(1) + "s)"); }
  catch (e) { failed++; console.log("FAIL  " + t.name + "\n      " + (e && e.message)); }
});
console.log((failed ? failed + " failed" : "all passed") + " in " + ((Date.now() - t0) / 1000).toFixed(0) + "s");
process.exit(failed ? 1 : 0);
