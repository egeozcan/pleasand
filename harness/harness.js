/* =====================================================================
   PLEASAND  --  harness/harness.js

   a steering wheel for a game with no screen.

   one object that loads the game headless, steps it a tick at a time,
   paints, throws peasants, reads the whole world back, and — when you
   are chasing something — traces values, stops on a condition, rewinds,
   profiles, checks invariants and hands you a reproducible scenario.

     var h = open({ seed: 7 });
     h.until("g.rip > 0");          // play until somebody dies
     h.describe();                   // what, where, who
     h.back(10);                     // ten ticks before it happened
     h.watch("g.rip"); h.step(20); h.traceReport();   // and watch it again

   nothing here renders. there is no canvas, no audio, and the clock only
   moves when the harness says so, which is what makes a run repeatable.
   ===================================================================== */
"use strict";
var fs = require("fs");
var loader = require("./loader.js");
var snap = require("./snapshot.js");
var view = require("./inspect.js");

var PHASES = ["sandPaint", "toolHold", "sandStep", "partStep", "peasantsStep", "ducksStep", "heatStep"];
var TICK_MS = 1000 / 60;
var DEFAULT_HISTORY = 24;
var EVENT_MAX = 4000;

function open(opts) { return new Harness(opts); }

function Harness(opts) {
  opts = opts || {};
  this.host = {};
  this.loaded = loader.loadGame({ seed: opts.seed == null ? 1 : opts.seed, startTime: opts.startTime || 0, host: this.host });
  this._eval = this.loaded.eval;
  if (!this.loaded.boot()) throw new Error("harness: the game did not boot (no DOMContentLoaded handler)");
  this.g = this._eval("g");
  this._eval("SAVE_J.on = false");   /* the browser's save journal: the harness keeps its own log */
  this.origin = null;                /* set when the village came from a save file */
  this.seed = this.loaded.seed;
  this.ticks = 0;
  this.recording = opts.record !== false;
  this.ops = [];
  this.eventLog = [];
  this.eventMax = EVENT_MAX;
  this.achSeen = Object.create(null);
  this.watches = [];
  this.breaks = [];
  this.invariants = [];
  this.checkpointList = [];
  this.lastError = null;
  this._replaying = false;
  this._profOn = false;
  this._profTotals = {};
  this._profStart = 0;
  this._hist = { on: false, every: 1, max: 0, frames: [] };
  this.trail = [];
  this._trailTick = -1;
  this._refresh();

  var self = this;
  this.host.onHook = function (tag, args) { self._onHook(tag, args); };
  this.host.cpu = function () { return Number(process.hrtime.bigint()) / 1e6; };
  this.host.prof = { add: function (name, ms) {
    var t = self._profTotals[name] || (self._profTotals[name] = { ms: 0, calls: 0 });
    t.ms += ms; t.calls++;
  } };
  this.host.profWrap = function (orig, name) {
    return function () {
      var t0 = self.host.cpu();
      var r = orig.apply(null, arguments);
      self.host.prof.add(name, self.host.cpu() - t0);
      return r;
    };
  };
  this.host.orig = {};

  this._hookEvents();

  var ev = this._eval;
  this.game = new Proxy({}, {
    get: function (t, k) {
      if (typeof k === "symbol" || k === "then" || k === "toJSON" || k === "inspect") return undefined;
      return ev(String(k));
    },
    has: function () { return true; }
  });
}

/* -------------------------------------------------------------------
   1. THE BASICS: names, expressions, the dice, the clock
   ------------------------------------------------------------------- */
Harness.prototype._refresh = function () {
  this._update = this._eval("gameUpdate");
  this._trailRow = this._eval("saveTrailRow");
  this.mat = this._eval("MAT");
  this.matName = this._eval("MAT_NAME");
  this.pick = this._eval("PICK");
  this.P_HATS = this._eval("P_HATS");
  this.IDEAS = this._eval("IDEAS");
  this.VW = this._eval("VW");
  this.PANEL = this._eval("PANEL");
  this.CELL = this._eval("CELL");
  this.PLAY_Y = this._eval("PLAY_Y");
  this.NMAT = this._eval("NMAT");
  this._matTable = null;
  return this;
};

/* anything in any script, by name: h.fn("mPlanMine") */
Harness.prototype.fn = function (name) { return this._eval(name); };
Harness.prototype.api = Harness.prototype.fn;

/* an expression, evaluated in the game's own scope: h.eval("g.rip") */
Harness.prototype.eval = function (expr) { return this._eval(String(expr)); };

/* an expression as a reusable function of (g, harness, tick) */
Harness.prototype.compile = function (expr) {
  return this._eval("(function (g, h, tick) { return (" + String(expr) + "); })");
};

Harness.prototype.get = function (path) { return this._eval(String(path)); };
Harness.prototype.set = function (path, value) {
  this._op("set", { path: String(path), value: value });
  return this._doSet(path, value);
};
Harness.prototype._doSet = function (path, value) {
  this._eval(String(path) + " = " + JSON.stringify(value));
  return this;
};

Harness.prototype.rng = function () { return this.loaded.rng.state; };
Harness.prototype.setRng = function (state) { this.loaded.rng.state = state; return this; };

Harness.prototype.time = function () { return this.g.t; };
Harness.prototype.sandTick = function () { return this.g.tick; };

/* an exact fingerprint of the simulation: the grid, the dice, the people.
   two runs that lead to the same hash are the same run (~3ms) */
Harness.prototype.hash = function () {
  var g = this.g, h = 0x811c9dc5;
  function mix(x) { h = Math.imul(h ^ (x | 0), 16777619) >>> 0; }
  function mixArr(a) { for (var i = 0; i < a.length; i++) mix(a[i]); }
  function mixF(a) { mixArr(new Uint32Array(a.buffer, a.byteOffset, a.length)); }
  function mixStr(s) { for (var i = 0; i < s.length; i++) mix(s.charCodeAt(i)); }
  mixArr(g.m); mixArr(g.aux); mixArr(g.sh); mixArr(g.vy); mixArr(g.stamp); mixF(g.T); mixF(g.lat);
  if (g.bmark) mixArr(g.bmark);
  mix(g.tick); mix(Math.round(g.t * 1e6)); mix(this.loaded.rng.state);
  (g.peasants || []).forEach(function (p) {
    mix(p.id); mix(p.dead ? -1 : 1); mix(Math.round(p.x * 4096)); mix(Math.round(p.y * 4096));
    mixStr(String(p.state)); mix(p.task ? 1 : 0); if (p.task) mixStr(String(p.task.kind));
  });
  (g.ducks || []).forEach(function (d) {
    mix(d.id); mix(d.dead ? -1 : 1); mix(Math.round(d.x * 4096)); mix(Math.round(d.y * 4096)); mixStr(String(d.state));
  });
  (g.sites || []).forEach(function (s) { mix(s.id); mix(s.done ? 1 : 0); mix(s.repair ? 1 : 0); });
  mix(g.np); mix(g.rip); mix((g.peasants || []).length); mix((g.ducks || []).length);
  return ("00000000" + h.toString(16)).slice(-8);
};

/* -------------------------------------------------------------------
   2. TIME: stepping, running, stopping on a condition
   ------------------------------------------------------------------- */
Harness.prototype._tick = function () {
  this.ticks++;
  this.loaded.clock.t += TICK_MS;
  this._update(this.g, 1 / 60);
};

Harness.prototype._loop = function (n, opts) {
  opts = opts || {};
  var from = this.ticks, e0 = this.eventLog.length, t0 = Date.now(), i = 0;
  var stopped = null, error = null;
  n = Math.max(0, Math.floor(n || 0));
  for (; i < n; i++) {
    try { this._tick(); } catch (e) { error = e; break; }
    var s = this._afterTick();
    if (s) { stopped = s; i++; break; }
    if (opts.cond) {
      var hit;
      try { hit = opts.cond(this.g, this, this.ticks); } catch (e) { error = e; break; }
      if (hit) { stopped = { kind: "condition", tick: this.ticks, value: hit === true ? true : hit }; i++; break; }
    }
  }
  var evs = this.eventLog.slice(e0), truncated = evs.length > 24;
  if (truncated) evs = evs.slice(-24);
  var report = {
    from: from, to: this.ticks, ticks: this.ticks - from,
    tick: this.ticks, sandTick: this.g.tick, time: view.round(this.g.t, 2),
    ms: Date.now() - t0, stopped: stopped, events: evs, eventsTruncated: truncated
  };
  if (error) {
    this._recordError(error);
    error.harness = this.lastError.report;
    throw error;
  }
  if (stopped) stopped.context = this._context();
  return report;
};

/* n ticks. returns what happened (the report, not the world) */
Harness.prototype.step = function (n) { return this._loop(n == null ? 1 : n); };
Harness.prototype.run = Harness.prototype.step;

/* play until the expression is true (checked after each tick) */
Harness.prototype.until = function (expr, opts) {
  opts = opts || {};
  var max = opts.max == null ? 20000 : opts.max;
  var test = typeof expr === "function" ? expr : this.compile(expr);
  var report = this._loop(max, { cond: test });
  if (report.stopped && report.stopped.kind === "condition") { report.hit = true; report.expr = String(expr); }
  else if (!report.stopped) { report.hit = false; report.timeout = true; }
  else report.hit = false;
  return report;
};

/* one tick that is never interrupted by breakpoints or invariants */
Harness.prototype.tickRaw = function () { this._tick(); this._afterTick(); return this; };

/* a tick that records traces and history but does not consult the debugger.
   a drag uses this so a breakpoint cannot cut a stroke in half and then be
   swallowed unnoticed; the next explicit step will still find it */
Harness.prototype._tickQuiet = function () {
  this._tick();
  this._sample();
  this._trailStep();
  if (this._hist.on && this.ticks % this._hist.every === 0) this._pushFrame();
};

Harness.prototype.pause = function (on) { this.g.paused = on === false ? 0 : 1; return this; };
/* slow motion is the slowest speed; off is normal speed */
Harness.prototype.slow = function (on) { this.g.speed = on === false ? this._eval("SPEED_1") : 0; this.g.speedAcc = 0; return this; };
Harness.prototype.speed = function (i) { this.g.speed = i; this.g.speedAcc = 0; return this; };

/* fresh village. same seed, same people, same hills */
Harness.prototype.reset = function (seed) {
  if (seed != null) { this.seed = seed >>> 0; }
  this.loaded.rng.reseed(this.seed);
  for (var d = 0; d < this.loaded.preBootCalls; d++) this.loaded.rng.random();
  this.loaded.clock.t = 0;
  this._eval("g = newGame(); gameInit(g);");
  this.g = this._eval("g");
  this.ticks = 0;
  this.eventLog.length = 0;
  this.achSeen = Object.create(null);
  this.ops.length = 0;
  this.watches.forEach(function (w) { w.rows.length = 0; });
  this.breaks.forEach(function (b) { b.has = false; b.prev = undefined; b.v = undefined; });
  this._hist.frames.length = 0;
  this.trail.length = 0; this._trailTick = -1;
  this.lastError = null;
  this.origin = null;
  this._refresh();
  return this;
};

/* -------------------------------------------------------------------
   3. WHAT JUST HAPPENED: the event log, stop context, crashes
   ------------------------------------------------------------------- */
Harness.prototype._hookEvents = function () {
  var self = this;
  function wrap(name, tag) {
    self._eval(name + " = (function (orig) { return function () { var r = orig.apply(null, arguments); __h.onHook(" +
      JSON.stringify(tag) + ", arguments); return r; }; })(" + name + ");");
  }
  wrap("feed", "feed");
  wrap("pDie", "death");
  wrap("achieve", "achieve");
  wrap("banner", "banner");
};

Harness.prototype._onHook = function (tag, args) {
  var e = { tick: this.ticks, t: view.round(this.g.t, 2), kind: tag }, a;
  if (tag === "feed") { e.text = String(args[1]); e.col = args[2]; if (args[3]) e.key = args[3]; }
  else if (tag === "death") { a = args[1]; e.name = a && a.name; e.id = a && a.id; e.cause = args[2]; }
  else if (tag === "achieve") {
    /* the game calls achieve() every time somebody finishes a wall, and it
       returns early once it is got; only the first one is news */
    if (this.achSeen[args[1]]) return;
    this.achSeen[args[1]] = 1;
    e.key = args[1];
  }
  else if (tag === "banner") { e.title = args[1]; e.sub = args[2]; }
  this.eventLog.push(e);
  if (this.eventLog.length > this.eventMax) this.eventLog.splice(0, this.eventLog.length - this.eventMax);
};

Harness.prototype.events = function (opts) {
  opts = opts || {};
  var out = this.eventLog, i;
  var since = opts.since == null ? 0 : opts.since, kinds = opts.kind ? [].concat(opts.kind) : null;
  var list = [];
  for (i = 0; i < out.length; i++) {
    if (out[i].tick < since) continue;
    if (kinds && kinds.indexOf(out[i].kind) < 0) continue;
    list.push(out[i]);
  }
  if (opts.limit) list = list.slice(-opts.limit);
  return list;
};
Harness.prototype.clearEvents = function () { this.eventLog.length = 0; return this; };

Harness.prototype._context = function () {
  return {
    tick: this.ticks, sandTick: this.g.tick, time: view.round(this.g.t, 2),
    peasants: view.peasants(this), ducks: view.ducks(this), sites: view.sites(this),
    events: this.eventLog.slice(-8), feed: (this.g.feed || []).map(function (f) { return f.text; })
  };
};

Harness.prototype._recordError = function (err) {
  var report = {
    tick: this.ticks, sandTick: this.g.tick, time: view.round(this.g.t, 2),
    error: String(err && err.message || err), stack: err && err.stack,
    recentOps: this.ops.slice(-12), events: this.eventLog.slice(-12)
  };
  /* a crash report must never be the thing that crashes */
  try { report.state = view.stateOf(this); } catch (e) { report.stateError = String(e.message || e); }
  try { report.map = view.map(this, { w: 72, h: 36 }); } catch (e) { report.mapError = String(e.message || e); }
  try { report.scenario = this.scenario(); } catch (e) { report.scenarioError = String(e.message || e); }
  this.lastError = { error: err, tick: this.ticks, report: report };
  return report;
};
Harness.prototype.crashReport = function () {
  return this.lastError ? this.lastError.report : null;
};

/* -------------------------------------------------------------------
   4. SNAPSHOTS AND TIME TRAVEL
   ------------------------------------------------------------------- */
Harness.prototype._keep = function () {
  if (!this._keepSet) this._keepSet = snap.constantRefs(this._eval);
  return this._keepSet;
};

Harness.prototype.snapshot = function () {
  return snap.capture(this.g, {
    seed: this.seed, ticks: this.ticks, rng: this.loaded.rng.state, clock: this.loaded.clock.t
  }, this._keep());
};

Harness.prototype.restore = function (s) {
  if (typeof s === "string") {
    var found = null;
    for (var i = 0; i < this.checkpointList.length; i++) if (this.checkpointList[i].id === s) found = this.checkpointList[i];
    if (!found) throw new Error("no checkpoint called " + s);
    s = found.snap;
  }
  if (!s || !s.state) throw new Error("restore wants a snapshot or a checkpoint id");
  snap.apply(s, this.g, this._keep());
  /* the pathfinder's scratch is not state, but it is marked with generations:
     clear the marks so a restored generation cannot collide with a stale one */
  if (this.g.navSeen) { this.g.navSeen.fill(0); this.g.navShut.fill(0); }
  this.loaded.rng.state = s.rng;
  this.loaded.clock.t = s.clock;
  this.ticks = s.ticks;
  this.seed = s.seed;
  this.ops = this.ops.filter(function (o) { return o.at <= this.ticks; }, this);
  var st = this.g.tick;
  this.trail = this.trail.filter(function (r) { return r.tick <= st; });
  this._trailTick = -1;
  return this;
};

Harness.prototype.dropCheckpoint = function (id) {
  this.checkpointList = this.checkpointList.filter(function (c) { return c.id !== id; });
  return this;
};
Harness.prototype.checkpoint = function (label) {
  var id = label || ("cp" + (this.checkpointList.length + 1));
  this.checkpointList.push({ id: id, tick: this.ticks, snap: this.snapshot() });
  return id;
};
Harness.prototype.clearCheckpoints = function () { this.checkpointList.length = 0; return this; };
Harness.prototype.checkpoints = function () {
  return this.checkpointList.map(function (c) { return { id: c.id, tick: c.tick }; });
};

/* keep the last n tick-states, so h.back(k) is always available. off by default */
Harness.prototype.history = function (n, opts) {
  opts = opts || {};
  n = n == null ? DEFAULT_HISTORY : (n | 0);
  this._hist = { on: n > 0, every: opts.every || 1, max: n, frames: [] };
  if (n > 0) this._pushFrame();
  return this._hist;
};
Harness.prototype.historyOff = function () { this._hist.on = false; this._hist.frames.length = 0; return this; };
Harness.prototype._pushFrame = function () {
  var H = this._hist;
  H.frames.push({ tick: this.ticks, snap: this.snapshot() });
  while (H.frames.length > H.max) H.frames.shift();
};

/* step back n ticks (history must be on) */
Harness.prototype.back = function (n) {
  var H = this._hist;
  if (!H.on || !H.frames.length) throw new Error("history is off: call h.history(" + DEFAULT_HISTORY + ") before stepping");
  n = Math.max(1, (n | 0) || 1);
  var idx = H.frames.length - 1 - n;
  if (idx < 0) throw new Error("only " + H.frames.length + " frames of history are kept");
  var f = H.frames[idx];
  this.restore(f.snap);
  H.frames.length = idx + 1;
  return { tick: this.ticks, from: f.tick };
};
Harness.prototype.frames = function () { return this._hist.frames.map(function (f) { return f.tick; }); };

/* what changed between two snapshots (or checkpoint ids, or a checkpoint
   and now). scalars, people, ducks, sites, the census of the grid, and the
   lines that appeared in the ticker */
Harness.prototype.diff = function (before, after) {
  var self = this;
  function get(s, what) {
    if (typeof s === "string") {
      var cp = self.checkpointList.filter(function (c) { return c.id === s; })[0];
      if (!cp) throw new Error("no checkpoint called " + s);
      return cp.snap;
    }
    if (!s || !s.state) throw new Error(what + " wants a snapshot or a checkpoint id");
    return s;
  }
  var A = get(before, "before"), B = get(after == null ? this.snapshot() : after, "after");
  var sa = A.state, sb = B.state, out = {
    ticks: { from: A.ticks, to: B.ticks },
    scalar: {}, peasants: { added: [], removed: [], changed: [] },
    ducks: { added: [], removed: [], changed: [] },
    sites: { added: [], removed: [], changed: [] },
    materials: [], feed: [], rngChanged: A.rng !== B.rng
  };
  var k;
  for (k in sb) {
    var va = sa[k], vb = sb[k], ta = typeof va, tb = typeof vb;
    if (ta !== tb || (tb !== "number" && tb !== "string" && tb !== "boolean")) continue;
    if (va === vb) continue;
    out.scalar[k] = tb === "number" ? [view.round(va, 2), view.round(vb, 2)] : [va, vb];
  }
  function keyed(list) { var m = {}; (list || []).forEach(function (e) { m[e.id] = e; }); return m; }
  function cmp(listA, listB, fields, bucket) {
    var ma = keyed(listA), mb = keyed(listB), id;
    for (id in mb) if (!ma[id]) bucket.added.push(summarise(mb[id], fields));
    for (id in ma) {
      if (!mb[id]) { bucket.removed.push(summarise(ma[id], fields)); continue; }
      var ch = {}, any = false;
      fields.forEach(function (f) {
        var x = read(ma[id], f), y = read(mb[id], f);
        if (x !== y) { ch[f] = [x, y]; any = true; }
      });
      if (any) bucket.changed.push({ id: Number(id), name: (mb[id].name || ""), changes: ch });
    }
  }
  function read(o, path) {
    var parts = String(path).split("."), v = o, i;
    for (i = 0; i < parts.length; i++) { v = v == null ? v : v[parts[i]]; }
    if (typeof v === "number") v = view.round(v, 2);
    return v === undefined ? null : v;
  }
  function summarise(o, fields) {
    var r = { id: o.id, name: o.name };
    fields.forEach(function (f) { r[f] = read(o, f); });
    return r;
  }
  cmp(sa.peasants, sb.peasants, ["x", "y", "state", "dead", "fire", "sleep", "home", "task.kind", "hunger", "bored", "logs", "boards", "stone", "iron", "pack"], out.peasants);
  cmp(sa.ducks, sb.ducks, ["x", "y", "state", "dead", "baby", "fire"], out.ducks);
  cmp(sa.sites, sb.sites, ["done", "repair"], out.sites);

  /* the grid, by material */
  var na = new Array(self.NMAT).fill(0), nb = new Array(self.NMAT).fill(0), i;
  for (i = 0; i < sa.m.length; i++) na[sa.m[i]]++;
  for (i = 0; i < sb.m.length; i++) nb[sb.m[i]]++;
  for (i = 0; i < self.NMAT; i++) if (na[i] !== nb[i]) out.materials.push({ id: i, name: view.matName(self, i), from: na[i], to: nb[i], delta: nb[i] - na[i] });

  /* lines that were not there before */
  var old = {}, feed = sb.feed || [];
  (sa.feed || []).forEach(function (f) { old[f.text] = (old[f.text] || 0) + 1; });
  feed.forEach(function (f) {
    if (old[f.text]) { old[f.text]--; return; }
    out.feed.push(f.text);
  });
  return out;
};

/* -------------------------------------------------------------------
   5. TRACING: values per tick, and what changed
   ------------------------------------------------------------------- */
Harness.prototype.watch = function (expr, opts) {
  opts = opts || {};
  var id = opts.id || ("w" + (this.watches.length + 1));
  var w = {
    id: id, expr: String(expr), fn: typeof expr === "function" ? expr : this.compile(expr),
    every: Math.max(1, opts.every | 0 || 1), max: opts.max || 20000, rows: []
  };
  this.watches.push(w);
  return id;
};
Harness.prototype.trace = function (exprs, opts) {
  opts = opts || {};
  if (opts.clear !== false) this.clearTrace();
  var self = this, ids = [];
  if (Array.isArray(exprs)) exprs.forEach(function (e) { ids.push(self.watch(e, opts)); });
  else Object.keys(exprs).forEach(function (k) { ids.push(self.watch(exprs[k], Object.assign({}, opts, { id: k }))); });
  return ids;
};
Harness.prototype.unwatch = function (id) {
  this.watches = this.watches.filter(function (w) { return w.id !== id; });
  return this;
};
Harness.prototype.clearTrace = function () {
  this.watches.forEach(function (w) { w.rows.length = 0; });
  return this;
};
Harness.prototype.traceRows = function () {
  var byTick = {}, out = [];
  this.watches.forEach(function (w) {
    w.rows.forEach(function (r) {
      var o = byTick[r[0]] || (byTick[r[0]] = { tick: r[0] });
      o[w.id] = r[1];
    });
  });
  Object.keys(byTick).forEach(function (t) { out.push(byTick[t]); });
  out.sort(function (a, b) { return a.tick - b.tick; });
  return out;
};
Harness.prototype.traceReport = function () {
  var out = [];
  this.watches.forEach(function (w) {
    var rows = w.rows, changes = [], i, v, prev, has = false, min = null, max = null, nan = 0;
    for (i = 0; i < rows.length; i++) {
      v = rows[i][1];
      if (typeof v === "number" && !isFinite(v)) nan++;
      if (typeof v === "number") { if (min === null || v < min) min = v; if (max === null || v > max) max = v; }
      if (!has) { prev = v; has = true; }
      else if (v !== prev) { if (changes.length < 40) changes.push({ tick: rows[i][0], from: prev, to: v }); prev = v; }
    }
    out.push({
      id: w.id, expr: w.expr, every: w.every, samples: rows.length,
      first: rows.length ? rows[0][1] : null, last: rows.length ? rows[rows.length - 1][1] : null,
      min: min, max: max, nonFinite: nan, changes: changes
    });
  });
  return out;
};
Harness.prototype.traceCSV = function () {
  var rows = this.traceRows(), cols = ["tick"];
  this.watches.forEach(function (w) { if (cols.indexOf(w.id) < 0) cols.push(w.id); });
  var out = [cols.join(",")];
  rows.forEach(function (r) {
    out.push(cols.map(function (c) {
      var v = r[c];
      if (v == null) return "";
      if (typeof v === "object") v = JSON.stringify(v);
      return String(v).replace(/,/g, ";");
    }).join(","));
  });
  return out.join("\n");
};

/* -------------------------------------------------------------------
   6. BREAKPOINTS AND INVARIANTS
   ------------------------------------------------------------------- */
Harness.prototype.breakOn = function (expr, opts) {
  opts = opts || {};
  var id = opts.id || ("b" + (this.breaks.length + 1));
  this.breaks = this.breaks.filter(function (b) { return b.id !== id; });
  this.breaks.push({
    id: id, expr: String(expr), fn: typeof expr === "function" ? expr : this.compile(expr),
    once: opts.once !== false, hits: 0, has: false, prev: undefined, change: false
  });
  return id;
};
/* fires when the expression's value (a string or a number) changes */
Harness.prototype.breakOnChange = function (expr, opts) {
  var id = this.breakOn(expr, opts);
  this.breaks[this.breaks.length - 1].change = true;
  return id;
};
Harness.prototype.clearBreaks = function () { this.breaks.length = 0; return this; };

Harness.prototype.invariant = function (id, expr, opts) {
  opts = opts || {};
  id = id || ("inv" + (this.invariants.length + 1));
  this.invariants = this.invariants.filter(function (x) { return x.id !== id; });
  this.invariants.push({
    id: id, expr: String(expr),
    fn: typeof expr === "function" ? expr : this.compile(expr), every: Math.max(1, opts.every | 0 || 1)
  });
  return this;
};
Harness.prototype.clearInvariants = function () { this.invariants.length = 0; return this; };

/* the things that should always be true. cheap checks every tick, the whole
   grid every so often */
Harness.prototype.standardInvariants = function (opts) {
  opts = opts || {};
  var every = opts.every || 1, grid = opts.grid || 60;
  this.invariant("std:peasants",
    "g.peasants.every(function (p) { return Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.vx) && Number.isFinite(p.vy); })",
    { every: every });
  this.invariant("std:ducks",
    "g.ducks.every(function (d) { return Number.isFinite(d.x) && Number.isFinite(d.y); })", { every: every });
  this.invariant("std:temps", "g.T.every(Number.isFinite)", { every: opts.temps || 30 });
  this.invariant("std:latent", "g.lat.every(Number.isFinite)", { every: opts.temps || 30 });
  this.invariant("std:materials", "g.m.every(function (v) { return v >= 0 && v < NMAT; })", { every: grid });
  this.invariant("std:counts", "g.peasants.length <= P_MAX && g.ducks.length <= D_MAX && g.np >= 0 && g.np <= PMAX", { every: 30 });
  this.invariant("std:grid", "g.m.length === g.gw * g.gh && g.T.length === g.m.length && g.lat.length === g.m.length", { every: grid });
  return this;
};

Harness.prototype._sample = function () {
  for (var i = 0; i < this.watches.length; i++) {
    var w = this.watches[i];
    if (w.every > 1 && this.ticks % w.every !== 0) continue;
    var v;
    try { v = w.fn(this.g, this, this.ticks); } catch (e) { v = "ERR: " + e.message; }
    if (v && typeof v === "object") v = JSON.stringify(v);
    w.rows.push([this.ticks, v]);
    if (w.rows.length > w.max) w.rows.shift();
  }
};

/* the save trail: every 120 sand ticks, where everybody is (it goes in h.save()) */
Harness.prototype._trailStep = function () {
  var g = this.g;
  if (g.tick % 120 !== 0 || g.tick === this._trailTick) return;
  this._trailTick = g.tick;
  this.trail.push(this._trailRow(g));
  if (this.trail.length > 450) this.trail.splice(0, this.trail.length - 450);
};

Harness.prototype._afterTick = function () {
  this._sample();
  this._trailStep();
  if (this._hist.on && this.ticks % this._hist.every === 0) this._pushFrame();
  if (this._replaying) return null;
  var i, x, v;
  for (i = 0; i < this.invariants.length; i++) {
    x = this.invariants[i];
    if (x.every > 1 && this.ticks % x.every !== 0) continue;
    delete x.error;
    try { v = x.fn(this.g, this, this.ticks); } catch (e) { v = false; x.error = e.message; }
    if (!v) return { kind: "invariant", id: x.id, expr: x.expr, tick: this.ticks, error: x.error };
  }
  for (i = 0; i < this.breaks.length; i++) {
    x = this.breaks[i];
    var val;
    try { val = x.fn(this.g, this, this.ticks); } catch (e) { val = false; }
    if (x.change) {
      if (!x.has) { x.has = true; x.prev = val; continue; }
      if (val !== x.prev) {
        var from = x.prev; x.prev = val; x.hits++;
        if (x.once) this.breaks.splice(i, 1);
        return { kind: "breakpoint", id: x.id, expr: x.expr, value: val, previous: from, tick: this.ticks, change: true };
      }
    } else if (val) {
      x.hits++;
      if (x.once) this.breaks.splice(i, 1);
      return { kind: "breakpoint", id: x.id, expr: x.expr, value: val, tick: this.ticks };
    }
  }
  return null;
};

/* -------------------------------------------------------------------
   7. PROFILING
   ------------------------------------------------------------------- */
Harness.prototype.profiler = function (on) {
  on = on !== false;
  if (on === this._profOn) return this;
  var self = this, i;
  if (on) {
    this._profTotals = {};
    this._profStart = this.host.cpu();
    for (i = 0; i < PHASES.length; i++) {
      this.host.orig[PHASES[i]] = this._eval(PHASES[i]);
      this._eval(PHASES[i] + " = __h.profWrap(" + PHASES[i] + ", " + JSON.stringify(PHASES[i]) + ");");
    }
    this._profOn = true;
  } else {
    for (i = 0; i < PHASES.length; i++) {
      this._eval(PHASES[i] + " = __h.orig[" + JSON.stringify(PHASES[i]) + "];");
    }
    this._profOn = false;
  }
  this._refresh();
  return this;
};
Harness.prototype.profile = function () {
  var totals = this._profTotals, out = [], sum = 0, k;
  for (k in totals) { sum += totals[k].ms; }
  for (k in totals) {
    out.push({ phase: k, ms: view.round(totals[k].ms, 1), calls: totals[k].calls, pct: sum ? view.round(totals[k].ms / sum * 100, 1) : 0 });
  }
  out.sort(function (a, b) { return b.ms - a.ms; });
  return {
    on: this._profOn, updates: this.ticks,
    wallMs: this._profOn ? view.round(this.host.cpu() - this._profStart, 1) : null,
    msPerTick: this._profOn && this.ticks ? view.round((this.host.cpu() - this._profStart) / this.ticks, 3) : null,
    phases: out, note: "heatStep runs inside sandStep, so the shares overlap"
  };
};
Harness.prototype.clearProfile = function () { this._profTotals = {}; this._profStart = this.host.cpu(); return this; };

/* -------------------------------------------------------------------
   8. LOOKING AT IT
   ------------------------------------------------------------------- */
Harness.prototype.state = function (opts) { return view.stateOf(this, opts); };
Harness.prototype.histogram = function (opts) { return view.histogram(this, opts); };
Harness.prototype.peasants = function (opts) { return view.peasants(this, opts); };
Harness.prototype.peasant = function (sel) {
  var p = view.pickPeasant(this, sel);
  return p ? view.peasantJson(this, p, true) : null;
};
Harness.prototype.ducks = function () { return view.ducks(this); };
Harness.prototype.duck = function (sel) {
  var d = view.pickDuck(this, sel);
  return d ? view.duckJson(this, d) : null;
};
Harness.prototype.sites = function () { return view.sites(this); };
Harness.prototype.cell = function (x, y) { return view.cell(this, x, y); };
Harness.prototype.find = function (name, opts) { return view.find(this, name, opts); };
Harness.prototype.map = function (opts) { return view.map(this, opts); };
Harness.prototype.describe = function (opts) { return view.describe(this, opts); };
Harness.prototype.why = function (sel) { return view.why(this, sel); };
Harness.prototype.matId = function (name) { return view.matId(this, name); };
Harness.prototype.entities = function () {
  return { peasants: this.peasants(), ducks: this.ducks(), sites: this.sites() };
};

/* -------------------------------------------------------------------
   9. DOING THINGS: painting, heat, fire, people
   ------------------------------------------------------------------- */
/* a number, or a complaint an agent can act on */
function numArg(v, what) {
  var n = Number(v);
  if (!isFinite(n)) throw new Error((what || "argument") + " must be a number, got " + JSON.stringify(v));
  return n;
}

Harness.prototype._op = function (kind, args) {
  if (this.recording) this.ops.push({ at: this.ticks, op: kind, args: args });
};

Harness.prototype.place = function (x, y, mat) {
  var a = { x: x, y: y, mat: mat };
  this._op("place", a); return this._doPlace(a);
};
Harness.prototype._doPlace = function (a) {
  var g = this.g, x = Math.round(numArg(a.x, "x")), y = Math.round(numArg(a.y, "y"));
  if (x < 0 || y < 0 || x >= g.gw || y >= g.gh) return this;
  this.game.sandPlace(g, y * g.gw + x, view.matId(this, a.mat));
  return this;
};

Harness.prototype.fill = function (x, y, w, h, mat) {
  var a = { x: x, y: y, w: w, h: h, mat: mat };
  this._op("fill", a); return this._doFill(a);
};
Harness.prototype._doFill = function (a) {
  var g = this.g, id = view.matId(this, a.mat), x, y;
  var ax = numArg(a.x, "x"), ay = numArg(a.y, "y"), aw = numArg(a.w == null ? 1 : a.w, "w"), ah = numArg(a.h == null ? 1 : a.h, "h");
  var x0 = Math.max(0, Math.round(ax)), y0 = Math.max(0, Math.round(ay));
  var x1 = Math.min(g.gw - 1, Math.round(ax + aw - 1));
  var y1 = Math.min(g.gh - 1, Math.round(ay + ah - 1));
  for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) this.game.sandPlace(g, y * g.gw + x, id);
  return this;
};

Harness.prototype.paintLine = function (x0, y0, x1, y1, mat) {
  var a = { x0: x0, y0: y0, x1: x1, y1: y1, mat: mat };
  this._op("paintLine", a); return this._doPaintLine(a);
};
Harness.prototype._doPaintLine = function (a) {
  var g = this.g, id = view.matId(this, a.mat);
  var ax = Math.round(numArg(a.x0, "x0")), ay = Math.round(numArg(a.y0, "y0"));
  var bx = Math.round(numArg(a.x1, "x1")), by = Math.round(numArg(a.y1, "y1"));
  var dx = Math.abs(bx - ax), dy = Math.abs(by - ay), sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1, err = dx - dy, e2;
  for (;;) {
    if (ax >= 0 && ay >= 0 && ax < g.gw && ay < g.gh) this.game.sandPlace(g, ay * g.gw + ax, id);
    if (ax === bx && ay === by) break;
    e2 = 2 * err;
    if (e2 > -dy) { err -= dy; ax += sx; }
    if (e2 < dx) { err += dx; ay += sy; }
  }
  return this;
};

Harness.prototype.paintDisc = function (cx, cy, r, mat) {
  var a = { cx: cx, cy: cy, r: r, mat: mat };
  this._op("paintDisc", a); return this._doPaintDisc(a);
};
Harness.prototype._doPaintDisc = function (a) {
  var g = this.g, id = view.matId(this, a.mat), r = Math.max(0, numArg(a.r, "r"));
  var ix = Math.round(numArg(a.cx, "cx")), iy = Math.round(numArg(a.cy, "cy"));
  for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r + r) continue;
    var x = ix + dx, y = iy + dy;
    if (x >= 0 && y >= 0 && x < g.gw && y < g.gh) this.game.sandPlace(g, y * g.gw + x, id);
  }
  return this;
};

Harness.prototype.erase = function (x, y, w, h) { return this.fill(x, y, w, h, "EMPTY"); };

Harness.prototype.ignite = function (x, y, opts) {
  var a = { x: x, y: y, spread: !opts || opts.spread !== false };
  this._op("ignite", a); return this._doIgnite(a);
};
Harness.prototype._doIgnite = function (a) {
  var g = this.g, x = Math.round(numArg(a.x, "x")), y = Math.round(numArg(a.y, "y"));
  if (x < 0 || y < 0 || x >= g.gw || y >= g.gh) return this;
  this.game.pIgniteCell(g, y * g.gw + x, a.spread);
  return this;
};

Harness.prototype.addHeat = function (x, y, delta) {
  var a = { x: x, y: y, delta: delta };
  this._op("addHeat", a); return this._doAddHeat(a);
};
Harness.prototype._doAddHeat = function (a) {
  var g = this.g, x = Math.round(numArg(a.x, "x")), y = Math.round(numArg(a.y, "y"));
  if (x < 0 || y < 0 || x >= g.gw || y >= g.gh) return this;
  this.game.heatAdd(g, y * g.gw + x, a.delta);
  return this;
};

Harness.prototype.setTemp = function (x, y, t) {
  var a = { x: x, y: y, t: t };
  this._op("setTemp", a); return this._doSetTemp(a);
};
Harness.prototype._doSetTemp = function (a) {
  var g = this.g, j = Math.round(numArg(a.y, "y")) * g.gw + Math.round(numArg(a.x, "x"));
  if (j >= 0 && j < g.T.length) g.T[j] = numArg(a.t, "t");
  return this;
};

/* the HEAT/COOL brush: same code the cursor uses, around a cell */
Harness.prototype.heatBrush = function (x, y, dir, size) {
  var a = { x: x, y: y, dir: dir, size: size };
  this._op("heatBrush", a); return this._doHeatBrush(a);
};
Harness.prototype._doHeatBrush = function (a) {
  var g = this.g, old = g.size;
  a.x = numArg(a.x, "x"); a.y = numArg(a.y, "y");
  if (a.size) g.size = a.size;
  this.game.heatBrush(g, a.x, a.y, a.dir >= 0 ? 1 : -1);
  g.size = old;
  return this;
};

Harness.prototype.spawnPeasant = function (x, y, opts) {
  var a = { x: x, y: y, quiet: !!(opts && opts.quiet) };
  this._op("spawnPeasant", a);
  var p = this.game.peasantSpawn(this.g, Math.round(numArg(a.x, "x")), Math.round(numArg(a.y, "y")), a.quiet);
  return p ? view.peasantJson(this, p, true) : null;
};
Harness.prototype._doSpawnPeasant = function (a) {
  this.game.peasantSpawn(this.g, Math.round(numArg(a.x, "x")), Math.round(numArg(a.y, "y")), a.quiet);
  return this;
};

Harness.prototype.spawnDuck = function (x, y, opts) {
  var a = { x: x, y: y, kind: opts && opts.kind };
  this._op("spawnDuck", a);
  var kind = a.kind == null ? null : this.game.D_KINDS[Number(a.kind) || 0];
  var d = this.game.duckSpawn(this.g, Math.round(numArg(a.x, "x")), Math.round(numArg(a.y, "y")), kind);
  return d ? view.duckJson(this, d) : null;
};
Harness.prototype._doSpawnDuck = function (a) {
  var kind = a.kind == null ? null : this.game.D_KINDS[Number(a.kind) || 0];
  this.game.duckSpawn(this.g, Math.round(numArg(a.x, "x")), Math.round(numArg(a.y, "y")), kind);
  return this;
};

/* teach the village something: h.give(["farm", "mine"]) */
Harness.prototype.give = function (ideas) {
  var a = { ideas: [].concat(ideas) };
  this._op("give", a); return this._doGive(a);
};
Harness.prototype._doGive = function (a) {
  var g = this.g, ids = this.IDEAS.map(function (I) { return I.id; }), i;
  for (i = 0; i < a.ideas.length; i++) {
    if (ids.indexOf(a.ideas[i]) < 0) throw new Error("no idea called " + a.ideas[i] + " (ideas: " + ids.join(", ") + ")");
  }
  /* the game keeps the discoverer's name here, and reads it as a string: a
     tick number is 0 at the start (falsy: the idea is not known) and a number
     later (iSummary calls .split on it). a name is the right shape */
  for (i = 0; i < a.ideas.length; i++) g.know[a.ideas[i]] = "HARNESS";
  return this;
};

/* -------------------------------------------------------------------
   10. THE HAND: mouse, keys, clicks, drags, throws
   ------------------------------------------------------------------- */
Harness.prototype._screen = function (x, y) {
  return { mx: this.PANEL + (x + 0.5) * this.CELL, my: this.PLAY_Y + (y + 0.5) * this.CELL };
};

Harness.prototype.mouse = function (x, y) { this._op("mouse", { x: x, y: y }); return this._doMouse(x, y); };
Harness.prototype._doMouse = function (x, y) {
  var g = this.g, nx = numArg(x, "x"), ny = numArg(y, "y"), s = this._screen(nx, ny);
  g.mx = s.mx; g.my = s.my; g.cx = nx + 0.5; g.cy = ny + 0.5;
  this.game.cursorSample(g);
  return this;
};

Harness.prototype.select = function (sel) { this._op("select", { sel: sel }); return this._doSelect(sel); };
Harness.prototype._doSelect = function (sel) {
  var PICK = this.pick, i;
  if (typeof sel === "number") {
    if (sel < 0 || sel >= PICK.length) throw new Error("picker index out of range: " + sel);
    this.g.sel = sel; return this;
  }
  var s = String(sel).toUpperCase();
  for (i = 0; i < PICK.length; i++) {
    if ((PICK[i].name || "").toUpperCase() === s) { this.g.sel = i; return this; }
    if (PICK[i].key && PICK[i].key.toUpperCase() === s) { this.g.sel = i; return this; }
  }
  throw new Error("nothing in the picker called " + sel);
};

Harness.prototype.key = function (k) { this._op("key", { k: k }); return this._doKey(k); };
Harness.prototype._doKey = function (k) { this.game.gameKey(this.g, String(k).toLowerCase()); return this; };

Harness.prototype.wheel = function (d) { this._op("wheel", { d: d }); return this._doWheel(d); };
Harness.prototype._doWheel = function (d) { this.game.gameWheel(this.g, d); return this; };

/* one pointer at a time, as the shell's pointer handler leaves it */
Harness.prototype._press = function (btn) {
  var g = this.g;
  g.down = 1; g.btn = btn == null ? 0 : btn; g.ptr = 1;
  this.game.gameTap(g, g.mx, g.my);
  return this;
};
Harness.prototype._release = function () {
  var g = this.g;
  g.down = 0; this.game.sandRelease(g); g.btn = 0; g.ptr = null;
  return this;
};
Harness.prototype.down = function (btn) { this._op("down", { btn: btn }); return this._doDown(btn); };
Harness.prototype._doDown = function (btn) { return this._press(btn); };
Harness.prototype.up = function () { this._op("up", {}); return this._doUp(); };
Harness.prototype._doUp = function () { return this._release(); };

/* a click: down, the real tap handler, one frame of painting, up */
Harness.prototype.tap = function (x, y) { this._op("tap", { x: x, y: y }); return this._doTap(x, y); };
Harness.prototype._doTap = function (x, y) {
  this._doMouse(x, y);
  this.g.lx = null;
  this._press(0);
  this.game.sandPaint(this.g);
  return this._release();
};

/* drag across the grid, painting as the real loop would, one tick per step */
Harness.prototype.drag = function (x0, y0, x1, y1, opts) {
  opts = opts || {};
  var a = { x0: x0, y0: y0, x1: x1, y1: y1, ticks: opts.ticks || 8, btn: opts.btn || 0 };
  this._op("drag", a); return this._doDrag(a);
};
Harness.prototype._doDrag = function (a) {
  var i, t = Math.max(1, a.ticks | 0);
  this._doMouse(a.x0, a.y0);
  this.g.lx = null;
  this._press(a.btn);
  for (i = 1; i <= t; i++) {
    this._doMouse(a.x0 + (a.x1 - a.x0) * i / t, a.y0 + (a.y1 - a.y0) * i / t);
    this._tickQuiet();
  }
  return this._release();
};

/* a throw, without the arm: set the cursor's recent speed in cells/tick */
Harness.prototype.flick = function (vx, vy) {
  var a = { vx: numArg(vx, "vx"), vy: numArg(vy, "vy") };
  this._op("flick", a);
  return this._doFlick(a.vx, a.vy);
};
Harness.prototype._doFlick = function (vx, vy) {
  var g = this.g, t = this.loaded.clock.t;
  g.samp.length = 0;
  g.samp.push([t - 5 * TICK_MS, g.cx - vx * 5, g.cy - vy * 5]);
  g.samp.push([t, g.cx, g.cy]);
  return this;
};

/* the whole hand at once: h.input({ mouse: [x,y], key: "t" }) */
Harness.prototype.input = function (o) {
  if (!o) return this;
  if (o.mouse) this.mouse(o.mouse[0], o.mouse[1]);
  if (o.select != null) this.select(o.select);
  if (o.key != null) this.key(o.key);
  if (o.wheel != null) this.wheel(o.wheel);
  if (o.tap) this.tap(o.tap[0], o.tap[1]);
  if (o.flick) this.flick(o.flick[0], o.flick[1]);
  if (o.down) this.down(o.btn);
  if (o.up) this.up();
  return this;
};

/* -------------------------------------------------------------------
   11. REPRODUCING: the seed and every hand laid on the world
   ------------------------------------------------------------------- */
Harness.prototype.scenario = function () {
  var sc = { version: 1, seed: this.seed, ticks: this.ticks, hash: this.hash(), ops: this.ops.slice() };
  /* a village loaded from a file replays from that file, not from the seed */
  if (this.origin && this.origin.path) sc.from = { path: this.origin.path, keyframe: this.origin.keyframe, atTick: this.origin.ticks };
  return sc;
};

Harness.prototype._runTo = function (tick) {
  var n = tick - this.ticks;
  if (n > 0) this._advanceRaw(n);
};

Harness.prototype._advanceRaw = function (n) {
  var was = this._replaying;
  this._replaying = true;
  try {
    for (var i = 0; i < n; i++) this._tickQuiet();
  } finally { this._replaying = was; }
};

Harness.prototype._apply = function (op) {
  var a = op.args || {};
  switch (op.op) {
    case "place": return this._doPlace(a);
    case "fill": return this._doFill(a);
    case "paintLine": return this._doPaintLine(a);
    case "paintDisc": return this._doPaintDisc(a);
    case "ignite": return this._doIgnite(a);
    case "addHeat": return this._doAddHeat(a);
    case "setTemp": return this._doSetTemp(a);
    case "heatBrush": return this._doHeatBrush(a);
    case "spawnPeasant": return this._doSpawnPeasant(a);
    case "spawnDuck": return this._doSpawnDuck(a);
    case "give": return this._doGive(a);
    case "set": return this._doSet(a.path, a.value);
    case "select": return this._doSelect(a.sel);
    case "key": return this._doKey(a.k);
    case "wheel": return this._doWheel(a.d);
    case "mouse": return this._doMouse(a.x, a.y);
    case "tap": return this._doTap(a.x, a.y);
    case "down": return this._doDown(a.btn);
    case "up": return this._doUp();
    case "flick": return this._doFlick(a.vx, a.vy);
    case "drag": return this._doDrag(a);
    default: throw new Error("unknown scenario op: " + op.op);
  }
};

/* play a scenario back from its seed. returns the new hash, and whether it
   matches the one it was recorded with */
Harness.prototype.replay = function (sc, opts) {
  opts = opts || {};
  if (!sc || typeof sc.seed !== "number") throw new Error("replay wants a scenario");
  var was = this.recording, wasReplay = this._replaying;
  var ops = (sc.ops || []).slice().sort(function (a, b) { return a.at - b.at; });
  this.recording = false;
  this._replaying = true;
  try {
    if (sc.from && sc.from.path) this.load(sc.from.path, { keyframe: sc.from.keyframe, seed: sc.seed });
    else this.reset(sc.seed);
    for (var i = 0; i < ops.length; i++) {
      if (ops[i].at > this.ticks) this._runTo(ops[i].at);
      this._apply(ops[i]);
    }
    var target = opts.ticks == null ? sc.ticks : opts.ticks;
    if (target > this.ticks) this._runTo(target);
  } finally { this.recording = was; this._replaying = wasReplay; }
  var hash = this.hash();
  return { ticks: this.ticks, hash: hash, expected: sc.hash || null, matches: sc.hash ? hash === sc.hash : null };
};

/* -------------------------------------------------------------------
   12. SAVE FILES: the game's own format (save.js), written and read here
   ------------------------------------------------------------------- */
/* the save as an object. opts.keyframes: how many history frames (or
   checkpoints, if there is no history) to put in as keyframes (default 3) */
Harness.prototype.saveDoc = function (opts) {
  opts = opts || {};
  var self = this, want = opts.keyframes == null ? 3 : opts.keyframes, pool, keys = [], i, step;
  pool = this._hist.frames.length > 1 ? this._hist.frames.slice(0, -1).map(function (f) { return { why: "history frame", tick: f.tick, snap: f.snap }; })
    : this.checkpointList.map(function (c) { return { why: "checkpoint " + c.id, tick: c.tick, snap: c.snap }; });
  if (want > 0 && pool.length) {
    /* spread out across what is kept, oldest first */
    step = Math.max(1, Math.floor(pool.length / want));
    for (i = pool.length - 1; i >= 0 && keys.length < want; i -= step) keys.unshift(pool[i]);
  }
  var crash = this.crashReport();
  return this._eval("saveDocument")(this.g, {
    source: "harness", seed: this.seed, updates: this.ticks, rng: this.loaded.rng.state,
    loadedFrom: this.origin,
    history: {
      events: this.eventLog.slice(-500),
      errors: crash ? [{ tick: crash.tick, message: crash.error, stack: crash.stack, where: "harness" }] : [],
      inputs: this.ops.slice(-600),
      trail: opts.trail || this.trail.slice()
    },
    keyframes: keys.map(function (k) { return { why: k.why, tick: k.snap.sandTick, t: view.round(k.snap.time, 2), updates: k.tick, rng: k.snap.rng, state: k.snap.state }; }),
    extra: { scenario: this.scenario(), traces: this.watches.length ? this.traceReport() : null, checkpoints: this.checkpoints(), crash: crash || null, note: opts.note || null }
  });
};

/* write the save to a file (or just return it, with no path) */
Harness.prototype.save = function (path, opts) {
  var doc = this.saveDoc(opts);
  if (!path) return doc;
  var text = JSON.stringify(doc);
  fs.writeFileSync(String(path), text);
  return { path: String(path), bytes: text.length, tick: this.ticks, sandTick: this.g.tick, keyframes: doc.keyframes.length, checksFailed: doc.checksFailed };
};

/* load a save: a path, json text or the parsed object. opts.keyframe loads
   one of its keyframes instead. the dice: a save (and each keyframe)
   carries its own, from the browser or the harness alike, so what follows
   is what would have followed. one without them, or opts.reseed, gets fresh
   dice from opts.seed (or the save's seed, or this harness's).
   the save's keyframes become checkpoints ("kf0", "kf1", ...), and the
   loaded state itself is checkpoint "save" */
Harness.prototype.load = function (src, opts) {
  opts = opts || {};
  var doc = src, path = null;
  if (typeof src === "string") {
    if (/^\s*\{/.test(src)) doc = JSON.parse(src);
    else { path = src; doc = JSON.parse(fs.readFileSync(src, "utf8")); }
  }
  var meta = doc && doc.meta || {};
  var from = this._eval("saveLoad")(this.g, doc, { keyframe: opts.keyframe, file: path });
  var kf = opts.keyframe != null ? doc.keyframes[opts.keyframe] : null;
  this.seed = (opts.seed != null ? opts.seed : (meta.seed != null ? meta.seed : this.seed)) >>> 0;
  /* the dice: the save's own (or the keyframe's) if it has them, otherwise fresh from the seed */
  var dice = kf ? kf.rng : doc.rng;
  if (dice != null && !opts.reseed) this.loaded.rng.state = dice;
  else this.loaded.rng.reseed(this.seed);
  /* harness ticks carry on from the save's; a browser save counts in sand ticks */
  this.ticks = kf ? (kf.updates != null ? kf.updates : kf.tick || 0) : (meta.updates != null ? meta.updates : meta.tick || 0);
  this.loaded.clock.t = this.ticks * TICK_MS;
  this.ops.length = 0;
  this.eventLog.length = 0;
  this.achSeen = Object.create(null);
  for (var k in (this.g.got || {})) this.achSeen[k] = 1;
  this.watches.forEach(function (w) { w.rows.length = 0; });
  this.breaks.forEach(function (b) { b.has = false; b.prev = undefined; b.v = undefined; });
  this._hist.frames.length = 0;
  if (this._hist.on) this._pushFrame();
  this.trail = ((doc.history || {}).trail || []).filter(function (r) { return r.tick <= this.g.tick; }, this);
  this._trailTick = -1;
  this.lastError = null;
  this.origin = { path: path, savedAt: meta.savedAt || null, source: meta.source || null, tick: meta.tick, keyframe: opts.keyframe == null ? null : opts.keyframe, ticks: this.ticks };
  this._refresh();
  /* checkpoints: the loaded state, and each keyframe */
  this.checkpointList = this.checkpointList.filter(function (c) { return !/^(save|kf\d+)$/.test(c.id); });
  this.checkpointList.push({ id: "save", tick: this.ticks, snap: this.snapshot() });
  var decode = this._eval("saveDecode"), self = this, ids = [];
  (doc.keyframes || []).forEach(function (f, i) {
    if (kf && i === opts.keyframe) return;
    var st;
    try { st = decode(f.state); } catch (e) { return; }
    self.checkpointList.push({ id: "kf" + i, tick: f.updates != null ? f.updates : -1, snap: {
      version: 1, seed: self.seed, ticks: f.updates != null ? f.updates : self.ticks, sandTick: f.tick, time: f.t,
      rng: f.rng != null ? f.rng : self.loaded.rng.state, clock: self.loaded.clock.t, state: st } });
    ids.push({ id: "kf" + i, tick: f.tick, why: f.why });
  });
  return {
    loaded: from, tick: this.ticks, sandTick: this.g.tick, time: view.round(this.g.t, 2), hash: this.hash(),
    deterministic: dice != null && !opts.reseed, keyframes: ids,
    checksFailed: doc.checksFailed || [], errors: ((doc.history || {}).errors || []).length
  };
};

module.exports = { open: open, Harness: Harness, view: view, PHASES: PHASES, TICK_MS: TICK_MS };
