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

  test("wonders: wet concrete is mixed from lime, sand and a bucket of water, poured in its form, and a pail dawdled with goes off", function () {
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
    check(!p.mortar && after > before, "a pail dawdled with did not go off (" + before + " -> " + after + ")");
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
