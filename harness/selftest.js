/* =====================================================================
   PLEASAND  --  harness/selftest.js

   does the harness still tell the truth: determinism, snapshots, rewinds,
   tracing, breakpoints, invariants, profiling, painting, replay, and the
   two front doors (library and cli).

     node harness/cli.js selftest
   ===================================================================== */
"use strict";
var path = require("path");
var cp = require("child_process");
var lib = require("./harness.js");
var open = lib.open;

var tests = [], failed = 0, only = null;

function test(name, fn) { tests.push({ name: name, fn: fn }); }
function check(ok, what) { if (!ok) throw new Error(what); }
function eq(a, b, what) { if (a !== b) throw new Error(what + " (got " + JSON.stringify(a) + ", wanted " + JSON.stringify(b) + ")"); }

/* --- the simulation is the simulation ------------------------------- */
test("loads the game with no browser, no canvas and no sound", function () {
  var h = open({ seed: 1 });
  check(h.g && h.g.gw > 100 && h.g.gh > 100, "no grid");
  check(h.g.peasants.length > 0, "no peasants");
  check(typeof h.fn("sandStep") === "function", "no sandStep");
  check(h.state().counts.alive > 0, "state has nobody alive");
});

test("the same seed is the same village, twice over", function () {
  var a = open({ seed: 42 }), b = open({ seed: 42 }), c = open({ seed: 43 });
  a.step(240); b.step(240); c.step(240);
  eq(a.hash(), b.hash(), "two runs of seed 42 drifted");
  check(a.hash() !== c.hash(), "seed 43 played out the same as seed 42");
});

test("debugging does not change the game", function () {
  var a = open({ seed: 9 }), b = open({ seed: 9 });
  b.watch("g.rip"); b.breakOn("false"); b.invariant("always", "true"); b.standardInvariants();
  a.step(180); b.step(180);
  eq(a.hash(), b.hash(), "hooks changed the run");
});

/* --- time travel ---------------------------------------------------- */
test("a snapshot restored carries on exactly as it would have", function () {
  var h = open({ seed: 5 });
  h.step(90);
  var s = h.snapshot(), tick = h.ticks, rng = h.rng();
  h.step(60);
  var expected = h.hash();
  h.restore(s);
  eq(h.ticks, tick, "tick not restored");
  eq(h.rng(), rng, "dice not restored");
  h.step(60);
  eq(h.hash(), expected, "restored run diverged");
});

test("history rewinds tick-exactly", function () {
  var h = open({ seed: 5 });
  h.history(16);
  h.step(10);
  var h10 = h.hash();
  h.step(4);
  check(h.hash() !== h10, "(the test needs the run to move)");
  h.back(4);
  eq(h.ticks, 10, "back(4) landed on the wrong tick");
  eq(h.hash(), h10, "back(4) restored the wrong world");
  h.step(1);
  eq(h.ticks, 11, "could not step on after a rewind");
});

/* --- stopping ------------------------------------------------------- */
test("until stops on the tick an expression comes true", function () {
  var h = open({ seed: 2 });
  var r = h.until("g.tick >= 25", { max: 100 });
  check(r.hit, "never hit");
  eq(r.tick, 25, "stopped on the wrong tick");
});

test("a breakpoint stops the run, once", function () {
  var h = open({ seed: 2 });
  h.breakOn("g.tick === 12", { id: "twelve" });
  var r = h.run(100);
  check(r.stopped && r.stopped.kind === "breakpoint", "no breakpoint: " + JSON.stringify(r.stopped));
  eq(r.stopped.id, "twelve", "wrong breakpoint");
  eq(r.tick, 12, "wrong tick");
  check(r.stopped.context && r.stopped.context.peasants.length > 0, "no context at the stop");
  r = h.run(20);
  check(!r.stopped, "the once-only breakpoint fired again");
});

test("break-on-change reports both values", function () {
  var h = open({ seed: 2 });
  h.breakOnChange("Math.round(g.peasants[0].x)", { id: "walk" });
  var r = h.run(400);
  check(r.stopped && r.stopped.change, "no change: " + JSON.stringify(r.stopped));
  check(r.stopped.previous !== r.stopped.value, "same value on both sides");
});

test("an invariant stops on a broken world", function () {
  var h = open({ seed: 2 });
  h.standardInvariants({ temps: 1 });
  h.step(5);
  h.g.T[1234] = NaN;
  var r = h.run(10);
  check(r.stopped && r.stopped.kind === "invariant", "no invariant stop");
  eq(r.stopped.id, "std:temps", "wrong invariant");
});

/* --- tracing and profiling ------------------------------------------ */
test("a trace samples by interval and reports the changes", function () {
  var h = open({ seed: 2 });
  h.trace({ tick: "g.tick", people: "g.peasants.length" }, { every: 5 });
  h.step(50);
  var rep = h.traceReport();
  eq(rep.length, 2, "two series expected");
  eq(rep[0].samples, 10, "sampled the wrong number of times");
  eq(rep[0].first, 5, "first sample should be tick 5");
  eq(rep[0].last, 50, "last sample should be tick 50");
  var rows = h.traceRows();
  eq(rows.length, 10, "rows not merged by tick");
  check(h.traceCSV().indexOf("tick,people") >= 0, "csv header");
});

test("the profiler sees the phases of a tick", function () {
  var h = open({ seed: 2 });
  h.profiler(true);
  h.step(30);
  var prof = h.profile();
  h.profiler(false);
  var sand = prof.phases.filter(function (p) { return p.phase === "sandStep"; })[0];
  var people = prof.phases.filter(function (p) { return p.phase === "peasantsStep"; })[0];
  check(sand && sand.calls === 30, "sandStep calls: " + (sand && sand.calls));
  check(people && people.calls === 30, "peasantsStep calls");
  check(prof.msPerTick > 0, "no time per tick");
});

/* --- events and inspection ----------------------------------------- */
test("events come out of the ticker, deaths and discoveries", function () {
  var h = open({ seed: 2 });
  h.give("bucket");
  h.game.feed(h.g, "hello from the harness", "#fff");
  h.game.pDie(h.g, h.g.peasants[0], "fire");
  h.game.achieve(h.g, "ninja");
  var evs = h.events();
  check(evs.some(function (e) { return e.kind === "feed" && /hello from the harness/.test(e.text); }), "no feed event");
  check(evs.some(function (e) { return e.kind === "death" && e.cause === "fire"; }), "no death event");
  check(evs.some(function (e) { return e.kind === "achieve" && e.key === "ninja"; }), "no achievement event");
});

test("the census, a cell, a search and a map", function () {
  var h = open({ seed: 2 });
  h.step(1);
  var hist = h.histogram({ limit: 4 });
  check(hist.length === 4 && hist[0].count > 0, "no histogram");
  var stone = h.find("stone", { limit: 5 });
  eq(stone.length, 5, "find did not find");
  var c = h.cell(stone[0].x, stone[0].y);
  eq(c.mat, h.mat.STONE, "the cell found is not stone");
  check(/STONE/.test(c.readout), "readout: " + c.readout);
  var m = h.map({ x: 0, y: 100, w: 48, h: 12 });
  check(m.indexOf("seed 2") >= 0, "map has no header");
  check(m.indexOf("key") >= 0, "map has no key");
  check(h.describe({ map: false }).indexOf("people") >= 0, "describe");
});

test("painting puts things in the grid, and finding them finds them", function () {
  var h = open({ seed: 2 });
  h.fill(120, 20, 8, 4, "WOOD");
  eq(h.cell(120, 20).mat, h.mat.WOOD, "fill missed");
  eq(h.find("wood", { limit: 40, x: 120, w: 8, y: 20, h: 4 }).length, 32, "fill was the wrong size");
  h.paintDisc(140, 30, 3, "GOLD");
  check(h.find("gold", { limit: 100, x: 137, w: 7, y: 27, h: 7 }).length > 10, "disc missed");
  h.place(1, 1, "SALTWATER");
  eq(h.cell(1, 1).mat, h.mat.SALTWATER, "place missed");
  h.erase(120, 20, 8, 4);
  eq(h.cell(120, 20).mat, 0, "erase missed");
});

test("the picker, the keys and a drag go through the real input code", function () {
  var h = open({ seed: 2 });
  h.select("WOOD");
  eq(h.pick[h.g.sel].name, "WOOD", "select did not select");
  h.mouse(100, 40);
  h.down(0);
  h.drag(100, 40, 140, 40, { ticks: 4 });
  check(h.find("wood", { limit: 1, x: 100, w: 40, y: 38, h: 4 }).length > 0, "drag painted nothing");
  h.key("t");
  check(h.g.thermal, "T did not turn on thermal");
  h.key(" ");
  check(h.g.paused, "space did not pause");
});

/* --- reproducing ---------------------------------------------------- */
test("a scenario replays to the same hash", function () {
  var h = open({ seed: 11 });
  h.fill(150, 30, 12, 6, "SAND");
  h.spawnPeasant(150, 30);
  h.step(30);
  h.setTemp(152, 33, 900);
  h.tap(155, 35);
  h.select("WOOD");
  h.mouse(150, 28); h.down(0);
  h.drag(150, 28, 156, 28, { ticks: 3 });
  h.key("]");
  h.step(45);
  var sc = h.scenario(), hash = h.hash();
  check(sc.ops.length >= 4, "scenario recorded nothing");
  var r = h.replay(sc);
  eq(r.ticks, sc.ticks, "replay stopped at the wrong tick");
  eq(r.hash, hash, "replay drifted");
  check(r.matches, "replay did not match its own recorded hash");
});

test("a crash keeps the run that caused it", function () {
  var h = open({ seed: 2 });
  h.step(5);
  h.set("sandStep", null);
  var err = null;
  try { h.run(10); } catch (e) { err = e; }
  check(err, "no error");
  var rep = h.crashReport();
  check(rep && rep.tick === 6, "crash tick: " + (rep && rep.tick));
  check(rep.recentOps && rep.recentOps.length > 0, "no recent ops");
  check(rep.scenario && rep.scenario.seed === 2, "no scenario in the crash report");
  check(rep.map && rep.map.length > 0, "no map in the crash report");
});

test("a diff names what moved, what died and what got hot", function () {
  var h = open({ seed: 6 });
  var a = h.snapshot();
  h.fill(150, 40, 6, 6, "LAVA");
  h.step(40);
  var d = h.diff(a);
  check(d.ticks.from === 0 && d.ticks.to === 40, "wrong tick span: " + JSON.stringify(d.ticks));
  check(d.scalar.tick, "tick not in the scalar diff");
  check(d.materials.some(function (m) { return m.name === "LAVA" && m.delta > 0; }), "lava not in the material diff");
  check(d.peasants.changed.length > 0, "nobody moved");
  var cp = h.checkpoint("later");
  check(h.diff(a, cp).ticks.to === h.ticks, "diff by checkpoint id");
});

test("a drag does not swallow a breakpoint", function () {
  var h = open({ seed: 2 });
  h.breakOn("g.tick >= 2", { id: "two" });
  h.select("WOOD");
  h.mouse(120, 40); h.down(0);
  h.drag(120, 40, 126, 40, { ticks: 4 });
  var r = h.step(1);
  check(r.stopped && r.stopped.id === "two", "the breakpoint was lost inside the drag");
});

/* --- the front doors ------------------------------------------------ */
test("the cli runs a village and answers in json", function () {
  var out = cp.execFileSync(process.execPath, [path.join(__dirname, "cli.js"), "run", "--seed", "3", "--ticks", "40", "--json"], { encoding: "utf8" });
  var o = JSON.parse(out);
  check(o.ok && o.report.tick === 40, "bad run report: " + out.slice(0, 200));
  check(o.state && o.state.hash, "no state hash");
});

test("the cli maps, traces and replays", function () {
  var dir = require("fs").mkdtempSync(path.join(require("os").tmpdir(), "pleasand-"));
  var sc = path.join(dir, "scenario.json");
  var csv = path.join(dir, "trace.csv");
  cp.execFileSync(process.execPath, [path.join(__dirname, "cli.js"), "run", "--seed", "4", "--ticks", "30",
    "--watch", "people=g.peasants.length", "--every", "10", "--trace-out", csv, "--scenario-out", sc,
    "--map", "40x12", "--json"], { encoding: "utf8" });
  check(require("fs").readFileSync(csv, "utf8").indexOf("tick,people") >= 0, "no trace file");
  var out = cp.execFileSync(process.execPath, [path.join(__dirname, "cli.js"), "replay", sc, "--json"], { encoding: "utf8" });
  var o = JSON.parse(out);
  check(o.ok && o.report.replay, "replay did not run");
  check(o.report.ticks === 30, "replay tick count");
});

test("serve takes json lines and keeps the village between them", function () {
  var input = [
    JSON.stringify({ id: 1, cmd: "step", n: 10 }),
    JSON.stringify({ id: 2, cmd: "eval", expr: "g.tick" }),
    JSON.stringify({ id: 3, cmd: "fill", x: 130, y: 30, w: 4, h: 4, mat: "WOOD" }),
    JSON.stringify({ id: 4, cmd: "cell", x: 130, y: 30 }),
    JSON.stringify({ id: 5, cmd: "map", x: 128, y: 28, w: 12, h: 6 }),
    JSON.stringify({ id: 6, cmd: "state" })
  ].join("\n") + "\n";
  var out = cp.execFileSync(process.execPath, [path.join(__dirname, "cli.js"), "serve", "--seed", "2"], { input: input, encoding: "utf8" });
  var lines = out.trim().split("\n").map(function (l) { return JSON.parse(l); });
  eq(lines.length, 6, "expected six replies");
  eq(lines[1].result, 10, "the village did not keep its tick");
  eq(lines[3].result.name, "WOOD", "the fill did not survive to the next command");
  check(lines[4].result.indexOf("W") >= 0, "no wood on the map");
  check(lines[5].result.counts.alive > 0, "no people");
});

test("until can see the harness itself, not just the game", function () {
  var h = open({ seed: 2 });
  var r = h.until("h.ticks >= 12 && g.tick >= 12", { max: 50 });
  check(r.hit, "no hit");
  eq(r.tick, 12, "wrong tick");
});

test("serve covers the debugging surface, not just stepping", function () {
  var script = [
    { id: 1, cmd: "step", n: 20 },
    { id: 2, cmd: "checkpoint", label: "a" },
    { id: 3, cmd: "fill", x: 140, y: 40, w: 5, h: 5, mat: "WOOD" },
    { id: 4, cmd: "step", n: 10 },
    { id: 5, cmd: "back", n: 5 },
    { id: 6, cmd: "restore", id: "a" },
    { id: 7, cmd: "trace", exprs: { rip: "g.rip" }, every: 2 },
    { id: 8, cmd: "step", n: 10 },
    { id: 9, cmd: "traceReport" },
    { id: 10, cmd: "breakOn", expr: "g.tick > 100", id: "late" },
    { id: 11, cmd: "run", n: 200 },
    { id: 12, cmd: "standardInvariants" },
    { id: 13, cmd: "profiler", on: true },
    { id: 14, cmd: "step", n: 4 },
    { id: 15, cmd: "profile" },
    { id: 16, cmd: "map", x: 130, y: 35, w: 20, h: 8, mode: "heat" },
    { id: 17, cmd: "find", mat: "stone", limit: 3 },
    { id: 18, cmd: "why", id: 1 },
    { id: 19, cmd: "describe", map: false },
    { id: 20, cmd: "scenario" },
    { id: 21, cmd: "state" }
  ].map(function (r) { return JSON.stringify(r); }).join("\n") + "\n";
  var out = cp.execFileSync(process.execPath, [path.join(__dirname, "cli.js"), "serve", "--seed", "4", "--history", "24"],
    { input: script, encoding: "utf8" });
  var lines = out.trim().split("\n").map(function (l) { return JSON.parse(l); });
  lines.forEach(function (l) {
    check(l.ok, "command " + l.id + " failed: " + JSON.stringify(l.error || l));
  });
  eq(lines[4].result.tick, 25, "back landed on the wrong tick");
  eq(lines[5].result.tick, 20, "restore lost its tick");
  check(lines[8].result.length === 1 && lines[8].result[0].samples === 5, "trace report");
  check(lines[10].result.stopped && lines[10].result.stopped.id === "late", "breakpoint over serve");
  check(lines[14].result.phases.length > 0, "profile over serve");
  check(lines[15].result.indexOf("heat ") >= 0, "heat map key");
  eq(lines[16].result.length, 3, "find limit");
  check(lines[17].result.peasant && lines[17].result.around, "why");
  check(lines[19].result && lines[19].result.ops, "scenario");
});

/* --- go ------------------------------------------------------------- */
function run(opts) {
  opts = opts || {};
  only = opts.only || (opts._ && opts._[0]) || null;
  var t0 = Date.now();
  console.log("harness selftest · " + path.join(__dirname, ".."));
  tests.forEach(function (t) {
    if (only && t.name.indexOf(only) < 0) return;
    var t1 = Date.now();
    try {
      t.fn();
      console.log("ok    " + t.name + "  (" + ((Date.now() - t1) / 1000).toFixed(1) + "s)");
    } catch (e) {
      failed++;
      console.log("FAIL  " + t.name + "\n      " + (e && e.message));
      if (opts.verbose && e && e.stack) console.log(e.stack);
    }
  });
  console.log((failed ? failed + " failed" : "all " + tests.length + " passed") + " in " + ((Date.now() - t0) / 1000).toFixed(0) + "s");
  if (require.main === module) process.exit(failed ? 1 : 0);
  return failed;
}

module.exports = { run: run, tests: tests };

if (require.main === module) run();
