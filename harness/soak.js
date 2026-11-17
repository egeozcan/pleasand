/* =====================================================================
   PLEASAND  --  harness/soak.js

   play a lot of villages for a long time and look for trouble: broken
   invariants, exceptions, hung ticks, builders who never build, people
   who never move. the same shape as the bug hunts that turned up the
   lamp bracket and the dead-end ladder.

     node harness/soak.js                          # seeds 1-4, 20000 ticks
     node harness/soak.js --seeds 1-8 --ticks 60000
     node harness/soak.js --seeds 1-6 --preset rich --jobs 6
     node harness/soak.js --seeds 1-6 --preset chaos --json

   presets: plain (a village left alone), rich (every idea, iron and
   barrels to build with), chaos (a deterministic scatter of lava, oil,
   powder, acid and ice, then a few ideas).

   a worker that stops, throws or hangs is a finding: the parent says so
   and exits 1. stuck peasants are reported on the side; --fail-on-stuck
   makes them findings too.
   ===================================================================== */
"use strict";
var path = require("path"), cp = require("child_process"), os = require("os");
var lib = require("./harness.js");

/* -------------------------------------------------------------------
   one village, watched
   ------------------------------------------------------------------- */
function worker(seed, ticks, preset, opts) {
  var h = lib.open({ seed: seed }), notes = [], watch = {}, found = {}, t0 = Date.now();
  var inv = function (id, expr, every) { h.invariant(id, expr, { every: every || 1 }); };

  h.standardInvariants({ every: 1, temps: 30, grid: 60 });
  inv("people-state", "g.peasants.every(function (p) { return ['walk','fly','held','space'].indexOf(p.state) >= 0; })");
  inv("ducks-state", "g.ducks.every(function (d) { return ['walk','fly','held','swim','thrown'].indexOf(d.state) >= 0; })");
  inv("inventory", "g.peasants.every(function (p) { return (p.logs || 0) > -1e-5 && (p.boards || 0) > -1e-5 && (p.stone || 0) > -1e-5 && (p.iron || 0) > -1e-5 && (p.pack || 0) > -1e-5 && p.breath >= 0; })");
  inv("ids", "(function(){var a=g.peasants.map(function(p){return p.id}),d=g.ducks.map(function(q){return q.id}),s=g.sites.map(function(x){return x.id});return new Set(a).size===a.length&&new Set(d).size===d.length&&new Set(s).size===s.length;})()", 30);
  inv("held", "(g.held === null || (g.peasants.indexOf(g.held) >= 0 && g.held.state === 'held')) && (g.heldDuck === null || g.ducks.indexOf(g.heldDuck) >= 0)");
  inv("sites", "g.sites.every(function (s) { return s.plan && s.plan.length > 0 && s.plan.every(function (e) { return e.i >= 0 && e.i < g.m.length; }) && (!s.stock || Object.keys(s.stock).every(function (k) { return s.stock[k] > -1e-5 && Number.isFinite(s.stock[k]); })); })", 30);
  inv("tasks", "g.peasants.every(function (p) { return !p.task || p.task.site == null || g.sites.some(function (s) { return s.id === p.task.site; }) || p.task.kind === 'sow' || p.task.kind === 'till' || p.task.kind === 'water' || p.task.kind === 'fish' || p.task.kind === 'shoo'; })", 30);
  inv("feed", "g.feed.length <= 6 && g.banners.length <= 4 && g.ghosts.length < 400 && g.np >= 0 && g.np <= PMAX", 30);
  inv("resources", "g.rip >= 0 && (g.iron || 0) >= 0 && (g.barrels || 0) >= 0");

  if (preset === "rich") {
    h.give(["farm", "bucket", "landscape", "grave", "fishing", "scarecrow", "fireworks", "dig", "mine",
            "masonry", "smelt", "lift", "bell", "oil", "rocket", "lantern"]);
    h.g.iron = 40; h.g.barrels = 40;
  } else if (preset === "chaos") {
    var s = 12345;
    function rnd() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
    var paints = ["LAVA", "WATER", "FIRE", "GUNPOWDER", "WOOD", "ACID", "ICE", "GAS", "OIL", "SAND"];
    for (var k = 0; k < 12; k++) {
      var x = 10 + Math.floor(rnd() * (h.g.gw - 20)), y = 10 + Math.floor(rnd() * (h.g.gh - 20));
      h.paintDisc(x, y, 2 + Math.floor(rnd() * 4), paints[Math.floor(rnd() * paints.length)]);
    }
    h.give(["bucket", "farm", "mine", "dig", "masonry", "fireworks"]);
  }

  var chunk = 1000, chunks = [], stop = null, threw = null;
  try {
    for (var done = 0; done < ticks && !stop; done += chunk) {
      var c0 = Date.now();
      var r = h.step(Math.min(chunk, ticks - done));
      chunks.push((Date.now() - c0) / Math.min(chunk, ticks - done));
      if (r.stopped) {
        stop = { kind: r.stopped.kind, id: r.stopped.id, tick: r.stopped.tick, expr: r.stopped.expr, error: r.stopped.error };
        break;
      }
      if (opts.stuck) stuckWatch(h, watch, found);
    }
  } catch (e) {
    threw = { message: String(e && e.message || e), tick: h.ticks, crash: h.crashReport() };
  }
  var st = h.state({ hash: true });
  var out = {
    seed: seed, preset: preset, ticks: h.ticks, ms: Date.now() - t0,
    msPerTick: +((Date.now() - t0) / Math.max(1, h.ticks)).toFixed(2),
    slowestChunk: +Math.max.apply(null, chunks.length ? chunks : [0]).toFixed(2),
    stop: stop, threw: threw,
    state: { counts: st.counts, sitesDone: st.counts.sitesDone, ideas: st.ideas.length, rip: st.resources.rip, hash: st.hash },
    events: h.events().reduce(function (o, e) { o[e.kind] = (o[e.kind] || 0) + 1; return o; }, {}),
    deaths: h.events({ kind: "death" }).map(function (e) { return e.tick + ":" + (e.name || "") + ":" + e.cause; }),
    stuck: Object.keys(found).map(function (k) { return found[k]; }),
    context: stop && stop.tick ? h.events({ since: Math.max(0, stop.tick - 200), limit: 6 }) : null
  };
  return out;
}

/* a peasant who has held the same task, in the same place, with no stroke
   made, for a long time: the shape of a stalled builder or a plan that
   cannot be walked */
var BENIGN = { sleep: 1, warm: 1, home: 1, watch: 1, festival: 1, visit: 1 };
function stuckWatch(h, watch, found) {
  h.g.peasants.forEach(function (p) {
    if (p.dead || !p.task || BENIGN[p.task.kind]) { delete watch[p.id]; return; }
    var w = watch[p.id], now = h.ticks;
    var pos = Math.round(p.x * 4) + "," + Math.round(p.y * 4);
    var act = (p.task.act | 0) + ":" + (p.task.n | 0);
    if (!w || w.pos !== pos || w.act !== act || w.kind !== p.task.kind) {
      watch[p.id] = { pos: pos, act: act, kind: p.task.kind, since: now, name: p.name };
      return;
    }
    var still = now - w.since;
    if (still > 2400 && !found[p.id]) {
      var s = h.g.sites.filter(function (x) { return x.id === p.task.site; })[0];
      found[p.id] = {
        tick: now, name: p.name, id: p.id, task: p.task.kind, site: s ? s.kind + "#" + s.id : null,
        x: +p.x.toFixed(1), y: +p.y.toFixed(1), still: still, climb: !!p.climb, since: p.task.t | 0
      };
    }
  });
}

/* -------------------------------------------------------------------
   the parent: seeds, jobs, a timeout for hangs
   ------------------------------------------------------------------- */
function parseSeeds(s) {
  var out = [];
  String(s || "1-4").split(",").forEach(function (part) {
    var m = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(part);
    if (m) { for (var i = Number(m[1]); i <= Number(m[2]); i++) out.push(i); }
    else if (String(part).trim()) out.push(Number(part));
  });
  return out.filter(function (n) { return isFinite(n) && n > 0; });
}

function main() {
  var opts = parseArgs(process.argv.slice(2));
  if (opts.worker) {
    var res = worker(Number(opts.worker[0]), Number(opts.worker[1]), opts.worker[2], { stuck: true });
    process.stdout.write(JSON.stringify(res) + "\n");
    process.exit(0);
  }
  var seeds = parseSeeds(opts.seeds), ticks = num(opts.ticks, 20000), preset = opts.preset || "plain";
  var jobs = Math.max(1, num(opts.jobs, Math.min(4, os.cpus().length)));
  var timeout = num(opts.timeout, 300) * 1000;
  var results = [], running = [], i = 0;

  function launch() {
    var startedAny = false;
    while (running.length < jobs && i < seeds.length) {
      startedAny = true;
      (function (seed) {
        var child = cp.fork(__filename, ["--worker", String(seed), String(ticks), preset, "--stuck"], { stdio: ["ignore", "pipe", "pipe", "ipc"] });
        var buf = "", err = "", started = Date.now(), killed = false;
        running.push(child);
        var timer = setTimeout(function () {
          killed = true; child.kill("SIGKILL");
          results.push({ seed: seed, preset: preset, timeout: true, ms: Date.now() - started });
        }, timeout);
        child.stdout.on("data", function (d) { buf += d; });
        child.stderr.on("data", function (d) { err += d; });
        child.on("close", function (code, signal) {
          clearTimeout(timer);
          var at = running.indexOf(child);
          if (at >= 0) running.splice(at, 1);
          if (!killed) {
            var line = buf.trim().split("\n").pop(), res;
            try { res = JSON.parse(line); }
            catch (e) { res = { seed: seed, preset: preset, threw: { message: "worker produced no result (" + (err || signal || code) + ")" } }; }
            results.push(res);
          }
          if (i < seeds.length) launch();
          else if (!running.length) done();
        });
      })(seeds[i++]);
    }
    if (!startedAny && !running.length && i >= seeds.length) done();
  }

  var finished = false;
  function done() {
    if (finished) return;
    finished = true;
    results.sort(function (a, b) { return a.seed - b.seed; });
    if (opts.json) {
      results.forEach(function (r) { process.stdout.write(JSON.stringify(r) + "\n"); });
    } else {
      console.log("PLEASAND soak · " + preset + " · " + ticks + " ticks · seeds " + seeds.join(","));
      results.forEach(function (r) {
        var bad = r.stop || r.threw || r.timeout || (opts["fail-on-stuck"] && r.stuck && r.stuck.length);
        var tag = r.timeout ? "HANG" : (r.threw ? "THREW" : (r.stop ? "STOP " + r.stop.kind + " " + (r.stop.id || "") : "ok"));
        console.log((bad ? "!! " : "   ") + String(r.seed).padStart(3) + "  " + tag.padEnd(18) +
          (r.msPerTick != null ? r.msPerTick.toFixed(2) + "ms/t" : "") +
          (r.state ? "  " + r.state.counts.alive + " alive, " + r.state.counts.sitesDone + "/" + r.state.counts.sites + " sites, " + r.state.ideas + " ideas, " + r.state.rip + " dead" : "") +
          (r.stuck && r.stuck.length ? "  stuck: " + r.stuck.map(function (s) { return s.name + " " + s.task + (s.site ? " " + s.site : "") + " @" + s.x + "," + s.y; }).join("; ") : ""));
        if (r.stop && r.stop.expr) console.log("        " + r.stop.expr + (r.stop.error ? "  (" + r.stop.error + ")" : ""));
        if (r.threw) console.log("        " + r.threw.message);
        if (r.deaths && r.deaths.length) console.log("        deaths: " + r.deaths.slice(-5).join(" "));
      });
      var bad = results.filter(function (r) { return r.stop || r.threw || r.timeout || (opts["fail-on-stuck"] && r.stuck && r.stuck.length); });
      console.log((bad.length ? bad.length + " of " + results.length + " seeds found trouble" : "all " + results.length + " seeds clean") +
        " in " + (results.reduce(function (n, r) { return n + (r.ms || 0); }, 0) / 1000).toFixed(0) + "s of cpu");
    }
    var bad2 = results.filter(function (r) { return r.stop || r.threw || r.timeout || (opts["fail-on-stuck"] && r.stuck && r.stuck.length); });
    process.exit(bad2.length ? 1 : 0);
  }

  launch();
}

/* -------------------------------------------------------------------
   tiny argument parser, as the cli's
   ------------------------------------------------------------------- */
function parseArgs(argv) {
  var out = {}, i, a, key, val, eq;
  for (i = 0; i < argv.length; i++) {
    a = argv[i];
    if (a.slice(0, 2) !== "--") continue;
    key = a.slice(2); val = true; eq = key.indexOf("=");
    if (eq >= 0) { val = key.slice(eq + 1); key = key.slice(0, eq); }
    else if (i + 1 < argv.length && argv[i + 1].slice(0, 2) !== "--") val = argv[++i];
    if (key === "worker") { out.worker = [val, argv[++i], argv[++i]]; continue; }
    out[key] = val;
  }
  return out;
}
function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }

main();
