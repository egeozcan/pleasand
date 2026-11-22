/* =====================================================================
   PLEASAND  --  test/valley.js

   the wide valley (docs/wide-valley-spec.md): four screens of it, and a
   view you look along it with. and the one hard rule: a valley one
   screen wide goes exactly as it did before there were wide ones.
   ===================================================================== */
"use strict";
var path = require("path"), harness = require("../harness");
var FIXTURE = path.join(__dirname, "fixtures", "valley-272.json");

module.exports = function (test, check) {
  function wide(seed) { return harness.open({ seed: seed == null ? 7 : seed, gw: 1088 }); }

  test("valley: a valley one screen wide is master's, hash for hash, and the pointer boots where master's did", function () {
    /* (recorded on master, before there were wide valleys: the hash after 600 ticks) */
    var want = { 1: "996e4610", 3: "700eff58", 7: "a6a81084" };
    [1, 3, 7].forEach(function (s) {
      var h = harness.open({ seed: s }), g = h.g;
      h.step(1);
      check(g.gw === 272 && g.mx === 320 && g.my === 200 && g.cx === 112 && g.cy === 93, "seed " + s + " booted " + g.gw + " wide, pointer at " + [g.mx, g.my, g.cx, g.cy]);
      h.step(599);
      check(h.hash() === want[s], "seed " + s + ": " + h.hash() + ", master " + want[s]);
    });
  });

  test("valley: a save made on master, one screen wide, loads into a wide game as it was, plays on as master's did, and NEW is wide", function () {
    var h = wide(1);
    h.load(FIXTURE);
    check(h.g.gw === 272 && h.g.camX === 0, "it came back " + h.g.gw + " wide, the view at " + h.g.camX);
    check(h.g.vrange && h.g.vrange.x0 === 0 && h.g.vrange.x1 === 271, "the range is " + JSON.stringify(h.g.vrange));
    h.step(1);
    h.load(FIXTURE);
    h.step(300);
    check(h.hash() === "44ff922d", "after 300 ticks: " + h.hash() + " (master: 44ff922d)");
    h.fn("gameNew")(h.g);
    check(h.g.gw === 1088 && h.g.m.length === 1088 * 186, "NEW made a valley " + h.g.gw + " wide");
  });

  test("valley: a new valley is four screens wide, with the village in the middle one, and the view on it", function () {
    var h = wide(7), g = h.g, V0 = (1088 - 272) >> 1, V1 = V0 + 272;
    check(g.gw === 1088 && g.gh === 186 && g.m.length === 1088 * 186, "the grid is " + g.gw + "x" + g.gh);
    g.sites.forEach(function (s) { check(s.x0 >= V0 && s.x1 < V1, "a hut at " + s.x0 + ".." + s.x1 + ", out of the middle screen"); });
    g.peasants.forEach(function (p) { check(p.x >= V0 && p.x < V1, p.name + " starts at " + p.x); });
    var mid = h.fn("camVillageX")(g);
    check(Math.abs(g.camX + 136 - mid) < 1, "the view is at " + g.camX + ", the village at " + mid);
    /* (as much ore a column as in a valley one screen wide: four times the seams. counted over a few seeds) */
    var M = h.mat, wideOre = 0, narrowOre = 0;
    [1, 2, 3].forEach(function (s) {
      var a = harness.open({ seed: s, gw: 1088 }).g, b = harness.open({ seed: s }).g, i;
      for (i = 0; i < a.m.length; i++) if (a.m[i] === M.COAL) wideOre++;
      for (i = 0; i < b.m.length; i++) if (b.m[i] === M.COAL) narrowOre++;
    });
    check(wideOre > narrowOre * 2.8 && wideOre < narrowOre * 5.5, "coal: " + wideOre + " in the wide valleys, " + narrowOre + " in the narrow");
  });

  test("valley: screen to world and back, at either end of the valley and in the middle; a tap paints the cell under it", function () {
    var h = wide(7), g = h.g, scrX = h.fn("scrX");
    [0, 400, 816].forEach(function (c) {
      h.cam(c);
      check(g.camI === c, "the view went to " + g.camI + ", not " + c);
      var x = c + 100, sx = scrX(x);
      g.mx = sx; g.my = 100; h.step(1);
      check(Math.abs(g.cx - (x + 0.5)) < 1e-9, "at " + c + ": column " + x + " drawn at " + sx + " reads back as " + g.cx);
      h.select("STONE"); h.tap(c + 50, 20);
      check(g.m[20 * g.gw + c + 50] === h.mat.STONE, "a tap at column " + (c + 50) + " with the view at " + c + " did not paint it");
    });
  });

  test("valley: dragging a stroke into the edge carries the view along, and the stroke has no gaps; a cursor resting there does not", function () {
    var h = wide(7), g = h.g, y = 20, k, x, first = -1, last = -1, gaps = 0;
    h.cam(300);
    h.select("STONE");
    g.mx = 320; g.my = 14 + y * 2 + 1; h.step(1);
    h.down(0);
    for (k = 1; k <= 10; k++) { g.mx = 320 + k * 31.5; h.step(1); }   /* (to two pixels from the right edge) */
    h.step(60);
    check(g.camX > 330, "the view did not follow the stroke: " + g.camX);
    h.up();
    for (x = 0; x < g.gw; x++) if (g.m[y * g.gw + x] === h.mat.STONE) { if (first < 0) first = x; if (last >= 0 && x - last > 1) gaps++; last = x; }
    check(first >= 0 && last - first > 150 && !gaps, "the stroke runs " + first + ".." + last + " with " + gaps + " gaps");
    var at = g.camX;
    g.mx = 638; h.step(60);
    check(g.camX === at, "a cursor resting at the edge moved the view from " + at + " to " + g.camX);
  });

  test("valley: the wheel: sideways looks along the valley, up and down is the brush, and Shift turns the wheel sideways", function () {
    var h = wide(7), g = h.g, W = h.fn("gameWheelXY"), t = 0;
    h.cam(400); var size = g.size;
    W(g, 120, 4, 0, false, t += 1000, 1);
    check(g.camX > 400 && g.size === size, "a sideways swipe: view " + g.camX + ", size " + g.size);
    var at = g.camX;
    W(g, 0, 100, 0, false, t += 1000, 1);
    check(g.camX === at && g.size === size - 1, "a turn of the wheel: view " + g.camX + ", size " + g.size);
    W(g, 0, 100, 0, true, t += 1000, 1);
    check(g.camT > at && g.size === size - 1, "Shift and the wheel: heading for " + g.camT + ", size " + g.size);
    h.step(30); at = g.camX;
    /* (a gesture keeps the axis it started on: a diagonal swipe that began sideways never touches the brush) */
    at = g.camX; t += 1000;
    W(g, 30, 2, 0, false, t, 1); W(g, 2, 40, 0, false, t + 10, 1);
    check(g.size === size - 1 && g.camX > at, "a swipe that went diagonal changed the brush to " + g.size);
    /* (a page-mode wheel moves a screen at most) */
    at = g.camX; W(g, 50, 0, 2, false, t += 1000, 1);
    check(g.camX - at <= 272, "one page-mode event moved the view " + (g.camX - at));
  });

  test("valley: a throw is as hard as the flick, however far the view was carried meanwhile", function () {
    var h = wide(7), g = h.g, vel = h.fn("cursorVel"), sample = h.fn("cursorSample"), clock = h.loaded.clock;
    function flick(pan) {
      g.samp.length = 0; h.cam(400);
      for (var k = 0; k < 6; k++) { g.mx = 300 + k * 10; clock.t += 16; sample(g); if (pan) h.cam(400 + k * 8); }
      return vel(g);
    }
    var a = flick(false), b = flick(true);
    check(Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9, "the flick came out " + a + " without the view moving and " + b + " with");
  });

  test("valley: somewhere new for a field, a falling star, and a newcomer are all in the village's range", function () {
    var h = wide(7), g = h.g;
    h.step(600);
    var r = h.fn("vRangeSet")(g);
    check(r.x1 - r.x0 + 1 >= 272 && r.x1 - r.x0 + 1 < 1088, "the range is " + JSON.stringify(r));
    var f = h.fn("iFarmSpot")(g, -1, -1, null);
    check(f && f.x0 >= r.x0 && f.x0 + h.eval("I_FARM_W") - 1 <= r.x1, "a field at " + (f && f.x0) + ", the range " + JSON.stringify(r));
    for (var k = 0; k < 5; k++) {
      g.hRock = null;
      if (h.fn("hMeteorite")(g, -1)) check(g.hRock.tx >= r.x0 && g.hRock.tx <= r.x1, "a falling star came down at " + g.hRock.tx);
    }
    g.hRock = null;
    var n = g.peasants.length;
    g.popGoal = 99; g.arriveT = 0; g.hadPeasants = true;
    h.fn("pLife")(g);
    check(g.peasants.length === n + 1, "nobody walked in");
    var q = g.peasants[g.peasants.length - 1];
    check(q.x >= r.x0 && q.x <= r.x1 && q.dir === (q.x < h.fn("rMid")(g) ? 1 : -1), q.name + " walked in at " + q.x + " facing " + q.dir);
  });

  test("valley: a wide save goes round, its view with it, and goes on as the one that was saved", function () {
    var h = wide(3);
    h.step(400); h.cam(123); h.step(1);
    var doc = h.saveDoc();
    h.step(300);
    var want = h.hash(), b = wide(9);
    b.load(doc);
    check(b.g.gw === 1088 && b.g.camI === 123, "it came back " + b.g.gw + " wide, the view at " + b.g.camI);
    b.step(300);
    check(b.hash() === want, "loaded and played on: " + b.hash() + ", the one that was saved: " + want);
  });

  test("valley: made another width, every grid-sized array on the game is the new size", function () {
    var h = wide(7), g = h.g, resize = h.fn("gameResize");
    [272, 1088].forEach(function (w) {
      resize(g, w); h.fn("sandLandscape")(g); h.step(600);
      var n = w * 186, bad = [];
      Object.keys(g).forEach(function (k) {
        var v = g[k];
        if (!ArrayBuffer.isView(v) || v instanceof DataView) return;
        /* (exempt: the particles, the pressure tries and the pathfinder's heap are sized by what they hold, not the grid;
           the glow's small canvases' pixels, if any, are one screen's; the explorers' map is in blocks) */
        if (/^(pp[xy]|pv[xy]|pl|pk|pm|pc|pt|ps|pressList|navHeap[IF]|seenAt|stripP)$/.test(k)) return;
        if (v.length !== n && v.length !== n + 8 && v.length !== w && v.length !== 186) bad.push(k + ":" + v.length);
      });
      check(!bad.length, "at " + w + " wide: " + bad.join(", "));
    });
  });

  test("valley: the strip: pressing the view's box takes hold of it where it is; pressing elsewhere goes there", function () {
    var h = wide(7), g = h.g, box = h.fn("stripBox");
    h.cam(400);
    var b = box(g);
    g.btn = 0; g.down = 1; h.fn("stripPress")(g, b.x0 + 10);
    check(g.camX === 400, "a press on the box moved the view to " + g.camX);
    g.mx = b.x0 + 30; h.fn("stripMove")(g);
    check(Math.abs(g.camX - 440) < 0.5, "dragging the box 20 px moved the view to " + g.camX + " (40 columns: 440)");
    g.down = 0; h.fn("stripMove")(g);
    h.fn("stripPress")(g, 96 + 100);
    check(Math.abs(g.camX + 136 - 200) < 0.5, "a press at strip pixel 100 (column 200) put the view at " + g.camX);
    g.stripDrag = null;
  });

  test("valley: a glide, a swipe and a strip drag each put the camera in the journal once", function () {
    var h = wide(7), g = h.g, n = 0, J = h.eval("SAVE_J"), on = J.on;
    J.on = true; J.inputs.length = 0;
    function cams() { return J.inputs.filter(function (e) { return e.kind === "cam"; }).length; }
    h.fn("camGo")(g, 800); h.step(60);
    n = cams(); check(n === 1, "a glide journalled " + n);
    var W = h.fn("gameWheelXY");
    for (var k = 0; k < 20; k++) { W(g, 10, 0, 0, false, h.loaded.clock.t, 1); h.step(1); }
    h.step(20);
    n = cams(); check(n === 2, "a glide and a swipe journalled " + n);
    var b = h.fn("stripBox")(g);
    g.btn = 0; g.down = 1; h.fn("stripPress")(g, b.x0 + 5);
    for (k = 0; k < 10; k++) { g.mx = b.x0 + 5 + k * 3; h.step(1); }
    g.down = 0; h.step(2);
    n = cams(); check(n === 3, "and a strip drag: " + n);
    J.on = on;
  });

  test("valley: a save that will not load leaves the valley as it was", function () {
    var h = wide(7), before = h.hash(), threw = false;
    try { h.load({ format: "pleasand-save", version: 1, meta: { grid: { w: 272, h: 186 } }, state: { $u: 1 } }); } catch (e) { threw = true; }
    check(threw && h.g.gw === 1088 && h.hash() === before, "a broken save: threw " + threw + ", " + h.g.gw + " wide, hash " + h.hash() + " (was " + before + ")");
  });

  test("valley: in a valley one screen wide the wheel is the brush, whichever way it turns", function () {
    var h = harness.open({ seed: 1 }), g = h.g, W = h.fn("gameWheelXY"), size = g.size;
    W(g, 24, 3, 0, false, 1000, 1);
    check(g.size === size - 1, "a diagonal turn left the brush at " + g.size);
    W(g, 0, 100, 0, true, 3000, 1);
    check(g.size === size - 2, "Shift and the wheel left the brush at " + g.size);
  });

  test("valley: a stroke dragged past the side of the field goes on along the edge, and a news arrow's press paints nothing", function () {
    var h = wide(7), g = h.g, y = 20, k, x, first = -1, last = -1, gaps = 0;
    h.cam(300); h.select("STONE");
    g.mx = 400; g.my = 14 + y * 2 + 1; h.step(1); h.down(0);
    for (k = 1; k <= 10; k++) { g.mx = 400 + k * 40; h.step(1); }   /* (out past the right side of the canvas) */
    h.step(60); h.up();
    for (x = 0; x < g.gw; x++) if (g.m[y * g.gw + x] === h.mat.STONE) { if (first < 0) first = x; if (last >= 0 && x - last > 1) gaps++; last = x; }
    check(g.camX > 400 && last - first > 200 && !gaps, "view " + g.camX + ", stroke " + first + ".." + last + " with " + gaps + " gaps");
    /* (a press on a news line's arrow: the view goes, and nothing is painted while it is held) */
    var n0 = 0; for (x = 0; x < g.m.length; x++) if (g.m[x] === h.mat.STONE) n0++;
    g.feed.push({ text: "x", col: "#fff", t: 1, x: 50 }); g.feedHit = [{ x0: 300, y0: 100, f: g.feed[g.feed.length - 1] }];
    g.mx = 304; g.my = 104; g.btn = 0; g.down = 1; h.fn("gameTap")(g, 304, 104); h.step(5);
    var n1 = 0; for (x = 0; x < g.m.length; x++) if (g.m[x] === h.mat.STONE) n1++;
    check(n1 === n0 && g.camT === 0, "the arrow's press painted " + (n1 - n0) + " and sent the view to " + g.camT);
    g.down = 0; h.fn("sandRelease")(g);
  });

  test("valley: a ruled line the width of the valley is whole, and an empty valley's range is the middle screen", function () {
    var h = wide(7), g = h.g, x, holes = 0;
    g.size = 1;
    h.fn("sandStroke")(g, 1, 10, 1086, 10, h.mat.STONE, true);
    for (x = 1; x <= 1086; x++) if (g.m[10 * g.gw + x] !== h.mat.STONE) holes++;
    check(!holes, holes + " holes in the line");
    g.sites.length = 0;
    var r = h.fn("vRangeSet")(g);
    check(r.x0 === 408 && r.x1 === 679, "the empty valley's range is " + JSON.stringify(r));
  });

  test("valley: a narrow keyframe restored into a wide game is narrow through and through", function () {
    var h = wide(1);
    h.load(FIXTURE); h.history(5); h.step(10);
    h.fn("gameNew")(h.g); h.step(5);
    var nar = harness.open({ seed: 2 }); nar.load(FIXTURE); nar.checkpoint("n");
    var snap = nar.checkpoints ? nar.checkpointList[nar.checkpointList.length - 1].snap : null;
    h.restore(snap);
    var g = h.g;
    check(g.gw === 272 && g.m.length === 272 * 186 && g.px.length === 272 * 186 && g.pmark.length === 272 * 186 && g.camI === 0,
          "restored: " + g.gw + " wide, m " + g.m.length + ", px " + g.px.length + ", pmark " + g.pmark.length + ", view " + g.camI);
    h.step(10);
  });

  test("valley: a save missing a grid is not half loaded; in one screen, a stroke out past the side stops as it did", function () {
    var h = wide(7), doc = harness.open({ seed: 3 }).saveDoc(), before = h.hash(), threw = false;
    delete doc.state.T;
    try { h.load(doc); } catch (e) { threw = true; }
    check(threw && h.hash() === before && h.g.T && h.g.T.length === 1088 * 186, "a save with no temperatures: threw " + threw + ", hash " + h.hash() + " (was " + before + ")");
    h.step(2);
    var n = harness.open({ seed: 1 }), g = n.g;
    n.select("WATER"); g.mx = 600; g.my = 100; n.step(1); n.down(0); n.step(2);
    g.mx = 700; var r0 = n.rng(); n.step(1);
    check(g.lx == null, "in a valley one screen wide, a stroke went on with the pointer out past the field");
    n.up();
  });

  test("valley: a press held on the picker does not carry the view; a glide broken into by an arrow goes from where the view is", function () {
    var h = wide(7), g = h.g;
    h.cam(400);
    g.mx = 40; g.my = 200; h.step(1); h.down(0); h.step(30); h.up();
    check(g.camX === 400, "a press held on the picker moved the view to " + g.camX);
    g.camT = 816; g.keys.arrowleft = 1; h.step(1); g.keys.arrowleft = 0;
    check(g.camX < 400, "End, then Left at once: the view went to " + g.camX);
    /* (the harness's cam op moves the view under a pointer that stays where it is on the screen) */
    h.cam(250); h.mouse(370, 30); h.cam(700);
    check(Math.abs(g.cx - (g.mx - 96) / 2 - 700) < 1e-9, "after cam(700) the pointer reads " + g.cx);
  });

  test("valley: saves missing what a village needs are refused whole; End then Shift-wheel left goes left; a quick press on the picker after a stroke paints nothing", function () {
    var h = wide(7), before = h.hash();
    ["stamp", "sites"].forEach(function (k) {
      var doc = harness.open({ seed: 3 }).saveDoc(), threw = false;
      delete doc.state[k];
      try { h.load(doc); } catch (e) { threw = true; }
      check(threw && h.g.gw === 1088 && h.hash() === before && Array.isArray(h.g.sites), "a save with no " + k + ": threw " + threw + ", hash " + h.hash());
    });
    var g = h.g;
    h.cam(400); h.key("end"); h.fn("gameWheelXY")(g, 0, -100, 0, true, 1e6, 1);
    h.step(2);
    check(g.camX < 400, "End, then Shift-wheel left: the view went to " + g.camX);
    /* (a stroke, let go, and a press on the picker before the next update) */
    h.cam(400); h.select("STONE"); g.mx = 400; g.my = 60; h.step(1); h.down(0); h.step(2); h.up();
    var n0 = 0, x; for (x = 0; x < g.m.length; x++) if (g.m[x] === h.mat.STONE) n0++;
    g.mx = 40; g.my = 60; g.btn = 0; g.down = 1; h.step(5); g.down = 0; h.fn("sandRelease")(g);
    var n1 = 0; for (x = 0; x < g.m.length; x++) if (g.m[x] === h.mat.STONE) n1++;
    check(n1 === n0 && g.camX === 400, "the picker press painted " + (n1 - n0) + ", the view at " + g.camX);
  });

  test("valley: a falling star aimed in the range lands in it, and no pond in the wilds runs into the village's screen", function () {
    [3, 5, 7, 11].forEach(function (s) {
      var h = wide(s), g = h.g, k;
      h.step(150);
      for (var x = 396; x < 692; x++) for (var y = 0; y < 186; y++) {
        if (x === 408) x = 680;   /* (the twelve columns either side of the village's screen) */
        if (g.m[y * 1088 + x] !== h.mat.WATER) continue;
        check(false, "seed " + s + ": water at " + x + "," + y + ", just outside the village's screen, from a pond in the wilds");
      }
      var r = h.fn("vRangeSet")(g), land = h.fn("hRockLand"), aim = h.fn("hRockAim");
      for (x = r.x0; x <= r.x1; x += 7) if (aim(g, x)) { var at = land(g, x); check(at.x >= r.x0 && at.x <= r.x1, "seed " + s + ": aimed at " + x + ", lands at " + at.x); }
    });
  });

  test("valley: a save with no news, or a bad journal, leaves the valley and its dice as they were; the picker never pans the view", function () {
    var h = wide(7), before = h.hash(), rng = h.rng();
    [function (d) { delete d.state.feed; }, function (d) { d.history.inputs = {}; d.state.know = null; }].forEach(function (spoil, n) {
      var doc = harness.open({ seed: 3 }).saveDoc(), threw = false;
      spoil(doc);
      try { h.load(doc); } catch (e) { threw = true; }
      check(threw && h.g.gw === 1088 && h.hash() === before && h.rng() === rng, "spoilt save " + n + ": threw " + threw + ", hash " + h.hash());
    });
    h.cam(400); h.tap(-10, 29);
    check(h.g.camI === 400, "a tap on the picker moved the view to " + h.g.camI);
  });

  test("valley: a press out past the edge before the next update still carries the view and paints", function () {
    var h = wide(7), g = h.g, x, n = 0;
    h.cam(400); h.select("STONE");
    g.mx = 630; g.my = 60; g.btn = 0; g.down = 1; h.fn("gameTap")(g, 630, 60);
    g.mx = 650; h.step(60);
    for (x = 0; x < g.m.length; x++) if (g.m[x] === h.mat.STONE) n++;
    check(g.camX > 420 && n > 50, "the view went to " + g.camX + ", " + n + " cells painted");
    g.down = 0; h.fn("sandRelease")(g);
  });

  test("valley: NEW after a narrow save makes the same wide valley every time; an erase or a stroke dragged out past a corner still carries the view", function () {
    function run() { var h = wide(1); h.load(FIXTURE); h.step(20); h.fn("gameNew")(h.g); h.step(200); return [h.hash(), h.rng(), h.g.stars.length, h.g.stars[0] && h.g.stars[0].i]; }
    var a = run(), b = run();
    check(JSON.stringify(a) === JSON.stringify(b), "two NEWs from the same narrow save: " + a + " and " + b);
    var h = wide(7), g = h.g;
    [2, 0].forEach(function (btn) {
      h.cam(400); h.select("STONE");
      var before = g.m.slice();
      g.mx = 600; g.my = 370; g.btn = btn; g.down = 1; h.fn("gameTap")(g, 600, 370);
      g.mx = 660; g.my = 395; h.step(60);   /* (out past the right side and the bottom at once) */
      check(g.camX > 420, (btn ? "an erase" : "a stroke") + " dragged out past the corner left the view at " + g.camX);
      var changed = 0; for (var i = 0; i < g.m.length; i++) if (g.m[i] !== before[i] && (btn ? g.m[i] === h.mat.EMPTY : g.m[i] === h.mat.STONE)) changed++;
      check(changed > 20, (btn ? "the erase" : "the stroke") + " out past the corner changed " + changed + " cells");
      g.down = 0; h.fn("sandRelease")(g); g.btn = 0;
    });
  });

  test("valley: the browser's own camera rows replay in the harness; a press at the end of the strip holds the box where it went", function () {
    var h = wide(7), g = h.g, J = h.eval("SAVE_J"), on = J.on;
    J.on = true; J.inputs.length = 0;
    h.key("end"); h.step(60);
    var rows = J.inputs.filter(function (e) { return e.kind === "cam"; });
    J.on = on;
    check(rows.length === 1 && rows[0].x === 816, "the End glide journalled " + JSON.stringify(rows));
    var b = wide(7);
    b._apply(rows[0]);
    check(b.g.camI === 816, "a journal row put the view at " + b.g.camI);
    var ops = b.journalCams(rows);
    check(ops.length === 1 && ops[0].op === "cam" && ops[0].args.x === 816 && ops[0].at === rows[0].u && rows[0].u > 0,
          "as scenario ops: " + JSON.stringify(ops) + " from " + JSON.stringify(rows));
    /* (at 4x, the row's update is not its sand tick) */
    var f = wide(7), J4 = f.eval("SAVE_J"); f.g.speed = 4; J4.on = true; J4.inputs.length = 0; f.key("home"); f.step(40);
    var r4 = J4.inputs.filter(function (e) { return e.kind === "cam"; })[0]; J4.on = false;
    check(r4 && r4.u <= f.ticks && r4.tick > r4.u, "at 4x the row came at update " + (r4 && r4.u) + ", sand tick " + (r4 && r4.tick));
    /* (the strip: a press near its left end, then a drag right: the box follows from where it went, not from nowhere) */
    h.cam(400);
    g.btn = 0; g.down = 1; h.fn("stripPress")(g, 106);
    check(g.camX === 0, "a press at strip pixel 10 put the view at " + g.camX);
    g.mx = 146; h.fn("stripMove")(g);
    check(g.camX > 70, "dragged 40 px right, the view is at " + g.camX);
    g.down = 0; h.fn("stripMove")(g);
  });

  test("valley: a stroke dragged up into the header ends there, as it always did", function () {
    var h = wide(7), g = h.g, n0 = 0, n1 = 0, x;
    h.cam(400); h.select("STONE");
    g.mx = 300; g.my = 20; h.step(1); h.down(0); h.step(1);
    for (x = 0; x < g.m.length; x++) if (g.m[x] === h.mat.STONE) n0++;
    g.my = 6; h.step(1); g.mx = 400; h.step(3); g.mx = 500; h.step(3);
    for (x = 0; x < g.m.length; x++) if (g.m[x] === h.mat.STONE) n1++;
    check(n1 === n0 && g.camX === 400, "dragged along the header it painted " + (n1 - n0) + ", the view at " + g.camX);
    h.up();
    /* (and straight up into the header from beside the right edge: no painting along row 0, no carrying the view) */
    g.mx = 632; g.my = 60; h.step(1); h.down(0); h.step(1);
    n0 = 0; for (x = 0; x < g.m.length; x++) if (g.m[x] === h.mat.STONE) n0++;
    g.my = 5; h.step(40);
    n1 = 0; for (x = 0; x < g.m.length; x++) if (g.m[x] === h.mat.STONE) n1++;
    check(n1 === n0 && g.camX === 400, "straight up into the header by the edge: painted " + (n1 - n0) + ", the view at " + g.camX);
    h.up();
    /* (and the tips, in a wide valley, go round: the valley's own first) */
    var tl = h.fn("tipLine"), t0 = tl(g); h.fn("panelDo")(g, "tip");
    check(/four screens/.test(t0) && tl(g) !== t0, "the tips in a wide valley: " + t0 + " then " + tl(g));
  });

  test("valley: the header's left corner, over the picker, is no edge; a wide valley's constellations are over the observatory", function () {
    var h = wide(7), g = h.g, n0 = 0, n1 = 0, x;
    h.cam(400); h.select("STONE");
    g.mx = 99; g.my = 30; h.step(1); h.down(0); h.step(1);
    for (x = 0; x < g.m.length; x++) if (g.m[x] === h.mat.STONE) n0++;
    g.mx = 90; g.my = 6; h.step(40);
    for (x = 0; x < g.m.length; x++) if (g.m[x] === h.mat.STONE) n1++;
    check(n1 === n0 && g.camX === 400, "into the header over the picker: painted " + (n1 - n0) + ", the view at " + g.camX);
    h.up();
    /* (the names in the sky: the first star of each within half a screen of where the astronomer is looking from) */
    var p = g.peasants[0], far = 0;
    for (var k = 0; k < 40; k++) {
      g.hConst = null; h.fn("hName")(g, p);
      var cs = g.hConst;
      if (!cs || !cs.pts) continue;
      if (Math.abs(cs.pts[0] % g.gw - p.x) >= 136) far++;
    }
    check(far === 0, far + " of 40 constellations started out of sight of the observatory");
  });

  test("valley: 20000 ticks in a wide valley, three seeds: nothing broken, nothing NaN", function () {
    [3, 7, 14].forEach(function (s) {
      var h = wide(s);
      h.standardInvariants({ grid: 600, temps: 300 });
      var t0 = Date.now(), r = h.step(20000);
      check(!r.stopped, "seed " + s + " stopped: " + JSON.stringify(r.stopped && { kind: r.stopped.kind, id: r.stopped.id, tick: r.stopped.tick }));
      console.log("      (seed " + s + ": " + ((Date.now() - t0) / 20000).toFixed(2) + " ms a tick, " + h.g.sites.length + " sites, range " + JSON.stringify(h.g.vrange) + ")");
    });
  });
};
