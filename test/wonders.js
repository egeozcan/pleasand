/* =====================================================================
   PLEASAND  --  test/wonders.js

   the great works' framework (wonders.js): the dice a village without
   any of it rolls, wet concrete, forced draught, the lightning rod, the
   crew, quarrying (in a mine's gallery, and in the save that started
   all this), iron held back, gilding, the kiln, mixing, and tales.
   required by test/run.js
   ===================================================================== */
"use strict";
var path = require("path");
var H = require("../harness");

module.exports = function (test, check, sim) {
  function know(g, list) { list.forEach(function (k) { g.know[k] = "TEST"; }); }
  function sites(g, kind) { return g.sites.filter(function (s) { return s.kind === kind; }); }
  /* a little wonder of our own, for the framework: a cairn of stone (and whatever else a test wants in it) */
  function cairnDef(w) { if (!w.wOf("cairn")) w.wDef({ id: "cairn", achieve: ["A CAIRN", "a pile of stones, for a test"] }); }
  function cairn(w, p, x, G, n, v) {
    var g = w.g, plan = [];
    cairnDef(w);
    for (var k = 0; k < n; k++) plan.push(w.bE(g, x + (k % 4), G - 1 - (k >> 2), v ? v(k) : w.MAT.BRICK, k >> 2));
    return w.bNew(g, "cairn", p, plan, [x, G - 1 - (n >> 2), x + 3, G - 1], { wonder: true });
  }
  /* a quiet flat patch of ground at column x0, w wide: sand over stone, and nothing over it */
  function flat(w, x0, W, G) {
    var g = w.g, x, y;
    for (x = x0 - 6; x < x0 + W + 6; x++) {
      for (y = G - 30; y < G; y++) w.sandPlace(g, y * g.gw + x, w.MAT.EMPTY);
      for (y = G; y < G + 9; y++) w.sandPlace(g, y * g.gw + x, w.MAT.SAND);
      for (y = G + 9; y < G + 13; y++) w.sandPlace(g, y * g.gw + x, w.MAT.STONE);
    }
  }

  test("wonders: a village with none of the new ideas rolls exactly the dice it did before them", function () {
    /* (recorded at 199c029, before any of this: the plain village, 6000 ticks) */
    var want = { 1: "6dd6e082", 3: "954e65db", 7: "fdc14204" };
    for (var s in want) {
      var h = H.open({ seed: +s });
      h.step(6000);
      check(h.hash() === want[s], "seed " + s + " drew different dice: " + h.hash() + ", was " + want[s]);
      check(!h.g.wAny && !(h.g.tales || []).some(function (t) { return t.kind === "wonder"; }), "seed " + s + " has wonders going on");
    }
  });

  test("wonders: a village with great works in it comes out the same at 1x, 4x and 1/4: the sounds roll the side dice", function () {
    function run(sp) {
      var h = H.open({ seed: 1 });
      h.g.know.concrete = "TEST"; h.g.wAny = true; h.g.helloT = 0;   /* (the greeting is timed by the frame, as it always was) */
      h.speed(sp);
      while (h.g.tick < 3000) h.step(1);
      var c = 0, m = h.g.m; for (var i = 0; i < m.length; i++) c = (c * 31 + m[i]) >>> 0;
      return c;
    }
    var a = run(2), b = run(4), q = run(0);
    check(a === b && a === q, "the grids came out different: " + [a, b, q].map(function (v) { return v.toString(16); }).join(" "));
  });

  test("wonders: wet concrete sets in its form, faster warm, frost ruins it, and poured it sinks under water", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x0 = 200;
    flat(w, x0, 20, G);
    function put(x, y, v, a, t) { var j = y * g.gw + x; w.sandPlace(g, j, v); g.aux[j] = a || 0; if (t != null) { g.T[j] = t; } w.heatAccept(g, j); return j; }
    var room = put(x0, G - 1, M.MORTAR, 128), warm = put(x0 + 4, G - 1, M.MORTAR, 128, 45), cold = put(x0 + 8, G - 1, M.MORTAR, 128, -10);
    sim.step(w, 3);
    check(g.m[cold] === M.SAND, "frozen wet concrete did not crumble to sand: " + g.m[cold]);
    var tw = 0, tr = 0;
    for (var t = 1; t <= 1200 && (!tw || !tr); t++) {
      sim.step(w, 1);
      g.T[warm] = 45;   /* (kept warm) */
      if (!tw && g.m[warm] === M.CONCRETE) tw = t;
      if (!tr && g.m[room] === M.CONCRETE) tr = t;
    }
    check(tr > 700 && tr < 1000, "wet concrete at room temperature set in " + tr + " ticks, not about 900");
    check(tw > 0 && tw < tr * 0.65, "warm wet concrete did not set faster: " + tw + " against " + tr);
    /* poured (no form): it runs, and sinks under water */
    var x = x0 + 14, y;
    for (y = G - 6; y < G; y++) put(x, y, M.WATER);
    for (y = G - 6; y < G; y++) { put(x - 1, y, M.STONE); put(x + 1, y, M.STONE); }
    put(x, G - 8, M.MORTAR);
    sim.step(w, 300);
    check(g.m[(G - 1) * g.gw + x] === M.MORTAR || g.m[(G - 1) * g.gw + x] === M.CONCRETE, "poured wet concrete did not sink under the water: " + g.m[(G - 1) * g.gw + x]);
  });

  test("wonders: wet concrete in its form stays put: water under it does not float up through it", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x, y, k, moved = 0, tops = [];
    for (x = 150; x < 250; x++) { for (y = 100; y < G; y++) w.sandPlace(g, y * g.gw + x, M.EMPTY); for (y = G; y < G + 9; y++) w.sandPlace(g, y * g.gw + x, M.STONE); }
    for (k = 0; k < 20; k++) {
      var top = (G - 3) * g.gw + 160 + 4 * k;
      w.sandPlace(g, top + g.gw, M.WATER); w.sandPlace(g, top + 2 * g.gw, M.WATER);
      w.sandSet(g, top, M.MORTAR); g.aux[top] = 128; w.heatAccept(g, top);   /* (formed: as a builder pours it) */
      tops.push(top);
    }
    for (k = 0; k < 300; k++) { sim.step(w, 1); tops.forEach(function (t) { if (g.m[t] !== M.MORTAR && g.m[t] !== M.CONCRETE) moved++; }); }
    check(moved === 0, "wet concrete was out of its form " + moved + " times");
  });

  test("wonders: a great work's stone put in where there is water shoves the water up, and none of it is lost", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x0 = 200, x, y, k;
    flat(w, x0, 20, G);
    for (x = x0; x <= x0 + 4; x++) for (y = G - 6; y < G; y++) w.sandPlace(g, y * g.gw + x, x === x0 || x === x0 + 4 ? M.STONE : (y >= G - 4 ? M.WATER : M.EMPTY));
    function water() { var n = 0; for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.WATER) n++; return n; }
    var p = g.peasants[0], s = cairn(w, p, x0 + 1, G, 3, function () { return M.BRICK; });   /* (three in the bottom row of the water) */
    s.stock = { stone: 10 };
    var n0 = water();
    for (k = 0; k < s.plan.length; k++) w.bPlace(g, s, s.plan[k], p);
    check(s.plan.every(function (e) { return g.m[e.i] === M.BRICK; }), "the stone did not go in");
    check(water() === n0, "water went from " + n0 + " to " + water());
  });

  test("wonders: a save picks the brush it was saved with by name: one from before wet concrete was in the list keeps its CLONER", function () {
    var w = sim.load(1), g = w.g, k, cl = -1;
    for (k = 0; k < w.PICK.length; k++) if (w.PICK[k].name === "CLONER") cl = k;
    check(cl > 0, "(the test wants a CLONER)");
    var doc = JSON.parse(JSON.stringify(w.saveDocument(g, { source: "test" })));
    doc.ui.sel = "CLONER"; doc.state.sel = cl - 1;   /* (its place in the list before WET CONCRETE went in ahead of it) */
    w.saveLoad(g, doc);
    check(w.curPick(g).name === "CLONER", "loaded with " + w.curPick(g).name + " picked");
  });

  test("wonders: a village with none of it works its furnace as it always did: from four over the mouth, a smelter does not smelt", function () {
    function at(wonders) {
      var w = sim.load(1), g = w.g, M = w.MAT;
      know(g, ["farm", "dig", "mine", "smelt"].concat(wonders ? ["concrete"] : []));
      var p = g.peasants[0];
      check(w.mPlanFurnace(g, p), "(the test wants a furnace)");
      var f = sim.build(w, sites(g, "furnace")[0]), sy = w.mSpotRow(g, f);
      for (var x = f.sx - 1; x <= f.sx + 1; x++) w.sandPlace(g, (sy - 3) * g.gw + x, M.STONE);   /* (a ledge, four over where they stand to work it) */
      sim.step(w, 30);   /* (the wonders' look at the village: g.wAny) */
      p.x = f.sx + 0.5; p.y = sy - 4; p.vy = 0; p.ore = 1; p.coal = 2; p.hunger = 0;
      p.task = { kind: "smelt", site: f.id, t: 0, act: 0, n: 0 };
      w.mTaskSmelt(g, p, p.task);
      return !p.ore;
    }
    check(!at(false), "a smelter four rows over the mouth put the ore in, in a village with no great works (master walks on)");
    check(at(true), "a smelter four rows over the mouth was not let work it, in a village with great works going on");
  });

  test("wonders: stone put in under a capped column of water shoves it round, through the water, to the open top beside it", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x0 = 200, x, y;
    flat(w, x0, 20, G);
    for (x = x0; x <= x0 + 3; x++) for (y = G - 6; y < G; y++) w.sandPlace(g, y * g.gw + x, x === x0 || x === x0 + 3 ? M.STONE : (y >= G - 4 ? M.WATER : M.EMPTY));
    w.sandPlace(g, (G - 5) * g.gw + x0 + 1, M.STONE);   /* (a lid over the left column: the right one is open) */
    function water() { var n = 0; for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.WATER) n++; return n; }
    var p = g.peasants[0], s = cairn(w, p, x0 + 1, G, 1, function () { return M.BRICK; });
    s.stock = { stone: 4 };
    var n0 = water();
    w.bPlace(g, s, s.plan[0], p);
    check(g.m[s.plan[0].i] === M.BRICK, "the stone did not go in under the capped water");
    check(water() === n0, "water went from " + n0 + " to " + water());
  });

  test("wonders: a legacy save's keyframe picks the brush it was saved with, too", function () {
    var w = sim.load(1), g = w.g, k, cl = -1;
    for (k = 0; k < w.PICK.length; k++) if (w.PICK[k].name === "CLONER") cl = k;
    var doc = JSON.parse(JSON.stringify(w.saveDocument(g, { source: "test" })));
    /* (a save from master: no list of picks, no tales, CLONER one place earlier in the list) */
    delete doc.ui.picks; doc.ui.sel = "CLONER";
    var st = w.saveDecode(doc.state); delete st.tales; st.sel = cl - 1;
    doc.keyframes = [{ why: "test", tick: g.tick, t: 0, updates: null, rng: null, state: w.saveEncode(st, []) }];
    w.saveLoad(g, doc, { keyframe: 0 });
    check(w.curPick(g).name === "CLONER", "its keyframe loaded with " + w.curPick(g).name + " picked");
  });

  test("wonders: a bang rolls the same dice however many rings are still fading on the screen (the game at any speed)", function () {
    function after(rings) {
      var w = sim.load(1), g = w.g, k;
      for (k = 0; k < rings; k++) g.rings.push({ x: 0, y: 0, r: 0, R: 1, t: 0 });
      for (k = 0; k < 12; k++) w.sandBoom(g, (130 + k) * g.gw + 40 + 15 * k, 3, 1.2);   /* (a meteorite's size of bang, a dozen) */
      return w.eval("Math.random()");
    }
    check(after(8) === after(0), "the dice after a dozen bangs differ with eight rings fading and with none");
  });

  test("wonders: a legacy save's keyframe, restored as a harness checkpoint, picks its brush by name too", function () {
    var h = H.open({ seed: 1 }), w = h.game, g = h.g, k, cl = -1;
    for (k = 0; k < w.PICK.length; k++) if (w.PICK[k].name === "CLONER") cl = k;
    var doc = JSON.parse(JSON.stringify(h.save()));
    var st = w.saveDecode(doc.state); delete st.tales; st.sel = cl - 1;   /* (a save from master: no tales, no list of picks) */
    delete doc.ui.picks; doc.ui.sel = "CLONER";
    doc.keyframes = [{ why: "test", tick: g.tick, t: 0, updates: 0, rng: null, state: w.saveEncode(st, []) }];
    h.load(doc);
    h.restore("kf0");
    check(w.curPick(h.g).name === "CLONER", "restored checkpoint kf0 with " + w.curPick(h.g).name + " picked");
  });

  test("wonders: gold is never waited for: planned in gold, and the gold gone, it goes in in stone, to be gilded later", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, p = g.peasants[0];
    g.peasants.forEach(function (q) { q.gold = 0; });
    p.gold = 1;   /* (gold on hand, when it was planned) */
    var x = Math.floor(p.x) + 8, G = w.mGround(g, x);
    cairnDef(w);
    var plan = w.wGild(g, [w.bE(g, x, G - 1, M.BRICK, 0), w.bE(g, x, G - 2, M.GOLD, 1)]);
    check(plan[1].v === M.GOLD, "(the test wants it planned in gold)");
    var s = w.bNew(g, "cairn", p, plan, [x, G - 2, x, G - 1], { wonder: true });
    g.know.cairn = "TEST";
    p.gold = 0;   /* (and the gold gone: spent, or gone with whoever had it) */
    sim.step(w, 60);
    check(plan[1].v === M.BRICK, "the cell planned in gold still waits for gold that is not there");
    void s;
  });

  test("wonders: a scenario from before wet concrete, picking by place in the list, replays the brush it picked: and new ones pick by name", function () {
    var h = H.open({ seed: 1 }), k, cl = -1;
    for (k = 0; k < h.pick.length; k++) if (h.pick[k].name === "CLONER") cl = k;
    /* (master's list: wet concrete not in it, CLONER one place earlier) */
    var sc = { version: 1, seed: 1, ticks: 2, ops: [{ at: 0, op: "select", args: { sel: cl - 1 } }, { at: 1, op: "tap", args: { x: 100, y: 60 } }] };
    h.replay(sc);
    check(h.pick[h.g.sel].name === "CLONER", "the old scenario picked " + h.pick[h.g.sel].name);
    var h2 = H.open({ seed: 1 });
    h2.select("CLONER");
    var ops = h2.scenario().ops;
    check(ops[ops.length - 1].args.sel === "CLONER" && h2.scenario().picks, "a new pick is recorded as " + JSON.stringify(ops[ops.length - 1].args));
  });

  test("wonders: a mixer's bucket of water is in their pail, and spilt, not lost, if they die before it is mixed", function () {
    var w = sim.load(1), g = w.g, M = w.MAT;
    know(g, ["farm", "dig", "bucket", "concrete"]);
    var p = g.peasants[0];
    var x = Math.floor(p.x) + 6, G = w.mGround(g, x);
    var s = cairn(w, p, x, G, 4, function () { return M.CONCRETE; });
    s.stock = { lime: 2 };
    g.peasants.forEach(function (q) { if (q !== p) q.x = 10; q.task = null; q.hunger = 0; });
    check(w.wGoMix(g, p, s), "(the test wants somebody mixing)");
    function water() { var n = 0; for (var j = 0; j < g.m.length; j++) if (w.WET[g.m[j]]) n++; return n; }
    var n0 = water(), k;
    for (k = 0; k < 4000 && !(p.task && p.task.water); k++) sim.step(w, 1);
    check(p.task && p.task.water > 0, "(the test wants a bucket scooped)");
    w.pDie(g, p, "old");
    sim.step(w, 1);
    check(water() === n0, "water went from " + n0 + " to " + water() + " with the mixer dead");
  });

  test("wonders: a scenario from before wet concrete, clicking the picker, replays the brush it clicked: and new clicks are kept by name", function () {
    var h = H.open({ seed: 1 }), w = h.game, k, cl = -1;
    for (k = 0; k < h.pick.length; k++) if (h.pick[k].name === "CLONER") cl = k;
    function at(sx, sy) { return { x: (sx - h.PANEL) / h.CELL - 0.5, y: (sy - h.PLAY_Y) / h.CELL - 0.5 }; }   /* (a point on the screen, as the harness's cells) */
    var c = at(10, w.rowY(cl - 1) + 3);   /* (CLONER's row, as the rows were then: one higher) */
    var sc = { version: 1, seed: 1, ticks: 2, ops: [{ at: 0, op: "tap", args: { x: c.x, y: c.y } }] };
    h.replay(sc);
    check(h.pick[h.g.sel].name === "CLONER", "the old scenario's click on CLONER picked " + h.pick[h.g.sel].name);
    var h2 = H.open({ seed: 1 });
    var c2 = at(10, w.rowY(cl) + 3);
    h2.tap(c2.x, c2.y);
    var ops = h2.scenario().ops;
    check(ops.some(function (o) { return o.op === "tap" && o.args.act === "sel:CLONER"; }), "a click on CLONER was not kept by name: " + JSON.stringify(ops));
  });
  /* (recorded with master's harness, in a worktree of master: GLASS clicked, the wheel and the down arrow over the list
     (METAL, then ACID, there), SIZE +, SAND clicked, CLEAR, GLASS and the down arrow (METAL), speed +, WATER and a drag,
     the thermal view. its hash is master's) */
  var MASTER_SC = {"version":1,"seed":3,"ticks":158,"hash":"1597f401","ops":[{"at":0,"op":"tap","args":{"x":-43.5,"y":114.5}},{"at":5,"op":"mouse","args":{"x":-43.5,"y":114.5}},{"at":5,"op":"wheel","args":{"d":1}},{"at":5,"op":"tap","args":{"x":100,"y":60}},{"at":5,"op":"tap","args":{"x":101,"y":60}},{"at":15,"op":"key","args":{"k":"arrowdown"}},{"at":15,"op":"tap","args":{"x":120,"y":50}},{"at":25,"op":"tap","args":{"x":-8.5,"y":165.5}},{"at":25,"op":"tap","args":{"x":-43.5,"y":39.5}},{"at":25,"op":"tap","args":{"x":140,"y":40}},{"at":45,"op":"tap","args":{"x":-18.5,"y":172}},{"at":50,"op":"tap","args":{"x":-43.5,"y":114.5}},{"at":50,"op":"key","args":{"k":"arrowdown"}},{"at":50,"op":"tap","args":{"x":90,"y":70}},{"at":50,"op":"tap","args":{"x":91,"y":70}},{"at":60,"op":"tap","args":{"x":-28.5,"y":178.5}},{"at":60,"op":"tap","args":{"x":-43.5,"y":44.5}},{"at":60,"op":"drag","args":{"x0":60,"y0":30,"x1":80,"y1":30,"ticks":8,"btn":0}},{"at":98,"op":"tap","args":{"x":-38.5,"y":185}}]};
  test("wonders: a real scenario recorded on master, clicking the panel's rows and buttons and using the wheel and arrows over the list, replays to master's hash", function () {
    var h = H.open({ seed: MASTER_SC.seed }), r = h.replay(MASTER_SC);
    check(r.matches, "replayed to " + r.hash + ", not master's " + MASTER_SC.hash + " (" + h.pick[h.g.sel].name + ", size " + h.g.size + ", speed " + h.g.speed + ", thermal " + h.g.thermal + ")");
    check(h.pick[h.g.sel].name === "WATER" && h.g.size === 6 && h.g.speed === 3 && h.g.thermal, "the panel came out " + h.pick[h.g.sel].name + ", size " + h.g.size + ", speed " + h.g.speed + ", thermal " + h.g.thermal);
  });
  test("wonders: what is done on the panel, the wheel and the arrows is recorded as what it did, and replays as that whatever the panel's layout", function () {
    var h = H.open({ seed: 2 }), w = h.game, k;
    function at(sx, sy) { return { x: (sx - h.PANEL) / h.CELL - 0.5, y: (sy - h.PLAY_Y) / h.CELL - 0.5 }; }
    for (k = 0; k < h.pick.length; k++) if (h.pick[k].name === "GLASS") break;
    var c = at(10, w.rowY(k) + 4); h.tap(c.x, c.y);
    h.mouse(c.x, c.y); h.wheel(1); h.key("arrowdown");
    c = at(80, w.SIZE_Y + 5); h.tap(c.x, c.y);
    c = at(60, w.BTN_Y + 5); h.tap(c.x, c.y);
    var sc = h.scenario(), ops = sc.ops;
    function arg(op, f) { return ops.filter(function (o) { return o.op === op; }).map(function (o) { return o.args[f]; }); }
    check(arg("tap", "act").join() === "sel:GLASS,size+,clear", "taps kept as " + arg("tap", "act").join());
    check(arg("wheel", "sel")[0] === "WET CONCRETE" && arg("key", "sel")[0] === "METAL", "wheel and arrow kept as " + arg("wheel", "sel") + ", " + arg("key", "sel"));
    /* (the panel laid out some other way by the time it is replayed: every click somewhere else on it, and the list
       in another order) */
    var sc2 = JSON.parse(JSON.stringify(sc));
    sc2.ops.forEach(function (o) { if (o.op === "tap" || o.op === "mouse") o.args.y = 5; });
    sc2.picks = sc2.picks.slice().reverse();
    var h2 = H.open({ seed: 2 }), r = h2.replay(sc2);
    check(r.hash === sc.hash && h2.pick[h2.g.sel].name === "METAL" && h2.g.size === h.g.size, "replayed with the panel moved: " + h2.pick[h2.g.sel].name + ", size " + h2.g.size + ", hash " + (r.hash === sc.hash));
  });

  test("wonders: a pail of concrete gone off up a ladder is carried as a lump, and kept when they die", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x0 = 200, x, y;
    flat(w, x0, 20, G);
    know(g, ["concrete"]);
    var p = g.peasants[0];
    g.peasants.forEach(function (q) { if (q !== p) q.x = 10; });
    /* (up a ladder, over a drop, nothing near to put a lump on) */
    for (x = x0 - 6; x <= x0 + 6; x++) for (y = G - 40; y <= G; y++) w.sandPlace(g, y * g.gw + x, M.EMPTY);
    for (y = G - 30; y <= G; y++) w.sandPlace(g, y * g.gw + x0, M.LADDER);
    p.x = x0 + 0.5; p.y = G - 20; p.mortar = w.W_PAIL; p.mortarT = g.tick - w.W_POUR - 1; p.task = null;
    function conc() { var n = 0; for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.CONCRETE) n++; return n; }
    var c0 = conc();
    w.wWentOff(g, p);
    check(conc() - c0 + (p.lump || 0) === w.W_PAIL, "a pail gone off: " + (conc() - c0) + " set down and " + (p.lump || 0) + " carried, of " + w.W_PAIL);
    w.pDie(g, p, "old");
    check(conc() === c0 && g.salvage && g.salvage.lump === w.W_PAIL, "dead, the lump was not kept: " + (conc() - c0) + " set down, " + JSON.stringify(g.salvage));
  });

  test("wonders: a lump of concrete is never put down by whoever carries it, but into a plan's cell, where it goes in set", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x0 = 200, x, y, k;
    flat(w, x0, 20, G);
    know(g, ["concrete"]);
    var p = g.peasants[0];
    g.peasants.forEach(function (q) { if (q !== p) q.dead = 1; });
    /* (under a low ceiling of stone: room to stand, and no more) */
    for (x = x0 - 6; x <= x0 + 6; x++) w.sandPlace(g, (G - 10) * g.gw + x, M.STONE);
    p.x = x0 + 0.5; p.y = G - 1; p.mortar = w.W_PAIL; p.mortarT = g.tick - w.W_POUR - 1; p.task = null; p.hunger = 0;
    function conc() { var n = 0; for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.CONCRETE || g.m[j] === M.MORTAR) n++; return n; }
    var c0 = conc();
    for (k = 0; k < 300; k++) sim.step(w, 1);
    check(conc() === c0 && p.lump === w.W_PAIL && !p.dead, "the lump was put down by its carrier: " + (conc() - c0) + " cells, " + p.lump + " carried, dead " + !!p.dead);
    /* (and a wonder wanting concrete: it goes in there, set) */
    var s = cairn(w, p, x0 + 3, G, 2, function () { return M.CONCRETE; });
    for (k = 0; k < 12000 && !s.plan.every(function (e) { return g.m[e.i] === M.CONCRETE; }); k++) sim.step(w, 1);
    check(s.plan.every(function (e) { return g.m[e.i] === M.CONCRETE; }), "the lump did not go into the wonder's concrete: " + s.plan.map(function (e) { return w.MAT_NAME[g.m[e.i]]; }).join(","));
    check(p.lump === w.W_PAIL - 2, "the lump went from " + w.W_PAIL + " to " + p.lump + " for two cells");
  });
  test("wonders: dead with what they carried for a great work, none of it is a cell: it is all kept, and fetched for a great work that wants it", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x0 = 200, k;
    flat(w, x0 - 60, 100, G);
    know(g, ["concrete"]);
    var p = g.peasants[0], q = g.peasants[1];
    g.peasants.forEach(function (o) { if (o !== p && o !== q) o.dead = 1; });
    function cells() { var n = 0; for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.CONCRETE || g.m[j] === M.MOONROCK) n++; return n; }
    var c0 = cells();
    /* (nothing to put it by: no great work, no furnace, and stone all round) */
    p.x = x0 + 0.5; p.y = G - 1; p.lump = 5; p.moonrock = 2; p.firebrick = 2; p.stained = 2; p.tints = [1, 2];
    w.pDie(g, p, "old");
    sim.step(w, 2);
    var sv = g.salvage || {};
    check(cells() === c0, "the dead's load was set down as cells: " + (cells() - c0));
    check(sv.lump === 5 && sv.moonrock === 2 && sv.firebrick === 2 && sv.stained === 2 && (sv.tints || []).join() === "1,2", "not all kept: " + JSON.stringify(sv));
    /* (and saved with the world) */
    var doc = JSON.parse(JSON.stringify(w.saveDocument(g, { source: "test" }))), w2 = sim.load(1);
    w2.saveLoad(w2.g, doc);
    check(JSON.stringify(w2.g.salvage) === JSON.stringify(g.salvage), "the salvage was not saved: " + JSON.stringify(w2.g.salvage));
    /* (a great work wanting concrete: the lumps fetched, and go in) */
    var s = cairn(w, q, x0 - 20, G, 3, function () { return M.CONCRETE; });
    q.x = x0 - 30.5; q.y = G - 1; q.task = null; q.hunger = 0;
    for (k = 0; k < 12000 && !s.plan.every(function (e) { return g.m[e.i] === M.CONCRETE; }); k++) sim.step(w, 1);
    check(s.plan.every(function (e) { return g.m[e.i] === M.CONCRETE; }), "the kept lumps never went into the great work: " + JSON.stringify(g.salvage) + ", carried " + q.lump);
  });
  test("wonders: what the dead left is kept through CLEAR, but a NEW village starts with none of it", function () {
    var w = sim.load(1), g = w.g, p = g.peasants[0];
    p.lump = 3; p.moonrock = 1;
    w.pDie(g, p, "old");
    check(g.salvage && g.salvage.lump === 3 && g.wSalv, "(the test wants something kept)");
    w.sandClear(g);
    check(g.salvage && g.salvage.lump === 3, "CLEAR lost what was kept: " + JSON.stringify(g.salvage));
    w.sandLandscape(g);
    check(!g.salvage && !g.wSalv, "a NEW village has the old one's salvage: " + JSON.stringify(g.salvage));
  });
  test("wonders: dead in a tunnel with a load of concrete, they do not plug it: whoever else is in there can still get out", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x0 = 200, x, y, k;
    flat(w, x0 - 40, 80, G);
    /* (a tunnel nine high, under stone, open at one end) */
    for (x = x0 - 30; x <= x0 + 6; x++) for (y = G - 20; y < G; y++) if (y < G - 9 || x > x0 + 4) w.sandPlace(g, y * g.gw + x, M.STONE);
    var p = g.peasants[0], q = g.peasants[1];
    g.peasants.forEach(function (o) { if (o !== p && o !== q) o.dead = 1; });
    p.x = x0 - 20.5; p.y = G - 1; p.lump = 5;
    q.x = x0 + 1.5; q.y = G - 1; q.task = null; q.hunger = 0;
    function out() { return !!w.navFind(g, Math.floor(q.x), G - 1, function (x2) { return x2 < x0 - 32; }, x0 - 34, G - 1, 8000); }
    check(out(), "(the test wants a way out first)");
    w.pDie(g, p, "old");
    sim.step(w, 2);
    check(out(), "the dead's concrete shut the tunnel");
  });

  test("wonders: forced draught: a closed firebrick chamber of lit coal passes 1500 with the bellows, and not without", function () {
    function chamber(draught) {
      var w = sim.load(1), g = w.g, M = w.MAT, x0 = 200, y0 = 60, x, y, cells = [], hi = 0;
      for (y = y0 - 1; y <= y0 + 5; y++) for (x = x0 - 1; x <= x0 + 3; x++) {
        var j = y * g.gw + x, inside = x >= x0 && x <= x0 + 2 && y >= y0 && y <= y0 + 4;
        w.sandPlace(g, j, inside ? M.EMBER : M.FIREBRICK);
        if (inside) { g.aux[j] = 1; g.T[j] = 600; w.heatAccept(g, j); cells.push(j); }
      }
      check(w.wClosed(g, cells), "(the test wants a closed chamber)");
      for (var t = 0; t < 2500; t += 30) {
        if (draught) w.wDraught(g, "test", cells, 60);
        sim.step(w, 30);
        cells.forEach(function (j) { if (g.m[j] === M.EMBER && g.T[j] > hi) hi = g.T[j]; });
      }
      return hi;
    }
    var on = chamber(true), off = chamber(false);
    check(on > 1500, "with the bellows going it got to only " + Math.round(on));
    check(off < 760, "without the bellows it got to " + Math.round(off));
  });

  test("wonders: the lightning rod takes a bolt aimed at something of theirs, and lets one aimed at open ground land", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, G = 150, x0 = 140, x, y;
    flat(w, x0, 60, G);
    g.peasants.forEach(function (q) { q.x = 20; });
    /* a block of stonework of theirs, eleven wide; a girder rod eight columns off it; open sand eight the other way */
    var plan = [];
    for (x = x0; x < x0 + 11; x++) for (y = G - 4; y < G; y++) plan.push(w.bE(g, x, y, M.BRICK, 0));
    var block = sim.build(w, w.bNew(g, "statue", null, plan, [x0, G - 4, x0 + 10, G - 1], { of: "NOBODY", px: x0 + 5, G: G }));
    var rx = x0 + 13, rplan = [];
    for (y = G - 14; y < G; y++) rplan.push(w.bE(g, rx, y, M.GIRDER, 0));
    sim.build(w, w.bNew(g, "post", null, rplan, [rx, G - 14, rx, G - 1], { G: G, rod: { x: rx, top: G - 14, bot: G - 1 } }));
    var rod = sites(g, "post")[0];
    w.sandLightning(g, x0 + 5);
    check(rod.rodHits === 1, "the rod did not take a bolt aimed at the stonework (" + (rod.rodHits || 0) + ")");
    var burnt = 0;
    for (x = x0 - 2; x < x0 + 13; x++) for (y = G - 10; y < G + 2; y++) { var c = g.m[y * g.gw + x]; if (c === M.FIRE || c === M.GLASS || c === M.EMBER) burnt++; }
    check(burnt === 0, burnt + " cells burned or fused round the stonework");
    /* open ground the other side of the rod, eight off: it lands where it was aimed */
    w.sandLightning(g, rx + 8);
    check(rod.rodHits === 1, "the rod took a bolt aimed at open ground");
    void block;
  });

  test("wonders: a great work's crew is capped, and it never counts against the projects going at once", function () {
    var w = sim.load(1), g = w.g;
    var p = g.peasants[0], x = Math.floor(p.x) + 8, G = w.mGround(g, x);
    var open = w.bOpenCount(g), s = cairn(w, p, x, G, 24);
    check(w.bOpenCount(g) === open, "a wonder counted against B_OPEN");
    g.peasants.forEach(function (q) { q.stone = 10; q.task = null; q.hunger = 0; });
    g.peasants.forEach(function (q) { var t = w.bNearestSite(g, q, 400); if (t) w.bJoin(g, q, t); else w.wPick(g, q, false); });
    var crew = w.wCrew(g, s), haul = g.peasants.filter(function (q) { return q.task && q.task.kind === "haul"; }).length;
    check(crew === w.wCap(g), "the crew is " + crew + ", the cap " + w.wCap(g));
    check(haul > 0, "nobody carrying stone, past the crew, brought it to the pile");
  });

  test("wonders: two great works go up at once, not three; one laid by is not one of them; their crews are half the village at most", function () {
    var w = sim.load(1), g = w.g, p = g.peasants[0], x = Math.floor(p.x) + 8, G = w.mGround(g, x);
    var a = cairn(w, p, x, G, 24);
    check(w.wRoomFor(g), "one great work going up left no room for another");
    var b = cairn(w, p, x + 6, w.mGround(g, x + 6), 24);
    check(!w.wRoomFor(g), "room for a third great work beside two");
    b.laid = true;
    check(w.wRoomFor(g), "a great work laid by still counted as one going up");
    b.laid = false;
    var c = cairn(w, p, x + 12, w.mGround(g, x + 12), 24);   /* (a third, say, taken up again) */
    g.peasants.forEach(function (q) { q.stone = 10; q.task = null; q.hunger = 0; });
    g.peasants.forEach(function (q) { var t = w.bNearestSite(g, q, 400); if (t) w.bJoin(g, q, t); else w.wPick(g, q, false); });
    var crews = w.wCrew(g, a) + w.wCrew(g, b) + w.wCrew(g, c);
    check(crews <= Math.floor(w.bAlive(g) / 2), "the great works' crews are " + crews + " of " + w.bAlive(g));
    check([a, b, c].every(function (t) { return w.wCrew(g, t) <= w.wCap(g); }), "a crew over its cap");
  });

  /* a mine with a gallery dug out east of it, all done, in seed 1 */
  function galleryVillage() {
    var w = sim.load(1), g = w.g, p = null, k;
    know(g, ["farm", "dig", "mine", "masonry"]);
    for (k = 0; k < g.peasants.length && !sites(g, "mine").length; k++) { p = g.peasants[k]; w.mPlanMine(g, p); }
    var m = sim.build(w, sites(g, "mine")[0]);
    p.task = null;
    check(w.mPlanTunnel(g, p), "(the test wants a gallery)");
    var t = sim.build(w, sites(g, "tunnel")[0]);
    g.peasants.forEach(function (q) { q.stone = 0; q.task = null; q.mineCD = 1e9; });
    g.mineNo = {}; for (k = 0; k < g.gw; k++) g.mineNo[k] = 1e12;
    return { w: w, g: g, m: m, t: t, p: p };
  }
  test("wonders: a wonder short of stone sends one quarryman, who benches a gallery, brings it to the pile, and can climb out", function () {
    var V = galleryVillage(), w = V.w, g = V.g, t = V.t, m = V.m;
    var x = Math.round(w.wMiddle(g)), G = w.mGround(g, x);
    var s = cairn(w, V.p, x, G, 40);
    var most = 0, first = null;
    for (var k = 0; k < 9000 && !(s.stock && s.stock.stone >= 1) && w.bShare(g, s) === 0; k++) {
      sim.step(w, 1);
      var qs = g.peasants.filter(function (q) { return q.task && q.task.kind === "quarry"; });
      most = Math.max(most, qs.length);
      if (!first) first = sites(g, "quarry")[0];
    }
    check(first && first.of === t.id, "no bench was planned in the gallery");
    check(most === 1, most + " quarrymen at once");
    check((s.stock && s.stock.stone >= 1) || w.bShare(g, s) > 0, "no stone reached the pile (" + JSON.stringify(s.stock) + ")");
    var q = first, cut = q.plan.filter(function (e) { return e.v === w.MAT.EMPTY && w.bOk(g, e); }).length;
    check(cut >= 3, "the bench is not being cut: " + cut + " cells");
    /* the bench is climbed out of: from its floor, as far as it is down, to the top of the shaft */
    var bx = q.cols[0], by = w.wFloorAt(g, bx, t.B);
    var route = w.navFind(g, bx, by, function (X, Y) { return Math.abs(X - m.col) <= 2 && Y < m.S; }, m.col, m.S - 1, 20000);
    check(!!route, "no way up out of the bench at " + bx + "," + by);
  });

  test("wonders: loaded from the save where there was nowhere for another mine, a forced wonder still gets its stone by benching", function () {
    var file = path.join(__dirname, "..", "pleasand-20261120-092456-t637685.json");
    if (!require("fs").existsSync(file)) { console.log("      (skipped: the save is not here)"); return; }
    var h = H.open({ seed: 1 });
    h.load(file);
    var g = h.g, w = h.game;
    g.paused = 0; if (g.speed == null) { g.speed = w.SPEED_1; g.speedAcc = 0; }   /* (an older save, from before the speed buttons) */
    check(!sites(g, "mine").length && !sites(g, "tunnel").length, "(the test wants a valley with no mine in it)");
    g.mineNo = {}; for (var x = 0; x < g.gw; x++) g.mineNo[x] = 1e12;   /* (and none sunk now, either) */
    g.peasants.forEach(function (q) { q.stone = 0; });
    cairnDef(w);
    var hs = sites(g, "house")[0], cx = hs.x1 + 3, G = w.mGroundNear(g, cx, false, hs.y1), plan = [];
    for (var k = 0; k < 40; k++) plan.push(w.bE(g, cx + (k % 4), G - 1 - (k >> 2), w.MAT.BRICK, k >> 2));
    var s = w.bNew(g, "cairn", g.peasants[0], plan, [cx, G - 10, cx + 3, G - 1], { wonder: true });
    var r = h.until(function () { return (s.stock && s.stock.stone >= 1) || w.bShare(g, s) > 0; }, { max: 8000 });
    var q = sites(g, "quarry")[0];
    check(!!q && q.of === 0, "no bench in the bare rock (" + (q ? "of " + q.of : "none") + ")");
    check(r.hit, "no stone reached the forced wonder's pile in 8000 ticks (found " + g.found.stone + ")");
    check(g.found.stone > 0, "no stone was cut");
  });

  test("wonders: while a wonder wants iron, new tools wait for iron to spare, and worn ones do not", function () {
    var w = sim.load(1), g = w.g;
    know(g, ["farm", "dig", "mine", "smelt", "forge"]);
    var p = g.peasants[0];
    check(w.mPlanFurnace(g, p), "(the test wants a furnace)");
    sim.build(w, sites(g, "furnace")[0]);
    p.x = sites(g, "furnace")[0].cx; p.iron = 3; p.tools = 0; p.worn = 0; p.task = null;
    check(w.mGoForge(g, p), "(without a wonder, they would forge)");
    p.task = null;
    g.wIronTest = true; g.ironSpare = 30;
    check(!w.mGoForge(g, p), "new tools were forged with a wonder wanting the iron");
    p.worn = 1;
    check(w.mGoForge(g, p), "worn-out tools were not done again");
  });

  test("wonders: the iron kept back for a great work is the village's own: a plain village loaded after one keeps back what it always did", function () {
    var w = sim.load(1), g = w.g, p = g.peasants[0];
    var plain = JSON.parse(JSON.stringify(w.saveDocument(g, { source: "test" })));
    /* a great work wanting iron, and the wonders' look at it */
    cairnDef(w);
    var G = w.mGround(g, Math.floor(p.x) + 8), s = cairn(w, p, Math.floor(p.x) + 8, G, 4, function () { return w.MAT.GIRDER; });
    g.know.cairn = "TEST"; g.tick = 30 * 1000; w.wStep(g);
    check(w.mIronSpare(g) === w.W_IRON_HOLD, "(the test wants iron held back: " + w.mIronSpare(g) + ")");
    w.saveLoad(g, plain);
    check(w.mIronSpare(g) === w.M_IRON_SPARE, "a plain village loaded after a great work keeps back " + w.mIronSpare(g) + " iron, not " + w.M_IRON_SPARE);
    void s;
  });

  test("wonders: a new village (R) has nothing of the old one's great works in the air: a rocket going up is gone, and sets nothing alight", function () {
    var w = sim.load(1), g = w.g, M = w.MAT;
    g.rocket = { x: 120.5, y: 140, vy: -0.2, cells: [{ dx: 0, dy: 0, v: M.METAL, a: 0, sh: 0 }], site: 999, t: 40, fireQ: 0, n: 1 };
    g.moonT = g.tick + 5; g.ironSpare = 30;
    w.sandLandscape(g);
    check(!g.rocket && !g.moonT && !g.ironSpare, "the old village's rocket (or flag, or iron) is still about: " + JSON.stringify([!!g.rocket, g.moonT, g.ironSpare]));
    var fire = function () { var n = 0; for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.FIRE) n++; return n; };
    var f0 = fire();
    sim.step(w, 120);
    check(fire() <= f0, "fire in the new village: " + fire());
  });

  test("wonders: the world cleared (C) has nothing of the great works in the air: a rocket going up is gone, and sets nothing alight", function () {
    var w = sim.load(1), g = w.g, M = w.MAT;
    g.rocket = { x: 120.5, y: 140, vy: -0.2, cells: [{ dx: 0, dy: 0, v: M.METAL, a: 0, sh: 0 }], site: 999, t: 40, fireQ: 0, n: 1 };
    g.moonT = g.tick + 5; g.know.moonrocket = "TEST";
    w.sandClear(g);
    check(!g.rocket && !g.moonT, "the rocket (or its flag) is still about after the world was cleared");
    var fire = 0;
    for (var k = 0; k < 60; k++) { sim.step(w, 1); for (var j = 0; j < g.m.length; j++) if (g.m[j] === M.FIRE) fire++; }
    check(fire === 0, "fire in the cleared world: " + fire);
    check(g.know.moonrocket, "(and what they know is still known)");
  });

  test("wonders: gold is gilding: with none about it is stone, and gilded when gold turns up", function () {
    var w = sim.load(1), g = w.g, p = g.peasants[0], M = w.MAT;
    g.peasants.forEach(function (q) { q.gold = 0; });
    var x = Math.floor(p.x) + 8, G = w.mGround(g, x);
    var s = cairn(w, p, x, G, 8, function (k) { return k === 7 ? M.GOLD : M.BRICK; });
    w.wGild(g, s.plan);
    var cap = s.plan[7];
    check(cap.v === M.BRICK && cap.gild, "the gold went in as " + cap.v);
    sim.build(w, s);
    p.gold = 2;
    w.wRegild(g, s);
    check(cap.v === M.GOLD && s.repair && !s.done, "gold turned up, and the stand-in was not gilded");
    check(w.bFree(g, cap), "the stand-in cannot be taken out for the gold");
  });

  test("wonders: the kiln burns lime and firebrick for a wonder that wants them, and the furnace's worker carries them to it", function () {
    var w = sim.load(1), g = w.g, M = w.MAT;
    know(g, ["farm", "dig", "mine", "smelt", "masonry", "concrete"]);
    var p = g.peasants[0];
    check(w.mPlanFurnace(g, p), "(the test wants a furnace)");
    var f = sim.build(w, sites(g, "furnace")[0]);
    var x = f.x1 + 12, G = w.mGround(g, x);
    var s = cairn(w, p, x, G, 8, function (k) { return k < 3 ? M.FIREBRICK : M.CONCRETE; });
    g.peasants.forEach(function (q) { q.task = null; q.mineCD = 1e9; q.hunger = 0; q.stone = 4; q.coal = 4; });
    sim.step(w, 30);
    check(g.kiln.some(function (o) { return o.r === "firebrick"; }) && g.kiln.some(function (o) { return o.r === "lime"; }), "no orders on the kiln: " + JSON.stringify(g.kiln));
    function fired() { return s.plan.filter(function (e) { return g.m[e.i] === M.FIREBRICK; }).length + ((s.stock && s.stock.firebrick) || 0); }
    function limed() { return ((s.stock && s.stock.lime) || 0) + w.wPocketed(g, "mortar") + s.plan.filter(function (e) { return g.m[e.i] === M.MORTAR || g.m[e.i] === M.CONCRETE; }).length; }
    for (var k = 0; k < 8000 && !(fired() >= 3 && limed() >= 1); k++) sim.step(w, 1);
    check(fired() >= 3, "the firebrick did not reach the wonder: " + fired());
    check(limed() >= 1, "no lime reached the wonder: " + JSON.stringify(s.stock));
  });

  test("wonders: a pane of coloured glass is the colour of what went into it: coal makes amber, whatever the window was drawn as", function () {
    var w = sim.load(1), g = w.g, M = w.MAT;
    know(g, ["farm", "dig", "mine", "smelt", "masonry", "glass", "stained"]);
    var p = g.peasants[0];
    check(w.mPlanFurnace(g, p), "(the test wants a furnace)");
    var f = sim.build(w, sites(g, "furnace")[0]);
    var x = f.x1 + 12, G = w.mGround(g, x);
    var s = cairn(w, p, x, G, 1, function () { return M.STAINED; });
    s.plan[0].a = 1;   /* (drawn green: an ore's worth) */
    g.peasants.forEach(function (q) { q.task = null; q.mineCD = 1e9; q.hunger = 0; q.ore = 0; q.gold = 0; q.coal = 0; q.glass = 0; });
    f.stock = { coal: 6, glass: 2 };
    for (var k = 0; k < 8000 && !(g.m[s.plan[0].i] === M.STAINED); k++) sim.step(w, 1);
    check(g.m[s.plan[0].i] === M.STAINED, "(the test wants the window glazed)");
    check(g.aux[s.plan[0].i] === 2, "a pane fired with coal, no ore, went in as " + ["ruby", "green", "amber"][g.aux[s.plan[0].i] % 3]);
  });

  test("wonders: a coloured window broken and glazed again is the colour of its new pane", function () {
    var w = sim.load(1), g = w.g, M = w.MAT;
    know(g, ["farm", "dig", "mine", "smelt", "masonry", "glass", "stained"]);
    var p = g.peasants[0];
    check(w.mPlanFurnace(g, p), "(the test wants a furnace)");
    var f = sim.build(w, sites(g, "furnace")[0]);
    var x = f.x1 + 12, G = w.mGround(g, x), s = cairn(w, p, x, G, 1, function () { return M.STAINED; }), e = s.plan[0];
    e.a = 1;   /* (drawn green) */
    s.stock = { stained: 1 }; w.bPlace(g, s, e, p);
    check(g.m[e.i] === M.STAINED && g.aux[e.i] === 1, "(the test wants a green pane in)");
    w.sandPlace(g, e.i, M.EMPTY); s.done = false; s.repair = true;   /* (broken) */
    g.peasants.forEach(function (q) { q.task = null; q.mineCD = 1e9; q.hunger = 0; q.ore = 0; q.gold = 0; q.coal = 0; q.glass = 0; q.stained = 0; });
    f.stock = { coal: 6, glass: 2 };
    for (var k = 0; k < 8000 && g.m[e.i] !== M.STAINED; k++) sim.step(w, 1);
    check(g.m[e.i] === M.STAINED, "(the test wants it glazed again)");
    check(g.aux[e.i] === 2, "glazed again with a pane fired with coal, it went in " + ["ruby", "green", "amber"][g.aux[e.i] % 3]);
  });

  test("wonders: of two windows to glaze, the one glazed first is the colour of the one pane fired, wherever the plan has it", function () {
    var w = sim.load(1), g = w.g, M = w.MAT;
    know(g, ["farm", "dig", "mine", "smelt", "masonry", "glass", "stained"]);
    var p = g.peasants[0];
    check(w.mPlanFurnace(g, p), "(the test wants a furnace)");
    var f = sim.build(w, sites(g, "furnace")[0]);
    var x = f.x1 + 12, G = w.mGround(g, x), s = cairn(w, p, x, G, 2, function () { return M.STAINED; });
    s.plan[0].a = 2; s.plan[1].a = 2;   /* (both drawn amber) */
    s.plan[1].ph = 0; s.plan[0].ph = 1;   /* (the second of them glazed first) */
    g.peasants.forEach(function (q) { q.task = null; q.mineCD = 1e9; q.hunger = 0; q.ore = 0; q.gold = 0; q.coal = 0; q.glass = 0; q.stained = 0; });
    f.stock = { ore: 1, coal: 0, glass: 1 };
    var first = null;
    for (var k = 0; k < 8000 && !first; k++) { sim.step(w, 1); first = s.plan.filter(function (e) { return g.m[e.i] === M.STAINED; })[0] || null; }
    check(!!first, "(the test wants a window glazed)");
    check(g.aux[first.i] === 1, "the one pane, fired with ore, went in " + ["ruby", "green", "amber"][g.aux[first.i] % 3]);
  });

  test("wonders: a pane's colour goes with the pane: its carrier dies, and the pane fired in its place goes in its own colour", function () {
    var w = sim.load(1), g = w.g, M = w.MAT, k;
    know(g, ["farm", "dig", "mine", "smelt", "masonry", "glass", "stained"]);
    var p = g.peasants[0];
    check(w.mPlanFurnace(g, p), "(the test wants a furnace)");
    var f = sim.build(w, sites(g, "furnace")[0]);
    var x = f.x1 + 12, G = w.mGround(g, x), s = cairn(w, p, x, G, 1, function () { return M.STAINED; }), e = s.plan[0];
    e.a = 0;   /* (drawn ruby) */
    g.peasants.forEach(function (q) { q.task = null; q.mineCD = 1e9; q.hunger = 0; q.ore = 0; q.gold = 0; q.coal = 0; q.glass = 0; q.stained = 0; });
    f.stock = { ore: 1, coal: 0, glass: 1 };
    var carrier = null;
    for (k = 0; k < 8000 && !carrier; k++) { sim.step(w, 1); carrier = g.peasants.filter(function (q) { return !q.dead && (q.stained || 0) >= 1; })[0] || null; }
    check(!!carrier, "(the test wants a green pane fired)");
    carrier.dead = 1; carrier.stained = 0;   /* (and its carrier gone, pane and all, before it was put in) */
    f.stock = { ore: 0, coal: 3, glass: 1 };
    for (k = 0; k < 12000 && g.m[e.i] !== M.STAINED; k++) sim.step(w, 1);
    check(g.m[e.i] === M.STAINED, "(the test wants the window glazed)");
    check(g.aux[e.i] === 2, "the pane fired with coal went in " + ["ruby", "green", "amber"][g.aux[e.i] % 3]);
  });

  test("wonders: wet concrete is mixed from lime, sand and a bucket of water, poured in its form, and a pail dawdled with goes off, to a lump carried", function () {
    var w = sim.load(1), g = w.g, M = w.MAT;
    know(g, ["farm", "dig", "bucket", "concrete"]);
    var p = g.peasants[0];
    var x = Math.floor(p.x) + 6, G = w.mGround(g, x);
    var s = cairn(w, p, x, G, 4, function () { return M.CONCRETE; });
    s.stock = { lime: 2 };
    g.peasants.forEach(function (q) { if (q !== p) q.x = 10; q.task = null; q.hunger = 0; });
    check(w.wMixWanted(g, s), "(the test wants a site waiting on concrete)");
    check(w.wGoMix(g, p, s), "nobody went to mix concrete (no water near?)");
    for (var k = 0; k < 5000 && !s.plan.some(function (e) { return g.m[e.i] === M.MORTAR; }); k++) sim.step(w, 1);
    check(s.plan.some(function (e) { return g.m[e.i] === M.MORTAR; }), "no wet concrete was poured (mortar " + (p.mortar || 0) + ", task " + (p.task && p.task.kind) + ")");
    var j = s.plan.filter(function (e) { return g.m[e.i] === M.MORTAR; })[0].i;
    check(g.aux[j] & 128, "poured wet concrete is not in its form");
    /* a pail left too long */
    p.mortar = 5; p.mortarT = g.tick - 1000; p.task = null;
    var before = 0, after = 0;
    g.m.forEach(function (c) { if (c === M.CONCRETE) before++; });
    g.tick = Math.ceil(g.tick / 30) * 30;
    w.wStep(g);
    g.m.forEach(function (c) { if (c === M.CONCRETE) after++; });
    check(!p.mortar && p.lump === 5 && after === before, "a pail dawdled with did not go off into a lump they carry (" + before + " -> " + after + ", lump " + p.lump + ")");
  });

  test("wonders: tales are kept: a death, a trip to space, a bolt, the first of an idea, and only the last two dozen", function () {
    var w = sim.load(1), g = w.g, p = g.peasants[0], q = g.peasants[1];
    w.pSpace(g, q);
    w.pZap(g, g.peasants[2]);
    w.pDie(g, p, "lava");
    var kinds = g.tales.map(function (t) { return t.kind; });
    check(kinds.indexOf("space") >= 0 && kinds.indexOf("death") >= 0 && kinds.indexOf("zap") >= 0, "tales: " + kinds.join(","));
    check(/fell in the lava/.test(w.wTold(g.tales.filter(function (t) { return t.kind === "death"; })[0])), "the death is not told right");
    for (var k = 0; k < 40; k++) w.wTale(g, "ice", q);
    check(g.tales.length === w.W_TALES, g.tales.length + " tales kept");
  });
};
