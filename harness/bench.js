/* =====================================================================
   PLEASAND  --  harness/bench.js

   how long a frame takes, at 4x, in the wide valley: the measurement
   docs/wide-valley-spec.md §7 sets the budget by (median gameUpdate
   <= 4.5 ms, p95 <= 9 ms, seeds 3, 7, 14, 1088 wide, 20 000 ticks).

     node harness/bench.js                          # seeds 3,7,14, 20000 ticks, 4x, 1088
     node harness/bench.js --phases                 # and where the time goes
     node harness/bench.js --dir ../other-checkout  # that tree's game, this harness
     node harness/bench.js --ab ../a ../b --rounds 4 --ticks 8000

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
   compared too (harness.js hash): a pure speed-up comes to the same one.

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
  /* (warming up: a village played and thrown away, so the compiler has seen the code. the one measured is fresh) */
  if (o.warm > 0) {
    h.speed(o.speed);
    for (var w = 0; w < o.warm; w++) h._tick();
    h.reset(o.seed);
  }
  h.speed(o.speed);
  return h;
}

function stats(o, h, ms) {
  var n = ms.length, sum = 0, i;
  for (i = 0; i < n; i++) sum += ms[i];
  var s = Array.prototype.slice.call(ms).sort(function (a, b) { return a - b; });
  var out = {
    seed: o.seed, updates: n, sandTicks: h.g.tick,
    median: r3(pct(s, 0.5)), p95: r3(pct(s, 0.95)), p99: r3(pct(s, 0.99)), max: r3(s[s.length - 1]),
    mean: r3(sum / n), totalMs: Math.round(sum), hash: h.hash()
  };
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
  for (i = 0; i < n; i++) {
    t0 = process.hrtime.bigint();
    h._tick();
    ms[i] = Number(process.hrtime.bigint() - t0) / 1e6;
  }
  var out = stats(o, h, ms), sum = out.totalMs;
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
  return out;
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
  var base = { dir: dir, gw: opts.gw, ticks: opts.ticks, speed: opts.speed, warm: opts.warm, phases: !!opts.phases, journal: !!opts.journal };
  var runs = [], t0 = Date.now(), load0 = os.loadavg()[0];
  for (var r = 0; r < opts.runs; r++) {
    opts.seeds.forEach(function (seed) {
      var o = Object.assign({}, base, { seed: seed });
      var res = runChild(o);
      note("  seed " + seed + (opts.runs > 1 ? " run " + (r + 1) : "") + ": median " + res.median + " ms, p95 " + res.p95 + " ms, p99 " + res.p99 + ", max " + res.max + "  (" + res.updates + " updates, " + (res.totalMs / 1000).toFixed(1) + " s)");
      res.run = r + 1;
      runs.push(res);
    });
  }
  var worst = { median: Math.max.apply(null, runs.map(function (x) { return x.median; })), p95: Math.max.apply(null, runs.map(function (x) { return x.p95; })) };
  return {
    what: "gameUpdate ms at speed " + opts.speedName + ", " + opts.gw + " wide, " + opts.ticks + " sand ticks per seed",
    dir: dir, commit: commitOf(dir), node: process.version, cpus: os.cpus().length,
    loadavg: [r3(load0), r3(os.loadavg()[0])], wallS: Math.round((Date.now() - t0) / 1000),
    seeds: runs,
    worst: worst,
    budget: { median: BUDGET.median, p95: BUDGET.p95, ok: worst.median <= BUDGET.median && worst.p95 <= BUDGET.p95 }
  };
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
  var base = { gw: opts.gw, ticks: opts.ticks, speed: opts.speed, warm: opts.warm, phases: false, journal: !!opts.journal };
  var got = {};   /* got[seed] = [{a, b}, ...] round by round */
  var k = 0;
  for (var r = 0; r < opts.rounds; r++) {
    opts.seeds.forEach(function (seed) {
      var order = k++ % 2 ? [1, 0] : [0, 1], two = {};
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
    what: "A/B, gameUpdate ms at speed " + opts.speedName + ", " + opts.gw + " wide, " + opts.ticks + " sand ticks per run, " + opts.rounds + " rounds, " +
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
      row.A[q] = { rounds: a, median: r3(median(a)), min: r3(Math.min.apply(null, a)) };
      row.B[q] = { rounds: b, median: r3(median(b)), min: r3(Math.min.apply(null, b)) };
      var rat = rows.map(function (p) { return p.b[q] / p.a[q]; });
      row.ratio[q] = spread(rat);
      row.ratio[q].ofMins = r3(row.B[q].min / row.A[q].min);
      gm[q] += Math.log(median(rat));
    });
    n++;
    row.sameWorld = rows.every(function (p) { return p.a.hash === p.b.hash; });
    row.hash = { A: rows[0].a.hash, B: rows[0].b.hash };
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
      "node harness/bench.js --ab DIR_A DIR_B [--rounds 4] [--lockstep] [--seeds ...] [--ticks ...]\n");
    return;
  }
  var opts = {
    seeds: o.seeds != null ? seedList(o.seeds) : [3, 7, 14],
    ticks: args.num(o.ticks, 20000), gw: args.num(o.gw, 1088), speed: args.num(o.speed, 4),
    warm: args.num(o.warm, 0), runs: Math.max(1, args.num(o.runs, 1)), rounds: Math.max(1, args.num(o.rounds, 4)),
    phases: !!o.phases, journal: !!o.journal, dir: o.dir, lockstep: !!o.lockstep
  };
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
