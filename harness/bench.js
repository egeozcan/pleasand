/* =====================================================================
   PLEASAND  --  harness/bench.js

   how long a frame takes, at 4x, in the wide valley: the measurement
   docs/wide-valley-spec.md §7 sets the budget by (median gameUpdate
   <= 4.5 ms, p95 <= 9 ms, seeds 3, 7, 14, 1088 wide, 20 000 ticks).

     node harness/bench.js                          # seeds 3,7,14, 20000 ticks, 4x, 1088
     node harness/bench.js --phases                 # and where the time goes
     node harness/bench.js --dir ../other-checkout  # that tree's game, this harness
     node harness/bench.js --ab ../a ../b --rounds 4 --ticks 8000
     node harness/bench.js --ticks 80000            # the long run: whole run, and the late window (40 000-80 000)
     node harness/bench.js --late WARM_DIR          # from the warm saves: 8 000 ticks each from tick 60 000
     node harness/bench.js --late WARM_DIR --ab ../a ../b --lockstep --rounds 3
     node harness/bench.js --load save.json --ticks 4000
     node harness/bench.js --dir ../base --ticks 60000 --save-out WARM_DIR/seed{seed}-60k.json   # making them
     node harness/bench.js --preset leftovers --ticks 20000      # soak.js's leftovers village, from tick 0
     node harness/bench.js --late WARM_DIR --profile PROF_DIR    # and where each frame's time goes, by a CPU profile

   the game is run as the browser runs it at 4x: gameUpdate, once a
   frame, four world ticks inside it, nobody touching anything. each
   gameUpdate is timed on its own (process.hrtime), and each seed is run
   in a fresh process, one after another, so one seed's garbage and
   compiled code are not the next one's. ticks are sand ticks: 20 000 at
   4x is 5 000 gameUpdates.

   --ab: two checkouts, taken in turns, seed by seed (A B, then B A, ...),
   for several rounds, so that whatever else the machine is doing falls
   on both alike. reported: each one's median and p95 per seed, round by
   round, and B/A for each round (paired, so the load of the moment
   cancels), with its median and spread. the world each comes to is
   compared too (harness.js hash and snapshot.js stateHash, which sees
   what FNV-1a's hash misses, an even number of sign flips): a pure
   speed-up comes to the same one.

   the late window: each seed also reports the frames from --window-from
   sand ticks into the run (by default half way) to its end on their own,
   so that an 80 000-tick run says what the warmed valley of its second
   half costs, apart from the cold one of its first.

   --load SAVE: the village is a save (save.js, as the harness writes
   one), loaded into a fresh game, and played on from there at 4x.
   --late DIR: the late game, fast: seeds 3, 7, 14 each from
   DIR/seed<N>-60k.json (a valley 60 000 ticks old, warmed through), or,
   where there is none, the one DIR/seed<N>-<n>k.json there is (a
   directory of saves from tick 150 000, seed<N>-150k.json), 8 000 ticks
   each unless --ticks says otherwise. both go with --ab and --lockstep.
   --save-out PATH ({seed} in it becomes the seed) saves the village
   where the run ends: that is how the warm saves are made, from the tree
   the world is measured against.

   --preset NAME: soak.js's presets (plain, rich, chaos, leftovers), put
   on the village before it plays, exactly as same.js does: after the
   save is loaded, if there is one, and before the speed is set. goes
   with --ticks, --load, --late, --save-out and --ab --lockstep.

   --profile DIR: each seed's timed frames (and only those) under V8's
   sampling profiler (every 100 us), written to DIR as a .cpuprofile, and
   the frame's time told out by it: heatStep's steps (0, 1, the metal's
   extra goes, 2), the rest of sandStep, peasantsStep's navFind, its
   pGrate outside navFind and the rest of it, partStep, ducksStep, and
   the rest of the frame (garbage collection among it), over all the
   frames and over the slowest tenth of them on their own (what a p95 is
   made of). the shares are of samples, scaled to the timed total, so
   they carry the profiler's own small cost; the median and p95 of such
   a run are not the bench's.

   everything comes out as JSON, on stdout. progress goes to stderr.
   ===================================================================== */
"use strict";
var cp = require("child_process"), os = require("os"), path = require("path");
var args = require("./args.js");

var BUDGET = { median: 4.5, p95: 9 };

function seedList(v) {
  var out = [];
  args.list(v).join(",").split(",").forEach(function (part) {
    var m = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(part);
    if (m) { for (var i = Number(m[1]); i <= Number(m[2]); i++) out.push(i); }
    else if (String(part).trim()) out.push(Number(part));
  });
  return out.filter(function (n) { return isFinite(n) && n > 0; });
}

function pct(sorted, p) {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
}
function r3(x) { return x == null ? null : Math.round(x * 1000) / 1000; }
function median(a) { var s = a.slice().sort(function (x, y) { return x - y; }); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; }

function commitOf(dir) {
  try {
    var c = cp.execFileSync("git", ["-C", dir, "rev-parse", "--short", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    var game = ["index.html"].concat(require("./loader.js").gameFiles(dir));   /* (dirty: the game's own files, not the harness's) */
    var dirty = cp.execFileSync("git", ["-C", dir, "status", "--porcelain", "--untracked-files=no", "--"].concat(game), { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return c + (dirty ? "+dirty" : "");
  } catch (e) { return null; }
}

/* -------------------------------------------------------------------
   one seed, in this process
   ------------------------------------------------------------------- */
function village(o, dir) {
  var lib = require("./harness.js");
  var h = lib.open({ seed: o.seed, gw: o.gw, root: dir });
  if (o.journal) h.eval("SAVE_J.on = true");
  if (o.load) h.load(o.load);
  if (o.preset) preset(h, o.preset);
  /* (warming up: a village played and thrown away, so the compiler has seen the code. the one measured is fresh) */
  if (o.warm > 0) {
    h.speed(o.speed);
    for (var w = 0; w < o.warm; w++) h._tick();
    if (o.load) h.load(o.load); else h.reset(o.seed);
    if (o.preset) preset(h, o.preset);
  }
  h.speed(o.speed);
  h._t0 = h.g.tick;
  return h;
}

/* soak.js's presets, as same.js puts them on: after the load, before the speed. plain is the village left alone */
var PRESETS = ["plain", "rich", "chaos", "leftovers"];
function preset(h, name) {
  if (PRESETS.indexOf(name) < 0) throw new Error("bench: no preset " + name + " (" + PRESETS.join(", ") + ")");
  require("./soak.js").applyPreset(h, name);
}

function stats(o, h, ms) {
  var n = ms.length, sum = 0, i, per = h.eval("SPEEDS")[o.speed];
  for (i = 0; i < n; i++) sum += ms[i];
  var s = Array.prototype.slice.call(ms).sort(function (a, b) { return a - b; });
  var out = {
    seed: o.seed, updates: n, fromTick: h._t0, sandTicks: h.g.tick,
    median: r3(pct(s, 0.5)), p95: r3(pct(s, 0.95)), p99: r3(pct(s, 0.99)), max: r3(s[s.length - 1]),
    mean: r3(sum / n), totalMs: Math.round(sum), hash: h.hash(),
    /* (and the whole state, every word avalanched: harness.js hash is FNV-1a, which an even number of sign flips, two
       -0s for +0s, two negated temperatures, passes by without a trace. sameWorld goes by both) */
    stateHash: require("./same.js").fingerprint(h, null).hash
  };
  if (o.load) out.loaded = o.load;
  if (o.preset) out.preset = o.preset;
  /* the late window: from windowFrom sand ticks into the run (half way, unless told) to the end */
  var wf = o.windowFrom != null ? o.windowFrom : Math.round(o.ticks / 2), a0 = Math.min(n - 1, Math.max(0, Math.round(wf / per)));
  var ws = Array.prototype.slice.call(ms, a0).sort(function (a, b) { return a - b; }), wsum = 0;
  for (i = 0; i < ws.length; i++) wsum += ws[i];
  out.lateWindow = { fromTick: h._t0 + Math.round(a0 * per), toTick: h.g.tick, updates: ws.length,
    median: r3(pct(ws, 0.5)), p95: r3(pct(ws, 0.95)), p99: r3(pct(ws, 0.99)), max: r3(ws[ws.length - 1]), mean: r3(wsum / ws.length) };
  /* the mean of each tenth of the run, in order (where in the run the time goes) */
  out.tenths = [];
  for (var k = 0; k < 10; k++) {
    var a = Math.floor(k * n / 10), b = Math.floor((k + 1) * n / 10), q = 0;
    for (i = a; i < b; i++) q += ms[i];
    out.tenths.push(r3(q / Math.max(1, b - a)));
  }
  return out;
}

function one(o) {
  if (o.dirB) return pair(o);
  var h = village(o, o.dir), per = h.eval("SPEEDS")[o.speed];
  if (o.phases) h.profiler(true);
  var n = Math.max(1, Math.round(o.ticks / per)), ms = new Float64Array(n), i, t0;
  var prof = o.profile ? profStart() : null, at = prof ? new Float64Array(n) : null;   /* (each frame's start, in us, for the profile's samples) */
  for (i = 0; i < n; i++) {
    t0 = process.hrtime.bigint();
    h._tick();
    ms[i] = Number(process.hrtime.bigint() - t0) / 1e6;
    if (at) at[i] = Number(t0 / 1000n);
  }
  var cpu = prof ? profStop(prof) : null;
  var out = stats(o, h, ms), sum = out.totalMs;
  if (cpu) {
    var pf = path.join(o.profile, "seed" + o.seed + "-" + (o.preset ? o.preset + "-" : "") + (o.load ? path.basename(o.load, ".json") + "-" : "") + o.ticks + "-" + process.pid + ".cpuprofile");
    require("fs").mkdirSync(o.profile, { recursive: true });
    require("fs").writeFileSync(pf, JSON.stringify(cpu));
    out.breakdown = breakdown(cpu, o.dir, ms, at, prof.hr0);
    out.breakdown.profile = pf;
  }
  if (o.phases) {
    var pr = h.profile(), ph = {};
    pr.phases.forEach(function (p) { ph[p.phase] = { ms: p.ms, perUpdate: r3(p.ms / n), share: r3(p.ms / sum) }; });
    var top = ["sandStep", "partStep", "peasantsStep", "ducksStep", "sandPaint", "toolHold"], inside = 0;
    top.forEach(function (k) { if (ph[k]) inside += ph[k].ms; });
    ph.other = { ms: r3(sum - inside), perUpdate: r3((sum - inside) / n), share: r3((sum - inside) / sum) };
    if (ph.heatStep && ph.sandStep) ph.sandStepWithoutHeat = { ms: r3(ph.sandStep.ms - ph.heatStep.ms), perUpdate: r3((ph.sandStep.ms - ph.heatStep.ms) / n), share: r3((ph.sandStep.ms - ph.heatStep.ms) / sum) };
    out.phases = ph;
    out.phasesNote = "shares of the timed gameUpdate total; heatStep runs inside sandStep (sandStepWithoutHeat is the rest); timings taken with the profiler's wrappers on";
  }
  if (o.saveOut) {
    if (o.phases) h.profiler(false);
    var file = String(o.saveOut).replace(/\{seed\}/g, String(o.seed));
    var sv = h.save(file, { keyframes: 0 });
    out.saved = { path: file, bytes: sv.bytes, updates: h.ticks, sandTick: h.g.tick, hash: out.hash, stateHash: require("./same.js").fingerprint(h, null).hash };
  }
  return out;
}

/* -------------------------------------------------------------------
   --profile: V8's sampling profiler, over the timed frames only, and
   what it says of where a frame's time goes
   ------------------------------------------------------------------- */
function profStart() {
  var insp = require("inspector"), s = new insp.Session(), err = null;
  s.connect();
  /* (the session in this thread answers at once: post's callback has run before post returns) */
  s.post("Profiler.enable", function (e) { err = err || e; });
  s.post("Profiler.setSamplingInterval", { interval: 100 }, function (e) { err = err || e; });
  var hr0 = Number(process.hrtime.bigint() / 1000n);
  s.post("Profiler.start", function (e) { err = err || e; });
  if (err) throw err;
  return { s: s, hr0: hr0 };
}
function profStop(p) {
  var got = null, err = null;
  p.s.post("Profiler.stop", function (e, r) { err = e; got = r && r.profile; });
  p.s.disconnect();
  if (err || !got) throw err || new Error("bench: the profiler gave nothing back");
  return got;
}

/* each sample put to one place: the first of the world's phases on its stack (sandStep, partStep, peasantsStep,
   ducksStep), and inside them: heatStep by its steps (its own lines by where they stand in heat.js, between the comments
   that begin each step; a function it calls by which step calls it), the rest of sandStep, navFind (all of it, pGrate
   inside it too), pGrate outside navFind, the rest of peasantsStep. what is on no phase's stack is the rest of the frame:
   gameUpdate's own work, the harness's, the garbage collector.
   and each sample put in its frame, by its time (the profiler's clock and hrtime differ by a constant, taken as the
   profile starts), so that the slow frames, the tenth of them that took longest, are told out on their own too: what a
   p95 is made of. (heatStep's own lines are counted for its node as a whole, not sample by sample: in the slow frames
   they are split between the steps as they are over the whole run) */
var HEAT_CALLEE = { heatRecount: "heat0", heatQuietTables: "heat1", heatViews: "heat1", heatSnapBits: "heat1", heatRowColdNow: "heat1",
                    heatRowColdFresh: "heat1", heatColdRow: "heat1", heatWordCold: "heat1", random: "heat1", draw: "heat1",
                    heatRangeBand: "heat2", heatSteadyScan: "heat2", heatQ: "heat2", heatSetQ: "heat2", heatUp: "heat2", heatDown: "heat2", heatLat: "heat2", heatF: "heat2" };
function heatMarks(dir) {
  var src = require("fs").readFileSync(path.join(dir, "heat.js"), "utf8").split("\n"), at = {}, k;
  var find = { start: /^function heatStep\(/, s1: /\/\* 1\. make heat/, metal: /\/\* metal gets a few more goes/, s2: /\/\* 2\. anything out of its range/ };
  for (k = 0; k < src.length; k++) Object.keys(find).forEach(function (q) { if (at[q] == null && find[q].test(src[k]) && (q === "start" || at.start != null)) at[q] = k + 1; });
  return at;
}
var CATS = ["heat0", "heat1", "heatMetal", "heat2", "heatOther", "sandStepWithoutHeat", "navFind", "pGrateOutsideNav", "peasantsRest", "partStep", "ducksStep", "rest"];
function breakdown(cpu, dir, ms, at, hr0) {
  var nodes = {}, parent = {}, k, marks = heatMarks(dir), n = ms.length;
  cpu.nodes.forEach(function (nd) { nodes[nd.id] = nd; (nd.children || []).forEach(function (c) { parent[c] = nd.id; }); });
  var TOP = { sandStep: 1, partStep: 1, peasantsStep: 1, ducksStep: 1 };
  /* where a node's own samples go, by its stack: a share of each category (one, but for heatStep's own, by its lines) */
  var place = {};
  function where(id) {
    if (place[id] !== undefined) return place[id];
    var chain = [], q = id, nd = nodes[id];
    while (q != null) { chain.push(nodes[q]); q = parent[q]; }
    chain.reverse();   /* (root first) */
    var top = null, heatAt = -1, navAt = -1, grAt = -1, gr = false;
    for (var c = 0; c < chain.length; c++) {
      var f = chain[c].callFrame.functionName;
      if (f === "pGrate") gr = true;
      if (top === null && TOP[f]) top = f;
      if (top !== null && f === "heatStep" && heatAt < 0) heatAt = c;
      if (top !== null && f === "navFind" && navAt < 0) navAt = c;
      if (top !== null && f === "pGrate" && grAt < 0) grAt = c;
    }
    var r = {};
    if (top === null) r.rest = 1;
    else if (top === "sandStep") {
      if (heatAt < 0) r.sandStepWithoutHeat = 1;
      else if (heatAt < chain.length - 1) r[HEAT_CALLEE[chain[heatAt + 1].callFrame.functionName] || "heatOther"] = 1;
      else {
        /* heatStep's own: by the lines its samples fell on (positionTicks), each line by the step it stands in */
        var pt = nd.positionTicks || [], tot = 0, base = nd.callFrame.lineNumber + 1;   /* (the line heatStep starts on, in the game's one script) */
        pt.forEach(function (p) { tot += p.ticks; });
        pt.forEach(function (p) {
          var line = p.line - base + marks.start;   /* (in heat.js) */
          var st = line < marks.s1 ? "heat0" : line < marks.metal ? "heat1" : line < marks.s2 ? "heatMetal" : "heat2";
          r[st] = (r[st] || 0) + p.ticks / tot;
        });
        if (!tot) r.heat1 = 1;   /* (no lines: put with step 1, the bulk of it) */
      }
    } else if (top === "peasantsStep") r[navAt >= 0 ? "navFind" : grAt >= 0 ? "pGrateOutsideNav" : "peasantsRest"] = 1;
    else r[top] = 1;
    return (place[id] = { share: r, pGrate: gr });
  }
  /* the slow frames: the tenth that took longest */
  var sorted = Array.prototype.slice.call(ms).sort(function (a, b) { return a - b; }), thr = sorted[Math.min(n - 1, Math.floor(n * 0.9))];
  var all = {}, slow = {}, nAll = 0, nSlow = 0, grAll = 0, grSlow = 0, outside = 0;
  var off = cpu.startTime - hr0, t = cpu.startTime, f = 0, i;
  for (i = 0; i < cpu.samples.length; i++) {
    t += cpu.timeDeltas[i];
    var hr = t - off;
    while (f < n && hr >= at[f] + ms[f] * 1000) f++;
    if (f >= n || hr < at[f]) { outside++; continue; }   /* (between frames: the bench's own loop) */
    var w = where(cpu.samples[i]), isSlow = ms[f] >= thr;
    Object.keys(w.share).forEach(function (q) { all[q] = (all[q] || 0) + w.share[q]; if (isSlow) slow[q] = (slow[q] || 0) + w.share[q]; });
    nAll++; if (isSlow) nSlow++;
    if (w.pGrate) { grAll++; if (isSlow) grSlow++; }
  }
  function tell(cnt, total, msPer, gr) {
    function v(keys) { var x = 0; keys.forEach(function (q) { x += cnt[q] || 0; }); return r3(total ? x / total * msPer : 0); }
    return {
      heatStep: v(["heat0", "heat1", "heatMetal", "heat2", "heatOther"]),
      heatStep0: v(["heat0"]), heatStep1: v(["heat1"]), heatStepMetal: v(["heatMetal"]), heatStep2: v(["heat2"]), heatStepOther: v(["heatOther"]),
      sandStepWithoutHeat: v(["sandStepWithoutHeat"]),
      peasantsStep: v(["navFind", "pGrateOutsideNav", "peasantsRest"]),
      navFind: v(["navFind"]), pGrateOutsideNav: v(["pGrateOutsideNav"]), peasantsRest: v(["peasantsRest"]),
      partStep: v(["partStep"]), ducksStep: v(["ducksStep"]), rest: v(["rest"]), all: r3(msPer),
      pGrateAll: r3(total ? gr / total * msPer : 0)   /* (pGrate wherever it is, navFind's share of it included) */
    };
  }
  var sumAll = 0, sumSlow = 0, kSlow = 0;
  for (i = 0; i < n; i++) { sumAll += ms[i]; if (ms[i] >= thr) { sumSlow += ms[i]; kSlow++; } }
  return {
    samples: nAll, samplesOutsideFrames: outside,
    note: "ms per update, from the share of the profiler's samples in the frames, scaled to their timed total (with the profiler on); slowFrames: the same over the frames at or above the 90th percentile only, per such frame",
    perUpdate: tell(all, nAll, sumAll / n, grAll),
    slowFrames: Object.assign({ frames: kSlow, fromMs: r3(thr), samples: nSlow }, tell(slow, nSlow, kSlow ? sumSlow / kSlow : 0, grSlow))
  };
}

/* --lockstep: both checkouts' villages in one process, an update of one and then an update of the other (A B, B A, ...),
   so that a burst of load lands on both within a few milliseconds. they share a heap and the caches, alike */
function pair(o) {
  var hs = [village(o, o.dir), village(o, o.dirB)], per = hs[0].eval("SPEEDS")[o.speed];
  var n = Math.max(1, Math.round(o.ticks / per)), ms = [new Float64Array(n), new Float64Array(n)], i, j, w, t0;
  for (i = 0; i < n; i++) {
    for (j = 0; j < 2; j++) {
      w = i % 2 ? 1 - j : j;
      t0 = process.hrtime.bigint();
      hs[w]._tick();
      ms[w][i] = Number(process.hrtime.bigint() - t0) / 1e6;
    }
  }
  return { a: stats(o, hs[0], ms[0]), b: stats(o, hs[1], ms[1]) };
}

/* a seed in a fresh process */
function runChild(o) {
  var argv = [__filename, "--one", JSON.stringify(o)];
  var res = cp.spawnSync(process.execPath, argv, { encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "inherit"] });
  if (res.status !== 0) throw new Error("bench: seed " + o.seed + " in " + o.dir + " failed (" + (res.signal || res.status) + ")");
  var lines = res.stdout.trim().split("\n");
  return JSON.parse(lines[lines.length - 1]);
}

function note(s) { process.stderr.write(s + "\n"); }

/* -------------------------------------------------------------------
   the measurement
   ------------------------------------------------------------------- */
function bench(opts) {
  var dir = path.resolve(opts.dir ? String(opts.dir) : path.join(__dirname, ".."));
  var base = { dir: dir, gw: opts.gw, ticks: opts.ticks, speed: opts.speed, warm: opts.warm, phases: !!opts.phases, journal: !!opts.journal,
               windowFrom: opts.windowFrom, saveOut: opts.saveOut, preset: opts.preset, profile: opts.profile };
  var runs = [], t0 = Date.now(), load0 = os.loadavg()[0];
  for (var r = 0; r < opts.runs; r++) {
    opts.seeds.forEach(function (seed) {
      var o = Object.assign({}, base, { seed: seed, load: loadFor(opts, seed) });
      var res = runChild(o);
      var lw = res.lateWindow;
      note("  seed " + seed + (opts.runs > 1 ? " run " + (r + 1) : "") + ": median " + res.median + " ms, p95 " + res.p95 + " ms, p99 " + res.p99 + ", max " + res.max + "  (" + res.updates + " updates, " + (res.totalMs / 1000).toFixed(1) + " s)" +
        "; ticks " + lw.fromTick + "-" + lw.toTick + ": median " + lw.median + ", p95 " + lw.p95 + (res.saved ? "; saved " + res.saved.path + " (hash " + res.saved.hash + ")" : ""));
      if (res.breakdown) note("    per update " + JSON.stringify(res.breakdown.perUpdate) + "\n    per slow frame (" + res.breakdown.slowFrames.frames + " from " + res.breakdown.slowFrames.fromMs + " ms) " + JSON.stringify(res.breakdown.slowFrames));
      res.run = r + 1;
      runs.push(res);
    });
  }
  function worstOf(f) { return { median: Math.max.apply(null, runs.map(function (x) { return f(x).median; })), p95: Math.max.apply(null, runs.map(function (x) { return f(x).p95; })) }; }
  var worst = worstOf(function (x) { return x; }), lw = worstOf(function (x) { return x.lateWindow; });
  return {
    what: "gameUpdate ms at speed " + opts.speedName + ", " + opts.gw + " wide, " + opts.ticks + " sand ticks per seed" + (opts.late ? ", from the warm saves in " + opts.late : opts.load ? ", from " + opts.load : "") + (opts.preset ? ", preset " + opts.preset : "") + (opts.profile ? ", under the sampling profiler (not the bench's own numbers)" : ""),
    dir: dir, commit: commitOf(dir), node: process.version, cpus: os.cpus().length,
    loadavg: [r3(load0), r3(os.loadavg()[0])], wallS: Math.round((Date.now() - t0) / 1000),
    seeds: runs,
    worst: worst,
    budget: { median: BUDGET.median, p95: BUDGET.p95, ok: worst.median <= BUDGET.median && worst.p95 <= BUDGET.p95 },
    lateWindow: { worst: lw, ok: lw.median <= BUDGET.median && lw.p95 <= BUDGET.p95,
      note: "each seed's frames from lateWindow.fromTick to its end only (by default the run's second half; --window-from sets it)" }
  };
}

/* the save a seed starts from: --late DIR's seed<N>-60k.json (or, where there is none, the one seed<N>-<n>k.json there),
   or --load's file */
function loadFor(opts, seed) {
  if (opts.late) {
    var fs = require("fs"), f = path.join(opts.late, "seed" + seed + "-60k.json");
    if (fs.existsSync(f)) return f;
    var re = new RegExp("^seed" + seed + "-\\d+k\\.json$"), got = fs.existsSync(opts.late) ? fs.readdirSync(opts.late).filter(function (x) { return re.test(x); }) : [];
    if (got.length === 1) return path.join(opts.late, got[0]);
    if (got.length > 1) throw new Error("--late: more than one save for seed " + seed + " in " + opts.late + " (" + got.join(", ") + ")");
    return f;
  }
  return opts.load || null;
}

/* -------------------------------------------------------------------
   A against B
   ------------------------------------------------------------------- */
function spread(list) {
  var s = list.slice().sort(function (a, b) { return a - b; });
  return { median: r3(median(s)), min: r3(s[0]), max: r3(s[s.length - 1]), q1: r3(pct(s, 0.25)), q3: r3(pct(s, 0.75)) };
}

function ab(opts, A, B) {
  var dirs = [path.resolve(A), path.resolve(B)], t0 = Date.now(), load0 = os.loadavg()[0];
  var base = { gw: opts.gw, ticks: opts.ticks, speed: opts.speed, warm: opts.warm, phases: false, journal: !!opts.journal, windowFrom: opts.windowFrom, preset: opts.preset };
  var got = {};   /* got[seed] = [{a, b}, ...] round by round */
  var k = 0;
  for (var r = 0; r < opts.rounds; r++) {
    opts.seeds.forEach(function (seed) {
      var order = k++ % 2 ? [1, 0] : [0, 1], two = {};
      base.load = loadFor(opts, seed);
      if (opts.lockstep) {
        two = runChild(Object.assign({}, base, { seed: seed, dir: dirs[order[0]], dirB: dirs[order[1]] }));
        if (order[0]) two = { a: two.b, b: two.a };
        note("  round " + (r + 1) + " seed " + seed + " in lockstep: A median " + two.a.median + " ms, p95 " + two.a.p95 + " ms; B median " + two.b.median + " ms, p95 " + two.b.p95 + " ms");
      } else order.forEach(function (w) {
        var res = runChild(Object.assign({}, base, { seed: seed, dir: dirs[w] }));
        two[w ? "b" : "a"] = res;
        note("  round " + (r + 1) + " seed " + seed + " " + (w ? "B" : "A") + ": median " + res.median + " ms, p95 " + res.p95 + " ms");
      });
      (got[seed] = got[seed] || []).push(two);
    });
  }
  var out = {
    what: "A/B, gameUpdate ms at speed " + opts.speedName + ", " + opts.gw + " wide, " + opts.ticks + " sand ticks per run" +
      (opts.late ? " from the warm saves in " + opts.late : opts.load ? " from " + opts.load : "") + (opts.preset ? ", preset " + opts.preset : "") + ", " + opts.rounds + " rounds, " +
      (opts.lockstep ? "in lockstep (one process, update by update)" : "taken in turns seed by seed"),
    A: { dir: dirs[0], commit: commitOf(dirs[0]) }, B: { dir: dirs[1], commit: commitOf(dirs[1]) },
    node: process.version, loadavg: [r3(load0), r3(os.loadavg()[0])], wallS: Math.round((Date.now() - t0) / 1000),
    seeds: [], sameWorld: true
  };
  var gm = { median: 0, p95: 0 }, n = 0;
  opts.seeds.forEach(function (seed) {
    var rows = got[seed];
    var row = { seed: seed, A: {}, B: {}, ratio: {} };
    ["median", "p95"].forEach(function (q) {
      var a = rows.map(function (p) { return p.a[q]; }), b = rows.map(function (p) { return p.b[q]; });
      /* (the late window too, alongside: the frames of each run's second half, or from --window-from) */
      var la = rows.map(function (p) { return p.a.lateWindow[q]; }), lb = rows.map(function (p) { return p.b.lateWindow[q]; });
      row.lateWindow = row.lateWindow || { fromTick: rows[0].a.lateWindow.fromTick };
      row.lateWindow[q] = { A: r3(median(la)), B: r3(median(lb)), ratio: r3(median(rows.map(function (p) { return p.b.lateWindow[q] / p.a.lateWindow[q]; }))) };
      row.A[q] = { rounds: a, median: r3(median(a)), min: r3(Math.min.apply(null, a)) };
      row.B[q] = { rounds: b, median: r3(median(b)), min: r3(Math.min.apply(null, b)) };
      var rat = rows.map(function (p) { return p.b[q] / p.a[q]; });
      row.ratio[q] = spread(rat);
      row.ratio[q].ofMins = r3(row.B[q].min / row.A[q].min);
      gm[q] += Math.log(median(rat));
    });
    n++;
    row.sameWorld = rows.every(function (p) { return p.a.hash === p.b.hash && p.a.stateHash === p.b.stateHash; });
    row.hash = { A: rows[0].a.hash, B: rows[0].b.hash };
    row.stateHash = { A: rows[0].a.stateHash, B: rows[0].b.stateHash };
    if (!row.sameWorld) out.sameWorld = false;
    out.seeds.push(row);
  });
  out.ratio = { median: r3(Math.exp(gm.median / n)), p95: r3(Math.exp(gm.p95 / n)),
    note: "B/A: below 1, B is faster. per seed, the median of the rounds' paired ratios (q1..q3 and min..max are their spread; ofMins is B's best round over A's); here, their geometric mean over the seeds" };
  out.B.budget = {
    median: Math.max.apply(null, out.seeds.map(function (s) { return s.B.median.median; })),
    p95: Math.max.apply(null, out.seeds.map(function (s) { return s.B.p95.median; }))
  };
  out.B.budget.ok = out.B.budget.median <= BUDGET.median && out.B.budget.p95 <= BUDGET.p95;
  return out;
}

/* -------------------------------------------------------------------
   the command line
   ------------------------------------------------------------------- */
function main() {
  var argv = process.argv.slice(2);
  if (argv[0] === "--one") { process.stdout.write(JSON.stringify(one(JSON.parse(argv[1]))) + "\n"); return; }
  var abAt = argv.indexOf("--ab"), abDirs = null;
  if (abAt >= 0) { abDirs = argv.slice(abAt + 1, abAt + 3); argv.splice(abAt, 3); }
  var o = args.parseArgs(argv);
  if (o.help || o._[0] === "help") {
    process.stdout.write("node harness/bench.js [--seeds 3,7,14] [--ticks 20000] [--gw 1088] [--speed 4] [--warm N] [--phases] [--runs N] [--journal] [--dir CHECKOUT]\n" +
      "                      [--window-from TICKS] [--load SAVE | --late WARM_DIR] [--preset plain|rich|chaos|leftovers] [--save-out PATH_WITH_{seed}] [--profile DIR]\n" +
      "node harness/bench.js --ab DIR_A DIR_B [--rounds 4] [--lockstep] [--seeds ...] [--ticks ...] [--load SAVE | --late WARM_DIR] [--preset NAME]\n");
    return;
  }
  var opts = {
    seeds: o.seeds != null ? seedList(o.seeds) : [3, 7, 14],
    ticks: args.num(o.ticks, 20000), gw: args.num(o.gw, 1088), speed: args.num(o.speed, 4),
    warm: args.num(o.warm, 0), runs: Math.max(1, args.num(o.runs, 1)), rounds: Math.max(1, args.num(o.rounds, 4)),
    phases: !!o.phases, journal: !!o.journal, dir: o.dir, lockstep: !!o.lockstep,
    windowFrom: o["window-from"] != null ? args.num(o["window-from"], null) : null,
    saveOut: typeof o["save-out"] === "string" ? o["save-out"] : null,
    load: typeof o.load === "string" ? path.resolve(o.load) : null, late: null,
    preset: typeof o.preset === "string" && o.preset !== "plain" ? o.preset : null,
    profile: typeof o.profile === "string" ? path.resolve(o.profile) : null
  };
  if (opts.preset && PRESETS.indexOf(opts.preset) < 0) throw new Error("bench: no preset " + opts.preset + " (" + PRESETS.join(", ") + ")");
  if (opts.profile && abDirs) throw new Error("bench: --profile is for one checkout's runs, not --ab");
  if (o.late != null) {
    opts.late = path.resolve(typeof o.late === "string" ? o.late : process.env.PLEASAND_WARM || path.join(__dirname, "warm"));
    if (o.ticks == null) opts.ticks = 8000;
    opts.seeds.forEach(function (seed) {
      var f = loadFor(opts, seed);
      if (!require("fs").existsSync(f)) throw new Error("--late: no " + f + " nor any one seed" + seed + "-<n>k.json beside it (make it with: node harness/bench.js --dir BASE --seeds " + seed + " --ticks 60000 --save-out " + path.join(opts.late, "seed{seed}-60k.json") + ")");
    });
  } else if (opts.load) {
    /* (one save, one village: its own seed, for the label) */
    if (o.seeds == null) { var meta = (JSON.parse(require("fs").readFileSync(opts.load, "utf8")).meta || {}); opts.seeds = [meta.seed != null ? meta.seed : 0]; }
  }
  opts.speedName = ["1/4", "1/2", "1x", "2x", "4x"][opts.speed] || String(opts.speed);
  var res;
  if (abDirs) {
    if (abDirs.length < 2) throw new Error("--ab wants two checkouts");
    res = ab(opts, abDirs[0], abDirs[1]);
  } else res = bench(opts);
  process.stdout.write(JSON.stringify(res, null, o.compact ? 0 : 1) + "\n");
}

if (require.main === module) main();

module.exports = { one: one, bench: bench, ab: ab, BUDGET: BUDGET };
