/* =====================================================================
   PLEASAND  --  harness/cli.js

   the harness from a shell, or over a pipe.

     node harness/cli.js run --seed 7 --ticks 600 --map 80x40
     node harness/cli.js run --seed 7 --until "g.rip > 0" --history 200
     node harness/cli.js run --seed 7 --ticks 4000 --watch rip=g.rip --watch pop=g.peasants.length --every 60
     node harness/cli.js serve --seed 7      # ndjson in, ndjson out

   `serve` keeps one village in memory and takes commands as json lines,
   which is the quick way to poke at a run without paying to load it
   again every time:

     {"id":1,"cmd":"step","n":600}
     {"id":2,"cmd":"state"}
     {"id":3,"cmd":"until","expr":"g.peasants.some(p => p.fire)"}
   ===================================================================== */
"use strict";
var fs = require("fs");
var readline = require("readline");
var lib = require("./harness.js");
var view = require("./inspect.js");
var open = lib.open;

var VERSION = "1.0";

/* -------------------------------------------------------------------
   arguments: --key value, --key=value, --flag. repeated keys become lists
   ------------------------------------------------------------------- */
function parseArgs(argv) {
  var out = { _: [] }, i, a, key, val, eq;
  for (i = 0; i < argv.length; i++) {
    a = argv[i];
    if (a === "--") { out._ = out._.concat(argv.slice(i + 1)); break; }
    if (a.slice(0, 2) !== "--") { out._.push(a); continue; }
    key = a.slice(2); val = true; eq = key.indexOf("=");
    if (eq >= 0) { val = key.slice(eq + 1); key = key.slice(0, eq); }
    else if (i + 1 < argv.length && argv[i + 1].slice(0, 2) !== "--") val = argv[++i];
    if (key in out) out[key] = [].concat(out[key], val);
    else out[key] = val;
  }
  return out;
}
function num(v, d) { if (v == null || v === true) return d; var n = Number(v); return isFinite(n) ? n : d; }
function list(v) { return v == null ? [] : (Array.isArray(v) ? v : [v]); }

/* id=expr, or just expr */
function splitWatch(s) {
  var m = /^([A-Za-z_][\w-]*)\s*=\s*(.+)$/.exec(String(s));
  return m ? { id: m[1], expr: m[2] } : { id: null, expr: String(s) };
}

function jsonSafe(v) {
  if (v === undefined) return null;
  try { return JSON.parse(JSON.stringify(v)); }
  catch (e) { return String(v); }
}
function shortError(e) {
  return { message: String(e && e.message || e), stack: String(e && e.stack || "").split("\n").slice(0, 6).join("\n"), tick: e && e.harness ? e.harness.tick : null };
}

/* -------------------------------------------------------------------
   a harness, configured from the command line
   ------------------------------------------------------------------- */
function makeHarness(o) {
  var h = open({ seed: num(o.seed, 1), record: String(o.record) !== "false" });
  if (num(o.history, 0) > 0) h.history(num(o.history, 24), { every: num(o["history-every"], 1) });
  list(o.break).forEach(function (e, i) { h.breakOn(e, { id: "break" + (i + 1), once: true }); });
  list(o["break-change"]).forEach(function (e, i) { h.breakOnChange(e, { id: "change" + (i + 1) }); });
  list(o.invariant).forEach(function (e, i) { h.invariant("inv" + (i + 1), e, { every: num(o["invariant-every"], 1) }); });
  if (o.std || o["standard-invariants"]) h.standardInvariants({ every: num(o["invariant-every"], 1), grid: num(o["grid-every"], 60) });
  list(o.watch).forEach(function (e, i) {
    var w = splitWatch(e);
    h.watch(w.expr, { id: w.id || ("w" + (i + 1)), every: num(o.every, 1) });
  });
  if (o.profile) h.profiler(true);
  if (o.give) h.give(String(o.give).split(","));
  return h;
}

/* -------------------------------------------------------------------
   run
   ------------------------------------------------------------------- */
function cmdRun(o) {
  var h = makeHarness(o), extra = {};
  var t0 = Date.now();
  try { return cmdRun2(h, o, extra, t0); }
  catch (e) {
    if (o["crash-out"] && h.crashReport()) fs.writeFileSync(String(o["crash-out"]), JSON.stringify(h.crashReport(), null, 2) + "\n");
    throw e;
  }
}
function cmdRun2(h, o, extra, t0) {
  var res;
  if (o.until === true) throw new Error("--until needs an expression");
  if (o.why === true) throw new Error("--why needs a peasant name or id");
  if (o.peasant === true) throw new Error("--peasant needs a name or id");
  if (o.find === true) throw new Error("--find needs a material");
  if (o.scenario) {
    var sc = JSON.parse(fs.readFileSync(String(o.scenario), "utf8"));
    res = h.replay(sc, { ticks: num(o.ticks, sc.ticks) });
    res.replay = true;
  } else if (o.until) {
    res = h.until(String(o.until), { max: num(o.ticks, 20000) });
  } else {
    res = h.step(num(o.ticks, 600));
  }
  res.wallMs = Date.now() - t0;

  if (o["trace-out"]) { fs.writeFileSync(String(o["trace-out"]), h.traceCSV() + "\n"); extra.traceFile = String(o["trace-out"]); }
  if (o.trace || o.watch) extra.traces = h.traceReport();
  if (o.profile) extra.profile = h.profile();
  if (list(o.eval).length) extra.eval = list(o.eval).map(function (e) { return { expr: e, value: jsonSafe(h.eval(e)) }; });
  if (o.find) extra.find = h.find(String(o.find), { limit: num(o.limit, 20) });
  if (o.why != null) extra.why = h.why(isNaN(Number(o.why)) ? String(o.why) : Number(o.why));
  if (o.peasant != null) extra.peasant = h.peasant(isNaN(Number(o.peasant)) ? String(o.peasant) : Number(o.peasant));
  if (o.cell) extra.cells = list(o.cell).map(function (c) { var p = String(c).split(","); return h.cell(Number(p[0]), Number(p[1])); });
  if (o.entities) extra.entities = h.entities();
  if (o.events) extra.events = h.events({ limit: num(o.events, 20) });
  if (o["scenario-out"] && !o.scenario) fs.writeFileSync(String(o["scenario-out"]), JSON.stringify(h.scenario(), null, 2) + "\n");
  if (o.checkpoint) extra.checkpoint = h.checkpoint(String(o.checkpoint));
  if (o["crash-out"] && h.crashReport()) fs.writeFileSync(String(o["crash-out"]), JSON.stringify(h.crashReport(), null, 2) + "\n");

  var wantMap = o.map !== undefined;
  if (o.json) {
    var out = { ok: true, seed: h.seed, report: res, state: h.state({ hash: true }) };
    Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
    if (wantMap) out.map = h.map(mapOpts(h, o));
    process.stdout.write(JSON.stringify(out) + "\n");
    return;
  }
  console.log(textReport(h, res, o, extra));
  if (wantMap) console.log("\n" + h.map(mapOpts(h, o)));
}

function mapOpts(h, o) {
  var mo = { overlay: !o["no-entities"], legend: !o["no-legend"] };
  var m = /^(\d+)x(\d+)$/.exec(String(o.map));
  mo.w = m ? Number(m[1]) : 80;
  mo.h = m ? Number(m[2]) : 40;
  if (o["map-at"]) {
    var p = String(o["map-at"]).split(",");
    mo.x = num(p[0], 0); mo.y = num(p[1], 0);
  } else {
    var first = (h.g.peasants || []).filter(function (p) { return !p.dead; })[0];
    mo.x = first ? Math.round(first.x) - (mo.w >> 1) : 60;
    mo.y = first ? Math.round(first.y) - Math.round(mo.h * 0.7) : 60;
  }
  if (o.scale) mo.scale = num(o.scale, 1);
  if (o.heat) mo.mode = "heat";
  return mo;
}

function textReport(h, res, o, extra) {
  extra = extra || {};
  var out = [], s = h.state();
  out.push("seed " + h.seed + " · tick " + res.tick + " · sand " + res.sandTick + " · " + res.time + "s");
  out.push("run  " + res.ticks + " ticks in " + ((res.wallMs || res.ms) / 1000).toFixed(2) + "s (" +
    (res.ticks ? ((res.wallMs || res.ms) / res.ticks).toFixed(2) : "0.00") + "ms/tick)");
  if (res.stopped) {
    if (res.stopped.kind === "condition") out.push("hit  " + (res.expr || "condition") + " at tick " + res.stopped.tick);
    else out.push("stop " + res.stopped.kind + (res.stopped.id ? " " + res.stopped.id : "") + " at tick " + res.stopped.tick +
      (res.stopped.expr ? "  [" + res.stopped.expr + "]" : ""));
    if (res.stopped.previous !== undefined) out.push("      " + JSON.stringify(res.stopped.previous) + " -> " + JSON.stringify(res.stopped.value));
    else if (res.stopped.value !== undefined) out.push("      value " + JSON.stringify(res.stopped.value));
    if (res.stopped.error) out.push("      " + res.stopped.error);
    if (res.stopped.context) {
      res.stopped.context.peasants.slice(0, 10).forEach(function (p) {
        out.push("      " + (p.dead ? "x " : "  ") + p.name + " #" + p.id + " " + p.state + " @ " + p.x + "," + p.y + (p.task ? " " + p.task.kind : "") + (p.fire ? " ON FIRE" : ""));
      });
    }
  } else if (res.hit) out.push("hit  " + res.expr + " at tick " + res.tick);
  else if (res.timeout) out.push("note  nothing happened within " + res.ticks + " ticks");

  out.push("world " + s.counts.alive + " alive · " + s.counts.dead + " dead · " + s.counts.ducks + " ducks · " +
    s.counts.sites + " sites (" + s.counts.sitesDone + " done) · " + s.counts.particles + " particles");
  out.push("ideas " + (s.ideas.length ? s.ideas.join(", ") : "none"));
  out.push("stuff " + s.materials.map(function (m) { return m.name + " " + m.count; }).join(", "));

  var evs = res.events || [];
  if (evs.length) {
    out.push("events" + (res.eventsTruncated ? " (last " + evs.length + ")" : ""));
    evs.slice(-(num(o.events, 8))).forEach(function (e) {
      out.push("  " + e.tick + " " + e.kind + " " + (e.text || e.title || (e.name ? e.name + " (" + e.cause + ")" : "") || e.key || ""));
    });
  }
  if (extra.traces) {
    out.push("trace");
    extra.traces.forEach(function (t) {
      out.push("  " + t.id + " [" + t.expr + "] n=" + t.samples + " first=" + fmt(t.first) + " last=" + fmt(t.last) +
        (t.min !== null ? " min=" + t.min + " max=" + t.max : "") + (t.nonFinite ? " NON-FINITE=" + t.nonFinite : "") +
        (t.changes.length ? " changes: " + t.changes.slice(0, 6).map(function (c) { return c.tick + ":" + fmt(c.from) + "->" + fmt(c.to); }).join(" ") : ""));
    });
  }
  if (extra.profile) {
    out.push("profile " + extra.profile.msPerTick + "ms/tick · " + extra.profile.phases.map(function (p) { return p.phase + " " + p.ms + "ms"; }).join(" · "));
  }
  if (extra.eval) extra.eval.forEach(function (e) { out.push("eval " + e.expr + " = " + JSON.stringify(e.value)); });
  if (extra.find) {
    out.push("find " + o.find + " (" + extra.find.length + ")");
    extra.find.slice(0, 12).forEach(function (c) { out.push("  " + c.x + "," + c.y + " " + c.T + "°"); });
  }
  if (extra.cells) extra.cells.forEach(function (c) { out.push("cell " + JSON.stringify(c)); });
  if (extra.peasant) out.push("peasant " + JSON.stringify(extra.peasant));
  if (extra.why) { out.push("why " + extra.why.peasant.name + " · " + extra.why.mood + " · doing " + JSON.stringify(extra.why.doing)); out.push(extra.why.around); }
  if (extra.checkpoint) out.push("checkpoint " + extra.checkpoint);
  if (extra.traceFile) out.push("trace written to " + extra.traceFile);
  return out.join("\n");
}
function fmt(v) {
  if (typeof v === "string") return JSON.stringify(v);
  if (v && typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/* -------------------------------------------------------------------
   serve: one village, many commands, ndjson both ways
   ------------------------------------------------------------------- */
var HANDLERS = {
  ping: function () { return { pong: true, version: VERSION }; },
  reset: function (h, r) { h.reset(r.seed == null ? h.seed : r.seed); return { seed: h.seed, state: h.state() }; },
  step: function (h, r) { return h.step(num(r.n, 1)); },
  run: function (h, r) { return h.step(num(r.n, 1)); },
  until: function (h, r) {
    if (!r.expr && !r.condition) throw new Error("until needs an expr");
    return h.until(r.expr || r.condition, { max: num(r.max, 20000) });
  },
  eval: function (h, r) { return h.eval(r.expr); },
  get: function (h, r) { return h.get(r.path); },
  set: function (h, r) { h.set(r.path, r.value); return { set: r.path }; },
  hash: function (h) { return { hash: h.hash(), tick: h.ticks, sandTick: h.g.tick }; },
  state: function (h, r) { return h.state({ hash: r.hash !== false, materials: num(r.materials, 10) }); },
  why: function (h, r) { return h.why(r.id == null ? r.sel : r.id); },
  describe: function (h, r) { return h.describe({ w: num(r.w, 64), h: num(r.h, 32), scale: num(r.scale, 1), map: r.map !== false }); },
  map: function (h, r) { return h.map({ x: r.x, y: r.y, w: r.w, h: r.h, scale: r.scale, mode: r.mode, overlay: r.overlay, legend: r.legend }); },
  entities: function (h) { return h.entities(); },
  peasants: function (h, r) { return h.peasants({ detail: !!r.detail }); },
  peasant: function (h, r) { return h.peasant(r.id == null ? r.sel : r.id); },
  ducks: function (h) { return h.ducks(); },
  duck: function (h, r) { return h.duck(r.id); },
  sites: function (h) { return h.sites(); },
  cell: function (h, r) { return h.cell(r.x, r.y); },
  find: function (h, r) { return h.find(r.mat, { limit: num(r.limit, 50), near: r.near, detail: !!r.detail }); },
  histogram: function (h, r) { return h.histogram({ limit: r.limit == null ? undefined : num(r.limit, 20) }); },
  events: function (h, r) { return h.events({ since: r.since, kind: r.kind, limit: r.limit }); },
  clearEvents: function (h) { h.clearEvents(); return { ok: true }; },
  tickRaw: function (h, r) { for (var i = 0; i < num(r.n, 1); i++) h.tickRaw(); return { tick: h.ticks, sandTick: h.g.tick }; },
  pause: function (h, r) { h.pause(r.on !== false); return { paused: !!h.g.paused }; },
  slow: function (h, r) { h.slow(r.on !== false); return { slow: !!h.g.slow }; },
  history: function (h, r) { h.history(num(r.n, 24), { every: num(r.every, 1) }); return { frames: h.frames(), max: num(r.n, 24) }; },
  historyOff: function (h) { h.historyOff(); return { ok: true }; },
  checkpoint: function (h, r) { return { id: h.checkpoint(r.label) }; },
  checkpoints: function (h) { return h.checkpoints(); },
  restore: function (h, r) { h.restore(r.id || r.checkpoint); return { tick: h.ticks, hash: h.hash() }; },
  dropCheckpoint: function (h, r) { h.dropCheckpoint(r.id); return { ok: true }; },
  clearCheckpoints: function (h) { h.clearCheckpoints(); return { ok: true }; },
  back: function (h, r) { return h.back(num(r.n, 1)); },
  frames: function (h) { return h.frames(); },
  watch: function (h, r) { return { id: h.watch(r.expr, { id: r.id, every: num(r.every, 1) }) }; },
  unwatch: function (h, r) { h.unwatch(r.id); return { ok: true }; },
  trace: function (h, r) { return { ids: h.trace(r.exprs || r.watch || r.expr, { every: num(r.every, 1), clear: r.clear !== false }) }; },
  traceReport: function (h) { return h.traceReport(); },
  traceRows: function (h) { return h.traceRows(); },
  traceCSV: function (h) { return h.traceCSV(); },
  clearTrace: function (h) { h.clearTrace(); return { ok: true }; },
  breakOn: function (h, r) { if (!r.expr) throw new Error("breakOn needs an expr"); return { id: h.breakOn(r.expr, { id: r.id, once: r.once !== false }) }; },
  breakOnChange: function (h, r) { if (!r.expr) throw new Error("breakOnChange needs an expr"); return { id: h.breakOnChange(r.expr, { id: r.id }) }; },
  clearBreaks: function (h) { h.clearBreaks(); return { ok: true }; },
  invariant: function (h, r) { if (!r.expr) throw new Error("invariant needs an expr"); h.invariant(r.id, r.expr, { every: num(r.every, 1) }); return { ok: true }; },
  standardInvariants: function (h, r) { h.standardInvariants({ every: num(r.every, 1), grid: num(r.grid, 60) }); return { ok: true }; },
  clearInvariants: function (h) { h.clearInvariants(); return { ok: true }; },
  profiler: function (h, r) { h.profiler(r.on !== false); return { on: h._profOn }; },
  profile: function (h) { return h.profile(); },
  clearProfile: function (h) { h.clearProfile(); return { ok: true }; },
  place: function (h, r) { h.place(r.x, r.y, r.mat); return { ok: true }; },
  fill: function (h, r) { h.fill(r.x, r.y, r.w, r.h, r.mat); return { ok: true }; },
  line: function (h, r) { h.paintLine(r.x0, r.y0, r.x1, r.y1, r.mat); return { ok: true }; },
  disc: function (h, r) { h.paintDisc(r.cx, r.cy, r.r, r.mat); return { ok: true }; },
  erase: function (h, r) { h.erase(r.x, r.y, r.w, r.h); return { ok: true }; },
  ignite: function (h, r) { h.ignite(r.x, r.y, { spread: r.spread }); return { ok: true }; },
  addHeat: function (h, r) { h.addHeat(r.x, r.y, num(r.delta, 100)); return { ok: true }; },
  setTemp: function (h, r) { h.setTemp(r.x, r.y, num(r.t, 20)); return { ok: true }; },
  heatBrush: function (h, r) { h.heatBrush(r.x, r.y, r.dir === -1 ? -1 : 1, r.size); return { ok: true }; },
  spawnPeasant: function (h, r) { return h.spawnPeasant(r.x, r.y, { quiet: !!r.quiet }); },
  spawnDuck: function (h, r) { return h.spawnDuck(r.x, r.y, { kind: r.kind }); },
  give: function (h, r) { h.give(r.ideas); return { ok: true }; },
  mouse: function (h, r) { h.mouse(r.x, r.y); return { ok: true }; },
  select: function (h, r) { h.select(r.sel); return { sel: h.pick[h.g.sel].name }; },
  key: function (h, r) { h.key(r.k); return { ok: true }; },
  wheel: function (h, r) { h.wheel(num(r.d, 1)); return { ok: true }; },
  down: function (h, r) { h.down(r.btn); return { ok: true }; },
  up: function (h) { h.up(); return { ok: true }; },
  tap: function (h, r) { h.tap(r.x, r.y); return { ok: true }; },
  drag: function (h, r) { h.drag(r.x0, r.y0, r.x1, r.y1, { ticks: r.ticks, btn: r.btn }); return { tick: h.ticks }; },
  flick: function (h, r) { h.flick(num(r.vx, 0), num(r.vy, 0)); return { ok: true }; },
  scenario: function (h) { return h.scenario(); },
  replay: function (h, r) { return h.replay(r.scenario, { ticks: r.ticks }); },
  crash: function (h) { return h.crashReport(); },
  call: function (h, r) { return h.game[r.fn].apply(null, r.args || []); }
};

function dispatch(h, req) {
  var cmd = req.cmd || req.do;
  if (!cmd) throw new Error("no cmd");
  if (cmd === "quit" || cmd === "exit") return { quit: true };
  var fn = HANDLERS[cmd];
  if (!fn) throw new Error("unknown command: " + cmd + " (try help)");
  return fn(h, req);
}

function cmdServe(o) {
  /* the reader may hang up first: that is not a crash */
  process.stdout.on("error", function (e) { if (e && e.code === "EPIPE") process.exit(0); throw e; });
  var h = makeHarness(o);
  var input = o.script ? fs.createReadStream(String(o.script)) : process.stdin;
  var rl = readline.createInterface({ input: input, terminal: false });
  var closed = false;
  function send(obj) { process.stdout.write(JSON.stringify(obj) + "\n"); }
  function handle(line) {
    line = String(line).trim();
    if (!line || line.charAt(0) === "#") return;
    var req;
    try { req = JSON.parse(line); } catch (e) { send({ ok: false, error: { message: "bad json: " + e.message } }); return; }
    if (req.cmd === "help" || req.do === "help") {
      send({ id: req.id, ok: true, result: Object.keys(HANDLERS).sort() }); return;
    }
    var result;
    try {
      result = dispatch(h, req);
      if (result && result.quit) {
        send({ id: req.id, ok: true, result: { bye: true } });
        closed = true; rl.close();
        setImmediate(function () { process.exit(0); });
        return;
      }
      send({ id: req.id == null ? null : req.id, ok: true, result: jsonSafe(result) });
    } catch (e) {
      send({ id: req.id == null ? null : req.id, ok: false, error: shortError(e), state: h.state() });
    }
  }
  rl.on("line", handle);
  rl.on("close", function () { if (!closed) process.exit(0); });
}

/* -------------------------------------------------------------------
   entry
   ------------------------------------------------------------------- */
function help() {
  console.log([
    "PLEASAND harness " + VERSION + " -- run the game with no screen",
    "",
    "  node harness/cli.js run [options]        load a village, play it, report back",
    "  node harness/cli.js serve [options]      keep one village; json lines in and out",
    "  node harness/cli.js selftest             check the harness itself",
    "",
    "run options",
    "  --seed N                 which village (default 1)",
    "  --ticks N                how many ticks (default 600; with --until it is the cap)",
    "  --until EXPR             play until an expression in the game's scope is true",
    "  --std                    install the standard invariants (NaN, bounds, counts)",
    "  --invariant EXPR         another thing that must always be true",
    "  --break EXPR             stop the run when an expression first becomes true",
    "  --break-change EXPR      stop when an expression's value changes",
    "  --history N              keep the last N tick-states, for rewinding",
    "  --watch name=EXPR        sample an expression every --every ticks (repeatable)",
    "  --every N                watch interval (default 1)",
    "  --trace-out FILE         write the samples as csv",
    "  --profile                time each phase of the tick",
    "  --map [WxH]              print an ascii map (default 80x40)",
    "  --map-at x,y             where the map starts (default: the first peasant)",
    "  --scale N                one map character per N cells",
    "  --heat                   the map shows temperature instead of material",
    "  --eval EXPR              evaluate and print (repeatable)",
    "  --cell x,y               read a cell (repeatable)",
    "  --find MAT               find cells of a material",
    "  --peasant ID|NAME        show a peasant",
    "  --why ID|NAME            what that peasant is doing, feeling, and standing in",
    "  --entities               show every peasant, duck and site",
    "  --events N               include the last N events",
    "  --scenario FILE          replay a recorded scenario",
    "  --scenario-out FILE      write this run as a replayable scenario",
    "  --give a,b,c             teach the village ideas",
    "  --json                   one line of json instead of prose",
    "",
    "serve: send {\"id\":1,\"cmd\":\"...\"} lines. cmd=help lists them.",
    "       {\"cmd\":\"step\",\"n\":600}   {\"cmd\":\"until\",\"expr\":\"g.rip > 0\"}",
    "       {\"cmd\":\"state\"}           {\"cmd\":\"map\",\"x\":100,\"y\":80,\"w\":80,\"h\":40}",
    "       {\"cmd\":\"eval\",\"expr\":\"g.peasants.map(p => p.name)\"}",
    "",
    "library: var h = require('./harness').open({ seed: 7 }); h.step(600); h.describe();"
  ].join("\n"));
}

function main() {
  var cmd = process.argv[2] || "help", o = parseArgs(process.argv.slice(3)), failed = 0;
  try {
    if (cmd === "run") return cmdRun(o);
    if (cmd === "serve") return cmdServe(o);
    if (cmd === "selftest") { failed = require("./selftest.js").run(o); process.exit(failed ? 1 : 0); }
    if (cmd === "help" || cmd === "-h" || cmd === "--help") return help();
    if (cmd === "replay") {
      o.scenario = o.scenario || o._[0];
      if (!o.scenario) throw new Error("replay needs a scenario file");
      return cmdRun(o);
    }
    console.error("unknown command: " + cmd + "\ntry: node harness/cli.js help");
    process.exit(2);
  } catch (e) {
    if (o.json) process.stdout.write(JSON.stringify({ ok: false, error: shortError(e) }) + "\n");
    else console.error("harness: " + (e && e.message || e));
    process.exit(1);
  }
}

main();
