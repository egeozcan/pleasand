/* =====================================================================
   PLEASAND  --  test/wasm.js

   the WebAssembly step (simwasm.ts, wasm/src/lib.rs) plays the world the
   JS step does: two villages of one seed, through the harness (its dice
   are a mulberry32 the module rolls itself), one played by the JS and
   one by the module, the same things done to both, the whole state
   compared (harness/snapshot.js stateHash) every so often. every
   paintable thing in heaps, fire, lava on water, lightning, a nuke,
   fireworks, the heat and cool brushes, cloners, faucets and drains,
   seeds, wet concrete; a snapshot put back; a save loaded; a valley made
   another width. (harness/same.js is the long check: this is the quick
   one, run with the rest. test/heat.js puts the heat step through its
   hardest cases, and run.js the sand step's walk, both ways too)
   required by test/run.js
   ===================================================================== */
"use strict";

var lib = require("../harness/harness.js"), snap = require("../harness/snapshot.js");

module.exports = function (test, check) {
  /* two villages, a by the JS and b by the module */
  function pair(seed, gw) {
    var a = lib.open({ seed: seed, gw: gw }), b = lib.open({ seed: seed, gw: gw });
    a.eval("SIM_WASM = false"); b.eval("SIM_WASM = true");
    return { a: a, b: b };
  }
  function both(p, fn) { fn(p.a); fn(p.b); }
  /* the same, and played by the ones they should be */
  function same(p, what) {
    var ha = snap.stateHash(p.a.g), hb = snap.stateHash(p.b.g);
    if (ha.hash !== hb.hash) {
      var k = Object.keys(ha.fields).filter(function (f) { return ha.fields[f] !== hb.fields[f]; });
      check(false, what + ": the WebAssembly step and the JS differ, in g." + k.join(", g."));
    }
    check(p.a.loaded.rng.state === p.b.loaded.rng.state, what + ": the dice differ");
    check(p.a.eval("simWho(g)") === "js" && p.b.eval("simWho(g)") === "wasm", what + ": not played by the steps asked for");
  }
  function run(p, n, every, what) {
    for (var t = 0; t < n; t += every) { both(p, function (h) { h.step(every); }); same(p, what + ", update " + (p.b.ticks)); }
  }

  test("wasm: the module is there, and plays a village as the JS does", function () {
    var p = pair(3, 1088);
    check(p.b.eval("SIM_MOD !== null && !SIM_DEAD"), "the WebAssembly step did not load (is simwasm-bin.js built? wasm/build.sh)");
    both(p, function (h) { h.speed(h.eval("SPEEDS").length - 1); });
    run(p, 1500, 250, "seed 3, 1088 wide, at the top speed");
  });

  test("wasm: every paintable thing, burning, melting, boiling, struck and blown up, plays as the JS does", function () {
    [272, 1088].forEach(function (gw) {
      var p = pair(4, gw), PICK = p.a.pick, names = [], k, mid = gw >> 1, q1 = gw >> 2, q3 = (gw * 3) >> 2;
      for (k = 0; k < PICK.length; k++) if (PICK[k].m != null && PICK[k].name !== "NUKE" && PICK[k].name !== "ERASE") names.push(PICK[k].name);
      both(p, function (h) {
        for (k = 0; k < names.length; k++) {
          var x = 10 + Math.floor((k + 0.5) * (gw - 20) / names.length), y = 22 + (k % 5) * 7;
          h.paintDisc(x, y, 4, names[k]);
          h.paintDisc(x + 3, y + 5, 2, names[(k + 7) % names.length]);
        }
        /* a cloner on a peasant's head, salt on ice, seeds on wet sand, a torch under oil, a faucet over a drain */
        var pz = h.g.peasants[0];
        if (pz) h.paintDisc(Math.floor(pz.x), Math.floor(pz.y) - 6, 1, "CLONER");
        h.paintDisc(mid - 30, 30, 3, "ICE"); h.paintDisc(mid - 30, 26, 2, "SALT");
        h.paintDisc(mid - 20, 40, 3, "SAND"); h.paintDisc(mid - 20, 36, 2, "WATER"); h.paintDisc(mid - 20, 34, 1, "SEED");
        h.paintDisc(mid + 20, 30, 1, "TORCH"); h.paintDisc(mid + 20, 25, 2, "OIL");
        h.paintDisc(mid + 30, 10, 0, "FAUCET"); h.paintDisc(mid + 30, 40, 1, "DRAIN");
        h.ignite(10 + Math.floor((names.indexOf("WOOD") + 0.5) * (gw - 20) / names.length), 22 + (names.indexOf("WOOD") % 5) * 7);
        h.paintDisc(mid, 8, 3, "LAVA");
      });
      run(p, 300, 300, gw + " wide, heaps");
      both(p, function (h) { h.select("LIGHTNING"); h.drag(q1, 10, q1 + 24, 10, { ticks: 30 }); });
      run(p, 200, 200, gw + " wide, after lightning");
      both(p, function (h) { h.select("HEAT"); h.drag(mid - 30, 20, mid - 30, 60, { ticks: 30 }); h.select("COOL"); h.drag(mid + 10, 20, mid + 10, 70, { ticks: 30 }); });
      run(p, 200, 200, gw + " wide, after the brushes");
      both(p, function (h) { h.select("FIREWORK"); h.tap(mid + 5, 40); h.select("NUKE"); h.tap(q3, 12); });
      run(p, 600, 300, gw + " wide, after a nuke and a firework");
      both(p, function (h) { h.select("GUNPOWDER"); h.drag(q3, 20, q3 + 6, 20, { ticks: 6 }); h.ignite(q3 + 3, 22); });
      run(p, 300, 300, gw + " wide, after gunpowder");
    });
  });

  test("wasm: the picture of the valley is the one the JS draws, colour for colour and die for die", function () {
    [272, 1088].forEach(function (gw) {
      var h = lib.open({ seed: 9, gw: gw });
      require("../harness/soak.js").applyPreset(h, "rich");
      h.step(1200);
      /* every thing there is, in every state its colour depends on: in a band across the sky, a column each, with aux
         from the list (a window, a door's knob, a cloner's memory, a shirt, a mushroom cloud), from frozen to white hot,
         some of the water at the boil. and lava and fire, which roll the picture's dice */
      h.eval("(function () {" +
        "  var AUX = [0, 1, 2, 5, 6, 3, 200, 180, 255, MAT.SAND, MAT.GLASS, MAT.METAL], TS = [-120, -30, 20, 20, 60, 300, 500, 600, 900, 1300], k = 0;" +
        "  for (var y = 20; y < 60; y++) for (var x = 4; x < g.gw - 4; x++, k++) {" +
        "    var i = y * g.gw + x, v = ((x >> 1) + (y >> 3)) % 55;" +
        "    g.m[i] = v; g.sh[i] = (k * 37) & 255; g.aux[i] = AUX[(k * 7 + y) % AUX.length];" +
        /* (only what each can hold: a cloner remembers a thing or a peasant, a shirt is 0 to 6) */
        "    if (v === MAT.CLONER && g.aux[i] >= MAT.PLANK && g.aux[i] !== CLONE_PEASANT) g.aux[i] = MAT.SAND;" +
        "    if (v === MAT.LINEN) g.aux[i] %= 7;" +
        "    g.T[i] = TS[(x * 3 + y) % TS.length]; g.lat[i] = v === MAT.WATER && (k & 3) === 0 ? 5 : 0;" +
        "  }" +
        "})()");
      [0.5, 3.25, 17.9].forEach(function (t) {
        var pics = [false, true].map(function (w) {
          return h.eval("(function () {" +
            "  var keep = Math.random; Math.random = RNG_SIDE.random; RNG_SIDE.state = 4321; SIM_WASM = " + w + "; g.t = " + t + ";" +
            "  try { var hot = drawWorld(g, true), hot2 = drawWorld(g); }" +
            "  finally { Math.random = keep; SIM_WASM = true; }" +
            "  return { hot: hot, hot2: hot2, px: g.px.slice(), gp: g.gpx.slice(), side: RNG_SIDE.state };" +
            "})()");
        });
        var a = pics[0], b = pics[1], i, n = a.px.length;
        for (i = 0; i < n; i++) if (a.px[i] !== b.px[i] || a.gp[i] !== b.gp[i]) break;
        if (i < n) check(false, gw + " wide, t " + t + ": the picture differs at " + (i % gw) + "," + ((i / gw) | 0) + " (cell " + h.g.m[i] + "): " +
              a.px[i].toString(16) + " / " + b.px[i].toString(16) + ", glow " + a.gp[i].toString(16) + " / " + b.gp[i].toString(16));
        check(a.hot === b.hot && a.hot2 === b.hot2, gw + " wide, t " + t + ": hot " + a.hot + " / " + b.hot);
        check(a.side === b.side, gw + " wide, t " + t + ": the picture's dice differ");
      });
    });
  });

  test("wasm: a snapshot put back, a save loaded and a valley made wider play as the JS does", function () {
    var p = pair(6, 272), sa, sb;
    both(p, function (h) { require("../harness/soak.js").applyPreset(h, "rich"); });
    run(p, 600, 200, "rich");
    sa = p.a.snapshot(); sb = p.b.snapshot();
    run(p, 300, 150, "on from the snapshot");
    p.a.restore(sa); p.b.restore(sb);
    same(p, "the snapshot put back");
    run(p, 300, 150, "on from the snapshot again");
    /* a save, through JSON as the game writes it, into games that have never seen this village */
    var doc = JSON.parse(JSON.stringify(p.b.saveDoc({ keyframes: 0 })));
    var q = pair(1006, 272);
    q.a.load(JSON.parse(JSON.stringify(doc))); q.b.load(JSON.parse(JSON.stringify(doc)));
    run(q, 600, 200, "loaded from a save");
    /* NEW, the browser's width: new arrays, and new room for them in the module's memory */
    both(q, function (h) { h.eval("gameResize(g, 1088); sandLandscape(g)"); });
    run(q, 600, 200, "made 1088 wide");
  });
};
