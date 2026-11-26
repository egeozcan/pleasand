/* =====================================================================
   PLEASAND  --  harness/same.js

   is it the same world? for a speed-up, the only question. a set of
   villages is played, and every 500 sand ticks the whole state is
   fingerprinted (snapshot.js stateHash: every key of g but the drawing
   and the scratch snapshot.js skips, all the way down, plus the dice,
   the side dice, the clock and the module variables the rules keep
   between ticks). recorded once from a tree that is right, and compared
   with every tree after it.

     node harness/same.js --record ref.json               # this tree's worlds, written down
     node harness/same.js --check ref.json                # this tree against them: exit 0 = identical
     node harness/same.js --check ref.json --dir ../wip   # another checkout's game, this harness
     node harness/same.js --check ref.json --dir ../wip --ref-dir ../base   # and where, exactly
     node harness/same.js --list
     node harness/same.js --check ref.json --only wide,hand --jobs 4

   a difference is reported as the first checkpoint (update and sand
   tick) and the first field of g that differ there, with the rest that
   differ beside it. --ref-dir plays the reference tree to that
   checkpoint as well, in this process, and names the first cells,
   peasants or numbers that differ, value against value.

   --ignore k1,k2: keys of g (or "@globals" and the like) left out of the
   comparison, for scratch a tree has added on g on purpose. say so
   where it is reviewed: an ignored key is not checked.

   the scenarios (every one at least 20 000 sand ticks; ticks are sand
   ticks, so a 4x village plays a quarter as many updates):
     wide-3/7/14      the spec's villages: 1088 wide, at 4x, left alone
     plain-1..6       272 wide, at 1x, left alone
     rich-*, chaos-*, leftovers-*   soak.js's presets
     materials-*      every paintable material in heaps and mixed, with
                      fire, lava, lightning, the heat and cool brushes,
                      nukes and fireworks, through the real input path
     hand             playtests/hand.json replayed
     save-*           saved at tick 8 000, loaded into a fresh game, on

   and a second set, --set long (or --set all), for the late game, where
   the valley has warmed through and the rules that pass by a cold row
   or a still word stop applying:
     long-3/7/14      the spec's villages, 80 000 ticks, a fingerprint every 2 000
     warm-3/7/14      a warm save (bench.js --save-out, tick 60 000 of
                      the spec's village, made by the reference tree)
                      loaded and played 10 000 ticks, every 240
     hot-w11          the rich village warmed hard: lava pools, wood fires,
                      a firebrick furnace of burning coal, the HEAT brush
                      in patches the width of the valley, then left
                      30 000 ticks, every 240
     chaos-L12, rich-L8   the presets at 1088, to 60 000 ticks
   the warm saves are found in --warm DIR (or $PLEASAND_WARM, or
   harness/warm). the fingerprint taken as one is loaded is compared
   like any other, so a different save shows at once.

   and a third, --set edge, for where the 4x budget was still over: the
   long organ game and the leftovers village (every one at 1088, at 4x):
     edge-150-3/7/14    a save at tick 150 000 (the spec's village played
                        on; seeds 3 and 7 have the steam organ finished)
                        loaded and played 10 000 ticks, every 240
     edge-left-3/7/14   soak.js's leftovers preset, from tick 0 to 60 000,
                        every 2 000
     edge-wleft-3/7/14  the leftovers village saved at tick 40 000,
                        loaded and played 10 000 ticks, every 240
     edge-organ-3/7     the 150 000 save, the organ knocked about while the
                        builders come and go: pipes erased (and mended,
                        and finished again, mid-tick), a pipe taken with
                        the hand and dropped, stone painted into a pipe
                        top, a pinch of powder set off beside the pipes,
                        the rack erased: 16 000 ticks, every 60
   their saves are found in --saves DIR (or $PLEASAND_SAVES, or
   harness/saves): DIR/warm150/seed<N>-150k.json and
   DIR/warmleft/seed<N>-40k.json, made by the reference tree
   (bench.js --save-out; the leftovers ones with --preset leftovers).
   with --check and neither --set nor --only, every scenario in the
   reference file is played.
   ===================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");
var args = require("./args.js");
var snap = require("./snapshot.js");

var EVERY = 500;   /* sand ticks between fingerprints */
var GLOBALS = ["M_FARMOK", "P_SINK", "NAV_NOROPE", "NAV_NOLEAP", "NAV_LADNO", "NAV_HOTOK", "CAM_IN_UPDATE", "P_OQ", "SKY_MOON"];

/* -------------------------------------------------------------------
   the villages
   ------------------------------------------------------------------- */
var SCENARIOS = [];
function sc(o) { SCENARIOS.push(o); }
[3, 7, 14].forEach(function (s) { sc({ name: "wide-" + s, seed: s, gw: 1088, speed: 4, ticks: 20000 }); });
[1, 2, 3, 4, 5, 6].forEach(function (s) { sc({ name: "plain-" + s, seed: s, gw: 272, speed: 2, ticks: 20000 }); });
[2, 5, 9].forEach(function (s) { sc({ name: "rich-" + s, seed: s, gw: 272, speed: 2, ticks: 20000, preset: "rich" }); });
sc({ name: "rich-w8", seed: 8, gw: 1088, speed: 4, ticks: 20000, preset: "rich" });
[3, 6, 10].forEach(function (s) { sc({ name: "chaos-" + s, seed: s, gw: 272, speed: 2, ticks: 20000, preset: "chaos" }); });
sc({ name: "chaos-w12", seed: 12, gw: 1088, speed: 4, ticks: 20000, preset: "chaos" });
sc({ name: "leftovers-4", seed: 4, gw: 272, speed: 2, ticks: 20000, preset: "leftovers" });
sc({ name: "materials-4", seed: 4, gw: 272, speed: 2, ticks: 20000, script: "materials" });
sc({ name: "materials-w9", seed: 9, gw: 1088, speed: 4, ticks: 20000, script: "materials" });
sc({ name: "hand", replay: "playtests/hand.json" });
sc({ name: "save-6", seed: 6, gw: 272, speed: 2, ticks: 28000, preset: "rich", saveAt: 8000 });
sc({ name: "save-w14", seed: 14, gw: 1088, speed: 4, ticks: 28000, saveAt: 8000 });
/* the late game (--set long) */
[3, 7, 14].forEach(function (s) { sc({ set: "long", name: "long-" + s, seed: s, gw: 1088, speed: 4, ticks: 80000, every: 2000 }); });
[3, 7, 14].forEach(function (s) { sc({ set: "long", name: "warm-" + s, seed: s, gw: 1088, speed: 4, ticks: 10000, every: 240, load: "seed" + s + "-60k.json" }); });
sc({ set: "long", name: "hot-w11", seed: 11, gw: 1088, speed: 4, ticks: 36000, every: 240, preset: "rich", script: "hot" });
sc({ set: "long", name: "chaos-L12", seed: 12, gw: 1088, speed: 4, ticks: 60000, every: 2000, preset: "chaos" });
sc({ set: "long", name: "rich-L8", seed: 8, gw: 1088, speed: 4, ticks: 60000, every: 2000, preset: "rich" });
/* the edges of the 4x budget (--set edge): the long organ game, the leftovers village */
[3, 7, 14].forEach(function (s) { sc({ set: "edge", name: "edge-150-" + s, seed: s, gw: 1088, speed: 4, ticks: 10000, every: 240, save: "warm150/seed" + s + "-150k.json" }); });
[3, 7, 14].forEach(function (s) { sc({ set: "edge", name: "edge-left-" + s, seed: s, gw: 1088, speed: 4, ticks: 60000, every: 2000, preset: "leftovers" }); });
[3, 7, 14].forEach(function (s) { sc({ set: "edge", name: "edge-wleft-" + s, seed: s, gw: 1088, speed: 4, ticks: 10000, every: 240, save: "warmleft/seed" + s + "-40k.json" }); });
sc({ set: "edge", name: "edge-organ-3", seed: 3, gw: 1088, speed: 4, ticks: 16000, every: 60, save: "warm150/seed3-150k.json", script: "organ", variant: "b" });
sc({ set: "edge", name: "edge-organ-7", seed: 7, gw: 1088, speed: 4, ticks: 16000, every: 60, save: "warm150/seed7-150k.json", script: "organ", variant: "a" });

/* every paintable material, in heaps across the valley, each with a smaller heap of another on its shoulder, dropped
   from the sky so they land on one another and mix. then, through the real input path, at sand ticks: fire, lightning,
   a nuke, the heat and cool brushes, lava into water, a firework, another nuke, more lightning. returns [{at, fn}] */
function materials(h) {
  var g = h.g, gw = g.gw, PICK = h.pick, names = [], k;
  for (k = 0; k < PICK.length; k++) if (PICK[k].m != null && PICK[k].name !== "NUKE" && PICK[k].name !== "ERASE") names.push(PICK[k].name);
  var n = names.length, xs = {};
  function xOf(name) { return xs[name]; }
  for (k = 0; k < n; k++) {
    var x = 10 + Math.floor((k + 0.5) * (gw - 20) / n), y = 22 + (k % 5) * 7;
    xs[names[k]] = x;
    h.paintDisc(x, y, 4, names[k]);
    h.paintDisc(x + 3, y + 5, 2, names[(k + 7) % n]);
  }
  var mid = Math.floor(gw / 2), q1 = Math.floor(gw / 4), q3 = Math.floor(gw * 3 / 4);
  return [
    { at: 0, fn: function () { h.ignite(xOf("WOOD"), 22 + (names.indexOf("WOOD") % 5) * 7); } },
    { at: 0, fn: function () { h.paintDisc(xOf("WATER"), 8, 3, "LAVA"); } },
    { at: 400, fn: function () { h.select("FIRE"); h.drag(xOf("OIL") - 3, 12, xOf("OIL") + 3, 12, { ticks: 6 }); } },
    { at: 1200, fn: function () { h.select("LIGHTNING"); h.drag(q1, 10, q1 + 24, 10, { ticks: 50 }); } },
    { at: 2400, fn: function () { h.select("NUKE"); h.tap(q3, 12); } },
    { at: 4000, fn: function () { h.select("HEAT"); h.drag(xOf("ICE") - 2, 30, xOf("ICE") + 2, 60, { ticks: 40 }); } },
    { at: 4800, fn: function () { h.select("COOL"); h.drag(xOf("WATER") - 2, 30, xOf("WATER") + 2, 70, { ticks: 40 }); } },
    { at: 6000, fn: function () { h.paintDisc(mid, 10, 5, "LAVA"); h.select("WATER"); h.drag(mid - 8, 6, mid + 8, 6, { ticks: 20 }); } },
    { at: 7000, fn: function () { h.select("LIGHTNING"); h.drag(xOf("METAL") - 4, 10, xOf("METAL") + 4, 10, { ticks: 50 }); } },
    { at: 8000, fn: function () { h.select("FIREWORK"); h.tap(mid + 5, 40); h.tap(q1 - 5, 40); } },
    { at: 10000, fn: function () { h.select("SAND"); h.drag(q3 - 10, 8, q3 + 10, 8, { ticks: 30 }); h.select("ERASE"); h.drag(q1, 40, q1 + 6, 80, { ticks: 10 }); } },
    { at: 12000, fn: function () { h.select("NUKE"); h.tap(q1, 12); } },
    { at: 15000, fn: function () { h.select("LIGHTNING"); h.drag(mid - 20, 10, mid + 20, 10, { ticks: 60 }); h.select("GUNPOWDER"); h.drag(q3, 20, q3 + 6, 20, { ticks: 6 }); h.ignite(q3 + 3, 22); } }
  ];
}

/* a valley warmed hard: on the ground, across the whole width, pools of lava, heaps of wood set alight, a furnace (a
   firebrick box of coal, lit), and the HEAT brush through the real input path in patches from the sky to the ground,
   again and again for the first 6 000 ticks. then it is left be (the scenario's ticks run on 30 000 past the last) */
function hot(h) {
  var g = h.g, gw = g.gw, k;
  function ground(x) { return h.eval("mGround(g, " + x + ")"); }
  var cx = Math.floor(h.eval("g.peasants.length ? g.peasants[0].x : g.gw / 2"));
  var spots = [];
  for (k = 0; k < 12; k++) spots.push(20 + Math.floor((k + 0.5) * (gw - 40) / 12));
  for (k = 0; k < spots.length; k++) {
    var x = spots[k], G = ground(x);
    if (Math.abs(x - cx) < 40) continue;   /* (not on the village's own doorstep) */
    if (k % 3 === 0) h.paintDisc(x, G - 3, 4, "LAVA");
    else if (k % 3 === 1) { h.fill(x - 5, G - 6, 11, 5, "WOOD"); h.ignite(x, G - 7); }
    else {
      /* the furnace: firebrick walls and floor, coal inside, a match to it */
      h.fill(x - 6, G - 10, 13, 10, "FIREBRICK");
      h.fill(x - 4, G - 8, 9, 7, "COAL");
      h.erase(x - 4, G - 10, 9, 2);
      h.ignite(x, G - 9);
    }
  }
  var ops = [];
  [0, 1500, 3000, 4500, 6000].forEach(function (at, r) {
    ops.push({ at: at, fn: function () {
      h.select("HEAT");
      for (var j = r % 2; j < spots.length; j += 2) h.drag(spots[j] + 7, 14, spots[j] + 7, Math.max(20, ground(spots[j] + 7) - 2), { ticks: 12 });
    } });
  });
  ops.push({ at: 2000, fn: function () { h.paintDisc(Math.floor(gw / 2) + 60, ground(Math.floor(gw / 2) + 60) - 4, 5, "LAVA"); } });
  return ops;
}

/* the steam organ, finished, knocked about while the builders come and go, through the real input path: a few cells of
   two pipes erased (the builders mend them, and the organ is finished again in the middle of a tick: its valves and
   pipe tops are grates once more), then a pipe taken in the hand and let go up and to the side, stone painted into a
   pipe top, a hole in the lowest pipe, a pinch of powder set off beside the pipes, and the rack erased. variant "a"
   starts with the brush at 2, "b" at 5 and erases another pipe at 3 600 (each mends in the save it is for: seed 7's
   and seed 3's) */
function organ(h, spec) {
  var g = h.g, s = null, k;
  for (k = 0; k < g.sites.length; k++) if (g.sites[k].kind === "organ" && g.sites[k].done) { s = g.sites[k]; break; }
  if (!s) throw new Error("organ: no finished steam organ in this village");
  var lid = h.eval("pOLid(" + s.G + ")"), OH = h.eval("P_OH"), x0 = s.x0;
  function px(n) { return x0 + 2 + 2 * n; }
  function size(d) { h.mouse(px(3), lid - 9); h.wheel(d); }
  var b = spec.variant === "b", ops = [];
  ops.push({ at: 120, fn: function () { if (!b) size(3); h.select("ERASE"); h.drag(px(3), lid - 9, px(4), lid - 9, { ticks: 2 }); } });
  if (b) ops.push({ at: 3600, fn: function () { size(3); h.select("ERASE"); h.tap(px(1), lid - 5); } });
  ops.push({ at: b ? 6000 : 4000, fn: function () { h.select("HAND"); h.drag(px(2), lid - 5, px(2) + 24, lid - 17, { ticks: 12 }); } });
  ops.push({ at: b ? 8500 : 7000, fn: function () { h.select("STONE"); h.tap(px(1), lid - OH[1]); h.select("ERASE"); h.tap(px(0), lid - 3); } });
  ops.push({ at: b ? 10000 : 9500, fn: function () { h.paintDisc(px(4) + 3, lid - 5, 2, "GUNPOWDER"); h.ignite(px(4) + 3, lid - 7); } });
  ops.push({ at: 12500, fn: function () { size(-3); h.select("ERASE"); h.drag(px(0), lid - 4, px(4), lid - 4, { ticks: 3 }); } });
  return ops;
}

/* -------------------------------------------------------------------
   playing one, with a fingerprint every EVERY sand ticks
   ------------------------------------------------------------------- */
function extras(h) {
  var ex = { "@rng": h.loaded.rng.state, "@clock": [h.ticks, h.loaded.clock.t] }, gl = {};
  try { ex["@side"] = h.eval("RNG_SIDE.state"); } catch (e) { ex["@side"] = "(none)"; }
  GLOBALS.forEach(function (k) { gl[k] = h.eval("typeof " + k + " === 'undefined' ? '(none)' : " + k); });
  ex["@globals"] = gl;
  return ex;
}

function fingerprint(h, ignore, label) {
  var r = snap.stateHash(h.g, { skip: ignore, consts: [["P_HATS", h.eval("P_HATS")], ["D_KINDS", h.eval("D_KINDS")]], extra: extras(h) });
  if (ignore) ignore.forEach(function (k) { delete r.fields[k]; });
  var e = { u: h.ticks, tick: h.g.tick, hash: r.hash, fields: r.fields };
  if (label) e.label = label;
  return e;
}

var STOP = { stop: true };

/* o: { root, ignore (a Set), stopAt (an entry index: play to it, and stop there) }. returns { entries, h, error } */
function play(spec, o) {
  var lib = require("./harness.js"), entries = [], h = null, every = 1;
  var ignore = o.ignore && o.ignore.size ? o.ignore : null;
  function take(hh, label) {
    entries.push(fingerprint(hh, ignore, label));
    if (o.stopAt != null && entries.length > o.stopAt) throw STOP;
  }
  function hook(hh) {
    var base = Object.getPrototypeOf(hh)._tick;
    hh._tick = function () { base.call(this); if (this.ticks % every === 0) take(this); };
  }
  function ticksTo(hh, u) { while (hh.ticks < u) hh.tickRaw(); }
  try {
    if (spec.replay) {
      var rec = JSON.parse(fs.readFileSync(path.join(__dirname, spec.replay), "utf8"));
      h = lib.open({ seed: rec.seed, gw: rec.gw || 272, root: o.root });
      every = EVERY;   /* (a recording plays at 1x) */
      hook(h);
      h.replay(rec);
      if (h.ticks % every) take(h, "end");   /* (and where the recording ends) */
      return { entries: entries, h: h };
    }
    h = lib.open({ seed: spec.seed, gw: spec.gw, root: o.root });
    /* (a warm save: loaded, and played on from there. everything after counts from where it was saved) */
    if (spec.load) {
      var file = path.join(o.warm || warmDir(), spec.load);
      if (!fs.existsSync(file)) throw new Error("no warm save " + file + " (see bench.js --save-out, and --warm)");
      h.load(file);
    }
    if (spec.save) {
      var sfile = path.join(o.saves || savesDir(), spec.save);
      if (!fs.existsSync(sfile)) throw new Error("no save " + sfile + " (see bench.js --save-out, and --saves)");
      h.load(sfile);
    }
    var per = h.eval("SPEEDS")[spec.speed], u0 = h.ticks;
    every = Math.round((spec.every || EVERY) / per);
    var total = u0 + Math.round(spec.ticks / per);
    if (spec.preset) require("./soak.js").applyPreset(h, spec.preset);
    var ops = spec.script === "materials" ? materials(h) : spec.script === "hot" ? hot(h) : spec.script === "organ" ? organ(h, spec) : [];
    h.speed(spec.speed);
    hook(h);
    take(h, "start");
    var saveU = spec.saveAt ? Math.round(spec.saveAt / per) : -1, i = 0;
    ops.forEach(function (op) { op.u = u0 + Math.round(op.at / per); });
    while (h.ticks < total) {
      while (i < ops.length && ops[i].u <= h.ticks) ops[i++].fn();   /* (a drag plays ticks of its own) */
      var next = total;
      if (i < ops.length) next = Math.min(next, ops[i].u);
      if (saveU >= 0) next = Math.min(next, saveU);
      ticksTo(h, Math.max(next, h.ticks + 1));
      if (saveU >= 0 && h.ticks >= saveU) {
        /* the file, as the game writes it (JSON), read into a game that has never seen this village */
        var doc = JSON.parse(JSON.stringify(h.saveDoc({ keyframes: 0 })));
        var h2 = lib.open({ seed: spec.seed + 1000, gw: spec.gw, root: o.root });
        h2.load(doc);
        h = h2;
        hook(h);
        take(h, "loaded");
        saveU = -1;
      }
    }
    if (h.ticks % every) take(h, "end");
    return { entries: entries, h: h };
  } catch (e) {
    if (e === STOP) return { entries: entries, h: h, stopped: true };
    return { entries: entries, h: h, error: { message: String(e && e.message || e), stack: String(e && e.stack || ""), u: h ? h.ticks : null } };
  }
}

/* -------------------------------------------------------------------
   comparing
   ------------------------------------------------------------------- */
function compareEntries(ref, cur, ignore) {
  var n = Math.min(ref.length, cur.length), i, k;
  for (i = 0; i < n; i++) {
    var a = ref[i], b = cur[i], diff = [];
    if (a.u !== b.u || a.tick !== b.tick || (a.label || "") !== (b.label || "")) diff.push("(the checkpoint itself: update " + a.u + "/" + b.u + ", sand tick " + a.tick + "/" + b.tick + ")");
    var keys = Object.keys(a.fields).concat(Object.keys(b.fields).filter(function (x) { return !(x in a.fields); })).sort();
    for (var j = 0; j < keys.length; j++) {
      k = keys[j];
      if (ignore && ignore.has(k)) continue;
      if (!(k in b.fields)) diff.push(k + " (missing here)");
      else if (!(k in a.fields)) diff.push(k + " (only here)");
      else if (a.fields[k] !== b.fields[k]) diff.push(k);
    }
    if (diff.length) return { index: i, u: a.u, tick: a.tick, label: a.label, fields: diff };
  }
  if (ref.length !== cur.length) return { index: n, u: n < ref.length ? ref[n].u : cur[n].u, tick: n < ref.length ? ref[n].tick : cur[n].tick, fields: ["(" + ref.length + " checkpoints recorded, " + cur.length + " here)"] };
  return null;
}

/* the first few places two values differ, by path */
function deepDiff(a, b, where, out, gw, max) {
  var seen = new Set();
  function grid(i, len) { return gw && len % gw === 0 && len / gw > 50 ? " (x " + (i % gw) + ", y " + Math.floor(i / gw) + ")" : ""; }
  function show(v) {
    if (v && typeof v === "object") return Array.isArray(v) ? "[array " + v.length + "]" : (ArrayBuffer.isView(v) ? "[" + v.constructor.name + " " + v.length + "]" : "{" + Object.keys(v).slice(0, 6).join(",") + (Object.keys(v).length > 6 ? ",..." : "") + "}");
    return JSON.stringify(v) === undefined ? String(v) : JSON.stringify(v);
  }
  function walk(x, y, p) {
    if (out.length >= max) return;
    if (x === y || (typeof x === "number" && typeof y === "number" && x !== x && y !== y)) return;
    var tx = typeof x, ty = typeof y;
    if (tx !== "object" || ty !== "object" || x === null || y === null) {
      if (tx === "function" && ty === "function" && x.name === y.name) return;
      out.push(p + ": " + show(x) + " vs " + show(y)); return;
    }
    if (seen.has(x)) return;
    seen.add(x);
    var ax = Array.isArray(x) || ArrayBuffer.isView(x), ay = Array.isArray(y) || ArrayBuffer.isView(y);
    if (ax !== ay) { out.push(p + ": " + show(x) + " vs " + show(y)); return; }
    if (ax) {
      if (x.length !== y.length) out.push(p + ".length: " + x.length + " vs " + y.length);
      var n = Math.min(x.length, y.length);
      for (var i = 0; i < n && out.length < max; i++) {
        if (ArrayBuffer.isView(x) && ArrayBuffer.isView(y)) { if (x[i] !== y[i] && !(x[i] !== x[i] && y[i] !== y[i])) out.push(p + "[" + i + "]" + grid(i, x.length) + ": " + x[i] + " vs " + y[i]); }
        else walk(x[i], y[i], p + "[" + i + "]");
      }
      return;
    }
    var ks = Object.keys(x).concat(Object.keys(y).filter(function (k) { return !(k in x); })).sort();
    for (var j = 0; j < ks.length && out.length < max; j++) {
      var k = ks[j];
      if (!(k in y)) out.push(p + "." + k + ": " + show(x[k]) + " vs (missing)");
      else if (!(k in x)) out.push(p + "." + k + ": (missing) vs " + show(y[k]));
      else walk(x[k], y[k], p + "." + k);
    }
  }
  walk(a, b, where);
  return out;
}

/* play both trees to the checkpoint that differs, and say where */
function explain(spec, refDir, dir, d, ignore, warm, saves) {
  var A = play(spec, { root: refDir, ignore: ignore, stopAt: d.index, warm: warm, saves: saves });
  var B = play(spec, { root: dir, ignore: ignore, stopAt: d.index, warm: warm, saves: saves });
  var lines = [];
  if (!A.h || !B.h) return ["(could not play both to the checkpoint)"];
  var exA = extras(A.h), exB = extras(B.h);
  d.fields.forEach(function (f) {
    var k = f.split(" ")[0];
    if (k.charAt(0) === "(") return;
    if (k.charAt(0) === "@") deepDiff(exA[k], exB[k], k, lines, A.h.g.gw, lines.length + 6);
    else deepDiff(A.h.g[k], B.h.g[k], "g." + k, lines, A.h.g.gw, lines.length + 6);
  });
  return lines.length ? lines : ["(the fields differ by hash, but no value differs: a difference in shape or sharing)"];
}

/* -------------------------------------------------------------------
   the command line: scenarios side by side, one process each
   ------------------------------------------------------------------- */
/* --only names (or the start of names) among them all; else --set: "short" (the default), "long", "edge" or "all" */
function pick(only, set) {
  var want = args.list(only).join(",").split(",").filter(Boolean);
  if (!want.length) return SCENARIOS.filter(function (s) { return set === "all" || (s.set || "short") === (set || "short"); });
  return SCENARIOS.filter(function (s) { return want.some(function (w) { return s.name === w || s.name.indexOf(w + "-") === 0 || s.name.indexOf(w) === 0; }); });
}

function warmDir() { return path.resolve(process.env.PLEASAND_WARM || path.join(__dirname, "warm")); }
function savesDir() { return path.resolve(process.env.PLEASAND_SAVES || path.join(__dirname, "saves")); }

function ignoreSet(v) { return new Set(args.list(v).join(",").split(",").filter(Boolean)); }

function runAll(list, o, done) {
  var jobs = Math.max(1, o.jobs), results = {}, running = 0, i = 0, t0 = Date.now();
  /* (the longest first, so the last to finish is not a long one started last) */
  var order = list.slice().sort(function (a, b) { return cost(b) - cost(a); });
  function cost(s) { return (s.gw || 272) * (s.ticks || 32000) / (s.speed === 4 ? 1 : 2) * (s.script ? 3 : 1); }
  function launch() {
    while (running < jobs && i < order.length) {
      (function (s) {
        running++;
        var child = cp.spawn(process.execPath, [__filename, "--worker", s.name, "--root", o.root, "--warm", o.warm, "--saves", o.saves, "--ignore", Array.from(o.ignore).join(",") || ","], { stdio: ["ignore", "pipe", "inherit"] });
        var buf = [];
        child.stdout.on("data", function (c) { buf.push(c); });
        child.on("close", function (code) {
          running--;
          var r;
          try { r = JSON.parse(Buffer.concat(buf).toString("utf8")); }
          catch (e) { r = { name: s.name, entries: [], error: { message: "worker produced no result (exit " + code + ")" } }; }
          results[s.name] = r;
          process.stderr.write("  " + s.name + ": " + r.entries.length + " checkpoints" + (r.error ? ", THREW at update " + r.error.u + ": " + r.error.message : "") + "  (" + Math.round(r.ms / 1000) + " s)\n");
          if (i < order.length) launch();
          else if (!running) done(results, Math.round((Date.now() - t0) / 1000));
        });
      })(order[i++]);
    }
  }
  launch();
}

function commitOf(dir) {
  try {
    var c = cp.execFileSync("git", ["-C", dir, "rev-parse", "--short", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    var game = ["index.html"].concat(require("./loader.js").gameFiles(dir));   /* (dirty: the game's own files, not the harness's) */
    var dirty = cp.execFileSync("git", ["-C", dir, "status", "--porcelain", "--untracked-files=no", "--"].concat(game), { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return c + (dirty ? "+dirty" : "");
  } catch (e) { return null; }
}

function main() {
  var o = args.parseArgs(process.argv.slice(2));
  if (o.worker) {
    var spec = SCENARIOS.filter(function (s) { return s.name === o.worker; })[0];
    if (!spec) throw new Error("no scenario called " + o.worker);
    var t0 = Date.now(), r = play(spec, { root: o.root, ignore: ignoreSet(o.ignore), warm: typeof o.warm === "string" ? o.warm : null, saves: typeof o.saves === "string" ? o.saves : null });
    process.stdout.write(JSON.stringify({ name: spec.name, spec: spec, entries: r.entries, error: r.error || null, ms: Date.now() - t0 }));
    return;
  }
  if (o.list) { SCENARIOS.forEach(function (s) { console.log(s.name.padEnd(14) + (s.set || "short").padEnd(7) + JSON.stringify(s)); }); return; }
  if (o.help || (!o.record && !o.check)) {
    console.log("node harness/same.js --record FILE | --check FILE [--dir CHECKOUT] [--ref-dir CHECKOUT] [--only a,b] [--set short|long|edge|all] [--warm DIR] [--saves DIR] [--jobs N] [--ignore k1,k2] [--list]");
    process.exit(o.help ? 0 : 2);
  }
  var root = path.resolve(o.dir ? String(o.dir) : path.join(__dirname, ".."));
  var set = typeof o.set === "string" ? o.set : null;
  var list = pick(o.only, o.check && !set ? "all" : set), ignore = ignoreSet(o.ignore);
  var warm = path.resolve(typeof o.warm === "string" ? o.warm : warmDir());
  var saves = path.resolve(typeof o.saves === "string" ? o.saves : savesDir());
  var jobs = args.num(o.jobs, Math.max(1, Math.min(8, os.cpus().length - 2)));
  var ref = null;
  if (o.check) {
    ref = JSON.parse(fs.readFileSync(String(o.check), "utf8"));
    if ((ref.hashing || 1) !== snap.HASH_VERSION) {
      console.error("same: " + o.check + " was fingerprinted with stateHash " + (ref.hashing || 1) + ", and this is " + snap.HASH_VERSION + ": every checkpoint would differ. record it again from the reference tree");
      process.exit(2);
    }
    list = list.filter(function (s) { return ref.scenarios[s.name]; });
    if (!list.length) { console.error("same: none of those scenarios is in " + o.check); process.exit(2); }
  }
  process.stderr.write("same: " + list.length + " scenarios, " + jobs + " at a time, " + root + "\n");
  runAll(list, { root: root, ignore: ignore, jobs: jobs, warm: warm, saves: saves }, function (results, wall) {
    var bad = 0, threw = 0;
    if (o.record) {
      var out = { format: "pleasand-same", version: 1, hashing: snap.HASH_VERSION, every: EVERY, commit: commitOf(root), node: process.version, made: new Date().toISOString(),
                  ignore: Array.from(ignore), scenarios: {} };
      if (list.some(function (s) { return s.load; })) out.warm = warm;
      if (list.some(function (s) { return s.save; })) out.saves = saves;
      list.forEach(function (s) { var r = results[s.name]; out.scenarios[s.name] = { spec: s, error: r.error, entries: r.entries }; if (r.error) threw++; });
      fs.writeFileSync(String(o.record), JSON.stringify(out));
      console.log("same: recorded " + list.length + " scenarios (" + list.reduce(function (n, s) { return n + results[s.name].entries.length; }, 0) + " checkpoints) from " + (out.commit || root) + " to " + o.record + " in " + wall + " s" + (threw ? "; " + threw + " THREW (see above)" : ""));
      process.exit(threw ? 1 : 0);
    }
    var reports = [];
    list.forEach(function (s) {
      var R = ref.scenarios[s.name], r = results[s.name];
      var d = compareEntries(R.entries, r.entries, ignore);
      var err = (r.error ? r.error.message : null) !== (R.error ? R.error.message : null);
      if (!d && !err) { console.log("   " + s.name.padEnd(14) + "same (" + r.entries.length + " checkpoints, to sand tick " + r.entries[r.entries.length - 1].tick + ")"); return; }
      bad++;
      var line = "!! " + s.name.padEnd(14);
      if (d) line += "differs at update " + d.u + " (sand tick " + d.tick + (d.label ? ", " + d.label : "") + "): first " + d.fields[0] + (d.fields.length > 1 ? "; also " + d.fields.slice(1, 12).join(", ") + (d.fields.length > 12 ? ", ..." : "") : "");
      if (err) line += (d ? "; " : "") + "threw " + (r.error ? "at update " + r.error.u + ": " + r.error.message : "nothing, where the reference threw " + R.error.message);
      console.log(line);
      if (d) reports.push({ spec: s, d: d });
    });
    if (o["ref-dir"] && reports.length) {
      var refDir = path.resolve(String(o["ref-dir"]));
      reports.slice(0, args.num(o.explain, 2)).forEach(function (x) {
        console.log("   " + x.spec.name + ", at update " + x.d.u + ", reference (" + refDir + ") vs this:");
        explain(x.spec, refDir, root, x.d, ignore, warm, saves).forEach(function (l) { console.log("      " + l); });
      });
    }
    console.log(bad ? "same: " + bad + " of " + list.length + " scenarios DIFFER from " + (ref.commit || o.check) : "same: all " + list.length + " scenarios identical to " + (ref.commit || o.check) + " (" + wall + " s)");
    process.exit(bad ? 1 : 0);
  });
}

if (require.main === module) main();

module.exports = { SCENARIOS: SCENARIOS, play: play, organ: organ, fingerprint: fingerprint, compareEntries: compareEntries, deepDiff: deepDiff, EVERY: EVERY };
